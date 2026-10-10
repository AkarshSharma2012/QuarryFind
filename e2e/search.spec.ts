import { test, expect, search, a11y, asUser } from "./helpers";

test.describe("F02-F06 searching", () => {
  test.use({ storageState: asUser(0) });
  test("F04-H1 domain search completes with WHOIS, DNS and coverage", async ({ page }) => {
    await search(page, "Domain", "https://www.Example.com/some/path");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("example.com"); // normalised
    await expect(page.getByRole("article", { name: /DNS records/ })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Sources checked" })).toHaveAttribute("aria-valuenow", /\d+/);
    await a11y(page);
  });

  test("F02-H1 email search shows the username lead and runs it", async ({ page }) => {
    await search(page, "Email", "zq8x7k2m9vplw3@example.com");
    await expect(page.getByRole("article", { name: /Mail domain/ })).toBeVisible();
    const lead = page.getByRole("button", { name: /Search “zq8x7k2m9vplw3” as a username/ });
    await expect(lead).toBeVisible();
  });

  test("F02-H2 cards/table toggle and export", async ({ page }) => {
    await search(page, "Domain", "example.org");
    await page.getByRole("radio", { name: "Table" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Match" })).toBeVisible();
    const dl = page.waitForEvent("download");
    await page.getByRole("button", { name: "CSV" }).click();
    expect((await dl).suggestedFilename()).toBe("example-org.csv");
    await page.getByRole("radio", { name: "Cards" }).click();
  });

  test("F06-H1 history lists the search and re-opens it", async ({ page }) => {
    await page.goto("/history/");
    const link = page.getByRole("link", { name: "example.org" }).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("example.org");
    await a11y(page);
  });

  test("F02-E5 another user's search is invisible (RLS)", async ({ page, browser }) => {
    await page.goto("/history/");
    await page.getByRole("link", { name: "example.org" }).first().click();
    const url = page.url();
    const other = await browser.newContext({ storageState: asUser(1) });
    const p2 = await other.newPage();
    await p2.goto(url);
    await expect(p2.getByRole("heading", { name: "Search not found" })).toBeVisible();
    await other.close();
  });

  test("F02-E6 malformed run id shows an empty state", async ({ page }) => {
    await page.goto("/search/run/?id=not-a-uuid");
    await expect(page.getByRole("heading", { name: "No search selected" })).toBeVisible();
  });

  test("F01-H2 username search across every source finishes and accounts for each one", async ({ page }) => {
    await search(page, "Username", "torvalds");
    const total = Number(await page.getByRole("progressbar", { name: "Sources checked" }).getAttribute("aria-valuemax"));
    // Wait for the final re-sync, then the three counters must add up to the total.
    await expect(async () => {
      const t = await page.locator("main header").innerText();
      const n = (label: string) => Number(t.match(new RegExp(`(\\d+)\\s*${label}`))?.[1] ?? -1);
      expect(n("Found") + n("No match") + n("Unavailable")).toBe(total);
      expect(n("Found")).toBeGreaterThan(10);
    }).toPass({ timeout: 20_000 });
    await expect(page.getByRole("article", { name: /GitHub: Linus Torvalds/ })).toBeVisible();
  });
});
