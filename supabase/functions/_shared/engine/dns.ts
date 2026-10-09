import { getJson } from "./http.ts";
import type { Ctx } from "./types.ts";

export interface DnsAnswer { name: string; type: number; TTL: number; data: string }

/** DNS over HTTPS (Cloudflare JSON API, Google as fallback). null = lookup failed. */
export async function dohQuery(ctx: Ctx, name: string, type: string): Promise<DnsAnswer[] | null> {
  for (const base of ["https://cloudflare-dns.com/dns-query", "https://dns.google/resolve"]) {
    try {
      const { status, data } = await getJson<{ Status: number; Answer?: DnsAnswer[] }>(
        ctx, `${base}?name=${encodeURIComponent(name)}&type=${type}`, { headers: { accept: "application/dns-json" } },
      );
      if (status !== 200 || !data) continue;
      if (data.Status !== 0 && data.Status !== 3) continue; // 3 = NXDOMAIN → empty
      return (data.Answer ?? []).filter((a) => a.type === TYPES[type] || !TYPES[type]);
    } catch {
      continue;
    }
  }
  return null;
}

const TYPES: Record<string, number> = { A: 1, NS: 2, CNAME: 5, SOA: 6, PTR: 12, MX: 15, TXT: 16, AAAA: 28, CAA: 257 };

export function reverseName(ip: string): string | null {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip.split(".").reverse().join(".") + ".in-addr.arpa";
  return null;
}

export const unquote = (s: string) => s.replace(/^"|"$/g, "").replace(/" "/g, "");
