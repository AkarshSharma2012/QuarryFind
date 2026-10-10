// End-to-end against local Supabase with functions served. Hits real sources,
// so it's slow; skipped when Supabase isn't running.
import { describe, expect, it, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL_ = process.env.SUPABASE_URL ?? "";
const ANON = process.env.SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const FN = `${URL_}/functions/v1`;

describe.skipIf(!SERVICE)("backend end to end", () => {
  let admin: SupabaseClient;
  let user: SupabaseClient;
  let token = "";

  beforeAll(async () => {
    admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
    const email = `e2e${crypto.randomUUID().slice(0, 8)}@example.test`;
    const password = crypto.randomUUID();
    await admin.auth.admin.createUser({ email, password, email_confirm: true });
    user = createClient(URL_, ANON, { auth: { persistSession: false } });
    const { data } = await user.auth.signInWithPassword({ email, password });
    token = data.session!.access_token;
  });

  const call = (name: string, init: RequestInit = {}, auth = token) =>
    fetch(`${FN}/${name}`, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${auth}`, ...(init.headers ?? {}) } });

  it("rejects anonymous and invalid searches", async () => {
    expect((await call("search-start", { method: "POST", body: JSON.stringify({ type: "username", query: "x" }) }, ANON)).status).toBe(401);
    const bad = await call("search-start", { method: "POST", body: JSON.stringify({ type: "email", query: "not-an-email" }) });
    expect(bad.status).toBe(400);
  });

  it("runs a domain search to completion with results visible only through RLS", async () => {
    const res = await call("search-start", { method: "POST", body: JSON.stringify({ type: "domain", query: "example.com" }) });
    expect(res.status).toBe(200);
    const { run_id, modules_total, batch_size } = await res.json();
    expect(batch_size).toBeGreaterThan(0);
    // Drive it the way the results page does: slices, then a retry pass.
    for (let off = 0; off < modules_total; off += batch_size) {
      const b = await call("search-batch", { method: "POST", body: JSON.stringify({ run_id, offset: off, limit: batch_size }) });
      expect(b.status).toBe(200);
    }
    await call("search-batch", { method: "POST", body: JSON.stringify({ run_id, remaining: true }) });
    let run: Record<string, unknown> | null = null;
    for (let i = 0; i < 60; i++) {
      run = (await user.from("search_runs").select("*").eq("id", run_id).single()).data;
      if (run?.status !== "running") break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    expect(run?.status).toBe("completed");
    expect(run?.modules_completed).toBe(run?.modules_total);
    const { data: results } = await user.from("search_results").select("platform").eq("run_id", run_id);
    expect(results!.length).toBeGreaterThan(0);
    const { data: statuses } = await user.from("module_statuses").select("module, platform, outcome").eq("run_id", run_id);
    expect(statuses!.every((s) => s.platform)).toBe(true);
  }, 150_000);

  it("creates an API key, uses it, then revoking it locks it out", async () => {
    const created = await (await call("api-keys", { method: "POST", body: JSON.stringify({ name: "e2e" }) })).json();
    expect(created.key).toMatch(/^qf_live_[0-9a-f]{48}$/);
    const { data: stored } = await admin.from("api_keys").select("key_hash, prefix").eq("id", created.record.id).single();
    expect(stored!.key_hash).not.toContain(created.key.slice(9)); // only a hash is stored

    const me = await fetch(`${FN}/v1/me`, { headers: { authorization: `Bearer ${created.key}` } });
    expect(me.status).toBe(200);

    const wait = await fetch(`${FN}/v1/searches`, {
      method: "POST", headers: { "x-api-key": created.key, "content-type": "application/json" },
      body: JSON.stringify({ type: "domain", query: "example.org", wait: true }),
    });
    const body = await wait.json();
    expect(body.run_id).toBeTruthy();
    expect(["running", "completed"]).toContain(body.status);

    expect((await call(`api-keys?id=${created.record.id}`, { method: "DELETE" })).status).toBe(204);
    expect((await fetch(`${FN}/v1/me`, { headers: { authorization: `Bearer ${created.key}` } })).status).toBe(401);
  }, 60_000);

  it("streams a search over SSE", async () => {
    const created = await (await call("api-keys", { method: "POST", body: JSON.stringify({ name: "sse" }) })).json();
    const res = await fetch(`${FN}/v1/searches`, {
      method: "POST", headers: { authorization: `Bearer ${created.key}`, "content-type": "application/json" },
      body: JSON.stringify({ type: "email", query: "nobody@example.com", stream: true }),
    });
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const text = await res.text();
    expect(text).toContain("event: run");
    expect(text).toMatch(/event: (done|reconnect)/);
  }, 160_000);

  it("search-batch refuses anonymous callers and other users' runs", async () => {
    const { run_id } = await (await call("search-start", { method: "POST", body: JSON.stringify({ type: "domain", query: "example.net" }) })).json();
    expect((await call("search-batch", { method: "POST", body: JSON.stringify({ run_id, offset: 0 }) }, ANON)).status).toBe(401);
    const email = `other${crypto.randomUUID().slice(0, 8)}@example.test`, password = crypto.randomUUID();
    await admin.auth.admin.createUser({ email, password, email_confirm: true });
    const other = createClient(URL_, ANON, { auth: { persistSession: false } });
    const t = (await other.auth.signInWithPassword({ email, password })).data.session!.access_token;
    expect((await call("search-batch", { method: "POST", body: JSON.stringify({ run_id, offset: 0 }) }, t)).status).toBe(404);
  }, 60_000);

  it("server tools work anonymously, profile tools need an account", async () => {
    const ip = await (await call("tools", { method: "POST", body: JSON.stringify({ tool: "ip", input: "1.1.1.1" }) }, ANON)).json();
    expect(ip.ok).toBe(true);
    expect((await call("tools", { method: "POST", body: JSON.stringify({ tool: "github", input: "torvalds" }) }, ANON)).status).toBe(401);
    const priv = await (await call("tools", { method: "POST", body: JSON.stringify({ tool: "ip", input: "10.0.0.1" }) }, ANON)).json();
    expect(priv.result.outcome).toBe("absent");
  }, 60_000);
});
