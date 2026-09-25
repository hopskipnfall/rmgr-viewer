# Kirby

Recovery move: **Final Cutter** (up-B).

## Rigor tier

**Mixed.** Base physics and the timing logic (Kirby should wait until his jump reaches its peak
before using Final Cutter, since the move's own vertical motion nets out to zero height gained —
only the jump's starting height matters) are decomp physics. The move's per-frame vertical motion
curve itself is replay-calibrated, since it's hand-animated rather than formula-driven.

A few details of the model are best-guess rather than confirmed: the exact air-control formula
during the brief wait before Final Cutter activates, what happens physics-wise in the tail end
after the move's curve finishes (assumed to fall under ordinary gravity), and whether facing
direction matters at all for this move (assumed not to, matching most other characters' recovery
moves, but not separately confirmed for Kirby).

## JP region variant

No known physics differences between regions for this character's recovery.

## Caveats

- Final Cutter's total duration is long, and holding the stick the whole time can carry Kirby
  horizontally past the stage while he's still well above landing height — this can make the model
  report "not enough information" instead of a real verdict for some genuine recovery attempts,
  especially starting from near center stage. This is a known gap; the model does credit trajectories
  that pass over the stage while still airborne (see the
  [top-level README](README.md#whats-out-of-scope)), which may already help here, but that hasn't
  been separately re-checked for Kirby specifically.

## Corpus validation status

Very thin data: 4 US + 1 JP real situations checked so far, 0 wrong — but this is far too small a
sample to call the model well-validated. Most Kirby recovery attempts in the corpus don't get a
verdict at all (too many jumps remaining, or fall into "not enough information"). See the
[top-level README](README.md#current-results).
