# Samus

Recovery move: **Screw Attack** (up-B). Implemented in `recoveryHeuristics.ts`'s `samus*`
functions (`SAMUS` constants).

## Rigor tier

**Tier 1 (decomp) throughout** — base physics and jump formula from `217_SamusMain.c`. No
replay-calibrated curves. Includes a delay-before-pressing search (same reasoning as DK): Screw
Attack overwrites vy to a fixed 62.0 regardless of incoming vy, so pressing immediately when
already moving upward faster than that discards free height for no reason. **This fix was applied
proactively, not in response to a confirmed real miss** — it's the identical structural gap DK's
delay search was built to close, fixed here on the same reasoning before any Samus-specific corpus
case demonstrated it.

Samus CAN technically turn around using Charge Shot, but that combined maneuver isn't modeled — a
facing-away, non-dead verdict reports `"not-implemented"` rather than a guess.

## JP region variant

Confirmed region-independent — no recovery-relevant constant differences, per the Game Expert's
decomp audit.

## Known caveats

None currently flagged beyond the proactive-not-confirmed delay-search fix noted above.

## Corpus validation status

0 wrong predictions across 64 US + 139 JP real situations (2026-09-25 run) — see the
[top-level README](README.md#current-results-2026-09-25-719-file-corpus-dream-land-only).
