import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CorpusStatsBlock } from "@/components/CorpusStatsBlock";
import { PipelineDiagram } from "@/components/PipelineDiagram";

export const metadata: Metadata = {
  title: "How it works",
  description: "The data, the method, the formula and the limitations behind Unmet.",
};

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-14 first:mt-0">
      <h2 id={id} className="font-display text-display">
        {title}
      </h2>
      <div className="mt-4 flex flex-col gap-4 text-body">{children}</div>
    </section>
  );
}

const MODEL_VS_SQL: { model: string; sql: string }[] = [
  {
    model: "Transcribes speech and describes keyframes",
    sql: "Every count, share, growth ratio and Evidence Strength score",
  },
  {
    model: "Extracts signals and points each one at its evidence",
    sql: "Checking that cited evidence exists and was posted before as_of",
  },
  {
    model: "Labels clusters of signals in plain language",
    sql: "Clustering itself (greedy, cosine ≥ 0.80, order-deterministic)",
  },
  {
    model: "Decides which needs to investigate and what to read next",
    sql: "Hiding everything posted after the investigation date",
  },
  {
    model: "Writes verdicts, summaries, uncertainties and alternatives",
    sql: "Rejecting any claim whose number is not in its stat snapshot",
  },
  {
    model: "Scores brand fit against a rubric",
    sql: "Matching existing catalogue products by ingredient and category",
  },
  {
    model: "Proposes the cheapest test of demand",
    sql: "Capping verdicts for sponsored, concentrated or viral-skewed needs",
  },
];

const FORMULA = `evidence_strength = 100 × clamp01(
    0.35 × min(1, log10(1 + unique_creators) / log10(31))
  + 0.25 × min(1, (growth_ratio − 0.5) / 2.5)
  + 0.20 × (1 − top_creator_share)
  + 0.10 × (1 − sponsored_share)
  + 0.10 × min(1, 2 × workarounds / total_signals)
)

growth_ratio = (recent + 1) / (prior + 1)
recent, prior = signals in the last two 90-day windows before as_of`;

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-reading px-4 py-16 md:px-6">
      <header className="mb-14">
        <p className="text-label text-muted uppercase">How it works</p>
        <h1 className="mt-2 font-display text-display md:text-display-xl text-balance">
          The data, the method, and where it can be wrong
        </h1>
      </header>

      <Section id="what" title="What Unmet does">
        <p>
          Unmet reads short-form skincare video and looks for demand that no product meets yet. It
          extracts three kinds of signal: complaints (&ldquo;this pills under makeup&rdquo;), wishes
          (&ldquo;why does nobody make&hellip;&rdquo;) and workarounds, where people combine two
          products because no single one does the job. Workarounds are the strongest of the three:
          people have already paid, in money and effort, to solve the problem badly.
        </p>
        <p>
          An investigation groups those signals into needs, sizes each one with deterministic
          statistics, tries to disprove it, checks how well it fits a specific brand&rsquo;s
          catalogue, and recommends the cheapest experiment that would confirm or refute it before
          anyone formulates a product. Every claim links to the moment in a video that supports it.
        </p>
      </Section>

      <Section id="corpus" title="The corpus">
        <p>
          Videos are collected by hand from public posts using fixed search queries and date
          buckets, decided before any collection and recorded against each video with a provenance
          note. Nothing is scraped. Media and keyframes are stored privately and never served here:
          evidence is shown as a short excerpt with a link to the original post.
        </p>
        <CorpusStatsBlock />
        <p className="text-body-sm text-muted">
          Creators who appear to be under 18 are excluded at collection. Comment authors are stored
          only as salted hashes. A creator can ask for their videos to be removed by{" "}
          <a
            href="https://github.com/rayhankhilji/Unmet/issues"
            className="rounded-sm text-info underline underline-offset-4"
          >
            opening an issue
          </a>
          ; removal deletes the videos and everything derived from them.
        </p>
      </Section>

      <Section id="pipeline" title="Pipeline">
        <PipelineDiagram />
      </Section>

      <Section id="model-vs-sql" title="What the model does, and what it doesn't">
        <p>
          Language models read, label and argue. They never produce a number that reaches this
          interface: every statistic comes from a query and is stored as an immutable snapshot that
          you can inspect.
        </p>
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full border-collapse text-left text-body-sm">
            <caption className="sr-only">
              Division of work between the model and the database
            </caption>
            <thead className="bg-surface">
              <tr>
                <th
                  scope="col"
                  className="w-1/2 border-b border-border p-3 text-label text-muted uppercase"
                >
                  The model
                </th>
                <th
                  scope="col"
                  className="w-1/2 border-b border-border p-3 text-label text-muted uppercase"
                >
                  SQL and code
                </th>
              </tr>
            </thead>
            <tbody>
              {MODEL_VS_SQL.map((row) => (
                <tr key={row.model} className="border-b border-border last:border-b-0">
                  <td className="p-3 align-top">{row.model}</td>
                  <td className="p-3 align-top">{row.sql}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="formula" title="Evidence Strength">
        <p>
          A single 0–100 score for ranking needs, weighted towards breadth (many creators), growth,
          and spread (no single creator or sponsor dominating). The weights are set by hand, not
          learned: there aren&rsquo;t enough known outcomes yet to fit them. The formula is
          versioned; this is <code className="text-mono">es@1</code>.
        </p>
        <section
          // biome-ignore lint/a11y/noNoninteractiveTabindex: scrolls sideways on narrow screens, so it must be reachable by keyboard (WCAG 2.1.1)
          tabIndex={0}
          aria-label="Evidence Strength formula, es@1"
          className="overflow-x-auto rounded-md border border-border bg-surface p-4 focus-visible:focus-ring"
        >
          <pre className="font-mono text-mono">
            <code>{FORMULA}</code>
          </pre>
        </section>
        <p className="text-body-sm text-muted">
          Flags: concentrated when one creator posts half or more of the signals; viral skew when
          one video holds 60% of the views; sponsored-heavy at 40% sponsored; declining when the
          growth ratio is under 0.8; thin under 6 signals. Concentrated and sponsored-heavy needs
          are capped at &ldquo;weak&rdquo; unless the investigation records an override that cites
          evidence.
        </p>
      </Section>

      <Section id="limitations" title="Limitations">
        <ul className="flex list-disc flex-col gap-3 pl-5">
          <li>
            <strong className="font-semibold">Small corpus.</strong> Hundreds of videos, not
            millions. Sizes are directional, and a need with a dozen signals can move a lot with a
            few more.
          </li>
          <li>
            <strong className="font-semibold">Selection bias.</strong> The queries were fixed before
            collection, but they were still chosen by one person. Needs that nobody searches for in
            these terms won&rsquo;t appear.
          </li>
          <li>
            <strong className="font-semibold">The model may already know the answer.</strong> In a
            backtest the model might remember which products launched. Gold answers never enter a
            prompt, verdicts are gated by statistics computed only from earlier data, and backtest
            scores are reported separately for outcomes after the model&rsquo;s training cutoff.
          </li>
          <li>
            <strong className="font-semibold">Tone is hard.</strong> Sarcasm detection misses some
            cases; sarcastic signals are excluded from sizing when they are caught, and the miss
            rate is published on the evals page.
          </li>
          <li>
            <strong className="font-semibold">Hand-set weights.</strong> Evidence Strength ranks
            needs; it does not predict launches. Its weights will change as outcomes are recorded,
            and every change gets a new version.
          </li>
          <li>
            <strong className="font-semibold">One category, one language.</strong> English-language
            skincare only.
          </li>
        </ul>
      </Section>

      <Section id="plot" title="How this would sit on a production video index">
        <p>
          Unmet was built as an independent prototype for an application to Plot, which already
          indexes what creators say, show and use across short-form video. On top of an index like
          that, the ingest pipeline here would disappear: the agent&rsquo;s tools become thin
          adapters over the existing index, and the statistics move to the warehouse. What carries
          over is the method: as-of discipline so backtests are honest, deterministic numbers, a
          mandatory sceptic pass, and an eval harness that scores the system against what actually
          happened.
        </p>
      </Section>
    </article>
  );
}
