# Statistics: aggregation, opponent adjustment, and change over time

How per-game counters become numbers worth looking at. [ANALYSIS_SPECIFICATIONS.md](ANALYSIS_SPECIFICATIONS.md)
defines what each detector measures. This file covers how those measurements are pooled, compared,
and tracked, and which ones to trust.

The guiding rule: **surface what can change with practice, compared against what was expected for
that opponent.** A 0–50 record against the world #1 is true, easy to compute, and useless: it won't
move in six months of work. "Opening share against Kurabba, relative to what his strength
predicts" can move, and shows whether it did.

Corpus figures below come from about 440 Pikachu games by one player against 15 opponents,
Aug–Oct 2026, ranging from world-top players to much weaker ones. Re-check them when the corpus
grows. `scripts/corpusSummaries.ts` and `scripts/corpusEvents.ts` regenerate the inputs.

## 1. Pool situations, never average percentages

Every rate is `successes / opportunities` summed over the games in scope (`RawCounters` stores
both). Per-game percentages are never averaged: a 1/1 game must not weigh as much as a 30/40 game.

## 2. Symmetric vs. asymmetric metrics

- **Symmetric** metrics compare both players within the same game, so matchup difficulty mostly
  cancels: opening share (`won / (won + lost)`), per-reason won − lost differentials, stock margin.
  They're comparable across opponents and characters as they stand.
- **Asymmetric** metrics measure one side of a situation: Recovery %, edge-guard effectiveness,
  ledge getup %, ledge trap %. They inherit the matchup: recovery mostly reflects _your character_,
  edge guarding mostly reflects _the opponent's character_. Show them as a delta against the
  relevant character baseline (`computeCharacterBaselines`), never as a bare percentage.

## 3. Opponent strength

Strength is inferred from results, not entered by hand (`src/data/opponentStrength.ts`):

```
strength(opp) = −mean(myStocks − oppStocks) × n / (n + 5)     over decided games vs opp
```

Stock margin, not win rate: win rate saturates. 0–60 and 8–72 look almost the same, but margin still
separates them. The shrinkage (`K = 5` games) keeps a 1–0 against a newcomer from producing a
"strong" or "weak" verdict.

**Opponent strength is the dominant driver of almost every process metric.** Across sessions,
weighted by opportunities, Pikachu games only:

| Metric                                             | Correlation with opponent strength |
| -------------------------------------------------- | ---------------------------------- |
| Damage per opening                                 | r = −0.93                          |
| Recovery %                                         | r = −0.82                          |
| Opening share                                      | r = −0.81                          |
| Damage taken back while holding advantage ("leak") | r = +0.72                          |
| Ledge getup %                                      | r = −0.21                          |

So any number pooled across a mix of opponents is mostly a measure of _who you happened to play_.

**Strength also depends on character.** Estimate it within the player's main by default. The
player's main comes first. A 12CB-focused player may care about cross-cast strength instead.

## 4. Small samples

- Matchup cells (my character × their character) are sparse outside the main and a few common
  opponents. Show them, but never use one as a baseline.
- Shrink asymmetric rates toward their parent level before displaying them:
  `adjusted = (successes + K × parent_rate) / (opportunities + K)` with `K ≈ 15` opportunities. A
  12/12 then reads as "clearly above baseline" instead of a meaningless 100%.
- Show the uncertainty along with the value. Opening share for one 8-game session (about 150
  openings) has a standard error of about ±4 points. Session-to-session swings smaller than that are
  noise.

## 5. Measuring change over time

**Don't trend raw monthly or weekly aggregates.** In the corpus, monthly win rate goes 24% → 52% →
73% and opening share 47% → 50% → 57%. Almost all of that is schedule: the first month was mostly
sets against world-top players. A fixed-effects model per opponent doesn't help either, because most
opponents appear in only one block of dates, so "who" and "when" can't be separated.

What works:

1. **Expected value from opponent strength.** Fit each symmetric metric against `strength(opp)`
   across all sessions (a weighted linear fit is enough; see the correlations in §3). A session's
   **residual** = actual − expected for that opponent. Residuals are comparable across opponents,
   so they form the trend line: one point per session with a ±1 SE bar, plus a rolling mean.
2. **Repeated-opponent tracks.** The same opponent at different dates needs no model at all. These
   are the most trustworthy comparisons and should be called out when they exist.
3. **Within-set adaptation.** Long sets (30+ games) can be split first third vs. last third. This
   is a separate skill from long-run improvement: in the corpus, opening share rose about 5 points
   over a 75-game set against one top player, and the next set against him a month later started
   back below where the first one ended.

**Implementation** (`src/data/progress.ts`, shown on the Progress page `#/progress`):

- **Scope:** one character family at a time. Region variants pool (Pikachu, Pikachu (JP) and
  Pikachu (EU) are one scope). The default is the detected main. Opponent strength is estimated
  within the scope.
- **Unit:** one opponent within one session (`groupGamesIntoSessions`), so session IDs match the
  session pages. A rotating lobby gives one point per opponent. Games are deduplicated by game ID
  first: the same recording saved twice must count once, and would otherwise split its session.
- **Fit:** weighted least squares of the pooled metric on strength, weighted by opportunities.
  Residuals are sign-flipped for lower-is-better metrics, so positive always means better. A point's
  SE is `sqrt(σ² / opportunities)`, where σ² is the fit's weighted residual scatter. It includes
  real session-to-session form, not just binomial noise, so the bars are honest about what one
  session can show.
- **Recent vs. baseline:** "recent" is the 30 days up to the latest session, and "baseline" is
  everything before it. A change is only called when it clears 2 combined SE. Otherwise the page
  says "no clear change yet". An imported backlog of old games is exactly that baseline: improvement
  shows up as new sessions land above it.

Everything stays pooled by counters (§1), so any slice (session, opponent, character, date range)
is exact and cheap to recompute.

**Every game counts.** Games aren't silently dropped as "experimentation" or "sandbagging". The
strength adjustment already accounts for weak opponents, so their games stay in the trend at the
weight their opportunities give them.

## 6. Signals for specific habits

Players work on concrete habits. Each needs a measurable signal that can move. Current status:

| Habit                                                                   | Signal                                                                                                     | Status                                                                                                                                               |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bait, then punish the commitment                                        | Share of openings won by `whiff-punish` + `landing-lag` (the opponent committed)                           | Usable (about 53% overall in the corpus). Trend it as a residual.                                                                                    |
| Don't get hit back while ahead                                          | Openings lost by `reversal` / all openings lost                                                            | Usable, but see the caveat in §7                                                                                                                     |
| Don't jump around carelessly                                            | Openings lost by `jump-punish`                                                                             | Usable, but low counts (about 5% of openings lost)                                                                                                   |
| Avoid cornered panic options (e.g. up-tilt with your back to the ledge) | Per-move use and punish rate when cornered (your \|x\| > 1500, grounded, opponent between you and center)  | Usable from `scripts/corpusEvents.ts` attack logs. About 7% of cornered attacks are up-tilt, and about 25% of those get punished.                    |
| Only attack on a real opening                                           | Attacks thrown in range while the opponent is in endlag, landing lag or jump squat, vs. "unforced" attacks | **Not yet valid.** "Opponent is in an attack state" includes their active frames, which picks up trades. It needs per-move active/endlag frame data. |

## 7. Metric caveats

- **Reversal is mostly scramble.** An opening counts as `reversal` when the defender hits back before
  the 60-frame neutral reset, about a third of all openings. Read "lost by reversal" as "got hit back
  after having the last hit", not only as escapes from ledge or offstage.
- **Land punish shadows whiff punish for aerials.** A whiffed aerial that lands is labeled
  `landing-lag`. Both count as "punished a commitment".
- **Edge-guard effectiveness and the headline asymmetric rates are provisional.** They need tuning
  per matchup and per starting position. Top players' numbers are close to the practical ceiling,
  and execution noise is real, so no rate should be read as a target of 100%.
- **Analysis changes rewrite history.** Every number above can change when a detector changes. Bump
  `ANALYSIS_VERSION` so cached summaries are rebuilt, and trends always compare like with like.
