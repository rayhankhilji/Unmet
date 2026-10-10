import type pg from "pg";

// Guards for the db_query tool. The parse check gives a clear message; the READ ONLY
// transaction is what actually guarantees nothing is written.

export const MAX_ROWS = 200;
export const STATEMENT_TIMEOUT_MS = 5_000;

const ALLOWED_START = /^(select|with|explain|table|values|show)\b/i;

export function stripSqlComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
}

export function checkReadOnlySql(
  sql: string,
): { ok: true; sql: string } | { ok: false; reason: string } {
  const cleaned = stripSqlComments(sql).replace(/;\s*$/, "");
  if (cleaned.length === 0) return { ok: false, reason: "Empty query." };
  if (cleaned.includes(";")) return { ok: false, reason: "One statement per call." };
  if (!ALLOWED_START.test(cleaned)) {
    return {
      ok: false,
      reason: "Only SELECT, WITH, EXPLAIN, TABLE, VALUES or SHOW queries are allowed.",
    };
  }
  return { ok: true, sql: cleaned };
}

export type QueryResult = { rows: Record<string, unknown>[]; rowCount: number; truncated: boolean };

export async function runReadOnly(
  pool: pg.Pool,
  sql: string,
  params: unknown[] = [],
): Promise<QueryResult> {
  const client = await pool.connect();
  try {
    await client.query("begin read only");
    await client.query(`set local statement_timeout = ${STATEMENT_TIMEOUT_MS}`);
    const res = await client.query(sql, params);
    const rows = res.rows as Record<string, unknown>[];
    return {
      rows: rows.slice(0, MAX_ROWS),
      rowCount: rows.length,
      truncated: rows.length > MAX_ROWS,
    };
  } finally {
    await client.query("rollback").catch(() => undefined);
    client.release();
  }
}
