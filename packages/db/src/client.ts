import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.ts";

export type Schema = typeof schema;
export type Db = NodePgDatabase<Schema>;

export type DbHandle = { db: Db; pool: pg.Pool; close: () => Promise<void> };

/**
 * One driver everywhere (node-postgres): Docker locally, Neon's pooled endpoint in
 * production. See TASK_LOG → Decisions for why the web app doesn't use the Neon
 * serverless driver.
 */
export function createDb(connectionString: string, options: { max?: number } = {}): DbHandle {
  const pool = new pg.Pool({
    connectionString,
    max: options.max ?? 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
  });
  const db = drizzle({ client: pool, schema, casing: undefined });
  return { db, pool, close: () => pool.end() };
}
