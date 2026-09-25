# Fox

Recovery move: **Firefox** (up-B).

## Rigor tier

**Decomp physics throughout** — no replay-calibrated pieces, no flagged uncertainty. Base physics
and Firefox's fixed windup come straight from the game's code. Firefox's aim direction is a free
choice independent of which way Fox is facing (he can turn around with it), so facing never affects
the verdict.

## JP region variant

No physics differences between regions for this character's recovery.

## Caveats

None currently known. This is one of the most straightforward models in the app — no timing
judgment calls, no hand-animated curve, no facing dependency to get wrong.

## Corpus validation status

0 wrong predictions across 92 US + 175 JP real situations checked so far — see the
[top-level README](README.md#current-results).
