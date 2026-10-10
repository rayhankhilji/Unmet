# Task Log — Unmet

> Agents: update this file at the end of every task and every session. Keep the Status block current. Newest entries at the top of the Session Log.

## Status

- **Current phase:** P0 — Foundation
- **Current focus:** P0.T1 — Verify current stable versions and model IDs/prices
- **Next action:** Look up current stable majors for Node, Next.js, Tailwind, Drizzle, Zod, Anthropic and OpenAI SDKs, plus current Claude model IDs and per-token prices; record them in Decisions below and in `packages/llm/src/pricing.ts`.
- **Blocked:** none
- **Last updated:** 2026-10-09 by Claude (docs generated)

## Current Phase Checklist

Legend: `[ ]` open · `[~]` in progress · `[x]` done · `[!]` blocked

- [x] P0.T1 — Verify current stable versions and model IDs/prices; record in Decisions and `pricing.ts` (tests: typecheck; `packages/llm/src/pricing.test.ts` 7/7)
- [x] P0.T2 — Scaffold pnpm + Turborepo monorepo, strict tsconfig, Biome, env examples (tests: `pnpm install && pnpm typecheck && pnpm lint` green, 11/11 typecheck tasks)
- [x] P0.T3 — Docker pgvector, Drizzle config, migrations 0000 + 0001 for all tables (tests: `packages/db/test/schema.int.test.ts` 3/3 — 22 tables, 21 enums, pgvector, HNSW/GIN/queue indexes)
- [x] P0.T4 — Env validation for web, worker, cli (tests: `packages/shared/src/env.test.ts`, `apps/web/src/server/env-schema.test.ts` incl. G-SEC-13, `apps/worker/src/env.test.ts`, `apps/cli/src/env.test.ts` — 15 tests)
- [x] P0.T5 — `packages/shared` enums, errors, API schemas, `withErrorEnvelope` (tests: 63 unit tests across `packages/shared/src/**`; line coverage 98 %)
- [x] P0.T6 — Test harness: Vitest projects, `withTestTx`, factories, MSW replay, Playwright + axe (tests: `packages/db/test/harness.int.test.ts` 6/6, `packages/llm/src/testing/replay.test.ts` 4/4, `packages/shared/src/testing/testing.test.ts` 8/8, `apps/web/e2e/smoke.spec.ts` 1/1; CI run lands with P0.T10)
- [x] P0.T7 — Design tokens, fonts, dark mode, AppShell, base components, contrast script (tests: `e2e/visual.spec.ts` 7/7 — 4 baselines at 1440/390 × light/dark with axe, theme persistence, no horizontal scroll at 390; component tests `Button.test.tsx`, `States.test.tsx` 5/5; `pnpm design:contrast` 60/60)
- [x] P0.T8 — Fixture corpus and `pnpm db:seed` scenarios (tests: `apps/cli/test/seed.int.test.ts` 4/4 — row counts, run totals = event sums, claim evidence/number rules, repeatable + e2e eval fixtures; `packages/stats/src/snapshot.test.ts` 8/8 incl. T-F03-AC1/AC3/AC4 on the pure function)
- [x] P0.T9 — Health route, `policy.ts`, admin session, request IDs, security headers (tests: T-F13-AC1 in `apps/web/test/api/investigations-create.int.test.ts`; `health`, `admin-session` (G-SEC-03/06/08), `policy` int tests — 21 total; `e2e/headers.spec.ts` 3/3; `scripts/check-policy.test.ts` 4/4; `pnpm check:policy` 0 violations)
- [ ] P0.T10 — CI workflow, Vercel + Neon previews, Sentry + PostHog wiring (tests: green CI on PR)
- [x] P0.T11 — `/about` shell with stats block from seeded data (tests: T-F14-AC1 in `apps/web/test/api/corpus-stats.int.test.ts` 3/3; T-F14-AC2 + seeded-count check + nav in `e2e/about.spec.ts` 3/3; About baselines at 1440/390 × light/dark with axe)
- [ ] P0.T12 — **(human)** Corpus sourcing decision + `data/collection-plan.md`
- [ ] P0.T13 — **(human)** 3–5 interviews → `docs/research/interviews.md`

## Up Next

Phase 1 — Corpus (F-01, F-14):

- [ ] P1.T1 — **(human)** Assemble `data/manifest.csv` and `data/raw/` per the collection plan
- [ ] P1.T2 — `pnpm manifest:check` + manifest loader (T-F01-AC4)
- [ ] P1.T3 — `packages/storage` fs + r2 drivers; media upload stage
- [ ] P1.T4 — Transcription stage with idempotency (T-F01-AC1, T-F01-AC2)
- [ ] P1.T5 — Keyframe stage (4–8 frames, scene detection)
- [ ] P1.T6 — Vision stage with `vision.keyframes.v1` (T-F01-AC1)
- [ ] P1.T7 — Comments stage with hashed authors (T-F01-AC5)
- [ ] P1.T8 — `packages/llm` core: structured calls, retries, fallback, cost accounting
- [ ] P1.T9 — `pnpm ingest` orchestration (T-F01-AC1, T-F01-AC3)
- [ ] P1.T10 — Ingest the real corpus to ≥ 95 % complete
- [ ] P1.T11 — `/about` live corpus block (T-F14-AC1)

## Blockers

| ID | Task | Description | Tried | Hypotheses | Needs | Opened |
|---|---|---|---|---|---|---|

No blockers.

## Decisions & Deviations

| Date | Decision | Reason | Docs updated |
|---|---|---|---|
| 2026-10-09 | Product scoped to demand-gap detection (complaints, wishes, workarounds) with sceptic pass, brand fit and demand test; creator matching reduced to a P1 handoff | Strongest, checkable slice; avoids rebuilding Plot's Creator Intelligence | PRD §5, §6 |
| 2026-10-09 | TypeScript end to end; Postgres-backed queue; polling for live events | Solo builder, low volume, one contract package | ARCHITECTURE ADR-001, ADR-002, ADR-005 |
| 2026-10-09 | Numbers only from deterministic stat snapshots; `record_finding` rejects others | Core trust claim | ARCHITECTURE ADR-003, EVAL_GUARDRAILS G-AI-05 |
| 2026-10-09 | P0.T1 verified versions (npm registry, 9 Oct 2026): Node 24 LTS (engines `>=24`), pnpm 10.34, Turborepo 2.11, TypeScript **6.0.3** (pinned below the 7.x native port so tools that use the compiler API — Next build type-check, drizzle-kit — stay supported; revisit in P6), Next 16.4, React 19.3, Tailwind 4.3, Zod 4.6, Drizzle ORM 0.45 / drizzle-kit 0.31, `@anthropic-ai/sdk` 0.133, `openai` 7.32, Biome 2.5, Vitest 5.0, Playwright 1.64, `@axe-core/playwright` 4.13, MSW 3.0, Motion 14.1, TanStack Query 5.104, Recharts 3.10, Sonner 2.0, Vaul 1.1, pino 10, `@sentry/nextjs`/`@sentry/node` 11.6, posthog-js 1.438, `@t3-oss/env-nextjs` 0.13, `pg` 8.23 | Docs listed majors only; several moved on (Vitest 5, MSW 3, `openai` 7, Sentry 11, Recharts 3, Motion 14) | ARCHITECTURE §2 |
| 2026-10-09 | Model IDs and prices (USD per MTok, in / out / 5m cache write / 1h cache write / cache read): `claude-opus-5-5` 4 / 20 / 5 / 8 / 0.20 · `claude-sonnet-5-5` 2 / 10 / 2.50 / 4 / 0.20 · `claude-haiku-5-5` 0.10 / 0.50 / 0.125 / 0.20 / 0.01 for prompts ≤ 100k tokens, 0.50 / 2.50 / 0.625 / 1 / 0.05 above · `whisper-1` $0.006/audio minute · `text-embedding-3-small` $0.02/MTok | PRD Q4 defaults confirmed; Haiku 5.5 has a long-prompt rate card, handled in `priceAnthropicUsage` | `packages/llm/src/pricing.ts` |
| 2026-10-10 | Web, worker and CLI all use `pg` (node-postgres) through `packages/db`; `@neondatabase/serverless` is not used | One driver for Docker and Neon; the serverless driver needs a WebSocket proxy locally. Vercel functions run on the Node runtime, where `pg` against Neon's pooled endpoint is fine at this traffic | ARCHITECTURE §8 |
| 2026-10-10 | Integration tests clone a migrated template database per Vitest worker (`unmet_test_w<poolId>`) instead of a schema per worker | drizzle-kit emits `"public"."<enum>"`-qualified types, so per-schema isolation would not work; template cloning is as fast and fully isolated | TESTING_GUIDE §2 |
| 2026-10-10 | Database rules from §4.4 are enforced as CHECK constraints too: evidence reference shape, claim-with-digit needs a snapshot, uncertainties/alternatives required unless rejected, demand-test ranges | Defence in depth behind the tool validators (G-AI-05, G-AI-06) | — |
| 2026-10-10 | `docker-compose.yml` host port reads `UNMET_DB_PORT` (default 5433) | Another local project already holds 5433 on Rayhan's machine | TESTING_GUIDE §2 |
| 2026-10-10 | New error code `LIVE_RUNS_DISABLED` (503) for run creation when `LIVE_RUNS_ENABLED=false` | ARCHITECTURE §8 orders a `LIVE_RUNS_ENABLED` check but the catalogue had no code for it | ARCHITECTURE §5.2, §5.4; EVAL_GUARDRAILS §5 |
| 2026-10-10 | Enum tuples live once in `packages/shared/src/enums.ts`; Drizzle's `pgEnum`s are built from them | Database and API can't drift; the schema integration test also checks the tuples against Postgres | ARCHITECTURE §4.1 |
| 2026-10-10 | Provider SDK clients capture `fetch` when constructed; tests must construct them after MSW `listen()`, and `packages/llm` (P1.T8) should pass `fetch: (...a) => globalThis.fetch(...a)` | Found in P0.T6: clients built at import time bypassed MSW and hit the real API (with fake keys) | TESTING_GUIDE §4.3 |
| 2026-10-10 | `pnpm db:reset` refuses non-local hosts unless `--allow-remote` is passed | Destructive command; INSTRUCTIONS §12 | INSTRUCTIONS §5 |
| 2026-10-10 | Dark `--border-strong` raised from `#6E685E` to `#726C62` | `pnpm design:contrast` measured 2.94:1 on `--surface-raised` (inputs in dialogs/drawer); now 3.12:1 | DESIGN_SYSTEM §2 |
| 2026-10-10 | The top bar lists only pages that exist; About, Evals and "Run live" are added in the tasks that build those pages (P0.T11, P5.T7, P4.T6) | No dead links in a public shell; typed routes enforce it | DESIGN_SYSTEM §8 (Navigation) unchanged — end state is the same |
| 2026-10-10 | No theme library: a 1-line inline script sets `.dark` before paint, a toggle writes `localStorage` (try/catch) | Avoids a new dependency; the script is nonce-gated under the CSP added in P0.T9 | — |
| 2026-10-10 | Pure `computeSnapshotStats` (formula `es@1`) pulled forward from P2.T6 into `packages/stats` | The seed's snapshots and claim numbers must come from the real formula, not hand-typed values. P2.T6 still owns the SQL inputs, persistence and the remaining T-F03 tests | ROADMAP P2.T6 (scope reduced) |
| 2026-10-10 | Seed loads only the fictional `fixture-skin` brand; `lrp-like.json` is built in P3.T1 | Its catalogue must come from verified public product pages, not invented URLs | TESTING_GUIDE §4.2 |
| 2026-10-10 | Fixture corpus is synthetic: handles prefixed `fx_`, URLs on example.com, `platform = synthetic`, `is_synthetic = true` | Nothing in fixtures can be mistaken for a real creator or post | — |
| 2026-10-10 | Seeded failed and running runs are `private`; E2E reads them with an admin session | `PATCH` refuses to publish non-completed runs (409 NOT_COMPLETED); fixtures shouldn't contradict that | — |
| 2026-10-10 | **Needs Rayhan:** docs disagree on the first check in `POST /investigations`. INSTRUCTIONS §8 and ARCHITECTURE §6.2 say schema → passcode; EVAL_GUARDRAILS G-SEC-01 says the policy call comes "before any other work". Implemented schema → passcode (two docs, and it only reveals field names). Swap the two lines in `apps/web/src/app/api/v1/investigations/route.ts` if G-SEC-01 should win | Doc conflict, INSTRUCTIONS §12 | — |
| 2026-10-10 | CSP uses a per-request nonce + `strict-dynamic`, set in `src/proxy.ts`; pages render dynamically as a result | Next.js hydration needs inline scripts; `default-src 'self'` alone breaks every page. Nonces keep XSS protection without `'unsafe-inline'` scripts | ARCHITECTURE §11 |
| 2026-10-10 | Web logs are JSON lines written directly to stdout/stderr (`src/server/log.ts`), not pino | Avoids bundling pino into Next route handlers; same fields | ARCHITECTURE §14 unchanged in substance |
| 2026-10-10 | `POST /investigations` stops after the passcode check with `LIVE_RUNS_DISABLED` until P4.T6 adds limits, budget and the insert | Route and its 401 path exist (T-F13-AC1) without opening an unguarded run path | — |
| 2026-10-10 | Migrations are exported from `@unmet/db/migrate`, not the package index | Keeps migration files out of the web bundle | — |
| 2026-10-10 | The /about pipeline diagram is an HTML ordered list, not a static SVG | Reflows to one column at 390 px and reads in order to screen readers; an SVG scaled to phone width made its text unreadable | DESIGN_SYSTEM §9.6 |
| 2026-10-10 | /about shows a warning whenever every counted video is synthetic | Honesty on previews: no fixture should read as evidence about real products | — |
| 2026-10-10 | Added `apps/mcp` (read-only project MCP server) and connector configs for Claude Code, Cursor, VS Code, Copilot and Gemini (`docs/agents.md`) | Requested by Rayhan; the official Postgres MCP server is deprecated | ARCHITECTURE ADR-008, §3; INSTRUCTIONS §4 |
| 2026-10-10 | Sentry 11 collects request data, cookies, DB values and AI prompts by default; `SENTRY_DATA_COLLECTION` in `packages/shared` switches all of it off for web and worker | ARCHITECTURE §14: LLM payloads never go to Sentry | — |
| 2026-10-10 | PostHog runs with memory persistence, no autocapture, no pageviews, no recordings | Only the events in ARCHITECTURE §8 are sent, and nothing needs a cookie banner | — |
| 2026-10-10 | `loadLocalEnv` reads no files when `VERCEL` or `RAILWAY_ENVIRONMENT` is set | Prevents a missing production secret from silently falling back to a fake value in `.env.example` | — |
| 2026-10-10 | CI skips pixel comparisons (`ignoreSnapshots` when `CI`) but runs every other assertion in the visual specs | Baselines are rendered on macOS; Linux font rasterisation differs. Linux baselines can be added later | TESTING_GUIDE §5 |
| 2026-10-09 | G-PRIV-04: both providers are used via API accounts. Anthropic's commercial terms and OpenAI's API data policy exclude API inputs/outputs from model training by default; no opt-in will be enabled. Rayhan to confirm neither org has opted into data sharing when keys are created. | Privacy of creator content sent to providers | EVAL_GUARDRAILS §8 |

## Session Log

### 2026-10-09 — Session 0 (docs)
- Done: Generated PRD, ARCHITECTURE, INSTRUCTIONS, DESIGN_SYSTEM, EVAL_GUARDRAILS, TESTING_GUIDE, ROADMAP, TASK_LOG, CLAUDE.md, AGENTS.md.
- Tests: none yet.
- Notes: Open questions Q1 (corpus sourcing) and Q2 (backtest cases) are human decisions; P0.T12 and P5.T2 cover them.
- Next: P0.T1.

## Completed Phases

| Phase | Completed | Exit-criteria evidence |
|---|---|---|
