import * as shared from "@unmet/shared";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { withTestTx } from "../src/testing/index.ts";

// Written from ARCHITECTURE §4.3–§4.4, not from the Drizzle schema, so the test catches
// drift between the documented model and what the migrations create.
const DOCUMENTED_TABLES = [
  "brand",
  "brand_fit",
  "catalog_product",
  "claim",
  "claim_evidence",
  "comment",
  "creator",
  "demand_test",
  "eval_case_result",
  "eval_run",
  "finding",
  "investigation",
  "keyframe",
  "ledger_outcome",
  "need",
  "need_signal",
  "run_event",
  "signal",
  "signal_evidence",
  "stat_snapshot",
  "transcript_segment",
  "video",
];

const DOCUMENTED_ENUMS: Record<string, readonly string[]> = {
  platform: shared.PLATFORMS,
  follower_tier: shared.FOLLOWER_TIERS,
  ingest_status: shared.INGEST_STATUSES,
  extract_status: shared.EXTRACT_STATUSES,
  signal_type: shared.SIGNAL_TYPES,
  stance: shared.STANCES,
  sponsored: shared.SPONSORED,
  evidence_source: shared.EVIDENCE_SOURCES,
  run_kind: shared.RUN_KINDS,
  run_status: shared.RUN_STATUSES,
  run_origin: shared.RUN_ORIGINS,
  visibility: shared.VISIBILITIES,
  event_type: shared.EVENT_TYPES,
  verdict: shared.VERDICTS,
  claim_kind: shared.CLAIM_KINDS,
  fit_rating: shared.FIT_RATINGS,
  test_type: shared.TEST_TYPES,
  cost_band: shared.COST_BANDS,
  outcome: shared.OUTCOMES,
  eval_suite: shared.EVAL_SUITES,
  system_under_test: shared.SYSTEMS_UNDER_TEST,
};

describe("migrated schema", () => {
  it("creates every documented table and nothing else", async () => {
    const tables = await withTestTx(async (tx) => {
      const res = await tx.execute<{ table_name: string }>(sql`
        select table_name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'
          and table_name not like '__drizzle%'
        order by table_name`);
      return res.rows.map((r) => r.table_name);
    });
    expect(tables).toEqual(DOCUMENTED_TABLES);
  });

  it("creates every documented enum with its values in order", async () => {
    const enums = await withTestTx(async (tx) => {
      const res = await tx.execute<{ name: string; values: string[] }>(sql`
        select t.typname as name, array_agg(e.enumlabel::text order by e.enumsortorder)::text[] as values
        from pg_type t join pg_enum e on e.enumtypid = t.oid
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'public'
        group by t.typname`);
      return Object.fromEntries(res.rows.map((r) => [r.name, r.values]));
    });
    expect(enums).toEqual(
      Object.fromEntries(Object.entries(DOCUMENTED_ENUMS).map(([k, v]) => [k, [...v]])),
    );
  });

  it("installs pgvector and the documented search indexes", async () => {
    const result = await withTestTx(async (tx) => {
      const ext = await tx.execute(sql`select 1 from pg_extension where extname = 'vector'`);
      const idx = await tx.execute<{ indexname: string; indexdef: string }>(sql`
        select indexname, indexdef from pg_indexes where schemaname = 'public'`);
      return { hasVector: ext.rows.length === 1, indexes: idx.rows };
    });
    expect(result.hasVector).toBe(true);
    const def = (name: string) => result.indexes.find((i) => i.indexname === name)?.indexdef ?? "";
    expect(def("signal_embedding_hnsw_idx")).toMatch(/USING hnsw \(embedding vector_cosine_ops\)/);
    expect(def("signal_embedding_hnsw_idx")).toMatch(/m='16'.*ef_construction='64'/);
    expect(def("signal_tsv_idx")).toMatch(/USING gin \(tsv\)/);
    expect(def("transcript_segment_tsv_idx")).toMatch(/USING gin \(tsv\)/);
    expect(def("investigation_status_created_at_idx")).toMatch(/\(status, created_at\)/);
    expect(def("investigation_visibility_finished_at_idx")).toMatch(
      /\(visibility, finished_at DESC/,
    );
    expect(def("video_corpus_posted_at_idx")).toMatch(/\(corpus_id, posted_at\)/);
    expect(def("run_event_investigation_seq_unique")).toMatch(/\(investigation_id, seq\)/);
  });
});
