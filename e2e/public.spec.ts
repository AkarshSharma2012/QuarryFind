import { test, expect, a11y, asUser } from "./helpers";

const PAGES = ["/", "/sources/", "/tools/", "/docs/", "/docs/api/", "/how-it-works/", "/terms/", "/privacy/", "/about/"];

test.describe("site pages (signed in, behind the password screen)", () => {
  test.use({ storageState: asUser(0) });
  for (const path of PAGES) {
    test(`${path} renders with one h1 and passes axe @mobile`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
      await a11y(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test.describe("landing search", () => {
    test.use({ storageState: asUser(4) });
    test("F01-E1 searching from the landing page starts a run straight away", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("textbox").first().fill("sample_handle");
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await expect(page).toHaveURL(/\/search\/run\/\?id=/);
    });
  });

  test("F01-E2 invalid input is caught before any request", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "Email" }).click();
    await page.getByRole("textbox").first().fill("not-an-email");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByText("That doesn’t look like a email address.")).toBeVisible();
  });

  test("keyboard: skip link moves focus to main", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible(); // session restored, gate gone
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
  });

  test("fix #3: source status lists every source with its health", async ({ page }) => {
    await page.goto("/sources/");
    await expect(page.getByRole("cell", { name: /^GitHub$/ })).toBeVisible();
    await expect(page.getByText("working").first()).toBeVisible();
    await page.getByRole("textbox", { name: "Filter sources" }).fill("lichess");
    await expect(page.locator("tbody tr")).toHaveCount(1);
  });

  test("unknown route shows the 404 page", async ({ page }) => {
    await page.goto("/does-not-exist/");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });
});
