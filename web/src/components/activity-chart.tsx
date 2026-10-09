"use client";

import { useState } from "react";

export interface Activity { hours: number[]; weekdays: number[]; likelyUtcOffset?: number; samples: number }

/** 24 bars of activity by hour, shiftable between UTC and the guessed local time. */
export function ActivityChart({ a }: { a: Activity }) {
  const [local, setLocal] = useState(a.likelyUtcOffset !== undefined);
  const off = local && a.likelyUtcOffset !== undefined ? a.likelyUtcOffset : 0;
  const hours = Array.from({ length: 24 }, (_, h) => a.hours[(h - off + 24) % 24]);
  const max = Math.max(1, ...hours);
  const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

  if (a.samples < 5) return <p className="text-sm text-text-muted">Not enough public activity to chart.</p>;
  return (
    <figure className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <figcaption className="text-text-muted">Activity by hour ({a.samples} public events, {local ? `UTC${sign(off)} guess` : "UTC"})</figcaption>
        {a.likelyUtcOffset !== undefined && (
          <button type="button" onClick={() => setLocal(!local)} className="text-accent hover:underline">Show {local ? "UTC" : "guessed local time"}</button>
        )}
      </div>
      <div className="flex h-28 items-end gap-0.5" role="img" aria-label={`Busiest hours: ${hours.map((v, h) => [v, h]).sort((x, y) => y[0] - x[0]).slice(0, 3).map(([, h]) => `${h}:00`).join(", ")}`}>
        {hours.map((v, h) => (
          <div key={h} className="flex-1 rounded-t-sm bg-accent/70" style={{ height: `${Math.max(2, (v / max) * 100)}%` }} title={`${h}:00 · ${v}`} />
        ))}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-text-subtle"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
      {a.likelyUtcOffset !== undefined && (
        <p className="text-xs text-text-subtle">Timezone guess: UTC{sign(a.likelyUtcOffset)}, assuming the quietest six hours are night-time. Shift workers, bots and travel break this; treat it as a hint.</p>
      )}
    </figure>
  );
}
