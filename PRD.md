# Unmet — Product Requirements

> Profile: AI / agent product (+ internal research tool) · Scope tier: Prototype (showcase, ~3 weeks, solo builder) · Objective modifier: launch showcase · Version: 1.0 · Updated: 2026-10-09

## 1. Summary

Unmet is an investigation agent that finds **unmet consumer demand** in short-form video. It reads a corpus of skincare videos (speech, captions, on-screen frames, comments), extracts three kinds of demand signal — **complaints** ("this pills under makeup"), **wishes** ("why does nobody make…"), and **workarounds** (people combining two products because no single product does both jobs) — then sizes each need with deterministic statistics, tries to disprove it, scores how well it fits a specific brand's catalogue, and recommends the cheapest test of demand before anyone formulates a product.

It is built as a showcase for the Applied AI role at Plot (plot.so). Its pitch: *Plot already understands what creators say, show, use and do. Unmet points that understanding at product decisions — the budgets of R&D and product teams, not just marketing.* Every claim in Unmet's output links to the exact video moment that supports it, every number comes from a deterministic query, and the system is proven with a backtest against what actually happened.

## 2. Problem & Opportunity

- **Pain:** brand product teams decide what to formulate and launch on slow, expensive inputs — surveys, agency trend decks, retailer data that arrives after a competitor has already launched. Consumers are describing unmet needs on video every day, but nobody can read it at scale.
- **Current workarounds:** text social-listening tools (keyword and hashtag counts), trend agencies, manual "TikTok scrolling" by junior marketers.
- **Why they fail:** keyword tools count mentions, not needs — they cannot tell a complaint from a recommendation, miss products that appear on screen but are never named, and are fooled by one viral video or a paid campaign. Agency reports cannot be verified and are never scored against outcomes.
- **Opportunity:** a system that (a) detects needs rather than mentions, (b) shows its evidence, (c) attacks its own conclusions, and (d) has a measurable track record. That is the difference between an "AI report" and a decision tool.

## 3. Target Users

| Persona | Context | Goals | Frustrations | Technical level | Device |
|---|---|---|---|---|---|
| **Priya — Product/Innovation lead at a skincare brand (primary)** | Owns the 12–24 month launch pipeline | Find needs worth launching against before competitors; justify bets internally | Trend decks with no evidence; can't tell signal from hype | Low–medium | Desktop |
| **Marcus — Consumer insights manager** | Runs research for brand + product teams | Evidence she can defend in a meeting; clear uncertainty | AI summaries that invent numbers or cite the wrong source | Medium | Desktop |
| **Plot reviewer (founders, engineers)** | Evaluating this project as a job application | See agentic reasoning, eval rigour, product taste, honesty about limits — in under 5 minutes | Demos that only show the happy path | High | Desktop, sometimes mobile |

The Plot reviewer is the real first user. Every hero flow must work for someone landing cold from a link in an email.

## 4. Core User Journeys

**J1 — Cold reviewer, first 90 seconds (time-to-value < 10 s)** · F-08, F-13
1. Opens the live link; home shows the hero question, one published investigation, and headline eval results.
2. Clicks the published investigation; the workspace loads fully rendered (no waiting) in < 2 s.
3. Sees ranked needs with verdict badges; opens the top need.
4. Clicks a claim → evidence drawer shows the transcript line, timestamp, creator, and an "Open at 0:14" link to the original video.

**J2 — Watch a live investigation** · F-04, F-05, F-06, F-07, F-08, F-13
1. Enters the demo passcode, picks the brand and question (prefilled), starts a run.
2. The step timeline streams: candidate needs found → stats pulled → counterevidence searched → verdicts recorded.
3. Within 6 minutes the run completes with 3–5 ranked needs, each with sceptic notes, brand fit, and a demand test.

**J3 — Interrogate one need** · F-03, F-05, F-06, F-07
1. Opens a need; reads the verdict, confidence, and the "why this might be wrong" list.
2. Switches tabs: Evidence (supporting claims) → Sceptic (counterevidence, concentration, sponsorship) → Brand fit → Demand test.
3. Every number shown has a "from query" tag; hovering shows the stat snapshot it came from.

**J4 — Check the system is any good** · F-09, F-10
1. Opens Evals from the header.
2. Sees Unmet vs single-prompt baseline across extraction, traps, and backtest, with pass/fail against thresholds.
3. Opens a failure case and reads why it failed; jumps to that run's trace.

**J5 — Builder runs the pipeline** · F-01, F-02, F-09
1. Adds videos to `data/manifest.csv` and media to `data/raw/`.
2. Runs `pnpm ingest` then `pnpm extract`; sees per-video status and cost.
3. Runs `pnpm eval:all`; results appear on `/evals`.

## 5. Features

### F-01 · Corpus ingestion pipeline — Priority: P0
- **User story:** As the builder, I want to turn a folder of videos plus a manifest into a structured, searchable corpus so that the agent works on real evidence.
- **Details:** Input is `data/manifest.csv` (one row per video: platform, source_url, external_id, creator handle, follower_count, posted_at, views, likes, comments_count, caption, provenance_note, trap_tags, corpus_id) plus `data/raw/<external_id>.mp4` and optional `data/raw/<external_id>.comments.json`. For each video the pipeline: transcribes audio with segment timestamps; samples 4–8 keyframes (first frame at 0.5 s + scene changes, 512 px wide); describes each keyframe with a vision model (products visible, on-screen text, action); stores comments with author handles hashed; uploads media and keyframes to private object storage. Idempotent per video (re-running skips completed stages). Videos marked `exclude=true` in the manifest, or whose creator is flagged as a likely minor, are never ingested.
- **States:** pending · transcribing · framing · describing · complete · failed (with stage + error) · excluded.
- **Acceptance criteria:**
  - F-01.AC1 — Given a manifest with 3 valid rows and media, When I run `pnpm ingest`, Then 3 `video` rows reach `ingest_status = complete` with ≥1 transcript segment and 4–8 keyframes each.
  - F-01.AC2 — Given a video already complete, When I re-run `pnpm ingest`, Then no external API calls are made for it (verified by call counter) and its rows are unchanged.
  - F-01.AC3 — Given a row whose media file is missing, When ingest runs, Then that video is `failed` with `ingest_error = MEDIA_NOT_FOUND` and the others still complete.
  - F-01.AC4 — Given a row with `exclude=true`, When ingest runs, Then no rows or media are created for it.
  - F-01.AC5 — Given comments are ingested, When I query `comment`, Then no column contains a raw author handle (only `author_hash`).
- **Dependencies:** OpenAI transcription, Anthropic vision, Cloudflare R2, ffmpeg.

### F-02 · Demand signal extraction — Priority: P0
- **User story:** As an insights manager, I want each video's complaints, wishes and workarounds extracted with exact evidence so that needs are grounded in what people actually said and showed.
- **Details:** One structured LLM call per video over transcript segments, caption, keyframe descriptions and top 50 comments. Each signal has: `type` (complaint · wish · workaround · dupe_hunt), a brand-agnostic `need_statement` ("a sunscreen that doesn't dry out skin"), products involved (with source: speech · caption · visual · comment), `stance` (sincere · sarcastic · unclear), `sponsored` (disclosed · suspected · none), confidence, and 1–5 evidence items each pointing to a transcript segment, keyframe, caption, or comment with a ≤ 200-char excerpt. A `workaround` requires ≥ 2 products and a stated or shown reason; otherwise it is downgraded to `complaint` or dropped. Sponsored disclosure is also detected deterministically (`#ad`, `#sponsored`, `#partner`, "paid partnership") and the deterministic flag wins. Output is schema-validated with up to 2 repair retries.
- **States:** pending · extracting · complete · failed (schema invalid after retries) · skipped (no transcript and no frames).
- **Acceptance criteria:**
  - F-02.AC1 — Given a video where the speaker says "I mix a drop of this into my moisturiser because my sunscreen dries me out" and two products are visible, When extraction runs, Then a `workaround` signal is created with 2 products and evidence referencing the transcript segment containing that sentence.
  - F-02.AC2 — Given a caption containing `#ad`, When extraction runs, Then every signal from that video has `sponsored = disclosed` regardless of model output.
  - F-02.AC3 — Given model output that fails schema validation twice and succeeds on the third attempt, When extraction runs, Then the signal is stored and `repair_attempts = 2` is logged.
  - F-02.AC4 — Given model output citing a transcript segment ID that does not belong to the video, When extraction runs, Then that evidence item is rejected and the signal is kept only if ≥1 valid evidence item remains.
  - F-02.AC5 — Given the extraction gold set, When `pnpm eval:extraction` runs, Then signal-type macro-F1 ≥ 0.75 and workaround precision ≥ 0.80 (thresholds in EVAL_GUARDRAILS §7).
- **Dependencies:** F-01, Anthropic, OpenAI embeddings.

### F-03 · Need clustering & deterministic sizing — Priority: P0
- **User story:** As a product lead, I want similar signals grouped into needs and sized with real numbers so that I can compare needs without trusting an LLM's arithmetic.
- **Details:** At investigation time, signals posted before the run's `as_of` date are clustered by need-statement embedding (greedy centroid clustering, cosine ≥ 0.80, min 3 signals) and labelled by a fast model. For each need, a stat snapshot is computed in SQL: signals in the recent window (90 days before `as_of`) and prior window (the 90 days before that), growth ratio `(recent+1)/(prior+1)`, unique creators, top-creator share, top-video view share, sponsored share, sarcastic share, signal-type mix, follower-tier mix (nano < 10k, micro 10k–100k, mid 100k–1M, macro > 1M), and Evidence Strength score v1 (formula in ARCHITECTURE §10.6). Snapshots are immutable and versioned by `formula_version`.
- **States:** computing · ready · insufficient_data (fewer than 3 signals → need not listed).
- **Acceptance criteria:**
  - F-03.AC1 — Given fixture signals with known counts, When a stat snapshot is computed, Then every field equals the hand-computed value (exact match for counts, ±0.001 for ratios).
  - F-03.AC2 — Given signals dated after `as_of`, When clustering and stats run, Then none of them appear in any need or snapshot.
  - F-03.AC3 — Given one creator posts 7 of 10 signals in a need, When stats run, Then `top_creator_share = 0.7` and the need carries the `CONCENTRATED` flag (threshold ≥ 0.5).
  - F-03.AC4 — Given the same inputs and `formula_version`, When stats run twice, Then the snapshots are identical.
- **Dependencies:** F-02.

### F-04 · Investigation agent — Priority: P0
- **User story:** As a product lead, I want an agent that investigates my question the way an analyst would — choosing what to look at next — so that I get a reasoned answer rather than a summary.
- **Details:** A tool-using agent loop (ARCHITECTURE §10) receives the brand, question, and `as_of`. It decides which tools to call: list needs, pull stats, search signals, inspect videos, search counterevidence, assess brand fit, record findings, propose demand tests. It must investigate at least 5 candidate needs and record a verdict (strong · emerging · weak · rejected) for every need it investigates. Each recorded claim must cite ≥1 evidence item; any claim containing a number must reference a stat snapshot that contains that number. Hard limits: 40 iterations, 10 minutes wall-clock, token budget per run (EVAL_GUARDRAILS §4). Every step is persisted as a run event in order.
- **States:** queued · running · completed · failed · cancelled · budget_exceeded.
- **Acceptance criteria:**
  - F-04.AC1 — Given a queued run on the demo corpus, When the worker processes it, Then it completes with 3–5 findings ranked 1..n, each with a verdict, ≥2 supporting claims, and ≥1 sceptic claim.
  - F-04.AC2 — Given the agent calls `record_finding` with a claim lacking evidence IDs, When the tool validates, Then it returns `CLAIM_NEEDS_EVIDENCE` and nothing is stored.
  - F-04.AC3 — Given a claim text containing "41%" whose referenced snapshot has no value rounding to 41%, When the tool validates, Then it returns `NUMBER_NOT_IN_SNAPSHOT` and nothing is stored.
  - F-04.AC4 — Given evidence posted after `as_of`, When the agent cites it, Then the tool returns `EVIDENCE_AFTER_AS_OF`.
  - F-04.AC5 — Given the run reaches 40 iterations, When the loop checks limits, Then it stops, saves completed findings, and sets `status = completed` with `summary` noting truncation (or `failed` if zero findings).
  - F-04.AC6 — Given a run exceeding its token budget, When the next call would exceed it, Then the run ends with `status = budget_exceeded` and saved findings remain viewable.
- **Dependencies:** F-03, F-05, F-06, F-07, Anthropic.

### F-05 · Sceptic pass — Priority: P0
- **User story:** As an insights manager, I want the agent to actively try to disprove each need before recommending it so that I don't act on a viral fluke or a paid campaign.
- **Details:** Before a need can receive `strong` or `emerging`, the agent must call `find_counterevidence` for it. Counterevidence covers: videos saying an existing product already solves the need; contradicting stance (praise where the need is a complaint); sarcastic signals; sponsored share; creator concentration; single-video view concentration; decline in the recent window. The finding stores `alternative_explanations` and `uncertainties` (each ≥1 item for any non-rejected verdict). Automatic downgrade rules apply server-side: `CONCENTRATED` or sponsored share ≥ 0.4 caps the verdict at `weak` unless the agent records an override reason that cites evidence.
- **States:** not_checked · checked · capped (verdict limited by rule).
- **Acceptance criteria:**
  - F-05.AC1 — Given the agent records `strong` for a need without having called `find_counterevidence` in this run, When `record_finding` validates, Then it returns `SCEPTIC_PASS_REQUIRED`.
  - F-05.AC2 — Given a need with sponsored share 0.6, When the agent records `emerging` without an override, Then the stored verdict is `weak` and `capped_by = ['SPONSORED_SHARE']`.
  - F-05.AC3 — Given the trap suite, When `pnpm eval:traps` runs, Then Unmet passes ≥ 5 of 6 trap scenarios.
- **Dependencies:** F-03, F-04.

### F-06 · Brand catalogue & fit assessment — Priority: P0
- **User story:** As a product lead, I want each need judged against my brand's actual catalogue and positioning so that I only see needs we can credibly own.
- **Details:** A brand is defined in `data/brands/<slug>.json`: name (shown as "A skincare brand like <Name>" in the UI), positioning paragraph, and 15–40 catalogue products (name, category, format, key ingredients, claims, skin types, public URL). Fit assessment returns four 1–5 scores with one-sentence reasons — category adjacency, ingredient expertise, positioning consistency, coverage gap (5 = no existing product covers it) — plus existing catalogue products that partly cover the need (deterministic ingredient/category match + embedding similarity ≥ 0.75), and an overall rating (strong · moderate · poor).
- **States:** not_assessed · assessed · catalogue_missing.
- **Acceptance criteria:**
  - F-06.AC1 — Given a need already fully covered by a catalogue product (fixture), When fit is assessed, Then `coverage_gap ≤ 2` and that product is listed in `existing_coverage`.
  - F-06.AC2 — Given a brand file failing schema validation, When `pnpm brands:load` runs, Then it exits non-zero naming the invalid field and loads nothing for that brand.
  - F-06.AC3 — Given a published investigation, When viewed, Then the brand appears only as "A skincare brand like <Name>" and no brand logo or brand colours are rendered.
- **Dependencies:** F-04.

### F-07 · Demand test recommendation — Priority: P0
- **User story:** As a product lead, I want the cheapest experiment that would prove the need real or fake so that I can de-risk a launch before spending on formulation.
- **Details:** For each `strong` or `emerging` need the agent proposes one demand test from a fixed set: `content_concept_test` (organic posts of the concept, measure saves/comments asking "where can I buy"), `creator_seeding` (send prototypes or existing adjacent products to creators already voicing the need), `waitlist_landing` (concept page + small paid traffic, measure sign-up rate), `commenter_survey` (reply-survey to commenters who voiced the need), `concept_ad_test` (paid social A/B of two concept framings). Each brief has: hypothesis, audience, activation, primary metric, success threshold, stop condition, duration (days), cost band (< £500 · £500–£2k · £2k–£10k), and a predicted probability of success (0.05–0.95). Briefs are recorded as ledger predictions.
- **States:** none (need not eligible) · proposed · invalid (schema) .
- **Acceptance criteria:**
  - F-07.AC1 — Given a `strong` need, When the run completes, Then exactly one demand test exists for it with all fields populated and a test type from the fixed set.
  - F-07.AC2 — Given a `weak` or `rejected` need, When the agent calls `propose_demand_test` for it, Then the tool returns `NEED_NOT_ELIGIBLE`.
  - F-07.AC3 — Given a proposed test, When viewed, Then the success threshold is a number with a unit and the stop condition is a measurable statement.
- **Dependencies:** F-04.

### F-08 · Investigation workspace UI — Priority: P0
- **User story:** As any user, I want a workspace where I can watch the investigation develop and open the exact evidence behind every claim so that I can trust — or challenge — the result.
- **Details:** Three-pane layout: step timeline (left), ranked need cards (centre), evidence drawer (right). Need detail has four tabs: Evidence · Sceptic · Brand fit · Demand test. Claims show evidence chips; clicking one opens the drawer with excerpt, timestamp, source type, creator handle, follower tier, posted date, and an "Open original" link (YouTube links include `?t=<seconds>`). Numbers render with a "from query" marker linking to the snapshot. Live runs poll for new events every 1 s. URL state holds the selected need and evidence so links are shareable.
- **States:** loading (skeletons), queued, running (live timeline), completed, failed (error + partial findings), budget_exceeded (partial findings + banner), empty (no needs met the threshold → explanatory empty state), not_found, evidence_unavailable (video removed → excerpt still shown, link disabled).
- **Acceptance criteria:**
  - F-08.AC1 — Given a published completed investigation, When I open its URL, Then findings render in < 2 s (p95, preview deploy) with no spinner on the critical path.
  - F-08.AC2 — Given a running investigation, When a new event is persisted, Then it appears in the timeline within 2 s.
  - F-08.AC3 — Given I click an evidence chip, When the drawer opens, Then it shows the excerpt and timestamp of that exact evidence item and the URL contains `evidence=<id>`.
  - F-08.AC4 — Given I load a URL with `?need=<id>&evidence=<id>`, When the page renders, Then that need is open and the drawer shows that evidence.
  - F-08.AC5 — Given a failed run with 2 saved findings, When I open it, Then I see the failure banner with the error code and both findings.
  - F-08.AC6 — Given the page at 390 px width, When I navigate needs and evidence, Then the layout collapses to a single column with the drawer as a bottom sheet and no horizontal scroll.
- **Dependencies:** F-04, F-05, F-06, F-07.

### F-09 · Evaluation harness & dashboard — Priority: P0
- **User story:** As a Plot reviewer, I want to see how well the system works against ground truth and against a simpler baseline so that I can judge it on evidence, not a demo.
- **Details:** Four suites, all runnable from the CLI and stored as eval runs: (1) **extraction** — 60 hand-labelled real videos (`evals/gold/extraction.jsonl`), per-type precision/recall/F1; (2) **traps** — 6 synthetic, clearly labelled trap scenarios (single viral video, single creator, paid campaign, sarcasm, sentiment flip, already-solved need) where the correct verdict is known; (3) **backtest** — 8–12 cases each with an `as_of` date and a known outcome (a need that later became a launched product, or one that never did); the agent runs blind with only pre-`as_of` data; (4) **comparison** — the same backtest and trap cases run through a single long-context prompt baseline, scored on hit@5, citation precision, unsupported-number rate, and trap pass rate. The `/evals` page shows suites, thresholds, Unmet vs baseline, and every failure case with a link to its trace. A blind human preference test (3–5 marketers) is recorded in `evals/human/` and shown when present.
- **States:** no runs yet · running · passed · failed threshold · stale (prompt version changed since last run).
- **Acceptance criteria:**
  - F-09.AC1 — Given gold labels and model outputs, When `pnpm eval:extraction` runs, Then it writes an eval run with per-type precision, recall and F1 that match a hand-computed fixture.
  - F-09.AC2 — Given a backtest case, When it runs, Then the tool layer rejects any query for data after the case's `as_of` (verified by an injected future-dated signal never appearing in tool results).
  - F-09.AC3 — Given both systems have run, When I open `/evals`, Then each metric shows Unmet, baseline, threshold, and pass/fail.
  - F-09.AC4 — Given a failed case, When I click it, Then I see the expected vs actual verdict, the judge's reason, and a link to the run's trace.
  - F-09.AC5 — Given a prompt file changed after the last eval run, When I open `/evals`, Then that suite shows the `stale` badge.
- **Dependencies:** F-02, F-04, F-05, F-10.

### F-10 · Run traces, cost & latency — Priority: P0
- **User story:** As a reviewer or builder, I want to see every step the agent took with its tokens, cost and latency so that I can debug and trust it.
- **Details:** `/traces/[id]` lists every run event: type, tool name, input arguments, output (truncated to 4 KB with expand), tokens in/out, latency, and running cost. Header shows totals and the prompt versions used. Available for published and eval runs.
- **States:** loading · loaded · empty (run queued) · not_found · forbidden (private run, no admin cookie).
- **Acceptance criteria:**
  - F-10.AC1 — Given a completed run, When I open its trace, Then the event count equals the number of persisted events and the total cost equals the run's `cost_usd` to the cent.
  - F-10.AC2 — Given a private run and no admin session, When I request its trace, Then the API returns 404 (not 403, to avoid leaking existence).
- **Dependencies:** F-04.

### F-11 · Prediction ledger — Priority: P1
- **User story:** As a product lead, I want every demand test's prediction recorded and later scored so that the system builds a track record.
- **Details:** `/ledger` lists demand tests with predicted probability, status, and recorded outcome (confirmed · refuted · inconclusive). Admin can record outcomes. Backtest cases write ledger entries with outcomes automatically. Calibration chart appears once ≥10 outcomes exist.
- **States:** empty · populated · calibration_hidden (< 10 outcomes).
- **Acceptance criteria:**
  - F-11.AC1 — Given an admin session, When I record an outcome for a test, Then it appears on `/ledger` and the test cannot receive a second outcome (409).
  - F-11.AC2 — Given fewer than 10 outcomes, When I open `/ledger`, Then the calibration chart is replaced by a message stating how many more are needed.
- **Dependencies:** F-07.

### F-12 · Creator handoff export — Priority: P1
- **User story:** As a product lead, I want to hand a validated need to a creator-matching tool so that the demand test can start immediately.
- **Details:** For a `strong`/`emerging` need, show "Creators already voicing this need" (deterministic: creators in the corpus with ≥1 sincere, non-sponsored signal in the need) and export a JSON brief (need, evidence links, demand test, creator handles) labelled "Hand off to a creator-matching tool such as Plot's Creator Intelligence". No creator outreach is performed.
- **States:** eligible · ineligible (weak/rejected) · no_creators.
- **Acceptance criteria:**
  - F-12.AC1 — Given a strong need, When I click Export, Then a JSON file downloads that validates against `HandoffBrief` and lists only creators with a sincere non-sponsored signal in that need.
- **Dependencies:** F-04, F-07.

### F-13 · Public demo mode & gated live runs — Priority: P0
- **User story:** As the builder, I want reviewers to explore published investigations freely and start live runs only with a passcode so that the demo is open but cost-safe.
- **Details:** Published investigations, evals, traces of published runs and the methodology page are public. Starting a run needs `X-Demo-Passcode` = `DEMO_PASSCODE`. Limits: 3 live runs per IP per day, 2 concurrent runs globally, global daily live-run spend cap `DAILY_LIVE_RUN_BUDGET_USD`. Admin session (cookie from `ADMIN_TOKEN`) can publish/unpublish runs and record outcomes. In public mode (`PUBLIC_DEMO_MODE=true`) keyframe images and media are never served; evidence shows excerpts and links to the original post only.
- **States:** passcode prompt · passcode invalid · rate limited · budget exhausted · accepted.
- **Acceptance criteria:**
  - F-13.AC1 — Given no passcode, When `POST /api/v1/investigations` is called, Then it returns 401 `PASSCODE_INVALID` and creates no row.
  - F-13.AC2 — Given an IP that started 3 runs today, When it starts a 4th, Then it returns 429 `RATE_LIMITED` with `retryAfterSeconds`.
  - F-13.AC3 — Given today's live spend ≥ the daily cap, When a run is requested, Then it returns 402 `BUDGET_EXHAUSTED` and the UI shows "Live runs are paused for today — explore the published investigations."
  - F-13.AC4 — Given `PUBLIC_DEMO_MODE=true`, When evidence of type `frame` is requested, Then the response has `imageUrl: null` and the drawer shows the frame description text only.
  - F-13.AC5 — Given a valid admin session, When I publish a completed run, Then it appears on the home page list.
- **Dependencies:** Upstash Redis.

### F-14 · Methodology & limitations page — Priority: P0
- **User story:** As a Plot reviewer, I want one page explaining the data, method and limitations so that I can judge the work honestly.
- **Details:** `/about` shows live corpus stats (videos, creators, date range, platforms, signals by type), how the corpus was collected and what is excluded, the pipeline diagram, the Evidence Strength formula, what the LLM does vs what SQL does, known limitations (corpus size, selection bias, model-knowledge leakage in backtests and how it is controlled), and how Unmet would sit on top of Plot's existing video index.
- **States:** loading · loaded · stats_unavailable (static copy still renders).
- **Acceptance criteria:**
  - F-14.AC1 — Given the corpus in the database, When `/about` renders, Then the video, creator and signal counts equal `SELECT count(*)` results.
  - F-14.AC2 — Given the stats endpoint fails, When `/about` renders, Then all static sections still render and the stats block shows "Stats unavailable".
- **Dependencies:** F-01, F-02.

## 6. Out of Scope

| Item | Reason |
|---|---|
| User accounts, sign-up, teams, billing | One builder, public demo; passcode + admin token suffice |
| Scraping or automated collection from TikTok, Instagram or YouTube | Platform terms; corpus is assembled by the operator into a manifest (see Open Questions Q1) |
| Real-time ingestion or millions of videos | Showcase demonstrates investigation quality, not scale — Plot already has scale |
| Creator outreach, messaging, or campaign execution | Handoff export only (F-12) |
| Product formulation suggestions (ingredients, percentages) | Out of the evidence's reach; would be unverifiable LLM invention |
| Hosting, re-serving, or downloading of third-party video in public mode | Copyright; link to originals instead |
| Categories other than skincare | One tight domain beats shallow breadth |
| Generic chat interface | Explicitly not a chatbot; the workspace is the product |
| Using Plot's name, logo or branding as if this were a Plot product | It is an independent prototype |
| Fine-tuning or training models | Role is "systems on top of models" |

## 7. Success Metrics

| Metric | Definition (exact) | Target | Tool |
|---|---|---|---|
| **North star: Backtest hit@5** | Share of positive backtest cases where the gold need appears in the top 5 findings with verdict strong/emerging | ≥ 0.60 and ≥ baseline + 0.20 | `pnpm eval:backtest` → `eval_run.metrics.hit_at_5` |
| Backtest false-positive rate | Share of negative cases rated strong | ≤ 0.25 | `eval_run.metrics.fp_rate` |
| Citation precision | Share of cited evidence items judged to support their claim (judge model + 30-item human spot check) | ≥ 0.90 | `eval:compare` |
| Unsupported-number rate | Numbers in final output not traceable to a stat snapshot | 0 (Unmet); reported for baseline | `eval:compare` |
| Trap pass rate | Trap scenarios with correct verdict | ≥ 5/6 | `eval:traps` |
| Extraction quality | Signal-type macro-F1 on gold set | ≥ 0.75 | `eval:extraction` |
| Reviewer activation | `evidence_opened` PostHog events per unique visitor on published investigations | ≥ 1 for 60% of visitors | PostHog |
| Live run reliability | Completed ÷ started live runs (excluding budget_exceeded) | ≥ 0.90 | SQL on `investigation` |
| Cost per investigation | Mean `cost_usd` for agent runs | ≤ $3.00 | SQL on `investigation` |
| Run latency | p95 wall-clock for agent runs | ≤ 6 min | SQL on `investigation` |

## 8. Non-Functional Requirements

- **Performance:** published investigation page LCP < 2.0 s on desktop broadband; INP < 200 ms; API reads p95 < 300 ms.
- **Accessibility:** WCAG 2.2 AA; full keyboard navigation of timeline, needs, tabs and drawer.
- **Browsers:** latest Chrome, Safari, Firefox, Edge; iOS Safari 17+ (read-only flows).
- **Privacy:** comment authors hashed; no raw handles of non-creators stored; no minors' content; media private; see EVAL_GUARDRAILS §8.
- **Determinism:** every number in the UI comes from a stored stat snapshot; re-rendering never recomputes with an LLM.
- **Reproducibility:** every run stores model IDs, prompt versions and formula version.
- **Localization:** English (UK spelling in UI copy); dates `9 Oct 2026`; currency £ for cost bands, $ for model cost.
- **Availability:** best effort; published pages work if the worker is down.
- **Data retention:** runs kept indefinitely; raw media deleted from storage within 30 days after the application process ends (operator task).

## 9. Assumptions

| # | Assumption | Reasoning | How to change |
|---|---|---|---|
| A1 | Corpus is 300–500 skincare videos from Jan 2024 to Sep 2026, assembled manually into a manifest | Large enough that the baseline cannot see everything at full fidelity, small enough to collect by hand | Change target in ROADMAP P1.T1 |
| A2 | TypeScript end-to-end, one monorepo | One language for web, agent, evals; shared Zod contracts | ADR in ARCHITECTURE §16 |
| A3 | Claude for agent, extraction and vision; OpenAI for transcription and embeddings | Strong tool use from Claude; Whisper segment timestamps; cheap embeddings | Swap env vars `MODEL_*`, `EMBEDDING_MODEL`; ADR |
| A4 | No accounts; passcode-gated live runs | Reviewers must reach value with zero friction | F-13 |
| A5 | One demo brand (`lrp-like`): "a skincare brand like La Roche-Posay", catalogue from its public product pages; plus a fictional brand (`fixture-skin`) used only in tests | Plot names La Roche-Posay as a customer; dermatological positioning makes fit scoring interesting | Add `data/brands/*.json` |
| A6 | Product name "Unmet" | Says what it finds | Rename in PRD + DESIGN_SYSTEM |
| A7 | Evidence Strength formula v1 is hand-designed, not learned | Not enough outcomes to learn weights; formula is transparent | Bump `formula_version` |

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Model knowledge leakage in backtests (the model may already know which products launched) | Inflated backtest scores | Gold launch names never enter prompts; verdicts gated by deterministic stats; report scores separately for cases whose launch post-dates the model's training cutoff (`leakage_class`) |
| Corpus selection bias (builder collects videos that confirm known trends) | Backtest proves nothing | Collect by fixed search queries and date buckets recorded in manifest before labelling cases; include negative cases; disclose on `/about` |
| Platform terms on collecting videos | Reputational/legal | Open Question Q1; never redistribute media; public mode serves no media |
| Small corpus → noisy stats | Wrong verdicts | Minimum-signal thresholds, uncertainty fields, honest framing as "method + early evidence" |
| Agent runaway cost | Budget burn on a public link | Passcode, IP limits, daily spend cap, per-run token budget |
| LLM judge bias in comparison suite | Unfair comparison | Different judge model from agent; 30-item human spot check reported |
| Time overrun | Nothing finished | Vertical slices; P1 features only after Phase 5 exit |

## 11. Open Questions

| # | Question | Owner | Default if unanswered | Decide by |
|---|---|---|---|---|
| Q1 | How is the corpus sourced in a way the builder is comfortable defending? | Rayhan | Operator-assembled manifest of public videos, processed privately, never redistributed, provenance recorded per row; creators' permission sought for any video shown prominently in the demo video | P0 |
| Q2 | Which 8–12 backtest cases? | Rayhan | Chosen in P4.T1 using the selection rules in TESTING_GUIDE §4.5, recorded before running any system | P4 |
| Q3 | Which marketers take part in the blind preference test? | Rayhan | 3–5 contacts from user interviews; skip if fewer than 3 agree | P5 |
| Q4 | Final model IDs and prices | Agent (P0.T1) | `claude-sonnet-5-5` agent, `claude-haiku-5-5` extraction/vision, `claude-opus-5-5` judge + fallback, `whisper-1`, `text-embedding-3-small` | P0 |

## 12. Glossary

| Term | Meaning |
|---|---|
| Signal | One complaint, wish, workaround or dupe hunt extracted from one video |
| Need | A cluster of signals expressing the same unmet demand |
| Workaround | A signal where ≥2 products are used together for a stated reason |
| Stat snapshot | Immutable, deterministic statistics for one need at one `as_of` |
| `as_of` | The date the investigation pretends is "today"; nothing after it is visible |
| Verdict | strong · emerging · weak · rejected |
| Sceptic pass | The agent's mandatory search for evidence against a need |
| Demand test | The cheapest experiment that would confirm or refute a need |
| Backtest | Running the agent at a past `as_of` and comparing with what happened |
| Baseline | A single long-context prompt over the same corpus, no tools |
