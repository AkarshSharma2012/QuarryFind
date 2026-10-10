// Starting a search (search-start, v1) uses only the light manifest; running a
// batch (search-batch, in batch.ts) loads the engine.
import { admin, INTERNAL_SECRET, SUPABASE_URL } from "./server.ts";
import manifest from "./manifest.json" with { type: "json" };

type SearchType = "username" | "email" | "domain";

function moduleNames(type: SearchType, deep: boolean, disabled: Set<string>) {
  return (manifest as { name: string; types: string[]; deep: boolean }[])
    .filter((m) => m.types.includes(type) && (deep || !m.deep) && !disabled.has(m.name))
    .map((m) => m.name);
}

// 15 modules per batch keeps each invocation under the 2 s CPU limit while
// keeping total concurrency (batches × per-batch concurrency) reasonable (BUG-006).
export const BATCH = 15;


export async function disabledModules(): Promise<Set<string>> {
  const { data } = await admin().from("module_health").select("module").in("state", ["broken", "disabled"]);
  return new Set((data ?? []).map((r: { module: string }) => r.module));
}

/** Creates the run (rate-limited in SQL) and stores its module list. Batches are driven separately. */
export async function startRun(userId: string, type: SearchType, query: string, deep: boolean, via: "web" | "api") {
  const db = admin();
  const names = moduleNames(type, deep, await disabledModules());
  const { data: run, error } = await db.rpc("start_search", {
    p_user: userId, p_type: type, p_query: query, p_deep: deep, p_via: via, p_per_minute: via === "api" ? 60 : 10,
  });
  if (error) throw new Error(error.message);
  await db.from("search_runs").update({ modules_total: names.length, module_names: names }).eq("id", run.id);
  return { ...run, modules_total: names.length };
}

/** Calls search-batch for one slice (or for whatever is unreported). Resolves when that batch is done. */
export function callBatch(runId: string, body: { offset?: number; remaining?: boolean }) {
  return fetch(`${SUPABASE_URL}/functions/v1/search-batch`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-internal-secret": INTERNAL_SECRET },
    body: JSON.stringify({ run_id: runId, ...body }),
  }).then((r) => r.json()).catch(() => ({ ran: 0 }));
}

/** Drives every batch of a run (parallel slices, then up to two retry passes). Server-side callers only. */
export async function driveRun(runId: string, total: number, parallel = 4) {
  const offsets = Array.from({ length: Math.ceil(total / BATCH) }, (_, i) => i * BATCH);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(parallel, offsets.length) }, async () => {
    while (i < offsets.length) await callBatch(runId, { offset: offsets[i++] });
  }));
  for (let pass = 0; pass < 2; pass++) {
    const r = await callBatch(runId, { remaining: true });
    if (!r.ran) break;
  }
}
