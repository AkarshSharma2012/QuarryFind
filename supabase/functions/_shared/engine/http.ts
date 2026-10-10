import type { CheckResult, Ctx } from "./types.ts";

export const UA = "Mozilla/5.0 (compatible; OsintSetBot/0.1; +https://github.com/AkarshSharma2012/OsintSet)";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";

export class Inconclusive extends Error {}

export async function get(ctx: Ctx, url: string, init: RequestInit & { browser?: boolean } = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("user-agent")) headers.set("user-agent", init.browser ? BROWSER_UA : UA);
  if (!headers.has("accept-language")) headers.set("accept-language", "en-US,en;q=0.8");
  try {
    return await ctx.fetch(url, { redirect: "follow", ...init, headers, signal: AbortSignal.timeout(ctx.timeoutMs) });
  } catch (e) {
    const name = (e as Error)?.name;
    throw new Inconclusive(name === "TimeoutError" || name === "AbortError" ? "timeout" : `network: ${(e as Error)?.message ?? e}`);
  }
}

export async function getJson<T = unknown>(ctx: Ctx, url: string, init: RequestInit = {}): Promise<{ status: number; data: T | null; res: Response }> {
  const res = await get(ctx, url, { ...init, headers: { accept: "application/json", ...(init.headers as Record<string, string> | undefined) } });
  let data: T | null = null;
  const text = await res.text();
  try { data = text ? (JSON.parse(text) as T) : null; } catch { data = null; }
  return { status: res.status, data, res };
}

/**
 * Reads at most `cap` bytes of a body, then cancels the rest (keeps CPU low).
 * With `stopAt`, stops early as soon as any of those strings has appeared.
 */
export async function readText(res: Response, cap = 200_000, stopAt: string[] = []): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  const needles = stopAt.filter(Boolean);
  const overlap = Math.max(0, ...needles.map((n) => n.length)) - 1;
  let out = "", size = 0;
  try {
    while (size < cap) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      const start = Math.max(0, out.length - overlap);
      out += dec.decode(value, { stream: true });
      // Only scan the new text (plus enough overlap for a needle split across chunks).
      if (needles.length) {
        const fresh = out.slice(start);
        if (needles.some((n) => fresh.includes(n))) break;
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return out;
}

/** Status codes that mean "the source would not answer us", never "absent". */
export function blocked(status: number) {
  return status === 401 || status === 403 || status === 429 || status === 503 || status >= 520;
}

export function inconclusive(detail: string): CheckResult {
  return { outcome: "inconclusive", detail };
}

export const absent = (detail = "not found"): CheckResult => ({ outcome: "absent", detail });

/** Strip to a safe single line for display. */
export function clean(s: unknown, max = 280): string | undefined {
  if (typeof s !== "string") return undefined;
  const t = s.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : undefined;
}

export function year(d: unknown): number | undefined {
  if (typeof d === "number") return new Date(d > 1e12 ? d : d * 1000).getUTCFullYear();
  if (typeof d === "string" && d) { const y = new Date(d).getUTCFullYear(); return Number.isFinite(y) ? y : undefined; }
  return undefined;
}

export async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
