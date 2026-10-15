import { defineConfig, devices } from "@playwright/test"

// B-034: locally, browser tests run against their own Supabase stack (scripts/e2e-stack.sh, ports
// 553xx) and their own production build on :3200, so test data never shows up in the app you
// browse on :3100. CI keeps the single default stack and the dev server.
const CI = !!process.env.CI
const PORT = CI ? 3100 : 3200
if (!CI) {
  process.env.E2E_DB_URL ??= "postgresql://postgres:postgres@127.0.0.1:55322/postgres"
  process.env.E2E_MAILPIT_URL ??= "http://127.0.0.1:55324"
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: CI ? 1 : 0,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // Locally, use the installed Chrome; CI installs Playwright's Chromium.
    ...(CI ? {} : { channel: "chrome" }),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: CI
    ? { command: "npm run dev", url: "http://localhost:3100", reuseExistingServer: false, timeout: 120_000 }
    : {
        command: "./scripts/e2e-stack.sh >/dev/null && next build && next start -p 3200",
        url: "http://localhost:3200",
        reuseExistingServer: false, // always test the current code
        timeout: 300_000,
        env: {
          NEXT_DIST_DIR: ".next-e2e",
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:55321",
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
          NEXT_PUBLIC_SITE_URL: "http://localhost:3200",
          DEV_LOGIN_EMAIL: "",
          DEV_LOGIN_PASSWORD: "",
        },
      },
})
