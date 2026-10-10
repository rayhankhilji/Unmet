import { sql } from "drizzle-orm";
import type { Queryable } from "../context.ts";

export async function ping(db: Queryable): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
