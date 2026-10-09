import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { brand } from "./brand.ts";
import { createdAt, embedding, id, updatedAt } from "./columns.ts";
import { signal, signalEvidence } from "./corpus.ts";
import {
  claimKind,
  costBand,
  eventType,
  fitRating,
  outcome,
  runKind,
  runOrigin,
  runStatus,
  testType,
  verdict,
  visibility,
} from "./enums.ts";

const money = (name: string) =>
  numeric(name, { precision: 10, scale: 4, mode: "number" }).notNull().default(0);

export const investigation = pgTable(
  "investigation",
  {
    id: id(),
    kind: runKind("kind").notNull(),
    origin: runOrigin("origin").notNull(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brand.id),
    question: text("question").notNull(),
    asOf: timestamp("as_of", { withTimezone: true }).notNull(),
    corpusId: text("corpus_id").notNull().default("main"),
    status: runStatus("status").notNull().default("queued"),
    visibility: visibility("visibility").notNull().default("private"),
    requesterIpHash: text("requester_ip_hash"),
    claimedBy: text("claimed_by"),
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    modelIds: jsonb("model_ids")
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    promptVersions: jsonb("prompt_versions")
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    formulaVersion: text("formula_version").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costUsd: money("cost_usd"),
    iterations: smallint("iterations").notNull().default(0),
    errorCode: text("error_code"),
    summary: text("summary"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("investigation_status_idx").on(t.status),
    index("investigation_status_created_at_idx").on(t.status, t.createdAt),
    index("investigation_visibility_finished_at_idx").on(t.visibility, t.finishedAt.desc()),
    check("investigation_question_length", sql`char_length(${t.question}) between 10 and 500`),
  ],
);

export const runEvent = pgTable(
  "run_event",
  {
    id: id(),
    investigationId: uuid("investigation_id")
      .notNull()
      .references(() => investigation.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    type: eventType("type").notNull(),
    toolName: text("tool_name"),
    title: text("title").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costUsd: money("cost_usd"),
    latencyMs: integer("latency_ms").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    unique("run_event_investigation_seq_unique").on(t.investigationId, t.seq),
    check("run_event_seq_positive", sql`${t.seq} >= 1`),
  ],
);

export const need = pgTable(
  "need",
  {
    id: id(),
    investigationId: uuid("investigation_id")
      .notNull()
      .references(() => investigation.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    description: text("description").notNull(),
    centroid: embedding("centroid").notNull(),
    signalCount: integer("signal_count").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("need_investigation_id_idx").on(t.investigationId),
    check("need_label_length", sql`char_length(${t.label}) <= 80`),
  ],
);

export const needSignal = pgTable(
  "need_signal",
  {
    needId: uuid("need_id")
      .notNull()
      .references(() => need.id, { onDelete: "cascade" }),
    signalId: uuid("signal_id")
      .notNull()
      .references(() => signal.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ name: "need_signal_pk", columns: [t.needId, t.signalId] })],
);

export const statSnapshot = pgTable(
  "stat_snapshot",
  {
    id: id(),
    needId: uuid("need_id")
      .notNull()
      .references(() => need.id, { onDelete: "cascade" }),
    asOf: timestamp("as_of", { withTimezone: true }).notNull(),
    windowDays: smallint("window_days").notNull().default(90),
    formulaVersion: text("formula_version").notNull(),
    stats: jsonb("stats").$type<Record<string, unknown>>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("stat_snapshot_need_id_idx").on(t.needId)],
);

export const finding = pgTable(
  "finding",
  {
    id: id(),
    investigationId: uuid("investigation_id")
      .notNull()
      .references(() => investigation.id, { onDelete: "cascade" }),
    needId: uuid("need_id")
      .notNull()
      .unique("finding_need_id_unique")
      .references(() => need.id),
    verdict: verdict("verdict").notNull(),
    agentVerdict: verdict("agent_verdict").notNull(),
    cappedBy: text("capped_by").array().notNull().default(sql`'{}'::text[]`),
    overrideReason: text("override_reason"),
    confidence: real("confidence").notNull(),
    summary: text("summary").notNull(),
    uncertainties: text("uncertainties").array().notNull(),
    alternativeExplanations: text("alternative_explanations").array().notNull(),
    scepticChecked: boolean("sceptic_checked").notNull(),
    rank: smallint("rank").notNull(),
  },
  (t) => [
    index("finding_investigation_id_idx").on(t.investigationId),
    check("finding_summary_length", sql`char_length(${t.summary}) <= 600`),
    check("finding_confidence_range", sql`${t.confidence} >= 0 and ${t.confidence} <= 1`),
    check("finding_rank_positive", sql`${t.rank} >= 1`),
    check(
      "finding_uncertainty_required",
      sql`${t.verdict} = 'rejected' or (cardinality(${t.uncertainties}) >= 1 and cardinality(${t.alternativeExplanations}) >= 1)`,
    ),
  ],
);

export const claim = pgTable(
  "claim",
  {
    id: id(),
    findingId: uuid("finding_id")
      .notNull()
      .references(() => finding.id, { onDelete: "cascade" }),
    kind: claimKind("kind").notNull(),
    text: text("text").notNull(),
    statSnapshotId: uuid("stat_snapshot_id").references(() => statSnapshot.id),
    ordinal: smallint("ordinal").notNull(),
  },
  (t) => [
    index("claim_finding_id_idx").on(t.findingId),
    check("claim_text_length", sql`char_length(${t.text}) <= 300`),
    // A claim that states a number must point at the snapshot that holds it (ADR-003).
    check(
      "claim_number_needs_snapshot",
      sql`${t.text} !~ '[0-9]' or ${t.statSnapshotId} is not null`,
    ),
  ],
);

export const claimEvidence = pgTable(
  "claim_evidence",
  {
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claim.id, { onDelete: "cascade" }),
    signalEvidenceId: uuid("signal_evidence_id")
      .notNull()
      .references(() => signalEvidence.id),
  },
  (t) => [primaryKey({ name: "claim_evidence_pk", columns: [t.claimId, t.signalEvidenceId] })],
);

export type FitScore = { score: number; reason: string };
export type FitScores = {
  categoryAdjacency: FitScore;
  ingredientExpertise: FitScore;
  positioning: FitScore;
  coverageGap: FitScore;
};

export const brandFit = pgTable("brand_fit", {
  id: id(),
  findingId: uuid("finding_id")
    .notNull()
    .unique("brand_fit_finding_id_unique")
    .references(() => finding.id, { onDelete: "cascade" }),
  scores: jsonb("scores").$type<FitScores>().notNull(),
  existingCoverage: uuid("existing_coverage").array().notNull().default(sql`'{}'::uuid[]`),
  rating: fitRating("rating").notNull(),
  createdAt: createdAt(),
});

export const demandTest = pgTable(
  "demand_test",
  {
    id: id(),
    findingId: uuid("finding_id")
      .notNull()
      .unique("demand_test_finding_id_unique")
      .references(() => finding.id, { onDelete: "cascade" }),
    testType: testType("test_type").notNull(),
    hypothesis: text("hypothesis").notNull(),
    audience: text("audience").notNull(),
    activation: text("activation").notNull(),
    primaryMetric: text("primary_metric").notNull(),
    successThreshold: text("success_threshold").notNull(),
    stopCondition: text("stop_condition").notNull(),
    durationDays: smallint("duration_days").notNull(),
    costBand: costBand("cost_band").notNull(),
    predictedProbability: real("predicted_probability").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    check("demand_test_hypothesis_length", sql`char_length(${t.hypothesis}) <= 300`),
    check("demand_test_audience_length", sql`char_length(${t.audience}) <= 200`),
    check("demand_test_activation_length", sql`char_length(${t.activation}) <= 500`),
    check("demand_test_threshold_has_number", sql`${t.successThreshold} ~ '[0-9]'`),
    check("demand_test_duration_range", sql`${t.durationDays} between 3 and 60`),
    check(
      "demand_test_probability_range",
      sql`${t.predictedProbability} >= 0.05 and ${t.predictedProbability} <= 0.95`,
    ),
  ],
);

export const ledgerOutcome = pgTable("ledger_outcome", {
  id: id(),
  demandTestId: uuid("demand_test_id")
    .notNull()
    .unique("ledger_outcome_demand_test_id_unique")
    .references(() => demandTest.id, { onDelete: "cascade" }),
  outcome: outcome("outcome").notNull(),
  observedValue: text("observed_value").notNull(),
  notes: text("notes").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});
