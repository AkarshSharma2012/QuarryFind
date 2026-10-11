// Daily source check, run from the same servers as real searches (GitHub's
// runners are blocked by sites that real searches can reach). One slice per
// request so each has its own CPU budget. Caller: the Module health workflow,
// authenticated with the service role key. Body: {offset, limit}.
import { admin, err, envRecord, isServiceKey, json } from "../_shared/server.ts";
import { allModules, makeCtx } from "../_shared/engine/index.ts";
import { checkFixtures, healthRow } from "../_shared/engine/health.ts";

const WITH_FIXTURES = allModules.filter((m) => m.fixtures);

Deno.serve(async (req) => {
  if (req.method !== "POST") return err(req, 405, "method_not_allowed", "Use POST.");
  if (!isServiceKey(req)) return err(req, 401, "unauthorized", "Service role key required.");
  const b = await req.json().catch(() => ({}));
  const offset = Math.max(0, Number(b?.offset) || 0);
  const limit = Math.min(12, Math.max(1, Number(b?.limit) || 10));
  const rows = await checkFixtures(WITH_FIXTURES.slice(offset, offset + limit), makeCtx(envRecord(), 10000), 8);
  if (rows.length) {
    const { error } = await admin().from("module_health").upsert(rows.map((r) => healthRow(r)), { onConflict: "module" });
    if (error) return err(req, 500, "write_failed", error.message);
  }
  return json(req, 200, { total: WITH_FIXTURES.length, offset, checked: rows.length, ok: rows.filter((r) => r.state === "ok").length, not_ok: rows.filter((r) => r.state !== "ok").map((r) => `${r.module}: ${r.state}`) });
});
