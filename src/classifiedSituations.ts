/**
 * Annotates edgeGuard.ts's recovery/edge-guard situations with the recovery classifier's verdict,
 * splitting them into hopeless/contestable/unclassified and detecting two directly-actionable
 * patterns: missed ledge-hog opportunities and possible accidental saves.
 *
 * "hopeless" vs "contestable" is deliberately a 2-way split, not 3-way -- per the user
 * (2026-09-11): distinguishing "the recovering player can reach the stage outright" from "they can
 * only reach the ledge, and it's contestable" would require significant matchup/meta-specific
 * analysis we don't have, character by character. Checked against real data first: in one 30-game
 * sample, the classifier's "reaches-stage" verdict (what used to be its own "free" category) was
 * wrong -- the recovering player still died -- 20.7% of the time (86/415), while "dead" (hopeless)
 * held up. So "reaches-stage" and "dead-if-ledge-occupied" are both just "contestable" now, scored
 * identically -- only "dead" is trusted as a real claim of "effectively dead unless the opponent
 * interferes." The narrower ledge-hinges-the-outcome fact (was the "contestable" category) is still
 * available where it's actually needed (missedLedgeHogOpportunity, possibleAccidentalSave, and the
 * two "contestable only" sub-stats in matchView.ts) via the raw `entryVerdict` field itself.
 *
 * See docs/superpowers/specs/2026-09-10-classifier-aware-recovery-stats.md for the design this
 * implements (phase 1: the correlation layer + validation, no UI yet).
 */
import type { PortIndex, Replay } from "@rmg-k/rmgr";
import { computeEdgeGuardEvents, type EdgeGuardEvent } from "./edgeGuard.js";
import { extractAllHitsWithDI } from "./di.js";
import { LEDGE_ACTION_STATES } from "./ledgeTrap.js";
import {
  computeRecoveryVerdictSpans,
  type VerdictSpan,
} from "./recoveryVerdicts.js";
import type { RecoveryVerdict } from "./recoveryHeuristics.js";

export type SituationCategory =
  | "hopeless" // entryVerdict === "dead"
  | "contestable" // entryVerdict === "reaches-stage" or "dead-if-ledge-occupied" -- see this file's top doc comment for why these two are merged
  | "unclassified"; // entryVerdict is null (unsupported character/state, etc.)

export interface ClassifiedSituation {
  readonly recoveringPort: PortIndex;
  readonly edgeGuardingPort: PortIndex;
  readonly enteredFrameIndex: number;
  readonly resolutionFrameIndex: number;
  readonly resolutionKind: "recovery-success" | "recovery-failure";

  /** The verdict at the situation's opening trigger (hitstun-exit). null if unclassified. */
  readonly entryVerdict: RecoveryVerdict | null;
  /** The verdict recomputed at a mid-situation jump trigger, if the recovering player jumped
   * before the situation resolved. null if they never jumped, or that jump had no computable
   * verdict within the situation window. */
  readonly jumpVerdict: RecoveryVerdict | null;

  readonly category: SituationCategory;

  /** Did the edge-guarding port occupy the ledge (any LEDGE_ACTION_STATES state) at any point
   * between the situation opening and its resolution? */
  readonly edgeGuarderHeldLedge: boolean;

  /** entryVerdict === "dead-if-ledge-occupied" specifically (not the broader "contestable"
   * category -- see this file's top doc comment), edge-guarder did NOT hold the ledge, and the
   * recovering player survived by being in a ledge-action-state at the resolution frame. The
   * direct "you just needed to hold the ledge" case. */
  readonly missedLedgeHogOpportunity: boolean;

  /** The situation should have been unsurvivable (category "hopeless", or entryVerdict
   * "dead-if-ledge-occupied" with edgeGuarderHeldLedge true), but resolutionKind is
   * "recovery-success" anyway, AND the edge-guarding port landed a hit on the recovering port
   * during the window. Worth a look, not proof of causation -- see the design doc's "Open
   * questions". */
  readonly possibleAccidentalSave: boolean;

  /** Total damage dealt by the edge-guarding port to the recovering port during the situation
   * window (sum of extractAllHitsWithDI's damageDealt for matching hits). Feeds
   * edgeGuardEffectivenessScore's partial-credit tiers for situations that didn't end in a kill.
   * Deliberately NOT "damage percent" in the sense of proximity to a kill -- per the user, damage
   * percent isn't actually a percentage of anything, just a knockback multiplier, so this is a
   * flat cumulative-damage bucket, not scaled against the recovering player's existing damage. */
  readonly damageDealtByGuarder: number;

  /** Did the recovering port land an attack on the edge-guarding port at any point between the
   * situation opening and its resolution (whether that resolution is a kill, a ledge grab, or a
   * landing)? A single boolean, not a count -- per the user (2026-09-11): "make sure we don't
   * double-count if they get hit by two attacks." Feeds a flat -15 penalty in
   * edgeGuardEffectivenessScore, but ONLY when the recovering player actually got away -- getting
   * hit on the way to a real kill anyway doesn't cost anything (see that function's own
   * doc comment). */
  readonly edgeGuarderWasHit: boolean;
}

function categoryForVerdict(
  verdict: RecoveryVerdict | null,
): SituationCategory {
  switch (verdict) {
    case "dead":
      return "hopeless";
    case "reaches-stage":
    case "dead-if-ledge-occupied":
      return "contestable";
    case "not-implemented":
    case null:
      return "unclassified";
  }
}

/**
 * The first span for `port` within [fromFrameIndex, toFrameIndex] whose kind matches, or null.
 *
 * `allowHeldFromBeforeWindow`: when true, also matches a span whose `verdictFrameIndex` is BEFORE
 * `fromFrameIndex`, as long as its `holdEndFrameIndex` still reaches into the window -- i.e. the
 * verdict was computed earlier but is still validly held. Needed for entryVerdict: recoveryVerdicts.ts's
 * own trigger (hitstun-exit, etc.) and edgeGuard.ts's "situation-entered" are computed independently
 * and can disagree on exactly which frame a recovery attempt "begins" -- found via a real case
 * (2026-09-11): a Pikachu exited real hitstun into Quick Attack's own action states at frame 6352,
 * but edgeGuard.ts didn't open its situation until frame 6413, 61 frames later, while the verdict
 * computed at 6352 was held all the way to 6428 (the situation's own resolution frame) -- a dead
 * miss under a point-in-window check, even though the held verdict covered the whole situation.
 * Left false for jumpVerdict: a jump trigger that fired before the situation even opened isn't "a
 * jump during this situation," regardless of how long its verdict stays held.
 */
function findSpanInWindow(
  spans: readonly VerdictSpan[],
  port: PortIndex,
  kind: VerdictSpan["kind"],
  fromFrameIndex: number,
  toFrameIndex: number,
  pickLast: boolean,
  allowHeldFromBeforeWindow = false,
): VerdictSpan | null {
  let found: VerdictSpan | null = null;
  for (const span of spans) {
    if (span.port !== port || span.kind !== kind) continue;
    if (span.verdictFrameIndex > toFrameIndex) continue;
    if (allowHeldFromBeforeWindow) {
      if (span.holdEndFrameIndex < fromFrameIndex) continue;
    } else if (span.verdictFrameIndex < fromFrameIndex) {
      continue;
    }
    found = span;
    if (!pickLast) break;
  }
  return found;
}

function edgeGuarderHeldLedgeInWindow(
  replay: Replay,
  edgeGuardingPort: PortIndex,
  fromFrameIndex: number,
  toFrameIndex: number,
): boolean {
  for (let i = fromFrameIndex; i <= toFrameIndex; i++) {
    const state = replay.frames[i]?.ports[edgeGuardingPort]?.state;
    if (state && LEDGE_ACTION_STATES.has(state.actionStateId)) return true;
  }
  return false;
}

function edgeGuarderLandedHitInWindow(
  hits: readonly ReturnType<typeof extractAllHitsWithDI>[number][],
  recoveringPort: PortIndex,
  edgeGuardingPort: PortIndex,
  fromFrameIndex: number,
  toFrameIndex: number,
): boolean {
  return hits.some(
    (hit) =>
      hit.victimPort === recoveringPort &&
      hit.attackerPort === edgeGuardingPort &&
      hit.hitFrameIndex >= fromFrameIndex &&
      hit.hitFrameIndex <= toFrameIndex,
  );
}

function edgeGuarderWasHitInWindow(
  hits: readonly ReturnType<typeof extractAllHitsWithDI>[number][],
  recoveringPort: PortIndex,
  edgeGuardingPort: PortIndex,
  fromFrameIndex: number,
  toFrameIndex: number,
): boolean {
  return hits.some(
    (hit) =>
      hit.victimPort === edgeGuardingPort &&
      hit.attackerPort === recoveringPort &&
      hit.hitFrameIndex >= fromFrameIndex &&
      hit.hitFrameIndex <= toFrameIndex,
  );
}

function sumDamageDealtInWindow(
  hits: readonly ReturnType<typeof extractAllHitsWithDI>[number][],
  recoveringPort: PortIndex,
  edgeGuardingPort: PortIndex,
  fromFrameIndex: number,
  toFrameIndex: number,
): number {
  let total = 0;
  for (const hit of hits) {
    if (
      hit.victimPort === recoveringPort &&
      hit.attackerPort === edgeGuardingPort &&
      hit.hitFrameIndex >= fromFrameIndex &&
      hit.hitFrameIndex <= toFrameIndex
    ) {
      total += hit.damageDealt;
    }
  }
  return total;
}

/**
 * Read-only correlation layer: no new classifier calls (reuses computeRecoveryVerdictSpans, which
 * is memoized per-replay), a cheap ledge-occupancy scan per situation, and a hit-window filter over
 * extractAllHitsWithDI's already-computed results.
 *
 * Memoized per replay (matchView.ts calls this from renderStatsPanel, which re-runs on every
 * perspective-port toggle, not just on load).
 */
const classifiedSituationsCache = new WeakMap<Replay, ClassifiedSituation[]>();

export function computeClassifiedSituations(
  replay: Replay,
): ClassifiedSituation[] {
  const cached = classifiedSituationsCache.get(replay);
  if (cached) return cached;
  const result = computeClassifiedSituationsUncached(replay);
  classifiedSituationsCache.set(replay, result);
  return result;
}

function computeClassifiedSituationsUncached(
  replay: Replay,
): ClassifiedSituation[] {
  const edgeGuardEvents = computeEdgeGuardEvents(replay);
  if (edgeGuardEvents.length === 0) return [];

  const spans = computeRecoveryVerdictSpans(replay);
  const hits = extractAllHitsWithDI(replay);

  const result: ClassifiedSituation[] = [];

  for (let i = 0; i < edgeGuardEvents.length; i++) {
    const entered: EdgeGuardEvent = edgeGuardEvents[i]!;
    if (entered.kind !== "situation-entered") continue;

    const resolution: EdgeGuardEvent | undefined = edgeGuardEvents[i + 1];
    if (
      !resolution ||
      (resolution.kind !== "recovery-success" &&
        resolution.kind !== "recovery-failure")
    )
      continue;

    const {
      recoveringPort,
      edgeGuardingPort,
      frameIndex: enteredFrameIndex,
    } = entered;
    const resolutionFrameIndex = resolution.frameIndex;

    const entrySpan = findSpanInWindow(
      spans,
      recoveringPort,
      "recovery-verdict",
      enteredFrameIndex,
      resolutionFrameIndex,
      false,
      true,
    );
    const jumpSpan = findSpanInWindow(
      spans,
      recoveringPort,
      "jumped-verdict",
      enteredFrameIndex,
      resolutionFrameIndex,
      true,
    );

    const entryVerdict = entrySpan?.verdict ?? null;
    const jumpVerdict = jumpSpan?.verdict ?? null;
    const category = categoryForVerdict(entryVerdict);

    const edgeGuarderHeldLedge = edgeGuarderHeldLedgeInWindow(
      replay,
      edgeGuardingPort,
      enteredFrameIndex,
      resolutionFrameIndex,
    );

    // These two stay keyed off the raw entryVerdict, not the (now broader) `category` -- they only
    // make sense for the narrow "ledge-holding is literally the deciding factor" verdict, not the
    // merged hopeless/contestable split used for scoring (see this file's top doc comment).
    const shouldHaveBeenUnsurvivable =
      category === "hopeless" ||
      (entryVerdict === "dead-if-ledge-occupied" && edgeGuarderHeldLedge);

    const recoveringAtResolution =
      replay.frames[resolutionFrameIndex]?.ports[recoveringPort]?.state;

    const missedLedgeHogOpportunity =
      entryVerdict === "dead-if-ledge-occupied" &&
      !edgeGuarderHeldLedge &&
      resolution.kind === "recovery-success" &&
      recoveringAtResolution !== undefined &&
      LEDGE_ACTION_STATES.has(recoveringAtResolution.actionStateId);

    const edgeGuarderWasHit = edgeGuarderWasHitInWindow(
      hits,
      recoveringPort,
      edgeGuardingPort,
      enteredFrameIndex,
      resolutionFrameIndex,
    );

    // Checks BOTH directions -- per the user (2026-09-11): Falcon can save himself by landing his
    // up-B as a grab on the edge-guarder, which resets his own recovery and gives him another
    // shot, with no error on the edge-guarder's part at all. That's still worth flagging the same
    // way as the edge-guarder accidentally hitting the recoverer: "a hit connected here and this
    // should have been unsurvivable, go take a look" -- the flag was never claiming the
    // edge-guarder caused it, just that a hit is a plausible explanation for the anomaly (see this
    // field's own doc comment).
    const possibleAccidentalSave =
      shouldHaveBeenUnsurvivable &&
      resolution.kind === "recovery-success" &&
      (edgeGuarderWasHit ||
        edgeGuarderLandedHitInWindow(
          hits,
          recoveringPort,
          edgeGuardingPort,
          enteredFrameIndex,
          resolutionFrameIndex,
        ));

    const damageDealtByGuarder = sumDamageDealtInWindow(
      hits,
      recoveringPort,
      edgeGuardingPort,
      enteredFrameIndex,
      resolutionFrameIndex,
    );

    result.push({
      recoveringPort,
      edgeGuardingPort,
      enteredFrameIndex,
      resolutionFrameIndex,
      resolutionKind: resolution.kind,
      entryVerdict,
      jumpVerdict,
      category,
      edgeGuarderHeldLedge,
      missedLedgeHogOpportunity,
      possibleAccidentalSave,
      damageDealtByGuarder,
      edgeGuarderWasHit,
    });
  }

  return result;
}

/**
 * The `enteredFrameIndex`s of every "hopeless" situation -- pass to
 * edgeGuard.ts's computeEdgeGuardStats as `excludeEnteredFrameIndices` so
 * Recovery% excludes situations the classifier confirmed were unsurvivable
 * at entry. Only "hopeless" -- "contestable" isn't trusted enough to exclude
 * anything (see this file's top doc comment) -- see computeEdgeGuardStats'
 * own doc comment too.
 */
export function hopelessEnteredFrameIndices(
  situations: readonly ClassifiedSituation[],
): Set<number> {
  return new Set(
    situations
      .filter((s) => s.category === "hopeless")
      .map((s) => s.enteredFrameIndex),
  );
}

// ---------------------------------------------------------------------------
// Event log entries for the two detectors (phase 3 --
// docs/superpowers/specs/2026-09-10-classifier-aware-recovery-stats.md)
// ---------------------------------------------------------------------------

export type ClassifiedSituationEventKind =
  "missed-ledge-hog" | "possible-accidental-save";

export interface ClassifiedSituationEvent {
  /** Frame number (from `PostFrameUpdate.frame`), at the situation's resolution -- that's the
   * earliest point either flag is actually known to be true. */
  readonly frame: number;
  readonly frameIndex: number;
  readonly kind: ClassifiedSituationEventKind;
  readonly recoveringPort: PortIndex;
  readonly edgeGuardingPort: PortIndex;
}

/**
 * One event per flagged situation from computeClassifiedSituations -- missedLedgeHogOpportunity
 * and possibleAccidentalSave each become a log entry, fired at the situation's resolution frame.
 * A situation can produce at most one of the two (they're mutually exclusive: the first requires
 * category "contestable", the second requires "hopeless" or "contestable"-with-the-ledge-held --
 * see computeClassifiedSituations), so this never double-logs the same situation.
 */
export function computeClassifiedSituationEvents(
  replay: Replay,
): ClassifiedSituationEvent[] {
  const events: ClassifiedSituationEvent[] = [];
  for (const s of computeClassifiedSituations(replay)) {
    const kind: ClassifiedSituationEventKind | null =
      s.missedLedgeHogOpportunity
        ? "missed-ledge-hog"
        : s.possibleAccidentalSave
          ? "possible-accidental-save"
          : null;
    if (kind === null) continue;
    const frame = replay.frames[s.resolutionFrameIndex]?.frame;
    if (frame === undefined) continue;
    events.push({
      frame,
      frameIndex: s.resolutionFrameIndex,
      kind,
      recoveringPort: s.recoveringPort,
      edgeGuardingPort: s.edgeGuardingPort,
    });
  }
  return events;
}

// ---------------------------------------------------------------------------
// Edge Guard Effectiveness score -- per-situation partial credit beyond kill-or-not, per the user
// (2026-09-10/11): "instead of just kills we should try quantifying and scoring how effective it
// was" -- did it deal significant damage even without a kill, did it accidentally save the
// opponent, did it miss a free ledge-hog kill, and of course did it take the stock.
// ---------------------------------------------------------------------------

/** Tiers, per the user directly -- not derived, a deliberate design choice. Kill still worth more
 * than any non-kill outcome; a missed ledge-hog opportunity is worse than doing nothing (0) since
 * it was a free kill left on the table, but not as bad as an accidental save (actively
 * counterproductive). Damage tiers are flat cumulative-damage buckets, not scaled against the
 * recovering player's existing damage -- see damageDealtByGuarder's own doc comment for why. */
export const EDGE_GUARD_EFFECTIVENESS_SCORE = {
  KILL: 100,
  DAMAGE_HIGH: 70, // >= 35% dealt, no kill -- "significant punish"
  DAMAGE_MID: 45, // 17-35% dealt
  DAMAGE_LOW: 20, // 0-17% dealt (roughly one hit)
  NO_DAMAGE: 0,
  MISSED_LEDGE_HOG: -10,
  ACCIDENTAL_SAVE: -50,
  /** Applied on top of whatever the base tier above is (not a replacement) -- but ONLY when the
   * recovering player actually got away (resolutionKind !== "recovery-failure"). Getting clipped
   * on the way to securing the kill anyway doesn't cost anything -- per the user (2026-09-11):
   * "if the player gets hit but also the recovering player dies -> that counts as a KO and
   * doesn't take away points. if the opponent recovers to the stage and also hits them in the
   * process that's -15." A flat one-time penalty, not per-hit -- see edgeGuarderWasHit's own doc
   * comment for why. */
  HIT_BY_RECOVERING_PLAYER: -15,
} as const;

const DAMAGE_HIGH_THRESHOLD = 35;
const DAMAGE_MID_THRESHOLD = 17;

/**
 * Per-situation Edge Guard Effectiveness score (see EDGE_GUARD_EFFECTIVENESS_SCORE). Only "hopeless"
 * situations that resolved NORMALLY (opponent died as expected, no accidental save) are excluded
 * (null) -- nothing was actually being tested, same reasoning as the stats exclusion. A "hopeless"
 * situation only ever produces a score when something anomalous happened (the accidental-save
 * penalty) -- missedLedgeHogOpportunity requires entryVerdict "dead-if-ledge-occupied" by
 * construction (see computeClassifiedSituations), which can never be "hopeless", so that's the
 * only other case to gate here.
 *
 * "unclassified" (no classifier opinion at all -- unsupported character, or no trigger fired) is
 * NOT excluded here, unlike category "unclassified" being excluded from Recovery% -- per the user
 * (2026-09-11): "for unsupported characters, or when NOT_SUPPORTED is returned, let's just assume
 * the answer was STAGE_REACHABLE for scoring purposes." So it flows through the same tiers as
 * "contestable" (which already covers both the narrow ledge-hinges-the-outcome verdict and the
 * former "reaches stage" verdict -- see this file's top doc comment).
 */
export function edgeGuardEffectivenessScore(
  situation: ClassifiedSituation,
): number | null {
  let baseScore: number;
  if (situation.missedLedgeHogOpportunity) {
    baseScore = EDGE_GUARD_EFFECTIVENESS_SCORE.MISSED_LEDGE_HOG;
  } else if (situation.possibleAccidentalSave) {
    baseScore = EDGE_GUARD_EFFECTIVENESS_SCORE.ACCIDENTAL_SAVE;
  } else if (situation.category === "hopeless") {
    return null;
  } else if (situation.resolutionKind === "recovery-failure") {
    baseScore = EDGE_GUARD_EFFECTIVENESS_SCORE.KILL;
  } else if (situation.damageDealtByGuarder >= DAMAGE_HIGH_THRESHOLD) {
    baseScore = EDGE_GUARD_EFFECTIVENESS_SCORE.DAMAGE_HIGH;
  } else if (situation.damageDealtByGuarder >= DAMAGE_MID_THRESHOLD) {
    baseScore = EDGE_GUARD_EFFECTIVENESS_SCORE.DAMAGE_MID;
  } else if (situation.damageDealtByGuarder > 0) {
    baseScore = EDGE_GUARD_EFFECTIVENESS_SCORE.DAMAGE_LOW;
  } else {
    baseScore = EDGE_GUARD_EFFECTIVENESS_SCORE.NO_DAMAGE;
  }

  // Only applies when the recovering player actually got away -- a real kill (resolutionKind
  // "recovery-failure") is the one baseScore that can never reach here already being anything but
  // KILL, but this check also matters for missedLedgeHogOpportunity/possibleAccidentalSave, both
  // of which are ALSO only ever set on a "recovery-success" resolution (see
  // computeClassifiedSituations) -- so this is really just "was there a kill," spelled out
  // directly rather than relied on implicitly.
  const applyHitPenalty =
    situation.edgeGuarderWasHit &&
    situation.resolutionKind !== "recovery-failure";
  return applyHitPenalty
    ? baseScore + EDGE_GUARD_EFFECTIVENESS_SCORE.HIT_BY_RECOVERING_PLAYER
    : baseScore;
}

/**
 * Average Edge Guard Effectiveness over every in-scope situation where `port` was the
 * edge-guarder. null if there were none (not zero -- distinguishes "no scoreable situations
 * happened" from "scored a flat 0 average").
 */
export function averageEdgeGuardEffectiveness(
  situations: readonly ClassifiedSituation[],
  port: PortIndex,
): number | null {
  const scores: number[] = [];
  for (const s of situations) {
    if (s.edgeGuardingPort !== port) continue;
    const score = edgeGuardEffectivenessScore(s);
    if (score !== null) scores.push(score);
  }
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export type EdgeGuardEffectivenessGrade = "S" | "A" | "B" | "C" | "D" | "F";

/**
 * Letter grade for an Edge Guard Effectiveness average, rhythm-game style -- per the user
 * (2026-09-11): "instead of showing a % number for edge guards (it is no longer scored as a %,
 * it's an average of scores ranging from -50 to 100) maybe we could show a letter rating."
 * Boundaries line up with the tier values themselves (EDGE_GUARD_EFFECTIVENESS_SCORE), so a player
 * whose situations land squarely on one tier gets that tier's own letter -- S reserved for a clean
 * 100 (every in-scope situation was a kill, nothing else dragging the average down), F for
 * anything that averages out negative (a real problem happened -- missed ledge-hog, accidental
 * save, or enough "got hit and they still escaped" penalties to tip it under 0).
 */
export function edgeGuardEffectivenessGrade(
  averageScore: number,
): EdgeGuardEffectivenessGrade {
  if (averageScore >= 100) return "S";
  if (averageScore >= 70) return "A";
  if (averageScore >= 45) return "B";
  if (averageScore >= 20) return "C";
  if (averageScore >= 0) return "D";
  return "F";
}
