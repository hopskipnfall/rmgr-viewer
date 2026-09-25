# Recovery Heuristics

How `src/recoveryHeuristics.ts`'s `classify()` decides, for a given character at a given moment
offstage, whether they're **dead** (no path back), **dead-if-ledge-occupied** (can reach the ledge
but not the stage outright — survival depends on the ledge being free), or can **reach the
stage** outright. This is the core input to the workshop's edge-guard scoring (see
[classifiedSituations.ts](../../src/classifiedSituations.ts)) and to `matchupStatsView`'s Recovery%
stat.

This directory documents, per character: where the physics model came from, how rigorously it's
been checked, and what's still open. **Every character's page must say which tier it's at.**
Don't leave a character undocumented — if you touch its model, update its page in the same change.

## The three rigor tiers

1. **Decomp physics constants** — gravity, air speed, jump formulas, and move-specific constants
   read directly from the smashremix decomp source (relayed by the Game Expert agent's decomp
   audits, cited inline in `recoveryHeuristics.ts` as `NNN_CharacterMain.c` file references). This
   is the gold standard: if implemented correctly, it should never be wrong. Every one of the 9
   supported characters' base physics is at this tier.
2. **Real-replay-calibrated** — a curve or constant hand-extracted from real recorded replay
   traces because no clean decomp source exists for it (usually because the move is root-motion /
   animation-driven rather than a closed-form physics formula). One tier below gold standard:
   corpus coverage is finite and may not cover every input the animation curve can produce.
   Currently used for Yoshi's double-jump arc, Falcon Dive's post-activation curve, and Kirby's
   Final Cutter curve — see their own pages for exactly what's calibrated and from which replay.
3. **Chart / best-fit from outcome stats** — plotting recovered-vs-didn't against entry position
   and fitting a boundary, with no physics model underneath at all. Lowest tier. **Not used
   anywhere in this codebase currently** — every character has at least a real physics model
   (tier 1 or 2), even where that model has known gaps.

A character's page states its tier per **component** where they differ (e.g. Yoshi's gravity/air
speed are tier 1, but its double-jump arc is tier 2) — "the character" doesn't have one single
tier if its model mixes both.

## Permanent corpus validation

[`scripts/recoveryValidation.ts`](../../scripts/recoveryValidation.ts) is the source of truth for
whether a character's heuristic agrees with real games. Run it any time you touch
`recoveryHeuristics.ts`, `edgeGuard.ts`'s situation detection, or the corpus grows meaningfully:

```bash
npx tsx scripts/recoveryValidation.ts
```

For every real recorded edge-guard situation (from `computeEdgeGuardEvents`), it runs the real,
shipped `classify()` against the recovering player's actual entry state, then checks whether the
prediction holds up against what really happened:

- **`wrongStage`** — classifier said "not reaches-stage" (dead or ledge-only), but the player
  landed back on the main stage anyway, **without taking any additional damage along the way**
  (a hit can genuinely assist a recovery — see the accidental-save note in
  [classifiedSituations.ts](../../src/classifiedSituations.ts) — so a damage-assisted case doesn't
  count against the heuristic; it's excluded, not silently treated as correct).
- **`wrongLedge`** — classifier said "dead" (can't even reach the ledge), but the player grabbed
  the ledge anyway, undamaged. (A "reaches-stage" verdict always implies the ledge was reachable
  too, by construction — see `checkLandsOnMainFloor`'s own doc comment — so only "dead" can be
  wrong about the ledge specifically.)

**A real contradiction found this way means the heuristic (or its documented tier/caveats) needs
to change — not that the finding gets quietly excluded or the script's threshold loosened.** If
you find one, open (or update) the relevant character's page with it as a known gap before doing
anything else, whether or not you fix it in the same session.

### Current results (2026-09-25, 719-file corpus, Dream Land only)

| Character | n (jumps=1) | damage-assisted excluded | WRONG |
|---|---|---|---|
| Captain Falcon | 289 (256) | 171 | 0 |
| Captain Falcon (JP) | 346 (273) | 183 | 0 |
| Kirby | 4 (2) | 2 | 0 |
| Kirby (JP) | 1 (0) | 0 | 0 |
| Fox | 92 (71) | 34 | 0 |
| Fox (JP) | 175 (144) | 76 | 0 |
| Donkey Kong | 228 (181) | 143 | 0 |
| **Donkey Kong (JP)** | 129 (103) | 63 | **2** |
| Samus | 64 (50) | 38 | 0 |
| Samus (JP) | 139 (113) | 35 | 0 |
| Link | *(0 situations in corpus — untested)* | — | — |
| Link (JP) | 141 (114) | 38 | 0 |
| Yoshi | 173 (151) | 66 | 0 |
| Yoshi (JP) | 184 (159) | 99 | 0 |
| Pikachu | 3355 (2314) | 1178 | 0 |
| Pikachu (JP) | 639 (467) | 225 | 0 |
| Jigglypuff | *(0 situations in corpus — untested)* | — | — |
| Jigglypuff (JP) | 1 (1) | 1 | 0 |

Only 2 wrong predictions total, both Donkey Kong (JP) — see [dk.md](dk.md#known-gap). Every other
character currently has zero real corpus contradictions, though several (Link US, Jigglypuff both
regions, Kirby both regions) have too little data to say much yet — see each page's own "corpus
coverage" note.

`unsupportedJumps` (543) and `unsupportedCharacter` (608) situations are skipped entirely — see
"What's out of scope" below. `notImplemented` (82) situations are ones the classifier explicitly
declines to guess on (see Falcon's and Kirby's pages) — never counted as wrong either way.

## What's out of scope

- **`jumpsRemaining > 1`**: `classify()` returns `null` (unsupported) for any recovery with more
  than one jump remaining — the search space for "how many different delayed-jump timings could
  matter" isn't modeled. Real edge-guard situations mostly have 0 or 1 jump left by the time
  they're actually contested, so this is a minor coverage gap, not a correctness one.
- **Turning around mid-recovery**: most characters can only face toward the stage to use a
  ledge-grab; a few (Samus's Charge Shot, DK's neutral-B) could technically turn around via a
  different move, but that combined maneuver isn't modeled — those cases return
  `"not-implemented"` rather than a guessed answer. Pikachu, Fox, and Yoshi's own recovery moves
  have no facing dependency at all, so this doesn't apply to them.
- **Platforms**: Dream Land's three extra platforms (two side, one top — see
  [stageGeometry.ts](../../src/stageGeometry.ts)) are deliberately **not** modeled as landable
  surfaces. Per the user (2026-09-25): only whether a character can reach the main floor's Y=0
  level at or past its near edge matters; a trajectory with enough drift to cross the *entire*
  stage is credited as reaching it too, since a real player could simply ease off the stick to
  land short — see `checkLandsOnMainFloor`'s own doc comment for the exact rule and its revision
  history (an earlier version of this relaxation had a real, since-fixed bug: keying the check off
  the search branch's arbitrary drift direction instead of a stage-relative reference, which let
  the "drifting away from the stage" search branch report success at literally unbounded
  distance). This means the model can under-count recoverability for characters/positions where
  the *only* real path back is landing on a platform rather than the main floor — not yet
  quantified how often that actually matters in practice.

## Characters

| Character | Recovery move | Page |
|---|---|---|
| Captain Falcon | Falcon Dive (+ Falcon Punch reposition) | [falcon.md](falcon.md) |
| Kirby | Final Cutter | [kirby.md](kirby.md) |
| Fox | Firefox | [fox.md](fox.md) |
| Donkey Kong | Spinning Kong | [dk.md](dk.md) |
| Samus | Screw Attack | [samus.md](samus.md) |
| Link | Spin Attack | [link.md](link.md) |
| Yoshi | Double jump (no up-B) | [yoshi.md](yoshi.md) |
| Pikachu | Quick Attack | [pikachu.md](pikachu.md) |
| Jigglypuff | Double jump (no up-B) | [jigglypuff.md](jigglypuff.md) |

Every character above is ported from `/Users/ness/workspaces/smashremix/docs/recovery-analysis-plan.md`'s
Python simulators, which were independently validated there against real replay data at
**1,733/1,733 correct** as of the TypeScript port (per `recoveryHeuristics.ts`'s own top-of-file
doc comment) — that's the baseline confidence level before any of this codebase's own
corpus-validation or bug history below.
