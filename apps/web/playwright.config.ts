import { defineConfig, devices } from "@playwright/test";
import { loadLocalEnv } from "@unmet/shared/node";

// Locally and in CI's build job, Playwright starts a production build against the seeded
// unmet_e2e database. Against a Vercel preview, set PLAYWRIGHT_BASE_URL and nothing starts.
const remote = process.env.PLAYWRIGHT_BASE_URL;
if (!remote) loadLocalEnv({ env: "e2e" });
const baseURL = remote ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: remote ? undefined : "./e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.001 } },
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}-{platform}{ext}",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: remote
    ? undefined
    : {
        command: "pnpm build && pnpm exec next start --port 3100",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
        env: { ...process.env, APP_URL: baseURL } as Record<string, string>,
      },
});
