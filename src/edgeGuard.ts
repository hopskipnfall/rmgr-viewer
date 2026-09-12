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

export function isOutsideZone(x: number, y: number): boolean {
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
export const DEAD_OR_RESPAWNING_STATES = new Set([
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

// Frames at 60 fps that a player must stay grounded and out of hitstun (or a
// grab) to count as "recovered to stage."
const RECOVERY_GROUNDED_FRAMES = 30; // 0.5 s × 60 fps

// Grabbed/held/thrown states. Found via a real bug report: a player who lands
// and is immediately grabbed, thrown, and killed was resolving as
// "recovery-success" — grab/throw action states aren't hitstun
// (isHitstunState doesn't cover them, they're a separate state family), so
// the 0.5s grounded-and-safe clock kept running straight through the grab and
// resolved success before the resulting stock loss ever registered. Treated
// identically to hitstun below: resets the streak AND the "touched ground"
// progress, same "require a fresh landing" reasoning that already applied to
// hitstun. There isn't a single canonical export for this set in the
// codebase yet (neutralHits.ts/ledgeTrap.ts/renderer.ts/combos.ts each have
// their own copy) — this one can't import theirs without a circular
// dependency (they import from edgeGuard.ts already), so it's defined here
// too, same values.
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
  if (replay.matchSettings?.stageId !== DREAM_LAND_STAGE_ID) return events;
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

    const postA = frame.ports[portA]?.state;
    const postB = frame.ports[portB]?.state;
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
      // See CAPTURE_STATES' own comment above -- a grab/throw isn't hitstun but must be treated
      // the same way for the grounded-safety-clock logic below.
      const recoveringUnsafe =
        recoveringInHitstun || CAPTURE_STATES.has(recoveringPost.actionStateId);

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
      if (recoveringPost.grounded && !recoveringUnsafe) {
        situation.hasTouchedGround = true;
      }
      if (recoveringUnsafe) {
        situation.safeFrameStreak = 0;
        // A hit (or a grab -- see CAPTURE_STATES above) also undoes any
        // earlier "touched ground" progress, not just the streak - otherwise
        // a player launched again right after landing (e.g. onto a side
        // platform, immediately re-hit or grabbed) stays "touched" from that
        // earlier landing, and once THIS hitstun/grab happens to end - even
        // while still airborne and falling toward the blast zone, nowhere
        // near safe - the 0.5s clock silently resumes and can resolve
        // "recovery-success" without them ever having actually landed
        // again. Require a fresh landing before the clock can restart.
        situation.hasTouchedGround = false;
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

  // If a situation is still open when the replay ends, the recovering
  // player never came back — resolve it as a failure on the last frame.
  // (format v5 always parses a complete match - see docs/RMGR_SPEC.md §2 -
  // so there's no "truncated recording" case to exclude here anymore.)
  if (situation !== null) {
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
}

/**
 * Derives per-port recovery statistics from a pre-computed event list. O(n)
 * but cheap — called on perspective changes, not every frame.
 *
 * (Edge-guard-side stats used to live here too, as a plain "opponent died"
 * kill rate, but that metric was retired in favor of Edge Guard Effectiveness
 * -- see edgeGuardEffectivenessScore in classifiedSituations.ts, which scores
 * every in-scope situation directly off the classifier's own category and
 * already excludes "hopeless" situations on its own terms, so no separate
 * exclusion set is needed for it.)
 *
 * `excludeEnteredFrameIndices` drops entire situations (both from the
 * denominator and the numerator) by their `situation-entered` frameIndex —
 * used to exclude situations the recovery classifier confirmed were
 * "dead" (unsurvivable by any simulated strategy) at entry, per
 * docs/superpowers/specs/2026-09-10-classifier-aware-recovery-stats.md.
 * Deliberately does NOT exclude "reaches-stage" verdicts here: that verdict
 * only proves one input sequence works, not that the situation was trivial
 * or unaffected by matchup-specific edge-guard pressure -- confirmed against
 * real data (2026-09-11): in one 30-game sample, 20.7% of "reaches-stage"
 * situations still ended in a real kill. Situations with no classifier opinion (wrong stage,
 * unsupported character, etc.) are never excluded, matching prior behavior.
 * Relies on situations never overlapping (edgeGuard.ts only ever has one
 * open at a time), so the most recently seen "situation-entered" frameIndex
 * always identifies the situation a following resolution event belongs to.
 */
export function computeEdgeGuardStats(
  events: readonly EdgeGuardEvent[],
  port: PortIndex,
  excludeEnteredFrameIndices?: ReadonlySet<number>,
): EdgeGuardStats {
  let recoverySituations = 0;
  let recoverySuccesses = 0;
  let currentEnteredFrameIndex: number | null = null;

  for (const ev of events) {
    if (ev.kind === "situation-entered") {
      currentEnteredFrameIndex = ev.frameIndex;
      if (excludeEnteredFrameIndices?.has(ev.frameIndex)) continue;
      if (ev.recoveringPort === port) recoverySituations++;
    } else if (ev.kind === "recovery-success") {
      if (
        currentEnteredFrameIndex !== null &&
        excludeEnteredFrameIndices?.has(currentEnteredFrameIndex)
      )
        continue;
      if (ev.recoveringPort === port) recoverySuccesses++;
    }
  }

  return {
    recoverySituations,
    recoverySuccesses,
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
