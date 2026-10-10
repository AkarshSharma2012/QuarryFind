import { test, expect, a11y } from "./helpers";

const PAGES = ["/", "/tools/", "/docs/", "/docs/api/", "/how-it-works/", "/terms/", "/privacy/", "/about/", "/sign-in/", "/sign-up/"];

test.describe("public pages", () => {
  for (const path of PAGES) {
    test(`${path} renders with one h1 and passes axe @mobile`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
      await a11y(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("F01-E1 signed-out search sends you to sign up and keeps the query", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("textbox").first().fill("sample_handle");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-up\/\?next=/);
    expect(decodeURIComponent(page.url())).toContain("q=sample_handle");
  });

  test("F01-E2 invalid input is caught before any request", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "Email" }).click();
    await page.getByRole("textbox").first().fill("not-an-email");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByText("That doesn’t look like a email address.")).toBeVisible();
  });

  test("signed-out app pages ask you to sign in", async ({ page }) => {
    for (const p of ["/search/", "/history/", "/cases/", "/settings/api-keys/"]) {
      await page.goto(p);
      await expect(page.getByRole("heading", { name: /Sign in to use/ })).toBeVisible();
    }
  });

  test("keyboard: skip link moves focus to main", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
  });

  test("unknown route shows the 404 page", async ({ page }) => {
    await page.goto("/does-not-exist/");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });
});
