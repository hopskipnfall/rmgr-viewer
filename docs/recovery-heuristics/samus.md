# Samus

Recovery move: **Screw Attack** (up-B).

## Rigor tier

**Decomp physics throughout** — base physics and the jump formula come directly from the game's
code. No replay-calibrated curves. The model accounts for the fact that Screw Attack resets
vertical speed to a fixed value regardless of how fast Samus was already moving upward, so pressing
it immediately after a fast upward jump can waste free height — the model searches for the better
timing rather than assuming an immediate press is always best.

Samus can technically turn around using Charge Shot before recovering, but that combined play isn't
modeled — a facing-away situation that isn't already dead reports "not enough information" rather
than a guess.

## JP region variant

No known physics differences between regions for this character's recovery.

## Caveats

None currently known.

## Corpus validation status

0 wrong predictions across 64 US + 139 JP real situations checked so far — see the
[top-level README](README.md#current-results).
