# Copilot instructions — Unmet

Read `INSTRUCTIONS.md` before suggesting changes; it is the single source of rules for every coding agent in this repository. The short version:

- TypeScript strict, no `any`, Zod at every boundary; shared schemas live only in `packages/shared`.
- No number produced by a model may reach the UI; numbers come from `packages/stats` snapshots.
- Agent tools read the corpus only through as-of scoped repositories (`packages/db/src/repos/asof.ts`).
- Prompts live in `prompts/`, never inline. LLM calls go through `packages/llm`.
- UI uses design tokens only (`DESIGN_SYSTEM.md`); British spelling in copy.
- Prohibited libraries and practices: `INSTRUCTIONS.md` §9.
