"use client";

import clsx from "clsx";
import { useState } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, Flag, Lightbulb } from "lucide-react";
import type { SearchResult } from "@/lib/types";
import { Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

function initials(s: string) {
  return s.replace(/[^a-z0-9 ]/gi, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

export function confidenceLabel(c: number, type?: string) {
  if (type === "lead") return { text: "lead", cls: "text-warning", dot: "bg-warning" };
  if (c >= 0.9) return { text: "strong", cls: "text-success", dot: "bg-success" };
  if (c >= 0.6) return { text: "likely", cls: "text-accent", dot: "bg-accent" };
  return { text: "weak", cls: "text-warning", dot: "bg-warning" };
}

export function Confidence({ r }: { r: Pick<SearchResult, "confidence" | "type"> }) {
  const l = confidenceLabel(r.confidence, r.type);
  return (
    <span className={clsx("inline-flex items-center gap-1.5 font-mono text-xs", l.cls)} title={`Confidence ${Math.round(r.confidence * 100)}%`}>
      <span className={clsx("size-1.5 rounded-full", l.dot)} aria-hidden />{l.text}
    </span>
  );
}

export const resultUrl = (r: SearchResult) => r.metadata?.url ?? (r.value?.startsWith("http") ? r.value : undefined);
export const resultName = (r: SearchResult) => String(r.metadata?.display_name ?? r.metadata?.handle ?? r.value ?? r.platform ?? r.source);

function fmtStat(v: string | number, label: string) {
  if (typeof v !== "number" || /joined|year/i.test(label) || v < 10000) return String(v);
  return new Intl.NumberFormat(undefined, { notation: v >= 100000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(v);
}

/** Remote avatar with an initials fallback when the host refuses or the URL is dead. */
/** "28 repos", but "joined 2017" / "status basic" where the label reads first. */
export function statText(s: { label: string; value: string | number }) {
  const l = s.label.toLowerCase();
  return /joined|status|rank/.test(l) ? `${l} ${s.value}` : `${fmtStat(s.value, s.label)} ${l}`;
}

export function Avatar({ src, name, size = 40 }: { src?: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const cls = "shrink-0 rounded-md border border-border bg-surface-2";
  if (!src || failed) {
    return <div className={clsx(cls, "grid place-items-center font-mono text-xs text-text-muted")} style={{ width: size, height: size }} aria-hidden>{initials(name)}</div>;
  }
  // eslint-disable-next-line @next/next/no-img-element -- remote avatars from many hosts
  return <img src={src} alt="" width={size} height={size} className={clsx(cls, "object-cover")} style={{ width: size, height: size }} referrerPolicy="no-referrer" loading="lazy" onError={() => setFailed(true)} />;
}

export function ResultCard({ r, saved, saving, onSave, onSearchLead, onReport }: {
  r: SearchResult;
  saved?: boolean;
  saving?: boolean;
  onSave?: () => void;
  onSearchLead?: (value: string) => void;
  onReport?: () => void;
}) {
  const m = r.metadata ?? {};
  const name = resultName(r);
  const url = resultUrl(r);
  const isLead = r.type === "lead";
  const stats = (m.stats ?? []).filter((s) => s.value !== 0 && s.value !== "0" && s.value !== "");

  return (
    <Card className={clsx("flex h-full flex-col", isLead && "border-dashed")}>
      <article aria-label={`${r.platform ?? r.source}: ${name}`} className="flex flex-1 flex-col gap-3 p-4">
        <header className="flex items-start gap-3">
          {isLead ? (
            <div className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-2 text-warning"><Lightbulb className="size-[18px]" aria-hidden /></div>
          ) : (
            <Avatar src={m.avatar} name={name} />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs text-text-subtle">{r.platform ?? r.source}</span>
              <Confidence r={r} />
            </div>
            <h3 className="truncate text-[15px] font-medium text-text" title={name}>{name}</h3>
            {m.handle && m.display_name && <p className="truncate font-mono text-xs text-text-muted">@{m.handle}</p>}
          </div>
        </header>

        {m.bio && <p className="line-clamp-3 text-sm leading-relaxed text-text-muted">{m.bio}</p>}
        {m.evidence && (
          <details className="group text-xs text-text-subtle">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 hover:text-text-muted [&::-webkit-details-marker]:hidden">
              <span className="underline decoration-dotted underline-offset-2">Why this counts</span>
            </summary>
            <p className="mt-1 leading-relaxed">{m.evidence}</p>
          </details>
        )}

        {m.records && m.records.length > 0 && (
          <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-1 font-mono text-xs">
            {m.records.slice(0, 8).map((x, i) => (
              <div key={i} className="contents">
                <dt className="text-text-subtle">{x.name}</dt>
                <dd className="break-all text-text">{x.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {m.records && m.records.length > 8 && <p className="font-mono text-xs text-text-subtle">+{m.records.length - 8} more in the export</p>}

        {stats.length > 0 && (
          <dl className="mt-auto flex flex-wrap gap-x-5 gap-y-1 pt-1">
            {stats.slice(0, 3).map((s) => (
              <div key={s.label} className="flex items-baseline gap-1.5">
                {/joined|status|rank/i.test(s.label) ? (
                  <><dt className="text-xs text-text-subtle">{s.label.toLowerCase()}</dt><dd className="tabular text-sm text-text">{s.value}</dd></>
                ) : (
                  <><dd className="tabular text-sm text-text">{fmtStat(s.value, s.label)}</dd><dt className="text-xs text-text-subtle">{s.label.toLowerCase()}</dt></>
                )}
              </div>
            ))}
          </dl>
        )}
      </article>

      <footer className="flex items-center justify-between gap-2 border-t border-border px-4 py-2">
        {isLead && r.value && onSearchLead ? (
          <Button size="sm" variant="ghost" className="-ml-2" onClick={() => onSearchLead(r.value!)}>Search “{r.value}” as a username</Button>
        ) : url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 text-[13px] text-text-muted hover:text-accent">
            Open source <ExternalLink className="size-3.5" aria-hidden /><span className="sr-only"> on {r.platform} (new tab)</span>
          </a>
        ) : <span />}
        <div className="-mr-2 flex items-center">
        {onReport && !isLead && (
          <Button size="sm" variant="ghost" onClick={onReport} aria-label={`Report a wrong result from ${r.platform ?? r.source}`} icon={<Flag className="size-3.5" aria-hidden />}>
            <span className="sr-only sm:not-sr-only">Report</span>
          </Button>
        )}
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
        </div>
      </footer>
    </Card>
  );
}
