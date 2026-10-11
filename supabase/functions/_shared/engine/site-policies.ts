// A site's own published policies: security.txt (RFC 9116: who to contact,
// the disclosure policy) and robots.txt (paths it hides from crawlers, which
// crawlers it blocks, its sitemaps). Fetched through publicFetch (SSRF-safe).
import { absent, Inconclusive, readText } from "./http.ts";
import { publicFetch } from "./public-fetch.ts";
import type { CheckResult, Ctx } from "./types.ts";

type Rec = { name: string; value: string };
const MAX_LIST = 12;

/** The body of a small plain-text file, or null if missing or not really text (soft 404s). */
async function textFile(ctx: Ctx, url: string): Promise<string | null> {
  try {
    const { res, status } = await publicFetch(ctx, url);
    const type = res.headers.get("content-type") ?? "";
    if (status !== 200 || (type && !type.includes("text/plain"))) { await res.body?.cancel(); return null; }
    const body = await readText(res, 64_000);
    return /^\s*</.test(body) ? null : body;
  } catch (e) {
    if (e instanceof Inconclusive) return null;
    throw e;
  }
}

function securityRecords(txt: string): Rec[] {
  const out: Rec[] = [];
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z-]+)\s*:\s*(.+?)\s*$/);
    if (!m) continue;
    const [, key, value] = m;
    const k = key.toLowerCase();
    if (k === "contact") out.push({ name: "Security contact", value });
    else if (k === "policy") out.push({ name: "Security policy", value });
    else if (k === "expires") out.push({ name: "security.txt expires", value: value.slice(0, 10) });
    else if (k === "encryption") out.push({ name: "Security PGP key", value });
    else if (k === "acknowledgments" || k === "acknowledgements") out.push({ name: "Security hall of fame", value });
    else if (k === "hiring") out.push({ name: "Security jobs", value });
  }
  return out.slice(0, MAX_LIST);
}

function robotsRecords(txt: string): Rec[] {
  const disallowed = new Set<string>(), blocked = new Set<string>(), sitemaps = new Set<string>();
  let agents: string[] = [], inRules = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === "user-agent") { if (inRules) { agents = []; inRules = false; } agents.push(v); continue; }
    if (k === "sitemap") { if (v) sitemaps.add(v); continue; }
    if (k !== "disallow" && k !== "allow") continue;
    inRules = true;
    if (k !== "disallow" || !v) continue;
    if (v === "/") { for (const a of agents) if (a !== "*") blocked.add(a); }
    else disallowed.add(v);
  }
  return [
    ...[...disallowed].slice(0, MAX_LIST).map((value) => ({ name: "Disallowed path", value })),
    ...[...blocked].slice(0, MAX_LIST).map((value) => ({ name: "Blocks crawler", value })),
    ...[...sitemaps].slice(0, 5).map((value) => ({ name: "Sitemap", value })),
  ];
}

export async function sitePolicies(ctx: Ctx, domain: string): Promise<CheckResult> {
  const base = `https://${domain}`;
  const [wellKnown, robots] = await Promise.all([textFile(ctx, `${base}/.well-known/security.txt`), textFile(ctx, `${base}/robots.txt`)]);
  const security = wellKnown ?? await textFile(ctx, `${base}/security.txt`);
  const records = [...(security ? securityRecords(security) : []), ...(robots ? robotsRecords(robots) : [])];
  if (!security && !robots) return absent("no security.txt or robots.txt");
  if (!records.length) records.push({ name: "Files", value: [security && "security.txt", robots && "robots.txt"].filter(Boolean).join(", ") + " (no rules)" });
  return {
    outcome: "hit",
    findings: [{
      type: "record", platform: "Site policies", category: "security", value: base, confidence: 1,
      metadata: { records, url: security ? `${base}/.well-known/security.txt` : `${base}/robots.txt`, evidence: "Read from the site's own security.txt and robots.txt." },
    }],
  };
}
