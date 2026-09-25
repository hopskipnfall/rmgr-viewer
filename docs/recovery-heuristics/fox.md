# Fox

Recovery move: **Firefox** (up-B). Implemented in `recoveryHeuristics.ts`'s `fox*` functions
(`FOX` constants).

## Rigor tier

**Tier 1 (decomp) throughout** — no replay-calibrated curves or flagged-unverified details for
this character. Base physics and the mandatory 35-frame windup (a fixed animation with no timing
choice, unlike DK/Samus's optional delay-before-pressing) come from `209_FoxMain.c`. Firefox's
dash direction is a free choice independent of facing (Fox can turn around with it), confirmed
against source — facing direction never changes the verdict.

## JP region variant

Confirmed region-independent — no recovery-relevant constant differences at all, per the Game
Expert's decomp audit. The JP character ID dispatches to the identical model.

## Known caveats

None currently flagged. This is one of the cleanest models in the file: no delay search needed
(the windup is fixed-duration), no root-motion curve to calibrate, no facing dependency to get
wrong.

## Corpus validation status

0 wrong predictions across 92 US + 175 JP real situations (2026-09-25 run) — see the
[top-level README](README.md#current-results-2026-09-25-719-file-corpus-dream-land-only).
