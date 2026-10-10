// The pipeline as an ordered flow. HTML rather than SVG so it reflows to one column on a
// phone and reads naturally to a screen reader.

const STAGES = [
  {
    stage: "Collect",
    detail: "Fixed search queries and date buckets, recorded per video. No scraping.",
  },
  {
    stage: "Ingest",
    detail: "Speech to timed transcript, 4–8 keyframes described, comments with hashed authors.",
  },
  {
    stage: "Extract",
    detail:
      "Complaints, wishes, workarounds and dupe hunts, each with the exact evidence it rests on.",
  },
  {
    stage: "Cluster at as_of",
    detail:
      "Signals posted before the investigation date grouped into needs. Nothing later is visible.",
  },
  {
    stage: "Size",
    detail:
      "Counts, growth, concentration and Evidence Strength computed in SQL and frozen as snapshots.",
  },
  {
    stage: "Investigate",
    detail:
      "The agent chooses what to look at, argues against each need, scores brand fit and proposes a test.",
  },
  {
    stage: "Validate",
    detail: "Every claim must cite evidence before as_of; every number must exist in its snapshot.",
  },
] as const;

export function PipelineDiagram() {
  return (
    <ol className="grid gap-2 sm:grid-cols-2">
      {STAGES.map((s, i) => (
        <li key={s.stage} className="flex gap-3 rounded-md border border-border bg-surface p-3">
          <span className="font-mono text-mono text-muted tabular" aria-hidden>
            {String(i + 1).padStart(2, "0")}
          </span>
          <div>
            <p className="text-heading">{s.stage}</p>
            <p className="text-body-sm text-muted">{s.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
