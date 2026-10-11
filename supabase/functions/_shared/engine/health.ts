// Fixture checks: every module must say "hit" for its positive fixture and
// "absent" for its negative one. Used by scripts/fixtures.ts (local, CI) and the
// module-health Edge Function (runs from the same servers as real searches).
import { runModule } from "./index.ts";
import type { Ctx, Module } from "./types.ts";

export type HealthState = "ok" | "degraded" | "broken";
export interface FixtureRow { module: string; positive: string; negative: string; state: HealthState }

/** "broken" (positive missed or negative reported found) is skipped by searches; "degraded" (no answer) stays on. */
export async function checkFixtures(mods: Module[], ctx: Ctx, concurrency = 8): Promise<FixtureRow[]> {
  const todo = mods.filter((m) => m.fixtures);
  const rows: FixtureRow[] = [];
  let i = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (i < todo.length) {
      const m = todo[i++];
      const [p, n] = await Promise.all([runModule(m, m.fixtures!.positive, ctx), runModule(m, m.fixtures!.negative, ctx)]);
      const pOk = p.outcome === "hit", nOk = n.outcome === "absent";
      const state: HealthState = pOk && nOk ? "ok"
        : (p.outcome === "inconclusive" || n.outcome === "inconclusive") && !(p.outcome === "absent" || n.outcome === "hit") ? "degraded" : "broken";
      rows.push({ module: m.name, positive: `${p.outcome}${p.detail ? ` (${p.detail})` : ""}`, negative: `${n.outcome}${n.detail ? ` (${n.detail})` : ""}`, state });
    }
  }));
  return rows.sort((a, b) => a.state.localeCompare(b.state) || a.module.localeCompare(b.module));
}

/** A row for the module_health table. */
export const healthRow = (r: FixtureRow, checkedAt = new Date().toISOString()) => ({
  module: r.module, state: r.state, positive_ok: r.positive.startsWith("hit"), negative_ok: r.negative.startsWith("absent"),
  checked_at: checkedAt, note: `+${r.positive} / -${r.negative}`.slice(0, 300),
});
