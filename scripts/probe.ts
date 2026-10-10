// Dev helper: show how a site answers a known account vs a made-up one, to pick signals.
// Usage: node scripts/probe.ts "<url with {u}>" <positive> [negative] [--browser]
const [tpl, pos, neg = "zq8x7k2m9vplw3"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const browser = process.argv.includes("--browser");
const ua = browser
  ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"
  : "Mozilla/5.0 (compatible; QuarryFindBot/0.1)";
for (const u of [pos, neg]) {
  const res = await fetch(tpl.replaceAll("{u}", encodeURIComponent(u)), { headers: { "user-agent": ua }, redirect: "follow" });
  const body = await res.text();
  const title = body.match(/<title[^>]*>([^<]*)/i)?.[1]?.trim();
  console.log(`${u}: ${res.status} ${res.url} len=${body.length} title=${JSON.stringify(title)}`);
  console.log("   ", body.replace(/\s+/g, " ").slice(0, 300));
}
