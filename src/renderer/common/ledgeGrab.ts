import { type PortIndex, type Replay } from "@rmg-k/rmgr";
import { stageLedges, type LedgePoint } from "../../stageGeometry.js";
import { ledgeGrabOffset, LEDGE_GRAB_PROXIMITY } from "../../ledgeGrabRange.js";
import { LEDGE_ACTION_STATES } from "../../ledgeTrap.js";
import { isDeadState } from "./actionStates.js";

export interface LedgeGrabCandidate {
  port: PortIndex;
  edgeSide: "left" | "right";
  /** World position of the character's ledge-grab check point (positionX + facingDirection * reachX, positionY + heightY) - see ledgeGrabRange.ts. */
  dotWorldX: number;
  dotWorldY: number;
  /** Fade in/out progress, 0 (invisible) to 1 (fully shown) - see LEDGE_GRAB_FADE_FRAMES. */
  alpha: number;
}

interface RawLedgeGrabState {
  edgeSide: "left" | "right";
  dotWorldX: number;
  dotWorldY: number;
}

/**
 * The single-frame geometric check, with no fade applied: off-stage
 * horizontally (past the ground's left/right edge, at any height), within
 * LEDGE_GRAB_PROXIMITY of that edge in both X and Y, alive, not already
 * hanging from a ledge (LEDGE_ACTION_STATES - once grabbed there's nothing
 * left to visualize), and with a known ledge-grab offset for their
 * character (ledgeGrabRange.ts - Japanese-region variants included, same
 * offsets).
 */
function rawLedgeGrabState(
  post: {
    positionX: number;
    positionY: number;
    facingDirection: 1 | -1;
    characterId: number;
    actionStateId: number;
    stocksRemaining: number;
    grounded: boolean;
  },
  leftLedge: LedgePoint,
  rightLedge: LedgePoint,
): RawLedgeGrabState | null {
  if (isDeadState(post.actionStateId) || post.stocksRemaining < 0) return null;
  if (LEDGE_ACTION_STATES.has(post.actionStateId)) return null;
  if (post.grounded) return null;

  let edge: LedgePoint;
  if (post.positionX < leftLedge.x) {
    edge = leftLedge;
  } else if (post.positionX > rightLedge.x) {
    edge = rightLedge;
  } else {
    return null;
  }

  const withinProximity =
    Math.abs(post.positionX - edge.x) <= LEDGE_GRAB_PROXIMITY &&
    Math.abs(post.positionY - edge.y) <= LEDGE_GRAB_PROXIMITY;
  if (!withinProximity) return null;

  const offset = ledgeGrabOffset(post.characterId);
  if (!offset) return null;

  return {
    edgeSide: edge.side,
    dotWorldX: post.positionX + post.facingDirection * offset.reachX,
    dotWorldY: post.positionY + offset.heightY,
  };
}

/** How many frames the ledge-grab overlay takes to fade fully in or out. */
export const LEDGE_GRAB_FADE_FRAMES = 8;

/**
 * Every seated port currently worth visualizing a ledge-grab check for (see
 * rawLedgeGrabState()), each with a 0-1 fade progress: ramping up over the
 * first LEDGE_GRAB_FADE_FRAMES frames the underlying condition has held
 * true, and - once the condition stops holding (moved back on-stage, moved
 * out of proximity, or grabbed the ledge) - ramping back down over the
 * following LEDGE_GRAB_FADE_FRAMES frames using the last active frame's
 * position, rather than disappearing outright.
 */
export function computeLedgeGrabCandidates(
  replay: Replay,
  frameIndex: number,
  stageId: number | undefined,
): LedgeGrabCandidate[] {
  const ledges = stageLedges(stageId);
  if (!ledges) return [];
  const [leftLedge, rightLedge] = ledges;
  const frame = replay.frames[frameIndex];
  if (!frame) return [];

  const candidates: LedgeGrabCandidate[] = [];

  for (const key of Object.keys(frame.ports)) {
    const port = Number(key) as PortIndex;
    const currentPost = frame.ports[port]?.state;
    if (!currentPost) continue;

    const currentRaw = rawLedgeGrabState(currentPost, leftLedge, rightLedge);
    if (currentRaw) {
      let consecutiveFrames = 0;
      let idx = frameIndex;
      while (consecutiveFrames < LEDGE_GRAB_FADE_FRAMES && idx >= 0) {
        const post = replay.frames[idx]?.ports[port]?.state;
        if (!post || !rawLedgeGrabState(post, leftLedge, rightLedge)) break;
        consecutiveFrames++;
        idx--;
      }
      candidates.push({
        port,
        edgeSide: currentRaw.edgeSide,
        dotWorldX: currentRaw.dotWorldX,
        dotWorldY: currentRaw.dotWorldY,
        alpha: Math.min(1, consecutiveFrames / LEDGE_GRAB_FADE_FRAMES),
      });
      continue;
    }

    let framesSinceActive = 0;
    let idx = frameIndex - 1;
    let lastActive: RawLedgeGrabState | null = null;
    while (framesSinceActive < LEDGE_GRAB_FADE_FRAMES && idx >= 0) {
      framesSinceActive++;
      const post = replay.frames[idx]?.ports[port]?.state;
      const raw = post ? rawLedgeGrabState(post, leftLedge, rightLedge) : null;
      if (raw) {
        lastActive = raw;
        break;
      }
      idx--;
    }
    if (lastActive) {
      const alpha = Math.max(0, 1 - framesSinceActive / LEDGE_GRAB_FADE_FRAMES);
      if (alpha > 0) {
        candidates.push({
          port,
          edgeSide: lastActive.edgeSide,
          dotWorldX: lastActive.dotWorldX,
          dotWorldY: lastActive.dotWorldY,
          alpha,
        });
      }
    }
  }

  return candidates;
}
