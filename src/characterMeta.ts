import {
  ActionStateId,
  getSeatedPorts,
  isJigglypuffCharacter,
  isNessCharacter,
  isShieldBreakState,
  isShieldStunState,
  isYoshiCharacter,
  type PortIndex,
  type Replay,
} from "@rmg-k/rmgr";
import { getCharacterIconicColor } from "./characterSizes.js";

export {
  isJigglypuffCharacter,
  isNessCharacter,
  isYoshiCharacter,
  getCharacterIconicColor,
};

export function hasCharacterMeta(
  characterId: number,
  goodName?: string,
): boolean {
  return (
    isJigglypuffCharacter(characterId, goodName) ||
    isNessCharacter(characterId, goodName) ||
    isYoshiCharacter(characterId, goodName)
  );
}

export type JigglypuffFThrowEventKind =
  "fthrow-entered" | "fthrow-success" | "fthrow-failure";

export interface JigglypuffFThrowEvent {
  readonly frame: number;
  readonly frameIndex: number;
  readonly kind: JigglypuffFThrowEventKind;
  readonly puffPort: PortIndex;
  readonly victimPort: PortIndex;
  readonly followupHits?: number;
}

export interface JigglypuffFThrowStats {
  readonly totalThrows: number;
  readonly followupSuccesses: number;
  readonly noFollowups: number;
  readonly followupRate: number | null;
}

/** Grace window in frames (0.5 seconds at 60 FPS) after combo counter resets. */
export const FTHROW_GRACE_WINDOW_FRAMES = 30;

/**
 * Detects all Jigglypuff Forward Throw (ThrowF: 0x0a9) events and tracks whether
 * Puff follows up with another hit or drops the combo.
 * If a hit lands within 0.5s (30 frames) after the combo counter resets, it is still counted.
 */
export function computeJigglypuffFThrowEvents(
  replay: Replay,
): JigglypuffFThrowEvent[] {
  const events: JigglypuffFThrowEvent[] = [];
  const seated = getSeatedPorts(replay);
  if (seated.length !== 2) return events;

  const [port0, port1] = seated as [PortIndex, PortIndex];

  for (const puffPort of [port0, port1]) {
    const charId = replay.gameStart.ports[puffPort]?.characterId;
    if (!isJigglypuffCharacter(charId ?? -1)) continue;

    const oppPort = puffPort === port0 ? port1 : port0;
    let inThrowSequence = false;
    let throwAnimationActive = false;
    let baseComboCount = 0;
    let resetFrame: number | null = null;
    let lastOppDamage = 0;

    for (let f = 0; f < replay.frames.length; f++) {
      const puffPost = replay.frames[f]?.ports[puffPort]?.post;
      const oppPost = replay.frames[f]?.ports[oppPort]?.post;
      if (!puffPost || !oppPost) continue;

      const isThrowF = puffPost.actionStateId === ActionStateId.ThrowF;

      if (isThrowF && !throwAnimationActive) {
        throwAnimationActive = true;
        inThrowSequence = true;
        resetFrame = null;
        baseComboCount = Math.max(1, oppPost.comboHitCount);
        lastOppDamage = oppPost.damagePercent;

        events.push({
          frame: f,
          frameIndex: f,
          kind: "fthrow-entered",
          puffPort,
          victimPort: oppPort,
        });
      } else if (throwAnimationActive && !isThrowF) {
        throwAnimationActive = false;
        // The throw animation ended; update baseComboCount with the throw's final hit count
        baseComboCount = Math.max(baseComboCount, oppPost.comboHitCount);
        lastOppDamage = oppPost.damagePercent;
      }

      if (inThrowSequence) {
        // Direct combo continuation (combo hit count incremented while active)
        if (oppPost.comboHitCount > baseComboCount) {
          events.push({
            frame: f,
            frameIndex: f,
            kind: "fthrow-success",
            puffPort,
            victimPort: oppPort,
            followupHits: oppPost.comboHitCount,
          });
          inThrowSequence = false;
          resetFrame = null;
        } else if (!throwAnimationActive) {
          if (oppPost.comboHitCount === 0) {
            if (resetFrame === null) {
              resetFrame = f;
            } else {
              // During the grace window: check if opponent received a new hit / damage from Puff
              if (
                oppPost.comboHitCount > 0 ||
                oppPost.damagePercent > lastOppDamage
              ) {
                events.push({
                  frame: f,
                  frameIndex: f,
                  kind: "fthrow-success",
                  puffPort,
                  victimPort: oppPort,
                  followupHits: oppPost.comboHitCount || 1,
                });
                inThrowSequence = false;
                resetFrame = null;
              } else if (f - resetFrame >= FTHROW_GRACE_WINDOW_FRAMES) {
                events.push({
                  frame: f,
                  frameIndex: f,
                  kind: "fthrow-failure",
                  puffPort,
                  victimPort: oppPort,
                });
                inThrowSequence = false;
                resetFrame = null;
              }
            }
          } else if (resetFrame !== null) {
            // Combo counter became > 0 during the grace window
            events.push({
              frame: f,
              frameIndex: f,
              kind: "fthrow-success",
              puffPort,
              victimPort: oppPort,
              followupHits: oppPost.comboHitCount,
            });
            inThrowSequence = false;
            resetFrame = null;
          }
        }
      }

      lastOppDamage = oppPost.damagePercent;
    }

    if (inThrowSequence && resetFrame !== null) {
      // Replay ended during grace window without hit
      events.push({
        frame: replay.frames.length - 1,
        frameIndex: replay.frames.length - 1,
        kind: "fthrow-failure",
        puffPort,
        victimPort: oppPort,
      });
    }
  }

  return events.sort((a, b) => a.frameIndex - b.frameIndex);
}

export function computeJigglypuffFThrowStats(
  events: JigglypuffFThrowEvent[],
  puffPort: PortIndex,
): JigglypuffFThrowStats {
  const portEvents = events.filter((e) => e.puffPort === puffPort);
  const totalThrows = portEvents.filter(
    (e) => e.kind === "fthrow-entered",
  ).length;
  const followupSuccesses = portEvents.filter(
    (e) => e.kind === "fthrow-success",
  ).length;
  const noFollowups = portEvents.filter(
    (e) => e.kind === "fthrow-failure",
  ).length;

  const resolved = followupSuccesses + noFollowups;
  const followupRate =
    resolved > 0 ? (followupSuccesses / resolved) * 100 : null;

  return {
    totalThrows,
    followupSuccesses,
    noFollowups,
    followupRate,
  };
}

export interface JigglypuffFThrowSituation {
  readonly enteredFrameIndex: number;
  readonly outcomeFrameIndex: number;
  readonly puffPort: PortIndex;
  readonly victimPort: PortIndex;
  readonly followupHits?: number;
  readonly outcome: "success" | "failure" | "open";
}

export function getJigglypuffFThrowSituations(
  events: JigglypuffFThrowEvent[],
  puffPort: PortIndex,
): JigglypuffFThrowSituation[] {
  const situations: JigglypuffFThrowSituation[] = [];
  const portEvents = events.filter((e) => e.puffPort === puffPort);

  let currentEntered: JigglypuffFThrowEvent | null = null;

  for (const ev of portEvents) {
    if (ev.kind === "fthrow-entered") {
      if (currentEntered) {
        situations.push({
          enteredFrameIndex: currentEntered.frameIndex,
          outcomeFrameIndex: ev.frameIndex,
          puffPort: currentEntered.puffPort,
          victimPort: currentEntered.victimPort,
          followupHits: 0,
          outcome: "open",
        });
      }
      currentEntered = ev;
    } else if (ev.kind === "fthrow-success" || ev.kind === "fthrow-failure") {
      if (currentEntered) {
        situations.push({
          enteredFrameIndex: currentEntered.frameIndex,
          outcomeFrameIndex: ev.frameIndex,
          puffPort: currentEntered.puffPort,
          victimPort: currentEntered.victimPort,
          followupHits: ev.followupHits ?? 0,
          outcome: ev.kind === "fthrow-success" ? "success" : "failure",
        });
        currentEntered = null;
      }
    }
  }

  if (currentEntered) {
    situations.push({
      enteredFrameIndex: currentEntered.frameIndex,
      outcomeFrameIndex: currentEntered.frameIndex,
      puffPort: currentEntered.puffPort,
      victimPort: currentEntered.victimPort,
      followupHits: 0,
      outcome: "open",
    });
  }

  return situations;
}

export type ShieldPressureEventKind =
  "shield-pressure-entered" | "shield-break" | "shield-grab" | "shield-escape";

export interface ShieldPressureSituation {
  readonly enteredFrameIndex: number;
  readonly outcomeFrameIndex: number;
  readonly attackerPort: PortIndex;
  readonly defenderPort: PortIndex;
  readonly hitsOnShield: number;
  readonly outcome: "shield-break" | "shield-grab" | "shield-escape" | "open";
}

export function getShieldPressureSituations(
  events: ShieldPressureEvent[],
  attackerPort: PortIndex,
): ShieldPressureSituation[] {
  const situations: ShieldPressureSituation[] = [];
  const portEvents = events.filter((e) => e.attackerPort === attackerPort);

  let currentEntered: ShieldPressureEvent | null = null;

  for (const ev of portEvents) {
    if (ev.kind === "shield-pressure-entered") {
      if (currentEntered) {
        situations.push({
          enteredFrameIndex: currentEntered.frameIndex,
          outcomeFrameIndex: ev.frameIndex,
          attackerPort: currentEntered.attackerPort,
          defenderPort: currentEntered.defenderPort,
          hitsOnShield: currentEntered.hitsOnShield ?? 2,
          outcome: "open",
        });
      }
      currentEntered = ev;
    } else if (
      ev.kind === "shield-break" ||
      ev.kind === "shield-grab" ||
      ev.kind === "shield-escape"
    ) {
      if (currentEntered) {
        situations.push({
          enteredFrameIndex: currentEntered.frameIndex,
          outcomeFrameIndex: ev.frameIndex,
          attackerPort: currentEntered.attackerPort,
          defenderPort: currentEntered.defenderPort,
          hitsOnShield: ev.hitsOnShield ?? currentEntered.hitsOnShield ?? 2,
          outcome: ev.kind,
        });
        currentEntered = null;
      }
    }
  }

  if (currentEntered) {
    situations.push({
      enteredFrameIndex: currentEntered.frameIndex,
      outcomeFrameIndex: currentEntered.frameIndex,
      attackerPort: currentEntered.attackerPort,
      defenderPort: currentEntered.defenderPort,
      hitsOnShield: currentEntered.hitsOnShield ?? 2,
      outcome: "open",
    });
  }

  return situations;
}

export interface ShieldPressureEvent {
  readonly frame: number;
  readonly frameIndex: number;
  readonly kind: ShieldPressureEventKind;
  readonly attackerPort: PortIndex;
  readonly defenderPort: PortIndex;
  readonly hitsOnShield?: number;
}

export interface ShieldPressureStats {
  readonly totalPressures: number; // 2+ confirmed hits on shield
  readonly shieldBreaks: number;
  readonly grabs: number;
  readonly neither: number;
  readonly shieldBreakRate: number | null;
  readonly grabRate: number | null;
  readonly conversionRate: number | null;
}

export const SHIELD_PRESSURE_GRACE_WINDOW_FRAMES = 30; // 0.5s at 60fps

/**
 * Tracks Shield Pressure for Ness and Yoshi:
 * Specifically detects multi-hit shield attacks (>= 2 confirmed hits on shield)
 * and resolves outcomes:
 * 1. Shield Break (0x09e - 0x0a2)
 * 2. Grab (Attacker lands a grab during or within 0.5s of shield pressure)
 * 3. Neither (Opponent escapes / resets safely)
 */
export function computeShieldPressureEvents(
  replay: Replay,
): ShieldPressureEvent[] {
  const events: ShieldPressureEvent[] = [];
  const seated = getSeatedPorts(replay);
  if (seated.length !== 2) return events;

  const [port0, port1] = seated as [PortIndex, PortIndex];

  for (const attackerPort of [port0, port1]) {
    const charId = replay.gameStart.ports[attackerPort]?.characterId;
    if (!isNessCharacter(charId ?? -1) && !isYoshiCharacter(charId ?? -1)) {
      continue;
    }

    const defenderPort = attackerPort === port0 ? port1 : port0;
    let inPressure = false;
    let hitsOnShield = 0;
    let lastDefenderState = 0;
    let qualifiedTwoHits = false;
    let lastStunFrame = 0;
    let resolved = false;

    for (let f = 0; f < replay.frames.length; f++) {
      const attPost = replay.frames[f]?.ports[attackerPort]?.post;
      const defPost = replay.frames[f]?.ports[defenderPort]?.post;
      if (!attPost || !defPost) continue;

      const defInShieldStun = isShieldStunState(defPost.actionStateId);
      const defInShieldBreak = isShieldBreakState(defPost.actionStateId);
      const attInGrab =
        (attPost.actionStateId >= ActionStateId.Grab &&
          attPost.actionStateId <= ActionStateId.ThrowB) ||
        (defPost.actionStateId >= ActionStateId.CapturePulled &&
          defPost.actionStateId <= 0x0b3) ||
        (defPost.actionStateId >= 0x0b9 && defPost.actionStateId <= 0x0bb);

      // Detect hit on shield
      if (defInShieldStun) {
        if (!inPressure) {
          inPressure = true;
          hitsOnShield = 1;
          qualifiedTwoHits = false;
          resolved = false;
        } else {
          // Subsequent hit in sequence: 0x9b with actionFrameCounter 0 or transition back to 0x9b
          if (lastDefenderState !== 0x09b || defPost.actionFrameCounter === 0) {
            hitsOnShield++;
            if (hitsOnShield >= 2 && !qualifiedTwoHits) {
              qualifiedTwoHits = true;
              events.push({
                frame: f,
                frameIndex: f,
                kind: "shield-pressure-entered",
                attackerPort,
                defenderPort,
                hitsOnShield,
              });
            }
          }
        }
        lastStunFrame = f;
      }

      if (inPressure && qualifiedTwoHits && !resolved) {
        if (defInShieldBreak) {
          events.push({
            frame: f,
            frameIndex: f,
            kind: "shield-break",
            attackerPort,
            defenderPort,
            hitsOnShield,
          });
          resolved = true;
          inPressure = false;
        } else if (
          attInGrab &&
          f - lastStunFrame <= SHIELD_PRESSURE_GRACE_WINDOW_FRAMES
        ) {
          events.push({
            frame: f,
            frameIndex: f,
            kind: "shield-grab",
            attackerPort,
            defenderPort,
            hitsOnShield,
          });
          resolved = true;
          inPressure = false;
        } else if (f - lastStunFrame > SHIELD_PRESSURE_GRACE_WINDOW_FRAMES) {
          events.push({
            frame: f,
            frameIndex: f,
            kind: "shield-escape",
            attackerPort,
            defenderPort,
            hitsOnShield,
          });
          resolved = true;
          inPressure = false;
        }
      } else if (inPressure && !qualifiedTwoHits) {
        if (f - lastStunFrame > SHIELD_PRESSURE_GRACE_WINDOW_FRAMES) {
          inPressure = false;
        }
      }

      lastDefenderState = defPost.actionStateId;
    }

    if (inPressure && qualifiedTwoHits && !resolved) {
      events.push({
        frame: replay.frames.length - 1,
        frameIndex: replay.frames.length - 1,
        kind: "shield-escape",
        attackerPort,
        defenderPort,
        hitsOnShield,
      });
    }
  }

  return events.sort((a, b) => a.frameIndex - b.frameIndex);
}

export function computeShieldPressureStats(
  events: ShieldPressureEvent[],
  attackerPort: PortIndex,
): ShieldPressureStats {
  const portEvents = events.filter((e) => e.attackerPort === attackerPort);
  const totalPressures = portEvents.filter(
    (e) => e.kind === "shield-pressure-entered",
  ).length;
  const shieldBreaks = portEvents.filter(
    (e) => e.kind === "shield-break",
  ).length;
  const grabs = portEvents.filter((e) => e.kind === "shield-grab").length;
  const neither = portEvents.filter((e) => e.kind === "shield-escape").length;

  const shieldBreakRate =
    totalPressures > 0 ? (shieldBreaks / totalPressures) * 100 : null;
  const grabRate = totalPressures > 0 ? (grabs / totalPressures) * 100 : null;
  const conversionRate =
    totalPressures > 0 ? ((shieldBreaks + grabs) / totalPressures) * 100 : null;

  return {
    totalPressures,
    shieldBreaks,
    grabs,
    neither,
    shieldBreakRate,
    grabRate,
    conversionRate,
  };
}
