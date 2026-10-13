import { readFileSync } from "node:fs";
import { test, expect, unlock, asUser, a11y } from "./helpers";

const GATE = { name: "This site is private" };

test.describe("F01 password screen (the only way in)", () => {
  test("F01-G1 a visitor without a session sees only the password screen @mobile", async ({ page }) => {
    for (const path of ["/", "/search/", "/cases/", "/tools/"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", GATE)).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
    }
    await a11y(page);
  });

  test("F01-N1 a wrong password is refused", async ({ page }) => {
    await unlock(page, "definitely-wrong-password");
    await expect(page.getByText("That’s not the password.")).toBeVisible();
    await expect(page.getByRole("heading", GATE)).toBeVisible();
  });

  test("F01-H1 the password opens the site, survives a reload, and signing out locks it again", async ({ page }) => {
    await unlock(page);
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "History" })).toBeVisible();
    await page.reload();
    await expect(nav.getByRole("link", { name: "History" })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign up|create free account/i })).toHaveCount(0);
    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page.getByRole("heading", GATE)).toBeVisible();
  });

  test("F01-E2 the old sign-up and sign-in pages are gone", async ({ page }) => {
    for (const path of ["/sign-up/", "/sign-in/"]) expect((await page.goto(path))?.status()).toBe(404);
  });

  test.describe("BUG-005 revoked session", () => {
    test.use({ storageState: asUser(5) });
    test("F01-E5 a session revoked elsewhere returns you to the password screen", async ({ page, request }) => {
      const state = JSON.parse(readFileSync(asUser(5), "utf8"));
      const session = JSON.parse(state.origins[0].localStorage[0].value);
      await page.goto("/search/");
      await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
      // Sign out everywhere from "another device".
      const out = await request.post(`${process.env.SUPABASE_URL}/auth/v1/logout?scope=global`, {
        headers: { apikey: process.env.SUPABASE_ANON_KEY!, authorization: `Bearer ${session.access_token}` },
      });
      expect(out.status()).toBe(204);
      await page.getByRole("radio", { name: "Domain" }).click();
      await page.getByRole("textbox").first().fill("example.com");
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await expect(page.getByRole("heading", GATE)).toBeVisible();
    });
  });
});
