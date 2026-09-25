# Link

Recovery move: **Spin Attack** (up-B). Implemented in `recoveryHeuristics.ts`'s `link*` functions
(`LINK` / `LINK_JP` constants).

## Rigor tier

**Tier 1 (decomp) throughout** — base physics and Spin Attack's own multi-phase physics (low-
gravity window, gravity-switch timing, jump formula) from `224_LinkMainMotion.c`/`225_LinkMain.c`.
No replay-calibrated curves. `SPINATTACK_GRAVITY_SWITCH_FRAME` (12) was specifically
cross-checked against 120 real JP Link Spin Attacks (low gravity observed ending ~frame 10) in
addition to the decomp source — one of the few constants in this file with *both* a decomp source
and a direct replay cross-check.

Link CAN technically turn around mid-recovery via neutral-B, but it's modeled as if he can't — a
deliberate simplification (not a `"not-implemented"` gap like Samus/DK's turn-around cases),
justified as "so slow, and Link's recovery already so weak, that it's never actually useful."
Facing away from the stage downgrades a ledge-only verdict straight to `"dead"` (vanilla SSB64
characters can't grab the ledge facing away at all); reaching the stage outright is unaffected by
facing either way.

## JP region variant

Real physics differences confirmed against the full `dLinkMain_attr` table: gravity and Spin
Attack's initial launch speed differ from US. Everything else (jump formula, air accel/speed,
cliffcatch reach) is single-value, no region gating.

## Known caveats

- The neutral-B turn-around simplification above is a judgment call, not a sourced/verified fact —
  worth revisiting if a real corpus case ever shows Link surviving via that route.

## Corpus validation status

**US Link: 0 real situations in the corpus — completely untested.** JP Link: 141 real situations,
0 wrong (2026-09-25 run) — see the
[top-level README](README.md#current-results-2026-09-25-719-file-corpus-dream-land-only). The US
gap is a genuine coverage hole, not a validated-clean result — don't read "0 wrong" as meaning
anything for US Link specifically.
