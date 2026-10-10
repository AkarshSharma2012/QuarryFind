import { readFileSync } from "node:fs";
import { expect, test as base, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const users = (): { email: string; password: string }[] => JSON.parse(readFileSync("e2e/.auth/users.json", "utf8"));

/** Every test fails on console errors or a 5xx response from our own origins. */
export const test = base.extend<{ guard: void }>({
  guard: [async ({ page }, use) => {
    const problems: string[] = [];
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      // 4xx responses are expected error paths (wrong password, not found) and
      // third-party avatars may refuse to load; 5xx is caught separately below.
      if (/Failed to load resource: (the server responded with a status of 4\d\d|net::ERR_)/.test(t)) return;
      problems.push(`console: ${t}`);
    });
    page.on("response", (r) => {
      if (r.status() >= 500 && /localhost|127\.0\.0\.1/.test(r.url())) problems.push(`${r.status()} ${r.url()}`);
    });
    await use();
    expect(problems, problems.join("\n")).toEqual([]);
  }, { auto: true }],
});
export { expect };

/** Storage state for a pre-signed-in test user (see global-setup). */
export const asUser = (i: number) => `e2e/.auth/user${i}.json`;

/** Signs in through the real form (only the auth specs need this). */
export async function signIn(page: Page, who = 0) {
  const u = users()[who];
  await page.goto("/sign-in/");
  await page.getByLabel("Email").fill(u.email);
  await page.getByLabel("Password").fill(u.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/search\/$/);
}

export async function a11y(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}

/** Starts a search from the search page and waits for it to finish. */
export async function search(page: Page, type: "Username" | "Email" | "Domain", query: string) {
  await page.goto("/search/");
  await page.getByRole("radio", { name: type }).click();
  await page.getByRole("textbox").first().fill(query);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/search\/run\/\?id=/);
  await expect(page.getByText(/Search complete|Search stopped early/)).toBeVisible({ timeout: 100_000 });
}
