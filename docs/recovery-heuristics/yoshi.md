# Yoshi

No up-B recovery — Yoshi's only recovery tool is its **double jump**, which is root-motion driven
rather than a closed-form jump formula. Implemented in `recoveryHeuristics.ts`'s `noUpB*` /
`simulateYoshiDoubleJump` functions (`YOSHI_ATTR` / `YOSHI_ATTR_JP`, `YOSHI_DOUBLE_JUMP_DY_CURVE`).

## Rigor tier

- **Tier 1 (decomp)**: base physics (gravity, air speed, air accel, cliffcatch reach) and the
  double jump's constant X-axis horizontal control (`clampAirVelX`, unaffected by root motion).
- **Tier 2 (replay-calibrated)**: `YOSHI_DOUBLE_JUMP_DY_CURVE` — Yoshi's double jump only overrides
  **Y** via root motion each frame (vy is reset to 0 at activation, then replayed frame-by-frame
  from this curve, not integrated as an ordinary velocity — real replay data shows Y freezing for
  several consecutive frames while the reported vy stays nonzero, so treating vy as an ordinary
  velocity would be wrong). X is never touched by root motion and keeps evolving normally.
  Extracted from a single clean 93-frame trace (`260828205834-nue-Kurabba-60.rmgr`, port 1), and
  cross-checked against dozens of other real double-jump instances in the corpus.

Facing is not a factor for either variant of Yoshi's recovery — both can turn around using the
double jump itself.

## JP region variant

Real physics differences confirmed against the decomp: gravity, `tvelBase`, `airSpeedMaxX`, and
`jumpaerialVelX` all differ (nearly every constant this recovery model touches). The curve itself
(`YOSHI_DOUBLE_JUMP_DY_CURVE`) is **deliberately reused unchanged**, not re-extracted for JP: the
decomp's raw animation keyframe data has zero region gating, directly confirmed against a real
106-frame JP double-jump trace (`260822222803-kusora_JPN-nue-22.rmgr`, port 1, frame 5359) whose
first 16 real samples match the US curve exactly, not even rescaled.

## Entry gating quirk

`classify()` refuses to produce a verdict at all (returns `null`) while Yoshi's action state is
still `JumpAerialF`/`JumpAerialB` (0x018/0x019) — the root-motion ramp itself — regardless of
`jumpsRemaining`, since the recorded vy may still be an unsettled animation-driven transient during
that window. Only trustworthy once settled into ordinary Fall/FallAerial physics.

## Bug history: this is the character that surfaced `checkLandsOnMainFloor`'s overshoot relaxation

Found 2026-09-25 (`260828205834-nue-Kurabba-62-2.rmgr`, frame 1917): a Yoshi double jump from a
position well within reach of the stage was misclassified `dead-if-ledge-occupied`, because the
simulated max-drift trajectory overshot the far edge of the stage entirely — even though easing
off the stick earlier would trivially have landed on it. This led directly to
`checkLandsOnMainFloor`'s near-edge/overshoot relaxation (see the
[top-level README](README.md#whats-out-of-scope)), which took two iterations to get right: the
first version had a real bug (keyed the relaxation off the search branch's arbitrary drift
direction, producing unbounded false "reaches-stage" results for the branch that drifts *away*
from the stage) before landing on the current, direction-parameter-free formulation.

## Corpus validation status

0 wrong predictions across 173 US + 184 JP real situations (2026-09-25 run, after the
`checkLandsOnMainFloor` fix above) — see the
[top-level README](README.md#current-results-2026-09-25-719-file-corpus-dream-land-only).
