import { getCorpusStats } from "@unmet/db";
import { AppError, type CorpusStats, json } from "@unmet/shared";
import { getDb } from "@/server/db";
import { errorFields, log } from "@/server/log";
import { route } from "@/server/route";

export const dynamic = "force-dynamic";

/** Public corpus numbers for /about (F-14). 503 STATS_UNAVAILABLE when the database is down. */
export const GET = route(async (req) => {
  let stats: Awaited<ReturnType<typeof getCorpusStats>>;
  try {
    stats = await getCorpusStats(getDb());
  } catch (error) {
    log.warn("corpus stats unavailable", {
      requestId: req.headers.get("x-request-id"),
      ...errorFields(error),
    });
    throw new AppError("STATS_UNAVAILABLE");
  }
  const body: CorpusStats = {
    ...stats,
    dateRange: stats.dateRange
      ? { from: stats.dateRange.from.toISOString(), to: stats.dateRange.to.toISOString() }
      : null,
  };
  return json(body, {
    headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
});
