import { test, expect, a11y, asUser } from "./helpers";

test.describe("F08 API keys", () => {
  test.use({ storageState: asUser(3) });
  test("F08-H1 create a key (shown once), use it, revoke it", async ({ page, request }) => {
    await page.goto("/settings/api-keys/");
    await page.getByRole("button", { name: "Create key" }).first().click();
    const create = page.getByRole("dialog", { name: "Create API key" });
    await create.getByLabel("Name").fill("e2e");
    await create.getByRole("button", { name: "Create" }).click();
    const shown = page.getByRole("dialog", { name: "Your new API key" });
    const key = (await shown.locator("code").innerText()).trim();
    expect(key).toMatch(/^qf_live_[0-9a-f]{48}$/);
    await shown.getByRole("button", { name: "I’ve stored it" }).click();
    await expect(page.getByRole("cell", { name: `${key.slice(0, 12)}…` })).toBeVisible();
    await a11y(page);

    const base = process.env.SUPABASE_URL;
    expect((await request.get(`${base}/functions/v1/v1/me`, { headers: { authorization: `Bearer ${key}` } })).status()).toBe(200);

    await page.getByRole("button", { name: "Revoke e2e" }).click();
    await page.getByRole("dialog", { name: "Revoke this key?" }).getByRole("button", { name: "Revoke" }).click();
    await expect(page.getByText("Revoked")).toBeVisible();
    expect((await request.get(`${base}/functions/v1/v1/me`, { headers: { authorization: `Bearer ${key}` } })).status()).toBe(401);
  });
});

test.describe("F07 tools", () => {
  test.use({ storageState: asUser(3) });
  test("F07-H1 DNS tool returns records", async ({ page }) => {
    await page.goto("/tools/dns/");
    await page.getByRole("textbox", { name: "Domain" }).fill("example.com");
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(page.getByRole("rowheader", { name: "NS" }).first()).toBeVisible();
    await a11y(page);
  });

  test("F07-N1 IP tool rejects garbage and private addresses", async ({ page }) => {
    await page.goto("/tools/ip/");
    await page.getByRole("textbox", { name: "IP address" }).fill("999.1.1.1");
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(page.getByText("That isn’t a valid IPv4 or IPv6 address.")).toBeVisible();
    await page.getByRole("textbox", { name: "IP address" }).fill("192.168.1.1");
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(page.getByRole("heading", { name: "Nothing found" })).toBeVisible();
  });

  test("F07-H2 browser-only tools work without a network round trip", async ({ page }) => {
    await page.goto("/tools/variations/");
    await page.getByRole("textbox", { name: "Name or handle" }).fill("Jane Doe");
    await expect(page.getByRole("button", { name: /^jane\.doe/ })).toBeVisible();

    await page.goto("/tools/hash/");
    await page.getByRole("textbox", { name: "Hash" }).fill("5f4dcc3b5aa765d61d8327deb882cf99");
    await expect(page.getByText("MD5", { exact: true })).toBeVisible();

    await page.goto("/tools/phone/");
    await page.getByRole("textbox", { name: "Phone number" }).fill("+44 20 7946 0958");
    await expect(page.getByRole("cell", { name: /United Kingdom/ })).toBeVisible();
  });


});
