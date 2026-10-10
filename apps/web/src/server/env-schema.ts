import { booleanFlag, optionalUrl, parseEnv, postgresUrl, secret } from "@unmet/shared";
import { z } from "zod";

// The web app's environment. It deliberately has no model-provider keys: the web process
// never calls an LLM (ARCHITECTURE §3, G-SEC-13).

export const webServerShape = {
  APP_URL: z.url(),
  DATABASE_URL: postgresUrl,
  STORAGE_DRIVER: z.enum(["fs", "r2"]).default("fs"),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  RATE_LIMIT_DRIVER: z.enum(["memory", "upstash"]).default("memory"),
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  // Optional: without it, live-run creation fails closed with PASSCODE_INVALID.
  DEMO_PASSCODE: z.string().min(8).optional(),
  ADMIN_TOKEN: secret,
  ADMIN_COOKIE_SECRET: secret,
  IP_HASH_SALT: secret,
  PUBLIC_DEMO_MODE: booleanFlag(true),
  LIVE_RUNS_ENABLED: booleanFlag(false),
  DAILY_LIVE_RUN_BUDGET_USD: z.coerce.number().positive().default(15),
  SENTRY_DSN: optionalUrl,
};

export const webClientShape = {
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.url().default("https://eu.i.posthog.com"),
};

type ConditionalFields = {
  STORAGE_DRIVER?: string;
  RATE_LIMIT_DRIVER?: string;
  [key: string]: unknown;
};

const R2_VARS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];
const UPSTASH_VARS = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];

/** Driver-dependent requirements that a flat shape can't express. */
export function refineWebEnv(env: ConditionalFields, ctx: z.RefinementCtx): void {
  const requireAll = (vars: string[], reason: string) => {
    for (const name of vars) {
      if (!env[name]) ctx.addIssue({ code: "custom", path: [name], message: `required ${reason}` });
    }
  };
  if (env.STORAGE_DRIVER === "r2") requireAll(R2_VARS, "when STORAGE_DRIVER=r2");
  if (env.RATE_LIMIT_DRIVER === "upstash")
    requireAll(UPSTASH_VARS, "when RATE_LIMIT_DRIVER=upstash");
}

export const webEnvSchema = z
  .object({ ...webServerShape, ...webClientShape })
  .superRefine(refineWebEnv);

export type WebEnv = z.output<typeof webEnvSchema>;

/**
 * Vercel gives every preview its own URL, so a fixed APP_URL can't match. On previews only,
 * an unset APP_URL falls back to the branch URL (stable across pushes to one branch).
 * Production always needs APP_URL set explicitly.
 */
export function previewAppUrl(source: Record<string, string | undefined>): string | undefined {
  if (source.APP_URL || source.VERCEL_ENV !== "preview") return undefined;
  const host = source.VERCEL_BRANCH_URL || source.VERCEL_URL;
  return host ? `https://${host}` : undefined;
}

export function parseWebEnv(source: Record<string, string | undefined>): WebEnv {
  return parseEnv(webEnvSchema, source, "web");
}
