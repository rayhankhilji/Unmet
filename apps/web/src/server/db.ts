import { createDb, type DbHandle, type Queryable, resolveDb } from "@unmet/db";
import { env } from "./env";

let handle: DbHandle | null = null;

/** The app's database. Tests that wrap a call in withTestTx get their transaction instead. */
export function getDb(): Queryable {
  return resolveDb(() => {
    handle ??= createDb(env.DATABASE_URL, { max: 5 });
    return handle.db;
  });
}
