import { AppError, CreateInvestigationInput, parseJsonBody } from "@unmet/shared";
import { env } from "@/server/env";
import { requirePasscode } from "@/server/policy";
import { route } from "@/server/route";

export const dynamic = "force-dynamic";

/**
 * Starts a live investigation. Checks run in the documented order (ARCHITECTURE §8):
 * schema → passcode → LIVE_RUNS_ENABLED → per-IP limit → concurrency → daily budget.
 * The last three, and the insert itself, arrive with run creation in P4.T6; until then
 * creation stays closed after the passcode check.
 */
export const POST = route(async (req) => {
  await parseJsonBody(req, CreateInvestigationInput);
  requirePasscode(req);
  if (!env.LIVE_RUNS_ENABLED) throw new AppError("LIVE_RUNS_DISABLED");
  throw new AppError("LIVE_RUNS_DISABLED", "Live runs open once the worker is deployed.");
});
