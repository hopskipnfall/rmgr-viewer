# Architecture

How rmgr-viewer is put together: where data comes from, what is derived and cached, where user data
lives, and which module owns what. Keep this file current when any of those change.

For what the analysis measures, see [ANALYSIS_SPECIFICATIONS.md](ANALYSIS_SPECIFICATIONS.md). For how
numbers are aggregated, compared, and tracked over time, see [STATISTICS.md](STATISTICS.md).

## Data flow

```
.rmgr file ──parse (@rmg-k/rmgr)──▶ Replay (every frame, both ports)
     │                                  │
     │                                  ├─▶ per-match analysis (match view): events, panels, overlays
     │                                  │
     │                                  └─▶ summarizeReplay() ──▶ GameSummary (small, per game)
     │                                                              │
     └── ReplayFileSource (lazy read)                               ├─▶ IndexedDB cache (StoredGame)
                                                                    └─▶ library / session / matchup /
                                                                        search views (aggregate.ts)
```

- **`Replay`** comes from the sibling [`rmgr-ts`](https://github.com/hopskipnfall/rmgr-ts) package
  (`file:../rmgr-ts`, which must be built first). It holds per-frame input and state for every port:
  action state, position, velocity, damage, stocks, `grounded`, hitstun, and `comboHitCount`. The
  combo counter belongs to the port _taking_ the hits.
- **`GameSummary`** (`src/data/gameSummary.ts`) holds what the library needs without re-reading the
  file: ports, characters, final stocks, stage, duration, and one `RawCounters` per port. Counters are
  pooled numerators and denominators (situations and successes, openings won/lost by reason, damage),
  never percentages, so any set of games can be aggregated exactly.
- **Opening index:** `GameSummary.openings` keeps one compact `OpeningRecord` per neutral opening
  (attacker, opening move, victim's damage and position, punish damage, KO). It powers the punish
  finder without reading any replay. It was added in ANALYSIS_VERSION 11, and older cached entries
  don't have it.
- **Other event-level data** (recoveries, ledge situations, the hit reel's lead-in actions) isn't
  cached. It's recomputed from the `Replay` when a match is opened, a session's hit reel loads, or a
  clip search runs. Clip search keeps its own cache (`src/search/searchCache.ts`), and
  every per-replay detector (`computeNeutralHitEvents`, `computeEdgeGuardEvents`, `computeLedgeTrapEvents`, `computeAngelInvincibilityEvents`, `computeKillCombos`, `computeClassifiedSituations`) is memoized per `Replay` object. The arrays they return are shared, so callers must not mutate them.

### Analysis versioning

`ANALYSIS_VERSION` (`src/data/analysisVersion.ts`) marks every cached summary. Bump it, and add a
history line, whenever `summarizeReplay()` output changes. Older cached entries then show as stale and
get rebuilt from their files. `public/replays/demo-summaries.json` doubles as the analysis snapshot
test. `npm run generate:demo-summaries` refuses to change it without a version bump.

## Modules

| Area                    | Where                                                                                                                                        | Notes                                                                                                                                                                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Situation detectors     | `src/edgeGuard.ts`, `src/ledgeTrap.ts`, `src/angelInvincibility.ts`, `src/neutralHits.ts`, `src/combos.ts`, `src/di.ts`, `src/microStats.ts` | Pure functions over a `Replay`. Specs in ANALYSIS_SPECIFICATIONS.md.                                                                                                                                                                                                                         |
| Recovery classifier     | `src/recoveryHeuristics.ts`, `src/recoveryVerdicts.ts`, `src/classifiedSituations.ts`                                                        | Per-character physics model that predicts dead / ledge-only / reaches stage. Excludes hopeless recoveries from Recovery% and scores edge guards. See [recovery-heuristics/](recovery-heuristics/README.md).                                                                                  |
| Stage geometry          | `src/stageGeometry.ts`, `src/ledgeGrabRange.ts`                                                                                              | Dream Land only, which is the only legal stage.                                                                                                                                                                                                                                              |
| Summaries & aggregation | `src/data/gameSummary.ts`, `src/data/aggregate.ts`                                                                                           | `aggregateFilteredGames` pools counters, and `DerivedRates` turns them into rates.                                                                                                                                                                                                           |
| Identity                | `src/data/identity.ts`, `src/data/opponentAliases.ts`                                                                                        | The user's aliases, plus opponent tag merges (`Identity.opponentAliases`, loaded with the identity; pure code reads it from there, never localStorage). Perspective resolution order: manual per-game port override, then the single seated port matching an alias, then ambiguous (`null`). |
| Sessions & 12CB         | `src/data/session.ts`, `src/data/twelveCharacterBattle.ts`                                                                                   | Games with the same opponent less than 2 h apart form a session. Rotating 3–4 player lobbies group by `lobbyNames`. Merged opponent tags count as one person: lobby keys, session labels, strength, progress and the library filter all go through `canonicalOpponentName`.                  |
| Progress                | `src/data/progress.ts`, `src/progress/progressView.ts`, `src/data/opponentStrength.ts`, `src/data/mainCharacter.ts`                          | Change over time, adjusted for opponent strength (STATISTICS.md §5). `computeCharacterBaselines` in `aggregate.ts` is still unused.                                                                                                                                                          |
| Session hit reel        | `src/session/hitReel.ts`, `src/session/hitReelPanel.ts`                                                                                      | Every opening the player lost in a session, from `computeNeutralHitEvents`. Reads loaded replays once per session (cached in memory), plays as a match-view playlist, and saves notes as anchored match notes (same row as the match view's Neutral panel).                                  |
| Punish finder           | `src/data/situations.ts`, `src/situations/punishFinderView.ts`, `src/data/characterFamily.ts`                                                | Queries the opening index across the whole library (including third-party games), groups by opening move, plays results as a playlist. Stage zones are a mirrored 3×3 grid on Dream Land.                                                                                                    |
| Library persistence     | `src/data/libraryStore.ts`, `libraryPersistence.ts`, `importer.ts`, `importPlanner.ts`                                                       | IndexedDB `rmgr-viewer` / `games`. Stores derived data only, never replay bytes. The planner skips files whose path, size and mtime are unchanged, and matches renamed files by content hash.                                                                                                |
| Views                   | `src/library/`, `src/session/`, `src/matchup/`, `src/match/`, `src/search/`, `src/workshop/`, `src/preview/`                                 | Plain TypeScript controllers that render HTML strings or DOM. No framework.                                                                                                                                                                                                                  |
| Rendering               | `src/renderer.ts`, `src/renderer/`, `src/characters/`                                                                                        | Canvas replay renderer: stage, characters, items, HUD.                                                                                                                                                                                                                                       |
| Video                   | `src/video/youtubeSync.ts`                                                                                                                   | YouTube link per game or session, offset sync, and replay/video/PiP modes.                                                                                                                                                                                                                   |
| Desktop                 | `src/desktop/`, `src-tauri/`                                                                                                                 | Tauri 2 app: library folder scan and watch, project file sync.                                                                                                                                                                                                                               |
| i18n                    | `src/i18n.ts`                                                                                                                                | English and Japanese strings. Every user-visible string goes through `t()`.                                                                                                                                                                                                                  |
| Move names              | `src/moveNames.ts`                                                                                                                           | Player-facing names for action states ("Up air", "Quick Attack") in English and Japanese, used by the hit reel and punish finder. Kirby's copied specials are named after their source.                                                                                                      |
| HTML escaping           | `src/ui/html.ts`                                                                                                                             | `escapeHtml` that also escapes quotes, which is safe in attributes. The older per-view `textContent`/`innerHTML` helpers aren't safe in `attr="..."`.                                                                                                                                        |

`src/main.ts` wires everything together: routing (`src/router.ts`, hash-based), import, and the
desktop/web split. `index.html` holds the static shell and all CSS.

## Routes

| Hash                                      | View                                                                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `#/`                                      | Library (home): sidebar with sessions; main area with matchup stats and game list                                           |
| `#/progress`                              | Progress: opponent-adjusted trends per metric, same-opponent tracks, long-set adaptation, inferred opponent strength        |
| `#/session/:id`                           | Session page: hit reel (every time you got hit, with play and notes), comment, quick searches, videos, matchup stats, games |
| `#/matchup/:myChar/:oppChar`              | Matchup page: stats, comment, game list                                                                                     |
| `#/matchup/:myChar/:oppChar/recoveries?…` | Edge Guard Workshop for that matchup                                                                                        |
| `#/match/:gameId`                         | Match player with analysis side panels                                                                                      |
| `#/search?…`                              | Clip search (edge guards, combos) with a playlist                                                                           |
| `#/punishes`                              | Punish finder: openings matching a situation (characters, victim percent, stage zone), ranked, by opener, playable          |
| `#/preview`                               | Character animation preview (dev tool)                                                                                      |

## User data and where it lives

Derived data (summaries) can always be rebuilt. User-authored data can't, so it's covered by project
export/import (`src/data/projectFile.ts`).

| Data                                                         | Storage                                       | In project file                         |
| ------------------------------------------------------------ | --------------------------------------------- | --------------------------------------- |
| Cached summaries                                             | IndexedDB `rmgr-viewer`                       | No (summaries only, rebuilt from files) |
| Identity (display name, aliases)                             | `localStorage` `rmgr-viewer-identity`         | Yes                                     |
| Opponent tag merges (alternate tag -> canonical tag)         | `localStorage` `rmgr-viewer-opponent-aliases` | Yes                                     |
| Per-game perspective override                                | IndexedDB `StoredGame.manualPerspectivePort`  | Yes                                     |
| Match notes (timestamped, optionally anchored to an opening) | `rmgr_notes_<gameId>`                         | Yes                                     |
| Session comment                                              | `rmgr_session_comment_<sessionId>`            | Yes                                     |
| Matchup comment                                              | `rmgr_matchup_comment_<myChar>_<oppChar>`     | Yes                                     |
| YouTube links and offsets                                    | `rmgr_yt_link_<gameId>`                       | Yes                                     |
| UI preferences (theme, language, HUD, camera, log filters…)  | `rmgr-viewer-*`                               | No                                      |

IDs: a game is `gameIdFor(recordedAtEpochMillis, frameCount)`, so it survives renames and metadata
edits. A session is `"session_" + <first game id>`.

**Desktop:** the library folder (default `~/Documents/Replays`) is scanned on launch and watched. User
data is also written to `rmgr-viewer-project.json` in that folder, atomically, keeping 3 backups. The
web and desktop builds are separate origins, so project export/import moves data between them.

## Development

- Node 22+. `rmgr-ts` must sit next to this repo with `dist/` built (`npm install && npm run build`
  there).
- `npm run dev` (port 5183), `npm test` (vitest), `npm run typecheck`, `npm run typecheck:scripts`,
  `npm run lint`, `npm run format:check`. CI runs all of these.
- `scripts/` holds offline tools run with `npx tsx`. They reuse the app's analysis modules, so their
  numbers match the app. Corpus scripts (`corpusSummaries.ts`, `corpusEvents.ts`) write outside the
  repo. Replay corpora are personal data and are never committed.
