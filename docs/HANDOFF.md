# Handoff: replay-analysis review branch

**Temporary.** This describes the in-flight branch `claude/replay-analysis-app-review-7c54f0`
(based on `master` at `d1468f0`) for the next agent or reviewer. Delete it once the branch is
reviewed and merged. Everything durable already lives in the living docs
([ARCHITECTURE](ARCHITECTURE.md), [ANALYSIS_SPECIFICATIONS](ANALYSIS_SPECIFICATIONS.md),
[STATISTICS](STATISTICS.md), [ROADMAP](ROADMAP.md), and the repo's `CLAUDE.md`).

## Why this branch exists

The user (the app's only user, a competitive SSB64 Pikachu main) asked for a review and redesign
around three goals:

1. Review a session's mistakes faster than scrubbing a VOD.
2. Measure strengths and weaknesses **over time**, without "easy" stats like a 0–50 record against
   the world #1.
3. Keep replay files organized.

Analysis of the user's ~1,100-game corpus drove the design (see STATISTICS.md). Opponent strength
alone explains most of the variation in every process metric, so raw trends mostly measure the
schedule. The user's current corpus is a **baseline**: they expect improvement to show up in games
played from now on, not in this data.

## What changed, in commit order

Nothing could be committed when the work was done: a user hook blocks `git commit` on weekdays
7:00–18:00. The work was snapshotted into checkpoints and is meant to land as four commits:

1. **Docs, cleanup, classifier fixes, Progress page**
   - **Docs:** replaced the dated design/plan docs (`docs/superpowers/`, the root
     `2026-08-28-contextual-statistics-design.md`) with living docs (`CLAUDE.md`, `docs/ARCHITECTURE.md`,
     `docs/STATISTICS.md`, `docs/ROADMAP.md`). Repointed code comments that cited specs that were never
     committed, fixed the `file:///Users/ness/...` links in the specifications, and fixed the README's
     stale deploy info.
   - **Cleanup:** removed the committed 14 MB `scripts/classify-latency-profile.sqlite`, which is now
     gitignored along with `/analysis-local/`.
   - **Classifier fixes (ANALYSIS_VERSION 10):** neutral opening reasons now use the engine's
     `grounded` flag instead of `|positionY| > 5`, which had misfiled every platform hit. The
     whiff-punish rule now checks whether the _attacker's_ `comboHitCount` is running, not the victim's.
     Regression tests were added.
   - **Progress page** (`#/progress`, `src/data/progress.ts`, `src/progress/progressView.ts`): per
     metric, each session's actual value minus what that opponent's inferred strength predicts, with
     ±SE, a rolling mean, last 30 days vs. baseline, same-opponent tracks, within-set adaptation, and
     the strength list. Scoped to a character family (NA/JP/EU variants pooled), defaulting to the main.
   - **`main.ts` refactor:** route handling now uses one `showViews()` helper instead of hiding ten
     elements by hand in every branch, and `refreshHomeData()` replaces seven copies of the sidebar
     refresh.
   - **Scripts:** `scripts/corpusSummaries.ts`, `scripts/corpusEvents.ts`, `scripts/progressReport.ts`.
2. **Session hit reel** (`src/session/hitReel.ts`, `src/session/hitReelPanel.ts`): the first section
   of every session page.
   - Lists every opening the player lost, in play order, with: how they got opened up, the move that
     hit them, their last three actions, their percent and the punish's damage, and the result.
   - Hits play as a match-view playlist with a 2 s pre-roll.
   - Notes are anchored match notes (`upsertAnchoredNote`), so they show up on the same row in the
     match view.
   - Filters: by reason, "costliest first", and "big ones" (lost a stock or took 30%+).
3. **Punish finder + opening index (ANALYSIS_VERSION 11)**
   - **Opening index:** `GameSummary.openings` stores a compact `OpeningRecord` per opening
     (`computeOpeningRecords`).
   - **Finder** (`src/data/situations.ts`, `src/situations/punishFinderView.ts`, `#/punishes`): filter
     by punisher and victim character family, victim percent, a mirrored 3×3 stage-zone grid, whose
     punishes, and attack or grab. Results come grouped by opener (average, median, KO rate) with the
     top 50 individual punishes, playable as a playlist. Third-party games in the library (e.g. top
     players against each other) are included, which is the point.
   - **Event cache:** `computeNeutralHitEvents` is memoized per `Replay`, which cut full import time by
     about 30% (195 s → 141 s for 1,120 files on the Pi). `openingMove` moved into `neutralHits.ts`,
     and `characterFamily` into `src/data/characterFamily.ts`.
   - `scripts/punishReport.ts`.

4. **Polish round** (built in parallel with Sonnet subagents, integrated and verified here):
   - **Player-facing move names:** `src/moveNames.ts`, in English and Japanese, used by the hit reel
     and punish finder.
   - **Detector caching:** `computeEdgeGuardEvents`, `computeLedgeTrapEvents`,
     `computeAngelInvincibilityEvents` and `computeKillCombos` are memoized like the neutral events.
   - **Opponent tag merges:** `src/data/opponentAliases.ts`. Each merge is stored as
     `Identity.opponentAliases` and in the project file, and applied to strength, sessions (including
     the lobby key), Progress and the library filter. The editor opens from "Merge opponent tags" on
     the identity card.
   - **Fixes from an independent review of commits 1–3:**
     - A quote-safe `escapeHtml` (`src/ui/html.ts`). A note containing `"` used to be truncated and
       could be re-saved truncated.
     - The hit reel's load token is bumped on every `show()` (cache-hit navigation threw a TypeError).
     - The reel's final render no longer wipes a note being typed. A deferred render runs on focusout.
     - Background reading uses `loadReplayIfAvailable`, which never prompts for a missing file.
     - Re-importing existing games refreshes Progress and the punish finder.
     - The finder's default query follows the library until the user changes a filter.
     - An empty max-% field means "no limit".
     - The finder only searches Dream Land games.
     - Openers with fewer than 3 samples sort last.
     - Progress W-L follows the session page's rule (uneven starts and unknown stocks excluded).
     - A single-point fit reports unknown SE (shown as `±?`) instead of ±0.
     - Every memoized function's doc comment is back on the function.

To recreate the commits from the checkpoints (they're in the original session's scratchpad, not the
repo): restore checkpoint 1's files and deletions on top of `d1468f0`, commit, then checkpoint 2, commit, then
checkpoint 3, commit, then the final working tree. If the checkpoints are gone, one commit per feature is still
easy to cut by file. The overlapping files are `src/main.ts`, `src/i18n.ts`, `index.html` and the
docs.

## Verifying

```bash
npm test && npm run typecheck && npm run typecheck:scripts && npm run lint && npm run format:check
```

At handoff, all of these passed (1,015 tests).

- **Real corpus:** the user's replays are at `~/rmgr-replays/replays` on the dev machine (`razzpi`).
  They're **private**: never commit them, copy them into fixtures, or quote them beyond anonymized
  aggregates. Summaries are cached in `~/rmgr-analysis/` by:
  `npx tsx scripts/corpusSummaries.ts ~/rmgr-analysis/corpus.json ~/rmgr-replays/replays`.
  To check the models from the command line: `scripts/progressReport.ts <corpus.json> nue,Player` and
  `scripts/punishReport.ts <corpus.json> nue,Player 9 9 40 80 center-low,side-low`. The user is
  `nue`, and also `Player` in the games against Wario.
- **UI:** each feature was checked in headless Chromium (`/usr/bin/chromium` driven by
  `playwright-core` from a scratch directory outside the repo) against the full imported corpus:
  Progress (dark, light, 390 px), the hit reel on a 68-game set (play, notes, filters), and the punish
  finder (filters, zone picker, playlist).
- **Environment on razzpi:** Node lives at `~/.local/opt/node/bin` (not on the default PATH). The
  worktree's `file:../rmgr-ts` dependency resolves through a symlink
  `.claude/worktrees/rmgr-ts → ~/rmgr-ts`. Dev server:
  `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=razzpi.brumby-deneb.ts.net npx vite --host 127.0.0.1 --port 5183`,
  exposed with `tailscale serve --bg --https=8443 5183`. **Unresolved:** the user's devices time out
  on `:8443` even though the serve config is correct and the URL loads from the Pi. A Tailscale ACL
  port rule is suspected but not confirmed.

## Worth a careful review

- **Version bumps 9 → 11:** the user's cached library goes stale. On web that means re-importing the
  folder (the stale banner says so). Desktop rescans on its own.
- **Shared cached array:** `computeNeutralHitEvents` now returns one array shared by every caller per
  replay. No caller mutated it at handoff; anything that does in the future will corrupt others.
- **Storage size:** the opening index adds about 5 KB per game in IndexedDB, and
  `public/replays/demo-summaries.json` grew from 65 KB to 249 KB (fetched at web startup, gzipped by
  Pages).
- **Progress statistics:** weighted least squares on strength, with SE from the fit's residual
  scatter divided by a point's opportunities. A change is "better/worse than baseline" only beyond 2
  combined SE. Strength is shrunk stock margin (K = 5) within the scoped character. Treat these
  constants as first guesses.
- **Hit reel loading:** it reads every loaded replay in a session in the browser (33–45 s for 68 games
  on the Pi), caching per session in memory. After a web refresh, games need re-importing first. It
  says how many are missing.
- **Japanese strings** for the three new features were written without a native-speaker check.
- **`HomeSidebarController`** now takes a seventh constructor argument (`onSelectProgress`), and
  `setSelectedSessionId(id, page)` decides which link shows as current.

## Open questions for the user

These are also in ROADMAP.md.

- **Hit reel:** is "big ones" at 30% the right cutoff? Against a top player it keeps about half the
  hits.
- **Opponent tag merges:** the Edge Guard Workshop filter and clip search still use raw tags, and a
  merge that joins two sessions orphans the absorbed session's comment.
- **Opponent tags:** they need merging (`kusora`, `kusora_JPN`, `kusora_YoutubeLive`).
- **Baseline cutoff:** should the user set it themselves ("since I started working on X")?
- **Move names:** show player-facing names instead of internal action-state names.
- **"Only attack on a real opening":** this goal can't be measured honestly without per-move
  active/endlag frame data (STATISTICS.md §6).
