import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, embedding, id, tsvector, updatedAt } from "./columns.ts";
import {
  evidenceSource,
  extractStatus,
  followerTier,
  ingestStatus,
  platform,
  signalType,
  sponsored,
  stance,
} from "./enums.ts";

export type ProductMention = {
  name: string;
  brand?: string;
  source: "speech" | "caption" | "visual" | "comment";
};
export type VisibleProduct = { name: string; brand?: string; confidence: number };

export const creator = pgTable(
  "creator",
  {
    id: id(),
    platform: platform("platform").notNull(),
    handle: text("handle").notNull(),
    followerCount: integer("follower_count").notNull(),
    followerTier: followerTier("follower_tier").notNull(),
    likelyMinor: boolean("likely_minor").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    unique("creator_platform_handle_unique").on(t.platform, t.handle),
    check("creator_follower_count_nonnegative", sql`${t.followerCount} >= 0`),
  ],
);

export const video = pgTable(
  "video",
  {
    id: id(),
    corpusId: text("corpus_id").notNull().default("main"),
    platform: platform("platform").notNull(),
    externalId: text("external_id").notNull(),
    sourceUrl: text("source_url").notNull(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => creator.id),
    postedAt: timestamp("posted_at", { withTimezone: true }).notNull(),
    durationMs: integer("duration_ms"),
    caption: text("caption").notNull().default(""),
    hashtags: text("hashtags").array().notNull().default(sql`'{}'::text[]`),
    views: bigint("views", { mode: "number" }).notNull().default(0),
    likes: bigint("likes", { mode: "number" }).notNull().default(0),
    commentsCount: integer("comments_count").notNull().default(0),
    collectedAt: timestamp("collected_at", { withTimezone: true }).notNull(),
    provenanceNote: text("provenance_note").notNull(),
    collectionQuery: text("collection_query").notNull(),
    mediaKey: text("media_key"),
    isSynthetic: boolean("is_synthetic").notNull().default(false),
    trapTags: text("trap_tags").array().notNull().default(sql`'{}'::text[]`),
    sponsoredDisclosed: boolean("sponsored_disclosed").notNull().default(false),
    ingestStatus: ingestStatus("ingest_status").notNull().default("pending"),
    ingestError: text("ingest_error"),
    extractStatus: extractStatus("extract_status").notNull().default("pending"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("video_platform_external_id_unique").on(t.platform, t.externalId),
    index("video_corpus_id_idx").on(t.corpusId),
    index("video_creator_id_idx").on(t.creatorId),
    index("video_posted_at_idx").on(t.postedAt),
    index("video_corpus_posted_at_idx").on(t.corpusId, t.postedAt),
  ],
);

export const transcriptSegment = pgTable(
  "transcript_segment",
  {
    id: id(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    startMs: integer("start_ms").notNull(),
    endMs: integer("end_ms").notNull(),
    text: text("text").notNull(),
    tsv: tsvector("tsv").generatedAlwaysAs(sql`to_tsvector('english', "text")`),
  },
  (t) => [
    index("transcript_segment_video_id_idx").on(t.videoId),
    index("transcript_segment_tsv_idx").using("gin", t.tsv),
    check("transcript_segment_range", sql`${t.endMs} > ${t.startMs}`),
  ],
);

export const keyframe = pgTable(
  "keyframe",
  {
    id: id(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    atMs: integer("at_ms").notNull(),
    mediaKey: text("media_key").notNull(),
    description: text("description").notNull(),
    onScreenText: text("on_screen_text").notNull().default(""),
    productsVisible: jsonb("products_visible")
      .$type<VisibleProduct[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
  },
  (t) => [index("keyframe_video_id_idx").on(t.videoId)],
);

export const comment = pgTable(
  "comment",
  {
    id: id(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    // sha256(COMMENT_HASH_SALT + handle); the raw handle is never stored (G-SEC-11).
    authorHash: text("author_hash").notNull(),
    text: text("text").notNull(),
    likeCount: integer("like_count").notNull().default(0),
    postedAt: timestamp("posted_at", { withTimezone: true }),
  },
  (t) => [index("comment_video_id_idx").on(t.videoId)],
);

export const signal = pgTable(
  "signal",
  {
    id: id(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    type: signalType("type").notNull(),
    needStatement: text("need_statement").notNull(),
    products: jsonb("products").$type<ProductMention[]>().notNull().default(sql`'[]'::jsonb`),
    stance: stance("stance").notNull(),
    sponsored: sponsored("sponsored").notNull(),
    confidence: real("confidence").notNull(),
    embedding: embedding("embedding"),
    tsv: tsvector("tsv").generatedAlwaysAs(sql`to_tsvector('english', "need_statement")`),
    extractorVersion: text("extractor_version").notNull(),
    repairAttempts: smallint("repair_attempts").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("signal_video_id_idx").on(t.videoId),
    index("signal_embedding_hnsw_idx")
      .using("hnsw", t.embedding.op("vector_cosine_ops"))
      .with({ m: 16, ef_construction: 64 }),
    index("signal_tsv_idx").using("gin", t.tsv),
    check("signal_need_statement_length", sql`char_length(${t.needStatement}) between 10 and 160`),
    check("signal_confidence_range", sql`${t.confidence} >= 0 and ${t.confidence} <= 1`),
  ],
);

export const signalEvidence = pgTable(
  "signal_evidence",
  {
    id: id(),
    signalId: uuid("signal_id")
      .notNull()
      .references(() => signal.id, { onDelete: "cascade" }),
    source: evidenceSource("source").notNull(),
    transcriptSegmentId: uuid("transcript_segment_id").references(() => transcriptSegment.id, {
      onDelete: "cascade",
    }),
    keyframeId: uuid("keyframe_id").references(() => keyframe.id, { onDelete: "cascade" }),
    commentId: uuid("comment_id").references(() => comment.id, { onDelete: "cascade" }),
    startMs: integer("start_ms"),
    endMs: integer("end_ms"),
    excerpt: text("excerpt").notNull(),
  },
  (t) => [
    index("signal_evidence_signal_id_idx").on(t.signalId),
    check("signal_evidence_excerpt_length", sql`char_length(${t.excerpt}) <= 200`),
    // Exactly one reference matching the source; caption evidence has none.
    check(
      "signal_evidence_reference",
      sql`(${t.source} = 'caption' and ${t.transcriptSegmentId} is null and ${t.keyframeId} is null and ${t.commentId} is null)
        or (${t.source} = 'transcript' and ${t.transcriptSegmentId} is not null and ${t.keyframeId} is null and ${t.commentId} is null)
        or (${t.source} = 'frame' and ${t.keyframeId} is not null and ${t.transcriptSegmentId} is null and ${t.commentId} is null)
        or (${t.source} = 'comment' and ${t.commentId} is not null and ${t.transcriptSegmentId} is null and ${t.keyframeId} is null)`,
    ),
  ],
);
