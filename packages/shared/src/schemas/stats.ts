import { z } from "zod";
import { FOLLOWER_TIERS, SIGNAL_TYPES } from "../enums.ts";
import { Iso } from "./common.ts";

export const STAT_FLAGS = [
  "CONCENTRATED",
  "VIRAL_SKEW",
  "SPONSORED_HEAVY",
  "DECLINING",
  "THIN",
] as const;
export const StatFlag = z.enum(STAT_FLAGS);
export type StatFlag = z.infer<typeof StatFlag>;

const share = z.number().min(0).max(1);
const count = z.number().int().min(0);
const countsBy = <T extends readonly [string, ...string[]]>(keys: T) =>
  z.object(Object.fromEntries(keys.map((k) => [k, count])) as Record<T[number], typeof count>);

/** Formula `es@1` output (ARCHITECTURE §10.6). Every number shown in the UI comes from here. */
export const StatSnapshotStats = z.object({
  windowDays: z.number().int().positive(),
  recentCount: count,
  priorCount: count,
  totalCount: count,
  growthRatio: z.number().min(0),
  uniqueCreators: count,
  topCreatorShare: share,
  topVideoViewShare: share,
  sponsoredShare: share,
  sarcasticExcluded: count,
  typeMix: countsBy(SIGNAL_TYPES),
  tierMix: countsBy(FOLLOWER_TIERS),
  monthly: z.array(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), count })),
  flags: z.array(StatFlag),
  evidenceStrength: z.number().min(0).max(100),
});
export type StatSnapshotStats = z.infer<typeof StatSnapshotStats>;

export const StatSnapshot = z.object({
  id: z.uuid(),
  needId: z.uuid(),
  asOf: Iso,
  windowDays: z.number().int(),
  formulaVersion: z.string(),
  stats: StatSnapshotStats,
  createdAt: Iso,
});
export type StatSnapshot = z.infer<typeof StatSnapshot>;
