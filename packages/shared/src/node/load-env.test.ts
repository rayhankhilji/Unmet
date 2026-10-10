import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadLocalEnv, withDatabase } from "./load-env.ts";

const KEYS = [
  "DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "UNMET_TEST_ONLY",
  "VERCEL",
  "RAILWAY_ENVIRONMENT",
];
let saved: Record<string, string | undefined>;
let root: string;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
  root = mkdtempSync(join(tmpdir(), "unmet-env-"));
  writeFileSync(join(root, "pnpm-workspace.yaml"), "packages: []\n");
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("loadLocalEnv", () => {
  it("prefers .env.local over .env.example", () => {
    writeFileSync(join(root, ".env.example"), "UNMET_TEST_ONLY=example\n");
    writeFileSync(join(root, ".env.local"), "UNMET_TEST_ONLY=local\n");
    expect(loadLocalEnv({ root })).toBe(join(root, ".env.local"));
    expect(process.env.UNMET_TEST_ONLY).toBe("local");
  });

  it("falls back to the committed example on a clean clone", () => {
    writeFileSync(join(root, ".env.example"), "UNMET_TEST_ONLY=example\n");
    expect(loadLocalEnv({ root })).toBe(join(root, ".env.example"));
    expect(process.env.UNMET_TEST_ONLY).toBe("example");
  });

  it("never overrides variables that are already set", () => {
    process.env.UNMET_TEST_ONLY = "platform";
    writeFileSync(join(root, ".env.local"), "UNMET_TEST_ONLY=local\n");
    loadLocalEnv({ root });
    expect(process.env.UNMET_TEST_ONLY).toBe("platform");
  });

  it("points the e2e environment at the unmet_e2e database", () => {
    writeFileSync(
      join(root, ".env.test.example"),
      "DATABASE_URL=postgres://u:p@h:5433/unmet_test\n",
    );
    expect(loadLocalEnv({ root, env: "e2e" })).toBe(join(root, ".env.test.example"));
    expect(process.env.DATABASE_URL).toBe("postgres://u:p@h:5433/unmet_e2e");
    expect(process.env.DATABASE_URL_UNPOOLED).toBe("postgres://u:p@h:5433/unmet_e2e");
  });

  it.each(["VERCEL", "RAILWAY_ENVIRONMENT"])("reads no files at all when %s is set", (platform) => {
    process.env[platform] = "1";
    writeFileSync(join(root, ".env.example"), "UNMET_TEST_ONLY=example\n");
    expect(loadLocalEnv({ root })).toBeNull();
    expect(process.env.UNMET_TEST_ONLY).toBeUndefined();
  });

  it("returns null when no env file exists", () => {
    expect(loadLocalEnv({ root, env: "test" })).toBeNull();
  });

  it("finds the repository root from a nested directory", () => {
    const cwd = process.cwd();
    try {
      process.chdir(root);
      writeFileSync(join(root, ".env.test"), "UNMET_TEST_ONLY=nested\n");
      expect(loadLocalEnv({ env: "test" })).toMatch(/\.env\.test$/);
      expect(process.env.UNMET_TEST_ONLY).toBe("nested");
    } finally {
      process.chdir(cwd);
    }
  });
});

describe("withDatabase", () => {
  it("swaps only the database name", () => {
    expect(withDatabase("postgres://u:p@h:5433/a?sslmode=require", "b")).toBe(
      "postgres://u:p@h:5433/b?sslmode=require",
    );
  });
});
