import { loadLocalEnv } from "@unmet/shared/node";
import { defineConfig } from "drizzle-kit";

loadLocalEnv();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: false,
});
