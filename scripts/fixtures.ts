// Live fixture check: each module must say "hit" for its positive fixture and
// "absent" for its negative one. Usage: node scripts/fixtures.ts [--json] [module...]
import { allModules, makeCtx, runModule } from "../supabase/functions/_shared/engine/index.ts";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const only = new Set(args.filter((a) => !a.startsWith("--")));
const ctx = makeCtx(process.env as Record<string, string>, 12000);

const mods = allModules.filter((m) => m.fixtures && (!only.size || only.has(m.name)));
const rows: { module: string; positive: string; negative: string; state: string }[] = [];

let i = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (i < mods.length) {
    const m = mods[i++];
    const [p, n] = await Promise.all([runModule(m, m.fixtures!.positive, ctx), runModule(m, m.fixtures!.negative, ctx)]);
    const pOk = p.outcome === "hit";
    const nOk = n.outcome === "absent";
    const state = pOk && nOk ? "ok" : (p.outcome === "inconclusive" || n.outcome === "inconclusive") && !(p.outcome === "absent" || n.outcome === "hit") ? "degraded" : "broken";
    rows.push({ module: m.name, positive: `${p.outcome}${p.detail ? ` (${p.detail})` : ""}`, negative: `${n.outcome}${n.detail ? ` (${n.detail})` : ""}`, state });
  }
}));

rows.sort((a, b) => a.state.localeCompare(b.state) || a.module.localeCompare(b.module));
if (asJson) console.log(JSON.stringify(rows, null, 2));
else for (const r of rows) console.log(`${r.state.padEnd(9)} ${r.module.padEnd(18)} +${r.positive.padEnd(34)} -${r.negative}`);
const bad = rows.filter((r) => r.state !== "ok").length;
console.error(`\n${rows.length - bad}/${rows.length} ok`);
