// Email modules: public signals only. No sign-up or password-reset probing.
import { absent, blocked, clean, get, getJson, inconclusive, sha256Hex } from "./http.ts";
import { dohQuery } from "./dns.ts";
import type { Module } from "./types.ts";

type J = Record<string, any>; // deno-lint-ignore no-explicit-any

const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org", "yopmail.com", "trashmail.com",
  "getnada.com", "dispostable.com", "sharklasers.com", "maildrop.cc", "throwawaymail.com", "fakeinbox.com", "mintemail.com",
  "mohmal.com", "emailondeck.com", "tempail.com", "burnermail.io", "mailnesia.com", "spamgourmet.com",
]);

const PROVIDERS: [RegExp, string][] = [
  [/google\.com\.?$|googlemail\.com\.?$/i, "Google Workspace / Gmail"],
  [/outlook\.com\.?$|protection\.outlook\.com\.?$/i, "Microsoft 365 / Outlook"],
  [/protonmail\.ch\.?$|proton\.me\.?$/i, "Proton Mail"],
  [/yahoodns\.net\.?$/i, "Yahoo"],
  [/icloud\.com\.?$|me\.com\.?$/i, "iCloud"],
  [/zoho\.(com|eu|in)\.?$/i, "Zoho Mail"],
  [/mx\.cloudflare\.net\.?$/i, "Cloudflare Email Routing"],
  [/fastmail\.com\.?$|messagingengine\.com\.?$/i, "Fastmail"],
  [/tutanota\.de\.?$/i, "Tuta"],
  [/mimecast\.com\.?$/i, "Mimecast"],
];

export const emailModules: Module[] = [
  {
    name: "gravatar", platform: "Gravatar", category: "identity", types: ["email"],
    async check(email, ctx) {
      const hash = await sha256Hex(email.trim().toLowerCase());
      const { status, data } = await getJson<J>(ctx, `https://api.gravatar.com/v3/profiles/${hash}`, {
        headers: ctx.env.GRAVATAR_API_KEY ? { authorization: `Bearer ${ctx.env.GRAVATAR_API_KEY}` } : {},
      });
      if (status === 404) return absent();
      if (status !== 200 || !data) return inconclusive(`HTTP ${status}`);
      const accounts = (data.verified_accounts ?? []).map((a: J) => ({ name: a.service_label ?? a.service_type, value: a.url }));
      return {
        outcome: "hit",
        findings: [
          {
            type: "profile", platform: "Gravatar", category: "identity", value: data.profile_url, confidence: 1,
            metadata: {
              url: data.profile_url, avatar: data.avatar_url, display_name: clean(data.display_name), handle: data.profile_url?.split("/").pop(),
              bio: clean(data.description), location: clean(data.location), records: accounts, linked_accounts: accounts,
              evidence: "Gravatar has a public profile for this email address (looked up by its hash).",
            },
          },
          ...accounts.map((a: { name: string; value: string }) => ({
            type: "account" as const, platform: a.name, category: "social" as const, value: a.value, confidence: 0.95,
            metadata: { url: a.value, via: "Gravatar verified account", evidence: "Listed as a verified account on the email's Gravatar profile." },
          })),
        ],
      };
    },
    fixtures: { positive: "beau@automattic.com", negative: "zq8x7k2m9vplw3@example.com" },
  },
  {
    name: "libravatar", platform: "Libravatar", category: "identity", types: ["email"],
    async check(email, ctx) {
      const hash = await sha256Hex(email.trim().toLowerCase());
      const res = await get(ctx, `https://seccdn.libravatar.org/avatar/${hash}?d=404&s=80`);
      await res.body?.cancel();
      if (res.status === 404) return absent();
      if (res.status !== 200) return inconclusive(`HTTP ${res.status}`);
      const avatar = `https://seccdn.libravatar.org/avatar/${hash}?s=160`;
      return { outcome: "hit", findings: [{ type: "account", platform: "Libravatar", category: "identity", value: avatar, confidence: 0.9, metadata: { avatar, url: avatar, evidence: "Libravatar serves an avatar for this email's hash." } }] };
    },
  },
  {
    name: "github-email", platform: "GitHub (commit author)", category: "dev", types: ["email"],
    async check(email, ctx) {
      const auth = ctx.env.GITHUB_TOKEN ? { authorization: `Bearer ${ctx.env.GITHUB_TOKEN}` } : {};
      const { status, data } = await getJson<J>(ctx, `https://api.github.com/search/commits?q=author-email:${encodeURIComponent(email)}&per_page=5`, {
        headers: { accept: "application/vnd.github+json", ...auth },
      });
      if (blocked(status) || status === 422 || status >= 400) return inconclusive(`HTTP ${status}`);
      const items: J[] = data?.items ?? [];
      if (!items.length) return absent("no public commits with this author email");
      const logins = new Map<string, J>();
      for (const it of items) if (it.author?.login) logins.set(it.author.login, it.author);
      const repos = [...new Set(items.map((i) => i.repository?.full_name).filter(Boolean))].slice(0, 5);
      const findings = [...logins.values()].map((a) => ({
        type: "profile" as const, platform: "GitHub", category: "dev" as const, value: a.html_url, confidence: 0.95,
        metadata: { url: a.html_url, avatar: a.avatar_url, handle: a.login, records: repos.map((r) => ({ name: "commits in", value: r })), evidence: "Public commits on GitHub list this email as the author and are linked to this account." },
      }));
      if (!findings.length) {
        findings.push({ type: "profile", platform: "GitHub", category: "dev", value: items[0].html_url, confidence: 0.7, metadata: { url: items[0].html_url, avatar: undefined, handle: clean(items[0].commit?.author?.name) ?? "", records: repos.map((r) => ({ name: "commits in", value: r })) } });
      }
      return { outcome: "hit", findings };
    },
    fixtures: { positive: "torvalds@linux-foundation.org", negative: "zq8x7k2m9vplw3@example.com" },
  },
  {
    name: "openpgp", platform: "keys.openpgp.org", category: "identity", types: ["email"],
    async check(email, ctx) {
      const res = await get(ctx, `https://keys.openpgp.org/vks/v1/by-email/${encodeURIComponent(email)}`);
      await res.body?.cancel();
      if (res.status === 404) return absent();
      if (res.status !== 200) return inconclusive(`HTTP ${res.status}`);
      const url = `https://keys.openpgp.org/search?q=${encodeURIComponent(email)}`;
      return { outcome: "hit", findings: [{ type: "account", platform: "OpenPGP key", category: "identity", value: url, confidence: 1, metadata: { url, bio: "A public PGP key is published for this address.", evidence: "keys.openpgp.org has a verified key for this exact address." } }] };
    },
  },
  {
    name: "email-domain", platform: "Mail domain", category: "email", types: ["email"],
    async check(email, ctx) {
      const domain = email.split("@")[1];
      const mx = await dohQuery(ctx, domain, "MX");
      if (mx === null) return inconclusive("DNS lookup failed");
      const hosts = mx.map((r) => r.data.split(" ").pop() ?? r.data);
      const provider = hosts.map((h) => PROVIDERS.find(([re]) => re.test(h))?.[1]).find(Boolean);
      const records = [
        { name: "Domain", value: domain },
        { name: "Accepts mail", value: hosts.length ? "yes (MX records found)" : "no MX records" },
        ...(provider ? [{ name: "Provider", value: provider }] : []),
        ...(DISPOSABLE.has(domain) ? [{ name: "Disposable", value: "yes, a throwaway inbox service" }] : []),
        ...hosts.slice(0, 4).map((h) => ({ name: "MX", value: h })),
      ];
      return { outcome: "hit", findings: [{ type: "record", platform: "Mail domain", category: "email", value: domain, confidence: 1, metadata: { records } }] };
    },
  },
  {
    name: "email-localpart", platform: "Username lead", category: "identity", types: ["email"],
    async check(email) {
      const local = email.split("@")[0].replace(/\+.*$/, "");
      if (!/^[A-Za-z0-9._-]{3,}$/.test(local)) return absent("local part too short or unusual");
      return { outcome: "hit", findings: [{ type: "lead", platform: "Username lead", value: local, confidence: 0.3, metadata: { bio: "The part before the @ is often reused as a username. This is a guess to check, not a link." } }] };
    },
  },
];
