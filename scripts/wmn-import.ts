// Curates the WhatsMyName dataset into engine modules.
// Usage: node scripts/wmn-import.ts data/wmn/wmn-data.json
// Keeps only sites that (1) are not behind CAPTCHA/Cloudflare protection,
// (2) don't duplicate a hand-written module, and (3) pass a live test here:
// the known account is a hit and a made-up one is absent.
import { readFileSync, writeFileSync } from "node:fs";
import { makeCtx, runModule } from "../supabase/functions/_shared/engine/index.ts";
import { richModules } from "../supabase/functions/_shared/engine/username-rich.ts";
import { sites } from "../supabase/functions/_shared/engine/username-sites.ts";
import { wmnModule, type WmnSite } from "../supabase/functions/_shared/engine/wmn.ts";

const file = process.argv[2];
if (!file) throw new Error("usage: node scripts/wmn-import.ts <wmn-data.json>");
const all: (WmnSite & { protection?: string[]; valid?: boolean })[] = JSON.parse(readFileSync(file, "utf8")).sites;

const host = (u: string) => { try { return new URL(u.replaceAll("{account}", "x")).hostname.replace(/^www\./, "").split(".").slice(-2).join("."); } catch { return ""; } };
const ours = new Set([
  ...sites.map((s) => host(s.url)),
  ...richModules.map((m) => m.platform.toLowerCase()),
  "github.com", "gitlab.com", "reddit.com", "chess.com", "lichess.org", "docker.com", "huggingface.co", "bsky.app", "mastodon.social",
  "codewars.com", "speedrun.com", "mojang.com", "wikipedia.org", "duolingo.com", "roblox.com", "keybase.io", "dev.to", "ycombinator.com", "codeberg.org",
]);

const candidates = all.filter((s) =>
  s.valid !== false && !(s.protection ?? []).some((p) => /captcha|cloudflare/i.test(p)) && s.known?.length && !ours.has(host(s.uri_pretty ?? s.uri_check)) && s.cat !== "xx_nsfw_xx");
console.error(`${all.length} sites, ${candidates.length} candidates after filtering`);

const ctx = makeCtx({}, 12000);
const keep: WmnSite[] = [];
let i = 0, done = 0;
await Promise.all(Array.from({ length: 12 }, async () => {
  while (i < candidates.length) {
    const s = candidates[i++];
    const m = wmnModule(s);
    const [p, n] = await Promise.all([runModule(m, s.known[0], ctx), runModule(m, "zq8x7k2m9vplw3", ctx)]);
    if (p.outcome === "hit" && n.outcome === "absent") {
      const { protection: _p, valid: _v, ...rest } = s as WmnSite & { protection?: string[]; valid?: boolean };
      keep.push(rest);
    }
    if (++done % 50 === 0) console.error(`${done}/${candidates.length} tested, ${keep.length} kept`);
  }
}));

keep.sort((a, b) => a.name.localeCompare(b.name));
const out = new URL("../supabase/functions/_shared/engine/wmn-sites.json", import.meta.url);
writeFileSync(out, JSON.stringify({
  _source: "Derived from WhatsMyName (https://github.com/WebBreacher/WhatsMyName), (C) Micah Hoffman. Licensed CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Changes: filtered to sites that passed a live positive/negative test on " + new Date().toISOString().slice(0, 10) + ".",
  sites: keep,
}, null, 1) + "\n");
console.error(`kept ${keep.length} of ${candidates.length}`);
