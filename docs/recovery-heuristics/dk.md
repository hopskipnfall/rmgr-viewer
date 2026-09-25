# Donkey Kong

Recovery move: **Spinning Kong** (up-B).

## Rigor tier

**Decomp physics throughout** — base physics and Spinning Kong's own physics (its low-gravity start
phase, air control, and horizontal drift) all come directly from the game's code. No
replay-calibrated curves. DK can't turn around using Spinning Kong itself, but can using neutral-B
first — that combined play isn't modeled, so a facing-away situation that isn't already dead
reports "not enough information" rather than a guess.

## JP region variant

One confirmed physics difference: Spinning Kong's vertical launch speed is slightly lower in JP
than in US. Everything else about the move is the same between regions.

## Known gap

A small number of real DK (JP) recoveries — 2 out of 129 checked so far — are predicted "dead" when
the player actually made it back (once to the ledge, once to the stage outright), in both cases
without taking any damage along the way that could explain the difference.

This isn't actually a region-specific issue — both cases reproduce identically using the US physics
numbers as well, so it's not a JP-specific mistake, just bad luck that no US case in the corpus
happens to land in the same trouble spot. In both cases, Spinning Kong gets DK's horizontal position
back over the stage quickly, but his vertical recovery falls just short — he doesn't quite climb
back up to stage height before the move's low-gravity window runs out and normal gravity pulls him
back down, and no amount of delay or direction search finds a way around it. As the [top-level
README](README.md#rigor-tiers) notes, being decomp-sourced doesn't rule this out: either one of
Spinning Kong's vertical-motion numbers was read slightly wrong from the source, or the two-phase
gravity logic built on top of correct numbers falls short in this specific case. Since the numbers
themselves aren't obviously wrong, the right next step is having them re-verified rather than tuning
them to match just these 2 cases. Not yet fixed.

## Corpus validation status

228 US situations checked, 0 wrong. 129 JP situations checked, 2 wrong (see above) — see the
[top-level README](README.md#current-results) for the
full table.
