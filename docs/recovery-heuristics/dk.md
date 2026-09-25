# Donkey Kong

Recovery move: **Spinning Kong** (up-B). Implemented in `recoveryHeuristics.ts`'s `dk*` functions
(`DK` / `DK_JP_SPINNINGKONG_AIR_VEL_Y` constants).

## Rigor tier

**Tier 1 (decomp) throughout** — base physics, jump formula, and Spinning Kong's own multi-phase
physics (start gravity multiplier, air accel, fallspecial drift) all come from `213_DonkeyMain.c`.
No replay-calibrated curves. DK can't turn around using Spinning Kong itself, but CAN using
neutral-B — that combined maneuver isn't modeled, so a facing-away, non-dead verdict reports
`"not-implemented"` rather than a guess (same treatment as Samus's Charge Shot case).

**Closed-form**: fully converted from per-frame simulation to `evaluatePhase`'s O(log n) crossing
lookups. Fuzz-verified against the original frame-stepped version across ~3,000 random trials plus
a dense boundary grid, 0 mismatches (measured ~4.6-5.3x wall-clock speedup). This is also the
character whose closed-form path exercises `evaluatePhase`'s own relaxation logic (see the
[top-level README](README.md#whats-out-of-scope)) most directly — its own fuzz suite
(`closed-form primitives vs naive frame-stepping`) is what caught two real boundary bugs in that
relaxation's 2026-09-25 rework before they shipped.

## JP region variant

One real physics difference, confirmed against the full `dDonkeyMain_attr` table and the Spinning
Kong header block: `SPINNINGKONG_AIR_VEL_Y` (18.0 JP vs 20.3 US). Everything else — ground/air
accel, vel max, gravity multipliers, fallspecial drift, landing lag — is single-value, no region
gating.

## Known gap

**2 real wrong predictions, both Donkey Kong (JP)**, per the 2026-09-25
`scripts/recoveryValidation.ts` run:

- `260830202448-fishing1king-nue-31.rmgr` frame 10711: pos=(2922.7,-1852.1) vel=(38.0,8.6)
  jumps=0. Predicted `dead`; actually reached the stage (undamaged along the way).
- `260913080306-nue-LovingFishing_JP-27-2.rmgr` frame 2005: pos=(3161.4,-930.4)
  vel=(-1.4,-56.0) jumps=0. Predicted `dead`; actually grabbed the ledge (undamaged).

**Root-caused 2026-09-25, and it is NOT region-specific** — an earlier version of this page
guessed the JP constant (`SPINNINGKONG_AIR_VEL_Y=18.0`) as the likely cause; that guess was wrong.
Both cases reproduce identically byte-for-byte with the US constants at the same (x, y, vx, vy) —
US DK's 0-wrong record is just luck of which real positions occurred in the US corpus, not a more
correct model. Traced with temporary debug instrumentation (not shipped) through
`dkRecoveryOutcomes`/`dkSimulateSpinningKong`:

In both cases, pressing Spinning Kong immediately (delay=0) corrects the character's horizontal
position into the stage's X range *very* quickly — well within Spinning Kong's first (low-gravity)
phase. But **Y never climbs back up to 0 within that window**: case 1 tops out at Y=-1036 (started
at -1852, needed +1036 more); case 2 tops out at Y=-176 (started at -930, needed only +176 more —
a near miss). In both, the low-gravity phase (`SPINNINGKONG_START_GRAVITY_MUL=0.07` for the first
`GRAVITY_SWITCH_FRAME=57` frames) ends before Y reaches 0, full gravity resumes, and Y falls back
away instead of finishing the climb. No delay value or direction in the search does better — this
isn't a search-coverage gap, it's the vertical physics itself falling just short.

The consistent shape (X corrects quickly; Y stalls a bounded distance short of 0, worse when
starting lower) points at Spinning Kong's own vertical physics — most likely
`SPINNINGKONG_AIR_VEL_Y` (20.3), `SPINNINGKONG_START_GRAVITY_MUL` (0.07), or
`GRAVITY_SWITCH_FRAME` (57) — as slightly too weak/short relative to the real game, despite being
tier-1 decomp-sourced. Since these came from a decomp audit and aren't obviously wrong, the right
next step is asking the Game Expert to re-verify this specific trio against source rather than
tuning them empirically against 2 data points. Not yet fixed.

## Corpus validation status

228 US situations, 0 wrong. 129 JP situations, 2 wrong (see above) — see the
[top-level README](README.md#current-results-2026-09-25-719-file-corpus-dream-land-only) for the
full table.
