"use client";

import type { CorpusStats } from "@unmet/shared";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCorpusStats } from "@/lib/api/corpus";
import { formatDate, formatNumber } from "@/lib/format";

const PLATFORM_NAMES: Record<keyof CorpusStats["platforms"], string> = {
  tiktok: "TikTok",
  youtube_shorts: "YouTube Shorts",
  instagram_reels: "Instagram Reels",
  synthetic: "Synthetic fixture",
};
const TIER_NAMES: Record<keyof CorpusStats["followerTiers"], string> = {
  nano: "Nano (< 10k)",
  micro: "Micro (10k–100k)",
  mid: "Mid (100k–1M)",
  macro: "Macro (> 1M)",
};
const TYPE_NAMES: Record<keyof CorpusStats["signalsByType"], string> = {
  complaint: "Complaints",
  wish: "Wishes",
  workaround: "Workarounds",
  dupe_hunt: "Dupe hunts",
};

function Mix<K extends string>({
  title,
  counts,
  names,
}: {
  title: string;
  counts: Record<K, number>;
  names: Record<K, string>;
}) {
  const entries = (Object.entries(counts) as [K, number][]).filter(([, n]) => n > 0);
  return (
    <div>
      <dt className="text-label text-muted uppercase">{title}</dt>
      <dd className="mt-1 text-body-sm">
        {entries.length === 0 ? (
          "None yet"
        ) : (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {entries.map(([key, n]) => (
              <li key={key}>
                {names[key]} <span className="font-mono text-mono tabular">{formatNumber(n)}</span>
              </li>
            ))}
          </ul>
        )}
      </dd>
    </div>
  );
}

function Headline({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-label text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-mono text-title tabular">{formatNumber(value)}</dd>
    </div>
  );
}

function Loaded({ stats }: { stats: CorpusStats }) {
  const allSynthetic = stats.videos > 0 && stats.syntheticVideos === stats.videos;
  return (
    <>
      <dl className="grid grid-cols-3 gap-4">
        <Headline label="Videos" value={stats.videos} />
        <Headline label="Creators" value={stats.creators} />
        <Headline label="Signals" value={stats.signals} />
      </dl>
      <dl className="mt-6 grid gap-4">
        <div>
          <dt className="text-label text-muted uppercase">Posted between</dt>
          <dd className="mt-1 text-body-sm">
            {stats.dateRange ? (
              <span className="font-mono text-mono tabular">
                {formatDate(stats.dateRange.from)} – {formatDate(stats.dateRange.to)}
              </span>
            ) : (
              "No videos yet"
            )}
          </dd>
        </div>
        <Mix title="Platforms" counts={stats.platforms} names={PLATFORM_NAMES} />
        <Mix title="Creators by follower count" counts={stats.followerTiers} names={TIER_NAMES} />
        <Mix title="Signals by type" counts={stats.signalsByType} names={TYPE_NAMES} />
        <div>
          <dt className="text-label text-muted uppercase">Excluded at collection</dt>
          <dd className="mt-1 text-body-sm">
            <span className="font-mono text-mono tabular">
              {formatNumber(stats.excludedVideos)}
            </span>{" "}
            videos (likely minors, or marked for exclusion)
          </dd>
        </div>
      </dl>
      {allSynthetic ? (
        <p className="mt-6 rounded-md border border-warning/40 p-3 text-body-sm">
          Every video counted here is a synthetic fixture written for testing. The real corpus has
          not been ingested on this deployment yet, so no finding here is evidence about real
          products.
        </p>
      ) : null}
    </>
  );
}

/** Live numbers from GET /api/v1/corpus/stats; the page around it renders without them (F-14.AC2). */
export function CorpusStatsBlock() {
  const { data, isPending, isError } = useCorpusStats();
  return (
    <section
      aria-labelledby="corpus-stats-heading"
      aria-busy={isPending}
      className="rounded-md border border-border bg-surface p-5"
    >
      <h3 id="corpus-stats-heading" className="sr-only">
        Corpus statistics
      </h3>
      {isPending ? (
        <div className="grid grid-cols-3 gap-4" data-testid="corpus-stats-loading">
          {["videos", "creators", "signals"].map((k) => (
            <div key={k} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <p className="text-body text-muted" role="status">
          Stats unavailable
        </p>
      ) : (
        <Loaded stats={data} />
      )}
    </section>
  );
}
