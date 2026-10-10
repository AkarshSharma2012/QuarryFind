import { defineConfig, devices } from "@playwright/test";

// Runs against the static production build (web/out, built in Supabase mode
// from web/.env.local) and local Supabase (`npx supabase start`).
// Build first: NEXT_DIST_DIR=.next-build npm --prefix web run build
export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: "http://localhost:4317", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: { command: "npx -y serve@14 web/out -l 4317 --no-port-switching", url: "http://localhost:4317", reuseExistingServer: true, timeout: 60_000 },
});
