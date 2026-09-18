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

export function isLightLandingState(actionStateId: number): boolean {
  return actionStateId === 0x01f;
}

export function isHeavyLandingState(actionStateId: number): boolean {
  return (
    actionStateId === 0x020 ||
    actionStateId === 0x03b ||
    actionStateId === 0x0db
  );
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

export const SHIELD_BREAK_FLY_ACTION_STATE_ID = 0x09e;

export function isShieldBreakFlyState(actionStateId: number): boolean {
  return actionStateId === SHIELD_BREAK_FLY_ACTION_STATE_ID;
}

export function isVulnerableStunState(actionStateId: number): boolean {
  return (
    actionStateId === 0x0a0 ||
    actionStateId === 0x0a2 ||
    actionStateId === 0x0a4
  );
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

export function isEggEncasedState(actionStateId: number): boolean {
  return actionStateId === 0x0b2;
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

export function isQuickAttackLandingState(actionStateId: number): boolean {
  return actionStateId === 0x0ea;
}

export function isSpecialLandingLagState(actionStateId: number): boolean {
  return actionStateId === 0x0ea;
}

export function isJumpActionState(actionStateId: number): boolean {
  return (
    actionStateId === 0x014 || // JumpSquat
    actionStateId === 0x015 || // ShieldJumpSquat
    actionStateId === 0x016 || // JumpF
    actionStateId === 0x017 || // JumpB
    actionStateId === 0x018 || // JumpAerialF
    actionStateId === 0x019 // JumpAerialB
  );
}

export function isJumpSquatState(actionStateId: number): boolean {
  return actionStateId === 0x014 || actionStateId === 0x015;
}

export function isShieldDropState(actionStateId: number): boolean {
  return actionStateId === 0x022; // ShieldDrop (dropping through a platform while in shield)
}

const FIRE_FOX_FLIGHT_STATES = new Set([0x0e8, 0x0ec]);

export function isFireFoxFlightState(actionStateId: number): boolean {
  return FIRE_FOX_FLIGHT_STATES.has(actionStateId);
}

export function isDKCharging(actionStateId: number): boolean {
  return (
    (actionStateId >= 0x0de && actionStateId <= 0x0e1) ||
    actionStateId === 0x0eb
  );
}

export function isSamusCharging(actionStateId: number): boolean {
  return (
    actionStateId === 0x0dc ||
    actionStateId === 0x0dd ||
    actionStateId === 0x0de ||
    actionStateId === 0x0df
  );
}

export const REVIVE2_ACTION_STATE_ID = 0x008;

const REVIVE_ACTION_STATES = new Set([
  0x007, // Revive1 (descending on revival platform)
  0x008, // Revive2 (respawn descend)
  0x009, // ReviveWait (waiting on revival platform)
]);

/**
 * Checks whether a character is on the respawn/revival cloud platform:
 * - 0x007: Revive1 (initial descent from the heavens)
 * - 0x008: Revive2 (descend and perch)
 * - 0x009: ReviveWait (waiting on the revival platform)
 */
export function isReviveState(actionStateId: number): boolean {
  return REVIVE_ACTION_STATES.has(actionStateId);
}
