// Starting a search and running its batches. Used by search-start (web) and v1 (API).
import { makeCtx, modulesFor, runAll, type SearchType } from "./engine/index.ts";
import { admin, envRecord, INTERNAL_SECRET, SUPABASE_URL } from "./server.ts";

export const BATCH = 60;

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

export async function disabledModules(): Promise<Set<string>> {
  const { data } = await admin().from("module_health").select("module").in("state", ["broken", "disabled"]);
  return new Set((data ?? []).map((r: { module: string }) => r.module));
}

/** Creates the run (rate-limited in SQL) and fans out batch invocations. */
export async function startRun(userId: string, type: SearchType, query: string, deep: boolean, via: "web" | "api") {
  const db = admin();
  const mods = modulesFor(type, deep, await disabledModules());
  const { data: run, error } = await db.rpc("start_search", {
    p_user: userId, p_type: type, p_query: query, p_deep: deep, p_via: via, p_per_minute: via === "api" ? 60 : 10,
  });
  if (error) throw new Error(error.message);
  await db.from("search_runs").update({ modules_total: mods.length }).eq("id", run.id);

  const names = mods.map((m) => m.name);
  const calls: Promise<unknown>[] = [];
  for (let i = 0; i < names.length; i += BATCH) {
    calls.push(fetch(`${SUPABASE_URL}/functions/v1/search-batch`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-secret": INTERNAL_SECRET },
      body: JSON.stringify({ run_id: run.id, query, type, modules: names.slice(i, i + BATCH) }),
    }).then((r) => r.body?.cancel()).catch(() => {}));
  }
  const all = Promise.all(calls);
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(all); else await all;
  return { ...run, modules_total: mods.length };
}

/** Runs a batch of modules for a run, recording each one atomically. */
export async function runBatch(runId: string, type: SearchType, query: string, names: string[]) {
  const db = admin();
  const wanted = new Set(names);
  const mods = modulesFor(type, true).filter((m) => wanted.has(m.name));
  const ctx = makeCtx(envRecord(), 8000);
  await runAll(mods, query, ctx, async (r) => {
    const results = (r.findings ?? []).map((f) => ({ ...f, platform: f.platform ?? r.module.platform, category: f.category ?? r.module.category }));
    await db.rpc("record_module", {
      p_run: runId, p_module: r.module.name, p_platform: r.module.platform, p_outcome: r.outcome,
      p_detail: r.detail ?? null, p_latency: r.latency_ms, p_results: results,
    });
  }, 16);
  // Modules the client asked for that no longer exist still count, so the run can finish.
  for (const n of names) if (!mods.some((m) => m.name === n)) {
    await db.rpc("record_module", { p_run: runId, p_module: n, p_platform: n, p_outcome: "error", p_detail: "module removed", p_latency: 0, p_results: [] });
  }
}
