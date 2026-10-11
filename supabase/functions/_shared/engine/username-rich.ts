// Username modules that read official / public JSON APIs and return profile
// fields. Each one distinguishes a real absence signal from a blocked answer.
import { absent, blocked, clean, get, getJson, inconclusive, year } from "./http.ts";
import type { CheckResult, Ctx, Finding, Module } from "./types.ts";

type J = Record<string, any>; // deno-lint-ignore no-explicit-any

function hit(f: Finding): CheckResult {
  const metadata = { evidence: `${f.platform ?? "The site"}'s public API returned this profile for the exact username.`, ...(f.metadata ?? {}) };
  return { outcome: "hit", findings: [{ type: "profile", confidence: 1, ...f, metadata }] };
}

function stat(label: string, value: unknown) {
  return value === undefined || value === null || value === "" ? [] : [{ label, value: value as string | number }];
}

/** JSON module helper: 404 (or `isMissing`) → absent; blocked → inconclusive. */
function jsonModule(m: Omit<Module, "check" | "types"> & {
  url: (u: string) => string;
  headers?: (ctx: Ctx) => Record<string, string>;
  isMissing?: (d: J, status: number) => boolean;
  map: (d: J, u: string) => Finding | null;
}): Module {
  return {
    ...m,
    types: ["username"],
    async check(u, ctx) {
      const { status, data } = await getJson<J>(ctx, m.url(u), { headers: m.headers?.(ctx) });
      if (status === 404 || status === 410) return absent();
      if (status === 400 && m.isMissing && data && m.isMissing(data, status)) return absent();
      if (blocked(status) || status >= 300) return inconclusive(`HTTP ${status}`);
      if (data === null) return m.isMissing ? absent("empty answer") : inconclusive("unparseable answer");
      if (m.isMissing?.(data, status)) return absent();
      const f = m.map(data, u);
      return f ? hit({ platform: m.platform, category: m.category, ...f }) : absent();
    },
  };
}

// App-only OAuth token for Reddit (client credentials), cached until shortly before it expires.
let reddit: { token: string; until: number } | null = null;
async function redditToken(ctx: Ctx): Promise<string | null> {
  const id = ctx.env.REDDIT_CLIENT_ID, secret = ctx.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (reddit && reddit.until > Date.now()) return reddit.token;
  try {
    const res = await get(ctx, "https://www.reddit.com/api/v1/access_token", {
      method: "POST", body: "grant_type=client_credentials",
      headers: { authorization: `Basic ${btoa(`${id}:${secret}`)}`, "content-type": "application/x-www-form-urlencoded" },
    });
    const j = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!j.access_token) return null;
    reddit = { token: j.access_token, until: Date.now() + ((j.expires_in ?? 3600) - 120) * 1000 };
    return reddit.token;
  } catch { return null; }
}

export const richModules: Module[] = [
  jsonModule({
    name: "github", platform: "GitHub", category: "dev",
    url: (u) => `https://api.github.com/users/${encodeURIComponent(u)}`,
    headers: (ctx) => ({ accept: "application/vnd.github+json", ...(ctx.env.GITHUB_TOKEN ? { authorization: `Bearer ${ctx.env.GITHUB_TOKEN}` } : {}) }),
    map: (d) => ({
      value: d.html_url,
      metadata: {
        url: d.html_url, avatar: d.avatar_url, display_name: clean(d.name), handle: d.login, bio: clean(d.bio),
        location: clean(d.location), company: clean(d.company), blog: clean(d.blog), email: clean(d.email),
        stats: [...stat("Repos", d.public_repos), ...stat("Followers", d.followers), ...stat("Joined", year(d.created_at))],
      },
    }),
    fixtures: { positive: "torvalds", negative: "zq8x7k2m9vplw3" },
  }),
  jsonModule({
    name: "gitlab", platform: "GitLab", category: "dev",
    url: (u) => `https://gitlab.com/api/v4/users?username=${encodeURIComponent(u)}`,
    isMissing: (d) => !Array.isArray(d) || d.length === 0,
    map: (d) => {
      const x = d[0];
      return { value: x.web_url, metadata: { url: x.web_url, avatar: x.avatar_url, display_name: clean(x.name), handle: x.username } };
    },
    fixtures: { positive: "dzaporozhets", negative: "zq8x7k2m9vplw3" },
  }),
  jsonModule({
    name: "codeberg", platform: "Codeberg", category: "dev",
    url: (u) => `https://codeberg.org/api/v1/users/${encodeURIComponent(u)}`,
    map: (d) => ({
      value: `https://codeberg.org/${d.login}`,
      metadata: {
        url: `https://codeberg.org/${d.login}`, avatar: d.avatar_url, display_name: clean(d.full_name), handle: d.login,
        bio: clean(d.description), stats: [...stat("Followers", d.followers_count), ...stat("Joined", year(d.created))],
      },
    }),
    fixtures: { positive: "forgejo", negative: "zq8x7k2m9vplw3" },
  }),
  jsonModule({
    name: "hackernews", platform: "Hacker News", category: "community",
    url: (u) => `https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(u)}.json`,
    isMissing: (d) => d === null,
    map: (d) => ({
      value: `https://news.ycombinator.com/user?id=${d.id}`,
      metadata: {
        url: `https://news.ycombinator.com/user?id=${d.id}`, handle: d.id, bio: clean(String(d.about ?? "").replace(/<[^>]+>/g, " ")),
        stats: [...stat("Karma", d.karma), ...stat("Joined", year(d.created))],
      },
    }),
    fixtures: { positive: "pg", negative: "zq8x7k2m9vplw3" },
  }),
  jsonModule({
    name: "devto", platform: "DEV Community", category: "dev",
    url: (u) => `https://dev.to/api/users/by_username?url=${encodeURIComponent(u)}`,
    map: (d) => ({
      value: `https://dev.to/${d.username}`,
      metadata: {
        url: `https://dev.to/${d.username}`, avatar: d.profile_image, display_name: clean(d.name), handle: d.username,
        bio: clean(d.summary), location: clean(d.location), stats: stat("Joined", clean(d.joined_at)),
      },
    }),
    fixtures: { positive: "ben", negative: "zq8x7k2m9vplw3" },
  }),
  jsonModule({
    name: "keybase", platform: "Keybase", category: "identity",
    url: (u) => `https://keybase.io/_/api/1.0/user/lookup.json?usernames=${encodeURIComponent(u)}&fields=basics,profile,proofs_summary,pictures`,
    isMissing: (d) => !Array.isArray(d.them) || !d.them[0],
    map: (d) => {
      const x = d.them[0];
      const proofs = (x.proofs_summary?.all ?? []).map((p: J) => ({ name: p.proof_type, value: p.nametag }));
      return {
        value: `https://keybase.io/${x.basics.username}`,
        metadata: {
          url: `https://keybase.io/${x.basics.username}`, avatar: x.pictures?.primary?.url, display_name: clean(x.profile?.full_name),
          handle: x.basics.username, bio: clean(x.profile?.bio), records: proofs, linked_accounts: proofs,
        },
      };
    },
    fixtures: { positive: "chris", negative: "zq8x7k2m9vplw3" },
  }),
  jsonModule({
    name: "chesscom", platform: "Chess.com", category: "gaming",
    url: (u) => `https://api.chess.com/pub/player/${encodeURIComponent(u.toLowerCase())}`,
    map: (d) => ({
      value: d.url,
      metadata: {
        url: d.url, avatar: d.avatar, display_name: clean(d.name), handle: d.username,
        stats: [...stat("Followers", d.followers), ...stat("Joined", year(d.joined)), ...stat("Status", d.status)],
      },
    }),
    fixtures: { positive: "hikaru", negative: "zq8x7k2m9vplw3" },
  }),
  jsonModule({
    name: "lichess", platform: "Lichess", category: "gaming",
    url: (u) => `https://lichess.org/api/user/${encodeURIComponent(u)}`,
    isMissing: (d) => d.disabled === true && !d.id,
    map: (d) => ({
      value: `https://lichess.org/@/${d.username}`,
      metadata: {
        url: `https://lichess.org/@/${d.username}`, handle: d.username, display_name: clean([d.profile?.firstName, d.profile?.lastName].filter(Boolean).join(" ")),
        bio: clean(d.profile?.bio), stats: [...stat("Games", d.count?.all), ...stat("Joined", year(d.createdAt))],
      },
    }),
    fixtures: { positive: "DrNykterstein", negative: "zq8x7k2m9vplw3" },
  }),
  jsonModule({
    name: "dockerhub", platform: "Docker Hub", category: "dev",
    url: (u) => `https://hub.docker.com/v2/users/${encodeURIComponent(u.toLowerCase())}/`,
    map: (d) => ({
      value: `https://hub.docker.com/u/${d.username}`,
      metadata: { url: `https://hub.docker.com/u/${d.username}`, avatar: d.gravatar_url || undefined, display_name: clean(d.full_name), handle: d.username, location: clean(d.location), stats: stat("Joined", year(d.date_joined)) },
    }),
    fixtures: { positive: "library", negative: "zq8x7k2m9vplw3" },
  }),
  jsonModule({
    name: "huggingface", platform: "Hugging Face", category: "dev",
    url: (u) => `https://huggingface.co/api/users/${encodeURIComponent(u)}/overview`,
    map: (d) => ({
      value: `https://huggingface.co/${d.user}`,
      metadata: {
        url: `https://huggingface.co/${d.user}`, avatar: String(d.avatarUrl ?? "").startsWith("/") ? `https://huggingface.co${d.avatarUrl}` : d.avatarUrl, display_name: clean(d.fullname), handle: d.user,
        stats: [...stat("Models", d.numModels), ...stat("Followers", d.numFollowers)],
      },
    }),
    fixtures: { positive: "julien-c", negative: "zq8x7k2m9vplw3" },
  }),
  jsonModule({
    name: "bluesky", platform: "Bluesky", category: "social",
    url: (u) => `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(u.includes(".") ? u : `${u}.bsky.social`)}`,
    isMissing: (d, s) => s === 400 || !d.did,
    map: (d) => ({
      value: `https://bsky.app/profile/${d.handle}`,
      metadata: {
        url: `https://bsky.app/profile/${d.handle}`, avatar: d.avatar, display_name: clean(d.displayName), handle: d.handle, bio: clean(d.description),
        stats: [...stat("Followers", d.followersCount), ...stat("Posts", d.postsCount), ...stat("Joined", year(d.createdAt))],
      },
    }),
    fixtures: { positive: "jay", negative: "zq8x7k2m9vplw3" },
  }),
  jsonModule({
    name: "mastodon-social", platform: "Mastodon (mastodon.social)", category: "social",
    url: (u) => `https://mastodon.social/api/v1/accounts/lookup?acct=${encodeURIComponent(u)}`,
    map: (d) => ({
      value: d.url,
      metadata: {
        url: d.url, avatar: d.avatar, display_name: clean(d.display_name), handle: d.acct, bio: clean(String(d.note ?? "").replace(/<[^>]+>/g, " ")),
        stats: [...stat("Followers", d.followers_count), ...stat("Posts", d.statuses_count), ...stat("Joined", year(d.created_at))],
      },
    }),
    fixtures: { positive: "Gargron", negative: "zq8x7k2m9vplw3" },
  }),
  jsonModule({
    name: "codewars", platform: "Codewars", category: "dev",
    url: (u) => `https://www.codewars.com/api/v1/users/${encodeURIComponent(u)}`,
    map: (d) => ({
      value: `https://www.codewars.com/users/${d.username}`,
      metadata: { url: `https://www.codewars.com/users/${d.username}`, display_name: clean(d.name), handle: d.username, stats: [...stat("Honor", d.honor), ...stat("Rank", d.ranks?.overall?.name)] },
    }),
    fixtures: { positive: "jhoffner", negative: "zq8x7k2m9vplw3" },
  }),
  jsonModule({
    name: "speedrun", platform: "Speedrun.com", category: "gaming",
    url: (u) => `https://www.speedrun.com/api/v1/users/${encodeURIComponent(u)}`,
    map: (d) => {
      const x = d.data;
      return { value: x.weblink, metadata: { url: x.weblink, handle: x.names?.international, avatar: x.assets?.image?.uri ?? undefined, stats: stat("Joined", year(x.signup)) } };
    },
    fixtures: { positive: "Cosmo", negative: "zq8x7k2m9vplw3" },
  }),
  jsonModule({
    name: "minecraft", platform: "Minecraft", category: "gaming",
    url: (u) => `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(u)}`,
    isMissing: (d) => !d.id,
    map: (d) => ({ value: d.name, metadata: { handle: d.name, uuid: d.id, avatar: `https://mc-heads.net/avatar/${d.id}/64`, url: `https://namemc.com/profile/${d.id}` } }),
    fixtures: { positive: "Notch", negative: "zq8x7k2m9vplw3" },
  }),
  jsonModule({
    name: "wikipedia", platform: "Wikipedia (en)", category: "community",
    url: (u) => `https://en.wikipedia.org/w/api.php?action=query&list=users&ususers=${encodeURIComponent(u)}&usprop=editcount|registration&format=json`,
    isMissing: (d) => { const x = d.query?.users?.[0]; return !x || "missing" in x || "invalid" in x; },
    map: (d) => {
      const x = d.query.users[0];
      const url = `https://en.wikipedia.org/wiki/User:${encodeURIComponent(x.name)}`;
      return { value: url, metadata: { url, handle: x.name, stats: [...stat("Edits", x.editcount), ...stat("Joined", year(x.registration))] } };
    },
    fixtures: { positive: "Jimbo Wales".replace(" ", "_"), negative: "zq8x7k2m9vplw3" },
  }),
  jsonModule({
    name: "duolingo", platform: "Duolingo", category: "community",
    url: (u) => `https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(u)}&fields=users%7Bid,username,name,picture,streak,creationDate,totalXp%7D`,
    isMissing: (d) => !Array.isArray(d.users) || d.users.length === 0,
    map: (d) => {
      const x = d.users[0];
      const url = `https://www.duolingo.com/profile/${x.username}`;
      return {
        value: url,
        metadata: { url, handle: x.username, display_name: clean(x.name), avatar: x.picture ? `https:${x.picture}/xlarge` : undefined, stats: [...stat("Streak", x.streak), ...stat("XP", x.totalXp), ...stat("Joined", year(x.creationDate))] },
      };
    },
    fixtures: { positive: "luis", negative: "zq8x7k2m9vplw3" },
  }),
  {
    name: "roblox", platform: "Roblox", category: "gaming", types: ["username"],
    async check(u, ctx) {
      const { status, data } = await getJson<J>(ctx, "https://users.roblox.com/v1/usernames/users", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ usernames: [u], excludeBannedUsers: false }),
      });
      if (blocked(status) || status >= 400) return inconclusive(`HTTP ${status}`);
      const x = data?.data?.[0];
      if (!x) return absent();
      const url = `https://www.roblox.com/users/${x.id}/profile`;
      return hit({ platform: "Roblox", category: "gaming", value: url, metadata: { url, handle: x.name, display_name: clean(x.displayName) } });
    },
    fixtures: { positive: "builderman", negative: "zq8x7k2m9vplw3" },
  },
  {
    name: "reddit", platform: "Reddit", category: "community", types: ["username"],
    async check(u, ctx) {
      // Reddit closed unauthenticated JSON in 2025; with an app's credentials use its official OAuth API.
      const token = await redditToken(ctx);
      const { status, data } = token
        ? await getJson<J>(ctx, `https://oauth.reddit.com/user/${encodeURIComponent(u)}/about?raw_json=1`, { headers: { authorization: `Bearer ${token}` } })
        : await getJson<J>(ctx, `https://www.reddit.com/user/${encodeURIComponent(u)}/about.json`);
      if (status === 404) return absent();
      if (status !== 200 || !data?.data) return inconclusive(`HTTP ${status}`);
      const x = data.data;
      if (x.is_suspended) return hit({ platform: "Reddit", category: "community", value: `https://www.reddit.com/user/${u}`, confidence: 0.8, metadata: { url: `https://www.reddit.com/user/${u}`, handle: u, bio: "Account suspended" } });
      const url = `https://www.reddit.com/user/${x.name}`;
      return hit({
        platform: "Reddit", category: "community", value: url,
        metadata: { url, handle: x.name, avatar: String(x.icon_img ?? "").split("?")[0] || undefined, bio: clean(x.subreddit?.public_description), stats: [...stat("Karma", x.total_karma), ...stat("Joined", year(x.created_utc))] },
      });
    },
    fixtures: { positive: "spez", negative: "zq8x7k2m9vplw3" },
  },
];
