import {
  getSeatedPorts,
  isShieldStunState,
  type PortIndex,
  type Replay,
} from "@rmg-k/rmgr";
import { buildRecoveryMap, buildLedgeMap } from "./ledgeTrap.js";
import { isHitstunState } from "./edgeGuard.js";

const PORTS: readonly PortIndex[] = [0, 1, 2, 3];

/** Action states where the player is captured/held/thrown by a grab. */
export const CAPTURE_STATES = new Set([
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

/** Action states corresponding to dead or respawning sequences. */
export const DEAD_OR_RESPAWNING_STATES = new Set([
  0x000, // DeadD
  0x001, // DeadS
  0x002, // DeadU
  0x003, // ScreenKO
  0x004, // ScreenKOWait
  0x005, // Entry
  0x007, // Revive1
  0x008, // Revive2
  0x009, // ReviveWait
]);

/** Action states corresponding strictly to death / KO animations (blast zones). */
export const DEAD_STATES = new Set([
  0x000, // DeadD
  0x001, // DeadS
  0x002, // DeadU
  0x003, // ScreenKO
  0x004, // ScreenKOWait
]);

/** Action states for spawn/respawn platforms. */
const RESPAWN_STATES = new Set([0x005, 0x007, 0x008, 0x009]);

/** Duration of spawn invulnerability after dropping off the revival platform (120f = 2.0s). */
const POST_DROP_INVULNERABILITY_FRAMES = 120;

/** Frames of continuous mutual actionable state required to officially reset to neutral. */
export const NEUTRAL_RESET_FRAMES = 60; // 1.0 s at 60 fps

export type NeutralOpeningReason =
  | "shield-pressure"
  | "landing-lag"
  | "whiff-punish"
  | "jump-punish"
  | "standing-hit"
  | "reversal"
  | "unknown";

export type NeutralInteractionOutcome =
  "reset" | "ko" | "reversal" | "incomplete";

export interface NeutralHitEvent {
  readonly frame: number;
  readonly frameIndex: number;
  readonly endFrame?: number;
  readonly endFrameIndex?: number;
  readonly kind: "neutral-hit";
  readonly attackerPort: PortIndex;
  readonly victimPort: PortIndex;
  readonly hitType: "attack" | "grab";
  readonly reason: NeutralOpeningReason;
  readonly reasonDetail?: string;
  readonly winnerPort?: PortIndex | null;
  readonly totalHitsLanded?: number;
  readonly totalDamageDealt?: number;
  readonly damageTakenDuringAdvantage?: number;
  readonly convertedToEdgeGuard?: boolean;
  readonly convertedToLedgeTrap?: boolean;
  readonly convertedToKill?: boolean;
  readonly outcome?: NeutralInteractionOutcome;
  readonly openingEndFrameIndex?: number;
  readonly lastHitFrameIndex?: number;
  readonly edgeGuardStartFrameIndex?: number;
  readonly edgeGuardEndFrameIndex?: number;
  readonly ledgeTrapStartFrameIndex?: number;
  readonly ledgeTrapEndFrameIndex?: number;
  readonly killFrameIndex?: number;
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
 * Returns true if the player is in a fully actionable state (can move/shield/attack/jump).
 * Excludes hitstun, grab capture, tumble with hitstun, knockdown/prone, shield stun, and dead/respawn states.
 */
export function isActionableState(
  actionStateId: number,
  hitstunCounter: number,
): boolean {
  if (isHitstunState(actionStateId, hitstunCounter)) return false;
  if (CAPTURE_STATES.has(actionStateId)) return false;
  if (DEAD_OR_RESPAWNING_STATES.has(actionStateId)) return false;
  if (actionStateId >= 0x032 && actionStateId <= 0x037) return false; // DownBound, DownWait, DownDamage, DownStand, DownForward, DownBack
  if (actionStateId === 0x023) return false; // ShieldStun
  if (actionStateId === 0x039 && hitstunCounter > 0) return false; // Tumble with hitstun
  return true;
}

/**
 * Builds a boolean lookup map indicating if angel (spawn/respawn) invincibility is active on each frame.
 */
export function buildAngelMap(
  replay: Replay,
  portA: PortIndex,
  portB: PortIndex,
): boolean[] {
  const map: boolean[] = new Array(replay.frames.length).fill(false);
  for (const p of [portA, portB]) {
    let inPlatform = false;
    for (let i = 0; i < replay.frames.length; i++) {
      const f = replay.frames[i];
      if (!f) continue;
      const post = f.ports[p]?.post;
      if (!post) continue;

      const isPlat = RESPAWN_STATES.has(post.actionStateId);
      if (isPlat) {
        inPlatform = true;
        map[i] = true;
      } else if (inPlatform) {
        inPlatform = false;
        const end = Math.min(
          replay.frames.length,
          i + POST_DROP_INVULNERABILITY_FRAMES,
        );
        for (let j = i; j < end; j++) {
          map[j] = true;
        }
      }
    }
  }
  return map;
}

/**
 * Classifies why a neutral opening occurred on `victimPort` at `hitFrameIndex`.
 * Evaluated strictly in order:
 * 1. Unsafe Shield Pressure (victim attacked into attacker's shield, punished out of shield)
 * 2. Land Punish (attacked within 0.5s = 30F of landing on the ground)
 * 3. Whiff Punish (attacked within 0.5s = 30F of an attack ending without hitting)
 * 4. Jump Punish (jumped without attacking and attacked within 0.5s = 30F)
 * 5. Standing Hit / Grab (attacked while grounded in neutral)
 * 6. Unknown (fallback)
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
  const isVictimAirborneAtHit =
    isAirborneActionState(victimPrevPost.actionStateId) ||
    Math.abs(victimPrevPost.positionY) > 5;

  // Rule 1: Unsafe Shield Pressure
  // Check if victim attacked into attacker's shield within preceding 45 frames (0.75s)
  let victimAttackedIntoShield = false;
  for (let k = 1; k <= 45; k++) {
    const f = hitFrameIndex - k;
    if (f < 0) break;
    const vPost = replay.frames[f]?.ports[victimPort]?.post;
    const aPost = replay.frames[f]?.ports[attackerPort]?.post;
    if (!vPost || !aPost) continue;

    if (isAttackActionState(vPost.actionStateId)) {
      if (
        isShieldStunState(aPost.actionStateId) ||
        aPost.actionStateId === 0x09b ||
        aPost.actionStateId === 0x023
      ) {
        victimAttackedIntoShield = true;
        break;
      }
    }
  }

  if (victimAttackedIntoShield) {
    return {
      reason: "shield-pressure",
      reasonDetail: "Attacked into shield (punished out of shield)",
    };
  }

  // Rule 2: Land Punish — Attacked on ground within 0.5s (30 frames) of landing from the air
  if (!isVictimAirborneAtHit) {
    let framesSinceLanding = -1;
    for (let k = 1; k <= 30; k++) {
      const f = hitFrameIndex - k;
      if (f < 0) break;
      const post = replay.frames[f]?.ports[victimPort]?.post;
      if (!post) continue;

      if (
        isLandingLagActionState(post.actionStateId) ||
        isAirborneActionState(post.actionStateId) ||
        Math.abs(post.positionY) > 5
      ) {
        framesSinceLanding = k;
        break;
      }
    }

    if (framesSinceLanding !== -1) {
      return {
        reason: "landing-lag",
        reasonDetail: `Attacked within ${(framesSinceLanding / 60).toFixed(2)}s of landing`,
      };
    }
  }

  // Rule 3: Whiff Punish — Attacked immediately after attacking and missing (within 0.5s = 30 frames of attack ending)
  let foundAttackEnd = -1;
  let attackHadHit = false;

  for (let k = 1; k <= 45; k++) {
    const f = hitFrameIndex - k;
    if (f < 0) break;
    const post = replay.frames[f]?.ports[victimPort]?.post;
    if (!post) continue;

    if (isAttackActionState(post.actionStateId)) {
      if (post.comboHitCount > 0) {
        attackHadHit = true;
      }
      if (foundAttackEnd === -1) {
        foundAttackEnd = f;
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

  // Rule 4: Jump Punish — Jumped from ground or platform (without using an attack) and attacked within 0.5s (30 frames)
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

  // Rule 5: Got hit with an attack while standing / grounded neutral
  if (!isVictimAirborneAtHit) {
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
 * Computes all neutral interactions and opening events in chronological order.
 * Tracks end-to-end advantage chains from first contact through follow-up hits,
 * situation conversions (offstage edge guard, ledge trap), and neutral reset (60F mutual actionable).
 */
export function computeNeutralHitEvents(replay: Replay): NeutralHitEvent[] {
  const events: NeutralHitEvent[] = [];
  const seated = getSeatedPorts(replay);
  if (seated.length !== 2) return events;

  const [portA, portB] = seated as [PortIndex, PortIndex];
  const recoveryMap = buildRecoveryMap(replay, portA, portB);
  const ledgeMap = buildLedgeMap(replay);
  const angelMap = buildAngelMap(replay, portA, portB);

  interface ActiveInteraction {
    frame: number;
    frameIndex: number;
    attackerPort: PortIndex;
    victimPort: PortIndex;
    hitType: "attack" | "grab";
    reason: NeutralOpeningReason;
    reasonDetail?: string;
    firstContactPort: PortIndex;
    winnerPort: PortIndex | null;
    totalHitsA: number;
    totalHitsB: number;
    damageAtEntryA: number;
    damageAtEntryB: number;
    stocksAtEntryA: number;
    stocksAtEntryB: number;
    convertedToEdgeGuard: boolean;
    convertedToLedgeTrap: boolean;
    convertedToKill: boolean;
    consecutiveActionableFrames: number;
    openingEndFrameIndex?: number;
    lastHitFrameIndex?: number;
    edgeGuardStartFrameIndex?: number;
    edgeGuardEndFrameIndex?: number;
    ledgeTrapStartFrameIndex?: number;
    ledgeTrapEndFrameIndex?: number;
    killFrameIndex?: number;
  }

  let active: ActiveInteraction | null = null;
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

    const aHitB = postB.comboHitCount > (lastBCombo ?? 0) && !lastBInCapture;
    const aGrabbedB = bInCapture && !lastBInCapture;

    const bHitA = postA.comboHitCount > (lastACombo ?? 0) && !lastAInCapture;
    const bGrabbedA = aInCapture && !lastAInCapture;

    const inDisadvantage =
      recoveryMap[i] !== null ||
      ledgeMap[i] !== null ||
      angelMap[i] ||
      DEAD_OR_RESPAWNING_STATES.has(postA.actionStateId) ||
      DEAD_OR_RESPAWNING_STATES.has(postB.actionStateId);

    if (active === null) {
      // We are in True Neutral — check for fresh opening hit/grab
      if (!inDisadvantage) {
        const prevPostA = replay.frames[i - 1]?.ports[portA]?.post;
        const prevPostB = replay.frames[i - 1]?.ports[portB]?.post;
        const damageBeforeHitA = prevPostA
          ? prevPostA.damagePercent
          : postA.damagePercent;
        const damageBeforeHitB = prevPostB
          ? prevPostB.damagePercent
          : postB.damagePercent;

        if (aHitB || aGrabbedB) {
          const { reason, reasonDetail } = classifyNeutralOpening(
            replay,
            i,
            portB,
            portA,
          );
          active = {
            frame: frameNumber,
            frameIndex: i,
            attackerPort: portA,
            victimPort: portB,
            hitType: aGrabbedB ? "grab" : "attack",
            reason,
            reasonDetail,
            firstContactPort: portA,
            winnerPort: null,
            totalHitsA: 1,
            totalHitsB: 0,
            damageAtEntryA: damageBeforeHitA,
            damageAtEntryB: damageBeforeHitB,
            stocksAtEntryA: postA.stocksRemaining,
            stocksAtEntryB: postB.stocksRemaining,
            convertedToEdgeGuard: false,
            convertedToLedgeTrap: false,
            convertedToKill: false,
            consecutiveActionableFrames: 0,
            openingEndFrameIndex: i + 30,
            lastHitFrameIndex: i,
          };
        } else if (bHitA || bGrabbedA) {
          const { reason, reasonDetail } = classifyNeutralOpening(
            replay,
            i,
            portA,
            portB,
          );
          active = {
            frame: frameNumber,
            frameIndex: i,
            attackerPort: portB,
            victimPort: portA,
            hitType: bGrabbedA ? "grab" : "attack",
            reason,
            reasonDetail,
            firstContactPort: portB,
            winnerPort: null,
            totalHitsA: 0,
            totalHitsB: 1,
            damageAtEntryA: damageBeforeHitA,
            damageAtEntryB: damageBeforeHitB,
            stocksAtEntryA: postA.stocksRemaining,
            stocksAtEntryB: postB.stocksRemaining,
            convertedToEdgeGuard: false,
            convertedToLedgeTrap: false,
            convertedToKill: false,
            consecutiveActionableFrames: 0,
            openingEndFrameIndex: i + 30,
            lastHitFrameIndex: i,
          };
        }
      }
    } else {
      // Active interaction ongoing
      const att: PortIndex = active.attackerPort;
      const vic: PortIndex = active.victimPort;
      const attPost = att === portA ? postA : postB;
      const vicPost = vic === portA ? postA : postB;
      const attEntryStocks =
        att === portA ? active.stocksAtEntryA : active.stocksAtEntryB;
      const vicEntryStocks =
        vic === portA ? active.stocksAtEntryA : active.stocksAtEntryB;

      // 1. Check if a stock was lost
      if (vicPost.stocksRemaining < vicEntryStocks) {
        active.convertedToKill = true;
        active.killFrameIndex = i;
        active.winnerPort = att;
        const totalDamageA = Math.max(
          0,
          postB.damagePercent - active.damageAtEntryB,
        );
        const totalDamageB = Math.max(
          0,
          postA.damagePercent - active.damageAtEntryA,
        );
        events.push({
          frame: active.frame,
          frameIndex: active.frameIndex,
          endFrame: frameNumber,
          endFrameIndex: i,
          kind: "neutral-hit",
          attackerPort: active.attackerPort,
          victimPort: active.victimPort,
          hitType: active.hitType,
          reason: active.reason,
          reasonDetail: active.reasonDetail,
          winnerPort: active.winnerPort,
          totalHitsLanded:
            att === portA ? active.totalHitsA : active.totalHitsB,
          totalDamageDealt: att === portA ? totalDamageA : totalDamageB,
          damageTakenDuringAdvantage:
            att === portA ? totalDamageB : totalDamageA,
          convertedToEdgeGuard: active.convertedToEdgeGuard,
          convertedToLedgeTrap: active.convertedToLedgeTrap,
          convertedToKill: true,
          outcome: "ko",
          openingEndFrameIndex: active.openingEndFrameIndex,
          lastHitFrameIndex: active.lastHitFrameIndex,
          edgeGuardStartFrameIndex: active.edgeGuardStartFrameIndex,
          edgeGuardEndFrameIndex: active.edgeGuardEndFrameIndex,
          ledgeTrapStartFrameIndex: active.ledgeTrapStartFrameIndex,
          ledgeTrapEndFrameIndex: active.ledgeTrapEndFrameIndex,
          killFrameIndex: active.killFrameIndex,
        });
        active = null;
      } else if (attPost.stocksRemaining < attEntryStocks) {
        // Attacker lost stock (self-destruct or reversal KO)
        active.winnerPort = vic;
        active.killFrameIndex = i;
        const totalDamageA = Math.max(
          0,
          postB.damagePercent - active.damageAtEntryB,
        );
        const totalDamageB = Math.max(
          0,
          postA.damagePercent - active.damageAtEntryA,
        );
        events.push({
          frame: active.frame,
          frameIndex: active.frameIndex,
          endFrame: frameNumber,
          endFrameIndex: i,
          kind: "neutral-hit",
          attackerPort: active.attackerPort,
          victimPort: active.victimPort,
          hitType: active.hitType,
          reason: active.reason,
          reasonDetail: active.reasonDetail,
          winnerPort: vic,
          totalHitsLanded:
            att === portA ? active.totalHitsA : active.totalHitsB,
          totalDamageDealt: att === portA ? totalDamageA : totalDamageB,
          damageTakenDuringAdvantage:
            att === portA ? totalDamageB : totalDamageA,
          convertedToEdgeGuard: active.convertedToEdgeGuard,
          convertedToLedgeTrap: active.convertedToLedgeTrap,
          convertedToKill: true,
          outcome: "ko",
          openingEndFrameIndex: active.openingEndFrameIndex,
          lastHitFrameIndex: active.lastHitFrameIndex,
          edgeGuardStartFrameIndex: active.edgeGuardStartFrameIndex,
          edgeGuardEndFrameIndex: active.edgeGuardEndFrameIndex,
          ledgeTrapStartFrameIndex: active.ledgeTrapStartFrameIndex,
          ledgeTrapEndFrameIndex: active.ledgeTrapEndFrameIndex,
          killFrameIndex: active.killFrameIndex,
        });
        active = null;
      } else {
        // 2. Check situation conversions
        if (recoveryMap[i] === vic) {
          active.convertedToEdgeGuard = true;
          if (active.edgeGuardStartFrameIndex === undefined) {
            active.edgeGuardStartFrameIndex = i;
          }
          active.edgeGuardEndFrameIndex = i;
          active.winnerPort = att;
        } else if (recoveryMap[i] === att) {
          active.winnerPort = vic;
        }

        if (ledgeMap[i] === vic) {
          active.convertedToLedgeTrap = true;
          if (active.ledgeTrapStartFrameIndex === undefined) {
            active.ledgeTrapStartFrameIndex = i;
          }
          active.ledgeTrapEndFrameIndex = i;
          active.winnerPort = att;
        } else if (ledgeMap[i] === att) {
          active.winnerPort = vic;
        }

        // 3. Check follow-up hits, trades, or reversals
        const attHitVic =
          att === portA ? aHitB || aGrabbedB : bHitA || bGrabbedA;
        const vicHitAtt =
          vic === portA ? aHitB || aGrabbedB : bHitA || bGrabbedA;

        if (attHitVic && !vicHitAtt) {
          // Attacker lands another hit/grab
          if (att === portA) active.totalHitsA++;
          else active.totalHitsB++;
          active.lastHitFrameIndex = i;
          active.consecutiveActionableFrames = 0;
        } else if (attHitVic && vicHitAtt) {
          // Trade!
          active.totalHitsA++;
          active.totalHitsB++;
          active.lastHitFrameIndex = i;
          active.consecutiveActionableFrames = 0;
        } else if (!attHitVic && vicHitAtt) {
          // Defender landed a counter-hit / reversal!
          // 1. Conclude the attacker's active interaction as a reversal
          const totalDamageA = Math.max(
            0,
            postB.damagePercent - active.damageAtEntryB,
          );
          const totalDamageB = Math.max(
            0,
            postA.damagePercent - active.damageAtEntryA,
          );
          const damageAttDealt = att === portA ? totalDamageA : totalDamageB;
          const damageVicDealt = att === portA ? totalDamageB : totalDamageA;
          events.push({
            frame: active.frame,
            frameIndex: active.frameIndex,
            endFrame: frameNumber,
            endFrameIndex: i,
            kind: "neutral-hit",
            attackerPort: active.attackerPort,
            victimPort: active.victimPort,
            hitType: active.hitType,
            reason: active.reason,
            reasonDetail: active.reasonDetail,
            winnerPort: vic,
            totalHitsLanded:
              att === portA ? active.totalHitsA : active.totalHitsB,
            totalDamageDealt: damageAttDealt,
            damageTakenDuringAdvantage: damageVicDealt,
            convertedToEdgeGuard: active.convertedToEdgeGuard,
            convertedToLedgeTrap: active.convertedToLedgeTrap,
            convertedToKill: false,
            outcome: "reversal",
            openingEndFrameIndex: active.openingEndFrameIndex,
            lastHitFrameIndex: active.lastHitFrameIndex,
            edgeGuardStartFrameIndex: active.edgeGuardStartFrameIndex,
            edgeGuardEndFrameIndex: active.edgeGuardEndFrameIndex,
            ledgeTrapStartFrameIndex: active.ledgeTrapStartFrameIndex,
            ledgeTrapEndFrameIndex: active.ledgeTrapEndFrameIndex,
            killFrameIndex: active.killFrameIndex,
          });

          // 2. Open a new interaction starting from this reversal
          const isGrab: boolean = vic === portA ? aGrabbedB : bGrabbedA;
          const prevPostA = replay.frames[i - 1]?.ports[portA]?.post;
          const prevPostB = replay.frames[i - 1]?.ports[portB]?.post;
          const damageBeforeHitA = prevPostA
            ? prevPostA.damagePercent
            : postA.damagePercent;
          const damageBeforeHitB = prevPostB
            ? prevPostB.damagePercent
            : postB.damagePercent;

          active = {
            frame: frameNumber,
            frameIndex: i,
            attackerPort: vic,
            victimPort: att,
            hitType: isGrab ? "grab" : "attack",
            reason: "reversal",
            reasonDetail: "Reversal counter-hit from disadvantage",
            firstContactPort: vic,
            winnerPort: vic,
            totalHitsA: vic === portA ? 1 : 0,
            totalHitsB: vic === portB ? 1 : 0,
            damageAtEntryA: damageBeforeHitA,
            damageAtEntryB: damageBeforeHitB,
            stocksAtEntryA: postA.stocksRemaining,
            stocksAtEntryB: postB.stocksRemaining,
            convertedToEdgeGuard: false,
            convertedToLedgeTrap: false,
            convertedToKill: false,
            consecutiveActionableFrames: 0,
            openingEndFrameIndex: i + 30,
            lastHitFrameIndex: i,
          };
          continue;
        }

        // 4. Check neutral reset (60 consecutive mutual actionable frames)
        if (inDisadvantage) {
          active.consecutiveActionableFrames = 0;
        } else {
          const aActionable =
            isActionableState(postA.actionStateId, postA.hitstunCounter) &&
            postA.comboHitCount === 0 &&
            !aInCapture;
          const bActionable =
            isActionableState(postB.actionStateId, postB.hitstunCounter) &&
            postB.comboHitCount === 0 &&
            !bInCapture;

          if (aActionable && bActionable) {
            active.consecutiveActionableFrames++;
            if (active.consecutiveActionableFrames >= NEUTRAL_RESET_FRAMES) {
              // Neutral reset reached!
              const totalDamageA = Math.max(
                0,
                postB.damagePercent - active.damageAtEntryB,
              );
              const totalDamageB = Math.max(
                0,
                postA.damagePercent - active.damageAtEntryA,
              );
              const damageAttDealt =
                att === portA ? totalDamageA : totalDamageB;
              const damageVicDealt =
                att === portA ? totalDamageB : totalDamageA;

              if (active.winnerPort === null) {
                if (damageAttDealt > damageVicDealt) {
                  active.winnerPort = att;
                } else if (damageVicDealt > damageAttDealt) {
                  active.winnerPort = vic;
                } else {
                  active.winnerPort = att;
                }
              }

              const outcome = active.winnerPort === att ? "reset" : "reversal";
              events.push({
                frame: active.frame,
                frameIndex: active.frameIndex,
                endFrame: frameNumber,
                endFrameIndex: i,
                kind: "neutral-hit",
                attackerPort: active.attackerPort,
                victimPort: active.victimPort,
                hitType: active.hitType,
                reason: active.reason,
                reasonDetail: active.reasonDetail,
                winnerPort: active.winnerPort,
                totalHitsLanded:
                  att === portA ? active.totalHitsA : active.totalHitsB,
                totalDamageDealt: damageAttDealt,
                damageTakenDuringAdvantage: damageVicDealt,
                convertedToEdgeGuard: active.convertedToEdgeGuard,
                convertedToLedgeTrap: active.convertedToLedgeTrap,
                convertedToKill: false,
                outcome,
                openingEndFrameIndex: active.openingEndFrameIndex,
                lastHitFrameIndex: active.lastHitFrameIndex,
                edgeGuardStartFrameIndex: active.edgeGuardStartFrameIndex,
                edgeGuardEndFrameIndex: active.edgeGuardEndFrameIndex,
                ledgeTrapStartFrameIndex: active.ledgeTrapStartFrameIndex,
                ledgeTrapEndFrameIndex: active.ledgeTrapEndFrameIndex,
                killFrameIndex: active.killFrameIndex,
              });
              active = null;
            }
          } else {
            active.consecutiveActionableFrames = 0;
          }
        }
      }
    }

    lastACombo = postA.comboHitCount;
    lastBCombo = postB.comboHitCount;
    lastAInCapture = aInCapture;
    lastBInCapture = bInCapture;
  }

  // If match ended with active interaction
  if (active !== null) {
    const att = active.attackerPort;
    const vic = active.victimPort;
    const endFrameIndex = replay.frames.length - 1;
    const lastFrame = replay.frames[endFrameIndex];
    const totalDamageA = Math.max(
      0,
      (lastFrame?.ports[portB]?.post?.damagePercent ?? 0) -
        active.damageAtEntryB,
    );
    const totalDamageB = Math.max(
      0,
      (lastFrame?.ports[portA]?.post?.damagePercent ?? 0) -
        active.damageAtEntryA,
    );
    const damageAttDealt = att === portA ? totalDamageA : totalDamageB;
    const damageVicDealt = att === portA ? totalDamageB : totalDamageA;
    const isKO: boolean = Boolean(
      replay.isComplete &&
      replay.gameEnd &&
      replay.gameEnd.placements?.[vic] === -1,
    );

    if (active.winnerPort === null) {
      if (damageAttDealt > damageVicDealt) {
        active.winnerPort = att;
      } else if (damageVicDealt > damageAttDealt) {
        active.winnerPort = vic;
      } else {
        active.winnerPort = att;
      }
    }

    const outcome = isKO
      ? "ko"
      : active.winnerPort === att
        ? "reset"
        : "reversal";

    events.push({
      frame: active.frame,
      frameIndex: active.frameIndex,
      endFrame: lastFrame?.frame ?? active.frame,
      endFrameIndex,
      kind: "neutral-hit",
      attackerPort: active.attackerPort,
      victimPort: active.victimPort,
      hitType: active.hitType,
      reason: active.reason,
      reasonDetail: active.reasonDetail,
      winnerPort: isKO ? att : (active.winnerPort ?? att),
      totalHitsLanded: att === portA ? active.totalHitsA : active.totalHitsB,
      totalDamageDealt: damageAttDealt,
      damageTakenDuringAdvantage: damageVicDealt,
      convertedToEdgeGuard: active.convertedToEdgeGuard,
      convertedToLedgeTrap: active.convertedToLedgeTrap,
      convertedToKill: isKO,
      outcome,
      openingEndFrameIndex: active.openingEndFrameIndex,
      lastHitFrameIndex: active.lastHitFrameIndex,
      edgeGuardStartFrameIndex: active.edgeGuardStartFrameIndex,
      edgeGuardEndFrameIndex: active.edgeGuardEndFrameIndex,
      ledgeTrapStartFrameIndex: active.ledgeTrapStartFrameIndex,
      ledgeTrapEndFrameIndex: active.ledgeTrapEndFrameIndex,
      killFrameIndex: active.killFrameIndex,
    });
  }

  return events;
}

/**
 * For each seated port, how many neutral openings that port has taken in its *current* stock,
 * indexed the same way as `replay.frames` (so `result[port][frameIndex]` matches `replay.frames[frameIndex]`).
 * Resets to 0 starting the frame after `stocksRemaining` drops.
 */
export function computeNeutralHitsPerStock(
  replay: Replay,
): Partial<Record<PortIndex, readonly number[]>> {
  const result: Partial<Record<PortIndex, number[]>> = {};
  const seated = getSeatedPorts(replay);
  if (seated.length !== 2) return result;

  const events = computeNeutralHitEvents(replay);

  for (const port of PORTS) {
    const values: number[] = new Array(replay.frames.length).fill(0);
    if (!seated.includes(port)) {
      result[port] = values;
      continue;
    }

    let openingsTaken = 0;
    let eventIdx = 0;
    let lastStocks: number | undefined;

    // Filter events where `port` was the victim
    const victimEvents = events.filter((e) => e.victimPort === port);

    for (let i = 0; i < replay.frames.length; i++) {
      const post = replay.frames[i]?.ports[port]?.post;
      if (!post) {
        values[i] = openingsTaken;
        continue;
      }

      while (
        eventIdx < victimEvents.length &&
        victimEvents[eventIdx]!.frameIndex === i
      ) {
        openingsTaken++;
        eventIdx++;
      }

      values[i] = openingsTaken;

      const stockLost =
        lastStocks !== undefined && post.stocksRemaining < lastStocks;
      if (stockLost) {
        openingsTaken = 0;
      }

      lastStocks = post.stocksRemaining;
    }

    result[port] = values;
  }

  return result;
}

export interface NeutralHitsStats {
  /** Total completed stocks taken from opponent(s). */
  stocksTaken: number;
  /** Total neutral openings landed across all taken stocks. */
  totalHitsLanded: number;
  /** Average number of neutral openings per stock taken, or null if no stocks taken. */
  averageHitsPerStock: number | null;
}

/**
 * Computes the average number of neutral openings landed by `attackerPort`
 * before taking each stock from opponent(s). Grabs are counted as hits.
 * Multi-hit extensions within an interaction are consolidated into a single opening.
 */
export function computeNeutralHitsStats(
  replay: Replay,
  attackerPort: PortIndex,
): NeutralHitsStats {
  const seated = getSeatedPorts(replay);
  const opponents: PortIndex[] = (seated as PortIndex[]).filter(
    (p: PortIndex) => p !== attackerPort,
  );
  if (opponents.length === 0) {
    return { stocksTaken: 0, totalHitsLanded: 0, averageHitsPerStock: null };
  }

  const events = computeNeutralHitEvents(replay);
  const openingsLanded = events.filter((e) => e.attackerPort === attackerPort);

  let stocksTaken = 0;
  for (const opp of opponents) {
    let lastStocks: number | undefined;
    for (let i = 0; i < replay.frames.length; i++) {
      const post = replay.frames[i]?.ports[opp]?.post;
      if (!post) continue;
      if (lastStocks !== undefined && post.stocksRemaining < lastStocks) {
        stocksTaken++;
      }
      lastStocks = post.stocksRemaining;
    }
  }

  const totalHitsLanded = openingsLanded.length;
  const averageHitsPerStock =
    stocksTaken > 0 ? totalHitsLanded / stocksTaken : null;

  return {
    stocksTaken,
    totalHitsLanded,
    averageHitsPerStock,
  };
}
