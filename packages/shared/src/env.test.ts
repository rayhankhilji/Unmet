import { describe, expect, it } from "vitest";
import { z } from "zod";
import { booleanFlag, EnvError, parseEnv, postgresUrl, secret } from "./env.ts";

const schema = z.object({
  DATABASE_URL: postgresUrl,
  ADMIN_TOKEN: secret,
  LIVE_RUNS_ENABLED: booleanFlag(false),
});

describe("parseEnv", () => {
  it("names every missing variable in the error", () => {
    try {
      parseEnv(schema, {}, "test");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvError);
      expect((error as EnvError).variables).toEqual(["DATABASE_URL", "ADMIN_TOKEN"]);
      expect((error as Error).message).toMatch(/^Invalid test environment: DATABASE_URL/);
    }
  });

  it("treats empty strings as unset so defaults apply", () => {
    const env = parseEnv(
      schema,
      { DATABASE_URL: "postgres://u:p@h/db", ADMIN_TOKEN: "x".repeat(32), LIVE_RUNS_ENABLED: "" },
      "test",
    );
    expect(env.LIVE_RUNS_ENABLED).toBe(false);
  });

  it("rejects short secrets and non-postgres URLs", () => {
    expect(() =>
      parseEnv(schema, { DATABASE_URL: "mysql://x", ADMIN_TOKEN: "short" }, "test"),
    ).toThrow(/DATABASE_URL \(must be a postgres:\/\/ connection string\), ADMIN_TOKEN/);
  });

  it("parses boolean flags", () => {
    const base = { DATABASE_URL: "postgres://h/db", ADMIN_TOKEN: "x".repeat(32) };
    expect(parseEnv(schema, { ...base, LIVE_RUNS_ENABLED: "true" }, "t").LIVE_RUNS_ENABLED).toBe(
      true,
    );
    expect(parseEnv(schema, { ...base, LIVE_RUNS_ENABLED: "1" }, "t").LIVE_RUNS_ENABLED).toBe(true);
    expect(() => parseEnv(schema, { ...base, LIVE_RUNS_ENABLED: "yes" }, "t")).toThrow(
      /LIVE_RUNS_ENABLED/,
    );
  });
});
