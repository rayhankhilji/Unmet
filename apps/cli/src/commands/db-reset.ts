import { runMigrations } from "@unmet/db/migrate";
import pg from "pg";
import type { CliBaseEnv } from "../env.ts";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "db"]);

export function isLocalDatabase(url: string): boolean {
  return LOCAL_HOSTS.has(new URL(url).hostname);
}

/**
 * Drops and recreates the schema, then migrates. Destructive, so it refuses any database
 * that isn't on this machine unless --allow-remote is passed (INSTRUCTIONS §12).
 */
export async function dbReset(env: CliBaseEnv, opts: { allowRemote: boolean }): Promise<void> {
  const url = env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL;
  if (!isLocalDatabase(url) && !opts.allowRemote) {
    throw new Error(
      `Refusing to reset non-local database ${new URL(url).hostname}. Pass --allow-remote if you mean it.`,
    );
  }
  await ensureDatabase(url);
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("drop schema if exists public cascade");
    await client.query("drop schema if exists drizzle cascade");
    await client.query("create schema public");
  } finally {
    await client.end();
  }
  await runMigrations(url);
}

async function ensureDatabase(url: string): Promise<void> {
  const target = new URL(url);
  const name = decodeURIComponent(target.pathname.slice(1));
  const admin = new URL(url);
  admin.pathname = "/postgres";
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query("select 1 from pg_database where datname = $1", [name]);
    if (!rowCount) await client.query(`create database "${name.replaceAll('"', '""')}"`);
  } finally {
    await client.end();
  }
}
