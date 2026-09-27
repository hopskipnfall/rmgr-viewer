import {
  ActionStateId,
  isCaptainFalconCharacter,
  isKirbyCharacter,
  isPikachuCharacter,
} from "@rmg-k/rmgr";

/**
 * Animated attacks (Debug panel's "Animation" toggle): rather than a new rendering system, this
 * reuses each character's existing hand-drawn art and rotates it around the character's own
 * center over the real duration of a specific move, driven by the same actionFrameCounter that's
 * already available per frame from the replay - no skeleton, no new artwork, just an accurate
 * rotation applied to what's already drawn. This is a deliberately separate, simpler mechanism
 * from the real-bone skeleton system (skeleton.ts): distinct hand-drawn animations, not a reuse
 * of (and not dependent on the accuracy of) the skeleton data.
 */

interface AttackAnimationDefinition {
  readonly matches: (characterId: number, actionStateId: number) => boolean;
  /**
   * Returns the rotation angle in radians for the given actionFrameCounter (already mirrored for
   * facing direction), or null if this frame falls outside the animated window - falls back to
   * the normal still pose (e.g. before frame 0, or after the move's last animated frame).
   */
  readonly angleAtFrame: (frame: number, facingRight: boolean) => number | null;
}

/** One segment of a degrees-vs-frame rotation curve, either linear or eased (cubic Hermite). */
export interface RotationSegment {
  readonly startFrame: number;
  readonly duration: number;
  readonly startDeg: number;
  readonly endDeg: number;
  /** Tangent rates (deg/frame) at the segment's start/end - omitted for a linear segment. */
  readonly rateStartDegPerFrame?: number;
  readonly rateEndDegPerFrame?: number;
}

/**
 * Cubic Hermite interpolation between startDeg and endDeg over a segment of `duration` frames,
 * given the tangent rates (degrees/frame) at each end - the exact formula and per-segment tangent
 * rates were extracted from the game's own animation curve, not approximated.
 */
function hermiteAngleDeg(
  u: number,
  startDeg: number,
  endDeg: number,
  rateStart: number,
  rateEnd: number,
  duration: number,
): number {
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    startDeg * (2 * u3 - 3 * u2 + 1) +
    endDeg * (3 * u2 - 2 * u3) +
    duration * rateStart * (u3 - 2 * u2 + u) +
    duration * rateEnd * (u3 - u2)
  );
}

function angleDegAtFrame(
  segments: readonly RotationSegment[],
  frame: number,
): number | null {
  for (const seg of segments) {
    const segEnd = seg.startFrame + seg.duration;
    if (frame < seg.startFrame || frame > segEnd) continue;
    const u = (frame - seg.startFrame) / seg.duration;
    if (seg.rateStartDegPerFrame === undefined) {
      // Linear segment
      return seg.startDeg + (seg.endDeg - seg.startDeg) * u;
    }
    return hermiteAngleDeg(
      u,
      seg.startDeg,
      seg.endDeg,
      seg.rateStartDegPerFrame,
      seg.rateEndDegPerFrame ?? 0,
      seg.duration,
    );
  }
  return null;
}

/**
 * Pikachu's Up Air (2029_FTPikachuAnimAttackAirU.c): a single 35-frame (0-34), non-looping full
 * 360-degree spin on the roll axis, driven by the torso joint (everything else hangs off it via
 * the skeleton hierarchy, so a single rigid-body rotation of the existing artwork is a reasonable
 * stand-in for the full per-joint animation - secondary limb wobbles exist in the source data but
 * don't rotate independently). Decoded directly from the game's own animation bytecode: a short
 * linear windup (matching the move's real hitbox startup), then three progressively longer eased
 * segments carrying it the rest of the way around. Frame 0 and frame 34 land almost exactly on the
 * same angle/pose, confirming this is a clean single flip, not a data error.
 *
 * The interpolation formula and full-precision segment values (including the per-segment tangent
 * rates) were derived algebraically from the game's own curve-evaluation code and confirmed to
 * reduce exactly to each segment's start/end value and rate at u=0/u=1 - not a lookalike ease
 * curve. Each segment's end tangent rate exactly equals the next segment's start tangent rate
 * (asserted in attackAnimation.test.ts), confirming these aren't independently-fitted segments.
 *
 * Rotation direction (clockwise vs counterclockwise on screen) was not independently verified
 * against the source - only the magnitude/timing curve was confirmed against the bytecode. Flip
 * the sign below if the spin visibly goes the wrong way once rendered.
 */
export const PIKACHU_UP_AIR_SEGMENTS: readonly RotationSegment[] = [
  { startFrame: 0, duration: 4, startDeg: 0.0, endDeg: 16.785872904223336 },
  {
    startFrame: 4,
    duration: 2,
    startDeg: 16.785872904223336,
    endDeg: 69.94113710093058,
    rateStartDegPerFrame: 11.638205213594848,
    rateEndDegPerFrame: 21.821634775490338,
  },
  {
    startFrame: 6,
    duration: 5,
    startDeg: 69.94113710093058,
    endDeg: 169.98493961010166,
    rateStartDegPerFrame: 21.821634775490338,
    rateEndDegPerFrame: 10.29533538125698,
  },
  {
    startFrame: 11,
    duration: 23,
    startDeg: 169.98493961010166,
    endDeg: 359.88911506654836,
    rateStartDegPerFrame: 10.29533538125698,
    rateEndDegPerFrame: 0.0,
  },
];

/**
 * Captain Falcon's Up Air: a single 35-frame (0-34), non-looping full 360-degree spin on the roll
 * axis, same shape/duration as Pikachu's move (coincidental) but rotating the opposite direction
 * and with no linear windup - all 3 segments are eased (cubic). Same pipeline/confidence as
 * Pikachu's data; tangent continuity holds at every boundary (asserted in
 * attackAnimation.test.ts). Rotation direction is relative to Pikachu's, not independently
 * verified against the source either - check visually and flip the sign below if needed.
 *
 * Unlike Pikachu's curve, this one isn't globally monotonic: the given tangent magnitudes produce
 * a real small forward bump during the windup (frames 0-3, peaking ~+9.8deg before crashing back
 * through 0) and a slight past-360 overshoot near the very end before settling - both plausible,
 * intentional animation technique (anticipation and overshoot), confirmed by hand-evaluating the
 * exact Hermite formula against these exact tangent values, not a bug in the interpolation.
 */
export const FALCON_UP_AIR_SEGMENTS: readonly RotationSegment[] = [
  {
    startFrame: 0,
    duration: 4,
    startDeg: 0.0,
    endDeg: -1.7904931097838226,
    rateStartDegPerFrame: 0.0,
    rateEndDegPerFrame: -20.143047485068003,
  },
  {
    startFrame: 4,
    duration: 4,
    startDeg: -1.7904931097838226,
    endDeg: -178.82549933965927,
    rateStartDegPerFrame: -20.143047485068003,
    rateEndDegPerFrame: -23.724033704635648,
  },
  {
    startFrame: 8,
    duration: 26,
    startDeg: -178.82549933965927,
    endDeg: -359.88911506654836,
    rateStartDegPerFrame: -23.724033704635648,
    rateEndDegPerFrame: 0.0,
  },
];

/**
 * Kirby's Up Air: a longer, differently-shaped move than Pikachu's/Falcon's - 81 frames (0-80),
 * non-looping, still a single torso rotation but doing 5 full rotations rather than 1 (matching
 * Kirby's real multi-hit drill-kick Up Air): a small anticipation wobble that whips back
 * (segment 1 into 2 is a real kink - value-continuous but not rate-continuous, an intentional
 * "whip" confirmed against the source, not a data error), then one long spin that starts fast and
 * decelerates smoothly to a dead stop exactly at frame 75 (segment 3's end angle, 1799.89...
 * degrees, is almost exactly 5*360), then holds through frame 80 (segment 4 is a flat hold - same
 * start/end angle, zero tangents both ends). No modulo/wrapping needed in the angle math: applying
 * this directly via ctx.rotate() naturally renders as 5 visible spins slowing to a stop, same as
 * any angle beyond 360 degrees would.
 */
export const KIRBY_UP_AIR_SEGMENTS: readonly RotationSegment[] = [
  {
    startFrame: 0,
    duration: 8,
    startDeg: 0.0,
    endDeg: -39.95037751205154,
    rateStartDegPerFrame: 0.0,
    rateEndDegPerFrame: 0.0,
  },
  {
    startFrame: 8,
    duration: 2,
    startDeg: -39.95037751205154,
    endDeg: 0.0,
  },
  {
    startFrame: 10,
    duration: 65,
    startDeg: 0.0,
    endDeg: 1799.8931986101877,
    rateStartDegPerFrame: 66.5839625200859,
    rateEndDegPerFrame: 0.0,
  },
  {
    startFrame: 75,
    duration: 5,
    startDeg: 1799.8931986101877,
    endDeg: 1799.8931986101877,
    rateStartDegPerFrame: 0.0,
    rateEndDegPerFrame: 0.0,
  },
];

/** Builds a whole-body-rotation attack animation definition from a segment curve. */
function rotationAnimation(
  matchesCharacter: (characterId: number) => boolean,
  actionStateId: number,
  segments: readonly RotationSegment[],
): AttackAnimationDefinition {
  return {
    matches: (characterId, stateId) =>
      matchesCharacter(characterId) && stateId === actionStateId,
    angleAtFrame: (frame, facingRight) => {
      const deg = angleDegAtFrame(segments, frame);
      if (deg === null) return null;
      const rad = (deg * Math.PI) / 180;
      return facingRight ? rad : -rad;
    },
  };
}

/** Registry of animated attacks - see getAttackAnimationAngle(). */
const ATTACK_ANIMATIONS: readonly AttackAnimationDefinition[] = [
  rotationAnimation(
    isPikachuCharacter,
    ActionStateId.Uair,
    PIKACHU_UP_AIR_SEGMENTS,
  ),
  rotationAnimation(
    isCaptainFalconCharacter,
    ActionStateId.Uair,
    FALCON_UP_AIR_SEGMENTS,
  ),
  rotationAnimation(
    isKirbyCharacter,
    ActionStateId.Uair,
    KIRBY_UP_AIR_SEGMENTS,
  ),
];

/** Returns the current rotation angle (radians) for this character/move/frame, or null if none is defined. */
export function getAttackAnimationAngle(
  characterId: number,
  actionStateId: number,
  frame: number,
  facingRight: boolean,
): number | null {
  for (const def of ATTACK_ANIMATIONS) {
    if (def.matches(characterId, actionStateId)) {
      return def.angleAtFrame(frame, facingRight);
    }
  }
  return null;
}
