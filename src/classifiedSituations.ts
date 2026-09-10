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
