/**
 * Annotates edgeGuard.ts's recovery/edge-guard situations with the recovery classifier's verdict,
 * splitting them into hopeless/free/contestable/unclassified and detecting two directly-actionable
 * patterns: missed ledge-hog opportunities and possible accidental saves.
 *
 * See docs/superpowers/specs/2026-09-10-classifier-aware-recovery-stats.md for the design this
 * implements (phase 1: the correlation layer + validation, no UI yet).
 */
import type { PortIndex, Replay } from "@rmg-k/rmgr";
import {
  computeEdgeGuardEvents,
  type EdgeGuardEvent,
} from "./edgeGuard.js";
import { extractAllHitsWithDI } from "./di.js";
import { LEDGE_ACTION_STATES } from "./ledgeTrap.js";
import {
  computeRecoveryVerdictSpans,
  type VerdictSpan,
} from "./recoveryVerdicts.js";
import type { RecoveryVerdict } from "./recoveryHeuristics.js";

export type SituationCategory =
  | "hopeless" // entryVerdict === "dead"
  | "free" // entryVerdict === "reaches-stage"
  | "contestable" // entryVerdict === "dead-if-ledge-occupied"
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

  /** category === "contestable", edge-guarder did NOT hold the ledge, and the recovering player
   * survived by being in a ledge-action-state at the resolution frame. The direct "you just
   * needed to hold the ledge" case. */
  readonly missedLedgeHogOpportunity: boolean;

  /** The situation should have been unsurvivable (category "hopeless", or "contestable" with
   * edgeGuarderHeldLedge true), but resolutionKind is "recovery-success" anyway, AND the
   * edge-guarding port landed a hit on the recovering port during the window. Worth a look, not
   * proof of causation -- see the design doc's "Open questions". */
  readonly possibleAccidentalSave: boolean;

  /** Total damage dealt by the edge-guarding port to the recovering port during the situation
   * window (sum of extractAllHitsWithDI's damageDealt for matching hits). Feeds
   * edgeGuardEffectivenessScore's partial-credit tiers for situations that didn't end in a kill.
   * Deliberately NOT "damage percent" in the sense of proximity to a kill -- per the user, damage
   * percent isn't actually a percentage of anything, just a knockback multiplier, so this is a
   * flat cumulative-damage bucket, not scaled against the recovering player's existing damage. */
  readonly damageDealtByGuarder: number;
}

function categoryForVerdict(verdict: RecoveryVerdict | null): SituationCategory {
  switch (verdict) {
    case "dead":
      return "hopeless";
    case "reaches-stage":
      return "free";
    case "dead-if-ledge-occupied":
      return "contestable";
    case "not-implemented":
    case null:
      return "unclassified";
  }
}

/** The first span for `port` within [fromFrameIndex, toFrameIndex] whose kind matches, or null. */
function findSpanInWindow(
  spans: readonly VerdictSpan[],
  port: PortIndex,
  kind: VerdictSpan["kind"],
  fromFrameIndex: number,
  toFrameIndex: number,
  pickLast: boolean,
): VerdictSpan | null {
  let found: VerdictSpan | null = null;
  for (const span of spans) {
    if (span.port !== port || span.kind !== kind) continue;
    if (
      span.verdictFrameIndex < fromFrameIndex ||
      span.verdictFrameIndex > toFrameIndex
    )
      continue;
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

    const { recoveringPort, edgeGuardingPort, frameIndex: enteredFrameIndex } =
      entered;
    const resolutionFrameIndex = resolution.frameIndex;

    const entrySpan = findSpanInWindow(
      spans,
      recoveringPort,
      "recovery-verdict",
      enteredFrameIndex,
      resolutionFrameIndex,
      false,
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

    const shouldHaveBeenUnsurvivable =
      category === "hopeless" ||
      (category === "contestable" && edgeGuarderHeldLedge);

    const recoveringAtResolution =
      replay.frames[resolutionFrameIndex]?.ports[recoveringPort]?.state;

    const missedLedgeHogOpportunity =
      category === "contestable" &&
      !edgeGuarderHeldLedge &&
      resolution.kind === "recovery-success" &&
      recoveringAtResolution !== undefined &&
      LEDGE_ACTION_STATES.has(recoveringAtResolution.actionStateId);

    const possibleAccidentalSave =
      shouldHaveBeenUnsurvivable &&
      resolution.kind === "recovery-success" &&
      edgeGuarderLandedHitInWindow(
        hits,
        recoveringPort,
        edgeGuardingPort,
        enteredFrameIndex,
        resolutionFrameIndex,
      );

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
    });
  }

  return result;
}

/**
 * The `enteredFrameIndex`s of every "hopeless" situation -- pass to
 * edgeGuard.ts's computeEdgeGuardStats as `excludeEnteredFrameIndices` so
 * Recovery%/EdgeGuard% exclude situations the classifier confirmed were
 * unsurvivable at entry. Only "hopeless" -- see computeEdgeGuardStats' own
 * doc comment for why "free" isn't included here.
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
  | "missed-ledge-hog"
  | "possible-accidental-save";

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
    const kind: ClassifiedSituationEventKind | null = s.missedLedgeHogOpportunity
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
} as const;

const DAMAGE_HIGH_THRESHOLD = 35;
const DAMAGE_MID_THRESHOLD = 17;

/**
 * Per-situation Edge Guard Effectiveness score (see EDGE_GUARD_EFFECTIVENESS_SCORE), or null if
 * this situation is out of scope for scoring entirely:
 * - category "free"/"unclassified": never scored -- same "free" isn't trusted for anything
 *   score-affecting boundary as computeEdgeGuardStats' hopeless-exclusion.
 * - category "hopeless" that resolved NORMALLY (opponent died as expected, no accidental save):
 *   also excluded -- nothing was actually being tested, same reasoning as the stats exclusion.
 *   A "hopeless" situation only ever produces a score when something anomalous happened
 *   (the accidental-save penalty) -- missedLedgeHogOpportunity can't occur for "hopeless" by
 *   construction (see computeClassifiedSituations), so this is the only other case to gate here.
 */
export function edgeGuardEffectivenessScore(
  situation: ClassifiedSituation,
): number | null {
  if (situation.category !== "hopeless" && situation.category !== "contestable")
    return null;
  if (situation.missedLedgeHogOpportunity)
    return EDGE_GUARD_EFFECTIVENESS_SCORE.MISSED_LEDGE_HOG;
  if (situation.possibleAccidentalSave)
    return EDGE_GUARD_EFFECTIVENESS_SCORE.ACCIDENTAL_SAVE;
  if (situation.category === "hopeless") return null;
  if (situation.resolutionKind === "recovery-failure")
    return EDGE_GUARD_EFFECTIVENESS_SCORE.KILL;
  if (situation.damageDealtByGuarder >= DAMAGE_HIGH_THRESHOLD)
    return EDGE_GUARD_EFFECTIVENESS_SCORE.DAMAGE_HIGH;
  if (situation.damageDealtByGuarder >= DAMAGE_MID_THRESHOLD)
    return EDGE_GUARD_EFFECTIVENESS_SCORE.DAMAGE_MID;
  if (situation.damageDealtByGuarder > 0)
    return EDGE_GUARD_EFFECTIVENESS_SCORE.DAMAGE_LOW;
  return EDGE_GUARD_EFFECTIVENESS_SCORE.NO_DAMAGE;
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
