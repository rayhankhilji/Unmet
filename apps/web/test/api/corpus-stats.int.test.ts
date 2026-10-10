import { type Queryable, withDbOverride } from "@unmet/db";
import { makeCreator, makeSignal, makeVideo, sql, withTestTx } from "@unmet/db/testing";
import { CorpusStats } from "@unmet/shared";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/v1/corpus/stats/route";
import { apiRequest, errorOf } from "./helpers";

describe("GET /api/v1/corpus/stats", () => {
  it("T-F14-AC1 counts equal SELECT count(*) over the complete main corpus", async () => {
    const { body, expected } = await withTestTx(async (tx) => {
      const nano = await makeCreator({ tier: "nano" });
      const mid = await makeCreator({ tier: "mid" });
      const a = await makeVideo({ creator: nano, postedAt: new Date("2026-01-05T00:00:00Z") });
      const b = await makeVideo({ creator: mid, postedAt: new Date("2026-04-09T00:00:00Z") });
      await makeSignal({ video: a, type: "complaint" });
      await makeSignal({ video: a, type: "workaround" });
      await makeSignal({ video: b, type: "wish" });
      // Not part of the corpus: an excluded row and a trap corpus.
      const excluded = await makeVideo({ creator: nano });
      await tx.execute(sql`update video set ingest_status = 'excluded' where id = ${excluded.id}`);
      await makeSignal({ video: await makeVideo({ corpusId: "trap-1" }) });

      const res = await GET(apiRequest("/api/v1/corpus/stats"), {});
      const q = async (query: ReturnType<typeof sql>) =>
        Number((await tx.execute<{ n: string }>(query)).rows[0]?.n);
      return {
        body: CorpusStats.parse(await res.json()),
        expected: {
          videos: await q(
            sql`select count(*) as n from video where corpus_id = 'main' and ingest_status = 'complete'`,
          ),
          creators: await q(
            sql`select count(distinct creator_id) as n from video where corpus_id = 'main' and ingest_status = 'complete'`,
          ),
          signals: await q(
            sql`select count(*) as n from signal s join video v on v.id = s.video_id where v.corpus_id = 'main' and v.ingest_status = 'complete'`,
          ),
          excludedVideos: await q(
            sql`select count(*) as n from video where corpus_id = 'main' and ingest_status = 'excluded'`,
          ),
        },
      };
    });
    expect(body).toMatchObject(expected);
    expect(expected).toEqual({ videos: 2, creators: 2, signals: 3, excludedVideos: 1 });
    expect(body.signalsByType).toEqual({ complaint: 1, wish: 1, workaround: 1, dupe_hunt: 0 });
    expect(body.followerTiers).toEqual({ nano: 1, micro: 0, mid: 1, macro: 0 });
    expect(body.dateRange).toEqual({
      from: "2026-01-05T00:00:00.000Z",
      to: "2026-04-09T00:00:00.000Z",
    });
    expect(body.syntheticVideos).toBe(2);
  });

  it("returns an empty corpus as zeros, not an error", async () => {
    const body = await withTestTx(async () =>
      CorpusStats.parse(await (await GET(apiRequest("/api/v1/corpus/stats"), {})).json()),
    );
    expect(body).toMatchObject({ videos: 0, creators: 0, signals: 0, dateRange: null });
  });

  it("answers 503 STATS_UNAVAILABLE when the database is down", async () => {
    const broken = {
      select: () => {
        throw new Error("connection refused");
      },
    } as unknown as Queryable;
    const res = await withDbOverride(broken, () => GET(apiRequest("/api/v1/corpus/stats"), {}));
    expect(res.status).toBe(503);
    expect((await errorOf(res)).code).toBe("STATS_UNAVAILABLE");
  });
});
