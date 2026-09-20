import { getSeatedPorts, type PortIndex, type Replay } from "@rmg-k/rmgr";
import { isHitstunState } from "./edgeGuard.js";
import {
  computeClassifiedSituations,
  type ClassifiedSituation,
} from "./classifiedSituations.js";
import {
  isShieldBreakActionState,
  isDizzyState,
  isSleepState,
  isProneState,
  isDownBoundState,
  isMissedTechState,
} from "./renderer/common/actionStates.js";

/** Ledge catch/wait states that cancel pending kill combo tracking. */
const LEDGE_GRAB_STATES = new Set([
  0x054, // CliffCatch
  0x055, // CliffWait
]);

/**
 * Action states where the player is captured/held/thrown by a grab -
 * the full contiguous 0xab-0xbc range, matching edgeGuard.ts's/
 * neutralHits.ts's CAPTURE_STATES (kept in sync by hand - see their own
 * comments). Confirmed 2026-09-20 against a real recording
 * (260916174623-nue-shido-8.rmgr, frame 1170): this set previously
 * omitted 0xbc (the victim's state for the full duration of a back
 * throw, here frames 1170-1187) along with several other IDs in this
 * range, which made isActionableInComboGap() treat an inescapable throw
 * as an 18-frame actionable "escape gap".
 */
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

export const DEAD_OR_RESPAWNING_STATES = new Set([
  0x000, 0x001, 0x002, 0x003, 0x004, 0x005, 0x007, 0x008, 0x009,
]);

/** Frames before combo start to seek to when jumping to a combo (1.0 s). */
export const COMBO_JUMP_LEAD_IN_FRAMES = 60;

/** Longest combo-meter reset (0.5 s) joinCombosAcrossGaps still treats as one combo. */
export const COMBO_GAP_MAX_FRAMES = 30;

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

/** Any combo, killing or not (computeCombos). */
export interface Combo extends KillCombo {
  /** Whether the combo took the stock - see computeCombos for exactly when that's credited. */
  readonly killed: boolean;
  /** The last frame the victim was still being comboed. Gaps between combos are measured from here. */
  readonly comboEndFrame: number;
  readonly comboEndFrameIndex: number;
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
  lastComboFrame: number;
  lastComboFrameIndex: number;
  lastComboDamage: number;
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
  comboEndFrame: number;
  comboEndFrameIndex: number;
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

/** The victim's classified recovery situation opening at (about) the frame a combo's hitstun
 * ended, among those matching `matches`, or null. */
function findSituationAtComboEnd(
  situations: readonly ClassifiedSituation[],
  victimPort: PortIndex,
  aroundFrameIndex: number,
  matches: (situation: ClassifiedSituation) => boolean,
): ClassifiedSituation | null {
  for (const situation of situations) {
    if (situation.recoveringPort !== victimPort) continue;
    if (!matches(situation)) continue;
    if (
      Math.abs(situation.enteredFrameIndex - aroundFrameIndex) <=
      HOPELESS_MATCH_FRAME_TOLERANCE
    ) {
      return situation;
    }
  }
  return null;
}

function findHopelessKillSituation(
  situations: readonly ClassifiedSituation[],
  victimPort: PortIndex,
  aroundFrameIndex: number,
): ClassifiedSituation | null {
  return findSituationAtComboEnd(
    situations,
    victimPort,
    aroundFrameIndex,
    (s) => s.category === "hopeless" && s.resolutionKind === "recovery-failure",
  );
}

/**
 * The classifier says the victim still had a real way back when the combo ended (category
 * "contestable": the stage or the ledge was reachable). Per the user (2026-09-15): if they then
 * die anyway, "it's a combo that ultimately converted to a kill, but the combo did not KO" -- it
 * still counts as a successful edge-guard KO in classifiedSituations.ts, but not as a kill combo
 * (e.g. 260828205834-nue-Kurabba-29 combo at frame 4368: Pikachu botched a recovery the
 * classifier rated "reaches-stage", with no further pressure from Kirby).
 */
function findContestableSituation(
  situations: readonly ClassifiedSituation[],
  victimPort: PortIndex,
  aroundFrameIndex: number,
): ClassifiedSituation | null {
  return findSituationAtComboEnd(
    situations,
    victimPort,
    aroundFrameIndex,
    (s) => s.category === "contestable",
  );
}

/**
 * Extracts all "Kill Combos" from a match replay.
 *
 * A Kill Combo is defined as:
 * - A continuous combo sequence with at least 3 hits (`hitCount >= 3`) that EITHER:
 *   (a) Outright takes the opponent's stock during the combo / hitstun, OR
 *   (b) Ends offstage / in air and the opponent dies without ever landing on stage/platform,
 *       grabbing ledge, or taking further damage from any other exchange -- ONLY where the
 *       recovery classifier has no opinion (unsupported character/stage). Where it rates the
 *       position "contestable" (stage or ledge still reachable), the combo is NOT a kill combo
 *       even if they die anyway (see findContestableSituation), OR
 *   (c) Ends with the recovery classifier confirming the resulting position was unrecoverable
 *       (category "hopeless") AND the victim did in fact die -- credited immediately rather than
 *       via (b)'s landed/ledge/damage tracking, which doesn't know about recovery physics and can
 *       be fooled by intervening events. Per the user (2026-09-11): "knocked so that they can't
 *       recover (not merely hitting the blast zone)." Only applies where the classifier has an
 *       opinion at all (Dream Land, one of its 9 supported characters) -- everywhere else, (b)'s
 *       existing behavior is unchanged.
 */
export function computeKillCombos(replay: Replay): KillCombo[] {
  return scanCombos(replay, 3).filter((c) => c.killed);
}

/**
 * Every true combo (continuous combo meter) with at least `minHits` hits, killing or not, in start
 * order. `killed` follows exactly computeKillCombos' (a)/(b)/(c) rules; a combo that didn't kill
 * ends on its last comboed frame (the victim then landed, grabbed the ledge, got hit by a separate
 * exchange, or the combo meter reset). Used by the clip search, which also wants short strings so
 * joinCombosAcrossGaps can join them.
 */
export function computeCombos(replay: Replay, minHits = 1): Combo[] {
  return scanCombos(replay, minHits).sort(
    (a, b) => a.startFrameIndex - b.startFrameIndex,
  );
}

/**
 * Joins each attacker's consecutive combos on the same victim when the combo meter reset for at
 * most `maxGapFrames` (0.5 s by default) and the victim didn't combo the attacker back in between
 * -- "combos" in the looser sense players use, where a dropped hit and a quick re-hit still count.
 * Hit counts add up; the joined combo killed if its last part did.
 */
export function joinCombosAcrossGaps(
  combos: readonly Combo[],
  maxGapFrames: number = COMBO_GAP_MAX_FRAMES,
): Combo[] {
  const sorted = [...combos].sort((a, b) => a.startFrame - b.startFrame);
  const joined: Combo[] = [];
  const openIndexByVictim = new Map<PortIndex, number>();
  const lastComboedAt = new Map<PortIndex, number>();

  for (const combo of sorted) {
    const openIndex = openIndexByVictim.get(combo.victimPort);
    const prev = openIndex !== undefined ? joined[openIndex] : undefined;
    const attackerComboedSince =
      prev !== undefined &&
      (lastComboedAt.get(combo.attackerPort) ?? -Infinity) > prev.comboEndFrame;
    if (
      prev !== undefined &&
      openIndex !== undefined &&
      prev.attackerPort === combo.attackerPort &&
      !prev.killed &&
      combo.startFrame - prev.comboEndFrame <= maxGapFrames &&
      !attackerComboedSince
    ) {
      joined[openIndex] = {
        ...prev,
        endFrame: combo.endFrame,
        endFrameIndex: combo.endFrameIndex,
        comboEndFrame: combo.comboEndFrame,
        comboEndFrameIndex: combo.comboEndFrameIndex,
        hitCount: prev.hitCount + combo.hitCount,
        endDamage: combo.endDamage,
        damageDealt: Math.max(0, combo.endDamage - prev.startDamage),
        killed: combo.killed,
      };
    } else {
      openIndexByVictim.set(combo.victimPort, joined.length);
      joined.push(combo);
    }
    lastComboedAt.set(combo.victimPort, combo.startFrame);
  }
  return joined;
}

/**
 * Checks whether a fighter has agency (is actionable) during a gap within a joined combo.
 * A frame is actionable when the victim:
 * 1. Is not in hitstun (!isHitstunState)
 * 2. Is not dead or respawning (DEAD_OR_RESPAWNING_STATES)
 * 3. Is not captured / grabbed / thrown (CAPTURE_STATES)
 * 4. Is not shield-broken, dizzy, or asleep
 * 5. Is not prone, downed, or in missed tech lag (excluded because knockdown locks player out of inputs)
 */
export function isActionableInComboGap(
  actionStateId: number,
  hitstunCounter: number = 0,
): boolean {
  if (isHitstunState(actionStateId, hitstunCounter)) return false;
  if (DEAD_OR_RESPAWNING_STATES.has(actionStateId)) return false;
  if (CAPTURE_STATES.has(actionStateId)) return false;
  if (
    isShieldBreakActionState(actionStateId) ||
    isDizzyState(actionStateId) ||
    isSleepState(actionStateId)
  ) {
    return false;
  }
  if (
    isProneState(actionStateId) ||
    isDownBoundState(actionStateId) ||
    isMissedTechState(actionStateId)
  ) {
    return false;
  }
  return true;
}

export interface ComboEscapeGap {
  readonly victimPort: PortIndex;
  readonly attackerPort: PortIndex;
  readonly gapStartFrame: number;
  readonly gapEndFrame: number;
  readonly gapStartFrameIndex: number;
  readonly gapEndFrameIndex: number;
  readonly actionableFrameIndices: readonly number[];
  readonly actionableFrameCount: number;
  readonly anchorWorldX: number;
  readonly anchorWorldY: number;
  readonly anchorFacingRight: boolean;
}

/**
 * Finds all actionable escape windows strictly inside the gaps of joined combos.
 * Only applies to merged combos where joinCombosAcrossGaps joined two native segments separated by <= maxGapFrames.
 * Gaps with 0 actionable frames (e.g. victim was locked in a grab or sleep) are omitted.
 */
export function computeComboEscapeGaps(
  replay: Replay,
  maxGapFrames: number = COMBO_GAP_MAX_FRAMES,
): ComboEscapeGap[] {
  const combos = computeCombos(replay, 1);
  const sorted = [...combos].sort((a, b) => a.startFrame - b.startFrame);
  const joined: Combo[] = [];
  const openIndexByVictim = new Map<PortIndex, number>();
  const lastComboedAt = new Map<PortIndex, number>();
  const gaps: ComboEscapeGap[] = [];

  for (const combo of sorted) {
    const openIndex = openIndexByVictim.get(combo.victimPort);
    const prev = openIndex !== undefined ? joined[openIndex] : undefined;
    const attackerComboedSince =
      prev !== undefined &&
      (lastComboedAt.get(combo.attackerPort) ?? -Infinity) > prev.comboEndFrame;

    if (
      prev !== undefined &&
      openIndex !== undefined &&
      prev.attackerPort === combo.attackerPort &&
      !prev.killed &&
      combo.startFrame - prev.comboEndFrame <= maxGapFrames &&
      !attackerComboedSince
    ) {
      // Gap strictly between prev.comboEndFrameIndex and combo.startFrameIndex (exclusive on both ends)
      const gapStartFrameIndex = prev.comboEndFrameIndex + 1;
      const gapEndFrameIndex = combo.startFrameIndex - 1;
      const actionableFrameIndices: number[] = [];

      for (let f = gapStartFrameIndex; f <= gapEndFrameIndex; f++) {
        const state = replay.frames[f]?.ports[combo.victimPort]?.state;
        if (state) {
          if (
            isActionableInComboGap(
              state.actionStateId,
              state.hitstunCounter ?? 0,
            )
          ) {
            actionableFrameIndices.push(f);
          }
        }
      }

      if (actionableFrameIndices.length > 0) {
        const firstActionableIndex =
          actionableFrameIndices[0] ?? gapStartFrameIndex;
        const anchorState =
          replay.frames[firstActionableIndex]?.ports[combo.victimPort]?.state;
        const anchorWorldX = anchorState?.positionX ?? 0;
        const anchorWorldY = anchorState?.positionY ?? 0;
        const anchorFacingRight = (anchorState?.facingDirection ?? 1) > 0;

        gaps.push({
          victimPort: combo.victimPort,
          attackerPort: combo.attackerPort,
          gapStartFrame: prev.comboEndFrame + 1,
          gapEndFrame: combo.startFrame - 1,
          gapStartFrameIndex,
          gapEndFrameIndex,
          actionableFrameIndices,
          actionableFrameCount: actionableFrameIndices.length,
          anchorWorldX,
          anchorWorldY,
          anchorFacingRight,
        });
      }

      joined[openIndex] = {
        ...prev,
        endFrame: combo.endFrame,
        endFrameIndex: combo.endFrameIndex,
        comboEndFrame: combo.comboEndFrame,
        comboEndFrameIndex: combo.comboEndFrameIndex,
        hitCount: prev.hitCount + combo.hitCount,
        endDamage: combo.endDamage,
        damageDealt: Math.max(0, combo.endDamage - prev.startDamage),
        killed: combo.killed,
      };
    } else {
      openIndexByVictim.set(combo.victimPort, joined.length);
      joined.push(combo);
    }
    lastComboedAt.set(combo.victimPort, combo.startFrame);
  }

  return gaps;
}

type ComboStart = Pick<
  ActiveComboTracker,
  | "attackerPort"
  | "victimPort"
  | "startFrame"
  | "startFrameIndex"
  | "damageAtStart"
  | "maxComboHits"
>;

/**
 * The shared frame scan behind computeKillCombos and computeCombos. Kills are only tracked for
 * combos of at least `minHits` hits (computeKillCombos passes 3), and are pushed in the order
 * they're resolved, numbered 1, 2, 3... -- identical to the original kill-combo-only scan.
 * Combos that didn't kill are extra entries (comboIndex 0) that never affect the kills.
 */
function scanCombos(replay: Replay, minHits: number): Combo[] {
  const seated = getSeatedPorts(replay);
  if (seated.length !== 2) return [];

  const [portA, portB] = seated as [PortIndex, PortIndex];
  const combos: Combo[] = [];
  let comboCount = 0;

  const pushKill = (
    t: ComboStart,
    endFrame: number,
    endFrameIndex: number,
    endDamage: number,
    comboEndFrame: number,
    comboEndFrameIndex: number,
  ): void => {
    comboCount++;
    combos.push({
      id: `combo-${comboCount}-${t.startFrameIndex}`,
      comboIndex: comboCount,
      attackerPort: t.attackerPort,
      victimPort: t.victimPort,
      startFrame: t.startFrame,
      startFrameIndex: t.startFrameIndex,
      endFrame,
      endFrameIndex,
      jumpFrameIndex: Math.max(
        0,
        t.startFrameIndex - COMBO_JUMP_LEAD_IN_FRAMES,
      ),
      hitCount: t.maxComboHits,
      startDamage: t.damageAtStart,
      endDamage,
      damageDealt: Math.max(0, endDamage - t.damageAtStart),
      killed: true,
      comboEndFrame,
      comboEndFrameIndex,
    });
  };

  const pushNonKill = (
    t: ComboStart,
    comboEndFrame: number,
    comboEndFrameIndex: number,
    endDamage: number,
  ): void => {
    combos.push({
      id: `combo-nokill-${t.startFrameIndex}`,
      comboIndex: 0,
      attackerPort: t.attackerPort,
      victimPort: t.victimPort,
      startFrame: t.startFrame,
      startFrameIndex: t.startFrameIndex,
      endFrame: comboEndFrame,
      endFrameIndex: comboEndFrameIndex,
      jumpFrameIndex: Math.max(
        0,
        t.startFrameIndex - COMBO_JUMP_LEAD_IN_FRAMES,
      ),
      hitCount: t.maxComboHits,
      startDamage: t.damageAtStart,
      endDamage,
      damageDealt: Math.max(0, endDamage - t.damageAtStart),
      killed: false,
      comboEndFrame,
      comboEndFrameIndex,
    });
  };

  const settlePending = (pending: PendingLethalTracker): void =>
    pushNonKill(
      pending,
      pending.comboEndFrame,
      pending.comboEndFrameIndex,
      pending.lastComboDamage,
    );

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
          pushKill(
            pending,
            frameNumber,
            i,
            pending.lastComboDamage,
            pending.comboEndFrame,
            pending.comboEndFrameIndex,
          );
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
        // Case (c): Grabbed ledge
        // Case (d): Took additional damage from a separate exchange
        if (
          (victimPost.grounded && !inHitstun && !inCapture) ||
          LEDGE_GRAB_STATES.has(victimPost.actionStateId) ||
          victimPost.damagePercent > pending.lastComboDamage
        ) {
          settlePending(pending);
          pendingLethal[victimPort] = undefined;
        }
      }

      // 2. Active combo tracking
      const active = activeCombo[victimPort];

      if (isDeadOrRespawn) {
        if (active) {
          if (active.maxComboHits >= minHits) {
            pushKill(
              active,
              frameNumber,
              i,
              victimPost.damagePercent,
              frameNumber,
              i,
            );
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
          const stalePending = pendingLethal[victimPort];
          if (stalePending) settlePending(stalePending);
          pendingLethal[victimPort] = undefined;
          if (
            comboDroppedAndRestarted &&
            active &&
            active.maxComboHits >= minHits
          ) {
            pushNonKill(
              active,
              active.lastComboFrame,
              active.lastComboFrameIndex,
              active.lastComboDamage,
            );
          }

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
            lastComboFrame: frameNumber,
            lastComboFrameIndex: i,
            lastComboDamage: victimPost.damagePercent,
          };
        } else {
          active.maxComboHits = Math.max(active.maxComboHits, comboHits);
          if (comboHits > 0) {
            active.lastComboHitCount = comboHits;
          }
          active.lastComboFrame = frameNumber;
          active.lastComboFrameIndex = i;
          active.lastComboDamage = victimPost.damagePercent;

          // Check if stock was lost while directly in combo hitstun
          if (victimPost.stocksRemaining < active.stocksAtStart) {
            if (active.maxComboHits >= minHits) {
              pushKill(
                active,
                frameNumber,
                i,
                victimPost.damagePercent,
                frameNumber,
                i,
              );
            }
            activeCombo[victimPort] = undefined;
          }
        }
      } else {
        // Victim is no longer in hitstun/combo
        if (active) {
          if (active.maxComboHits >= minHits) {
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
              pushKill(
                active,
                replay.frames[hopelessSituation.resolutionFrameIndex]?.frame ??
                  frameNumber,
                hopelessSituation.resolutionFrameIndex,
                endDamage,
                active.lastComboFrame,
                active.lastComboFrameIndex,
              );
            } else if (
              findContestableSituation(classifiedSituations, victimPort, i)
            ) {
              // The classifier says they could still get back: whatever happens next, this
              // combo didn't KO (see findContestableSituation).
              pushNonKill(
                active,
                active.lastComboFrame,
                active.lastComboFrameIndex,
                active.lastComboDamage,
              );
            } else {
              // No classifier opinion (unsupported character/stage): fall back to pending lethal
              // tracking to see if they die without landing/ledge/damage
              pendingLethal[victimPort] = {
                attackerPort: active.attackerPort,
                victimPort: active.victimPort,
                startFrame: active.startFrame,
                startFrameIndex: active.startFrameIndex,
                damageAtStart: active.damageAtStart,
                lastComboDamage: victimPost.damagePercent,
                maxComboHits: active.maxComboHits,
                stocksAtStart: active.stocksAtStart,
                comboEndFrame: active.lastComboFrame,
                comboEndFrameIndex: active.lastComboFrameIndex,
              };
            }
          }
          activeCombo[victimPort] = undefined;
        }
      }
    }
  }

  // Replay over: whatever is still open never killed.
  for (const port of [portA, portB]) {
    const pending = pendingLethal[port];
    if (pending) settlePending(pending);
    const active = activeCombo[port];
    if (active && active.maxComboHits >= minHits) {
      pushNonKill(
        active,
        active.lastComboFrame,
        active.lastComboFrameIndex,
        active.lastComboDamage,
      );
    }
  }

  return combos;
}
