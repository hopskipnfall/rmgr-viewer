# Jigglypuff

No up-B recovery — like Yoshi, Jigglypuff's only recovery tool is a jump. Unlike Yoshi's, though,
it's not hand-animated: Jigglypuff's jump uses the same physics formula as any other jump.

## Rigor tier

**Decomp physics throughout** — base physics and the standard jump formula come directly from the
game's code. No replay-calibrated curve is needed, since Jigglypuff's jump isn't animation-driven.
Facing doesn't matter — Jigglypuff can turn around using the jump itself.

## JP region variant

No known physics differences between regions for this character's recovery.

## Caveats

None currently known. This is one of the simplest models in the app.

## Corpus validation status

**Almost no data**: 0 US situations and 1 JP situation checked so far — far too little to call the
model validated in practice, even though it agrees with the one real case seen. See the
[top-level README](README.md#current-results).
