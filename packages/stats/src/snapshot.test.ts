import { describe, expect, it } from "vitest";
import { computeSnapshotStats, evidenceStrength, type SnapshotSignal } from "./snapshot.ts";

const asOf = new Date("2026-06-01T00:00:00Z");
let n = 0;
const sig = (
  creatorId: string,
  videoId: string,
  videoViews: number,
  type: SnapshotSignal["type"],
  postedAt: string,
  extra: Partial<SnapshotSignal> = {},
): SnapshotSignal => ({
  id: `s${++n}`,
  type,
  stance: "sincere",
  sponsored: "none",
  postedAt: new Date(postedAt),
  creatorId,
  creatorTier: creatorId === "A" ? "micro" : creatorId === "B" ? "nano" : "mid",
  videoId,
  videoViews,
  ...extra,
});

// Hand-computed below: recent window [3 Mar 2026, 1 Jun 2026), prior [3 Dec 2025, 3 Mar 2026).
const fixture: SnapshotSignal[] = [
  sig("A", "v1", 1000, "complaint", "2026-05-20T10:00:00Z"),
  sig("A", "v1", 1000, "workaround", "2026-05-10T10:00:00Z"),
  sig("A", "v2", 3000, "wish", "2026-04-15T10:00:00Z", { sponsored: "disclosed" }),
  sig("A", "v3", 500, "complaint", "2026-03-10T10:00:00Z"),
  sig("A", "v4", 500, "complaint", "2026-02-01T10:00:00Z"),
  sig("A", "v5", 1000, "workaround", "2026-01-05T10:00:00Z", { sponsored: "suspected" }),
  sig("A", "v6", 1000, "dupe_hunt", "2025-11-20T10:00:00Z"),
  sig("B", "v7", 2000, "complaint", "2026-04-01T10:00:00Z"),
  sig("B", "v8", 500, "wish", "2025-12-10T10:00:00Z"),
  sig("C", "v9", 500, "workaround", "2026-05-31T23:59:59Z"),
  sig("C", "v10", 100_000, "wish", "2026-05-01T10:00:00Z", { stance: "sarcastic" }),
  sig("B", "v11", 100_000, "complaint", "2026-06-01T00:00:00Z"),
];

describe("computeSnapshotStats (es@1)", () => {
  it("T-F03-AC1 matches the hand-computed snapshot", () => {
    expect(computeSnapshotStats(fixture, asOf)).toEqual({
      windowDays: 90,
      recentCount: 6,
      priorCount: 3,
      totalCount: 10,
      growthRatio: 1.75,
      uniqueCreators: 3,
      topCreatorShare: 0.7,
      topVideoViewShare: 0.3,
      sponsoredShare: 0.2,
      sarcasticExcluded: 1,
      typeMix: { complaint: 4, wish: 2, workaround: 3, dupe_hunt: 1 },
      tierMix: { nano: 2, micro: 7, mid: 1, macro: 0 },
      monthly: [
        { month: "2025-06", count: 0 },
        { month: "2025-07", count: 0 },
        { month: "2025-08", count: 0 },
        { month: "2025-09", count: 0 },
        { month: "2025-10", count: 0 },
        { month: "2025-11", count: 1 },
        { month: "2025-12", count: 1 },
        { month: "2026-01", count: 1 },
        { month: "2026-02", count: 1 },
        { month: "2026-03", count: 1 },
        { month: "2026-04", count: 2 },
        { month: "2026-05", count: 3 },
      ],
      flags: ["CONCENTRATED"],
      evidenceStrength: 46.6,
    });
  });

  it("T-F03-AC3 flags one creator posting 7 of 10 signals as CONCENTRATED", () => {
    const stats = computeSnapshotStats(fixture, asOf);
    expect(stats.topCreatorShare).toBe(0.7);
    expect(stats.flags).toContain("CONCENTRATED");
  });

  it("never counts a signal posted at or after as_of", () => {
    const stats = computeSnapshotStats(fixture, new Date("2026-05-01T00:00:00Z"));
    expect(stats.totalCount).toBe(7);
  });

  it("T-F03-AC4 is deterministic", () => {
    const a = JSON.stringify(computeSnapshotStats(fixture, asOf));
    const b = JSON.stringify(computeSnapshotStats([...fixture].reverse(), asOf));
    expect(b).toBe(a);
  });

  it("raises every flag at its threshold", () => {
    const viral = [
      sig("A", "x1", 6000, "complaint", "2025-01-01T00:00:00Z", { sponsored: "disclosed" }),
      sig("B", "x2", 2000, "complaint", "2026-02-01T00:00:00Z", { sponsored: "suspected" }),
      sig("C", "x3", 2000, "complaint", "2026-02-02T00:00:00Z"),
    ];
    const stats = computeSnapshotStats(viral, asOf);
    expect(stats.topVideoViewShare).toBe(0.6);
    expect(stats.sponsoredShare).toBe(0.667);
    expect(stats.growthRatio).toBe(0.333);
    expect(stats.flags).toEqual(["VIRAL_SKEW", "SPONSORED_HEAVY", "DECLINING", "THIN"]);
  });

  it("handles a need with no visible signals", () => {
    const stats = computeSnapshotStats([], asOf);
    expect(stats).toMatchObject({
      totalCount: 0,
      topCreatorShare: 0,
      topVideoViewShare: 0,
      sponsoredShare: 0,
      growthRatio: 1,
      flags: ["THIN"],
    });
    expect(stats.monthly).toHaveLength(12);
  });
});

describe("evidenceStrength", () => {
  it("reaches 100 for broad, growing, organic, workaround-heavy needs", () => {
    expect(
      evidenceStrength({
        uniqueCreators: 30,
        growthRatio: 3,
        topCreatorShare: 0,
        sponsoredShare: 0,
        workarounds: 5,
        totalCount: 10,
      }),
    ).toBe(100);
  });

  it("clamps at 0 and copes with an empty need", () => {
    expect(
      evidenceStrength({
        uniqueCreators: 0,
        growthRatio: 0,
        topCreatorShare: 1,
        sponsoredShare: 1,
        workarounds: 0,
        totalCount: 0,
      }),
    ).toBe(0);
  });
});
