# Kirby

Recovery move: **Final Cutter** (up-B). Implemented in `recoveryHeuristics.ts`'s `kirby*`
functions (`KIRBY` constants, `KIRBY_FINAL_CUTTER_DY` curve).

## Rigor tier

- **Tier 1 (decomp)**: base physics, X-axis air control during the move (`clampAirVelXStickRange`,
  accel halved via `FINALCUTTER_AIR_ACCEL_MUL`), and the "wait for jump peak, then activate" logic
  — relayed from `ftkirbyspecialhi.c`/`229_KirbyMain.c`/`ftkirby.h`. The peak-wait strategy is a
  **proven optimum**, not a heuristic: Final Cutter's root motion overwrites Y every frame and its
  60-frame curve sums to exactly 0 net height (independently re-verified by running the curve
  interpreter and summing the result directly, not just trusting the relay's summary) — so only
  the jump's own starting height matters, and that's maximized at the jump's peak.
- **Tier 2 (replay-calibrated)**: the `KIRBY_FINAL_CUTTER_DY` per-frame Y curve itself, decoded
  with the same animation-curve interpreter built for Falcon Dive.
- **Three specific details are flagged unverified**, carried over from the relay's own
  transcription without independent re-derivation:
  1. The **pre-activation wait phase** (before Final Cutter is even pressed) is assumed to use the
     same air-control formula as the move itself, rather than the ordinary Fall-state formula
     every other character's pre-activation phase uses.
  2. The **post-curve fall phase** (after the 60-frame curve ends): the relay's source read found
     no gravity call in that phase's own physics function, but flagged the exact
     transition/timeout as unconfirmed. Taking "no gravity" literally left Kirby hovering at
     altitude forever whenever the curve ends above ledge height (caught by this codebase's own
     reachability sweep, not real-corpus data) — so it falls back to ordinary gravity instead, a
     deliberate provisional choice, not a sourced fact.
  3. **Facing independence** (tries both directions unconditionally) — matches the pattern for
     other stick-driven recovery moves, but not explicitly confirmed against source for Kirby
     specifically.

## JP region variant

Kirby's only region-gated field is cosmetic model size — no recovery-relevant physics difference,
so the JP model reuses the US constants unchanged (unlike DK/Link/Falcon/Yoshi, which have real
per-region physics differences).

## Known gap: overshoot past the ledge while still airborne

Found via this codebase's own reachability sweep and confirmed against real corpus data
(2026-09-19): Final Cutter's total duration (wait-for-peak + 60-frame curve + gravity tail) is
unusually long, and holding the stick the whole time can drift Kirby horizontally past the ledge
while still well above landing height — especially from a position near center, where a fresh
jump's peak can put the whole curve above y=0. This can report "no path found" from positions a
real recovery situation genuinely starts at (confirmed: `260918170220-nue-somei-14.rmgr`, frame
3527, x ≈ -3659 to -4297) — the assumption that `edgeGuard.ts`'s `|x| >= 2916` entry gate kept
this scenario out of the real input domain was wrong. `classify()` reports `"not-implemented"`
rather than guessing "dead" when this happens (same treatment as Falcon's unverified Dive curve).

**Likely partially addressed by `checkLandsOnMainFloor`'s 2026-09-25 relaxation** (see the
[top-level README](README.md#whats-out-of-scope)): a trajectory that passes over the stage's X
span while genuinely airborne now counts as reaching it, which is exactly the "overshoot the
ledge while still high up" shape this gap describes. Not yet re-verified against the specific
`260918170220-nue-somei-14.rmgr` case above, or re-swept for remaining "no path found" positions —
worth doing before closing this out as fixed.

## Corpus validation status

Very thin data: 4 US + 1 JP real situations classified (2026-09-25 run), 0 wrong, but this is far
too small a sample to say the model is well-validated — see the
[top-level README](README.md#current-results-2026-09-25-719-file-corpus-dream-land-only). Most
Kirby edge-guard situations in the corpus fall into `unsupportedJumps` or `not-implemented` rather
than getting a real verdict at all.
