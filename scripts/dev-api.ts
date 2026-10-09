// Local dev backend: the real engine behind the same contract the Supabase
// functions expose, with in-memory storage and SSE instead of Realtime.
// Usage: node scripts/dev-api.ts   (port 8787)
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { makeCtx, modulesFor, normalise, runAll, type SearchType } from "../supabase/functions/_shared/engine/index.ts";
import { runTool, type ToolName } from "../supabase/functions/_shared/engine/lookups.ts";

const PORT = Number(process.env.PORT ?? 8787);
const ctx = makeCtx(process.env as Record<string, string>, 8000);

interface Run {
  id: string; type: SearchType; query: string; deep: boolean; via: "web"; status: "running" | "completed" | "failed";
  modules_total: number; modules_completed: number; modules_with_hits: number; modules_failed: number;
  results_purged_at: null; created_at: string; completed_at: string | null;
}
const runs = new Map<string, { run: Run; results: unknown[]; statuses: unknown[]; listeners: Set<ServerResponse> }>();

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*" });
  res.end(JSON.stringify(body));
}

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  let s = "";
  for await (const c of req) { s += c; if (s.length > 10_000) break; }
  try { return JSON.parse(s || "{}"); } catch { return {}; }
}

function emit(id: string, event: string, data: unknown) {
  for (const l of runs.get(id)?.listeners ?? []) l.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function start(type: SearchType, query: string, deep: boolean) {
  const mods = modulesFor(type, deep);
  const run: Run = {
    id: randomUUID(), type, query, deep, via: "web", status: "running", modules_total: mods.length, modules_completed: 0,
    modules_with_hits: 0, modules_failed: 0, results_purged_at: null, created_at: new Date().toISOString(), completed_at: null,
  };
  const entry = { run, results: [] as unknown[], statuses: [] as unknown[], listeners: new Set<ServerResponse>() };
  runs.set(run.id, entry);
  void runAll(mods, query, ctx, (r) => {
    let seq = entry.results.length;
    for (const f of r.findings ?? []) {
      const row = { run_id: run.id, seq: ++seq, type: f.type ?? "account", platform: f.platform ?? r.module.platform, category: f.category ?? r.module.category, value: f.value ?? null, confidence: f.confidence ?? 1, source: r.module.name, metadata: f.metadata ?? {}, created_at: new Date().toISOString() };
      entry.results.push(row);
      emit(run.id, "result", row);
    }
    const st = { run_id: run.id, module: r.module.name, platform: r.module.platform, outcome: r.outcome, detail: r.detail ?? null, latency_ms: r.latency_ms };
    entry.statuses.push(st);
    run.modules_completed++;
    if (r.outcome === "hit") run.modules_with_hits++;
    if (r.outcome === "inconclusive" || r.outcome === "error") run.modules_failed++;
    emit(run.id, "status", st);
    emit(run.id, "run", run);
  }).then(() => {
    run.status = "completed"; run.completed_at = new Date().toISOString();
    emit(run.id, "run", run);
    emit(run.id, "done", run);
  }).catch(() => { run.status = "failed"; emit(run.id, "run", run); emit(run.id, "done", run); });
  return run;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type, authorization", "access-control-allow-methods": "GET, POST, OPTIONS" });
    return res.end();
  }
  try {
    if (req.method === "POST" && url.pathname === "/search-start") {
      const b = await body(req);
      const type = String(b.type) as SearchType;
      if (!["username", "email", "domain"].includes(type)) return send(res, 400, { error: "invalid_request", message: "Unknown search type." });
      const q = normalise(type, String(b.query ?? ""));
      if (!q) return send(res, 400, { error: "invalid_request", message: `That isn’t a valid ${type}.` });
      const run = await start(type, q, Boolean(b.deep));
      return send(res, 200, { run_id: run.id });
    }
    if (req.method === "GET" && url.pathname === "/runs") {
      const list = [...runs.values()].map((e) => e.run).sort((a, b) => b.created_at.localeCompare(a.created_at));
      return send(res, 200, list.slice(0, Number(url.searchParams.get("limit") ?? 50)));
    }
    const m = url.pathname.match(/^\/runs\/([0-9a-f-]{36})(\/events)?$/);
    if (req.method === "GET" && m) {
      const e = runs.get(m[1]);
      if (!e) return send(res, 404, { error: "not_found", message: "No search with that id." });
      if (!m[2]) return send(res, 200, { run: e.run, results: e.results, statuses: e.statuses });
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive", "access-control-allow-origin": "*" });
      res.write(`event: snapshot\ndata: ${JSON.stringify({ run: e.run, results: e.results, statuses: e.statuses })}\n\n`);
      if (e.run.status !== "running") { res.write(`event: done\ndata: ${JSON.stringify(e.run)}\n\n`); return res.end(); }
      e.listeners.add(res);
      req.on("close", () => e.listeners.delete(res));
      return;
    }
    if (req.method === "POST" && url.pathname === "/tools") {
      const b = await body(req);
      return send(res, 200, await runTool(ctx, String(b.tool) as ToolName, String(b.input ?? "")));
    }
    send(res, 404, { error: "not_found" });
  } catch (e) {
    send(res, 500, { error: "server_error", message: String((e as Error).message) });
  }
});

server.listen(PORT, () => console.log(`dev api on http://localhost:${PORT}`));
