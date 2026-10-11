import { Inconclusive } from "./http.ts";
import { richModules } from "./username-rich.ts";
import { apiModules } from "./username-apis.ts";
import { siteModules } from "./username-sites.ts";
import { emailModules } from "./email.ts";
import { domainModules } from "./domain.ts";
import { wmnModule, type WmnSite } from "./wmn.ts";
import wmn from "./wmn-sites.json" with { type: "json" };
import type { CheckResult, Ctx, Module, SearchType } from "./types.ts";

export * from "./types.ts";
export { normalise, guessType } from "./validate.ts";

// WhatsMyName-derived sites (CC BY-SA 4.0), curated by scripts/wmn-import.ts.
const wmnModules: Module[] = (wmn.sites as WmnSite[]).map(wmnModule);

export const allModules: Module[] = [...richModules, ...apiModules, ...siteModules, ...wmnModules, ...emailModules, ...domainModules];

export function modulesFor(type: SearchType, deep = false, disabled: Set<string> = new Set()): Module[] {
  return allModules.filter((m) => m.types.includes(type) && (deep || !m.deep) && !disabled.has(m.name));
}

export interface ModuleRun extends CheckResult {
  module: Module;
  latency_ms: number;
}

/** Run one module; never throws. */
export async function runModule(m: Module, query: string, ctx: Ctx): Promise<ModuleRun> {
  const t0 = Date.now();
  try {
    const r = await m.check(query, ctx);
    return { ...r, module: m, latency_ms: Date.now() - t0 };
  } catch (e) {
    // Timeouts can also fire while reading a body, after get() returned.
    const name = (e as Error)?.name;
    const outcome = e instanceof Inconclusive || name === "TimeoutError" || name === "AbortError" ? "inconclusive" : "error";
    return { outcome, detail: String((e as Error)?.message ?? e).slice(0, 200), module: m, latency_ms: Date.now() - t0 };
  }
}

/** Run modules with bounded concurrency, calling onResult as each resolves. */
export async function runAll(mods: Module[], query: string, ctx: Ctx, onResult: (r: ModuleRun) => void | Promise<void>, concurrency = 16) {
  let i = 0;
  const worker = async () => {
    while (i < mods.length) {
      const m = mods[i++];
      await onResult(await runModule(m, query, ctx));
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, mods.length) }, worker));
}

export function makeCtx(env: Record<string, string | undefined> = {}, timeoutMs = 8000): Ctx {
  return { fetch: globalThis.fetch.bind(globalThis), timeoutMs, env };
}
