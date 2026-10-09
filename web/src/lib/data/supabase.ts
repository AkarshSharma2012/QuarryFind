// Supabase data layer: Auth, RLS-protected tables, Realtime for live results,
// and Edge Functions for anything privileged. Same interface as local.ts.
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import type { ModuleStatus, SearchResult, SearchRun } from "@/lib/types";
import { DataError, type ApiKey, type Case, type CaseItem, type DataLayer, type User } from "./types";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const sb = createClient(URL_, ANON, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" } });

const RUN_COLS = "id, type, query, deep, via, status, modules_total, modules_completed, modules_with_hits, modules_failed, results_purged_at, created_at, completed_at";

function toUser(u: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null | undefined): User | null {
  if (!u) return null;
  return { id: u.id, email: u.email ?? "", name: (u.user_metadata?.full_name as string) ?? undefined, avatar: (u.user_metadata?.avatar_url as string) ?? undefined };
}

async function fn<T>(name: string, init: RequestInit & { query?: string } = {}): Promise<T> {
  const { data } = await sb.auth.getSession();
  let res: Response;
  try {
    res = await fetch(`${URL_}/functions/v1/${name}${init.query ?? ""}`, {
      ...init,
      headers: { "content-type": "application/json", apikey: ANON, authorization: `Bearer ${data.session?.access_token ?? ANON}`, ...(init.headers ?? {}) },
    });
  } catch {
    throw new DataError("offline", "Can’t reach the server. Check your connection.");
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new DataError(body.error ?? "error", body.message ?? `Request failed (${res.status}).`);
  return body as T;
}

function check<T>(r: { data: T | null; error: { message: string } | null }, what: string): T {
  if (r.error) throw new DataError("db_error", `Couldn’t ${what}.`);
  return r.data as T;
}

export const supabaseData: DataLayer = {
  mode: "supabase",

  async getUser() { const { data } = await sb.auth.getSession(); return toUser(data.session?.user); },
  onAuthChange(cb) {
    const { data } = sb.auth.onAuthStateChange((_e, s) => cb(toUser(s?.user)));
    return () => data.subscription.unsubscribe();
  },
  async signInWithPassword(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new DataError("invalid_credentials", error.message.includes("confirm") ? "Confirm your email first; check your inbox." : "Email or password is wrong.");
  },
  async signUp(email, password) {
    const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/search/` } });
    if (error) throw new DataError("sign_up_failed", error.message);
    return { needsConfirmation: !data.session };
  },
  async signInWithOAuth(provider) {
    const next = new URLSearchParams(location.search).get("next") ?? "/search/";
    const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: `${location.origin}${next.startsWith("/") ? next : "/search/"}` } });
    if (error) throw new DataError("oauth_failed", `${provider === "github" ? "GitHub" : "Google"} sign-in isn’t available right now.`);
  },
  async signOut() { await sb.auth.signOut(); },
  async deleteAccount() { await fn("account", { method: "DELETE" }); await sb.auth.signOut(); },

  async startSearch(type, query, deep) {
    return (await fn<{ run_id: string }>("search-start", { method: "POST", body: JSON.stringify({ type, query, deep }) })).run_id;
  },
  async getRun(id) {
    const run = check(await sb.from("search_runs").select(RUN_COLS).eq("id", id).maybeSingle(), "load the search") as SearchRun | null;
    if (!run) return null;
    const [results, statuses] = await Promise.all([
      sb.from("search_results").select("*").eq("run_id", id).order("seq"),
      sb.from("module_statuses").select("run_id, module, platform, outcome, detail, latency_ms").eq("run_id", id),
    ]);
    return { run, results: check(results, "load results") as SearchResult[], statuses: check(statuses, "load sources") as (ModuleStatus & { platform?: string })[] };
  },
  subscribeRun(id, h) {
    const ch: RealtimeChannel = sb.channel(`run-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "search_results", filter: `run_id=eq.${id}` }, (p) => h.onResult?.(p.new as SearchResult))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "module_statuses", filter: `run_id=eq.${id}` }, (p) => h.onStatus?.(p.new as ModuleStatus))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "search_runs", filter: `id=eq.${id}` }, (p) => h.onRun?.(p.new as SearchRun))
      .subscribe(async (status) => {
        // Rows that landed between the first load and the subscription: re-sync once.
        if (status === "SUBSCRIBED") { const s = await this.getRun(id); if (s) h.onSnapshot?.(s); }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") h.onError?.("Lost the live connection.");
      });
    return () => { sb.removeChannel(ch); };
  },
  async listRuns(limit = 50) {
    return check(await sb.from("search_runs").select(RUN_COLS).order("created_at", { ascending: false }).limit(limit), "load your history") as SearchRun[];
  },

  async listCases() {
    const rows = check(await sb.from("cases").select("*, case_items(count)").order("updated_at", { ascending: false }), "load cases") as (Case & { case_items: { count: number }[] })[];
    return rows.map(({ case_items, ...c }) => ({ ...c, item_count: case_items?.[0]?.count ?? 0 }));
  },
  async getCase(id) {
    const c = check(await sb.from("cases").select("*").eq("id", id).maybeSingle(), "load the case") as Case | null;
    if (!c) return null;
    const items = check(await sb.from("case_items").select("*").eq("case_id", id).order("saved_at", { ascending: false }), "load saved findings") as CaseItem[];
    return { case: c, items };
  },
  async createCase(name) {
    const n = name.trim();
    if (!n || n.length > 120) throw new DataError("invalid_request", "Give the case a name (up to 120 characters).");
    const { data: s } = await sb.auth.getSession();
    return check(await sb.from("cases").insert({ name: n, user_id: s.session?.user.id }).select("*").single(), "create the case") as Case;
  },
  async updateCase(id, patch) { check(await sb.from("cases").update(patch).eq("id", id), "save the case"); },
  async deleteCase(id) { check(await sb.from("cases").delete().eq("id", id), "delete the case"); },
  async saveToCase(caseId, run, r) {
    const { data: s } = await sb.auth.getSession();
    const row = {
      case_id: caseId, user_id: s.session?.user.id, source_run_id: run.id, query_type: run.type, query: run.query,
      platform: r.platform, value: r.value, source: r.source, confidence: r.confidence, metadata: r.metadata,
    };
    const res = await sb.from("case_items").insert(row).select("*").single();
    if (res.error?.code === "23505") {
      return check(await sb.from("case_items").select("*").eq("case_id", caseId).eq("source", r.source).eq("value", r.value ?? "").maybeSingle(), "save") as CaseItem;
    }
    const it = check(res, "save to the case") as CaseItem;
    return it;
  },
  async removeCaseItem(id) { check(await sb.from("case_items").delete().eq("id", id), "remove the finding"); },
  async updateCaseItem(id, note) { check(await sb.from("case_items").update({ note }).eq("id", id), "save the note"); },

  async listApiKeys() {
    return check(await sb.from("api_keys").select("id, name, prefix, created_at, last_used_at, revoked_at").order("created_at", { ascending: false }), "load keys") as ApiKey[];
  },
  async createApiKey(name) { return fn<{ key: string; record: ApiKey }>("api-keys", { method: "POST", body: JSON.stringify({ name }) }); },
  async revokeApiKey(id) { await fn("api-keys", { method: "DELETE", query: `?id=${id}` }); },

  async tool<T>(tool: string, input: string) {
    const r = await fn<{ ok: boolean; error?: string; result?: T }>("tools", { method: "POST", body: JSON.stringify({ tool, input }) });
    if (!r.ok) throw new DataError("invalid_request", r.error ?? "That didn’t work.");
    return r.result as T;
  },
};
