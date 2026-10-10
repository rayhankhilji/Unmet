# Coding agents and MCP connectors

Every coding agent starts from `INSTRUCTIONS.md`. The per-tool entry points only point there:

| Agent | Entry point | MCP config |
|---|---|---|
| Claude Code | `CLAUDE.md`, `.claude/` (settings, `/next-task`, `/phase-check`, `guardrail-reviewer` subagent) | `.mcp.json` |
| Cursor | `.cursor/rules/unmet.mdc` | `.cursor/mcp.json` |
| VS Code / Copilot | `.github/copilot-instructions.md` | `.vscode/mcp.json` |
| Codex, Amp and others reading `AGENTS.md` | `AGENTS.md` | — |
| Gemini CLI | `GEMINI.md` | — |

## MCP servers

All three configs list the same servers. Clients ask before enabling project servers; turn on only what the task needs.

| Server | What it's for here | Auth |
|---|---|---|
| `unmet` | Read-only SQL, table descriptions, investigation lists and run traces against the **local** database (`apps/mcp`). Refuses non-local databases unless `UNMET_MCP_ALLOW_REMOTE=1`. | none |
| `next-devtools` | Next.js 16 dev-server diagnostics: routes, build and runtime errors | none (needs `pnpm dev`) |
| `playwright` | Drive a browser against `pnpm dev` while building UI | none |
| `shadcn` | Look up and add shadcn/ui primitives | none |
| `context7` | Current docs for Next 16, Drizzle, Zod 4, Tailwind 4 and the provider SDKs | none |
| `github` | Issues, PRs and CI logs for `rayhankhilji/Unmet` | `GITHUB_PERSONAL_ACCESS_TOKEN` |
| `neon` | Branches, previews and schema diffs on the hosted database | OAuth |
| `vercel` | Deployments, preview URLs, build logs | OAuth |
| `sentry` | Errors from web and worker | OAuth |
| `posthog` | Product events (evidence-open funnel) | OAuth |
| `cloudflare-bindings` | The private R2 bucket for media and frames | OAuth |
| `upstash` | Rate-limit keys in Redis | `UPSTASH_EMAIL`, `UPSTASH_API_KEY` |

Railway's MCP server now ships inside the Railway CLI (`railway mcp`); add it locally once the worker is deployed (P3.T9).

## Data handling

Whatever an MCP tool returns is sent to the model the agent uses. The `unmet` server is read-only and local-only by default because the corpus holds creator content and comments; prefer aggregate queries over selecting raw transcript or comment text. Never point it at production without a reason.
