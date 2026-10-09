"use client";

import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { data, DataError } from "@/lib/data";
import { toolBySlug } from "@/lib/tools";
import { ToolShell } from "@/components/tool-layout";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Input, Skeleton } from "@/components/ui/primitives";

/** Shared input + states for profile tools; `render` draws a found profile. */
export function ProfileTool<T extends { found: boolean; error?: string }>({ slug, render }: { slug: string; render: (r: T) => ReactNode }) {
  const t = toolBySlug(slug)!;
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<T | null>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null); setRes(null);
    try { setRes(await data.tool<T>(slug, q)); }
    catch (err) { setError(err instanceof DataError ? err.message : "That didn’t work. Try again."); }
    finally { setBusy(false); }
  };

  return (
    <ToolShell slug={slug}>
      <form onSubmit={run}>
        <Input label={t.input!.label} hideLabel inputSize="lg" prefix={t.input!.prefix} placeholder={t.input!.placeholder} value={q}
          onChange={(e) => setQ(e.target.value)} error={error ?? undefined} autoComplete="off" spellCheck={false} maxLength={64}
          trailing={<Button type="submit" loading={busy} disabled={!q.trim()} icon={<Search className="size-4" aria-hidden />}>Analyze</Button>} />
      </form>
      <div aria-live="polite">
        {busy && <Skeleton className="h-64" />}
        {res && !res.found && <Card><EmptyState title={res.error ? "The source didn’t answer" : "No such account"} body={res.error ?? "The platform says this username doesn’t exist."} /></Card>}
        {res && res.found && render(res)}
      </div>
    </ToolShell>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return <div className="flex flex-col"><span className="text-lg tabular-nums text-text">{value}</span><span className="text-xs text-text-subtle">{label}</span></div>;
}

export function KV({ items }: { items: [string, ReactNode][] }) {
  const shown = items.filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!shown.length) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {shown.map(([k, v]) => <div key={k} className="contents"><dt className="text-text-subtle">{k}</dt><dd className="break-all text-text">{v}</dd></div>)}
    </dl>
  );
}
