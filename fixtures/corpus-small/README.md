# corpus-small

`corpus.json` is a synthetic corpus for tests and UI work: 20 videos from 9 creators with transcripts, keyframe descriptions, comments and 46 extracted signals covering every signal type. Everything in it is invented. Handles carry an `fx_` prefix, URLs point at `example.com`, and the seed marks every row `platform = synthetic`, `is_synthetic = true`.

The signals fall into five needs, built so the stats exercise the interesting cases at `as_of = 2026-09-01`:

| Need | Signals | Shape |
|---|---|---|
| `dry-sunscreen` | 14 | Growing, workaround-heavy, spread across 7 creators |
| `pilling-spf` | 10 | Steady; one sarcastic signal that clustering excludes |
| `vitc-dupe` | 9 | One creator posts most of it (`CONCENTRATED`); part sponsored |
| `mineral-cleanser` | 7 | Small and recent |
| `gentle-retinol` | 6 | Fading (`DECLINING`); one high-view video (`VIRAL_SKEW`) |

`pnpm db:seed` loads it with `data/brands/*.json` and three investigations (completed + published, failed with two findings, running with six events). Snapshot numbers come from `@unmet/stats`, never from hand-typed values.
