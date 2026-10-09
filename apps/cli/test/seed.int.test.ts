import { fileURLToPath } from "node:url";
import {
  brand,
  catalogProduct,
  claim,
  claimEvidence,
  creator,
  evalRun,
  finding,
  investigation,
  need,
  runEvent,
  signal,
  signalEvidence,
  statSnapshot,
  video,
} from "@unmet/db/schema";
import { withTestTx } from "@unmet/db/testing";
import type { StatSnapshotStats } from "@unmet/shared";
import { count, eq, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { seed } from "../src/seed/seed.ts";

const root = fileURLToPath(new URL("../../..", import.meta.url));

describe("pnpm db:seed", () => {
  it("loads the documented fixture scenario (TESTING_GUIDE §4.2)", async () => {
    const counts = await withTestTx(async (tx) => {
      const summary = await seed(tx, { root, e2e: false });
      const n = async (table: PgTable) => (await tx.select({ n: count() }).from(table))[0]?.n;
      const statuses = await tx
        .select({
          status: investigation.status,
          visibility: investigation.visibility,
          findings: count(finding.id),
        })
        .from(investigation)
        .leftJoin(finding, eq(finding.investigationId, investigation.id))
        .groupBy(investigation.id)
        .orderBy(investigation.createdAt);
      const runningEvents = await tx
        .select({ n: count() })
        .from(runEvent)
        .innerJoin(investigation, eq(investigation.id, runEvent.investigationId))
        .where(eq(investigation.status, "running"));
      const capped = await tx
        .select({ n: count() })
        .from(finding)
        .where(
          sql`${finding.verdict} <> ${finding.agentVerdict} and ${finding.investigationId} = ${summary.investigations.published}`,
        );
      return {
        brands: await n(brand),
        products: await n(catalogProduct),
        creators: await n(creator),
        videos: await n(video),
        signals: await n(signal),
        evalRuns: await n(evalRun),
        types: (await tx.selectDistinct({ t: signal.type }).from(signal)).map((r) => r.t).sort(),
        statuses,
        runningEvents: runningEvents[0]?.n,
        capped: capped[0]?.n,
      };
    });
    expect(counts).toEqual({
      brands: 1,
      products: 16,
      creators: 9,
      videos: 20,
      signals: 46,
      evalRuns: 0,
      types: ["complaint", "dupe_hunt", "wish", "workaround"],
      statuses: [
        { status: "completed", visibility: "published", findings: 4 },
        { status: "failed", visibility: "private", findings: 2 },
        { status: "running", visibility: "private", findings: 0 },
      ],
      runningEvents: 6,
      capped: 1,
    });
  });

  it("keeps run totals equal to the sum of their events (F-10.AC1)", async () => {
    const rows = await withTestTx(async (tx) => {
      await seed(tx, { root, e2e: false });
      return tx
        .select({
          cost: investigation.costUsd,
          eventCost: sql<string>`coalesce(sum(${runEvent.costUsd}), 0)`,
          iterations: investigation.iterations,
          modelCalls: sql<string>`count(*) filter (where ${runEvent.type} = 'model_call')`,
        })
        .from(investigation)
        .leftJoin(runEvent, eq(runEvent.investigationId, investigation.id))
        .groupBy(investigation.id);
    });
    for (const r of rows) {
      expect(r.cost).toBeCloseTo(Number(r.eventCost), 2);
      expect(r.iterations).toBe(Number(r.modelCalls));
    }
  });

  it("cites only evidence from the finding's need, posted before as_of, with numbers from the snapshot", async () => {
    const result = await withTestTx(async (tx) => {
      await seed(tx, { root, e2e: false });
      const claims = await tx
        .select({ id: claim.id, text: claim.text, stats: statSnapshot.stats })
        .from(claim)
        .leftJoin(statSnapshot, eq(statSnapshot.id, claim.statSnapshotId));
      const uncited = await tx.execute(sql`
        select c.id from claim c where not exists (select 1 from claim_evidence ce where ce.claim_id = c.id)`);
      const foreign = await tx.execute(sql`
        select ce.claim_id from ${claimEvidence} ce
        join ${claim} c on c.id = ce.claim_id
        join ${finding} f on f.id = c.finding_id
        join ${investigation} i on i.id = f.investigation_id
        join ${signalEvidence} se on se.id = ce.signal_evidence_id
        join ${signal} s on s.id = se.signal_id
        join ${video} v on v.id = s.video_id
        where v.posted_at >= i.as_of
           or not exists (select 1 from need_signal ns where ns.need_id = f.need_id and ns.signal_id = s.id)`);
      return { claims, uncited: uncited.rows.length, foreign: foreign.rows.length };
    });
    expect(result.uncited).toBe(0);
    expect(result.foreign).toBe(0);
    for (const c of result.claims) {
      const numbers = [...c.text.matchAll(/\d+(\.\d+)?%?/g)].map((m) => m[0]);
      if (numbers.length === 0) continue;
      const stats = c.stats as StatSnapshotStats;
      const allowed = new Set(snapshotNumbers(stats));
      for (const raw of numbers) expect(allowed, `${raw} in "${c.text}"`).toContain(raw);
    }
  });

  it("is repeatable and adds eval fixtures only for --env e2e", async () => {
    const counts = await withTestTx(async (tx) => {
      await seed(tx, { root, e2e: false });
      await seed(tx, { root, e2e: true });
      const [videos] = await tx.select({ n: count() }).from(video);
      const [runs] = await tx.select({ n: count() }).from(investigation);
      const [needs] = await tx.select({ n: count() }).from(need);
      const [evals] = await tx.select({ n: count() }).from(evalRun);
      return { videos: videos?.n, runs: runs?.n, needs: needs?.n, evals: evals?.n };
    });
    expect(counts).toEqual({ videos: 20, runs: 3, needs: 15, evals: 4 });
  });
});

/** Every way a snapshot value may appear in claim text: integers as-is, shares as whole %. */
function snapshotNumbers(stats: StatSnapshotStats): string[] {
  const out: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "number") {
      out.push(String(value));
      if (value > 0 && value <= 1) out.push(`${Math.round(value * 100)}%`);
    } else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(stats);
  return out;
}
