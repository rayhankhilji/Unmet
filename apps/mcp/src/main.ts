import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { isLocalDatabaseUrl, loadLocalEnv } from "@unmet/shared/node";
import pg from "pg";
import { z } from "zod";
import { checkReadOnlySql, MAX_ROWS, runReadOnly } from "./readonly-sql.ts";

// A read-only window onto the local Unmet database for coding agents (Claude Code, Cursor,
// Codex…). stdout carries the MCP protocol, so diagnostics go to stderr only.
// Refuses non-local databases unless UNMET_MCP_ALLOW_REMOTE=1: the corpus holds creator
// content, and query results are sent to whichever model the agent uses.

loadLocalEnv();
const url = process.env.DATABASE_URL;
if (!url) throw new Error("Missing environment variable DATABASE_URL");
if (!isLocalDatabaseUrl(url) && process.env.UNMET_MCP_ALLOW_REMOTE !== "1") {
  throw new Error(
    `Refusing non-local database ${new URL(url).hostname}; set UNMET_MCP_ALLOW_REMOTE=1 to override.`,
  );
}

const pool = new pg.Pool({ connectionString: url, max: 2 });
const server = new McpServer({ name: "unmet", version: "0.1.0" });

const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});
const failure = (message: string) => ({
  content: [{ type: "text" as const, text: message }],
  isError: true,
});

server.registerTool(
  "db_query",
  {
    title: "Read-only SQL",
    description: `Run one read-only SQL statement (SELECT/WITH/EXPLAIN) against the local Unmet database. Runs inside a READ ONLY transaction with a 5 s timeout; returns at most ${MAX_ROWS} rows. Schema: ARCHITECTURE.md §4.`,
    inputSchema: { sql: z.string().min(1).describe("A single read-only SQL statement") },
  },
  async ({ sql }) => {
    const check = checkReadOnlySql(sql);
    if (!check.ok) return failure(check.reason);
    try {
      return text(await runReadOnly(pool, check.sql));
    } catch (error) {
      return failure(error instanceof Error ? error.message : String(error));
    }
  },
);

server.registerTool(
  "describe_table",
  {
    title: "Describe a table",
    description: "Columns, types, nullability and defaults for one table in the public schema.",
    inputSchema: { table: z.string().regex(/^[a-z_]+$/) },
  },
  async ({ table }) =>
    text(
      await runReadOnly(
        pool,
        `select column_name, data_type, udt_name, is_nullable, column_default
         from information_schema.columns where table_schema = 'public' and table_name = $1
         order by ordinal_position`,
        [table],
      ),
    ),
);

server.registerTool(
  "list_investigations",
  {
    title: "List investigations",
    description: "Recent investigations with status, visibility, as_of, cost and finding count.",
    inputSchema: { limit: z.number().int().min(1).max(50).default(20) },
  },
  async ({ limit }) =>
    text(
      await runReadOnly(
        pool,
        `select i.id, i.status, i.visibility, i.as_of, i.cost_usd, i.iterations, i.error_code,
                (select count(*) from finding f where f.investigation_id = i.id) as findings
         from investigation i order by i.created_at desc limit $1`,
        [limit],
      ),
    ),
);

server.registerTool(
  "run_trace",
  {
    title: "Run trace",
    description:
      "The ordered event log of one investigation: type, tool, title, tokens, cost and latency. Payloads are omitted unless include_payloads is true.",
    inputSchema: { investigation_id: z.uuid(), include_payloads: z.boolean().default(false) },
  },
  async ({ investigation_id, include_payloads }) =>
    text(
      await runReadOnly(
        pool,
        `select seq, type, tool_name, title, input_tokens, output_tokens, cost_usd, latency_ms
                ${include_payloads ? ", payload" : ""}
         from run_event where investigation_id = $1 order by seq`,
        [investigation_id],
      ),
    ),
);

await server.connect(new StdioServerTransport());
process.stderr.write(`unmet MCP server ready (${new URL(url).hostname})\n`);
