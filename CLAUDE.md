# rmgr-viewer

Replay viewer and analysis tool for SSB64 / Smash Remix `.rmgr` files (recorded by RMG-K). Web app
(GitHub Pages) plus a Tauri desktop build from the same code.

## What the app is for

In priority order:

1. **Review a session efficiently.** Jump straight to the moments that matter, mainly every time the
   player got hit, and decide why and what to do instead. The baseline it has to beat is scrubbing an
   hours-long YouTube VOD.
2. **Measure strengths and weaknesses over time.** Track process metrics that can change with
   practice, adjusted for who the opponent was. Raw win rate against a world-#1 player is not useful.
3. **Keep replay files organized and the data accessible.**

Product stances: every game counts (nothing is silently filtered out as "experimentation"); the
player's main character comes first; Dream Land is the only stage.

## Docs (living, keep them current)

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): data flow, modules, routes, where user data lives
- [docs/ANALYSIS_SPECIFICATIONS.md](docs/ANALYSIS_SPECIFICATIONS.md): what each detector measures
- [docs/STATISTICS.md](docs/STATISTICS.md): aggregation, opponent adjustment, trends over time, metric caveats
- [docs/ROADMAP.md](docs/ROADMAP.md): known issues and planned work
- [docs/HANDOFF.md](docs/HANDOFF.md): state of the in-flight branch (temporary; delete once merged)
- [docs/recovery-heuristics/](docs/recovery-heuristics/README.md): per-character recovery model
- [docs/community/](docs/community/README.md): plain-language explanations for players

Don't add dated design specs or implementation plans to the repo. Fold what's durable into the docs
above, in the same change as the code.

## Working here

- Needs Node 22+ and the sibling `../rmgr-ts` repo built (`npm install && npm run build` there).
- Checks, all run in CI: `npm test`, `npm run typecheck`, `npm run typecheck:scripts`,
  `npm run lint`, `npm run format:check`.
- Any change to `summarizeReplay()` output means: bump `ANALYSIS_VERSION` with a history line, then
  `npm run generate:demo-summaries`.
- User-visible strings go in `src/i18n.ts`, in English and Japanese.
- `comboHitCount` belongs to the port being hit. Use `grounded`, not `positionY`, to decide airborne
  vs. on the ground: Dream Land's platforms stand well above y=0.

## Replay data is private

Real replay corpora (for example `/replays/`, or anything outside the repo) are personal data. Never
commit them, copy them into fixtures, or quote them in docs beyond anonymized aggregates. Corpus
scripts (`scripts/corpusSummaries.ts`, `scripts/corpusEvents.ts`) take an output path, which should
be outside the repo. Only the small bundled demo set in `public/replays/` ships.
