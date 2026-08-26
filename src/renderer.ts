import type { Frame, PortIndex, Replay } from "@rmg-k/rmgr";
import { Camera } from "./camera.js";
import {
  getPlayerColor,
  PORT_LABELS,
  MAIN_PLAYER_COLOR,
  OPPONENT_COLOR,
} from "./players.js";
import {
  stageGeometry,
  stageBlastZone,
  type PlatformSpec,
} from "./stageGeometry.js";
import { characterSize } from "./characterSizes.js";
import {
  EDGE_GUARD_STAGE_ID,
  ZONE_Y_LO,
  ZONE_Y_HI,
  ZONE_X_AT_Y_LO,
  ZONE_X_AT_Y_HI,
  isHitstunState,
} from "./edgeGuard.js";

const SHIELD_ACTION_STATES = new Set([
  0x098, // ShieldOn
  0x099, // Shield
  0x09a, // ShieldOff
  0x09b, // ShieldStun
]);

export function isShieldState(actionStateId: number): boolean {
  return SHIELD_ACTION_STATES.has(actionStateId);
}

export function isShieldStunState(actionStateId: number): boolean {
  return actionStateId === 0x09b;
}

export function isSpecialState(actionStateId: number): boolean {
  return actionStateId >= 0x0dc;
}

const LANDING_ACTION_STATES = new Set([
  0x01f, // LandingLight
  0x020, // LandingHeavy
  0x03b, // LandingSpecial
  0x0db, // LandingAirX
]);

export function isLandingState(actionStateId: number): boolean {
  return LANDING_ACTION_STATES.has(actionStateId);
}

const DEAD_ACTION_STATES = new Set([
  0x000, // DeadD
  0x001, // DeadS
  0x002, // DeadU
  0x003, // ScreenKO
  0x004, // ScreenKOWait
]);

export function isDeadState(actionStateId: number): boolean {
  return DEAD_ACTION_STATES.has(actionStateId);
}

export type DeathDirection = "bottom" | "left" | "right" | "top" | "screen";

export function getDeathDirection(
  actionStateId: number,
  positionX: number,
): DeathDirection | null {
  if (actionStateId === 0x000) return "bottom";
  if (actionStateId === 0x001) return positionX > 0 ? "right" : "left";
  if (actionStateId === 0x002) return "top";
  if (actionStateId === 0x003 || actionStateId === 0x004) return "screen";
  return null;
}

const CROUCH_ACTION_STATES = new Set([
  0x01c, // Crouch
  0x01d, // CrouchIdle
  0x01e, // CrouchEnd
]);

export function isCrouchState(actionStateId: number): boolean {
  return CROUCH_ACTION_STATES.has(actionStateId);
}

const TAUNT_ACTION_STATES = new Set([
  0x0bd, // Taunt
]);

export function isTauntState(actionStateId: number): boolean {
  return TAUNT_ACTION_STATES.has(actionStateId);
}

const DIZZY_ACTION_STATES = new Set([
  0x09e, // ShieldBreakFly (launched into air dizzy)
  0x09f, // ShieldBreakFall (falling through air dizzy)
  0x0a1, // ShieldBreakStand (standing up dizzy)
  0x0a2, // FuraFura (shield broken dizzy stuck state)
  0x0a4, // Stun (stunned dizzy)
]);

export function isDizzyState(actionStateId: number): boolean {
  return DIZZY_ACTION_STATES.has(actionStateId);
}

const SHIELD_BREAK_ACTION_STATES = new Set([
  0x09e, // ShieldBreakFly
  0x09f, // ShieldBreakFall
  0x0a0, // ShieldBreakDownBound
  0x0a1, // ShieldBreakStand
  0x0a2, // FuraFura
  0x0a4, // Stun
]);

export function isShieldBreakActionState(actionStateId: number): boolean {
  return SHIELD_BREAK_ACTION_STATES.has(actionStateId);
}

export function isSleepState(actionStateId: number): boolean {
  return actionStateId === 0x0a5;
}

const IDLE_ACTION_STATES = new Set([
  0x00a, // Idle
]);

export function isIdleState(actionStateId: number): boolean {
  return IDLE_ACTION_STATES.has(actionStateId);
}

const WALK_ACTION_STATES = new Set([
  0x00b, // Walk1
  0x00c, // Walk2
  0x00d, // Walk3
]);

export function isWalkState(actionStateId: number): boolean {
  return WALK_ACTION_STATES.has(actionStateId);
}

const DASH_RUN_ACTION_STATES = new Set([
  0x00f, // Dash
  0x010, // Run
]);

export function isDashOrRunState(actionStateId: number): boolean {
  return DASH_RUN_ACTION_STATES.has(actionStateId);
}

const TEETER_ACTION_STATES = new Set([
  0x023, // Teeter
  0x024, // TeeterStart
]);

export function isTeeterState(actionStateId: number): boolean {
  return TEETER_ACTION_STATES.has(actionStateId);
}

const TURN_ACTION_STATES = new Set([
  0x012, // Turn (standing turnaround)
  0x013, // TurnRun (pivot turnaround during dash/run)
]);

export function isTurnState(actionStateId: number): boolean {
  return TURN_ACTION_STATES.has(actionStateId);
}

const TECH_ROLL_ACTION_STATES = new Set([
  0x049, // TechF (Tech forward roll)
  0x04a, // TechB (Tech backward roll)
]);

export function isTechRollState(actionStateId: number): boolean {
  return TECH_ROLL_ACTION_STATES.has(actionStateId);
}

const TECH_IN_PLACE_ACTION_STATES = new Set([
  0x051, // Tech (Passive / Breakfall in place)
  0x04b, // TechWall
  0x04c, // TechCeil
]);

export function isTechInPlaceState(actionStateId: number): boolean {
  return TECH_IN_PLACE_ACTION_STATES.has(actionStateId);
}

export function isAnyTechState(actionStateId: number): boolean {
  return isTechRollState(actionStateId) || isTechInPlaceState(actionStateId);
}

const NORMAL_ROLL_ACTION_STATES = new Set([
  0x09c, // RollF (Forward shield roll)
  0x09d, // RollB (Backward shield roll)
]);

export function isNormalRollState(actionStateId: number): boolean {
  return NORMAL_ROLL_ACTION_STATES.has(actionStateId);
}

const TUMBLE_ACTION_STATES = new Set([
  0x039, // Tumble (DamageFall)
  0x037, // DamageFlyRoll
  0x033, // DamageFlyHigh
  0x034, // DamageFlyMid
  0x035, // DamageFlyLow
  0x036, // DamageFlyTop
]);

export function isTumbleState(actionStateId: number): boolean {
  return TUMBLE_ACTION_STATES.has(actionStateId);
}

const DOWN_BOUND_ACTION_STATES = new Set([
  0x043, // DownBoundD (Ground bounce face down)
  0x04a, // DownBoundU (Ground bounce face up)
  0x0a0, // ShieldBreakDownBound
  0x038, // WallBounce
  0x042, // CeilingBonk
]);

export function isDownBoundState(actionStateId: number): boolean {
  return DOWN_BOUND_ACTION_STATES.has(actionStateId);
}

const PRONE_ACTION_STATES = new Set([
  0x044, // DownWaitD (Lying prone face down on floor)
  0x04c, // DownWaitU (Lying prone face up on floor)
  0x043, // DownBoundD
  0x04a, // DownBoundU
]);

export function isProneState(actionStateId: number): boolean {
  return PRONE_ACTION_STATES.has(actionStateId);
}

const MISSED_TECH_ACTION_STATES = new Set([
  ...PRONE_ACTION_STATES,
  0x045, // DownStandD (Getup neutral face down)
  0x04d, // DownStandU (Getup neutral face up)
  0x047, // DownForwardD (Getup roll forward face down)
  0x048, // DownBackD (Getup roll back face down)
  0x04b, // DownForwardU (Getup roll forward face up)
  0x04c, // DownBackU (Getup roll back face up)
  0x04f, // DownAttackD (Getup attack face down)
  0x050, // DownAttackU (Getup attack face up)
]);

export function isMissedTechState(actionStateId: number): boolean {
  return MISSED_TECH_ACTION_STATES.has(actionStateId);
}

const ROLL_ACTION_STATES = new Set([
  0x09c, // RollF (Forward shield roll)
  0x09d, // RollB (Backward shield roll)
  0x049, // TechF (Tech forward roll)
  0x04a, // TechB (Tech backward roll)
  0x047, // DownForwardD (Get-up roll forward from face down)
  0x048, // DownBackD (Get-up roll back from face down)
  0x04b, // DownForwardU (Get-up roll forward from face up)
  0x04c, // DownBackU (Get-up roll back from face up)
  0x058, // CliffRollQuick (Ledge roll quick)
  0x05b, // CliffRollSlow (Ledge roll slow)
]);

export function isRollState(actionStateId: number): boolean {
  return ROLL_ACTION_STATES.has(actionStateId);
}

export function isRollForward(actionStateId: number): boolean {
  return (
    actionStateId === 0x09c ||
    actionStateId === 0x049 ||
    actionStateId === 0x047 ||
    actionStateId === 0x04b ||
    actionStateId === 0x058 ||
    actionStateId === 0x05b
  );
}

/** Total frames at match start where player name tags are displayed (240 frames = 4.0s @ 60fps). */
export const START_NAME_DISPLAY_FRAMES = 240;
/** Frames at match start with 100% full opacity before fading out. */
export const START_NAME_SOLID_FRAMES = 180;

/**
 * Calculates opacity alpha (0.0 to 1.0) for player name tags at the start of a match.
 * Full opacity for the first 3 seconds (0..180 frames), then fades out smoothly over the next 1 second (180..240 frames).
 */
export function getStartNameAlpha(frameIndex: number | undefined): number {
  if (
    frameIndex === undefined ||
    frameIndex < 0 ||
    frameIndex >= START_NAME_DISPLAY_FRAMES
  ) {
    return 0;
  }
  if (frameIndex <= START_NAME_SOLID_FRAMES) {
    return 1;
  }
  return (
    (START_NAME_DISPLAY_FRAMES - frameIndex) /
    (START_NAME_DISPLAY_FRAMES - START_NAME_SOLID_FRAMES)
  );
}

export type AttackType = "tilt" | "smash" | "aerial" | "jab" | "grab";
export type AttackDirection = "up" | "down" | "forward" | "back" | "neutral";

export interface AttackInfo {
  type: AttackType;
  direction: AttackDirection;
}

const CAPTURE_STATES = new Set([
  0x0ab, // CapturePull
  0x0ac, // CaptureWait
  0x0ad, // CaptureDamage
  0x0b3, // CaptureFalconDive (Captain Falcon & J Falcon Up-B grab)
  0x0b6, // CaptureCargo / CommandGrabHold
  0x0b9, // CapturePulled / ThrowTransition
]);

export function isGrabbedState(actionStateId: number): boolean {
  return CAPTURE_STATES.has(actionStateId);
}

export function isFalconCharacter(characterId: number): boolean {
  return characterId === 0x07 || characterId === 0x15 || characterId === 0x28;
}

export type FalconSpecialType =
  | "punch"
  | "dive_reach"
  | "dive_catch"
  | "dive_explosion"
  | "kick"
  | "kick_end";

export function getFalconSpecialType(
  characterId: number,
  actionStateId: number,
): FalconSpecialType | null {
  if (!isFalconCharacter(characterId)) return null;
  if (
    actionStateId === 0x0e5 ||
    actionStateId === 0x0e6 ||
    actionStateId === 0x0e7
  ) {
    return "punch";
  }
  if (actionStateId === 0x0e8 || actionStateId === 0x0e9) {
    return "dive_reach";
  }
  if (actionStateId === 0x0ea) {
    return "dive_catch";
  }
  if (actionStateId === 0x0ee) {
    return "dive_explosion";
  }
  if (actionStateId === 0x0eb || actionStateId === 0x0ec) {
    return "kick";
  }
  if (actionStateId === 0x0ed) {
    return "kick_end";
  }
  return null;
}

export function isPikachuCharacter(characterId: number): boolean {
  return (
    characterId === 0x09 || // Pikachu
    characterId === 0x17 || // Polygon Pikachu
    characterId === 0x2d || // Pikachu (EU)
    characterId === 0x32 // Pikachu (JP)
  );
}

export type PikachuSpecialType =
  "thunder_jolt" | "thunder" | "quick_attack" | "quick_attack_zip";

export function getPikachuSpecialType(
  characterId: number,
  actionStateId: number,
): PikachuSpecialType | null {
  if (!isPikachuCharacter(characterId)) return null;
  // Neutral-B: Thunder Jolt (0x0dc, 0x0dd, 0x0de, 0x0df, 0x0e0)
  if (
    actionStateId === 0x0dc ||
    actionStateId === 0x0dd ||
    actionStateId === 0x0de ||
    actionStateId === 0x0df ||
    actionStateId === 0x0e0
  ) {
    return "thunder_jolt";
  }
  // Down-B Thunder states: 0xe3, 0xe4, 0xe5, 0xe6, 0xe7
  if (
    actionStateId === 0x0e3 ||
    actionStateId === 0x0e4 ||
    actionStateId === 0x0e5 ||
    actionStateId === 0x0e6 ||
    actionStateId === 0x0e7
  ) {
    return "thunder";
  }
  // Up-B Quick Attack zip/flight states: 0xec (Zip 1), 0xed (Zip 2)
  if (actionStateId === 0x0ec || actionStateId === 0x0ed) {
    return "quick_attack_zip";
  }
  // Up-B Quick Attack startup/landing: 0x0e8, 0x0e9, 0x0ea, 0x0eb
  if (
    actionStateId === 0x0e8 ||
    actionStateId === 0x0e9 ||
    actionStateId === 0x0ea ||
    actionStateId === 0x0eb
  ) {
    return "quick_attack";
  }
  return null;
}

export type YoshiSpecialType =
  | "egg_lay_tongue"
  | "egg_throw"
  | "yoshi_bomb_start"
  | "yoshi_bomb_plummet"
  | "yoshi_bomb_land";

export function getYoshiSpecialType(
  characterId: number,
  actionStateId: number,
): YoshiSpecialType | null {
  if (!isYoshiCharacter(characterId)) return null;
  // Neutral-B: Egg Lay (Tongue Catch)
  if (
    actionStateId === 0x0df ||
    actionStateId === 0x0e0 ||
    actionStateId === 0x0e1
  ) {
    return "egg_lay_tongue";
  }
  // Up-B: Egg Throw
  if (actionStateId === 0x0e2 || actionStateId === 0x0e3) {
    return "egg_throw";
  }
  // Down-B: Yoshi Bomb (Hip Drop)
  if (actionStateId === 0x0e4) {
    return "yoshi_bomb_start";
  }
  if (actionStateId === 0x0e5 || actionStateId === 0x0e6) {
    return "yoshi_bomb_plummet";
  }
  if (actionStateId === 0x0e7) {
    return "yoshi_bomb_land";
  }
  return null;
}

export type DKSpecialType =
  "spinning_kong" | "hand_slap" | "giant_punch_windup" | "giant_punch";

export function getDKSpecialType(
  characterId: number,
  actionStateId: number,
): DKSpecialType | null {
  if (!isDonkeyKongCharacter(characterId)) return null;
  // Up-B: Spinning Kong
  if (actionStateId === 0x0e6 || actionStateId === 0x0e7) {
    return "spinning_kong";
  }
  // Down-B: Hand Slap
  if (
    actionStateId === 0x0e8 ||
    actionStateId === 0x0e9 ||
    actionStateId === 0x0ea
  ) {
    return "hand_slap";
  }
  // Neutral-B: Giant Punch
  if (actionStateId === 0x0eb) {
    return "giant_punch_windup";
  }
  if (actionStateId === 0x0ec) {
    return "giant_punch";
  }
  return null;
}

export type NessSpecialType =
  "pk_fire" | "pk_thunder_charge" | "pk_thunder_rocket" | "psi_magnet";

export function getNessSpecialType(
  characterId: number,
  actionStateId: number,
): NessSpecialType | null {
  if (!isNessCharacter(characterId)) return null;
  // Neutral-B: PK Fire
  if (actionStateId === 0x0e6 || actionStateId === 0x0e7) {
    return "pk_fire";
  }
  // Up-B: PK Thunder
  if (actionStateId === 0x0e8 || actionStateId === 0x0e9) {
    return "pk_thunder_charge";
  }
  if (actionStateId === 0x0ea) {
    return "pk_thunder_rocket";
  }
  // Down-B: PSI Magnet
  if (
    actionStateId === 0x0eb ||
    actionStateId === 0x0ec ||
    actionStateId === 0x0ed
  ) {
    return "psi_magnet";
  }
  return null;
}

export type MarioSpecialType = "fireball" | "super_jump_punch" | "tornado";

export function getMarioSpecialType(
  characterId: number,
  actionStateId: number,
): MarioSpecialType | null {
  if (!isMarioCharacter(characterId) && !isLuigiCharacter(characterId)) {
    return null;
  }
  // Neutral-B Fireball: 0x0dc, 0x0dd, 0x0de
  if (
    actionStateId === 0x0dc ||
    actionStateId === 0x0dd ||
    actionStateId === 0x0de
  ) {
    return "fireball";
  }
  // Up-B Super Jump Punch: 0x0df, 0x0e0, 0x0e1, 0x0e2
  if (
    actionStateId === 0x0df ||
    actionStateId === 0x0e0 ||
    actionStateId === 0x0e1 ||
    actionStateId === 0x0e2
  ) {
    return "super_jump_punch";
  }
  // Down-B Tornado / Cyclone: 0x0e3, 0x0e4, 0x0e5
  if (
    actionStateId === 0x0e3 ||
    actionStateId === 0x0e4 ||
    actionStateId === 0x0e5
  ) {
    return "tornado";
  }
  return null;
}

export type SamusSpecialType = "charge_shot" | "screw_attack" | "bomb";

export function getSamusSpecialType(
  characterId: number,
  actionStateId: number,
): SamusSpecialType | null {
  if (!isSamusCharacter(characterId)) return null;
  // Neutral-B: Charge Shot (0x0dc - 0x0de)
  if (
    actionStateId === 0x0dc ||
    actionStateId === 0x0dd ||
    actionStateId === 0x0de
  ) {
    return "charge_shot";
  }
  // Up-B: Screw Attack (0x0e5 - 0x0e7)
  if (
    actionStateId === 0x0e5 ||
    actionStateId === 0x0e6 ||
    actionStateId === 0x0e7
  ) {
    return "screw_attack";
  }
  // Down-B: Bomb (0x0e8 - 0x0ea)
  if (
    actionStateId === 0x0e8 ||
    actionStateId === 0x0e9 ||
    actionStateId === 0x0ea
  ) {
    return "bomb";
  }
  return null;
}

export type LinkSpecialType = "boomerang" | "spin_attack" | "bomb";

export function getLinkSpecialType(
  characterId: number,
  actionStateId: number,
): LinkSpecialType | null {
  if (!isLinkCharacter(characterId)) return null;
  // Neutral-B: Boomerang (0x0dc - 0x0de)
  if (
    actionStateId === 0x0dc ||
    actionStateId === 0x0dd ||
    actionStateId === 0x0de
  ) {
    return "boomerang";
  }
  // Up-B: Spin Attack (0x0e5 - 0x0e8)
  if (
    actionStateId === 0x0e5 ||
    actionStateId === 0x0e6 ||
    actionStateId === 0x0e7 ||
    actionStateId === 0x0e8
  ) {
    return "spin_attack";
  }
  // Down-B: Bomb (0x0e9 - 0x0eb)
  if (
    actionStateId === 0x0e9 ||
    actionStateId === 0x0ea ||
    actionStateId === 0x0eb
  ) {
    return "bomb";
  }
  return null;
}

export type KirbySpecialType = "inhale" | "final_cutter" | "stone";

export function getKirbySpecialType(
  characterId: number,
  actionStateId: number,
): KirbySpecialType | null {
  if (!isKirbyCharacter(characterId)) return null;
  // Neutral-B: Inhale (0x0dc - 0x0de)
  if (
    actionStateId === 0x0dc ||
    actionStateId === 0x0dd ||
    actionStateId === 0x0de
  ) {
    return "inhale";
  }
  // Up-B: Final Cutter (0x0e5 - 0x0e8)
  if (
    actionStateId === 0x0e5 ||
    actionStateId === 0x0e6 ||
    actionStateId === 0x0e7 ||
    actionStateId === 0x0e8
  ) {
    return "final_cutter";
  }
  // Down-B: Stone (0x0e9 - 0x0eb)
  if (
    actionStateId === 0x0e9 ||
    actionStateId === 0x0ea ||
    actionStateId === 0x0eb
  ) {
    return "stone";
  }
  return null;
}

export type JigglypuffSpecialType = "pound" | "sing" | "rest";

export function getJigglypuffSpecialType(
  characterId: number,
  actionStateId: number,
): JigglypuffSpecialType | null {
  if (!isJigglypuffCharacter(characterId)) return null;
  // Neutral-B: Pound (0x0dc - 0x0de)
  if (
    actionStateId === 0x0dc ||
    actionStateId === 0x0dd ||
    actionStateId === 0x0de
  ) {
    return "pound";
  }
  // Up-B: Sing (0x0df - 0x0e1, 0x0e4 - 0x0e6)
  if (
    actionStateId === 0x0df ||
    actionStateId === 0x0e0 ||
    actionStateId === 0x0e1 ||
    actionStateId === 0x0e4 ||
    actionStateId === 0x0e5 ||
    actionStateId === 0x0e6
  ) {
    return "sing";
  }
  // Down-B: Rest (0x0e2 - 0x0e4, 0x0e7 - 0x0e9)
  if (
    actionStateId === 0x0e2 ||
    actionStateId === 0x0e3 ||
    actionStateId === 0x0e4 ||
    actionStateId === 0x0e7 ||
    actionStateId === 0x0e8 ||
    actionStateId === 0x0e9
  ) {
    return "rest";
  }
  return null;
}

const QUICK_ATTACK_STATES = new Set([
  0x0e8, // Ground QA Startup
  0x0eb, // Air QA Startup
  0x0ec, // Quick Attack Zip 1
  0x0ed, // Quick Attack Zip 2
  0x0e9, // QA End / Landing
  0x0ea, // QA Landing
]);

export function isQuickAttackState(actionStateId: number): boolean {
  return QUICK_ATTACK_STATES.has(actionStateId);
}

export interface QuickAttackPath {
  readonly index: number;
  readonly port: PortIndex;
  readonly startFrame: number;
  readonly startFrameIndex: number;
  readonly endFrame: number;
  readonly endFrameIndex: number;
  readonly points: Array<{ x: number; y: number }>;
  readonly zipCount: number;
}

/**
 * Extracts all Quick Attack (Up-B) trajectories for a Pikachu player across an entire replay.
 */
export function extractAllQuickAttackPaths(
  replay: Replay,
  port: PortIndex,
): QuickAttackPath[] {
  const paths: QuickAttackPath[] = [];
  const charId = replay.gameStart.ports[port]?.characterId ?? 0x09;
  if (!isPikachuCharacter(charId)) return paths;

  const size = characterSize(charId);
  const halfHeight = size.height * 0.5;

  let currentPoints: Array<{ x: number; y: number }> = [];
  let startFrame = 0;
  let startFrameIndex = 0;
  let inQuickAttack = false;
  let zipCount = 0;

  for (let i = 0; i < replay.frames.length; i++) {
    const f = replay.frames[i];
    if (!f) continue;
    const pData = f.ports[port]?.post;
    if (!pData) continue;

    const isQA = isQuickAttackState(pData.actionStateId);

    if (isQA) {
      if (!inQuickAttack) {
        inQuickAttack = true;
        startFrame = f.frame;
        startFrameIndex = i;
        currentPoints = [];
        zipCount = 0;
      }
      currentPoints.push({
        x: pData.positionX,
        y: pData.positionY + halfHeight,
      });
      if (pData.actionStateId === 0x0ec || pData.actionStateId === 0x0ed) {
        const prevAction =
          i > 0 ? replay.frames[i - 1]?.ports[port]?.post?.actionStateId : null;
        if (prevAction !== pData.actionStateId) {
          zipCount++;
        }
      }
    } else {
      if (inQuickAttack) {
        if (currentPoints.length >= 2) {
          paths.push({
            index: paths.length + 1,
            port,
            startFrame,
            startFrameIndex,
            endFrame: replay.frames[i - 1]?.frame ?? startFrame,
            endFrameIndex: i - 1,
            points: currentPoints,
            zipCount: Math.max(1, zipCount),
          });
        }
        inQuickAttack = false;
        currentPoints = [];
        zipCount = 0;
      }
    }
  }

  if (inQuickAttack && currentPoints.length >= 2) {
    const lastIdx = replay.frames.length - 1;
    paths.push({
      index: paths.length + 1,
      port,
      startFrame,
      startFrameIndex,
      endFrame: replay.frames[lastIdx]?.frame ?? startFrame,
      endFrameIndex: lastIdx,
      points: currentPoints,
      zipCount: Math.max(1, zipCount),
    });
  }

  return paths;
}

export function isFoxCharacter(characterId: number): boolean {
  return (
    characterId === 0x01 || // Fox
    characterId === 0x0f || // Polygon Fox
    characterId === 0x1d || // Falco
    characterId === 0x29 || // Fox (JP)
    characterId === 0x55 // Polygon Falco
  );
}

export type FoxSpecialType =
  | "firefox_charge"
  | "firefox_fly"
  | "firefox_end"
  | "shine_start"
  | "shine_loop"
  | "shine_hit"
  | "shine_end"
  | "blaster";

export function getFoxSpecialType(
  characterId: number,
  actionStateId: number,
): FoxSpecialType | null {
  if (!isFoxCharacter(characterId)) return null;

  // Neutral-B Blaster: 0x0dc - 0x0e3
  if (actionStateId >= 0x0dc && actionStateId <= 0x0e3) {
    return "blaster";
  }

  // Up-B Fire Fox Charge / Startup: 0x0e4 - 0x0e7
  if (actionStateId >= 0x0e4 && actionStateId <= 0x0e7) {
    return "firefox_charge";
  }
  // Up-B Fire Fox Flight: 0x0e8, 0x0ec
  if (actionStateId === 0x0e8 || actionStateId === 0x0ec) {
    return "firefox_fly";
  }
  // Up-B Fire Fox End / Decel / Landing: 0x0e9, 0x0ea, 0x0eb, 0x0ed - 0x0f0
  if (actionStateId >= 0x0e9 && actionStateId <= 0x0f0) {
    return "firefox_end";
  }

  // Down-B Reflector / Shine: 0x0f1 - 0x0fa
  if (actionStateId === 0x0f1 || actionStateId === 0x0f2) {
    return "shine_start";
  }
  if (actionStateId === 0x0f5 || actionStateId === 0x0f6) {
    return "shine_hit";
  }
  if (
    actionStateId === 0x0f3 ||
    actionStateId === 0x0f7 ||
    actionStateId === 0x0f8
  ) {
    return "shine_end";
  }
  if (actionStateId >= 0x0f1 && actionStateId <= 0x0fa) {
    return "shine_loop";
  }

  return null;
}

const FIRE_FOX_FLIGHT_STATES = new Set([0x0e8, 0x0ec]);

export function isFireFoxFlightState(actionStateId: number): boolean {
  return FIRE_FOX_FLIGHT_STATES.has(actionStateId);
}

/**
 * Computes Fox's flight angle in screen space radians (where 0 is right, -PI/2 is straight up, +PI/2 is down, PI is left).
 * Returns null if velocity cannot be determined.
 */
export function getFoxFlightAngle(
  replay?: Replay | null,
  frameIndex?: number,
  port?: PortIndex,
  post?: { positionX: number; positionY: number; facingDirection: 1 | -1 },
): number | null {
  if (!replay || frameIndex === undefined || port === undefined || !post) {
    return null;
  }

  // Look back up to 4 frames for velocity delta
  let prevX: number | null = null;
  let prevY: number | null = null;
  for (let back = 1; back <= 4; back++) {
    const prevPost = replay.frames[frameIndex - back]?.ports[port]?.post;
    if (
      prevPost &&
      (Math.abs(prevPost.positionX - post.positionX) > 0.001 ||
        Math.abs(prevPost.positionY - post.positionY) > 0.001)
    ) {
      prevX = prevPost.positionX;
      prevY = prevPost.positionY;
      break;
    }
  }

  // If at start of flight (frame 0), look forward up to 4 frames
  if (prevX === null && frameIndex + 1 < replay.frames.length) {
    for (let fwd = 1; fwd <= 4; fwd++) {
      const fwdPost = replay.frames[frameIndex + fwd]?.ports[port]?.post;
      if (
        fwdPost &&
        (Math.abs(fwdPost.positionX - post.positionX) > 0.001 ||
          Math.abs(fwdPost.positionY - post.positionY) > 0.001)
      ) {
        prevX = 2 * post.positionX - fwdPost.positionX;
        prevY = 2 * post.positionY - fwdPost.positionY;
        break;
      }
    }
  }

  if (prevX !== null && prevY !== null) {
    const dx = post.positionX - prevX;
    const dy = post.positionY - prevY;
    if (Math.hypot(dx, dy) > 0.001) {
      // In world coords: +Y is UP, -Y is DOWN.
      // In screen canvas: +Y is DOWN, -Y is UP.
      return Math.atan2(-dy, dx);
    }
  }

  return null;
}

export function getAttackInfo(actionStateId: number): AttackInfo | null {
  // Jabs
  if (actionStateId === 0x0be || actionStateId === 0x0bf) {
    return { type: "jab", direction: "forward" };
  }

  // Grabs
  if (
    actionStateId === 0x0a6 ||
    actionStateId === 0x0a7 ||
    actionStateId === 0x0a8
  ) {
    return { type: "grab", direction: "forward" };
  }

  // Grounded Tilts
  if (actionStateId === 0x0c7) {
    return { type: "tilt", direction: "up" };
  }
  if (actionStateId === 0x0c9) {
    return { type: "tilt", direction: "down" };
  }
  if (actionStateId >= 0x0c1 && actionStateId <= 0x0c5) {
    return { type: "tilt", direction: "forward" };
  }

  // Grounded Smashes
  if (actionStateId === 0x0cf) {
    return { type: "smash", direction: "up" };
  }
  if (actionStateId === 0x0d0) {
    return { type: "smash", direction: "down" };
  }
  if (actionStateId >= 0x0ca && actionStateId <= 0x0ce) {
    return { type: "smash", direction: "forward" };
  }

  // Aerial Attacks
  if (actionStateId === 0x0d1) {
    return { type: "aerial", direction: "neutral" }; // Nair
  }
  if (actionStateId === 0x0d2) {
    return { type: "aerial", direction: "forward" }; // Fair
  }
  if (actionStateId === 0x0d3) {
    return { type: "aerial", direction: "back" }; // Bair
  }
  if (actionStateId === 0x0d4) {
    return { type: "aerial", direction: "up" }; // Uair
  }
  if (actionStateId === 0x0d5) {
    return { type: "aerial", direction: "down" }; // Dair
  }

  return null;
}

/**
 * Returns whether a character can angle their attack (specifically forward tilt or forward smash).
 * - Fox, Captain Falcon, Samus can angle forward tilt (FTilt) attacks.
 * - Captain Falcon, Samus can angle forward smash (FSmash) attacks.
 */
export function canAngleAttack(
  characterId: number,
  attack: AttackInfo,
): boolean {
  if (attack.direction !== "forward") {
    return false;
  }
  if (attack.type === "tilt") {
    return (
      isFoxCharacter(characterId) ||
      isFalconCharacter(characterId) ||
      isSamusCharacter(characterId)
    );
  }
  if (attack.type === "smash") {
    return isFalconCharacter(characterId) || isSamusCharacter(characterId);
  }
  return false;
}

export function isMarioCharacter(characterId: number): boolean {
  return (
    characterId === 0x00 || // Mario
    characterId === 0x0d || // Metal Mario
    characterId === 0x0e || // Polygon Mario
    characterId === 0x20 || // Dr. Mario
    characterId === 0x2a || // Mario (JP)
    characterId === 0x51 // Polygon Dr. Mario
  );
}

export function isLuigiCharacter(characterId: number): boolean {
  return (
    characterId === 0x04 || // Luigi
    characterId === 0x12 || // Polygon Luigi
    characterId === 0x2b || // Luigi (JP)
    characterId === 0x45 || // Metal Luigi
    characterId === 0x4b // Dr. Luigi
  );
}

export function isDonkeyKongCharacter(characterId: number): boolean {
  return (
    characterId === 0x02 || // Donkey Kong
    characterId === 0x10 || // Polygon DK
    characterId === 0x1a || // Giant DK
    characterId === 0x2c // DK (JP)
  );
}

export function isSamusCharacter(characterId: number): boolean {
  return (
    characterId === 0x03 || // Samus
    characterId === 0x11 || // Polygon Samus
    characterId === 0x22 || // Dark Samus
    characterId === 0x24 || // Samus (JP)
    characterId === 0x33 || // Samus (EU)
    characterId === 0x57 // Polygon Dark Samus
  );
}

export function isLinkCharacter(characterId: number): boolean {
  return (
    characterId === 0x05 || // Link
    characterId === 0x13 || // Polygon Link
    characterId === 0x1f || // Young Link
    characterId === 0x23 || // Link (EU)
    characterId === 0x27 || // Link (JP)
    characterId === 0x5b // Polygon Young Link
  );
}

export function isYoshiCharacter(characterId: number): boolean {
  return (
    characterId === 0x06 || // Yoshi
    characterId === 0x14 || // Polygon Yoshi
    characterId === 0x31 // Yoshi (JP)
  );
}

export function isKirbyCharacter(characterId: number): boolean {
  return (
    characterId === 0x08 || // Kirby
    characterId === 0x16 || // Polygon Kirby
    characterId === 0x30 // Kirby (JP)
  );
}

export function isJigglypuffCharacter(characterId: number): boolean {
  return (
    characterId === 0x0a || // Jigglypuff
    characterId === 0x18 || // Polygon Jigglypuff
    characterId === 0x2e || // Jigglypuff (JP)
    characterId === 0x2f // Jigglypuff (EU)
  );
}

export function isNessCharacter(characterId: number): boolean {
  return (
    characterId === 0x0b || // Ness
    characterId === 0x19 || // Polygon Ness
    characterId === 0x25 || // Ness (JP)
    characterId === 0x26 || // Lucas
    characterId === 0x4e // Polygon Lucas
  );
}

export function toGrayscale(colorStr: string, overrideAlpha?: number): string {
  if (colorStr.startsWith("#")) {
    let hex = colorStr.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    const finalAlpha = overrideAlpha ?? a;
    return finalAlpha < 1
      ? `rgba(${lum}, ${lum}, ${lum}, ${finalAlpha})`
      : `rgb(${lum}, ${lum}, ${lum})`;
  }
  if (colorStr.startsWith("rgba(") || colorStr.startsWith("rgb(")) {
    const match = colorStr.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
    );
    if (match && match[1] && match[2] && match[3]) {
      const r = parseInt(match[1], 10);
      const g = parseInt(match[2], 10);
      const b = parseInt(match[3], 10);
      const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
      const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      const finalAlpha = overrideAlpha ?? a;
      return finalAlpha < 1
        ? `rgba(${lum}, ${lum}, ${lum}, ${finalAlpha})`
        : `rgb(${lum}, ${lum}, ${lum})`;
    }
  }
  if (colorStr.startsWith("hsl(")) {
    return colorStr.replace(
      /hsl\(\s*[\d.]+\s*,\s*[\d.]+%?\s*,\s*([\d.]+%?)\s*\)/,
      "hsl(0, 0%, $1)",
    );
  }
  return colorStr;
}

function resolveColor(
  hexOrCss: string,
  isOpponent: boolean,
  alpha?: number,
): string {
  if (isOpponent) {
    return toGrayscale(hexOrCss, alpha);
  }
  if (alpha !== undefined && alpha < 1) {
    return hexToRgba(hexOrCss, alpha);
  }
  return hexOrCss;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface CharacterAnimState {
  taunting: boolean;
  inCombo: boolean;
  isRoll: boolean;
  isTechRoll: boolean;
  isTechInPlace: boolean;
  isTumble: boolean;
  isProne: boolean;
  isDownBound: boolean;
  isInvulnerable: boolean;
  isSpecial: boolean;
  isLanding: boolean;
  isDizzy: boolean;
  isSleep: boolean;
  isOpponent: boolean;
  actionFrameCounter: number;
}

export class StageRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private quickAttackOverlayPaths: QuickAttackPath[] | null = null;
  private hoveredQuickAttackIndex: number | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
  }

  public setQuickAttackOverlay(paths: QuickAttackPath[] | null): void {
    this.quickAttackOverlayPaths = paths;
  }

  public getQuickAttackOverlayPaths(): QuickAttackPath[] | null {
    return this.quickAttackOverlayPaths;
  }

  public setHoveredQuickAttackIndex(index: number | null): void {
    this.hoveredQuickAttackIndex = index;
  }

  public isQuickAttackOverlayActive(): boolean {
    return (
      this.quickAttackOverlayPaths !== null &&
      this.quickAttackOverlayPaths.length > 0
    );
  }

  render(
    camera: Camera,
    frame: Frame | undefined,
    stageId: number | undefined,
    hoverScreen: { x: number; y: number } | undefined,
    replay?: Replay | null,
    frameIndex?: number,
    perspectivePort?: PortIndex | null,
  ): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawBackground();
    this.drawBlastZone(camera, stageId);
    this.drawEdgeGuardZone(camera, stageId);
    this.drawStage(camera, stageId);

    // If Quick Attack Overlay mode is active:
    if (
      this.quickAttackOverlayPaths &&
      this.quickAttackOverlayPaths.length > 0
    ) {
      this.drawQuickAttackOverlay(
        camera,
        this.quickAttackOverlayPaths,
        this.hoveredQuickAttackIndex,
      );
      // Temporarily hide character models while overlay is displayed
      return;
    }

    if (frame) {
      // Draw motion trails (Pikachu Quick Attack streaks, Fox Fire Fox streaks, Roll trails) before characters
      if (replay && frameIndex !== undefined) {
        for (const key of Object.keys(frame.ports)) {
          const port = Number(key) as PortIndex;
          const portData = frame.ports[port];
          if (!portData) continue;
          if (
            isPikachuCharacter(portData.post.characterId) &&
            isQuickAttackState(portData.post.actionStateId)
          ) {
            this.drawPikachuQuickAttackStreak(camera, port, replay, frameIndex);
          }
          if (isRollState(portData.post.actionStateId)) {
            this.drawRollTrail(camera, port, replay, frameIndex);
          }
        }
      }

      for (const key of Object.keys(frame.ports)) {
        const port = Number(key) as PortIndex;
        const portData = frame.ports[port];
        if (!portData) continue;
        if (
          isDeadState(portData.post.actionStateId) ||
          portData.post.stocksRemaining < 0
        ) {
          continue;
        }
        this.drawPlayer(
          camera,
          port,
          portData.post,
          perspectivePort,
          replay,
          frameIndex,
        );
      }
      this.drawDeathDirectionFlashes(frame);
    }

    if (hoverScreen) {
      this.drawHoverCoordinates(camera, hoverScreen);
    }
  }

  /**
   * Draws the outer stage blast zone boundary (death boundary rectangle).
   * Shaded with a subtle outer danger tint and an inward-facing edge gradient.
   */
  private drawBlastZone(camera: Camera, stageId: number | undefined): void {
    const blastZone = stageBlastZone(stageId);
    if (!blastZone) return;

    const { ctx, canvas } = this;
    const tl = camera.worldToScreen(blastZone.leftX, blastZone.topY);
    const br = camera.worldToScreen(blastZone.rightX, blastZone.bottomY);
    const rectX = tl.x;
    const rectY = tl.y;
    const rectW = br.x - tl.x;
    const rectH = br.y - tl.y;

    // 1. Subtle dark danger shade outside the blast zone rectangle
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.rect(rectX, rectY, rectW, rectH);
    ctx.fillStyle = "rgba(255, 30, 20, 0.05)";
    ctx.fill("evenodd");

    // 2. Blast zone perimeter outline with subtle glow
    ctx.beginPath();
    ctx.rect(rectX, rectY, rectW, rectH);
    ctx.strokeStyle = "rgba(255, 60, 40, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Corner brackets at all 4 corners
    const bracketSize = 14;
    ctx.strokeStyle = "rgba(255, 90, 60, 0.75)";
    ctx.lineWidth = 2.5;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(rectX, rectY + bracketSize);
    ctx.lineTo(rectX, rectY);
    ctx.lineTo(rectX + bracketSize, rectY);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(rectX + rectW - bracketSize, rectY);
    ctx.lineTo(rectX + rectW, rectY);
    ctx.lineTo(rectX + rectW, rectY + bracketSize);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(rectX + rectW, rectY + rectH - bracketSize);
    ctx.lineTo(rectX + rectW, rectY + rectH);
    ctx.lineTo(rectX + rectW - bracketSize, rectY + rectH);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(rectX + bracketSize, rectY + rectH);
    ctx.lineTo(rectX, rectY + rectH);
    ctx.lineTo(rectX, rectY + rectH - bracketSize);
    ctx.stroke();

    // 4. Subtle inward perimeter gradient
    const gradDepth = 24;
    // Left edge
    const gLeft = ctx.createLinearGradient(rectX, 0, rectX + gradDepth, 0);
    gLeft.addColorStop(0, "rgba(255, 50, 30, 0.12)");
    gLeft.addColorStop(1, "rgba(255, 50, 30, 0)");
    ctx.fillStyle = gLeft;
    ctx.fillRect(rectX, rectY, gradDepth, rectH);

    // Right edge
    const gRight = ctx.createLinearGradient(
      rectX + rectW,
      0,
      rectX + rectW - gradDepth,
      0,
    );
    gRight.addColorStop(0, "rgba(255, 50, 30, 0.12)");
    gRight.addColorStop(1, "rgba(255, 50, 30, 0)");
    ctx.fillStyle = gRight;
    ctx.fillRect(rectX + rectW - gradDepth, rectY, gradDepth, rectH);

    // Top edge
    const gTop = ctx.createLinearGradient(0, rectY, 0, rectY + gradDepth);
    gTop.addColorStop(0, "rgba(255, 50, 30, 0.12)");
    gTop.addColorStop(1, "rgba(255, 50, 30, 0)");
    ctx.fillStyle = gTop;
    ctx.fillRect(rectX, rectY, rectW, gradDepth);

    // Bottom edge
    const gBot = ctx.createLinearGradient(
      0,
      rectY + rectH,
      0,
      rectY + rectH - gradDepth,
    );
    gBot.addColorStop(0, "rgba(255, 50, 30, 0.12)");
    gBot.addColorStop(1, "rgba(255, 50, 30, 0)");
    ctx.fillStyle = gBot;
    ctx.fillRect(rectX, rectY + rectH - gradDepth, rectW, gradDepth);

    ctx.restore();
  }

  /**
   * Draws a red gradient death flash along the side / blast zone where a player just died.
   * Fades smoothly across the first 45 frames of the death state.
   */
  private drawDeathDirectionFlashes(frame: Frame | undefined): void {
    if (!frame) return;
    const { ctx, canvas } = this;

    for (const key of Object.keys(frame.ports)) {
      const port = Number(key) as PortIndex;
      const portData = frame.ports[port];
      if (!portData) continue;

      const { actionStateId, positionX, actionFrameCounter } = portData.post;
      const direction = getDeathDirection(actionStateId, positionX);
      if (!direction) continue;

      // Death animation fade: strongest on frames 0-10, fading until frame 45
      const MAX_DEATH_FRAMES = 45;
      if (actionFrameCounter >= MAX_DEATH_FRAMES) continue;

      const progress = actionFrameCounter / MAX_DEATH_FRAMES;
      const intensity = Math.max(0, 1 - progress);
      const opacity = intensity * 0.75;
      const depth = 80 + intensity * 140; // 80px - 220px deep sweep

      ctx.save();
      if (direction === "bottom") {
        const grad = ctx.createLinearGradient(
          0,
          canvas.height,
          0,
          canvas.height - depth,
        );
        grad.addColorStop(0, `rgba(255, 30, 20, ${opacity * 0.85})`);
        grad.addColorStop(0.35, `rgba(255, 70, 20, ${opacity * 0.5})`);
        grad.addColorStop(1, "rgba(255, 30, 20, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, canvas.height - depth, canvas.width, depth);
      } else if (direction === "top") {
        const grad = ctx.createLinearGradient(0, 0, 0, depth);
        grad.addColorStop(0, `rgba(255, 30, 20, ${opacity * 0.85})`);
        grad.addColorStop(0.35, `rgba(255, 70, 20, ${opacity * 0.5})`);
        grad.addColorStop(1, "rgba(255, 30, 20, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, depth);
      } else if (direction === "left") {
        const grad = ctx.createLinearGradient(0, 0, depth, 0);
        grad.addColorStop(0, `rgba(255, 30, 20, ${opacity * 0.85})`);
        grad.addColorStop(0.35, `rgba(255, 70, 20, ${opacity * 0.5})`);
        grad.addColorStop(1, "rgba(255, 30, 20, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, depth, canvas.height);
      } else if (direction === "right") {
        const grad = ctx.createLinearGradient(
          canvas.width,
          0,
          canvas.width - depth,
          0,
        );
        grad.addColorStop(0, `rgba(255, 30, 20, ${opacity * 0.85})`);
        grad.addColorStop(0.35, `rgba(255, 70, 20, ${opacity * 0.5})`);
        grad.addColorStop(1, "rgba(255, 30, 20, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(canvas.width - depth, 0, depth, canvas.height);
      } else if (direction === "screen") {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const radius = Math.max(canvas.width, canvas.height) * 0.6;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, `rgba(255, 45, 20, ${opacity * 0.65})`);
        grad.addColorStop(0.45, `rgba(255, 80, 20, ${opacity * 0.3})`);
        grad.addColorStop(1, "rgba(255, 30, 20, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.restore();
    }
  }

  /**
   * Shades the edge-guard danger zone on stages where the zone is defined
   * (currently Dream Land only). The zone boundary is a diagonal line from
   * (ZONE_X_AT_Y_LO, ZONE_Y_LO) to (ZONE_X_AT_Y_HI, ZONE_Y_HI), mirrored
   * on the left side. Everything outside this line is the danger zone.
   *
   * We draw the shaded area as a canvas polygon using world→screen transforms,
   * so it tracks the camera automatically. We extend the polygon far off-screen
   * (in world space) so the fill covers the blast-zone region without needing
   * to know the actual blast-zone bounds.
   */
  private drawEdgeGuardZone(camera: Camera, stageId: number | undefined): void {
    if (stageId !== EDGE_GUARD_STAGE_ID) return;

    const { ctx } = this;
    const FAR = 12000; // well past any realistic blast-zone coordinate

    // Right danger zone: a quadrilateral whose left edge is the diagonal
    // boundary and whose right/top/bottom edges extend to FAR.
    // Points in world space (Y up), traversed clockwise:
    //   top-left corner of zone = (ZONE_X_AT_Y_LO, ZONE_Y_LO)
    //   top-right far corner    = (FAR, ZONE_Y_LO)
    //   bottom-right far corner = (FAR, -FAR)
    //   bottom-left far corner  = (ZONE_X_AT_Y_HI, -FAR)
    //   then back up the diagonal to close.
    // We also extend the zone above Y_LO (using X_AT_Y_LO as the fixed
    // threshold) and below Y_HI (using X_AT_Y_HI as the fixed threshold).

    const drawZoneSide = (sign: 1 | -1): void => {
      const pts: Array<{ wx: number; wy: number }> = [
        { wx: sign * ZONE_X_AT_Y_HI, wy: FAR },
        { wx: sign * FAR, wy: FAR },
        { wx: sign * FAR, wy: -FAR },
        { wx: sign * ZONE_X_AT_Y_LO, wy: -FAR },
        { wx: sign * ZONE_X_AT_Y_LO, wy: ZONE_Y_LO },
        { wx: sign * ZONE_X_AT_Y_HI, wy: ZONE_Y_HI },
      ];

      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];
        if (!pt) continue;
        const s = camera.worldToScreen(pt.wx, pt.wy);
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 140, 40, 0.08)";
      ctx.fill();

      // Draw the full boundary line (top vertical extension, diagonal, bottom vertical extension)
      const boundaryPts: Array<{ wx: number; wy: number }> = [
        { wx: sign * ZONE_X_AT_Y_HI, wy: FAR },
        { wx: sign * ZONE_X_AT_Y_HI, wy: ZONE_Y_HI },
        { wx: sign * ZONE_X_AT_Y_LO, wy: ZONE_Y_LO },
        { wx: sign * ZONE_X_AT_Y_LO, wy: -FAR },
      ];

      ctx.beginPath();
      for (let i = 0; i < boundaryPts.length; i++) {
        const pt = boundaryPts[i];
        if (!pt) continue;
        const s = camera.worldToScreen(pt.wx, pt.wy);
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      }
      ctx.strokeStyle = "rgba(255, 140, 40, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    drawZoneSide(1); // right
    drawZoneSide(-1); // left
  }

  private drawBackground(): void {
    const { ctx, canvas } = this;

    ctx.fillStyle = "#12141c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Light grid for spatial reference, since we have no real stage geometry.
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    const gridStep = 40;
    for (let x = 0; x < canvas.width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }

  /** Real platform/ground geometry for stages we've measured (see stageGeometry.ts); a plain Y=0 reference line otherwise. */
  private drawStage(camera: Camera, stageId: number | undefined): void {
    const platforms = stageGeometry(stageId);
    if (!platforms) {
      this.drawFallbackGroundLine(camera);
      return;
    }
    for (const platform of platforms) {
      this.drawPlatform(camera, platform);
    }
  }

  private drawPlatform(camera: Camera, platform: PlatformSpec): void {
    const { ctx } = this;
    const left = camera.worldToScreen(platform.leftX, platform.y);
    const right = camera.worldToScreen(platform.rightX, platform.y);

    ctx.strokeStyle =
      platform.kind === "ground"
        ? "rgba(210,215,225,0.9)"
        : "rgba(160,195,255,0.8)";
    ctx.lineWidth = platform.kind === "ground" ? 8 : 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.stroke();
  }

  private drawFallbackGroundLine(camera: Camera): void {
    const { ctx, canvas } = this;
    const groundY = camera.groundScreenY();
    if (groundY < 0 || groundY > canvas.height) return;
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawPlayer(
    camera: Camera,
    port: PortIndex,
    post: {
      positionX: number;
      positionY: number;
      facingDirection: 1 | -1;
      damagePercent: number;
      characterId: number;
      actionStateId: number;
      actionFrameCounter: number;
      hurtboxState?: number;
      comboHitCount?: number;
      hitstunCounter?: number;
    },
    perspectivePort?: PortIndex | null,
    replay?: Replay | null,
    frameIndex?: number,
  ): void {
    const { ctx } = this;
    // positionY is the character's foot position, not their center - Teeter
    // samples land exactly on platform surface Y (see stageGeometry.ts), so
    // the marker's bottom edge (not its middle) belongs at y.
    const { x, y } = camera.worldToScreen(post.positionX, post.positionY);
    const color = getPlayerColor(port, perspectivePort);
    const turning = isTurnState(post.actionStateId);
    // Smooth 3D-like yaw rotation around the vertical axis during turnaround (0 -> pi radians)
    // Every frame within the turn state is an intermediate distorted phase between +100% and -100%.
    // Frame 0: ~90% (initial turn inward) ... Midway: 0% (edge-on) ... Last Turn frame: ~90% (finishing turn) ... Next state: 100%
    let effectiveDir = post.facingDirection;
    if (turning) {
      const turnTotalFrames = post.actionStateId === 0x013 ? 5 : 6;
      const progress = Math.min(
        1,
        Math.max(0, (post.actionFrameCounter + 1) / (turnTotalFrames + 1)),
      );
      const turnScale = Math.cos(progress * Math.PI);
      if (post.actionStateId === 0x012 && post.actionFrameCounter >= 5) {
        // facingDirection has already flipped to the new direction in the engine on frame 5+
        effectiveDir = post.facingDirection * Math.abs(turnScale);
      } else {
        effectiveDir = post.facingDirection * turnScale;
      }
    }
    const facingRight = effectiveDir >= 0;

    const size = characterSize(post.characterId);
    const crouching = isCrouchState(post.actionStateId);
    const heightPx = camera.worldLengthToScreen(
      size.height * (crouching ? 0.5 : 1.0),
    );
    const halfWidth = camera.worldLengthToScreen(size.width) / 2;
    const centerY = y - heightPx / 2;
    const topY = y - heightPx;
    const noseY = centerY;

    // Default label vertical position is generously above the character model
    let labelY = topY - 18;

    // Draw shield bubble/oval if character is in a shield state
    const shielding = isShieldState(post.actionStateId);

    if (shielding) {
      const shieldStun = isShieldStunState(post.actionStateId);
      const radiusX = halfWidth * 1.35;
      const radiusY = heightPx * 0.65;
      labelY = Math.min(labelY, centerY - radiusY - 14);

      if (shieldStun) {
        // High-energy vibrating shield stun impact effect
        const jitterX = post.actionFrameCounter % 2 === 0 ? 1.5 : -1.5;
        const shieldCenterX = x + jitterX;

        // 1. High-opacity impact fill
        ctx.beginPath();
        ctx.ellipse(
          shieldCenterX,
          centerY,
          radiusX,
          radiusY,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = hexToRgba(color, 0.48);
        ctx.fill();

        // 2. Glowing heavy perimeter
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(
          shieldCenterX,
          centerY,
          radiusX,
          radiusY,
          0,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();

        // 3. Bright white electric flash core
        ctx.beginPath();
        ctx.ellipse(
          shieldCenterX,
          centerY,
          radiusX,
          radiusY,
          0,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // 4. Outer dashed electric shockwave ring
        ctx.beginPath();
        ctx.ellipse(
          shieldCenterX,
          centerY,
          radiusX * 1.18,
          radiusY * 1.18,
          0,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = "rgba(255, 230, 80, 0.85)";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Normal shield bubble
        ctx.beginPath();
        ctx.ellipse(x, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(color, 0.28);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(color, 0.85);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Draw capture lock brackets if character is trapped in a grab
    const grabbed = isGrabbedState(post.actionStateId);
    if (grabbed) {
      const padX = halfWidth * 1.3;
      const bracketTop = topY - 2;
      const bracketBot = y + 2;
      const armLen = 5;

      ctx.save();
      ctx.strokeStyle = "rgba(255, 215, 60, 0.95)";
      ctx.lineWidth = 2;
      ctx.lineCap = "square";
      ctx.shadowColor = "rgba(255, 180, 0, 0.7)";
      ctx.shadowBlur = 4;

      // Left bracket [
      ctx.beginPath();
      ctx.moveTo(x - padX + armLen, bracketTop);
      ctx.lineTo(x - padX, bracketTop);
      ctx.lineTo(x - padX, bracketBot);
      ctx.lineTo(x - padX + armLen, bracketBot);
      ctx.stroke();

      // Right bracket ]
      ctx.beginPath();
      ctx.moveTo(x + padX - armLen, bracketTop);
      ctx.lineTo(x + padX, bracketTop);
      ctx.lineTo(x + padX, bracketBot);
      ctx.lineTo(x + padX - armLen, bracketBot);
      ctx.stroke();

      ctx.restore();
    }

    // Draw attack arc if character is executing an attack or grab
    const attack = getAttackInfo(post.actionStateId);
    if (attack) {
      const joystick =
        replay && frameIndex !== undefined
          ? replay.frames[frameIndex]?.ports[port]?.pre
          : null;
      const angleable = canAngleAttack(post.characterId, attack);

      this.drawAttackArc(
        x,
        centerY,
        halfWidth,
        heightPx,
        facingRight,
        color,
        attack,
        joystick ? { x: joystick.stickX, y: joystick.stickY } : null,
        angleable,
      );
      if (attack.direction === "up" || attack.direction === "neutral") {
        const baseRadius = Math.max(halfWidth, heightPx * 0.5);
        const topRadius =
          attack.type === "smash" ? baseRadius * 2.2 : baseRadius * 1.55;
        labelY = Math.min(labelY, centerY - topRadius - 16);
      }
    }

    // Draw Falcon special move visuals if applicable
    const falconSpecial = getFalconSpecialType(
      post.characterId,
      post.actionStateId,
    );
    if (falconSpecial) {
      this.drawFalconSpecial(
        x,
        centerY,
        halfWidth,
        heightPx,
        facingRight,
        color,
        falconSpecial,
        post.actionFrameCounter,
      );
      if (
        falconSpecial === "dive_reach" ||
        falconSpecial === "dive_explosion"
      ) {
        labelY = Math.min(labelY, centerY - heightPx * 0.85 - 16);
      }
    }

    // Draw Pikachu special move visuals if applicable
    const pikaSpecial = getPikachuSpecialType(
      post.characterId,
      post.actionStateId,
    );
    if (pikaSpecial) {
      this.drawPikachuSpecial(
        x,
        centerY,
        halfWidth,
        heightPx,
        facingRight,
        color,
        pikaSpecial,
        post.actionFrameCounter,
      );
    }

    // Draw Fox special move visuals if applicable
    const foxSpecial = getFoxSpecialType(post.characterId, post.actionStateId);
    if (foxSpecial) {
      const flightAngle =
        foxSpecial === "firefox_fly"
          ? getFoxFlightAngle(replay, frameIndex, port, post)
          : null;

      this.drawFoxSpecial(
        x,
        centerY,
        halfWidth,
        heightPx,
        facingRight,
        color,
        foxSpecial,
        post.actionFrameCounter,
        flightAngle,
      );
      if (
        foxSpecial === "shine_start" ||
        foxSpecial === "shine_loop" ||
        foxSpecial === "shine_hit" ||
        foxSpecial === "shine_end" ||
        foxSpecial === "firefox_charge"
      ) {
        labelY = Math.min(labelY, centerY - heightPx * 0.85 - 16);
      }
    }

    // Draw Yoshi special move visuals if applicable
    const yoshiSpecial = getYoshiSpecialType(
      post.characterId,
      post.actionStateId,
    );
    if (yoshiSpecial) {
      this.drawYoshiSpecial(
        x,
        y,
        centerY,
        halfWidth,
        heightPx,
        facingRight,
        color,
        yoshiSpecial,
        post.actionFrameCounter,
      );
    }

    // Draw Donkey Kong special move visuals if applicable
    const dkSpecial = getDKSpecialType(post.characterId, post.actionStateId);
    if (dkSpecial) {
      this.drawDKSpecial(
        x,
        y,
        centerY,
        halfWidth,
        heightPx,
        facingRight,
        color,
        dkSpecial,
        post.actionFrameCounter,
      );
    }

    // Draw Ness special move visuals if applicable
    const nessSpecial = getNessSpecialType(
      post.characterId,
      post.actionStateId,
    );
    if (nessSpecial) {
      this.drawNessSpecial(
        x,
        centerY,
        halfWidth,
        heightPx,
        facingRight,
        color,
        nessSpecial,
        post.actionFrameCounter,
      );
      if (nessSpecial === "pk_thunder_charge" || nessSpecial === "psi_magnet") {
        labelY = Math.min(labelY, centerY - heightPx * 0.9 - 16);
      }
    }

    // Draw Mario / Luigi special move visuals if applicable
    const marioSpecial = getMarioSpecialType(
      post.characterId,
      post.actionStateId,
    );
    if (marioSpecial) {
      this.drawMarioSpecial(
        x,
        y,
        centerY,
        halfWidth,
        heightPx,
        facingRight,
        isLuigiCharacter(post.characterId),
        marioSpecial,
        post.actionFrameCounter,
      );
    }

    // Draw Samus special move visuals if applicable
    const samusSpecial = getSamusSpecialType(
      post.characterId,
      post.actionStateId,
    );
    if (samusSpecial) {
      this.drawSamusSpecial(
        x,
        centerY,
        halfWidth,
        heightPx,
        facingRight,
        color,
        samusSpecial,
        post.actionFrameCounter,
      );
      if (samusSpecial === "screw_attack") {
        labelY = Math.min(labelY, centerY - heightPx * 0.85 - 16);
      }
    }

    // Draw Link special move visuals if applicable
    const linkSpecial = getLinkSpecialType(
      post.characterId,
      post.actionStateId,
    );
    if (linkSpecial) {
      this.drawLinkSpecial(
        x,
        centerY,
        halfWidth,
        heightPx,
        facingRight,
        color,
        linkSpecial,
        post.actionFrameCounter,
      );
      if (linkSpecial === "spin_attack") {
        labelY = Math.min(labelY, centerY - heightPx * 0.85 - 16);
      }
    }

    // Draw Kirby special move visuals if applicable
    const kirbySpecial = getKirbySpecialType(
      post.characterId,
      post.actionStateId,
    );
    if (kirbySpecial) {
      this.drawKirbySpecial(
        x,
        y,
        centerY,
        halfWidth,
        heightPx,
        facingRight,
        color,
        kirbySpecial,
        post.actionFrameCounter,
      );
    }

    // Draw Jigglypuff special move visuals if applicable
    const puffSpecial = getJigglypuffSpecialType(
      post.characterId,
      post.actionStateId,
    );
    if (puffSpecial) {
      this.drawJigglypuffSpecial(
        x,
        centerY,
        halfWidth,
        heightPx,
        facingRight,
        color,
        puffSpecial,
        post.actionFrameCounter,
      );
      if (puffSpecial === "sing" || puffSpecial === "rest") {
        labelY = Math.min(labelY, centerY - heightPx * 0.85 - 16);
      }
    }

    const isTechRoll = isTechRollState(post.actionStateId);
    const isTechInPlace = isTechInPlaceState(post.actionStateId);
    const isRoll = isRollState(post.actionStateId);
    const isTumble = isTumbleState(post.actionStateId);
    const isDownBound = isDownBoundState(post.actionStateId);
    const isProne = isProneState(post.actionStateId);
    const isInvulnerable =
      (isRoll || isTechInPlace || isProne) && post.hurtboxState === 0x03;

    const taunting = isTauntState(post.actionStateId);
    let triangleColor = color;

    if (taunting) {
      // Smoothly cycle through colors across the rainbow spectrum
      const hue = (post.actionFrameCounter * 10) % 360;
      triangleColor = `hsl(${hue}, 85%, 55%)`;
    } else if (isTechRoll) {
      // High-speed cyan/teal ghost appearance for tech roll
      triangleColor = hexToRgba("#06b6d4", 0.5);
    } else if (isRoll) {
      // Ethereal / semi-translucent ghost appearance for the entire roll state
      triangleColor = hexToRgba(color, 0.45);
    }

    const inHitstun = isHitstunState(
      post.actionStateId,
      post.hitstunCounter ?? 0,
    );
    const inCombo = inHitstun || (post.comboHitCount ?? 0) > 0;
    const comboHits = inHitstun ? (post.comboHitCount ?? 0) : 0;
    const isSpecial = isSpecialState(post.actionStateId);
    const isLanding = isLandingState(post.actionStateId);
    const isDizzy = isDizzyState(post.actionStateId);
    const isSleep = isSleepState(post.actionStateId);
    const isOpponent =
      perspectivePort !== null &&
      perspectivePort !== undefined &&
      port !== perspectivePort;

    if (isProne) {
      labelY = y - 28;
    } else if (isDizzy) {
      labelY = Math.min(labelY, topY - 36);
    }

    const animState: CharacterAnimState = {
      taunting,
      inCombo,
      isRoll,
      isTechRoll,
      isTechInPlace,
      isTumble,
      isProne,
      isDownBound,
      isInvulnerable,
      isSpecial,
      isLanding,
      isDizzy,
      isSleep,
      isOpponent,
      actionFrameCounter: post.actionFrameCounter,
    };

    ctx.save();
    if (isDizzy) {
      // Exaggerated dizzy swaying / reeling from side to side around the feet pivot (x, y)
      // Classic Smash 64 FuraFura staggering motion
      const swayPeriod = 0.16;
      const swayAngle = Math.sin(post.actionFrameCounter * swayPeriod) * 0.18; // ~10.3 deg sway
      const swayX =
        Math.sin(post.actionFrameCounter * swayPeriod) * (halfWidth * 0.25);
      ctx.translate(x + swayX, y);
      ctx.rotate(swayAngle);
      ctx.translate(-x, -y);
    } else if (isSleep) {
      // Gentle breathing rhythmic bobbing while asleep
      const sleepBobY = Math.sin(post.actionFrameCounter * 0.08) * 2;
      ctx.translate(0, sleepBobY);
    } else if (isTumble) {
      // Dynamic cartwheel spin during tumble reeling
      const spinSpeed = 0.22;
      const spinAngle =
        post.actionFrameCounter * spinSpeed * (facingRight ? 1 : -1);
      ctx.translate(x, centerY);
      ctx.rotate(spinAngle);
      ctx.translate(-x, -centerY);
    } else if (isProne) {
      // Flattened prone against stage floor at feet pivot (x, y)
      ctx.translate(x, y);
      ctx.scale(1.35, 0.35);
      ctx.translate(-x, -y);
    } else if (isIdleState(post.actionStateId)) {
      // Subtle organic breathing stance rhythm
      const breath = Math.sin(post.actionFrameCounter * 0.12);
      const bobY = breath * 1.5;
      const scaleX = 1 + breath * 0.025;
      const scaleY = 1 - breath * 0.025;
      ctx.translate(x, y);
      ctx.scale(scaleX, scaleY);
      ctx.translate(-x, -y + bobY);
    } else if (isWalkState(post.actionStateId)) {
      // Walking stride bob & tilt
      const walkPhase = post.actionFrameCounter * 0.25;
      const walkBob = Math.abs(Math.sin(walkPhase)) * 2;
      const walkTilt = Math.sin(walkPhase) * 0.06 * (facingRight ? 1 : -1);
      ctx.translate(x, y);
      ctx.rotate(walkTilt);
      ctx.translate(-x, -y + walkBob);
    } else if (isDashOrRunState(post.actionStateId)) {
      // Dynamic running forward lean & stride bounce
      const runPhase = post.actionFrameCounter * 0.35;
      const runBounce = Math.abs(Math.sin(runPhase)) * 2.5;
      const runLean = 0.14 * (facingRight ? 1 : -1);
      ctx.translate(x, y);
      ctx.rotate(runLean);
      ctx.translate(-x, -y + runBounce);
    } else if (isCrouchState(post.actionStateId)) {
      // Compressed crouch stance
      ctx.translate(x, y);
      ctx.scale(1.15, 0.72);
      ctx.translate(-x, -y);
    } else if (isTeeterState(post.actionStateId)) {
      // Teetering ledge balance sway
      const teeterAngle = Math.sin(post.actionFrameCounter * 0.28) * 0.14;
      ctx.translate(x, y);
      ctx.rotate(teeterAngle);
      ctx.translate(-x, -y);
    }

    if (isPikachuCharacter(post.characterId)) {
      this.drawPikachuPolygons(
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isFalconCharacter(post.characterId)) {
      this.drawFalconPolygons(
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isMarioCharacter(post.characterId)) {
      this.drawMarioPolygons(
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isLuigiCharacter(post.characterId)) {
      this.drawLuigiPolygons(
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isKirbyCharacter(post.characterId)) {
      this.drawKirbyPolygons(
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isJigglypuffCharacter(post.characterId)) {
      this.drawJigglypuffPolygons(
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isFoxCharacter(post.characterId)) {
      this.drawFoxPolygons(
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isYoshiCharacter(post.characterId)) {
      this.drawYoshiPolygons(
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isDonkeyKongCharacter(post.characterId)) {
      this.drawDonkeyKongPolygons(
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isLinkCharacter(post.characterId)) {
      this.drawLinkPolygons(
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isNessCharacter(post.characterId)) {
      this.drawNessPolygons(
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isSamusCharacter(post.characterId)) {
      this.drawSamusPolygons(
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else {
      // Isosceles triangle, nose pointing in the facing direction, feet at y and head at topY.
      const triX =
        inCombo && !taunting
          ? x + (post.actionFrameCounter % 2 === 0 ? 1.2 : -1.2)
          : x;
      const noseX = triX + effectiveDir * halfWidth;
      const backX = triX - effectiveDir * halfWidth;

      ctx.save();
      if (taunting) {
        // Spin triangle continuously around its geometric center (x, centerY)
        const spinAngle =
          post.actionFrameCounter * 0.125 * (facingRight ? 1 : -1);
        ctx.translate(x, centerY);
        ctx.rotate(spinAngle);
        ctx.translate(-x, -centerY);
      }

      ctx.beginPath();
      ctx.moveTo(noseX, noseY);
      ctx.lineTo(backX, topY);
      ctx.lineTo(backX, y);
      ctx.closePath();
      ctx.fillStyle = triangleColor;
      ctx.fill();

      if (inCombo) {
        // Active hitstun / combo electric outline & outer glow (taking damage)
        ctx.save();
        ctx.strokeStyle = "rgba(255, 60, 40, 0.95)";
        ctx.lineWidth = 5.0; // 2x thicker for legibility
        ctx.shadowColor = "rgba(255, 120, 0, 0.85)";
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(noseX, noseY);
        ctx.lineTo(backX, topY);
        ctx.lineTo(backX, y);
        ctx.closePath();
        ctx.strokeStyle = "rgba(255, 220, 180, 0.9)";
        ctx.lineWidth = 1.8;
        ctx.stroke();
      } else if (isTechRoll) {
        // High-speed vibrant cyan/teal tech roll aura
        ctx.save();
        ctx.strokeStyle = isInvulnerable
          ? "rgba(34, 211, 238, 0.95)"
          : "rgba(6, 182, 212, 0.9)";
        ctx.lineWidth = 2.8;
        ctx.shadowColor = "rgba(6, 182, 212, 0.85)";
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(noseX, noseY);
        ctx.lineTo(backX, topY);
        ctx.lineTo(backX, y);
        ctx.closePath();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.lineWidth = 1.4;
        ctx.stroke();
      } else if (isRoll) {
        // Ethereal silver glow during roll (with brighter cyan aura when actively intangible)
        ctx.save();
        ctx.strokeStyle = isInvulnerable
          ? "rgba(220, 235, 255, 0.95)"
          : "rgba(190, 205, 225, 0.95)";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = isInvulnerable
          ? "rgba(180, 215, 255, 0.85)"
          : "rgba(170, 195, 230, 0.7)";
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(noseX, noseY);
        ctx.lineTo(backX, topY);
        ctx.lineTo(backX, y);
        ctx.closePath();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (isSpecial || isLanding) {
        // Special move & Landing animation: neutral cool-silver/gray energy outline
        ctx.save();
        ctx.strokeStyle = "rgba(190, 205, 225, 0.95)";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "rgba(170, 195, 230, 0.7)";
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(noseX, noseY);
        ctx.lineTo(backX, topY);
        ctx.lineTo(backX, y);
        ctx.closePath();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.restore();
    }
    ctx.restore(); // Closes the character sway/bob/tumble/prone transform

    if (isDizzy) {
      // 3 glowing golden stars orbiting in 3D ellipse above character's head
      this.drawDizzyStars(x, topY - 6, post.actionFrameCounter, isOpponent);
    } else if (isSleep) {
      // Floating "Z z z" sleep bubbles
      this.drawSleepZzz(
        x + halfWidth * 0.5,
        topY - 4,
        post.actionFrameCounter,
        isOpponent,
      );
    } else if (isTumble) {
      // Swirling wind/motion streaks indicating unstable free-fall reeling
      this.drawTumbleAura(
        x,
        centerY,
        halfWidth,
        post.actionFrameCounter,
        isOpponent,
      );
    } else if (isDownBound) {
      // Ground impact dust shockwave and sparks on missed tech floor bounce
      this.drawMissedTechBounce(
        x,
        y,
        halfWidth,
        post.actionFrameCounter,
        isOpponent,
      );
    } else if (isTechInPlace) {
      // Breakfall ground flash and upward recovery burst on tech in place
      this.drawTechBreakfall(
        x,
        y,
        halfWidth,
        post.actionFrameCounter,
        isOpponent,
      );
    } else if (isTechRoll) {
      if (post.actionFrameCounter < 10) {
        this.drawTechBreakfall(
          x,
          y,
          halfWidth,
          post.actionFrameCounter,
          isOpponent,
        );
      }
      this.drawTechRollSpeedLines(
        x,
        y,
        topY,
        effectiveDir,
        halfWidth,
        post.actionFrameCounter,
        isOpponent,
      );
    }

    // Damage% label above the triangle, in the player's color (or cycling if taunting).
    ctx.font = "bold 15px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = taunting ? triangleColor : color;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = 4;
    ctx.fillText(`${post.damagePercent}%`, x, labelY);
    ctx.shadowBlur = 0;

    // Active combo hits count (large punchy number) if 2 or more hits in combo
    if (comboHits >= 2) {
      const comboText = `${comboHits}`;
      const comboY = labelY - 20;

      ctx.save();
      ctx.font = "900 20px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Dark outline for contrast
      ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
      ctx.lineWidth = 3.5;
      ctx.lineJoin = "round";
      ctx.strokeText(comboText, x, comboY);

      // Energetic red-orange fill with glowing aura
      ctx.fillStyle = "#ff453a";
      ctx.shadowColor = "rgba(255, 69, 58, 0.85)";
      ctx.shadowBlur = 6;
      ctx.fillText(comboText, x, comboY);
      ctx.restore();
    }

    // Player name tag at match start (fades out after initial frames)
    const nameAlpha = getStartNameAlpha(frameIndex);
    if (nameAlpha > 0) {
      const rawName = replay?.gameStart?.playerNames?.[port]?.trim();
      const playerName =
        rawName && rawName.length > 0 ? rawName : PORT_LABELS[port];
      const hasPerspective =
        perspectivePort !== null && perspectivePort !== undefined;
      const isPerspective = hasPerspective && port === perspectivePort;
      const tagColor = hasPerspective
        ? isPerspective
          ? MAIN_PLAYER_COLOR
          : OPPONENT_COLOR
        : getPlayerColor(port, perspectivePort);

      const nameTagBottomY = comboHits >= 2 ? labelY - 38 : labelY - 20;
      this.drawPlayerNameTag(
        x,
        nameTagBottomY,
        playerName,
        tagColor,
        isPerspective,
        nameAlpha,
      );
    }
  }

  /**
   * Draws a player name tag above the character's head at the start of the match.
   * Renders a capsule pill with a downward pointer arrow and distinct blue styling
   * for the perspective player.
   */
  private drawPlayerNameTag(
    x: number,
    y: number,
    name: string,
    tagColor: string,
    isPerspective: boolean,
    alpha: number,
  ): void {
    if (alpha <= 0 || !name) return;

    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const textMetrics = ctx.measureText(name);
    const textWidth = textMetrics.width;
    const paddingX = 10;
    const pillWidth = Math.max(textWidth + paddingX * 2, 32);
    const pillHeight = 22;
    const pillX = x - pillWidth / 2;
    const pillY = y - pillHeight - 5; // 5px above the arrow tip at y
    const borderRadius = 5;

    // 1. Tag capsule background
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, pillHeight, borderRadius);
    ctx.fillStyle = isPerspective
      ? "rgba(15, 23, 42, 0.94)"
      : "rgba(24, 27, 34, 0.88)";
    ctx.fill();

    // 2. Tag capsule border
    ctx.lineWidth = isPerspective ? 2.2 : 1.4;
    ctx.strokeStyle = tagColor;
    if (isPerspective) {
      ctx.shadowColor = "rgba(59, 130, 246, 0.65)";
      ctx.shadowBlur = 6;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. Small downward pointer arrow below pill pointing down to character
    const arrowWidth = 8;
    const arrowHeight = 5;
    ctx.beginPath();
    ctx.moveTo(x - arrowWidth / 2, pillY + pillHeight);
    ctx.lineTo(x + arrowWidth / 2, pillY + pillHeight);
    ctx.lineTo(x, pillY + pillHeight + arrowHeight);
    ctx.closePath();
    ctx.fillStyle = tagColor;
    ctx.fill();

    // 4. Name text inside capsule
    ctx.fillStyle = isPerspective ? "#ffffff" : "#d1d5db";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 2;
    ctx.fillText(name, x, pillY + pillHeight / 2);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  /**
   * Draws 3 glowing golden stars orbiting in an inclined 3D ellipse above the character's head
   * when their shield is broken and they are stuck in the dizzy state (FuraFura / Stun).
   */
  private drawDizzyStars(
    x: number,
    headY: number,
    frameCounter: number,
    isOpponent: boolean,
  ): void {
    const { ctx } = this;
    const starCount = 3;
    const orbitRadiusX = 18;
    const orbitRadiusY = 7;
    const speed = 0.12;

    ctx.save();
    for (let i = 0; i < starCount; i++) {
      const phase = (i * Math.PI * 2) / starCount;
      const angle = frameCounter * speed + phase;
      const starX = x + Math.cos(angle) * orbitRadiusX;
      // Slanted elliptical orbit for a 3D perspective effect
      const starY =
        headY + Math.sin(angle) * orbitRadiusY + Math.cos(angle) * 2;

      // 3D depth scaling: stars in front (sin > 0) are larger and brighter than stars in back (sin < 0)
      const depth = Math.sin(angle); // -1 (back) to +1 (front)
      const depthScale = 0.7 + 0.35 * ((depth + 1) / 2);
      const starRadius = 5 * depthScale;
      const alpha = 0.55 + 0.45 * ((depth + 1) / 2);

      ctx.save();
      ctx.translate(starX, starY);
      ctx.rotate(frameCounter * 0.18 + phase);

      const starColor = resolveColor("#facc15", isOpponent, alpha); // Bright gold / yellow
      const starGlow = resolveColor("#ca8a04", isOpponent, alpha * 0.8);

      ctx.fillStyle = starColor;
      ctx.shadowColor = starGlow;
      ctx.shadowBlur = 6 * depthScale;

      // 4-pointed sparkle star geometry
      ctx.beginPath();
      for (let p = 0; p < 8; p++) {
        const r = p % 2 === 0 ? starRadius : starRadius * 0.4;
        const pAngle = (p * Math.PI) / 4;
        const px = Math.cos(pAngle) * r;
        const py = Math.sin(pAngle) * r;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // White hot-spot core on front-facing stars
      if (depth > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, starRadius * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = resolveColor("#ffffff", isOpponent, alpha);
        ctx.fill();
      }

      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Draws rising "Z z z" text bubbles when a character is asleep (e.g. from Sing).
   */
  private drawSleepZzz(
    x: number,
    topY: number,
    frameCounter: number,
    isOpponent: boolean,
  ): void {
    const { ctx } = this;
    const zCount = 3;
    ctx.save();
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < zCount; i++) {
      const cycle = (frameCounter + i * 25) % 75;
      const progress = cycle / 75; // 0 to 1
      const zY = topY - progress * 24;
      const zX = x + Math.sin(progress * Math.PI * 2) * 6 + i * 4;
      const zScale = 0.7 + progress * 0.5;
      const alpha =
        progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;

      ctx.save();
      ctx.translate(zX, zY);
      ctx.scale(zScale, zScale);
      ctx.fillStyle = resolveColor("#93c5fd", isOpponent, alpha * 0.9);
      ctx.shadowColor = resolveColor("#3b82f6", isOpponent, alpha * 0.6);
      ctx.shadowBlur = 4;
      ctx.fillText(i === 0 ? "Z" : "z", 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Draws a dynamic swirling wind/motion aura around a character reeling in tumble.
   */
  private drawTumbleAura(
    x: number,
    centerY: number,
    halfWidth: number,
    frameCounter: number,
    isOpponent: boolean,
  ): void {
    const { ctx } = this;
    const radius = halfWidth * 1.35;
    const speed = 0.2;
    ctx.save();
    ctx.lineWidth = 1.8;

    for (let i = 0; i < 3; i++) {
      const angle = frameCounter * speed + (i * Math.PI * 2) / 3;
      const alpha = 0.4 + 0.3 * Math.sin(angle);
      ctx.strokeStyle = resolveColor("#f59e0b", isOpponent, alpha); // Amber/orange wind streak
      ctx.shadowColor = resolveColor("#d97706", isOpponent, alpha * 0.6);
      ctx.shadowBlur = 4;

      ctx.beginPath();
      ctx.arc(x, centerY, radius + i * 2, angle, angle + Math.PI * 0.55);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Draws ground impact dust shockwaves and sparks when a player misses a tech
   * and bounces hard on the floor (DownBound).
   */
  private drawMissedTechBounce(
    x: number,
    y: number,
    halfWidth: number,
    frameCounter: number,
    isOpponent: boolean,
  ): void {
    const { ctx } = this;
    const progress = Math.min(frameCounter / 14, 1);
    const alpha = 1 - progress;
    if (alpha <= 0) return;

    ctx.save();

    // 1. Horizontal expanding floor dust ellipse
    const dustRadiusX = halfWidth * 1.5 + progress * 24;
    const dustRadiusY = 4 + progress * 3;
    ctx.beginPath();
    ctx.ellipse(x, y, dustRadiusX, dustRadiusY, 0, 0, Math.PI * 2);
    ctx.fillStyle = resolveColor(
      "rgba(148, 163, 184, 0.45)",
      isOpponent,
      alpha * 0.5,
    );
    ctx.fill();
    ctx.strokeStyle = resolveColor("#f97316", isOpponent, alpha * 0.8); // Orange impact ring
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 2. Upward impact spark lines
    const sparkCount = 5;
    for (let i = 0; i < sparkCount; i++) {
      const sparkAngle =
        -Math.PI * 0.85 + (i * Math.PI * 0.7) / (sparkCount - 1);
      const sparkDist = 8 + progress * 16;
      const sx = x + Math.cos(sparkAngle) * (dustRadiusX * 0.6);
      const sy = y + Math.sin(sparkAngle) * sparkDist;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(sparkAngle) * 4, y);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = resolveColor("#fde047", isOpponent, alpha);
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draws a crisp breakfall ground flash and upward recovery burst on a successful Tech.
   */
  private drawTechBreakfall(
    x: number,
    y: number,
    halfWidth: number,
    frameCounter: number,
    isOpponent: boolean,
  ): void {
    const { ctx } = this;
    const progress = Math.min(frameCounter / 16, 1);
    const alpha = 1 - progress;
    if (alpha <= 0) return;

    ctx.save();

    // 1. Cyan tech impact ring on floor
    const ringRadiusX = halfWidth * 1.2 + progress * 20;
    const ringRadiusY = 3 + progress * 3;
    ctx.beginPath();
    ctx.ellipse(x, y, ringRadiusX, ringRadiusY, 0, 0, Math.PI * 2);
    ctx.strokeStyle = resolveColor("#22d3ee", isOpponent, alpha * 0.9);
    ctx.lineWidth = 2.2;
    ctx.shadowColor = resolveColor("#06b6d4", isOpponent, alpha * 0.8);
    ctx.shadowBlur = 8;
    ctx.stroke();

    // 2. Rising green/cyan tech recovery sparks
    for (let i = 0; i < 4; i++) {
      const sparkX = x + (i - 1.5) * (halfWidth * 0.8);
      const sparkY = y - progress * 22 - (i % 2) * 4;
      const sparkSize = Math.max(1, (1 - progress) * 3);
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
      ctx.fillStyle = resolveColor("#34d399", isOpponent, alpha);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Draws electric speed lines and cyan trail for Tech Rolls.
   */
  private drawTechRollSpeedLines(
    x: number,
    y: number,
    topY: number,
    effectiveDir: number,
    halfWidth: number,
    frameCounter: number,
    isOpponent: boolean,
  ): void {
    const { ctx } = this;
    ctx.save();
    const trailDir = -effectiveDir; // Speed lines trail behind movement
    const lineCount = 4;
    const height = y - topY;

    for (let i = 0; i < lineCount; i++) {
      const lineY = topY + (height * (i + 1)) / (lineCount + 1);
      const startX = x + trailDir * (halfWidth * 0.4);
      const lineLen = 14 + ((frameCounter * 7 + i * 11) % 16);
      const endX = startX + trailDir * lineLen;

      ctx.beginPath();
      ctx.moveTo(startX, lineY);
      ctx.lineTo(endX, lineY);
      ctx.strokeStyle = resolveColor("#22d3ee", isOpponent, 0.75);
      ctx.lineWidth = 1.6;
      ctx.shadowColor = resolveColor("#06b6d4", isOpponent, 0.7);
      ctx.shadowBlur = 4;
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Draws a crisp, recognizable low-poly Pikachu with distinct pointed ears (black tips),
   * zig-zag lightning bolt tail, red cheeks, back stripes, and facial features.
   */
  /**
   * 1. PIKACHU: Pointed ears with black tips, zig-zag lightning bolt tail, red cheeks, back stripes.
   */
  private drawPikachuPolygons(
    x: number,
    y: number,
    _topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    const { ctx } = this;
    const {
      taunting,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
      isOpponent,
      actionFrameCounter,
    } = state;
    ctx.save();
    const posX =
      inCombo && !taunting
        ? x + (actionFrameCounter % 2 === 0 ? 1.2 : -1.2)
        : x;
    const facingRight = effectiveDir >= 0;
    if (taunting) {
      const spinAngle = actionFrameCounter * 0.125 * (facingRight ? 1 : -1);
      ctx.translate(posX, centerY);
      ctx.rotate(spinAngle);
      ctx.translate(-posX, -centerY);
    }

    let bodyColor = resolveColor("#facc15", isOpponent);
    let earTipColor = resolveColor("#1e1e24", isOpponent);
    let cheekColor = resolveColor("#ef4444", isOpponent);
    let stripeColor = resolveColor("#854d0e", isOpponent);
    let tailBaseColor = resolveColor("#854d0e", isOpponent);
    const outlineColor = resolveColor("rgba(0, 0, 0, 0.6)", isOpponent);
    const outlineWidth = 1.2;

    if (taunting) {
      const hue = (actionFrameCounter * 10) % 360;
      bodyColor = resolveColor(`hsl(${hue}, 85%, 55%)`, isOpponent);
      cheekColor = resolveColor(
        `hsl(${(hue + 60) % 360}, 90%, 55%)`,
        isOpponent,
      );
    } else if (isRoll) {
      bodyColor = resolveColor("#facc15", isOpponent, 0.45);
      earTipColor = resolveColor("#1e1e24", isOpponent, 0.45);
      cheekColor = resolveColor("#ef4444", isOpponent, 0.45);
      stripeColor = resolveColor("#854d0e", isOpponent, 0.45);
      tailBaseColor = resolveColor("#854d0e", isOpponent, 0.45);
    }

    const dir = effectiveDir;
    const w = halfWidth;
    const h = heightPx;

    // Tail Base (Brown)
    ctx.beginPath();
    ctx.moveTo(posX - 0.45 * dir * w, y - 0.32 * h);
    ctx.lineTo(posX - 0.68 * dir * w, y - 0.44 * h);
    ctx.lineTo(posX - 0.72 * dir * w, y - 0.36 * h);
    ctx.lineTo(posX - 0.5 * dir * w, y - 0.24 * h);
    ctx.closePath();
    ctx.fillStyle = tailBaseColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    // Tail Mid & Tip (Yellow Lightning Bolt)
    ctx.beginPath();
    ctx.moveTo(posX - 0.68 * dir * w, y - 0.44 * h);
    ctx.lineTo(posX - 0.52 * dir * w, y - 0.64 * h);
    ctx.lineTo(posX - 0.76 * dir * w, y - 0.62 * h);
    ctx.lineTo(posX - 0.62 * dir * w, y - 0.85 * h);
    ctx.lineTo(posX - 0.95 * dir * w, y - 1.12 * h);
    ctx.lineTo(posX - 1.28 * dir * w, y - 0.88 * h);
    ctx.lineTo(posX - 0.92 * dir * w, y - 0.75 * h);
    ctx.lineTo(posX - 0.72 * dir * w, y - 0.36 * h);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    // Back Ear
    ctx.beginPath();
    ctx.moveTo(posX - 0.18 * dir * w, y - 0.94 * h);
    ctx.lineTo(posX - 0.02 * dir * w, y - 0.98 * h);
    ctx.lineTo(posX - 0.2 * dir * w, y - 1.2 * h);
    ctx.lineTo(posX - 0.3 * dir * w, y - 1.18 * h);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    // Back Ear Black Tip
    ctx.beginPath();
    ctx.moveTo(posX - 0.3 * dir * w, y - 1.18 * h);
    ctx.lineTo(posX - 0.2 * dir * w, y - 1.2 * h);
    ctx.lineTo(posX - 0.4 * dir * w, y - 1.4 * h);
    ctx.closePath();
    ctx.fillStyle = earTipColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    // Main Body & Head
    ctx.beginPath();
    ctx.moveTo(posX - 0.4 * dir * w, y);
    ctx.lineTo(posX - 0.66 * dir * w, y - 0.28 * h);
    ctx.lineTo(posX - 0.62 * dir * w, y - 0.62 * h);
    ctx.lineTo(posX - 0.42 * dir * w, y - 0.84 * h);
    ctx.lineTo(posX - 0.2 * dir * w, y - 0.96 * h);
    ctx.lineTo(posX + 0.12 * dir * w, y - 1.02 * h);
    ctx.lineTo(posX + 0.58 * dir * w, y - 0.86 * h);
    ctx.lineTo(posX + 0.86 * dir * w, y - 0.6 * h);
    ctx.lineTo(posX + 0.66 * dir * w, y - 0.46 * h);
    ctx.lineTo(posX + 0.78 * dir * w, y - 0.3 * h);
    ctx.lineTo(posX + 0.46 * dir * w, y);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    // Back Stripes
    ctx.beginPath();
    ctx.moveTo(posX - 0.6 * dir * w, y - 0.7 * h);
    ctx.lineTo(posX - 0.22 * dir * w, y - 0.66 * h);
    ctx.lineTo(posX - 0.24 * dir * w, y - 0.58 * h);
    ctx.lineTo(posX - 0.62 * dir * w, y - 0.62 * h);
    ctx.closePath();
    ctx.fillStyle = stripeColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(posX - 0.65 * dir * w, y - 0.48 * h);
    ctx.lineTo(posX - 0.2 * dir * w, y - 0.44 * h);
    ctx.lineTo(posX - 0.22 * dir * w, y - 0.36 * h);
    ctx.lineTo(posX - 0.66 * dir * w, y - 0.4 * h);
    ctx.closePath();
    ctx.fillStyle = stripeColor;
    ctx.fill();

    // Front Ear
    ctx.beginPath();
    ctx.moveTo(posX + 0.14 * dir * w, y - 1.0 * h);
    ctx.lineTo(posX + 0.36 * dir * w, y - 0.9 * h);
    ctx.lineTo(posX + 0.64 * dir * w, y - 1.18 * h);
    ctx.lineTo(posX + 0.48 * dir * w, y - 1.22 * h);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    // Front Ear Black Tip
    ctx.beginPath();
    ctx.moveTo(posX + 0.48 * dir * w, y - 1.22 * h);
    ctx.lineTo(posX + 0.64 * dir * w, y - 1.18 * h);
    ctx.lineTo(posX + 0.88 * dir * w, y - 1.44 * h);
    ctx.closePath();
    ctx.fillStyle = earTipColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    // Red Cheek
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.46 * dir * w,
      y - 0.54 * h,
      Math.max(0.1, Math.abs(0.18 * w)),
      Math.max(0.1, 0.18 * w),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = cheekColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Eye, Nose, Smile
    if (Math.abs(dir) > 0.15) {
      ctx.beginPath();
      ctx.ellipse(
        posX + 0.44 * dir * w,
        y - 0.74 * h,
        Math.max(0.1, Math.abs(0.11 * w)),
        Math.max(0.1, 0.13 * w),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = resolveColor("#18181b", isOpponent);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(
        posX + (0.44 + 0.04 * dir) * w,
        y - 0.77 * h,
        Math.max(0.1, Math.abs(0.04 * w)),
        Math.max(0.1, 0.04 * w),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = resolveColor("#ffffff", isOpponent);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(posX + 0.82 * dir * w, y - 0.62 * h);
      ctx.lineTo(posX + 0.78 * dir * w, y - 0.6 * h);
      ctx.lineTo(posX + 0.78 * dir * w, y - 0.64 * h);
      ctx.closePath();
      ctx.fillStyle = resolveColor("#18181b", isOpponent);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(posX + 0.64 * dir * w, y - 0.54 * h);
      ctx.quadraticCurveTo(
        posX + 0.7 * dir * w,
        y - 0.5 * h,
        posX + 0.74 * dir * w,
        y - 0.54 * h,
      );
      ctx.strokeStyle = stripeColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    this.drawCharacterStateAuras(
      ctx,
      posX,
      y,
      w,
      h,
      dir,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
    );
    ctx.restore();
  }

  /**
   * 2. CAPTAIN FALCON: Helmet with gold crest and white visor, flowing yellow scarf, athletic racing suit, boots.
   */
  private drawFalconPolygons(
    x: number,
    y: number,
    _topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    const { ctx } = this;
    const {
      taunting,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
      isOpponent,
      actionFrameCounter,
    } = state;
    ctx.save();
    const posX =
      inCombo && !taunting
        ? x + (actionFrameCounter % 2 === 0 ? 1.2 : -1.2)
        : x;
    const facingRight = effectiveDir >= 0;
    if (taunting) {
      const spinAngle = actionFrameCounter * 0.125 * (facingRight ? 1 : -1);
      ctx.translate(posX, centerY);
      ctx.rotate(spinAngle);
      ctx.translate(-posX, -centerY);
    }

    let suitColor = resolveColor("#1e293b", isOpponent);
    let goldColor = resolveColor("#fbbf24", isOpponent);
    let whiteColor = resolveColor("#f8fafc", isOpponent);
    let skinColor = resolveColor("#fed7aa", isOpponent);
    let helmetColor = resolveColor("#1e3a8a", isOpponent);
    const outlineColor = resolveColor("rgba(0, 0, 0, 0.6)", isOpponent);
    const outlineWidth = 1.2;

    if (taunting) {
      const hue = (actionFrameCounter * 10) % 360;
      suitColor = resolveColor(`hsl(${hue}, 80%, 45%)`, isOpponent);
      goldColor = resolveColor(
        `hsl(${(hue + 60) % 360}, 90%, 55%)`,
        isOpponent,
      );
      helmetColor = resolveColor(
        `hsl(${(hue + 20) % 360}, 85%, 40%)`,
        isOpponent,
      );
    } else if (isRoll) {
      suitColor = resolveColor("#1e293b", isOpponent, 0.45);
      goldColor = resolveColor("#fbbf24", isOpponent, 0.45);
      whiteColor = resolveColor("#f8fafc", isOpponent, 0.45);
      skinColor = resolveColor("#fed7aa", isOpponent, 0.45);
      helmetColor = resolveColor("#1e3a8a", isOpponent, 0.45);
    }

    const dir = effectiveDir;
    const w = halfWidth;
    const h = heightPx;

    // Scarf
    ctx.beginPath();
    ctx.moveTo(posX - 0.12 * dir * w, y - 0.74 * h);
    ctx.lineTo(posX - 0.55 * dir * w, y - 0.78 * h);
    ctx.lineTo(posX - 1.05 * dir * w, y - 0.7 * h);
    ctx.lineTo(posX - 0.85 * dir * w, y - 0.75 * h);
    ctx.lineTo(posX - 1.15 * dir * w, y - 0.82 * h);
    ctx.lineTo(posX - 0.5 * dir * w, y - 0.84 * h);
    ctx.lineTo(posX - 0.08 * dir * w, y - 0.8 * h);
    ctx.closePath();
    ctx.fillStyle = goldColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    // Back Leg & Boot
    ctx.beginPath();
    ctx.moveTo(posX - 0.18 * dir * w, y - 0.42 * h);
    ctx.lineTo(posX - 0.42 * dir * w, y - 0.42 * h);
    ctx.lineTo(posX - 0.48 * dir * w, y - 0.22 * h);
    ctx.lineTo(posX - 0.28 * dir * w, y - 0.22 * h);
    ctx.closePath();
    ctx.fillStyle = suitColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX - 0.49 * dir * w, y - 0.23 * h);
    ctx.lineTo(posX - 0.27 * dir * w, y - 0.23 * h);
    ctx.lineTo(posX - 0.29 * dir * w, y - 0.17 * h);
    ctx.lineTo(posX - 0.47 * dir * w, y - 0.17 * h);
    ctx.closePath();
    ctx.fillStyle = goldColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(posX - 0.47 * dir * w, y - 0.17 * h);
    ctx.lineTo(posX - 0.29 * dir * w, y - 0.17 * h);
    ctx.lineTo(posX - 0.22 * dir * w, y);
    ctx.lineTo(posX - 0.55 * dir * w, y);
    ctx.closePath();
    ctx.fillStyle = whiteColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    // Front Leg & Boot
    ctx.beginPath();
    ctx.moveTo(posX - 0.05 * dir * w, y - 0.42 * h);
    ctx.lineTo(posX + 0.22 * dir * w, y - 0.42 * h);
    ctx.lineTo(posX + 0.38 * dir * w, y - 0.22 * h);
    ctx.lineTo(posX + 0.16 * dir * w, y - 0.22 * h);
    ctx.closePath();
    ctx.fillStyle = suitColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX + 0.15 * dir * w, y - 0.23 * h);
    ctx.lineTo(posX + 0.39 * dir * w, y - 0.23 * h);
    ctx.lineTo(posX + 0.42 * dir * w, y - 0.17 * h);
    ctx.lineTo(posX + 0.18 * dir * w, y - 0.17 * h);
    ctx.closePath();
    ctx.fillStyle = goldColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(posX + 0.18 * dir * w, y - 0.17 * h);
    ctx.lineTo(posX + 0.42 * dir * w, y - 0.17 * h);
    ctx.lineTo(posX + 0.65 * dir * w, y);
    ctx.lineTo(posX + 0.28 * dir * w, y);
    ctx.closePath();
    ctx.fillStyle = whiteColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    // Torso & Belt
    ctx.beginPath();
    ctx.moveTo(posX - 0.32 * dir * w, y - 0.42 * h);
    ctx.lineTo(posX - 0.38 * dir * w, y - 0.68 * h);
    ctx.lineTo(posX - 0.18 * dir * w, y - 0.78 * h);
    ctx.lineTo(posX + 0.22 * dir * w, y - 0.78 * h);
    ctx.lineTo(posX + 0.46 * dir * w, y - 0.66 * h);
    ctx.lineTo(posX + 0.26 * dir * w, y - 0.42 * h);
    ctx.closePath();
    ctx.fillStyle = suitColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX - 0.34 * dir * w, y - 0.43 * h);
    ctx.lineTo(posX + 0.28 * dir * w, y - 0.43 * h);
    ctx.lineTo(posX + 0.26 * dir * w, y - 0.38 * h);
    ctx.lineTo(posX - 0.32 * dir * w, y - 0.38 * h);
    ctx.closePath();
    ctx.fillStyle = goldColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(posX - 0.12 * dir * w, y - 0.76 * h);
    ctx.lineTo(posX - 0.02 * dir * w, y - 0.77 * h);
    ctx.lineTo(posX + 0.24 * dir * w, y - 0.46 * h);
    ctx.lineTo(posX + 0.16 * dir * w, y - 0.45 * h);
    ctx.closePath();
    ctx.fillStyle = whiteColor;
    ctx.fill();

    // Shoulder Pauldron
    ctx.beginPath();
    ctx.moveTo(posX + 0.12 * dir * w, y - 0.78 * h);
    ctx.lineTo(posX + 0.54 * dir * w, y - 0.75 * h);
    ctx.lineTo(posX + 0.46 * dir * w, y - 0.62 * h);
    ctx.lineTo(posX + 0.16 * dir * w, y - 0.65 * h);
    ctx.closePath();
    ctx.fillStyle = goldColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    // Arms & Gloves
    ctx.beginPath();
    ctx.moveTo(posX + 0.44 * dir * w, y - 0.64 * h);
    ctx.lineTo(posX + 0.72 * dir * w, y - 0.56 * h);
    ctx.lineTo(posX + 0.88 * dir * w, y - 0.48 * h);
    ctx.lineTo(posX + 0.74 * dir * w, y - 0.44 * h);
    ctx.lineTo(posX + 0.46 * dir * w, y - 0.52 * h);
    ctx.closePath();
    ctx.fillStyle = suitColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(posX + 0.68 * dir * w, y - 0.57 * h);
    ctx.lineTo(posX + 0.88 * dir * w, y - 0.48 * h);
    ctx.lineTo(posX + 0.74 * dir * w, y - 0.44 * h);
    ctx.lineTo(posX + 0.62 * dir * w, y - 0.52 * h);
    ctx.closePath();
    ctx.fillStyle = whiteColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(posX - 0.32 * dir * w, y - 0.64 * h);
    ctx.lineTo(posX - 0.58 * dir * w, y - 0.52 * h);
    ctx.lineTo(posX - 0.46 * dir * w, y - 0.46 * h);
    ctx.closePath();
    ctx.fillStyle = whiteColor;
    ctx.fill();

    // Helmet & Visor
    ctx.beginPath();
    ctx.moveTo(posX - 0.16 * dir * w, y - 0.78 * h);
    ctx.lineTo(posX - 0.22 * dir * w, y - 0.94 * h);
    ctx.lineTo(posX + 0.06 * dir * w, y - 1.02 * h);
    ctx.lineTo(posX + 0.38 * dir * w, y - 0.92 * h);
    ctx.lineTo(posX + 0.1 * dir * w, y - 0.82 * h);
    ctx.lineTo(posX - 0.08 * dir * w, y - 0.76 * h);
    ctx.closePath();
    ctx.fillStyle = helmetColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX + 0.06 * dir * w, y - 0.8 * h);
    ctx.lineTo(posX + 0.24 * dir * w, y - 0.8 * h);
    ctx.lineTo(posX + 0.3 * dir * w, y - 0.73 * h);
    ctx.lineTo(posX + 0.12 * dir * w, y - 0.74 * h);
    ctx.closePath();
    ctx.fillStyle = skinColor;
    ctx.fill();

    if (Math.abs(dir) > 0.15) {
      ctx.beginPath();
      ctx.moveTo(posX + 0.12 * dir * w, y - 0.88 * h);
      ctx.lineTo(posX + 0.36 * dir * w, y - 0.88 * h);
      ctx.lineTo(posX + 0.32 * dir * w, y - 0.82 * h);
      ctx.lineTo(posX + 0.14 * dir * w, y - 0.82 * h);
      ctx.closePath();
      ctx.fillStyle = whiteColor;
      ctx.fill();
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(posX + 0.36 * dir * w, y - 0.94 * h);
    ctx.lineTo(posX + 0.18 * dir * w, y - 1.0 * h);
    ctx.lineTo(posX - 0.02 * dir * w, y - 0.96 * h);
    ctx.lineTo(posX + 0.16 * dir * w, y - 0.93 * h);
    ctx.closePath();
    ctx.fillStyle = goldColor;
    ctx.fill();

    this.drawCharacterStateAuras(
      ctx,
      posX,
      y,
      w,
      h,
      dir,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
    );
    ctx.restore();
  }

  /**
   * 3. MARIO: Red cap with brim, blue overalls with yellow buttons, red shirt, mustache, brown shoes.
   */
  private drawMarioPolygons(
    x: number,
    y: number,
    _topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    const { ctx } = this;
    const {
      taunting,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
      isOpponent,
      actionFrameCounter,
    } = state;
    ctx.save();
    const posX =
      inCombo && !taunting
        ? x + (actionFrameCounter % 2 === 0 ? 1.2 : -1.2)
        : x;
    const facingRight = effectiveDir >= 0;
    if (taunting) {
      const spinAngle = actionFrameCounter * 0.125 * (facingRight ? 1 : -1);
      ctx.translate(posX, centerY);
      ctx.rotate(spinAngle);
      ctx.translate(-posX, -centerY);
    }

    let redColor = resolveColor("#dc2626", isOpponent);
    let blueColor = resolveColor("#2563eb", isOpponent);
    let goldColor = resolveColor("#facc15", isOpponent);
    let whiteColor = resolveColor("#f8fafc", isOpponent);
    let skinColor = resolveColor("#fed7aa", isOpponent);
    let brownColor = resolveColor("#78350f", isOpponent);
    let hairColor = resolveColor("#1c1917", isOpponent);
    const outlineColor = resolveColor("rgba(0, 0, 0, 0.6)", isOpponent);
    const outlineWidth = 1.2;

    if (taunting) {
      const hue = (actionFrameCounter * 10) % 360;
      redColor = resolveColor(`hsl(${hue}, 85%, 50%)`, isOpponent);
      blueColor = resolveColor(
        `hsl(${(hue + 180) % 360}, 80%, 45%)`,
        isOpponent,
      );
    } else if (isRoll) {
      redColor = resolveColor("#dc2626", isOpponent, 0.45);
      blueColor = resolveColor("#2563eb", isOpponent, 0.45);
      goldColor = resolveColor("#facc15", isOpponent, 0.45);
      whiteColor = resolveColor("#f8fafc", isOpponent, 0.45);
      skinColor = resolveColor("#fed7aa", isOpponent, 0.45);
      brownColor = resolveColor("#78350f", isOpponent, 0.45);
      hairColor = resolveColor("#1c1917", isOpponent, 0.45);
    }

    const dir = effectiveDir;
    const w = halfWidth;
    const h = heightPx;

    // Back Shoe & Leg
    ctx.beginPath();
    ctx.ellipse(
      posX - 0.35 * dir * w,
      y - 0.08 * h,
      Math.max(0.1, 0.25 * w),
      Math.max(0.1, 0.12 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = brownColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX - 0.15 * dir * w, y - 0.4 * h);
    ctx.lineTo(posX - 0.45 * dir * w, y - 0.4 * h);
    ctx.lineTo(posX - 0.48 * dir * w, y - 0.15 * h);
    ctx.lineTo(posX - 0.22 * dir * w, y - 0.15 * h);
    ctx.closePath();
    ctx.fillStyle = blueColor;
    ctx.fill();
    ctx.stroke();

    // Front Shoe & Leg
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.38 * dir * w,
      y - 0.08 * h,
      Math.max(0.1, 0.28 * w),
      Math.max(0.1, 0.12 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = brownColor;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX - 0.05 * dir * w, y - 0.4 * h);
    ctx.lineTo(posX + 0.35 * dir * w, y - 0.4 * h);
    ctx.lineTo(posX + 0.48 * dir * w, y - 0.15 * h);
    ctx.lineTo(posX + 0.18 * dir * w, y - 0.15 * h);
    ctx.closePath();
    ctx.fillStyle = blueColor;
    ctx.fill();
    ctx.stroke();

    // Overalls Torso & Red Shirt
    ctx.beginPath();
    ctx.moveTo(posX - 0.35 * dir * w, y - 0.65 * h);
    ctx.lineTo(posX + 0.35 * dir * w, y - 0.65 * h);
    ctx.lineTo(posX + 0.35 * dir * w, y - 0.38 * h);
    ctx.lineTo(posX - 0.35 * dir * w, y - 0.38 * h);
    ctx.closePath();
    ctx.fillStyle = redColor;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX - 0.28 * dir * w, y - 0.62 * h);
    ctx.lineTo(posX + 0.28 * dir * w, y - 0.62 * h);
    ctx.lineTo(posX + 0.32 * dir * w, y - 0.38 * h);
    ctx.lineTo(posX - 0.32 * dir * w, y - 0.38 * h);
    ctx.closePath();
    ctx.fillStyle = blueColor;
    ctx.fill();
    ctx.stroke();

    // Yellow Button on Overalls
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.18 * dir * w,
      y - 0.55 * h,
      Math.max(0.1, 0.08 * w),
      Math.max(0.1, 0.08 * w),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = goldColor;
    ctx.fill();

    // Arms & White Gloves
    ctx.beginPath();
    ctx.ellipse(
      posX - 0.45 * dir * w,
      y - 0.48 * h,
      Math.max(0.1, 0.16 * w),
      Math.max(0.1, 0.16 * w),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = whiteColor;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      posX + 0.52 * dir * w,
      y - 0.48 * h,
      Math.max(0.1, 0.18 * w),
      Math.max(0.1, 0.18 * w),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = whiteColor;
    ctx.fill();
    ctx.stroke();

    // Head, Face & Cap
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.12 * dir * w,
      y - 0.76 * h,
      Math.max(0.1, 0.35 * w),
      Math.max(0.1, 0.22 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = skinColor;
    ctx.fill();

    // Big Mario Nose
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.46 * dir * w,
      y - 0.74 * h,
      Math.max(0.1, 0.18 * w),
      Math.max(0.1, 0.14 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = skinColor;
    ctx.fill();
    ctx.stroke();

    // Mustache
    ctx.beginPath();
    ctx.moveTo(posX + 0.18 * dir * w, y - 0.68 * h);
    ctx.lineTo(posX + 0.62 * dir * w, y - 0.68 * h);
    ctx.lineTo(posX + 0.68 * dir * w, y - 0.62 * h);
    ctx.lineTo(posX + 0.32 * dir * w, y - 0.62 * h);
    ctx.closePath();
    ctx.fillStyle = hairColor;
    ctx.fill();

    // Eye
    if (Math.abs(dir) > 0.15) {
      ctx.beginPath();
      ctx.ellipse(
        posX + 0.28 * dir * w,
        y - 0.8 * h,
        Math.max(0.1, 0.08 * w),
        Math.max(0.1, 0.12 * h),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = blueColor;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(
        posX + (0.28 + 0.03 * dir) * w,
        y - 0.82 * h,
        Math.max(0.1, 0.03 * w),
        Math.max(0.1, 0.04 * h),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = resolveColor("#ffffff", isOpponent);
      ctx.fill();
    }

    // Red Cap Dome & Visor
    ctx.beginPath();
    ctx.moveTo(posX - 0.28 * dir * w, y - 0.8 * h);
    ctx.lineTo(posX - 0.32 * dir * w, y - 1.0 * h);
    ctx.lineTo(posX + 0.15 * dir * w, y - 1.05 * h);
    ctx.lineTo(posX + 0.52 * dir * w, y - 0.92 * h);
    ctx.lineTo(posX + 0.25 * dir * w, y - 0.85 * h);
    ctx.closePath();
    ctx.fillStyle = redColor;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX + 0.18 * dir * w, y - 0.88 * h);
    ctx.lineTo(posX + 0.72 * dir * w, y - 0.84 * h);
    ctx.lineTo(posX + 0.52 * dir * w, y - 0.8 * h);
    ctx.closePath();
    ctx.fillStyle = redColor;
    ctx.fill();
    ctx.stroke();

    this.drawCharacterStateAuras(
      ctx,
      posX,
      y,
      w,
      h,
      dir,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
    );
    ctx.restore();
  }

  /**
   * 4. LUIGI: Green cap with brim, navy overalls with yellow buttons, green shirt, wavy mustache.
   */
  private drawLuigiPolygons(
    x: number,
    y: number,
    _topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    const { ctx } = this;
    const {
      taunting,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
      isOpponent,
      actionFrameCounter,
    } = state;
    ctx.save();
    const posX =
      inCombo && !taunting
        ? x + (actionFrameCounter % 2 === 0 ? 1.2 : -1.2)
        : x;
    const facingRight = effectiveDir >= 0;
    if (taunting) {
      const spinAngle = actionFrameCounter * 0.125 * (facingRight ? 1 : -1);
      ctx.translate(posX, centerY);
      ctx.rotate(spinAngle);
      ctx.translate(-posX, -centerY);
    }

    let greenColor = resolveColor("#16a34a", isOpponent);
    let navyColor = resolveColor("#1e3a8a", isOpponent);
    let goldColor = resolveColor("#facc15", isOpponent);
    let whiteColor = resolveColor("#f8fafc", isOpponent);
    let skinColor = resolveColor("#fed7aa", isOpponent);
    let brownColor = resolveColor("#78350f", isOpponent);
    let hairColor = resolveColor("#1c1917", isOpponent);
    const outlineColor = resolveColor("rgba(0, 0, 0, 0.6)", isOpponent);
    const outlineWidth = 1.2;

    if (taunting) {
      const hue = (actionFrameCounter * 10) % 360;
      greenColor = resolveColor(`hsl(${hue}, 85%, 45%)`, isOpponent);
      navyColor = resolveColor(
        `hsl(${(hue + 180) % 360}, 80%, 40%)`,
        isOpponent,
      );
    } else if (isRoll) {
      greenColor = resolveColor("#16a34a", isOpponent, 0.45);
      navyColor = resolveColor("#1e3a8a", isOpponent, 0.45);
      goldColor = resolveColor("#facc15", isOpponent, 0.45);
      whiteColor = resolveColor("#f8fafc", isOpponent, 0.45);
      skinColor = resolveColor("#fed7aa", isOpponent, 0.45);
      brownColor = resolveColor("#78350f", isOpponent, 0.45);
      hairColor = resolveColor("#1c1917", isOpponent, 0.45);
    }

    const dir = effectiveDir;
    const w = halfWidth;
    const h = heightPx;

    // Back Shoe & Leg
    ctx.beginPath();
    ctx.ellipse(
      posX - 0.32 * dir * w,
      y - 0.08 * h,
      Math.max(0.1, 0.22 * w),
      Math.max(0.1, 0.11 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = brownColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX - 0.12 * dir * w, y - 0.42 * h);
    ctx.lineTo(posX - 0.4 * dir * w, y - 0.42 * h);
    ctx.lineTo(posX - 0.42 * dir * w, y - 0.15 * h);
    ctx.lineTo(posX - 0.18 * dir * w, y - 0.15 * h);
    ctx.closePath();
    ctx.fillStyle = navyColor;
    ctx.fill();
    ctx.stroke();

    // Front Shoe & Leg
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.35 * dir * w,
      y - 0.08 * h,
      Math.max(0.1, 0.25 * w),
      Math.max(0.1, 0.11 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = brownColor;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX - 0.05 * dir * w, y - 0.42 * h);
    ctx.lineTo(posX + 0.3 * dir * w, y - 0.42 * h);
    ctx.lineTo(posX + 0.42 * dir * w, y - 0.15 * h);
    ctx.lineTo(posX + 0.16 * dir * w, y - 0.15 * h);
    ctx.closePath();
    ctx.fillStyle = navyColor;
    ctx.fill();
    ctx.stroke();

    // Overalls Torso & Green Shirt
    ctx.beginPath();
    ctx.moveTo(posX - 0.3 * dir * w, y - 0.68 * h);
    ctx.lineTo(posX + 0.3 * dir * w, y - 0.68 * h);
    ctx.lineTo(posX + 0.3 * dir * w, y - 0.4 * h);
    ctx.lineTo(posX - 0.3 * dir * w, y - 0.4 * h);
    ctx.closePath();
    ctx.fillStyle = greenColor;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX - 0.24 * dir * w, y - 0.64 * h);
    ctx.lineTo(posX + 0.24 * dir * w, y - 0.64 * h);
    ctx.lineTo(posX + 0.28 * dir * w, y - 0.4 * h);
    ctx.lineTo(posX - 0.28 * dir * w, y - 0.4 * h);
    ctx.closePath();
    ctx.fillStyle = navyColor;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      posX + 0.15 * dir * w,
      y - 0.58 * h,
      Math.max(0.1, 0.07 * w),
      Math.max(0.1, 0.07 * w),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = goldColor;
    ctx.fill();

    // Arms & Gloves
    ctx.beginPath();
    ctx.ellipse(
      posX - 0.42 * dir * w,
      y - 0.5 * h,
      Math.max(0.1, 0.15 * w),
      Math.max(0.1, 0.15 * w),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = whiteColor;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      posX + 0.48 * dir * w,
      y - 0.5 * h,
      Math.max(0.1, 0.16 * w),
      Math.max(0.1, 0.16 * w),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = whiteColor;
    ctx.fill();
    ctx.stroke();

    // Head, Face & Cap
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.1 * dir * w,
      y - 0.78 * h,
      Math.max(0.1, 0.3 * w),
      Math.max(0.1, 0.22 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = skinColor;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(
      posX + 0.42 * dir * w,
      y - 0.76 * h,
      Math.max(0.1, 0.16 * w),
      Math.max(0.1, 0.13 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = skinColor;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX + 0.15 * dir * w, y - 0.7 * h);
    ctx.quadraticCurveTo(
      posX + 0.35 * dir * w,
      y - 0.65 * h,
      posX + 0.6 * dir * w,
      y - 0.7 * h,
    );
    ctx.lineTo(posX + 0.55 * dir * w, y - 0.64 * h);
    ctx.closePath();
    ctx.fillStyle = hairColor;
    ctx.fill();

    if (Math.abs(dir) > 0.15) {
      ctx.beginPath();
      ctx.ellipse(
        posX + 0.25 * dir * w,
        y - 0.82 * h,
        Math.max(0.1, 0.07 * w),
        Math.max(0.1, 0.11 * h),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = navyColor;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(
        posX + (0.25 + 0.02 * dir) * w,
        y - 0.84 * h,
        Math.max(0.1, 0.03 * w),
        Math.max(0.1, 0.04 * h),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = resolveColor("#ffffff", isOpponent);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(posX - 0.25 * dir * w, y - 0.82 * h);
    ctx.lineTo(posX - 0.28 * dir * w, y - 1.04 * h);
    ctx.lineTo(posX + 0.12 * dir * w, y - 1.08 * h);
    ctx.lineTo(posX + 0.48 * dir * w, y - 0.94 * h);
    ctx.lineTo(posX + 0.22 * dir * w, y - 0.87 * h);
    ctx.closePath();
    ctx.fillStyle = greenColor;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX + 0.15 * dir * w, y - 0.9 * h);
    ctx.lineTo(posX + 0.68 * dir * w, y - 0.86 * h);
    ctx.lineTo(posX + 0.48 * dir * w, y - 0.82 * h);
    ctx.closePath();
    ctx.fillStyle = greenColor;
    ctx.fill();
    ctx.stroke();

    this.drawCharacterStateAuras(
      ctx,
      posX,
      y,
      w,
      h,
      dir,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
    );
    ctx.restore();
  }

  /**
   * 5. KIRBY: Round pink ball body, oversized red feet, blue eyes, rosy cheeks, stubby arms.
   */
  private drawKirbyPolygons(
    x: number,
    y: number,
    _topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    const { ctx } = this;
    const {
      taunting,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
      isOpponent,
      actionFrameCounter,
    } = state;
    ctx.save();
    const posX =
      inCombo && !taunting
        ? x + (actionFrameCounter % 2 === 0 ? 1.2 : -1.2)
        : x;
    const facingRight = effectiveDir >= 0;
    if (taunting) {
      const spinAngle = actionFrameCounter * 0.125 * (facingRight ? 1 : -1);
      ctx.translate(posX, centerY);
      ctx.rotate(spinAngle);
      ctx.translate(-posX, -centerY);
    }

    let pinkColor = resolveColor("#f472b6", isOpponent);
    let redFootColor = resolveColor("#e11d48", isOpponent);
    let cheekColor = resolveColor("#fb7185", isOpponent);
    let eyeBlue = resolveColor("#3b82f6", isOpponent);
    let mouthColor = resolveColor("#be123c", isOpponent);
    const outlineColor = resolveColor("rgba(0, 0, 0, 0.6)", isOpponent);
    const outlineWidth = 1.2;

    if (taunting) {
      const hue = (actionFrameCounter * 10) % 360;
      pinkColor = resolveColor(`hsl(${hue}, 85%, 65%)`, isOpponent);
      redFootColor = resolveColor(
        `hsl(${(hue + 45) % 360}, 90%, 55%)`,
        isOpponent,
      );
    } else if (isRoll) {
      pinkColor = resolveColor("#f472b6", isOpponent, 0.45);
      redFootColor = resolveColor("#e11d48", isOpponent, 0.45);
      cheekColor = resolveColor("#fb7185", isOpponent, 0.45);
      eyeBlue = resolveColor("#3b82f6", isOpponent, 0.45);
      mouthColor = resolveColor("#be123c", isOpponent, 0.45);
    }

    const dir = effectiveDir;
    const w = halfWidth;
    const h = heightPx;

    // Back Foot & Arm
    ctx.beginPath();
    ctx.ellipse(
      posX - 0.42 * dir * w,
      y - 0.16 * h,
      Math.max(0.1, 0.38 * w),
      Math.max(0.1, 0.18 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = redFootColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      posX - 0.68 * dir * w,
      y - 0.52 * h,
      Math.max(0.1, 0.22 * w),
      Math.max(0.1, 0.22 * w),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = pinkColor;
    ctx.fill();
    ctx.stroke();

    // Main Pink Body Sphere
    ctx.beginPath();
    ctx.ellipse(
      posX,
      y - 0.52 * h,
      Math.max(0.1, 0.78 * w),
      Math.max(0.1, 0.46 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = pinkColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    // Front Foot & Arm
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.42 * dir * w,
      y - 0.16 * h,
      Math.max(0.1, 0.42 * w),
      Math.max(0.1, 0.18 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = redFootColor;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      posX + 0.68 * dir * w,
      y - 0.48 * h,
      Math.max(0.1, 0.24 * w),
      Math.max(0.1, 0.24 * w),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = pinkColor;
    ctx.fill();
    ctx.stroke();

    // Face: Rosy Cheek, Blue Eyes, Open Smile
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.36 * dir * w,
      y - 0.44 * h,
      Math.max(0.1, 0.18 * w),
      Math.max(0.1, 0.12 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = cheekColor;
    ctx.fill();

    if (Math.abs(dir) > 0.15) {
      ctx.beginPath();
      ctx.ellipse(
        posX + 0.22 * dir * w,
        y - 0.62 * h,
        Math.max(0.1, 0.12 * w),
        Math.max(0.1, 0.22 * h),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = resolveColor("#18181b", isOpponent);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(
        posX + 0.22 * dir * w,
        y - 0.54 * h,
        Math.max(0.1, 0.1 * w),
        Math.max(0.1, 0.12 * h),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = eyeBlue;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(
        posX + (0.22 + 0.03 * dir) * w,
        y - 0.68 * h,
        Math.max(0.1, 0.05 * w),
        Math.max(0.1, 0.08 * h),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = resolveColor("#ffffff", isOpponent);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(
        posX + 0.15 * dir * w,
        y - 0.42 * h,
        Math.max(0.1, 0.12 * w),
        0,
        Math.PI,
      );
      ctx.fillStyle = mouthColor;
      ctx.fill();
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    this.drawCharacterStateAuras(
      ctx,
      posX,
      y,
      w,
      h,
      dir,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
    );
    ctx.restore();
  }

  /**
   * 6. JIGGLYPUFF: Light pink balloon body, forehead swirl tuft, cat-like ears with dark inner ears, teal shiny eyes.
   */
  private drawJigglypuffPolygons(
    x: number,
    y: number,
    _topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    const { ctx } = this;
    const {
      taunting,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
      isOpponent,
      actionFrameCounter,
    } = state;
    ctx.save();
    const posX =
      inCombo && !taunting
        ? x + (actionFrameCounter % 2 === 0 ? 1.2 : -1.2)
        : x;
    const facingRight = effectiveDir >= 0;
    if (taunting) {
      const spinAngle = actionFrameCounter * 0.125 * (facingRight ? 1 : -1);
      ctx.translate(posX, centerY);
      ctx.rotate(spinAngle);
      ctx.translate(-posX, -centerY);
    }

    let lightPink = resolveColor("#f9a8d4", isOpponent);
    let deepPink = resolveColor("#f472b6", isOpponent);
    let innerEar = resolveColor("#3f3f46", isOpponent);
    let tealEye = resolveColor("#14b8a6", isOpponent);
    const outlineColor = resolveColor("rgba(0, 0, 0, 0.6)", isOpponent);
    const outlineWidth = 1.2;

    if (taunting) {
      const hue = (actionFrameCounter * 10) % 360;
      lightPink = resolveColor(`hsl(${hue}, 85%, 75%)`, isOpponent);
      deepPink = resolveColor(`hsl(${(hue + 30) % 360}, 90%, 65%)`, isOpponent);
    } else if (isRoll) {
      lightPink = resolveColor("#f9a8d4", isOpponent, 0.45);
      deepPink = resolveColor("#f472b6", isOpponent, 0.45);
      innerEar = resolveColor("#3f3f46", isOpponent, 0.45);
      tealEye = resolveColor("#14b8a6", isOpponent, 0.45);
    }

    const dir = effectiveDir;
    const w = halfWidth;
    const h = heightPx;

    // Back Ear
    ctx.beginPath();
    ctx.moveTo(posX - 0.38 * dir * w, y - 0.72 * h);
    ctx.lineTo(posX - 0.62 * dir * w, y - 1.15 * h);
    ctx.lineTo(posX - 0.15 * dir * w, y - 0.88 * h);
    ctx.closePath();
    ctx.fillStyle = lightPink;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX - 0.35 * dir * w, y - 0.76 * h);
    ctx.lineTo(posX - 0.52 * dir * w, y - 1.05 * h);
    ctx.lineTo(posX - 0.2 * dir * w, y - 0.86 * h);
    ctx.closePath();
    ctx.fillStyle = innerEar;
    ctx.fill();

    // Feet
    ctx.beginPath();
    ctx.ellipse(
      posX - 0.28 * dir * w,
      y - 0.08 * h,
      Math.max(0.1, 0.22 * w),
      Math.max(0.1, 0.1 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = deepPink;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      posX + 0.28 * dir * w,
      y - 0.08 * h,
      Math.max(0.1, 0.24 * w),
      Math.max(0.1, 0.1 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = deepPink;
    ctx.fill();
    ctx.stroke();

    // Body Sphere
    ctx.beginPath();
    ctx.ellipse(
      posX,
      y - 0.52 * h,
      Math.max(0.1, 0.76 * w),
      Math.max(0.1, 0.46 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = lightPink;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    // Front Ear
    ctx.beginPath();
    ctx.moveTo(posX + 0.12 * dir * w, y - 0.85 * h);
    ctx.lineTo(posX + 0.42 * dir * w, y - 1.22 * h);
    ctx.lineTo(posX + 0.52 * dir * w, y - 0.75 * h);
    ctx.closePath();
    ctx.fillStyle = lightPink;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX + 0.18 * dir * w, y - 0.86 * h);
    ctx.lineTo(posX + 0.38 * dir * w, y - 1.12 * h);
    ctx.lineTo(posX + 0.44 * dir * w, y - 0.8 * h);
    ctx.closePath();
    ctx.fillStyle = innerEar;
    ctx.fill();

    // Forehead Swirl / Tuft
    ctx.beginPath();
    ctx.moveTo(posX - 0.05 * dir * w, y - 0.78 * h);
    ctx.quadraticCurveTo(
      posX + 0.2 * dir * w,
      y - 1.05 * h,
      posX + 0.45 * dir * w,
      y - 0.88 * h,
    );
    ctx.quadraticCurveTo(
      posX + 0.1 * dir * w,
      y - 0.75 * h,
      posX + 0.22 * dir * w,
      y - 0.72 * h,
    );
    ctx.closePath();
    ctx.fillStyle = deepPink;
    ctx.fill();
    ctx.stroke();

    // Big Teal Eye & Cute Mouth
    if (Math.abs(dir) > 0.15) {
      ctx.beginPath();
      ctx.ellipse(
        posX + 0.32 * dir * w,
        y - 0.52 * h,
        Math.max(0.1, 0.24 * w),
        Math.max(0.1, 0.24 * w),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = tealEye;
      ctx.fill();
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        posX + (0.32 + 0.06 * dir) * w,
        y - 0.58 * h,
        Math.max(0.1, 0.09 * w),
        Math.max(0.1, 0.09 * w),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = resolveColor("#ffffff", isOpponent);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(
        posX + 0.45 * dir * w,
        y - 0.36 * h,
        Math.max(0.1, 0.08 * w),
        0,
        Math.PI,
      );
      ctx.strokeStyle = resolveColor("#be123c", isOpponent);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    this.drawCharacterStateAuras(
      ctx,
      posX,
      y,
      w,
      h,
      dir,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
    );
    ctx.restore();
  }

  /**
   * 7. FOX: Pointed fox snout, white cheek ruff, pointed ears, white flight jacket, green jumpsuit, bushy tail.
   */
  private drawFoxPolygons(
    x: number,
    y: number,
    _topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    const { ctx } = this;
    const {
      taunting,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
      isOpponent,
      actionFrameCounter,
    } = state;
    ctx.save();
    const posX =
      inCombo && !taunting
        ? x + (actionFrameCounter % 2 === 0 ? 1.2 : -1.2)
        : x;
    const facingRight = effectiveDir >= 0;
    if (taunting) {
      const spinAngle = actionFrameCounter * 0.125 * (facingRight ? 1 : -1);
      ctx.translate(posX, centerY);
      ctx.rotate(spinAngle);
      ctx.translate(-posX, -centerY);
    }

    let furColor = resolveColor("#c8732a", isOpponent); // Muted amber fox fur
    let whiteFur = resolveColor("#f8fafc", isOpponent);
    let purpleJacket = resolveColor("#7c3aed", isOpponent); // Purple jacket / torso
    let navyPants = resolveColor("#1e3a5f", isOpponent); // Dark navy blue pants
    let purpleBoots = resolveColor("#a855f7", isOpponent); // Purple boots / feet
    let darkEar = resolveColor("#18181b", isOpponent);
    let beltColor = resolveColor("#3b1f6e", isOpponent); // Deep purple belt
    let scouterColor = resolveColor("#06b6d4", isOpponent); // Cyan scouter
    const outlineColor = resolveColor("rgba(0, 0, 0, 0.6)", isOpponent);
    const outlineWidth = 1.2;

    if (taunting) {
      const hue = (actionFrameCounter * 10) % 360;
      furColor = resolveColor(`hsl(${hue}, 70%, 50%)`, isOpponent);
      purpleJacket = resolveColor(
        `hsl(${(hue + 120) % 360}, 80%, 45%)`,
        isOpponent,
      );
      navyPants = resolveColor(
        `hsl(${(hue + 200) % 360}, 75%, 30%)`,
        isOpponent,
      );
      purpleBoots = resolveColor(
        `hsl(${(hue + 120) % 360}, 80%, 60%)`,
        isOpponent,
      );
    } else if (isRoll) {
      furColor = resolveColor("#c8732a", isOpponent, 0.45);
      whiteFur = resolveColor("#f8fafc", isOpponent, 0.45);
      purpleJacket = resolveColor("#7c3aed", isOpponent, 0.45);
      navyPants = resolveColor("#1e3a5f", isOpponent, 0.45);
      purpleBoots = resolveColor("#a855f7", isOpponent, 0.45);
      darkEar = resolveColor("#18181b", isOpponent, 0.45);
      beltColor = resolveColor("#3b1f6e", isOpponent, 0.45);
      scouterColor = resolveColor("#06b6d4", isOpponent, 0.45);
    }

    const dir = effectiveDir;
    const w = halfWidth;
    const h = heightPx;

    // Bushy Fox Tail (Background)
    ctx.beginPath();
    ctx.moveTo(posX - 0.4 * dir * w, y - 0.35 * h);
    ctx.lineTo(posX - 1.05 * dir * w, y - 0.7 * h);
    ctx.lineTo(posX - 0.85 * dir * w, y - 0.82 * h);
    ctx.lineTo(posX - 0.3 * dir * w, y - 0.45 * h);
    ctx.closePath();
    ctx.fillStyle = furColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX - 1.05 * dir * w, y - 0.7 * h);
    ctx.lineTo(posX - 1.25 * dir * w, y - 0.8 * h);
    ctx.lineTo(posX - 0.85 * dir * w, y - 0.82 * h);
    ctx.closePath();
    ctx.fillStyle = whiteFur;
    ctx.fill();
    ctx.stroke();

    // Back Ear
    ctx.beginPath();
    ctx.moveTo(posX - 0.15 * dir * w, y - 0.9 * h);
    ctx.lineTo(posX - 0.32 * dir * w, y - 1.32 * h);
    ctx.lineTo(posX + 0.05 * dir * w, y - 1.05 * h);
    ctx.closePath();
    ctx.fillStyle = furColor;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX - 0.22 * dir * w, y - 1.15 * h);
    ctx.lineTo(posX - 0.32 * dir * w, y - 1.32 * h);
    ctx.lineTo(posX - 0.08 * dir * w, y - 1.18 * h);
    ctx.closePath();
    ctx.fillStyle = darkEar;
    ctx.fill();

    // Dark navy blue pants (legs)
    ctx.beginPath();
    ctx.moveTo(posX - 0.35 * dir * w, y - 0.42 * h);
    ctx.lineTo(posX + 0.25 * dir * w, y - 0.42 * h);
    ctx.lineTo(posX + 0.35 * dir * w, y - 0.2 * h);
    ctx.lineTo(posX - 0.35 * dir * w, y - 0.2 * h);
    ctx.closePath();
    ctx.fillStyle = navyPants;
    ctx.fill();
    ctx.stroke();

    // Purple boots (left)
    ctx.beginPath();
    ctx.moveTo(posX - 0.42 * dir * w, y - 0.2 * h);
    ctx.lineTo(posX - 0.16 * dir * w, y - 0.2 * h);
    ctx.lineTo(posX - 0.16 * dir * w, y);
    ctx.lineTo(posX - 0.42 * dir * w, y);
    ctx.closePath();
    ctx.fillStyle = purpleBoots;
    ctx.fill();
    ctx.stroke();

    // Purple boots (right)
    ctx.beginPath();
    ctx.moveTo(posX + 0.18 * dir * w, y - 0.2 * h);
    ctx.lineTo(posX + 0.5 * dir * w, y - 0.2 * h);
    ctx.lineTo(posX + 0.5 * dir * w, y);
    ctx.lineTo(posX + 0.18 * dir * w, y);
    ctx.closePath();
    ctx.fillStyle = purpleBoots;
    ctx.fill();
    ctx.stroke();

    // Purple jacket / torso
    ctx.beginPath();
    ctx.moveTo(posX - 0.32 * dir * w, y - 0.72 * h);
    ctx.lineTo(posX + 0.38 * dir * w, y - 0.72 * h);
    ctx.lineTo(posX + 0.3 * dir * w, y - 0.42 * h);
    ctx.lineTo(posX - 0.3 * dir * w, y - 0.42 * h);
    ctx.closePath();
    ctx.fillStyle = purpleJacket;
    ctx.fill();
    ctx.stroke();

    // White chest / flight vest patch
    ctx.beginPath();
    ctx.moveTo(posX - 0.1 * dir * w, y - 0.72 * h);
    ctx.lineTo(posX + 0.18 * dir * w, y - 0.72 * h);
    ctx.lineTo(posX + 0.14 * dir * w, y - 0.52 * h);
    ctx.lineTo(posX - 0.08 * dir * w, y - 0.52 * h);
    ctx.closePath();
    ctx.fillStyle = whiteFur;
    ctx.fill();

    // Belt
    ctx.beginPath();
    ctx.moveTo(posX - 0.32 * dir * w, y - 0.44 * h);
    ctx.lineTo(posX + 0.32 * dir * w, y - 0.44 * h);
    ctx.lineTo(posX + 0.32 * dir * w, y - 0.38 * h);
    ctx.lineTo(posX - 0.32 * dir * w, y - 0.38 * h);
    ctx.closePath();
    ctx.fillStyle = beltColor;
    ctx.fill();

    // Front Ear
    ctx.beginPath();
    ctx.moveTo(posX + 0.12 * dir * w, y - 0.95 * h);
    ctx.lineTo(posX + 0.38 * dir * w, y - 1.35 * h);
    ctx.lineTo(posX + 0.42 * dir * w, y - 0.95 * h);
    ctx.closePath();
    ctx.fillStyle = furColor;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX + 0.28 * dir * w, y - 1.2 * h);
    ctx.lineTo(posX + 0.38 * dir * w, y - 1.35 * h);
    ctx.lineTo(posX + 0.4 * dir * w, y - 1.15 * h);
    ctx.closePath();
    ctx.fillStyle = darkEar;
    ctx.fill();

    // Fox Snout, Cheeks, Scouter, Eye
    ctx.beginPath();
    ctx.moveTo(posX - 0.15 * dir * w, y - 0.92 * h);
    ctx.lineTo(posX + 0.45 * dir * w, y - 0.92 * h);
    ctx.lineTo(posX + 0.88 * dir * w, y - 0.68 * h);
    ctx.lineTo(posX + 0.52 * dir * w, y - 0.6 * h);
    ctx.lineTo(posX - 0.15 * dir * w, y - 0.7 * h);
    ctx.closePath();
    ctx.fillStyle = furColor;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX + 0.35 * dir * w, y - 0.68 * h);
    ctx.lineTo(posX + 0.85 * dir * w, y - 0.68 * h);
    ctx.lineTo(posX + 0.55 * dir * w, y - 0.58 * h);
    ctx.closePath();
    ctx.fillStyle = whiteFur;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(
      posX + 0.86 * dir * w,
      y - 0.68 * h,
      Math.max(0.1, 0.06 * w),
      Math.max(0.1, 0.06 * w),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = darkEar;
    ctx.fill();

    // Cyan Scouter Headset
    ctx.beginPath();
    ctx.moveTo(posX + 0.15 * dir * w, y - 0.86 * h);
    ctx.lineTo(posX + 0.33 * dir * w, y - 0.86 * h);
    ctx.lineTo(posX + 0.33 * dir * w, y - 0.78 * h);
    ctx.lineTo(posX + 0.15 * dir * w, y - 0.78 * h);
    ctx.closePath();
    ctx.fillStyle = scouterColor;
    ctx.fill();
    ctx.stroke();

    this.drawCharacterStateAuras(
      ctx,
      posX,
      y,
      w,
      h,
      dir,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
    );
    ctx.restore();
  }

  /**
   * 8. YOSHI: Big round green snout, white cheeks & belly, red shell saddle on back, orange boots.
   */
  private drawYoshiPolygons(
    x: number,
    y: number,
    _topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    const { ctx } = this;
    const {
      taunting,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
      isOpponent,
      actionFrameCounter,
    } = state;
    ctx.save();
    const posX =
      inCombo && !taunting
        ? x + (actionFrameCounter % 2 === 0 ? 1.2 : -1.2)
        : x;
    const facingRight = effectiveDir >= 0;
    if (taunting) {
      const spinAngle = actionFrameCounter * 0.125 * (facingRight ? 1 : -1);
      ctx.translate(posX, centerY);
      ctx.rotate(spinAngle);
      ctx.translate(-posX, -centerY);
    }

    let greenColor = resolveColor("#22c55e", isOpponent);
    let whiteColor = resolveColor("#f8fafc", isOpponent);
    let orangeBoot = resolveColor("#f97316", isOpponent);
    let redShell = resolveColor("#ef4444", isOpponent);
    const outlineColor = resolveColor("rgba(0, 0, 0, 0.6)", isOpponent);
    const outlineWidth = 1.2;

    if (taunting) {
      const hue = (actionFrameCounter * 10) % 360;
      greenColor = resolveColor(`hsl(${hue}, 85%, 50%)`, isOpponent);
      orangeBoot = resolveColor(
        `hsl(${(hue + 60) % 360}, 90%, 55%)`,
        isOpponent,
      );
    } else if (isRoll) {
      greenColor = resolveColor("#22c55e", isOpponent, 0.45);
      whiteColor = resolveColor("#f8fafc", isOpponent, 0.45);
      orangeBoot = resolveColor("#f97316", isOpponent, 0.45);
      redShell = resolveColor("#ef4444", isOpponent, 0.45);
    }

    const dir = effectiveDir;
    const w = halfWidth;
    const h = heightPx;

    // Tail & Red Shell (Background)
    ctx.beginPath();
    ctx.moveTo(posX - 0.4 * dir * w, y - 0.3 * h);
    ctx.lineTo(posX - 0.95 * dir * w, y - 0.52 * h);
    ctx.lineTo(posX - 0.45 * dir * w, y - 0.58 * h);
    ctx.closePath();
    ctx.fillStyle = greenColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      posX - 0.48 * dir * w,
      y - 0.62 * h,
      Math.max(0.1, 0.24 * w),
      Math.max(0.1, 0.16 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = redShell;
    ctx.fill();
    ctx.stroke();

    // Orange Boots
    ctx.beginPath();
    ctx.ellipse(
      posX - 0.35 * dir * w,
      y - 0.1 * h,
      Math.max(0.1, 0.28 * w),
      Math.max(0.1, 0.14 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = orangeBoot;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      posX + 0.32 * dir * w,
      y - 0.1 * h,
      Math.max(0.1, 0.32 * w),
      Math.max(0.1, 0.14 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = orangeBoot;
    ctx.fill();
    ctx.stroke();

    // Body & White Belly
    ctx.beginPath();
    ctx.moveTo(posX - 0.4 * dir * w, y - 0.2 * h);
    ctx.lineTo(posX - 0.45 * dir * w, y - 0.65 * h);
    ctx.lineTo(posX + 0.15 * dir * w, y - 0.72 * h);
    ctx.lineTo(posX + 0.42 * dir * w, y - 0.35 * h);
    ctx.lineTo(posX + 0.25 * dir * w, y - 0.2 * h);
    ctx.closePath();
    ctx.fillStyle = greenColor;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX - 0.1 * dir * w, y - 0.25 * h);
    ctx.lineTo(posX + 0.15 * dir * w, y - 0.7 * h);
    ctx.lineTo(posX + 0.4 * dir * w, y - 0.45 * h);
    ctx.lineTo(posX + 0.22 * dir * w, y - 0.22 * h);
    ctx.closePath();
    ctx.fillStyle = whiteColor;
    ctx.fill();

    // Head, Eyes & Big Snout
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.1 * dir * w,
      y - 0.85 * h,
      Math.max(0.1, 0.14 * w),
      Math.max(0.1, 0.18 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = whiteColor;
    ctx.fill();
    ctx.stroke();

    if (Math.abs(dir) > 0.15) {
      ctx.beginPath();
      ctx.ellipse(
        posX + (0.1 + 0.04 * dir) * w,
        y - 0.85 * h,
        Math.max(0.1, 0.05 * w),
        Math.max(0.1, 0.08 * h),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = resolveColor("#18181b", isOpponent);
      ctx.fill();
    }

    // Big Rounded Green Snout
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.52 * dir * w,
      y - 0.72 * h,
      Math.max(0.1, 0.38 * w),
      Math.max(0.1, 0.22 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = greenColor;
    ctx.fill();
    ctx.stroke();

    // Red Spines along neck
    ctx.beginPath();
    ctx.moveTo(posX - 0.2 * dir * w, y - 0.82 * h);
    ctx.lineTo(posX - 0.38 * dir * w, y - 0.88 * h);
    ctx.lineTo(posX - 0.25 * dir * w, y - 0.74 * h);
    ctx.closePath();
    ctx.fillStyle = redShell;
    ctx.fill();

    this.drawCharacterStateAuras(
      ctx,
      posX,
      y,
      w,
      h,
      dir,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
    );
    ctx.restore();
  }

  /**
   * 9. DONKEY KONG: Muscular brown gorilla body, head crest, tan face & chest plate, red "DK" tie.
   */
  private drawDonkeyKongPolygons(
    x: number,
    y: number,
    _topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    const { ctx } = this;
    const {
      taunting,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
      isOpponent,
      actionFrameCounter,
    } = state;
    ctx.save();
    const posX =
      inCombo && !taunting
        ? x + (actionFrameCounter % 2 === 0 ? 1.2 : -1.2)
        : x;
    const facingRight = effectiveDir >= 0;
    if (taunting) {
      const spinAngle = actionFrameCounter * 0.125 * (facingRight ? 1 : -1);
      ctx.translate(posX, centerY);
      ctx.rotate(spinAngle);
      ctx.translate(-posX, -centerY);
    }

    let furColor = resolveColor("#78350f", isOpponent);
    let skinColor = resolveColor("#fed7aa", isOpponent);
    let tieRed = resolveColor("#dc2626", isOpponent);
    let tieYellow = resolveColor("#facc15", isOpponent);
    const outlineColor = resolveColor("rgba(0, 0, 0, 0.6)", isOpponent);
    const outlineWidth = 1.2;

    if (taunting) {
      const hue = (actionFrameCounter * 10) % 360;
      furColor = resolveColor(`hsl(${hue}, 80%, 35%)`, isOpponent);
      tieRed = resolveColor(`hsl(${(hue + 60) % 360}, 90%, 55%)`, isOpponent);
    } else if (isRoll) {
      furColor = resolveColor("#78350f", isOpponent, 0.45);
      skinColor = resolveColor("#fed7aa", isOpponent, 0.45);
      tieRed = resolveColor("#dc2626", isOpponent, 0.45);
      tieYellow = resolveColor("#facc15", isOpponent, 0.45);
    }

    const dir = effectiveDir;
    const w = halfWidth;
    const h = heightPx;

    // Heavy Gorilla Feet & Legs
    ctx.beginPath();
    ctx.ellipse(
      posX - 0.4 * dir * w,
      y - 0.1 * h,
      Math.max(0.1, 0.35 * w),
      Math.max(0.1, 0.15 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = furColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      posX + 0.38 * dir * w,
      y - 0.1 * h,
      Math.max(0.1, 0.38 * w),
      Math.max(0.1, 0.15 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = furColor;
    ctx.fill();
    ctx.stroke();

    // Muscular Torso & Arms
    ctx.beginPath();
    ctx.moveTo(posX - 0.45 * dir * w, y - 0.25 * h);
    ctx.lineTo(posX - 0.55 * dir * w, y - 0.7 * h);
    ctx.lineTo(posX + 0.55 * dir * w, y - 0.7 * h);
    ctx.lineTo(posX + 0.45 * dir * w, y - 0.25 * h);
    ctx.closePath();
    ctx.fillStyle = furColor;
    ctx.fill();
    ctx.stroke();

    // Tan Pectoral Chest Plate
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.12 * dir * w,
      y - 0.55 * h,
      Math.max(0.1, 0.38 * w),
      Math.max(0.1, 0.22 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = skinColor;
    ctx.fill();

    // Red Necktie with "DK" Mark
    ctx.beginPath();
    ctx.moveTo(posX + 0.05 * dir * w, y - 0.68 * h);
    ctx.lineTo(posX + 0.25 * dir * w, y - 0.68 * h);
    ctx.lineTo(posX + 0.32 * dir * w, y - 0.38 * h);
    ctx.lineTo(posX + 0.18 * dir * w, y - 0.32 * h);
    ctx.lineTo(posX + 0.08 * dir * w, y - 0.42 * h);
    ctx.closePath();
    ctx.fillStyle = tieRed;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      posX + 0.2 * dir * w,
      y - 0.48 * h,
      Math.max(0.1, 0.08 * w),
      Math.max(0.1, 0.06 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = tieYellow;
    ctx.fill();

    // Head with Hair Peak & Tan Face
    ctx.beginPath();
    ctx.moveTo(posX - 0.3 * dir * w, y - 0.72 * h);
    ctx.lineTo(posX - 0.35 * dir * w, y - 0.98 * h);
    ctx.lineTo(posX - 0.1 * dir * w, y - 1.15 * h); // Hair peak
    ctx.lineTo(posX + 0.25 * dir * w, y - 0.98 * h);
    ctx.lineTo(posX + 0.42 * dir * w, y - 0.72 * h);
    ctx.closePath();
    ctx.fillStyle = furColor;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      posX + 0.25 * dir * w,
      y - 0.8 * h,
      Math.max(0.1, 0.28 * w),
      Math.max(0.1, 0.16 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = skinColor;
    ctx.fill();
    ctx.stroke();

    this.drawCharacterStateAuras(
      ctx,
      posX,
      y,
      w,
      h,
      dir,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
    );
    ctx.restore();
  }

  /**
   * 10. LINK: Green floppy cap, blonde hair bangs, pointed elf ear, green tunic, Hylian shield on back.
   */
  private drawLinkPolygons(
    x: number,
    y: number,
    _topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    const { ctx } = this;
    const {
      taunting,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
      isOpponent,
      actionFrameCounter,
    } = state;
    ctx.save();
    const posX =
      inCombo && !taunting
        ? x + (actionFrameCounter % 2 === 0 ? 1.2 : -1.2)
        : x;
    const facingRight = effectiveDir >= 0;
    if (taunting) {
      const spinAngle = actionFrameCounter * 0.125 * (facingRight ? 1 : -1);
      ctx.translate(posX, centerY);
      ctx.rotate(spinAngle);
      ctx.translate(-posX, -centerY);
    }

    let tunicGreen = resolveColor("#16a34a", isOpponent);
    let blondeHair = resolveColor("#facc15", isOpponent);
    let skinColor = resolveColor("#fed7aa", isOpponent);
    let leatherBrown = resolveColor("#78350f", isOpponent);
    let shieldBlue = resolveColor("#1e3a8a", isOpponent);
    let shieldSilver = resolveColor("#cbd5e1", isOpponent);
    let whiteColor = resolveColor("#f8fafc", isOpponent);
    const outlineColor = resolveColor("rgba(0, 0, 0, 0.6)", isOpponent);
    const outlineWidth = 1.2;

    if (taunting) {
      const hue = (actionFrameCounter * 10) % 360;
      tunicGreen = resolveColor(`hsl(${hue}, 85%, 45%)`, isOpponent);
      shieldBlue = resolveColor(
        `hsl(${(hue + 180) % 360}, 80%, 45%)`,
        isOpponent,
      );
    } else if (isRoll) {
      tunicGreen = resolveColor("#16a34a", isOpponent, 0.45);
      blondeHair = resolveColor("#facc15", isOpponent, 0.45);
      skinColor = resolveColor("#fed7aa", isOpponent, 0.45);
      leatherBrown = resolveColor("#78350f", isOpponent, 0.45);
      shieldBlue = resolveColor("#1e3a8a", isOpponent, 0.45);
      shieldSilver = resolveColor("#cbd5e1", isOpponent, 0.45);
      whiteColor = resolveColor("#f8fafc", isOpponent, 0.45);
    }

    const dir = effectiveDir;
    const w = halfWidth;
    const h = heightPx;

    // Hylian Shield on Back
    ctx.beginPath();
    ctx.moveTo(posX - 0.25 * dir * w, y - 0.78 * h);
    ctx.lineTo(posX - 0.65 * dir * w, y - 0.78 * h);
    ctx.lineTo(posX - 0.55 * dir * w, y - 0.42 * h);
    ctx.lineTo(posX - 0.22 * dir * w, y - 0.45 * h);
    ctx.closePath();
    ctx.fillStyle = shieldBlue;
    ctx.fill();
    ctx.strokeStyle = shieldSilver;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Floppy Green Cap (Trailing)
    ctx.beginPath();
    ctx.moveTo(posX - 0.15 * dir * w, y - 0.88 * h);
    ctx.lineTo(posX - 0.95 * dir * w, y - 0.85 * h);
    ctx.lineTo(posX - 0.22 * dir * w, y - 1.05 * h);
    ctx.lineTo(posX + 0.25 * dir * w, y - 0.98 * h);
    ctx.closePath();
    ctx.fillStyle = tunicGreen;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    // Legs, Boots, Tights
    ctx.beginPath();
    ctx.moveTo(posX - 0.35 * dir * w, y - 0.42 * h);
    ctx.lineTo(posX + 0.35 * dir * w, y - 0.42 * h);
    ctx.lineTo(posX + 0.35 * dir * w, y - 0.2 * h);
    ctx.lineTo(posX - 0.35 * dir * w, y - 0.2 * h);
    ctx.closePath();
    ctx.fillStyle = whiteColor;
    ctx.fill();
    ctx.stroke();

    // Back boot
    ctx.beginPath();
    ctx.moveTo(posX - 0.4 * dir * w, y - 0.2 * h);
    ctx.lineTo(posX - 0.1 * dir * w, y - 0.2 * h);
    ctx.lineTo(posX - 0.1 * dir * w, y);
    ctx.lineTo(posX - 0.4 * dir * w, y);
    ctx.closePath();
    ctx.fillStyle = leatherBrown;
    ctx.fill();
    ctx.stroke();

    // Front boot
    ctx.beginPath();
    ctx.moveTo(posX + 0.15 * dir * w, y - 0.2 * h);
    ctx.lineTo(posX + 0.47 * dir * w, y - 0.2 * h);
    ctx.lineTo(posX + 0.47 * dir * w, y);
    ctx.lineTo(posX + 0.15 * dir * w, y);
    ctx.closePath();
    ctx.fillStyle = leatherBrown;
    ctx.fill();
    ctx.stroke();

    // Green Tunic Torso & Belt
    ctx.beginPath();
    ctx.moveTo(posX - 0.3 * dir * w, y - 0.75 * h);
    ctx.lineTo(posX + 0.35 * dir * w, y - 0.75 * h);
    ctx.lineTo(posX + 0.45 * dir * w, y - 0.42 * h);
    ctx.lineTo(posX - 0.35 * dir * w, y - 0.42 * h);
    ctx.closePath();
    ctx.fillStyle = tunicGreen;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX - 0.35 * dir * w, y - 0.48 * h);
    ctx.lineTo(posX + 0.38 * dir * w, y - 0.48 * h);
    ctx.lineTo(posX + 0.38 * dir * w, y - 0.42 * h);
    ctx.lineTo(posX - 0.35 * dir * w, y - 0.42 * h);
    ctx.closePath();
    ctx.fillStyle = leatherBrown;
    ctx.fill();

    // Head, Blonde Hair, Pointed Ear
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.15 * dir * w,
      y - 0.78 * h,
      Math.max(0.1, 0.28 * w),
      Math.max(0.1, 0.18 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = skinColor;
    ctx.fill();

    // Pointed Elf Ear
    ctx.beginPath();
    ctx.moveTo(posX - 0.05 * dir * w, y - 0.8 * h);
    ctx.lineTo(posX - 0.35 * dir * w, y - 0.86 * h);
    ctx.lineTo(posX - 0.08 * dir * w, y - 0.74 * h);
    ctx.closePath();
    ctx.fillStyle = skinColor;
    ctx.fill();
    ctx.stroke();

    // Blonde Hair Bangs
    ctx.beginPath();
    ctx.moveTo(posX - 0.05 * dir * w, y - 0.9 * h);
    ctx.lineTo(posX + 0.45 * dir * w, y - 0.88 * h);
    ctx.lineTo(posX + 0.38 * dir * w, y - 0.76 * h);
    ctx.lineTo(posX + 0.12 * dir * w, y - 0.8 * h);
    ctx.closePath();
    ctx.fillStyle = blondeHair;
    ctx.fill();

    this.drawCharacterStateAuras(
      ctx,
      posX,
      y,
      w,
      h,
      dir,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
    );
    ctx.restore();
  }

  /**
   * 11. NESS: Red baseball cap with blue brim, yellow/blue striped shirt, blue shorts, red sneakers, backpack.
   */
  private drawNessPolygons(
    x: number,
    y: number,
    _topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    const { ctx } = this;
    const {
      taunting,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
      isOpponent,
      actionFrameCounter,
    } = state;
    ctx.save();
    const posX =
      inCombo && !taunting
        ? x + (actionFrameCounter % 2 === 0 ? 1.2 : -1.2)
        : x;
    const facingRight = effectiveDir >= 0;
    if (taunting) {
      const spinAngle = actionFrameCounter * 0.125 * (facingRight ? 1 : -1);
      ctx.translate(posX, centerY);
      ctx.rotate(spinAngle);
      ctx.translate(-posX, -centerY);
    }

    let capRed = resolveColor("#dc2626", isOpponent);
    let brimBlue = resolveColor("#2563eb", isOpponent);
    let stripeYellow = resolveColor("#facc15", isOpponent);
    let stripeBlue = resolveColor("#1e3a8a", isOpponent);
    let backpackBrown = resolveColor("#92400e", isOpponent);
    let skinColor = resolveColor("#fed7aa", isOpponent);
    let whiteColor = resolveColor("#f8fafc", isOpponent);
    const outlineColor = resolveColor("rgba(0, 0, 0, 0.6)", isOpponent);
    const outlineWidth = 1.2;

    if (taunting) {
      const hue = (actionFrameCounter * 10) % 360;
      capRed = resolveColor(`hsl(${hue}, 85%, 55%)`, isOpponent);
      stripeYellow = resolveColor(
        `hsl(${(hue + 60) % 360}, 90%, 55%)`,
        isOpponent,
      );
    } else if (isRoll) {
      capRed = resolveColor("#dc2626", isOpponent, 0.45);
      brimBlue = resolveColor("#2563eb", isOpponent, 0.45);
      stripeYellow = resolveColor("#facc15", isOpponent, 0.45);
      stripeBlue = resolveColor("#1e3a8a", isOpponent, 0.45);
      backpackBrown = resolveColor("#92400e", isOpponent, 0.45);
      skinColor = resolveColor("#fed7aa", isOpponent, 0.45);
      whiteColor = resolveColor("#f8fafc", isOpponent, 0.45);
    }

    const dir = effectiveDir;
    const w = halfWidth;
    const h = heightPx;

    // Backpack (Background)
    ctx.beginPath();
    ctx.moveTo(posX - 0.55 * dir * w, y - 0.68 * h);
    ctx.lineTo(posX - 0.27 * dir * w, y - 0.68 * h);
    ctx.lineTo(posX - 0.27 * dir * w, y - 0.36 * h);
    ctx.lineTo(posX - 0.55 * dir * w, y - 0.36 * h);
    ctx.closePath();
    ctx.fillStyle = backpackBrown;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    // Red Sneakers & White Socks
    ctx.beginPath();
    ctx.moveTo(posX - 0.36 * dir * w, y - 0.18 * h);
    ctx.lineTo(posX - 0.14 * dir * w, y - 0.18 * h);
    ctx.lineTo(posX - 0.14 * dir * w, y - 0.1 * h);
    ctx.lineTo(posX - 0.36 * dir * w, y - 0.1 * h);
    ctx.closePath();
    ctx.fillStyle = whiteColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(posX + 0.24 * dir * w, y - 0.18 * h);
    ctx.lineTo(posX + 0.46 * dir * w, y - 0.18 * h);
    ctx.lineTo(posX + 0.46 * dir * w, y - 0.1 * h);
    ctx.lineTo(posX + 0.24 * dir * w, y - 0.1 * h);
    ctx.closePath();
    ctx.fillStyle = whiteColor;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(
      posX - 0.32 * dir * w,
      y - 0.08 * h,
      Math.max(0.1, 0.25 * w),
      Math.max(0.1, 0.12 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = capRed;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      posX + 0.35 * dir * w,
      y - 0.08 * h,
      Math.max(0.1, 0.28 * w),
      Math.max(0.1, 0.12 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = capRed;
    ctx.fill();
    ctx.stroke();

    // Blue Shorts
    ctx.beginPath();
    ctx.moveTo(posX - 0.32 * dir * w, y - 0.38 * h);
    ctx.lineTo(posX + 0.32 * dir * w, y - 0.38 * h);
    ctx.lineTo(posX + 0.32 * dir * w, y - 0.18 * h);
    ctx.lineTo(posX - 0.32 * dir * w, y - 0.18 * h);
    ctx.closePath();
    ctx.fillStyle = stripeBlue;
    ctx.fill();
    ctx.stroke();

    // Striped Shirt Torso
    ctx.beginPath();
    ctx.moveTo(posX - 0.35 * dir * w, y - 0.68 * h);
    ctx.lineTo(posX + 0.35 * dir * w, y - 0.68 * h);
    ctx.lineTo(posX + 0.35 * dir * w, y - 0.38 * h);
    ctx.lineTo(posX - 0.35 * dir * w, y - 0.38 * h);
    ctx.closePath();
    ctx.fillStyle = stripeYellow;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX - 0.35 * dir * w, y - 0.58 * h);
    ctx.lineTo(posX + 0.35 * dir * w, y - 0.58 * h);
    ctx.lineTo(posX + 0.35 * dir * w, y - 0.48 * h);
    ctx.lineTo(posX - 0.35 * dir * w, y - 0.48 * h);
    ctx.closePath();
    ctx.fillStyle = stripeBlue;
    ctx.fill();

    // Head, Face & Baseball Cap
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.12 * dir * w,
      y - 0.78 * h,
      Math.max(0.1, 0.35 * w),
      Math.max(0.1, 0.22 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = skinColor;
    ctx.fill();

    // Eye & Smile
    if (Math.abs(dir) > 0.15) {
      ctx.beginPath();
      ctx.ellipse(
        posX + 0.32 * dir * w,
        y - 0.78 * h,
        Math.max(0.1, 0.06 * w),
        Math.max(0.1, 0.09 * h),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = resolveColor("#18181b", isOpponent);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(
        posX + 0.28 * dir * w,
        y - 0.68 * h,
        Math.max(0.1, 0.08 * w),
        0,
        Math.PI,
      );
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Red Cap Dome & Blue Visor Brim
    ctx.beginPath();
    ctx.moveTo(posX - 0.28 * dir * w, y - 0.82 * h);
    ctx.lineTo(posX - 0.3 * dir * w, y - 1.05 * h);
    ctx.lineTo(posX + 0.15 * dir * w, y - 1.08 * h);
    ctx.lineTo(posX + 0.45 * dir * w, y - 0.94 * h);
    ctx.lineTo(posX + 0.22 * dir * w, y - 0.86 * h);
    ctx.closePath();
    ctx.fillStyle = capRed;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX + 0.18 * dir * w, y - 0.9 * h);
    ctx.lineTo(posX + 0.72 * dir * w, y - 0.86 * h);
    ctx.lineTo(posX + 0.45 * dir * w, y - 0.82 * h);
    ctx.closePath();
    ctx.fillStyle = brimBlue;
    ctx.fill();
    ctx.stroke();

    this.drawCharacterStateAuras(
      ctx,
      posX,
      y,
      w,
      h,
      dir,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
    );
    ctx.restore();
  }

  /**
   * 12. SAMUS: Varia Suit power armor, red/orange helmet with green T-visor, massive yellow sphere pauldrons, arm cannon.
   */
  private drawSamusPolygons(
    x: number,
    y: number,
    _topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    const { ctx } = this;
    const {
      taunting,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
      isOpponent,
      actionFrameCounter,
    } = state;
    ctx.save();
    const posX =
      inCombo && !taunting
        ? x + (actionFrameCounter % 2 === 0 ? 1.2 : -1.2)
        : x;
    const facingRight = effectiveDir >= 0;
    if (taunting) {
      const spinAngle = actionFrameCounter * 0.125 * (facingRight ? 1 : -1);
      ctx.translate(posX, centerY);
      ctx.rotate(spinAngle);
      ctx.translate(-posX, -centerY);
    }

    let armorOrange = resolveColor("#ea580c", isOpponent);
    let armorRed = resolveColor("#c2410c", isOpponent);
    let pauldronYellow = resolveColor("#eab308", isOpponent);
    let visorGreen = resolveColor("#22c55e", isOpponent);
    let cannonGreen = resolveColor("#15803d", isOpponent);
    const outlineColor = resolveColor("rgba(0, 0, 0, 0.6)", isOpponent);
    const outlineWidth = 1.2;

    if (taunting) {
      const hue = (actionFrameCounter * 10) % 360;
      armorOrange = resolveColor(`hsl(${hue}, 90%, 55%)`, isOpponent);
      pauldronYellow = resolveColor(
        `hsl(${(hue + 60) % 360}, 95%, 55%)`,
        isOpponent,
      );
      visorGreen = resolveColor(
        `hsl(${(hue + 180) % 360}, 90%, 55%)`,
        isOpponent,
      );
    } else if (isRoll) {
      armorOrange = resolveColor("#ea580c", isOpponent, 0.45);
      armorRed = resolveColor("#c2410c", isOpponent, 0.45);
      pauldronYellow = resolveColor("#eab308", isOpponent, 0.45);
      visorGreen = resolveColor("#22c55e", isOpponent, 0.45);
      cannonGreen = resolveColor("#15803d", isOpponent, 0.45);
    }

    const dir = effectiveDir;
    const w = halfWidth;
    const h = heightPx;

    // Armored Power Boots & Legs
    ctx.beginPath();
    ctx.moveTo(posX - 0.42 * dir * w, y - 0.22 * h);
    ctx.lineTo(posX - 0.16 * dir * w, y - 0.22 * h);
    ctx.lineTo(posX - 0.16 * dir * w, y);
    ctx.lineTo(posX - 0.42 * dir * w, y);
    ctx.closePath();
    ctx.fillStyle = armorOrange;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(posX + 0.18 * dir * w, y - 0.22 * h);
    ctx.lineTo(posX + 0.5 * dir * w, y - 0.22 * h);
    ctx.lineTo(posX + 0.5 * dir * w, y);
    ctx.lineTo(posX + 0.18 * dir * w, y);
    ctx.closePath();
    ctx.fillStyle = armorOrange;
    ctx.fill();
    ctx.stroke();

    // Red/Orange Leg Armor & Pelvis
    ctx.beginPath();
    ctx.moveTo(posX - 0.32 * dir * w, y - 0.45 * h);
    ctx.lineTo(posX + 0.32 * dir * w, y - 0.45 * h);
    ctx.lineTo(posX + 0.32 * dir * w, y - 0.22 * h);
    ctx.lineTo(posX - 0.32 * dir * w, y - 0.22 * h);
    ctx.closePath();
    ctx.fillStyle = pauldronYellow;
    ctx.fill();
    ctx.stroke();

    // Red Chest Armor Plate
    ctx.beginPath();
    ctx.moveTo(posX - 0.32 * dir * w, y - 0.75 * h);
    ctx.lineTo(posX + 0.38 * dir * w, y - 0.75 * h);
    ctx.lineTo(posX + 0.28 * dir * w, y - 0.45 * h);
    ctx.lineTo(posX - 0.28 * dir * w, y - 0.45 * h);
    ctx.closePath();
    ctx.fillStyle = armorRed;
    ctx.fill();
    ctx.stroke();

    // Green Chest Gem
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.08 * dir * w,
      y - 0.62 * h,
      Math.max(0.1, 0.09 * w),
      Math.max(0.1, 0.09 * w),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = visorGreen;
    ctx.fill();

    // Back Pauldron
    ctx.beginPath();
    ctx.ellipse(
      posX - 0.35 * dir * w,
      y - 0.75 * h,
      Math.max(0.1, 0.26 * w),
      Math.max(0.1, 0.26 * w),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = pauldronYellow;
    ctx.fill();
    ctx.stroke();

    // Helmet & Glowing Green T-Visor
    ctx.beginPath();
    ctx.moveTo(posX - 0.18 * dir * w, y - 0.78 * h);
    ctx.lineTo(posX - 0.22 * dir * w, y - 0.98 * h);
    ctx.lineTo(posX + 0.1 * dir * w, y - 1.05 * h);
    ctx.lineTo(posX + 0.38 * dir * w, y - 0.92 * h);
    ctx.lineTo(posX + 0.25 * dir * w, y - 0.76 * h);
    ctx.closePath();
    ctx.fillStyle = armorRed;
    ctx.fill();
    ctx.stroke();

    // Green T-Visor
    if (Math.abs(dir) > 0.15) {
      ctx.beginPath();
      ctx.moveTo(posX + 0.12 * dir * w, y - 0.9 * h);
      ctx.lineTo(posX + 0.35 * dir * w, y - 0.9 * h);
      ctx.lineTo(posX + 0.28 * dir * w, y - 0.82 * h);
      ctx.lineTo(posX + 0.2 * dir * w, y - 0.82 * h);
      ctx.closePath();
      ctx.fillStyle = visorGreen;
      ctx.fill();
      ctx.stroke();
    }

    // Massive Front Shoulder Pauldron
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.32 * dir * w,
      y - 0.75 * h,
      Math.max(0.1, 0.32 * w),
      Math.max(0.1, 0.32 * w),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = pauldronYellow;
    ctx.fill();
    ctx.stroke();

    // Green Arm Cannon
    ctx.beginPath();
    ctx.moveTo(posX + 0.42 * dir * w, y - 0.65 * h);
    ctx.lineTo(posX + 0.92 * dir * w, y - 0.52 * h);
    ctx.lineTo(posX + 0.82 * dir * w, y - 0.38 * h);
    ctx.lineTo(posX + 0.38 * dir * w, y - 0.48 * h);
    ctx.closePath();
    ctx.fillStyle = cannonGreen;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      posX + 0.87 * dir * w,
      y - 0.45 * h,
      Math.max(0.1, 0.08 * w),
      Math.max(0.1, 0.12 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = visorGreen;
    ctx.fill();

    this.drawCharacterStateAuras(
      ctx,
      posX,
      y,
      w,
      h,
      dir,
      inCombo,
      isRoll,
      isInvulnerable,
      isSpecial,
      isLanding,
    );
    ctx.restore();
  }

  /**
   * Helper to draw combo hitstun, roll invulnerability, and landing energy outlines consistently.
   */
  private drawCharacterStateAuras(
    ctx: CanvasRenderingContext2D,
    posX: number,
    y: number,
    w: number,
    h: number,
    dir: number,
    inCombo: boolean,
    isRoll: boolean,
    isInvulnerable: boolean,
    isSpecial: boolean,
    isLanding: boolean,
  ): void {
    if (inCombo) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 60, 40, 0.95)";
      ctx.lineWidth = 5.0; // 2x thicker for high legibility during spins & tumble
      ctx.shadowColor = "rgba(255, 120, 0, 0.85)";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(
        posX,
        y - 0.5 * h,
        Math.max(0.1, 0.8 * w),
        Math.max(0.1, 0.5 * h),
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();

      // Bright inner core highlight for extra legibility
      ctx.beginPath();
      ctx.ellipse(
        posX,
        y - 0.5 * h,
        Math.max(0.1, 0.8 * w),
        Math.max(0.1, 0.5 * h),
        0,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = "rgba(255, 220, 180, 0.9)";
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();
    } else if (isRoll) {
      ctx.save();
      ctx.strokeStyle = isInvulnerable
        ? "rgba(220, 235, 255, 0.95)"
        : "rgba(190, 205, 225, 0.95)";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = isInvulnerable
        ? "rgba(180, 215, 255, 0.85)"
        : "rgba(170, 195, 230, 0.7)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(
        posX,
        y - 0.5 * h,
        Math.max(0.1, 0.8 * w),
        Math.max(0.1, 0.5 * h),
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.restore();
    } else if (isSpecial || isLanding) {
      ctx.save();
      ctx.strokeStyle = "rgba(190, 205, 225, 0.95)";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "rgba(170, 195, 230, 0.7)";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.ellipse(
        posX,
        y - 0.5 * h,
        Math.max(0.1, 0.8 * w),
        Math.max(0.1, 0.5 * h),
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawAttackArc(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    color: string,
    attack: AttackInfo,
    joystick?: { x: number; y: number } | null,
    canAngle?: boolean,
  ): void {
    const { ctx } = this;
    const baseRadius = Math.max(halfWidth, heightPx * 0.5);

    if (attack.type === "aerial" && attack.direction === "neutral") {
      // Nair: 360-degree sleek aerodynamic ring matching tilt stroke weight
      const radius = baseRadius * 1.55;

      ctx.beginPath();
      ctx.arc(x, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      return;
    }

    let centerAngle: number;
    if (attack.direction === "up") {
      centerAngle = -Math.PI / 2;
    } else if (attack.direction === "down") {
      centerAngle = Math.PI / 2;
    } else if (attack.direction === "back") {
      centerAngle = facingRight ? Math.PI : 0;
    } else {
      // forward
      centerAngle = facingRight ? 0 : Math.PI;
    }

    if (attack.type === "jab") {
      // Jab: small punching boxing glove appearing right in front of the character
      ctx.save();
      const dir = facingRight ? 1 : -1;
      const noseX = x + dir * halfWidth;
      const gloveW = Math.max(8, halfWidth * 0.52);
      const gloveH = Math.max(8, heightPx * 0.24);
      const gloveX = noseX + dir * Math.max(3, halfWidth * 0.18);
      const gloveY = centerY - heightPx * 0.05;

      // 1. Motion thrust speed lines behind the glove
      ctx.beginPath();
      ctx.moveTo(gloveX - dir * (gloveW * 0.5), gloveY - gloveH * 0.35);
      ctx.lineTo(gloveX - dir * (gloveW * 0.95), gloveY - gloveH * 0.35);
      ctx.moveTo(gloveX - dir * (gloveW * 0.5), gloveY + gloveH * 0.35);
      ctx.lineTo(gloveX - dir * (gloveW * 0.95), gloveY + gloveH * 0.35);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.stroke();

      // 2. White wrist cuff band
      ctx.beginPath();
      ctx.ellipse(
        gloveX - dir * (gloveW * 0.42),
        gloveY,
        Math.max(0.1, gloveW * 0.22),
        Math.max(0.1, gloveH * 0.42),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = "rgba(240, 245, 255, 0.95)";
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 3. Main boxing glove fist / mitten body
      ctx.beginPath();
      ctx.ellipse(
        gloveX + dir * (gloveW * 0.12),
        gloveY,
        Math.max(0.1, gloveW * 0.52),
        Math.max(0.1, gloveH * 0.48),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 4. Thumb folded on upper-front
      ctx.beginPath();
      ctx.ellipse(
        gloveX + dir * (gloveW * 0.18),
        gloveY - gloveH * 0.32,
        Math.max(0.1, gloveW * 0.28),
        Math.max(0.1, gloveH * 0.22),
        dir * 0.35,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = color;
      ctx.fill();
      ctx.stroke();

      // 5. Knuckle shine highlight
      ctx.beginPath();
      ctx.arc(
        gloveX + dir * (gloveW * 0.35),
        gloveY - gloveH * 0.15,
        Math.max(0.1, gloveH * 0.18),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.fill();

      ctx.restore();
      return;
    }

    if (attack.type === "grab") {
      // Grab attempt: open rectangular clamping jaws with dashed capture field
      const dir = facingRight ? 1 : -1;
      const noseX = x + dir * halfWidth;
      const reachLen = halfWidth * 1.35;
      const frontX = noseX + dir * reachLen;
      const boxTop = centerY - heightPx * 0.38;
      const boxBot = centerY + heightPx * 0.38;
      const toothLen = heightPx * 0.18;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.8;
      ctx.lineCap = "round";

      // Top reaching arm + downward claw tooth
      ctx.beginPath();
      ctx.moveTo(noseX, boxTop);
      ctx.lineTo(frontX, boxTop);
      ctx.lineTo(frontX, boxTop + toothLen);
      ctx.stroke();

      // Bottom reaching arm + upward claw tooth
      ctx.beginPath();
      ctx.moveTo(noseX, boxBot);
      ctx.lineTo(frontX, boxBot);
      ctx.lineTo(frontX, boxBot - toothLen);
      ctx.stroke();

      // White highlight on claws
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(noseX + dir * 2, boxTop);
      ctx.lineTo(frontX, boxTop);
      ctx.lineTo(frontX, boxTop + toothLen);
      ctx.moveTo(noseX + dir * 2, boxBot);
      ctx.lineTo(frontX, boxBot);
      ctx.lineTo(frontX, boxBot - toothLen);
      ctx.stroke();

      // Dashed capture field line between the claw teeth
      ctx.beginPath();
      ctx.moveTo(frontX, boxTop + toothLen + 2);
      ctx.lineTo(frontX, boxBot - toothLen - 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
      return;
    }

    // Determine stick tilt if this attack is angleable (e.g. Fox/Falcon/Samus tilt, Falcon/Samus smash)
    const rawStickY = joystick?.y ?? 0;
    const hasStickAngle = Boolean(
      canAngle && attack.direction === "forward" && Math.abs(rawStickY) > 8,
    );
    const tiltFactor = hasStickAngle
      ? Math.max(-1, Math.min(1, rawStickY / 45))
      : 0;
    // In screen coords, +Y is DOWN so stick UP (+Y) rotates counter-clockwise (-angle when facing right)
    const angleShift =
      (facingRight ? -1 : 1) * tiltFactor * ((18 * Math.PI) / 180);
    const effectiveCenter = centerAngle + angleShift;

    if (attack.type === "tilt" || attack.type === "aerial") {
      // Tilts and directional aerials: sleek, sharp aerodynamic single slash arc
      const radius = baseRadius * 1.55;
      const span = (75 * Math.PI) / 180;
      const startAngle = effectiveCenter - span / 2;
      const endAngle = effectiveCenter + span / 2;

      // Outer slash arc in player's color
      ctx.beginPath();
      ctx.arc(x, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.stroke();

      if (hasStickAngle) {
        // Angled direction is significantly brighter in the direction of the joystick
        const highlightAngle =
          effectiveCenter +
          (facingRight ? -1 : 1) * (tiltFactor * (span * 0.28));
        const hx = x + Math.cos(highlightAngle) * radius;
        const hy = centerY + Math.sin(highlightAngle) * radius;

        ctx.save();
        // 1. Radiant luminous glow flare centered on stick direction
        const flareGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 20);
        flareGrad.addColorStop(0, "rgba(255, 255, 255, 0.98)");
        flareGrad.addColorStop(0.35, hexToRgba(color, 0.9));
        flareGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = flareGrad;
        ctx.beginPath();
        ctx.arc(hx, hy, 20, 0, Math.PI * 2);
        ctx.fill();

        // 2. Overlaid bright white-hot arc segment along the angled section
        const hSpan = span * 0.5;
        ctx.beginPath();
        ctx.arc(
          x,
          centerY,
          radius,
          highlightAngle - hSpan / 2,
          highlightAngle + hSpan / 2,
        );
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4.2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.restore();
      } else {
        // Inner white highlight core
        ctx.beginPath();
        ctx.arc(x, centerY, radius, startAngle + 0.08, endAngle - 0.08);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    } else {
      // Smash attack: significantly larger, glowing, heavier dual-layer energy crescent
      const radiusOuter = baseRadius * 2.2;
      const radiusInner = baseRadius * 1.45;
      const span = (105 * Math.PI) / 180;
      const startAngle = effectiveCenter - span / 2;
      const endAngle = effectiveCenter + span / 2;

      // 1. Translucent energy wedge fill
      ctx.beginPath();
      ctx.arc(x, centerY, radiusOuter, startAngle, endAngle);
      ctx.arc(x, centerY, radiusInner, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = hexToRgba(color, 0.22);
      ctx.fill();

      // 2. Heavy outer glowing impact blade
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, centerY, radiusOuter, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 5.5;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();

      if (hasStickAngle) {
        // Angled direction is significantly brighter on the outer blade
        const highlightAngle =
          effectiveCenter +
          (facingRight ? -1 : 1) * (tiltFactor * (span * 0.28));
        const hx = x + Math.cos(highlightAngle) * radiusOuter;
        const hy = centerY + Math.sin(highlightAngle) * radiusOuter;

        ctx.save();
        const flareGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 24);
        flareGrad.addColorStop(0, "rgba(255, 255, 255, 0.98)");
        flareGrad.addColorStop(0.35, hexToRgba(color, 0.95));
        flareGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = flareGrad;
        ctx.beginPath();
        ctx.arc(hx, hy, 24, 0, Math.PI * 2);
        ctx.fill();

        // Intense white-hot blade overlay on that side
        const hSpan = span * 0.5;
        ctx.beginPath();
        ctx.arc(
          x,
          centerY,
          radiusOuter,
          highlightAngle - hSpan / 2,
          highlightAngle + hSpan / 2,
        );
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 6.5;
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 16;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.restore();
      } else {
        // 3. Bright intense white energy core
        ctx.beginPath();
        ctx.arc(x, centerY, radiusOuter, startAngle + 0.1, endAngle - 0.1);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      // 4. Trailing inner speed line
      ctx.beginPath();
      ctx.arc(x, centerY, radiusInner, startAngle + 0.15, endAngle - 0.15);
      ctx.strokeStyle = hexToRgba(color, 0.65);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }

  /**
   * Visualizes Captain Falcon's signature special moves:
   * - Falcon Punch (Neutral-B): Glowing fiery energy windup & massive forward flame strike cone.
   * - Falcon Dive (Up-B): Upward-angled grab reach jaws, explosive grab catch, and blast release.
   * - Falcon Kick (Down-B): Flaming thrust trail and glowing nose flame tip.
   */
  private drawFalconSpecial(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    _color: string,
    specialType: FalconSpecialType,
    frameCounter: number,
  ): void {
    const { ctx } = this;
    const dir = facingRight ? 1 : -1;
    const noseX = x + dir * halfWidth;

    if (specialType === "punch") {
      const isCharging = frameCounter < 50;
      ctx.save();
      if (isCharging) {
        // Windup/charge: intense pulsing fiery energy spark condensing at fist/nose
        const pulse = 1 + 0.25 * Math.sin(frameCounter * 0.35);
        const radius = Math.max(8, halfWidth * 0.45) * pulse;

        // 1. Outer flame aura
        ctx.beginPath();
        ctx.arc(noseX + dir * 4, centerY, radius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 69, 0, 0.35)";
        ctx.shadowColor = "#ff4500";
        ctx.shadowBlur = 12;
        ctx.fill();

        // 2. Core flame spark
        ctx.beginPath();
        ctx.arc(noseX + dir * 4, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffaa00";
        ctx.fill();

        // 3. Electric white center
        ctx.beginPath();
        ctx.arc(noseX + dir * 4, centerY, radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      } else {
        // Punch release: massive fiery falcon strike cone projecting forward
        const punchLen = halfWidth * 1.75;
        const tipX = noseX + dir * punchLen;
        const wingSpan = heightPx * 0.65;

        // 1. Radiant fiery falcon beak fill
        ctx.beginPath();
        ctx.moveTo(noseX, centerY - wingSpan * 0.7);
        ctx.quadraticCurveTo(
          noseX + dir * punchLen * 0.5,
          centerY - wingSpan,
          tipX,
          centerY,
        );
        ctx.quadraticCurveTo(
          noseX + dir * punchLen * 0.5,
          centerY + wingSpan,
          noseX,
          centerY + wingSpan * 0.7,
        );
        ctx.closePath();
        ctx.fillStyle = "rgba(255, 69, 0, 0.4)";
        ctx.shadowColor = "#ff4500";
        ctx.shadowBlur = 14;
        ctx.fill();

        // 2. Flaming outer stroke
        ctx.strokeStyle = "#ffaa00";
        ctx.lineWidth = 3;
        ctx.stroke();

        // 3. Bright white central piercing thrust beam
        ctx.beginPath();
        ctx.moveTo(noseX, centerY);
        ctx.lineTo(tipX + dir * 6, centerY);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (specialType === "dive_reach") {
      // Falcon Dive Up-B Reach: upward-angled (45 deg) grabbing jaws
      const reachLen = halfWidth * 1.45;
      const reachX = noseX + dir * reachLen * 0.75;
      const reachY = centerY - heightPx * 0.55;
      const toothLen = heightPx * 0.2;

      ctx.save();
      ctx.strokeStyle = "#ff6600";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.shadowColor = "#ff6600";
      ctx.shadowBlur = 8;

      // Top claw arm
      ctx.beginPath();
      ctx.moveTo(noseX, centerY - heightPx * 0.2);
      ctx.lineTo(reachX, reachY);
      ctx.lineTo(reachX - dir * toothLen * 0.5, reachY + toothLen);
      ctx.stroke();

      // Bottom claw arm
      ctx.beginPath();
      ctx.moveTo(noseX, centerY + heightPx * 0.1);
      ctx.lineTo(reachX, reachY + heightPx * 0.35);
      ctx.lineTo(
        reachX - dir * toothLen * 0.5,
        reachY + heightPx * 0.35 - toothLen,
      );
      ctx.stroke();

      // White inner claw highlights
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Dashed capture field line between the claw teeth
      ctx.beginPath();
      ctx.moveTo(reachX - dir * toothLen * 0.5, reachY + toothLen + 2);
      ctx.lineTo(
        reachX - dir * toothLen * 0.5,
        reachY + heightPx * 0.35 - toothLen - 2,
      );
      ctx.strokeStyle = "rgba(255, 220, 100, 0.95)";
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
      return;
    }

    if (specialType === "dive_catch") {
      // Falcon Dive Catch: explosive grab lock burst at contact point
      ctx.save();
      const burstX = noseX + dir * halfWidth * 0.5;
      const burstRadius = 14;

      ctx.beginPath();
      ctx.arc(burstX, centerY, burstRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 180, 0, 0.4)";
      ctx.shadowColor = "#ffbb00";
      ctx.shadowBlur = 10;
      ctx.fill();

      // 4 radial spark spikes
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(burstX - 18, centerY);
      ctx.lineTo(burstX + 18, centerY);
      ctx.moveTo(burstX, centerY - 18);
      ctx.lineTo(burstX, centerY + 18);
      ctx.stroke();

      ctx.restore();
      return;
    }

    if (specialType === "dive_explosion") {
      // Falcon Dive Detachment Detonation: punchy forward fiery explosion at contact point
      ctx.save();
      // Center the blast in front of Falcon's chest where the victim was grabbed & launched
      const blastX = x + dir * halfWidth * 0.7;
      const blastY = centerY - heightPx * 0.1;

      const baseRadius = Math.max(halfWidth * 0.75, heightPx * 0.35);
      const frameProgress = Math.min(1, (frameCounter + 1) / 8);
      const radius = baseRadius * (0.75 + 0.35 * frameProgress);

      // 1. Fiery explosion glow aura
      const grad = ctx.createRadialGradient(
        blastX,
        blastY,
        radius * 0.1,
        blastX,
        blastY,
        radius,
      );
      grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      grad.addColorStop(0.25, "rgba(255, 220, 50, 0.85)");
      grad.addColorStop(0.6, "rgba(255, 80, 0, 0.65)");
      grad.addColorStop(1, "rgba(220, 20, 0, 0)");

      ctx.beginPath();
      ctx.arc(blastX, blastY, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.shadowColor = "#ff4500";
      ctx.shadowBlur = 10;
      ctx.fill();

      // 2. Starburst flame spikes radiating from blast center
      const spikeCount = 8;
      const innerR = radius * 0.45;
      const outerR = radius * 1.2;
      ctx.beginPath();
      for (let i = 0; i < spikeCount * 2; i++) {
        const angle = (i * Math.PI) / spikeCount + frameCounter * 0.1;
        const r = i % 2 === 0 ? outerR : innerR;
        const px = blastX + Math.cos(angle) * r;
        const py = blastY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 200, 40, 0.75)";
      ctx.strokeStyle = "rgba(255, 80, 0, 0.9)";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // 3. Shockwave ring expanding outward
      ctx.beginPath();
      ctx.arc(blastX, blastY, radius * 1.15, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#ffea00";
      ctx.shadowBlur = 8;
      ctx.stroke();

      // 4. Intense white core flash
      ctx.beginPath();
      ctx.arc(blastX, blastY, radius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 10;
      ctx.fill();

      ctx.restore();
      return;
    }

    if (specialType === "kick") {
      // Falcon Kick Down-B: flaming speed trail + glowing nose flame
      ctx.save();
      const trailLen = halfWidth * 1.6;
      const backX = x - dir * halfWidth;

      // 1. Trailing speed flames behind the triangle
      ctx.beginPath();
      ctx.moveTo(backX, centerY - heightPx * 0.35);
      ctx.lineTo(backX - dir * trailLen, centerY - heightPx * 0.2);
      ctx.moveTo(backX, centerY);
      ctx.lineTo(backX - dir * (trailLen * 1.2), centerY);
      ctx.moveTo(backX, centerY + heightPx * 0.35);
      ctx.lineTo(backX - dir * trailLen, centerY + heightPx * 0.2);
      ctx.strokeStyle = "rgba(255, 100, 0, 0.85)";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.shadowColor = "#ff4500";
      ctx.shadowBlur = 8;
      ctx.stroke();

      // 2. Fiery thrust tip on nose
      ctx.beginPath();
      ctx.arc(noseX, centerY, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ff5500";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(noseX, centerY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.restore();
      return;
    }

    if (specialType === "kick_end") {
      // Lingering flame particles on slide/wall hit
      ctx.save();
      ctx.beginPath();
      ctx.arc(noseX, centerY, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 120, 0, 0.5)";
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Visualizes Pikachu's signature special moves:
   * - Thunder (Down-B): Lightning bolt descending from the sky (infinite height, Y=0) down to Pikachu with electric shock halo.
   * - Quick Attack (Up-B): Straight-line high-speed electric motion trails and nose spark.
   */
  private drawPikachuSpecial(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    _color: string,
    specialType: PikachuSpecialType,
    frameCounter: number,
  ): void {
    const { ctx } = this;
    const dir = facingRight ? 1 : -1;
    const noseX = x + dir * halfWidth;

    if (specialType === "thunder_jolt") {
      ctx.save();
      // Neutral-B: Thunder Jolt electric spark sphere condensing and discharging forward
      const pulse = 1 + 0.3 * Math.sin(frameCounter * 0.5);
      const sparkRadius = Math.max(6, halfWidth * 0.45) * pulse;
      const sparkX = noseX + dir * 6;

      // 1. Expanding electric shock ring
      const ringProg = (frameCounter % 15) / 15;
      ctx.beginPath();
      ctx.arc(
        sparkX + dir * (ringProg * 14),
        centerY,
        4 + ringProg * 10,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = resolveColor("#38bdf8", false, (1 - ringProg) * 0.85);
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 8;
      ctx.stroke();

      // 2. Electric blue-yellow core spark
      ctx.beginPath();
      ctx.arc(sparkX, centerY, sparkRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
      ctx.shadowColor = "#facc15";
      ctx.shadowBlur = 10;
      ctx.fill();

      // 3. 4 Branching zig-zag lightning sparks
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = "#fef08a";
      for (let i = 0; i < 4; i++) {
        const sAngle = (i * Math.PI) / 2 + frameCounter * 0.4;
        const midX =
          sparkX +
          Math.cos(sAngle) * (sparkRadius * 0.8) +
          (i % 2 === 0 ? 2 : -2);
        const midY =
          centerY +
          Math.sin(sAngle) * (sparkRadius * 0.8) +
          (i % 2 === 0 ? -2 : 2);
        const endX = sparkX + Math.cos(sAngle) * (sparkRadius * 1.6);
        const endY = centerY + Math.sin(sAngle) * (sparkRadius * 1.6);
        ctx.beginPath();
        ctx.moveTo(sparkX, centerY);
        ctx.lineTo(midX, midY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }

      ctx.restore();
      return;
    }

    if (specialType === "thunder") {
      ctx.save();
      // 1. Full-height lightning bolt coming down from sky (Y=0) straight to Pikachu (centerY)
      const boltStartY = 0;
      const boltEndY = centerY - heightPx * 0.2;
      const totalHeight = Math.max(20, boltEndY - boltStartY);
      const segments = 8;
      const segH = totalHeight / segments;

      // Seeded zigzag offsets based on frame counter to animate lightning jitter
      const seed = frameCounter * 7.3;
      ctx.beginPath();
      ctx.moveTo(x, boltStartY);
      for (let i = 1; i < segments; i++) {
        const jitter = Math.sin(seed + i * 2.4) * (halfWidth * 0.85);
        ctx.lineTo(x + jitter, boltStartY + i * segH);
      }
      ctx.lineTo(x, boltEndY);

      // Outer electric yellow aura
      ctx.strokeStyle = "rgba(255, 215, 0, 0.6)";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 14;
      ctx.stroke();

      // Bright yellow energy mid-stroke
      ctx.beginPath();
      ctx.moveTo(x, boltStartY);
      for (let i = 1; i < segments; i++) {
        const jitter = Math.sin(seed + i * 2.4) * (halfWidth * 0.85);
        ctx.lineTo(x + jitter, boltStartY + i * segH);
      }
      ctx.lineTo(x, boltEndY);
      ctx.strokeStyle = "#ffe600";
      ctx.lineWidth = 2.8;
      ctx.stroke();

      // Crisp white central lightning core
      ctx.beginPath();
      ctx.moveTo(x, boltStartY);
      for (let i = 1; i < segments; i++) {
        const jitter = Math.sin(seed + i * 2.4) * (halfWidth * 0.85);
        ctx.lineTo(x + jitter, boltStartY + i * segH);
      }
      ctx.lineTo(x, boltEndY);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // 2. Electric shockwave impact halo around Pikachu
      const haloRadius = Math.max(14, halfWidth * 1.2);
      ctx.beginPath();
      ctx.arc(x, centerY, haloRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 14;
      ctx.fill();

      // Radiating electric spark ring
      ctx.beginPath();
      ctx.arc(x, centerY, haloRadius * 1.2, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffe600";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
      return;
    }

    if (specialType === "quick_attack_zip") {
      ctx.save();
      // Electric tip flare on nose and glowing electric spark halo around Pikachu
      ctx.beginPath();
      ctx.arc(noseX, centerY, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe600";
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 10;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(noseX, centerY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // Electric spark aura around triangle
      ctx.beginPath();
      ctx.arc(x, centerY, Math.max(10, halfWidth * 0.9), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 230, 0, 0.85)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
      return;
    }

    if (specialType === "quick_attack") {
      // Startup/landing electric spark gathered at nose
      ctx.save();
      ctx.beginPath();
      ctx.arc(noseX, centerY, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe600";
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Visualizes Yoshi's signature special moves:
   * - Egg Lay (Neutral-B): Long pink/red elastic tongue extending from snout with sticky bulb tip.
   * - Yoshi Bomb / Hip Drop (Down-B): Downward star-butt plummet and ground impact shockwave stars.
   * - Egg Throw (Up-B): Egg aiming trajectory arc.
   */
  private drawYoshiSpecial(
    x: number,
    y: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    _color: string,
    specialType: YoshiSpecialType,
    frameCounter: number,
  ): void {
    const { ctx } = this;
    const dir = facingRight ? 1 : -1;
    const noseX = x + dir * (halfWidth * 0.7);
    const noseY = centerY - heightPx * 0.05;

    if (specialType === "egg_lay_tongue") {
      ctx.save();
      // Elastic tongue shoot / reach curve
      const reachProgress = Math.sin(Math.min(frameCounter / 16, 1) * Math.PI);
      const maxReach = halfWidth * 3.4;
      const tongueLen = Math.max(4, reachProgress * maxReach);
      const tipX = noseX + dir * tongueLen;
      const tipY = noseY + Math.sin(frameCounter * 0.2) * 3;

      // 1. Elastic tongue path
      ctx.beginPath();
      ctx.moveTo(noseX, noseY);
      ctx.quadraticCurveTo(
        noseX + dir * (tongueLen * 0.5),
        noseY - 4,
        tipX,
        tipY,
      );
      ctx.strokeStyle = "#f43f5e"; // Vivid rose-red tongue
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.shadowColor = "#e11d48";
      ctx.shadowBlur = 6;
      ctx.stroke();

      // Inner lighter pink stripe
      ctx.beginPath();
      ctx.moveTo(noseX, noseY);
      ctx.quadraticCurveTo(
        noseX + dir * (tongueLen * 0.5),
        noseY - 4,
        tipX,
        tipY,
      );
      ctx.strokeStyle = "#fda4af";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // 2. Rounded sticky bulb tip at tongue end
      ctx.beginPath();
      ctx.arc(tipX, tipY, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#f43f5e";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tipX - dir * 1, tipY - 1, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.restore();
      return;
    }

    if (
      specialType === "yoshi_bomb_start" ||
      specialType === "yoshi_bomb_plummet"
    ) {
      ctx.save();
      // Downward plummet trail and star aura
      const trailH = heightPx * 1.2;
      ctx.beginPath();
      ctx.moveTo(x - halfWidth * 0.6, centerY - trailH);
      ctx.lineTo(x - halfWidth * 0.3, centerY);
      ctx.moveTo(x + halfWidth * 0.6, centerY - trailH);
      ctx.lineTo(x + halfWidth * 0.3, centerY);
      ctx.strokeStyle = "rgba(251, 191, 36, 0.8)";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 8;
      ctx.stroke();

      // Plummet star icon
      const starR = 7;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 === 0 ? starR : starR * 0.45;
        const angle = (i * Math.PI) / 4 + frameCounter * 0.15;
        const sx = x + Math.cos(angle) * r;
        const sy = y + 4 + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fillStyle = "#facc15";
      ctx.fill();
      ctx.restore();
      return;
    }

    if (specialType === "yoshi_bomb_land") {
      ctx.save();
      const progress = Math.min(frameCounter / 18, 1);
      const alpha = 1 - progress;
      if (alpha <= 0) {
        ctx.restore();
        return;
      }

      // Ground impact dust shockwave
      const shockR = halfWidth * 1.6 + progress * 32;
      ctx.beginPath();
      ctx.ellipse(x, y, shockR, 5 + progress * 4, 0, 0, Math.PI * 2);
      ctx.strokeStyle = resolveColor("#f59e0b", false, alpha * 0.9);
      ctx.lineWidth = 2.2;
      ctx.shadowColor = "#d97706";
      ctx.shadowBlur = 8;
      ctx.stroke();

      // 2 Giant Yoshi Bomb stars shooting outward left and right across the floor
      const starDist = progress * 38;
      for (const sDir of [-1, 1]) {
        const starX = x + sDir * (halfWidth * 0.8 + starDist);
        const starY = y - 4;
        const starR = Math.max(2, (1 - progress * 0.5) * 8);

        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 === 0 ? starR : starR * 0.4;
          const angle = (i * Math.PI) / 4 + sDir * progress * 4;
          const px = starX + Math.cos(angle) * r;
          const py = starY + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = resolveColor("#facc15", false, alpha);
        ctx.shadowColor = "#f59e0b";
        ctx.shadowBlur = 6;
        ctx.fill();
      }

      ctx.restore();
      return;
    }

    if (specialType === "egg_throw") {
      ctx.save();
      // Egg Throw: Yoshi tossing a green-spotted egg upward in flight
      const throwProgress = Math.min(frameCounter / 18, 1);
      const arcX = noseX + dir * (throwProgress * halfWidth * 2.2);
      const arcY =
        centerY -
        heightPx * 0.4 -
        Math.sin(throwProgress * Math.PI) * (heightPx * 0.85);

      // Trajectory dashed arc
      ctx.beginPath();
      ctx.moveTo(noseX, centerY);
      ctx.quadraticCurveTo(
        noseX + dir * halfWidth,
        centerY - heightPx * 1.1,
        noseX + dir * (halfWidth * 2.2),
        centerY - heightPx * 0.4,
      );
      ctx.strokeStyle = "rgba(74, 222, 128, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Egg body (white oval)
      ctx.beginPath();
      ctx.ellipse(arcX, arcY, 6, 8, dir * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#4ade80";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Green spots on egg
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(arcX, arcY - 2, 2.2, 0, Math.PI * 2);
      ctx.arc(arcX - 2, arcY + 2, 1.8, 0, Math.PI * 2);
      ctx.arc(arcX + 2, arcY + 3, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }
  }

  /**
   * Visualizes Mario / Luigi special moves:
   * - Fireball (Neutral-B): Flame fireball projectile bouncing forward (Red for Mario, Emerald for Luigi).
   * - Super Jump Punch (Up-B): Uppercut flight with scattering spinning gold coins and Luigi sweetspot burst.
   * - Mario Tornado / Luigi Cyclone (Down-B): Whirling multi-tier cyclone discs.
   */
  private drawMarioSpecial(
    x: number,
    y: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    isLuigi: boolean,
    specialType: MarioSpecialType,
    frameCounter: number,
  ): void {
    const { ctx } = this;
    const dir = facingRight ? 1 : -1;
    const noseX = x + dir * halfWidth;

    if (specialType === "fireball") {
      ctx.save();
      const fbProg = (frameCounter % 20) / 20;
      const fbX = noseX + dir * (10 + fbProg * halfWidth * 2.5);
      const bounceY =
        centerY +
        Math.abs(Math.sin(fbProg * Math.PI * 2)) * (heightPx * 0.35) -
        4;
      const fbRadius = Math.max(5, halfWidth * 0.35);

      // Fireball outer flame aura
      ctx.beginPath();
      ctx.arc(fbX, bounceY, fbRadius * 1.3, 0, Math.PI * 2);
      ctx.fillStyle = isLuigi
        ? "rgba(34, 197, 94, 0.45)"
        : "rgba(239, 68, 68, 0.45)";
      ctx.shadowColor = isLuigi ? "#22c55e" : "#ef4444";
      ctx.shadowBlur = 12;
      ctx.fill();

      // Fireball bright core
      ctx.beginPath();
      ctx.arc(fbX, bounceY, fbRadius, 0, Math.PI * 2);
      ctx.fillStyle = isLuigi ? "#86efac" : "#fde047";
      ctx.fill();

      // White-hot center
      ctx.beginPath();
      ctx.arc(fbX - dir * 1, bounceY - 1, fbRadius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // Trailing sparks
      ctx.beginPath();
      ctx.arc(fbX - dir * (fbRadius * 1.5), bounceY + 2, 2, 0, Math.PI * 2);
      ctx.arc(fbX - dir * (fbRadius * 2.2), bounceY - 2, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = isLuigi ? "#4ade80" : "#f97316";
      ctx.fill();

      ctx.restore();
      return;
    }

    if (specialType === "super_jump_punch") {
      ctx.save();
      const fistX = noseX + dir * (halfWidth * 0.3);
      const fistY = centerY - heightPx * 0.65;

      // 1. Spinning golden coins scattering upward
      const coinCount = 5;
      for (let i = 0; i < coinCount; i++) {
        const coinAngle = (i * Math.PI * 2) / coinCount + frameCounter * 0.35;
        const coinDist = (i + 1) * (halfWidth * 0.45);
        const cx = fistX + Math.cos(coinAngle) * coinDist;
        const cy = fistY - i * 6 + Math.sin(coinAngle) * 4;
        const spinW = Math.max(
          1,
          Math.abs(Math.cos(frameCounter * 0.4 + i)) * 4.5,
        );

        ctx.beginPath();
        ctx.ellipse(cx, cy, spinW, 5.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#facc15";
        ctx.shadowColor = "#eab308";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.strokeStyle = "#ca8a04";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 2. Punch impact burst / Luigi sweetspot flare
      if (isLuigi && frameCounter < 8) {
        // Luigi sweetspot: explosive red-orange fire blast
        ctx.beginPath();
        ctx.arc(fistX, fistY, 14, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(239, 68, 68, 0.6)";
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 16;
        ctx.fill();
      }

      // Rising speed streaks
      ctx.beginPath();
      ctx.moveTo(x - halfWidth * 0.4, y);
      ctx.lineTo(fistX - dir * 4, fistY + 8);
      ctx.moveTo(x + halfWidth * 0.4, y);
      ctx.lineTo(fistX + dir * 4, fistY + 8);
      ctx.strokeStyle = "rgba(250, 204, 21, 0.75)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
      return;
    }

    if (specialType === "tornado") {
      ctx.save();
      // Whirling tornado cyclone discs
      const discCount = 3;
      const spinRot = frameCounter * 0.45;

      for (let i = 0; i < discCount; i++) {
        const dy = centerY + (i - 1) * (heightPx * 0.28);
        const radiusX = halfWidth * (1.35 + i * 0.2);
        const radiusY = Math.max(4, heightPx * 0.14);

        ctx.beginPath();
        ctx.ellipse(x, dy, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.strokeStyle = isLuigi
          ? i % 2 === 0
            ? "#22c55e"
            : "#86efac"
          : i % 2 === 0
            ? "#ef4444"
            : "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = isLuigi ? "#22c55e" : "#ef4444";
        ctx.shadowBlur = 8;
        ctx.stroke();

        // Wind swirl streaks
        const swirlX = x + Math.cos(spinRot + i * 1.5) * (radiusX * 0.85);
        ctx.beginPath();
        ctx.arc(swirlX, dy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }

      ctx.restore();
      return;
    }
  }

  /**
   * Visualizes Samus's signature special moves:
   * - Charge Shot (Neutral-B): Electric plasma charging sphere at cannon tip.
   * - Screw Attack (Up-B): Multihit somersaulting electric cyclone shield.
   * - Bomb (Down-B): Morph Ball with dropped ticking energy bomb.
   */
  private drawSamusSpecial(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    _color: string,
    specialType: SamusSpecialType,
    frameCounter: number,
  ): void {
    const { ctx } = this;
    const dir = facingRight ? 1 : -1;
    const cannonX = x + dir * (halfWidth * 1.15);
    const cannonY = centerY - heightPx * 0.05;

    if (specialType === "charge_shot") {
      ctx.save();
      // Pulsating electric energy plasma ball
      const pulse = 1 + 0.2 * Math.sin(frameCounter * 0.4);
      const radius = Math.max(8, halfWidth * 0.65) * pulse;

      // 1. Outer electric aura
      ctx.beginPath();
      ctx.arc(cannonX, cannonY, radius * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(14, 165, 233, 0.35)";
      ctx.shadowColor = "#0284c7";
      ctx.shadowBlur = 14;
      ctx.fill();

      // 2. Cyan plasma core
      ctx.beginPath();
      ctx.arc(cannonX, cannonY, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#38bdf8";
      ctx.fill();

      // 3. Bright white spark core
      ctx.beginPath();
      ctx.arc(cannonX, cannonY, radius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // 4. Orbiting energy arcs
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = "#e0f2fe";
      for (let i = 0; i < 3; i++) {
        const ang = (i * Math.PI * 2) / 3 + frameCounter * 0.25;
        ctx.beginPath();
        ctx.arc(cannonX, cannonY, radius * 1.1, ang, ang + 0.8);
        ctx.stroke();
      }

      ctx.restore();
      return;
    }

    if (specialType === "screw_attack") {
      ctx.save();
      const screwRadius = Math.max(16, heightPx * 0.75);
      const rot = frameCounter * 0.55;

      // 1. Electrified somersault sphere aura
      ctx.beginPath();
      ctx.arc(x, centerY, screwRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 14;
      ctx.fill();

      // 2. Rotating lightning cutting rings
      for (let i = 0; i < 3; i++) {
        const ang = rot + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.ellipse(
          x,
          centerY,
          screwRadius * 0.95,
          screwRadius * 0.45,
          ang,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = i % 2 === 0 ? "#facc15" : "#38bdf8";
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }

      // 3. Central white energy spark
      ctx.beginPath();
      ctx.arc(x, centerY, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.restore();
      return;
    }

    if (specialType === "bomb") {
      ctx.save();
      const bombX = x - dir * (halfWidth * 0.3);
      const bombY = centerY + heightPx * 0.35;
      const bombR = Math.max(4, halfWidth * 0.28);

      // Dropped Morph Ball energy bomb
      ctx.beginPath();
      ctx.arc(bombX, bombY, bombR, 0, Math.PI * 2);
      ctx.fillStyle = "#0284c7";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Blinking yellow core
      ctx.beginPath();
      ctx.arc(bombX, bombY, bombR * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = frameCounter % 4 < 2 ? "#facc15" : "#ffffff";
      ctx.fill();

      // Expanding pulse ring
      const ringProg = (frameCounter % 12) / 12;
      ctx.beginPath();
      ctx.arc(bombX, bombY, bombR + ringProg * 14, 0, Math.PI * 2);
      ctx.strokeStyle = resolveColor("#38bdf8", false, (1 - ringProg) * 0.7);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
      return;
    }
  }

  /**
   * Visualizes Link's signature special moves:
   * - Boomerang (Neutral-B): Spinning wooden four-pointed cross boomerang carving forward in flight arc.
   * - Spin Attack (Up-B): 360-degree hurricane sword slash ring with glowing cyan edge trails.
   * - Bomb (Down-B): Blue cartoon bomb with flickering burning fuse.
   */
  private drawLinkSpecial(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    _color: string,
    specialType: LinkSpecialType,
    frameCounter: number,
  ): void {
    const { ctx } = this;
    const dir = facingRight ? 1 : -1;
    const noseX = x + dir * halfWidth;

    if (specialType === "boomerang") {
      ctx.save();
      // Spinning wooden boomerang in flight arc
      const bProg = (frameCounter % 24) / 24;
      const bDist = halfWidth * 2.8;
      const bx = noseX + dir * (10 + Math.sin(bProg * Math.PI) * bDist);
      const by = centerY - Math.sin(bProg * Math.PI * 2) * 6;
      const bRot = frameCounter * 0.45;

      ctx.translate(bx, by);
      ctx.rotate(bRot);

      // Four-pointed cross-boomerang
      const armLen = 9;
      const armThick = 2.4;
      ctx.fillStyle = "#b45309"; // Wood brown
      ctx.strokeStyle = "#fef08a"; // Gold tip
      ctx.lineWidth = 1;

      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.fillRect(-armThick / 2, 0, armThick, armLen);
        ctx.strokeRect(-armThick / 2, 0, armThick, armLen);
      }

      // Wind trail ring
      ctx.beginPath();
      ctx.arc(0, 0, armLen * 1.1, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.restore();
      return;
    }

    if (specialType === "spin_attack") {
      ctx.save();
      // Full 360 hurricane sword slash disk
      const spinRadius = Math.max(18, halfWidth * 2.4);
      const rot = frameCounter * 0.5;

      // 1. Translucent cyan cutting disc
      ctx.beginPath();
      ctx.arc(x, centerY, spinRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(56, 189, 248, 0.22)";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 12;
      ctx.fill();

      // 2. Twin glowing blade trails along perimeter
      for (let i = 0; i < 2; i++) {
        const startAng = rot + i * Math.PI;
        ctx.beginPath();
        ctx.arc(x, centerY, spinRadius, startAng, startAng + 1.6);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, centerY, spinRadius, startAng + 0.2, startAng + 1.4);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      ctx.restore();
      return;
    }

    if (specialType === "bomb") {
      ctx.save();
      // Round blue cartoon bomb with burning fuse
      const bombX = noseX + dir * 8;
      const bombY = centerY - heightPx * 0.35;
      const bombR = Math.max(6, halfWidth * 0.45);

      // Bomb spherical body
      ctx.beginPath();
      ctx.arc(bombX, bombY, bombR, 0, Math.PI * 2);
      ctx.fillStyle = "#1d4ed8";
      ctx.shadowColor = "#3b82f6";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Brass fuse cap
      ctx.fillStyle = "#ca8a04";
      ctx.fillRect(bombX - 2, bombY - bombR - 3, 4, 3);

      // Sparkling burning fuse
      const fuseProg = (frameCounter % 6) / 6;
      ctx.beginPath();
      ctx.arc(
        bombX + (fuseProg > 0.5 ? 2 : -2),
        bombY - bombR - 6,
        2.5,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = "#facc15";
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 6;
      ctx.fill();

      ctx.restore();
      return;
    }
  }

  /**
   * Visualizes Kirby's signature special moves:
   * - Inhale (Neutral-B): Billowing translucent suction wind cone converging into wide mouth.
   * - Final Cutter (Up-B): Vertical sword slash trail rising up, somersault, downward dive, and floor shockwave.
   * - Stone (Down-B): Heavy slate rock transformation with floor fracture puffs.
   */
  private drawKirbySpecial(
    x: number,
    y: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    _color: string,
    specialType: KirbySpecialType,
    frameCounter: number,
  ): void {
    const { ctx } = this;
    const dir = facingRight ? 1 : -1;
    const mouthX = x + dir * (halfWidth * 0.7);

    if (specialType === "inhale") {
      ctx.save();
      // Suction wind cone expanding forward from mouth
      const coneLen = halfWidth * 3.2;
      const coneEndW = heightPx * 1.1;

      // 1. Translucent suction cone fill
      ctx.beginPath();
      ctx.moveTo(mouthX, centerY);
      ctx.lineTo(mouthX + dir * coneLen, centerY - coneEndW * 0.5);
      ctx.lineTo(mouthX + dir * coneLen, centerY + coneEndW * 0.5);
      ctx.closePath();
      ctx.fillStyle = "rgba(186, 230, 253, 0.25)";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 10;
      ctx.fill();

      // 2. Swirling air stream curves
      const streamCount = 4;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";

      for (let i = 0; i < streamCount; i++) {
        const streamProg = (frameCounter * 0.08 + i / streamCount) % 1;
        const sx = mouthX + dir * (coneLen * (1 - streamProg));
        const sy =
          centerY + (i - 1.5) * (coneEndW * 0.28 * (1 - streamProg * 0.5));

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(
          mouthX + dir * (coneLen * 0.4),
          centerY + Math.sin(frameCounter * 0.3 + i) * 6,
          mouthX,
          centerY,
        );
        ctx.stroke();
      }

      ctx.restore();
      return;
    }

    if (specialType === "final_cutter") {
      ctx.save();
      // Upward rising slash / downward dive / floor shockwave wave
      const swordX = mouthX + dir * (halfWidth * 0.4);

      // Vertical energy blade trail
      ctx.beginPath();
      ctx.moveTo(swordX, y);
      ctx.lineTo(swordX, centerY - heightPx * 1.1);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3.5;
      ctx.shadowColor = "#0284c7";
      ctx.shadowBlur = 12;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(swordX, y);
      ctx.lineTo(swordX, centerY - heightPx * 1.1);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Floor cutter shockwave wave
      const waveX = mouthX + dir * (halfWidth * 1.6);
      ctx.beginPath();
      ctx.moveTo(waveX, y);
      ctx.lineTo(waveX + dir * 10, y - heightPx * 0.45);
      ctx.lineTo(waveX + dir * 16, y);
      ctx.closePath();
      ctx.fillStyle = "rgba(56, 189, 248, 0.75)";
      ctx.fill();

      ctx.restore();
      return;
    }

    if (specialType === "stone") {
      ctx.save();
      // Solid stone/brick block
      const stoneW = halfWidth * 1.8;
      const stoneH = heightPx * 0.95;
      const left = x - stoneW * 0.5;
      const top = y - stoneH;

      // Stone block body
      ctx.fillStyle = "#64748b"; // Slate rock
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2;
      ctx.fillRect(left, top, stoneW, stoneH);
      ctx.strokeRect(left, top, stoneW, stoneH);

      // Chiseled highlights
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(left + 2, top + 2, stoneW - 4, 3);
      ctx.fillRect(left + 2, top + 2, 3, stoneH - 4);

      // Floor impact dust puffs
      ctx.beginPath();
      ctx.ellipse(x - stoneW * 0.6, y, 6, 2.5, 0, 0, Math.PI * 2);
      ctx.ellipse(x + stoneW * 0.6, y, 6, 2.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(203, 213, 225, 0.65)";
      ctx.fill();

      ctx.restore();
      return;
    }
  }

  /**
   * Visualizes Jigglypuff's signature special moves:
   * - Pound (Neutral-B): Forward-lunging punch with vibrant pink star impact burst.
   * - Sing (Up-B): Concentric musical soundwave rings radiating outward with floating notes.
   * - Rest (Down-B): Explosive critical hit star bloom with flower petals and Zzz sparkles.
   */
  private drawJigglypuffSpecial(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    _color: string,
    specialType: JigglypuffSpecialType,
    frameCounter: number,
  ): void {
    const { ctx } = this;
    const dir = facingRight ? 1 : -1;
    const noseX = x + dir * halfWidth;

    if (specialType === "pound") {
      ctx.save();
      // Forward thrusting punch impact with large pink burst star
      const punchX = noseX + dir * (halfWidth * 0.85);
      const starR = Math.max(10, halfWidth * 0.75);

      // Thrust speed lines
      ctx.beginPath();
      ctx.moveTo(x, centerY - heightPx * 0.2);
      ctx.lineTo(punchX - dir * 4, centerY - heightPx * 0.2);
      ctx.moveTo(x, centerY + heightPx * 0.2);
      ctx.lineTo(punchX - dir * 4, centerY + heightPx * 0.2);
      ctx.strokeStyle = "rgba(244, 114, 182, 0.75)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 4-point impact star
      ctx.beginPath();
      ctx.moveTo(punchX - starR, centerY);
      ctx.quadraticCurveTo(punchX, centerY, punchX, centerY - starR);
      ctx.quadraticCurveTo(punchX, centerY, punchX + starR, centerY);
      ctx.quadraticCurveTo(punchX, centerY, punchX, centerY + starR);
      ctx.quadraticCurveTo(punchX, centerY, punchX - starR, centerY);
      ctx.fillStyle = "#f472b6";
      ctx.shadowColor = "#ec4899";
      ctx.shadowBlur = 12;
      ctx.fill();

      // White inner core
      ctx.beginPath();
      ctx.arc(punchX, centerY, starR * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.restore();
      return;
    }

    if (specialType === "sing") {
      ctx.save();
      // Concentric musical soundwave rings + floating notes
      const ringCount = 3;
      for (let i = 0; i < ringCount; i++) {
        const ringProg = (frameCounter * 0.05 + i / ringCount) % 1;
        const r = halfWidth * 0.8 + ringProg * (heightPx * 1.2);
        ctx.beginPath();
        ctx.arc(x, centerY, r, 0, Math.PI * 2);
        ctx.strokeStyle = resolveColor("#f472b6", false, (1 - ringProg) * 0.85);
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Floating musical notes ♪ ♫
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.fillStyle = "#ec4899";
      ctx.shadowColor = "#f472b6";
      ctx.shadowBlur = 8;
      const note1Y =
        centerY - heightPx * 0.6 + Math.sin(frameCounter * 0.2) * 4;
      const note2Y =
        centerY - heightPx * 0.4 + Math.cos(frameCounter * 0.25) * 4;
      ctx.fillText("♪", x - halfWidth * 1.1, note1Y);
      ctx.fillText("♫", x + halfWidth * 0.9, note2Y);

      ctx.restore();
      return;
    }

    if (specialType === "rest") {
      ctx.save();
      // Explosive critical hit star bloom with flower petals and Zzz sparkles
      const bloomR = Math.max(14, heightPx * 0.8);
      const isBurst = frameCounter < 10;

      if (isBurst) {
        // Massive flash beam burst
        const beamCount = 8;
        for (let i = 0; i < beamCount; i++) {
          const ang = (i * Math.PI * 2) / beamCount;
          ctx.beginPath();
          ctx.moveTo(x, centerY);
          ctx.lineTo(
            x + Math.cos(ang) * (bloomR * 1.6),
            centerY + Math.sin(ang) * (bloomR * 1.6),
          );
          ctx.strokeStyle = i % 2 === 0 ? "#f43f5e" : "#fde047";
          ctx.lineWidth = 2.5;
          ctx.shadowColor = "#f43f5e";
          ctx.shadowBlur = 14;
          ctx.stroke();
        }
      }

      // Flower petal bloom
      const petalCount = 5;
      for (let i = 0; i < petalCount; i++) {
        const ang = (i * Math.PI * 2) / petalCount;
        const px = x + Math.cos(ang) * (bloomR * 0.6);
        const py = centerY + Math.sin(ang) * (bloomR * 0.6);
        ctx.beginPath();
        ctx.arc(px, py, bloomR * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(244, 63, 94, 0.75)";
        ctx.fill();
      }

      // White center flash
      ctx.beginPath();
      ctx.arc(x, centerY, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // Sleeping Zzz
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillStyle = "#93c5fd";
      ctx.fillText("z", x + 8, centerY - heightPx * 0.5);

      ctx.restore();
      return;
    }
  }

  /**
   * Visualizes Donkey Kong's signature special moves:
   * - Spinning Kong (Up-B): Rapid helicopter arm rotation discs and wind vortex swooshes.
   * - Hand Slap (Down-B): Rhythmic ground quake slam with expanding earthquake shockwave rings and floor cracks.
   * - Giant Punch (Neutral-B): Glowing charged fist windup.
   */
  private drawDKSpecial(
    x: number,
    y: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    _color: string,
    specialType: DKSpecialType,
    frameCounter: number,
  ): void {
    const { ctx } = this;
    const dir = facingRight ? 1 : -1;

    if (specialType === "spinning_kong") {
      ctx.save();
      // Helicopter spin vortex discs
      const spinSpeed = 0.45;
      const vortexR = halfWidth * 1.55;

      // 1. Horizontal wind vortex ellipse
      ctx.beginPath();
      ctx.ellipse(x, centerY, vortexR, heightPx * 0.35, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 2.4;
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = 8;
      ctx.stroke();

      // 2. Spinning arm blur trails orbiting DK
      for (let i = 0; i < 2; i++) {
        const angle = frameCounter * spinSpeed + i * Math.PI;
        const armX = x + Math.cos(angle) * vortexR;
        const armY = centerY + Math.sin(angle) * (heightPx * 0.25);

        ctx.beginPath();
        ctx.arc(armX, armY, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#92400e"; // DK Fur Brown
        ctx.fill();
        ctx.beginPath();
        ctx.arc(armX, armY, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#fed7aa"; // DK Palm skin
        ctx.fill();
      }

      ctx.restore();
      return;
    }

    if (specialType === "hand_slap") {
      ctx.save();
      // Down-B: Hand Slap ground earthquake shockwaves
      const slamProg = (frameCounter % 14) / 14;
      const shockRadius = halfWidth * 1.4 + slamProg * 36;
      const alpha = 1 - slamProg;

      // 1. Expanding earthquake floor ripple ellipse
      ctx.beginPath();
      ctx.ellipse(x, y, shockRadius, 6 + slamProg * 4, 0, 0, Math.PI * 2);
      ctx.strokeStyle = resolveColor("#f59e0b", false, alpha * 0.95);
      ctx.lineWidth = 2.8;
      ctx.shadowColor = "#d97706";
      ctx.shadowBlur = 10;
      ctx.stroke();

      // 2. Secondary inner shock ripple
      ctx.beginPath();
      ctx.ellipse(x, y, shockRadius * 0.6, 4, 0, 0, Math.PI * 2);
      ctx.strokeStyle = resolveColor("#fbbf24", false, alpha * 0.7);
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // 3. Jagged floor fracture fissure lines radiating outwards
      ctx.lineWidth = 2;
      ctx.strokeStyle = resolveColor("#b45309", false, alpha * 0.85);
      for (const side of [-1, 1]) {
        const crackX1 = x + side * (halfWidth * 0.5);
        const crackX2 = x + side * (shockRadius * 0.9);
        ctx.beginPath();
        ctx.moveTo(crackX1, y);
        ctx.lineTo(crackX1 + side * 8, y - 3);
        ctx.lineTo(crackX1 + side * 16, y + 2);
        ctx.lineTo(crackX2, y);
        ctx.stroke();
      }

      ctx.restore();
      return;
    }

    if (specialType === "giant_punch_windup") {
      ctx.save();
      // Charged fist windup
      const pulse = 1 + 0.25 * Math.sin(frameCounter * 0.3);
      const fistX = x - dir * (halfWidth * 0.6);
      ctx.beginPath();
      ctx.arc(fistX, centerY, 9 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(251, 191, 36, 0.4)";
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Visualizes Ness's signature special moves:
   * - PK Fire (Neutral-B): Searing lightning-shaped stream of psychic flames streaming forward.
   * - PK Thunder (Up-B): Psychic energy guiding spark & explosive rocket launch.
   * - PSI Magnet (Down-B): Glowing hexagonal psychic absorption barrier shield.
   */
  private drawNessSpecial(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    _color: string,
    specialType: NessSpecialType,
    frameCounter: number,
  ): void {
    const { ctx } = this;
    const dir = facingRight ? 1 : -1;
    const handX = x + dir * halfWidth;

    if (specialType === "pk_fire") {
      ctx.save();
      // Searing lightning-shaped PK Fire stream projecting forward
      const streamLen = halfWidth * 2.8;
      const endX = handX + dir * streamLen;
      const segs = 6;
      const segW = streamLen / segs;

      // 1. Fiery outer flame aura
      ctx.beginPath();
      ctx.moveTo(handX, centerY);
      for (let i = 1; i <= segs; i++) {
        const segX = handX + dir * (i * segW);
        const jitterY =
          i < segs ? Math.sin(frameCounter * 0.6 + i * 2.2) * 6 : 0;
        ctx.lineTo(segX, centerY + jitterY);
      }
      ctx.strokeStyle = "rgba(249, 115, 22, 0.85)"; // Vibrant PK Fire orange
      ctx.lineWidth = 4.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 12;
      ctx.stroke();

      // 2. Bright yellow lightning core
      ctx.beginPath();
      ctx.moveTo(handX, centerY);
      for (let i = 1; i <= segs; i++) {
        const segX = handX + dir * (i * segW);
        const jitterY =
          i < segs ? Math.sin(frameCounter * 0.6 + i * 2.2) * 6 : 0;
        ctx.lineTo(segX, centerY + jitterY);
      }
      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // 3. Flame burst tip
      ctx.beginPath();
      ctx.arc(
        endX,
        centerY,
        7 + Math.sin(frameCounter * 0.4) * 2,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = "#f97316";
      ctx.shadowColor = "#ea580c";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(endX, centerY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.restore();
      return;
    }

    if (specialType === "pk_thunder_charge") {
      ctx.save();
      // Up-B: Guiding spark orb above Ness
      const sparkY = centerY - heightPx * 0.9;
      const pulse = 1 + 0.25 * Math.sin(frameCounter * 0.4);
      const sparkR = 7 * pulse;

      // Orbiting electric spark ring
      ctx.beginPath();
      ctx.arc(x, sparkY, sparkR * 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(129, 140, 248, 0.75)";
      ctx.lineWidth = 1.6;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Glowing psychic spark orb
      ctx.beginPath();
      ctx.arc(x, sparkY, sparkR, 0, Math.PI * 2);
      ctx.fillStyle = "#818cf8"; // Electric indigo
      ctx.shadowColor = "#6366f1";
      ctx.shadowBlur = 12;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, sparkY, sparkR * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.restore();
      return;
    }

    if (specialType === "pk_thunder_rocket") {
      ctx.save();
      // PK Rocket launch: rocket thruster flames behind Ness
      const backX = x - dir * halfWidth;
      const thrustLen = halfWidth * 2.2;
      ctx.beginPath();
      ctx.moveTo(backX, centerY - heightPx * 0.3);
      ctx.lineTo(backX - dir * thrustLen, centerY);
      ctx.lineTo(backX, centerY + heightPx * 0.3);
      ctx.closePath();
      ctx.fillStyle = "rgba(99, 102, 241, 0.65)";
      ctx.shadowColor = "#818cf8";
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.strokeStyle = "#c084fc";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
      return;
    }

    if (specialType === "psi_magnet") {
      ctx.save();
      // Down-B: Hexagonal PSI absorption barrier shield
      const radius =
        Math.max(16, halfWidth * 1.45) + Math.sin(frameCounter * 0.3) * 2;
      const sides = 6;

      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const angle = (i * Math.PI * 2) / sides + frameCounter * 0.05;
        const px = x + Math.cos(angle) * radius;
        const py = centerY + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(56, 189, 248, 0.28)"; // Translucent PSI cyan
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Vertex nodes on hexagon
      for (let i = 0; i < sides; i++) {
        const angle = (i * Math.PI * 2) / sides + frameCounter * 0.05;
        const px = x + Math.cos(angle) * radius;
        const py = centerY + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }

      ctx.restore();
    }
  }

  /**
   * Traces Pikachu's continuous spatial path in the air during Quick Attack (Up-B),
   * connecting from the start of the jump to the current position across 1 or 2 straight lines.
   */
  private drawPikachuQuickAttackStreak(
    camera: Camera,
    port: PortIndex,
    replay: Replay,
    frameIndex: number,
  ): void {
    const { ctx } = this;
    const pathPoints: Array<{ x: number; y: number }> = [];

    let currIdx = frameIndex;
    while (currIdx >= 0) {
      const pData = replay.frames[currIdx]?.ports[port]?.post;
      if (!pData || !isQuickAttackState(pData.actionStateId)) {
        break;
      }
      pathPoints.push({ x: pData.positionX, y: pData.positionY });
      // If we reached the initial startup of this Quick Attack, stop tracing
      if (pData.actionStateId === 0x0e8 || pData.actionStateId === 0x0eb) {
        break;
      }
      currIdx--;
    }

    if (pathPoints.length < 2) return;
    pathPoints.reverse(); // Chronological order: [startPoint, ..., currentPoint]

    const charId = replay.gameStart.ports[port]?.characterId ?? 0x09;
    const size = characterSize(charId);
    const halfHeightWorld = size.height * 0.5;
    const screenPts = pathPoints.map((pt) =>
      camera.worldToScreen(pt.x, pt.y + halfHeightWorld),
    );

    ctx.save();
    // 1. Wide outer electric golden-yellow aura glow
    ctx.beginPath();
    ctx.moveTo(screenPts[0]!.x, screenPts[0]!.y);
    for (let i = 1; i < screenPts.length; i++) {
      ctx.lineTo(screenPts[i]!.x, screenPts[i]!.y);
    }
    ctx.strokeStyle = "rgba(255, 215, 0, 0.55)";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 14;
    ctx.stroke();

    // 2. Vibrant electric yellow mid-stroke
    ctx.beginPath();
    ctx.moveTo(screenPts[0]!.x, screenPts[0]!.y);
    for (let i = 1; i < screenPts.length; i++) {
      ctx.lineTo(screenPts[i]!.x, screenPts[i]!.y);
    }
    ctx.strokeStyle = "#ffe600";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // 3. Crisp bright white central lightning core
    ctx.beginPath();
    ctx.moveTo(screenPts[0]!.x, screenPts[0]!.y);
    for (let i = 1; i < screenPts.length; i++) {
      ctx.lineTo(screenPts[i]!.x, screenPts[i]!.y);
    }
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // 4. Start origin spark flare
    const start = screenPts[0]!;
    ctx.beginPath();
    ctx.arc(start.x, start.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe600";
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draws all Pikachu Quick Attack trajectories overlayed simultaneously on the stage.
   */
  private drawQuickAttackOverlay(
    camera: Camera,
    paths: QuickAttackPath[],
    hoveredIndex: number | null,
  ): void {
    const { ctx } = this;

    for (const path of paths) {
      if (path.points.length < 2) continue;
      const isHovered = hoveredIndex !== null && path.index === hoveredIndex;
      const screenPts = path.points.map((pt) =>
        camera.worldToScreen(pt.x, pt.y),
      );

      ctx.save();
      if (hoveredIndex !== null && !isHovered) {
        // Dim other paths when a specific path is hovered
        ctx.globalAlpha = 0.35;
      }

      // 1. Wide outer electric golden-yellow aura glow
      ctx.beginPath();
      ctx.moveTo(screenPts[0]!.x, screenPts[0]!.y);
      for (let i = 1; i < screenPts.length; i++) {
        ctx.lineTo(screenPts[i]!.x, screenPts[i]!.y);
      }
      ctx.strokeStyle = isHovered
        ? "rgba(255, 240, 0, 0.95)"
        : "rgba(255, 215, 0, 0.55)";
      ctx.lineWidth = isHovered ? 13 : 8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = isHovered ? "#ffffff" : "#ffd700";
      ctx.shadowBlur = isHovered ? 24 : 12;
      ctx.stroke();

      // 2. Vibrant electric yellow mid-stroke
      ctx.beginPath();
      ctx.moveTo(screenPts[0]!.x, screenPts[0]!.y);
      for (let i = 1; i < screenPts.length; i++) {
        ctx.lineTo(screenPts[i]!.x, screenPts[i]!.y);
      }
      ctx.strokeStyle = isHovered ? "#ffffff" : "#ffe600";
      ctx.lineWidth = isHovered ? 6 : 3.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      // 3. Crisp bright white central lightning core
      ctx.beginPath();
      ctx.moveTo(screenPts[0]!.x, screenPts[0]!.y);
      for (let i = 1; i < screenPts.length; i++) {
        ctx.lineTo(screenPts[i]!.x, screenPts[i]!.y);
      }
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = isHovered ? 2.5 : 1.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      // 4. Start origin spark flare
      const start = screenPts[0]!;
      ctx.beginPath();
      ctx.arc(start.x, start.y, isHovered ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? "#ffffff" : "#ffe600";
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = isHovered ? 16 : 8;
      ctx.fill();

      // 5. Index badge label above start point
      if (isHovered) {
        ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
        ctx.shadowBlur = 4;
        ctx.fillText(`#${path.index}`, start.x, start.y - 12);
      }

      ctx.restore();
    }
  }

  /**
   * Visualizes Fox's signature special moves:
   * - Fire Fox (Up-B): Fiery startup/charge with radiating flame sparks + blazing fire missile flight envelope.
   * - Reflector / Shine (Down-B): Radiant glowing cyan hexagonal crystal barrier with inner facets and central spark.
   * - Blaster (Neutral-B): Laser blaster muzzle flare.
   */
  private drawFoxSpecial(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    _color: string,
    specialType: FoxSpecialType,
    frameCounter: number,
    flightAngle?: number | null,
  ): void {
    const { ctx } = this;
    const dir = facingRight ? 1 : -1;
    const noseX = x + dir * halfWidth;

    if (specialType === "firefox_charge") {
      ctx.save();
      const chargeRadius = Math.max(16, heightPx * 0.75);
      const pulse = Math.sin(frameCounter * 0.45) * 3;
      const currentRadius = chargeRadius + pulse;

      // 1. Fiery heat aura
      ctx.beginPath();
      ctx.arc(x, centerY, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 80, 0, 0.3)";
      ctx.shadowColor = "#ff4500";
      ctx.shadowBlur = 16;
      ctx.fill();

      // 2. Radiating flame sparks / bursts
      const sparkCount = 6;
      const baseAngle = frameCounter * 0.22;
      ctx.beginPath();
      for (let i = 0; i < sparkCount; i++) {
        const ang = baseAngle + (i * Math.PI * 2) / sparkCount;
        const rInner = currentRadius * 0.65;
        const rOuter = currentRadius * (1.15 + (i % 2 === 0 ? 0.25 : 0));
        ctx.moveTo(
          x + Math.cos(ang) * rInner,
          centerY + Math.sin(ang) * rInner,
        );
        ctx.lineTo(
          x + Math.cos(ang) * rOuter,
          centerY + Math.sin(ang) * rOuter,
        );
      }
      ctx.strokeStyle = "#ffbb00";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.stroke();

      // 3. Central white-hot ignition core
      ctx.beginPath();
      ctx.arc(x, centerY, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.restore();
      return;
    }

    if (specialType === "firefox_fly") {
      ctx.save();
      // Translate to Fox's center and rotate to align +X with flight direction on screen
      const angle =
        flightAngle !== null && flightAngle !== undefined
          ? flightAngle
          : facingRight
            ? 0
            : Math.PI;

      ctx.translate(x, centerY);
      ctx.rotate(angle);

      const flameLen = Math.max(halfWidth * 2.4, heightPx * 1.5);
      const flameWidth = Math.max(halfWidth * 1.1, heightPx * 0.5);

      // Flickering flame variations based on frameCounter
      const flick1 = Math.sin(frameCounter * 0.8) * (flameWidth * 0.15);
      const flick2 = Math.cos(frameCounter * 0.9) * (flameWidth * 0.15);
      const flickLen = Math.sin(frameCounter * 1.1) * (flameLen * 0.1);

      // 1. Outer blazing thrust flame cone pointing OPPOSITE to flight direction (-X)
      ctx.beginPath();
      ctx.moveTo(0, -flameWidth * 0.45);
      ctx.lineTo(-flameLen * 0.5, -flameWidth * 0.65 + flick1);
      ctx.lineTo(-(flameLen + flickLen), 0); // Main apex exhaust flame tip
      ctx.lineTo(-flameLen * 0.5, flameWidth * 0.65 + flick2);
      ctx.lineTo(0, flameWidth * 0.45);
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 69, 0, 0.75)";
      ctx.shadowColor = "#ff4500";
      ctx.shadowBlur = 14;
      ctx.fill();

      // 2. Mid golden-yellow flame body
      ctx.beginPath();
      ctx.moveTo(0, -flameWidth * 0.3);
      ctx.lineTo(-flameLen * 0.4, -flameWidth * 0.45 - flick2);
      ctx.lineTo(-(flameLen * 0.75 + flickLen * 0.5), 0);
      ctx.lineTo(-flameLen * 0.4, flameWidth * 0.45 - flick1);
      ctx.lineTo(0, flameWidth * 0.3);
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 204, 0, 0.9)";
      ctx.fill();

      // 3. Inner intense white-hot thrust core
      ctx.beginPath();
      ctx.moveTo(0, -flameWidth * 0.15);
      ctx.lineTo(-flameLen * 0.35, 0);
      ctx.lineTo(0, flameWidth * 0.15);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // 4. Forward aerodynamic shock cone enveloping Fox's front in flight (+X)
      ctx.beginPath();
      ctx.moveTo(-flameWidth * 0.2, -flameWidth * 0.5);
      ctx.lineTo(halfWidth * 1.1, 0);
      ctx.lineTo(-flameWidth * 0.2, flameWidth * 0.5);
      ctx.strokeStyle = "rgba(255, 220, 100, 0.85)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
      return;
    }

    if (specialType === "firefox_end") {
      // Lingering smoke / ember ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, centerY, 12, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 120, 0, 0.35)";
      ctx.fill();
      ctx.restore();
      return;
    }

    if (
      specialType === "shine_start" ||
      specialType === "shine_loop" ||
      specialType === "shine_hit" ||
      specialType === "shine_end"
    ) {
      ctx.save();
      const radius = Math.max(16, heightPx * 0.85);

      // Compute regular hexagon vertices
      const hexPoints: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 6; i++) {
        const theta = (i * Math.PI) / 3 - Math.PI / 6;
        hexPoints.push({
          x: x + Math.cos(theta) * radius,
          y: centerY + Math.sin(theta) * radius,
        });
      }

      // 1. Semi-transparent luminous cyan crystal fill
      ctx.beginPath();
      ctx.moveTo(hexPoints[0]!.x, hexPoints[0]!.y);
      for (let i = 1; i < 6; i++) {
        ctx.lineTo(hexPoints[i]!.x, hexPoints[i]!.y);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(0, 220, 255, 0.22)";
      ctx.shadowColor = "#00d4ff";
      ctx.shadowBlur = 12;
      ctx.fill();

      // 2. Radiant cyan hexagon border
      ctx.strokeStyle = "rgba(0, 240, 255, 0.95)";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 3. Inner crystal facet lines (connecting center to each vertex)
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        ctx.moveTo(x, centerY);
        ctx.lineTo(hexPoints[i]!.x, hexPoints[i]!.y);
      }
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // 4. Central starburst / flare spark on startup or hit
      const isStartOrHit =
        specialType === "shine_start" ||
        specialType === "shine_hit" ||
        frameCounter < 4;

      if (isStartOrHit) {
        // Bright 4-point starburst flare
        const flareSize = radius * 0.8;
        ctx.beginPath();
        ctx.moveTo(x - flareSize, centerY);
        ctx.quadraticCurveTo(x, centerY, x, centerY - flareSize);
        ctx.quadraticCurveTo(x, centerY, x + flareSize, centerY);
        ctx.quadraticCurveTo(x, centerY, x, centerY + flareSize);
        ctx.quadraticCurveTo(x, centerY, x - flareSize, centerY);
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#00ffff";
        ctx.shadowBlur = 16;
        ctx.fill();
      } else {
        // Subtle central diamond core
        const coreSize = 4;
        ctx.beginPath();
        ctx.moveTo(x - coreSize, centerY);
        ctx.lineTo(x, centerY - coreSize);
        ctx.lineTo(x + coreSize, centerY);
        ctx.lineTo(x, centerY + coreSize);
        ctx.closePath();
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }

      ctx.restore();
      return;
    }

    if (specialType === "blaster") {
      ctx.save();
      const gunX = noseX + dir * 4;
      const beamStart = gunX + dir * 4;
      const beamEnd = gunX + dir * 28;

      // 1. Glowing red laser bolt shot
      ctx.beginPath();
      ctx.moveTo(beamStart, centerY);
      ctx.lineTo(beamEnd, centerY);
      ctx.strokeStyle = "rgba(255, 30, 30, 0.95)";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.shadowColor = "#ff0000";
      ctx.shadowBlur = 10;
      ctx.stroke();

      // 2. White-hot laser inner core
      ctx.beginPath();
      ctx.moveTo(beamStart + dir * 2, centerY);
      ctx.lineTo(beamEnd - dir * 2, centerY);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 3. Muzzle flare at blaster tip
      ctx.beginPath();
      ctx.arc(gunX, centerY, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ff2222";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(gunX, centerY, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.restore();
      return;
    }
  }

  /**
   * Traces a continuous bright white/silver motion trail ribbon spanning the character's height
   * extending behind the character's edge as they roll.
   */
  private drawRollTrail(
    camera: Camera,
    port: PortIndex,
    replay: Replay,
    frameIndex: number,
  ): void {
    const { ctx } = this;
    const pathPoints: Array<{
      x: number;
      y: number;
      halfWidth: number;
      heightPx: number;
      facingDirection: 1 | -1;
      actionStateId: number;
    }> = [];

    let currIdx = frameIndex;
    while (currIdx >= 0) {
      const pData = replay.frames[currIdx]?.ports[port]?.post;
      if (!pData || !isRollState(pData.actionStateId)) {
        break;
      }
      const size = characterSize(pData.characterId);
      const crouching = isCrouchState(pData.actionStateId);
      const heightPx = camera.worldLengthToScreen(
        size.height * (crouching ? 0.5 : 1.0),
      );
      const halfWidth = camera.worldLengthToScreen(size.width) / 2;
      pathPoints.push({
        x: pData.positionX,
        y: pData.positionY,
        halfWidth,
        heightPx,
        facingDirection: pData.facingDirection,
        actionStateId: pData.actionStateId,
      });
      if (pData.actionFrameCounter === 0) {
        break;
      }
      currIdx--;
    }

    if (pathPoints.length < 2) return;
    pathPoints.reverse(); // Chronological order: [start, ..., current]

    const startPt = pathPoints[0]!;
    const endPt = pathPoints[pathPoints.length - 1]!;

    // Determine horizontal movement direction (+1 for moving right, -1 for moving left)
    let motionDir: 1 | -1 = endPt.x >= startPt.x ? 1 : -1;
    if (Math.abs(endPt.x - startPt.x) < 0.1) {
      const isForward = isRollForward(endPt.actionStateId);
      motionDir = isForward
        ? endPt.facingDirection
        : (-endPt.facingDirection as 1 | -1);
    }

    // Full-height motion trail extending from the origin's back edge to the current character's far leading edge
    const screenPoints = pathPoints.map((pt, idx) => {
      const screen = camera.worldToScreen(pt.x, pt.y);
      const isCurrent = idx === pathPoints.length - 1;
      const offsetSign = isCurrent ? motionDir : -motionDir;
      const edgeX = screen.x + offsetSign * pt.halfWidth;
      return {
        bottomX: edgeX,
        bottomY: screen.y,
        topX: edgeX,
        topY: screen.y - pt.heightPx,
      };
    });

    const start = screenPoints[0]!;
    const end = screenPoints[screenPoints.length - 1]!;

    ctx.save();
    // 1. Build the full-height trail ribbon polygon extending from back origin to far leading edge
    ctx.beginPath();
    ctx.moveTo(start.topX, start.topY);
    for (let i = 1; i < screenPoints.length; i++) {
      ctx.lineTo(screenPoints[i]!.topX, screenPoints[i]!.topY);
    }
    for (let i = screenPoints.length - 1; i >= 0; i--) {
      ctx.lineTo(screenPoints[i]!.bottomX, screenPoints[i]!.bottomY);
    }
    ctx.closePath();

    // 2. Linear gradient fading from start (faint/0%) to the far edge of the current character (vibrant white)
    const grad = ctx.createLinearGradient(start.bottomX, 0, end.bottomX, 0);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.0)");
    grad.addColorStop(0.5, "rgba(245, 250, 255, 0.35)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0.72)");
    ctx.fillStyle = grad;
    ctx.shadowColor = "rgba(255, 255, 255, 0.65)";
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.restore();
  }

  /** World-space coordinates under the cursor, in a small label offset from the pointer. */
  private drawHoverCoordinates(
    camera: Camera,
    hoverScreen: { x: number; y: number },
  ): void {
    const { ctx } = this;
    const world = camera.screenToWorld(hoverScreen.x, hoverScreen.y);
    const label = `(${world.x.toFixed(0)}, ${world.y.toFixed(0)})`;

    const offsetX = 14;
    const offsetY = 18;
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "left";
    const textWidth = ctx.measureText(label).width;

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(
      hoverScreen.x + offsetX - 4,
      hoverScreen.y + offsetY - 12,
      textWidth + 8,
      17,
    );

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(label, hoverScreen.x + offsetX, hoverScreen.y + offsetY);
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
