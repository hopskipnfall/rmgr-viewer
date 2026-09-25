# Captain Falcon

Recovery move: **Falcon Dive** (grab special), with an optional aerial **Falcon Punch** used as a
repositioning tool before diving if a jump is still available. Implemented in
`recoveryHeuristics.ts`'s `falcon*` functions (`FALCON` / `FALCON_JP` constants).

## Rigor tier

- **Tier 1 (decomp)**: base physics (gravity, air speed, air accel, cliffcatch reach), the jump
  formula, and Falcon Punch's charge/travel physics — relayed from the Game Expert's smashremix
  decomp audit, confirmed against `ftcaptain.h` and the full `FTAttributes` table.
- **Tier 2 (replay-calibrated)**: Falcon Dive's post-activation motion curve
  (`FALCON_DIVE_DX`/`FALCON_DIVE_DY`) — hand-extracted from the Game Expert's animation-curve
  interpreter, **explicitly flagged as not yet cross-validated against real replay data** (the
  corpus has few Falcon Dive misses to check against). `FALCON_DIVE_DY[0] = -1849.07`, a much
  larger single-frame delta than any other entry, is called out in the code as plausible but
  unverified — "worth a second look if this model ever produces a visibly-wrong result right at
  activation."

## JP region variant

Real physics differences confirmed against the decomp (jump-formula and Dive multipliers differ) —
`FALCON_JP` is a distinct constants object, not a reuse of the US values. `jump_vel_x` region
gating was specifically double-checked and confirmed region-independent at 0.35 for both regions
(only the *height* formula differs).

## Known caveats

- **Falcon Dive's curve is tier 2, not tier 1** (see above) — the single biggest open question for
  this character. If a Falcon recovery is ever visibly misjudged, the Dive curve is the first
  place to look.
- Because that curve is unverified, `classify()` deliberately does **not** guess "dead" when its
  search finds no path and the search went through the Dive curve: it reports `"not-implemented"`
  instead. This was a direct fix for a real corpus case
  (`260916185841-AandB-nue-41.rmgr`, frame 2094) where the old code defaulted "no path found" to
  "dead" even though Falcon plainly recovered in the frames that followed — see the classify()
  Falcon case's own comment.
- Falcon Punch's aerial-reposition branch is only modeled when a jump is still available
  (`jumpsRemaining === 1`); with 0 jumps it's out of reach for the validated search and correctly
  falls into the same `"not-implemented"` treatment rather than a guess (confirmed against a real
  case, `260823171117-Wario-Player-6.rmgr` frame ~7261: the WITH-jump case is validated
  recoverable; the WITHOUT-jump case at the same position is `"not-implemented"`, not a claim
  either way).

## Corpus validation status

0 wrong predictions across 289 US + 346 JP real situations (2026-09-25 run) — see the
[top-level README](README.md#current-results-2026-09-25-719-file-corpus-dream-land-only) for the
full table. No known open contradictions for Falcon.
