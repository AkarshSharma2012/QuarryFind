import { describe, expect, it } from "vitest";
import { normalise, guessType, modulesFor, runModule, allModules } from "../supabase/functions/_shared/engine/index.ts";
import { siteModule, isChallenge } from "../supabase/functions/_shared/engine/username-sites.ts";
import { activityProfile, runTool } from "../supabase/functions/_shared/engine/lookups.ts";
import { isPrivate } from "../supabase/functions/_shared/engine/ip.ts";
import type { Ctx } from "../supabase/functions/_shared/engine/types.ts";

function ctxWith(handler: (url: string, init?: RequestInit) => Response | Promise<Response>): Ctx {
  return { fetch: (async (u: string | URL | Request, init?: RequestInit) => handler(String(u), init)) as typeof fetch, timeoutMs: 1000, env: {} };
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("validation", () => {
  it("normalises usernames, emails and domains", () => {
    expect(normalise("username", " @Jane_Doe ")).toBe("Jane_Doe");
    expect(normalise("username", "u/spez")).toBe("spez");
    expect(normalise("username", "bad name")).toBeNull();
    expect(normalise("email", "Jane@Example.COM")).toBe("jane@example.com");
    expect(normalise("email", "jane@")).toBeNull();
    expect(normalise("domain", "https://www.Example.com/path")).toBe("example.com");
    expect(normalise("domain", "localhost")).toBeNull();
  });
  it("guesses the type", () => {
    expect(guessType("a@b.co")).toBe("email");
    expect(guessType("example.com")).toBe("domain");
    expect(guessType("jdoe")).toBe("username");
  });
});

describe("module registry", () => {
  it("has unique module names", () => {
    const names = allModules.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });
  it("filters by type and deep", () => {
    const std = modulesFor("username");
    const deep = modulesFor("username", true);
    expect(deep.length).toBeGreaterThan(std.length);
    expect(std.every((m) => !m.deep && m.types.includes("username"))).toBe(true);
    expect(modulesFor("domain").length).toBeGreaterThan(0);
  });
  it("every username module has fixtures", () => {
    expect(modulesFor("username", true).filter((m) => !m.fixtures).map((m) => m.name)).toEqual([]);
  });
});

describe("site modules", () => {
  const def = { name: "t", platform: "T", category: "social" as const, url: "https://t.example/{u}" };
  it("404 is absent", async () => {
    const r = await runModule(siteModule(def), "x", ctxWith(() => new Response("nope", { status: 404 })));
    expect(r.outcome).toBe("absent");
  });
  it("403 and 429 are inconclusive, never absent", async () => {
    for (const s of [403, 429, 503]) {
      const r = await runModule(siteModule(def), "x", ctxWith(() => new Response("", { status: s })));
      expect(r.outcome).toBe("inconclusive");
    }
  });
  it("a bot challenge page with 200 is inconclusive", async () => {
    const r = await runModule(siteModule(def), "x", ctxWith(() => new Response("<html><title>Just a moment...</title></html>", { status: 200 })));
    expect(r.outcome).toBe("inconclusive");
  });
  it("network failure is inconclusive", async () => {
    const r = await runModule(siteModule(def), "x", ctxWith(() => { throw new TypeError("fetch failed"); }));
    expect(r.outcome).toBe("inconclusive");
  });
  it("missingText makes a 200 absent; existsText is required for a hit", async () => {
    const m1 = siteModule({ ...def, missingText: "not found here" });
    expect((await runModule(m1, "x", ctxWith(() => new Response("sorry, not found here")))).outcome).toBe("absent");
    const m2 = siteModule({ ...def, existsText: "profile-card" });
    expect((await runModule(m2, "x", ctxWith(() => new Response("<div>landing</div>")))).outcome).toBe("absent");
    const hit = await runModule(m2, "x", ctxWith(() => new Response("<div class=profile-card>")));
    expect(hit.outcome).toBe("hit");
    expect(hit.findings?.[0].value).toBe("https://t.example/x");
    expect(hit.findings?.[0].metadata?.evidence).toMatch(/marker/); // fix #1: every hit says why it counts
  });
  it("encodes the username in the URL", async () => {
    let seen = "";
    await runModule(siteModule(def), "a.b-c", ctxWith((u) => { seen = u; return new Response("", { status: 404 }); }));
    expect(seen).toBe("https://t.example/a.b-c");
  });
  it("detects common challenge pages", () => {
    expect(isChallenge("<title>Client Challenge</title>")).toBe(true);
    expect(isChallenge("<script src='https://challenges.cloudflare.com/x'>")).toBe(true);
    expect(isChallenge("<title>Jane on Example</title>")).toBe(false);
  });
});

describe("rich modules", () => {
  const github = allModules.find((m) => m.name === "github")!;
  it("maps a GitHub profile", async () => {
    const r = await runModule(github, "jane", ctxWith(() => json(200, { login: "jane", html_url: "https://github.com/jane", name: "Jane", avatar_url: "a", public_repos: 3, followers: 9, created_at: "2015-01-01T00:00:00Z" })));
    expect(r.outcome).toBe("hit");
    expect(r.findings?.[0].metadata?.display_name).toBe("Jane");
    expect(r.findings?.[0].metadata?.stats).toContainEqual({ label: "Joined", value: 2015 });
    expect(r.findings?.[0].metadata?.evidence).toMatch(/public API/);
  });
  it("GitHub 404 is absent, 403 is inconclusive", async () => {
    expect((await runModule(github, "x", ctxWith(() => json(404, {})))).outcome).toBe("absent");
    expect((await runModule(github, "x", ctxWith(() => json(403, { message: "rate limit" })))).outcome).toBe("inconclusive");
  });
  it("Hacker News null body is absent", async () => {
    const hn = allModules.find((m) => m.name === "hackernews")!;
    expect((await runModule(hn, "x", ctxWith(() => new Response("null", { status: 200 })))).outcome).toBe("absent");
  });
  it("GitLab empty list is absent", async () => {
    const gl = allModules.find((m) => m.name === "gitlab")!;
    expect((await runModule(gl, "x", ctxWith(() => json(200, [])))).outcome).toBe("absent");
  });
});

describe("tools", () => {
  it("rejects bad input before any request", async () => {
    const ctx = ctxWith(() => { throw new Error("should not fetch"); });
    expect((await runTool(ctx, "ip", "not-an-ip")).ok).toBe(false);
    expect((await runTool(ctx, "dns", "no spaces allowed.com x")).ok).toBe(false);
    expect((await runTool(ctx, "github", "")).ok).toBe(false);
  });
  it("headers tool refuses hosts that resolve to private addresses", async () => {
    const ctx = ctxWith((u) => (u.includes("dns") ? json(200, { Status: 0, Answer: [{ name: "x", type: 1, TTL: 1, data: "10.0.0.5" }] }) : new Response("should not be fetched")));
    const r = await runTool(ctx, "headers", "internal.example.com");
    expect(r.ok).toBe(false);
  });
  it("knows private ranges", () => {
    expect(isPrivate("10.1.2.3")).toBe(true);
    expect(isPrivate("192.168.0.1")).toBe(true);
    expect(isPrivate("172.20.0.1")).toBe(true);
    expect(isPrivate("8.8.8.8")).toBe(false);
  });
  it("guesses a UTC offset from activity", () => {
    // Activity 09:00–23:59 UTC; quiet 00:00–08:59 UTC → middle window 02:00–08:00 → UTC+0.
    const ts: number[] = [];
    for (let d = 0; d < 10; d++) for (let h = 9; h < 24; h++) ts.push(Date.UTC(2026, 0, d + 1, h) / 1000);
    const a = activityProfile(ts);
    expect(a.samples).toBe(150);
    expect(a.likelyUtcOffset).toBe(0);
  });
});

import { readText } from "../supabase/functions/_shared/engine/http.ts";
describe("readText", () => {
  const streamOf = (parts: string[]) => new Response(new ReadableStream({ start(c) { for (const p of parts) c.enqueue(new TextEncoder().encode(p)); c.close(); } }));
  it("finds a needle split across chunks and stops early", async () => {
    const body = await readText(streamOf(["aaaa profile-ca", "rd here", "x".repeat(1000), "never read"]), 600_000, ["profile-card"]);
    expect(body).toContain("profile-card");
    expect(body).not.toContain("never read");
  });
  it("respects the byte cap", async () => {
    const body = await readText(streamOf(["a".repeat(100), "b".repeat(100), "c".repeat(100)]), 150);
    expect(body).not.toContain("c");
  });
});
