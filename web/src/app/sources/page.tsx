"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { data, type SourceHealth } from "@/lib/data";
import { Page, PageHeader } from "@/components/shell";
import { Card, Input, Skeleton } from "@/components/ui/primitives";
import SOURCES from "@/lib/sources.json";

const STATE: Record<string, { label: string; cls: string; dot: string }> = {
  ok: { label: "working", cls: "text-success", dot: "bg-success" },
  degraded: { label: "not answering", cls: "text-warning", dot: "bg-warning" },
  broken: { label: "switched off", cls: "text-danger", dot: "bg-danger" },
  disabled: { label: "switched off", cls: "text-danger", dot: "bg-danger" },
  unknown: { label: "not checked yet", cls: "text-text-subtle", dot: "bg-border-input" },
};

export default function SourcesPage() {
  const [health, setHealth] = useState<SourceHealth[] | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => { data.listSourceHealth().then(setHealth).catch(() => setHealth([])); }, []);

  const rows = useMemo(() => {
    const byName = new Map((health ?? []).map((h) => [h.module, h]));
    return SOURCES.map((s) => ({ ...s, h: byName.get(s.name) }))
      .filter((s) => !q || s.platform.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a.platform.localeCompare(b.platform));
  }, [health, q]);
  const counts = useMemo(() => {
    const c = { ok: 0, degraded: 0, off: 0, unknown: 0 };
    for (const r of rows) {
      const st = r.h?.state;
      if (st === "ok") c.ok++; else if (st === "degraded") c.degraded++; else if (st) c.off++; else c.unknown++;
    }
    return c;
  }, [rows]);
  const last = health?.reduce((m, h) => (h.checked_at > m ? h.checked_at : m), "");

  return (
    <Page>
      <PageHeader
        title="Source status"
        sub={<>Every source is tested daily with an account that exists and a name that doesn’t. Sources that get it wrong are switched off until they’re fixed. <Link href="/how-it-works/">How results are checked</Link>.</>}
      />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <dl className="flex flex-wrap gap-8 text-sm">
          {[["Working", counts.ok, "text-success"], ["Not answering", counts.degraded, "text-warning"], ["Switched off", counts.off, "text-danger"]].map(([l, n, c]) => (
            <div key={l as string}><dt className="text-xs text-text-subtle">{l}</dt><dd className={clsx("tabular text-xl", c as string)}>{n as number}</dd></div>
          ))}
          {last && <div><dt className="text-xs text-text-subtle">Last check</dt><dd className="text-sm text-text">{new Date(last).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</dd></div>}
        </dl>
        <Input label="Filter sources" hideLabel placeholder="Filter by name" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-64" />
      </div>
      {health === null ? <Skeleton className="h-96" /> : (
        <Card className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="eyebrow border-b border-border">
              <tr><th scope="col" className="px-4 py-2.5 font-normal">Source</th><th scope="col" className="px-4 py-2.5 font-normal">Searches</th><th scope="col" className="px-4 py-2.5 font-normal">Status</th><th scope="col" className="px-4 py-2.5 font-normal">Checked</th><th scope="col" className="px-4 py-2.5 text-right font-normal">Reports (30 days)</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = STATE[r.h?.state ?? "unknown"];
                return (
                  <tr key={r.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-text">{r.platform}{r.deep && <span className="ml-2 font-mono text-[11px] text-text-subtle">deep</span>}</td>
                    <td className="px-4 py-2 text-text-muted">{r.types.join(", ")}</td>
                    <td className="px-4 py-2"><span className={clsx("inline-flex items-center gap-1.5 font-mono text-xs", st.cls)}><span className={clsx("size-1.5 rounded-full", st.dot)} aria-hidden />{st.label}</span></td>
                    <td className="px-4 py-2 text-text-subtle">{r.h ? new Date(r.h.checked_at).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-2 text-right tabular text-text-muted">{r.h?.reports_30d ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </Page>
  );
}
