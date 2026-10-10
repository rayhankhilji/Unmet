import type {
  ClaimKind,
  CostBand,
  FitRating,
  StatSnapshotStats,
  TestType,
  Verdict,
} from "@unmet/shared";
import type { NeedKey } from "./fixture-schema.ts";

// What the seeded investigations "found". Every number in a claim is read from the need's
// stat snapshot, so the fixtures obey the same rule as real runs (ADR-003, G-AI-05).

export type ClaimSpec = {
  kind: ClaimKind;
  text: string;
  usesSnapshot: boolean;
  evidence: string[];
};

export type FitSpec = {
  rating: FitRating;
  scores: Record<
    "categoryAdjacency" | "ingredientExpertise" | "positioning" | "coverageGap",
    { score: number; reason: string }
  >;
  coverage: string[]; // catalogue product names
};

export type DemandTestSpec = {
  testType: TestType;
  hypothesis: string;
  audience: string;
  activation: string;
  primaryMetric: string;
  successThreshold: string;
  stopCondition: string;
  durationDays: number;
  costBand: CostBand;
  predictedProbability: number;
};

export type FindingSpec = {
  need: NeedKey;
  agentVerdict: Verdict;
  verdict: Verdict;
  cappedBy: string[];
  confidence: number;
  summary: string;
  uncertainties: string[];
  alternativeExplanations: string[];
  claims: ClaimSpec[];
  fit: FitSpec;
  demandTest: DemandTestSpec | null;
};

/** Evidence IDs for a need, newest signals first; `skip` moves past ones already cited. */
export type EvidencePicker = (need: NeedKey, count: number, skip?: number) => string[];

const pct = (share: number) => Math.round(share * 100);

const score = (s: number, reason: string) => ({ score: s, reason });

function drySunscreen(s: StatSnapshotStats, pick: EvidencePicker, verdict: Verdict): FindingSpec {
  return {
    need: "dry-sunscreen",
    agentVerdict: verdict,
    verdict,
    cappedBy: [],
    confidence: verdict === "strong" ? 0.72 : 0.58,
    summary:
      "Creators across skin types describe sunscreen leaving skin tight by midday, and most of them have built a workaround: mixing moisturiser, oil or serum into SPF, or layering and waiting. The workaround volume is the strongest signal that no single product does both jobs.",
    uncertainties: [
      "The recent window is summer, when sunscreen use and dryness complaints both rise.",
      "Signals come from a small synthetic fixture corpus, so the sizes are illustrative.",
    ],
    alternativeExplanations: [
      "Some creators mix products because of texture preference rather than dryness.",
      "A dermatologist creator's advice may be amplifying the mixing trend rather than reflecting independent demand.",
    ],
    claims: [
      {
        kind: "support",
        text: `Signals rose from ${s.priorCount} in the prior ${s.windowDays} days to ${s.recentCount} in the most recent ${s.windowDays}.`,
        usesSnapshot: true,
        evidence: pick("dry-sunscreen", 2),
      },
      {
        kind: "support",
        text: `${s.typeMix.workaround} of the ${s.totalCount} signals are workarounds: people combining products because no single one does the job.`,
        usesSnapshot: true,
        evidence: pick("dry-sunscreen", 2, 2),
      },
      {
        kind: "support",
        text: `${s.uniqueCreators} different creators describe it, and no single creator accounts for more than ${pct(s.topCreatorShare)}% of signals.`,
        usesSnapshot: true,
        evidence: pick("dry-sunscreen", 2, 4),
      },
      {
        kind: "counter",
        text: "A dermatologist creator warns that diluting sunscreen lowers protection, so some mixing may stop once people hear that advice.",
        usesSnapshot: false,
        evidence: pick("dry-sunscreen", 1, 6),
      },
    ],
    fit: {
      rating: "strong",
      scores: {
        categoryAdjacency: score(
          5,
          "Already sells sunscreens and moisturisers to the same buyers.",
        ),
        ingredientExpertise: score(4, "Ceramide and glycerin formulas are core to the range."),
        positioning: score(5, "Dry and sensitive skin is the brand's stated focus."),
        coverageGap: score(
          4,
          "No current SPF is positioned as moisturising; buyers combine two products.",
        ),
      },
      coverage: ["Invisible Fluid SPF50", "Barrier Cream"],
    },
    demandTest:
      verdict === "rejected" || verdict === "weak"
        ? null
        : {
            testType: "content_concept_test",
            hypothesis:
              "Dry-skin viewers will ask where to buy a moisturising SPF50 when it is shown replacing the mix-in routine.",
            audience:
              "Viewers of dry and sensitive skin routines who already mix moisturiser into sunscreen.",
            activation:
              "Post three organic concept videos showing one moisturising SPF replacing the mixing routine, with no product link and no paid promotion.",
            primaryMetric: "Share of commenters asking where to buy",
            successThreshold: "≥ 2% of commenters ask where to buy within 14 days",
            stopCondition: "Stop after 14 days or 50,000 combined views, whichever comes first.",
            durationDays: 14,
            costBand: "under_500",
            predictedProbability: 0.55,
          },
  };
}

function pillingSpf(s: StatSnapshotStats, pick: EvidencePicker): FindingSpec {
  return {
    need: "pilling-spf",
    agentVerdict: "emerging",
    verdict: "emerging",
    cappedBy: [],
    confidence: 0.54,
    summary:
      "Sunscreen pilling under foundation, concealer and serums is a steady complaint, and makeup-wearing creators describe patting SPF in for minutes to avoid it. Growth is modest and part of the volume comes from one budget creator.",
    uncertainties: [
      `Only ${s.recentCount} signals fall in the recent window.`,
      "Pilling depends on the foundation as much as the sunscreen.",
    ],
    alternativeExplanations: [
      "Application technique, not formulation, may cause most of the pilling.",
      "A sarcastic video was excluded; tone in this need is hard to read.",
    ],
    claims: [
      {
        kind: "support",
        text: `${s.totalCount} sincere signals across ${s.uniqueCreators} creators describe sunscreen pilling under other products.`,
        usesSnapshot: true,
        evidence: pick("pilling-spf", 2),
      },
      {
        kind: "support",
        text: `Signals grew from ${s.priorCount} to ${s.recentCount} between the last two ${s.windowDays}-day windows.`,
        usesSnapshot: true,
        evidence: pick("pilling-spf", 2, 2),
      },
      {
        kind: "counter",
        text: "A dermatologist creator attributes pilling to clashing silicones between layers, which product pairing guidance could fix without a new formula.",
        usesSnapshot: false,
        evidence: pick("pilling-spf", 1, 4),
      },
    ],
    fit: {
      rating: "moderate",
      scores: {
        categoryAdjacency: score(4, "Sunscreen is an existing category."),
        ingredientExpertise: score(3, "No specific expertise in makeup-compatible film formers."),
        positioning: score(3, "Makeup compatibility is adjacent to, not central to, the brand."),
        coverageGap: score(3, "The SPF stick is marketed for reapplying over makeup."),
      },
      coverage: ["Sun Stick SPF50"],
    },
    demandTest: {
      testType: "creator_seeding",
      hypothesis:
        "Creators who already complain about pilling will report less of it with the existing SPF stick, showing whether repositioning beats reformulating.",
      audience: "Creators who posted a pilling complaint in the last 90 days.",
      activation:
        "Send the existing Sun Stick SPF50 to 10 creators who voiced the complaint, with disclosed gifting and no posting requirement.",
      primaryMetric: "Creators reporting no pilling under foundation",
      successThreshold: "≥ 6 of 10 creators report no pilling",
      stopCondition: "Stop early if 3 creators report irritation or pilling in week one.",
      durationDays: 21,
      costBand: "500_2k",
      predictedProbability: 0.4,
    },
  };
}

function vitaminCDupe(s: StatSnapshotStats, pick: EvidencePicker): FindingSpec {
  return {
    need: "vitc-dupe",
    agentVerdict: "emerging",
    verdict: "weak",
    cappedBy: ["CONCENTRATED"],
    confidence: 0.35,
    summary:
      "Dupe hunting for a premium vitamin C serum looks lively, but most of it comes from one budget creator, part of it is sponsored, and the brand already sells a vitamin C serum.",
    uncertainties: [
      `One creator accounts for ${pct(s.topCreatorShare)}% of signals.`,
      `${pct(s.sponsoredShare)}% of signals are sponsored or suspected sponsored.`,
    ],
    alternativeExplanations: [
      "Dupe content is a format that performs well regardless of unmet demand.",
      "A paid dupe campaign inflates the recent volume.",
    ],
    claims: [
      {
        kind: "support",
        text: `${s.typeMix.dupe_hunt} signals are explicit searches for a cheaper vitamin C serum.`,
        usesSnapshot: true,
        evidence: pick("vitc-dupe", 2),
      },
      {
        kind: "support",
        text: "Several viewers ask the same creator for the dupe in comments.",
        usesSnapshot: false,
        evidence: pick("vitc-dupe", 1, 2),
      },
      {
        kind: "counter",
        text: `A single creator posts ${pct(s.topCreatorShare)}% of the signals, and one of their videos is a disclosed ad for a dupe.`,
        usesSnapshot: true,
        evidence: pick("vitc-dupe", 2, 3),
      },
    ],
    fit: {
      rating: "poor",
      scores: {
        categoryAdjacency: score(4, "Serums are an existing category."),
        ingredientExpertise: score(3, "Already formulates with ascorbic acid."),
        positioning: score(2, "A budget dupe conflicts with dermatologist-led positioning."),
        coverageGap: score(
          2,
          "The brand's own vitamin C serum covers the need at its price point.",
        ),
      },
      coverage: ["Vitamin C 15 Serum"],
    },
    demandTest: null,
  };
}

function gentleRetinol(s: StatSnapshotStats, pick: EvidencePicker): FindingSpec {
  return {
    need: "gentle-retinol",
    agentVerdict: "weak",
    verdict: "weak",
    cappedBy: [],
    confidence: 0.4,
    summary:
      "Sensitive-skin creators want a fragrance-free retinoid that doesn't sting, but the conversation has gone quiet: nothing in the recent window.",
    uncertainties: [`No signals in the last ${s.windowDays} days.`],
    alternativeExplanations: [
      "Gentler retinal products may have already absorbed this demand.",
      "Creators who gave up on retinol stopped posting about it.",
    ],
    claims: [
      {
        kind: "support",
        text: `${s.typeMix.wish} wishes for a gentle, fragrance-free retinol from ${s.uniqueCreators} creators.`,
        usesSnapshot: true,
        evidence: pick("gentle-retinol", 2),
      },
      {
        kind: "support",
        text: "A dermatologist creator reports that patients find fragranced retinol stings.",
        usesSnapshot: false,
        evidence: pick("gentle-retinol", 1, 2),
      },
      {
        kind: "counter",
        text: `The need is declining: ${s.priorCount} signals in the prior window and ${s.recentCount} in the recent one.`,
        usesSnapshot: true,
        evidence: pick("gentle-retinol", 1, 3),
      },
    ],
    fit: {
      rating: "moderate",
      scores: {
        categoryAdjacency: score(4, "Already sells a retinal serum."),
        ingredientExpertise: score(4, "Retinoid formulation exists in the range."),
        positioning: score(5, "Sensitive skin is the brand's focus."),
        coverageGap: score(
          3,
          "The retinal serum is fragrance-free but not marketed to sensitive skin.",
        ),
      },
      coverage: ["Retinal 0.05 Night Serum"],
    },
    demandTest: null,
  };
}

function mineralCleanser(s: StatSnapshotStats, pick: EvidencePicker): FindingSpec {
  return {
    need: "mineral-cleanser",
    agentVerdict: "emerging",
    verdict: "emerging",
    cappedBy: [],
    confidence: 0.5,
    summary:
      "Removing mineral and water-resistant sunscreen takes an oil or balm plus a second cleanse, and sensitive-skin creators say the double cleanse leaves them raw.",
    uncertainties: [`Only ${s.totalCount} signals so far.`],
    alternativeExplanations: ["Existing cleansing balms may already solve this for most people."],
    claims: [
      {
        kind: "support",
        text: `Workarounds make up ${s.typeMix.workaround} of the ${s.totalCount} signals: an oil or balm first, then a second cleanse.`,
        usesSnapshot: true,
        evidence: pick("mineral-cleanser", 2),
      },
      {
        kind: "support",
        text: `Signals rose from ${s.priorCount} to ${s.recentCount} across the two windows.`,
        usesSnapshot: true,
        evidence: pick("mineral-cleanser", 1, 2),
      },
      {
        kind: "counter",
        text: "One commenter suggests a cleansing balm, implying an existing product may cover it.",
        usesSnapshot: false,
        evidence: pick("mineral-cleanser", 1, 3),
      },
    ],
    fit: {
      rating: "strong",
      scores: {
        categoryAdjacency: score(5, "Cleansers and mineral SPF are both in the range."),
        ingredientExpertise: score(4, "Gentle surfactant systems are a strength."),
        positioning: score(5, "Matches the sensitive-skin focus."),
        coverageGap: score(3, "The milk cleanser and balm together cover it in two steps."),
      },
      coverage: ["Gentle Milk Cleanser", "Cleansing Balm"],
    },
    demandTest: null,
  };
}

/** The published demo run: four findings, one capped by concentration. */
export function demoFindings(stats: Record<NeedKey, StatSnapshotStats>, pick: EvidencePicker) {
  return [
    drySunscreen(stats["dry-sunscreen"], pick, "strong"),
    pillingSpf(stats["pilling-spf"], pick),
    vitaminCDupe(stats["vitc-dupe"], pick),
    gentleRetinol(stats["gentle-retinol"], pick),
  ];
}

/** The failed run saved two findings before its timeout. */
export function failedRunFindings(stats: Record<NeedKey, StatSnapshotStats>, pick: EvidencePicker) {
  return [
    drySunscreen(stats["dry-sunscreen"], pick, "emerging"),
    mineralCleanser(stats["mineral-cleanser"], pick),
  ];
}
