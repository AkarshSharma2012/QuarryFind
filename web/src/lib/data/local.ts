// Local data layer: the real engine via scripts/dev-api.ts, with a fake
// session and cases/keys kept in localStorage. Same signatures as Supabase.
import type { SearchRun } from "@/lib/types";
import { DataError, type ApiKey, type Case, type CaseItem, type DataLayer, type User } from "./types";

const API = process.env.NEXT_PUBLIC_DEV_API ?? "http://localhost:8787";

function load<T>(k: string, d: T): T {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; }
}
function store(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ }
}
const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

const listeners = new Set<(u: User | null) => void>();
const emitAuth = (u: User | null) => listeners.forEach((l) => l(u));

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  } catch {
    throw new DataError("offline", "Can’t reach the search service. Is the dev API running?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new DataError(data.error ?? "error", data.message ?? `Request failed (${res.status}).`);
  return data as T;
}

export const localData: DataLayer = {
  mode: "local",

  async getUser() { return load<User | null>("os.user", null); },
  onAuthChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  async signInWithPassword(email, password) {
    if (!email.includes("@") || password.length < 8) throw new DataError("invalid_credentials", "Email or password is wrong.");
    const u = { id: "local-user", email };
    store("os.user", u); emitAuth(u);
  },
  async signUp(email, password) {
    if (password.length < 8) throw new DataError("weak_password", "Use at least 8 characters.");
    const u = { id: "local-user", email };
    store("os.user", u); emitAuth(u);
    return { needsConfirmation: false };
  },
  async signInWithOAuth(provider) {
    const u = { id: "local-user", email: `dev@${provider}.local`, name: "Dev user" };
    store("os.user", u); emitAuth(u);
  },
  async deleteAccount() {
    try { for (const k of ["os.user", "os.cases", "os.caseItems", "os.keys"]) localStorage.removeItem(k); } catch { /* ignore */ }
    emitAuth(null);
  },
  async signOut() { try { localStorage.removeItem("os.user"); } catch { /* ignore */ } emitAuth(null); },

  async startSearch(type, query, deep) {
    const r = await api<{ run_id: string }>("/search-start", { method: "POST", body: JSON.stringify({ type, query, deep }) });
    return r.run_id;
  },
  async getRun(id) {
    try { return await api(`/runs/${id}`); } catch (e) { if ((e as DataError).code === "not_found") return null; throw e; }
  },
  subscribeRun(id, h) {
    const es = new EventSource(`${API}/runs/${id}/events`);
    es.addEventListener("snapshot", (e) => h.onSnapshot?.(JSON.parse((e as MessageEvent).data)));
    es.addEventListener("result", (e) => h.onResult?.(JSON.parse((e as MessageEvent).data)));
    es.addEventListener("status", (e) => h.onStatus?.(JSON.parse((e as MessageEvent).data)));
    es.addEventListener("run", (e) => h.onRun?.(JSON.parse((e as MessageEvent).data)));
    es.addEventListener("done", (e) => { h.onRun?.(JSON.parse((e as MessageEvent).data)); es.close(); });
    es.onerror = () => { if (es.readyState === EventSource.CLOSED) h.onError?.("Lost the live connection."); };
    return () => es.close();
  },
  async driveRun() { /* the dev API runs everything itself */ },
  async listRuns(limit = 50) { return api<SearchRun[]>(`/runs?limit=${limit}`); },

  async listCases() {
    const cases = load<Case[]>("os.cases", []);
    const items = load<CaseItem[]>("os.caseItems", []);
    return cases.map((c) => ({ ...c, item_count: items.filter((i) => i.case_id === c.id).length })).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },
  async getCase(id) {
    const c = load<Case[]>("os.cases", []).find((x) => x.id === id);
    if (!c) return null;
    return { case: c, items: load<CaseItem[]>("os.caseItems", []).filter((i) => i.case_id === id).sort((a, b) => b.saved_at.localeCompare(a.saved_at)) };
  },
  async createCase(name) {
    const n = name.trim();
    if (!n || n.length > 120) throw new DataError("invalid_request", "Give the case a name (up to 120 characters).");
    const c: Case = { id: uid(), name: n, notes: "", created_at: now(), updated_at: now() };
    store("os.cases", [c, ...load<Case[]>("os.cases", [])]);
    return c;
  },
  async updateCase(id, patch) {
    store("os.cases", load<Case[]>("os.cases", []).map((c) => (c.id === id ? { ...c, ...patch, updated_at: now() } : c)));
  },
  async deleteCase(id) {
    store("os.cases", load<Case[]>("os.cases", []).filter((c) => c.id !== id));
    store("os.caseItems", load<CaseItem[]>("os.caseItems", []).filter((i) => i.case_id !== id));
  },
  async saveToCase(caseId, run, r) {
    const items = load<CaseItem[]>("os.caseItems", []);
    const dupe = items.find((i) => i.case_id === caseId && i.source === r.source && (i.value ?? "") === (r.value ?? ""));
    if (dupe) return dupe;
    const it: CaseItem = {
      id: uid(), case_id: caseId, source_run_id: run.id, query_type: run.type, query: run.query, platform: r.platform, value: r.value,
      source: r.source, confidence: r.confidence, metadata: r.metadata, note: "", saved_at: now(),
    };
    store("os.caseItems", [it, ...items]);
    await this.updateCase(caseId, {});
    return it;
  },
  async removeCaseItem(id) { store("os.caseItems", load<CaseItem[]>("os.caseItems", []).filter((i) => i.id !== id)); },
  async updateCaseItem(id, note) { store("os.caseItems", load<CaseItem[]>("os.caseItems", []).map((i) => (i.id === id ? { ...i, note } : i))); },

  async listApiKeys() { return load<ApiKey[]>("os.keys", []); },
  async createApiKey(name) {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const key = "osk_live_" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    const record: ApiKey = { id: uid(), name: name.trim() || "Default", prefix: key.slice(0, 12), created_at: now(), last_used_at: null, revoked_at: null };
    store("os.keys", [record, ...load<ApiKey[]>("os.keys", [])]);
    return { key, record };
  },
  async revokeApiKey(id) { store("os.keys", load<ApiKey[]>("os.keys", []).map((k) => (k.id === id ? { ...k, revoked_at: now() } : k))); },

  async listSourceHealth() { return []; },
  async reportResult() { /* the dev API keeps no reports */ },

  async tool<T>(tool: string, input: string) {
    const r = await api<{ ok: boolean; error?: string; result?: T }>("/tools", { method: "POST", body: JSON.stringify({ tool, input }) });
    if (!r.ok) throw new DataError("invalid_request", r.error ?? "That didn’t work.");
    return r.result as T;
  },
};
