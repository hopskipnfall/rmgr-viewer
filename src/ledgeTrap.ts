import { getSeatedPorts, type PortIndex, type Replay } from "@rmg-k/rmgr";
import { isHitstunState, isOutsideZone } from "./edgeGuard.js";
import { DREAM_LAND_STAGE_ID } from "./stageGeometry.js";

/** Ledge catch/wait states that initiate a ledge situation. */
const LEDGE_GRAB_STATES = new Set([0x054, 0x055]); // CliffCatch, CliffWait

/**
 * All ledge action animation states in Smash 64 (both <100% and >=100% versions
 * of climb, attack, and roll). The character is not actionable while in these states.
 */
export const LEDGE_ACTION_STATES = new Set([
  0x054, // CliffCatch
  0x055, // CliffWait
  0x056, // CliffQuick (Climb 1 <100%)
  0x057, // CliffClimbQuick2
  0x058, // CliffClimbQuick3
  0x059, // CliffSlow (Climb 1 >=100%)
  0x05a, // CliffClimbSlow2
  0x05b, // CliffClimbSlow3
  0x05c, // CliffAttackQuick (Attack 1 <100%)
  0x05d, // CliffAttackQuick2
  0x05e, // CliffAttackSlow (Attack 1 >=100%)
  0x05f, // CliffAttackSlow2
  0x060, // CliffEscapeQuick (Roll 1 <100%)
  0x061, // CliffEscapeQuick2
  0x062, // CliffEscapeSlow (Roll 1 >=100%)
  0x063, // CliffEscapeSlow2
]);

/** Action states where the player is captured/held/thrown by a grab. */
const CAPTURE_STATES = new Set([
  0x0ab, // CapturePull
  0x0ac, // CaptureWait
  0x0ad, // CaptureDamage
  0x0b3, // CaptureFalconDive
  0x0b6, // CaptureCargo
  0x0b9, // CapturePulled
  0x0ba, // DamageThrown / Thrown
  0x0bb,
]);

const DEAD_OR_RESPAWNING_STATES = new Set([
  0x000, 0x001, 0x002, 0x003, 0x004, 0x005, 0x007, 0x008, 0x009,
]);

/** Number of consecutive safe grounded frames required on stage to count as a successful getup. */
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
  /** Damage percent of the ledge player when entering the situation. */
  readonly damageAtEntry: number;
  /** True if damage < 100% at entry. */
  readonly isUnder100: boolean;
}

export interface LedgeTrapStats {
  ledgeGetupSituations: number;
  ledgeGetupSuccesses: number;
  ledgeGetupUnder100Situations: number;
  ledgeGetupUnder100Successes: number;
  ledgeGetupOver100Situations: number;
  ledgeGetupOver100Successes: number;

  ledgeTrapSituations: number;
  ledgeTrapSuccesses: number;
  ledgeTrapUnder100Situations: number;
  ledgeTrapUnder100Successes: number;
  ledgeTrapOver100Situations: number;
  ledgeTrapOver100Successes: number;
}

interface ActiveLedgeSituation {
  readonly ledgePort: PortIndex;
  readonly trapPort: PortIndex;
  readonly enteredFrameIndex: number;
  readonly damageAtEntry: number;
  readonly isUnder100: boolean;
  safeFrameStreak: number;
  readonly ledgeStocksAtEntry: number;
  readonly trapStocksAtEntry: number;
}

/**
 * Builds a fast lookup table indicating which port (if any) is currently in
 * an active offstage recovery situation on each frame.
 */
export function buildRecoveryMap(
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
      if (LEDGE_ACTION_STATES.has(recPost.actionStateId)) {
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
 * A ledge situation begins when one player grabs the ledge and the opponent
 * is not in an active offstage recovery state.
 *
 * Success / Failure conditions:
 * - Failure (for ledge player) / Success (for trapping player):
 *   - Ledge player loses a stock, OR
 *   - Ledge player is put into an offstage recovery situation (knocked offstage in hitstun/capture or below stage level).
 * - Success (for ledge player) / Failure (for trapping player):
 *   - Ledge player safely exits all ledge animation states onto stage and remains safe (non-hitstun, non-capture) for 30 consecutive grounded frames, OR
 *   - Trapping player loses a stock.
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
      const { ledgePort, trapPort, damageAtEntry, isUnder100 } = situation;
      const ledgePost = ledgePort === portA ? postA : postB;
      const trapPost = trapPort === portA ? postA : postB;
      const ledgeInHitstun = ledgePort === portA ? aInHitstun : bInHitstun;
      const ledgeInCapture = CAPTURE_STATES.has(ledgePost.actionStateId);
      const ledgeInLedgeAction = LEDGE_ACTION_STATES.has(
        ledgePost.actionStateId,
      );

      // 1. Stock loss by ledge player -> failure
      if (ledgePost.stocksRemaining < situation.ledgeStocksAtEntry) {
        events.push({
          frame: frameNumber,
          frameIndex: i,
          kind: "ledge-getup-failure",
          ledgePort,
          trapPort,
          damageAtEntry,
          isUnder100,
        });
        situation = null;
        continue;
      }

      // 2. Stock loss by trapping player -> success
      if (trapPost.stocksRemaining < situation.trapStocksAtEntry) {
        events.push({
          frame: frameNumber,
          frameIndex: i,
          kind: "ledge-getup-success",
          ledgePort,
          trapPort,
          damageAtEntry,
          isUnder100,
        });
        situation = null;
        continue;
      }

      // 3. Ledge player knocked offstage into a recovery situation -> failure
      if (
        !ledgeInLedgeAction &&
        isOutsideZone(ledgePost.positionX, ledgePost.positionY) &&
        (ledgeInHitstun || ledgeInCapture || ledgePost.positionY < -200)
      ) {
        events.push({
          frame: frameNumber,
          frameIndex: i,
          kind: "ledge-getup-failure",
          ledgePort,
          trapPort,
          damageAtEntry,
          isUnder100,
        });
        situation = null;
        continue;
      }

      // 4. Safe ground frames on stage (must be outside of ledge action states)
      if (!ledgeInLedgeAction && !ledgeInHitstun && !ledgeInCapture) {
        if (ledgePost.grounded) {
          situation.safeFrameStreak++;
          if (situation.safeFrameStreak >= LEDGE_GETUP_GROUNDED_FRAMES) {
            events.push({
              frame: frameNumber,
              frameIndex: i,
              kind: "ledge-getup-success",
              ledgePort,
              trapPort,
              damageAtEntry,
              isUnder100,
            });
            situation = null;
            continue;
          }
        } else {
          situation.safeFrameStreak = 0;
        }
      } else {
        situation.safeFrameStreak = 0;
      }
      continue;
    }

    if (
      DEAD_OR_RESPAWNING_STATES.has(postA.actionStateId) ||
      DEAD_OR_RESPAWNING_STATES.has(postB.actionStateId)
    ) {
      continue;
    }

    const aOnLedge = LEDGE_GRAB_STATES.has(postA.actionStateId);
    const bOnLedge = LEDGE_GRAB_STATES.has(postB.actionStateId);

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

    const damageAtEntry = ledgePost.damagePercent;
    const isUnder100 = damageAtEntry < 100;

    situation = {
      ledgePort,
      trapPort,
      enteredFrameIndex: i,
      damageAtEntry,
      isUnder100,
      safeFrameStreak: 0,
      ledgeStocksAtEntry: ledgePost.stocksRemaining,
      trapStocksAtEntry: trapPost.stocksRemaining,
    };

    events.push({
      frame: frameNumber,
      frameIndex: i,
      kind: "ledge-getup-entered",
      ledgePort,
      trapPort,
      damageAtEntry,
      isUnder100,
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
        damageAtEntry: situation.damageAtEntry,
        isUnder100: situation.isUnder100,
      });
    }
  }

  return events;
}

/**
 * Builds a fast lookup table indicating which port (if any) is currently in
 * an active ledge getup situation on each frame.
 */
export function buildLedgeMap(replay: Replay): (PortIndex | null)[] {
  const map: (PortIndex | null)[] = new Array(replay.frames.length).fill(null);
  const events = computeLedgeTrapEvents(replay);
  let activePort: PortIndex | null = null;
  let eventIdx = 0;

  for (let i = 0; i < replay.frames.length; i++) {
    while (eventIdx < events.length && events[eventIdx]!.frameIndex === i) {
      const ev = events[eventIdx]!;
      if (ev.kind === "ledge-getup-entered") {
        activePort = ev.ledgePort;
      } else {
        map[i] = activePort;
        activePort = null;
      }
      eventIdx++;
    }
    if (activePort !== null) {
      map[i] = activePort;
    }
  }
  return map;
}

/**
 * Computes Ledge Getup and Ledge Trap aggregate statistics from the perspective
 * of `port`, including breakdown by damage <100% and >=100%.
 */
export function computeLedgeTrapStats(
  events: readonly LedgeTrapEvent[],
  port: PortIndex,
): LedgeTrapStats {
  let ledgeGetupSituations = 0;
  let ledgeGetupSuccesses = 0;
  let ledgeGetupUnder100Situations = 0;
  let ledgeGetupUnder100Successes = 0;
  let ledgeGetupOver100Situations = 0;
  let ledgeGetupOver100Successes = 0;

  let ledgeTrapSituations = 0;
  let ledgeTrapSuccesses = 0;
  let ledgeTrapUnder100Situations = 0;
  let ledgeTrapUnder100Successes = 0;
  let ledgeTrapOver100Situations = 0;
  let ledgeTrapOver100Successes = 0;

  for (const ev of events) {
    if (ev.kind === "ledge-getup-entered") {
      if (ev.ledgePort === port) {
        ledgeGetupSituations++;
        if (ev.isUnder100) {
          ledgeGetupUnder100Situations++;
        } else {
          ledgeGetupOver100Situations++;
        }
      } else if (ev.trapPort === port) {
        ledgeTrapSituations++;
        if (ev.isUnder100) {
          ledgeTrapUnder100Situations++;
        } else {
          ledgeTrapOver100Situations++;
        }
      }
    } else if (ev.kind === "ledge-getup-success") {
      if (ev.ledgePort === port) {
        ledgeGetupSuccesses++;
        if (ev.isUnder100) {
          ledgeGetupUnder100Successes++;
        } else {
          ledgeGetupOver100Successes++;
        }
      }
    } else if (ev.kind === "ledge-getup-failure") {
      if (ev.trapPort === port) {
        ledgeTrapSuccesses++;
        if (ev.isUnder100) {
          ledgeTrapUnder100Successes++;
        } else {
          ledgeTrapOver100Successes++;
        }
      }
    }
  }

  return {
    ledgeGetupSituations,
    ledgeGetupSuccesses,
    ledgeGetupUnder100Situations,
    ledgeGetupUnder100Successes,
    ledgeGetupOver100Situations,
    ledgeGetupOver100Successes,

    ledgeTrapSituations,
    ledgeTrapSuccesses,
    ledgeTrapUnder100Situations,
    ledgeTrapUnder100Successes,
    ledgeTrapOver100Situations,
    ledgeTrapOver100Successes,
  };
}
