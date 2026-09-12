import { getSeatedPorts, type PortIndex, type Replay } from "@rmg-k/rmgr";
import { isHitstunState } from "./edgeGuard.js";
import {
  computeClassifiedSituations,
  type ClassifiedSituation,
} from "./classifiedSituations.js";

/** Ledge catch/wait states that cancel pending kill combo tracking. */
const LEDGE_GRAB_STATES = new Set([
  0x054, // CliffCatch
  0x055, // CliffWait
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

/** Frames before combo start to seek to when jumping to a combo (1.0 s). */
export const COMBO_JUMP_LEAD_IN_FRAMES = 60;

export interface KillCombo {
  readonly id: string;
  readonly comboIndex: number;
  readonly attackerPort: PortIndex;
  readonly victimPort: PortIndex;
  readonly startFrame: number;
  readonly startFrameIndex: number;
  readonly endFrame: number;
  readonly endFrameIndex: number;
  readonly jumpFrameIndex: number;
  readonly hitCount: number;
  readonly startDamage: number;
  readonly endDamage: number;
  readonly damageDealt: number;
}

interface ActiveComboTracker {
  attackerPort: PortIndex;
  victimPort: PortIndex;
  startFrame: number;
  startFrameIndex: number;
  damageAtStart: number;
  maxComboHits: number;
  lastComboHitCount: number;
  stocksAtStart: number;
}

interface PendingLethalTracker {
  attackerPort: PortIndex;
  victimPort: PortIndex;
  startFrame: number;
  startFrameIndex: number;
  damageAtStart: number;
  lastComboDamage: number;
  maxComboHits: number;
  stocksAtStart: number;
}

/**
 * The recovery classifier's authoritative answer for "was the situation this combo ended in
 * actually unrecoverable" -- looked up around the exact frame this combo's victim exits hitstun,
 * used to credit a Kill Combo without waiting on this file's own (from-scratch, recovery-blind)
 * landed/ledge/damage cancellation logic below. Requires BOTH category "hopeless" (the classifier's
 * own "dead regardless of any input" claim) AND resolutionKind "recovery-failure" (they actually
 * did die) -- a hopeless situation that resolved as a possible accidental save is deliberately NOT
 * credited here, since the victim genuinely survived; it falls through to the normal pending-lethal
 * tracking below, which will correctly not credit it either.
 *
 * A small frame tolerance accounts for edgeGuard.ts's "situation-entered" trigger (isOutsideZone +
 * not-in-hitstun) and this file's own "no longer isCombod" transition not being defined in exactly
 * the same terms (this file has no concept of stage geometry at all, and checks hitstunCounter-
 * based state rather than the classifier's own hitstun-state set) -- they detect the same real
 * event (hitstun ending) but can land on adjacent frames.
 */
const HOPELESS_MATCH_FRAME_TOLERANCE = 5;

function findHopelessKillSituation(
  situations: readonly ClassifiedSituation[],
  victimPort: PortIndex,
  aroundFrameIndex: number,
): ClassifiedSituation | null {
  for (const situation of situations) {
    if (situation.recoveringPort !== victimPort) continue;
    if (situation.category !== "hopeless") continue;
    if (situation.resolutionKind !== "recovery-failure") continue;
    if (
      Math.abs(situation.enteredFrameIndex - aroundFrameIndex) <=
      HOPELESS_MATCH_FRAME_TOLERANCE
    ) {
      return situation;
    }
  }
  return null;
}

/**
 * Extracts all "Kill Combos" from a match replay.
 *
 * A Kill Combo is defined as:
 * - A continuous combo sequence with at least 3 hits (`hitCount >= 3`) that EITHER:
 *   (a) Outright takes the opponent's stock during the combo / hitstun, OR
 *   (b) Ends offstage / in air and the opponent dies without ever landing on stage/platform,
 *       grabbing ledge, or taking further damage from any other exchange, OR
 *   (c) Ends with the recovery classifier confirming the resulting position was unrecoverable
 *       (category "hopeless") AND the victim did in fact die -- credited immediately rather than
 *       via (b)'s landed/ledge/damage tracking, which doesn't know about recovery physics and can
 *       be fooled by intervening events. Per the user (2026-09-11): "knocked so that they can't
 *       recover (not merely hitting the blast zone)." Only applies where the classifier has an
 *       opinion at all (Dream Land, one of its 9 supported characters) -- everywhere else, (b)'s
 *       existing behavior is unchanged.
 */
export function computeKillCombos(replay: Replay): KillCombo[] {
  const seated = getSeatedPorts(replay);
  if (seated.length !== 2) return [];

  const [portA, portB] = seated as [PortIndex, PortIndex];
  const combos: KillCombo[] = [];
  let comboCount = 0;

  const classifiedSituations = computeClassifiedSituations(replay);

  const activeCombo: Partial<Record<PortIndex, ActiveComboTracker>> = {};
  const pendingLethal: Partial<Record<PortIndex, PendingLethalTracker>> = {};

  for (let i = 0; i < replay.frames.length; i++) {
    const frame = replay.frames[i];
    if (!frame) continue;
    const postA = frame.ports[portA]?.state;
    const postB = frame.ports[portB]?.state;
    if (!postA || !postB) continue;

    const frameNumber = frame.frame;

    for (const victimPort of [portA, portB]) {
      const attackerPort = victimPort === portA ? portB : portA;
      const victimPost = victimPort === portA ? postA : postB;

      const isDeadOrRespawn = DEAD_OR_RESPAWNING_STATES.has(
        victimPost.actionStateId,
      );

      // 1. Check pending lethal tracker if one exists for this victim
      const pending = pendingLethal[victimPort];
      if (pending) {
        // Case (a): Stock lost or entered death state!
        if (
          victimPost.stocksRemaining < pending.stocksAtStart ||
          isDeadOrRespawn
        ) {
          comboCount++;
          combos.push({
            id: `combo-${comboCount}-${pending.startFrameIndex}`,
            comboIndex: comboCount,
            attackerPort: pending.attackerPort,
            victimPort: pending.victimPort,
            startFrame: pending.startFrame,
            startFrameIndex: pending.startFrameIndex,
            endFrame: frameNumber,
            endFrameIndex: i,
            jumpFrameIndex: Math.max(
              0,
              pending.startFrameIndex - COMBO_JUMP_LEAD_IN_FRAMES,
            ),
            hitCount: pending.maxComboHits,
            startDamage: pending.damageAtStart,
            endDamage: pending.lastComboDamage,
            damageDealt: Math.max(
              0,
              pending.lastComboDamage - pending.damageAtStart,
            ),
          });
          pendingLethal[victimPort] = undefined;
          activeCombo[victimPort] = undefined;
          continue;
        }

        const inHitstun = isHitstunState(
          victimPost.actionStateId,
          victimPost.hitstunCounter ?? 0,
        );
        const inCapture = CAPTURE_STATES.has(victimPost.actionStateId);

        // Case (b): Landed safely on stage/platform
        if (victimPost.grounded && !inHitstun && !inCapture) {
          pendingLethal[victimPort] = undefined;
        }
        // Case (c): Grabbed ledge
        else if (LEDGE_GRAB_STATES.has(victimPost.actionStateId)) {
          pendingLethal[victimPort] = undefined;
        }
        // Case (d): Took additional damage from a separate exchange
        else if (victimPost.damagePercent > pending.lastComboDamage) {
          pendingLethal[victimPort] = undefined;
        }
      }

      // 2. Active combo tracking
      const active = activeCombo[victimPort];

      if (isDeadOrRespawn) {
        if (active) {
          if (active.maxComboHits >= 3) {
            comboCount++;
            combos.push({
              id: `combo-${comboCount}-${active.startFrameIndex}`,
              comboIndex: comboCount,
              attackerPort: active.attackerPort,
              victimPort: active.victimPort,
              startFrame: active.startFrame,
              startFrameIndex: active.startFrameIndex,
              endFrame: frameNumber,
              endFrameIndex: i,
              jumpFrameIndex: Math.max(
                0,
                active.startFrameIndex - COMBO_JUMP_LEAD_IN_FRAMES,
              ),
              hitCount: active.maxComboHits,
              startDamage: active.damageAtStart,
              endDamage: victimPost.damagePercent,
              damageDealt: Math.max(
                0,
                victimPost.damagePercent - active.damageAtStart,
              ),
            });
          }
          activeCombo[victimPort] = undefined;
        }
        continue;
      }

      const inHitstun = isHitstunState(
        victimPost.actionStateId,
        victimPost.hitstunCounter ?? 0,
      );
      const inCapture = CAPTURE_STATES.has(victimPost.actionStateId);
      const comboHits = victimPost.comboHitCount ?? 0;
      const isCombod = inHitstun || inCapture || comboHits > 0;

      if (isCombod) {
        // If combo hit counter dropped/reset while an active combo existed, the previous combo ended
        const comboDroppedAndRestarted =
          active !== undefined &&
          comboHits > 0 &&
          active.lastComboHitCount > 0 &&
          comboHits < active.lastComboHitCount;

        if (!active || comboDroppedAndRestarted) {
          // If previous combo dropped and new damage landed, any pending lethal tracking is cancelled
          pendingLethal[victimPort] = undefined;

          // Look at previous frame's damage if possible to capture pre-hit damage
          const prevPost =
            i > 0 ? replay.frames[i - 1]?.ports[victimPort]?.state : null;
          const initialDamage = prevPost
            ? prevPost.damagePercent
            : victimPost.damagePercent;

          activeCombo[victimPort] = {
            attackerPort,
            victimPort,
            startFrame: frameNumber,
            startFrameIndex: i,
            damageAtStart: initialDamage,
            maxComboHits: Math.max(1, comboHits),
            lastComboHitCount: comboHits,
            stocksAtStart: victimPost.stocksRemaining,
          };
        } else {
          active.maxComboHits = Math.max(active.maxComboHits, comboHits);
          if (comboHits > 0) {
            active.lastComboHitCount = comboHits;
          }

          // Check if stock was lost while directly in combo hitstun
          if (victimPost.stocksRemaining < active.stocksAtStart) {
            if (active.maxComboHits >= 3) {
              comboCount++;
              combos.push({
                id: `combo-${comboCount}-${active.startFrameIndex}`,
                comboIndex: comboCount,
                attackerPort: active.attackerPort,
                victimPort: active.victimPort,
                startFrame: active.startFrame,
                startFrameIndex: active.startFrameIndex,
                endFrame: frameNumber,
                endFrameIndex: i,
                jumpFrameIndex: Math.max(
                  0,
                  active.startFrameIndex - COMBO_JUMP_LEAD_IN_FRAMES,
                ),
                hitCount: active.maxComboHits,
                startDamage: active.damageAtStart,
                endDamage: victimPost.damagePercent,
                damageDealt: Math.max(
                  0,
                  victimPost.damagePercent - active.damageAtStart,
                ),
              });
            }
            activeCombo[victimPort] = undefined;
          }
        }
      } else {
        // Victim is no longer in hitstun/combo
        if (active) {
          if (active.maxComboHits >= 3) {
            const hopelessSituation = findHopelessKillSituation(
              classifiedSituations,
              victimPort,
              i,
            );
            if (hopelessSituation) {
              const resolutionState =
                replay.frames[hopelessSituation.resolutionFrameIndex]?.ports[
                  victimPort
                ]?.state;
              const endDamage =
                resolutionState?.damagePercent ?? victimPost.damagePercent;
              comboCount++;
              combos.push({
                id: `combo-${comboCount}-${active.startFrameIndex}`,
                comboIndex: comboCount,
                attackerPort: active.attackerPort,
                victimPort: active.victimPort,
                startFrame: active.startFrame,
                startFrameIndex: active.startFrameIndex,
                endFrame:
                  replay.frames[hopelessSituation.resolutionFrameIndex]
                    ?.frame ?? frameNumber,
                endFrameIndex: hopelessSituation.resolutionFrameIndex,
                jumpFrameIndex: Math.max(
                  0,
                  active.startFrameIndex - COMBO_JUMP_LEAD_IN_FRAMES,
                ),
                hitCount: active.maxComboHits,
                startDamage: active.damageAtStart,
                endDamage,
                damageDealt: Math.max(0, endDamage - active.damageAtStart),
              });
            } else {
              // Put into pending lethal tracking to see if they die without landing/ledge/damage
              pendingLethal[victimPort] = {
                attackerPort: active.attackerPort,
                victimPort: active.victimPort,
                startFrame: active.startFrame,
                startFrameIndex: active.startFrameIndex,
                damageAtStart: active.damageAtStart,
                lastComboDamage: victimPost.damagePercent,
                maxComboHits: active.maxComboHits,
                stocksAtStart: active.stocksAtStart,
              };
            }
          }
          activeCombo[victimPort] = undefined;
        }
      }
    }
  }

  return combos;
}
