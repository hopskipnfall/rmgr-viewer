# Recovery Heuristics

For any character caught offstage, the app predicts whether they're **dead** (no path back),
**ledge-only** (can grab the ledge but can't make it onto the stage outright — survival depends on
the ledge being free), or can **reach the stage** outright. This prediction feeds the Edge Guard
Workshop's scoring and the Recovery% stat.

This directory documents, per character, how that prediction is built: where the physics model
came from, how well-tested it is against real games, and what's still open. If you play this
character and something here looks wrong, or you have replays that might disagree with a
prediction, that's useful — see "How accuracy is checked" below.

## Rigor tiers

Each character's page states an overall rigor tier, and breaks it down further if different parts
of their recovery are trusted to different degrees.

1. **Decomp physics** — the numbers (gravity, air speed, jump height, move-specific constants) come
   directly from the game's decompiled source code, not from guessing or curve-fitting. This is the
   most trustworthy tier: if those numbers are read correctly and the surrounding logic is
   implemented correctly, predictions built on them should match the real game exactly. That said,
   being decomp-sourced isn't an absolute guarantee against mistakes — a constant can still be
   mis-transcribed or mis-applied from the source, and the logic that combines those constants into
   a dead/ledge/stage verdict is hand-written and can have its own bugs, independent of whether the
   underlying numbers are right. That's what corpus validation (below) is for: it's how a mistake at
   either level actually gets caught.
2. **Replay-calibrated** — a curve or constant extracted by measuring real recorded games, used when
   no clean formula exists in the decompiled source (usually because a move's motion comes from
   hand-animated data rather than a physics formula). One tier below decomp: it's only as good as
   the real examples it was built from, and might not capture behavior in situations the data
   doesn't cover.
3. **Chart / best-fit** — plotting outcomes against starting position and eyeballing a boundary, with
   no physics model at all. The least trustworthy tier. **Not currently used for any character** —
   every character has at least a real physics model behind their prediction.

If any part of a character's recovery relies on a replay-calibrated piece, that character is not
"fully tier 1" even if everything else about them is decomp-sourced — the page says which parts
are which.

## How accuracy is checked

Every prediction is checked against real recorded games on an ongoing basis, not just spot-checked
once. As the replay collection grows, [`scripts/recoveryValidation.ts`](../../scripts/recoveryValidation.ts)
re-runs the current model against every real edge-guard situation on file and flags any case where
the model's prediction doesn't match what actually happened — a predicted "dead" who reached the
ledge or the stage anyway, for example. Situations where the recovering player took a hit that
plausibly helped them (bumped back toward the stage) are excluded, since that's the defender
getting lucky, not the model being wrong.

Anyone can run this check:

```bash
npx tsx scripts/recoveryValidation.ts
```

A real contradiction found this way means the model (or its documented caveats) needs to change —
it's not something that gets quietly excluded or ignored. If you have replays that produce a
contradiction, that's exactly the kind of contribution this project needs more of.

### Current results

As of 2026-09-25, checked against a 719-file corpus (Dream Land only):

| Character      | Real situations checked    | Wrong       |
| -------------- | -------------------------- | ----------- |
| Captain Falcon | 289 US + 346 JP            | 0           |
| Kirby          | 4 US + 1 JP                | 0           |
| Fox            | 92 US + 175 JP             | 0           |
| Donkey Kong    | 228 US + 129 JP            | 2 (JP only) |
| Samus          | 64 US + 139 JP             | 0           |
| Link           | 0 US _(untested)_ + 141 JP | 0           |
| Yoshi          | 173 US + 184 JP            | 0           |
| Pikachu        | 3,355 US + 639 JP          | 0           |
| Jigglypuff     | 0 US _(untested)_ + 1 JP   | 0           |

Only 2 wrong predictions total, both Donkey Kong (JP) — see [dk.md](dk.md#known-gap). A few
characters (Link US, Jigglypuff, Kirby) have too little data yet for "0 wrong" to mean much — see
each page's own coverage note.

## What's out of scope

- **More than one jump remaining**: the model doesn't currently attempt to predict recovery when a
  character has more than one jump left — the space of possible delayed-jump timings gets too large.
  In practice, most real edge-guard situations are already down to 0 or 1 jump by the time they're
  actually contested, so this mostly isn't a gap in the situations that matter.
- **Turning around mid-recovery**: most characters can only recover while facing the stage. Three
  characters can technically turn around using a different move first — for Donkey Kong and Samus
  that combined play isn't modeled, so those specific cases are reported as "not enough information"
  rather than a guessed answer; for Link the model deliberately treats him as unable to (see
  [link.md](link.md)), since it's judged too slow to matter in practice. A handful of characters
  have no facing requirement at all for their main recovery move.
- **Pikachu with more than 0 jumps remaining**: unlike other characters (where the general limit
  above is "more than 1 jump"), Pikachu's model currently only covers the 0-jump case — see
  [pikachu.md](pikachu.md).
- **Platforms**: Dream Land's extra platforms (two side platforms and one top platform) aren't
  treated as valid landing spots — only whether a character can get back down to the main stage
  floor is modeled. A trajectory that would carry a character clear across the entire stage while
  airborne is still credited as "reaches the stage," since a real player could just ease off the
  stick and land short instead of flying over. This means the model can under-predict recoverability
  in the rare case where a platform genuinely is the only way back — how often that actually matters
  hasn't been measured yet.

## Characters

| Character      | Recovery move                                    | Overall rigor                               | Obvious caveats                                          | Page                           |
| -------------- | ------------------------------------------------ | ------------------------------------------- | -------------------------------------------------------- | ------------------------------ |
| Captain Falcon | Falcon Dive (+ optional Falcon Punch reposition) | Mixed — Dive's curve is replay-calibrated   | None beyond the curve itself                             | [falcon.md](falcon.md)         |
| Kirby          | Final Cutter                                     | Mixed — the curve is replay-calibrated      | Very little data; often reports "not enough information" | [kirby.md](kirby.md)           |
| Fox            | Firefox                                          | Decomp physics                              | None known                                               | [fox.md](fox.md)               |
| Donkey Kong    | Spinning Kong                                    | Decomp physics (known gap, JP)              | No verdict facing away from the stage                    | [dk.md](dk.md)                 |
| Samus          | Screw Attack                                     | Decomp physics                              | No verdict facing away from the stage                    | [samus.md](samus.md)           |
| Link           | Spin Attack                                      | Decomp physics (US untested)                | Facing away from the stage ⇒ treated as dead             | [link.md](link.md)             |
| Yoshi          | Double jump (no up-B)                            | Mixed — the jump curve is replay-calibrated | None known                                               | [yoshi.md](yoshi.md)           |
| Pikachu        | Quick Attack                                     | Decomp physics                              | Only covers 0 jumps remaining                            | [pikachu.md](pikachu.md)       |
| Jigglypuff     | Jump (no up-B)                                   | Decomp physics (very little data)           | None known                                               | [jigglypuff.md](jigglypuff.md) |

**Not yet modeled: Mario, Luigi, and Ness.** No recovery prediction is produced for these
characters at all.

Every character's base physics model was validated separately, before being built into this app,
against real replay data at 1,733/1,733 correct. That covers the underlying physics model itself,
not this app's specific dead/ledge/stage verdicts — the ongoing corpus validation above is what
checks those.
