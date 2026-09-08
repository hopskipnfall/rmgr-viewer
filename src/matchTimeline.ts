import { getSeatedPorts, type PortIndex, type Replay } from "@rmg-k/rmgr";
import {
  computeNeutralHitEvents,
  DEAD_OR_RESPAWNING_STATES,
} from "./neutralHits.js";
import { buildRecoveryMap, buildLedgeMap } from "./ledgeTrap.js";

/**
 * A single frame's match-state relative to `perspectivePort`:
 * - "advantage": perspective just landed a neutral-hit opening it's still
 *   winning, is edge-guarding the opponent, or is ledge-trapping them.
 * - "disadvantage": the mirror image — perspective is on the losing side
 *   of one of those same three situations.
 * - "neutral": neither player is in any of the above, and neither is in a
 *   dead/respawning state.
 * - "other": anything else (e.g. a dead/respawn state without an active
 *   advantage/disadvantage situation, or missing frame data).
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
    if (
      pState &&
      oState &&
      !DEAD_OR_RESPAWNING_STATES.has(pState.actionStateId) &&
      !DEAD_OR_RESPAWNING_STATES.has(oState.actionStateId)
    ) {
      result[i] = "neutral";
    } else {
      result[i] = "other";
    }
  }

  return result;
}
