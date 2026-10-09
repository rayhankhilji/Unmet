# Agent Instructions — Unmet

> Version: 1.0 · Updated: 2026-10-09 · Read this file at the start of every session.

## 0. Read Order

1. This file.
2. `TASK_LOG.md` — where we are, what's next.
3. `ROADMAP.md` — the current phase, its tasks and exit criteria.
4. The `PRD.md` features and `ARCHITECTURE.md` sections your task references.
5. `DESIGN_SYSTEM.md` before any UI work.
6. `EVAL_GUARDRAILS.md` before marking anything done.
7. `TESTING_GUIDE.md` when writing or running tests.

## 1. Mission

Build Unmet: an agent that finds unmet consumer demand in short-form skincare video, attacks its own conclusions, and shows the exact evidence behind every claim. The bar is a product a Plot founder would believe is real after five minutes: every number deterministic, every claim cited, every state designed, and an honest eval that beats a simple baseline.

## 2. Operating Loop

1. Open `TASK_LOG.md`; take the next unchecked task in the current phase; mark it `[~]`.
2. Restate the task, the feature IDs and acceptance criteria it touches, and the test IDs that prove it.
3. Plan in ≤ 10 lines: files to touch, schemas/contracts affected, tests to add.
4. If a contract (table, endpoint, tool schema, env var) changes, update `ARCHITECTURE.md` first.
5. Implement in small commits.
6. Run the fast loop: `pnpm typecheck && pnpm lint && pnpm test -- <affected>`; then the relevant E2E spec.
7. Walk the task-level Definition of Done in `EVAL_GUARDRAILS.md` §1.
8. Update `TASK_LOG.md` (status, tests, notes, next action). Commit.

Never start the next phase until every exit criterion of the current phase passes and is recorded in `TASK_LOG.md`.

## 3. Tech Stack (locked)

| Layer | Choice |
|---|---|
| Runtime / language | Node 24 LTS, TypeScript strict |
| Monorepo | pnpm workspaces + Turborepo |
| Web | Next.js 16 App Router, React 19, Tailwind CSS 4, shadcn/ui, Motion, Lucide, TanStack Query 5, Recharts, Sonner, Vaul |
| Contracts | Zod 4 in `packages/shared` |
| Data | Postgres 16 on Neon + pgvector, Drizzle ORM |
| AI | `@anthropic-ai/sdk` (agent, extraction, vision, judge); `openai` (whisper-1, text-embedding-3-small) |
| Media | ffmpeg/ffprobe via `execa` |
| Storage | Cloudflare R2 via AWS S3 SDK v3 (fs driver locally) |
| Rate limits | Upstash Redis (memory driver locally) |
| Tests | Vitest, Playwright, axe-core, MSW |
| Lint/format | Biome |
| Observability | Sentry, PostHog, pino |

Do not introduce new frameworks, libraries, or services without recording an ADR in `ARCHITECTURE.md` §16 and a row in `TASK_LOG.md` → Decisions.

## 4. Repository Structure

```text
.
├── apps/
│   ├── web/                    # Next.js: pages + /api/v1 route handlers
│   │   ├── src/app/            # routes (ARCHITECTURE §7.1)
│   │   ├── src/app/api/v1/     # route handlers (ARCHITECTURE §5.2) — one folder per resource
│   │   ├── src/components/     # app components (PascalCase.tsx); ui/ = shadcn primitives
│   │   ├── src/lib/api/        # TanStack Query hooks — the ONLY client-side fetch layer
│   │   ├── src/server/         # repositories access, policy.ts, env.ts (server-only)
│   │   └── e2e/                # Playwright specs
│   ├── worker/                 # queue consumer, Dockerfile
│   └── cli/                    # pnpm commands: ingest, extract, embed, evals, run
├── packages/
│   ├── shared/                 # Zod schemas, enums, error codes, API types
│   ├── db/                     # Drizzle schema, migrations/, repos/ (asof.ts lives here)
│   ├── llm/                    # model clients, prompts loader, pricing, retries
│   ├── stats/                  # clustering, snapshots, evidence strength
│   ├── agent/                  # loop, tools/, sceptic rules, fit, demand tests, baseline
│   ├── pipeline/               # ingest + extraction
│   ├── storage/                # R2/fs drivers
│   └── evals/                  # suites, scorers, judges
├── prompts/                    # <name>.v<N>.md + registry.json
├── data/                       # manifest.csv, brands/*.json; raw/ is gitignored
├── evals/                      # gold/, traps/, backtest/, human/ (data, not code)
├── fixtures/                   # corpus-small/, llm/ recorded responses
└── docs/                       # these build docs live at repo root; docs/ holds archives
```

Rules:
- React component files are PascalCase (`NeedCard.tsx`); every other file is kebab-case (`get-need-stats.ts`).
- Colocate unit tests as `*.test.ts` next to the source.
- No barrel files except each package's `src/index.ts`.
- Shared schemas live only in `packages/shared`; never redefine a schema in an app.
- Prompts live only in `prompts/`; never inline prompt text in code.
- Agent tools live in `packages/agent/src/tools/<tool-name>.ts`, one tool per file, each exporting `{ name, inputSchema, handler }`.

## 5. Commands

| Purpose | Command |
|---|---|
| Install | `pnpm install` |
| Start local DB | `pnpm db:up` (docker compose, pgvector/pgvector:pg16 on 5433) |
| Dev (web + worker) | `pnpm dev` |
| Build | `pnpm build` |
| Typecheck | `pnpm typecheck` |
| Lint / format | `pnpm lint` · `pnpm format` |
| Unit + integration tests | `pnpm test` (single file: `pnpm test -- packages/stats/src/snapshot.test.ts`) |
| E2E | `pnpm test:e2e` (headed: `pnpm test:e2e -- --headed`) |
| Generate migration | `pnpm db:generate --name <change>` |
| Migrate / seed / reset | `pnpm db:migrate` · `pnpm db:seed` · `pnpm db:reset` |
| Seed trap corpora | `pnpm db:seed:traps` |
| Load brands | `pnpm brands:load` |
| Check manifest | `pnpm manifest:check` |
| Ingest / extract / embed | `pnpm ingest` · `pnpm extract` · `pnpm embed` |
| Local investigation | `pnpm run:investigation -- --brand lrp-like --question "…" --as-of 2026-06-01` |
| Evals | `pnpm eval:extraction` · `pnpm eval:traps` · `pnpm eval:backtest` · `pnpm eval:compare` · `pnpm eval:all` |
| Test variants | `pnpm test:watch` · `pnpm test:coverage` |
| Re-record LLM fixtures (costs money, needs approval) | `pnpm llm:record -- <test path>` |
| Contrast check for tokens | `pnpm design:contrast` |
| Snapshot prod DB | `pnpm db:snapshot` |
| Privacy deletion | `pnpm corpus:remove-creator -- --handle <h>` · `pnpm corpus:purge` · `pnpm storage:purge` |

## 6. Coding Standards

- TypeScript `strict`, `noUncheckedIndexedAccess`. No `any`; use `unknown` and narrow. No `!` non-null assertions without a one-line comment explaining why it's safe.
- Small functions, early returns, pure where possible. Soft limit 300 lines per file.
- Errors: throw `AppError(code, message, details?)` from `packages/shared/src/errors.ts`; route handlers convert to the envelope via `withErrorEnvelope(handler)`. Tools return `{ ok: false, code, message }` results to the model instead of throwing.
- Validate all external input (HTTP, CLI args, manifest rows, LLM output, tool args) with schemas from `packages/shared` at the boundary.
- Data access only through `packages/db/src/repos/*`. Agent tools only through as-of scoped repos (`asOfScope`).
- Async: no floating promises (Biome rule on). Every external call has a timeout (`AbortSignal.timeout`): LLM 120 s, embeddings 30 s, transcription 180 s, R2 30 s.
- LLM calls only via `packages/llm` (`callModel`, `callStructured`) so tokens and cost are always recorded.
- Comments explain why, not what. No commented-out code.
- Import order: node built-ins → external → `@unmet/*` → relative (Biome organises).

Do:

```ts
// tools/get-need-stats.ts
export const handler = async (input: GetNeedStatsInput, ctx: ToolContext) => {
  const snapshot = await snapshots.latestForNeed(ctx.scope, input.needId);
  if (!snapshot) return toolError("NEED_NOT_FOUND", `No need ${input.needId} in this run`);
  return { ok: true, snapshotId: snapshot.id, ...snapshot.stats };
};
```

Don't:

```ts
// computes a number with the model and queries without as_of
const res = await anthropic.messages.create({ /* "estimate growth for this need" */ });
const rows = await db.select().from(signal); // no as_of filter, bypasses repos
```

## 7. Frontend Rules

- Use design tokens only (CSS variables from `DESIGN_SYSTEM.md` §2–§6). No raw hex, no arbitrary Tailwind values like `w-[317px]`.
- Use `src/components/ui` (shadcn) primitives first; customise via tokens, not one-off styles.
- Every screen implements every state listed in `PRD.md` and `DESIGN_SYSTEM.md` §9 — including running, failed, budget_exceeded, empty, evidence_unavailable.
- Motion per `DESIGN_SYSTEM.md` §6, always with the reduced-motion variant.
- Fetch only through hooks in `src/lib/api/`; call only endpoints listed in `ARCHITECTURE.md` §5.2. First paint of published pages uses server components.
- Every number shown from a stat snapshot renders through `<StatValue snapshotId field />` so it carries the "from query" marker.
- Brand names render only via `brand.displayName` ("A skincare brand like …"). No brand logos or colours.
- Track PostHog events listed in `ARCHITECTURE.md` §8 — no others without updating that list.

## 8. Backend Rules

- Every route handler starts with schema parsing and a policy call from `src/server/policy.ts` (`canRead`, `requireAdmin`, `requirePasscode`).
- Private resources return 404 to non-admins.
- Run creation checks, in order: schema → passcode → `LIVE_RUNS_ENABLED` → per-IP limit → concurrency → daily budget.
- `POST /investigations` honours `Idempotency-Key`.
- Log with `requestId`; never log transcripts, comments, prompts or API keys.
- The worker is the only process that runs agents. Web never imports `packages/agent`.
- Migrations are additive. Destructive changes need a human (see §12).

## 9. Prohibited

| Don't | Why | Instead |
|---|---|---|
| `axios`, `request` | fetch suffices | native `fetch` / SDKs |
| `moment` | heavy, legacy | `date-fns` |
| `lodash` (full) | bundle weight | native or per-method import |
| LangChain, LlamaIndex, agent frameworks | the loop is ~200 lines and is the thing being shown | `packages/agent/src/loop.ts` |
| Any second UI kit or CSS-in-JS runtime | consistency | shadcn/ui + Tailwind |
| Python services | ADR-001 | TypeScript |
| Scraping libraries or automated downloading from TikTok/Instagram/YouTube | platform terms, PRD §6 | operator-assembled manifest |

Practices:
- Never let an LLM produce a number that reaches the UI; numbers come from `packages/stats`.
- Never query corpus tables from agent tools without `asOfScope`.
- Never pass gold backtest answers, launched-product names, or eval labels into any agent prompt.
- Never serve media or frame images when `PUBLIC_DEMO_MODE=true`.
- Never store raw comment author handles or raw IPs.
- Never commit secrets, `data/raw/`, or `.env*` files other than `.env.example`.
- Never edit an applied migration.
- Never skip, weaken, or delete a test to make CI pass; never mock the unit under test.
- Never swallow errors with broad `try/catch`; never leave `console.log` debugging.
- Never ship placeholder UI as done, or build anything listed in `PRD.md` §6.
- Never use Plot's name, logo or colours as if Unmet were a Plot product.

## 10. When Stuck

After two failed attempts at the same problem: stop. Write a row in `TASK_LOG.md` → Blockers (what you tried, exact error output, hypotheses, what you need). Move to the next unblocked task in the phase, or ask the human if none remain. Never silently change requirements, schemas or architecture to get unstuck. If an eval threshold can't be met, record the actual numbers and the failure analysis — do not lower thresholds.

## 11. Git & Commits

- Branch: `p<phase>/<task-id>-<slug>` e.g. `p2/p2-t3-record-finding`.
- Conventional Commits: `feat(agent): validate numbers against snapshot (P2.T3)`.
- One commit per task minimum; PR per phase or per 2–4 tasks.
- PR description: tasks covered, feature/AC IDs, test IDs, screenshots for UI, eval deltas if prompts changed.

## 12. Human Escalation

Ask Rayhan before:
- Adding any paid service or raising any budget in `EVAL_GUARDRAILS.md` §4.
- Any destructive migration or deleting corpus data.
- Changing a prompt after the final eval run (it invalidates published results).
- Publishing a run, or showing any specific creator's video prominently in public.
- Anything touching how the corpus was collected (Open Question Q1).
- Ambiguous acceptance criteria or a conflict between docs.
