"use client";

import clsx from "clsx";
import { Bookmark, BookmarkCheck, ExternalLink, Lightbulb } from "lucide-react";
import type { SearchResult } from "@/lib/types";
import { Badge, Card, StatTile } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

function initials(s: string) {
  return s.replace(/[^a-z0-9 ]/gi, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

export function confidenceBadge(c: number) {
  if (c >= 0.9) return <Badge tone="success">Strong match</Badge>;
  if (c >= 0.6) return <Badge tone="accent">Likely</Badge>;
  return <Badge tone="warning">Weak signal</Badge>;
}

export function ResultCard({ r, saved, saving, onSave, onSearchLead }: {
  r: SearchResult;
  saved?: boolean;
  saving?: boolean;
  onSave?: () => void;
  onSearchLead?: (value: string) => void;
}) {
  const m = r.metadata ?? {};
  const name = m.display_name ?? m.handle ?? r.value ?? r.platform ?? r.source;
  const url = m.url ?? (r.value?.startsWith("http") ? r.value : undefined);
  const isLead = r.type === "lead";
  const rich = Boolean(m.avatar || m.bio || m.stats?.length);

  return (
    <Card className={clsx("flex flex-col gap-3 p-4", isLead && "border-dashed")}>
      <article aria-label={`${r.platform ?? r.source}: ${name}`} className="flex flex-col gap-3">
        <header className="flex items-start gap-3">
          {isLead ? (
            <div className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-2 text-warning"><Lightbulb className="size-5" aria-hidden /></div>
          ) : m.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote avatars from many hosts
            <img src={m.avatar} alt="" className="size-10 shrink-0 rounded-md bg-surface-2 object-cover" referrerPolicy="no-referrer" loading="lazy" />
          ) : (
            <div className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-2 text-sm text-text-muted" aria-hidden>{initials(String(name))}</div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-text-subtle">{r.platform ?? r.source}</span>
              {isLead ? <Badge tone="warning">Lead to check</Badge> : confidenceBadge(r.confidence)}
            </div>
            <h3 className="truncate text-base font-medium text-text">{String(name)}</h3>
            {m.handle && m.display_name && <p className="truncate font-mono text-xs text-text-muted">@{m.handle}</p>}
          </div>
        </header>

        {m.bio && <p className="line-clamp-3 text-sm text-text-muted">{m.bio}</p>}
        {!rich && !isLead && r.value && !url && <p className="break-all font-mono text-xs text-text-muted">{r.value}</p>}

        {m.records && m.records.length > 0 && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
            {m.records.slice(0, 8).map((x, i) => (
              <div key={i} className="contents">
                <dt className="text-text-subtle">{x.name}</dt>
                <dd className="break-all text-text">{x.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {m.stats && m.stats.length > 0 && (
          <div className="flex flex-wrap gap-6">
            {m.stats.slice(0, 3).map((s) => <StatTile key={s.label} value={s.value} label={s.label} />)}
          </div>
        )}
      </article>

      <footer className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
        {isLead && r.value && onSearchLead ? (
          <Button size="sm" variant="secondary" onClick={() => onSearchLead(r.value!)}>Search “{r.value}” as a username</Button>
        ) : url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
            Open on {r.platform ?? "source"} <ExternalLink className="size-3.5" aria-hidden />
          </a>
        ) : <span />}
        {onSave && !isLead && (
          <Button
            size="sm"
            variant="ghost"
            loading={saving}
            onClick={onSave}
            aria-pressed={saved}
            icon={saved ? <BookmarkCheck className="size-4 text-accent" aria-hidden /> : <Bookmark className="size-4" aria-hidden />}
          >
            {saved ? "Saved" : "Save"}
          </Button>
        )}
      </footer>
    </Card>
  );
}
