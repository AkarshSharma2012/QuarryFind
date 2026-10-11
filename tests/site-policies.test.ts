import { describe, expect, it } from "vitest";
import { sitePolicies } from "../supabase/functions/_shared/engine/site-policies.ts";
import type { Ctx } from "../supabase/functions/_shared/engine/types.ts";

// Every host resolves to a public address; pages are served from the map.
function ctx(pages: Record<string, { body: string; type?: string; status?: number }>): Ctx & { hits: string[] } {
  const hits: string[] = [];
  const fetch = (async (u: string | URL | Request) => {
    const url = String(u);
    if (url.includes("/dns-query") || url.includes("/resolve")) {
      const q = new URL(url).searchParams;
      const type = q.get("type");
      return new Response(JSON.stringify({ Status: 0, Answer: type === "A" ? [{ name: q.get("name"), type: 1, TTL: 60, data: "93.184.216.34" }] : [] }));
    }
    hits.push(url);
    const p = pages[url];
    if (!p) return new Response("<html>Not here</html>", { status: 404, headers: { "content-type": "text/html" } });
    return new Response(p.body, { status: p.status ?? 200, headers: { "content-type": p.type ?? "text/plain; charset=utf-8" } });
  }) as typeof globalThis.fetch;
  return { fetch, timeoutMs: 1000, env: {}, hits };
}
const records = (r: Awaited<ReturnType<typeof sitePolicies>>) => (r.findings?.[0]?.metadata as { records: { name: string; value: string }[] }).records;

const SECURITY = `-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA256

# Our security address
Contact: mailto:security@example.com
Contact: https://example.com/security/report
Expires: 2027-01-01T00:00:00.000Z
Policy: https://example.com/security/policy
Preferred-Languages: en, de
-----BEGIN PGP SIGNATURE-----
abc
-----END PGP SIGNATURE-----`;

const ROBOTS = `User-agent: *
Disallow: /admin/
Disallow: /internal-api/
Allow: /
User-agent: GPTBot
Disallow: /
Sitemap: https://example.com/sitemap.xml`;

describe("sitePolicies (security.txt and robots.txt)", () => {
  it("reads security contacts and robots rules", async () => {
    const c = ctx({ "https://example.com/.well-known/security.txt": { body: SECURITY }, "https://example.com/robots.txt": { body: ROBOTS } });
    const r = await sitePolicies(c, "example.com");
    expect(r.outcome).toBe("hit");
    const recs = records(r);
    expect(recs).toContainEqual({ name: "Security contact", value: "mailto:security@example.com" });
    expect(recs).toContainEqual({ name: "Security contact", value: "https://example.com/security/report" });
    expect(recs).toContainEqual({ name: "Security policy", value: "https://example.com/security/policy" });
    expect(recs).toContainEqual({ name: "security.txt expires", value: "2027-01-01" });
    expect(recs).toContainEqual({ name: "Disallowed path", value: "/admin/" });
    expect(recs).toContainEqual({ name: "Disallowed path", value: "/internal-api/" });
    expect(recs).toContainEqual({ name: "Blocks crawler", value: "GPTBot" });
    expect(recs).toContainEqual({ name: "Sitemap", value: "https://example.com/sitemap.xml" });
  });

  it("falls back to /security.txt and ignores HTML pages served with 200", async () => {
    const c = ctx({
      "https://example.com/security.txt": { body: "Contact: mailto:sec@example.com" },
      "https://example.com/robots.txt": { body: "<!doctype html><html>soft 404</html>", type: "text/html" },
    });
    const recs = records(await sitePolicies(c, "example.com"));
    expect(recs).toContainEqual({ name: "Security contact", value: "mailto:sec@example.com" });
    expect(recs.some((x) => x.name === "Disallowed path" || x.name === "Sitemap")).toBe(false);
  });

  it("says absent when neither file exists", async () => {
    const r = await sitePolicies(ctx({}), "example.com");
    expect(r.outcome).toBe("absent");
  });
});
