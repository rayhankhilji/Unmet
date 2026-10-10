import { AsyncLocalStorage } from "node:async_hooks";
import { TransactionRollbackError } from "drizzle-orm";
import { createDb, type DbHandle } from "../client.ts";
import { type Tx, withDbOverride } from "../context.ts";

let handle: DbHandle | null = null;
const current = new AsyncLocalStorage<Tx>();

export function testDb(): DbHandle {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("testDb() needs the integration project's setup file");
  handle ??= createDb(url, { max: 2 });
  return handle;
}

export async function closeTestDb(): Promise<void> {
  await handle?.close();
  handle = null;
}

/**
 * Runs `fn` in a transaction that is always rolled back. Factories and any code that
 * resolves the database through `resolveDb()` see the same transaction.
 */
export async function withTestTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  let result: { value: T } | null = null;
  try {
    await testDb().db.transaction(async (tx) => {
      result = { value: await current.run(tx, () => withDbOverride(tx, () => fn(tx))) };
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
  if (!result) throw new Error("withTestTx: callback did not complete");
  return (result as { value: T }).value;
}

/** The transaction opened by the enclosing `withTestTx`. */
export function currentTx(): Tx {
  const tx = current.getStore();
  if (!tx) throw new Error("Factories must run inside withTestTx()");
  return tx;
}
