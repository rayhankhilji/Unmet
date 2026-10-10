import { describe, expect, it } from "vitest";
import { loadWorkerEnv } from "./env.ts";

const valid = {
  DATABASE_URL: "postgres://unmet:unmet@localhost:5433/unmet",
  ANTHROPIC_API_KEY: "sk-ant-fake",
  OPENAI_API_KEY: "sk-fake",
};

describe("worker env", () => {
  it("applies model and budget defaults", () => {
    const env = loadWorkerEnv(valid);
    expect(env.MODEL_AGENT).toBe("claude-sonnet-5-5");
    expect(env.MODEL_FALLBACK).toBe("claude-opus-5-5");
    expect(env.RUN_TOKEN_BUDGET).toBe(600_000);
    expect(env.LLM_MODE).toBe("live");
  });

  it("fails fast naming the missing API key", () => {
    const { ANTHROPIC_API_KEY: _omitted, ...rest } = valid;
    expect(() => loadWorkerEnv(rest)).toThrow(/Invalid worker environment: ANTHROPIC_API_KEY/);
  });

  it("rejects an unknown LLM mode", () => {
    expect(() => loadWorkerEnv({ ...valid, LLM_MODE: "mock" })).toThrow(/LLM_MODE/);
  });
});
