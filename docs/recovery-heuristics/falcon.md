# Captain Falcon

Recovery move: **Falcon Dive** (grab special), with an optional aerial **Falcon Punch** used to
reposition beforehand if a jump is still available.

## Rigor tier

**Mixed.** Base physics (gravity, air speed, air control) and Falcon Punch's charge/travel physics
are decomp physics — sourced directly from the game's code. Falcon Dive's own motion after it
activates, though, is replay-calibrated: it's a hand-animated move rather than a physics formula,
so that curve was extracted by measuring real recorded Dives rather than read from a formula. It
hasn't yet been checked against a wide range of real Dive misses, so treat it as the least certain
part of Falcon's model.

Because that curve isn't fully verified, if the only reason Falcon looks unrecoverable is the Dive
curve itself, the model says "not enough information" instead of calling him dead — so an
unverified curve can't silently produce a false death prediction.

## JP region variant

Falcon has real physics differences between US and JP versions (jump height and part of the Dive
motion differ) — the two regions use separate models, not a shared one.

## Caveats

- Falcon Dive's curve being replay-calibrated (see above) is the single biggest open question for
  this character. If a Falcon recovery is ever visibly misjudged, this is the first place to look.
- Falcon Punch repositioning is only modeled when Falcon still has his jump available. Without a
  jump, the model doesn't attempt to account for it — it also falls into "not enough information"
  rather than a guess in that case.

## Corpus validation status

0 wrong predictions across 289 US + 346 JP real situations checked so far — see the
[top-level README](README.md#current-results). No known
open contradictions for Falcon.
