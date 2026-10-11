// More username modules on official, keyless public APIs (package registries,
// open communities, writing and funding platforms). Same rules as
// username-rich.ts: a real absence signal is "absent", anything blocked is "inconclusive".
import { absent, blocked, clean, getJson, inconclusive, year } from "./http.ts";
import { hit, jsonModule, stat } from "./username-rich.ts";
import type { Module } from "./types.ts";

type J = Record<string, any>; // deno-lint-ignore no-explicit-any

const decode = (s: unknown) => clean(String(s ?? "").replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/<[^>]+>/g, " "));

export const apiModules: Module[] = [
  jsonModule({
    name: "hexpm", platform: "Hex (Elixir packages)", category: "dev",
    url: (u) => `https://hex.pm/api/users/${encodeURIComponent(u)}`,
    map: (d) => {
      const url = `https://hex.pm/users/${d.username}`;
      return { value: url, metadata: { url, handle: d.username, display_name: clean(d.full_name), email: clean(d.email), stats: [...stat("Packages", d.packages?.length), ...stat("Joined", year(d.inserted_at))] } };
    },
    fixtures: { positive: "josevalim", negative: "zq8x7k2m9vplw3" },
  }),
  {
    // Owner search on NuGet's official search API; an account with no packages isn't discoverable.
    name: "nuget", platform: "NuGet (.NET packages)", category: "dev", types: ["username"],
    async check(u, ctx) {
      const { status, data } = await getJson<J>(ctx, `https://azuresearch-usnc.nuget.org/query?q=owner:${encodeURIComponent(u)}&take=3`);
      if (blocked(status) || status !== 200 || !data) return inconclusive(`HTTP ${status}`);
      const owns = (data.data ?? []).some((p: J) => (p.owners ?? []).some((o: string) => o.toLowerCase() === u.toLowerCase()));
      if (!data.totalHits || !owns) return absent("no packages under this name");
      const url = `https://www.nuget.org/profiles/${encodeURIComponent(u)}`;
      return hit({
        platform: "NuGet (.NET packages)", category: "dev", value: url,
        metadata: { url, handle: u, evidence: "NuGet's search API lists packages owned by this exact account name.", stats: stat("Packages", data.totalHits) },
      });
    },
    fixtures: { positive: "jamesnk", negative: "zq8x7k2m9vplw3" },
  },
  jsonModule({
    name: "launchpad", platform: "Launchpad", category: "dev",
    url: (u) => `https://api.launchpad.net/1.0/~${encodeURIComponent(u)}`,
    map: (d) => ({
      value: d.web_link,
      metadata: { url: d.web_link, handle: d.name, display_name: clean(d.display_name), bio: d.is_team ? "Team account" : undefined, stats: [...stat("Joined", year(d.date_created))] },
    }),
    fixtures: { positive: "sabdfl", negative: "zq8x7k2m9vplw3" },
  }),
  jsonModule({
    name: "lemmy", platform: "Lemmy (lemmy.world)", category: "community",
    url: (u) => `https://lemmy.world/api/v3/user?username=${encodeURIComponent(u)}&limit=1`,
    isMissing: (d) => d.error === "couldnt_find_person" || !d.person_view,
    map: (d) => {
      const p = d.person_view.person, c = d.person_view.counts ?? {};
      if (p.deleted) return null;
      return {
        value: p.actor_id,
        metadata: {
          url: p.actor_id, handle: p.name, display_name: clean(p.display_name), avatar: p.avatar, bio: p.banned ? "Banned on this instance" : decode(p.bio),
          stats: [...stat("Posts", c.post_count), ...stat("Comments", c.comment_count), ...stat("Joined", year(p.published))],
        },
      };
    },
    fixtures: { positive: "ruud", negative: "zq8x7k2m9vplw3" },
  }),
  {
    // Fandom accounts are global, so the community wiki's MediaWiki API answers for all of them.
    name: "fandom", platform: "Fandom", category: "community", types: ["username"],
    async check(u, ctx) {
      const { status, data } = await getJson<J>(ctx, `https://community.fandom.com/api.php?action=query&list=users&ususers=${encodeURIComponent(u)}&usprop=registration%7Ceditcount&format=json`);
      if (blocked(status) || status !== 200 || !data?.query) return inconclusive(`HTTP ${status}`);
      const x = data.query.users?.[0];
      if (!x || "missing" in x || "invalid" in x) return absent();
      const url = `https://community.fandom.com/wiki/User:${encodeURIComponent(x.name)}`;
      return hit({ platform: "Fandom", category: "community", value: url, metadata: { url, handle: x.name, stats: [...stat("Edits", x.editcount), ...stat("Joined", year(x.registration))] } });
    },
    fixtures: { positive: "Sannse", negative: "zq8x7k2m9vplw3" },
  },
  jsonModule({
    name: "liberapay", platform: "Liberapay", category: "commerce",
    url: (u) => `https://liberapay.com/${encodeURIComponent(u)}/public.json`,
    map: (d) => {
      const url = `https://liberapay.com/${d.username}`;
      return { value: url, metadata: { url, handle: d.username, avatar: d.avatar, bio: decode(d.summary), stats: [...stat("Patrons", d.npatrons), ...stat("Kind", d.kind)] } };
    },
    fixtures: { positive: "Changaco", negative: "zq8x7k2m9vplw3" },
  }),
  jsonModule({
    name: "wattpad", platform: "Wattpad", category: "creative",
    url: (u) => `https://www.wattpad.com/api/v3/users/${encodeURIComponent(u)}?fields=username,name,description,numFollowers,numStoriesPublished,createDate,avatar,location`,
    isMissing: (d) => d.error_type === "NotFound",
    map: (d) => {
      const url = `https://www.wattpad.com/user/${d.username}`;
      return {
        value: url,
        metadata: {
          url, handle: d.username, display_name: clean(d.name), avatar: d.avatar, bio: decode(d.description), location: clean(d.location),
          stats: [...stat("Stories", d.numStoriesPublished), ...stat("Followers", d.numFollowers), ...stat("Joined", year(d.createDate))],
        },
      };
    },
    fixtures: { positive: "wattpad", negative: "zq8x7k2m9vplw3" },
  }),
];
