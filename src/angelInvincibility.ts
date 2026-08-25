import { getSeatedPorts, type PortIndex, type Replay } from "@rmg-k/rmgr";

/** Action states corresponding to spawn / respawn platform protection. */
const RESPAWN_STATES = new Set([
  0x005, // Entry (spawn descent)
  0x007, // Revive1
  0x008, // Revive2
  0x009, // ReviveWait
]);

/** Duration of spawn invulnerability after dropping off the revival platform (120f = 2.0s). */
export const POST_DROP_INVULNERABILITY_FRAMES = 120;

export type AngelInvincibilityEventKind =
  "angel-entered" | "angel-avoid-success" | "angel-avoid-failure";

export interface AngelInvincibilityEvent {
  readonly frame: number;
  readonly frameIndex: number;
  readonly kind: AngelInvincibilityEventKind;
  /** Port that has angel / spawn protection. */
  readonly respawnPort: PortIndex;
  /** Opponent port attempting to avoid the invincible player. */
  readonly oppPort: PortIndex;
  /** Damage taken by the opponent during this angel protection window. */
  readonly damageTaken?: number;
  /** Hits taken by the opponent during this angel protection window. */
  readonly hitsTaken?: number;
}

export interface AngelInvincibilityStats {
  /** Times this player respawned with angel protection. */
  angelSituations: number;
  /** Times this player successfully dealt hits/damage while having angel protection. */
  angelHitsDealt: number;
  /** Total damage dealt while having angel protection. */
  angelDamageDealt: number;

  /** Times the opponent respawned with angel protection. */
  avoidSituations: number;
  /** Times this player successfully avoided the opponent (0 hits, 0 damage taken). */
  avoidSuccesses: number;
  /** Total damage taken while the opponent had angel protection. */
  damageTakenDuringOpponentAngel: number;
  /** Total hits taken while the opponent had angel protection. */
  hitsTakenDuringOpponentAngel: number;
}

/**
 * Computes all angel (spawn/respawn) invincibility events in chronological order.
 * Tracks the platform descent/wait and the subsequent 120-frame (2-second)
 * post-drop spawn invincibility window.
 */
export function computeAngelInvincibilityEvents(
  replay: Replay,
): AngelInvincibilityEvent[] {
  const events: AngelInvincibilityEvent[] = [];
  const seated = getSeatedPorts(replay);
  if (seated.length !== 2) return events;

  const [portA, portB] = seated as [PortIndex, PortIndex];

  for (const respawnPort of seated) {
    const oppPort = respawnPort === portA ? portB : portA;
    let inPlatform = false;
    let startIdx = 0;

    for (let i = 0; i < replay.frames.length; i++) {
      const f = replay.frames[i];
      if (!f) continue;
      const pPost = f.ports[respawnPort]?.post;
      if (!pPost) continue;

      const isPlat = RESPAWN_STATES.has(pPost.actionStateId);

      if (isPlat && !inPlatform) {
        inPlatform = true;
        startIdx = i;

        events.push({
          frame: f.frame,
          frameIndex: i,
          kind: "angel-entered",
          respawnPort,
          oppPort,
        });
      } else if (!isPlat && inPlatform) {
        inPlatform = false;
        const dropIdx = i;
        const endIdx = Math.min(
          replay.frames.length - 1,
          dropIdx + POST_DROP_INVULNERABILITY_FRAMES,
        );
        const endFrame = replay.frames[endIdx]?.frame ?? f.frame;

        const oppDamageAtStart =
          replay.frames[startIdx]?.ports[oppPort]?.post?.damagePercent ?? 0;
        const oppDamageAtEnd =
          replay.frames[endIdx]?.ports[oppPort]?.post?.damagePercent ?? 0;
        const damageTaken = Math.max(0, oppDamageAtEnd - oppDamageAtStart);

        let hitsTaken = 0;
        let lastCombo: number | undefined;
        for (let j = startIdx; j <= endIdx; j++) {
          const oPost = replay.frames[j]?.ports[oppPort]?.post;
          if (!oPost) continue;
          if (
            (lastCombo === 0 || lastCombo === undefined) &&
            oPost.comboHitCount > 0
          ) {
            hitsTaken++;
          }
          lastCombo = oPost.comboHitCount;
        }

        const avoided = hitsTaken === 0 && damageTaken === 0;

        events.push({
          frame: endFrame,
          frameIndex: endIdx,
          kind: avoided ? "angel-avoid-success" : "angel-avoid-failure",
          respawnPort,
          oppPort,
          damageTaken,
          hitsTaken,
        });
      }
    }
  }

  events.sort((a, b) => a.frameIndex - b.frameIndex);
  return events;
}

/**
 * Computes aggregate Angel Invincibility statistics from the perspective of `port`.
 */
export function computeAngelInvincibilityStats(
  events: readonly AngelInvincibilityEvent[],
  port: PortIndex,
): AngelInvincibilityStats {
  let angelSituations = 0;
  let angelHitsDealt = 0;
  let angelDamageDealt = 0;

  let avoidSituations = 0;
  let avoidSuccesses = 0;
  let damageTakenDuringOpponentAngel = 0;
  let hitsTakenDuringOpponentAngel = 0;

  for (const ev of events) {
    if (ev.kind === "angel-entered") {
      if (ev.respawnPort === port) {
        angelSituations++;
      } else if (ev.oppPort === port) {
        avoidSituations++;
      }
    } else if (
      ev.kind === "angel-avoid-success" ||
      ev.kind === "angel-avoid-failure"
    ) {
      if (ev.respawnPort === port) {
        if (ev.kind === "angel-avoid-failure") {
          angelHitsDealt += ev.hitsTaken ?? 1;
          angelDamageDealt += ev.damageTaken ?? 0;
        }
      } else if (ev.oppPort === port) {
        if (ev.kind === "angel-avoid-success") {
          avoidSuccesses++;
        } else {
          damageTakenDuringOpponentAngel += ev.damageTaken ?? 0;
          hitsTakenDuringOpponentAngel += ev.hitsTaken ?? 1;
        }
      }
    }
  }

  return {
    angelSituations,
    angelHitsDealt,
    angelDamageDealt,
    avoidSituations,
    avoidSuccesses,
    damageTakenDuringOpponentAngel,
    hitsTakenDuringOpponentAngel,
  };
}
