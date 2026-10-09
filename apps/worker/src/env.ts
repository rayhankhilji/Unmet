import { llmMode, modelEnv, optionalUrl, parseEnv, postgresUrl } from "@unmet/shared";
import { z } from "zod";

export const workerEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
  ANTHROPIC_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  ...modelEnv,
  LLM_MODE: llmMode.default("live"),
  RUN_TOKEN_BUDGET: z.coerce.number().int().positive().default(600_000),
  WORKER_ID: z.string().min(1).default("worker-1"),
  HEALTH_PORT: z.coerce.number().int().positive().default(8080),
  SENTRY_DSN: optionalUrl,
});

export type WorkerEnv = z.output<typeof workerEnvSchema>;

export function loadWorkerEnv(source: Record<string, string | undefined> = process.env): WorkerEnv {
  return parseEnv(workerEnvSchema, source, "worker");
}
