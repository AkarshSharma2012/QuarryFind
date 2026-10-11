// Fetches a user-supplied website without letting it reach private networks
// (SSRF): every hop's host must resolve, over IPv4 and IPv6, only to public
// addresses; redirects are followed by hand, at most 5, and only to http(s).
import { get, Inconclusive } from "./http.ts";
import { dohQuery } from "./dns.ts";
import { isIp, isPrivate } from "./ip.ts";
import type { Ctx } from "./types.ts";

const MAX_REDIRECTS = 5;

async function assertPublicHost(ctx: Ctx, hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (isIp(host)) {
    if (isPrivate(host)) throw new Inconclusive("private or reserved address");
    return;
  }
  if (!/\.[a-z]{2,63}$/i.test(host)) throw new Inconclusive("can't resolve that host");
  const [a, aaaa] = await Promise.all([dohQuery(ctx, host, "A"), dohQuery(ctx, host, "AAAA")]);
  const ips = [...(a ?? []), ...(aaaa ?? [])].map((r) => r.data);
  if (!ips.length) throw new Inconclusive("can't resolve that host");
  if (ips.some(isPrivate)) throw new Inconclusive("resolves to a private or reserved address");
}

export async function publicFetch(ctx: Ctx, url: string, init: RequestInit & { browser?: boolean } = {}): Promise<{ res: Response; status: number; finalUrl: string }> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let u: URL;
    try { u = new URL(current); } catch { throw new Inconclusive("invalid address"); }
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Inconclusive(`redirect to an unsupported scheme (${u.protocol})`);
    await assertPublicHost(ctx, u.hostname);
    const res = await get(ctx, u.href, { ...init, redirect: "manual" });
    const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!location) return { res, status: res.status, finalUrl: u.href };
    await res.body?.cancel();
    current = new URL(location, u).href;
  }
  throw new Inconclusive(`more than ${MAX_REDIRECTS} redirects`);
}
