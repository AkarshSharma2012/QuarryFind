import { defineConfig, devices } from "@playwright/test";

// Smoke tests against the deployed site (e2e-live/). Paths in the specs are
// relative to LIVE_URL, which must end with "/".
export default defineConfig({
  testDir: "e2e-live",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-live" }]],
  use: { baseURL: process.env.LIVE_URL ?? "https://akarshsharma2012.github.io/OsintSet/", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
});
