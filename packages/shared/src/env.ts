import { z } from "zod";

// Building blocks for the env schemas of web, worker and cli (ARCHITECTURE §12).
// Each app owns its own schema so the web app can never require model API keys (G-SEC-13).

export const booleanFlag = (fallback: boolean) =>
  z
    .enum(["true", "false", "1", "0"])
    .default(fallback ? "true" : "false")
    .transform((v) => v === "true" || v === "1");

export const secret = z.string().min(32, "must be at least 32 characters");
export const postgresUrl = z
  .string()
  .regex(/^postgres(ql)?:\/\//, "must be a postgres:// connection string");
export const optionalUrl = z.url().optional();
export const llmMode = z.enum(["live", "replay", "record"]);

export const modelEnv = {
  MODEL_AGENT: z.string().default("claude-sonnet-5-5"),
  MODEL_EXTRACT: z.string().default("claude-haiku-5-5"),
  MODEL_VISION: z.string().default("claude-haiku-5-5"),
  MODEL_JUDGE: z.string().default("claude-opus-5-5"),
  MODEL_FALLBACK: z.string().default("claude-opus-5-5"),
  TRANSCRIBE_MODEL: z.string().default("whisper-1"),
  EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
};

export type EnvIssue = {
  path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>;
  message: string;
};

export class EnvError extends Error {
  readonly variables: string[];

  constructor(label: string, issues: readonly EnvIssue[]) {
    const variables = issues.map(issueVariable);
    const detail = issues.map((i) => `${issueVariable(i)} (${i.message})`).join(", ");
    super(`Invalid ${label} environment: ${detail}`);
    this.name = "EnvError";
    this.variables = variables;
  }
}

function issueVariable(issue: EnvIssue): string {
  const first = issue.path?.[0];
  if (first === undefined) return "(root)";
  return String(typeof first === "object" ? first.key : first);
}

/** Parses `source` and throws an EnvError that names every missing or invalid variable. */
export function parseEnv<S extends z.ZodType>(
  schema: S,
  source: Record<string, string | undefined>,
  label: string,
): z.output<S> {
  const cleaned = Object.fromEntries(
    Object.entries(source).filter(([, v]) => v !== undefined && v !== ""),
  );
  const result = schema.safeParse(cleaned);
  if (!result.success) throw new EnvError(label, result.error.issues);
  return result.data;
}
