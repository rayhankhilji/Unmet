/**
 * Provider prices in USD. Verified against provider pricing pages on PRICES_VERIFIED_AT
 * (P0.T1). Update the table and the date together; cost caps (EVAL_GUARDRAILS §4) are
 * enforced on what this module computes.
 */
export const PRICES_VERIFIED_AT = "2026-10-09";

export type AnthropicModelId = "claude-opus-5-5" | "claude-sonnet-5-5" | "claude-haiku-5-5";

export type TokenRates = {
  inputPerMTok: number;
  outputPerMTok: number;
  cacheWrite5mPerMTok: number;
  cacheWrite1hPerMTok: number;
  cacheReadPerMTok: number;
};

export type AnthropicModelPrice = TokenRates & {
  /** Some models switch to a second rate card when the whole prompt exceeds a size. */
  longPrompt?: TokenRates & { aboveTokens: number };
};

export const ANTHROPIC_PRICES: Record<AnthropicModelId, AnthropicModelPrice> = {
  "claude-opus-5-5": {
    inputPerMTok: 4,
    outputPerMTok: 20,
    cacheWrite5mPerMTok: 5,
    cacheWrite1hPerMTok: 8,
    cacheReadPerMTok: 0.2,
  },
  "claude-sonnet-5-5": {
    inputPerMTok: 2,
    outputPerMTok: 10,
    cacheWrite5mPerMTok: 2.5,
    cacheWrite1hPerMTok: 4,
    cacheReadPerMTok: 0.2,
  },
  "claude-haiku-5-5": {
    inputPerMTok: 0.1,
    outputPerMTok: 0.5,
    cacheWrite5mPerMTok: 0.125,
    cacheWrite1hPerMTok: 0.2,
    cacheReadPerMTok: 0.01,
    longPrompt: {
      aboveTokens: 100_000,
      inputPerMTok: 0.5,
      outputPerMTok: 2.5,
      cacheWrite5mPerMTok: 0.625,
      cacheWrite1hPerMTok: 1,
      cacheReadPerMTok: 0.05,
    },
  },
};

export const OPENAI_PRICES = {
  "whisper-1": { perAudioMinute: 0.006 },
  "text-embedding-3-small": { inputPerMTok: 0.02 },
} as const;

/** Mirrors the `usage` object on an Anthropic Messages API response. */
export type AnthropicUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_creation?: {
    ephemeral_5m_input_tokens?: number | null;
    ephemeral_1h_input_tokens?: number | null;
  } | null;
};

const PER_MILLION = 1_000_000;

export function isAnthropicModelId(model: string): model is AnthropicModelId {
  return Object.hasOwn(ANTHROPIC_PRICES, model);
}

export function priceAnthropicUsage(model: AnthropicModelId, usage: AnthropicUsage): number {
  const price = ANTHROPIC_PRICES[model];
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWriteTotal = usage.cache_creation_input_tokens ?? 0;
  // Without the TTL breakdown every write is billed at the default 5-minute rate.
  const write1h = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  const write5m = usage.cache_creation?.ephemeral_5m_input_tokens ?? cacheWriteTotal - write1h;

  const promptTokens = usage.input_tokens + cacheRead + write5m + write1h;
  const rates =
    price.longPrompt && promptTokens > price.longPrompt.aboveTokens ? price.longPrompt : price;

  return (
    (usage.input_tokens * rates.inputPerMTok +
      usage.output_tokens * rates.outputPerMTok +
      cacheRead * rates.cacheReadPerMTok +
      write5m * rates.cacheWrite5mPerMTok +
      write1h * rates.cacheWrite1hPerMTok) /
    PER_MILLION
  );
}

export function priceEmbedding(tokens: number): number {
  return (tokens * OPENAI_PRICES["text-embedding-3-small"].inputPerMTok) / PER_MILLION;
}

export function priceTranscription(durationMs: number): number {
  return (durationMs / 60_000) * OPENAI_PRICES["whisper-1"].perAudioMinute;
}
