// Live fixture check: each module must say "hit" for its positive fixture and
// "absent" for its negative one. Usage: node scripts/fixtures.ts [--json] [module...]
import { allModules, makeCtx } from "../supabase/functions/_shared/engine/index.ts";
import { checkFixtures, healthRow } from "../supabase/functions/_shared/engine/health.ts";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const only = new Set(args.filter((a) => !a.startsWith("--")));
const ctx = makeCtx(process.env as Record<string, string>, 12000);

const rows = await checkFixtures(allModules.filter((m) => !only.size || only.has(m.name)), ctx);
if (asJson) console.log(JSON.stringify(rows, null, 2));
else for (const r of rows) console.log(`${r.state.padEnd(9)} ${r.module.padEnd(18)} +${r.positive.padEnd(34)} -${r.negative}`);
const bad = rows.filter((r) => r.state !== "ok").length;
console.error(`\n${rows.length - bad}/${rows.length} ok`);

// --upload: write results to module_health (needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
// The daily workflow uses the module-health Edge Function instead, so results reflect
// the servers searches really run on; this stays for local checks.
if (args.includes("--upload")) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --upload");
  const at = new Date().toISOString();
  const body = rows.map((r) => healthRow(r, at));
  const res = await fetch(`${url}/rest/v1/module_health?on_conflict=module`, {
    method: "POST",
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`upload failed: ${res.status} ${await res.text()}`);
  console.error(`uploaded ${body.length} rows`);
}
