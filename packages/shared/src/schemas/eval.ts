import { z } from "zod";
import { EvalSuite } from "../enums.ts";
import { Iso } from "./common.ts";

export const EvalRunsQuery = z.object({ suite: EvalSuite.optional() });

export const EvalRunSummary = z.object({
  id: z.uuid(),
  suite: EvalSuite,
  gitSha: z.string(),
  startedAt: Iso,
  finishedAt: Iso.nullable(),
  passed: z.boolean(),
  metrics: z.record(z.string(), z.unknown()),
  thresholds: z.record(z.string(), z.unknown()),
  promptVersions: z.record(z.string(), z.string()),
  stale: z.boolean(),
});
export type EvalRunSummary = z.infer<typeof EvalRunSummary>;
