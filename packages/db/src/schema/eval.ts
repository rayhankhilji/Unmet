import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { id } from "./columns.ts";
import { evalSuite, systemUnderTest } from "./enums.ts";
import { investigation } from "./investigation.ts";

export const evalRun = pgTable("eval_run", {
  id: id(),
  suite: evalSuite("suite").notNull(),
  gitSha: text("git_sha").notNull(),
  modelIds: jsonb("model_ids").$type<Record<string, string>>().notNull(),
  promptVersions: jsonb("prompt_versions").$type<Record<string, string>>().notNull(),
  formulaVersion: text("formula_version").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  metrics: jsonb("metrics").$type<Record<string, unknown>>().notNull(),
  thresholds: jsonb("thresholds").$type<Record<string, unknown>>().notNull(),
  passed: boolean("passed").notNull(),
  notes: text("notes").notNull().default(""),
});

export const evalCaseResult = pgTable(
  "eval_case_result",
  {
    id: id(),
    evalRunId: uuid("eval_run_id")
      .notNull()
      .references(() => evalRun.id, { onDelete: "cascade" }),
    caseId: text("case_id").notNull(),
    system: systemUnderTest("system").notNull(),
    investigationId: uuid("investigation_id").references(() => investigation.id),
    passed: boolean("passed").notNull(),
    expected: jsonb("expected").$type<Record<string, unknown>>().notNull(),
    actual: jsonb("actual").$type<Record<string, unknown>>().notNull(),
    scores: jsonb("scores").$type<Record<string, unknown>>().notNull(),
    failureReason: text("failure_reason"),
  },
  (t) => [index("eval_case_result_eval_run_id_idx").on(t.evalRunId)],
);
