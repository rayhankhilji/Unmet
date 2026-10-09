import { customType, timestamp, uuid, vector } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const EMBEDDING_DIMENSIONS = 1536;

/** Time-ordered UUID generated in the app (ARCHITECTURE §4.1). */
export const id = () =>
  uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7());

export const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();

/** Set explicitly by repositories when a row mutates; no triggers. */
export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();

export const embedding = (name: string) => vector(name, { dimensions: EMBEDDING_DIMENSIONS });

export const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});
