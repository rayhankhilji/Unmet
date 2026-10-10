import {
  FOLLOWER_TIERS,
  type FollowerTier,
  PLATFORMS,
  type Platform,
  SIGNAL_TYPES,
  type SignalType,
} from "@unmet/shared";
import { and, count, countDistinct, eq, max, min, sql } from "drizzle-orm";
import type { Queryable } from "../context.ts";
import { creator, signal, video } from "../schema/index.ts";

export type CorpusStatsRow = {
  corpusId: string;
  videos: number;
  creators: number;
  signals: number;
  excludedVideos: number;
  syntheticVideos: number;
  dateRange: { from: Date; to: Date } | null;
  platforms: Record<Platform, number>;
  followerTiers: Record<FollowerTier, number>;
  signalsByType: Record<SignalType, number>;
};

const zeros = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

/** Live corpus numbers for /about (F-14). "In the corpus" means ingested to completion. */
export async function getCorpusStats(db: Queryable, corpusId = "main"): Promise<CorpusStatsRow> {
  const complete = and(eq(video.corpusId, corpusId), eq(video.ingestStatus, "complete"));

  const [totals] = await db
    .select({
      videos: count(),
      creators: countDistinct(video.creatorId),
      synthetic: sql<number>`count(*) filter (where ${video.isSynthetic})`.mapWith(Number),
      from: min(video.postedAt),
      to: max(video.postedAt),
    })
    .from(video)
    .where(complete);
  const [excluded] = await db
    .select({ n: count() })
    .from(video)
    .where(and(eq(video.corpusId, corpusId), eq(video.ingestStatus, "excluded")));
  const platformRows = await db
    .select({ key: video.platform, n: count() })
    .from(video)
    .where(complete)
    .groupBy(video.platform);
  const tierRows = await db
    .select({ key: creator.followerTier, n: countDistinct(creator.id) })
    .from(video)
    .innerJoin(creator, eq(creator.id, video.creatorId))
    .where(complete)
    .groupBy(creator.followerTier);
  const typeRows = await db
    .select({ key: signal.type, n: count() })
    .from(signal)
    .innerJoin(video, eq(video.id, signal.videoId))
    .where(complete)
    .groupBy(signal.type);

  const platforms = zeros(PLATFORMS);
  for (const r of platformRows) platforms[r.key] = r.n;
  const followerTiers = zeros(FOLLOWER_TIERS);
  for (const r of tierRows) followerTiers[r.key] = r.n;
  const signalsByType = zeros(SIGNAL_TYPES);
  for (const r of typeRows) signalsByType[r.key] = r.n;

  return {
    corpusId,
    videos: totals?.videos ?? 0,
    creators: totals?.creators ?? 0,
    signals: Object.values(signalsByType).reduce((a, b) => a + b, 0),
    excludedVideos: excluded?.n ?? 0,
    syntheticVideos: totals?.synthetic ?? 0,
    dateRange: totals?.from && totals.to ? { from: totals.from, to: totals.to } : null,
    platforms,
    followerTiers,
    signalsByType,
  };
}
