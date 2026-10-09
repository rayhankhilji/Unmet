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
- [ ] P0.T3 — Docker pgvector, Drizzle config, migrations 0000 + 0001 for all tables (tests: table-list integration test)
- [ ] P0.T4 — Env validation for web, worker, cli (tests: env schema unit tests)
- [ ] P0.T5 — `packages/shared` enums, errors, API schemas, `withErrorEnvelope` (tests: schema unit tests)
- [ ] P0.T6 — Test harness: Vitest projects, `withTestTx`, factories, MSW replay, Playwright + axe (tests: sample tests in CI)
- [ ] P0.T7 — Design tokens, fonts, dark mode, AppShell, base components, contrast script (tests: shell visual snapshot)
- [ ] P0.T8 — Fixture corpus and `pnpm db:seed` scenarios (tests: row-count test)
- [ ] P0.T9 — Health route, `policy.ts`, admin session, request IDs, security headers (tests: T-F13-AC1, headers spec)
- [ ] P0.T10 — CI workflow, Vercel + Neon previews, Sentry + PostHog wiring (tests: green CI on PR)
- [ ] P0.T11 — `/about` shell with stats block from seeded data (tests: T-F14-AC1, T-F14-AC2)
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
