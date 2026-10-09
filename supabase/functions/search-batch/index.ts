// Internal: runs one batch of modules for a run. Called only by startRun.
import { INTERNAL_SECRET } from "../_shared/server.ts";
import { runBatch } from "../_shared/runs.ts";
import type { SearchType } from "../_shared/engine/index.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST" || req.headers.get("x-internal-secret") !== INTERNAL_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  const b = await req.json().catch(() => null);
  if (!b || typeof b.run_id !== "string" || !Array.isArray(b.modules) || b.modules.length > 200) {
    return new Response("bad request", { status: 400 });
  }
  await runBatch(b.run_id, b.type as SearchType, String(b.query), b.modules.map(String));
  return new Response("ok");
});
