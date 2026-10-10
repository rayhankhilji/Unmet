import { ping } from "@unmet/db";
import { json } from "@unmet/shared";
import { getDb } from "@/server/db";
import { route } from "@/server/route";

export const dynamic = "force-dynamic";

/** Liveness plus a database round trip; 503 when the database is unreachable (F-13). */
export const GET = route(async () => {
  const db = await ping(getDb());
  return json({ ok: db, db }, { status: db ? 200 : 503 });
});
