import { fileURLToPath } from "node:url";
import { loadLocalEnv } from "@unmet/shared/node";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "./client.ts";

export const MIGRATIONS_FOLDER = fileURLToPath(new URL("../migrations", import.meta.url));

export async function runMigrations(connectionString: string): Promise<void> {
  const handle = createDb(connectionString, { max: 1 });
  try {
    await migrate(handle.db, { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await handle.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const envFlag = process.argv.indexOf("--env");
  loadLocalEnv({ env: envFlag > -1 ? process.argv[envFlag + 1] : undefined });
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Missing environment variable DATABASE_URL_UNPOOLED or DATABASE_URL");
  await runMigrations(url);
  process.stdout.write("Migrations applied.\n");
}
