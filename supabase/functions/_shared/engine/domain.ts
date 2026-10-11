// Domain modules: RDAP (WHOIS), DNS over HTTPS, mail security, certificate
// transparency subdomains, Wayback history, web server headers.
import { absent, clean, getJson, Inconclusive, inconclusive } from "./http.ts";
import { publicFetch } from "./public-fetch.ts";
import { sitePolicies } from "./site-policies.ts";
import { dohQuery, unquote } from "./dns.ts";
import type { CheckResult, Ctx, Module } from "./types.ts";

type J = Record<string, any>; // deno-lint-ignore no-explicit-any

const rec = (name: string, value: unknown) => (value === undefined || value === null || value === "" ? [] : [{ name, value: String(value) }]);

export async function rdapDomain(ctx: Ctx, domain: string): Promise<CheckResult> {
  const { status, data } = await getJson<J>(ctx, `https://rdap.org/domain/${encodeURIComponent(domain)}`, { headers: { accept: "application/rdap+json, application/json" } });
  if (status === 404) return absent("not registered (or registry has no RDAP)");
  if (status !== 200 || !data) return inconclusive(`HTTP ${status}`);
  const ev = (a: string) => (data.events ?? []).find((e: J) => e.eventAction === a)?.eventDate;
  const registrar = (data.entities ?? []).find((e: J) => (e.roles ?? []).includes("registrar"));
  const registrarName = registrar?.vcardArray?.[1]?.find((v: J[]) => v[0] === "fn")?.[3];
  const registrant = (data.entities ?? []).find((e: J) => (e.roles ?? []).includes("registrant"));
  const org = registrant?.vcardArray?.[1]?.find((v: J[]) => v[0] === "org" || v[0] === "fn")?.[3];
  const ns = (data.nameservers ?? []).map((n: J) => String(n.ldhName).toLowerCase());
  const records = [
    ...rec("Registrar", registrarName), ...rec("Registrant", org), ...rec("Created", ev("registration")?.slice(0, 10)),
    ...rec("Updated", ev("last changed")?.slice(0, 10)), ...rec("Expires", ev("expiration")?.slice(0, 10)),
    ...rec("Status", (data.status ?? []).join(", ")), ...ns.map((n: string) => ({ name: "Nameserver", value: n })),
    ...rec("DNSSEC", data.secureDNS ? (data.secureDNS.delegationSigned ? "signed" : "unsigned") : undefined),
  ];
  return { outcome: "hit", findings: [{ type: "record", platform: "WHOIS (RDAP)", category: "whois", value: domain, confidence: 1, metadata: { records, url: `https://client.rdap.org/?type=domain&object=${domain}` } }] };
}

export async function dnsRecords(ctx: Ctx, domain: string): Promise<CheckResult> {
  const types = ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "CAA", "SOA"];
  const answers = await Promise.all(types.map((t) => dohQuery(ctx, domain, t)));
  if (answers.every((a) => a === null)) return inconclusive("DNS lookups failed");
  const records = types.flatMap((t, i) => (answers[i] ?? []).map((a) => ({ name: t, value: t === "TXT" ? unquote(a.data) : a.data })));
  if (!records.length) return absent("no DNS records");
  return { outcome: "hit", findings: [{ type: "record", platform: "DNS records", category: "dns", value: domain, confidence: 1, metadata: { records } }] };
}

export async function mailSecurity(ctx: Ctx, domain: string): Promise<CheckResult> {
  const [txt, dmarc, mx] = await Promise.all([dohQuery(ctx, domain, "TXT"), dohQuery(ctx, `_dmarc.${domain}`, "TXT"), dohQuery(ctx, domain, "MX")]);
  if (txt === null && dmarc === null) return inconclusive("DNS lookups failed");
  const spf = (txt ?? []).map((a) => unquote(a.data)).find((t) => t.startsWith("v=spf1"));
  const dm = (dmarc ?? []).map((a) => unquote(a.data)).find((t) => t.startsWith("v=DMARC1"));
  const policy = dm?.match(/p=(\w+)/)?.[1];
  const records = [
    { name: "MX", value: (mx ?? []).length ? `${mx!.length} record(s)` : "none (domain does not receive mail)" },
    { name: "SPF", value: spf ?? "missing" },
    { name: "DMARC", value: dm ?? "missing" },
    { name: "Spoofable", value: !spf || !dm || policy === "none" ? "likely: weak or missing SPF/DMARC" : "unlikely: SPF and enforced DMARC" },
  ];
  return { outcome: "hit", findings: [{ type: "record", platform: "Mail security", category: "email", value: domain, confidence: 1, metadata: { records } }] };
}

export async function subdomains(ctx: Ctx, domain: string, limit = 200): Promise<CheckResult> {
  const { status, data } = await getJson<J[]>(ctx, `https://crt.sh/?q=${encodeURIComponent(`%.${domain}`)}&output=json&exclude=expired`);
  if (status !== 200 || !Array.isArray(data)) return inconclusive(`crt.sh HTTP ${status}`);
  const names = new Set<string>();
  for (const row of data) for (const n of String(row.name_value ?? "").split("\n")) {
    const x = n.trim().toLowerCase().replace(/^\*\./, "");
    if (x.endsWith(`.${domain}`) || x === domain) names.add(x);
  }
  if (!names.size) return absent("no certificates found");
  const list = [...names].sort().slice(0, limit);
  return {
    outcome: "hit",
    findings: [{ type: "record", platform: "Subdomains (certificate logs)", category: "dns", value: domain, confidence: 1, metadata: { records: list.map((s) => ({ name: "Subdomain", value: s })), total: names.size, url: `https://crt.sh/?q=%25.${domain}` } }],
  };
}

export async function wayback(ctx: Ctx, target: string): Promise<CheckResult> {
  const base = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(target)}&output=json&fl=timestamp,original,statuscode`;
  const [first, last] = await Promise.all([
    getJson<string[][]>(ctx, `${base}&limit=1`),
    getJson<string[][]>(ctx, `${base}&limit=-1`),
  ]);
  if (first.status !== 200 || !Array.isArray(first.data)) return inconclusive(`archive.org HTTP ${first.status}`);
  if (first.data.length < 2) return absent("never archived");
  const ts = (t: string) => `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
  const f = first.data[1];
  const l = Array.isArray(last.data) && last.data.length > 1 ? last.data[last.data.length - 1] : f;
  const url = `https://web.archive.org/web/*/${target}`;
  return {
    outcome: "hit",
    findings: [{ type: "record", platform: "Wayback Machine", category: "archive", value: target, confidence: 1, metadata: { url, records: [{ name: "First capture", value: ts(f[0]) }, { name: "Latest capture", value: ts(l[0]) }, { name: "Browse", value: url }] } }],
  };
}

const SEC_HEADERS = ["strict-transport-security", "content-security-policy", "x-frame-options", "x-content-type-options", "referrer-policy", "permissions-policy"];
const TECH: [RegExp, string][] = [
  [/wp-content|wp-includes/i, "WordPress"], [/cdn\.shopify\.com|Shopify\.theme/i, "Shopify"], [/__next|_next\/static/i, "Next.js"],
  [/static\.wixstatic\.com/i, "Wix"], [/squarespace\.com/i, "Squarespace"], [/data-reactroot|react-dom/i, "React"],
  [/ng-version=/i, "Angular"], [/__nuxt|_nuxt\//i, "Nuxt"], [/gatsby/i, "Gatsby"], [/googletagmanager\.com/i, "Google Tag Manager"],
  [/google-analytics\.com|gtag\(/i, "Google Analytics"], [/cdn\.jsdelivr\.net|unpkg\.com/i, "Public JS CDN"], [/webflow/i, "Webflow"],
  [/ghost\.io|content="Ghost/i, "Ghost"], [/drupal/i, "Drupal"], [/joomla/i, "Joomla"],
];

export async function httpProfile(ctx: Ctx, url: string): Promise<CheckResult> {
  const target = /^https?:\/\//.test(url) ? url : `https://${url}`;
  let res: Response, finalUrl: string;
  try { ({ res, finalUrl } = await publicFetch(ctx, target, { browser: true })); }
  catch (e) { if (e instanceof Inconclusive) return inconclusive(e.message); throw e; }
  const html = (await res.text()).slice(0, 300_000);
  const h = res.headers;
  const title = clean(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1], 140);
  const gen = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i)?.[1];
  const tech = [...new Set([...TECH.filter(([re]) => re.test(html)).map(([, n]) => n), ...(gen ? [gen] : [])])];
  const records = [
    { name: "Final URL", value: finalUrl }, { name: "Status", value: String(res.status) },
    ...rec("Title", title), ...rec("Server", h.get("server")), ...rec("Powered by", h.get("x-powered-by")),
    ...rec("CDN", h.get("cf-ray") ? "Cloudflare" : h.get("x-vercel-id") ? "Vercel" : h.get("x-amz-cf-id") ? "CloudFront" : h.get("x-served-by")?.includes("cache") ? "Fastly" : undefined),
    ...tech.map((t) => ({ name: "Tech", value: t })),
    ...SEC_HEADERS.map((k) => ({ name: k, value: h.get(k) ? "present" : "missing" })),
  ];
  return { outcome: "hit", findings: [{ type: "record", platform: "Website", category: "web", value: finalUrl, confidence: 1, metadata: { records, url: finalUrl } }] };
}

export const domainModules: Module[] = [
  { name: "rdap", platform: "WHOIS (RDAP)", category: "whois", types: ["domain"], check: (d, ctx) => rdapDomain(ctx, d) },
  { name: "dns", platform: "DNS records", category: "dns", types: ["domain"], check: (d, ctx) => dnsRecords(ctx, d) },
  { name: "mail-security", platform: "Mail security", category: "email", types: ["domain"], check: (d, ctx) => mailSecurity(ctx, d) },
  { name: "crtsh", platform: "Subdomains", category: "dns", types: ["domain"], check: (d, ctx) => subdomains(ctx, d, 100) },
  { name: "wayback", platform: "Wayback Machine", category: "archive", types: ["domain"], check: (d, ctx) => wayback(ctx, d) },
  { name: "http", platform: "Website", category: "web", types: ["domain"], check: (d, ctx) => httpProfile(ctx, d) },
  { name: "site-policies", platform: "Site policies", category: "security", types: ["domain"], check: (d, ctx) => sitePolicies(ctx, d), fixtures: { positive: "github.com", negative: "example.com" } },
];
