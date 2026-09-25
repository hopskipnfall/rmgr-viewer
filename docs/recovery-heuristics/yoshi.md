# Yoshi

No up-B recovery — Yoshi's only recovery tool is his **double jump**, which (unlike most
characters' jumps) is driven by hand-animated motion rather than a simple physics formula.

## Rigor tier

**Mixed.** Base physics (gravity, air speed, air control) and the jump's horizontal control are
decomp physics — sourced directly from the game's code. The jump's vertical motion, though, is
replay-calibrated: his height each frame comes from the animation itself rather than from ordinary
jump physics, so that curve was extracted by measuring a real recorded double jump and cross-checked
against many others in the corpus.

Facing doesn't matter for Yoshi's recovery — he can turn around using the double jump itself.

## JP region variant

Real physics differences between regions: gravity, fall speed, and horizontal air speed/control all
differ from US. The vertical motion curve itself is shared unchanged between regions — checked
directly against a real JP double jump and found to match the US curve exactly.

## Caveats

- The model won't produce a verdict at all while Yoshi is still in the very first moment of his
  double jump animation — it needs the jump's motion to settle into ordinary falling physics first,
  since the animation-driven vertical speed can be misleading before then.

## Corpus validation status

0 wrong predictions across 173 US + 184 JP real situations checked so far — see the
[top-level README](README.md#current-results).
