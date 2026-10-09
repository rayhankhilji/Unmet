import { z } from "zod";

// One list per enum. Postgres enums in packages/db are built from these same tuples,
// so the database and the API can never disagree (ARCHITECTURE §4.3).

export const PLATFORMS = ["tiktok", "youtube_shorts", "instagram_reels", "synthetic"] as const;
export const FOLLOWER_TIERS = ["nano", "micro", "mid", "macro"] as const;
export const INGEST_STATUSES = [
  "pending",
  "transcribing",
  "framing",
  "describing",
  "complete",
  "failed",
  "excluded",
] as const;
export const EXTRACT_STATUSES = ["pending", "extracting", "complete", "failed", "skipped"] as const;
export const SIGNAL_TYPES = ["complaint", "wish", "workaround", "dupe_hunt"] as const;
export const STANCES = ["sincere", "sarcastic", "unclear"] as const;
export const SPONSORED = ["disclosed", "suspected", "none"] as const;
export const EVIDENCE_SOURCES = ["transcript", "caption", "frame", "comment"] as const;
export const RUN_KINDS = ["agent", "baseline"] as const;
export const RUN_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
  "budget_exceeded",
] as const;
export const RUN_ORIGINS = ["owner", "live_demo", "eval"] as const;
export const VISIBILITIES = ["private", "published"] as const;
export const EVENT_TYPES = [
  "status",
  "model_call",
  "tool_call",
  "tool_result",
  "finding_recorded",
  "error",
  "note",
] as const;
export const VERDICTS = ["strong", "emerging", "weak", "rejected"] as const;
export const CLAIM_KINDS = ["support", "counter", "fit", "uncertainty"] as const;
export const FIT_RATINGS = ["strong", "moderate", "poor"] as const;
export const TEST_TYPES = [
  "content_concept_test",
  "creator_seeding",
  "waitlist_landing",
  "commenter_survey",
  "concept_ad_test",
] as const;
export const COST_BANDS = ["under_500", "500_2k", "2k_10k"] as const;
export const OUTCOMES = ["confirmed", "refuted", "inconclusive"] as const;
export const EVAL_SUITES = ["extraction", "traps", "backtest", "comparison"] as const;
export const SYSTEMS_UNDER_TEST = ["unmet", "baseline"] as const;

export const Platform = z.enum(PLATFORMS);
export const FollowerTier = z.enum(FOLLOWER_TIERS);
export const IngestStatus = z.enum(INGEST_STATUSES);
export const ExtractStatus = z.enum(EXTRACT_STATUSES);
export const SignalType = z.enum(SIGNAL_TYPES);
export const Stance = z.enum(STANCES);
export const Sponsored = z.enum(SPONSORED);
export const EvidenceSource = z.enum(EVIDENCE_SOURCES);
export const RunKind = z.enum(RUN_KINDS);
export const RunStatus = z.enum(RUN_STATUSES);
export const RunOrigin = z.enum(RUN_ORIGINS);
export const Visibility = z.enum(VISIBILITIES);
export const EventType = z.enum(EVENT_TYPES);
export const Verdict = z.enum(VERDICTS);
export const ClaimKind = z.enum(CLAIM_KINDS);
export const FitRating = z.enum(FIT_RATINGS);
export const TestType = z.enum(TEST_TYPES);
export const CostBand = z.enum(COST_BANDS);
export const Outcome = z.enum(OUTCOMES);
export const EvalSuite = z.enum(EVAL_SUITES);
export const SystemUnderTest = z.enum(SYSTEMS_UNDER_TEST);

export type Platform = z.infer<typeof Platform>;
export type FollowerTier = z.infer<typeof FollowerTier>;
export type IngestStatus = z.infer<typeof IngestStatus>;
export type ExtractStatus = z.infer<typeof ExtractStatus>;
export type SignalType = z.infer<typeof SignalType>;
export type Stance = z.infer<typeof Stance>;
export type Sponsored = z.infer<typeof Sponsored>;
export type EvidenceSource = z.infer<typeof EvidenceSource>;
export type RunKind = z.infer<typeof RunKind>;
export type RunStatus = z.infer<typeof RunStatus>;
export type RunOrigin = z.infer<typeof RunOrigin>;
export type Visibility = z.infer<typeof Visibility>;
export type EventType = z.infer<typeof EventType>;
export type Verdict = z.infer<typeof Verdict>;
export type ClaimKind = z.infer<typeof ClaimKind>;
export type FitRating = z.infer<typeof FitRating>;
export type TestType = z.infer<typeof TestType>;
export type CostBand = z.infer<typeof CostBand>;
export type Outcome = z.infer<typeof Outcome>;
export type EvalSuite = z.infer<typeof EvalSuite>;
export type SystemUnderTest = z.infer<typeof SystemUnderTest>;

/** Follower tiers by count at collection time: nano < 10k ≤ micro < 100k ≤ mid ≤ 1M < macro. */
export function followerTierFor(followerCount: number): FollowerTier {
  if (followerCount < 10_000) return "nano";
  if (followerCount < 100_000) return "micro";
  if (followerCount <= 1_000_000) return "mid";
  return "macro";
}

export const RUN_TERMINAL_STATUSES: readonly RunStatus[] = [
  "completed",
  "failed",
  "cancelled",
  "budget_exceeded",
];
