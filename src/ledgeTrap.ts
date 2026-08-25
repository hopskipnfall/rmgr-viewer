import { getSeatedPorts, type PortIndex, type Replay } from "@rmg-k/rmgr";
import { isHitstunState, isOutsideZone } from "./edgeGuard.js";
import { DREAM_LAND_STAGE_ID } from "./stageGeometry.js";

const LEDGE_STATES = new Set([0x054, 0x055, 0x056, 0x059]); // CliffCatch, CliffWait, CliffQuick, CliffSlow
const DEAD_OR_RESPAWNING_STATES = new Set([
  0x000, 0x001, 0x002, 0x003, 0x004, 0x005, 0x007, 0x008, 0x009,
]);
const LEDGE_GETUP_GROUNDED_FRAMES = 30;

export type LedgeTrapEventKind =
  "ledge-getup-entered" | "ledge-getup-success" | "ledge-getup-failure";

export interface LedgeTrapEvent {
  readonly frame: number;
  readonly frameIndex: number;
  readonly kind: LedgeTrapEventKind;
  /** Port on the ledge attempting to get up. */
  readonly ledgePort: PortIndex;
  /** Port on stage attempting to trap/prevent getup. */
  readonly trapPort: PortIndex;
}

export interface LedgeTrapStats {
  ledgeGetupSituations: number;
  ledgeGetupSuccesses: number;
  ledgeTrapSituations: number;
  ledgeTrapSuccesses: number;
}

interface ActiveLedgeSituation {
  readonly ledgePort: PortIndex;
  readonly trapPort: PortIndex;
  readonly enteredFrameIndex: number;
  safeFrameStreak: number;
  hasTouchedGround: boolean;
  readonly ledgeStocksAtEntry: number;
  readonly trapStocksAtEntry: number;
}

/**
 * Builds a fast lookup table indicating which port (if any) is currently in
 * an active offstage recovery situation on each frame.
 */
function buildRecoveryMap(
  replay: Replay,
  portA: PortIndex,
  portB: PortIndex,
): (PortIndex | null)[] {
  const map: (PortIndex | null)[] = new Array(replay.frames.length).fill(null);
  let situation: {
    recoveringPort: PortIndex;
    edgeGuardingPort: PortIndex;
    safeStreak: number;
    hasTouchedGround: boolean;
    recStocks: number;
    egStocks: number;
  } | null = null;

  for (let i = 0; i < replay.frames.length; i++) {
    const frame = replay.frames[i];
    if (!frame) continue;
    const postA = frame.ports[portA]?.post;
    const postB = frame.ports[portB]?.post;
    if (!postA || !postB) continue;

    const aInHitstun = isHitstunState(
      postA.actionStateId,
      postA.hitstunCounter,
    );
    const bInHitstun = isHitstunState(
      postB.actionStateId,
      postB.hitstunCounter,
    );

    if (situation !== null) {
      map[i] = situation.recoveringPort;
      const { recoveringPort, edgeGuardingPort } = situation;
      const recPost = recoveringPort === portA ? postA : postB;
      const egPost = edgeGuardingPort === portA ? postA : postB;
      const recInHitstun = recoveringPort === portA ? aInHitstun : bInHitstun;

      if (recPost.stocksRemaining < situation.recStocks) {
        situation = null;
        continue;
      }
      if (egPost.stocksRemaining < situation.egStocks) {
        situation = null;
        continue;
      }
      if (LEDGE_STATES.has(recPost.actionStateId)) {
        situation = null;
        continue;
      }
      if (recPost.grounded && !recInHitstun) {
        situation.hasTouchedGround = true;
      }
      if (recInHitstun) {
        situation.safeStreak = 0;
      } else if (situation.hasTouchedGround) {
        situation.safeStreak++;
        if (situation.safeStreak >= LEDGE_GETUP_GROUNDED_FRAMES) {
          situation = null;
          continue;
        }
      }
      continue;
    }

    if (
      DEAD_OR_RESPAWNING_STATES.has(postA.actionStateId) ||
      DEAD_OR_RESPAWNING_STATES.has(postB.actionStateId)
    ) {
      continue;
    }

    const aOutside = isOutsideZone(postA.positionX, postA.positionY);
    const bOutside = isOutsideZone(postB.positionX, postB.positionY);

    if (!aOutside && !bOutside) continue;

    let recoveringPort: PortIndex | null = null;
    if (aOutside && !bOutside && !aInHitstun) {
      recoveringPort = portA;
    } else if (bOutside && !aOutside && !bInHitstun) {
      recoveringPort = portB;
    } else if (aOutside && bOutside) {
      if (aInHitstun && !bInHitstun) {
        recoveringPort = portA;
      } else if (bInHitstun && !aInHitstun) {
        recoveringPort = portB;
      } else if (!aInHitstun && !bInHitstun) {
        recoveringPort = portA;
      }
    }

    if (recoveringPort === null) continue;

    const edgeGuardingPort = recoveringPort === portA ? portB : portA;
    const recPost = recoveringPort === portA ? postA : postB;
    const egPost = edgeGuardingPort === portA ? postA : postB;

    situation = {
      recoveringPort,
      edgeGuardingPort,
      safeStreak: 0,
      hasTouchedGround: false,
      recStocks: recPost.stocksRemaining,
      egStocks: egPost.stocksRemaining,
    };
    map[i] = recoveringPort;
  }

  return map;
}

/**
 * Computes all Ledge Getup / Ledge Trap events for a 2-player match.
 *
 * A ledge situation begins when one player is on the ledge and the opponent
 * is not in an active offstage recovery state.
 *
 * Success / Failure conditions:
 * - Failure (for ledge player) / Success (for trapping player): Ledge player loses a stock.
 * - Success (for ledge player) / Failure (for trapping player): Ledge player returns to stage/platform
 *   and remains safe (non-hitstun) for 30 consecutive frames (0.5s), or trapping player loses a stock.
 */
export function computeLedgeTrapEvents(replay: Replay): LedgeTrapEvent[] {
  const events: LedgeTrapEvent[] = [];

  // Only meaningful on Dream Land, 2-player matches.
  if (replay.gameStart.stageId !== DREAM_LAND_STAGE_ID) return events;
  const seated = getSeatedPorts(replay);
  if (seated.length !== 2) return events;

  const [portA, portB] = seated as [PortIndex, PortIndex];
  const recoveryMap = buildRecoveryMap(replay, portA, portB);

  let situation: ActiveLedgeSituation | null = null;

  for (let i = 0; i < replay.frames.length; i++) {
    const frame = replay.frames[i];
    if (!frame) continue;
    const postA = frame.ports[portA]?.post;
    const postB = frame.ports[portB]?.post;
    if (!postA || !postB) continue;

    const frameNumber = frame.frame;
    const aInHitstun = isHitstunState(
      postA.actionStateId,
      postA.hitstunCounter,
    );
    const bInHitstun = isHitstunState(
      postB.actionStateId,
      postB.hitstunCounter,
    );

    if (situation !== null) {
      const { ledgePort, trapPort } = situation;
      const ledgePost = ledgePort === portA ? postA : postB;
      const trapPost = trapPort === portA ? postA : postB;
      const ledgeInHitstun = ledgePort === portA ? aInHitstun : bInHitstun;

      // Stock loss by ledge player -> failure
      if (ledgePost.stocksRemaining < situation.ledgeStocksAtEntry) {
        events.push({
          frame: frameNumber,
          frameIndex: i,
          kind: "ledge-getup-failure",
          ledgePort,
          trapPort,
        });
        situation = null;
        continue;
      }

      // Stock loss by trapping player -> success
      if (trapPost.stocksRemaining < situation.trapStocksAtEntry) {
        events.push({
          frame: frameNumber,
          frameIndex: i,
          kind: "ledge-getup-success",
          ledgePort,
          trapPort,
        });
        situation = null;
        continue;
      }

      if (ledgePost.grounded && !ledgeInHitstun) {
        situation.hasTouchedGround = true;
      }

      if (ledgeInHitstun) {
        situation.safeFrameStreak = 0;
      } else if (situation.hasTouchedGround) {
        situation.safeFrameStreak++;
        if (situation.safeFrameStreak >= LEDGE_GETUP_GROUNDED_FRAMES) {
          events.push({
            frame: frameNumber,
            frameIndex: i,
            kind: "ledge-getup-success",
            ledgePort,
            trapPort,
          });
          situation = null;
          continue;
        }
      }
      continue;
    }

    if (
      DEAD_OR_RESPAWNING_STATES.has(postA.actionStateId) ||
      DEAD_OR_RESPAWNING_STATES.has(postB.actionStateId)
    ) {
      continue;
    }

    const aOnLedge = LEDGE_STATES.has(postA.actionStateId);
    const bOnLedge = LEDGE_STATES.has(postB.actionStateId);

    if (!aOnLedge && !bOnLedge) continue;

    let ledgePort: PortIndex | null = null;
    if (aOnLedge && !bOnLedge) {
      if (recoveryMap[i] !== portB) {
        ledgePort = portA;
      }
    } else if (bOnLedge && !aOnLedge) {
      if (recoveryMap[i] !== portA) {
        ledgePort = portB;
      }
    }

    if (ledgePort === null) continue;

    const trapPort = ledgePort === portA ? portB : portA;
    const ledgePost = ledgePort === portA ? postA : postB;
    const trapPost = trapPort === portA ? postA : postB;

    situation = {
      ledgePort,
      trapPort,
      enteredFrameIndex: i,
      safeFrameStreak: 0,
      hasTouchedGround: false,
      ledgeStocksAtEntry: ledgePost.stocksRemaining,
      trapStocksAtEntry: trapPost.stocksRemaining,
    };

    events.push({
      frame: frameNumber,
      frameIndex: i,
      kind: "ledge-getup-entered",
      ledgePort,
      trapPort,
    });
  }

  if (situation !== null && replay.isComplete) {
    const lastFrame = replay.frames[replay.frames.length - 1];
    if (lastFrame) {
      events.push({
        frame: lastFrame.frame,
        frameIndex: replay.frames.length - 1,
        kind: "ledge-getup-failure",
        ledgePort: situation.ledgePort,
        trapPort: situation.trapPort,
      });
    }
  }

  return events;
}

/**
 * Computes Ledge Getup and Ledge Trap aggregate statistics from the perspective
 * of `port`.
 */
export function computeLedgeTrapStats(
  events: readonly LedgeTrapEvent[],
  port: PortIndex,
): LedgeTrapStats {
  let ledgeGetupSituations = 0;
  let ledgeGetupSuccesses = 0;
  let ledgeTrapSituations = 0;
  let ledgeTrapSuccesses = 0;

  for (const ev of events) {
    if (ev.kind === "ledge-getup-entered") {
      if (ev.ledgePort === port) {
        ledgeGetupSituations++;
      } else if (ev.trapPort === port) {
        ledgeTrapSituations++;
      }
    } else if (ev.kind === "ledge-getup-success") {
      if (ev.ledgePort === port) {
        ledgeGetupSuccesses++;
      }
    } else if (ev.kind === "ledge-getup-failure") {
      if (ev.trapPort === port) {
        ledgeTrapSuccesses++;
      }
    }
  }

  return {
    ledgeGetupSituations,
    ledgeGetupSuccesses,
    ledgeTrapSituations,
    ledgeTrapSuccesses,
  };
}
