"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { CircleAlert, Download, ExternalLink, LayoutGrid, Rows3, RotateCcw, SearchX } from "lucide-react";
import { data, DataError, type RunSnapshot } from "@/lib/data";
import type { ModuleStatus, SearchResult, SearchRun } from "@/lib/types";
import { Page, RequireUser } from "@/components/shell";
import { Confidence, ResultCard, resultName, resultUrl, statText } from "@/components/result-card";
import { SaveDialog } from "@/components/save-dialog";
import { Button, LinkButton } from "@/components/ui/button";
import { Badge, Card, EmptyState, ProgressBar, SegmentedControl, Skeleton, StatTile } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { download, fileSlug, resultsCsv } from "@/lib/export";

type Status = ModuleStatus & { platform?: string };
type Sort = "confidence" | "platform" | "newest";

function RunView({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [run, setRun] = useState<SearchRun | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<Sort>("confidence");
  const [view, setView] = useState<"cards" | "table">("cards");
  useEffect(() => { try { const v = localStorage.getItem("os.view"); if (v === "table" || v === "cards") setView(v); } catch { /* ignore */ } }, []);
  const changeView = (v: "cards" | "table") => { setView(v); try { localStorage.setItem("os.view", v); } catch { /* ignore */ } };
  const [saving, setSaving] = useState<SearchResult | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [announce, setAnnounce] = useState("");
  const lastAnnounce = useRef(0);

  useEffect(() => {
    let off = () => {};
    let poll: ReturnType<typeof setInterval> | undefined;
    let live = true;
    // Live events can be dropped under bursts, so the database snapshot is the
    // source of truth: re-sync every 5 s while running and once at the end.
    const resync = () => data.getRun(id).then((s) => { if (s && live) apply(s); }).catch(() => {});
    data.getRun(id).then((snap) => {
      if (!snap) { setMissing(true); return; }
      apply(snap);
      if (snap.run.status === "running") {
        off = data.subscribeRun(id, {
          onSnapshot: apply,
          onResult: (r) => setResults((xs) => (xs.some((x) => x.seq === r.seq) ? xs : [...xs, r])),
          onStatus: (s) => setStatuses((xs) => (xs.some((x) => x.module === s.module) ? xs : [...xs, s])),
          onRun: (r) => {
            setRun(r);
            if (r.status !== "running") { clearInterval(poll); resync(); }
          },
          onError: setError,
        });
        poll = setInterval(resync, 5000);
      }
    }).catch((e) => setError(e instanceof DataError ? e.message : "Couldn’t load this search."));
    return () => { live = false; off(); clearInterval(poll); };
    function apply(s: RunSnapshot) {
      setRun(s.run); setResults(s.results); setStatuses(s.statuses);
      if (s.run.status !== "running") clearInterval(poll);
    }
  }, [id]);

  useEffect(() => {
    if (run) document.title = `${run.status === "running" ? "… " : ""}${run.query} · Search results`;
  }, [run]);

  // Screen-reader progress, at most every 5 seconds.
  useEffect(() => {
    if (!run) return;
    const t = Date.now();
    if (run.status !== "running" || t - lastAnnounce.current > 5000) {
      lastAnnounce.current = t;
      setAnnounce(run.status === "running" ? `${results.length} found so far` : `Search finished. ${results.length} found.`);
    }
  }, [run, results.length]);

  const categories = useMemo(() => [...new Set(results.map((r) => r.category).filter(Boolean))] as string[], [results]);
  const shown = useMemo(() => {
    const xs = results.filter((r) => category === "all" || r.category === category);
    const leads = xs.filter((r) => r.type === "lead");
    const rest = xs.filter((r) => r.type !== "lead");
    rest.sort((a, b) =>
      sort === "platform" ? String(a.platform).localeCompare(String(b.platform))
        : sort === "newest" ? b.seq - a.seq
          : b.confidence - a.confidence || (b.metadata?.avatar ? 1 : 0) - (a.metadata?.avatar ? 1 : 0));
    return [...rest, ...leads];
  }, [results, category, sort]);

  const absent = statuses.filter((s) => s.outcome === "absent");
  const unavailable = statuses.filter((s) => s.outcome === "inconclusive" || s.outcome === "error");

  if (missing) {
    return <EmptyState icon={<SearchX className="size-8" />} title="Search not found" body="It may have been deleted after 90 days, or it belongs to another account." action={<LinkButton href="/search/">New search</LinkButton>} />;
  }
  if (!run) {
    return error ? <EmptyState icon={<CircleAlert className="size-8" />} title="Couldn’t load this search" body={error} /> : (
      <div className="flex flex-col gap-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-2" /><div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44" />)}</div></div>
    );
  }

  const running = run.status === "running";
  const purged = !!run.results_purged_at;
  const tone = running ? "accent" : unavailable.length ? "warning" : "success";

  return (
    <div className="flex flex-col gap-8">
      <p className="sr-only" aria-live="polite">{announce}</p>
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow mb-1">{run.type} search{run.deep ? " · deep" : ""}</p>
            <h1 className="truncate font-mono text-2xl font-medium text-text" title={run.query}>{run.query}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="size-4" aria-hidden />} disabled={!results.length}
              onClick={() => download(`${fileSlug(run.query)}.csv`, resultsCsv(run, results), "text/csv")}>CSV</Button>
            <Button variant="secondary" size="sm" icon={<Download className="size-4" aria-hidden />} disabled={!results.length}
              onClick={() => download(`${fileSlug(run.query)}.json`, JSON.stringify({ run, results, statuses }, null, 2), "application/json")}>JSON</Button>
            <Button variant="secondary" size="sm" icon={<RotateCcw className="size-4" aria-hidden />} disabled={running}
              onClick={async () => { try { router.push(`/search/run/?id=${await data.startSearch(run.type, run.query, run.deep)}`); } catch (e) { toast((e as Error).message, "error"); } }}>Run again</Button>
          </div>
        </div>
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              {running ? "Checking sources…" : run.status === "failed" ? "Search stopped early" : "Search complete"}
              {!running && unavailable.length > 0 && <Badge tone="warning">Partial coverage</Badge>}
            </span>
            <span className="tabular-nums text-text-muted">{run.modules_completed} / {run.modules_total} sources</span>
          </div>
          <ProgressBar value={run.modules_completed} max={run.modules_total} label="Sources checked" tone={tone} />
          <div className="flex flex-wrap gap-8 pt-1">
            <StatTile value={results.filter((r) => r.type !== "lead").length} label="Found" />
            <StatTile value={absent.length} label="No match" />
            <StatTile value={unavailable.length} label="Unavailable" />
          </div>
          {!running && unavailable.length > 0 && (
            <p className="text-xs text-text-muted">{unavailable.length} source{unavailable.length > 1 ? "s" : ""} didn’t answer (blocked, rate-limited or timed out). That is not the same as “no account”. Run again later to retry them.</p>
          )}
        </Card>
        {error && <p role="alert" className="text-sm text-danger">{error} Results so far are kept. <button className="underline" onClick={() => location.reload()}>Reconnect</button></p>}
      </header>

      {purged ? (
        <EmptyState title="These results have expired" body="Findings are deleted 6 hours after a search to protect the people searched for. Anything you saved to a case is still there." action={<Button onClick={async () => router.push(`/search/run/?id=${await data.startSearch(run.type, run.query, run.deep)}`)}>Run it again</Button>} />
      ) : (
        <section aria-labelledby="h-found" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="h-found" className="text-lg">Findings</h2>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-text-muted" htmlFor="cat">Category</label>
              <select id="cat" value={category} onChange={(e) => setCategory(e.target.value)} className="h-8 rounded-sm border border-border-input bg-surface px-2 text-sm text-text">
                <option value="all">All ({results.length})</option>
                {categories.map((c) => <option key={c} value={c}>{c} ({results.filter((r) => r.category === c).length})</option>)}
              </select>
              <label className="text-sm text-text-muted" htmlFor="sort">Sort</label>
              <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-8 rounded-sm border border-border-input bg-surface px-2 text-sm text-text">
                <option value="confidence">Strongest first</option>
                <option value="platform">Platform A–Z</option>
                <option value="newest">Newest first</option>
              </select>
              <SegmentedControl label="Layout" value={view} onChange={changeView} options={[
                { value: "cards", label: "Cards", icon: <LayoutGrid className="size-3.5" aria-hidden /> },
                { value: "table", label: "Table", icon: <Rows3 className="size-3.5" aria-hidden /> },
              ]} />
            </div>
          </div>
          {shown.length === 0 ? (
            running ? <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44" />)}</div>
              : <Card><EmptyState icon={<SearchX className="size-8" />} title="Nothing found" body={unavailable.length ? "No source reported a match, but some didn’t answer. Try again later, or try a variation of the query." : "No source reported a match for this query. Try a variation, or a different identifier."} action={<LinkButton href={`/tools/variations/?q=${encodeURIComponent(run.query)}`} variant="secondary" size="sm">Generate variations</LinkButton>} /></Card>
          ) : view === "table" ? (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="eyebrow border-b border-border">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-normal">Source</th>
                    <th scope="col" className="px-4 py-2.5 font-normal">Profile</th>
                    <th scope="col" className="px-4 py-2.5 font-normal">Details</th>
                    <th scope="col" className="px-4 py-2.5 font-normal">Match</th>
                    <th scope="col" className="px-4 py-2.5 font-normal"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => {
                    const url = resultUrl(r);
                    const k = `${r.source}|${r.value}`;
                    const details = [...(r.metadata?.stats ?? []).filter((s) => s.value !== 0).slice(0, 2).map(statText), ...(r.metadata?.records ?? []).slice(0, 2).map((x) => `${x.name}: ${x.value}`)].join(" · ");
                    return (
                      <tr key={r.seq} className="border-b border-border align-top last:border-0 hover:bg-surface-2/60">
                        <td className="whitespace-nowrap px-4 py-2.5 text-text-muted">{r.platform ?? r.source}</td>
                        <td className="max-w-[240px] px-4 py-2.5">
                          {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 text-text hover:text-accent"><span className="truncate">{resultName(r)}</span><ExternalLink className="size-3 shrink-0 text-text-subtle" aria-hidden /></a> : <span className="text-text">{resultName(r)}</span>}
                        </td>
                        <td className="max-w-[320px] truncate px-4 py-2.5 text-text-subtle" title={details}>{details || "—"}</td>
                        <td className="px-4 py-2.5"><Confidence r={r} /></td>
                        <td className="px-4 py-2.5 text-right">
                          {r.type === "lead" ? (
                            <Button size="sm" variant="ghost" onClick={async () => { try { router.push(`/search/run/?id=${await data.startSearch("username", r.value!, false)}`); } catch (e) { toast((e as Error).message, "error"); } }}>Search</Button>
                          ) : (
                            <Button size="sm" variant="ghost" aria-pressed={saved.has(k)} onClick={() => setSaving(r)}>{saved.has(k) ? "Saved" : "Save"}</Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {shown.map((r) => (
                <li key={r.seq} className="flex">
                  <div className="w-full">
                    <ResultCard
                      r={r}
                      saved={saved.has(`${r.source}|${r.value}`)}
                      onSave={() => setSaving(r)}
                      onSearchLead={async (v) => { try { router.push(`/search/run/?id=${await data.startSearch("username", v, false)}`); } catch (e) { toast((e as Error).message, "error"); } }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {(absent.length > 0 || unavailable.length > 0) && (
        <section aria-labelledby="h-checked" className="flex flex-col gap-3">
          <h2 id="h-checked" className="text-lg">Also checked</h2>
          {unavailable.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm text-text-muted">Didn’t answer</h3>
              <ul className="flex flex-wrap gap-2">{unavailable.map((s) => <li key={s.module}><Badge tone="warning"><span title={s.detail ?? undefined}>{s.platform ?? s.module}</span></Badge></li>)}</ul>
            </div>
          )}
          {absent.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm text-text-muted">No match</h3>
              <ul className="flex flex-wrap gap-2">{absent.map((s) => <li key={s.module}><Badge tone="outline">{s.platform ?? s.module}</Badge></li>)}</ul>
            </div>
          )}
        </section>
      )}

      <SaveDialog run={run} result={saving} onClose={() => setSaving(null)} onSaved={(r) => setSaved((s) => new Set(s).add(`${r.source}|${r.value}`))} />
      <p className={clsx("text-xs text-text-subtle")}>A match means the source recognised this exact identifier. It does not prove two accounts belong to the same person. <Link href="/how-it-works/" className="underline">How results are checked</Link></p>
    </div>
  );
}

function RunPage() {
  const id = useSearchParams().get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return <EmptyState title="No search selected" action={<LinkButton href="/search/">New search</LinkButton>} />;
  return <RunView id={id} />;
}

export default function Page_() {
  return (
    <Page>
      <RequireUser what="search">
        <Suspense><RunPage /></Suspense>
      </RequireUser>
    </Page>
  );
}
