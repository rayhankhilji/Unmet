import { EvidenceSource, SignalType, Sponsored, Stance } from "@unmet/shared";
import { z } from "zod";

export const NEED_KEYS = [
  "dry-sunscreen",
  "pilling-spf",
  "gentle-retinol",
  "vitc-dupe",
  "mineral-cleanser",
] as const;
export const NeedKey = z.enum(NEED_KEYS);
export type NeedKey = z.infer<typeof NeedKey>;

const FixtureEvidence = z
  .object({
    source: EvidenceSource,
    index: z.number().int().min(0).optional(),
    excerpt: z.string().min(1).max(200),
  })
  .refine((e) => (e.source === "caption") === (e.index === undefined), {
    message: "caption evidence has no index; every other source needs one",
  });

const FixtureSignal = z.object({
  need: NeedKey,
  type: SignalType,
  needStatement: z.string().min(10).max(160),
  products: z.array(
    z.object({ name: z.string(), source: z.enum(["speech", "caption", "visual", "comment"]) }),
  ),
  stance: Stance,
  sponsored: Sponsored,
  confidence: z.number().min(0).max(1),
  evidence: z.array(FixtureEvidence).min(1).max(5),
});

const FixtureVideo = z.object({
  externalId: z.string().regex(/^fx-v\d{2}$/),
  creator: z.string().startsWith("fx_"),
  postedAt: z.iso.datetime(),
  views: z.number().int().min(0),
  likes: z.number().int().min(0),
  commentsCount: z.number().int().min(0),
  caption: z.string(),
  durationMs: z.number().int().positive(),
  transcript: z.array(
    z.object({ startMs: z.number().int(), endMs: z.number().int(), text: z.string().min(1) }),
  ),
  keyframes: z.array(
    z.object({
      atMs: z.number().int(),
      description: z.string().min(1),
      onScreenText: z.string(),
      productsVisible: z.array(z.object({ name: z.string(), confidence: z.number() })),
    }),
  ),
  comments: z.array(
    z.object({ author: z.string(), text: z.string().min(1), likeCount: z.number().int() }),
  ),
  signals: z.array(FixtureSignal),
});

export const FixtureCorpus = z.object({
  description: z.string(),
  creators: z.array(
    z.object({ handle: z.string().startsWith("fx_"), followerCount: z.number().int().min(0) }),
  ),
  videos: z.array(FixtureVideo),
});
export type FixtureCorpus = z.infer<typeof FixtureCorpus>;
export type FixtureVideo = z.infer<typeof FixtureVideo>;
