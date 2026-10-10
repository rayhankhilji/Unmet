---
description: Check the current phase's exit criteria and record the evidence
---

1. Read the current phase in `ROADMAP.md` and its exit criteria.
2. Run the full verification loop from `TESTING_GUIDE.md` §8: `pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build && pnpm test:e2e`.
3. For each exit criterion, record pass/fail with the evidence (command output summary, test IDs, URLs) in `TASK_LOG.md` → Completed Phases, or open a Blockers row for anything that fails.
4. Do not mark the phase complete or start the next one unless every criterion passes.
