import {
  CLAIM_KINDS,
  COST_BANDS,
  EVAL_SUITES,
  EVENT_TYPES,
  EVIDENCE_SOURCES,
  EXTRACT_STATUSES,
  FIT_RATINGS,
  FOLLOWER_TIERS,
  INGEST_STATUSES,
  OUTCOMES,
  PLATFORMS,
  RUN_KINDS,
  RUN_ORIGINS,
  RUN_STATUSES,
  SIGNAL_TYPES,
  SPONSORED,
  STANCES,
  SYSTEMS_UNDER_TEST,
  TEST_TYPES,
  VERDICTS,
  VISIBILITIES,
} from "@unmet/shared";
import { pgEnum } from "drizzle-orm/pg-core";

export const platform = pgEnum("platform", PLATFORMS);
export const followerTier = pgEnum("follower_tier", FOLLOWER_TIERS);
export const ingestStatus = pgEnum("ingest_status", INGEST_STATUSES);
export const extractStatus = pgEnum("extract_status", EXTRACT_STATUSES);
export const signalType = pgEnum("signal_type", SIGNAL_TYPES);
export const stance = pgEnum("stance", STANCES);
export const sponsored = pgEnum("sponsored", SPONSORED);
export const evidenceSource = pgEnum("evidence_source", EVIDENCE_SOURCES);
export const runKind = pgEnum("run_kind", RUN_KINDS);
export const runStatus = pgEnum("run_status", RUN_STATUSES);
export const runOrigin = pgEnum("run_origin", RUN_ORIGINS);
export const visibility = pgEnum("visibility", VISIBILITIES);
export const eventType = pgEnum("event_type", EVENT_TYPES);
export const verdict = pgEnum("verdict", VERDICTS);
export const claimKind = pgEnum("claim_kind", CLAIM_KINDS);
export const fitRating = pgEnum("fit_rating", FIT_RATINGS);
export const testType = pgEnum("test_type", TEST_TYPES);
export const costBand = pgEnum("cost_band", COST_BANDS);
export const outcome = pgEnum("outcome", OUTCOMES);
export const evalSuite = pgEnum("eval_suite", EVAL_SUITES);
export const systemUnderTest = pgEnum("system_under_test", SYSTEMS_UNDER_TEST);
