// Smoke tests against the deployed site, run by .github/workflows/live-smoke.yml
// after every deploy and once a day. They act like real visitors: browse, use a
// tool, sign in, search. Signed-in tests create throwaway users through the
// admin API (needs the SUPABASE_SERVICE_ROLE_KEY secret) and delete them after.
import { expect, test as base, type Browser, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const SB = process.env.SUPABASE_URL ?? "";
const ANON = process.env.SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Fails a test on console errors or any 5xx from the site or the backend. */
const test = base.extend<{ guard: void }>({
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

// ── throwaway users ─────────────────────────────────────────────────────────
type TestUser = { id: string; email: string; password: string };
const admin = (path: string, init: RequestInit = {}) =>
  fetch(`${SB}/auth/v1/admin/${path}`, { ...init, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" } });

async function createUser(tag: string): Promise<TestUser> {
  const email = `qf-smoke-${tag}-${Date.now()}@example.com`;
  const password = `Smoke-${crypto.randomUUID()}`;
  const r = await admin("users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  expect(r.status, await r.clone().text()).toBe(200);
  return { id: ((await r.json()) as { id: string }).id, email, password };
}
const removeUser = async (u: TestUser) => { await admin(`users/${u.id}`, { method: "DELETE" }); }; // 404 after UI deletion is fine

async function signIn(page: Page, u: TestUser) {
  await page.goto("sign-in/");
  await page.getByLabel("Email").fill(u.email);
  await page.getByLabel("Password").fill(u.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/search\/$/);
}

async function search(page: Page, type: "Username" | "Email" | "Domain", query: string, timeout = 240_000) {
  await page.goto("search/");
  await page.getByRole("radio", { name: type }).click();
  await page.getByRole("textbox").first().fill(query);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/search\/run\/\?id=/);
  await expect(page.getByText(/Search complete|Search stopped early/)).toBeVisible({ timeout });
}

// ── anonymous visitors ──────────────────────────────────────────────────────
const PAGES = ["", "tools/", "sources/", "docs/", "docs/api/", "how-it-works/", "about/", "privacy/", "terms/", "sign-in/", "sign-up/"];

test.describe("visitor", () => {
  for (const p of PAGES) {
    test(`/${p} loads with one h1, no overflow and no serious a11y issues @mobile`, async ({ page }) => {
      const res = await page.goto(p);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await a11y(page);
    });
  }

  test("sign-in offers only the providers switched on in Supabase", async ({ page }) => {
    const settings = (await (await fetch(`${SB}/auth/v1/settings`, { headers: { apikey: ANON } })).json()) as { external: Record<string, boolean> };
    await page.goto("sign-in/");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with GitHub" })).toHaveCount(settings.external.github ? 1 : 0);
    await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(settings.external.google ? 1 : 0);
  });

  test("browser-only tools work", async ({ page }) => {
    await page.goto("tools/variations/");
    await page.getByRole("textbox", { name: "Name or handle" }).fill("Jane Doe");
    await expect(page.getByRole("button", { name: /^jane\.doe/ })).toBeVisible();
    await page.goto("tools/hash/");
    await page.getByRole("textbox", { name: "Hash" }).fill("5f4dcc3b5aa765d61d8327deb882cf99");
    await expect(page.getByText("MD5", { exact: true })).toBeVisible();
  });

  test("search asks a signed-out visitor to create an account", async ({ page }) => {
    await page.goto("");
    await page.getByRole("textbox").first().fill("torvalds");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-up\/\?next=/);
  });

  test("API health reports the database is up", async () => {
    const r = await fetch(`${SB}/functions/v1/v1/health`);
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ status: "ok", database: "ok" });
  });

  test("traffic: 6 visitors browse at once", async ({ browser }) => {
    const visit = async (b: Browser, start: number) => {
      const ctx = await b.newContext();
      const page = await ctx.newPage();
      for (let i = 0; i < 4; i++) {
        const res = await page.goto(PAGES[(start + i) % PAGES.length]);
        expect(res?.status()).toBe(200);
      }
      await ctx.close();
    };
    await Promise.all(Array.from({ length: 6 }, (_, i) => visit(browser, i * 2)));
  });
});

// ── signed-in users ─────────────────────────────────────────────────────────
test.describe("signed-in user", () => {
  test.skip(!SERVICE, "Add the SUPABASE_SERVICE_ROLE_KEY repository secret to run signed-in tests");

  test("signs in, finds Linus Torvalds' GitHub, then deletes the account", async ({ page }) => {
    test.setTimeout(360_000);
    const u = await createUser("main");
    try {
      await signIn(page, u);
      await search(page, "Username", "torvalds");
      const gh = page.getByRole("article", { name: /GitHub: Linus Torvalds/ });
      await expect(gh).toBeVisible();
      await gh.getByText("Why this counts").click();
      await expect(gh.getByText(/public API returned this profile/)).toBeVisible();

      await page.goto("history/");
      await expect(page.getByRole("link", { name: "torvalds" }).first()).toBeVisible();

      await page.goto("settings/");
      await page.getByRole("button", { name: "Delete account" }).click();
      const d = page.getByRole("dialog", { name: "Delete your account?" });
      await d.getByRole("textbox").fill("delete");
      await d.getByRole("button", { name: "Delete forever" }).click();
      await expect(page).toHaveURL(/\/OsintSet\/$/);
      expect((await admin(`users/${u.id}`)).status).toBe(404);
    } finally {
      await removeUser(u);
    }
  });

  test("traffic: 3 users search at the same time", async ({ browser }) => {
    test.setTimeout(360_000);
    const jobs: [string, "Username" | "Email" | "Domain", string][] = [["a", "Domain", "example.com"], ["b", "Email", "zq8x7k2m9vplw3@example.com"], ["c", "Username", "octocat"]];
    const users = await Promise.all(jobs.map(([tag]) => createUser(tag)));
    try {
      await Promise.all(jobs.map(async ([, type, q], i) => {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        await signIn(page, users[i]);
        await search(page, type, q);
        const total = Number(await page.getByRole("progressbar", { name: "Sources checked" }).getAttribute("aria-valuemax"));
        expect(total).toBeGreaterThan(0);
        await ctx.close();
      }));
    } finally {
      await Promise.all(users.map(removeUser));
    }
  });
});
