// Abuse limits on what a signed-in user can write straight to the database
// (migration 20261011000000_abuse_limits.sql). Skipped when Supabase isn't running.
import { describe, expect, it, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL_ = process.env.SUPABASE_URL ?? "http://127.0.0.1:55321";
const ANON = process.env.SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const up = Boolean(ANON && SERVICE);

async function newUser(admin: SupabaseClient) {
  const email = `l${crypto.randomUUID().slice(0, 8)}@example.test`;
  const password = crypto.randomUUID();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const c = createClient(URL_, ANON, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email, password });
  return { id: data.user!.id, c };
}
const item = (caseId: string, userId: string, extra: Record<string, unknown> = {}) =>
  ({ case_id: caseId, user_id: userId, query_type: "username", query: "x", source: "github", value: "https://github.com/x", ...extra });

describe.skipIf(!up)("abuse limits", () => {
  let admin: SupabaseClient;
  let u: Awaited<ReturnType<typeof newUser>>;
  let caseId: string;

  beforeAll(async () => {
    admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
    u = await newUser(admin);
    caseId = (await u.c.from("cases").insert({ name: "limits", user_id: u.id }).select().single()).data!.id;
  });

  it("caps case notes and saved-item sizes", async () => {
    expect((await u.c.from("cases").update({ notes: "n".repeat(20_000) }).eq("id", caseId)).error).toBeNull();
    expect((await u.c.from("cases").update({ notes: "n".repeat(20_001) }).eq("id", caseId)).error?.message).toMatch(/check constraint/);
    expect((await u.c.from("case_items").insert(item(caseId, u.id, { metadata: { blob: "m".repeat(60_000) } }))).error).toBeNull();
    expect((await u.c.from("case_items").insert(item(caseId, u.id, { metadata: { blob: "m".repeat(70_000) } }))).error?.message).toMatch(/check constraint/);
    expect((await u.c.from("case_items").insert(item(caseId, u.id, { value: "v".repeat(4_001) }))).error?.message).toMatch(/check constraint/);
    expect((await u.c.from("case_items").insert(item(caseId, u.id, { note: "v".repeat(5_001) }))).error?.message).toMatch(/check constraint/);
  });

  it("allows 200 cases per user, then refuses", async () => {
    const rows = Array.from({ length: 199 }, (_, i) => ({ name: `c${i}`, user_id: u.id }));
    expect((await admin.from("cases").insert(rows)).error).toBeNull(); // 1 + 199 = 200
    expect((await u.c.from("cases").insert({ name: "one too many", user_id: u.id })).error?.message).toMatch(/case_limit/);
  });

  it("allows 50 result reports a day per user, then refuses", async () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ user_id: u.id, module: `m${i}`, kind: "other", query_type: "username" }));
    expect((await admin.from("result_reports").insert(rows)).error).toBeNull();
    expect((await u.c.from("result_reports").insert({ user_id: u.id, module: "m51", kind: "other", query_type: "username" })).error?.message).toMatch(/report_limit/);
  });

  it("public report counts count people, not reports", async () => {
    const v = await newUser(admin);
    const mod = `dup-test-${crypto.randomUUID().slice(0, 8)}`;
    for (const kind of ["other", "not_this_account", "account_missing"]) {
      expect((await v.c.from("result_reports").insert({ user_id: v.id, module: mod, kind, query_type: "username" })).error).toBeNull();
    }
    const { data } = await createClient(URL_, ANON).from("module_report_counts").select("reports_30d").eq("module", mod).single();
    expect(data?.reports_30d).toBe(1);
  });
});
