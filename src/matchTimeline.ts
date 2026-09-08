import { getSeatedPorts, type PortIndex, type Replay } from "@rmg-k/rmgr";
import { computeNeutralHitEvents } from "./neutralHits.js";
import { buildRecoveryMap, buildLedgeMap } from "./ledgeTrap.js";

/**
 * A single frame's match-state relative to `perspectivePort`:
 * - "advantage": perspective just landed a neutral-hit opening it's still
 *   winning, is edge-guarding the opponent, or is ledge-trapping them.
 * - "disadvantage": the mirror image — perspective is on the losing side
 *   of one of those same three situations.
 * - "neutral": neither player is in any of the above - including a
 *   dead/respawning state with no active advantage/disadvantage situation
 *   (e.g. riding the spawn platform), since that's brief enough not to
 *   warrant its own color.
 * - "other": frame data missing for one of the two ports.
 */
export type FrameClassification =
  "neutral" | "advantage" | "disadvantage" | "other";

/**
 * Classifies every frame of `replay` from `perspectivePort`'s point of
 * view. Returns one classification per `replay.frames` index. Empty for
 * any replay that isn't exactly 1v1.
 */
export function classifyMatchFrames(
  replay: Replay,
  perspectivePort: PortIndex,
  opponentPort: PortIndex,
): FrameClassification[] {
  if (getSeatedPorts(replay).length !== 2) {
    return [];
  }

  const exchangeAttacker = new Map<number, PortIndex>();
  for (const ev of computeNeutralHitEvents(replay)) {
    const start = ev.frameIndex;
    const end = ev.endFrameIndex ?? ev.frameIndex;
    for (let i = start; i <= end; i++) {
      exchangeAttacker.set(i, ev.attackerPort);
    }
  }

  const recoveryMap = buildRecoveryMap(replay, perspectivePort, opponentPort);
  const ledgeMap = buildLedgeMap(replay);

  const result: FrameClassification[] = new Array(replay.frames.length);

  for (let i = 0; i < replay.frames.length; i++) {
    const attacker = exchangeAttacker.get(i);
    if (attacker !== undefined) {
      result[i] = attacker === perspectivePort ? "advantage" : "disadvantage";
      continue;
    }

    const recoveringPort = recoveryMap[i];
    if (recoveringPort !== null && recoveringPort !== undefined) {
      result[i] =
        recoveringPort === perspectivePort ? "disadvantage" : "advantage";
      continue;
    }

    const ledgePort = ledgeMap[i];
    if (ledgePort !== null && ledgePort !== undefined) {
      result[i] = ledgePort === perspectivePort ? "disadvantage" : "advantage";
      continue;
    }

    const frame = replay.frames[i];
    const pState = frame?.ports[perspectivePort]?.state;
    const oState = frame?.ports[opponentPort]?.state;
    result[i] = pState && oState ? "neutral" : "other";
  }

  return result;
}

/** A frame at which one side lost a stock, for the timeline's vertical stock-loss markers. */
export interface StockLossMarker {
  readonly frameIndex: number;
  readonly side: "perspective" | "opponent";
}

/**
 * Finds every frame at which `perspectivePort` or `opponentPort`'s
 * `stocksRemaining` decreased from the previous frame it had data for.
 * Empty for any replay that isn't exactly 1v1.
 */
export function findStockLossFrames(
  replay: Replay,
  perspectivePort: PortIndex,
  opponentPort: PortIndex,
): StockLossMarker[] {
  if (getSeatedPorts(replay).length !== 2) {
    return [];
  }

  const markers: StockLossMarker[] = [];
  let prevPerspectiveStocks: number | undefined;
  let prevOpponentStocks: number | undefined;

  for (let i = 0; i < replay.frames.length; i++) {
    const frame = replay.frames[i];
    const pStocks = frame?.ports[perspectivePort]?.state?.stocksRemaining;
    const oStocks = frame?.ports[opponentPort]?.state?.stocksRemaining;

    if (pStocks !== undefined) {
      if (
        prevPerspectiveStocks !== undefined &&
        pStocks < prevPerspectiveStocks
      ) {
        markers.push({ frameIndex: i, side: "perspective" });
      }
      prevPerspectiveStocks = pStocks;
    }

    if (oStocks !== undefined) {
      if (prevOpponentStocks !== undefined && oStocks < prevOpponentStocks) {
        markers.push({ frameIndex: i, side: "opponent" });
      }
      prevOpponentStocks = oStocks;
    }
  }

  return markers;
}
