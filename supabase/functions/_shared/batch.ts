// Runs one batch of modules for a run (search-batch only; loads the engine).
import { makeCtx, modulesFor, runAll, type SearchType } from "./engine/index.ts";
import { admin, envRecord } from "./server.ts";

/** Runs a batch of modules for a run, recording each one atomically. */
export async function runBatch(runId: string, type: SearchType, query: string, names: string[]) {
  const db = admin();
  const wanted = new Set(names);
  const mods = modulesFor(type, true).filter((m) => wanted.has(m.name));
  const ctx = makeCtx(envRecord(), 10000);
  await runAll(mods, query, ctx, async (r) => {
    const results = (r.findings ?? []).map((f) => ({ ...f, platform: f.platform ?? r.module.platform, category: f.category ?? r.module.category }));
    await db.rpc("record_module", {
      p_run: runId, p_module: r.module.name, p_platform: r.module.platform, p_outcome: r.outcome,
      p_detail: r.detail ?? null, p_latency: r.latency_ms, p_results: results,
    });
  }, 8);
  // Modules the client asked for that no longer exist still count, so the run can finish.
  for (const n of names) if (!mods.some((m) => m.name === n)) {
    await db.rpc("record_module", { p_run: runId, p_module: n, p_platform: n, p_outcome: "error", p_detail: "module removed", p_latency: 0, p_results: [] });
  }
}
