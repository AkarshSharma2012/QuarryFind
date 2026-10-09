import type { SearchType } from "./types.ts";

const USERNAME = /^[A-Za-z0-9._-]{1,64}$/;
const EMAIL = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,63}$/;
const DOMAIN = /^(?=.{3,253}$)(?!-)(?:[A-Za-z0-9-]{1,63}\.)+[A-Za-z]{2,63}$/;

/** Returns the normalised query, or null if invalid for that type. */
export function normalise(type: SearchType, raw: string): string | null {
  let q = (raw ?? "").trim();
  if (type === "username") {
    q = q.replace(/^@/, "").replace(/^u\//i, "");
    return USERNAME.test(q) ? q : null;
  }
  if (type === "email") {
    q = q.toLowerCase();
    return EMAIL.test(q) ? q : null;
  }
  q = q.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").replace(/\.$/, "");
  return DOMAIN.test(q) ? q : null;
}

/** Best guess of the type of a free-text query (for the single search box). */
export function guessType(raw: string): SearchType {
  const q = raw.trim();
  if (q.includes("@") && EMAIL.test(q.toLowerCase())) return "email";
  if (normalise("domain", q) && /\.[a-z]{2,}$/i.test(q.replace(/\/.*$/, ""))) return "domain";
  return "username";
}
