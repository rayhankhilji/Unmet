import { loadLocalEnv } from "@unmet/shared/node";
import { afterAll } from "vitest";
import {
  databaseExists,
  databaseUrl,
  TEMPLATE_DATABASE,
  withAdminClient,
  workerDatabaseName,
} from "./databases.ts";
import { closeTestDb } from "./tx.ts";

loadLocalEnv({ env: "test" });
const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) throw new Error("Missing environment variable DATABASE_URL for tests");

const name = workerDatabaseName(process.env.VITEST_POOL_ID);
await withAdminClient(baseUrl, async (client) => {
  if (!(await databaseExists(client, name))) {
    await client.query(`create database "${name}" template "${TEMPLATE_DATABASE}"`);
  }
});

process.env.DATABASE_URL = databaseUrl(baseUrl, name);
process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL;

afterAll(closeTestDb);
