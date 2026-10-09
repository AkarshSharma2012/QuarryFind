// Username modules generated from the WhatsMyName dataset
// (https://github.com/WebBreacher/WhatsMyName, © Micah Hoffman, CC BY-SA 4.0).
// The curated list in wmn-sites.json is a derivative of that dataset and is
// distributed under the same licence. Matching is strict: a hit needs the
// "exists" status AND text; an absence needs the "missing" status AND text.
// Anything else is inconclusive.
import { absent, get, inconclusive } from "./http.ts";
import { isChallenge } from "./username-sites.ts";
import type { Category, Module } from "./types.ts";

export interface WmnSite {
  name: string;
  uri_check: string;
  uri_pretty?: string;
  e_code: number;
  e_string: string;
  m_code: number;
  m_string: string;
  known: string[];
  cat: string;
  headers?: Record<string, string>;
  post_body?: string;
  strip_bad_char?: string;
}

const CAT: Record<string, Category> = {
  social: "social", tech: "dev", coding: "dev", gaming: "gaming", music: "media", video: "media", images: "creative",
  art: "creative", blog: "creative", business: "commerce", shopping: "commerce", finance: "commerce", hobby: "community",
  misc: "community", news: "community", political: "community", dating: "social", health: "community", archived: "archive",
  xx_nsfw_xx: "social",
};

export const slug = (name: string) => "wmn-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function wmnModule(s: WmnSite): Module {
  const fill = (t: string, u: string) => t.replaceAll("{account}", encodeURIComponent(u));
  return {
    name: slug(s.name),
    platform: s.name,
    category: CAT[s.cat] ?? "community",
    types: ["username"],
    fixtures: s.known?.length ? { positive: s.known[0], negative: "zq8x7k2m9vplw3" } : undefined,
    async check(raw, ctx) {
      const u = s.strip_bad_char ? [...s.strip_bad_char].reduce((a, c) => a.replaceAll(c, ""), raw) : raw;
      const res = await get(ctx, fill(s.uri_check, u), {
        method: s.post_body ? "POST" : "GET",
        body: s.post_body ? s.post_body.replaceAll("{account}", u) : undefined,
        headers: s.headers,
        redirect: "manual",
        browser: true,
      });
      const body = res.status >= 300 && res.status < 400 ? "" : (await res.text()).slice(0, 500_000);
      if (res.status >= 300 && res.status < 400) await res.body?.cancel();
      if (body && isChallenge(body)) return inconclusive("bot challenge page");
      if (res.status === s.e_code && body.includes(s.e_string)) {
        const url = fill(s.uri_pretty ?? s.uri_check, u);
        return { outcome: "hit", findings: [{ type: "account", platform: s.name, category: CAT[s.cat] ?? "community", value: url, confidence: 0.85, metadata: { url, handle: u } }] };
      }
      if (res.status === s.m_code && (!s.m_string || body.includes(s.m_string))) return absent();
      return inconclusive(`unexpected answer (HTTP ${res.status})`);
    },
  };
}
