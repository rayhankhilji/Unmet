import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: [
            "packages/*/src/**/*.test.ts",
            "apps/*/src/**/*.test.ts",
            "apps/*/scripts/**/*.test.ts",
            "scripts/**/*.test.ts",
          ],
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          include: ["packages/*/test/**/*.int.test.ts", "apps/*/test/**/*.int.test.ts"],
          globalSetup: ["packages/db/src/testing/global-setup.ts"],
          setupFiles: ["packages/db/src/testing/setup.ts"],
          testTimeout: 20_000,
          hookTimeout: 60_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts", "apps/web/src/server/**/*.ts", "apps/*/src/env.ts"],
      exclude: [
        "**/*.test.ts",
        "**/testing/**",
        "**/index.ts",
        "packages/db/src/schema/**",
        "packages/db/src/migrate.ts",
      ],
      thresholds: {
        "packages/stats/src/**": { lines: 95 },
        "packages/agent/src/tools/**": { lines: 90 },
        "packages/shared/src/**": { lines: 90 },
        "packages/{db,llm,pipeline,storage,evals}/src/**": { lines: 70 },
      },
    },
  },
});
