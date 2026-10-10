import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deterministicEmbedding } from "@unmet/shared/testing";
import { bypass, HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { anthropicRequestHash } from "./canonical.ts";

// LLM_MODE=replay serves recorded responses keyed by request hash and fails loudly on
// anything unrecorded; LLM_MODE=record forwards to the real API and writes the fixture
// (TESTING_GUIDE §2, §4.3). Live mode never installs these handlers.

export const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
export const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

export type LlmFixture = {
  hash: string;
  recordedAt: string;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
};

export type ReplayOptions = {
  /** Directory holding `<hash>.json` files, e.g. fixtures/llm/<suite>. */
  fixturesDir: string;
  mode?: "replay" | "record";
};

export function fixturePath(fixturesDir: string, hash: string): string {
  return join(fixturesDir, `${hash}.json`);
}

const modeFromEnv = (): "replay" | "record" =>
  process.env.LLM_MODE === "record" ? "record" : "replay";

export function anthropicReplayHandler({ fixturesDir, mode = modeFromEnv() }: ReplayOptions) {
  return http.post(ANTHROPIC_MESSAGES_URL, async ({ request }) => {
    const body = (await request.clone().json()) as Record<string, unknown>;
    const hash = anthropicRequestHash(body);
    const file = fixturePath(fixturesDir, hash);

    if (mode === "record") {
      const res = await fetch(bypass(request));
      const response = (await res.json()) as Record<string, unknown>;
      if (res.ok) {
        mkdirSync(fixturesDir, { recursive: true });
        const fixture: LlmFixture = {
          hash,
          recordedAt: new Date().toISOString(),
          request: body,
          response,
        };
        writeFileSync(file, `${JSON.stringify(fixture, null, 2)}\n`);
      }
      return HttpResponse.json(response, { status: res.status });
    }

    if (!existsSync(file)) {
      return HttpResponse.json(
        {
          type: "error",
          error: {
            type: "invalid_request_error",
            message: `No recorded LLM fixture ${hash} in ${fixturesDir}. Re-record with pnpm llm:record.`,
          },
        },
        { status: 400 },
      );
    }
    const fixture = JSON.parse(readFileSync(file, "utf8")) as LlmFixture;
    return HttpResponse.json(fixture.response);
  });
}

/** Deterministic embeddings: same input text, same vector, no network. */
export const openAiEmbeddingsHandler = http.post(OPENAI_EMBEDDINGS_URL, async ({ request }) => {
  const body = (await request.json()) as { input: string | string[]; model: string };
  const inputs = Array.isArray(body.input) ? body.input : [body.input];
  return HttpResponse.json({
    object: "list",
    model: body.model,
    data: inputs.map((text, index) => ({
      object: "embedding",
      index,
      embedding: deterministicEmbedding(text),
    })),
    usage: {
      prompt_tokens: inputs.join(" ").split(/\s+/).length,
      total_tokens: inputs.join(" ").split(/\s+/).length,
    },
  });
});

/** An MSW server for replayed LLM calls. Call `listen({ onUnhandledFrame: "error" })` and `close()` in hooks. */
export function setupLlmMocks(options: ReplayOptions) {
  return setupServer(anthropicReplayHandler(options), openAiEmbeddingsHandler);
}
