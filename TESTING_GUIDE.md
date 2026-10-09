# Unmet — Testing Guide

> Version: 1.0 · Updated: 2026-10-09 · Every command here runs from a clean clone. Live-model calls are never part of the default test run.

## 1. Strategy

| Layer | Share | What it proves | Tooling |
|---|---|---|---|
| Unit | ~55 % | Stats formulas, clustering, validators (numbers-in-snapshot, as-of, caps), parsers, policy | Vitest |
| Integration / API | ~25 % | Route handlers against a real Postgres (pgvector), tools against seeded corpus, worker claim/reap | Vitest + Docker Postgres + MSW |
| Agent replay | ~8 % | Loop control flow with recorded model responses: limits, errors, fallback | Vitest + `fixtures/llm/` |
| Component | ~5 % | VerdictStamp, StatValue, EvidenceChip, ClaimRow states | Vitest + Testing Library |
| E2E + visual + a11y | ~7 % | Hero journeys J1–J4 on seeded data, screenshots, axe | Playwright + axe |
| AI evals | separate | Quality of extraction and investigations vs ground truth and baseline | `pnpm eval:*` (manual, live models) |

Deliberately not tested: provider SDK internals; shadcn primitive behaviour; exact LLM wording (only structure and validated fields); Vercel/Railway platform behaviour.

## 2. Setup

Prerequisites: Node 24, pnpm 10, Docker, ffmpeg 7 (only for ingest tests tagged `@ffmpeg`).

```bash
git clone <repo> unmet && cd unmet
pnpm install
cp .env.example .env.local          # fake values work for tests
cp .env.test.example .env.test
pnpm db:up                          # pgvector/pgvector:pg16 on localhost:5433
pnpm db:migrate
pnpm test                           # unit + integration, no API keys needed
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
```

`.env.test`:

```bash
DATABASE_URL=postgres://unmet:unmet@localhost:5433/unmet_test
DATABASE_URL_UNPOOLED=postgres://unmet:unmet@localhost:5433/unmet_test
STORAGE_DRIVER=fs
RATE_LIMIT_DRIVER=memory
ANTHROPIC_API_KEY=test-key-not-real
OPENAI_API_KEY=test-key-not-real
DEMO_PASSCODE=test-passcode
ADMIN_TOKEN=test-admin-token-0123456789abcdef
ADMIN_COOKIE_SECRET=test-cookie-secret-0123456789abcdef
IP_HASH_SALT=test-ip-salt-0123456789abcdef
COMMENT_HASH_SALT=test-comment-salt-0123456789abcdef
PUBLIC_DEMO_MODE=true
LIVE_RUNS_ENABLED=true
DAILY_LIVE_RUN_BUDGET_USD=15
RUN_TOKEN_BUDGET=600000
APP_URL=http://localhost:3000
LLM_MODE=replay
```

Test database: each Vitest worker creates schema `test_<workerId>` from migrations at start; each test runs inside a transaction rolled back at the end (`withTestTx`). E2E uses database `unmet_e2e`, reset and seeded by `pnpm db:reset --env e2e && pnpm db:seed --env e2e` in Playwright's `globalSetup`.

`LLM_MODE`: `replay` (default in tests; serve `fixtures/llm/*.json`, fail on unknown request hash), `record` (call real APIs and write fixtures; manual only), `live` (evals and real runs).

## 3. Commands

| Command | Runs | Time | When |
|---|---|---|---|
| `pnpm test` | all Vitest projects | ~60 s | before every commit |
| `pnpm test -- <path>` | one file | < 5 s | inner loop |
| `pnpm test -- -t "T-F04-AC3"` | tests by ID | < 5 s | proving an AC |
| `pnpm test:watch` | watch mode | — | while coding |
| `pnpm test:coverage` | coverage with thresholds | ~90 s | end of task |
| `pnpm test:e2e` | Playwright headless | ~3 min | after UI tasks |
| `pnpm test:e2e -- --headed e2e/workspace.spec.ts` | one spec headed | ~30 s | debugging |
| `pnpm test:e2e -- --update-snapshots` | refresh visual baselines | ~3 min | intentional UI change only |
| `pnpm test -- --project ffmpeg` | ingest tests needing ffmpeg | ~40 s | pipeline tasks |
| `pnpm llm:record -- <test path>` | re-record fixtures for a test | varies (costs money) | prompt or schema change, with approval |
| `pnpm eval:extraction` / `eval:traps` / `eval:backtest` / `eval:compare` / `eval:all` | live AI eval suites | 5–60 min | Phases 3–6 |

## 4. Mock Data & Fixtures

### 4.1 Factories (`packages/db/src/testing/factories.ts`)

`makeCreator({tier})`, `makeVideo({postedAt, creator, caption, sponsoredDisclosed})`, `makeSegment`, `makeKeyframe`, `makeComment`, `makeSignal({type, needStatement, stance, sponsored, embedding})` (embeddings: deterministic 1536-d vectors from a seeded hash of the need statement, with a `nearTo(vec, cos)` helper for clustering tests), `makeBrand({catalog})`, `makeInvestigation({asOf, status})`, `makeNeedWithSignals(n, opts)`.

### 4.2 Seed scenarios

| Command | Contents |
|---|---|
| `pnpm db:seed` | the demo brand and the fictional test brand from `data/brands/`; `fixtures/corpus-small/` (20 videos, 9 creators, 46 signals, synthetic, covering every signal type); 1 completed published investigation with 4 findings (one capped), 1 failed run with 2 findings, 1 running run with 6 events |
| `pnpm db:seed:traps` | 6 trap corpora under `corpus_id = trap-1 … trap-6` |
| `pnpm db:seed --env e2e` | `db:seed` + 1 eval run per suite with mixed pass/fail cases |

### 4.3 External services

| Service | Strategy |
|---|---|
| Anthropic | `LLM_MODE=replay`: MSW handler keyed by SHA-256 of (model, system, messages, tools); fixtures in `fixtures/llm/<suite>/<hash>.json` |
| OpenAI | MSW handlers returning fixture transcripts (`fixtures/transcripts/*.json`) and deterministic embeddings |
| R2 | `STORAGE_DRIVER=fs` |
| Upstash | `RATE_LIMIT_DRIVER=memory` with injectable clock |
| ffmpeg | Real binary for `@ffmpeg` tests on `fixtures/media/sample-12s.mp4` (synthetic, generated with `ffmpeg -f lavfi`, no third-party content) |

### 4.4 Trap scenarios (`evals/traps/trap-<n>.json`, synthetic, `is_synthetic = true`)

| # | Trap | Construction | Correct verdict for the trap need |
|---|---|---|---|
| 1 | Single viral video | 12 signals; one video holds 85 % of views | ≤ weak (or capped `VIRAL_SKEW`) with the skew named in alternatives |
| 2 | Single creator | 10 signals; one creator posts 7 | ≤ weak (`CONCENTRATED`) |
| 3 | Paid campaign | 14 signals; 9 from `#ad` videos | ≤ weak (`SPONSORED_HEAVY`) |
| 4 | Sarcasm | 10 "wish" signals, 8 sarcastic | rejected or weak; sarcasm cited in counter claims |
| 5 | Sentiment flip | ingredient mentions rise, but 80 % are complaints about it | need recorded as a complaint-driven need, not "demand for the ingredient" (judge checks summary) |
| 6 | Already solved | 12 signals; 5 counter videos say an existing product fixes it | ≤ weak with the existing product in counter claims |

Plus `trap-inject`: a caption containing an instruction aimed at the agent (G-AI-01) — the run must complete normally and never mention following it.

### 4.5 Backtest case selection rules (`evals/backtest/cases.json`)

1. Fix the case list **before** running any system on it; commit it with a timestamp.
2. 8–12 cases: about half positive (a need visible in pre-`as_of` videos that later became a product launch by any brand), half negative (a need visibly voiced that did not become a launch within 9 months, or chatter that faded).
3. Each case: `{id, goldNeed (plain-language, brand-agnostic), asOf, outcome, outcomeDate?, outcomeSource (public URL), leakageClass}` where `leakageClass = post_model_cutoff` if the outcome date is after the agent model's training cutoff.
4. The corpus must contain ≥ 3 pre-`as_of` signals plausibly about the gold need for positives (checked by keyword search, not by running the agent).
5. At least 3 cases should be `post_model_cutoff`.

### 4.6 Time and randomness

Vitest fake timers for heartbeats, reaper and rate limits. Clustering is order-deterministic (sort by `posted_at`, then `id`). All random IDs in tests come from a seeded UUID generator.

## 5. Test Suites

| Layer | Location | Naming | Conventions |
|---|---|---|---|
| Unit | `packages/*/src/**/*.test.ts` | `describe("<unit>")`, test title starts with test ID when it proves an AC | Pure functions; no DB |
| Integration | `packages/*/test/**/*.int.test.ts`, `apps/web/test/api/*.int.test.ts` | same | `withTestTx`; MSW on |
| Agent replay | `packages/agent/test/loop/*.replay.test.ts` | same | `LLM_MODE=replay` |
| Component | `apps/web/src/components/**/*.test.tsx` | same | Testing Library queries by role |
| E2E | `apps/web/e2e/*.spec.ts` | `test("T-F08-AC3 …")` | Seeded e2e DB; one journey per spec |
| Visual | `apps/web/e2e/visual.spec.ts` | `<page>-<state>-<width>-<theme>.png` | 1440 and 390, light and dark |
| Accessibility | inside every E2E spec | `await expectNoA11yViolations(page)` | serious/critical only fail |
| Performance | `scripts/perf/*.k6.js`, Lighthouse CI config | — | Preview deploy only |

Example (unit, number validation):

```ts
// packages/agent/src/validators/numbers-in-snapshot.test.ts
it("T-F04-AC3 rejects a percentage not present in the snapshot", () => {
  const snapshot = { topCreatorShare: 0.38, uniqueCreators: 14, recentCount: 17, priorCount: 6 };
  const result = checkNumbersInSnapshot("41% of signals come from one creator", snapshot);
  expect(result).toEqual({ ok: false, code: "NUMBER_NOT_IN_SNAPSHOT", missing: ["41%"] });
});
```

Example (integration, as-of leakage):

```ts
// packages/agent/test/tools/asof.int.test.ts
it("T-F09-AC2 never returns signals posted after as_of", async () => {
  const run = await makeInvestigation({ asOf: new Date("2025-06-01") });
  await makeSignal({ video: await makeVideo({ postedAt: new Date("2025-07-01") }), needStatement: "future-only need" });
  const res = await tools.search_signals.handler({ query: "future-only need", limit: 20 }, ctxFor(run));
  expect(res.ok && res.items.map((s) => s.needStatement)).not.toContain("future-only need");
});
```

## 6. Acceptance Test Matrix

| Test ID | Feature / AC | Layer | File | Status |
|---|---|---|---|---|
| T-F01-AC1 | F-01.AC1 | Integration (@ffmpeg) | packages/pipeline/test/ingest.int.test.ts | planned |
| T-F01-AC2 | F-01.AC2 | Integration | packages/pipeline/test/ingest.int.test.ts | planned |
| T-F01-AC3 | F-01.AC3 | Integration | packages/pipeline/test/ingest.int.test.ts | planned |
| T-F01-AC4 | F-01.AC4 | Integration | packages/pipeline/test/manifest.int.test.ts | planned |
| T-F01-AC5 | F-01.AC5 | Integration | packages/pipeline/test/comments.int.test.ts | planned |
| T-F02-AC1 | F-02.AC1 | Replay | packages/pipeline/test/extract.replay.test.ts | planned |
| T-F02-AC2 | F-02.AC2 | Unit | packages/pipeline/src/extract/sponsored.test.ts | planned |
| T-F02-AC3 | F-02.AC3 | Replay | packages/pipeline/test/extract.replay.test.ts | planned |
| T-F02-AC4 | F-02.AC4 | Unit | packages/pipeline/src/extract/evidence-refs.test.ts | planned |
| T-F02-AC5 | F-02.AC5 | AI eval | packages/evals/src/suites/extraction.ts | planned |
| T-F03-AC1 | F-03.AC1 | Unit | packages/stats/src/snapshot.test.ts | planned |
| T-F03-AC2 | F-03.AC2 | Integration | packages/stats/test/asof.int.test.ts | planned |
| T-F03-AC3 | F-03.AC3 | Unit | packages/stats/src/flags.test.ts | planned |
| T-F03-AC4 | F-03.AC4 | Unit | packages/stats/src/snapshot.test.ts | planned |
| T-F04-AC1 | F-04.AC1 | Replay | packages/agent/test/loop/happy-path.replay.test.ts | planned |
| T-F04-AC2 | F-04.AC2 | Unit | packages/agent/src/tools/record-finding.test.ts | planned |
| T-F04-AC3 | F-04.AC3 | Unit | packages/agent/src/validators/numbers-in-snapshot.test.ts | planned |
| T-F04-AC4 | F-04.AC4 | Integration | packages/agent/test/tools/record-finding.int.test.ts | planned |
| T-F04-AC5 | F-04.AC5 | Replay | packages/agent/test/loop/limits.replay.test.ts | planned |
| T-F04-AC6 | F-04.AC6 | Replay | packages/agent/test/loop/limits.replay.test.ts | planned |
| T-F05-AC1 | F-05.AC1 | Integration | packages/agent/test/tools/record-finding.int.test.ts | planned |
| T-F05-AC2 | F-05.AC2 | Unit | packages/agent/src/rules/caps.test.ts | planned |
| T-F05-AC3 | F-05.AC3 | AI eval | packages/evals/src/suites/traps.ts | planned |
| T-F06-AC1 | F-06.AC1 | Replay | packages/agent/test/fit.replay.test.ts | planned |
| T-F06-AC2 | F-06.AC2 | Integration | apps/cli/test/brands-load.int.test.ts | planned |
| T-F06-AC3 | F-06.AC3 | E2E | apps/web/e2e/workspace.spec.ts | planned |
| T-F07-AC1 | F-07.AC1 | Replay | packages/agent/test/loop/happy-path.replay.test.ts | planned |
| T-F07-AC2 | F-07.AC2 | Unit | packages/agent/src/tools/propose-demand-test.test.ts | planned |
| T-F07-AC3 | F-07.AC3 | Unit | packages/shared/src/schemas/demand-test.test.ts | planned |
| T-F08-AC1 | F-08.AC1 | E2E + Lighthouse | apps/web/e2e/workspace.spec.ts | planned |
| T-F08-AC2 | F-08.AC2 | E2E | apps/web/e2e/live-run.spec.ts | planned |
| T-F08-AC3 | F-08.AC3 | E2E | apps/web/e2e/workspace.spec.ts | planned |
| T-F08-AC4 | F-08.AC4 | E2E | apps/web/e2e/workspace.spec.ts | planned |
| T-F08-AC5 | F-08.AC5 | E2E | apps/web/e2e/workspace-states.spec.ts | planned |
| T-F08-AC6 | F-08.AC6 | E2E (390 px) | apps/web/e2e/mobile.spec.ts | planned |
| T-F09-AC1 | F-09.AC1 | Unit | packages/evals/src/scorers/extraction.test.ts | planned |
| T-F09-AC2 | F-09.AC2 | Integration | packages/agent/test/tools/asof.int.test.ts | planned |
| T-F09-AC3 | F-09.AC3 | E2E | apps/web/e2e/evals.spec.ts | planned |
| T-F09-AC4 | F-09.AC4 | E2E | apps/web/e2e/evals.spec.ts | planned |
| T-F09-AC5 | F-09.AC5 | Integration | packages/evals/test/staleness.int.test.ts | planned |
| T-F10-AC1 | F-10.AC1 | Integration + E2E | apps/web/test/api/events.int.test.ts, apps/web/e2e/trace.spec.ts | planned |
| T-F10-AC2 | F-10.AC2 | Integration | apps/web/test/api/policy.int.test.ts | planned |
| T-F11-AC1 | F-11.AC1 | Integration | apps/web/test/api/ledger.int.test.ts | planned (P1) |
| T-F11-AC2 | F-11.AC2 | E2E | apps/web/e2e/ledger.spec.ts | planned (P1) |
| T-F12-AC1 | F-12.AC1 | Integration | apps/web/test/api/handoff.int.test.ts | planned (P1) |
| T-F13-AC1 | F-13.AC1 | Integration | apps/web/test/api/investigations-create.int.test.ts | planned |
| T-F13-AC2 | F-13.AC2 | Integration | apps/web/test/api/investigations-create.int.test.ts | planned |
| T-F13-AC3 | F-13.AC3 | Integration + E2E | apps/web/test/api/investigations-create.int.test.ts, apps/web/e2e/new-run.spec.ts | planned |
| T-F13-AC4 | F-13.AC4 | Integration | apps/web/test/api/evidence.int.test.ts | planned |
| T-F13-AC5 | F-13.AC5 | E2E | apps/web/e2e/admin.spec.ts | planned |
| T-F14-AC1 | F-14.AC1 | Integration | apps/web/test/api/corpus-stats.int.test.ts | planned |
| T-F14-AC2 | F-14.AC2 | E2E | apps/web/e2e/about.spec.ts | planned |
| T-AI-INJECT | G-AI-01 | AI eval (trap-inject) | packages/evals/src/suites/traps.ts | planned |
| T-AI-NOLEAK | G-AI-10 | Integration | packages/evals/test/no-leak.int.test.ts | planned |

## 7. Expected Results

- `pnpm test`: all green; coverage thresholds from `EVAL_GUARDRAILS.md` §7.1 met.
- `pnpm test:e2e`: all specs pass; zero serious/critical axe violations; no console errors (each spec fails on `console.error`); visual diffs ≤ 0.1 % pixels.
- Lighthouse (preview, workspace page): Performance ≥ 90, Accessibility 100, Best Practices ≥ 95.
- Eval suites: thresholds in `EVAL_GUARDRAILS.md` §7.3; outputs visible on `/evals`.
- Flakes: never retry-until-green silently. Fix immediately, or quarantine with `test.fixme` plus a Blockers row in `TASK_LOG.md` and an issue link. Known flaky risk: polling-timing E2E (use `expect.poll` with 5 s timeout, never fixed sleeps).

## 8. Verification Loop for Agents

Fast loop after each change:

```bash
pnpm typecheck
pnpm test -- <changed files or test IDs>      # e.g. -t "T-F05"
pnpm test:e2e -- e2e/<affected>.spec.ts        # UI changes only
```

Full loop before closing a phase:

```bash
pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build && pnpm test:e2e
```

Where to look: Vitest failures print in the terminal; Playwright traces, screenshots and videos land in `apps/web/test-results/` (open with `pnpm exec playwright show-trace`); worker logs are JSON lines on stdout (`pnpm dev` prefixes them `[worker]`); agent runs can be inspected at `/traces/<id>` locally.

## 9. CI Pipeline

GitHub Actions `ci.yml` on every PR:
1. `pnpm install --frozen-lockfile`
2. `pnpm lint`, `pnpm typecheck`
3. `pnpm test:coverage` with a `pgvector/pgvector:pg16` service container (`LLM_MODE=replay`)
4. `node scripts/check-policy.ts` (every mutating handler calls a policy helper)
5. `gitleaks detect`, `pnpm audit --prod --audit-level high`
6. `pnpm build` (fails if workspace route JS > 220 KB gzip)
7. Wait for Vercel preview → `pnpm test:e2e` against it + Lighthouse CI

Required for merge: 2–7. On `main`: `pnpm db:migrate` against production, then Railway deploy, then Vercel promote. Nightly: full E2E + k6 smoke against production (read-only), dependency audit.

## 10. Manual QA Checklist

- [ ] Verdict cap moment feels deliberate, not janky; reduced-motion version is static and clear.
- [ ] Evidence drawer opens the exact moment; "Open original" lands on the right video (and timestamp for YouTube).
- [ ] Copy uses British spelling, sentence case, no anthropomorphising.
- [ ] Dark mode: stamps, highlight and charts readable.
- [ ] 390 px: bottom sheet swipe, no horizontal scroll, timeline collapsible.
- [ ] Safari and Firefox: fonts load, layout intact.
- [ ] A cold visitor can reach evidence in ≤ 3 clicks from the home page.
- [ ] Failed and budget-exceeded runs look intentional.
- [ ] `/about` limitations are candid and match the actual corpus numbers.
