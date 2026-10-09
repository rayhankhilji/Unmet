import { loadLocalEnv } from "@unmet/shared/node";
import { runMigrations } from "../migrate.ts";
import {
  databaseUrl,
  dropWorkerDatabases,
  TEMPLATE_DATABASE,
  withAdminClient,
} from "./databases.ts";

/**
 * Builds one migrated template database per test run. Each Vitest worker then clones it
 * (see setup.ts), and every test runs inside a rolled-back transaction (withTestTx).
 */
export async function setup(): Promise<void> {
  loadLocalEnv({ env: "test" });
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) throw new Error("Missing environment variable DATABASE_URL for tests");

  await withAdminClient(baseUrl, async (client) => {
    await dropWorkerDatabases(client);
    await client.query(`drop database if exists "${TEMPLATE_DATABASE}" with (force)`);
    await client.query(`create database "${TEMPLATE_DATABASE}"`);
  });
  await runMigrations(databaseUrl(baseUrl, TEMPLATE_DATABASE));
}

export async function teardown(): Promise<void> {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) return;
  await withAdminClient(baseUrl, dropWorkerDatabases);
}
