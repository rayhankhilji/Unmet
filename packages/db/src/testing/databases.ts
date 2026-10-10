import pg from "pg";

export const TEMPLATE_DATABASE = "unmet_test_template";
const WORKER_PREFIX = "unmet_test_w";

export function workerDatabaseName(poolId: string | undefined): string {
  return `${WORKER_PREFIX}${poolId ?? "1"}`;
}

export function databaseUrl(baseUrl: string, database: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

/** Runs statements against the server's maintenance database (CREATE/DROP DATABASE). */
export async function withAdminClient<T>(
  baseUrl: string,
  fn: (client: pg.Client) => Promise<T>,
): Promise<T> {
  const client = new pg.Client({ connectionString: databaseUrl(baseUrl, "postgres") });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function dropWorkerDatabases(client: pg.Client): Promise<void> {
  const { rows } = await client.query<{ datname: string }>(
    "select datname from pg_database where datname like $1",
    [`${WORKER_PREFIX}%`],
  );
  for (const { datname } of rows) {
    await client.query(`drop database if exists "${datname}" with (force)`);
  }
}

export async function databaseExists(client: pg.Client, name: string): Promise<boolean> {
  const { rowCount } = await client.query("select 1 from pg_database where datname = $1", [name]);
  return (rowCount ?? 0) > 0;
}
