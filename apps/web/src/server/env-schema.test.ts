import { EnvError } from "@unmet/shared";
import { describe, expect, it } from "vitest";
import { parseWebEnv, previewAppUrl, webEnvSchema } from "./env-schema.ts";

const valid = {
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgres://unmet:unmet@localhost:5433/unmet",
  ADMIN_TOKEN: "a".repeat(32),
  ADMIN_COOKIE_SECRET: "b".repeat(32),
  IP_HASH_SALT: "c".repeat(32),
};

describe("web env", () => {
  it("accepts the minimum production set and applies defaults", () => {
    const env = parseWebEnv(valid);
    expect(env.PUBLIC_DEMO_MODE).toBe(true);
    expect(env.LIVE_RUNS_ENABLED).toBe(false);
    expect(env.STORAGE_DRIVER).toBe("fs");
    expect(env.DAILY_LIVE_RUN_BUDGET_USD).toBe(15);
  });

  it("fails fast naming the missing variable", () => {
    const { ADMIN_COOKIE_SECRET: _omitted, ...rest } = valid;
    expect(() => parseWebEnv(rest)).toThrow(EnvError);
    expect(() => parseWebEnv(rest)).toThrow(/ADMIN_COOKIE_SECRET/);
  });

  it("never carries model-provider keys (G-SEC-13)", () => {
    const keys = Object.keys(webEnvSchema.shape);
    expect(keys).not.toContain("ANTHROPIC_API_KEY");
    expect(keys).not.toContain("OPENAI_API_KEY");
    const env = parseWebEnv({ ...valid, ANTHROPIC_API_KEY: "sk-ant-x", OPENAI_API_KEY: "sk-x" });
    expect(env).not.toHaveProperty("ANTHROPIC_API_KEY");
    expect(env).not.toHaveProperty("OPENAI_API_KEY");
  });

  it("requires every R2 variable when STORAGE_DRIVER=r2", () => {
    expect(() => parseWebEnv({ ...valid, STORAGE_DRIVER: "r2", R2_BUCKET: "b" })).toThrow(
      /R2_ACCOUNT_ID \(required when STORAGE_DRIVER=r2\), R2_ACCESS_KEY_ID .*R2_SECRET_ACCESS_KEY/,
    );
  });

  it("requires Upstash credentials when RATE_LIMIT_DRIVER=upstash", () => {
    expect(() => parseWebEnv({ ...valid, RATE_LIMIT_DRIVER: "upstash" })).toThrow(
      /UPSTASH_REDIS_REST_URL.*UPSTASH_REDIS_REST_TOKEN/,
    );
  });
});

describe("previewAppUrl", () => {
  const preview = { VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "unmet-git-p0.vercel.app" };

  it("uses the branch URL on Vercel previews when APP_URL is unset", () => {
    expect(previewAppUrl(preview)).toBe("https://unmet-git-p0.vercel.app");
    expect(previewAppUrl({ VERCEL_ENV: "preview", VERCEL_URL: "unmet-abc.vercel.app" })).toBe(
      "https://unmet-abc.vercel.app",
    );
  });

  it("never overrides an explicit APP_URL or applies outside previews", () => {
    expect(previewAppUrl({ ...preview, APP_URL: "https://unmet.example" })).toBeUndefined();
    expect(previewAppUrl({ ...preview, VERCEL_ENV: "production" })).toBeUndefined();
    expect(previewAppUrl({ VERCEL_BRANCH_URL: "x.vercel.app" })).toBeUndefined();
  });
});
