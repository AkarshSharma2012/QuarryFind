import type { ModuleStatus, SearchResult, SearchRun, SearchType } from "@/lib/types";

export interface User { id: string; email: string; name?: string; avatar?: string }

export interface Case { id: string; name: string; notes: string; created_at: string; updated_at: string; item_count?: number }
export interface CaseItem {
  id: string; case_id: string; source_run_id: string | null; query_type: SearchType; query: string;
  platform: string | null; value: string | null; source: string; confidence: number;
  metadata: SearchResult["metadata"]; note: string; saved_at: string;
}
export interface ApiKey { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null }

export interface RunSnapshot { run: SearchRun; results: SearchResult[]; statuses: (ModuleStatus & { platform?: string })[] }

export interface RunHandlers {
  onSnapshot?: (s: RunSnapshot) => void;
  onResult?: (r: SearchResult) => void;
  onStatus?: (s: ModuleStatus & { platform?: string }) => void;
  onRun?: (r: SearchRun) => void;
  onError?: (message: string) => void;
}

export interface SourceHealth { module: string; state: "ok" | "degraded" | "broken" | "disabled"; checked_at: string; reports_30d: number }
export type ReportKind = "not_this_account" | "account_missing" | "other";

export class DataError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

export interface DataLayer {
  mode: "local" | "supabase";
  // auth
  getUser(): Promise<User | null>;
  onAuthChange(cb: (u: User | null) => void): () => void;
  signInWithPassword(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
  // searches
  startSearch(type: SearchType, query: string, deep: boolean): Promise<string>;
  getRun(id: string): Promise<RunSnapshot | null>;
  subscribeRun(id: string, h: RunHandlers): () => void;
  /** Runs the search's batches from this page (no-op where the server does it). Resolves when every batch was attempted. */
  driveRun(id: string, total: number, signal: AbortSignal): Promise<void>;
  listRuns(limit?: number): Promise<SearchRun[]>;
  // cases
  listCases(): Promise<Case[]>;
  getCase(id: string): Promise<{ case: Case; items: CaseItem[] } | null>;
  createCase(name: string): Promise<Case>;
  updateCase(id: string, patch: Partial<Pick<Case, "name" | "notes">>): Promise<void>;
  deleteCase(id: string): Promise<void>;
  saveToCase(caseId: string, run: Pick<SearchRun, "id" | "type" | "query">, r: SearchResult): Promise<CaseItem>;
  removeCaseItem(id: string): Promise<void>;
  updateCaseItem(id: string, note: string): Promise<void>;
  // api keys
  listApiKeys(): Promise<ApiKey[]>;
  createApiKey(name: string): Promise<{ key: string; record: ApiKey }>;
  revokeApiKey(id: string): Promise<void>;
  // source status + result reports
  listSourceHealth(): Promise<SourceHealth[]>;
  reportResult(input: { module: string; kind: ReportKind; query_type: SearchType; note: string }): Promise<void>;
  // server tools
  tool<T = unknown>(tool: string, input: string): Promise<T>;
}
