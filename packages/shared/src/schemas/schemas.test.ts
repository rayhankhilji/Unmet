import { describe, expect, it } from "vitest";
import { brandDisplayName } from "./brand.ts";
import { PageQuery } from "./common.ts";
import { CorpusStats } from "./corpus.ts";
import { EvidenceDetail } from "./evidence.ts";
import { CreateInvestigationInput, FindingDetail, RunEventsQuery } from "./investigation.ts";
import { StatSnapshotStats } from "./stats.ts";

const uuid = "0192c3a1-0000-7000-8000-000000000001";

describe("CreateInvestigationInput", () => {
  it("defaults mode to agent and trims the question", () => {
    const input = CreateInvestigationInput.parse({
      brandId: uuid,
      question: "  Which unmet needs could this brand launch against?  ",
    });
    expect(input.mode).toBe("agent");
    expect(input.question).toBe("Which unmet needs could this brand launch against?");
  });

  it.each([
    [{ brandId: "nope", question: "A long enough question" }, "brandId"],
    [{ brandId: uuid, question: "short" }, "question"],
    [{ brandId: uuid, question: "x".repeat(501) }, "question"],
    [{ brandId: uuid, question: "A long enough question", asOf: "2026-06-01" }, "asOf"],
    [{ brandId: uuid, question: "A long enough question", mode: "chat" }, "mode"],
  ])("rejects invalid input %#", (input, field) => {
    const result = CreateInvestigationInput.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });
});

describe("PageQuery and RunEventsQuery", () => {
  it("applies defaults and caps the page size at 50", () => {
    expect(PageQuery.parse({})).toEqual({ limit: 20 });
    expect(PageQuery.safeParse({ limit: "51" }).success).toBe(false);
    expect(RunEventsQuery.parse({ afterSeq: "7" })).toEqual({ afterSeq: 7, detail: "summary" });
  });
});

describe("StatSnapshotStats", () => {
  const stats = {
    windowDays: 90,
    recentCount: 17,
    priorCount: 6,
    totalCount: 23,
    growthRatio: 2.571,
    uniqueCreators: 14,
    topCreatorShare: 0.13,
    topVideoViewShare: 0.31,
    sponsoredShare: 0.04,
    sarcasticExcluded: 1,
    typeMix: { complaint: 9, wish: 6, workaround: 7, dupe_hunt: 1 },
    tierMix: { nano: 5, micro: 12, mid: 5, macro: 1 },
    monthly: [{ month: "2026-05", count: 6 }],
    flags: [],
    evidenceStrength: 64.2,
  };

  it("accepts a complete snapshot", () => {
    expect(StatSnapshotStats.parse(stats)).toEqual(stats);
  });

  it("rejects shares outside 0..1, unknown flags and missing mix keys", () => {
    expect(StatSnapshotStats.safeParse({ ...stats, sponsoredShare: 1.2 }).success).toBe(false);
    expect(StatSnapshotStats.safeParse({ ...stats, flags: ["HOT"] }).success).toBe(false);
    expect(
      StatSnapshotStats.safeParse({ ...stats, typeMix: { complaint: 1, wish: 1, workaround: 1 } })
        .success,
    ).toBe(false);
  });
});

describe("EvidenceDetail", () => {
  it("allows a null image URL and caps excerpts at 200 characters", () => {
    const evidence = {
      id: uuid,
      source: "frame",
      excerpt: "Two bottles on the counter",
      startMs: 3000,
      endMs: null,
      frameDescription: "Two bottles on the counter",
      imageUrl: null,
      video: {
        id: uuid,
        platform: "synthetic",
        sourceUrl: "https://example.com/v/1",
        openUrl: "https://example.com/v/1",
        postedAt: "2026-03-03T10:00:00.000Z",
        views: 1200,
        isSynthetic: true,
      },
      creator: { handle: "fixture_creator", followerTier: "micro" },
      signal: {
        id: uuid,
        type: "workaround",
        stance: "sincere",
        sponsored: "none",
        needStatement: "a sunscreen that does not dry out skin",
      },
    };
    expect(EvidenceDetail.parse(evidence).imageUrl).toBeNull();
    expect(EvidenceDetail.safeParse({ ...evidence, excerpt: "x".repeat(201) }).success).toBe(false);
  });
});

describe("FindingDetail", () => {
  it("rejects confidence above 1", () => {
    const result = FindingDetail.shape.confidence.safeParse(1.01);
    expect(result.success).toBe(false);
  });
});

describe("CorpusStats", () => {
  it("requires a count for every platform, tier and signal type", () => {
    const zeros = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, 0]));
    const stats = {
      corpusId: "main",
      videos: 0,
      creators: 0,
      signals: 0,
      excludedVideos: 0,
      syntheticVideos: 0,
      dateRange: null,
      platforms: zeros(["tiktok", "youtube_shorts", "instagram_reels", "synthetic"]),
      followerTiers: zeros(["nano", "micro", "mid", "macro"]),
      signalsByType: zeros(["complaint", "wish", "workaround", "dupe_hunt"]),
    };
    expect(CorpusStats.parse(stats)).toEqual(stats);
    expect(CorpusStats.safeParse({ ...stats, platforms: {} }).success).toBe(false);
  });
});

describe("brandDisplayName", () => {
  it("never shows the bare brand name", () => {
    expect(brandDisplayName("La Roche-Posay")).toBe("A skincare brand like La Roche-Posay");
  });
});

describe("page", () => {
  it("wraps an item schema with a cursor", async () => {
    const { page } = await import("./common.ts");
    const { z } = await import("zod");
    expect(page(z.number()).parse({ items: [1], nextCursor: null })).toEqual({
      items: [1],
      nextCursor: null,
    });
  });
});
