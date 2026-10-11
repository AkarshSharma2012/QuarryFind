// Single-platform deep lookups (GitHub, Reddit) and the server-side tool router.
import { clean, getJson, year } from "./http.ts";
import { dnsRecords, httpProfile, mailSecurity, rdapDomain, subdomains, wayback } from "./domain.ts";
import { ipLookup, isIp } from "./ip.ts";
import { normalise } from "./validate.ts";
import type { CheckResult, Ctx } from "./types.ts";

type J = Record<string, any>; // deno-lint-ignore no-explicit-any

export interface ActivityProfile {
  hours: number[];            // 24 buckets, UTC
  weekdays: number[];         // 7 buckets, Sun..Sat, UTC
  likelyUtcOffset?: number;   // hours, a guess
  samples: number;
}

/** Guess a UTC offset by assuming the quietest 6-hour window is local night (~02:00–08:00). */
export function activityProfile(timestamps: (string | number)[]): ActivityProfile {
  const hours = Array(24).fill(0);
  const weekdays = Array(7).fill(0);
  for (const t of timestamps) {
    const d = new Date(typeof t === "number" ? (t < 1e12 ? t * 1000 : t) : t);
    if (Number.isNaN(d.getTime())) continue;
    hours[d.getUTCHours()]++;
    weekdays[d.getUTCDay()]++;
  }
  const samples = hours.reduce((a, b) => a + b, 0);
  if (samples < 20) return { hours, weekdays, samples };
  const sums = Array.from({ length: 24 }, (_, s) => { let t = 0; for (let k = 0; k < 6; k++) t += hours[(s + k) % 24]; return t; });
  const min = Math.min(...sums);
  // Ties (a long quiet stretch): take the middle candidate, not the first.
  const cands = sums.map((v, s) => (v === min ? s : -1)).filter((s) => s >= 0);
  const best = cands[Math.floor(cands.length / 2)];
  let off = 2 - best;               // quiet window should run 02:00–08:00 local
  if (off > 12) off -= 24;
  if (off < -11) off += 24;
  return { hours, weekdays, samples, likelyUtcOffset: off };
}

export async function githubLookup(ctx: Ctx, handle: string) {
  const h = ctx.env.GITHUB_TOKEN ? { authorization: `Bearer ${ctx.env.GITHUB_TOKEN}` } : {};
  const headers = { accept: "application/vnd.github+json", ...h };
  const u = await getJson<J>(ctx, `https://api.github.com/users/${encodeURIComponent(handle)}`, { headers });
  if (u.status === 404) return { found: false as const };
  if (u.status !== 200 || !u.data) return { found: false as const, error: `GitHub answered HTTP ${u.status}` };
  const [repos, events] = await Promise.all([
    getJson<J[]>(ctx, `https://api.github.com/users/${encodeURIComponent(handle)}/repos?per_page=100&sort=pushed`, { headers }),
    getJson<J[]>(ctx, `https://api.github.com/users/${encodeURIComponent(handle)}/events/public?per_page=100`, { headers }),
  ]);
  const rs = Array.isArray(repos.data) ? repos.data : [];
  const ev = Array.isArray(events.data) ? events.data : [];
  const langs = new Map<string, number>();
  for (const r of rs) if (r.language && !r.fork) langs.set(r.language, (langs.get(r.language) ?? 0) + 1);
  // Author names/emails that appear in public push events (commit metadata is public on GitHub).
  const authors = new Map<string, { name: string; email: string; count: number }>();
  for (const e of ev) for (const c of e.payload?.commits ?? []) {
    const key = `${c.author?.name}|${c.author?.email}`;
    const cur = authors.get(key) ?? { name: c.author?.name ?? "", email: c.author?.email ?? "", count: 0 };
    cur.count++; authors.set(key, cur);
  }
  const d = u.data;
  return {
    found: true as const,
    profile: {
      url: d.html_url, avatar: d.avatar_url, name: clean(d.name), login: d.login, bio: clean(d.bio), company: clean(d.company),
      blog: clean(d.blog), location: clean(d.location), email: clean(d.email), twitter: d.twitter_username ?? undefined,
      followers: d.followers, following: d.following, public_repos: d.public_repos, gists: d.public_gists,
      created: d.created_at, updated: d.updated_at, hireable: d.hireable ?? undefined,
    },
    languages: [...langs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, repos]) => ({ name, repos })),
    repos: rs.filter((r) => !r.fork).slice(0, 12).map((r) => ({
      name: r.name, url: r.html_url, description: clean(r.description, 160), stars: r.stargazers_count, language: r.language, pushed: r.pushed_at,
    })),
    commit_identities: [...authors.values()].sort((a, b) => b.count - a.count).slice(0, 10),
    activity: activityProfile(ev.map((e) => e.created_at)),
  };
}

export async function redditLookup(ctx: Ctx, handle: string) {
  const about = await getJson<J>(ctx, `https://www.reddit.com/user/${encodeURIComponent(handle)}/about.json`);
  if (about.status === 404) return { found: false as const };
  if (about.status !== 200 || !about.data?.data) return { found: false as const, error: `Reddit answered HTTP ${about.status}. Reddit often blocks data-centre traffic; try again later.` };
  const items = await getJson<J>(ctx, `https://www.reddit.com/user/${encodeURIComponent(handle)}/overview.json?limit=100`);
  const children: J[] = items.data?.data?.children ?? [];
  const subs = new Map<string, number>();
  for (const c of children) { const s = c.data?.subreddit; if (s) subs.set(s, (subs.get(s) ?? 0) + 1); }
  const a = about.data.data;
  return {
    found: true as const,
    profile: {
      url: `https://www.reddit.com/user/${a.name}`, name: a.name, avatar: String(a.icon_img ?? "").split("?")[0] || undefined,
      bio: clean(a.subreddit?.public_description), link_karma: a.link_karma, comment_karma: a.comment_karma, total_karma: a.total_karma,
      created: a.created_utc ? new Date(a.created_utc * 1000).toISOString() : undefined, joined_year: year(a.created_utc),
      verified_email: a.has_verified_email, is_mod: a.is_mod, suspended: a.is_suspended ?? false,
    },
    communities: [...subs.entries()].sort((x, y) => y[1] - x[1]).slice(0, 15).map(([name, count]) => ({ name, count })),
    recent: children.slice(0, 10).map((c) => ({
      kind: c.kind === "t1" ? "comment" : "post", subreddit: c.data?.subreddit, title: clean(c.data?.title ?? c.data?.body, 200),
      url: `https://www.reddit.com${c.data?.permalink ?? ""}`, created: c.data?.created_utc ? new Date(c.data.created_utc * 1000).toISOString() : undefined,
    })),
    activity: activityProfile(children.map((c) => c.data?.created_utc).filter(Boolean)),
  };
}

export type ToolName = "ip" | "subdomains" | "wayback" | "headers" | "dns" | "whois" | "mail" | "github" | "reddit";

/** Server-side tools. Input is validated here; returns a CheckResult or a lookup object. */
export async function runTool(ctx: Ctx, tool: ToolName, input: string): Promise<{ ok: boolean; error?: string; result?: unknown }> {
  const raw = (input ?? "").trim();
  if (!raw || raw.length > 300) return { ok: false, error: "Enter a value (up to 300 characters)." };
  const domain = () => normalise("domain", raw);
  const wrap = (r: CheckResult) => ({ ok: true, result: r });
  switch (tool) {
    case "ip": return isIp(raw) ? wrap(await ipLookup(ctx, raw)) : { ok: false, error: "That isn’t a valid IPv4 or IPv6 address." };
    case "subdomains": { const d = domain(); return d ? wrap(await subdomains(ctx, d, 1000)) : { ok: false, error: "Enter a domain like example.com." }; }
    case "dns": { const d = domain(); return d ? wrap(await dnsRecords(ctx, d)) : { ok: false, error: "Enter a domain like example.com." }; }
    case "whois": { const d = domain(); return d ? wrap(await rdapDomain(ctx, d)) : { ok: false, error: "Enter a domain like example.com." }; }
    case "mail": { const d = domain(); return d ? wrap(await mailSecurity(ctx, d)) : { ok: false, error: "Enter a domain like example.com." }; }
    case "wayback": {
      const t = raw.replace(/^https?:\/\//, "");
      return /^[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(t) ? wrap(await wayback(ctx, t)) : { ok: false, error: "Enter a domain or URL." };
    }
    case "headers": {
      const t = raw.replace(/^https?:\/\//, "");
      if (!/^[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(t)) return { ok: false, error: "Enter a public website address." };
      // httpProfile refuses private addresses on every redirect hop (public-fetch.ts).
      const r = await httpProfile(ctx, `https://${t}`);
      return r.outcome === "inconclusive" && /private|resolve|scheme|redirect|invalid/.test(r.detail ?? "")
        ? { ok: false, error: "That address doesn’t lead to a public website." } : wrap(r);
    }
    case "github": { const h = normalise("username", raw); return h ? { ok: true, result: await githubLookup(ctx, h) } : { ok: false, error: "Enter a GitHub username." }; }
    case "reddit": { const h = normalise("username", raw); return h ? { ok: true, result: await redditLookup(ctx, h) } : { ok: false, error: "Enter a Reddit username." }; }
    default: return { ok: false, error: "Unknown tool." };
  }
}
