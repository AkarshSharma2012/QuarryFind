import type { SearchResult, SearchRun } from "@/lib/types";

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Neutralise spreadsheet formulas, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function resultsCsv(run: SearchRun, rs: SearchResult[]) {
  const head = ["search_type", "query", "platform", "type", "value", "url", "display_name", "confidence", "source", "found_at"];
  const rows = rs.map((r) => [run.type, run.query, r.platform, r.type, r.value, r.metadata?.url, r.metadata?.display_name, r.confidence, r.source, r.created_at]);
  return [head, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

export function fileSlug(s: string) {
  return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 40) || "search";
}
