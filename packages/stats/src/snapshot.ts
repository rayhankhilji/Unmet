import {
  FOLLOWER_TIERS,
  type FollowerTier,
  SIGNAL_TYPES,
  type SignalType,
  type Sponsored,
  type Stance,
  type StatFlag,
  type StatSnapshotStats,
} from "@unmet/shared";

// Formula `es@1` (ARCHITECTURE §10.6). Pure and deterministic: same inputs, same output,
// byte for byte. Weights are hand-set (PRD A7) and published on /about.

export const FORMULA_VERSION = "es@1";
export const WINDOW_DAYS = 90;
const DAY_MS = 86_400_000;

export const FLAG_THRESHOLDS = {
  concentrated: 0.5, // topCreatorShare ≥
  viralSkew: 0.6, // topVideoViewShare ≥
  sponsoredHeavy: 0.4, // sponsoredShare ≥
  declining: 0.8, // growthRatio <
  thin: 6, // totalCount <
} as const;

export type SnapshotSignal = {
  id: string;
  type: SignalType;
  stance: Stance;
  sponsored: Sponsored;
  postedAt: Date;
  creatorId: string;
  creatorTier: FollowerTier;
  videoId: string;
  videoViews: number;
};

const round = (value: number, dp: number) => {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
};
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function countBy<K extends string>(keys: readonly K[], values: readonly K[]): Record<K, number> {
  const counts = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  for (const v of values) counts[v] += 1;
  return counts;
}

function maxShare(values: readonly string[]): number {
  if (values.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return Math.max(...counts.values()) / values.length;
}

function topVideoViewShare(signals: readonly SnapshotSignal[]): number {
  const views = new Map<string, number>();
  for (const s of signals) views.set(s.videoId, s.videoViews);
  const all = [...views.values()].reduce((a, b) => a + b, 0);
  return all === 0 ? 0 : Math.max(...views.values()) / all;
}

/** The 12 calendar months ending with the month of the day before `asOf` (UTC). */
function monthlyCounts(signals: readonly SnapshotSignal[], asOf: Date) {
  const last = new Date(asOf.getTime() - 1);
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() - i, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  const counts = new Map(months.map((m) => [m, 0]));
  for (const s of signals) {
    const key = s.postedAt.toISOString().slice(0, 7);
    const current = counts.get(key);
    if (current !== undefined) counts.set(key, current + 1);
  }
  return months.map((month) => ({ month, count: counts.get(month) ?? 0 }));
}

export function evidenceStrength(s: {
  uniqueCreators: number;
  growthRatio: number;
  topCreatorShare: number;
  sponsoredShare: number;
  workarounds: number;
  totalCount: number;
}): number {
  const breadth = Math.min(1, Math.log10(1 + s.uniqueCreators) / Math.log10(31));
  const growth = Math.min(1, (s.growthRatio - 0.5) / 2.5);
  const spread = 1 - s.topCreatorShare;
  const organic = 1 - s.sponsoredShare;
  const workaround = s.totalCount === 0 ? 0 : Math.min(1, (s.workarounds * 2) / s.totalCount);
  const score = 0.35 * breadth + 0.25 * growth + 0.2 * spread + 0.1 * organic + 0.1 * workaround;
  return round(100 * clamp01(score), 1);
}

export function computeSnapshotStats(
  input: readonly SnapshotSignal[],
  asOf: Date,
  windowDays = WINDOW_DAYS,
): StatSnapshotStats {
  const visible = input.filter((s) => s.postedAt.getTime() < asOf.getTime());
  const signals = visible.filter((s) => s.stance !== "sarcastic");
  const recentStart = asOf.getTime() - windowDays * DAY_MS;
  const priorStart = recentStart - windowDays * DAY_MS;
  const t = (s: SnapshotSignal) => s.postedAt.getTime();

  const recentCount = signals.filter((s) => t(s) >= recentStart).length;
  const priorCount = signals.filter((s) => t(s) >= priorStart && t(s) < recentStart).length;
  const totalCount = signals.length;
  const growthRatio = round((recentCount + 1) / (priorCount + 1), 3);
  const uniqueCreators = new Set(signals.map((s) => s.creatorId)).size;
  const topCreatorShare = round(maxShare(signals.map((s) => s.creatorId)), 3);
  const videoShare = round(topVideoViewShare(signals), 3);
  const sponsoredShare =
    totalCount === 0
      ? 0
      : round(signals.filter((s) => s.sponsored !== "none").length / totalCount, 3);
  const typeMix = countBy(
    SIGNAL_TYPES,
    signals.map((s) => s.type),
  );

  const flags: StatFlag[] = [];
  if (topCreatorShare >= FLAG_THRESHOLDS.concentrated) flags.push("CONCENTRATED");
  if (videoShare >= FLAG_THRESHOLDS.viralSkew) flags.push("VIRAL_SKEW");
  if (sponsoredShare >= FLAG_THRESHOLDS.sponsoredHeavy) flags.push("SPONSORED_HEAVY");
  if (growthRatio < FLAG_THRESHOLDS.declining) flags.push("DECLINING");
  if (totalCount < FLAG_THRESHOLDS.thin) flags.push("THIN");

  return {
    windowDays,
    recentCount,
    priorCount,
    totalCount,
    growthRatio,
    uniqueCreators,
    topCreatorShare,
    topVideoViewShare: videoShare,
    sponsoredShare,
    sarcasticExcluded: visible.length - signals.length,
    typeMix,
    tierMix: countBy(
      FOLLOWER_TIERS,
      signals.map((s) => s.creatorTier),
    ),
    monthly: monthlyCounts(signals, asOf),
    flags,
    evidenceStrength: evidenceStrength({
      uniqueCreators,
      growthRatio,
      topCreatorShare,
      sponsoredShare,
      workarounds: typeMix.workaround,
      totalCount,
    }),
  };
}
