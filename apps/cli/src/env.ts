import { llmMode, modelEnv, parseEnv, postgresUrl, secret } from "@unmet/shared";
import { z } from "zod";

/** Every command needs the database. */
export const cliBaseEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
  DATABASE_URL_UNPOOLED: postgresUrl.optional(),
});

/** Ingest, extract, embed and eval commands also call model providers and storage. */
export const cliPipelineEnvSchema = cliBaseEnvSchema.extend({
  ANTHROPIC_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  ...modelEnv,
  LLM_MODE: llmMode.default("live"),
  COMMENT_HASH_SALT: secret,
  STORAGE_DRIVER: z.enum(["fs", "r2"]).default("fs"),
});

export type CliBaseEnv = z.output<typeof cliBaseEnvSchema>;
export type CliPipelineEnv = z.output<typeof cliPipelineEnvSchema>;

export function loadCliBaseEnv(
  source: Record<string, string | undefined> = process.env,
): CliBaseEnv {
  return parseEnv(cliBaseEnvSchema, source, "cli");
}

export function loadCliPipelineEnv(
  source: Record<string, string | undefined> = process.env,
): CliPipelineEnv {
  return parseEnv(cliPipelineEnvSchema, source, "cli");
}
