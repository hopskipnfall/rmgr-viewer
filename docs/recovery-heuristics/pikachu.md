# Pikachu

Recovery move: **Quick Attack** (up-B), 0 jumps only. Implemented in `recoveryHeuristics.ts`'s
`pika*` functions (`PIKA` constants).

## Rigor tier

**Tier 1 (decomp) throughout** — base physics, the windup, the zip velocity table, and the re-aim
mechanics all ported from `pikachu_recovery_sim.py`. No replay-calibrated curves. Quick Attack's
aim is a free choice independent of facing (Pikachu can turn around with it) — facing direction
never changes the verdict.

## JP region variant

Confirmed region-independent — no recovery-relevant constant differences, per the Game Expert's
decomp audit.

## Performance history (doesn't affect correctness, but shapes what the code looks like)

Pikachu is by far the most expensive character to classify (angle × magnitude × recursive-second-
zip search, up to ~11,664 branches for a genuinely-dead situation) — it alone accounted for 94.7%
of all `classify()` time across every character combined, measured on real match data. Two
optimization passes are relevant to understand the current code:

- **2026-09-11**: exact, answer-preserving pruning (`pikaOutcomeStillReachable` and friends) that
  recognizes when a remaining branch's deterministic trajectory provably can't produce an outcome
  and returns early instead of frame-stepping to the 400-frame cap. Verified via a differential
  check against a frozen pre-optimization reference across the whole corpus plus thousands of
  random inputs (0 mismatches). Result: corpus-wide Pikachu time dropped ~25x.
- **Converting the shared 400-frame helpless-fall tail to `evaluatePhase`'s closed-form path (like
  DK) was tried and reverted** — it was a net *regression* in this V8 runtime for the realistic
  case (a real match's full overlay precompute went from ~1.4s to ~2.4s), even though the isolated
  worst-case pathology did improve in isolation. Frame-stepped is correct here; don't re-attempt
  this without re-measuring on real data first.

## Bug history: the fast-dead-rejection table was removed 2026-09-25

A precomputed offline boundary table (`PIKACHU_DEAD_BOUNDARY_JUMPS_0`/`_1`, ~13 minutes to
generate) let `classify()` skip straight to `"dead"` for clearly-hopeless positions without
running the full search. It was built against the pre-`checkLandsOnMainFloor`-relaxation physics
(see the [top-level README](README.md#whats-out-of-scope)) and started producing **false "dead"
rejections** once that relaxation shipped, since Quick Attack's own thrust can now cover
meaningfully more ground than the table assumed. Removed rather than patched — `classify()`
currently always runs the real search for Pikachu (slower, but correct). A regenerated table
would restore the fast path; see the removed function's git history
(`fastRejectPikachuDead`, deleted 2026-09-25) for the original implementation to regenerate
against.

The pruning bound in `pikaOutcomeStillReachable` had a related but distinct bug during the same
rework — an intermediate version keyed a shortcut off drift direction the same way
`checkLandsOnMainFloor`'s first (buggy) draft did, and was reverted back to the original symmetric
distance bound, which turned out to still be valid (not stale) once the *real*
`checkLandsOnMainFloor` fix landed.

## Corpus validation status

0 wrong predictions across 3,355 US + 639 JP real situations (2026-09-25 run) — by far the
largest sample of any character, and the one this file's own fuzz/differential-testing discipline
has been most invested in keeping fast without sacrificing correctness. See the
[top-level README](README.md#current-results-2026-09-25-719-file-corpus-dream-land-only).
