import { type AnthropicUsage, priceAnthropicUsage } from "@unmet/llm";
import type { EventType } from "@unmet/shared";

const AGENT_MODEL = "claude-sonnet-5-5" as const;

export type SeedEvent = {
  type: EventType;
  toolName: string | null;
  title: string;
  payload: Record<string, unknown>;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
};

/** Accumulates a believable, internally consistent run trace (totals = sum of events). */
export class EventLog {
  readonly events: SeedEvent[] = [];
  private turn = 0;

  add(
    type: EventType,
    title: string,
    payload: Record<string, unknown> = {},
    toolName: string | null = null,
    latencyMs = 40,
  ) {
    this.events.push({
      type,
      toolName,
      title,
      payload,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      latencyMs,
    });
  }

  modelCall(title: string) {
    this.turn += 1;
    // Cache-heavy turns: a stable system prompt and tool list, growing history.
    const usage: AnthropicUsage = {
      input_tokens: 1_800 + this.turn * 420,
      output_tokens: 260 + ((this.turn * 97) % 380),
      cache_read_input_tokens: this.turn > 1 ? 9_400 : 0,
      cache_creation_input_tokens: this.turn === 1 ? 9_400 : 0,
    };
    const costUsd = Math.round(priceAnthropicUsage(AGENT_MODEL, usage) * 10_000) / 10_000;
    this.events.push({
      type: "model_call",
      toolName: null,
      title,
      payload: { model: AGENT_MODEL, usage, stopReason: "tool_use" },
      inputTokens:
        usage.input_tokens +
        (usage.cache_read_input_tokens ?? 0) +
        (usage.cache_creation_input_tokens ?? 0),
      outputTokens: usage.output_tokens,
      costUsd,
      latencyMs: 4_200 + ((this.turn * 1_310) % 6_000),
    });
  }

  tool(
    toolName: string,
    title: string,
    input: Record<string, unknown>,
    output: Record<string, unknown>,
  ) {
    this.add("tool_call", title, { input }, toolName, 0);
    this.add(
      "tool_result",
      `${title} — done`,
      { output },
      toolName,
      35 + (this.events.length % 7) * 22,
    );
  }

  totals() {
    return this.events.reduce(
      (acc, e) => ({
        inputTokens: acc.inputTokens + e.inputTokens,
        outputTokens: acc.outputTokens + e.outputTokens,
        costUsd: Math.round((acc.costUsd + e.costUsd) * 10_000) / 10_000,
        iterations: acc.iterations + (e.type === "model_call" ? 1 : 0),
      }),
      { inputTokens: 0, outputTokens: 0, costUsd: 0, iterations: 0 },
    );
  }
}
