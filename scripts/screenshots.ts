// Captures README screenshots from the static build (http://localhost:4317)
// with a fresh signed-in local test user. Usage: node scripts/screenshots.ts
import { readFileSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { chromium, type Page } from "@playwright/test";

for (const line of readFileSync(".env.test.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, SUPABASE_ANON_KEY: anon } = process.env as Record<string, string>;
const BASE = "http://localhost:4317";
const email = `shots-${randomUUID().slice(0, 8)}@example.test`, password = randomBytes(12).toString("base64url");
await fetch(`${url}/auth/v1/admin/users`, { method: "POST", headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ email, password, email_confirm: true }) });
const session = await (await fetch(`${url}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: anon, "content-type": "application/json" }, body: JSON.stringify({ email, password }) })).json();
const storageState = { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: `sb-${new URL(url).hostname.split(".")[0]}-auth-token`, value: JSON.stringify(session) }] }] };

const b = await chromium.launch();
const shot = async (p: Page, name: string, full = false) => { await p.waitForTimeout(800); await p.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: full }); console.log(name); };

const anonCtx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
const a = await anonCtx.newPage();
await a.goto(`${BASE}/`); await shot(a, "landing");
await a.goto(`${BASE}/tools/`); await shot(a, "tools");
await a.goto(`${BASE}/sources/`); await a.getByText("working").first().waitFor(); await shot(a, "sources");
await a.goto(`${BASE}/tools/dns/`); await a.getByRole("textbox", { name: "Domain" }).fill("example.com");
await a.getByRole("button", { name: "Look up" }).click(); await a.getByRole("rowheader", { name: "NS" }).first().waitFor(); await shot(a, "tool-dns");

const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", storageState });
const p = await ctx.newPage();
const search = async (type: string, q: string) => {
  await p.goto(`${BASE}/search/`); await p.getByRole("radio", { name: type }).click();
  await p.getByRole("textbox").first().fill(q); await p.getByRole("button", { name: "Search", exact: true }).click();
  await p.getByText(/Search complete|Search stopped early/).waitFor({ timeout: 240_000 });
  await p.waitForTimeout(6000); // final re-sync
};
await search("Username", "mozilla");
await shot(p, "results-cards");
// Developer platforms only, so no private individual's details appear in the README.
await p.getByLabel("Category").selectOption("dev");
await p.getByRole("radio", { name: "Table" }).click(); await shot(p, "results-table");
await p.getByLabel("Category").selectOption("all");
await p.getByRole("radio", { name: "Cards" }).click();
await search("Domain", "example.com"); await shot(p, "results-domain");

const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark" })).newPage();
await m.goto(`${BASE}/`); await shot(m, "mobile");
await b.close();
