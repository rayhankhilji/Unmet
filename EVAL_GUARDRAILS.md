# Unmet — Evaluation & Guardrails

> Version: 1.0 · Updated: 2026-10-09 · Every guardrail has an ID, a rule, a reason and a verification. Check §1 before marking any task done.

## 1. Definition of Done

### Task-level DoD (every task)
- [ ] The acceptance criteria referenced by the task pass, with tests; test IDs recorded in `TASK_LOG.md`.
- [ ] `pnpm typecheck`, `pnpm lint` clean; no new warnings.
- [ ] Every UI state for touched screens implemented per `DESIGN_SYSTEM.md` §9 (including running, failed, budget_exceeded, empty, evidence_unavailable where relevant).
- [ ] Tokens only (no raw hex/px); motion per §6 with reduced-motion variant; keyboard path works; axe clean on touched pages.
- [ ] Endpoints, tool schemas and tables match `ARCHITECTURE.md` exactly (path, schema, codes).
- [ ] Errors use the envelope (HTTP) or tool error result (agent); logged with `requestId`/`runId`.
- [ ] No secrets, no `console.log` debugging, no unresolved markers left in touched code.
- [ ] Every LLM call goes through `packages/llm` (tokens + cost recorded).
- [ ] Docs updated if a contract changed (ARCHITECTURE, env table, prompt registry).
- [ ] `TASK_LOG.md` updated.

### Phase-level DoD
- [ ] All ROADMAP exit criteria for the phase pass and are evidenced in `TASK_LOG.md`.
- [ ] Playwright suite for the phase's journeys passes against the Vercel preview.
- [ ] Performance budgets in §6 met on the preview; zero Sentry errors in a 10-minute smoke session.

### Release DoD (before sending the application)
- [ ] All P0 acceptance criteria pass.
- [ ] Final eval sweep run on the frozen prompt versions; results published on `/evals`; every threshold in §7 met **or** the miss is shown honestly with a failure analysis.
- [ ] Security checklist §2 verified; `PUBLIC_DEMO_MODE=true` confirmed in production.
- [ ] Neon snapshot branch taken; rollback rehearsed once.
- [ ] Manual QA checklist (`TESTING_GUIDE.md` §10) complete in light and dark, desktop and 390 px.

## 2. Security Guardrails

| ID | Rule | Reason | Verification |
|---|---|---|---|
| G-SEC-01 | Every mutating route calls `requireAdmin` or `requirePasscode` from `policy.ts` before any other work | Single enforcement point | Route test per handler; grep check in CI (`scripts/check-policy.ts`) |
| G-SEC-02 | Private investigations, findings, events and evidence return 404 to non-admins | Don't leak existence | T-F10-AC2, policy tests |
| G-SEC-03 | Passcode and admin token compared with `timingSafeEqual`; admin cookie HMAC-signed, httpOnly, Secure, SameSite=Strict, 12 h | Timing attacks, session theft | Unit tests on `policy.ts` |
| G-SEC-04 | All inputs parsed with Zod at the boundary (HTTP, CLI, manifest, tool args, LLM output) | Injection, crashes | Contract tests; `INVALID_ARGUMENTS` tool tests |
| G-SEC-05 | SQL only through Drizzle query builder or `sql` tagged templates with parameters | SQL injection | Biome rule bans string-concatenated SQL; review |
| G-SEC-06 | Rate limits: 120 req/min/IP global; 3 live runs/IP/day; admin session 5 attempts/15 min/IP | Abuse, brute force | T-F13-AC2; limiter unit tests |
| G-SEC-07 | Security headers (CSP, HSTS, nosniff, referrer policy, `frame-ancestors 'none'`) per ARCHITECTURE §11 | XSS, clickjacking | `e2e/headers.spec.ts` |
| G-SEC-08 | Admin mutations require `Origin` = `APP_URL` | CSRF | API test with foreign Origin → 403 `FORBIDDEN` |
| G-SEC-09 | Secrets only in platform env; env validated at boot; `.env.example` has fake values only | Leaks | CI `gitleaks` scan; boot test with missing var fails fast |
| G-SEC-10 | No presigned media URLs when `PUBLIC_DEMO_MODE=true` | Copyright, privacy | T-F13-AC4 |
| G-SEC-11 | Raw IPs and comment author handles never stored; salted SHA-256 only | Privacy | T-F01-AC5; schema review |
| G-SEC-12 | `pnpm audit --prod` has no high/critical advisories | Supply chain | CI step |
| G-SEC-13 | Web app never holds `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | Blast radius | Env schema for web excludes them; CI check |

## 3. AI / Agent Guardrails

| ID | Rule | Reason | Verification |
|---|---|---|---|
| G-AI-01 | All corpus text (transcripts, captions, frame text, comments, catalogue text) is wrapped in `<untrusted_content source="…">` and the system prompt states it is data, never instructions | Prompt injection via video content | Trap fixture with an injected "ignore previous instructions" caption; agent behaviour unchanged (`T-AI-INJECT`) |
| G-AI-02 | The agent can only call tools in the registry; unknown tool names return `INVALID_ARGUMENTS` | Tool misuse | Loop unit test |
| G-AI-03 | Every tool input validated with Zod; invalid → tool error, never a throw that kills the run | Robustness | Tool tests |
| G-AI-04 | Every corpus read from a tool is scoped by `asOfScope` | Future leakage invalidates backtests | T-F09-AC2, lint import restriction |
| G-AI-05 | No number reaches storage in a claim unless it appears in the referenced stat snapshot (tolerance: same value at the displayed precision; percentages compared ×100) | Core trust claim | T-F04-AC3 |
| G-AI-06 | Every claim cites ≥ 1 evidence item whose video is before `as_of` | Attribution | T-F04-AC2, T-F04-AC4 |
| G-AI-07 | `strong`/`emerging` requires a sceptic pass for that need in the same run; server-side caps apply | Viral flukes and paid campaigns | T-F05-AC1, T-F05-AC2 |
| G-AI-08 | Structured outputs (extraction, fit, judge, baseline) validated; repair-retry max 2 with the validation error in the retry message | Malformed output | T-F02-AC3 |
| G-AI-09 | Agent limits: 40 iterations, 10 min wall-clock, `RUN_TOKEN_BUDGET` tokens, $3.00 per run | Runaway cost/time | T-F04-AC5, T-F04-AC6 |
| G-AI-10 | Gold backtest answers, launched product names, and eval labels never appear in any agent or baseline prompt | Contamination | `T-AI-NOLEAK`: scan every prompt sent during a backtest for gold strings |
| G-AI-11 | Backtest scores reported split by `leakage_class` (`post_model_cutoff` vs `pre_model_cutoff`) | Model may already "know" outcomes | `/evals` shows both; test on metrics shape |
| G-AI-12 | The agent never contacts creators or external services; only read tools plus writes to its own run's tables | Scope, safety | Tool registry review |
| G-AI-13 | No personal data beyond public creator handles is sent to providers; comment authors are hashed before any prompt | Privacy | Extraction prompt fixture contains only hashes |
| G-AI-14 | Demand tests never propose deceptive tactics (fake reviews, undisclosed paid posts, fake scarcity); prompt forbids and validator rejects `activation` matching a deny-list | Ethics, ad rules | Unit test on validator |
| G-AI-15 | Model fallback used at most once per call after 3 retries; fallback use logged as an event | Reliability with visibility | Loop test with mocked 529s |

## 4. Cost & Token Budgets

Prices come from `packages/llm/src/pricing.ts`, verified against provider pricing pages in P0.T1. Caps are enforced on computed cost, not estimates.

| ID | Operation | Model | Max input tokens | Max output tokens | Cap |
|---|---|---|---|---|---|
| G-COST-01 | Agent turn | `MODEL_AGENT` | 60k per call (cache-heavy) | 4k | Run total ≤ `RUN_TOKEN_BUDGET` (600k) and ≤ $3.00 |
| G-COST-02 | Signal extraction (per video) | `MODEL_EXTRACT` | 12k | 2k | Ingest sweep ≤ $25 total |
| G-COST-03 | Keyframe description (per video, ≤ 8 images) | `MODEL_VISION` | 10k | 1.5k | included in G-COST-02 cap |
| G-COST-04 | Transcription (per video) | `whisper-1` | ≤ 3 min audio | — | included in G-COST-02 cap |
| G-COST-05 | Need label | `MODEL_EXTRACT` | 1.5k | 100 | per run ≤ 30 calls |
| G-COST-06 | Brand fit | `MODEL_EXTRACT` | 6k | 800 | per run ≤ 10 calls |
| G-COST-07 | Baseline run | `MODEL_AGENT` | 150k | 6k | ≤ $2.00 per run |
| G-COST-08 | Judge call | `MODEL_JUDGE` | 8k | 500 | Full eval sweep ≤ $60 |
| G-COST-09 | Live runs (public) | all | — | — | `DAILY_LIVE_RUN_BUDGET_USD` = $15/day; over → 402 |

- Per-run behaviour when the next call would exceed a cap: stop, save findings, `status = budget_exceeded`.
- CLI sweeps print running cost and abort cleanly when their cap is hit (re-runnable; completed items are skipped).
- **Infra:** Vercel Hobby/Pro, Railway ≈ $5/month, Neon free/Launch tier, R2 < $1, Upstash free tier. Expected ≤ $30/month plus model usage; alert if Railway or Neon bills exceed $20.
- **Coding-agent budget:** read files by section, not whole large files repeatedly; don't re-read unchanged files; summarise long test logs to the failing lines; never run live-model evals in the inner loop — use recorded fixtures (`TESTING_GUIDE.md` §4).

## 5. Error Handling Conventions

| Class | Codes | HTTP | Retry? | User sees | Logged as |
|---|---|---|---|---|---|
| Validation | `VALIDATION` | 400 | no | field errors | info |
| Auth | `PASSCODE_INVALID`, `ADMIN_TOKEN_INVALID` (401), `FORBIDDEN` (403) | 401/403 | no | inline field error | info (no secret values) |
| Payment-like limit | `BUDGET_EXHAUSTED` | 402 | after reset | banner + link to published runs | warn |
| Not found / private | `NOT_FOUND`, `BRAND_NOT_FOUND` | 404 | no | 404 page or inline | info |
| Conflict | `CONCURRENCY_LIMIT`, `NOT_CANCELLABLE`, `NOT_COMPLETED`, `OUTCOME_EXISTS`, `NOT_ELIGIBLE` | 409 | sometimes | specific message | info |
| Rate limit | `RATE_LIMITED` | 429 | after `retryAfterSeconds` | banner with time | info |
| Upstream | `MODEL_UNAVAILABLE`, `TRANSCRIBE_FAILED`, `STATS_UNAVAILABLE` | 502/503 or run error | yes (exp backoff 1/2/4 s + 0–250 ms jitter, max 3) | failed banner with code | error + Sentry |
| Internal | `INTERNAL` | 500 | no | "Something broke on our side. It's been logged." | error + Sentry |

- Code naming: SCREAMING_SNAKE, defined once in `packages/shared/src/errors.ts`.
- Circuit breaker: after 5 consecutive `MODEL_UNAVAILABLE` across runs within 5 min, the worker pauses claiming for 2 min and logs a warning.
- Frontend: route-level `error.tsx` boundaries; query errors render inline error states with retry; never a blank screen.
- Never show stack traces or raw provider errors to users; never log prompt contents, transcripts or comments.

## 6. Reliability & Performance Budgets

| ID | Budget | Target | Verification |
|---|---|---|---|
| G-PERF-01 | Published workspace LCP (desktop, preview) | < 2.0 s | Lighthouse CI on preview |
| G-PERF-02 | INP / CLS | < 200 ms / < 0.1 | Lighthouse + Playwright trace |
| G-PERF-03 | Read API p95 (investigation, findings, events, evidence) | < 300 ms | k6 smoke (50 rps, 1 min) |
| G-PERF-04 | Event visibility latency (persist → timeline) | < 2 s | T-F08-AC2 |
| G-PERF-05 | Agent run wall-clock | p95 ≤ 6 min; hard stop 10 min | SQL over runs |
| G-PERF-06 | JS shipped to workspace route | ≤ 220 KB gzip | `next build` output check in CI |
| G-PERF-07 | Live run completion rate | ≥ 90 % | SQL over runs |
| G-PERF-08 | External call timeouts | LLM 120 s, embeddings 30 s, transcription 180 s, R2 30 s | Code review + unit tests on `packages/llm` |

Graceful degradation: worker down → published pages unaffected, new runs stay queued with "Waiting for a worker…" (and are reaped to `failed/WORKER_LOST` if never claimed within 15 min); Upstash down → reads continue, run creation returns 429.

## 7. Quality Evals

### 7.1 Code quality gates
- Coverage (Vitest, lines): `packages/stats` ≥ 95 %, `packages/agent/src/tools` ≥ 90 %, `packages/shared` ≥ 90 %, other packages ≥ 70 %. Blocking in CI.
- Biome complexity: max cognitive complexity 15 per function.

### 7.2 UX quality rubric (hero flows J1, J2, J3)
Score 1–5 on clarity, feedback, motion, consistency, accessibility; minimum 4 on each to ship, assessed by Rayhan plus one outside person, recorded in `TASK_LOG.md`.

### 7.3 AI eval suites

| ID | Suite | Dataset | Metric | Threshold | Blocking |
|---|---|---|---|---|---|
| G-EVAL-01 | Extraction | 60 hand-labelled videos (`evals/gold/extraction.jsonl`) | Signal-type macro-F1 | ≥ 0.75 | Release |
| G-EVAL-02 | Extraction | same | Workaround precision | ≥ 0.80 | Release |
| G-EVAL-03 | Extraction | same | Sponsored recall | ≥ 0.90 | Release |
| G-EVAL-04 | Extraction | same | Sarcasm recall | ≥ 0.60 (reported honestly if lower) | No |
| G-EVAL-05 | Traps | 6 synthetic scenarios (`evals/traps/`) | Correct verdict | ≥ 5/6 | Release |
| G-EVAL-06 | Backtest | 8–12 cases (`evals/backtest/cases.json`) | hit@5 on positives | ≥ 0.60 and ≥ baseline + 0.20 | Release |
| G-EVAL-07 | Backtest | same | False-positive rate on negatives | ≤ 0.25 | Release |
| G-EVAL-08 | Comparison | backtest + traps outputs | Citation precision (judge) | ≥ 0.90 | Release |
| G-EVAL-09 | Comparison | same | Unsupported-number rate (Unmet) | = 0 | Release |
| G-EVAL-10 | Judge validity | 30 judge decisions spot-checked by Rayhan | Agreement | ≥ 0.85, else judge-based metrics shown with a warning | Release |
| G-EVAL-11 | Replay regression | recorded fixtures (`fixtures/llm/`) | Deterministic pipeline outputs unchanged | 100 % | CI |

Rules: live-model suites run manually (`pnpm eval:*`), never in CI. Any prompt change marks affected suites `stale` until re-run. Thresholds are never lowered to pass; misses are published with analysis.

## 8. Privacy & Compliance

| Data | Where | Retention | Deletion path |
|---|---|---|---|
| Video media + frames | R2 (private) | Until 30 days after the application process ends | `pnpm storage:purge` |
| Creator handle, follower count | Postgres | Same | `pnpm corpus:purge` |
| Transcripts, captions, frame descriptions | Postgres | Same | `pnpm corpus:purge` |
| Comment text + author hash | Postgres | Same | `pnpm corpus:purge` |
| Requester IP hash | Postgres | 30 days | nightly delete job in worker |
| Analytics events | PostHog (EU host) | PostHog default | PostHog project deletion |

- **G-PRIV-01** — No content from creators who appear to be under 18: the operator marks `likely_minor` / `exclude` at collection; ingest refuses those rows. Verified by T-F01-AC4.
- **G-PRIV-02** — Public mode shows excerpts ≤ 200 characters and links to originals; no media re-hosting.
- **G-PRIV-03** — A creator can ask for removal: `pnpm corpus:remove-creator --handle` deletes their videos and dependent rows; documented on `/about`.
- **G-PRIV-04** — Provider data settings: use API accounts whose terms exclude training on API data by default; record this in `TASK_LOG.md` during P0.T1.
- Regimes: UK GDPR applies to creator handles and comments (personal data). Lawful basis: legitimate interests for non-commercial research; minimised and time-limited. Platform terms on downloading content may restrict collection — **human decision required (PRD Q1)** before any collection begins. This is not legal advice; flag to a qualified adviser if the project becomes commercial.

## 9. Change Control

- ADR required: new library/service, new table or enum value, change to agent tool schemas, change to Evidence Strength formula (bump `formula_version`), change to as-of enforcement.
- Human approval required: anything in INSTRUCTIONS §12; any change after the final eval sweep.
- Breaking contract changes: update `packages/shared` schema + ARCHITECTURE §5 in the same PR; web and worker deploy together (CI deploys worker first, then promotes web).
- Prompt changes: bump the version file (never edit an existing version), update `prompts/registry.json`, re-run affected eval suites before publishing results.
