import { cosine } from "@unmet/shared/testing";
import { count, eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { resolveDb } from "../src/context.ts";
import { claim, finding, need, signal, video } from "../src/schema/index.ts";
import {
  makeInvestigation,
  makeNeedWithSignals,
  makeSignal,
  makeVideo,
  withTestTx,
} from "../src/testing/index.ts";

describe("test harness", () => {
  it("builds a need with signals clustered around one centre", async () => {
    const result = await withTestTx(async (tx) => {
      const { need: created, signals } = await makeNeedWithSignals(4, { similarity: 0.9 });
      const [stored] = await tx.select().from(need).where(eq(need.id, created.id));
      return { stored, signals };
    });
    expect(result.stored?.signalCount).toBe(4);
    for (const s of result.signals) {
      expect(cosine(s.embedding ?? [], result.stored?.centroid ?? [])).toBeGreaterThan(0.9);
    }
  });

  it("rolls back everything written inside withTestTx", async () => {
    await withTestTx(async () => {
      await makeSignal();
    });
    const remaining = await withTestTx(async (tx) => {
      const [row] = await tx.select({ n: count() }).from(video);
      return row?.n;
    });
    expect(remaining).toBe(0);
  });

  it("lets code that resolves the database join the test transaction", async () => {
    const seen = await withTestTx(async () => {
      const v = await makeVideo();
      const db = resolveDb(() => {
        throw new Error("should not fall back to the pool inside a test transaction");
      });
      const [row] = await db.select().from(video).where(eq(video.id, v.id));
      return row?.id === v.id;
    });
    expect(seen).toBe(true);
  });

  it("enforces the claim-number rule in the database (ADR-003)", async () => {
    await expect(
      withTestTx(async (tx) => {
        const run = await makeInvestigation();
        const { need: n } = await makeNeedWithSignals(3, { investigationId: run.id });
        const [f] = await tx
          .insert(finding)
          .values({
            investigationId: run.id,
            needId: n.id,
            verdict: "weak",
            agentVerdict: "weak",
            confidence: 0.4,
            summary: "Thin evidence.",
            uncertainties: ["Few signals"],
            alternativeExplanations: ["Seasonal"],
            scepticChecked: true,
            rank: 1,
          })
          .returning();
        await tx.insert(claim).values({
          findingId: f?.id ?? "",
          kind: "support",
          text: "Signals rose from 6 to 17",
          ordinal: 1,
        });
      }),
    ).rejects.toMatchObject({ cause: { constraint: "claim_number_needs_snapshot" } });
  });

  it("rejects signals whose need statement is too short", async () => {
    await expect(
      withTestTx(async () => {
        await makeSignal({ needStatement: "too short" });
      }),
    ).rejects.toMatchObject({ cause: { constraint: "signal_need_statement_length" } });
  });

  it("generates tsvectors for keyword search", async () => {
    const matches = await withTestTx(async (tx) => {
      await makeSignal({ needStatement: "a moisturiser that layers under sunscreen" });
      const rows = await tx
        .select({ id: signal.id })
        .from(signal)
        .where(sql`${signal.tsv} @@ plainto_tsquery('english', 'layering moisturisers')`);
      return rows.length;
    });
    expect(matches).toBe(1);
  });
});
