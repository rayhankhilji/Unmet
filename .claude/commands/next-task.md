---
description: Take the next open task from TASK_LOG.md and run the operating loop
---

Follow INSTRUCTIONS.md §2 exactly:

1. Read `TASK_LOG.md`. Take the first unchecked task in the current phase (skip tasks marked **(human)**) and mark it `[~]`.
2. Restate the task, the feature and acceptance-criteria IDs it touches, and the test IDs that prove it.
3. Plan in at most 10 lines: files, contracts affected, tests to add.
4. If a contract changes (table, endpoint, tool schema, env var), update `ARCHITECTURE.md` first.
5. Implement, then run `pnpm typecheck && pnpm lint && pnpm test -- <affected>` and any affected E2E spec.
6. Walk the task-level Definition of Done in `EVAL_GUARDRAILS.md` §1.
7. Update `TASK_LOG.md` (status, tests, decisions, next action) and commit with a Conventional Commit message naming the task ID. No AI attribution trailers.

$ARGUMENTS
