import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

export type LoadEnvOptions = {
  /** `undefined` → .env.local; `"test"` → .env.test; `"e2e"` → .env.test pointed at unmet_e2e. */
  env?: string | undefined;
  /** Repository root; defaults to walking up from the current directory. */
  root?: string;
};

/**
 * Loads env files for local processes. Variables already in the environment always win
 * (Vercel, Railway and CI set them directly). When the named file is missing, the
 * committed `*.example` file is used so a clean clone runs without setup.
 */
export function loadLocalEnv(options: LoadEnvOptions = {}): string | null {
  // Hosted platforms inject real values; never let a committed example fill a gap there.
  if (process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT) return null;
  const root = options.root ?? findRepoRoot(process.cwd());
  const base = options.env === undefined ? ".env.local" : ".env.test";
  const fallback = options.env === undefined ? ".env.example" : ".env.test.example";
  const file = [base, fallback].map((f) => resolve(root, f)).find((f) => existsSync(f)) ?? null;

  // Captured before loading so a file never overrides an explicitly set URL.
  const explicitUrl = process.env.DATABASE_URL;
  if (file) loadEnvFile(file);
  if (options.env === "e2e" && !explicitUrl) {
    process.env.DATABASE_URL = withDatabase(requireEnv("DATABASE_URL"), "unmet_e2e");
    process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL;
  }
  return file;
}

export function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

function findRepoRoot(start: string): string {
  let dir = start;
  while (!existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
    const parent = resolve(dir, "..");
    if (parent === dir) return start;
    dir = parent;
  }
  return dir;
}
