// Username modules driven by data: a profile URL plus the signals that mean
// "exists" and "does not exist". A plain HTTP 200 is never enough on its own
// when the site serves soft-404 pages; those sites declare a body signal.
import { absent, blocked, get, inconclusive } from "./http.ts";
import type { Category, Module } from "./types.ts";

export interface SiteDef {
  name: string;
  platform: string;
  category: Category;
  url: string;              // {u} is replaced with the encoded username
  check?: string;           // URL to request if different from the profile URL
  missingStatus?: number[]; // default [404, 410]
  existsText?: string;      // body must contain this for a hit
  missingText?: string;     // body containing this means absent
  browser?: boolean;        // send a browser user agent
  deep?: boolean;
  pattern?: RegExp;         // usernames the site accepts; others are skipped as absent
  fixtures?: { positive: string; negative: string };
}

const NEG = "zq8x7k2m9vplw3";

export const sites: SiteDef[] = [
  { name: "npm", platform: "npm", category: "dev", url: "https://www.npmjs.com/~{u}", pattern: /^[a-z0-9._-]+$/, fixtures: { positive: "sindresorhus", negative: NEG } },
  { name: "pypi", platform: "PyPI", category: "dev", url: "https://pypi.org/user/{u}/", fixtures: { positive: "gvanrossum", negative: NEG } },
  { name: "crates", platform: "crates.io", category: "dev", url: "https://crates.io/users/{u}", check: "https://crates.io/api/v1/users/{u}", fixtures: { positive: "dtolnay", negative: NEG } },
  { name: "rubygems", platform: "RubyGems", category: "dev", url: "https://rubygems.org/profiles/{u}", fixtures: { positive: "dhh", negative: NEG } },
  { name: "packagist", platform: "Packagist", category: "dev", url: "https://packagist.org/users/{u}/", fixtures: { positive: "seldaek", negative: NEG } },
  { name: "bitbucket", platform: "Bitbucket", category: "dev", url: "https://bitbucket.org/{u}/", check: "https://api.bitbucket.org/2.0/workspaces/{u}", fixtures: { positive: "atlassian", negative: NEG } },
  { name: "sourcehut", platform: "SourceHut", category: "dev", url: "https://sr.ht/~{u}/", fixtures: { positive: "sircmpwn", negative: NEG } },
  { name: "replit", platform: "Replit", category: "dev", url: "https://replit.com/@{u}", browser: true, fixtures: { positive: "amasad", negative: NEG } },
  { name: "kaggle", platform: "Kaggle", category: "dev", url: "https://www.kaggle.com/{u}", fixtures: { positive: "jhoward", negative: NEG } },
  { name: "hackerone", platform: "HackerOne", category: "security", url: "https://hackerone.com/{u}?type=user", browser: true, fixtures: { positive: "jobert", negative: NEG } },
  { name: "tryhackme", platform: "TryHackMe", category: "security", url: "https://tryhackme.com/p/{u}", check: "https://tryhackme.com/api/v2/public-profile?username={u}", missingText: "\"status\":\"error\"", fixtures: { positive: "tryhackme", negative: NEG } },
  { name: "telegram", platform: "Telegram", category: "social", url: "https://t.me/{u}", existsText: "tgme_page_title", pattern: /^[A-Za-z0-9_]{5,32}$/, fixtures: { positive: "durov", negative: NEG } },
  { name: "steam", platform: "Steam", category: "gaming", url: "https://steamcommunity.com/id/{u}", missingText: "The specified profile could not be found", fixtures: { positive: "gabelogannewell", negative: NEG } },
  { name: "itchio", platform: "itch.io", category: "gaming", url: "https://{u}.itch.io/", pattern: /^[A-Za-z0-9-]+$/, fixtures: { positive: "leafo", negative: NEG } },
  { name: "lastfm", platform: "Last.fm", category: "media", url: "https://www.last.fm/user/{u}", fixtures: { positive: "rj", negative: NEG } },
  { name: "soundcloud", platform: "SoundCloud", category: "media", url: "https://soundcloud.com/{u}", browser: true, fixtures: { positive: "forss", negative: NEG } },
  { name: "vimeo", platform: "Vimeo", category: "media", url: "https://vimeo.com/{u}", browser: true, fixtures: { positive: "staff", negative: NEG } },
  { name: "dailymotion", platform: "Dailymotion", category: "media", url: "https://www.dailymotion.com/{u}", check: "https://api.dailymotion.com/user/{u}", deep: true, fixtures: { positive: "dailymotion", negative: NEG } },
  { name: "twitch", platform: "Twitch", category: "media", url: "https://www.twitch.tv/{u}", deep: true, existsText: "\"@type\":\"VideoObject\"", browser: true, fixtures: { positive: "shroud", negative: NEG } },
  { name: "flickr", platform: "Flickr", category: "creative", url: "https://www.flickr.com/people/{u}/", fixtures: { positive: "flickr", negative: NEG } },
  { name: "dribbble", platform: "Dribbble", category: "creative", url: "https://dribbble.com/{u}", browser: true, fixtures: { positive: "simplebits", negative: NEG } },
  { name: "deviantart", platform: "DeviantArt", category: "creative", url: "https://www.deviantart.com/{u}", browser: true, deep: true, fixtures: { positive: "spyed", negative: NEG } },
  { name: "patreon", platform: "Patreon", category: "creative", url: "https://www.patreon.com/{u}", browser: true, fixtures: { positive: "patreon", negative: NEG } },
  { name: "kofi", platform: "Ko-fi", category: "creative", url: "https://ko-fi.com/{u}", browser: true, fixtures: { positive: "kofi", negative: NEG } },
  { name: "buymeacoffee", platform: "Buy Me a Coffee", category: "creative", url: "https://buymeacoffee.com/{u}", browser: true, fixtures: { positive: "buymeacoffee", negative: NEG } },
  { name: "linktree", platform: "Linktree", category: "identity", url: "https://linktr.ee/{u}", browser: true, fixtures: { positive: "linktree", negative: NEG } },
  { name: "aboutme", platform: "about.me", category: "identity", url: "https://about.me/{u}", browser: true, fixtures: { positive: "tony", negative: NEG } },
  { name: "gravatar-user", platform: "Gravatar", category: "identity", url: "https://gravatar.com/{u}", check: "https://api.gravatar.com/v3/profiles/{u}", fixtures: { positive: "beau", negative: NEG } },
  { name: "medium", platform: "Medium", category: "creative", url: "https://medium.com/@{u}", browser: true, deep: true, fixtures: { positive: "ev", negative: NEG } },
  { name: "substack", platform: "Substack", category: "creative", url: "https://{u}.substack.com/", check: "https://substack.com/api/v1/user/{u}/public_profile", fixtures: { positive: "platformer", negative: NEG } },
  { name: "tumblr", platform: "Tumblr", category: "social", url: "https://{u}.tumblr.com/", pattern: /^[A-Za-z0-9-]+$/, browser: true, fixtures: { positive: "staff", negative: NEG } },
  { name: "pastebin", platform: "Pastebin", category: "dev", url: "https://pastebin.com/u/{u}", browser: true, deep: true, fixtures: { positive: "pastebin", negative: NEG } },
  { name: "trello", platform: "Trello", category: "community", url: "https://trello.com/{u}", check: "https://trello.com/1/Members/{u}", fixtures: { positive: "trello", negative: NEG } },
  { name: "slideshare", platform: "SlideShare", category: "creative", url: "https://www.slideshare.net/{u}", browser: true, deep: true, fixtures: { positive: "slideshare", negative: NEG } },
  { name: "myanimelist", platform: "MyAnimeList", category: "media", url: "https://myanimelist.net/profile/{u}", browser: true, fixtures: { positive: "Xinil", negative: NEG } },
  { name: "letterboxd", platform: "Letterboxd", category: "media", url: "https://letterboxd.com/{u}/", browser: true, fixtures: { positive: "dave", negative: NEG } },
  { name: "goodreads", platform: "Goodreads", category: "media", url: "https://www.goodreads.com/{u}", browser: true, deep: true, fixtures: { positive: "otis", negative: NEG } },
];

function render(t: string, u: string) {
  return t.replaceAll("{u}", encodeURIComponent(u));
}

export function siteModule(s: SiteDef): Module {
  return {
    name: s.name, platform: s.platform, category: s.category, types: ["username"], deep: s.deep, fixtures: s.fixtures,
    async check(u, ctx) {
      if (s.pattern && !s.pattern.test(u)) return absent("username not valid on this site");
      const res = await get(ctx, render(s.check ?? s.url, u), { browser: s.browser });
      const missing = s.missingStatus ?? [404, 410];
      if (missing.includes(res.status)) { await res.body?.cancel(); return absent(); }
      if (blocked(res.status) || res.status >= 400) { await res.body?.cancel(); return inconclusive(`HTTP ${res.status}`); }
      if (s.existsText || s.missingText) {
        const body = (await res.text()).slice(0, 400_000);
        if (s.missingText && body.includes(s.missingText)) return absent();
        if (s.existsText && !body.includes(s.existsText)) return absent("no profile marker");
      } else {
        await res.body?.cancel();
      }
      const url = render(s.url, u);
      return {
        outcome: "hit",
        findings: [{ type: "account", platform: s.platform, category: s.category, value: url, confidence: s.existsText || s.missingText || s.check ? 0.9 : 0.75, metadata: { url, handle: u } }],
      };
    },
  };
}

export const siteModules: Module[] = sites.map(siteModule);
