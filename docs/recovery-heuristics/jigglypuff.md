# Jigglypuff

No up-B recovery — like Yoshi, Jigglypuff's only recovery tool is a jump. Unlike Yoshi's, it's
**not** root-motion: Jigglypuff uses the same closed-form jump formula every other (non-Yoshi)
character uses. Implemented in `recoveryHeuristics.ts`'s `noUpB*` functions, shared with Yoshi's
(`JIGGLYPUFF_ATTR` constants — no curve).

## Rigor tier

**Tier 1 (decomp) throughout** — base physics and the standard jump formula, ported from
`pikachu_recovery_sim.py`'s shared "no up-B" model. No replay-calibrated curve is needed (unlike
Yoshi), since Jigglypuff's jump isn't root-motion driven. Facing is not a factor — Jigglypuff can
turn around using the jump itself.

## JP region variant

Confirmed region-independent — no recovery-relevant constant differences, per the Game Expert's
decomp audit.

## Known caveats

None currently flagged — this is architecturally the simplest model in the file (shares the
generic no-up-B jump/freefall simulator with Yoshi, but without Yoshi's root-motion curve
complexity).

## Corpus validation status

**Almost no data**: 0 US situations, 1 JP situation classified in the whole corpus (2026-09-25
run) — see the
[top-level README](README.md#current-results-2026-09-25-719-file-corpus-dream-land-only). Far too
little to say the model is validated in practice, even though it agrees with the one real case
seen so far. Matches the broader corpus gap noted in project memory
(schema2-untested-cases: original-12 characters still need more recordings).
