/**
 * Animation data and math for Pikachu's Up Tilt overhead tail whip.
 *
 * Sourced from game animation data (FTPikachuAnimUTilt.c) and skeleton
 * hierarchy (341_PikachuModel.c):
 * - Joint 25 (tail) is a single rigid bone with 0 child joints.
 * - Duration: 27 frames (0–26), non-looping.
 * - The tail sweeps forward overhead (hitbox active frames 8–11).
 * - Scale multiplier stretches out to 1.5x at frame 10 (peak whip crack)
 *   and returns smoothly to 1.0x by frame 14.
 */

export interface TailKeyframe {
  frame: number;
  x: number;
  y: number;
  z: number;
}

/**
 * Real per-frame base positions decoded from FTPikachuAnimUTilt.c (joint 25 origin).
 */
export const PIKACHU_UTIL_TAIL_KEYFRAMES: readonly TailKeyframe[] = [
  { frame: 0, x: 19.8, y: 67.8, z: -85.0 },
  { frame: 1, x: 15.4, y: 46.6, z: -26.7 },
  { frame: 2, x: -3.9, y: 44.2, z: 59.6 },
  { frame: 3, x: -40.8, y: 58.8, z: 80.3 },
  { frame: 4, x: -82.3, y: 88.3, z: 76.9 },
  { frame: 5, x: -114.2, y: 122.1, z: 53.1 },
  { frame: 6, x: -130.8, y: 146.2, z: 28.5 },
  { frame: 7, x: -135.7, y: 155.5, z: 20.1 },
  { frame: 8, x: -134.3, y: 154.2, z: 22.9 },
  { frame: 9, x: -129.2, y: 147.3, z: 28.4 },
  { frame: 10, x: -125.0, y: 141.7, z: 32.8 },
  { frame: 11, x: -124.7, y: 140.1, z: 39.2 },
  { frame: 12, x: -125.6, y: 139.5, z: 48.8 },
  { frame: 13, x: -126.2, y: 137.5, z: 58.8 },
  { frame: 14, x: -125.0, y: 131.9, z: 66.9 },
  { frame: 15, x: -120.5, y: 120.2, z: 70.8 },
  { frame: 16, x: -112.1, y: 102.5, z: 68.7 },
  { frame: 17, x: -100.6, y: 81.8, z: 60.4 },
  { frame: 18, x: -86.4, y: 61.8, z: 44.8 },
  { frame: 19, x: -69.9, y: 46.0, z: 22.7 },
  { frame: 20, x: -52.2, y: 37.4, z: -3.1 },
  { frame: 21, x: -34.2, y: 36.5, z: -28.7 },
  { frame: 22, x: -17.2, y: 41.8, z: -50.7 },
  { frame: 23, x: -2.3, y: 50.3, z: -67.0 },
  { frame: 24, x: 9.4, y: 59.0, z: -77.5 },
  { frame: 25, x: 17.0, y: 65.4, z: -83.2 },
  { frame: 26, x: 19.8, y: 67.8, z: -85.0 },
];

/**
 * Real scale_y multipliers from game animation data (FTPikachuAnimUTilt.c).
 * Stretches out to 1.5x at frame 10 during the peak of the overhead whip.
 */
export const PIKACHU_UTIL_TAIL_SCALE: readonly number[] = [
  1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.084, 1.212, 1.348, 1.456, 1.5, 1.428, 1.266,
  1.096, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
];

/**
 * Fluid swing angle (in degrees forward from rest position) for Pikachu's
 * Up Tilt overhead tail whip (27 frames, 0–26).
 *
 * - Frames 0–3: Anticipation / wind-up dip (-5 deg)
 * - Frames 4–7: Upward acceleration
 * - Frames 8–11: Overhead whip-crack (hitbox active, 1.5x stretch peak at frame 10)
 * - Frames 12–26: Smooth recovery return to resting stance
 */
export const PIKACHU_UTIL_SWING_ANGLES_DEG: readonly number[] = [
  0.0, // Frame 0: rest
  -3.0, // Frame 1: slight recoil
  -5.0, // Frame 2: anticipation dip
  0.0, // Frame 3: start forward sweep
  14.0, // Frame 4: sweep up
  34.0, // Frame 5: accelerating
  60.0, // Frame 6: sweeping upward
  84.0, // Frame 7: approaching overhead
  102.0, // Frame 8: overhead (hitbox active)
  112.0, // Frame 9: whipping forward (hitbox active)
  115.0, // Frame 10: peak forward whip crack (scale 1.500)
  112.0, // Frame 11: apex follow-through (hitbox active)
  104.0, // Frame 12: recovery begins
  92.0, // Frame 13: pulling back
  78.0, // Frame 14: scale returned to 1.0
  64.0, // Frame 15: smooth return arc
  50.0, // Frame 16
  38.0, // Frame 17
  28.0, // Frame 18
  20.0, // Frame 19
  13.0, // Frame 20
  8.0, // Frame 21
  5.0, // Frame 22
  3.0, // Frame 23
  1.5, // Frame 24
  0.5, // Frame 25
  0.0, // Frame 26: back to resting pose
];

/**
 * Evaluates the forward swing angle in degrees for a given frame
 * with cosine subframe interpolation.
 */
export function getUtiltSwingAngleDeg(frame: number): number {
  const clamped = Math.max(0, Math.min(26, frame));
  const f0 = Math.floor(clamped);
  const f1 = Math.min(26, f0 + 1);
  const t = clamped - f0;
  const eased = 0.5 - 0.5 * Math.cos(t * Math.PI);
  const a0 = PIKACHU_UTIL_SWING_ANGLES_DEG[f0]!;
  const a1 = PIKACHU_UTIL_SWING_ANGLES_DEG[f1]!;
  return a0 + (a1 - a0) * eased;
}

/**
 * Interpolates Pikachu's Up Tilt tail base position at an arbitrary frame
 * using cosine easing between adjacent keyframes.
 */
export function getUtiltTailSample(frame: number): {
  x: number;
  y: number;
  z: number;
} {
  const clamped = Math.max(0, Math.min(26, frame));
  const idx = Math.floor(clamped);
  const last =
    PIKACHU_UTIL_TAIL_KEYFRAMES[PIKACHU_UTIL_TAIL_KEYFRAMES.length - 1]!;
  if (idx >= PIKACHU_UTIL_TAIL_KEYFRAMES.length - 1) {
    return { x: last.x, y: last.y, z: last.z };
  }
  const k0 = PIKACHU_UTIL_TAIL_KEYFRAMES[idx]!;
  const k1 = PIKACHU_UTIL_TAIL_KEYFRAMES[idx + 1] ?? last;
  const span = k1.frame - k0.frame;
  const t = span > 0 ? (clamped - k0.frame) / span : 0;
  const eased = 0.5 - 0.5 * Math.cos(t * Math.PI);
  return {
    x: k0.x + (k1.x - k0.x) * eased,
    y: k0.y + (k1.y - k0.y) * eased,
    z: k0.z + (k1.z - k0.z) * eased,
  };
}

/**
 * Evaluates the tail length stretch multiplier for a given frame
 * with cosine subframe interpolation.
 */
export function getUtiltTailStretch(frame: number): number {
  const clamped = Math.max(0, Math.min(26, frame));
  const f0 = Math.floor(clamped);
  const f1 = Math.min(26, f0 + 1);
  const t = clamped - f0;
  const eased = 0.5 - 0.5 * Math.cos(t * Math.PI);
  const s0 = PIKACHU_UTIL_TAIL_SCALE[f0]!;
  const s1 = PIKACHU_UTIL_TAIL_SCALE[f1]!;
  return s0 + (s1 - s0) * eased;
}

export function normalizeAngle(rad: number): number {
  let a = rad;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

export interface PikachuUtiltTailTransform {
  deltaAngle: number;
  restAngle: number;
  stretch: number;
}

/**
 * Computes the rotation and stretch transform parameters for Pikachu's 2D canvas tail.
 *
 * When facing right (dir = +1):
 * - Resting tail points up and backward (restAngle ~ -138 deg).
 * - A positive deltaAngle rotates clockwise, sweeping the tail overhead and forward.
 *
 * When facing left (dir = -1):
 * - Resting tail points up and backward (restAngle ~ -42 deg).
 * - A negative deltaAngle rotates counter-clockwise, sweeping the tail overhead and forward.
 */
export function getPikachuUtiltTailTransform(
  frame: number,
  dir: number,
  halfWidth: number,
  heightPx: number,
): PikachuUtiltTailTransform {
  const swingDeg = getUtiltSwingAngleDeg(frame);
  const stretch = getUtiltTailStretch(frame);

  const restVecX = -0.62 * dir * halfWidth;
  const restVecY = -0.7 * heightPx;
  const restAngle = Math.atan2(restVecY, restVecX);

  const deltaAngle = (dir * swingDeg * Math.PI) / 180;

  return { deltaAngle, restAngle, stretch };
}

/**
 * Applies the Up Tilt tail whip rotation and stretch transform to the 2D canvas context.
 */
export function applyPikachuUtiltTailTransform(
  ctx: CanvasRenderingContext2D,
  rootX: number,
  rootY: number,
  dir: number,
  halfWidth: number,
  heightPx: number,
  frame: number,
): void {
  const { deltaAngle, restAngle, stretch } = getPikachuUtiltTailTransform(
    frame,
    dir,
    halfWidth,
    heightPx,
  );

  ctx.translate(rootX, rootY);
  ctx.rotate(deltaAngle);
  ctx.rotate(restAngle);
  ctx.scale(stretch, 1.0);
  ctx.rotate(-restAngle);
  ctx.translate(-rootX, -rootY);
}
