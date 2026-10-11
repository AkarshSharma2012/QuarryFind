import { describe, expect, it } from "vitest";
import { isPrivate } from "../supabase/functions/_shared/engine/ip.ts";
import { publicFetch } from "../supabase/functions/_shared/engine/public-fetch.ts";
import { httpProfile } from "../supabase/functions/_shared/engine/domain.ts";
import type { Ctx } from "../supabase/functions/_shared/engine/types.ts";

// DNS answers by host; anything not listed is NXDOMAIN.
const DNS: Record<string, { A?: string[]; AAAA?: string[] }> = {
  "public.example": { A: ["93.184.216.34"] },
  "v6.example": { AAAA: ["2606:2800:220:1:248:1893:25c8:1946"] },
  "evil.example": { A: ["127.0.0.1"] },
  "evil6.example": { A: ["93.184.216.34"], AAAA: ["::ffff:169.254.169.254"] },
  "cgnat.example": { A: ["100.64.1.2"] },
};

function ctx(pages: Record<string, () => Response>): Ctx & { hits: string[] } {
  const hits: string[] = [];
  const fetch = (async (u: string | URL | Request) => {
    const url = String(u);
    if (url.includes("/dns-query") || url.includes("/resolve")) {
      const q = new URL(url).searchParams;
      const name = q.get("name")!, type = q.get("type") as "A" | "AAAA";
      const data = DNS[name]?.[type] ?? [];
      return new Response(JSON.stringify({ Status: DNS[name] ? 0 : 3, Answer: data.map((d) => ({ name, type: type === "A" ? 1 : 28, TTL: 60, data: d })) }), { status: 200 });
    }
    hits.push(url);
    const page = pages[url];
    return page ? page() : new Response("not found", { status: 404 });
  }) as typeof globalThis.fetch;
  return { fetch, timeoutMs: 1000, env: {}, hits };
}
const redirect = (to: string) => () => new Response(null, { status: 302, headers: { location: to } });
const html = (body: string) => () => new Response(body, { status: 200, headers: { "content-type": "text/html" } });

describe("isPrivate", () => {
  it("flags private, loopback, link-local, CGNAT, reserved and mapped addresses", () => {
    for (const ip of ["10.0.0.1", "127.0.0.1", "169.254.169.254", "192.168.1.1", "172.16.0.1", "172.31.255.255", "0.0.0.0", "100.64.0.1", "100.127.255.254",
      "198.18.0.1", "224.0.0.1", "255.255.255.255", "::1", "::", "fc00::1", "fd12::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:a9fe:a9fe", "64:ff9b::7f00:1"]) {
      expect(isPrivate(ip), ip).toBe(true);
    }
  });
  it("allows public addresses", () => {
    for (const ip of ["93.184.216.34", "8.8.8.8", "172.32.0.1", "100.128.0.1", "2606:2800:220:1:248:1893:25c8:1946", "2001:4860:4860::8888"]) {
      expect(isPrivate(ip), ip).toBe(false);
    }
  });
});

describe("publicFetch", () => {
  it("fetches a public site and follows redirects to other public sites", async () => {
    const c = ctx({ "https://public.example/": redirect("https://v6.example/home"), "https://v6.example/home": html("<title>ok</title>") });
    const r = await publicFetch(c, "https://public.example/");
    expect(r.status).toBe(200);
    expect(r.finalUrl).toBe("https://v6.example/home");
  });
  it("refuses hosts that resolve to private addresses, over IPv4 or IPv6", async () => {
    for (const host of ["evil.example", "evil6.example", "cgnat.example"]) {
      const c = ctx({});
      await expect(publicFetch(c, `https://${host}/`)).rejects.toThrow(/private|reserved/);
      expect(c.hits).toEqual([]);
    }
  });
  it("refuses a redirect to a private address, before requesting it", async () => {
    const c = ctx({ "https://public.example/": redirect("http://169.254.169.254/latest/meta-data/") });
    await expect(publicFetch(c, "https://public.example/")).rejects.toThrow(/private|reserved/);
    expect(c.hits).toEqual(["https://public.example/"]);
  });
  it("refuses redirects to other schemes, unresolvable hosts and endless loops", async () => {
    await expect(publicFetch(ctx({ "https://public.example/": redirect("file:///etc/passwd") }), "https://public.example/")).rejects.toThrow(/scheme/);
    await expect(publicFetch(ctx({}), "https://nowhere.example/")).rejects.toThrow(/resolve/);
    await expect(publicFetch(ctx({ "https://public.example/": redirect("https://public.example/") }), "https://public.example/")).rejects.toThrow(/redirects/);
  });
});

describe("httpProfile (domain search website check)", () => {
  it("reports a blocked private target instead of fetching it", async () => {
    const c = ctx({});
    const r = await httpProfile(c, "evil.example");
    expect(r.outcome).toBe("inconclusive");
    expect(c.hits).toEqual([]);
  });
  it("profiles a public site and reports the final URL", async () => {
    const c = ctx({ "https://public.example/": html("<title>Example</title>") });
    const r = await httpProfile(c, "public.example");
    expect(r.outcome).toBe("hit");
    const recs = (r.findings![0].metadata as { records: { name: string; value: string }[] }).records;
    expect(recs).toContainEqual({ name: "Title", value: "Example" });
    expect(recs).toContainEqual({ name: "Final URL", value: "https://public.example/" });
  });
});
