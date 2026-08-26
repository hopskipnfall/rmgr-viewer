import { getSeatedPorts, type PortIndex, type Replay } from "@rmg-k/rmgr";
import { buildRecoveryMap, buildLedgeMap } from "./ledgeTrap.js";

const PORTS: readonly PortIndex[] = [0, 1, 2, 3];

/** Action states where the player is captured/held/thrown by a grab. */
const CAPTURE_STATES = new Set([
  0x0ab, // CapturePulled
  0x0ac, // CaptureWait
  0x0ad, // CaptureDamage
  0x0ae,
  0x0af,
  0x0b0, // Yoshi egg lay capture
  0x0b1,
  0x0b2,
  0x0b3, // CaptureFalconDive (Captain Falcon & J Falcon Up-B grab)
  0x0b4,
  0x0b5,
  0x0b6, // CaptureCargo / CommandGrabHold
  0x0b7,
  0x0b8,
  0x0b9, // CapturePulled / ThrowTransition
  0x0ba, // DamageThrown / Thrown
  0x0bb,
  0x0bc,
]);

/**
 * For each seated port, how many neutral hits (fresh combos or grabs) that
 * port has taken in its *current* stock, indexed the same way as `replay.frames`
 * (so `result[port][frameIndex]` matches `replay.frames[frameIndex]`). Resets
 * to 0 starting the frame after `stocksRemaining` drops.
 *
 * Excludes hits landed while the victim is in an active recovery situation or
 * ledge getup situation.
 */
export function computeNeutralHitsPerStock(
  replay: Replay,
): Partial<Record<PortIndex, readonly number[]>> {
  const result: Partial<Record<PortIndex, number[]>> = {};
  const seated = getSeatedPorts(replay);
  const recoveryMap =
    seated.length === 2
      ? buildRecoveryMap(replay, seated[0]!, seated[1]!)
      : null;
  const ledgeMap = seated.length === 2 ? buildLedgeMap(replay) : null;

  for (const port of PORTS) {
    const values: number[] = new Array(replay.frames.length).fill(0);
    let neutralHits = 0;
    let lastComboHitCount: number | undefined;
    let lastStocksRemaining: number | undefined;
    let lastInCapture = false;

    for (let i = 0; i < replay.frames.length; i++) {
      const post = replay.frames[i]?.ports[port]?.post;
      if (!post) {
        values[i] = neutralHits;
        continue;
      }

      const inCapture = CAPTURE_STATES.has(post.actionStateId);
      const isFreshAttackHit =
        lastComboHitCount !== undefined
          ? lastComboHitCount === 0 && post.comboHitCount > 0 && !lastInCapture
          : post.comboHitCount > 0;
      const isFreshGrab = inCapture && !lastInCapture;

      const isDisadvantage =
        (recoveryMap !== null && recoveryMap[i] === port) ||
        (ledgeMap !== null && ledgeMap[i] === port);

      if ((isFreshAttackHit || isFreshGrab) && !isDisadvantage) {
        neutralHits++;
      }

      values[i] = neutralHits;

      const stockLost =
        lastStocksRemaining !== undefined &&
        post.stocksRemaining < lastStocksRemaining;
      if (stockLost) {
        neutralHits = 0; // takes effect starting the next frame
      }

      lastComboHitCount = post.comboHitCount;
      lastStocksRemaining = post.stocksRemaining;
      lastInCapture = inCapture;
    }

    result[port] = values;
  }

  return result;
}

export type NeutralOpeningReason =
  "landing-lag" | "whiff-punish" | "jump-punish" | "standing-hit" | "unknown";

export interface NeutralHitEvent {
  readonly frame: number;
  readonly frameIndex: number;
  readonly kind: "neutral-hit";
  readonly attackerPort: PortIndex;
  readonly victimPort: PortIndex;
  readonly hitType: "attack" | "grab";
  readonly reason: NeutralOpeningReason;
  readonly reasonDetail?: string;
}

/** Action states corresponding to landing lag. */
const LANDING_LAG_STATES = new Set([
  0x01f, // LandingLight
  0x020, // LandingHeavy
  0x03b, // LandingSpecial
  0x0db, // LandingAirX
]);

/** Action states for jump squats and jumps. */
const JUMP_STATES = new Set([
  0x014, // JumpSquat
  0x015, // ShieldJumpSquat
  0x016, // JumpF
  0x017, // JumpB
  0x018, // JumpAerialF
  0x019, // JumpAerialB
]);

/** Action states corresponding to airborne states. */
const AIRBORNE_STATES = new Set([
  0x016, // JumpF
  0x017, // JumpB
  0x018, // JumpAerialF
  0x019, // JumpAerialB
  0x01a, // Fall
  0x01b, // FallAerial
  0x021, // Pass
  0x022, // ShieldDrop
  0x02e, // DamageAir1
  0x02f, // DamageAir2
  0x030, // DamageAir3
  0x038, // WallBounce
  0x039, // Tumble
  0x03a, // FallSpecial
  0x0d1, // Nair
  0x0d2, // Fair
  0x0d3, // Bair
  0x0d4, // Uair
  0x0d5, // Dair
]);

/** Check if an action state is an attack (jab, tilt, smash, aerial, grab, special). */
export function isAttackActionState(actionStateId: number): boolean {
  // Standard ground/aerial attacks
  if (actionStateId >= 0x0be && actionStateId <= 0x0d5) return true;
  // Grabs
  if (actionStateId >= 0x0a6 && actionStateId <= 0x0a8) return true;
  // Special moves
  if (actionStateId >= 0x0dc) return true;
  return false;
}

/** Check if an action state is a landing lag state. */
export function isLandingLagActionState(actionStateId: number): boolean {
  return LANDING_LAG_STATES.has(actionStateId);
}

/** Check if an action state is a jump state. */
export function isJumpActionState(actionStateId: number): boolean {
  return JUMP_STATES.has(actionStateId);
}

/** Check if an action state is an airborne state. */
export function isAirborneActionState(actionStateId: number): boolean {
  return AIRBORNE_STATES.has(actionStateId);
}

/**
 * Classifies why a neutral opening occurred on `victimPort` at `hitFrameIndex`.
 * Evaluated strictly in order:
 * 1. Landing lag (attacked/grabbed while in landing lag state)
 * 2. Whiff punish (attacked within 0.5s = 30F of an attack ending without hitting)
 * 3. Jump interception (jumped without attacking and attacked within 0.5s = 30F)
 * 4. Standing hit (attacked while grounded in neutral)
 * 5. Unknown (fallback)
 */
export function classifyNeutralOpening(
  replay: Replay,
  hitFrameIndex: number,
  victimPort: PortIndex,
  attackerPort: PortIndex,
): { reason: NeutralOpeningReason; reasonDetail?: string } {
  const victimPrevPost =
    replay.frames[hitFrameIndex - 1]?.ports[victimPort]?.post;
  if (!victimPrevPost) return { reason: "unknown" };

  // Rule 1: Attacked/grabbed immediately after landing (while in a landing lag state)
  // Check the victim's state immediately prior to hit impact (up to 3 frames back)
  for (let k = 1; k <= 3; k++) {
    const f = hitFrameIndex - k;
    if (f < 0) break;
    const post = replay.frames[f]?.ports[victimPort]?.post;
    if (post && isLandingLagActionState(post.actionStateId)) {
      return {
        reason: "landing-lag",
        reasonDetail: "Attacked/grabbed in landing lag",
      };
    }
  }

  // Rule 2: Attacked immediately after attacking and missing (within 0.5s = 30 frames of attack ending)
  let foundAttackEnd = -1;
  let attackHadHit = false;

  for (let k = 1; k <= 45; k++) {
    const f = hitFrameIndex - k;
    if (f < 0) break;
    const post = replay.frames[f]?.ports[victimPort]?.post;
    if (!post) continue;

    if (isAttackActionState(post.actionStateId)) {
      if (foundAttackEnd === -1) {
        foundAttackEnd = f + 1;
      }
      const attackerPost = replay.frames[f]?.ports[attackerPort]?.post;
      if (attackerPost && attackerPost.comboHitCount > 0) {
        attackHadHit = true;
      }
    } else if (foundAttackEnd !== -1) {
      break;
    }
  }

  if (foundAttackEnd !== -1 && !attackHadHit) {
    const framesSinceAttack = hitFrameIndex - foundAttackEnd;
    if (framesSinceAttack <= 30) {
      return {
        reason: "whiff-punish",
        reasonDetail: `Attacked within ${(framesSinceAttack / 60).toFixed(2)}s of missed attack`,
      };
    }
  }

  // Rule 3: Jumped from ground or platform (without using an attack) and attacked within 0.5s (30 frames)
  let foundJumpStart = -1;
  let usedAttackDuringJump = false;

  for (let k = 1; k <= 45; k++) {
    const f = hitFrameIndex - k;
    if (f < 0) break;
    const post = replay.frames[f]?.ports[victimPort]?.post;
    if (!post) continue;

    if (isAttackActionState(post.actionStateId)) {
      usedAttackDuringJump = true;
    }

    if (isJumpActionState(post.actionStateId)) {
      foundJumpStart = f;
    } else if (foundJumpStart !== -1) {
      break;
    }
  }

  if (foundJumpStart !== -1 && !usedAttackDuringJump) {
    const framesSinceJump = hitFrameIndex - foundJumpStart;
    if (framesSinceJump <= 30) {
      return {
        reason: "jump-punish",
        reasonDetail: `Attacked within ${(framesSinceJump / 60).toFixed(2)}s of jumping without attacking`,
      };
    }
  }

  // Rule 4: Got hit with an attack while standing / grounded neutral
  if (!isAirborneActionState(victimPrevPost.actionStateId)) {
    return {
      reason: "standing-hit",
      reasonDetail: "Hit while grounded in neutral",
    };
  }

  return {
    reason: "unknown",
  };
}

/**
 * Computes all neutral hit and grab events in chronological order,
 * excluding hits that occur during recovery or ledge getup situations.
 */
export function computeNeutralHitEvents(replay: Replay): NeutralHitEvent[] {
  const events: NeutralHitEvent[] = [];
  const seated = getSeatedPorts(replay);
  if (seated.length !== 2) return events;

  const [portA, portB] = seated as [PortIndex, PortIndex];
  const recoveryMap = buildRecoveryMap(replay, portA, portB);
  const ledgeMap = buildLedgeMap(replay);

  let lastACombo: number | undefined;
  let lastBCombo: number | undefined;
  let lastAInCapture = false;
  let lastBInCapture = false;

  for (let i = 0; i < replay.frames.length; i++) {
    const frame = replay.frames[i];
    if (!frame) continue;
    const postA = frame.ports[portA]?.post;
    const postB = frame.ports[portB]?.post;
    if (!postA || !postB) continue;

    const frameNumber = frame.frame;
    const aInCapture = CAPTURE_STATES.has(postA.actionStateId);
    const bInCapture = CAPTURE_STATES.has(postB.actionStateId);

    const bInDisadvantage = recoveryMap[i] === portB || ledgeMap[i] === portB;
    const aInDisadvantage = recoveryMap[i] === portA || ledgeMap[i] === portA;

    // Check if A hit/grabbed B
    const aHitB =
      (lastBCombo === 0 || lastBCombo === undefined) &&
      postB.comboHitCount > 0 &&
      !lastBInCapture;
    const aGrabbedB = bInCapture && !lastBInCapture;

    if ((aHitB || aGrabbedB) && !bInDisadvantage) {
      const { reason, reasonDetail } = classifyNeutralOpening(
        replay,
        i,
        portB,
        portA,
      );
      events.push({
        frame: frameNumber,
        frameIndex: i,
        kind: "neutral-hit",
        attackerPort: portA,
        victimPort: portB,
        hitType: aGrabbedB ? "grab" : "attack",
        reason,
        reasonDetail,
      });
    }

    // Check if B hit/grabbed A
    const bHitA =
      (lastACombo === 0 || lastACombo === undefined) &&
      postA.comboHitCount > 0 &&
      !lastAInCapture;
    const bGrabbedA = aInCapture && !lastAInCapture;

    if ((bHitA || bGrabbedA) && !aInDisadvantage) {
      const { reason, reasonDetail } = classifyNeutralOpening(
        replay,
        i,
        portA,
        portB,
      );
      events.push({
        frame: frameNumber,
        frameIndex: i,
        kind: "neutral-hit",
        attackerPort: portB,
        victimPort: portA,
        hitType: bGrabbedA ? "grab" : "attack",
        reason,
        reasonDetail,
      });
    }

    lastACombo = postA.comboHitCount;
    lastBCombo = postB.comboHitCount;
    lastAInCapture = aInCapture;
    lastBInCapture = bInCapture;
  }

  return events;
}

export interface NeutralHitsStats {
  /** Total completed stocks taken from opponent(s). */
  stocksTaken: number;
  /** Total neutral hits landed across all taken stocks. */
  totalHitsLanded: number;
  /** Average number of neutral hits per stock taken, or null if no stocks taken. */
  averageHitsPerStock: number | null;
}

/**
 * Computes the average number of neutral hits landed by `attackerPort`
 * before taking each stock from opponent(s). Grabs are counted as hits.
 * Excludes hits landed during recovery or ledge getups.
 */
export function computeNeutralHitsStats(
  replay: Replay,
  attackerPort: PortIndex,
): NeutralHitsStats {
  const seated = getSeatedPorts(replay);
  const opponents = seated.filter((p) => p !== attackerPort);
  if (opponents.length === 0) {
    return { stocksTaken: 0, totalHitsLanded: 0, averageHitsPerStock: null };
  }

  const recoveryMap =
    seated.length === 2
      ? buildRecoveryMap(replay, seated[0]!, seated[1]!)
      : null;
  const ledgeMap = seated.length === 2 ? buildLedgeMap(replay) : null;

  const hitsPerStockTaken: number[] = [];

  for (const victimPort of opponents) {
    let currentStockHits = 0;
    let lastComboHitCount: number | undefined;
    let lastStocksRemaining: number | undefined;
    let lastInCapture = false;

    for (let i = 0; i < replay.frames.length; i++) {
      const post = replay.frames[i]?.ports[victimPort]?.post;
      if (!post) continue;

      const inCapture = CAPTURE_STATES.has(post.actionStateId);
      const isFreshAttackHit =
        lastComboHitCount !== undefined
          ? lastComboHitCount === 0 && post.comboHitCount > 0 && !lastInCapture
          : post.comboHitCount > 0;
      const isFreshGrab = inCapture && !lastInCapture;

      const isDisadvantage =
        (recoveryMap !== null && recoveryMap[i] === victimPort) ||
        (ledgeMap !== null && ledgeMap[i] === victimPort);

      if ((isFreshAttackHit || isFreshGrab) && !isDisadvantage) {
        currentStockHits++;
      }

      const stockLost =
        lastStocksRemaining !== undefined &&
        post.stocksRemaining < lastStocksRemaining;
      if (stockLost) {
        hitsPerStockTaken.push(currentStockHits);
        currentStockHits = 0;
      }

      lastComboHitCount = post.comboHitCount;
      lastStocksRemaining = post.stocksRemaining;
      lastInCapture = inCapture;
    }

    // If recording is complete and the opponent lost the match at the end,
    // count that final stock taken as well.
    if (
      replay.isComplete &&
      replay.gameEnd &&
      replay.gameEnd.placements[victimPort] === -1 &&
      currentStockHits > 0
    ) {
      hitsPerStockTaken.push(currentStockHits);
    }
  }

  const stocksTaken = hitsPerStockTaken.length;
  const totalHitsLanded = hitsPerStockTaken.reduce((sum, h) => sum + h, 0);
  const averageHitsPerStock =
    stocksTaken > 0 ? totalHitsLanded / stocksTaken : null;

  return {
    stocksTaken,
    totalHitsLanded,
    averageHitsPerStock,
  };
}
