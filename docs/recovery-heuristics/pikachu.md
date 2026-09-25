# Pikachu

Recovery move: **Quick Attack** (up-B). The model currently only covers Pikachu with 0 jumps
remaining.

## Rigor tier

**Decomp physics throughout** — base physics, the windup, and Quick Attack's speed and re-aim
mechanics all come directly from the game's code. No replay-calibrated curves. Quick Attack's aim
is a free choice independent of facing (Pikachu can turn around with it), so facing never affects
the verdict.

## JP region variant

No known physics differences between regions for this character's recovery.

## Caveats

- The model only covers Pikachu with 0 jumps remaining. With a jump still available, it doesn't
  currently produce a verdict at all.

## Corpus validation status

0 wrong predictions across 3,355 US + 639 JP real situations checked so far — by far the largest
sample of any character. See the
[top-level README](README.md#current-results).
