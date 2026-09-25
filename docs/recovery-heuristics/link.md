# Link

Recovery move: **Spin Attack** (up-B).

## Rigor tier

**Decomp physics throughout** — base physics and Spin Attack's own multi-phase physics (its
low-gravity window and the timing of when full gravity resumes) come directly from the game's code.
No replay-calibrated curves. The low-gravity window's timing was additionally cross-checked directly
against real recorded JP Spin Attacks and matched.

Link can technically turn around mid-recovery using neutral-B, but the model treats him as unable
to — a deliberate simplification, on the judgment that the move is far too slow and Link's recovery
already weak enough that it's never actually useful in practice. If Link is facing away from the
stage, the model treats a ledge-only situation as an outright death (matching how the game handles
facing for ledge grabs); reaching the stage outright is unaffected by facing either way.

## JP region variant

Real physics differences between regions: gravity and Spin Attack's initial launch speed both
differ from US.

## Caveats

- The neutral-B turn-around simplification above is a judgment call, not something separately
  verified — worth revisiting if a real recovery is ever seen surviving via that route.

## Corpus validation status

**US Link: no real situations in the corpus yet — completely untested.** JP Link: 141 real
situations checked, 0 wrong — see the
[top-level README](README.md#current-results). Don't
read "0 wrong" as saying anything about US Link specifically; there's simply no data yet.
