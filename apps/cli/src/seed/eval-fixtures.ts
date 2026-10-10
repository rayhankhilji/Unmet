import type { Tx } from "@unmet/db";
import { evalCaseResult, evalRun } from "@unmet/db/schema";
import type { EvalSuite } from "@unmet/shared";

// E2E only (`pnpm db:seed --env e2e`): one run per suite with passing and failing cases so
// the evals pages can be tested. These are UI fixtures, not measurements; their notes say so.

export const E2E_EVAL_NOTE = "E2E fixture — not a real eval run.";

type CaseSpec = { caseId: string; system: "unmet" | "baseline"; passed: boolean; reason?: string };
type RunSpec = {
  suite: EvalSuite;
  metrics: Record<string, unknown>;
  thresholds: Record<string, unknown>;
  passed: boolean;
  cases: CaseSpec[];
};

const RUNS: RunSpec[] = [
  {
    suite: "extraction",
    metrics: {
      macroF1: 0.78,
      workaroundPrecision: 0.83,
      sponsoredRecall: 0.92,
      sarcasmRecall: 0.55,
    },
    thresholds: {
      macroF1: 0.75,
      workaroundPrecision: 0.8,
      sponsoredRecall: 0.9,
      sarcasmRecall: 0.6,
    },
    passed: true,
    cases: [
      { caseId: "gold-001", system: "unmet", passed: true },
      { caseId: "gold-002", system: "unmet", passed: false, reason: "Missed a sarcastic wish" },
    ],
  },
  {
    suite: "traps",
    metrics: { passed: 5, total: 6, baselinePassed: 2 },
    thresholds: { passed: 5 },
    passed: true,
    cases: [
      { caseId: "trap-1", system: "unmet", passed: true },
      {
        caseId: "trap-4",
        system: "unmet",
        passed: false,
        reason: "Sarcastic wishes recorded as emerging",
      },
      { caseId: "trap-4", system: "baseline", passed: false, reason: "Recorded as strong" },
    ],
  },
  {
    suite: "backtest",
    metrics: { hitAt5: 0.67, baselineHitAt5: 0.33, fpRate: 0.2, baselineFpRate: 0.4 },
    thresholds: { hitAt5: 0.6, hitAt5OverBaseline: 0.2, fpRate: 0.25 },
    passed: true,
    cases: [
      { caseId: "bt-01", system: "unmet", passed: true },
      { caseId: "bt-02", system: "unmet", passed: false, reason: "Gold need ranked 6th" },
    ],
  },
  {
    suite: "comparison",
    metrics: {
      citationPrecision: 0.88,
      baselineCitationPrecision: 0.61,
      unsupportedNumberRate: 0,
      baselineUnsupportedNumberRate: 0.18,
    },
    thresholds: { citationPrecision: 0.9, unsupportedNumberRate: 0 },
    passed: false,
    cases: [
      { caseId: "cmp-01", system: "unmet", passed: true },
      {
        caseId: "cmp-02",
        system: "unmet",
        passed: false,
        reason: "Cited a frame that shows a different product",
      },
    ],
  },
];

export async function seedEvalFixtures(tx: Tx, nextId: () => string): Promise<number> {
  for (const [i, run] of RUNS.entries()) {
    const evalRunId = nextId();
    const startedAt = new Date(Date.UTC(2026, 8, 7, 9 + i));
    await tx.insert(evalRun).values({
      id: evalRunId,
      suite: run.suite,
      gitSha: "0000000",
      modelIds: { agent: "claude-sonnet-5-5", judge: "claude-opus-5-5" },
      promptVersions: { "agent.system": "1", "extract.signals": "1" },
      formulaVersion: "es@1",
      startedAt,
      finishedAt: new Date(startedAt.getTime() + 20 * 60_000),
      metrics: run.metrics,
      thresholds: run.thresholds,
      passed: run.passed,
      notes: E2E_EVAL_NOTE,
    });
    await tx.insert(evalCaseResult).values(
      run.cases.map((c) => ({
        id: nextId(),
        evalRunId,
        caseId: c.caseId,
        system: c.system,
        passed: c.passed,
        expected: { verdict: "weak" },
        actual: { verdict: c.passed ? "weak" : "emerging" },
        scores: {},
        failureReason: c.reason ?? null,
      })),
    );
  }
  return RUNS.length;
}
