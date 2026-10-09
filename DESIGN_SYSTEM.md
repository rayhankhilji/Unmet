# Unmet — Design System

> Version: 1.0 · Updated: 2026-10-09 · Applies to every screen in `apps/web`. Components use semantic tokens only.

## 1. Design Direction

**Personality:** calm, forensic, precise, warm, candid. **Not:** a chatbot, a glossy "AI magic" gradient product, a dashboard of vanity charts, playful.

The metaphor is a **researcher's evidence board on good paper**: warm off-white surfaces, ink-dark type, a yellow marker highlight for evidence, and verdict colours used sparingly like stamps. It should feel like something an insights team would trust in a meeting — and visibly *not* like a chat transcript.

**References and what to take:**
- **Linear** — density without clutter, keyboard-first navigation, quiet chrome.
- **Editorial investigations (e.g. long-form newsroom explainers)** — serif display type, generous reading measure, evidence placed beside the claim it supports.
- **Observable notebooks** — numbers that show where they came from.

**Principles:**
1. **Evidence before conclusion.** Every claim sits next to its evidence chips; the drawer is one click away. Implication: claim rows always reserve space for chips; a claim without chips is a bug.
2. **Uncertainty is first-class.** "Why this might be wrong" is a tab, not a footnote. Implication: Sceptic tab has equal weight to Evidence; capped verdicts show the cap visibly.
3. **Numbers never move.** Statistics don't animate, count up or round differently in two places. Implication: all numbers render via `<StatValue>` in mono, tabular figures, with the "from query" marker.
4. **Show the work, calmly.** The agent's steps are visible but quiet; the timeline is a margin, the findings are the page. Implication: timeline uses muted text and small type; findings use display type.
5. **One clear next action per screen.** Implication: one primary button per view.

## 2. Color Tokens

Defined as CSS variables in `apps/web/src/app/globals.css` and exposed to Tailwind via `@theme`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#F7F4EE` | `#121110` | page (paper) |
| `--surface` | `#FCFAF6` | `#1A1917` | panels, cards |
| `--surface-raised` | `#FFFFFF` | `#22201D` | drawer, dialogs, popovers |
| `--border` | `#E4DED3` | `#2E2B27` | dividers, card borders (decorative) |
| `--border-strong` | `#8C8579` | `#726C62` | input borders, focusable outlines (≥ 3:1) |
| `--text` | `#1A1814` | `#EDE8DF` | primary text |
| `--text-muted` | `#5E584E` | `#A39D92` | secondary text, timeline |
| `--primary` | `#1A1814` | `#EDE8DF` | primary buttons (ink) |
| `--primary-foreground` | `#F7F4EE` | `#121110` | text on primary |
| `--highlight` | `#FBE7A1` | `#4A3C10` | evidence marker highlight, selected chip |
| `--info` | `#1F4F99` | `#8DB4F5` | links, "from query" marker |
| `--focus-ring` | `#1F4F99` | `#8DB4F5` | 2px focus outline |
| `--success` | `#14613C` | `#7AD9A6` | passed evals |
| `--warning` | `#7A4E0B` | `#F0BE6A` | capped verdicts, stale evals |
| `--danger` | `#9B1C14` | `#F59A90` | failed runs, errors |
| `--overlay` | `rgba(26,24,20,0.40)` | `rgba(0,0,0,0.60)` | sheet/dialog scrim |
| `--verdict-strong-fg` / `-bg` | `#14613C` / `#E3F1E8` | `#7AD9A6` / `#14281D` | verdict stamp |
| `--verdict-emerging-fg` / `-bg` | `#7A4E0B` / `#FBEFD6` | `#F0BE6A` / `#2E2310` | verdict stamp |
| `--verdict-weak-fg` / `-bg` | `#4F4A42` / `#ECE8E0` | `#C2BCB1` / `#2A2824` | verdict stamp |
| `--verdict-rejected-fg` / `-bg` | `#9B1C14` / `#FBE4E1` | `#F59A90` / `#33171A` | verdict stamp |
| `--chart-1` … `--chart-5` | `#1A1814`, `#1F4F99`, `#B7791F`, `#14613C`, `#9C8F7A` | `#EDE8DF`, `#8DB4F5`, `#F0BE6A`, `#7AD9A6`, `#8C8579` | series (recent window always `--chart-1`, prior window `--chart-5`) |

Verified contrast (WCAG): text/background 16.2 (light) · 15.5 (dark); muted/background 6.4 · 7.0; muted/surface-raised 7.0 · 6.0; every verdict fg/bg pair ≥ 6.3 (light) · ≥ 7.7 (dark); text on highlight 14.4 · 8.9; info/background 7.3 · 9.0; border-strong/background 3.3 · 3.6; border-strong/surface-raised 3.7 · 3.1 (dark value raised from `#6E685E`, which measured 2.94 on surface-raised). `pnpm design:contrast` checks 60 pairs across both themes. Requirement: text ≥ 4.5:1; UI boundaries ≥ 3:1. Never convey verdict by colour alone — stamps always include the word.

## 3. Typography

| Family | Token | Source | Fallback | Use |
|---|---|---|---|---|
| Instrument Serif | `--font-display` | `next/font/google`, weight 400 + italic | `Georgia, serif` | page titles, need labels, verdict headline |
| Geist | `--font-sans` | `next/font/google`, variable | `system-ui, sans-serif` | UI and body |
| Geist Mono | `--font-mono` | `next/font/google` | `ui-monospace, monospace` | numbers, timestamps, IDs, trace payloads |

| Token | Size / line-height | Weight | Tracking | Family | Usage |
|---|---|---|---|---|---|
| `display-xl` | 48 / 52 | 400 | -0.01em | display | Home hero question |
| `display` | 34 / 40 | 400 | -0.005em | display | Investigation title, need label in detail |
| `title` | 22 / 28 | 600 | -0.01em | sans | Section titles, card need labels |
| `heading` | 17 / 24 | 600 | 0 | sans | Tab content headings |
| `body` | 15 / 24 | 400 | 0 | sans | Prose, summaries |
| `body-sm` | 13 / 20 | 400 | 0 | sans | Timeline, metadata, table cells |
| `label` | 12 / 16 | 500 | 0.04em, uppercase | sans | Stat labels, tab labels, stamp text |
| `mono` | 13 / 20 | 450 | 0 | mono, `tabular-nums` | All numbers, timestamps (`0:14`), IDs |

Rules: max reading measure 68ch for summaries; numbers always `font-variant-numeric: tabular-nums`; sentence case everywhere except `label`.

## 4. Spacing, Layout & Grid

- Spacing scale (4 px base): `0.5`=2, `1`=4, `2`=8, `3`=12, `4`=16, `5`=20, `6`=24, `8`=32, `10`=40, `12`=48, `16`=64.
- Breakpoints: `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536.
- Container: max 1440 px, side padding 24 px (16 px < `md`).
- **Workspace (≥ `xl`):** 3 columns — timeline 288 px · findings fluid (min 520) · evidence drawer 420 px (present only when evidence selected; findings column reflows).
- **Workspace (`lg`–`xl`):** timeline collapses into a 48 px rail with a toggle; drawer overlays from the right as a sheet.
- **Workspace (< `lg`):** single column; timeline becomes a collapsible "How it got here" section at the top; drawer is a bottom sheet (90 vh max).
- Page templates: `AppShell` (top bar 56 px + content), `ReadingPage` (single 720 px column: About, eval run detail), `WorkspacePage`.

## 5. Shape, Elevation & Effects

| Token | Value |
|---|---|
| `--radius-sm` | 4 px (chips, stamps) |
| `--radius-md` | 8 px (inputs, buttons, cards) |
| `--radius-lg` | 12 px (drawer, dialogs) |
| Border widths | 1 px default; 2 px focus ring with 2 px offset |
| `--shadow-1` | light `0 1px 2px rgba(26,24,20,0.06)` · dark `0 1px 2px rgba(0,0,0,0.5)` (cards on hover) |
| `--shadow-2` | light `0 8px 24px rgba(26,24,20,0.10)` · dark `0 8px 24px rgba(0,0,0,0.6)` (drawer, popovers) |
| `--shadow-3` | light `0 16px 48px rgba(26,24,20,0.16)` · dark `0 16px 48px rgba(0,0,0,0.7)` (dialogs) |

No glass/blur. A subtle paper grain (`/textures/paper.png`, 4 % opacity, 128 px tile) on `--background` only, disabled in dark mode. z-index scale: base 0 · sticky 10 · drawer 40 · overlay 50 · dialog 60 · toast 70 · tooltip 80.

## 6. Motion

| Token | Value | Use |
|---|---|---|
| `--dur-instant` | 80 ms | press feedback |
| `--dur-fast` | 150 ms | hover, fades, exits |
| `--dur-base` | 220 ms | most enters, tab content |
| `--dur-slow` | 320 ms | drawer, sheets |
| `--dur-deliberate` | 500 ms | verdict cap moment |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | most transitions |
| `--ease-enter` | `cubic-bezier(0, 0, 0, 1)` | appearing |
| `--ease-exit` | `cubic-bezier(0.3, 0, 1, 1)` | leaving |
| `spring.snappy` | `{ stiffness: 500, damping: 35 }` | tab indicator, chip select |
| `spring.gentle` | `{ stiffness: 220, damping: 28 }` | need card reorder (layout) |

**Pattern catalogue:**
- **Timeline event insert:** new row fades in + y 6→0, `--dur-base` `--ease-enter`; the active step shows a 1 px left rule that pulses opacity 0.4↔1 every 1.2 s while running (stops when terminal).
- **Need cards appearing during a live run:** fade + y 8→0, stagger 40 ms (max 6); reorder on re-rank uses `layout` with `spring.gentle`.
- **Verdict cap moment:** when `verdict ≠ agentVerdict`, the agent's stamp appears first, then after 300 ms a strike line draws across it left→right (`--dur-deliberate`) and the stored stamp slides in beside it with the `capped by` label. Plays once per session per finding.
- **Evidence drawer:** slides from x 24→0 with opacity, `--dur-slow` `--ease-enter`; exit `--dur-fast` `--ease-exit`. The excerpt's matched phrase gets the highlight with a 220 ms background wipe left→right.
- **Bottom sheet (mobile):** y 100%→0, `--dur-slow`; drag-to-dismiss (Vaul).
- **Tab switch:** indicator moves with `spring.snappy`; content cross-fades 150 ms.
- **Dialog:** overlay 0→1 `--dur-fast`; panel scale 0.98→1 + opacity `--dur-base` `--ease-enter`.
- **Toast:** y 8→0 + opacity, `--dur-base`.
- **Skeleton → content:** skeleton shimmer 1.4 s linear; content fades in `--dur-fast`, no layout shift (skeletons match final dimensions).
- **Button press:** scale 0.98 for `--dur-instant`.
- **Numbers:** never animated.
- **Reduced motion:** all of the above become opacity fades ≤ 150 ms; no strike-draw (both stamps appear statically); pulse disabled.
- Performance: animate only `transform` and `opacity` (and `background-size` for the highlight wipe); target 60 fps on a mid-range laptop.

## 7. Iconography & Imagery

- Lucide, 1.5 px stroke, sizes 14 (inline), 16 (buttons), 20 (empty states).
- Evidence source icons: transcript `AudioLines`, caption `Captions`, frame `Image`, comment `MessageSquare`. Signal types: complaint `CircleAlert`, wish `Sparkle`, workaround `Combine`, dupe hunt `Search`.
- No stock imagery, no AI-sparkle iconography for "the agent". The agent is represented by text ("Investigation"), not a mascot.
- Empty states: a single line drawing in `--text-muted` (hand-drawn pen style, SVG, 120 px) plus a sentence and an action.

## 8. Components

Base: shadcn/ui (Radix). Customise via tokens; keep source in `apps/web/src/components/ui`.

| Component | Variants / sizes | States & notes |
|---|---|---|
| Button | `primary` (ink), `secondary` (surface + border-strong), `ghost`, `danger`; `sm` 32 px, `md` 40 px | hover darken 6 %, active scale, focus ring, disabled 40 % opacity, loading (spinner replaces icon, label stays) |
| Input / Textarea | `md` 40 px | border-strong, focus ring, error (danger border + message below), disabled |
| Select | shadcn Select | same as Input |
| Switch / Checkbox | shadcn | focus ring, label clickable |
| Form field | label + control + hint/error | error text `body-sm` danger, linked via `aria-describedby` |
| Card | `default`, `interactive` | interactive: shadow-1 on hover, focusable |
| Dialog | `sm` 420, `md` 560 | focus trap, Esc closes |
| Sheet / Drawer | right (desktop), bottom (mobile, Vaul) | Esc and swipe close; restores focus to the chip |
| Tabs | underline | arrow-key navigation |
| Toast | Sonner, `info`/`success`/`error` | error toasts persist until dismissed |
| Tooltip | shadcn | 400 ms delay; never the only source of essential info |
| Table | TanStack Table | sticky header, sortable columns announce sort |
| Badge | `neutral`, `info`, `warning`, `danger` | text + optional icon |
| Skeleton | line, block, card | dimensions match content |
| Empty state | icon/drawing + title + body + action | |
| Error state | title + code (mono) + message + retry | |
| Navigation | top bar: wordmark (Instrument Serif "Unmet"), links Investigations · Evals · About, "Run live" button | active link underline |
| **VerdictStamp** | `strong`, `emerging`, `weak`, `rejected`; `sm`, `md` | uppercase label on verdict bg, 1 px border in fg at 30 %; optional `struck` variant for capped agent verdict |
| **EvidenceChip** | by source (icon) | shows `0:14` or `frame 0:03` or `comment`; selected = highlight bg; keyboard activatable; `aria-label="Evidence: transcript at 0:14"` |
| **StatValue** | inline, large | mono tabular; trailing 6 px info dot = "from query"; popover shows field name, snapshot ID, `as_of`, formula version |
| **ClaimRow** | support, counter, fit, uncertainty | text + chips; counter rows have a left rule in `--warning` |
| **NeedCard** | default, selected, capped | rank number, label (title), VerdictStamp, Evidence Strength (StatValue), 3 key stats, sparkline of monthly counts |
| **TimelineItem** | by event type | icon, title, relative time, tokens/cost on hover (desktop) |
| **EvalMetricRow** | pass, fail, stale | metric name, Unmet value, baseline value, threshold, status badge |
| **TraceEvent** | collapsed, expanded | header row + JSON viewer (mono, syntax colours from chart tokens) |

## 9. Patterns & Screen Specs

### 9.1 Home `/`

```text
┌ top bar ───────────────────────────────────────────────┐
│ Unmet          Investigations  Evals  About   [Run live]│
├────────────────────────────────────────────────────────┤
│ display-xl: "What do skincare buyers want that         │
│ doesn't exist yet?"                                    │
│ body: one-paragraph pitch · link "How it works"         │
│ ┌ Eval strip: backtest hit@5 (Unmet vs baseline) ·   ┐ │
│ │ traps passed · citation precision — live values    │ │
│ Published investigations (cards, 2-col ≥ md)           │
│  [card: question · brand display name · as_of · 4 needs│
│   · top verdicts as stamps · cost · duration]          │
└────────────────────────────────────────────────────────┘
```
States: loading (3 card skeletons), empty ("No published investigations yet." + Run live), error (error state; eval strip hidden independently), success. Primary action: open the top card (it is visually first and larger).

### 9.2 New investigation `/investigations/new`

Form in a 560 px card: brand (Select, display names), question (Textarea, prefilled "Which unmet needs in skincare could this brand credibly launch against next?"), `as_of` (date, optional, collapsed under "Backtest mode"), passcode (password input), primary button "Start investigation". Below: "Runs take 3–6 minutes. You can leave this page." States: idle, submitting (button loading), validation errors inline, 401 (passcode field error), 402 (inline banner with link to published runs), 409 (banner with retry in 2 min), 429 (banner with time until reset), success → redirect to workspace.

### 9.3 Workspace `/investigations/[id]`

```text
┌ header: display title (question) · brand · as_of · status badge · cost · duration · [Trace] ┐
├ timeline (288) ┬ findings (fluid) ───────────────────────┬ evidence drawer (420) ─┤
│ ● Clustered 41 │ 1 Sunscreen that doesn't dry skin [EMERG]│ AudioLines Transcript   │
│   needs        │   ES 64.2 · 23 signals · 14 creators     │ 0:14–0:19               │
│ ● Stats: need 3│ 2 Pilling under makeup        [STRONG]   │ "I mix a drop of this…" │
│ ● Searched …   │ 3 …                                      │ @creator · micro · 3 Mar│
│ ● Sceptic: …   │ ── selected need detail ──               │ [Open original ↗]       │
│ ● Recorded 2   │ display: label · stamps (struck + stored)│ Signal: workaround ·    │
│ ○ running…     │ Tabs: Evidence | Sceptic | Brand fit |   │ sincere · not sponsored │
│                │       Demand test                        │                         │
└────────────────┴──────────────────────────────────────────┴─────────────────────────┘
```
- **Evidence tab:** summary (body, 68ch) → support ClaimRows → stat block (recent vs prior bar pair, monthly sparkline, unique creators, tier mix bar) — all StatValues.
- **Sceptic tab:** counter ClaimRows, flags as warning badges, "Why this might be wrong" (alternative explanations list), "What we're unsure about" (uncertainties), sponsored/concentration/viral meters (StatValues with threshold ticks).
- **Brand fit tab:** rating stamp, four score rows (score /5 + reason), existing catalogue coverage list (name + link).
- **Demand test tab:** test type title, hypothesis, audience, activation, metric, threshold, stop condition, duration, cost band, predicted probability ("45% likely to pass"), and P1 "Hand off" button.
- **States:** loading (skeleton matching layout), queued ("Waiting for a worker…" in timeline, findings empty state "Findings will appear here"), running (live timeline, cards stagger in), completed, failed (danger banner: "Investigation stopped: TIMEOUT — 2 findings were saved." + Trace link), budget_exceeded (warning banner, same pattern), empty completed ("No need had enough evidence before 1 Jun 2026." + explanation), not_found (404 page), evidence_unavailable (drawer shows excerpt; "Original post unavailable" disabled link).
- Keyboard: `j`/`k` move between needs, `1`–`4` switch tabs, `e` focuses first evidence chip, `Esc` closes drawer, `t` toggles timeline.

### 9.4 Evals `/evals` and `/evals/[id]`

`/evals`: header sentence ("How well Unmet works, against ground truth and a single-prompt baseline"), four suite sections each with EvalMetricRows, last run date, `stale` badge if prompts changed; a leakage note under Backtest showing scores split by `leakage_class`. `/evals/[id]`: case table (case, system, passed, reason), failure cases first; row click expands expected vs actual and links to the run's workspace and trace. States: no runs ("Evals haven't been run yet." + command shown in mono), loading, error, success.

### 9.5 Trace `/traces/[id]`

ReadingPage width 960. Header totals (events, tokens in/out, cost, wall time, model IDs, prompt versions). Vertical list of TraceEvents; filters by type; "Expand all". States: loading, empty (queued), not_found, success.

### 9.6 About `/about`

ReadingPage. Sections: What Unmet does · The corpus (live stats + provenance + exclusions) · Pipeline diagram (static SVG) · What the model does vs what SQL does (two-column table) · Evidence Strength formula (mono block) · Limitations (bulleted, candid) · How this would sit on Plot's index. States: stats loading/unavailable as per F-14.

### 9.7 Admin `/admin`

Login card (token input) → table of all runs with status, visibility toggle (publish/unpublish with confirm dialog), cancel action for running runs.

### 9.8 Ledger `/ledger` (P1)

Table of demand tests (need, test type, predicted probability, outcome stamp). Calibration chart (reliability diagram: predicted bins vs observed rate) once ≥ 10 outcomes; else a message with the count needed.

## 10. Content & Voice

- Plain, direct, British spelling ("moisturiser", "catalogue"). Sentence case.
- Buttons are verbs: "Start investigation", "Open original", "Hand off", "Publish".
- Errors: what happened + what to do. "Live runs are paused for today — explore the published investigations."
- Never anthropomorphise: "The investigation checked…", not "I think…" or "Unmet believes…".
- Hedging is explicit and quantified: "62% confidence", "only 14 signals in the recent window".
- Dates: `9 Oct 2026`; timestamps `0:14`; costs `$1.84`; numbers with thin grouping `12,400`.
- Brand: always "A skincare brand like <Name>".

## 11. Accessibility

- WCAG 2.2 AA. Zero serious/critical axe violations on every page.
- Visible focus (2 px `--focus-ring`, 2 px offset) on every interactive element; logical tab order: header → timeline → findings → drawer.
- Full keyboard parity including shortcuts in §9.3 (shortcuts disabled while typing in inputs; listed in a `?` dialog).
- Timeline is an `aria-live="polite"` region announcing new step titles (throttled to one announcement per 3 s).
- Drawer/sheet: focus moves to its heading on open and returns to the triggering chip on close.
- Hit targets ≥ 24 px (44 px on touch). Charts have a text summary and a data table toggle.
- Verdicts and flags always have text, never colour alone.

## 12. Responsive & Platform

- Mobile is read-first: reviewers on phones can read published investigations, open evidence (bottom sheet) and evals; starting a live run works but isn't optimised.
- Touch: hover-only details (token costs) are available via tap-to-expand.
- Safe areas respected on iOS for the bottom sheet.
- Dark mode follows `prefers-color-scheme`, with a toggle in the top bar stored in `localStorage` (try/catch).

## 13. Implementation

- Tokens: `apps/web/src/app/globals.css` (`:root`, `.dark`) + Tailwind `@theme` mapping (`bg-background`, `text-muted`, `bg-verdict-strong-bg` …).
- Add a token: define light + dark values, verify contrast with `pnpm design:contrast` (script in `apps/web/scripts/contrast.ts`), document it in §2.
- Fonts via `next/font/google` in `apps/web/src/app/fonts.ts`.
- Visual regression: Playwright screenshots of Home, Workspace (completed, running, failed), Evals, About at 1440 and 390 widths in light and dark (`e2e/visual.spec.ts`).
