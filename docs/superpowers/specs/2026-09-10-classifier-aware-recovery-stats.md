# Classifier-aware recovery/edge-guard statistics

## Summary

Right now, `edgeGuard.ts` opens a "recovery situation" purely geometrically
(a player crosses outside the danger zone while actionable) and resolves it
purely by outcome (stock lost / ledge grabbed / landed safely). It has no
idea whether the situation was ever actually survivable. That conflates
three very different things into one Recovery%/EdgeGuard% number:

- **Hopeless** situations, where the recovering player was already dead no
  matter what they did.
- **Free** situations, where the recovering player was always going to make
  it back, no matter what the edge-guarder did.
- **Contestable** situations, where the outcome genuinely depended on both
  players' decisions (most interestingly: "survivable only if the ledge is
  free").

The recovery classifier (`recoveryHeuristics.ts`) now gives us, cheaply, a
verdict at the moment a situation opens (and again if the recovering player
jumps mid-situation): `reaches-stage` / `dead-if-ledge-occupied` / `dead` /
`not-implemented`. This proposal is about using that verdict to split
existing recovery/edge-guard stats into their meaningful and meaningless
parts, and to surface two new, directly actionable findings:

1. **Missed ledge-hog opportunities** — situations where the verdict was
   `dead-if-ledge-occupied` (recovering player needed the edge-guarder to
   *not* hold the ledge), the edge-guarder didn't hold it, and the recovery
   succeeded as a direct result. The lesson for the edge-guarder: you didn't
   need to do anything risky here, just sit on the ledge.
2. **Accidental saves** — situations where the verdict said the recovering
   player was doomed (`dead`, or `dead-if-ledge-occupied` while the
   edge-guarder *did* hold the ledge), but they survived anyway, correlated
   with an edge-guarder hit landing in the window. The likely story: the
   edge-guarder's own attack knocked the recovering player onto a rescuable
   trajectory.

## Why this matters for the stats specifically

A player's Recovery% is currently dragged down by every hopeless situation
they were ever put in (nothing they could have done) and inflated by every
free one (nothing the opponent could have done). Neither reflects a
decision either player made. The same goes for EdgeGuard% in the other
direction. Splitting stats by classifier category turns "how good is this
player at recovering" into something that's actually answerable, and turns
"did the edge-guarder play this correctly" into something that can name the
specific missed option (hold the ledge) instead of just being a binary
success/failure.

## Scope

- Only situations `edgeGuard.ts` already tracks (2-player, Dream Land) and
  only for the 7 classifier-supported characters (Link, Pikachu, Samus, DK,
  Fox, Yoshi, Jigglypuff — NA/US variants). Everything else falls into an
  explicit `"unclassified"` category, not a guess — see "Coverage and
  fallback" below.
- Reuses the classifier exactly as it exists today (verdict at
  hitstun-exit, verdict again at a mid-situation jump if one happens) — no
  new classifier calls beyond what `recoveryVerdicts.ts` already computes
  for the live overlay/log feature. This was a deliberate design constraint
  while picking the approach below, not an afterthought — see
  "Performance" at the end.
- Does not change `edgeGuard.ts`'s own situation-opening/resolution logic.
  This is a read-only annotation layer on top of it.

## Data model

### Unifying the situation trackers first

Before building on top of `edgeGuard.ts`, worth fixing something already
slightly broken: there are currently **three** independent, near-duplicate
implementations of "is this port currently in an open recovery situation"
— `edgeGuard.ts`'s own state machine (`computeEdgeGuardEvents`),
`ledgeTrap.ts`'s `buildRecoveryMap`, and `recoveryVerdicts.ts`'s own
hitstun-exit/jump trigger detection (which duplicates `edgeGuard.ts`'s
hitstun-exit logic specifically, just without the full situation
lifecycle). They already can and do disagree at the margins (different
resolution criteria, different edge cases). Correlating classifier verdicts
with `edgeGuard.ts` situations is a natural forcing function to collapse
this down to one shared situation tracker that the other two derive from,
rather than adding a *fourth* independent one. Flagging this here rather
than silently doing three-way reconciliation logic in the new correlation
code — recommend a short follow-up pass to unify these before or alongside
this feature, not blocking it, but worth doing at the same time while
everything's already being touched.

### New: `ClassifiedSituation`

```ts
export type SituationCategory =
  | "hopeless"     // entryVerdict === "dead"
  | "free"         // entryVerdict === "reaches-stage"
  | "contestable"  // entryVerdict === "dead-if-ledge-occupied"
  | "unclassified"; // entryVerdict is null (unsupported character, ungated
                     // state, facing-away DK/Samus edge case, etc.)

export interface ClassifiedSituation {
  readonly recoveringPort: PortIndex;
  readonly edgeGuardingPort: PortIndex;
  readonly enteredFrameIndex: number;
  readonly resolutionFrameIndex: number;
  readonly resolutionKind: "recovery-success" | "recovery-failure";

  /** The verdict at the situation's opening trigger (hitstun-exit). null if
   * unclassified -- see SituationCategory. */
  readonly entryVerdict: RecoveryVerdict | null;
  /** The verdict recomputed at a mid-situation jump trigger, if the
   * recovering player jumped before the situation resolved. null if they
   * never jumped, or if that jump's verdict was itself unclassified. */
  readonly jumpVerdict: RecoveryVerdict | null;

  readonly category: SituationCategory;

  /** Did the edge-guarding port occupy the ledge (any LEDGE_ACTION_STATES
   * state) at any point between the situation opening and its resolution? */
  readonly edgeGuarderHeldLedge: boolean;

  /** category === "contestable", edge-guarder did NOT hold the ledge, and
   * the recovering player survived via the ledge (resolutionKind ===
   * "recovery-success" and they were in a ledge-action-state at
   * resolution). The direct "you just needed to hold the ledge" case. */
  readonly missedLedgeHogOpportunity: boolean;

  /** category is "hopeless" (or "contestable" with edgeGuarderHeldLedge
   * true, i.e. also should have been unsurvivable), but resolutionKind is
   * "recovery-success" anyway, AND the edge-guarding port landed a hit on
   * the recovering port during the window. The "an attack accidentally
   * rescued them" case. */
  readonly possibleAccidentalSave: boolean;
}

export function computeClassifiedSituations(
  replay: Replay,
): ClassifiedSituation[];
```

### Building it

For each `EdgeGuardEvent` situation pair (`situation-entered` →
`recovery-success`/`recovery-failure`) for a given `recoveringPort`:

1. Find the `computeRecoveryVerdictSpans` entry for that port whose
   `verdictFrameIndex` falls at or shortly after the situation's
   `enteredFrameIndex` (the hitstun-exit trigger) — this is `entryVerdict`.
   Find a second span (if any) whose `verdictFrameIndex` falls strictly
   between entry and resolution and whose `kind` is `"jumped-verdict"` —
   this is `jumpVerdict`.
2. `category` from `entryVerdict` per the enum above.
3. `edgeGuarderHeldLedge`: scan `[enteredFrameIndex, resolutionFrameIndex]`
   for the edge-guarding port's `actionStateId` ever being in
   `LEDGE_ACTION_STATES` (already exported from `ledgeTrap.ts`).
4. `missedLedgeHogOpportunity` / `possibleAccidentalSave`: derived
   per their definitions above — the second one additionally needs "did the
   edge-guarder land a hit," which can reuse `di.ts`'s existing hit
   extraction (`extractAllHitsWithDI`, or a lighter version of it if that's
   more than's needed here) filtered to attacker === edgeGuardingPort,
   victim === recoveringPort, within the situation's frame window.

### Coverage and fallback

Given 7-character/NA-only/Dream-Land-only scope, a meaningful fraction of
real situations will land in `"unclassified"`. The existing (unqualified)
Recovery%/EdgeGuard% stats stay exactly as they are today — this is
additive, not a replacement. New stats (below) are computed only over the
non-`"unclassified"` subset, and the UI should say so explicitly (e.g. "73%
of situations classified" alongside the new numbers) rather than silently
presenting a partial sample as the whole picture.

## Stats/UI integration

- **Recovery widget / EdgeGuard widget** (`matchView.ts`'s
  `recoveryWidget`/`edgeGuardWidget`): add a breakdown row — hopeless / free
  / contestable / unclassified counts — and compute Recovery%/EdgeGuard%
  restricted to `"contestable"` alongside the existing all-situations
  number, labeled clearly as two different things, not a replacement value.
- **New stat: ledge-hog opportunities** — `n` contestable situations where
  the edge-guarder *could* have just held the ledge, how many they actually
  held (`edgeGuarderHeldLedge`), and how many of the misses became
  `missedLedgeHogOpportunity`. This is the single most directly-actionable
  number this feature produces — "you had N free kills available just by
  holding the ledge and took M of them."
- **Event log**: for `possibleAccidentalSave` situations, a log entry at
  the resolution frame — something like `"${frame} — Possible accidental
  save (opponent's own hit may have rescued them)"`. For
  `missedLedgeHogOpportunity`, similarly `"${frame} — Ledge hog would have
  ended this"`. Both are exactly the kind of frame-tagged, click-to-seek
  entries this app's event log is already built for.
- **Neutral/situation commentary panel**: gate the existing "recovering" /
  "edge-guarding" narrative text on `category` — don't narrate a hopeless
  situation as a live recovery contest (nothing to root for), and consider
  distinct wording for free situations ("guaranteed return" rather than
  "recovering") so the commentary stops implying tension where the
  classifier says there wasn't any.

## Phasing

1. **Land `computeClassifiedSituations` + validate.** Same validation
   discipline as the classifier itself — run it against the full replay
   corpus (extend `scripts/recoveryValidation.ts`, or a sibling script) and
   spot-check `missedLedgeHogOpportunity`/`possibleAccidentalSave` flags
   against a handful of real matches by eye before trusting the detectors.
2. **Surface the breakdown counts + contestable-only %s in the existing
   widgets**, additive to current behavior. No default view changes yet.
3. **Add the ledge-hog-opportunity and accidental-save event log entries
   and stat.**
4. **Gate commentary wording on category**, once 2–3 feels solid.
5. **Revisit whether contestable-only Recovery%/EdgeGuard% should become
   the primary displayed number**, once there's enough real usage to know
   whether players actually want that framing by default or as an
   optional lens.

Each phase should ship independently reviewable/testable — no need to land
this as one large change.

## Performance

`computeClassifiedSituations` adds zero new classifier calls: it's a
read-only correlation of `computeEdgeGuardEvents` (already computed on
every match load) against `computeRecoveryVerdictSpans` (already computed
for the live overlay/log feature, and now memoized per-replay — see the
"Optimize recovery classifier" work already landed on this branch). The
per-situation ledge-occupancy scan and hit-correlation are cheap
`actionStateId`/position checks over the situation's frame range, not
classifier calls.

The one thing worth flagging: this feature is explicitly meant to run over
**large folder imports**, not just one interactively-viewed match at a
time. The current classifier optimization work targets "one match loads
fast" — folder-scale import multiplies that by however many replays are in
the folder. The remaining known bottleneck (documented in the perf commit
on this branch: some genuinely-reachable-but-slow-to-confirm searches,
mostly Pikachu, worst case ~2s for a single match) becomes proportionally
more painful at folder scale than it is for one match. Worth re-profiling
specifically under a batch-import workload once this feature exists and
revisiting the search-reordering optimization then, rather than
speculatively chasing it further right now.

## Open questions

- Should `"unclassified"` situations still count toward the *existing*
  unqualified Recovery%/EdgeGuard%, or should there eventually be a toggle
  to restrict even those to "matches where classifier coverage was high
  enough to trust the number"? Leaning toward: leave existing stats alone
  entirely, this is purely additive, and let real usage tell us whether
  people want a combined view later.
- `possibleAccidentalSave`'s hit-correlation is a heuristic ("a hit landed
  in the window" doesn't prove causation) — worth being upfront in the UI
  copy that this is a "worth checking" flag, not a certainty, the same way
  the classifier's own `dead-if-ledge-occupied` naming is deliberately
  honest about what it does and doesn't know.
