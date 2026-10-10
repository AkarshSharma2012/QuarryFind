import { test, expect, search, a11y, asUser } from "./helpers";

test.describe("F05 cases", () => {
  test.use({ storageState: asUser(2) });
  test("F05-H1 save a finding to a new case, annotate, remove, delete", async ({ page }) => {
    await search(page, "Domain", "example.net");
    const card = page.getByRole("article", { name: /DNS records/ }).locator("xpath=ancestor::div[contains(@class,'rounded-lg')][1]");
    await card.getByRole("button", { name: "Save" }).click();

    const dialog = page.getByRole("dialog", { name: "Save to a case" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("radio", { name: "New case" }).check();
    await dialog.getByLabel("Case name").fill("E2E case with a long name — accents éàü and emoji 🔎");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved to case" })).toBeVisible();
    await expect(card.getByRole("button", { name: "Saved" })).toBeVisible();

    await page.goto("/cases/");
    await page.getByRole("link", { name: /E2E case with a long name/ }).click();
    await expect(page.getByText("1 saved finding")).toBeVisible();
    await a11y(page);

    await page.getByRole("textbox", { name: "Notes" }).fill("Confirmed via DNS. Registrant unknown.");
    await page.waitForTimeout(800); // autosave debounce
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Notes" })).toHaveValue("Confirmed via DNS. Registrant unknown.");

    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("Nothing saved yet")).toBeVisible();

    await page.getByRole("button", { name: "Delete case" }).click();
    await page.getByRole("dialog", { name: "Delete this case?" }).getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/cases\/$/);
    await expect(page.getByRole("link", { name: /E2E case with a long name/ })).toHaveCount(0);
  });

  test("F05-E1 saving the same finding twice does not duplicate it", async ({ page }) => {
    await search(page, "Domain", "example.edu");
    const card = page.getByRole("article", { name: /DNS records/ }).locator("xpath=ancestor::div[contains(@class,'rounded-lg')][1]");
    for (let i = 0; i < 2; i++) {
      await card.getByRole("button", { name: /Save|Saved/ }).click();
      const d = page.getByRole("dialog", { name: "Save to a case" });
      if (i === 0) { await d.getByRole("radio", { name: "New case" }).check(); await d.getByLabel("Case name").fill("Dupes"); }
      else await d.getByRole("radio", { name: /Dupes/ }).check();
      await d.getByRole("button", { name: "Save" }).click();
      await expect(d).toBeHidden();
    }
    await page.goto("/cases/");
    await page.getByRole("link", { name: /Dupes/ }).click();
    await expect(page.getByText("1 saved finding")).toBeVisible();
  });

  test("F05-E2 empty case name can't be created", async ({ page }) => {
    await page.goto("/cases/");
    await page.getByRole("button", { name: "New case" }).first().click();
    const d = page.getByRole("dialog", { name: "New case" });
    await expect(d.getByRole("button", { name: "Create" })).toBeDisabled();
  });
});
