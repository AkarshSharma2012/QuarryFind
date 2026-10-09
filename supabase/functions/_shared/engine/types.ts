export type SearchType = "username" | "email" | "domain";
export type Outcome = "hit" | "absent" | "inconclusive" | "error";

export type Category =
  | "social" | "dev" | "gaming" | "media" | "creative" | "community" | "commerce"
  | "identity" | "email" | "dns" | "whois" | "web" | "security" | "archive";

export interface Finding {
  type?: "account" | "profile" | "lead" | "record";
  platform?: string;
  category?: Category;
  value?: string;
  confidence?: number;
  metadata?: {
    url?: string;
    avatar?: string;
    display_name?: string;
    handle?: string;
    bio?: string;
    stats?: { label: string; value: string | number }[];
    records?: { name: string; value: string }[];
    [k: string]: unknown;
  };
}

export interface CheckResult {
  outcome: Outcome;
  findings?: Finding[];
  detail?: string;
}

export interface Ctx {
  fetch: typeof fetch;
  timeoutMs: number;
  env: Record<string, string | undefined>;
}

export interface Module {
  name: string;           // stable id, used as `source`
  platform: string;       // human label
  category: Category;
  types: SearchType[];
  deep?: boolean;         // only in deep username searches
  check(query: string, ctx: Ctx): Promise<CheckResult>;
  fixtures?: { positive: string; negative: string };
}
