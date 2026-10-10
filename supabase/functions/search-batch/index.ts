// Runs one batch of a search and answers when it's done, so every batch is an
// ordinary request with its own CPU budget (BUG-006). Callers: the results page
// (user JWT, must own the run) or v1 (internal secret).
// Body: {run_id, offset} for a slice of the run's module list, or
//       {run_id, remaining: true} for up to BATCH modules that haven't reported.
import { admin, cors, err, json, INTERNAL_SECRET, userFromJwt } from "../_shared/server.ts";
import { BATCH } from "../_shared/runs.ts";
import { runBatch } from "../_shared/batch.ts";
import type { SearchType } from "../_shared/engine/types.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return err(req, 405, "method_not_allowed", "Use POST.");
  const internal = req.headers.get("x-internal-secret") === INTERNAL_SECRET;
  const user = internal ? null : await userFromJwt(req);
  if (!internal && !user) return err(req, 401, "unauthorized", "Sign in first.");

  const b = await req.json().catch(() => null);
  if (!b || typeof b.run_id !== "string" || !/^[0-9a-f-]{36}$/.test(b.run_id)) return err(req, 400, "invalid_request", "Missing run id.");
  const db = admin();
  const { data: run } = await db.from("search_runs").select("id, user_id, type, query, status, module_names").eq("id", b.run_id).maybeSingle();
  if (!run || (user && run.user_id !== user.id)) return err(req, 404, "not_found", "No search with that id.");
  if (run.status !== "running") return json(req, 200, { ran: 0, status: run.status });

  let names: string[];
  if (b.remaining) {
    const { data } = await db.rpc("unreported_modules", { p_run: run.id, p_limit: BATCH });
    names = (data as string[] | null) ?? [];
  } else {
    const offset = Math.max(0, Number(b.offset) || 0);
    const limit = Math.min(BATCH, Math.max(1, Number(b.limit) || BATCH));
    names = (run.module_names as string[]).slice(offset, offset + limit);
    // Skip modules another caller already recorded (retries, two tabs).
    const { data: done } = await db.from("module_statuses").select("module").eq("run_id", run.id).in("module", names);
    const seen = new Set((done ?? []).map((r: { module: string }) => r.module));
    names = names.filter((n) => !seen.has(n));
  }
  if (names.length) await runBatch(run.id, run.type as SearchType, run.query, names);
  return json(req, 200, { ran: names.length });
});
