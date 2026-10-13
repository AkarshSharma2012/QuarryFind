// Smoke tests against the deployed site, run by .github/workflows/live-smoke.yml
// after every deploy and once a day. The whole site sits behind the password
// screen (one owner account; components/password-gate.tsx). Tests never use the
// owner's password: they create throwaway users through the admin API (needs the
// SUPABASE_SERVICE_ROLE_KEY secret), put each one's session in the browser the
// way a returning visitor has it, and delete the users afterwards.
import { expect, test as base, type Browser, type BrowserContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const SB = process.env.SUPABASE_URL ?? "";
const ANON = process.env.SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const STORAGE_KEY = SB ? `sb-${new URL(SB).hostname.split(".")[0]}-auth-token` : "";
const GATE = { name: "This site is private" };

// ── throwaway users ─────────────────────────────────────────────────────────
type TestUser = { id: string; email: string; session: string };
const admin = (path: string, init: RequestInit = {}) =>
  fetch(`${SB}/auth/v1/admin/${path}`, { ...init, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" } });

async function createUser(tag: string): Promise<TestUser> {
  const email = `qf-smoke-${tag}-${Date.now()}@example.com`;
  const password = `Smoke-${crypto.randomUUID()}`;
  const r = await admin("users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  expect(r.status, await r.clone().text()).toBe(200);
  const id = ((await r.json()) as { id: string }).id;
  const tok = await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  expect(tok.status, await tok.clone().text()).toBe(200);
  return { id, email, session: await tok.text() };
}
const removeUser = async (u: TestUser) => { await admin(`users/${u.id}`, { method: "DELETE" }); };

/** Starts the browser already signed in as `u`, as after passing the password screen. */
const signedIn = (ctx: BrowserContext, u: TestUser) =>
  ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } }, [STORAGE_KEY, u.session] as const);
async function contextFor(browser: Browser, u: TestUser) { const ctx = await browser.newContext(); await signedIn(ctx, u); return ctx; }

/** Fails a test on console errors or any 5xx from the site or the backend; pages start signed in. */
const test = base.extend<{ guard: void }, { visitor: TestUser | null }>({
  visitor: [async ({}, use) => {
    const u = SERVICE ? await createUser("visitor") : null;
    await use(u);
    if (u) await removeUser(u);
  }, { scope: "worker" }],
  context: async ({ context, visitor }, use) => { if (visitor) await signedIn(context, visitor); await use(context); },
  guard: [async ({ page }, use) => {
    const problems: string[] = [];
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      if (/Failed to load resource: (the server responded with a status of 4\d\d|net::ERR_)/.test(t)) return;
      if (/status of 503/.test(t) && (m.location().url ?? "").includes("/search-batch")) return; // retried by the page
      problems.push(`console: ${t}`);
    });
    page.on("response", (r) => {
      if (r.status() >= 500 && /github\.io|supabase\.co/.test(r.url()) && !(r.status() === 503 && r.url().includes("/search-batch"))) problems.push(`${r.status()} ${r.url()}`);
    });
    await use();
    expect(problems, problems.join("\n")).toEqual([]);
  }, { auto: true }],
});

async function a11y(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}

async function search(page: Page, type: "Username" | "Email" | "Domain", query: string, timeout = 240_000) {
  await page.goto("search/");
  await page.getByRole("radio", { name: type }).click();
  await page.getByRole("textbox").first().fill(query);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/search\/run\/\?id=/);
  await expect(page.getByText(/Search complete|Search stopped early/)).toBeVisible({ timeout });
}

// ── the password screen ─────────────────────────────────────────────────────
test.describe("password screen", () => {
  test("a new visitor sees only the password screen, and a wrong password doesn't open it @mobile", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    for (const p of ["", "search/", "tools/"]) {
      await page.goto(p);
      await expect(page.getByRole("heading", GATE)).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
    }
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page.getByText("That’s not the password.")).toBeVisible();
    await expect(page.getByRole("heading", GATE)).toBeVisible();
    await a11y(page);
    await ctx.close();
  });

  test("the old sign-up and sign-in pages are gone, and nothing is indexed", async ({ request, baseURL }) => {
    for (const p of ["sign-up/", "sign-in/"]) expect((await request.get(`${baseURL}${p}`)).status()).toBe(404);
    expect(await (await request.get(`${baseURL}robots.txt`)).text()).toMatch(/Disallow: \/\s*$/m);
    expect((await (await request.get(`${baseURL}manifest.webmanifest`)).json()).name).toBe("QuarryFind");
  });

  test("API health reports the database is up", async () => {
    const r = await fetch(`${SB}/functions/v1/v1/health`);
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ status: "ok", database: "ok" });
  });
});

// ── signed in (behind the password screen) ──────────────────────────────────
const PAGES = ["", "tools/", "sources/", "docs/", "docs/api/", "how-it-works/", "about/", "privacy/", "terms/"];

test.describe("signed in", () => {
  test.skip(!SERVICE, "Add the SUPABASE_SERVICE_ROLE_KEY repository secret to run signed-in tests");

  for (const p of PAGES) {
    test(`/${p} loads with one h1, no overflow and no serious a11y issues @mobile`, async ({ page }) => {
      const res = await page.goto(p);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await a11y(page);
    });
  }

  test("source status loads and its table fits a phone @mobile", async ({ page }) => {
    await page.goto("sources/");
    const table = page.getByRole("region", { name: "Scrollable table" });
    await expect(table.getByRole("row").nth(5)).toBeVisible();
    const working = Number(await page.locator("dt", { hasText: "Working" }).locator("+ dd").innerText());
    expect(working).toBeGreaterThan(200);
    if ((page.viewportSize()?.width ?? 1440) < 640) {
      expect(await table.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    }
  });

  test("an unknown address shows the 404 page", async ({ page }) => {
    const res = await page.goto("no-such-page/");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page).toHaveTitle(/Page not found/);
  });

  test("browser-only tools work", async ({ page }) => {
    await page.goto("tools/variations/");
    await page.getByRole("textbox", { name: "Name or handle" }).fill("Jane Doe");
    await expect(page.getByRole("button", { name: /^jane\.doe/ })).toBeVisible();
    await page.goto("tools/hash/");
    await page.getByRole("textbox", { name: "Hash" }).fill("5f4dcc3b5aa765d61d8327deb882cf99");
    await expect(page.getByText("MD5", { exact: true })).toBeVisible();
  });

  test("finds Linus Torvalds' GitHub and keeps it in history", async ({ browser }) => {
    test.setTimeout(360_000);
    const u = await createUser("main");
    const ctx = await contextFor(browser, u);
    try {
      const page = await ctx.newPage();
      await search(page, "Username", "torvalds");
      const gh = page.getByRole("article", { name: /GitHub: Linus Torvalds/ });
      await expect(gh).toBeVisible();
      await gh.getByText("Why this counts").click();
      await expect(gh.getByText(/public API returned this profile/)).toBeVisible();
      await page.goto("history/");
      await expect(page.getByRole("link", { name: "torvalds" }).first()).toBeVisible();
    } finally {
      await ctx.close();
      await removeUser(u);
    }
  });

  test("traffic: 6 visitors browse at once", async ({ browser, visitor }) => {
    const visit = async (start: number) => {
      const ctx = await contextFor(browser, visitor!);
      const page = await ctx.newPage();
      for (let i = 0; i < 4; i++) expect((await page.goto(PAGES[(start + i) % PAGES.length]))?.status()).toBe(200);
      await ctx.close();
    };
    await Promise.all(Array.from({ length: 6 }, (_, i) => visit(i * 2)));
  });

  test("traffic: 3 users search at the same time", async ({ browser }) => {
    test.setTimeout(360_000);
    const jobs: [string, "Username" | "Email" | "Domain", string][] = [["a", "Domain", "example.com"], ["b", "Email", "zq8x7k2m9vplw3@example.com"], ["c", "Username", "octocat"]];
    const users = await Promise.all(jobs.map(([tag]) => createUser(tag)));
    try {
      await Promise.all(jobs.map(async ([, type, q], i) => {
        const ctx = await contextFor(browser, users[i]);
        const page = await ctx.newPage();
        await search(page, type, q);
        expect(Number(await page.getByRole("progressbar", { name: "Sources checked" }).getAttribute("aria-valuemax"))).toBeGreaterThan(0);
        await ctx.close();
      }));
    } finally {
      await Promise.all(users.map(removeUser));
    }
  });
});
