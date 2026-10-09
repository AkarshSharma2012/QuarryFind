export type SearchType = "email" | "username" | "domain";
export type RunStatus = "running" | "completed" | "failed";
export type Outcome = "hit" | "absent" | "inconclusive" | "error";

export interface ResultMetadata {
  url?: string;
  avatar?: string;
  display_name?: string;
  handle?: string;
  bio?: string;
  stats?: { label: string; value: string | number }[];
  records?: { name: string; value: string }[];
  [k: string]: unknown;
}

export interface SearchResult {
  run_id: string;
  seq: number;
  type: string; // account | profile | lead | record
  platform: string | null;
  category: string | null;
  value: string | null;
  confidence: number;
  source: string;
  metadata: ResultMetadata;
  created_at: string;
}

export interface SearchRun {
  id: string;
  type: SearchType;
  query: string;
  deep: boolean;
  via: "web" | "api";
  status: RunStatus;
  modules_total: number;
  modules_completed: number;
  modules_with_hits: number;
  modules_failed: number;
  results_purged_at: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ModuleStatus {
  run_id: string;
  module: string;
  outcome: Outcome;
  detail: string | null;
  latency_ms: number | null;
}
