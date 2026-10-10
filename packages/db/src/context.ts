import { AsyncLocalStorage } from "node:async_hooks";
import type { Db } from "./client.ts";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** Anything that can run queries: the pool-backed database or an open transaction. */
export type Queryable = Db | Tx;

const override = new AsyncLocalStorage<Queryable>();

/** Runs `fn` with every `resolveDb()` call inside it returning `db` (tests only). */
export function withDbOverride<T>(db: Queryable, fn: () => Promise<T>): Promise<T> {
  return override.run(db, fn);
}

export function resolveDb(fallback: () => Queryable): Queryable {
  return override.getStore() ?? fallback();
}
