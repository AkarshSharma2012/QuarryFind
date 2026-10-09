// Integration test against a running local Supabase (`npx supabase start`).
// Proves row level security: a second user sees none of the first user's data
// and can't call privileged functions. Skipped when Supabase isn't running.
import { describe, expect, it, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL_ = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const up = Boolean(ANON && SERVICE);

async function newUser(admin: SupabaseClient) {
  const email = `t${crypto.randomUUID().slice(0, 8)}@example.test`;
  const password = crypto.randomUUID();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const c = createClient(URL_, ANON, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email, password });
  return { id: data.user!.id, c };
}

describe.skipIf(!up)("row level security", () => {
  let admin: SupabaseClient;
  let a: Awaited<ReturnType<typeof newUser>>;
  let b: Awaited<ReturnType<typeof newUser>>;
  let runId: string;
  let caseId: string;

  beforeAll(async () => {
    admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
    a = await newUser(admin);
    b = await newUser(admin);
    const { data: run } = await admin.rpc("start_search", { p_user: a.id, p_type: "username", p_query: "rlstest", p_deep: false, p_via: "web" });
    runId = run.id;
    await admin.from("search_runs").update({ modules_total: 1 }).eq("id", runId);
    await admin.rpc("record_module", { p_run: runId, p_module: "x", p_platform: "X", p_outcome: "hit", p_detail: null, p_latency: 1, p_results: [{ value: "secret", platform: "X" }] });
    const { data: c } = await a.c.from("cases").insert({ name: "A's case", user_id: a.id }).select().single();
    caseId = c!.id;
  });

  it("owner sees their run, results and case", async () => {
    expect((await a.c.from("search_runs").select("id").eq("id", runId)).data).toHaveLength(1);
    expect((await a.c.from("search_results").select("value").eq("run_id", runId)).data?.[0]?.value).toBe("secret");
    expect((await a.c.from("cases").select("id").eq("id", caseId)).data).toHaveLength(1);
  });

  it("recording the last module completes the run", async () => {
    expect((await admin.from("search_runs").select("status").eq("id", runId).single()).data?.status).toBe("completed");
  });

  it("a second user gets nothing back", async () => {
    expect((await b.c.from("search_runs").select("id").eq("id", runId)).data).toEqual([]);
    expect((await b.c.from("search_results").select("*").eq("run_id", runId)).data).toEqual([]);
    expect((await b.c.from("module_statuses").select("*").eq("run_id", runId)).data).toEqual([]);
    expect((await b.c.from("cases").select("*").eq("id", caseId)).data).toEqual([]);
  });

  it("a second user can't write into someone else's case", async () => {
    const r = await b.c.from("case_items").insert({ case_id: caseId, user_id: b.id, query_type: "username", query: "x", source: "x" });
    expect(r.error).not.toBeNull();
    const r2 = await b.c.from("cases").update({ name: "pwned" }).eq("id", caseId).select();
    expect(r2.data ?? []).toEqual([]);
  });

  it("users can't call engine functions or write results directly", async () => {
    expect((await a.c.rpc("start_search", { p_user: a.id, p_type: "username", p_query: "x", p_deep: false, p_via: "web" })).error).not.toBeNull();
    expect((await a.c.rpc("record_module", { p_run: runId, p_module: "y", p_platform: "Y", p_outcome: "hit", p_detail: null, p_latency: 1, p_results: [] })).error).not.toBeNull();
    expect((await a.c.from("search_results").insert({ run_id: runId, seq: 99, user_id: a.id, source: "fake" })).error).not.toBeNull();
    expect((await a.c.from("api_keys").insert({ user_id: a.id, prefix: "x", key_hash: "y" })).error).not.toBeNull();
  });

  it("rate limit blocks the 11th web search in a minute", async () => {
    let blocked = false;
    for (let i = 0; i < 11; i++) {
      const { error } = await admin.rpc("start_search", { p_user: b.id, p_type: "username", p_query: `r${i}`, p_deep: false, p_via: "web" });
      if (error) { blocked = /rate_limited|too_many_running/.test(error.message); break; }
    }
    expect(blocked).toBe(true);
  });

  it("deleting a user cascades", async () => {
    await admin.auth.admin.deleteUser(a.id);
    expect((await admin.from("search_runs").select("id").eq("id", runId)).data).toEqual([]);
    expect((await admin.from("cases").select("id").eq("id", caseId)).data).toEqual([]);
  });
});
