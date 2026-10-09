"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ExternalLink, Search } from "lucide-react";
import { data, DataError } from "@/lib/data";
import { toolBySlug } from "@/lib/tools";
import { Page, RequireUser } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Input, Skeleton } from "@/components/ui/primitives";

export function ToolShell({ slug, children }: { slug: string; children: ReactNode }) {
  const t = toolBySlug(slug)!;
  const body = (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <Link href="/tools/" className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"><ArrowLeft className="size-4" aria-hidden /> All tools</Link>
        <h1 className="text-xl text-text">{t.title}</h1>
        <p className="mt-1 text-sm text-text-muted">{t.blurb}</p>
      </div>
      {children}
    </div>
  );
  return <Page>{t.account ? <RequireUser what="this tool">{body}</RequireUser> : body}</Page>;
}

interface Rec { name: string; value: string }
interface CheckResult { outcome: string; detail?: string; findings?: { value?: string; metadata?: { records?: Rec[]; url?: string; total?: number } }[] }

export function RecordsTable({ records }: { records: Rec[] }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <tbody>
          {records.map((r, i) => (
            <tr key={i} className="border-b border-border align-top last:border-0">
              <th scope="row" className="w-40 whitespace-nowrap px-4 py-2 font-normal text-text-subtle">{r.name}</th>
              <td className="break-all px-4 py-2 font-mono text-xs text-text">
                {/^https?:\/\//.test(r.value) ? <a href={r.value} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{r.value}</a> : r.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/** Generic page for server tools that return a CheckResult with records. */
export function ServerTool({ slug, initial = "" }: { slug: string; initial?: string }) {
  const t = toolBySlug(slug)!;
  const [q, setQ] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<CheckResult | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("q");
    if (p) setQ(p);
  }, []);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null); setRes(null);
    try { setRes(await data.tool<CheckResult>(slug, q)); }
    catch (err) { setError(err instanceof DataError ? err.message : "That didn’t work. Try again."); }
    finally { setBusy(false); }
  };

  const f = res?.findings?.[0];
  return (
    <ToolShell slug={slug}>
      <form onSubmit={run}>
        <Input label={t.input!.label} hideLabel inputSize="lg" placeholder={t.input!.placeholder} prefix={t.input!.prefix} value={q}
          onChange={(e) => setQ(e.target.value)} error={error ?? undefined} autoComplete="off" spellCheck={false} maxLength={300}
          trailing={<Button type="submit" loading={busy} disabled={!q.trim()} icon={<Search className="size-4" aria-hidden />}>Look up</Button>} />
      </form>
      <div aria-live="polite">
        {busy && <Skeleton className="h-48" />}
        {res && res.outcome === "hit" && f?.metadata?.records && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-sm text-text">{f.value}</p>
              <div className="flex items-center gap-3">
                {f.metadata.total && f.metadata.total > f.metadata.records.length && <Badge>{f.metadata.records.length} of {f.metadata.total} shown</Badge>}
                {f.metadata.url && <a href={f.metadata.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">Source <ExternalLink className="size-3.5" aria-hidden /></a>}
              </div>
            </div>
            <RecordsTable records={f.metadata.records} />
          </div>
        )}
        {res && res.outcome === "absent" && <Card><EmptyState title="Nothing found" body={res.detail ? `The source says: ${res.detail}.` : undefined} /></Card>}
        {res && (res.outcome === "inconclusive" || res.outcome === "error") && <Card><EmptyState title="The source didn’t answer" body={`${res.detail ?? "No response"}. This is not the same as “nothing exists”; try again in a minute.`} /></Card>}
      </div>
    </ToolShell>
  );
}
