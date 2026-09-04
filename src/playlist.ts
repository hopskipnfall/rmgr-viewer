import type { PortIndex, Replay } from "@rmg-k/rmgr";
import { computeEdgeGuardEvents, type EdgeGuardEvent } from "./edgeGuard.js";

/** One clip in a cross-game playlist: a specific game, a frame range, and a label for the clip list UI. */
export interface PlaylistClip {
  readonly gameId: string;
  readonly startFrameIndex: number;
  readonly endFrameIndex: number;
  readonly label: string;
}

/**
 * A world-coordinate box on Dream Land's right half (x >= 0) - see
 * startingAreaModal.ts, which is the only place these get drawn. Matched
 * against the recovering player's position at the moment their situation
 * opened, mirrored across x=0 so one drawn box covers both sides of the
 * stage.
 */
export interface StartingAreaBox {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

/** The "edge guards" search type's filters - see search/searchView.ts for how these get resolved from the UI into a per-game query. */
export interface EdgeGuardSearchCriteria {
  /** null = both outcomes. "success"/"failure" describe the edge-guard ATTEMPT, not the recovering player. */
  readonly result: "success" | "failure" | null;
  /** The edge-guarding port to match, or null for either port. */
  readonly port: PortIndex | null;
  /** The edge-guarding port's character at situation start, or null/undefined for any. */
  readonly playerCharacterId?: number | null;
  /** The recovering port's character at situation start, or null/undefined for any. */
  readonly opponentCharacterId?: number | null;
  /** The recovering port's jumpsRemaining at situation start, or null/undefined for any. */
  readonly jumpCount?: number | null;
  /** The recovering port's position at situation start must fall in this box or its mirror across x=0. null/undefined for anywhere. */
  readonly startingAreaBox?: StartingAreaBox | null;
}

/** Padding around each clip's actual event window, for context before/after the action. */
const PRE_ROLL_FRAMES = 60; // 1.0s @ 60fps
const POST_ROLL_FRAMES = 60; // 1.0s @ 60fps

function matchesEntryCriteria(
  replay: Replay,
  event: EdgeGuardEvent,
  criteria: EdgeGuardSearchCriteria,
): boolean {
  if (criteria.port !== null && event.edgeGuardingPort !== criteria.port) {
    return false;
  }

  const frame = replay.frames[event.frameIndex];
  const guarderPost = frame?.ports[event.edgeGuardingPort]?.state;
  const recovererPost = frame?.ports[event.recoveringPort]?.state;
  if (!guarderPost || !recovererPost) return false;

  if (
    criteria.playerCharacterId != null &&
    guarderPost.characterId !== criteria.playerCharacterId
  ) {
    return false;
  }
  if (
    criteria.opponentCharacterId != null &&
    recovererPost.characterId !== criteria.opponentCharacterId
  ) {
    return false;
  }
  if (
    criteria.jumpCount != null &&
    recovererPost.jumpsRemaining !== criteria.jumpCount
  ) {
    return false;
  }

  if (criteria.startingAreaBox) {
    const { minX, maxX, minY, maxY } = criteria.startingAreaBox;
    const x = recovererPost.positionX;
    const y = recovererPost.positionY;
    const inBox =
      y >= minY &&
      y <= maxY &&
      ((x >= minX && x <= maxX) || (-x >= minX && -x <= maxX));
    if (!inBox) return false;
  }

  return true;
}

/**
 * Clips covering every edge-guard attempt in `replay` matching `criteria` -
 * from computeEdgeGuardEvents()'s edge-guarder-centric event kinds:
 * "recovery-failure" (the recovering player lost a stock - the edge guard
 * SUCCEEDED) and "recovery-success" (they got back safely - the edge guard
 * FAILED). Each clip spans that situation's "situation-entered" through its
 * resolution, padded by PRE_ROLL_FRAMES/POST_ROLL_FRAMES for context and
 * clamped to the replay's own frame range.
 *
 * Pure and per-game - callers building a session-wide playlist call this
 * once per loaded game and concatenate the results.
 */
export function computeEdgeGuardClips(
  replay: Replay,
  gameId: string,
  label: string,
  criteria: EdgeGuardSearchCriteria,
): PlaylistClip[] {
  const events = computeEdgeGuardEvents(replay);
  const lastFrameIndex = replay.frames.length - 1;
  const clips: PlaylistClip[] = [];

  let openFrameIndex: number | null = null;
  for (const event of events) {
    if (event.kind === "situation-entered") {
      openFrameIndex = matchesEntryCriteria(replay, event, criteria)
        ? event.frameIndex
        : null;
    } else if (
      (event.kind === "recovery-success" ||
        event.kind === "recovery-failure") &&
      openFrameIndex !== null
    ) {
      const eventResult: "success" | "failure" =
        event.kind === "recovery-failure" ? "success" : "failure";
      if (criteria.result === null || criteria.result === eventResult) {
        clips.push({
          gameId,
          startFrameIndex: Math.max(0, openFrameIndex - PRE_ROLL_FRAMES),
          endFrameIndex: Math.min(
            lastFrameIndex,
            event.frameIndex + POST_ROLL_FRAMES,
          ),
          label,
        });
      }
      openFrameIndex = null;
    }
  }

  return clips;
}
