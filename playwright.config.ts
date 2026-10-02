import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: "line",
  // First paint compiles the dev bundle on demand; under CI load that
  // exceeds Playwright's 5s expect default (flakes observed live).
  expect: { timeout: 15000 },
  use: { baseURL: "http://127.0.0.1:4173", trace: "on-first-retry" },
  webServer: { command: "npm run dev -- --host 127.0.0.1 --port 4173", url: "http://127.0.0.1:4173", reuseExistingServer: !process.env.CI, timeout: 120_000 },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
});
