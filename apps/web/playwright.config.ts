import { defineConfig, devices } from "@playwright/test";
import { loadLocalEnv } from "@unmet/shared/node";

// Locally and in CI, Playwright resets and seeds unmet_e2e, then starts a production build
// against it. Against a Vercel preview, set PLAYWRIGHT_BASE_URL and nothing starts.
// The reset lives in the webServer command, not globalSetup: Playwright starts the server
// before globalSetup runs, and the health check needs the database to exist.
const remote = process.env.PLAYWRIGHT_BASE_URL;
if (!remote) loadLocalEnv({ env: "e2e" });
const baseURL = remote ?? "http://localhost:3100";
const E2E_DB_PREP = "pnpm --dir ../.. db:reset --env e2e && pnpm --dir ../.. db:seed --env e2e";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.001 } },
  // Baselines are rendered on macOS; font rasterisation differs on Linux runners, so CI runs
  // every assertion in the visual specs (axe, layout) except the pixel comparison itself.
  ignoreSnapshots: Boolean(process.env.CI),
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}-{platform}{ext}",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: remote
    ? undefined
    : {
        command: `${E2E_DB_PREP} && pnpm build && pnpm exec next start --port 3100`,
        url: `${baseURL}/api/v1/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
        env: { ...process.env, APP_URL: baseURL } as Record<string, string>,
      },
});
