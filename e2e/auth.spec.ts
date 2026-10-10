import { test, expect, signIn, users } from "./helpers";

test.describe("F01 auth", () => {
  test("F01-N1 wrong password shows an error and stays on the page", async ({ page }) => {
    await page.goto("/sign-in/");
    await page.getByLabel("Email").fill(users()[0].email);
    await page.getByLabel("Password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: /\w/ })).toHaveText("Email or password is wrong.");
    await expect(page).toHaveURL(/\/sign-in\//);
  });

  test("F01-H1 sign in, see the app nav, sign out", async ({ page }) => {
    await signIn(page);
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "History" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Search" })).toHaveAttribute("aria-current", "page");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(nav.getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("F01-E3 sign-in honours ?next=", async ({ page }) => {
    const u = users()[1];
    await page.goto("/sign-in/?next=%2Fcases%2F");
    await page.getByLabel("Email").fill(u.email);
    await page.getByLabel("Password").fill(u.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/cases\/$/);
  });

  test("F01-E4 ?next= cannot redirect off-site", async ({ page }) => {
    const u = users()[1];
    await page.goto("/sign-in/?next=https%3A%2F%2Fevil.example%2F");
    await page.getByLabel("Email").fill(u.email);
    await page.getByLabel("Password").fill(u.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/localhost:4317\/search\/$/);
  });
});
