import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { cosine, deterministicEmbedding } from "@unmet/shared/testing";
import OpenAI from "openai";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anthropicRequestHash, canonicalJson } from "./canonical.ts";
import { setupLlmMocks } from "./replay.ts";

const fixturesDir = fileURLToPath(new URL("../../../../fixtures/llm/harness", import.meta.url));
const server = setupLlmMocks({ fixturesDir });

// SDK clients capture `fetch` when constructed, so build them after interception starts.
let anthropic: Anthropic;
let openai: OpenAI;

beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" });
  anthropic = new Anthropic({ apiKey: "test-key-not-real", maxRetries: 0 });
  openai = new OpenAI({ apiKey: "test-key-not-real", maxRetries: 0 });
});
afterAll(() => server.close());

describe("LLM replay (LLM_MODE=replay)", () => {
  it("serves a recorded Messages API response through the real SDK", async () => {
    const message = await anthropic.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 64,
      messages: [{ role: "user", content: "Reply with one short greeting." }],
    });
    expect(message.content[0]).toEqual({ type: "text", text: "Hello from a recorded fixture." });
    expect(message.usage.input_tokens).toBe(14);
  });

  it("fails loudly on a request that was never recorded", async () => {
    await expect(
      anthropic.messages.create({
        model: "claude-haiku-5-5",
        max_tokens: 64,
        messages: [{ role: "user", content: "Something nobody recorded." }],
      }),
    ).rejects.toThrow(/No recorded LLM fixture [0-9a-f]{64}/);
  });

  it("returns deterministic embeddings for the same text", async () => {
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: ["a sunscreen that does not pill", "a sunscreen that does not pill"],
    });
    const [a, b] = res.data.map((d) => d.embedding);
    expect(a).toEqual(deterministicEmbedding("a sunscreen that does not pill"));
    expect(cosine(a ?? [], b ?? [])).toBeCloseTo(1, 10);
  });
});

describe("request hashing", () => {
  it("ignores key order and parameters outside model/system/messages/tools", () => {
    const a = { model: "m", messages: [{ role: "user", content: "x" }], max_tokens: 10 };
    const b = { max_tokens: 99, messages: [{ content: "x", role: "user" }], model: "m" };
    expect(anthropicRequestHash(a)).toBe(anthropicRequestHash(b));
    expect(anthropicRequestHash({ ...a, system: "s" })).not.toBe(anthropicRequestHash(a));
    expect(canonicalJson({ b: 1, a: { d: 2, c: undefined } })).toBe('{"a":{"d":2},"b":1}');
  });
});
