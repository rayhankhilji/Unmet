import { z } from "zod";
import {
  ClaimKind,
  CostBand,
  EventType,
  FitRating,
  RunKind,
  RunOrigin,
  RunStatus,
  TestType,
  Verdict,
  Visibility,
} from "../enums.ts";
import { Iso, PageQuery } from "./common.ts";

export const CreateInvestigationInput = z.object({
  brandId: z.uuid(),
  question: z.string().trim().min(10).max(500),
  asOf: Iso.optional(), // default: latest video posted_at + 1 day
  mode: z.enum(["agent", "baseline"]).default("agent"),
});
export type CreateInvestigationInput = z.infer<typeof CreateInvestigationInput>;

export const UpdateInvestigationInput = z.object({ visibility: Visibility });
export type UpdateInvestigationInput = z.infer<typeof UpdateInvestigationInput>;

export const ListInvestigationsQuery = PageQuery.extend({ visibility: Visibility.optional() });
export type ListInvestigationsQuery = z.infer<typeof ListInvestigationsQuery>;

export const InvestigationSummary = z.object({
  id: z.uuid(),
  kind: RunKind,
  status: RunStatus,
  visibility: Visibility,
  brand: z.object({ id: z.uuid(), displayName: z.string() }),
  question: z.string(),
  asOf: Iso,
  startedAt: Iso.nullable(),
  finishedAt: Iso.nullable(),
  costUsd: z.number(),
  findingsCount: z.number().int(),
  errorCode: z.string().nullable(),
});
export type InvestigationSummary = z.infer<typeof InvestigationSummary>;

export const InvestigationDetail = InvestigationSummary.extend({
  origin: RunOrigin,
  corpusId: z.string(),
  summary: z.string().nullable(),
  iterations: z.number().int(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  modelIds: z.record(z.string(), z.string()),
  promptVersions: z.record(z.string(), z.string()),
  formulaVersion: z.string(),
  createdAt: Iso,
});
export type InvestigationDetail = z.infer<typeof InvestigationDetail>;

export const RunEventsQuery = z.object({
  afterSeq: z.coerce.number().int().min(0).default(0),
  detail: z.enum(["summary", "full"]).default("summary"),
});
export type RunEventsQuery = z.infer<typeof RunEventsQuery>;

export const RunEvent = z.object({
  id: z.uuid(),
  seq: z.number().int().positive(),
  type: EventType,
  toolName: z.string().nullable(),
  title: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(), // only with detail=full
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  costUsd: z.number(),
  latencyMs: z.number().int(),
  createdAt: Iso,
});
export type RunEvent = z.infer<typeof RunEvent>;

export const RunEventsResponse = z.object({
  items: z.array(RunEvent),
  status: RunStatus,
  lastSeq: z.number().int().min(0),
});
export type RunEventsResponse = z.infer<typeof RunEventsResponse>;

const FitScore = z.object({ score: z.number().int().min(1).max(5), reason: z.string() });

export const BrandFitDetail = z.object({
  rating: FitRating,
  scores: z.object({
    categoryAdjacency: FitScore,
    ingredientExpertise: FitScore,
    positioning: FitScore,
    coverageGap: FitScore,
  }),
  existingCoverage: z.array(z.object({ id: z.uuid(), name: z.string(), url: z.url() })),
});
export type BrandFitDetail = z.infer<typeof BrandFitDetail>;

export const DemandTestDetail = z.object({
  id: z.uuid(),
  testType: TestType,
  hypothesis: z.string(),
  audience: z.string(),
  activation: z.string(),
  primaryMetric: z.string(),
  successThreshold: z.string(),
  stopCondition: z.string(),
  durationDays: z.number().int(),
  costBand: CostBand,
  predictedProbability: z.number(),
});
export type DemandTestDetail = z.infer<typeof DemandTestDetail>;

export const ClaimDetail = z.object({
  id: z.uuid(),
  kind: ClaimKind,
  text: z.string(),
  statSnapshotId: z.uuid().nullable(),
  evidenceIds: z.array(z.uuid()),
});
export type ClaimDetail = z.infer<typeof ClaimDetail>;

export const FindingDetail = z.object({
  id: z.uuid(),
  rank: z.number().int().positive(),
  need: z.object({
    id: z.uuid(),
    label: z.string(),
    description: z.string(),
    signalCount: z.number().int(),
    snapshotId: z.uuid().nullable(),
  }),
  verdict: Verdict,
  agentVerdict: Verdict,
  cappedBy: z.array(z.string()),
  overrideReason: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  uncertainties: z.array(z.string()),
  alternativeExplanations: z.array(z.string()),
  scepticChecked: z.boolean(),
  claims: z.array(ClaimDetail),
  brandFit: BrandFitDetail.nullable(),
  demandTest: DemandTestDetail.nullable(),
});
export type FindingDetail = z.infer<typeof FindingDetail>;
