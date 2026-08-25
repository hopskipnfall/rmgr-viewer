import type { PortIndex, Replay } from "@rmg-k/rmgr";
import { getSeatedPorts } from "@rmg-k/rmgr";
import { DREAM_LAND_STAGE_ID } from "./stageGeometry.js";

// ---------------------------------------------------------------------------
// Zone geometry (Dream Land only)
// ---------------------------------------------------------------------------
//
// The danger zone is defined by a diagonal boundary: a line from (2916, 58)
// to (3570, 4158), mirrored across X=0 for the left side. A player whose
// |positionX| exceeds the X threshold at their Y is considered "outside."
//
// Linear interpolation: at positionY y (clamped to [Y_LO, Y_HI]) the X
// threshold is lerp(X_LO, X_HI, t) where t = (y - Y_LO) / (Y_HI - Y_LO).
// Points below Y_LO or above Y_HI use the nearest endpoint threshold.
// (A straight-down spike that stays within X may never trigger — known gap,
// flagged to user.)

const ZONE_Y_LO = 58;
const ZONE_Y_HI = 4158;
const ZONE_X_AT_Y_LO = 2916;
const ZONE_X_AT_Y_HI = 3570;

function xThresholdAtY(y: number): number {
  const t = Math.max(0, Math.min(1, (y - ZONE_Y_LO) / (ZONE_Y_HI - ZONE_Y_LO)));
  return ZONE_X_AT_Y_LO + t * (ZONE_X_AT_Y_HI - ZONE_X_AT_Y_LO);
}

function isOutsideZone(x: number, y: number): boolean {
  return Math.abs(x) > xThresholdAtY(y);
}

// ---------------------------------------------------------------------------
// Ledge action-state IDs (CliffCatch / CliffWait / CliffQuick / CliffSlow)
// ---------------------------------------------------------------------------

const LEDGE_STATES = new Set([
  0x054, // CliffCatch
  0x055, // CliffWait
  0x056, // CliffQuick
  0x059, // CliffSlow
]);

// Action states that indicate a player is dead or going through the respawn
// sequence. Don't open a new situation while either player is in one of these
// — the dead player's position is frozen at their blast-zone KO point and
// will almost always be outside the zone, producing false entries the frame
// after a stock is lost.
const DEAD_OR_RESPAWNING_STATES = new Set([
  0x000, // DeadD
  0x001, // DeadS
  0x002, // DeadU
  0x003, // ScreenKO
  0x004, // ScreenKOWait
  0x005, // Entry (spawn platform descent)
  0x007, // Revive1
  0x008, // Revive2
  0x009, // ReviveWait
]);

// Frames at 60 fps that a player must stay grounded and out of hitstun to
// count as "recovered to stage."
// TODO: hitstunCounter === 0 is the only actionable check for now; certain
// non-hitstun states (e.g. landing lag, tumble) may also prevent meaningful
// movement — revisit once we have a fuller taxonomy of "actionable" states.
const RECOVERY_GROUNDED_FRAMES = 30; // 0.5 s × 60 fps

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type EdgeGuardEventKind =
  "situation-entered" | "recovery-success" | "recovery-failure";

/** A single logged event in the edge-guard / recovery timeline. */
export interface EdgeGuardEvent {
  /** Frame number (from `PostFrameUpdate.frame`, same as `replay.frames[i].frame`). */
  readonly frame: number;
  /** Frame index into `replay.frames` (i.e. array index, not the frame number). */
  readonly frameIndex: number;
  readonly kind: EdgeGuardEventKind;
  /** Which port is "recovering" in this situation. */
  readonly recoveringPort: PortIndex;
  /** Which port is "edge-guarding" in this situation. */
  readonly edgeGuardingPort: PortIndex;
}

// ---------------------------------------------------------------------------
// Computation
// ---------------------------------------------------------------------------

/**
 * Returns true if the character is currently in hitstun from taking damage.
 * Note: hitstunCounter can hold residual non-zero values during attack or
 * idle states in recorder memory, so we gate it on true damage action states.
 */
export function isHitstunState(
  actionStateId: number,
  hitstunCounter: number,
): boolean {
  if (actionStateId >= 0x025 && actionStateId <= 0x037 && hitstunCounter > 0)
    return true;
  if (
    actionStateId === 0x038 ||
    (actionStateId === 0x039 && hitstunCounter > 0)
  )
    return true;
  return false;
}

interface SituationState {
  recoveringPort: PortIndex;
  edgeGuardingPort: PortIndex;
  /** Frame index when the situation opened. */
  enteredFrameIndex: number;
  /**
   * Frames since the recovering player last took a hit while grounded or
   * after having touched the ground. The clock starts on the first grounded +
   * actionable frame and is only reset by a hit — a voluntary jump after
   * landing does NOT reset it, since leaving the ground intentionally is
   * evidence of control, not danger.
   */
  safeFrameStreak: number;
  /** Whether the recovering player has touched the ground at least once. */
  hasTouchedGround: boolean;
  /** Stocks the recovering port had when the situation opened (to detect death). */
  recoveringStocksAtEntry: number;
  /** Stocks the edge-guarding port had when the situation opened. */
  edgeGuardingStocksAtEntry: number;
}

/**
 * Precomputes all edge-guard / recovery events for a replay.
 *
 * Scoped to Dream Land 2-player matches only — returns `[]` for anything else.
 *
 * Follows the same precompute-everything-up-front pattern as
 * `computeNeutralHitsPerStock`: the viewer allows arbitrary seek order, so
 * incremental tracking would need a full recompute from scratch on every
 * backwards jump anyway.
 */
export function computeEdgeGuardEvents(replay: Replay): EdgeGuardEvent[] {
  const events: EdgeGuardEvent[] = [];

  // Only meaningful on Dream Land, 2-player matches.
  if (replay.gameStart.stageId !== DREAM_LAND_STAGE_ID) return events;
  const seated = getSeatedPorts(replay);
  if (seated.length !== 2) return events;

  const [portA, portB] = seated as [PortIndex, PortIndex];

  let situation: SituationState | null = null;
  const lastHitstunFrame: Partial<Record<PortIndex, number>> = {
    [portA]: -1,
    [portB]: -1,
  };

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

    if (aInHitstun) lastHitstunFrame[portA] = i;
    if (bInHitstun) lastHitstunFrame[portB] = i;

    // -----------------------------------------------------------------------
    // If a situation is active, check resolution conditions first.
    // -----------------------------------------------------------------------

    if (situation !== null) {
      const { recoveringPort, edgeGuardingPort } = situation;
      const recoveringPost = recoveringPort === portA ? postA : postB;
      const edgeGuardingPost = edgeGuardingPort === portA ? postA : postB;
      const recoveringInHitstun =
        recoveringPort === portA ? aInHitstun : bInHitstun;

      // Resolution: recovering player lost a stock → recovery failure (edge-guard success).
      if (recoveringPost.stocksRemaining < situation.recoveringStocksAtEntry) {
        events.push({
          frame: frameNumber,
          frameIndex: i,
          kind: "recovery-failure",
          recoveringPort,
          edgeGuardingPort,
        });
        situation = null;
        continue;
      }

      // Resolution: edge-guarder lost a stock while offstage → recovering player survived.
      if (
        edgeGuardingPost.stocksRemaining < situation.edgeGuardingStocksAtEntry
      ) {
        events.push({
          frame: frameNumber,
          frameIndex: i,
          kind: "recovery-success",
          recoveringPort,
          edgeGuardingPort,
        });
        situation = null;
        continue;
      }

      // Resolution: ledge-grab.
      if (LEDGE_STATES.has(recoveringPost.actionStateId)) {
        events.push({
          frame: frameNumber,
          frameIndex: i,
          kind: "recovery-success",
          recoveringPort,
          edgeGuardingPort,
        });
        situation = null;
        continue;
      }

      // Resolution: grounded + actionable for 0.5 s.
      if (recoveringPost.grounded && !recoveringInHitstun) {
        situation.hasTouchedGround = true;
      }
      if (recoveringInHitstun) {
        situation.safeFrameStreak = 0;
      } else if (situation.hasTouchedGround) {
        situation.safeFrameStreak++;
        if (situation.safeFrameStreak >= RECOVERY_GROUNDED_FRAMES) {
          events.push({
            frame: frameNumber,
            frameIndex: i,
            kind: "recovery-success",
            recoveringPort,
            edgeGuardingPort,
          });
          situation = null;
          continue;
        }
      }

      // Situation remains open — keep going.
      continue;
    }

    // -----------------------------------------------------------------------
    // No active situation: check whether one is opening this frame.
    //
    // A recovery situation only begins when a player is outside the danger
    // zone AND actionable (not in hitstun). If a player is launched offstage
    // in hitstun, we wait until hitstun ends. If they die during hitstun,
    // it was a direct launch KO (not an edge-guard recovery situation).
    //
    // If an actionable player voluntarily jumps offstage to chase an opponent
    // who is currently in hitstun, the chaser is NOT marked as recovering.
    // -----------------------------------------------------------------------

    // Don't open a situation while either player is dead or respawning.
    if (
      DEAD_OR_RESPAWNING_STATES.has(postA.actionStateId) ||
      DEAD_OR_RESPAWNING_STATES.has(postB.actionStateId)
    )
      continue;

    const aOutside = isOutsideZone(postA.positionX, postA.positionY);
    const bOutside = isOutsideZone(postB.positionX, postB.positionY);

    if (!aOutside && !bOutside) continue;

    const aActionable = !aInHitstun;
    const bActionable = !bInHitstun;

    let recoveringPort: PortIndex | null = null;

    if (aOutside && aActionable && (!bOutside || bActionable)) {
      if (!bInHitstun) {
        if (bOutside && bActionable) {
          // Both outside and actionable: whichever was hit into hitstun most recently is recovering
          recoveringPort =
            (lastHitstunFrame[portA] ?? -1) >= (lastHitstunFrame[portB] ?? -1)
              ? portA
              : portB;
        } else {
          recoveringPort = portA;
        }
      }
    } else if (bOutside && bActionable && (!aOutside || aActionable)) {
      if (!aInHitstun) {
        recoveringPort = portB;
      }
    }

    if (recoveringPort === null) continue;

    const edgeGuardingPort: PortIndex =
      recoveringPort === portA ? portB : portA;
    const recoveringPost = recoveringPort === portA ? postA : postB;
    const edgeGuardingPost = edgeGuardingPort === portA ? postA : postB;

    situation = {
      recoveringPort,
      edgeGuardingPort,
      enteredFrameIndex: i,
      safeFrameStreak: 0,
      hasTouchedGround: false,
      recoveringStocksAtEntry: recoveringPost.stocksRemaining,
      edgeGuardingStocksAtEntry: edgeGuardingPost.stocksRemaining,
    };

    events.push({
      frame: frameNumber,
      frameIndex: i,
      kind: "situation-entered",
      recoveringPort,
      edgeGuardingPort,
    });
  }

  // If a situation is still open when the replay ends and the recording
  // finished cleanly (GameEnd present), the recovering player never came back
  // — resolve it as a failure on the last frame.
  if (situation !== null && replay.isComplete) {
    const lastFrame = replay.frames[replay.frames.length - 1];
    if (lastFrame !== undefined) {
      events.push({
        frame: lastFrame.frame,
        frameIndex: replay.frames.length - 1,
        kind: "recovery-failure",
        recoveringPort: situation.recoveringPort,
        edgeGuardingPort: situation.edgeGuardingPort,
      });
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Per-port aggregate statistics (derived from pre-computed events)
// ---------------------------------------------------------------------------

export interface EdgeGuardStats {
  /** Situations where this port was the one recovering. */
  recoverySituations: number;
  recoverySuccesses: number;
  /** Situations where this port was edge-guarding. */
  edgeGuardSituations: number;
  /** Times this port successfully edge-guarded (opponent died). */
  edgeGuardSuccesses: number;
}

/**
 * Derives per-port edge-guard/recovery statistics from a pre-computed event
 * list. O(n) but cheap — called on perspective changes, not every frame.
 */
export function computeEdgeGuardStats(
  events: readonly EdgeGuardEvent[],
  port: PortIndex,
): EdgeGuardStats {
  let recoverySituations = 0;
  let recoverySuccesses = 0;
  let edgeGuardSituations = 0;
  let edgeGuardSuccesses = 0;

  for (const ev of events) {
    if (ev.kind === "situation-entered") {
      if (ev.recoveringPort === port) recoverySituations++;
      else edgeGuardSituations++;
    } else if (ev.kind === "recovery-success") {
      if (ev.recoveringPort === port) recoverySuccesses++;
    } else if (ev.kind === "recovery-failure") {
      if (ev.edgeGuardingPort === port) edgeGuardSuccesses++;
    }
  }

  return {
    recoverySituations,
    recoverySuccesses,
    edgeGuardSituations,
    edgeGuardSuccesses,
  };
}

// ---------------------------------------------------------------------------
// Zone geometry export (re-exported for the renderer to draw the overlay)
// ---------------------------------------------------------------------------

export {
  ZONE_Y_LO,
  ZONE_Y_HI,
  ZONE_X_AT_Y_LO,
  ZONE_X_AT_Y_HI,
  DREAM_LAND_STAGE_ID as EDGE_GUARD_STAGE_ID,
};
