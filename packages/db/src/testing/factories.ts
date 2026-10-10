import {
  type FollowerTier,
  followerTierFor,
  type RunStatus,
  type SignalType,
  type Sponsored,
  type Stance,
} from "@unmet/shared";
import { deterministicEmbedding, mean, nearTo, seededUuid } from "@unmet/shared/testing";
import {
  brand,
  catalogProduct,
  comment,
  creator,
  investigation,
  keyframe,
  need,
  needSignal,
  signal,
  signalEvidence,
  transcriptSegment,
  video,
} from "../schema/index.ts";
import { currentTx } from "./tx.ts";

// Factories for integration tests (TESTING_GUIDE §4.1). They write through the transaction
// opened by withTestTx, take sensible defaults, and draw IDs from a seeded generator.

let nextId = seededUuid("factories");
let counter = 0;

/** Restarts the ID stream; call in beforeEach when a test asserts on generated IDs. */
export function resetFactoryIds(seed = "factories"): void {
  nextId = seededUuid(seed);
  counter = 0;
}

const seq = () => ++counter;

const FOLLOWERS_BY_TIER: Record<FollowerTier, number> = {
  nano: 4_200,
  micro: 38_000,
  mid: 420_000,
  macro: 2_400_000,
};

type CreatorRow = typeof creator.$inferSelect;
type VideoRow = typeof video.$inferSelect;
type SignalRow = typeof signal.$inferSelect;

export async function makeCreator(
  opts: {
    tier?: FollowerTier;
    handle?: string;
    followerCount?: number;
    likelyMinor?: boolean;
  } = {},
): Promise<CreatorRow> {
  const followerCount = opts.followerCount ?? FOLLOWERS_BY_TIER[opts.tier ?? "micro"];
  const [row] = await currentTx()
    .insert(creator)
    .values({
      id: nextId(),
      platform: "synthetic",
      handle: opts.handle ?? `creator_${seq()}`,
      followerCount,
      followerTier: followerTierFor(followerCount),
      likelyMinor: opts.likelyMinor ?? false,
    })
    .returning();
  return required(row);
}

export async function makeVideo(
  opts: {
    postedAt?: Date;
    creator?: CreatorRow;
    caption?: string;
    sponsoredDisclosed?: boolean;
    views?: number;
    corpusId?: string;
  } = {},
): Promise<VideoRow> {
  const owner = opts.creator ?? (await makeCreator());
  const n = seq();
  const [row] = await currentTx()
    .insert(video)
    .values({
      id: nextId(),
      corpusId: opts.corpusId ?? "main",
      platform: "synthetic",
      externalId: `fixture-${n}`,
      sourceUrl: `https://example.com/videos/fixture-${n}`,
      creatorId: owner.id,
      postedAt: opts.postedAt ?? new Date("2026-03-01T12:00:00Z"),
      caption: opts.caption ?? "",
      views: opts.views ?? 10_000,
      collectedAt: new Date("2026-09-01T00:00:00Z"),
      provenanceNote: "test factory",
      collectionQuery: "test factory",
      isSynthetic: true,
      sponsoredDisclosed: opts.sponsoredDisclosed ?? false,
      ingestStatus: "complete",
      extractStatus: "complete",
    })
    .returning();
  return required(row);
}

export async function makeSegment(opts: {
  video: VideoRow;
  startMs?: number;
  endMs?: number;
  text?: string;
}) {
  const startMs = opts.startMs ?? 0;
  const [row] = await currentTx()
    .insert(transcriptSegment)
    .values({
      id: nextId(),
      videoId: opts.video.id,
      startMs,
      endMs: opts.endMs ?? startMs + 4_000,
      text: opts.text ?? "This sunscreen dries my skin out by lunchtime.",
    })
    .returning();
  return required(row);
}

export async function makeKeyframe(opts: { video: VideoRow; atMs?: number; description?: string }) {
  const atMs = opts.atMs ?? 500;
  const [row] = await currentTx()
    .insert(keyframe)
    .values({
      id: nextId(),
      videoId: opts.video.id,
      atMs,
      mediaKey: `frames/${opts.video.id}/${atMs}.jpg`,
      description: opts.description ?? "A hand holding a white sunscreen tube.",
    })
    .returning();
  return required(row);
}

export async function makeComment(opts: { video: VideoRow; text?: string; likeCount?: number }) {
  const [row] = await currentTx()
    .insert(comment)
    .values({
      id: nextId(),
      videoId: opts.video.id,
      authorHash: `hash_${seq()}`,
      text: opts.text ?? "Same, mine pills under foundation.",
      likeCount: opts.likeCount ?? 0,
    })
    .returning();
  return required(row);
}

export async function makeSignal(
  opts: {
    video?: VideoRow;
    type?: SignalType;
    needStatement?: string;
    stance?: Stance;
    sponsored?: Sponsored;
    embedding?: number[] | null;
    withEvidence?: boolean;
  } = {},
): Promise<SignalRow> {
  const owner = opts.video ?? (await makeVideo());
  const needStatement = opts.needStatement ?? "a sunscreen that does not dry out skin";
  const [row] = await currentTx()
    .insert(signal)
    .values({
      id: nextId(),
      videoId: owner.id,
      type: opts.type ?? "complaint",
      needStatement,
      stance: opts.stance ?? "sincere",
      sponsored: opts.sponsored ?? "none",
      confidence: 0.8,
      embedding:
        opts.embedding === undefined ? deterministicEmbedding(needStatement) : opts.embedding,
      extractorVersion: "extract@test",
    })
    .returning();
  const created = required(row);
  if (opts.withEvidence ?? true) {
    await currentTx()
      .insert(signalEvidence)
      .values({
        id: nextId(),
        signalId: created.id,
        source: "caption",
        excerpt: needStatement.slice(0, 200),
      });
  }
  return created;
}

export type CatalogProductInput = {
  name: string;
  category?: string;
  format?: string;
  keyIngredients?: string[];
  claims?: string[];
  skinTypes?: string[];
};

export async function makeBrand(
  opts: { slug?: string; name?: string; catalog?: CatalogProductInput[] } = {},
) {
  const n = seq();
  const [row] = await currentTx()
    .insert(brand)
    .values({
      id: nextId(),
      slug: opts.slug ?? `brand-${n}`,
      name: opts.name ?? `Fixture Brand ${n}`,
      positioning: "Gentle, dermatologist-led skincare for sensitive skin.",
    })
    .returning();
  const created = required(row);
  for (const product of opts.catalog ?? []) {
    await currentTx()
      .insert(catalogProduct)
      .values({
        id: nextId(),
        brandId: created.id,
        name: product.name,
        category: product.category ?? "moisturiser",
        format: product.format ?? "cream",
        keyIngredients: product.keyIngredients ?? [],
        claims: product.claims ?? [],
        skinTypes: product.skinTypes ?? ["all"],
        url: `https://example.com/products/${encodeURIComponent(product.name)}`,
      });
  }
  return created;
}

export async function makeInvestigation(
  opts: { asOf?: Date; status?: RunStatus; brandId?: string; corpusId?: string } = {},
) {
  const brandId = opts.brandId ?? (await makeBrand()).id;
  const [row] = await currentTx()
    .insert(investigation)
    .values({
      id: nextId(),
      kind: "agent",
      origin: "owner",
      brandId,
      question: "Which unmet needs could this brand launch against next?",
      asOf: opts.asOf ?? new Date("2026-06-01T00:00:00Z"),
      corpusId: opts.corpusId ?? "main",
      status: opts.status ?? "queued",
      formulaVersion: "es@1",
    })
    .returning();
  return required(row);
}

/** A need whose `n` signals sit at `similarity` to a shared centre, inside one investigation. */
export async function makeNeedWithSignals(
  n: number,
  opts: {
    investigationId?: string;
    label?: string;
    needStatement?: string;
    similarity?: number;
    type?: SignalType;
    postedAt?: Date;
  } = {},
) {
  const investigationId = opts.investigationId ?? (await makeInvestigation()).id;
  const needStatement = opts.needStatement ?? "a sunscreen that does not dry out skin";
  const centre = deterministicEmbedding(needStatement);
  const signals: SignalRow[] = [];
  for (let i = 0; i < n; i++) {
    const video = await makeVideo(opts.postedAt ? { postedAt: opts.postedAt } : {});
    signals.push(
      await makeSignal({
        video,
        needStatement,
        type: opts.type ?? "complaint",
        embedding: nearTo(centre, opts.similarity ?? 0.9, `${needStatement}:${i}`),
      }),
    );
  }
  const [row] = await currentTx()
    .insert(need)
    .values({
      id: nextId(),
      investigationId,
      label: opts.label ?? "Sunscreen that doesn't dry skin",
      description: needStatement,
      centroid: mean(signals.map((s) => s.embedding ?? centre)),
      signalCount: n,
    })
    .returning();
  const created = required(row);
  await currentTx()
    .insert(needSignal)
    .values(signals.map((s) => ({ needId: created.id, signalId: s.id })));
  return { need: created, signals };
}

function required<T>(row: T | undefined): T {
  if (!row) throw new Error("Insert returned no row");
  return row;
}
