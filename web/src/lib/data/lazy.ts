// Loads a data layer on first use instead of with the page, so supabase-js
// (~250 KB) stays out of the initial bundle. Every method is async except the
// subscribe-style ones, which return an unsubscribe right away.
import type { DataLayer } from "./types";

type Unsubscribe = () => void;
type AnyFn = (...args: unknown[]) => unknown;
const SUBSCRIBERS = new Set<string>(["onAuthChange", "subscribeRun"]);

export function lazyLayer(mode: DataLayer["mode"], load: () => Promise<DataLayer>): DataLayer {
  let impl: Promise<DataLayer> | null = null;
  const get = () => (impl ??= load());
  const method = (name: string) => (layer: DataLayer) => layer[name as keyof DataLayer] as unknown as AnyFn;
  return new Proxy({} as DataLayer, {
    get(_, prop) {
      if (prop === "mode") return mode;
      if (typeof prop !== "string" || prop === "then") return undefined; // never look like a promise
      if (SUBSCRIBERS.has(prop)) {
        return (...args: unknown[]): Unsubscribe => {
          let off: Unsubscribe | null = null, done = false;
          get().then((layer) => { if (!done) off = method(prop)(layer).apply(layer, args) as Unsubscribe; });
          return () => { done = true; off?.(); };
        };
      }
      return (...args: unknown[]) => get().then((layer) => method(prop)(layer).apply(layer, args));
    },
  });
}
