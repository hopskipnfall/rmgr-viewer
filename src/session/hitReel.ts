import type { PortIndex, Replay } from "@rmg-k/rmgr";
import {
  openingMove,
  type NeutralHitEvent,
  type NeutralInteractionOutcome,
  type NeutralOpeningReason,
} from "../neutralHits.js";
import type { PlaylistClip } from "../playlist.js";

/**
 * Every time the player got opened up in a session, in order: the review list for "why did I
 * get hit, and what should I have done instead". Built from the same neutral-opening events the
 * match view's Neutral panel lists, so a note written here is the note anchored to that row there.
 */

/** Distinct actions shown for "what you were doing", most recent last. */
const LEAD_IN_ACTIONS = 3;
/** How far back to look for those actions (0.75 s). */
const LEAD_IN_FRAMES = 45;
/** Clip context: enough before the hit to see the approach, and a beat after the punish ends. */
const CLIP_PRE_ROLL_FRAMES = 120;
const CLIP_POST_ROLL_FRAMES = 45;

/** Standing around, walking, crouching: not worth listing as something you "did". */
const IDLE_ACTIONS = new Set([0x00a, 0x00b, 0x00c, 0x00d, 0x01c, 0x01d, 0x01e]);

export interface HitReelEntry {
  readonly gameId: string;
  /** 1-based position of the game within the session. */
  readonly gameNumber: number;
  /** Frame index of the opening hit or grab - also the anchor for match notes. */
  readonly frameIndex: number;
  /** Where the punish ended (reset, KO, or you hit back). */
  readonly endFrameIndex: number;
  readonly reason: NeutralOpeningReason;
  readonly hitType: "attack" | "grab";
  /** Your damage just before the hit. */
  readonly damageBefore: number;
  /** Damage the whole punish did to you. */
  readonly damageTaken: number;
  readonly hitsTaken: number;
  readonly outcome: NeutralInteractionOutcome | null;
  readonly convertedToEdgeGuard: boolean;
  readonly convertedToLedgeTrap: boolean;
  readonly convertedToKill: boolean;
  /** The opponent's action state on the hit frame: the move that opened you up. */
  readonly opponentMove: number | null;
  readonly opponentCharacterId: number;
  /** Your last few distinct non-idle action states before the hit, oldest first. */
  readonly yourLeadIn: readonly number[];
  readonly yourCharacterId: number;
  /** Playback range for this hit, clamped to the game. */
  readonly clipStartFrameIndex: number;
  readonly clipEndFrameIndex: number;
}

function leadIn(replay: Replay, frameIndex: number, port: PortIndex): number[] {
  const actions: number[] = [];
  for (
    let f = frameIndex - 1;
    f >= Math.max(0, frameIndex - LEAD_IN_FRAMES);
    f--
  ) {
    const a = replay.frames[f]?.ports[port]?.state?.actionStateId;
    if (a === undefined || IDLE_ACTIONS.has(a)) continue;
    if (actions[0] === a) continue;
    actions.unshift(a);
    if (actions.length === LEAD_IN_ACTIONS) break;
  }
  return actions;
}

/** The hit-reel entries for one game: every opening where `yourPort` was the one opened up. */
export function hitReelEntriesForGame(
  replay: Replay,
  events: readonly NeutralHitEvent[],
  gameId: string,
  gameNumber: number,
  yourPort: PortIndex,
): HitReelEntry[] {
  return events
    .filter((e) => e.victimPort === yourPort)
    .map((e) => {
      const you =
        replay.frames[Math.max(0, e.frameIndex - 1)]?.ports[yourPort]?.state;
      const them = replay.frames[e.frameIndex]?.ports[e.attackerPort]?.state;
      const endFrameIndex = e.endFrameIndex ?? e.frameIndex;
      return {
        gameId,
        gameNumber,
        frameIndex: e.frameIndex,
        endFrameIndex,
        reason: e.reason,
        hitType: e.hitType,
        damageBefore: Math.round(you?.damagePercent ?? 0),
        damageTaken: Math.round(e.totalDamageDealt ?? 0),
        hitsTaken: e.totalHitsLanded ?? 0,
        outcome: e.outcome ?? null,
        convertedToEdgeGuard: !!e.convertedToEdgeGuard,
        convertedToLedgeTrap: !!e.convertedToLedgeTrap,
        convertedToKill: !!e.convertedToKill,
        opponentMove: openingMove(replay, e.frameIndex, e.attackerPort),
        opponentCharacterId: them?.characterId ?? 0,
        yourLeadIn: leadIn(replay, e.frameIndex, yourPort),
        yourCharacterId: you?.characterId ?? 0,
        clipStartFrameIndex: Math.max(0, e.frameIndex - CLIP_PRE_ROLL_FRAMES),
        clipEndFrameIndex: Math.min(
          replay.frames.length - 1,
          endFrameIndex + CLIP_POST_ROLL_FRAMES,
        ),
      };
    });
}

/** A punish worth reviewing first: it took a stock, or at least this much damage. */
export const BIG_PUNISH_DAMAGE = 30;

export function isBigPunish(entry: HitReelEntry): boolean {
  return (
    entry.convertedToKill ||
    entry.outcome === "ko" ||
    entry.damageTaken >= BIG_PUNISH_DAMAGE
  );
}

export type HitReelSort = "chronological" | "costliest";

/** Orders entries for review. "costliest" puts stock losses first, then by damage taken. */
export function sortHitReel(
  entries: readonly HitReelEntry[],
  sort: HitReelSort,
): HitReelEntry[] {
  const chronological = [...entries].sort(
    (a, b) => a.gameNumber - b.gameNumber || a.frameIndex - b.frameIndex,
  );
  if (sort === "chronological") return chronological;
  return chronological.sort(
    (a, b) =>
      Number(b.convertedToKill) - Number(a.convertedToKill) ||
      b.damageTaken - a.damageTaken,
  );
}

/** One playlist clip per entry, with a pre-roll long enough to see what led to the hit. */
export function hitReelClips(
  entries: readonly HitReelEntry[],
  label: (entry: HitReelEntry) => string,
): PlaylistClip[] {
  return entries.map((e) => ({
    gameId: e.gameId,
    startFrameIndex: e.clipStartFrameIndex,
    endFrameIndex: e.clipEndFrameIndex,
    label: label(e),
  }));
}
