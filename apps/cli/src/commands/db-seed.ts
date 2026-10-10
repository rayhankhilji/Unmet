import { createDb } from "@unmet/db";
import type { CliBaseEnv } from "../env.ts";
import { type SeedSummary, seed } from "../seed/seed.ts";

export async function dbSeed(
  env: CliBaseEnv,
  opts: { root: string; e2e: boolean },
): Promise<SeedSummary> {
  const handle = createDb(env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL, { max: 1 });
  try {
    return await seed(handle.db, opts);
  } finally {
    await handle.close();
  }
}
