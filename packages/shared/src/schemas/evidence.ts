import { z } from "zod";
import { EvidenceSource, FollowerTier, Platform, SignalType, Sponsored, Stance } from "../enums.ts";
import { Iso } from "./common.ts";

export const EvidenceDetail = z.object({
  id: z.uuid(),
  source: EvidenceSource,
  excerpt: z.string().max(200),
  startMs: z.number().int().nullable(),
  endMs: z.number().int().nullable(),
  frameDescription: z.string().nullable(),
  imageUrl: z.url().nullable(), // always null when PUBLIC_DEMO_MODE=true
  video: z.object({
    id: z.uuid(),
    platform: Platform,
    sourceUrl: z.url(),
    openUrl: z.url(), // adds ?t= for YouTube
    postedAt: Iso,
    views: z.number().int(),
    isSynthetic: z.boolean(),
  }),
  creator: z.object({ handle: z.string(), followerTier: FollowerTier }),
  signal: z.object({
    id: z.uuid(),
    type: SignalType,
    stance: Stance,
    sponsored: Sponsored,
    needStatement: z.string(),
  }),
});
export type EvidenceDetail = z.infer<typeof EvidenceDetail>;
