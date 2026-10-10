"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import { data, DataError } from "@/lib/data";
import type { SearchRun } from "@/lib/types";
import { Page, PageHeader, RequireUser } from "@/components/shell";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/primitives";

const when = (s: string) => new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function HistoryList() {
  const [runs, setRuns] = useState<SearchRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { data.listRuns(100).then(setRuns).catch((e) => setError(e instanceof DataError ? e.message : "Couldn’t load your history.")); }, []);

  return (
    <>
      <PageHeader title="History" sub="Your searches from the last 90 days. Findings themselves are deleted after 6 hours; save anything you need to a case." actions={<LinkButton href="/search/">New search</LinkButton>} />
      {error ? <Card><EmptyState title="Couldn’t load your history" body={error} /></Card>
        : runs === null ? <div className="flex flex-col gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          : runs.length === 0 ? <Card><EmptyState icon={<History className="size-8" />} title="No searches yet" body="Run a search and it shows up here for 90 days." action={<LinkButton href="/search/" size="sm">New search</LinkButton>} /></Card>
            : (
              <Card className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b border-border text-xs uppercase tracking-wide text-text-subtle">
                    <tr><th scope="col" className="px-4 py-3 font-medium">Query</th><th scope="col" className="px-4 py-3 font-medium">Type</th><th scope="col" className="px-4 py-3 font-medium">Found</th><th scope="col" className="px-4 py-3 font-medium">Status</th><th scope="col" className="px-4 py-3 font-medium">When</th></tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                        <td className="max-w-[280px] px-4 py-3"><Link href={`/search/run/?id=${r.id}`} className="block truncate font-mono text-text hover:text-accent">{r.query}</Link></td>
                        <td className="px-4 py-3 capitalize text-text-muted">{r.type}{r.deep ? " (deep)" : ""}</td>
                        <td className="px-4 py-3 tabular-nums text-text-muted">{r.results_purged_at ? "expired" : r.modules_with_hits}</td>
                        <td className="px-4 py-3">{r.status === "running" ? <Badge tone="accent">Running</Badge> : r.status === "failed" ? <Badge tone="danger">Failed</Badge> : r.modules_failed ? <Badge tone="warning">Partial</Badge> : <Badge tone="success">Complete</Badge>}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-text-muted">{when(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
    </>
  );
}

export default function HistoryPage() {
  return <Page><RequireUser what="your history"><HistoryList /></RequireUser></Page>;
}
