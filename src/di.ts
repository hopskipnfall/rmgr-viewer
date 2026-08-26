import { getSeatedPorts, type PortIndex, type Replay } from "@rmg-k/rmgr";

/** Deadzone threshold for stick centered box. */
export const DI_DEADZONE_STICK = 30;

/** Minimum stick magnitude (radius) required for DI activation. */
export const DI_MIN_MAGNITUDE = 53;

/** Maximum effective stick value clamped by Smash 64 engine. */
export const DI_STICK_MAX = 80;

/** Multiplier per stick unit for DI displacement in Smash 64 engine: 2.1 units per clamped stick coordinate. */
export const DI_STICK_DISPLACEMENT_FACTOR = 2.1;

/** Action states corresponding to electrical attacks that inflict 1.5x hitlag. */
const ELECTRIC_HIT_STATES = new Set([
  0x037, // DamageElec
]);

/** Action states for crouching in Smash 64. */
const CROUCH_ACTION_STATES = new Set([
  0x018, // Squat
  0x019, // SquatWait
  0x01a, // SquatRv
]);

export type GameRegionVersion = "U" | "J";

export interface HitlagOptions {
  version?: GameRegionVersion;
  isElectric?: boolean;
  targetState?: "standing" | "airborne" | "crouching" | "laying";
}

export type DICardinalDirection =
  | "neutral"
  | "up"
  | "down"
  | "left"
  | "right"
  | "up-left"
  | "up-right"
  | "down-left"
  | "down-right";

export const DI_ARROW_GLYPHS: Record<DICardinalDirection, string> = {
  neutral: "•",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  "up-left": "↖",
  "up-right": "↗",
  "down-left": "↙",
  "down-right": "↘",
};

export type DIRelativeDirection =
  | "neutral"
  | "away"
  | "in"
  | "up"
  | "down"
  | "up-away"
  | "up-in"
  | "down-away"
  | "down-in";

export interface DISingleStickInput {
  frameIndex: number;
  hitlagFrame: number;
  stickX: number;
  stickY: number;
  magnitude: number;
  isActivation: boolean;
  displacementX: number;
  displacementY: number;
}

export interface HitDIResult {
  readonly id: string;
  readonly hitFrameIndex: number;
  readonly hitFrameNumber: number;
  readonly victimPort: PortIndex;
  readonly attackerPort: PortIndex | null;
  readonly damageDealt: number;
  readonly startDamage: number;
  readonly endDamage: number;
  readonly diWindowFrames: number;
  readonly endHitlagFrameIndex: number;
  readonly isElectric: boolean;

  /** Total number of discrete DI trigger activations during hitlag (0, 1, 2, 3, 4+). */
  readonly inputCount: number;

  /** Frame-by-frame stick inputs during hitlag. */
  readonly inputs: DISingleStickInput[];

  /** Initial position when hit occurred. */
  readonly startPos: { x: number; y: number };

  /** Final position upon exiting hitlag before knockback acceleration. */
  readonly endPos: { x: number; y: number };

  /** Physical in-game displacement achieved during hitlag. */
  readonly displacement: {
    dx: number;
    dy: number;
    distance: number;
    angleRad: number;
    angleDeg: number;
  };

  /** Theoretical displacement calculated as sum of (clamped stick * 2.1) on activation frames. */
  readonly theoreticalDisplacement?: {
    dx: number;
    dy: number;
    distance: number;
  };

  /** Simplified cardinal direction. */
  readonly cardinal: DICardinalDirection;

  /** Direction relative to opponent (away, in, up, down). */
  readonly relative: DIRelativeDirection;

  /** Efficiency percentage (0-100%) comparing actual DI to theoretical maximum. */
  readonly efficiency: number;
}

/**
 * Computes hitlag frames following the exact Smash 64 engine formulas (from calculator.js).
 * U version bonus is 5; J version bonus is 4.
 */
export function calculateHitlagFrames(
  damage: number,
  options: HitlagOptions = {},
): number {
  const dmg = Math.max(0, Math.trunc(damage));
  if (dmg <= 0) return 0;

  const version = options.version ?? "U";
  const bonus = version === "J" ? 4 : 5;
  const isElectric = Boolean(options.isElectric);
  const state = options.targetState ?? "standing";

  if (state === "laying") {
    const extra = Math.ceil(dmg / 2);
    const base = Math.floor(extra / 3) + bonus;
    return isElectric ? Math.floor(base * 1.5) : base;
  }

  if (state === "crouching") {
    const base = Math.floor(dmg / 3);
    if (isElectric) {
      const value = base + bonus;
      return value & ~1;
    }
    return Math.floor((base * 2 + bonus * 2) / 3);
  }

  let base = Math.floor(dmg / 3) + bonus;
  if (isElectric) {
    base = Math.floor(base * 1.5);
  }
  return base;
}

/**
 * Backwards-compatible DI frames calculation (for standard standing hits).
 */
export function calculateDIFrames(damage: number, isElectric = false): number {
  return calculateHitlagFrames(damage, { isElectric, version: "U" });
}

/**
 * Checks if a stick input satisfies the Smash 64 DI activation condition relative to previous stick input.
 */
export function checkDIActivation(
  prevX: number,
  prevY: number,
  currX: number,
  currY: number,
): boolean {
  const currMag = Math.hypot(currX, currY);
  if (currMag < DI_MIN_MAGNITUDE) return false;

  const wasInDeadzoneX = Math.abs(prevX) <= DI_DEADZONE_STICK;
  const wasInDeadzoneY = Math.abs(prevY) <= DI_DEADZONE_STICK;
  const wasInDeadzone = wasInDeadzoneX && wasInDeadzoneY;

  const isNowOutOfDeadzoneX = Math.abs(currX) > DI_DEADZONE_STICK;
  const isNowOutOfDeadzoneY = Math.abs(currY) > DI_DEADZONE_STICK;

  // 1. Leaving the deadzone center box
  if (wasInDeadzone && (isNowOutOfDeadzoneX || isNowOutOfDeadzoneY)) {
    return true;
  }

  // 2. Crossing from one side to the opposite side across the center
  const crossedX =
    (prevX < -DI_DEADZONE_STICK && currX > DI_DEADZONE_STICK) ||
    (prevX > DI_DEADZONE_STICK && currX < -DI_DEADZONE_STICK);
  const crossedY =
    (prevY < -DI_DEADZONE_STICK && currY > DI_DEADZONE_STICK) ||
    (prevY > DI_DEADZONE_STICK && currY < -DI_DEADZONE_STICK);

  return crossedX || crossedY;
}

/**
 * Classifies an angle into a cardinal direction.
 * Angle in degrees: 0° is Right (+X), 90° is Up (+Y in Smash 64 stage coords), 180° is Left (-X), 270°/-90° is Down (-Y).
 */
export function classifyDICardinal(
  dx: number,
  dy: number,
  minDist = 8,
): DICardinalDirection {
  if (Math.hypot(dx, dy) < minDist) return "neutral";

  const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const normDeg = (deg + 360) % 360;

  if (normDeg >= 337.5 || normDeg < 22.5) return "right";
  if (normDeg >= 22.5 && normDeg < 67.5) return "up-right";
  if (normDeg >= 67.5 && normDeg < 112.5) return "up";
  if (normDeg >= 112.5 && normDeg < 157.5) return "up-left";
  if (normDeg >= 157.5 && normDeg < 202.5) return "left";
  if (normDeg >= 202.5 && normDeg < 247.5) return "down-left";
  if (normDeg >= 247.5 && normDeg < 292.5) return "down";
  return "down-right";
}

/**
 * Classifies DI direction relative to the attacker's position.
 */
export function classifyDIRelative(
  dx: number,
  dy: number,
  victimX: number,
  attackerX: number | null,
  minDist = 8,
): DIRelativeDirection {
  if (Math.hypot(dx, dy) < minDist) return "neutral";
  if (attackerX === null) {
    const card = classifyDICardinal(dx, dy, minDist);
    if (card === "up") return "up";
    if (card === "down") return "down";
    return "neutral";
  }

  const attackerIsOnRight = attackerX > victimX;
  const movedRight = dx > 4;
  const movedLeft = dx < -4;
  const movedUp = dy > 12;
  const movedDown = dy < -12;

  const movedAway =
    (attackerIsOnRight && movedLeft) || (!attackerIsOnRight && movedRight);
  const movedIn =
    (attackerIsOnRight && movedRight) || (!attackerIsOnRight && movedLeft);

  if (movedUp && movedAway) return "up-away";
  if (movedUp && movedIn) return "up-in";
  if (movedDown && movedAway) return "down-away";
  if (movedDown && movedIn) return "down-in";
  if (movedUp) return "up";
  if (movedDown) return "down";
  if (movedAway) return "away";
  if (movedIn) return "in";

  return "neutral";
}

const CAPTURE_OR_THROW_STATES = new Set([
  0x0a9, // ThrowF
  0x0aa, // ThrowB
  0x0ab, // CapturePull / ThrowLw
  0x0ac, // CaptureWait
  0x0ad, // CaptureDamage
  0x0b2, // FalconDive
  0x0b3, // CaptureFalconDive
  0x0b4, // CargoThrowF
  0x0b5, // CargoThrowB
  0x0b6, // CaptureCargo
  0x0b7, // CargoThrowHi
  0x0b8, // CargoThrowLw
  0x0b9, // CapturePulled
  0x0ba, // DamageThrown / Thrown
  0x0bb, // DamageThrown
  0x0bc, // DamageThrown
]);

/**
 * Analyzes DI for a specific hit on `victimPort` starting at `hitFrameIndex`.
 */
export function calculateHitDI(
  replay: Replay,
  hitFrameIndex: number,
  victimPort: PortIndex,
  attackerPort: PortIndex | null = null,
): HitDIResult | null {
  const startFrame = replay.frames[hitFrameIndex];
  if (!startFrame) return null;

  const prevFrame = replay.frames[hitFrameIndex - 1];
  const startPost = startFrame.ports[victimPort]?.post;
  const prevPost = prevFrame?.ports[victimPort]?.post;
  if (!startPost || !prevPost) return null;

  const damageDealt = Math.max(
    0,
    startPost.damagePercent - prevPost.damagePercent,
  );
  if (damageDealt <= 0) return null;

  const attackerPost =
    attackerPort !== null
      ? (startFrame.ports[attackerPort]?.post ?? null)
      : null;

  // In Smash 64, throws and grab captures cannot be DI'd
  if (
    CAPTURE_OR_THROW_STATES.has(prevPost.actionStateId) ||
    CAPTURE_OR_THROW_STATES.has(startPost.actionStateId) ||
    (attackerPost && CAPTURE_OR_THROW_STATES.has(attackerPost.actionStateId))
  ) {
    return null;
  }

  const isElectric = ELECTRIC_HIT_STATES.has(startPost.actionStateId);
  const isCrouching = CROUCH_ACTION_STATES.has(prevPost.actionStateId);
  const isLaying =
    prevPost.actionStateId === 0x0bb || prevPost.actionStateId === 0x0bc;
  const targetState = isLaying
    ? "laying"
    : isCrouching
      ? "crouching"
      : "standing";

  const expectedHitlag = calculateHitlagFrames(damageDealt, {
    isElectric,
    targetState,
    version: "U",
  });
  if (expectedHitlag <= 0) return null;

  // Dynamically locate the actual hitlag window in the replay (frames where knockback velocity hasn't started yet)
  let endHitlagFrameIndex = hitFrameIndex;
  for (let k = 1; k <= expectedHitlag + 4; k++) {
    const fIdx = hitFrameIndex + k;
    const f = replay.frames[fIdx];
    if (!f) break;
    const post = f.ports[victimPort]?.post;
    if (!post) break;
    if (post.velocityX !== 0 || post.velocityY !== 0) {
      endHitlagFrameIndex = hitFrameIndex + k - 1;
      break;
    }
    endHitlagFrameIndex = fIdx;
  }
  const diWindow = Math.max(1, endHitlagFrameIndex - hitFrameIndex + 1);

  const startPos = { x: startPost.positionX, y: startPost.positionY };

  let inputCount = 0;
  const inputs: DISingleStickInput[] = [];

  let lastX = prevFrame.ports[victimPort]?.pre?.stickX ?? 0;
  let lastY = prevFrame.ports[victimPort]?.pre?.stickY ?? 0;
  let lastRecordedPos = { x: startPost.positionX, y: startPost.positionY };

  let theoreticalDx = 0;
  let theoreticalDy = 0;

  for (let k = 0; k < diWindow; k++) {
    const fIdx = hitFrameIndex + k;
    const f = replay.frames[fIdx];
    if (!f) break;

    const pre = f.ports[victimPort]?.pre;
    const post = f.ports[victimPort]?.post;
    const currX = pre?.stickX ?? 0;
    const currY = pre?.stickY ?? 0;
    const mag = Math.hypot(currX, currY);

    const isAct = checkDIActivation(lastX, lastY, currX, currY);
    if (isAct) {
      inputCount++;
      const clampedX = Math.max(-DI_STICK_MAX, Math.min(DI_STICK_MAX, currX));
      const clampedY = Math.max(-DI_STICK_MAX, Math.min(DI_STICK_MAX, currY));
      theoreticalDx += clampedX * DI_STICK_DISPLACEMENT_FACTOR;
      theoreticalDy += clampedY * DI_STICK_DISPLACEMENT_FACTOR;
    }

    const currPos = post
      ? { x: post.positionX, y: post.positionY }
      : lastRecordedPos;
    const stepDx = currPos.x - lastRecordedPos.x;
    const stepDy = currPos.y - lastRecordedPos.y;
    lastRecordedPos = currPos;

    inputs.push({
      frameIndex: fIdx,
      hitlagFrame: k,
      stickX: currX,
      stickY: currY,
      magnitude: mag,
      isActivation: isAct,
      displacementX: stepDx,
      displacementY: stepDy,
    });

    lastX = currX;
    lastY = currY;
  }

  let dx = 0;
  let dy = 0;

  if (inputCount > 0) {
    const endPost = replay.frames[endHitlagFrameIndex]?.ports[victimPort]?.post;
    if (endPost) {
      dx = endPost.positionX - startPos.x;
      dy = endPost.positionY - startPos.y;
    }
  }

  const distance = Math.hypot(dx, dy);
  const angleRad = Math.atan2(dy, dx);
  const angleDeg = (angleRad * 180) / Math.PI;
  const endPos = { x: startPos.x + dx, y: startPos.y + dy };
  const attackerX = attackerPost ? attackerPost.positionX : null;

  // If physical displacement was constrained (e.g. grounded character DIing down into the floor),
  // derive direction from the theoretical/stick vector on activation frames.
  let effectiveDx = dx;
  let effectiveDy = dy;
  if (Math.hypot(dx, dy) < 8 && inputCount > 0) {
    effectiveDx = theoreticalDx !== 0 ? theoreticalDx : 0;
    effectiveDy = theoreticalDy !== 0 ? theoreticalDy : 0;
  }

  const cardinal = classifyDICardinal(effectiveDx, effectiveDy);
  const relative = classifyDIRelative(
    effectiveDx,
    effectiveDy,
    startPos.x,
    attackerX,
  );

  // Theoretical max displacement per DI frame in 64: max ~1 activation per 2 frames, ~168 units per activation
  const maxPossibleActivations = Math.max(1, Math.floor(diWindow / 2) + 1);
  const theoreticalDist = Math.hypot(theoreticalDx, theoreticalDy);
  const efficiency = Math.min(
    100,
    Math.round(
      (inputCount / maxPossibleActivations) * 70 +
        Math.min(30, (distance / (maxPossibleActivations * 168)) * 30),
    ),
  );

  return {
    id: `di-${victimPort}-${hitFrameIndex}`,
    hitFrameIndex,
    hitFrameNumber: startFrame.frame,
    victimPort,
    attackerPort,
    damageDealt,
    startDamage: prevPost.damagePercent,
    endDamage: startPost.damagePercent,
    diWindowFrames: diWindow,
    endHitlagFrameIndex,
    isElectric,
    inputCount,
    inputs,
    startPos,
    endPos,
    displacement: {
      dx,
      dy,
      distance,
      angleRad,
      angleDeg,
    },
    theoreticalDisplacement: {
      dx: theoreticalDx,
      dy: theoreticalDy,
      distance: theoreticalDist,
    },
    cardinal,
    relative,
    efficiency,
  };
}

/**
 * Scans the entire replay and extracts all hit events with DI analysis.
 */
export function extractAllHitsWithDI(replay: Replay): HitDIResult[] {
  const results: HitDIResult[] = [];
  const seated = getSeatedPorts(replay);
  if (seated.length < 2) return results;

  for (let f = 1; f < replay.frames.length; f++) {
    const prev = replay.frames[f - 1];
    const curr = replay.frames[f];
    if (!prev || !curr) continue;

    for (const victimPort of seated) {
      const pPrev = prev.ports[victimPort]?.post;
      const pCurr = curr.ports[victimPort]?.post;
      if (pPrev && pCurr && pCurr.damagePercent > pPrev.damagePercent) {
        // Find other seated port as attacker
        const attackerPort =
          (seated.find((p) => p !== victimPort) as PortIndex) ?? null;
        const hitDI = calculateHitDI(replay, f, victimPort, attackerPort);
        if (hitDI) {
          results.push(hitDI);
          // Advance f past hitlag to avoid double counting same hit
          f += Math.max(0, hitDI.diWindowFrames - 1);
          break;
        }
      }
    }
  }

  return results;
}
