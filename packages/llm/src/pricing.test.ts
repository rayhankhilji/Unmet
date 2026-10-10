import { describe, expect, it } from "vitest";
import {
  isAnthropicModelId,
  priceAnthropicUsage,
  priceEmbedding,
  priceTranscription,
} from "./pricing.ts";

describe("priceAnthropicUsage", () => {
  it("prices plain input and output tokens", () => {
    const cost = priceAnthropicUsage("claude-sonnet-5-5", {
      input_tokens: 10_000,
      output_tokens: 2_000,
    });
    expect(cost).toBeCloseTo(0.02 + 0.02, 10);
  });

  it("prices cache reads and both cache-write TTLs separately", () => {
    const cost = priceAnthropicUsage("claude-opus-5-5", {
      input_tokens: 1_000,
      output_tokens: 1_000,
      cache_read_input_tokens: 50_000,
      cache_creation_input_tokens: 3_000,
      cache_creation: { ephemeral_5m_input_tokens: 2_000, ephemeral_1h_input_tokens: 1_000 },
    });
    // 1k×4 + 1k×20 + 50k×0.2 + 2k×5 + 1k×8, per million
    expect(cost).toBeCloseTo((4_000 + 20_000 + 10_000 + 10_000 + 8_000) / 1_000_000, 10);
  });

  it("bills undifferentiated cache writes at the 5-minute rate", () => {
    const cost = priceAnthropicUsage("claude-sonnet-5-5", {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(2.5, 10);
  });

  it("switches Haiku to the long-prompt rate card above 100k prompt tokens", () => {
    const short = priceAnthropicUsage("claude-haiku-5-5", {
      input_tokens: 100_000,
      output_tokens: 1_000,
    });
    const long = priceAnthropicUsage("claude-haiku-5-5", {
      input_tokens: 100_001,
      output_tokens: 1_000,
    });
    expect(short).toBeCloseTo((100_000 * 0.1 + 1_000 * 0.5) / 1_000_000, 10);
    expect(long).toBeCloseTo((100_001 * 0.5 + 1_000 * 2.5) / 1_000_000, 10);
  });
});

describe("OpenAI pricing", () => {
  it("prices embeddings per token", () => {
    expect(priceEmbedding(1_000_000)).toBeCloseTo(0.02, 10);
  });

  it("prices transcription per audio minute", () => {
    expect(priceTranscription(90_000)).toBeCloseTo(0.009, 10);
  });
});

describe("isAnthropicModelId", () => {
  it("accepts priced models only", () => {
    expect(isAnthropicModelId("claude-sonnet-5-5")).toBe(true);
    expect(isAnthropicModelId("claude-sonnet-4-5")).toBe(false);
  });
});
