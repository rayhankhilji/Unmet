import type { Tx } from "@unmet/db";
import {
  brandFit,
  claim,
  claimEvidence,
  demandTest,
  finding,
  investigation,
  need,
  needSignal,
  runEvent,
  statSnapshot,
} from "@unmet/db/schema";
import { type RunStatus, type StatSnapshotStats, VERDICTS, type Visibility } from "@unmet/shared";
import { mean } from "@unmet/shared/testing";
import { computeSnapshotStats, FORMULA_VERSION } from "@unmet/stats";
import { eq } from "drizzle-orm";
import type { SeededSignal } from "./corpus.ts";
import {
  demoFindings,
  type EvidencePicker,
  type FindingSpec,
  failedRunFindings,
} from "./demo-findings.ts";
import { EventLog } from "./events.ts";
import { NEED_KEYS, type NeedKey } from "./fixture-schema.ts";
import { NEED_META } from "./need-meta.ts";

export const DEFAULT_QUESTION =
  "Which unmet needs in skincare could this brand credibly launch against next?";

type RunContext = {
  tx: Tx;
  nextId: () => string;
  brandId: string;
  signals: SeededSignal[];
  products: Map<string, string>; // catalogue name → id
};

type NeedSet = {
  ids: Record<NeedKey, string>;
  snapshotIds: Record<NeedKey, string>;
  stats: Record<NeedKey, StatSnapshotStats>;
};

/** Clustering result at run start: one need per fixture cluster, sized as of `asOf`. */
async function insertNeeds(ctx: RunContext, investigationId: string, asOf: Date): Promise<NeedSet> {
  const set = { ids: {}, snapshotIds: {}, stats: {} } as NeedSet;
  for (const key of NEED_KEYS) {
    const all = ctx.signals.filter((s) => s.need === key);
    const members = all.filter((s) => s.postedAt < asOf && s.stance !== "sarcastic");
    if (members.length < 3)
      throw new Error(`Fixture need ${key} has < 3 signals before ${asOf.toISOString()}`);
    const needId = ctx.nextId();
    const snapshotId = ctx.nextId();
    const stats = computeSnapshotStats(all, asOf);
    await ctx.tx.insert(need).values({
      id: needId,
      investigationId,
      label: NEED_META[key].label,
      description: NEED_META[key].description,
      centroid: mean(members.map((s) => s.embedding)),
      signalCount: members.length,
    });
    await ctx.tx.insert(needSignal).values(members.map((s) => ({ needId, signalId: s.id })));
    await ctx.tx.insert(statSnapshot).values({
      id: snapshotId,
      needId,
      asOf,
      windowDays: stats.windowDays,
      formulaVersion: FORMULA_VERSION,
      stats,
    });
    set.ids[key] = needId;
    set.snapshotIds[key] = snapshotId;
    set.stats[key] = stats;
  }
  return set;
}

function evidencePicker(signals: SeededSignal[], asOf: Date): EvidencePicker {
  return (key, count, skip = 0) => {
    const pool = signals
      .filter((s) => s.need === key && s.postedAt < asOf && s.stance !== "sarcastic")
      .sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime() || a.id.localeCompare(b.id))
      .flatMap((s) => s.evidenceIds);
    const picked = pool.slice(skip % pool.length, (skip % pool.length) + count);
    if (picked.length === 0) throw new Error(`No evidence available for ${key}`);
    return picked;
  };
}

const verdictRank = (v: FindingSpec["verdict"]) => VERDICTS.indexOf(v);

async function insertFindings(
  ctx: RunContext,
  investigationId: string,
  needs: NeedSet,
  specs: FindingSpec[],
) {
  const ordered = [...specs].sort(
    (a, b) =>
      verdictRank(a.verdict) - verdictRank(b.verdict) ||
      needs.stats[b.need].evidenceStrength - needs.stats[a.need].evidenceStrength,
  );
  for (const [i, spec] of ordered.entries()) {
    const findingId = ctx.nextId();
    await ctx.tx.insert(finding).values({
      id: findingId,
      investigationId,
      needId: needs.ids[spec.need],
      verdict: spec.verdict,
      agentVerdict: spec.agentVerdict,
      cappedBy: spec.cappedBy,
      confidence: spec.confidence,
      summary: spec.summary,
      uncertainties: spec.uncertainties,
      alternativeExplanations: spec.alternativeExplanations,
      scepticChecked: true,
      rank: i + 1,
    });
    for (const [ordinal, c] of spec.claims.entries()) {
      const claimId = ctx.nextId();
      await ctx.tx.insert(claim).values({
        id: claimId,
        findingId,
        kind: c.kind,
        text: c.text,
        statSnapshotId: c.usesSnapshot ? needs.snapshotIds[spec.need] : null,
        ordinal: ordinal + 1,
      });
      await ctx.tx
        .insert(claimEvidence)
        .values(
          [...new Set(c.evidence)].map((signalEvidenceId) => ({ claimId, signalEvidenceId })),
        );
    }
    await ctx.tx.insert(brandFit).values({
      id: ctx.nextId(),
      findingId,
      scores: spec.fit.scores,
      existingCoverage: spec.fit.coverage.map((name) => {
        const id = ctx.products.get(name);
        if (!id) throw new Error(`Fixture fit cites unknown catalogue product ${name}`);
        return id;
      }),
      rating: spec.fit.rating,
    });
    if (spec.demandTest) {
      await ctx.tx.insert(demandTest).values({ id: ctx.nextId(), findingId, ...spec.demandTest });
    }
  }
  return ordered;
}

function traceFor(needs: NeedSet, specs: FindingSpec[], ending: "finish" | "timeout"): EventLog {
  const log = new EventLog();
  log.add("status", "Investigation started", { status: "running" });
  log.add("note", `Clustered signals into ${NEED_KEYS.length} needs`, {
    needIds: Object.values(needs.ids),
  });
  log.modelCall("Planned the survey");
  log.tool(
    "list_needs",
    "Listed needs by evidence strength",
    { sort: "evidence_strength", limit: 10 },
    {
      items: NEED_KEYS.map((k) => ({
        needId: needs.ids[k],
        label: NEED_META[k].label,
        snapshotId: needs.snapshotIds[k],
      })),
    },
  );
  for (const spec of specs) {
    const label = NEED_META[spec.need].label;
    const needId = needs.ids[spec.need];
    log.modelCall(`Chose to investigate: ${label}`);
    log.tool(
      "get_need_stats",
      `Pulled stats: ${label}`,
      { needId },
      { snapshotId: needs.snapshotIds[spec.need] },
    );
    log.tool(
      "search_signals",
      `Searched signals: ${label}`,
      { query: NEED_META[spec.need].description.slice(0, 60), needId, limit: 10 },
      { count: spec.claims.length },
    );
    log.tool(
      "find_counterevidence",
      `Looked for counterevidence: ${label}`,
      { needId },
      { flags: needs.stats[spec.need].flags },
    );
    log.add("note", `Sceptic pass: ${label}`, { sceptic: needId });
    log.tool(
      "assess_brand_fit",
      `Assessed brand fit: ${label}`,
      { needId },
      { rating: spec.fit.rating },
    );
    log.modelCall(`Weighed the evidence: ${label}`);
    log.tool(
      "record_finding",
      `Recorded finding: ${label}`,
      { needId, verdict: spec.agentVerdict },
      { storedVerdict: spec.verdict, cappedBy: spec.cappedBy },
    );
    log.add(
      "finding_recorded",
      `${spec.verdict === spec.agentVerdict ? "Recorded" : "Capped"} ${spec.verdict}: ${label}`,
      { needId, verdict: spec.verdict, agentVerdict: spec.agentVerdict },
    );
    if (spec.demandTest) {
      log.tool(
        "propose_demand_test",
        `Proposed demand test: ${label}`,
        { needId, testType: spec.demandTest.testType },
        { ok: true },
      );
    }
  }
  if (ending === "finish") {
    log.modelCall("Wrote the summary");
    log.tool("finish", "Finished the investigation", { summary: "See findings." }, { ok: true });
    log.add("status", "Investigation completed", { status: "completed" });
  } else {
    log.modelCall("Started on the next need");
    log.add("error", "Stopped: wall-clock limit reached", { code: "TIMEOUT" });
    log.add("status", "Investigation failed", { status: "failed", errorCode: "TIMEOUT" });
  }
  return log;
}

async function insertEvents(
  tx: Tx,
  nextId: () => string,
  investigationId: string,
  log: EventLog,
  startedAt: Date,
) {
  let at = startedAt.getTime();
  for (const [i, e] of log.events.entries()) {
    at += e.latencyMs + 250;
    await tx
      .insert(runEvent)
      .values({ id: nextId(), investigationId, seq: i + 1, ...e, createdAt: new Date(at) });
  }
  return new Date(at);
}

type RunSpec = {
  status: RunStatus;
  visibility: Visibility;
  asOf: Date;
  startedAt: Date;
  errorCode?: string;
  summary?: string;
  findings: (stats: Record<NeedKey, StatSnapshotStats>, pick: EvidencePicker) => FindingSpec[];
};

async function seedRun(ctx: RunContext, spec: RunSpec): Promise<string> {
  const investigationId = ctx.nextId();
  await ctx.tx.insert(investigation).values({
    id: investigationId,
    kind: "agent",
    origin: "owner",
    brandId: ctx.brandId,
    question: DEFAULT_QUESTION,
    asOf: spec.asOf,
    status: "running",
    visibility: spec.visibility,
    claimedBy: "fixture-worker",
    startedAt: spec.startedAt,
    heartbeatAt: spec.startedAt,
    modelIds: { agent: "claude-sonnet-5-5", extract: "claude-haiku-5-5", judge: "claude-opus-5-5" },
    promptVersions: { "agent.system": "1", "need.label": "1", "fit.score": "1" },
    formulaVersion: FORMULA_VERSION,
    createdAt: spec.startedAt,
    updatedAt: spec.startedAt,
  });
  const needs = await insertNeeds(ctx, investigationId, spec.asOf);
  const specs = spec.findings(needs.stats, evidencePicker(ctx.signals, spec.asOf));
  const ordered = await insertFindings(ctx, investigationId, needs, specs);

  const log =
    spec.status === "running"
      ? runningTrace(needs)
      : traceFor(needs, ordered, spec.status === "failed" ? "timeout" : "finish");
  const lastAt = await insertEvents(ctx.tx, ctx.nextId, investigationId, log, spec.startedAt);
  const totals = log.totals();
  const terminal = spec.status !== "running";
  await ctx.tx
    .update(investigation)
    .set({
      status: spec.status,
      ...totals,
      errorCode: spec.errorCode ?? null,
      summary: spec.summary ?? null,
      heartbeatAt: lastAt,
      finishedAt: terminal ? lastAt : null,
      updatedAt: lastAt,
    })
    .where(eq(investigation.id, investigationId));
  return investigationId;
}

function runningTrace(needs: NeedSet): EventLog {
  const log = new EventLog();
  log.add("status", "Investigation started", { status: "running" });
  log.add("note", `Clustered signals into ${NEED_KEYS.length} needs`, {
    needIds: Object.values(needs.ids),
  });
  log.modelCall("Planned the survey");
  log.tool(
    "list_needs",
    "Listed needs by evidence strength",
    { sort: "evidence_strength", limit: 10 },
    { count: NEED_KEYS.length },
  );
  log.modelCall("Chose to investigate: Sunscreen that doesn't dry out skin");
  return log;
}

/** Three runs for UI work without API keys (TESTING_GUIDE §4.2). */
export async function seedRuns(ctx: RunContext) {
  const published = await seedRun(ctx, {
    status: "completed",
    visibility: "published",
    asOf: new Date("2026-09-01T00:00:00Z"),
    startedAt: new Date("2026-09-06T10:00:00Z"),
    summary:
      "Five needs surveyed. Moisturising sunscreen is the strongest and fits the brand well; sunscreen pilling is emerging. The vitamin C dupe need was capped because one creator drives most of it, and gentle retinol is fading.",
    findings: demoFindings,
  });
  const failed = await seedRun(ctx, {
    status: "failed",
    visibility: "private",
    asOf: new Date("2026-07-01T00:00:00Z"),
    startedAt: new Date("2026-09-06T11:00:00Z"),
    errorCode: "TIMEOUT",
    findings: failedRunFindings,
  });
  // Clustering lands before the loop, so a run in progress already has needs but no
  // findings: exactly what the workspace shows mid-run.
  const running = await seedRun(ctx, {
    status: "running",
    visibility: "private",
    asOf: new Date("2026-09-01T00:00:00Z"),
    startedAt: new Date("2026-09-06T12:00:00Z"),
    findings: () => [],
  });
  return { published, failed, running };
}
