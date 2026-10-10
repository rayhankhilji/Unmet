import { z } from "zod";
import { FOLLOWER_TIERS, PLATFORMS, SIGNAL_TYPES } from "../enums.ts";
import { Iso } from "./common.ts";

const count = z.number().int().min(0);
const countsBy = <T extends readonly [string, ...string[]]>(keys: T) =>
  z.object(Object.fromEntries(keys.map((k) => [k, count])) as Record<T[number], typeof count>);

/** Live numbers for /about (F-14). Counts cover complete videos in the `main` corpus. */
export const CorpusStats = z.object({
  corpusId: z.string(),
  videos: count,
  creators: count,
  signals: count,
  excludedVideos: count,
  syntheticVideos: count,
  dateRange: z.object({ from: Iso, to: Iso }).nullable(),
  platforms: countsBy(PLATFORMS),
  followerTiers: countsBy(FOLLOWER_TIERS),
  signalsByType: countsBy(SIGNAL_TYPES),
});
export type CorpusStats = z.infer<typeof CorpusStats>;
