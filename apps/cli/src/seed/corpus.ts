import { createHash } from "node:crypto";
import type { Tx } from "@unmet/db";
import {
  comment,
  creator,
  keyframe,
  signal,
  signalEvidence,
  transcriptSegment,
  video,
} from "@unmet/db/schema";
import { type FollowerTier, followerTierFor } from "@unmet/shared";
import { deterministicEmbedding, nearTo } from "@unmet/shared/testing";
import type { SnapshotSignal } from "@unmet/stats";
import type { FixtureCorpus, FixtureVideo, NeedKey } from "./fixture-schema.ts";

export const FIXTURE_COLLECTED_AT = new Date("2026-09-05T00:00:00Z");
const PROVENANCE =
  "Synthetic fixture written for tests and UI work (fixtures/corpus-small). Not a real post.";

export type SeededSignal = SnapshotSignal & {
  need: NeedKey;
  embedding: number[];
  evidenceIds: string[];
};

/** Fixture authors are invented, but they are hashed exactly like real ones (G-SEC-11). */
export function hashAuthor(handle: string): string {
  return createHash("sha256").update(`fixture-corpus:${handle}`).digest("hex");
}

export function hashtagsOf(caption: string): string[] {
  return [...caption.matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) => (m[1] ?? "").toLowerCase());
}

type Owner = { id: string; tier: FollowerTier };
type ChildIds = { segmentIds: string[]; frameIds: string[]; commentIds: string[] };
type FixtureSignalRow = FixtureVideo["signals"][number];

async function insertCreators(tx: Tx, corpus: FixtureCorpus, nextId: () => string) {
  const creators = new Map<string, Owner>();
  for (const c of corpus.creators) {
    const id = nextId();
    const tier = followerTierFor(c.followerCount);
    creators.set(c.handle, { id, tier });
    await tx.insert(creator).values({
      id,
      platform: "synthetic",
      handle: c.handle,
      followerCount: c.followerCount,
      followerTier: tier,
    });
  }
  return creators;
}

async function insertVideoRow(tx: Tx, v: FixtureVideo, owner: Owner, videoId: string) {
  const sponsoredDisclosed = /#(ad|sponsored|partner)\b|paid partnership/i.test(v.caption);
  await tx.insert(video).values({
    id: videoId,
    corpusId: "main",
    platform: "synthetic",
    externalId: v.externalId,
    sourceUrl: `https://example.com/unmet-fixtures/${v.externalId}`,
    creatorId: owner.id,
    postedAt: new Date(v.postedAt),
    durationMs: v.durationMs,
    caption: v.caption,
    hashtags: hashtagsOf(v.caption),
    views: v.views,
    likes: v.likes,
    commentsCount: v.commentsCount,
    collectedAt: FIXTURE_COLLECTED_AT,
    provenanceNote: PROVENANCE,
    collectionQuery: "fixture corpus (synthetic)",
    isSynthetic: true,
    sponsoredDisclosed,
    ingestStatus: "complete",
    extractStatus: "complete",
  });
  return sponsoredDisclosed;
}

async function insertChildren(tx: Tx, v: FixtureVideo, videoId: string, nextId: () => string) {
  const ids: ChildIds = {
    segmentIds: v.transcript.map(() => nextId()),
    frameIds: v.keyframes.map(() => nextId()),
    commentIds: v.comments.map(() => nextId()),
  };
  const at = (list: string[], i: number) => list[i] ?? "";
  if (v.transcript.length > 0) {
    await tx
      .insert(transcriptSegment)
      .values(v.transcript.map((s, i) => ({ id: at(ids.segmentIds, i), videoId, ...s })));
  }
  if (v.keyframes.length > 0) {
    await tx.insert(keyframe).values(
      v.keyframes.map((f, i) => ({
        id: at(ids.frameIds, i),
        videoId,
        atMs: f.atMs,
        mediaKey: `frames/${videoId}/${f.atMs}.jpg`,
        description: f.description,
        onScreenText: f.onScreenText,
        productsVisible: f.productsVisible,
      })),
    );
  }
  if (v.comments.length > 0) {
    await tx.insert(comment).values(
      v.comments.map((c, i) => ({
        id: at(ids.commentIds, i),
        videoId,
        authorHash: hashAuthor(c.author),
        text: c.text,
        likeCount: c.likeCount,
      })),
    );
  }
  return ids;
}

type FixtureEvidence = FixtureSignalRow["evidence"][number];

/** Points one fixture evidence item at the row it cites (exactly one FK, or none for captions). */
function evidenceRefs(v: FixtureVideo, ids: ChildIds, e: FixtureEvidence) {
  const index = e.index ?? -1;
  const pick = (list: string[]) => list[index] ?? null;
  switch (e.source) {
    case "transcript": {
      const segment = v.transcript[index];
      return {
        transcriptSegmentId: pick(ids.segmentIds),
        startMs: segment?.startMs ?? null,
        endMs: segment?.endMs ?? null,
      };
    }
    case "frame":
      return { keyframeId: pick(ids.frameIds), startMs: v.keyframes[index]?.atMs ?? null };
    case "comment":
      return { commentId: pick(ids.commentIds) };
    case "caption":
      return {};
  }
}

async function insertEvidence(
  tx: Tx,
  v: FixtureVideo,
  ids: ChildIds,
  signalId: string,
  evidence: FixtureEvidence[],
  nextId: () => string,
) {
  const evidenceIds: string[] = [];
  for (const e of evidence) {
    const id = nextId();
    evidenceIds.push(id);
    await tx
      .insert(signalEvidence)
      .values({ id, signalId, source: e.source, excerpt: e.excerpt, ...evidenceRefs(v, ids, e) });
  }
  return evidenceIds;
}

export async function insertCorpus(
  tx: Tx,
  corpus: FixtureCorpus,
  nextId: () => string,
): Promise<SeededSignal[]> {
  const creators = await insertCreators(tx, corpus, nextId);
  const seeded: SeededSignal[] = [];
  for (const v of corpus.videos) {
    const owner = creators.get(v.creator);
    if (!owner) throw new Error(`Fixture video ${v.externalId} names unknown creator ${v.creator}`);
    const videoId = nextId();
    const sponsoredDisclosed = await insertVideoRow(tx, v, owner, videoId);
    const ids = await insertChildren(tx, v, videoId, nextId);

    for (const [n, s] of v.signals.entries()) {
      const signalId = nextId();
      // Signals of one need sit near a shared centre so P2 clustering groups them.
      const embedding = nearTo(
        deterministicEmbedding(`need:${s.need}`),
        0.9,
        `${v.externalId}:${n}`,
      );
      // The deterministic disclosure rule wins over the extracted value (F-02.AC2).
      const sponsored = sponsoredDisclosed ? "disclosed" : s.sponsored;
      await tx.insert(signal).values({
        id: signalId,
        videoId,
        type: s.type,
        needStatement: s.needStatement,
        products: s.products,
        stance: s.stance,
        sponsored,
        confidence: s.confidence,
        embedding,
        extractorVersion: "fixture@1",
      });
      seeded.push({
        id: signalId,
        need: s.need,
        type: s.type,
        stance: s.stance,
        sponsored,
        postedAt: new Date(v.postedAt),
        creatorId: owner.id,
        creatorTier: owner.tier,
        videoId,
        videoViews: v.views,
        embedding,
        evidenceIds: await insertEvidence(tx, v, ids, signalId, s.evidence, nextId),
      });
    }
  }
  return seeded;
}
