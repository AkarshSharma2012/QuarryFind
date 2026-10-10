// Public API v1. Routes (function name "v1" → paths start with /v1):
//   POST /v1/searches  GET /v1/searches  GET /v1/searches/:id  GET /v1/searches/:id/stream
//   GET /v1/me  GET /v1/health  GET /v1/capabilities  GET /v1/openapi.json
import { normalise } from "../_shared/engine/validate.ts";
import type { SearchType } from "../_shared/engine/types.ts";
import { admin, cors, err, json, startError, userFromApiKey } from "../_shared/server.ts";
import { driveRun, startRun } from "../_shared/runs.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;
import { openapi } from "./openapi.ts";

const STREAM_MS = 140_000;
const RUN_COLS = "id, type, query, deep, status, modules_total, modules_completed, modules_with_hits, modules_failed, results_purged_at, created_at, completed_at";
type Row = Record<string, unknown>;

const apiResult = (r: Row) => ({
  id: r.seq, type: r.type, entity_type: r.type, platform: r.platform, category: r.category, value: r.value,
  confidence: r.confidence, source: r.source, metadata: r.metadata, created_at: r.created_at,
});
const progress = (run: Row) => ({
  modules_total: run.modules_total, modules_completed: run.modules_completed, modules_with_hits: run.modules_with_hits, modules_failed: run.modules_failed,
});
const runOut = (run: Row, results: Row[]) => ({
  run_id: run.id, status: run.status, type: run.type, query: run.query, deep: run.deep, total_results: results.length,
  results: results.map(apiResult), progress: progress(run), results_purged_at: run.results_purged_at, created_at: run.created_at, completed_at: run.completed_at,
});

async function loadRun(userId: string, id: string) {
  const db = admin();
  const { data: run } = await db.from("search_runs").select(RUN_COLS).eq("id", id).eq("user_id", userId).maybeSingle();
  if (!run) return null;
  const { data: results } = await db.from("search_results").select("*").eq("run_id", id).order("seq");
  return { run: run as Row, results: (results ?? []) as Row[] };
}

function stream(req: Request, userId: string, id: string) {
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(ctl) {
      const send = (event: string, data: unknown) => ctl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const started = Date.now();
      let lastSeq = 0, lastDone = -1, first = true;
      try {
        while (true) {
          const cur = await loadRun(userId, id);
          if (!cur) { send("error", { error: "not_found" }); break; }
          if (first) { send("run", { run_id: id, type: cur.run.type, query: cur.run.query, status: cur.run.status }); first = false; }
          for (const r of cur.results) if ((r.seq as number) > lastSeq) { send("result", apiResult(r)); lastSeq = r.seq as number; }
          if (cur.run.modules_completed !== lastDone) { send("progress", { results_so_far: cur.results.length, ...progress(cur.run) }); lastDone = cur.run.modules_completed as number; }
          if (cur.run.status !== "running") { send("done", { run_id: id, status: cur.run.status, total_results: cur.results.length, ...progress(cur.run) }); break; }
          if (Date.now() - started > STREAM_MS) { send("reconnect", { reason: "stream_timeout", run_id: id }); break; }
          ctl.enqueue(enc.encode(": keep-alive\n\n"));
          await new Promise((r) => setTimeout(r, 1000));
        }
      } catch {
        send("error", { error: "server_error" });
      }
      ctl.close();
    },
  });
  return new Response(body, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache", ...cors(req) } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  const path = new URL(req.url).pathname.replace(/^\/functions\/v1/, "").replace(/\/+$/, "");
  const url = new URL(req.url);

  if (req.method === "GET" && path === "/v1/health") {
    const { error } = await admin().from("module_health").select("module", { head: true, count: "exact" });
    return json(req, 200, { status: error ? "degraded" : "ok", service: "api", version: "v1", database: error ? "error" : "ok", streaming: true, time: new Date().toISOString() });
  }
  if (req.method === "GET" && path === "/v1/capabilities") {
    return json(req, 200, {
      version: "v1", search_types: ["domain", "email", "username"],
      modes: { async: "POST /v1/searches -> {run_id}; poll GET /v1/searches/{run_id}", sync: "POST /v1/searches with wait=true", stream: "POST /v1/searches with stream=true -> text/event-stream" },
      outcomes: ["hit", "absent", "inconclusive", "error"],
      limits: { searches_per_minute: 60, concurrent_searches: 3, sync_wait_seconds: 30, stream_timeout_seconds: STREAM_MS / 1000, results_retention_hours: 6, history_retention_days: 90 },
      auth: { scheme: "bearer", header: "Authorization: Bearer osk_live_...", alt_header: "X-API-Key" },
      price: "free",
    });
  }
  if (req.method === "GET" && path === "/v1/openapi.json") return json(req, 200, openapi);

  const userId = await userFromApiKey(req);
  if (!userId) return err(req, 401, "invalid_api_key", "Missing, malformed or revoked API key.");

  if (req.method === "GET" && path === "/v1/me") {
    return json(req, 200, { user_id: userId, price: "free", rate_limit_per_minute: 60, concurrent_searches: 3, supports_streaming: true, search_types: ["domain", "email", "username"] });
  }

  if (path === "/v1/searches" && req.method === "POST") {
    const b = await req.json().catch(() => ({}));
    const type = String(b.type) as SearchType;
    if (!["username", "email", "domain"].includes(type)) return err(req, 400, "invalid_request", "type must be username, email or domain.");
    const query = normalise(type, String(b.query ?? ""));
    if (!query) return err(req, 400, "invalid_request", `query is not a valid ${type}.`);
    let run: Row;
    try { run = await startRun(userId, type, query, Boolean(b.deep), "api"); }
    catch (e) { const [s, c, m] = startError(String((e as Error).message)); return err(req, s, c, m); }
    const id = run.id as string;
    // API callers have no page to drive batches, so this request drives them.
    const driving = driveRun(id, run.modules_total as number).catch(() => {});
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(driving);
    if (b.stream) return stream(req, userId, id);
    if (b.wait) {
      const until = Date.now() + 30_000;
      while (Date.now() < until) {
        const cur = await loadRun(userId, id);
        if (cur && cur.run.status !== "running") return json(req, 200, runOut(cur.run, cur.results));
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    return json(req, 200, { run_id: id, status: "running" });
  }

  if (path === "/v1/searches" && req.method === "GET") {
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20) || 20));
    const { data } = await admin().from("search_runs").select(RUN_COLS).eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
    return json(req, 200, { searches: (data ?? []).map((r: Row) => ({ run_id: r.id, ...r, id: undefined })) });
  }

  const m = path.match(/^\/v1\/searches\/([0-9a-f-]{36})(\/stream)?$/);
  if (m && req.method === "GET") {
    if (m[2]) return stream(req, userId, m[1]);
    const cur = await loadRun(userId, m[1]);
    if (!cur) return err(req, 404, "not_found", "No search with that id on your account.");
    return json(req, 200, runOut(cur.run, cur.results));
  }

  return err(req, 404, "not_found", "Unknown endpoint. See /v1/capabilities.");
});
