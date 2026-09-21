import { describe, it, expect } from "vitest";
import { Camera } from "./camera.js";
import {
  canAngleAttack,
  getAttackInfo,
  getDeathDirection,
  getDKSpecialType,
  getFalconSpecialType,
  getFoxFlightAngle,
  getFoxSpecialType,
  getJigglypuffSpecialType,
  getKirbySpecialType,
  getLinkSpecialType,
  getMarioSpecialType,
  getNessSpecialType,
  getPikachuSpecialType,
  getSamusSpecialType,
  getStartNameAlpha,
  getYoshiSpecialType,
  START_NAME_DISPLAY_FRAMES,
  START_NAME_SOLID_FRAMES,
  isBowserCharacter,
  isCrouchState,
  isDashAttackState,
  isDeadState,
  isDizzyState,
  isDonkeyKongCharacter,
  isDownBoundState,
  isFalconCharacter,
  isFireFoxFlightState,
  isFoxCharacter,
  isGrabbedState,
  isEggEncasedState,
  isJigglypuffCharacter,
  isJumpSquatState,
  drawJumpSquatFx,
  isKirbyCharacter,
  isLandingState,
  isHeavyLandingState,
  isGetUpAttackState,
  isLedgeAttackState,
  isQuickLedgeAttackState,
  isSlowLedgeAttackState,
  isLinkCharacter,
  isLuigiCharacter,
  isMarioCharacter,
  isMissedTechState,
  isNessCharacter,
  isNormalRollState,
  isPikachuCharacter,
  isProneState,
  isQuickAttackState,
  isQuickAttackLandingState,
  isSpecialLandingLagState,
  extractAllQuickAttackPaths,
  isRollForward,
  isRollState,
  isSamusCharacter,
  isShieldBreakActionState,
  isShieldState,
  isShieldStunState,
  isSleepState,
  isSpecialState,
  isTauntState,
  isTechInPlaceState,
  isGroundTechInPlaceState,
  isTechRollState,
  isTumbleState,
  isTurnState,
  isYoshiCharacter,
  toGrayscale,
  toBlandPalette,
  computeLedgeGrabCandidates,
  LEDGE_GRAB_FADE_FRAMES,
  StageRenderer,
  extractBombExplosions,
  extractSamusBombExplosions,
  isSamusBombObject,
  extractEggExplosions,
  EGG_EXPLOSION_DURATION,
  isEggThrowObject,
  CHARGE_SHOT_FULL_CHARGE_RADIUS_WORLD,
  CHARGE_SHOT_FULL_CHARGE_SCALE,
  CHARGE_SHOT_LEVEL_SCALES,
  drawShieldBubble,
  drawAttackArc,
  drawSamusGrappleBeam,
  drawLinkHookshot,
  drawYoshiTongueGrab,
  drawDeconflictedPauseHuds,
  drawComboEscapeHighlight,
  drawComboEscapeTextCallout,
  COMBO_GAP_CALLOUT_FADE_FRAMES,
  getComboGapBadgeColors,
  getComboEscapeSilhouetteColors,
  getHitstunSilhouetteColors,
  getInvincibleSilhouetteColors,
  isInvincibleOrInvulnerable,
  isYoshiShieldInvincibleState,
  drawInvincibleSparkles,
  createSilhouetteContext,
  isShieldDropState,
  isLightLandingState,
  isReviveState,
  drawReviveCloud,
  drawReviveCloudDissipating,
  CLOUD_DISSIPATE_FRAMES,
  isShieldBreakFlyState,
  isVulnerableStunState,
  drawShieldBreakPop,
  SHIELD_BREAK_POP_FRAMES,
} from "./renderer.js";
import {
  HazardFlag,
  ITKind,
  ItemLinkId,
  WPKind,
  type Frame,
  type PortIndex,
  type StateFrame,
  type InputFrame,
  type Replay,
  type ItemUpdate,
} from "@rmg-k/rmgr";
import {
  DREAM_LAND_BLAST_ZONE,
  DREAM_LAND_STAGE_ID,
  stageBlastZone,
} from "./stageGeometry.js";
import {
  PORT_COLORS,
  MAIN_PLAYER_COLOR,
  OPPONENT_COLOR,
  getPlayerColor,
} from "./players.js";

describe("isShieldState", () => {
  it("identifies shield action states correctly", () => {
    expect(isShieldState(0x098)).toBe(true); // ShieldOn
    expect(isShieldState(0x099)).toBe(true); // Shield
    expect(isShieldState(0x09a)).toBe(true); // ShieldOff
    expect(isShieldState(0x09b)).toBe(true); // ShieldStun
  });

  it("returns false for non-shield action states", () => {
    expect(isShieldState(0x000)).toBe(false); // DeadDown
    expect(isShieldState(0x014)).toBe(false); // JumpSquat
    expect(isShieldState(0x01a)).toBe(false); // Fall
    expect(isShieldState(0x039)).toBe(false); // Tumble
    expect(isShieldState(0x09c)).toBe(false); // RollF
    expect(isShieldState(0x09e)).toBe(false); // ShieldBreak
    expect(isShieldState(0x0a6)).toBe(false); // Grab
  });
});

describe("isShieldStunState", () => {
  it("identifies shield stun action state correctly", () => {
    expect(isShieldStunState(0x09b)).toBe(true); // ShieldStun
  });

  it("returns false for other shield and non-shield states", () => {
    expect(isShieldStunState(0x098)).toBe(false); // ShieldOn
    expect(isShieldStunState(0x099)).toBe(false); // Shield
    expect(isShieldStunState(0x09a)).toBe(false); // ShieldOff
    expect(isShieldStunState(0x00a)).toBe(false); // Idle
  });
});

describe("isLandingState", () => {
  it("identifies landing action states correctly", () => {
    expect(isLandingState(0x01f)).toBe(true); // LandingLight
    expect(isLandingState(0x020)).toBe(true); // LandingHeavy
    expect(isLandingState(0x03b)).toBe(true); // LandingSpecial
    expect(isLandingState(0x0db)).toBe(true); // LandingAirX
  });

  it("returns false for non-landing action states", () => {
    expect(isLandingState(0x00a)).toBe(false); // Idle
    expect(isLandingState(0x01a)).toBe(false); // Fall
    expect(isLandingState(0x01c)).toBe(false); // Crouch
    expect(isLandingState(0x099)).toBe(false); // Shield
  });
});

describe("isHeavyLandingState", () => {
  it("identifies heavy landing action states correctly", () => {
    expect(isHeavyLandingState(0x020)).toBe(true); // LandingHeavy
    expect(isHeavyLandingState(0x03b)).toBe(true); // LandingSpecial
    expect(isHeavyLandingState(0x0db)).toBe(true); // LandingAirX
  });

  it("returns false for light landing or other states", () => {
    expect(isHeavyLandingState(0x01f)).toBe(false); // LandingLight
    expect(isHeavyLandingState(0x00a)).toBe(false); // Idle
    expect(isHeavyLandingState(0x01a)).toBe(false); // Fall
  });
});

describe("isSpecialState", () => {
  it("identifies special move action states correctly", () => {
    expect(isSpecialState(0x0dc)).toBe(true);
    expect(isSpecialState(0x0eb)).toBe(true);
    expect(isSpecialState(0x100)).toBe(true);
  });

  it("returns false for standard action states", () => {
    expect(isSpecialState(0x00a)).toBe(false); // Idle
    expect(isSpecialState(0x0c7)).toBe(false); // UTilt
    expect(isSpecialState(0x0cf)).toBe(false); // USmash
    expect(isSpecialState(0x0d1)).toBe(false); // Nair
  });
});

describe("isDeadState", () => {
  it("identifies dead action states correctly", () => {
    expect(isDeadState(0x000)).toBe(true); // DeadD
    expect(isDeadState(0x001)).toBe(true); // DeadS
    expect(isDeadState(0x002)).toBe(true); // DeadU
    expect(isDeadState(0x003)).toBe(true); // ScreenKO
    expect(isDeadState(0x004)).toBe(true); // ScreenKOWait
  });

  it("returns false for respawn / live action states", () => {
    expect(isDeadState(0x005)).toBe(false); // Entry
    expect(isDeadState(0x007)).toBe(false); // Revive1
    expect(isDeadState(0x008)).toBe(false); // Revive2
    expect(isDeadState(0x009)).toBe(false); // ReviveWait
    expect(isDeadState(0x00a)).toBe(false); // Idle
    expect(isDeadState(0x01a)).toBe(false); // Fall
  });
});

describe("isGrabbedState", () => {
  it("identifies captured/grabbed action states correctly", () => {
    expect(isGrabbedState(0x0ab)).toBe(true); // CapturePull
    expect(isGrabbedState(0x0ac)).toBe(true); // CaptureWait
    expect(isGrabbedState(0x0ad)).toBe(true); // CaptureDamage
    expect(isGrabbedState(0x0b3)).toBe(true); // CaptureFalconDive (Falcon Up-B victim)
    expect(isGrabbedState(0x0b6)).toBe(true); // CaptureCargo
    expect(isGrabbedState(0x0b9)).toBe(true); // CapturePulled
  });

  it("returns false for non-grabbed action states", () => {
    expect(isGrabbedState(0x00a)).toBe(false); // Idle
    expect(isGrabbedState(0x0a6)).toBe(false); // Grab (attacker)
    expect(isGrabbedState(0x099)).toBe(false); // Shield
  });
});

describe("isEggEncasedState", () => {
  it("identifies 0x0b2 as egg-encased (confirmed empirically, universal across characters)", () => {
    expect(isEggEncasedState(0x0b2)).toBe(true);
  });

  it("returns false for other states", () => {
    expect(isEggEncasedState(0x00a)).toBe(false); // Idle
    expect(isEggEncasedState(0x0b3)).toBe(false); // CaptureFalconDive
  });
});

describe("isFalconCharacter", () => {
  it("identifies Captain Falcon and J Falcon correctly", () => {
    expect(isFalconCharacter(0x07)).toBe(true); // Captain Falcon
    expect(isFalconCharacter(0x28)).toBe(true); // Falcon (JP)
    expect(isFalconCharacter(0x15)).toBe(true); // Polygon Falcon
  });

  it("returns false for other characters", () => {
    expect(isFalconCharacter(0x00)).toBe(false); // Mario
    expect(isFalconCharacter(0x01)).toBe(false); // Fox
    expect(isFalconCharacter(0x02)).toBe(false); // DK
    expect(isFalconCharacter(0x09)).toBe(false); // Pikachu
  });
});

describe("getFalconSpecialType", () => {
  it("classifies Falcon Punch correctly", () => {
    expect(getFalconSpecialType(0x07, 0x0e5)).toBe("punch");
    expect(getFalconSpecialType(0x07, 0x0e6)).toBe("punch");
    expect(getFalconSpecialType(0x28, 0x0e5)).toBe("punch");
  });

  it("classifies Falcon Dive states correctly", () => {
    expect(getFalconSpecialType(0x07, 0x0e8)).toBe("dive_reach");
    expect(getFalconSpecialType(0x07, 0x0ea)).toBe("dive_catch");
    expect(getFalconSpecialType(0x07, 0x0ee)).toBe("dive_explosion");
    expect(getFalconSpecialType(0x28, 0x0ea)).toBe("dive_catch");
  });

  it("classifies Falcon Kick states correctly", () => {
    expect(getFalconSpecialType(0x07, 0x0e9)).toBe("kick_air");
    expect(getFalconSpecialType(0x07, 0x0eb)).toBe("kick");
    expect(getFalconSpecialType(0x07, 0x0ec)).toBe("kick");
    expect(getFalconSpecialType(0x07, 0x0ed)).toBe("kick_end");
    expect(getFalconSpecialType(0x28, 0x0e9)).toBe("kick_air");
    expect(getFalconSpecialType(0x28, 0x0eb)).toBe("kick");
  });

  it("returns null for non-special states or non-Falcon characters", () => {
    expect(getFalconSpecialType(0x07, 0x00a)).toBeNull(); // Idle
    expect(getFalconSpecialType(0x07, 0x0d2)).toBeNull(); // Fair
    expect(getFalconSpecialType(0x00, 0x0e5)).toBeNull(); // Mario in 0xe5
  });
});

describe("isPikachuCharacter", () => {
  it("identifies Pikachu variants correctly", () => {
    expect(isPikachuCharacter(0x09)).toBe(true); // Pikachu
    expect(isPikachuCharacter(0x17)).toBe(true); // Polygon Pikachu
    expect(isPikachuCharacter(0x2d)).toBe(true); // Pikachu (EU)
    expect(isPikachuCharacter(0x32)).toBe(true); // Pikachu (JP)
  });

  it("returns false for other characters", () => {
    expect(isPikachuCharacter(0x00)).toBe(false); // Mario
    expect(isPikachuCharacter(0x07)).toBe(false); // Captain Falcon
    expect(isPikachuCharacter(0x01)).toBe(false); // Fox
  });
});

describe("getPikachuSpecialType", () => {
  it("returns null for Thunder (Down-B) states as they are handled by real weapon markers", () => {
    expect(getPikachuSpecialType(0x09, 0x0e3)).toBeNull();
    expect(getPikachuSpecialType(0x09, 0x0e4)).toBeNull();
    expect(getPikachuSpecialType(0x09, 0x0e5)).toBeNull();
    expect(getPikachuSpecialType(0x09, 0x0e6)).toBeNull();
    expect(getPikachuSpecialType(0x09, 0x0e7)).toBeNull();
    expect(getPikachuSpecialType(0x32, 0x0e3)).toBeNull();
  });

  it("classifies Quick Attack (Up-B) correctly", () => {
    expect(getPikachuSpecialType(0x09, 0x0e8)).toBe("quick_attack");
    expect(getPikachuSpecialType(0x09, 0x0eb)).toBe("quick_attack");
    expect(getPikachuSpecialType(0x09, 0x0ec)).toBe("quick_attack_zip");
    expect(getPikachuSpecialType(0x09, 0x0ed)).toBe("quick_attack_zip");
    expect(getPikachuSpecialType(0x09, 0x0e9)).toBe("quick_attack");
    expect(getPikachuSpecialType(0x09, 0x0ea)).toBe("quick_attack");
  });

  it("returns null for Thunder Jolt (Neutral-B) states as they are handled by real weapon markers", () => {
    expect(getPikachuSpecialType(0x09, 0x0dc)).toBeNull();
    expect(getPikachuSpecialType(0x09, 0x0dd)).toBeNull();
    expect(getPikachuSpecialType(0x09, 0x0de)).toBeNull();
    expect(getPikachuSpecialType(0x09, 0x0df)).toBeNull();
    expect(getPikachuSpecialType(0x09, 0x0e0)).toBeNull();
  });

  it("returns null for non-special states or non-Pikachu characters", () => {
    expect(getPikachuSpecialType(0x09, 0x00a)).toBeNull(); // Idle
    expect(getPikachuSpecialType(0x09, 0x0d1)).toBeNull(); // Nair
    expect(getPikachuSpecialType(0x00, 0x0e3)).toBeNull(); // Mario in 0xe3
  });
});

describe("isQuickAttackState", () => {
  it("identifies all Quick Attack phases correctly", () => {
    expect(isQuickAttackState(0x0e8)).toBe(true); // Ground QA Startup
    expect(isQuickAttackState(0x0eb)).toBe(true); // Air QA Startup
    expect(isQuickAttackState(0x0ec)).toBe(true); // Zip 1
    expect(isQuickAttackState(0x0ed)).toBe(true); // Zip 2
    expect(isQuickAttackState(0x0e9)).toBe(true); // QA End / Landing
    expect(isQuickAttackState(0x0ea)).toBe(true); // QA Landing
  });

  it("returns false for non-Quick-Attack states", () => {
    expect(isQuickAttackState(0x00a)).toBe(false); // Idle
    expect(isQuickAttackState(0x01a)).toBe(false); // Fall
    expect(isQuickAttackState(0x03a)).toBe(false); // FallSpecial
    expect(isQuickAttackState(0x0e3)).toBe(false); // Thunder
  });
});

describe("isQuickAttackLandingState", () => {
  it("identifies 0x0ea as Quick Attack landing lag state", () => {
    expect(isQuickAttackLandingState(0x0ea)).toBe(true);
    expect(isSpecialLandingLagState(0x0ea)).toBe(true);
  });

  it("returns false for other action states", () => {
    expect(isQuickAttackLandingState(0x00a)).toBe(false);
    expect(isQuickAttackLandingState(0x01f)).toBe(false);
    expect(isQuickAttackLandingState(0x020)).toBe(false);
    expect(isQuickAttackLandingState(0x0e8)).toBe(false);
    expect(isQuickAttackLandingState(0x0ec)).toBe(false);
  });
});

describe("extractAllQuickAttackPaths", () => {
  it("extracts all Quick Attack path segments for Pikachu", () => {
    const replay = {
      matchSettings: {
        stageId: DREAM_LAND_STAGE_ID,
        characterId: [0x09, 0x01], // Pikachu, Fox
      },
      frames: [
        // Frame 0: Idle
        {
          frame: 0,
          ports: [
            { state: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
        // Frame 1-3: Quick Attack 1 (Startup -> Zip 1 -> End)
        {
          frame: 1,
          ports: [
            { state: { actionStateId: 0x0e8, positionX: 10, positionY: 0 } },
          ],
        },
        {
          frame: 2,
          ports: [
            { state: { actionStateId: 0x0ec, positionX: 100, positionY: 50 } },
          ],
        },
        {
          frame: 3,
          ports: [
            { state: { actionStateId: 0x0e9, positionX: 150, positionY: 50 } },
          ],
        },
        // Frame 4: Landed / Idle
        {
          frame: 4,
          ports: [
            { state: { actionStateId: 0x0a, positionX: 150, positionY: 0 } },
          ],
        },
        // Frame 5-8: Quick Attack 2 (Startup -> Zip 1 -> Zip 2 -> End)
        {
          frame: 5,
          ports: [
            {
              state: { actionStateId: 0x0eb, positionX: 200, positionY: 100 },
            },
          ],
        },
        {
          frame: 6,
          ports: [
            {
              state: { actionStateId: 0x0ec, positionX: 300, positionY: 200 },
            },
          ],
        },
        {
          frame: 7,
          ports: [
            {
              state: { actionStateId: 0x0ed, positionX: 400, positionY: 250 },
            },
          ],
        },
        {
          frame: 8,
          ports: [
            {
              state: { actionStateId: 0x0ea, positionX: 450, positionY: 250 },
            },
          ],
        },
      ],
    } as unknown as Replay;

    const paths = extractAllQuickAttackPaths(replay, 0, false);
    expect(paths.length).toBe(2);

    expect(paths[0]?.index).toBe(1);
    expect(paths[0]?.startFrame).toBe(1);
    expect(paths[0]?.endFrame).toBe(3);
    expect(paths[0]?.zipCount).toBe(1);
    expect(paths[0]?.points.length).toBe(3);

    expect(paths[1]?.index).toBe(2);
    expect(paths[1]?.startFrame).toBe(5);
    expect(paths[1]?.endFrame).toBe(8);
    expect(paths[1]?.zipCount).toBe(2);
    expect(paths[1]?.points.length).toBe(4);
  });

  it("filters Quick Attacks to only those during recovery situations by default", () => {
    // Replay with port 0 (Pikachu) in a recovery situation (offstage outside danger zone)
    const replay = {
      matchSettings: {
        stageId: DREAM_LAND_STAGE_ID,
        characterId: [0x09, 0x01],
      },
      frames: [
        // Frame 0: Offstage outside danger zone (starts recovery situation)
        {
          frame: 0,
          ports: [
            {
              state: { actionStateId: 0x18, positionX: -3500, positionY: 500 },
            },
            { state: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
        // Frame 1-3: Quick Attack during recovery
        {
          frame: 1,
          ports: [
            {
              state: {
                actionStateId: 0x0e8,
                positionX: -3500,
                positionY: 500,
              },
            },
            { state: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
        {
          frame: 2,
          ports: [
            {
              state: {
                actionStateId: 0x0ec,
                positionX: -2000,
                positionY: 500,
              },
            },
            { state: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
        {
          frame: 3,
          ports: [
            {
              state: { actionStateId: 0x0e9, positionX: -500, positionY: 500 },
            },
            { state: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
      ],
    } as unknown as Replay;

    const paths = extractAllQuickAttackPaths(replay, 0);
    expect(paths.length).toBe(1);
    expect(paths[0]?.startFrame).toBe(1);
    expect(paths[0]?.recoveryStartFrame).toBe(0);
    expect(paths[0]?.recoveryStartFrameIndex).toBe(0);
    expect(paths[0]?.preUpBPoints).toBeDefined();
    expect(paths[0]?.preUpBPoints?.length).toBe(2);
    expect(paths[0]?.preUpBPoints?.[0]?.x).toBe(-3500);
  });

  it("breaks out white jump segment between jump in air and Up-B start", () => {
    const replay = {
      matchSettings: {
        stageId: DREAM_LAND_STAGE_ID,
        characterId: [0x09, 0x01],
      },
      frames: [
        // Frame 0: Offstage falling (starts recovery)
        {
          frame: 0,
          ports: [
            {
              state: { actionStateId: 0x1a, positionX: -3600, positionY: 300 },
            }, // Fall
            { state: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
        // Frame 1: Still falling
        {
          frame: 1,
          ports: [
            {
              state: { actionStateId: 0x1a, positionX: -3500, positionY: 200 },
            }, // Fall
            { state: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
        // Frame 2: Mid-air jump
        {
          frame: 2,
          ports: [
            {
              state: { actionStateId: 0x18, positionX: -3400, positionY: 350 },
            }, // JumpAerialF
            { state: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
        // Frame 3: Mid-air jump rising
        {
          frame: 3,
          ports: [
            {
              state: { actionStateId: 0x18, positionX: -3300, positionY: 500 },
            }, // JumpAerialF
            { state: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
        // Frame 4-5: Up-B
        {
          frame: 4,
          ports: [
            {
              state: {
                actionStateId: 0x0e8,
                positionX: -3300,
                positionY: 500,
              },
            },
            { state: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
        {
          frame: 5,
          ports: [
            {
              state: {
                actionStateId: 0x0ec,
                positionX: -1500,
                positionY: 500,
              },
            },
            { state: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
      ],
    } as unknown as Replay;

    const paths = extractAllQuickAttackPaths(replay, 0);
    expect(paths.length).toBe(1);

    const path = paths[0]!;
    expect(path.recoveryStartFrameIndex).toBe(0);
    expect(path.jumpFrameIndex).toBe(2);
    expect(path.jumpFrame).toBe(2);

    // Pre-jump segment (frames 0 to 2)
    expect(path.preJumpPoints).toBeDefined();
    expect(path.preJumpPoints?.length).toBe(3);
    expect(path.preJumpPoints?.[0]?.x).toBe(-3600);
    expect(path.preJumpPoints?.[2]?.x).toBe(-3400);

    // Jump segment (frames 2 to 4)
    expect(path.jumpPoints).toBeDefined();
    expect(path.jumpPoints?.length).toBe(3);
    expect(path.jumpPoints?.[0]?.x).toBe(-3400); // Matches end of pre-jump
    expect(path.jumpPoints?.[2]?.x).toBe(-3300); // Matches start of Up-B

    // Quick Attack points (frames 4 to 5)
    expect(path.points.length).toBe(2);
    expect(path.points[0]?.x).toBe(-3300);
  });

  it("returns empty array for non-Pikachu characters", () => {
    const replay = {
      matchSettings: {
        stageId: DREAM_LAND_STAGE_ID,
        characterId: [0x01], // Fox
      },
      frames: [],
    } as unknown as Replay;

    const paths = extractAllQuickAttackPaths(replay, 0);
    expect(paths).toEqual([]);
  });
});

describe("isCrouchState", () => {
  it("identifies crouch action states correctly", () => {
    expect(isCrouchState(0x01c)).toBe(true); // Crouch
    expect(isCrouchState(0x01d)).toBe(true); // CrouchIdle
    expect(isCrouchState(0x01e)).toBe(true); // CrouchEnd
  });

  it("returns false for non-crouch action states", () => {
    expect(isCrouchState(0x00a)).toBe(false); // Idle
    expect(isCrouchState(0x00f)).toBe(false); // Dash
    expect(isCrouchState(0x014)).toBe(false); // JumpSquat
    expect(isCrouchState(0x01a)).toBe(false); // Fall
    expect(isCrouchState(0x099)).toBe(false); // Shield
  });
});

describe("isJumpSquatState", () => {
  it("identifies jumpsquat action states correctly", () => {
    expect(isJumpSquatState(0x014)).toBe(true); // JumpSquat
    expect(isJumpSquatState(0x015)).toBe(true); // ShieldJumpSquat
  });

  it("returns false for non-jumpsquat action states", () => {
    expect(isJumpSquatState(0x00a)).toBe(false); // Idle
    expect(isJumpSquatState(0x00f)).toBe(false); // Dash
    expect(isJumpSquatState(0x016)).toBe(false); // JumpF
    expect(isJumpSquatState(0x017)).toBe(false); // JumpB
    expect(isJumpSquatState(0x01a)).toBe(false); // Fall
    expect(isJumpSquatState(0x01c)).toBe(false); // Crouch
    expect(isJumpSquatState(0x099)).toBe(false); // Shield
  });
});

describe("isTauntState", () => {
  it("identifies taunt action state correctly", () => {
    expect(isTauntState(0x0bd)).toBe(true); // Taunt
  });

  it("returns false for non-taunt action states", () => {
    expect(isTauntState(0x00a)).toBe(false); // Idle
    expect(isTauntState(0x0be)).toBe(false); // Jab1
    expect(isTauntState(0x01c)).toBe(false); // Crouch
    expect(isTauntState(0x099)).toBe(false); // Shield
  });
});

describe("isTurnState", () => {
  it("identifies turn action states correctly", () => {
    expect(isTurnState(0x012)).toBe(true); // Turn
    expect(isTurnState(0x013)).toBe(true); // TurnRun
  });

  it("returns false for non-turn action states", () => {
    expect(isTurnState(0x00a)).toBe(false); // Idle
    expect(isTurnState(0x00f)).toBe(false); // Dash
    expect(isTurnState(0x010)).toBe(false); // Run
    expect(isTurnState(0x01c)).toBe(false); // Crouch
    expect(isTurnState(0x099)).toBe(false); // Shield
  });
});

describe("isRollState", () => {
  it("identifies shield rolls, tech rolls, get-up rolls, and ledge rolls correctly", () => {
    expect(isRollState(0x09c)).toBe(true); // RollF
    expect(isRollState(0x09d)).toBe(true); // RollB
    expect(isRollState(0x049)).toBe(true); // TechF
    expect(isRollState(0x04a)).toBe(true); // TechB
    expect(isRollState(0x047)).toBe(true); // DownForwardD
    expect(isRollState(0x048)).toBe(true); // DownBackD
    expect(isRollState(0x04b)).toBe(true); // DownForwardU
    expect(isRollState(0x04c)).toBe(true); // DownBackU
    expect(isRollState(0x058)).toBe(true); // CliffRollQuick
    expect(isRollState(0x05b)).toBe(true); // CliffRollSlow
  });

  it("returns false for non-roll action states", () => {
    expect(isRollState(0x00a)).toBe(false); // Idle
    expect(isRollState(0x00f)).toBe(false); // Dash
    expect(isRollState(0x099)).toBe(false); // Shield
    expect(isRollState(0x09e)).toBe(false); // ShieldBreak
  });
});

describe("isRollForward", () => {
  it("classifies forward rolls vs backward rolls correctly", () => {
    expect(isRollForward(0x09c)).toBe(true); // RollF
    expect(isRollForward(0x049)).toBe(true); // TechF
    expect(isRollForward(0x047)).toBe(true); // DownForwardD
    expect(isRollForward(0x04b)).toBe(true); // DownForwardU
    expect(isRollForward(0x058)).toBe(true); // CliffRollQuick

    expect(isRollForward(0x09d)).toBe(false); // RollB
    expect(isRollForward(0x04a)).toBe(false); // TechB
    expect(isRollForward(0x048)).toBe(false); // DownBackD
    expect(isRollForward(0x04c)).toBe(false); // DownBackU
  });
});

describe("isGetUpAttackState", () => {
  it("identifies get-up attacks correctly", () => {
    expect(isGetUpAttackState(0x04f)).toBe(true); // DownAttackD
    expect(isGetUpAttackState(0x050)).toBe(true); // DownAttackU

    expect(isGetUpAttackState(0x045)).toBe(false); // DownStandD
    expect(isGetUpAttackState(0x00a)).toBe(false); // Idle
  });
});

describe("isLedgeAttackState", () => {
  it("identifies quick and slow active ledge attack strikes correctly", () => {
    // 0x05c and 0x05e are climbing up from the ledge (no attack yet)
    expect(isLedgeAttackState(0x05c)).toBe(false); // CliffAttackQuick1
    expect(isLedgeAttackState(0x05e)).toBe(false); // CliffAttackSlow1

    // 0x05d and 0x05f are when the attack strike actually happens
    expect(isLedgeAttackState(0x05d)).toBe(true); // CliffAttackQuick2
    expect(isLedgeAttackState(0x05f)).toBe(true); // CliffAttackSlow2

    expect(isQuickLedgeAttackState(0x05c)).toBe(false);
    expect(isQuickLedgeAttackState(0x05d)).toBe(true);
    expect(isQuickLedgeAttackState(0x05e)).toBe(false);
    expect(isQuickLedgeAttackState(0x05f)).toBe(false);

    expect(isSlowLedgeAttackState(0x05e)).toBe(false);
    expect(isSlowLedgeAttackState(0x05f)).toBe(true);
    expect(isSlowLedgeAttackState(0x05c)).toBe(false);
    expect(isSlowLedgeAttackState(0x05d)).toBe(false);

    expect(isLedgeAttackState(0x055)).toBe(false); // CliffWait
    expect(isLedgeAttackState(0x058)).toBe(false); // CliffRollQuick
  });
});

describe("getAttackInfo", () => {
  it("identifies jab attacks correctly", () => {
    expect(getAttackInfo(0x0be)).toEqual({
      type: "jab",
      direction: "forward",
    }); // Jab1
    expect(getAttackInfo(0x0bf)).toEqual({
      type: "jab",
      direction: "forward",
    }); // Jab2
  });

  it("identifies grab attempts correctly including Link and Samus grapple grabs", () => {
    expect(getAttackInfo(0x0a6)).toEqual({
      type: "grab",
      direction: "forward",
    }); // Grab
    expect(getAttackInfo(0x0a7)).toEqual({
      type: "grab",
      direction: "forward",
    }); // GrabPull
    expect(getAttackInfo(0x0a8)).toEqual({
      type: "grab",
      direction: "forward",
    }); // GrabWait
    expect(getAttackInfo(0x0a8, 0x05)).toBeNull(); // Link holding opponent (CatchWait) has retracted hookshot, no grab animation
    expect(getAttackInfo(0x0a6, 0x05)).toEqual({
      type: "grab",
      direction: "forward",
    }); // Link Hookshot grab
    expect(getAttackInfo(0x0a7, 0x05)).toEqual({
      type: "grab",
      direction: "forward",
    }); // Link Hookshot pull
    expect(getAttackInfo(0x0e5, 0x05)).toBeNull(); // Link Boomerang throw (0x0e5) is not a grab
    expect(getAttackInfo(0x0e5, 0x03)).toBeNull(); // Samus bomb landing (0x0e5) is not a grab
    expect(getAttackInfo(0x0a6, 0x03)).toEqual({
      type: "grab",
      direction: "forward",
    }); // Samus Grapple Beam grab
    expect(getAttackInfo(0x0a7, 0x03)).toEqual({
      type: "grab",
      direction: "forward",
    }); // Samus Grapple Beam pull
    expect(getAttackInfo(0x0a8, 0x03)).toBeNull(); // Samus holding opponent (CatchWait) has retracted grapple beam, no grab animation
  });

  it("identifies tilt attacks correctly", () => {
    expect(getAttackInfo(0x0c7)).toEqual({
      type: "tilt",
      direction: "up",
    }); // UTilt
    expect(getAttackInfo(0x0c9)).toEqual({
      type: "tilt",
      direction: "down",
    }); // DTilt
    expect(getAttackInfo(0x0c1)).toEqual({
      type: "tilt",
      direction: "forward",
    }); // FTilt High
    expect(getAttackInfo(0x0c3)).toEqual({
      type: "tilt",
      direction: "forward",
    }); // FTilt Mid
    expect(getAttackInfo(0x0c5)).toEqual({
      type: "tilt",
      direction: "forward",
    }); // FTilt Low
  });

  it("identifies smash attacks correctly", () => {
    expect(getAttackInfo(0x0cf)).toEqual({
      type: "smash",
      direction: "up",
    }); // USmash
    expect(getAttackInfo(0x0d0)).toEqual({
      type: "smash",
      direction: "down",
    }); // DSmash
    expect(getAttackInfo(0x0ca)).toEqual({
      type: "smash",
      direction: "forward",
    }); // FSmash High
    expect(getAttackInfo(0x0cc)).toEqual({
      type: "smash",
      direction: "forward",
    }); // FSmash Mid
    expect(getAttackInfo(0x0ce)).toEqual({
      type: "smash",
      direction: "forward",
    }); // FSmash Low
  });

  it("identifies aerial attacks correctly", () => {
    expect(getAttackInfo(0x0d1)).toEqual({
      type: "aerial",
      direction: "neutral",
    }); // Nair
    expect(getAttackInfo(0x0d2)).toEqual({
      type: "aerial",
      direction: "forward",
    }); // Fair
    expect(getAttackInfo(0x0d3)).toEqual({
      type: "aerial",
      direction: "back",
    }); // Bair
    expect(getAttackInfo(0x0d4)).toEqual({
      type: "aerial",
      direction: "up",
    }); // Uair
    expect(getAttackInfo(0x0d5)).toEqual({
      type: "aerial",
      direction: "down",
    }); // Dair
    expect(getAttackInfo(0x0c0)).toEqual({
      type: "dash-attack",
      direction: "forward",
    }); // DashAttack
    expect(getAttackInfo(0x04f)).toEqual({
      type: "getup-attack",
      direction: "neutral",
    }); // DownAttackD
    expect(getAttackInfo(0x050)).toEqual({
      type: "getup-attack",
      direction: "neutral",
    }); // DownAttackU
    expect(getAttackInfo(0x05d)).toEqual({
      type: "ledge-attack",
      direction: "forward",
      subType: "quick",
    }); // CliffAttackQuick2 (active strike)
    expect(getAttackInfo(0x05f)).toEqual({
      type: "ledge-attack",
      direction: "forward",
      subType: "slow",
    }); // CliffAttackSlow2 (active strike)
  });

  it("returns null for non-attack states", () => {
    expect(getAttackInfo(0x00a)).toBeNull(); // Idle
    expect(getAttackInfo(0x0db)).toBeNull(); // LandingAirX
    expect(getAttackInfo(0x099)).toBeNull(); // Shield
    expect(getAttackInfo(0x0ab)).toBeNull(); // CapturePull
    expect(getAttackInfo(0x05c)).toBeNull(); // CliffAttackQuick1 (climbing up from ledge)
    expect(getAttackInfo(0x05e)).toBeNull(); // CliffAttackSlow1 (climbing up from ledge >=100%)
  });
});

describe("getDeathDirection", () => {
  it("identifies bottom death correctly", () => {
    expect(getDeathDirection(0x000, 0)).toBe("bottom"); // DeadD
  });

  it("identifies left and right side deaths correctly", () => {
    expect(getDeathDirection(0x001, -9050)).toBe("left"); // DeadS left
    expect(getDeathDirection(0x001, 9050)).toBe("right"); // DeadS right
  });

  it("identifies top death correctly", () => {
    expect(getDeathDirection(0x002, 0)).toBe("top"); // DeadU
  });

  it("identifies screen death correctly", () => {
    expect(getDeathDirection(0x003, 0)).toBe("screen"); // ScreenKO
    expect(getDeathDirection(0x004, 0)).toBe("screen"); // ScreenKOWait
  });

  it("returns null for non-death states", () => {
    expect(getDeathDirection(0x00a, 0)).toBeNull(); // Idle
    expect(getDeathDirection(0x01a, 0)).toBeNull(); // Fall
    expect(getDeathDirection(0x099, 0)).toBeNull(); // Shield
  });
});

describe("stageBlastZone", () => {
  it("returns correct blast zone for Dream Land", () => {
    expect(stageBlastZone(DREAM_LAND_STAGE_ID)).toEqual(DREAM_LAND_BLAST_ZONE);
    expect(DREAM_LAND_BLAST_ZONE).toEqual({
      leftX: -9000,
      rightX: 9000,
      bottomY: -3500,
      topY: 8300,
    });
  });

  it("returns undefined for unknown stage", () => {
    expect(stageBlastZone(999)).toBeUndefined();
    expect(stageBlastZone(undefined)).toBeUndefined();
  });
});

describe("getPlayerColor", () => {
  it("returns default port colors when no perspective is selected", () => {
    expect(getPlayerColor(0, null)).toBe(PORT_COLORS[0]);
    expect(getPlayerColor(1, null)).toBe(PORT_COLORS[1]);
    expect(getPlayerColor(0, undefined)).toBe(PORT_COLORS[0]);
  });

  it("returns blue for the main perspective character and grey for the opponent", () => {
    expect(getPlayerColor(0, 0)).toBe(MAIN_PLAYER_COLOR);
    expect(getPlayerColor(1, 0)).toBe(OPPONENT_COLOR);

    expect(getPlayerColor(1, 1)).toBe(MAIN_PLAYER_COLOR);
    expect(getPlayerColor(0, 1)).toBe(OPPONENT_COLOR);
  });
});

describe("isFoxCharacter", () => {
  it("identifies Fox variants correctly", () => {
    expect(isFoxCharacter(0x01)).toBe(true); // Fox
    expect(isFoxCharacter(0x0f)).toBe(true); // Polygon Fox
    expect(isFoxCharacter(0x1d)).toBe(true); // Falco
    expect(isFoxCharacter(0x29)).toBe(true); // Fox (JP)
    expect(isFoxCharacter(0x55)).toBe(true); // Polygon Falco
  });

  it("returns false for non-Fox characters", () => {
    expect(isFoxCharacter(0x00)).toBe(false); // Mario
    expect(isFoxCharacter(0x07)).toBe(false); // Falcon
    expect(isFoxCharacter(0x09)).toBe(false); // Pikachu
  });
});

describe("getFoxSpecialType", () => {
  it("identifies Fire Fox (Up-B) states correctly", () => {
    expect(getFoxSpecialType(0x01, 0x0e4)).toBe("firefox_charge");
    expect(getFoxSpecialType(0x29, 0x0e7)).toBe("firefox_charge");
    expect(getFoxSpecialType(0x01, 0x0e8)).toBe("firefox_fly");
    expect(getFoxSpecialType(0x29, 0x0ec)).toBe("firefox_fly");
    expect(getFoxSpecialType(0x01, 0x0e9)).toBe("firefox_end");
    expect(getFoxSpecialType(0x29, 0x0ea)).toBe("firefox_end");
  });

  it("identifies Reflector / Shine (Down-B) states correctly", () => {
    expect(getFoxSpecialType(0x01, 0x0f1)).toBe("shine_start");
    expect(getFoxSpecialType(0x29, 0x0f2)).toBe("shine_start");
    expect(getFoxSpecialType(0x01, 0x0f4)).toBe("shine_loop");
    expect(getFoxSpecialType(0x29, 0x0f9)).toBe("shine_loop"); // Turn
    expect(getFoxSpecialType(0x01, 0x0f5)).toBe("shine_hit");
    expect(getFoxSpecialType(0x29, 0x0f6)).toBe("shine_hit");
    expect(getFoxSpecialType(0x01, 0x0f3)).toBe("shine_end");
    expect(getFoxSpecialType(0x29, 0x0f7)).toBe("shine_end");
    expect(getFoxSpecialType(0x29, 0x0f8)).toBe("shine_end");
  });

  it("identifies Blaster (Neutral-B) blaster_gun states correctly", () => {
    expect(getFoxSpecialType(0x01, 0x0dc)).toBe("blaster_gun");
    expect(getFoxSpecialType(0x29, 0x0dd)).toBe("blaster_gun");
    expect(getFoxSpecialType(0x01, 0x0e1)).toBe("blaster_gun");
    expect(getFoxSpecialType(0x29, 0x0e2)).toBe("blaster_gun");
  });

  it("returns null for non-special states or non-Fox characters", () => {
    expect(getFoxSpecialType(0x01, 0x00a)).toBeNull(); // Idle
    expect(getFoxSpecialType(0x00, 0x0f1)).toBeNull(); // Mario in 0x0f1
  });
});

describe("isFireFoxFlightState", () => {
  it("identifies Fire Fox flight states", () => {
    expect(isFireFoxFlightState(0x0e8)).toBe(true);
    expect(isFireFoxFlightState(0x0ec)).toBe(true);
    expect(isFireFoxFlightState(0x0e4)).toBe(false);
    expect(isFireFoxFlightState(0x0f1)).toBe(false);
  });
});

describe("getFoxFlightAngle", () => {
  it("returns null when inputs are missing", () => {
    expect(getFoxFlightAngle(null, 0, 0, undefined)).toBeNull();
  });

  it("calculates correct angle when flying straight up (-PI/2 in screen coords)", () => {
    const replay = {
      gameStart: { ports: { 0: { characterId: 0x01 } } },
      frames: [
        { ports: { 0: { state: { positionX: 0, positionY: 0 } } } },
        { ports: { 0: { state: { positionX: 0, positionY: 5 } } } },
      ],
    } as unknown as Replay;
    const angle = getFoxFlightAngle(replay, 1, 0, {
      positionX: 0,
      positionY: 5,
      facingDirection: 1,
    });
    expect(angle).toBeCloseTo(-Math.PI / 2);
  });

  it("calculates correct angle when flying right (0 rad in screen coords)", () => {
    const replay = {
      gameStart: { ports: { 0: { characterId: 0x01 } } },
      frames: [
        { ports: { 0: { state: { positionX: 0, positionY: 0 } } } },
        { ports: { 0: { state: { positionX: 5, positionY: 0 } } } },
      ],
    } as unknown as Replay;
    const angle = getFoxFlightAngle(replay, 1, 0, {
      positionX: 5,
      positionY: 0,
      facingDirection: 1,
    });
    expect(angle).toBeCloseTo(0);
  });

  it("calculates correct angle when flying diagonally up-right (-PI/4 rad)", () => {
    const replay = {
      gameStart: { ports: { 0: { characterId: 0x01 } } },
      frames: [
        { ports: { 0: { state: { positionX: 0, positionY: 0 } } } },
        { ports: { 0: { state: { positionX: 5, positionY: 5 } } } },
      ],
    } as unknown as Replay;
    const angle = getFoxFlightAngle(replay, 1, 0, {
      positionX: 5,
      positionY: 5,
      facingDirection: 1,
    });
    expect(angle).toBeCloseTo(-Math.PI / 4);
  });
});

describe("isPikachuCharacter", () => {
  it("identifies all Pikachu character variants", () => {
    expect(isPikachuCharacter(0x09)).toBe(true); // Vanilla Pikachu
    expect(isPikachuCharacter(0x17)).toBe(true); // Polygon Pikachu
    expect(isPikachuCharacter(0x2d)).toBe(true); // Pikachu (EU)
    expect(isPikachuCharacter(0x32)).toBe(true); // Pikachu (JP)
    expect(isPikachuCharacter(0x00)).toBe(false); // Mario
    expect(isPikachuCharacter(0x01)).toBe(false); // Fox
  });
});

describe("isFalconCharacter", () => {
  it("identifies all Captain Falcon character variants", () => {
    expect(isFalconCharacter(0x07)).toBe(true); // Vanilla Falcon
    expect(isFalconCharacter(0x15)).toBe(true); // Polygon Falcon
    expect(isFalconCharacter(0x28)).toBe(true); // Falcon (JP)
    expect(isFalconCharacter(0x00)).toBe(false); // Mario
    expect(isFalconCharacter(0x01)).toBe(false); // Fox
    expect(isFalconCharacter(0x09)).toBe(false); // Pikachu
  });
});

describe("getFalconSpecialType", () => {
  it("identifies Falcon Punch (Neutral-B) states", () => {
    expect(getFalconSpecialType(0x07, 0x0e6)).toBe("punch");
    expect(getFalconSpecialType(0x07, 0x0e7)).toBe("punch");
  });

  it("identifies Falcon Dive (Up-B) states", () => {
    expect(getFalconSpecialType(0x07, 0x0e8)).toBe("dive_reach");
    expect(getFalconSpecialType(0x07, 0x0ea)).toBe("dive_catch");
    expect(getFalconSpecialType(0x07, 0x0ee)).toBe("dive_explosion");
  });

  it("identifies Falcon Kick (Down-B) states", () => {
    expect(getFalconSpecialType(0x07, 0x0e9)).toBe("kick_air");
    expect(getFalconSpecialType(0x07, 0x0eb)).toBe("kick");
    expect(getFalconSpecialType(0x07, 0x0ec)).toBe("kick");
    expect(getFalconSpecialType(0x07, 0x0ed)).toBe("kick_end");
  });

  it("returns null for non-Falcon or non-special states", () => {
    expect(getFalconSpecialType(0x01, 0x0e6)).toBeNull(); // Fox
    expect(getFalconSpecialType(0x07, 0x00a)).toBeNull(); // Idle
  });
});

describe("getPikachuSpecialType", () => {
  it("returns null for Thunder (Down-B) states as they are handled by real weapon markers", () => {
    expect(getPikachuSpecialType(0x09, 0x0e3)).toBeNull();
    expect(getPikachuSpecialType(0x09, 0x0e5)).toBeNull();
    expect(getPikachuSpecialType(0x32, 0x0e7)).toBeNull();
  });

  it("identifies Quick Attack (Up-B) zip states", () => {
    expect(getPikachuSpecialType(0x09, 0x0ec)).toBe("quick_attack_zip");
    expect(getPikachuSpecialType(0x09, 0x0ed)).toBe("quick_attack_zip");
  });

  it("identifies Quick Attack startup/landing states", () => {
    expect(getPikachuSpecialType(0x09, 0x0e8)).toBe("quick_attack");
    expect(getPikachuSpecialType(0x09, 0x0ea)).toBe("quick_attack");
  });

  it("returns null for non-Pikachu or non-special states", () => {
    expect(getPikachuSpecialType(0x01, 0x0e3)).toBeNull(); // Fox
    expect(getPikachuSpecialType(0x09, 0x00a)).toBeNull(); // Idle
  });
});

describe("Original 12 Character Classifiers", () => {
  it("identifies Mario variants correctly", () => {
    expect(isMarioCharacter(0x00)).toBe(true);
    expect(isMarioCharacter(0x0d)).toBe(true);
    expect(isMarioCharacter(0x0e)).toBe(true);
    expect(isMarioCharacter(0x20)).toBe(true);
    expect(isMarioCharacter(0x2a)).toBe(true);
    expect(isMarioCharacter(0x51)).toBe(true);
    expect(isMarioCharacter(0x04)).toBe(false);
  });

  it("identifies Luigi variants correctly", () => {
    expect(isLuigiCharacter(0x04)).toBe(true);
    expect(isLuigiCharacter(0x12)).toBe(true);
    expect(isLuigiCharacter(0x2b)).toBe(true);
    expect(isLuigiCharacter(0x45)).toBe(true);
    expect(isLuigiCharacter(0x4b)).toBe(true);
    expect(isLuigiCharacter(0x00)).toBe(false);
  });

  it("identifies Donkey Kong variants correctly", () => {
    expect(isDonkeyKongCharacter(0x02)).toBe(true);
    expect(isDonkeyKongCharacter(0x10)).toBe(true);
    expect(isDonkeyKongCharacter(0x1a)).toBe(true);
    expect(isDonkeyKongCharacter(0x2c)).toBe(true);
    expect(isDonkeyKongCharacter(0x00)).toBe(false);
  });

  it("identifies Samus variants correctly", () => {
    expect(isSamusCharacter(0x03)).toBe(true);
    expect(isSamusCharacter(0x11)).toBe(true);
    expect(isSamusCharacter(0x22)).toBe(true);
    expect(isSamusCharacter(0x24)).toBe(true);
    expect(isSamusCharacter(0x33)).toBe(true);
    expect(isSamusCharacter(0x57)).toBe(true);
    expect(isSamusCharacter(0x00)).toBe(false);
  });

  it("identifies Link variants correctly", () => {
    expect(isLinkCharacter(0x05)).toBe(true);
    expect(isLinkCharacter(0x13)).toBe(true);
    expect(isLinkCharacter(0x1f)).toBe(true);
    expect(isLinkCharacter(0x23)).toBe(true);
    expect(isLinkCharacter(0x27)).toBe(true);
    expect(isLinkCharacter(0x5b)).toBe(true);
    expect(isLinkCharacter(0x00)).toBe(false);
  });

  it("identifies Yoshi variants correctly", () => {
    expect(isYoshiCharacter(0x06)).toBe(true);
    expect(isYoshiCharacter(0x14)).toBe(true);
    expect(isYoshiCharacter(0x31)).toBe(true);
    expect(isYoshiCharacter(0x00)).toBe(false);
  });

  it("identifies Kirby variants correctly", () => {
    expect(isKirbyCharacter(0x08)).toBe(true);
    expect(isKirbyCharacter(0x16)).toBe(true);
    expect(isKirbyCharacter(0x30)).toBe(true);
    expect(isKirbyCharacter(0x00)).toBe(false);
  });

  it("identifies Jigglypuff variants correctly", () => {
    expect(isJigglypuffCharacter(0x0a)).toBe(true);
    expect(isJigglypuffCharacter(0x18)).toBe(true);
    expect(isJigglypuffCharacter(0x2e)).toBe(true);
    expect(isJigglypuffCharacter(0x2f)).toBe(true);
    expect(isJigglypuffCharacter(0x00)).toBe(false);
  });

  it("identifies Ness variants correctly", () => {
    expect(isNessCharacter(0x0b)).toBe(true);
    expect(isNessCharacter(0x19)).toBe(true);
    expect(isNessCharacter(0x25)).toBe(true);
    expect(isNessCharacter(0x26)).toBe(true);
    expect(isNessCharacter(0x4e)).toBe(true);
    expect(isNessCharacter(0x00)).toBe(false);
  });

  it("identifies Bowser variants correctly", () => {
    expect(isBowserCharacter(0x34)).toBe(true);
    expect(isBowserCharacter(0x35)).toBe(true);
    expect(isBowserCharacter(0x4f)).toBe(true);
    expect(isBowserCharacter(0x00)).toBe(false);
  });
});

describe("toGrayscale", () => {
  it("converts hex colors to grayscale luminance values", () => {
    expect(toGrayscale("#ffffff")).toBe("rgb(255, 255, 255)");
    expect(toGrayscale("#000000")).toBe("rgb(0, 0, 0)");
    const yellow = toGrayscale("#facc15");
    expect(yellow).toMatch(/^rgb\((\d+),\s*\1,\s*\1\)$/);
  });

  it("converts rgba colors and preserves alpha", () => {
    expect(toGrayscale("rgba(255, 0, 0, 0.5)")).toBe("rgba(76, 76, 76, 0.5)");
  });

  it("converts hsl colors to 0% saturation", () => {
    expect(toGrayscale("hsl(120, 85%, 55%)")).toBe("hsl(0, 0%, 55%)");
  });
});

describe("toBlandPalette", () => {
  it("converts hex colors to a muted, bland palette preserving hue nuance", () => {
    expect(toBlandPalette("#ffffff")).toBe("rgb(255, 255, 255)");
    expect(toBlandPalette("#000000")).toBe("rgb(0, 0, 0)");
    // Yellow should still retain warm red/green bias rather than pure identical gray channels
    const yellow = toBlandPalette("#facc15");
    expect(yellow).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
    const match = yellow.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    expect(match).toBeTruthy();
    const r = parseInt(match![1]!, 10);
    const g = parseInt(match![2]!, 10);
    const b = parseInt(match![3]!, 10);
    expect(r).toBeGreaterThan(b);
    expect(g).toBeGreaterThan(b);
  });

  it("preserves alpha for rgba strings", () => {
    expect(toBlandPalette("rgba(255, 0, 0, 0.5)")).toMatch(
      /^rgba\(\d+,\s*\d+,\s*\d+,\s*0\.5\)$/,
    );
  });

  it("reduces saturation for hsl strings to 35% of original", () => {
    expect(toBlandPalette("hsl(120, 80%, 50%)")).toBe("hsl(120, 28%, 50%)");
  });
});

describe("getStartNameAlpha", () => {
  it("returns 1.0 during the solid display window at match start", () => {
    expect(getStartNameAlpha(0)).toBe(1);
    expect(getStartNameAlpha(60)).toBe(1);
    expect(getStartNameAlpha(120)).toBe(1);
    expect(getStartNameAlpha(START_NAME_SOLID_FRAMES)).toBe(1);
  });

  it("smoothly fades out between solid frames and total display frames", () => {
    // Midway through fade: frame 210 = (240 - 210) / 60 = 0.5
    expect(getStartNameAlpha(210)).toBeCloseTo(0.5);
    // Right near the end of fade: frame 234 = (240 - 234) / 60 = 0.1
    expect(getStartNameAlpha(234)).toBeCloseTo(0.1);
  });

  it("returns 0 after the display window or for undefined/negative frames", () => {
    expect(getStartNameAlpha(START_NAME_DISPLAY_FRAMES)).toBe(0);
    expect(getStartNameAlpha(300)).toBe(0);
    expect(getStartNameAlpha(1000)).toBe(0);
    expect(getStartNameAlpha(undefined)).toBe(0);
    expect(getStartNameAlpha(-1)).toBe(0);
  });
});

describe("isDizzyState", () => {
  it("identifies shield-broken dizzy, air fly/fall, and stun states correctly", () => {
    expect(isDizzyState(0x09e)).toBe(true); // ShieldBreakFly
    expect(isDizzyState(0x09f)).toBe(true); // ShieldBreakFall
    expect(isDizzyState(0x0a1)).toBe(true); // ShieldBreakStand
    expect(isDizzyState(0x0a2)).toBe(true); // FuraFura
    expect(isDizzyState(0x0a4)).toBe(true); // Stun
  });

  it("returns false for non-dizzy states", () => {
    expect(isDizzyState(0x00a)).toBe(false); // Idle
    expect(isDizzyState(0x099)).toBe(false); // Shield
    expect(isDizzyState(0x01a)).toBe(false); // Fall
  });
});

describe("isShieldBreakActionState", () => {
  it("identifies full shield break lifecycle states correctly", () => {
    expect(isShieldBreakActionState(0x09e)).toBe(true); // ShieldBreakFly
    expect(isShieldBreakActionState(0x09f)).toBe(true); // ShieldBreakFall
    expect(isShieldBreakActionState(0x0a0)).toBe(true); // ShieldBreakDownBound
    expect(isShieldBreakActionState(0x0a1)).toBe(true); // ShieldBreakStand
    expect(isShieldBreakActionState(0x0a2)).toBe(true); // FuraFura
    expect(isShieldBreakActionState(0x0a4)).toBe(true); // Stun
  });

  it("returns false for normal shield or attack states", () => {
    expect(isShieldBreakActionState(0x098)).toBe(false); // ShieldOn
    expect(isShieldBreakActionState(0x099)).toBe(false); // Shield
    expect(isShieldBreakActionState(0x0be)).toBe(false); // Jab1
  });
});

describe("isSleepState", () => {
  it("identifies sleeping state correctly", () => {
    expect(isSleepState(0x0a5)).toBe(true); // Sleep
    expect(isSleepState(0x00a)).toBe(false); // Idle
  });
});

describe("Tech and Roll state helpers", () => {
  it("distinguishes tech rolls from normal shield rolls", () => {
    // Tech rolls
    expect(isTechRollState(0x049)).toBe(true); // TechF
    expect(isTechRollState(0x04a)).toBe(true); // TechB
    expect(isTechRollState(0x09c)).toBe(false); // Normal RollF
    expect(isTechRollState(0x09d)).toBe(false); // Normal RollB

    // Normal rolls
    expect(isNormalRollState(0x09c)).toBe(true); // RollF
    expect(isNormalRollState(0x09d)).toBe(true); // RollB
    expect(isNormalRollState(0x049)).toBe(false); // TechF
    expect(isNormalRollState(0x04a)).toBe(false); // TechB

    // Tech in place
    expect(isTechInPlaceState(0x051)).toBe(true); // Tech
    expect(isTechInPlaceState(0x04b)).toBe(true); // TechWall
    expect(isTechInPlaceState(0x04c)).toBe(true); // TechCeil
    expect(isTechInPlaceState(0x049)).toBe(false); // TechF

    // Ground tech in place (0x051)
    expect(isGroundTechInPlaceState(0x051)).toBe(true); // Tech ground in place
    expect(isGroundTechInPlaceState(0x04b)).toBe(false); // TechWall
    expect(isGroundTechInPlaceState(0x04c)).toBe(false); // TechCeil
    expect(isGroundTechInPlaceState(0x049)).toBe(false); // TechF

    // Dash attack (0x0c0)
    expect(isDashAttackState(0x0c0)).toBe(true);
    expect(isDashAttackState(0x00a)).toBe(false);
  });
});

describe("Tumble state helper", () => {
  it("identifies tumble and reeling damage flight states correctly", () => {
    expect(isTumbleState(0x039)).toBe(true); // Tumble
    expect(isTumbleState(0x037)).toBe(true); // DamageFlyRoll
    expect(isTumbleState(0x033)).toBe(true); // DamageFlyHigh
    expect(isTumbleState(0x00a)).toBe(false); // Idle
    expect(isTumbleState(0x01a)).toBe(false); // Normal Fall
  });
});

describe("Missed Tech and Prone state helpers", () => {
  it("identifies ground bounces and missed tech prone states", () => {
    // Ground bound bounces
    expect(isDownBoundState(0x043)).toBe(true); // DownBoundD
    expect(isDownBoundState(0x04a)).toBe(true); // DownBoundU
    expect(isDownBoundState(0x0a0)).toBe(true); // ShieldBreakDownBound

    // Prone on floor
    expect(isProneState(0x044)).toBe(true); // DownWaitD
    expect(isProneState(0x04c)).toBe(true); // DownWaitU

    // Full missed tech lifecycle
    expect(isMissedTechState(0x044)).toBe(true); // DownWaitD
    expect(isMissedTechState(0x045)).toBe(true); // DownStandD
    expect(isMissedTechState(0x047)).toBe(true); // DownForwardD
    expect(isMissedTechState(0x04f)).toBe(true); // DownAttackD
    expect(isMissedTechState(0x00a)).toBe(false); // Idle
  });
});

describe("ShieldBreak Dizzy in air states", () => {
  it("treats ShieldBreakFly and ShieldBreakFall as dizzy states for swaying animation", () => {
    expect(isDizzyState(0x09e)).toBe(true); // ShieldBreakFly
    expect(isDizzyState(0x09f)).toBe(true); // ShieldBreakFall
    expect(isDizzyState(0x0a1)).toBe(true); // ShieldBreakStand
    expect(isDizzyState(0x0a2)).toBe(true); // FuraFura
  });
});

describe("getYoshiSpecialType", () => {
  it("classifies Yoshi special moves correctly", () => {
    expect(getYoshiSpecialType(0x06, 0x0df)).toBe("egg_lay_tongue");
    expect(getYoshiSpecialType(0x06, 0x0e0)).toBe("egg_lay_tongue");
    expect(getYoshiSpecialType(0x06, 0x0e4)).toBe("yoshi_bomb_start");
    expect(getYoshiSpecialType(0x06, 0x0e5)).toBe("yoshi_bomb_plummet");
    expect(getYoshiSpecialType(0x06, 0x0e6)).toBe("yoshi_bomb_plummet");
    expect(getYoshiSpecialType(0x06, 0x00a)).toBeNull(); // Idle
  });

  it("classifies 0x0de as the grounded egg throw (confirmed empirically, previously unmapped)", () => {
    expect(getYoshiSpecialType(0x06, 0x0de)).toBe("egg_throw");
  });

  it("classifies 0x0e2 as the aerial Down-B (hip drop) phase, not egg throw (confirmed empirically - previously misclassified as egg throw)", () => {
    expect(getYoshiSpecialType(0x06, 0x0e2)).toBe("yoshi_bomb_plummet");
  });

  it("classifies 0x0e1 as the Down-B landing, not egg lay (confirmed empirically - previously misclassified as egg lay tongue)", () => {
    expect(getYoshiSpecialType(0x06, 0x0e1)).toBe("yoshi_bomb_land");
  });

  it("classifies 0x0e7 as the egg lay tongue grab, not Down-B landing (confirmed empirically - previously misclassified as yoshi_bomb_land)", () => {
    expect(getYoshiSpecialType(0x06, 0x0e7)).toBe("egg_lay_tongue");
  });
});

describe("getDKSpecialType", () => {
  it("classifies Donkey Kong special moves correctly", () => {
    expect(getDKSpecialType(0x02, 0x0e6)).toBe("spinning_kong");
    expect(getDKSpecialType(0x02, 0x0e7)).toBe("spinning_kong");
    expect(getDKSpecialType(0x02, 0x0e8)).toBe("hand_slap");
    expect(getDKSpecialType(0x02, 0x0e9)).toBe("hand_slap");
    expect(getDKSpecialType(0x02, 0x0ea)).toBe("hand_slap");
    expect(getDKSpecialType(0x02, 0x0e0)).toBe("giant_punch_windup");
    expect(getDKSpecialType(0x02, 0x0e1)).toBe("giant_punch_windup");
    expect(getDKSpecialType(0x02, 0x0eb)).toBe("giant_punch_windup");
    expect(getDKSpecialType(0x02, 0x0e2)).toBe("giant_punch");
    expect(getDKSpecialType(0x02, 0x0e3)).toBe("giant_punch");
    expect(getDKSpecialType(0x02, 0x0e4)).toBe("giant_punch");
    expect(getDKSpecialType(0x02, 0x0e5)).toBe("giant_punch");
    expect(getDKSpecialType(0x02, 0x0ec)).toBe("giant_punch");
    expect(getDKSpecialType(0x02, 0x00a)).toBeNull(); // Idle
  });
});

describe("getNessSpecialType", () => {
  it("classifies Ness special moves correctly", () => {
    // PK Fire (0x0e7) returns null - the recorded Weapon object (WPKind.PKFire)
    // gets its own marker instead.
    expect(getNessSpecialType(0x0b, 0x0e7)).toBeNull();
    expect(getNessSpecialType(0x0b, 0x0e8)).toBe("pk_thunder_charge");
    expect(getNessSpecialType(0x0b, 0x0e9)).toBe("pk_thunder_charge");
    expect(getNessSpecialType(0x0b, 0x0ea)).toBe("pk_thunder_rocket");
    expect(getNessSpecialType(0x0b, 0x0eb)).toBe("psi_magnet");
    expect(getNessSpecialType(0x0b, 0x0ed)).toBe("psi_magnet");
    expect(getNessSpecialType(0x0b, 0x00a)).toBeNull(); // Idle
  });

  it("classifies 0x0ec (PK Fire 2) as returning null (handled as real Weapon object), not PSI Magnet", () => {
    expect(getNessSpecialType(0x0b, 0x0ec)).toBeNull();
  });

  it("returns null for 0x0e6 (landing lag after PK Fire 2, not the active move - confirmed empirically, previously misclassified as PK Fire)", () => {
    expect(getNessSpecialType(0x0b, 0x0e6)).toBeNull();
  });
});

describe("canAngleAttack", () => {
  it("allows Fox, Falcon, and Samus to angle forward tilt attacks", () => {
    expect(canAngleAttack(0x01, { type: "tilt", direction: "forward" })).toBe(
      true,
    ); // Fox
    expect(canAngleAttack(0x07, { type: "tilt", direction: "forward" })).toBe(
      true,
    ); // Falcon
    expect(canAngleAttack(0x03, { type: "tilt", direction: "forward" })).toBe(
      true,
    ); // Samus
    expect(canAngleAttack(0x00, { type: "tilt", direction: "forward" })).toBe(
      false,
    ); // Mario
    expect(canAngleAttack(0x09, { type: "tilt", direction: "forward" })).toBe(
      false,
    ); // Pikachu
    expect(canAngleAttack(0x0b, { type: "tilt", direction: "forward" })).toBe(
      false,
    ); // Ness
  });

  it("allows Falcon and Samus to angle forward smash attacks", () => {
    expect(canAngleAttack(0x07, { type: "smash", direction: "forward" })).toBe(
      true,
    ); // Falcon
    expect(canAngleAttack(0x03, { type: "smash", direction: "forward" })).toBe(
      true,
    ); // Samus
    expect(canAngleAttack(0x01, { type: "smash", direction: "forward" })).toBe(
      false,
    ); // Fox cannot angle FSmash
    expect(canAngleAttack(0x00, { type: "smash", direction: "forward" })).toBe(
      false,
    ); // Mario
    expect(canAngleAttack(0x02, { type: "smash", direction: "forward" })).toBe(
      false,
    ); // DK
  });

  it("disallows non-forward tilts and non-forward smashes from angling", () => {
    expect(canAngleAttack(0x07, { type: "tilt", direction: "up" })).toBe(false); // UTilt
    expect(canAngleAttack(0x07, { type: "tilt", direction: "down" })).toBe(
      false,
    ); // DTilt
    expect(canAngleAttack(0x07, { type: "smash", direction: "up" })).toBe(
      false,
    ); // USmash
    expect(canAngleAttack(0x03, { type: "smash", direction: "down" })).toBe(
      false,
    ); // DSmash
  });

  it("disallows jabs and aerials from angling", () => {
    expect(canAngleAttack(0x07, { type: "jab", direction: "forward" })).toBe(
      false,
    );
    expect(canAngleAttack(0x03, { type: "aerial", direction: "forward" })).toBe(
      false,
    );
  });
});

describe("getMarioSpecialType", () => {
  it("classifies Mario / Luigi special moves correctly", () => {
    // Fireball startup/throw states return null - the real recorded Weapon object
    // (WPKind.Fireball) gets its own marker instead.
    expect(getMarioSpecialType(0x00, 0x0dc)).toBeNull();
    expect(getMarioSpecialType(0x04, 0x0dd)).toBeNull();
    // Super Jump Punch
    expect(getMarioSpecialType(0x00, 0x0df)).toBe("super_jump_punch");
    // Tornado / Cyclone
    expect(getMarioSpecialType(0x00, 0x0e3)).toBe("tornado");
    expect(getMarioSpecialType(0x04, 0x0e4)).toBe("tornado");
  });

  it("classifies 0x0e0 (fireball throw) and Luigi's 0x0df (landing lag) as no synthetic special to draw here", () => {
    expect(getMarioSpecialType(0x00, 0x0e0)).toBeNull(); // Mario throw
    expect(getMarioSpecialType(0x04, 0x0e0)).toBeNull(); // Luigi throw
    expect(getMarioSpecialType(0x04, 0x0df)).toBeNull(); // Luigi landing lag
  });

  it("returns null for non-Mario/Luigi or non-special states", () => {
    expect(getMarioSpecialType(0x00, 0x00a)).toBeNull(); // Idle
    expect(getMarioSpecialType(0x01, 0x0dc)).toBeNull(); // Fox
  });
});

describe("getSamusSpecialType", () => {
  it("classifies Samus special moves correctly", () => {
    expect(getSamusSpecialType(0x03, 0x0dc)).toBe("charge_shot");
    expect(getSamusSpecialType(0x03, 0x0e3)).toBe("screw_attack");
    // Bomb (Down-B) - no synthetic animation anymore, the real recorded
    // Weapon object (WPKind.SamusBomb) gets its own marker instead.
    expect(getSamusSpecialType(0x03, 0x0e8)).toBeNull();
  });

  it("returns null for non-Samus or non-special states", () => {
    expect(getSamusSpecialType(0x03, 0x00a)).toBeNull(); // Idle
    expect(getSamusSpecialType(0x00, 0x0dc)).toBeNull(); // Mario
  });

  it("classifies 0x0df as charging (confirmed empirically, previously unmapped)", () => {
    expect(getSamusSpecialType(0x03, 0x0df)).toBe("charge_shot");
  });

  it("classifies 0x0de as the charge-shot startup (drawing the arm cannon out), distinct from charging (confirmed empirically - previously misclassified as a firing animation)", () => {
    expect(getSamusSpecialType(0x03, 0x0de)).toBe("charge_shot_startup");
  });

  it("classifies 0x0e3 (ground) and 0x0e4 (air) as screw attack (confirmed empirically, previously unmapped)", () => {
    expect(getSamusSpecialType(0x03, 0x0e3)).toBe("screw_attack");
    expect(getSamusSpecialType(0x03, 0x0e4)).toBe("screw_attack");
  });

  it("returns null for 0x0e6 (Down-B bomb - synthetic animation removed in favor of real WPKind.SamusBomb)", () => {
    expect(getSamusSpecialType(0x03, 0x0e6)).toBeNull();
  });

  it("classifies 0x0e2 as firing the charged shot while airborne (confirmed empirically, previously unmapped)", () => {
    expect(getSamusSpecialType(0x03, 0x0e2)).toBe("charge_shot_fire");
  });

  it("returns null for 0x0e5 (landing after dropping the bomb, not a special move - confirmed empirically, previously misclassified as screw attack)", () => {
    expect(getSamusSpecialType(0x03, 0x0e5)).toBeNull();
  });
});

describe("getLinkSpecialType", () => {
  it("classifies Link special moves correctly", () => {
    // Boomerang charge/wind-up - no synthetic animation anymore, the real
    // recorded Weapon object (WPKind.Boomerang) gets its own marker instead.
    expect(getLinkSpecialType(0x05, 0x0dc)).toBeNull();
    expect(getLinkSpecialType(0x05, 0x0e6)).toBe("spin_attack");
    expect(getLinkSpecialType(0x05, 0x0e9)).toBe("bomb");
  });

  it("returns null for non-Link or non-special states", () => {
    expect(getLinkSpecialType(0x05, 0x00a)).toBeNull(); // Idle
    expect(getLinkSpecialType(0x01, 0x0dc)).toBeNull(); // Fox
  });

  it("classifies 0x0e5 and 0x0e8 (the boomerang throw, confirmed empirically - ground and air use the same animation) as no special move to draw here anymore, distinct from spin attack", () => {
    // Both used to draw the boomerang animation here; now that the real
    // Weapon marker handles it, they draw nothing in drawLinkSpecial - but
    // they must still NOT fall through to spin_attack.
    expect(getLinkSpecialType(0x05, 0x0e5)).toBeNull();
    expect(getLinkSpecialType(0x05, 0x0e8)).toBeNull();
  });

  it("classifies 0x0e2 as the grounded spin attack and 0x0e4 as the aerial spin attack (confirmed empirically, previously unmapped)", () => {
    expect(getLinkSpecialType(0x05, 0x0e2)).toBe("spin_attack");
    expect(getLinkSpecialType(0x05, 0x0e4)).toBe("spin_attack");
  });

  it("classifies 0x0ec as pulling out a bomb in the air, and 0x74 as throwing the held bomb (confirmed empirically, previously unmapped)", () => {
    expect(getLinkSpecialType(0x05, 0x0ec)).toBe("bomb");
    expect(getLinkSpecialType(0x05, 0x074)).toBe("bomb");
  });
});

describe("getKirbySpecialType", () => {
  it("classifies Kirby special moves correctly", () => {
    expect(getKirbySpecialType(0x08, 0x0dc)).toBe("inhale");
    expect(getKirbySpecialType(0x08, 0x0e5)).toBe("final_cutter");
    expect(getKirbySpecialType(0x08, 0x101)).toBe("final_cutter");
    expect(getKirbySpecialType(0x08, 0x102)).toBe("final_cutter");
    expect(getKirbySpecialType(0x08, 0x103)).toBe("final_cutter");
    expect(getKirbySpecialType(0x08, 0x0e9)).toBe("stone");
  });

  it("returns null for non-Kirby, non-special states, or Kirby midair jumps (0x0df - 0x0e4)", () => {
    expect(getKirbySpecialType(0x08, 0x00a)).toBeNull(); // Idle
    expect(getKirbySpecialType(0x08, 0x0df)).toBeNull(); // Jump 2
    expect(getKirbySpecialType(0x08, 0x0e0)).toBeNull(); // Jump 3
    expect(getKirbySpecialType(0x08, 0x0e1)).toBeNull(); // Jump 4
    expect(getKirbySpecialType(0x07, 0x0dc)).toBeNull(); // Falcon
  });
});

describe("getJigglypuffSpecialType", () => {
  it("classifies Jigglypuff special moves correctly", () => {
    // Pound variations (0x0dc, 0x0dd, 0x0e6 - 0x0e8)
    expect(getJigglypuffSpecialType(0x0a, 0x0dc)).toBe("pound");
    expect(getJigglypuffSpecialType(0x0a, 0x0dd)).toBe("pound");
    expect(getJigglypuffSpecialType(0x0a, 0x0e7)).toBe("pound");

    // Sing (0x0e3 - 0x0e5)
    expect(getJigglypuffSpecialType(0x0a, 0x0e3)).toBe("sing");
    expect(getJigglypuffSpecialType(0x0a, 0x0e4)).toBe("sing");

    // Rest (0x0e9 - 0x0eb)
    expect(getJigglypuffSpecialType(0x0a, 0x0ea)).toBe("rest");
    expect(getJigglypuffSpecialType(0x0a, 0x0eb)).toBe("rest");
  });

  it("returns null for non-Jigglypuff or non-special states", () => {
    expect(getJigglypuffSpecialType(0x0a, 0x00a)).toBeNull(); // Idle
    expect(getJigglypuffSpecialType(0x02, 0x0dc)).toBeNull(); // DK
  });

  it("returns null for 0x0df, 0x0e0, 0x0e1, 0x0e2 (just extra mid-air jumps, not special moves - confirmed empirically, previously misclassified as Pound/Sing)", () => {
    expect(getJigglypuffSpecialType(0x0a, 0x0df)).toBeNull();
    expect(getJigglypuffSpecialType(0x0a, 0x0e0)).toBeNull();
    expect(getJigglypuffSpecialType(0x0a, 0x0e1)).toBeNull();
    expect(getJigglypuffSpecialType(0x0a, 0x0e2)).toBeNull();
  });
});

describe("Fox Blaster and Yoshi Egg Throw", () => {
  it("classifies Fox Blaster stance as blaster_gun", () => {
    expect(getFoxSpecialType(0x01, 0x0dc)).toBe("blaster_gun");
    expect(getFoxSpecialType(0x01, 0x0e1)).toBe("blaster_gun");
  });

  it("classifies Yoshi Egg Throw correctly", () => {
    expect(getYoshiSpecialType(0x06, 0x0de)).toBe("egg_throw");
    expect(getYoshiSpecialType(0x06, 0x0e3)).toBe("egg_throw");
  });
});

describe("computeLedgeGrabCandidates", () => {
  function makePre(port: PortIndex, frameNum: number): InputFrame {
    return { frame: frameNum, port, buttons: 0, stickX: 0, stickY: 0 };
  }

  function makePost(
    overrides: Partial<StateFrame> & { port: PortIndex },
  ): StateFrame {
    return {
      frame: 0,
      characterId: 0x01, // Fox
      actionStateId: 0x01a, // Fall (generic airborne, non-dead)
      positionX: 0,
      positionY: 0,
      facingDirection: 1,
      velocityX: 0,
      velocityY: 0,
      damagePercent: 0,
      stocksRemaining: 2,
      jumpsRemaining: 1,
      grounded: false,
      hurtboxState: 0,
      hitstunCounter: 0,
      actionFrameCounter: 0,
      comboHitCount: 0,
      comboDamage: 0,
      ...overrides,
    };
  }

  function makeFrame(frameNum: number, posts: StateFrame[]): Frame {
    const ports: { -readonly [K in PortIndex]?: Frame["ports"][K] } = {};
    for (const post of posts) {
      ports[post.port] = { input: makePre(post.port, frameNum), state: post };
    }
    return { frame: frameNum, ports };
  }

  /** A minimal Replay stub - computeLedgeGrabCandidates only ever reads `.frames`. */
  function makeReplay(frames: Frame[]): Replay {
    return { frames } as unknown as Replay;
  }

  /** A replay where every frame has the same single port/post (constant condition), for fade-ramp tests. */
  function makeSteadyReplay(
    frameCount: number,
    post: Omit<StateFrame, "frame">,
  ): Replay {
    return makeReplay(
      Array.from({ length: frameCount }, (_, i) =>
        makeFrame(i, [makePost({ ...post, frame: i })]),
      ),
    );
  }

  // Dream Land ground: leftX -2318, rightX 2318, y 0 (see stageGeometry.ts)
  const RIGHT_EDGE_X = 2318;
  const LEFT_EDGE_X = -2318;
  const FOX_OFF_RIGHT_EDGE: Omit<StateFrame, "frame"> = {
    port: 0 as PortIndex,
    characterId: 0x01, // Fox: reachX 400, heightY 400
    actionStateId: 0x01a, // Fall
    positionX: RIGHT_EDGE_X + 122,
    positionY: 0,
    facingDirection: -1, // facing left, toward the stage
    velocityX: 0,
    velocityY: 0,
    damagePercent: 0,
    stocksRemaining: 2,
    jumpsRemaining: 1,
    grounded: false,
    hurtboxState: 0,
    hitstunCounter: 0,
    actionFrameCounter: 0,
    comboHitCount: 0,
    comboDamage: 0,
  };

  it("produces no candidates when no stage geometry is known", () => {
    const replay = makeReplay([
      makeFrame(0, [
        makePost({ port: 0 as PortIndex, positionX: RIGHT_EDGE_X + 500 }),
      ]),
    ]);
    expect(
      computeLedgeGrabCandidates(replay, 0, 0xff /* unknown stage */),
    ).toEqual([]);
  });

  it("produces no candidate for a character still on-stage horizontally", () => {
    const replay = makeReplay([
      makeFrame(0, [makePost({ port: 0 as PortIndex, positionX: 0 })]),
    ]);
    expect(computeLedgeGrabCandidates(replay, 0, DREAM_LAND_STAGE_ID)).toEqual(
      [],
    );
  });

  it("produces no candidate when off-stage but beyond the (2400-unit) proximity threshold", () => {
    const replay = makeReplay([
      makeFrame(0, [
        makePost({ port: 0 as PortIndex, positionX: RIGHT_EDGE_X + 2401 }),
      ]),
    ]);
    expect(computeLedgeGrabCandidates(replay, 0, DREAM_LAND_STAGE_ID)).toEqual(
      [],
    );
  });

  it("produces no candidate exactly on the edge, but does one unit past it", () => {
    const onEdge = makeReplay([
      makeFrame(0, [
        makePost({ port: 0 as PortIndex, positionX: RIGHT_EDGE_X }),
      ]),
    ]);
    expect(computeLedgeGrabCandidates(onEdge, 0, DREAM_LAND_STAGE_ID)).toEqual(
      [],
    );

    const pastEdge = makeReplay([
      makeFrame(0, [
        makePost({ port: 0 as PortIndex, positionX: RIGHT_EDGE_X + 1 }),
      ]),
    ]);
    expect(
      computeLedgeGrabCandidates(pastEdge, 0, DREAM_LAND_STAGE_ID),
    ).toHaveLength(1);
  });

  it("produces no candidate for a dead/off-screen state", () => {
    const replay = makeReplay([
      makeFrame(0, [
        makePost({
          port: 0 as PortIndex,
          positionX: RIGHT_EDGE_X + 500,
          actionStateId: 0x000, // DeadD - see DEAD_ACTION_STATES
        }),
      ]),
    ]);
    expect(computeLedgeGrabCandidates(replay, 0, DREAM_LAND_STAGE_ID)).toEqual(
      [],
    );
  });

  it("produces no candidate for a grounded character, even past the measured edge (real bug report: standing at 2318 wrongly triggered)", () => {
    const replay = makeReplay([
      makeFrame(0, [
        makePost({
          port: 0 as PortIndex,
          positionX: 2318,
          positionY: 0,
          grounded: true,
        }),
      ]),
    ]);
    expect(computeLedgeGrabCandidates(replay, 0, DREAM_LAND_STAGE_ID)).toEqual(
      [],
    );
  });

  it("produces no candidate once the ledge has actually been grabbed (CliffCatch/LEDGE_ACTION_STATES)", () => {
    const replay = makeReplay([
      makeFrame(0, [
        makePost({
          port: 0 as PortIndex,
          positionX: RIGHT_EDGE_X + 20,
          actionStateId: 0x054, // CliffCatch
        }),
      ]),
    ]);
    expect(computeLedgeGrabCandidates(replay, 0, DREAM_LAND_STAGE_ID)).toEqual(
      [],
    );
  });

  it("produces no candidate for a character with no known ledge-grab offset", () => {
    const replay = makeReplay([
      makeFrame(0, [
        makePost({
          port: 0 as PortIndex,
          positionX: RIGHT_EDGE_X + 500,
          characterId: 0xff, // no fighter has this ID
        }),
      ]),
    ]);
    expect(computeLedgeGrabCandidates(replay, 0, DREAM_LAND_STAGE_ID)).toEqual(
      [],
    );
  });

  it("computes the reach-offset dot for a character off the right edge, facing the stage, at full alpha once held long enough", () => {
    const replay = makeSteadyReplay(LEDGE_GRAB_FADE_FRAMES, FOX_OFF_RIGHT_EDGE);
    const candidates = computeLedgeGrabCandidates(
      replay,
      LEDGE_GRAB_FADE_FRAMES - 1,
      DREAM_LAND_STAGE_ID,
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toEqual({
      port: 0,
      edgeSide: "right",
      dotWorldX: RIGHT_EDGE_X + 122 - 400,
      dotWorldY: 400,
      alpha: 1,
    });
  });

  it("computes the reach-offset dot for a character off the left edge, facing the stage", () => {
    const replay = makeSteadyReplay(LEDGE_GRAB_FADE_FRAMES, {
      port: 1 as PortIndex,
      characterId: 0x05, // Link: reachX 280, heightY 400
      actionStateId: 0x01a,
      positionX: LEFT_EDGE_X - 200,
      positionY: 0,
      facingDirection: 1, // facing right, toward the stage
      velocityX: 0,
      velocityY: 0,
      damagePercent: 0,
      stocksRemaining: 2,
      jumpsRemaining: 1,
      grounded: false,
      hurtboxState: 0,
      hitstunCounter: 0,
      actionFrameCounter: 0,
      comboHitCount: 0,
      comboDamage: 0,
    });
    const candidates = computeLedgeGrabCandidates(
      replay,
      LEDGE_GRAB_FADE_FRAMES - 1,
      DREAM_LAND_STAGE_ID,
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      port: 1,
      edgeSide: "left",
      dotWorldX: LEFT_EDGE_X - 200 + 280,
      dotWorldY: 400,
    });
  });

  it("puts the dot on the away-from-stage side when facing away", () => {
    const replay = makeSteadyReplay(1, {
      ...FOX_OFF_RIGHT_EDGE,
      positionX: RIGHT_EDGE_X + 100,
      facingDirection: 1, // facing right, away from the stage
    });
    const candidates = computeLedgeGrabCandidates(
      replay,
      0,
      DREAM_LAND_STAGE_ID,
    );
    expect(candidates[0]?.dotWorldX).toBe(RIGHT_EDGE_X + 100 + 400);
  });

  it("applies the same offset for a Japanese-region character variant as the base fighter", () => {
    const replay = makeSteadyReplay(1, {
      ...FOX_OFF_RIGHT_EDGE,
      characterId: 0x29, // Fox (JP) - same offset as base Fox
      positionX: RIGHT_EDGE_X + 100,
    });
    const candidates = computeLedgeGrabCandidates(
      replay,
      0,
      DREAM_LAND_STAGE_ID,
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.dotWorldX).toBe(RIGHT_EDGE_X + 100 - 400);
  });

  it("handles two seated ports independently, one per edge", () => {
    const replay = makeReplay([
      makeFrame(0, [
        makePost({
          port: 0 as PortIndex,
          characterId: 0x01, // Fox
          positionX: RIGHT_EDGE_X + 100,
          facingDirection: -1,
        }),
        makePost({
          port: 1 as PortIndex,
          characterId: 0x05, // Link
          positionX: LEFT_EDGE_X - 100,
          facingDirection: 1,
        }),
      ]),
    ]);
    const candidates = computeLedgeGrabCandidates(
      replay,
      0,
      DREAM_LAND_STAGE_ID,
    );
    expect(candidates).toHaveLength(2);
    expect(candidates.map((c) => c.edgeSide).sort()).toEqual(["left", "right"]);
  });

  it("fades in gradually rather than snapping to full opacity on the first active frame", () => {
    const replay = makeSteadyReplay(3, FOX_OFF_RIGHT_EDGE);
    const alphaAtFrame0 = computeLedgeGrabCandidates(
      replay,
      0,
      DREAM_LAND_STAGE_ID,
    )[0]?.alpha;
    const alphaAtFrame2 = computeLedgeGrabCandidates(
      replay,
      2,
      DREAM_LAND_STAGE_ID,
    )[0]?.alpha;
    expect(alphaAtFrame0).toBeCloseTo(1 / LEDGE_GRAB_FADE_FRAMES);
    expect(alphaAtFrame2).toBeCloseTo(3 / LEDGE_GRAB_FADE_FRAMES);
    expect(alphaAtFrame2).toBeGreaterThan(alphaAtFrame0!);
  });

  it("fades out gradually, frozen at the last active position, once the condition stops holding", () => {
    const frames = [
      makeFrame(0, [makePost({ ...FOX_OFF_RIGHT_EDGE, frame: 0 })]),
      // Frame 1: moved back on-stage - condition no longer holds.
      makeFrame(1, [
        makePost({ ...FOX_OFF_RIGHT_EDGE, frame: 1, positionX: 0 }),
      ]),
      makeFrame(2, [
        makePost({ ...FOX_OFF_RIGHT_EDGE, frame: 2, positionX: 0 }),
      ]),
    ];
    const replay = makeReplay(frames);

    const frame1Candidates = computeLedgeGrabCandidates(
      replay,
      1,
      DREAM_LAND_STAGE_ID,
    );
    expect(frame1Candidates).toHaveLength(1);
    expect(frame1Candidates[0]).toMatchObject({
      edgeSide: "right",
      dotWorldX: RIGHT_EDGE_X + 122 - 400, // frozen at frame 0's position
      alpha: 1 - 1 / LEDGE_GRAB_FADE_FRAMES,
    });

    const frame2Candidates = computeLedgeGrabCandidates(
      replay,
      2,
      DREAM_LAND_STAGE_ID,
    );
    expect(frame2Candidates[0]?.alpha).toBeCloseTo(
      1 - 2 / LEDGE_GRAB_FADE_FRAMES,
    );
    expect(frame2Candidates[0]?.alpha).toBeLessThan(frame1Candidates[0]!.alpha);
  });

  it("fades out (not vanishes) the instant the ledge is grabbed", () => {
    const frames = [
      makeFrame(0, [makePost({ ...FOX_OFF_RIGHT_EDGE, frame: 0 })]),
      makeFrame(1, [
        makePost({
          ...FOX_OFF_RIGHT_EDGE,
          frame: 1,
          actionStateId: 0x054, // CliffCatch - grabbed
        }),
      ]),
    ];
    const replay = makeReplay(frames);
    const candidates = computeLedgeGrabCandidates(
      replay,
      1,
      DREAM_LAND_STAGE_ID,
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.alpha).toBeLessThan(1);
    expect(candidates[0]?.alpha).toBeGreaterThan(0);
  });

  it("stops producing any candidate once fully faded out (beyond LEDGE_GRAB_FADE_FRAMES since last active)", () => {
    const frames = [
      makeFrame(0, [makePost({ ...FOX_OFF_RIGHT_EDGE, frame: 0 })]),
      ...Array.from({ length: LEDGE_GRAB_FADE_FRAMES + 2 }, (_, i) =>
        makeFrame(i + 1, [
          makePost({ ...FOX_OFF_RIGHT_EDGE, frame: i + 1, positionX: 0 }),
        ]),
      ),
    ];
    const replay = makeReplay(frames);
    const lastFrameIndex = frames.length - 1;
    expect(
      computeLedgeGrabCandidates(replay, lastFrameIndex, DREAM_LAND_STAGE_ID),
    ).toEqual([]);
  });
});

describe("StageRenderer background themes", () => {
  it("defaults to grid theme and allows switching to other themes", () => {
    const fakeCanvas = {
      getContext: () => ({
        save: () => {},
        restore: () => {},
        fillRect: () => {},
        createLinearGradient: () => ({
          addColorStop: () => {},
        }),
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        drawImage: () => {},
      }),
      width: 960,
      height: 540,
    } as unknown as HTMLCanvasElement;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = new (StageRenderer as any)(fakeCanvas);
    expect(renderer.getBackgroundTheme()).toBe("grid");

    renderer.setBackgroundTheme("beach");
    expect(renderer.getBackgroundTheme()).toBe("beach");

    renderer.setBackgroundTheme("autumn");
    expect(renderer.getBackgroundTheme()).toBe("autumn");

    renderer.setBackgroundTheme("mountain");
    expect(renderer.getBackgroundTheme()).toBe("mountain");

    renderer.setBackgroundTheme("grid");
    expect(renderer.getBackgroundTheme()).toBe("grid");
  });

  it("renders beach background scenery without crashing", () => {
    const fakeCanvas = {
      getContext: () => ({
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        ellipse: () => {},
        arc: () => {},
        quadraticCurveTo: () => {},
        bezierCurveTo: () => {},
        translate: () => {},
        rotate: () => {},
        setLineDash: () => {},
        fillRect: () => {},
        clearRect: () => {},
        fill: () => {},
        stroke: () => {},
        drawImage: () => {},
        createLinearGradient: () => ({
          addColorStop: () => {},
        }),
        createRadialGradient: () => ({
          addColorStop: () => {},
        }),
      }),
      width: 960,
      height: 540,
    } as unknown as HTMLCanvasElement;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = new (StageRenderer as any)(fakeCanvas);
    renderer.setBackgroundTheme("beach");
    expect(() => {
      renderer["drawBackground"]();
    }).not.toThrow();
  });

  it("renders autumn background scenery without crashing", () => {
    const fakeCanvas = {
      getContext: () => ({
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        ellipse: () => {},
        arc: () => {},
        quadraticCurveTo: () => {},
        bezierCurveTo: () => {},
        translate: () => {},
        rotate: () => {},
        setLineDash: () => {},
        fillRect: () => {},
        clearRect: () => {},
        fill: () => {},
        stroke: () => {},
        drawImage: () => {},
        createLinearGradient: () => ({
          addColorStop: () => {},
        }),
        createRadialGradient: () => ({
          addColorStop: () => {},
        }),
      }),
      width: 960,
      height: 540,
    } as unknown as HTMLCanvasElement;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = new (StageRenderer as any)(fakeCanvas);
    renderer.setBackgroundTheme("autumn");
    expect(() => {
      renderer["drawBackground"]();
    }).not.toThrow();
  });

  it("applies theme-specific styling to platforms for mountain, beach, autumn, and grid", () => {
    const strokes: unknown[] = [];
    const fakeGradient = { addColorStop: () => {} };
    const fakeCanvas = {
      getContext: () => ({
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        ellipse: () => {},
        arc: () => {},
        fill: () => {},
        stroke: function (this: { strokeStyle: unknown }) {
          strokes.push(this.strokeStyle);
        },
        drawImage: () => {},
        createLinearGradient: () => fakeGradient,
      }),
      width: 960,
      height: 540,
    } as unknown as HTMLCanvasElement;

    const fakeCamera = {
      worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
      worldLengthToScreen: (len: number) => len,
    };

    const platform = {
      kind: "ground" as const,
      leftX: -100,
      rightX: 100,
      y: 0,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = new (StageRenderer as any)(fakeCanvas);

    // Mountain theme -> middle line is #a855f7
    renderer.setBackgroundTheme("mountain");
    strokes.length = 0;
    renderer["drawPlatform"](fakeCamera, platform);
    expect(strokes).toContain("#a855f7");

    // Beach theme -> middle line is #14b8a6
    renderer.setBackgroundTheme("beach");
    strokes.length = 0;
    renderer["drawPlatform"](fakeCamera, platform);
    expect(strokes).toContain("#14b8a6");

    // Autumn theme -> middle line is #f59e0b
    renderer.setBackgroundTheme("autumn");
    strokes.length = 0;
    renderer["drawPlatform"](fakeCamera, platform);
    expect(strokes).toContain("#f59e0b");

    // Grid theme -> middle line is #93c5fd
    renderer.setBackgroundTheme("grid");
    strokes.length = 0;
    renderer["drawPlatform"](fakeCamera, platform);
    expect(strokes).toContain("#93c5fd");

    // Switch to light mode: verifies daytime high-contrast colors
    renderer.setAppTheme("light");
    expect(renderer.isLightMode()).toBe(true);

    // Mountain light theme -> middle line is #7c3aed
    renderer.setBackgroundTheme("mountain");
    strokes.length = 0;
    renderer["drawPlatform"](fakeCamera, platform);
    expect(strokes).toContain("#7c3aed");

    // Beach light theme -> middle line is #0d9488
    renderer.setBackgroundTheme("beach");
    strokes.length = 0;
    renderer["drawPlatform"](fakeCamera, platform);
    expect(strokes).toContain("#0d9488");

    // Autumn light theme -> middle line is #b45309
    renderer.setBackgroundTheme("autumn");
    strokes.length = 0;
    renderer["drawPlatform"](fakeCamera, platform);
    expect(strokes).toContain("#b45309");

    // Grid light theme -> middle line is #2563eb
    renderer.setBackgroundTheme("grid");
    strokes.length = 0;
    renderer["drawPlatform"](fakeCamera, platform);
    expect(strokes).toContain("#2563eb");
  });

  it("renders all four stage themes in light / day mode without crashing", () => {
    const fills: unknown[] = [];
    const fakeCanvas = {
      getContext: () => ({
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        ellipse: () => {},
        arc: () => {},
        quadraticCurveTo: () => {},
        bezierCurveTo: () => {},
        translate: () => {},
        rotate: () => {},
        setLineDash: () => {},
        fillRect: function (this: { fillStyle: unknown }) {
          fills.push(this.fillStyle);
        },
        clearRect: () => {},
        fill: () => {},
        stroke: () => {},
        drawImage: () => {},
        createLinearGradient: () => ({
          addColorStop: () => {},
        }),
        createRadialGradient: () => ({
          addColorStop: () => {},
        }),
      }),
      width: 960,
      height: 540,
    } as unknown as HTMLCanvasElement;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = new (StageRenderer as any)(fakeCanvas);
    renderer.setAppTheme("light");
    expect(renderer.isLightMode()).toBe(true);

    for (const theme of ["mountain", "beach", "autumn", "grid"] as const) {
      renderer.setBackgroundTheme(theme);
      expect(() => {
        renderer["drawBackground"]();
      }).not.toThrow();
    }

    // In light mode, grid background fillStyle should be #f8fafc
    renderer.setBackgroundTheme("grid");
    fills.length = 0;
    renderer["drawGridBackground"]();
    expect(fills).toContain("#f8fafc");

    // In dark mode, grid background fillStyle should be #12141c
    renderer.setAppTheme("dark");
    expect(renderer.isLightMode()).toBe(false);
    fills.length = 0;
    renderer["drawGridBackground"]();
    expect(fills).toContain("#12141c");
  });

  it("draws stage palm trees on the beach theme without crashing", () => {
    const strokes: unknown[] = [];
    const fills: unknown[] = [];
    const fakeCanvas = {
      getContext: () => ({
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        ellipse: () => {},
        arc: () => {},
        quadraticCurveTo: () => {},
        setLineDash: () => {},
        fill: function (this: { fillStyle: unknown }) {
          fills.push(this.fillStyle);
        },
        stroke: function (this: { strokeStyle: unknown }) {
          strokes.push(this.strokeStyle);
        },
        drawImage: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
      }),
      width: 960,
      height: 540,
    } as unknown as HTMLCanvasElement;

    const fakeCamera = {
      worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
      worldLengthToScreen: (len: number) => len,
      groundScreenY: () => 400,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = new (StageRenderer as any)(fakeCanvas);
    renderer.setBackgroundTheme("beach");

    expect(() => {
      renderer["drawStage"](fakeCamera, 0x02); // Dream Land
    }).not.toThrow();

    expect(strokes).toContain("#451a03"); // Palm tree trunk
    expect(strokes).toContain("#064e3b"); // Palm frond
    expect(strokes).toContain("#b45309"); // Pineapple tree trunk bark rings
    expect(strokes).toContain("#86efac"); // Pineapple crown leaf spine highlights
    expect(strokes).toContain("#15803d"); // Pineapple plant fruiting stalk
    expect(fills).toContain("#f59e0b"); // Sand root mound
    expect(fills).toContain("#78350f"); // Coconut / fruit base
    expect(fills).toContain("#fef08a"); // Pineapple scale sunlit facets
    expect(fills).toContain("#14532d"); // Dark emerald pineapple crown fronds
    expect(fills).toContain("#16a34a"); // Vibrant pineapple crown fronds
  });

  it("draws stage autumn trees and lanterns on the autumn theme without crashing", () => {
    const strokes: unknown[] = [];
    const fills: unknown[] = [];
    const fakeCanvas = {
      getContext: () => ({
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        ellipse: () => {},
        arc: () => {},
        fillRect: () => {},
        quadraticCurveTo: () => {},
        translate: () => {},
        rotate: () => {},
        setLineDash: () => {},
        fill: function (this: { fillStyle: unknown }) {
          fills.push(this.fillStyle);
        },
        stroke: function (this: { strokeStyle: unknown }) {
          strokes.push(this.strokeStyle);
        },
        drawImage: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
      }),
      width: 960,
      height: 540,
    } as unknown as HTMLCanvasElement;

    const fakeCamera = {
      worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
      worldLengthToScreen: (len: number) => len,
      groundScreenY: () => 400,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = new (StageRenderer as any)(fakeCanvas);
    renderer.setBackgroundTheme("autumn");

    expect(() => {
      renderer["drawStage"](fakeCamera, 0x02); // Dream Land
    }).not.toThrow();

    expect(strokes).toContain("#292524"); // Maple trunk
    expect(fills).toContain("#3f3f46"); // Stone base
    expect(fills).toContain("#15803d"); // Moss
    expect(fills).toContain("#7f1d1d"); // Crimson canopy
  });

  it("draws Dream Land slopes and silhouette underbody across themes", () => {
    const strokes: unknown[] = [];
    const fills: unknown[] = [];
    let closePathCount = 0;
    const fakeCanvas = {
      getContext: () => ({
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {
          closePathCount++;
        },
        clip: () => {},
        moveTo: () => {},
        lineTo: () => {},
        ellipse: () => {},
        arc: () => {},
        fillRect: () => {},
        quadraticCurveTo: () => {},
        translate: () => {},
        rotate: () => {},
        setLineDash: () => {},
        fill: function (this: { fillStyle: unknown }) {
          fills.push(this.fillStyle);
        },
        stroke: function (this: { strokeStyle: unknown }) {
          strokes.push(this.strokeStyle);
        },
        drawImage: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
      }),
      width: 960,
      height: 540,
    } as unknown as HTMLCanvasElement;

    const fakeCamera = {
      worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
      worldLengthToScreen: (len: number) => len,
      groundScreenY: () => 400,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = new (StageRenderer as any)(fakeCanvas);

    // Mountain theme: slope core color is #a855f7, outer is rgba(51, 75, 163, 0.65)
    renderer.setBackgroundTheme("mountain");
    strokes.length = 0;
    renderer["drawStage"](fakeCamera, DREAM_LAND_STAGE_ID);
    expect(strokes).toContain("#a855f7");
    expect(strokes).toContain("rgba(51, 75, 163, 0.65)");
    expect(strokes).toContain("rgba(139, 202, 240, 0.3)");

    // Autumn theme: slope core color is #f59e0b, outer is rgba(220, 38, 38, 0.65)
    renderer.setBackgroundTheme("autumn");
    strokes.length = 0;
    renderer["drawStage"](fakeCamera, DREAM_LAND_STAGE_ID);
    expect(strokes).toContain("#f59e0b");
    expect(strokes).toContain("rgba(220, 38, 38, 0.65)");
    expect(strokes).toContain("rgba(180, 83, 9, 0.35)");

    // Grid theme: slope core color is #93c5fd, outer is rgba(29, 78, 216, 0.65)
    renderer.setBackgroundTheme("grid");
    strokes.length = 0;
    renderer["drawStage"](fakeCamera, DREAM_LAND_STAGE_ID);
    expect(strokes).toContain("#93c5fd");
    expect(strokes).toContain("rgba(29, 78, 216, 0.65)");
    expect(strokes).toContain("rgba(56, 189, 248, 0.3)");

    // Beach theme: slope core color is #14b8a6, outer is rgba(249, 115, 22, 0.65), pineapple fills
    renderer.setBackgroundTheme("beach");
    strokes.length = 0;
    fills.length = 0;
    renderer["drawStage"](fakeCamera, DREAM_LAND_STAGE_ID);
    expect(strokes).toContain("#14b8a6");
    expect(strokes).toContain("rgba(249, 115, 22, 0.65)");
    expect(strokes).toContain("rgba(253, 224, 71, 0.3)");
    expect(fills).toContain("#78350f"); // Pineapple base
    expect(fills).toContain("#fbbf24"); // Pineapple golden scale
    expect(fills).toContain("#16a34a"); // Pineapple crown frond
    expect(fills).toContain("#451a03"); // Pineapple stem scar / bract
    expect(closePathCount).toBeGreaterThan(0);
  });

  it("applies theme-specific colors to Donkey Kong for mountain vs grid backgrounds", () => {
    const fills: string[] = [];
    const fakeCanvas = {
      getContext: () => ({
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        ellipse: () => {},
        arc: () => {},
        fill: function (this: { fillStyle: string }) {
          fills.push(this.fillStyle);
        },
        stroke: () => {},
        drawImage: () => {},
      }),
      width: 960,
      height: 540,
    } as unknown as HTMLCanvasElement;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = new (StageRenderer as any)(fakeCanvas);

    // Mountain theme (Night Sky): Moonlit Indigo fur #6366f1, Moonlit Pearl chest #fdf4ff, Magenta tie #ec4899
    renderer.setBackgroundTheme("mountain");
    fills.length = 0;
    renderer["drawDonkeyKongPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#ffffff",
      {
        taunting: false,
        inCombo: false,
        isRoll: false,
        isOpponent: false,
        actionFrameCounter: 0,
      },
    );
    expect(fills).toContain("#6366f1");
    expect(fills).toContain("#fdf4ff");
    expect(fills).toContain("#ec4899");
    expect(fills).toContain("#38bdf8");

    // Grid theme: Classic Brown fur #78350f, Tan chest #fed7aa, Red tie #dc2626
    renderer.setBackgroundTheme("grid");
    fills.length = 0;
    renderer["drawDonkeyKongPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#ffffff",
      {
        taunting: false,
        inCombo: false,
        isRoll: false,
        isOpponent: false,
        actionFrameCounter: 0,
      },
    );
    expect(fills).toContain("#78350f");
    expect(fills).toContain("#fed7aa");
    expect(fills).toContain("#dc2626");
    expect(fills).toContain("#facc15");
  });

  it("applies theme-specific moonlit skins to all 12 characters", () => {
    const fills: string[] = [];
    const fakeCanvas = {
      getContext: () => ({
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        ellipse: () => {},
        arc: () => {},
        quadraticCurveTo: () => {},
        bezierCurveTo: () => {},
        translate: () => {},
        rotate: () => {},
        setLineDash: () => {},
        fillRect: () => {},
        clearRect: () => {},
        fill: function (this: { fillStyle: string }) {
          fills.push(this.fillStyle);
        },
        stroke: () => {},
        drawImage: () => {},
      }),
      width: 960,
      height: 540,
    } as unknown as HTMLCanvasElement;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = new (StageRenderer as any)(fakeCanvas);
    const defaultState = {
      taunting: false,
      inCombo: false,
      isRoll: false,
      isOpponent: false,
      actionFrameCounter: 0,
    };

    // 1. Pikachu: Moonlit Cyan #38bdf8 vs Classic Yellow #facc15
    renderer.setBackgroundTheme("mountain");
    fills.length = 0;
    renderer["drawPikachuPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#38bdf8");
    renderer.setBackgroundTheme("grid");
    fills.length = 0;
    renderer["drawPikachuPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#facc15");

    // 2. Captain Falcon: Moonlit Indigo suit #4338ca vs Classic #1e293b
    renderer.setBackgroundTheme("mountain");
    fills.length = 0;
    renderer["drawFalconPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#4338ca");
    renderer.setBackgroundTheme("grid");
    fills.length = 0;
    renderer["drawFalconPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#1e293b");

    // 3. Mario: Moonlit Rose #f43f5e vs Classic Red #dc2626
    renderer.setBackgroundTheme("mountain");
    fills.length = 0;
    renderer["drawMarioPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#f43f5e");
    renderer.setBackgroundTheme("grid");
    fills.length = 0;
    renderer["drawMarioPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#dc2626");

    // 4. Luigi: Moonlit Mint #2dd4bf vs Classic Green #16a34a
    renderer.setBackgroundTheme("mountain");
    fills.length = 0;
    renderer["drawLuigiPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#2dd4bf");
    renderer.setBackgroundTheme("grid");
    fills.length = 0;
    renderer["drawLuigiPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#16a34a");

    // 5. Kirby: Moonlit Pastel Pink #fbcfe8 vs Classic Pink #f472b6
    renderer.setBackgroundTheme("mountain");
    fills.length = 0;
    renderer["drawKirbyPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#fbcfe8");
    renderer.setBackgroundTheme("grid");
    fills.length = 0;
    renderer["drawKirbyPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#f472b6");

    // 6. Jigglypuff: Moonlit Lilac #fae8ff vs Classic Light Pink #f9a8d4
    renderer.setBackgroundTheme("mountain");
    fills.length = 0;
    renderer["drawJigglypuffPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#fae8ff");
    renderer.setBackgroundTheme("grid");
    fills.length = 0;
    renderer["drawJigglypuffPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#f9a8d4");

    // 7. Fox: Moonlit Gold #fbbf24 vs Classic Amber #c8732a
    renderer.setBackgroundTheme("mountain");
    fills.length = 0;
    renderer["drawFoxPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#fbbf24");
    renderer.setBackgroundTheme("grid");
    fills.length = 0;
    renderer["drawFoxPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#c8732a");

    // 8. Yoshi: Moonlit Cyan #38bdf8 vs Classic Green #22c55e
    renderer.setBackgroundTheme("mountain");
    fills.length = 0;
    renderer["drawYoshiPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#38bdf8");
    renderer.setBackgroundTheme("grid");
    fills.length = 0;
    renderer["drawYoshiPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#22c55e");

    // 9. Link: Moonlit Indigo #6366f1 vs Classic Green #16a34a
    renderer.setBackgroundTheme("mountain");
    fills.length = 0;
    renderer["drawLinkPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#6366f1");
    renderer.setBackgroundTheme("grid");
    fills.length = 0;
    renderer["drawLinkPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#16a34a");

    // 10. Ness: Moonlit Magenta Cap #ec4899 vs Classic Red #dc2626
    renderer.setBackgroundTheme("mountain");
    fills.length = 0;
    renderer["drawNessPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#ec4899");
    expect(fills).toContain("#818cf8");
    renderer.setBackgroundTheme("grid");
    fills.length = 0;
    renderer["drawNessPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#dc2626");
    expect(fills).toContain("#92400e");

    // 11. Samus: Moonlit Magenta Armor #ec4899 vs Classic Orange #ea580c
    renderer.setBackgroundTheme("mountain");
    fills.length = 0;
    renderer["drawSamusPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#ec4899");
    renderer.setBackgroundTheme("grid");
    fills.length = 0;
    renderer["drawSamusPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#ea580c");

    // 12. Bowser: Moonlit Midnight Shell #1e1b4b, Magenta Hair #ec4899 vs Classic Shell #14532d, Fiery Red Hair #dc2626
    renderer.setBackgroundTheme("mountain");
    fills.length = 0;
    renderer["drawBowserPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#1e1b4b");
    expect(fills).toContain("#ec4899");
    renderer.setBackgroundTheme("grid");
    fills.length = 0;
    renderer["drawBowserPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#14532d");
    expect(fills).toContain("#dc2626");
  });

  it("applies autumn-specific skins to Pikachu and Yoshi on the autumn theme", () => {
    const fills: string[] = [];
    const fakeCanvas = {
      getContext: () => ({
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        ellipse: () => {},
        arc: () => {},
        quadraticCurveTo: () => {},
        bezierCurveTo: () => {},
        translate: () => {},
        rotate: () => {},
        fill: function (this: { fillStyle: string }) {
          fills.push(this.fillStyle);
        },
        stroke: () => {},
        drawImage: () => {},
      }),
      width: 960,
      height: 540,
    } as unknown as HTMLCanvasElement;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = new (StageRenderer as any)(fakeCanvas);
    const defaultState = {
      taunting: false,
      inCombo: false,
      isRoll: false,
      isOpponent: false,
      actionFrameCounter: 0,
    };

    // Pikachu on autumn: Golden amber body #fbbf24, crimson cheeks #dc2626, chestnut stripes #991b1b, lacquer ear tips #1c1917
    renderer.setBackgroundTheme("autumn");
    fills.length = 0;
    renderer["drawPikachuPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#fbbf24");
    expect(fills).toContain("#dc2626");
    expect(fills).toContain("#991b1b");
    expect(fills).toContain("#1c1917");

    // Yoshi on autumn: Golden amber body #facc15, cream belly #fffbeb, vermilion boots #dc2626, crimson shell #991b1b
    fills.length = 0;
    renderer["drawYoshiPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#facc15");
    expect(fills).toContain("#fffbeb");
    expect(fills).toContain("#dc2626");
    expect(fills).toContain("#991b1b");

    // Captain Falcon on autumn: Plum suit #4a044e, amber gold #f59e0b, vermilion helmet #991b1b
    fills.length = 0;
    renderer["drawFalconPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#4a044e");
    expect(fills).toContain("#f59e0b");
    expect(fills).toContain("#991b1b");

    // Mario on autumn: Crimson #dc2626, dark lacquer overalls #292524, gold #f59e0b
    fills.length = 0;
    renderer["drawMarioPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#dc2626");
    expect(fills).toContain("#292524");
    expect(fills).toContain("#f59e0b");

    // Luigi on autumn: Bamboo green #15803d, dark lacquer overalls #292524
    fills.length = 0;
    renderer["drawLuigiPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#15803d");
    expect(fills).toContain("#292524");

    // Kirby on autumn: Golden apricot #fde68a, vermilion feet #dc2626
    fills.length = 0;
    renderer["drawKirbyPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#fde68a");
    expect(fills).toContain("#dc2626");

    // Jigglypuff on autumn: Apricot peach #fed7aa, amber forelock #f59e0b, jade eye #10b981
    fills.length = 0;
    renderer["drawJigglypuffPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#fed7aa");
    expect(fills).toContain("#f59e0b");
    expect(fills).toContain("#10b981");

    // Fox on autumn: Red fox fur #ea580c, burgundy jacket #7f1d1d, vermilion boots #dc2626
    fills.length = 0;
    renderer["drawFoxPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#ea580c");
    expect(fills).toContain("#7f1d1d");
    expect(fills).toContain("#dc2626");

    // Donkey Kong on autumn: Mahogany fur #451a03, golden chest #fde68a, crimson tie #dc2626
    fills.length = 0;
    renderer["drawDonkeyKongPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#451a03");
    expect(fills).toContain("#fde68a");
    expect(fills).toContain("#dc2626");

    // Link on autumn: Crimson tunic #dc2626, golden hair #fbbf24, obsidian shield #1c1917
    fills.length = 0;
    renderer["drawLinkPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#dc2626");
    expect(fills).toContain("#fbbf24");
    expect(fills).toContain("#1c1917");

    // Ness on autumn: Crimson cap #dc2626, charcoal brim #292524, amber backpack #d97706
    fills.length = 0;
    renderer["drawNessPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#dc2626");
    expect(fills).toContain("#292524");
    expect(fills).toContain("#d97706");

    // Samus on autumn: Amber armor #f59e0b, vermilion chest #dc2626, jade visor #10b981
    fills.length = 0;
    renderer["drawSamusPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#f59e0b");
    expect(fills).toContain("#dc2626");
    expect(fills).toContain("#10b981");

    // Bowser on autumn: Forest shell #365314, crimson hair #dc2626, golden amber belly #f59e0b
    fills.length = 0;
    renderer["drawBowserPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#365314");
    expect(fills).toContain("#dc2626");
    expect(fills).toContain("#f59e0b");
  });

  it("draws blooming Japanese Sakura trees on the mountain night theme without crashing", () => {
    const strokes: unknown[] = [];
    const fills: unknown[] = [];
    const fakeCanvas = {
      getContext: () => ({
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        ellipse: () => {},
        arc: () => {},
        fillRect: () => {},
        quadraticCurveTo: () => {},
        setLineDash: () => {},
        fill: function (this: { fillStyle: unknown }) {
          fills.push(this.fillStyle);
        },
        stroke: function (this: { strokeStyle: unknown }) {
          strokes.push(this.strokeStyle);
        },
        drawImage: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
      }),
      width: 960,
      height: 540,
    } as unknown as HTMLCanvasElement;

    const fakeCamera = {
      worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
      worldLengthToScreen: (len: number) => len,
      groundScreenY: () => 400,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = new (StageRenderer as any)(fakeCanvas);
    renderer.setBackgroundTheme("mountain");

    expect(() => {
      renderer["drawStage"](fakeCamera, 0x02, 10); // Dream Land
    }).not.toThrow();

    expect(strokes).toContain("#1e1b4b"); // Indigo-tinted sakura trunk
    expect(fills).toContain("#1e1b4b"); // Midnight stone base
    expect(fills).toContain("#f472b6"); // Sakura blossom pink
    expect(fills).toContain("#fbcfe8"); // Pale blossom petal
  });

  it("renders daytime sakura tree and mountain stage geometry when light mode is enabled", () => {
    const fills: unknown[] = [];
    const strokes: unknown[] = [];
    const fakeCanvas = {
      getContext: () => ({
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        ellipse: () => {},
        arc: () => {},
        fillRect: function (this: { fillStyle: unknown }) {
          fills.push(this.fillStyle);
        },
        quadraticCurveTo: () => {},
        bezierCurveTo: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        setLineDash: () => {},
        fill: function (this: { fillStyle: unknown }) {
          fills.push(this.fillStyle);
        },
        stroke: function (this: { strokeStyle: unknown }) {
          strokes.push(this.strokeStyle);
        },
        drawImage: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
      }),
      width: 960,
      height: 540,
    } as unknown as HTMLCanvasElement;

    const fakeCamera = {
      worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
      worldLengthToScreen: (len: number) => len,
      groundScreenY: () => 400,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = new (StageRenderer as any)(fakeCanvas);
    renderer.setBackgroundTheme("mountain");
    renderer.setLightMode(true);

    expect(() => {
      renderer["drawStage"](fakeCamera, DREAM_LAND_STAGE_ID, 10);
    }).not.toThrow();

    // Natural warm cherry bark
    expect(strokes).toContain("#573010");
    // Dais slate stone base & moss
    expect(fills).toContain("#94a3b8");
    expect(fills).toContain("#16a34a");
    // Stone lantern pillar
    expect(fills).toContain("#64748b");
    // Sunlit alpine granite rock facets on underbody
    expect(fills).toContain("#94a3b8");
    expect(fills).toContain("#cbd5e1");
    // Sunlit pink blossoms
    expect(fills).toContain("#fbcfe8");
  });

  it("renders daytime autumn trees and sandstone stage geometry when light mode is enabled", () => {
    const fills: unknown[] = [];
    const strokes: unknown[] = [];
    const fakeCanvas = {
      getContext: () => ({
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        ellipse: () => {},
        arc: () => {},
        fillRect: function (this: { fillStyle: unknown }) {
          fills.push(this.fillStyle);
        },
        quadraticCurveTo: () => {},
        bezierCurveTo: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        setLineDash: () => {},
        fill: function (this: { fillStyle: unknown }) {
          fills.push(this.fillStyle);
        },
        stroke: function (this: { strokeStyle: unknown }) {
          strokes.push(this.strokeStyle);
        },
        drawImage: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
      }),
      width: 960,
      height: 540,
    } as unknown as HTMLCanvasElement;

    const fakeCamera = {
      worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
      worldLengthToScreen: (len: number) => len,
      groundScreenY: () => 400,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = new (StageRenderer as any)(fakeCanvas);
    renderer.setBackgroundTheme("autumn");
    renderer.setLightMode(true);

    expect(() => {
      renderer["drawStage"](fakeCamera, DREAM_LAND_STAGE_ID, 10);
    }).not.toThrow();

    // Warm chestnut tree trunk
    expect(strokes).toContain("#78350f");
    // Dais weathered stone base & moss
    expect(fills).toContain("#78716c");
    expect(fills).toContain("#16a34a");
    // Sunlit carved sandstone/earthen facets on underbody
    expect(fills).toContain("#9a3412");
    expect(fills).toContain("#b45309");
    expect(fills).toContain("#c2410c");
  });

  it("renders daytime fighter lighting on mountain theme when light mode is enabled", () => {
    const fills: string[] = [];
    const fakeCanvas = {
      getContext: () => ({
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        ellipse: () => {},
        arc: () => {},
        quadraticCurveTo: () => {},
        bezierCurveTo: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        setLineDash: () => {},
        fillRect: function (this: { fillStyle: string }) {
          fills.push(this.fillStyle);
        },
        clearRect: () => {},
        fillText: () => {},
        measureText: () => ({ width: 10 }),
        fill: function (this: { fillStyle: string }) {
          fills.push(this.fillStyle);
        },
        stroke: () => {},
        drawImage: () => {},
      }),
      width: 960,
      height: 540,
    } as unknown as HTMLCanvasElement;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = new (StageRenderer as any)(fakeCanvas);
    renderer.setBackgroundTheme("mountain");
    renderer.setLightMode(true);

    const defaultState = {
      taunting: false,
      inCombo: false,
      isRoll: false,
      isOpponent: false,
      actionFrameCounter: 0,
    };

    // Pikachu in daytime: Classic Yellow #facc15, NOT Moonlit Cyan #38bdf8
    fills.length = 0;
    renderer["drawPikachuPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#facc15");
    expect(fills).not.toContain("#38bdf8");

    // Donkey Kong in daytime: Classic Brown #78350f, NOT Moonlit Indigo #6366f1
    fills.length = 0;
    renderer["drawDonkeyKongPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#78350f");
    expect(fills).not.toContain("#6366f1");

    // Mario in daytime: Classic Red #dc2626 & Blue #2563eb, NOT Neon Rose #f43f5e
    fills.length = 0;
    renderer["drawMarioPolygons"](
      100,
      200,
      100,
      150,
      30,
      60,
      1,
      "#fff",
      defaultState,
    );
    expect(fills).toContain("#dc2626");
    expect(fills).toContain("#2563eb");
    expect(fills).not.toContain("#f43f5e");

    // drawPlayer integration test: Pikachu in daytime mountain mode
    fills.length = 0;
    const fakeCamera = {
      worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
      worldLengthToScreen: (len: number) => len,
      groundScreenY: () => 400,
    };
    renderer["drawPlayer"](fakeCamera, 0, {
      positionX: 0,
      positionY: 0,
      facingDirection: 1,
      damagePercent: 0,
      characterId: 0x09, // Pikachu
      actionStateId: 0x00e, // Wait
      actionFrameCounter: 0,
      stocksRemaining: 4,
      jumpsRemaining: 1,
    });
    expect(fills).toContain("#facc15");
    expect(fills).not.toContain("#38bdf8");
  });

  it("ensures falling sakura petals stop at the stage floor and never drop below ground", () => {
    const ellipseYCoordinates: number[] = [];
    const fakeCanvas = {
      getContext: () => ({
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        ellipse: (_x: number, y: number) => {
          ellipseYCoordinates.push(y);
        },
        arc: () => {},
        fillRect: () => {},
        quadraticCurveTo: () => {},
        setLineDash: () => {},
        fill: () => {},
        stroke: () => {},
        drawImage: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
      }),
      width: 960,
      height: 540,
    } as unknown as HTMLCanvasElement;

    const groundY = 0;
    const fakeCamera = {
      // worldToScreen simply returns world coordinates directly for precise tracking
      worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
      worldLengthToScreen: (len: number) => len,
      groundScreenY: () => groundY,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = new (StageRenderer as any)(fakeCanvas);
    renderer.setBackgroundTheme("mountain");

    // Sample across multiple frames covering complete fall and rest cycles
    for (let f = 0; f < 1200; f += 30) {
      ellipseYCoordinates.length = 0;
      renderer["drawStageSakuraTrees"](fakeCamera, DREAM_LAND_STAGE_ID, f);

      // All drawn petals must have y >= groundY (never falling below the stage)
      for (const y of ellipseYCoordinates) {
        expect(y).toBeGreaterThanOrEqual(groundY);
      }
    }
  });

  it("draws animated falling autumn leaves on stage without crashing", () => {
    const fills: unknown[] = [];
    const fakeCanvas = {
      getContext: () => ({
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        ellipse: () => {},
        arc: () => {},
        translate: () => {},
        rotate: () => {},
        fill: function (this: { fillStyle: unknown }) {
          fills.push(this.fillStyle);
        },
        stroke: () => {},
        drawImage: () => {},
      }),
      width: 960,
      height: 540,
    } as unknown as HTMLCanvasElement;

    const fakeCamera = {
      worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
      worldLengthToScreen: (len: number) => len,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = new (StageRenderer as any)(fakeCanvas);
    expect(() => {
      renderer["drawAnimatedAutumnLeaves"](fakeCamera, 45);
    }).not.toThrow();

    expect(fills).toContain("#dc2626"); // Crimson leaf
    expect(fills).toContain("#ea580c"); // Flame orange leaf
    expect(fills).toContain("#f59e0b"); // Golden amber leaf
  });

  describe("Whispy Woods Wind Zone Visuals", () => {
    const createMockCanvas = () => {
      const fills: unknown[] = [];
      const strokes: unknown[] = [];
      const fakeCanvas = {
        getContext: () => ({
          save: () => {},
          restore: () => {},
          beginPath: () => {},
          closePath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          rect: () => {},
          clip: () => {},
          strokeRect: () => {},
          fillRect: () => {},
          ellipse: () => {},
          arc: () => {},
          translate: () => {},
          rotate: () => {},
          scale: () => {},
          quadraticCurveTo: () => {},
          bezierCurveTo: () => {},
          setLineDash: () => {},
          fill: function (this: { fillStyle: unknown }) {
            fills.push(this.fillStyle);
          },
          stroke: function (this: { strokeStyle: unknown }) {
            strokes.push(this.strokeStyle);
          },
          drawImage: () => {},
          createLinearGradient: () => ({ addColorStop: () => {} }),
        }),
        width: 960,
        height: 540,
      } as unknown as HTMLCanvasElement;

      const fakeCamera = {
        worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
        worldLengthToScreen: (len: number) => len,
      };

      return { fakeCanvas, fakeCamera, fills, strokes };
    };

    it("draws wind zone with cherry blossom petals for mountain theme", () => {
      const { fakeCanvas, fakeCamera, fills } = createMockCanvas();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      renderer.setBackgroundTheme("mountain");

      const frame = {
        hazardFlags: HazardFlag.WhispyBlowing | HazardFlag.WhispyBlowingRight,
      } as unknown as Frame;

      expect(() => {
        renderer["drawWindZone"](fakeCamera, DREAM_LAND_STAGE_ID, frame, 30);
      }).not.toThrow();

      expect(fills).toContain("#fbcfe8"); // Sakura pink
      expect(fills).toContain("#f472b6"); // Vibrant cherry blossom pink
    });

    it("draws wind zone with autumn maple leaves for autumn theme", () => {
      const { fakeCanvas, fakeCamera, fills } = createMockCanvas();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      renderer.setBackgroundTheme("autumn");

      const frame = {
        hazardFlags: HazardFlag.WhispyBlowing, // Blowing left
      } as unknown as Frame;

      expect(() => {
        renderer["drawWindZone"](fakeCamera, DREAM_LAND_STAGE_ID, frame, 20);
      }).not.toThrow();

      expect(fills).toContain("#dc2626"); // Crimson maple leaf
      expect(fills).toContain("#f59e0b"); // Amber gold maple leaf
    });

    it("draws wind zone with cyber vector particles for grid theme", () => {
      const { fakeCanvas, fakeCamera, fills, strokes } = createMockCanvas();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      renderer.setBackgroundTheme("grid");

      const frame = {
        hazardFlags: HazardFlag.WhispyBlowing | HazardFlag.WhispyBlowingRight,
      } as unknown as Frame;

      expect(() => {
        renderer["drawWindZone"](fakeCamera, DREAM_LAND_STAGE_ID, frame, 15);
      }).not.toThrow();

      expect(fills).toContain("#38bdf8"); // Cyan chevron
      expect(strokes).toContain("#38bdf8"); // Cyan trailing vector streak
    });

    it("does not draw wind zone on non-Dream Land stages or when Whispy is not blowing", () => {
      const { fakeCanvas, fakeCamera, fills } = createMockCanvas();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);

      const frameBlowing = {
        hazardFlags: HazardFlag.WhispyBlowing,
      } as unknown as Frame;

      // Other stage (e.g. Peach's Castle 0x00) -> no-op
      renderer["drawWindZone"](fakeCamera, 0x00, frameBlowing, 10);
      expect(fills).toHaveLength(0);

      // Dream Land but not blowing -> no-op
      const frameNotBlowing = { hazardFlags: 0 } as unknown as Frame;
      renderer["drawWindZone"](
        fakeCamera,
        DREAM_LAND_STAGE_ID,
        frameNotBlowing,
        10,
      );
      expect(fills).toHaveLength(0);
    });
  });

  describe("Remix Fighters Polygon Rendering", () => {
    const createMockCanvas = () => {
      const fills: unknown[] = [];
      const strokes: unknown[] = [];
      const fakeCanvas = {
        getContext: () => ({
          save: () => {},
          restore: () => {},
          beginPath: () => {},
          closePath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          rect: () => {},
          clip: () => {},
          strokeRect: () => {},
          fillRect: () => {},
          ellipse: () => {},
          arc: () => {},
          translate: () => {},
          rotate: () => {},
          scale: () => {},
          quadraticCurveTo: () => {},
          bezierCurveTo: () => {},
          setLineDash: () => {},
          fill: function (this: { fillStyle: unknown }) {
            fills.push(this.fillStyle);
          },
          stroke: function (this: { strokeStyle: unknown }) {
            strokes.push(this.strokeStyle);
          },
          drawImage: () => {},
          createLinearGradient: () => ({ addColorStop: () => {} }),
        }),
        width: 960,
        height: 540,
      } as unknown as HTMLCanvasElement;

      return { fakeCanvas, fills, strokes };
    };

    const remixCharacters = [
      { id: 0x1d, name: "Falco", method: "drawFalcoPolygons" },
      { id: 0x1e, name: "Ganondorf", method: "drawGanondorfPolygons" },
      { id: 0x1f, name: "Young Link", method: "drawYoungLinkPolygons" },
      { id: 0x20, name: "Dr. Mario", method: "drawDrMarioPolygons" },
      { id: 0x21, name: "Wario", method: "drawWarioPolygons" },
      { id: 0x22, name: "Dark Samus", method: "drawDarkSamusPolygons" },
      { id: 0x26, name: "Lucas", method: "drawLucasPolygons" },
      { id: 0x35, name: "Giga Bowser", method: "drawGigaBowserPolygons" },
      { id: 0x36, name: "Mad Piano", method: "drawPianoPolygons" },
      { id: 0x37, name: "Wolf", method: "drawWolfPolygons" },
      { id: 0x38, name: "Conker", method: "drawConkerPolygons" },
      { id: 0x39, name: "Mewtwo", method: "drawMewtwoPolygons" },
      { id: 0x3a, name: "Marth", method: "drawMarthPolygons" },
      { id: 0x3b, name: "Sonic", method: "drawSonicPolygons" },
      { id: 0x3c, name: "Sandbag", method: "drawSandbagPolygons" },
      { id: 0x3d, name: "Super Sonic", method: "drawSuperSonicPolygons" },
      { id: 0x3e, name: "Sheik", method: "drawSheikPolygons" },
      { id: 0x3f, name: "Marina", method: "drawMarinaPolygons" },
      { id: 0x40, name: "King Dedede", method: "drawDededePolygons" },
      { id: 0x41, name: "Goemon", method: "drawGoemonPolygons" },
      { id: 0x42, name: "Peppy Hare", method: "drawPeppyPolygons" },
      { id: 0x43, name: "Slippy Toad", method: "drawSlippyPolygons" },
      { id: 0x44, name: "Banjo & Kazooie", method: "drawBanjoPolygons" },
      { id: 0x45, name: "Metal Luigi", method: "drawMetalLuigiPolygons" },
      { id: 0x46, name: "Ebisumaru", method: "drawEbisumaruPolygons" },
      { id: 0x47, name: "Dragon King", method: "drawDragonKingPolygons" },
      { id: 0x48, name: "Crash Bandicoot", method: "drawCrashPolygons" },
      { id: 0x49, name: "Peach", method: "drawPeachPolygons" },
      { id: 0x4a, name: "Roy", method: "drawRoyPolygons" },
      { id: 0x4b, name: "Dr. Luigi", method: "drawDrLuigiPolygons" },
      { id: 0x4c, name: "Lanky Kong", method: "drawLankyKongPolygons" },
    ];

    for (const char of remixCharacters) {
      it(`renders ${char.name} across themes without throwing`, () => {
        const { fakeCanvas, fills } = createMockCanvas();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new (StageRenderer as any)(fakeCanvas);

        for (const theme of ["mountain", "autumn", "grid"] as const) {
          renderer.setBackgroundTheme(theme);
          expect(() => {
            renderer[char.method](50, 100, 20, 60, 25, 80, 1, "#ef4444", {
              taunting: false,
              inCombo: false,
              isRoll: false,
              isTechRoll: false,
              isTechInPlace: false,
              isTumble: false,
              isProne: false,
              isDownBound: false,
              isInvulnerable: false,
              isSpecial: false,
              isLanding: false,
              isHeavyLanding: false,
              isDizzy: false,
              isSleep: false,
              isOpponent: false,
              actionFrameCounter: 0,
            });
          }).not.toThrow();
        }

        expect(fills.length).toBeGreaterThan(0);
      });

      it(`renders ${char.name} opponent desaturation without throwing`, () => {
        const { fakeCanvas } = createMockCanvas();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new (StageRenderer as any)(fakeCanvas);

        expect(() => {
          renderer[char.method](50, 100, 20, 60, 25, 80, 1, "#ef4444", {
            taunting: true,
            inCombo: true,
            isRoll: false,
            isTechRoll: false,
            isTechInPlace: false,
            isTumble: false,
            isProne: false,
            isDownBound: false,
            isInvulnerable: false,
            isSpecial: false,
            isLanding: false,
            isHeavyLanding: false,
            isDizzy: false,
            isSleep: false,
            isOpponent: true,
            actionFrameCounter: 10,
          });
        }).not.toThrow();
      });
    }
  });

  describe("drawItemObjects projectile/weapon labels", () => {
    const createMockCanvas = () => {
      const textCalls: { text: string; x: number; y: number; font?: string }[] =
        [];
      let currentFont = "";
      const fakeCanvas = {
        getContext: () => ({
          save: () => {},
          restore: () => {},
          beginPath: () => {},
          closePath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          rect: () => {},
          roundRect: () => {},
          fillRect: () => {},
          strokeRect: () => {},
          clearRect: () => {},
          bezierCurveTo: () => {},
          clip: () => {},
          setLineDash: () => {},
          createRadialGradient: () => ({ addColorStop: () => {} }),
          createLinearGradient: () => ({ addColorStop: () => {} }),
          fill: () => {},
          stroke: () => {},
          measureText: (str: string) => ({ width: str.length * 7 }),
          translate: () => {},
          rotate: () => {},
          scale: () => {},
          arc: () => {},
          ellipse: () => {},
          quadraticCurveTo: () => {},
          set font(val: string) {
            currentFont = val;
          },
          get font() {
            return currentFont;
          },
          textAlign: "left",
          textBaseline: "top",
          fillStyle: "",
          strokeStyle: "",
          lineWidth: 1,
          shadowColor: "",
          shadowBlur: 0,
          fillText: (text: string, x: number, y: number) => {
            textCalls.push({ text, x, y, font: currentFont });
          },
        }),
        width: 960,
        height: 540,
      } as unknown as HTMLCanvasElement;

      const fakeCamera = {
        worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
        worldLengthToScreen: (len: number) => len,
      };

      return { fakeCanvas, fakeCamera, textCalls };
    };

    it("does not render item labels when playing (isPaused is false or undefined)", () => {
      const { fakeCanvas, fakeCamera, textCalls } = createMockCanvas();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const item = {
        linkId: ItemLinkId.Weapon,
        kind: WPKind.Blaster,
        positionX: 100,
        positionY: 200,
        frame: 1,
      };

      renderer.drawItemObjects(fakeCamera, [item], null, undefined, false);
      expect(textCalls).toHaveLength(0);

      renderer.drawItemObjects(fakeCamera, [item], null, undefined, undefined);
      expect(textCalls).toHaveLength(0);
    });

    it("renders weapon label with ID in parentheses and bold 12px font when isPaused is true", () => {
      const { fakeCanvas, fakeCamera, textCalls } = createMockCanvas();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const item = {
        linkId: ItemLinkId.Weapon,
        kind: WPKind.Blaster,
        positionX: 100,
        positionY: 200,
        frame: 1,
      };

      renderer.drawItemObjects(fakeCamera, [item], null, undefined, true);
      expect(textCalls.length).toBeGreaterThan(0);
      const labelCall = textCalls[0]!;
      expect(labelCall.text).toMatch(/Blaster/);
      expect(labelCall.text).toMatch(/\(0x[0-9a-fA-F]+\)/);
      expect(labelCall.font).toContain("bold 12px");
    });

    it("renders generic item label with ID in parentheses when isPaused is true", () => {
      const { fakeCanvas, fakeCamera, textCalls } = createMockCanvas();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const item = {
        linkId: ItemLinkId.Item,
        kind: ITKind.Bomb,
        positionX: 50,
        positionY: 80,
        frame: 0,
      };

      renderer.drawItemObjects(fakeCamera, [item], null, undefined, true);
      expect(textCalls.length).toBeGreaterThan(0);
      const labelCall = textCalls[0]!;
      expect(labelCall.text).toMatch(/\(0x[0-9a-fA-F]+\)/);
      expect(labelCall.font).toContain("bold 12px");
    });

    it("renders enlarged boomerang weapon without throwing and displays its label when paused", () => {
      const { fakeCanvas, fakeCamera, textCalls } = createMockCanvas();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const item = {
        linkId: ItemLinkId.Weapon,
        kind: WPKind.Boomerang,
        positionX: 120,
        positionY: 150,
        frame: 5,
      };

      expect(() => {
        renderer.drawItemObjects(fakeCamera, [item], null, undefined, true);
      }).not.toThrow();

      expect(textCalls.length).toBeGreaterThan(0);
      const labelCall = textCalls[0]!;
      expect(labelCall.text).toMatch(/Boomerang/i);
      expect(labelCall.text).toMatch(/\(0x[0-9a-fA-F]+\)/);
    });

    it("renders all implemented custom weapon shapes without falling back to generic diamond", () => {
      const { fakeCanvas } = createMockCanvas();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const ctx = fakeCanvas.getContext("2d");

      const implementedWeaponKinds = [
        WPKind.Fireball,
        WPKind.Blaster,
        WPKind.ChargeShot,
        WPKind.SamusBomb,
        WPKind.Cutter,
        WPKind.EggThrow,
        WPKind.YoshiStar,
        WPKind.Boomerang,
        WPKind.ThunderJoltAir,
        WPKind.ThunderJoltGround,
        WPKind.ThunderHead,
        WPKind.ThunderTrail,
        WPKind.PKFire,
        WPKind.PKThunderHead,
        WPKind.PKThunderTrail,
        WPKind.BulletNormal,
        WPKind.BulletHard,
        WPKind.ArwingLaser2D,
        WPKind.ArwingLaser3D,
        WPKind.LGunAmmo,
        WPKind.FFlowerFlame,
        WPKind.StarRodStar,
      ];

      for (const kind of implementedWeaponKinds) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handled = (renderer as any).drawCustomWeaponShape(
          ctx,
          kind,
          100,
          200,
          false,
          1,
          0,
        );
        expect(
          handled,
          `Expected weapon kind 0x${kind.toString(16)} to have custom shape`,
        ).toBe(true);
      }
    });

    it("renders all implemented custom item shapes without falling back to generic diamond", () => {
      const { fakeCanvas } = createMockCanvas();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const ctx = fakeCanvas.getContext("2d");

      const implementedItemKinds = [
        ITKind.Bomb,
        ITKind.BobOmb,
        ITKind.RTTFBomb,
        ITKind.MotionSensorBomb,
        ITKind.Pokeball,
        ITKind.Star,
        ITKind.MaximTomato,
        ITKind.Heart,
        ITKind.BeamSword,
        ITKind.HomeRunBat,
        ITKind.Fan,
        ITKind.StarRod,
        ITKind.RayGun,
        ITKind.FireFlower,
        ITKind.Hammer,
        ITKind.GreenShell,
        ITKind.RedShell,
        ITKind.Bumper,
        ITKind.StageBumper,
        ITKind.PKFirePillar,
        ITKind.Capsule,
        ITKind.Crate,
        ITKind.Barrel,
        ITKind.PowBlock,
        ITKind.Egg,
        0xfe, // Bomb Explosion
      ];

      for (const kind of implementedItemKinds) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handled = (renderer as any).drawCustomItemShape(
          ctx,
          kind,
          100,
          200,
          12,
        );
        expect(
          handled,
          `Expected item kind 0x${kind.toString(16)} to have custom shape`,
        ).toBe(true);
      }
    });

    it("draws multi-phase bomb explosion at various progress levels without throwing", () => {
      const { fakeCanvas } = createMockCanvas();
      const renderer = new StageRenderer(fakeCanvas);
      const ctx = fakeCanvas.getContext("2d")!;

      // Phase 1 (supersonic flash & shockwave)
      expect(() => {
        renderer.drawBombExplosionAt(ctx, 150, 150, 0.1, false, 32);
      }).not.toThrow();

      // Phase 2 (expanding fireball puffs & flying shrapnel sparks)
      expect(() => {
        renderer.drawBombExplosionAt(ctx, 150, 150, 0.45, true, 36);
      }).not.toThrow();

      // Phase 3 (dark rising smoke puffs drifting upward and fading)
      expect(() => {
        renderer.drawBombExplosionAt(ctx, 150, 150, 0.85, false, 32);
      }).not.toThrow();
    });

    it("extractBombExplosions detects single and multiple simultaneous bombs exploding", () => {
      // Replay with multiple bombs
      // Bomb A: objectAddress 0x80100000 at (50, 100), frames 0..9, missing on frame 10 (detonates at frame 10)
      // Bomb B: objectAddress 0x80200000 at (-80, 200), frames 5..19, missing on frame 20 (detonates at frame 20)
      // Bomb C: objectAddress 0x80300000 at (0, 0), frames 0..25, stays active (no explosion)
      // Bomb D: objectAddress 0x80400000 falls below blast zone y = -4500, missing on frame 12 (no explosion event)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const frames: any[] = [];
      for (let f = 0; f <= 25; f++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = [];
        if (f < 10) {
          items.push({
            kind: ITKind.Bomb,
            linkId: ItemLinkId.Item,
            positionX: 50,
            positionY: 100,
            objectAddress: 0x80100000,
            frame: f,
          });
        }
        if (f >= 5 && f < 20) {
          items.push({
            kind: ITKind.BobOmb,
            linkId: ItemLinkId.Item,
            positionX: -80,
            positionY: 200,
            objectAddress: 0x80200000,
            frame: f,
          });
        }
        if (f <= 25) {
          items.push({
            kind: ITKind.RTTFBomb,
            linkId: ItemLinkId.Item,
            positionX: 0,
            positionY: 0,
            objectAddress: 0x80300000,
            frame: f,
          });
        }
        if (f < 12) {
          items.push({
            kind: ITKind.Bomb,
            linkId: ItemLinkId.Item,
            positionX: 10,
            positionY: -4500, // Deep below stage
            objectAddress: 0x80400000,
            frame: f,
          });
        }
        frames.push({ frame: f, ports: {}, items });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const replay: any = {
        header: { gameFamily: "smash64", schemaVersion: 1 },
        matchSettings: { stageId: 0 },
        frames,
      };

      const explosions = extractBombExplosions(replay);
      expect(explosions).toHaveLength(2);

      // Bomb A explosion
      const explosionA = explosions.find((e) => e.objectAddress === 0x80100000);
      expect(explosionA).toBeDefined();
      expect(explosionA!.startFrame).toBe(10);
      expect(explosionA!.x).toBe(50);
      expect(explosionA!.y).toBe(100);
      expect(explosionA!.isBobOmb).toBe(false);

      // Bomb B explosion (Bob-omb)
      const explosionB = explosions.find((e) => e.objectAddress === 0x80200000);
      expect(explosionB).toBeDefined();
      expect(explosionB!.startFrame).toBe(20);
      expect(explosionB!.x).toBe(-80);
      expect(explosionB!.y).toBe(200);
      expect(explosionB!.isBobOmb).toBe(true);

      // Bomb C did not disappear -> no explosion
      expect(
        explosions.find((e) => e.objectAddress === 0x80300000),
      ).toBeUndefined();

      // Bomb D fell into void -> no explosion
      expect(
        explosions.find((e) => e.objectAddress === 0x80400000),
      ).toBeUndefined();
    });
  });

  describe("Egg Throw Explosion Visual & Event Extraction", () => {
    const createMockCanvas = () => {
      const strokeCalls: number[] = [];
      const fills: string[] = [];
      const arcCalls: Array<{ x: number; y: number; radius: number }> = [];
      const ellipseCalls: Array<{
        x: number;
        y: number;
        radiusX: number;
        radiusY: number;
      }> = [];

      const ctx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: (x: number, y: number, radius: number) => {
          arcCalls.push({ x, y, radius });
        },
        ellipse: (x: number, y: number, radiusX: number, radiusY: number) => {
          ellipseCalls.push({ x, y, radiusX, radiusY });
        },
        quadraticCurveTo: () => {},
        rect: () => {},
        roundRect: () => {},
        fill: () => {},
        stroke: () => {
          strokeCalls.push(1);
        },
        createRadialGradient: () => ({
          addColorStop: (_pos: number, color: string) => fills.push(color),
        }),
        createLinearGradient: () => ({
          addColorStop: (_pos: number, color: string) => fills.push(color),
        }),
        setLineDash: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        clearRect: () => {},
        measureText: (text: string) => ({ width: text.length * 8 }),
        fillText: () => {},
        strokeText: () => {},
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        shadowColor: "",
        shadowBlur: 0,
        globalAlpha: 1,
      } as unknown as CanvasRenderingContext2D;

      const fakeCanvas = {
        getContext: () => ctx,
        width: 800,
        height: 600,
      } as unknown as HTMLCanvasElement;

      return { fakeCanvas, strokeCalls, fills, arcCalls, ellipseCalls };
    };

    it("isEggThrowObject accurately identifies Yoshi egg throw projectiles", () => {
      expect(isEggThrowObject(ItemLinkId.Weapon, WPKind.EggThrow)).toBe(true);
      expect(isEggThrowObject(ItemLinkId.Weapon, 0x05)).toBe(true);
      expect(isEggThrowObject(ItemLinkId.Weapon, WPKind.SamusBomb)).toBe(false);
      expect(isEggThrowObject(ItemLinkId.Item, ITKind.Bomb)).toBe(false);
      expect(isEggThrowObject(ItemLinkId.Item, WPKind.EggThrow)).toBe(false);
    });

    it("extractEggExplosions detects single and multiple simultaneous egg throws exploding on disappearance", () => {
      // Egg A: objectAddress 0x80500000 at (40, 120), frames 0..8, missing on frame 9 (detonates at frame 9)
      // Egg B: objectAddress 0x80600000 at (-60, 180), frames 3..14, missing on frame 15 (detonates at frame 15)
      // Egg C: objectAddress 0x80700000 at (0, 0), frames 0..20, stays active (no explosion)
      // Egg D: objectAddress 0x80800000 falls below blast zone y = -4500, missing on frame 10 (no explosion event)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const frames: any[] = [];
      for (let f = 0; f <= 20; f++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = [];
        if (f < 9) {
          items.push({
            kind: WPKind.EggThrow,
            linkId: ItemLinkId.Weapon,
            positionX: 40,
            positionY: 120,
            objectAddress: 0x80500000,
            frame: f,
          });
        }
        if (f >= 3 && f < 15) {
          items.push({
            kind: WPKind.EggThrow,
            linkId: ItemLinkId.Weapon,
            positionX: -60,
            positionY: 180,
            objectAddress: 0x80600000,
            frame: f,
          });
        }
        if (f <= 20) {
          items.push({
            kind: WPKind.EggThrow,
            linkId: ItemLinkId.Weapon,
            positionX: 0,
            positionY: 0,
            objectAddress: 0x80700000,
            frame: f,
          });
        }
        if (f < 10) {
          items.push({
            kind: WPKind.EggThrow,
            linkId: ItemLinkId.Weapon,
            positionX: 10,
            positionY: -4500, // Deep below stage blast zone
            objectAddress: 0x80800000,
            frame: f,
          });
        }
        // Non-egg weapon
        items.push({
          kind: WPKind.SamusBomb,
          linkId: ItemLinkId.Weapon,
          positionX: 100,
          positionY: 50,
          objectAddress: 0x80900000,
          frame: f,
        });

        frames.push({ frame: f, ports: {}, items });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const replay: any = {
        header: { gameFamily: "smash64", schemaVersion: 1 },
        matchSettings: { stageId: 0 },
        frames,
      };

      const explosions = extractEggExplosions(replay);
      expect(explosions).toHaveLength(2);

      // Egg A explosion
      const explosionA = explosions.find((e) => e.objectAddress === 0x80500000);
      expect(explosionA).toBeDefined();
      expect(explosionA!.startFrame).toBe(9);
      expect(explosionA!.x).toBe(40);
      expect(explosionA!.y).toBe(120);
      expect(explosionA!.radius).toBe(32);

      // Egg B explosion
      const explosionB = explosions.find((e) => e.objectAddress === 0x80600000);
      expect(explosionB).toBeDefined();
      expect(explosionB!.startFrame).toBe(15);
      expect(explosionB!.x).toBe(-60);
      expect(explosionB!.y).toBe(180);

      // Egg C did not disappear -> no explosion
      expect(
        explosions.find((e) => e.objectAddress === 0x80700000),
      ).toBeUndefined();

      // Egg D fell below blast zone -> no explosion
      expect(
        explosions.find((e) => e.objectAddress === 0x80800000),
      ).toBeUndefined();

      // Non-egg weapon not tracked
      expect(
        explosions.find((e) => e.objectAddress === 0x80900000),
      ).toBeUndefined();
    });

    it("draws multi-phase egg explosion across progress levels without throwing", () => {
      const { fakeCanvas } = createMockCanvas();
      const renderer = new StageRenderer(fakeCanvas);
      const ctx = fakeCanvas.getContext("2d")!;

      // Phase 1 (crack flash & supersonic shockwave ring)
      expect(() => {
        renderer.drawEggExplosionAt(ctx, 120, 120, 0.1, 32);
      }).not.toThrow();

      // Phase 2 (starbursts & soft yolk clouds)
      expect(() => {
        renderer.drawEggExplosionAt(ctx, 120, 120, 0.45, 32);
      }).not.toThrow();

      // Phase 3/4 (tumbling eggshell shards with spots & dissipating cream puffs)
      expect(() => {
        renderer.drawEggExplosionAt(ctx, 120, 120, 0.85, 32);
      }).not.toThrow();

      // Bounds checks (< 0 and > 1 should be no-ops)
      expect(() => {
        renderer.drawEggExplosionAt(ctx, 120, 120, -0.1, 32);
        renderer.drawEggExplosionAt(ctx, 120, 120, 1.1, 32);
      }).not.toThrow();
    });

    it("caches egg explosions per replay instance on StageRenderer", () => {
      const { fakeCanvas } = createMockCanvas();
      const renderer = new StageRenderer(fakeCanvas);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const replay: any = {
        header: { gameFamily: "smash64", schemaVersion: 1 },
        matchSettings: { stageId: 0 },
        frames: [],
      };

      const result1 = renderer.getEggExplosions(replay);
      const result2 = renderer.getEggExplosions(replay);
      expect(result1).toBe(result2);
    });

    it("has expected duration constant", () => {
      expect(EGG_EXPLOSION_DURATION).toBe(22);
    });
  });

  describe("Samus Morph Ball Bomb Cybernetic Explosion Visual & Event Extraction", () => {
    const createMockCanvas = () => {
      const strokeCalls: number[] = [];
      const fills: string[] = [];
      const arcCalls: Array<{ x: number; y: number; radius: number }> = [];
      const ellipseCalls: Array<{
        x: number;
        y: number;
        radiusX: number;
        radiusY: number;
      }> = [];

      const ctx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: (x: number, y: number, radius: number) => {
          arcCalls.push({ x, y, radius });
        },
        ellipse: (x: number, y: number, radiusX: number, radiusY: number) => {
          ellipseCalls.push({ x, y, radiusX, radiusY });
        },
        quadraticCurveTo: () => {},
        rect: () => {},
        roundRect: () => {},
        fill: () => {},
        stroke: () => {
          strokeCalls.push(1);
        },
        createRadialGradient: () => ({
          addColorStop: (_pos: number, color: string) => fills.push(color),
        }),
        createLinearGradient: () => ({
          addColorStop: (_pos: number, color: string) => fills.push(color),
        }),
        setLineDash: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        clearRect: () => {},
        measureText: (text: string) => ({ width: text.length * 8 }),
        fillText: () => {},
        strokeText: () => {},
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        shadowColor: "",
        shadowBlur: 0,
        globalAlpha: 1,
      } as unknown as CanvasRenderingContext2D;

      const fakeCanvas = {
        getContext: () => ctx,
        width: 800,
        height: 600,
      } as unknown as HTMLCanvasElement;

      return { fakeCanvas, strokeCalls, fills, arcCalls, ellipseCalls };
    };

    it("isSamusBombObject accurately identifies Samus Morph Ball Bomb weapon objects", () => {
      expect(isSamusBombObject(ItemLinkId.Weapon, WPKind.SamusBomb)).toBe(true);
      expect(isSamusBombObject(ItemLinkId.Weapon, 0x03)).toBe(true);
      expect(isSamusBombObject(ItemLinkId.Weapon, WPKind.EggThrow)).toBe(false);
      expect(isSamusBombObject(ItemLinkId.Item, ITKind.Bomb)).toBe(false);
    });

    it("extractBombExplosions and extractSamusBombExplosions track Samus bombs with custom radius", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const frames: any[] = [];
      for (let f = 0; f <= 15; f++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = [];
        // Samus bomb active frames 0..7, missing frame 8
        if (f < 8) {
          items.push({
            kind: WPKind.SamusBomb,
            linkId: ItemLinkId.Weapon,
            positionX: 30,
            positionY: 80,
            objectAddress: 0x80a00000,
            frame: f,
          });
        }
        // Generic bomb active frames 0..11, missing frame 12
        if (f < 12) {
          items.push({
            kind: ITKind.Bomb,
            linkId: ItemLinkId.Item,
            positionX: -40,
            positionY: 90,
            objectAddress: 0x80b00000,
            frame: f,
          });
        }
        frames.push({ frame: f, ports: {}, items });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const replay: any = {
        header: { gameFamily: "smash64", schemaVersion: 1 },
        matchSettings: { stageId: 0 },
        frames,
      };

      const allExplosions = extractBombExplosions(replay);
      expect(allExplosions).toHaveLength(2);

      const samusExplosion = allExplosions.find(
        (e) => e.objectAddress === 0x80a00000,
      );
      expect(samusExplosion).toBeDefined();
      expect(samusExplosion!.isSamusBomb).toBe(true);
      expect(samusExplosion!.radius).toBe(28);
      expect(samusExplosion!.startFrame).toBe(8);

      const genericExplosion = allExplosions.find(
        (e) => e.objectAddress === 0x80b00000,
      );
      expect(genericExplosion).toBeDefined();
      expect(genericExplosion!.isSamusBomb).toBe(false);
      expect(genericExplosion!.radius).toBe(36);

      const samusOnly = extractSamusBombExplosions(replay);
      expect(samusOnly).toHaveLength(1);
      expect(samusOnly[0]!.objectAddress).toBe(0x80a00000);
    });

    it("draws multi-phase Samus bomb cybernetic explosion without throwing", () => {
      const { fakeCanvas } = createMockCanvas();
      const renderer = new StageRenderer(fakeCanvas);
      const ctx = fakeCanvas.getContext("2d")!;

      // Phase 1 (concentric cyan shockwave rings & reticle)
      expect(() => {
        renderer.drawSamusBombExplosionAt(ctx, 100, 100, 0.1, 28);
      }).not.toThrow();

      // Phase 2/3 (electric lightning arcs & glowing plasma sphere)
      expect(() => {
        renderer.drawSamusBombExplosionAt(ctx, 100, 100, 0.45, 28);
      }).not.toThrow();

      // Phase 4 (ethereal ionized plasma vapor dissipation)
      expect(() => {
        renderer.drawSamusBombExplosionAt(ctx, 100, 100, 0.85, 28);
      }).not.toThrow();

      // Bounds checks
      expect(() => {
        renderer.drawSamusBombExplosionAt(ctx, 100, 100, -0.1, 28);
        renderer.drawSamusBombExplosionAt(ctx, 100, 100, 1.1, 28);
      }).not.toThrow();

      // Dispatch through drawBombExplosionAt with isSamusBomb
      expect(() => {
        renderer.drawBombExplosionAt(ctx, 100, 100, 0.3, false, 28, true);
      }).not.toThrow();
    });

    it("getSamusBombExplosions queries Samus bomb explosions from replay", () => {
      const { fakeCanvas } = createMockCanvas();
      const renderer = new StageRenderer(fakeCanvas);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const replay: any = {
        header: { gameFamily: "smash64", schemaVersion: 1 },
        matchSettings: { stageId: 0 },
        frames: [],
      };

      const result = renderer.getSamusBombExplosions(replay);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Charge Shot and Giant Punch Recorder Schema 2 Visual Enhancements", () => {
    const createMockCanvas = () => {
      const strokeCalls: number[] = [];
      const fills: string[] = [];
      const arcCalls: Array<{ x: number; y: number; radius: number }> = [];
      const ellipseCalls: Array<{
        x: number;
        y: number;
        radiusX: number;
        radiusY: number;
      }> = [];
      const fillRectCalls: Array<{
        x: number;
        y: number;
        w: number;
        h: number;
      }> = [];
      const roundRectCalls: Array<{
        x: number;
        y: number;
        w: number;
        h: number;
      }> = [];
      const rotateCalls: number[] = [];
      let currentGlobalAlpha = 1;
      let currentFillStyle = "";
      let currentStrokeStyle = "";

      const fakeCanvas = {
        getContext: () => ({
          save: () => {},
          restore: () => {},
          beginPath: () => {},
          closePath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          rect: () => {},
          roundRect: (x: number, y: number, w: number, h: number) => {
            roundRectCalls.push({ x, y, w, h });
          },
          fillRect: (x: number, y: number, w: number, h: number) => {
            fillRectCalls.push({ x, y, w, h });
          },
          strokeRect: () => {},
          clearRect: () => {},
          clip: () => {},
          setLineDash: () => {},
          createRadialGradient: () => ({ addColorStop: () => {} }),
          createLinearGradient: () => ({ addColorStop: () => {} }),
          fill: () => {
            fills.push(currentFillStyle);
          },
          stroke: () => {
            strokeCalls.push(1);
          },
          translate: () => {},
          rotate: (angle: number) => {
            rotateCalls.push(angle);
          },
          scale: () => {},
          arc: (x: number, y: number, radius: number) => {
            arcCalls.push({ x, y, radius });
          },
          ellipse: (x: number, y: number, radiusX: number, radiusY: number) => {
            ellipseCalls.push({ x, y, radiusX, radiusY });
          },
          quadraticCurveTo: () => {},
          set globalAlpha(val: number) {
            currentGlobalAlpha = val;
          },
          get globalAlpha() {
            return currentGlobalAlpha;
          },
          set fillStyle(val: string) {
            currentFillStyle = val;
          },
          get fillStyle() {
            return currentFillStyle;
          },
          set strokeStyle(val: string) {
            currentStrokeStyle = val;
          },
          get strokeStyle() {
            return currentStrokeStyle;
          },
          lineWidth: 1,
          shadowColor: "",
          shadowBlur: 0,
          font: "",
          measureText: (s: string) => ({ width: s.length * 6 }),
          fillText: () => {},
        }),
        width: 960,
        height: 540,
        getAttribute: () => null,
      } as unknown as HTMLCanvasElement;

      const fakeCamera = {
        worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
        worldLengthToScreen: (len: number) => len,
      };

      return {
        fakeCanvas,
        fakeCamera,
        arcCalls,
        ellipseCalls,
        fillRectCalls,
        roundRectCalls,
        rotateCalls,
        getGlobalAlpha: () => currentGlobalAlpha,
        getStrokeStyle: () => currentStrokeStyle,
        getFillStyle: () => currentFillStyle,
        fills,
      };
    };

    describe("Part 1: Charge Shot real world-unit sizing", () => {
      it("calibrates full charge radius to 130 world units (260-unit diameter)", () => {
        expect(CHARGE_SHOT_FULL_CHARGE_RADIUS_WORLD).toBe(130);
        expect(CHARGE_SHOT_FULL_CHARGE_SCALE).toBeCloseTo(700 / 30);
      });

      it("verifies all charge levels 0-7 scales", () => {
        expect(CHARGE_SHOT_LEVEL_SCALES).toEqual([
          5.0, 7.67, 9.33, 11.33, 13.67, 16.33, 20.0, 23.33,
        ]);
      });

      it("draws Charge Shot with proportional radius across charge scales", () => {
        const { fakeCanvas } = createMockCanvas();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new (StageRenderer as any)(fakeCanvas);
        const ctx = fakeCanvas.getContext("2d")!;

        for (const scale of CHARGE_SHOT_LEVEL_SCALES) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const handled = (renderer as any).drawCustomWeaponShape(
            ctx,
            WPKind.ChargeShot,
            100,
            200,
            false,
            1,
            0,
            scale,
          );
          expect(handled).toBe(true);
        }
      });

      it("falls back to full charge radius when gameScale is undefined (schema 1)", () => {
        const { fakeCanvas } = createMockCanvas();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new (StageRenderer as any)(fakeCanvas);
        const ctx = fakeCanvas.getContext("2d")!;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handled = (renderer as any).drawCustomWeaponShape(
          ctx,
          WPKind.ChargeShot,
          100,
          200,
          false,
          1,
          0,
          undefined,
        );
        expect(handled).toBe(true);
      });
    });

    describe("Part 2: Charging orb suppression", () => {
      it("identifies charging orb when Samus is charging Neutral-B and item matches her charge and position", () => {
        const { fakeCanvas } = createMockCanvas();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new (StageRenderer as any)(fakeCanvas);

        const frame = {
          frame: 100,
          ports: {
            "0": {
              state: {
                characterId: 3, // Samus US
                actionStateId: 0x0df, // charge_shot charging
                positionX: 500,
                positionY: 200,
                characterSpecific: 2, // charge level 2 -> scale 9.33
              },
            },
          },
        } as unknown as Frame;

        const item = {
          linkId: ItemLinkId.Weapon,
          kind: WPKind.ChargeShot,
          positionX: 530,
          positionY: 230,
          scaleX: 9.33,
          scaleY: 9.33,
          frame: 100,
        } as unknown as ItemUpdate;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isOrb = (renderer as any).isChargingOrb(item, frame, null);
        expect(isOrb).toBe(true);
      });

      it("does not suppress fired shot in flight (scale matches prior charge, Samus charge zeroed, not charging)", () => {
        const { fakeCanvas } = createMockCanvas();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new (StageRenderer as any)(fakeCanvas);

        const frame = {
          frame: 120,
          ports: {
            "0": {
              state: {
                characterId: 3, // Samus
                actionStateId: 0x0e2, // charge_shot_fire
                positionX: 500,
                positionY: 200,
                characterSpecific: 0, // zeroed on firing
              },
            },
          },
        } as unknown as Frame;

        const firedShot = {
          linkId: ItemLinkId.Weapon,
          kind: WPKind.ChargeShot,
          positionX: 550,
          positionY: 230,
          scaleX: 23.33,
          scaleY: 23.33,
          frame: 120,
        } as unknown as ItemUpdate;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isOrb = (renderer as any).isChargingOrb(firedShot, frame, null);
        expect(isOrb).toBe(false);
      });

      it("falls back to false in schema 1 replays where scaleX/scaleY is undefined", () => {
        const { fakeCanvas } = createMockCanvas();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new (StageRenderer as any)(fakeCanvas);

        const frame = {
          frame: 100,
          ports: {
            "0": {
              state: {
                characterId: 3,
                actionStateId: 0x0df,
                positionX: 500,
                positionY: 200,
                characterSpecific: undefined,
              },
            },
          },
        } as unknown as Frame;

        const item = {
          linkId: ItemLinkId.Weapon,
          kind: WPKind.ChargeShot,
          positionX: 530,
          positionY: 230,
          scaleX: undefined,
          scaleY: undefined,
          frame: 100,
        } as unknown as ItemUpdate;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isOrb = (renderer as any).isChargingOrb(item, frame, null);
        expect(isOrb).toBe(false);
      });
    });

    describe("Part 3: Battery charge meter for Samus and DK", () => {
      it("renders 8 stages for Samus (US id 3 and JP id 36)", () => {
        for (const cid of [3, 36]) {
          const { fakeCanvas, roundRectCalls } = createMockCanvas();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const renderer = new (StageRenderer as any)(fakeCanvas);

          const post = {
            characterId: cid,
            actionStateId: 0x0df, // charging
            characterSpecific: 3,
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (renderer as any).drawChargeMeter(
            100,
            200,
            20,
            50,
            true,
            post,
            0 as PortIndex,
            null,
            10,
            false,
          );

          // Battery casing roundRect is drawn
          expect(roundRectCalls.length).toBeGreaterThan(0);
        }
      });

      it("renders 11 stages for Donkey Kong (US id 2 and JP id 44)", () => {
        for (const cid of [2, 44]) {
          const { fakeCanvas, roundRectCalls } = createMockCanvas();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const renderer = new (StageRenderer as any)(fakeCanvas);

          const post = {
            characterId: cid,
            actionStateId: 0x0e0, // winding up
            characterSpecific: 5,
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (renderer as any).drawChargeMeter(
            100,
            200,
            20,
            50,
            true,
            post,
            0 as PortIndex,
            null,
            10,
            false,
          );

          expect(roundRectCalls.length).toBeGreaterThan(0);
        }
      });

      it("strictly gates out Kirby (US 8, JP 48) and other characters", () => {
        for (const cid of [8, 48, 0, 1, 9]) {
          const { fakeCanvas, roundRectCalls } = createMockCanvas();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const renderer = new (StageRenderer as any)(fakeCanvas);

          const post = {
            characterId: cid,
            actionStateId: 0x0a,
            characterSpecific: 3, // Kirby copying or garbage data
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (renderer as any).drawChargeMeter(
            100,
            200,
            20,
            50,
            true,
            post,
            0 as PortIndex,
            null,
            10,
            true, // even paused!
          );

          expect(roundRectCalls).toHaveLength(0);
        }
      });

      it("reappears at full opacity (1.0) while playback is paused", () => {
        const { fakeCanvas, getGlobalAlpha } = createMockCanvas();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new (StageRenderer as any)(fakeCanvas);

        const post = {
          characterId: 3,
          actionStateId: 0x00a, // idle, not charging
          characterSpecific: 4, // stored charge
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (renderer as any).drawChargeMeter(
          100,
          200,
          20,
          50,
          true,
          post,
          0 as PortIndex,
          null,
          100,
          true, // isPaused
        );

        expect(getGlobalAlpha()).toBe(1.0);
      });

      it("applies rainbow styling at full charge (Samus charge 7, DK charge 10)", () => {
        // Samus full charge
        {
          const { fakeCanvas, getStrokeStyle } = createMockCanvas();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const renderer = new (StageRenderer as any)(fakeCanvas);

          const post = {
            characterId: 3,
            actionStateId: 0x0df,
            characterSpecific: 7, // full charge for Samus
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (renderer as any).drawChargeMeter(
            100,
            200,
            20,
            50,
            true,
            post,
            0 as PortIndex,
            null,
            10,
            false,
          );

          expect(getStrokeStyle()).toMatch(/hsl\(/);
        }

        // DK full charge
        {
          const { fakeCanvas, getStrokeStyle } = createMockCanvas();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const renderer = new (StageRenderer as any)(fakeCanvas);

          const post = {
            characterId: 2,
            actionStateId: 0x0e0,
            characterSpecific: 10, // full charge for DK
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (renderer as any).drawChargeMeter(
            100,
            200,
            20,
            50,
            true,
            post,
            0 as PortIndex,
            null,
            10,
            false,
          );

          expect(getStrokeStyle()).toMatch(/hsl\(/);
        }
      });

      it("falls back gracefully without drawing empty UI when characterSpecific is undefined (schema 1)", () => {
        const { fakeCanvas, roundRectCalls } = createMockCanvas();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new (StageRenderer as any)(fakeCanvas);

        const post = {
          characterId: 3,
          actionStateId: 0x0df,
          characterSpecific: undefined, // schema 1
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (renderer as any).drawChargeMeter(
          100,
          200,
          20,
          50,
          true,
          post,
          0 as PortIndex,
          null,
          10,
          true,
        );

        expect(roundRectCalls).toHaveLength(0);
      });
    });

    describe("Part 4: Charge Shot visual in Samus charging animation", () => {
      it("renders charge shot marker during charge_shot specialType", () => {
        const { fakeCanvas, arcCalls } = createMockCanvas();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new (StageRenderer as any)(fakeCanvas);
        const camera = new Camera(800, 600);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (renderer as any).drawSamusSpecial(
          camera,
          200,
          300,
          20,
          50,
          true,
          "#ff0000",
          "charge_shot",
          10,
          5,
        );

        expect(arcCalls.length).toBeGreaterThan(0);
      });
    });

    describe("Part 5: DK Giant Punch windup and execution animation", () => {
      it("renders rotating arm windup animation during giant_punch_windup", () => {
        const { fakeCanvas, arcCalls, ellipseCalls } = createMockCanvas();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new (StageRenderer as any)(fakeCanvas);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (renderer as any).drawDKSpecial(
          200,
          350,
          300,
          25,
          60,
          true,
          "#ff0000",
          "giant_punch_windup",
          12,
          7,
        );

        expect(ellipseCalls.length).toBeGreaterThan(0);
        expect(arcCalls.length).toBeGreaterThan(0);
      });

      it("scales giant_punch_windup fist and arm proportionally with halfWidth across camera zooms", () => {
        const mockZoomedIn = createMockCanvas();
        const mockZoomedOut = createMockCanvas();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer1 = new (StageRenderer as any)(mockZoomedIn.fakeCanvas);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer2 = new (StageRenderer as any)(mockZoomedOut.fakeCanvas);

        // Zoomed in: halfWidth = 30
        renderer1.drawDKSpecial(
          200,
          350,
          300,
          30,
          72,
          true,
          "#ff0000",
          "giant_punch_windup",
          10,
          5,
        );
        // Zoomed out: halfWidth = 6 (5x smaller camera zoom)
        renderer2.drawDKSpecial(
          200,
          350,
          300,
          6,
          14.4,
          true,
          "#ff0000",
          "giant_punch_windup",
          10,
          5,
        );

        // Clenched fist radius is halfWidth * 0.55
        const fistArcZoomedIn = mockZoomedIn.arcCalls.find(
          (c) => Math.abs(c.radius - 30 * 0.55) < 0.01,
        );
        const fistArcZoomedOut = mockZoomedOut.arcCalls.find(
          (c) => Math.abs(c.radius - 6 * 0.55) < 0.01,
        );

        expect(fistArcZoomedIn).toBeDefined();
        expect(fistArcZoomedOut).toBeDefined();
        // The zoomed-out fist radius should be strictly smaller (1/5th), not clamped to a large minimum
        expect(fistArcZoomedOut!.radius).toBeCloseTo(3.3, 1);
        expect(fistArcZoomedIn!.radius).toBeCloseTo(16.5, 1);
      });

      it("renders forward haymaker punch and shockwave burst during giant_punch execution", () => {
        const { fakeCanvas, arcCalls, ellipseCalls } = createMockCanvas();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new (StageRenderer as any)(fakeCanvas);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (renderer as any).drawDKSpecial(
          200,
          350,
          300,
          25,
          60,
          true,
          "#ff0000",
          "giant_punch",
          5,
          10, // full charge
        );

        // Expect forward fist arcs and impact shockwave ellipses
        expect(arcCalls.length).toBeGreaterThan(0);
        expect(ellipseCalls.length).toBeGreaterThan(0);
      });
    });

    describe("Part 6: Captain Falcon Falcon Punch and Falcon Kick animations", () => {
      it("renders charging windup with swirling vortex and solar core during punch windup (frame < 40)", () => {
        const { fakeCanvas, arcCalls, ellipseCalls } = createMockCanvas();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new (StageRenderer as any)(fakeCanvas);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (renderer as any).drawFalconSpecial(
          200,
          300,
          25,
          60,
          true,
          "#ff0000",
          "punch",
          20, // Windup phase
        );

        // Should render cocked glove fist ellipse and solar core / ember arcs
        expect(ellipseCalls.length).toBeGreaterThan(0);
        expect(arcCalls.length).toBeGreaterThan(0);
      });

      it("renders fiery raptor falcon silhouette, glove fist, and shockwaves during punch strike (40 <= frame < 55)", () => {
        const { fakeCanvas, arcCalls, ellipseCalls } = createMockCanvas();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new (StageRenderer as any)(fakeCanvas);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (renderer as any).drawFalconSpecial(
          200,
          300,
          25,
          60,
          true,
          "#ff0000",
          "punch",
          45, // Strike phase
        );

        // Should render raptor eye, shockwave ellipse, and white fist glove
        expect(ellipseCalls.length).toBeGreaterThan(0);
        expect(arcCalls.length).toBeGreaterThan(0);
      });

      it("renders dissolving embers and follow-through fist during punch dissipation (frame >= 55)", () => {
        const { fakeCanvas, arcCalls, ellipseCalls } = createMockCanvas();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new (StageRenderer as any)(fakeCanvas);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (renderer as any).drawFalconSpecial(
          200,
          300,
          25,
          60,
          true,
          "#ff0000",
          "punch",
          65, // Dissipation phase
        );

        // Should render follow-through glove and dissipating embers
        expect(ellipseCalls.length).toBeGreaterThan(0);
        expect(arcCalls.length).toBeGreaterThan(0);
      });

      it("renders supersonic flame lance, boot, and jet exhaust during active falcon kick", () => {
        const { fakeCanvas, arcCalls, ellipseCalls } = createMockCanvas();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new (StageRenderer as any)(fakeCanvas);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (renderer as any).drawFalconSpecial(
          200,
          300,
          25,
          60,
          true,
          "#ff0000",
          "kick",
          10, // Active flying kick
        );

        // Should render shockwave ellipse and friction spark arcs
        expect(ellipseCalls.length).toBeGreaterThan(0);
        expect(arcCalls.length).toBeGreaterThan(0);
      });

      it("maps aerial falcon kick state 0x0e9 to kick_air and renders 20-degree steep downward dive spear", () => {
        const specialType = getFalconSpecialType(0x07, 0x0e9);
        expect(specialType).toBe("kick_air");

        const { fakeCanvas, arcCalls, ellipseCalls, rotateCalls } =
          createMockCanvas();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new (StageRenderer as any)(fakeCanvas);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (renderer as any).drawFalconSpecial(
          200,
          300,
          25,
          60,
          true,
          "#ff0000",
          specialType!,
          12,
        );

        expect(ellipseCalls.length).toBeGreaterThan(0);
        expect(arcCalls.length).toBeGreaterThan(0);
        // Expect rotation to be ~20° from straight down = 70° below horizontal
        const expectedAngle = (70 * Math.PI) / 180;
        expect(rotateCalls).toContainEqual(expectedAngle);
      });

      it("renders scorched floor skid trace, friction sparks, and smoke plumes during falcon kick end", () => {
        const { fakeCanvas, arcCalls } = createMockCanvas();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = new (StageRenderer as any)(fakeCanvas);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (renderer as any).drawFalconSpecial(
          200,
          300,
          25,
          60,
          true,
          "#ff0000",
          "kick_end",
          5, // Braking recovery
        );

        // Should render friction sparks and smoke puff arcs
        expect(arcCalls.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Shield Health Visualization", () => {
    const createMockShieldCanvas = () => {
      const arcCalls: Array<{
        x: number;
        y: number;
        radius: number;
        startAngle?: number;
        endAngle?: number;
      }> = [];
      const lineToCalls: Array<{ x: number; y: number }> = [];
      const moveToCalls: Array<{ x: number; y: number }> = [];
      const roundRectCalls: Array<{
        x: number;
        y: number;
        w: number;
        h: number;
      }> = [];
      const textCalls: Array<{ text: string; x: number; y: number }> = [];
      const strokeStyles: string[] = [];
      let currentStrokeStyle = "";

      const ctx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: (x: number, y: number) => {
          moveToCalls.push({ x, y });
        },
        lineTo: (x: number, y: number) => {
          lineToCalls.push({ x, y });
        },
        rect: () => {},
        roundRect: (x: number, y: number, w: number, h: number) => {
          roundRectCalls.push({ x, y, w, h });
        },
        createRadialGradient: () => ({ addColorStop: () => {} }),
        fill: () => {},
        stroke: () => {
          strokeStyles.push(currentStrokeStyle);
        },
        arc: (
          x: number,
          y: number,
          radius: number,
          startAngle?: number,
          endAngle?: number,
        ) => {
          arcCalls.push({ x, y, radius, startAngle, endAngle });
        },
        set strokeStyle(val: string) {
          currentStrokeStyle = val;
        },
        get strokeStyle() {
          return currentStrokeStyle;
        },
        set fillStyle(_val: string) {},
        get fillStyle() {
          return "";
        },
        lineWidth: 1,
        lineCap: "butt",
        lineJoin: "miter",
        shadowColor: "",
        shadowBlur: 0,
        font: "",
        textAlign: "left",
        textBaseline: "alphabetic",
        measureText: (s: string) => ({ width: s.length * 6 }),
        fillText: (text: string, x: number, y: number) => {
          textCalls.push({ text, x, y });
        },
      } as unknown as CanvasRenderingContext2D;

      return {
        ctx,
        arcCalls,
        lineToCalls,
        moveToCalls,
        roundRectCalls,
        textCalls,
        strokeStyles,
      };
    };

    it("scales shield physical radius based on shieldHealth formula", () => {
      // Unscaled base radius = Math.max(10 * 1.35, 30 * 0.58) + 3 = 17.4 + 3 = 20.4
      // Full health (55 HP): radiusScale = 1.0 -> 20.4
      const full = createMockShieldCanvas();
      drawShieldBubble(full.ctx, 100, 100, 10, 30, "#3b82f6", false, 0, 55);
      const fullRadius = full.arcCalls[0]!.radius;
      expect(fullRadius).toBeCloseTo(20.4, 1);

      // Low health (10 HP): healthRatio = 10/55, radiusScale = 0.48 + 0.52 * (10/55) ~ 0.5745 -> ~11.72
      const low = createMockShieldCanvas();
      drawShieldBubble(low.ctx, 100, 100, 10, 30, "#3b82f6", false, 0, 10);
      const lowRadius = low.arcCalls[0]!.radius;
      expect(lowRadius).toBeCloseTo(20.4 * (0.48 + 0.52 * (10 / 55)), 1);
      expect(lowRadius).toBeLessThan(fullRadius);

      // Broken / 0 health: radiusScale = 0.48 -> 20.4 * 0.48 ~ 9.79
      const zero = createMockShieldCanvas();
      drawShieldBubble(zero.ctx, 100, 100, 10, 30, "#3b82f6", false, 0, 0);
      const zeroRadius = zero.arcCalls[0]!.radius;
      expect(zeroRadius).toBeCloseTo(20.4 * 0.48, 1);

      // Undefined health (Schema 1 fallback): defaults to 55 full health
      const undef = createMockShieldCanvas();
      drawShieldBubble(
        undef.ctx,
        100,
        100,
        10,
        30,
        "#3b82f6",
        false,
        0,
        undefined,
      );
      expect(undef.arcCalls[0]!.radius).toBeCloseTo(fullRadius, 1);
    });

    it("transitions shield colors across health tiers (port color -> amber -> crimson -> flashing strobe)", () => {
      // Full / High (55 HP): port color
      const high = createMockShieldCanvas();
      drawShieldBubble(high.ctx, 100, 100, 10, 30, "#3b82f6", false, 0, 55);
      // Rim stroke contains player color
      expect(high.strokeStyles.some((s) => s.includes("59, 130, 246"))).toBe(
        true,
      );

      // Medium (30 HP, 26-41): amber #f59e0b
      const med = createMockShieldCanvas();
      drawShieldBubble(med.ctx, 100, 100, 10, 30, "#3b82f6", false, 0, 30);
      expect(
        med.strokeStyles.some(
          (s) => s.includes("245, 158, 11") || s === "#f59e0b",
        ),
      ).toBe(true);

      // Low (20 HP, 12-25): warning crimson #dc2626
      const low = createMockShieldCanvas();
      drawShieldBubble(low.ctx, 100, 100, 10, 30, "#3b82f6", false, 0, 20);
      expect(
        low.strokeStyles.some(
          (s) => s.includes("220, 38, 38") || s === "#dc2626",
        ),
      ).toBe(true);

      // Critical (10 HP, <= 11): flashing strobe between white and red
      const crit0 = createMockShieldCanvas();
      drawShieldBubble(crit0.ctx, 100, 100, 10, 30, "#3b82f6", false, 0, 10); // frame 0 -> #ffffff
      const crit4 = createMockShieldCanvas();
      drawShieldBubble(crit4.ctx, 100, 100, 10, 30, "#3b82f6", false, 4, 10); // frame 4 -> #ef4444
      expect(
        crit0.strokeStyles.some(
          (s) => s === "#ffffff" || s.includes("255, 255, 255"),
        ),
      ).toBe(true);
      expect(
        crit4.strokeStyles.some(
          (s) => s === "#ef4444" || s.includes("239, 68, 68"),
        ),
      ).toBe(true);
    });

    it("renders micro-cracks at low and critical shield health", () => {
      // High health: no micro-cracks
      const high = createMockShieldCanvas();
      drawShieldBubble(high.ctx, 100, 100, 10, 30, "#3b82f6", false, 0, 50);
      expect(high.lineToCalls.length).toBe(0);

      // Low health (20 HP, 12-25): 2 micro-cracks drawn
      const low = createMockShieldCanvas();
      drawShieldBubble(low.ctx, 100, 100, 10, 30, "#3b82f6", false, 0, 20);
      const lowLineCount = low.lineToCalls.length;
      expect(lowLineCount).toBeGreaterThan(0);

      // Critical health (10 HP, <= 11): 4 micro-cracks drawn (more line segments)
      const crit = createMockShieldCanvas();
      drawShieldBubble(crit.ctx, 100, 100, 10, 30, "#3b82f6", false, 0, 10);
      expect(crit.lineToCalls.length).toBeGreaterThan(lowLineCount);
    });

    it("renders perimeter arc gauge showing remaining health fraction", () => {
      const half = createMockShieldCanvas();
      drawShieldBubble(half.ctx, 100, 100, 10, 30, "#3b82f6", false, 0, 27.5);
      const baseRadius = half.arcCalls[0]!.radius;
      // Gauge arc exists around outer perimeter (radius > baseRadius)
      const gaugeArc = half.arcCalls.find(
        (a) =>
          a.startAngle !== undefined &&
          a.endAngle !== undefined &&
          a.radius > baseRadius &&
          a.startAngle !== 0,
      );
      expect(gaugeArc).toBeDefined();
      expect(gaugeArc?.startAngle).toBeCloseTo(-Math.PI / 2, 2);
      // 27.5 / 55 = 0.5 -> arc sweeps to -PI/2 + PI = PI/2
      expect(gaugeArc?.endAngle).toBeCloseTo(Math.PI / 2, 2);
    });

    it("renders paused status badge with exact numbers when isPaused is true", () => {
      // Playing (isPaused = false): no text rendered
      const playing = createMockShieldCanvas();
      drawShieldBubble(
        playing.ctx,
        100,
        100,
        10,
        30,
        "#3b82f6",
        false,
        0,
        30,
        false,
      );
      expect(playing.textCalls.length).toBe(0);

      // Paused with regular health (30 HP): renders exact badge "🛡️ 30/55"
      const paused = createMockShieldCanvas();
      drawShieldBubble(
        paused.ctx,
        100,
        100,
        10,
        30,
        "#3b82f6",
        false,
        0,
        30,
        true,
      );
      expect(paused.textCalls.length).toBe(1);
      expect(paused.textCalls[0]!.text).toBe("🛡️ 30/55");
      expect(paused.roundRectCalls.length).toBeGreaterThan(0);

      // Paused with critical health (10 HP, <= 11): renders exact badge "🛡️ 10/55"
      const critical = createMockShieldCanvas();
      drawShieldBubble(
        critical.ctx,
        100,
        100,
        10,
        30,
        "#3b82f6",
        false,
        0,
        10,
        true,
      );
      expect(critical.textCalls.length).toBe(1);
      expect(critical.textCalls[0]!.text).toBe("🛡️ 10/55");
    });

    it("supports shield stun state with health scaling and vibration", () => {
      const stun = createMockShieldCanvas();
      drawShieldBubble(stun.ctx, 100, 100, 10, 30, "#3b82f6", true, 3, 20);
      expect(stun.arcCalls.length).toBeGreaterThan(0);
      // Radius is scaled relative to full base
      const stunRadius = stun.arcCalls[0]!.radius;
      expect(stunRadius).toBeLessThan(22); // Less than full base with pulse
    });

    it("renders silver/white invincible shield with invincible badge when isInvincible is true", () => {
      const inv = createMockShieldCanvas();
      drawShieldBubble(
        inv.ctx,
        100,
        100,
        10,
        30,
        "#3b82f6",
        false,
        0,
        10, // low health
        true, // isPaused
        true, // isInvincible
        false, // isLight
      );
      // No micro cracks should be rendered despite health <= 25
      expect(inv.lineToCalls.length).toBe(0);
      // Specular white rim and gauge
      expect(inv.strokeStyles).toContain("#ffffff");
      // Paused badge text says Invincible
      expect(inv.textCalls.length).toBe(1);
      expect(inv.textCalls[0]!.text).toBe("🛡️ Invincible • 10/55");
    });
  });

  describe("Animated Attack Arcs (Aerial vs Smash Differentiation)", () => {
    const createMockAttackCanvas = () => {
      const arcCalls: Array<{
        x: number;
        y: number;
        radius: number;
        startAngle?: number;
        endAngle?: number;
      }> = [];
      const lineToCalls: Array<{ x: number; y: number }> = [];
      const moveToCalls: Array<{ x: number; y: number }> = [];
      const strokeCalls: Array<{ strokeStyle: string; lineWidth: number }> = [];
      const fillCalls: number[] = [];
      let currentStrokeStyle = "";
      let currentLineWidth = 1;

      const ctx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: (x: number, y: number) => {
          moveToCalls.push({ x, y });
        },
        lineTo: (x: number, y: number) => {
          lineToCalls.push({ x, y });
        },
        createRadialGradient: () => ({ addColorStop: () => {} }),
        fill: () => {
          fillCalls.push(1);
        },
        stroke: () => {
          strokeCalls.push({
            strokeStyle: currentStrokeStyle,
            lineWidth: currentLineWidth,
          });
        },
        arc: (
          x: number,
          y: number,
          radius: number,
          startAngle?: number,
          endAngle?: number,
        ) => {
          arcCalls.push({ x, y, radius, startAngle, endAngle });
        },
        ellipse: () => {},
        rect: () => {},
        roundRect: () => {},
        quadraticCurveTo: () => {},
        bezierCurveTo: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        set strokeStyle(val: string) {
          currentStrokeStyle = val;
        },
        get strokeStyle() {
          return currentStrokeStyle;
        },
        set fillStyle(_val: string) {},
        get fillStyle() {
          return "";
        },
        set lineWidth(val: number) {
          currentLineWidth = val;
        },
        get lineWidth() {
          return currentLineWidth;
        },
        lineCap: "butt",
        lineJoin: "miter",
        shadowColor: "",
        shadowBlur: 0,
      } as unknown as CanvasRenderingContext2D;

      return {
        ctx,
        arcCalls,
        lineToCalls,
        moveToCalls,
        strokeCalls,
        fillCalls,
      };
    };

    it("animates aerial attack arc expanding outward from character over initial frames", () => {
      // baseRadius = Math.max(10, 30 * 0.5) = 15
      // Frame 0: closer to body
      const frame0 = createMockAttackCanvas();
      drawAttackArc(
        frame0.ctx,
        100,
        100,
        10,
        30,
        true,
        "#3b82f6",
        { type: "aerial", direction: "forward" },
        null,
        false,
        0,
      );
      // Primary outer arc is the 2nd arc (1st is trailing speed echo)
      const r0 = frame0.arcCalls[1]!.radius;

      // Frame 7: expanded to peak reach
      const frame7 = createMockAttackCanvas();
      drawAttackArc(
        frame7.ctx,
        100,
        100,
        10,
        30,
        true,
        "#3b82f6",
        { type: "aerial", direction: "forward" },
        null,
        false,
        7,
      );
      const r7 = frame7.arcCalls[1]!.radius;

      expect(r0).toBeLessThan(r7);
      expect(r7).toBeCloseTo(15 * 1.85, 1);
    });

    it("ensures aerial attack arc remains fully visible across late frames until action state ends", () => {
      // Frame 25 (deep in endlag/active state)
      const late = createMockAttackCanvas();
      drawAttackArc(
        late.ctx,
        100,
        100,
        10,
        30,
        true,
        "#3b82f6",
        { type: "aerial", direction: "forward" },
        null,
        false,
        25,
      );
      expect(late.arcCalls.length).toBeGreaterThan(0);
      expect(late.strokeCalls.length).toBeGreaterThan(0);
      // Arc radius is held at peak reach without disappearing
      const rLate = late.arcCalls[1]!.radius;
      expect(rLate).toBeCloseTo(15 * 1.85, 0);
    });

    it("distinguishes smash attacks with wider span, dual-layer wedge fill, and heavier stroke weight", () => {
      const aerial = createMockAttackCanvas();
      drawAttackArc(
        aerial.ctx,
        100,
        100,
        10,
        30,
        true,
        "#3b82f6",
        { type: "aerial", direction: "forward" },
        null,
        false,
        4,
      );

      const smash = createMockAttackCanvas();
      drawAttackArc(
        smash.ctx,
        100,
        100,
        10,
        30,
        true,
        "#3b82f6",
        { type: "smash", direction: "forward" },
        null,
        false,
        8,
      );

      // Smash has wedge fill (fillCalls > 0), aerial does not
      expect(smash.fillCalls.length).toBeGreaterThan(0);
      expect(aerial.fillCalls.length).toBe(0);

      // Smash has heavier maximum stroke width (5.5 vs 3.5)
      const maxSmashWidth = Math.max(
        ...smash.strokeCalls.map((s) => s.lineWidth),
      );
      const maxAerialWidth = Math.max(
        ...aerial.strokeCalls.map((s) => s.lineWidth),
      );
      expect(maxSmashWidth).toBeGreaterThan(maxAerialWidth);

      // Smash reaches a substantially larger peak reach radius (2.3 vs 1.65)
      const smashOuterRadius = Math.max(...smash.arcCalls.map((a) => a.radius));
      const aerialMaxRadius = Math.max(...aerial.arcCalls.map((a) => a.radius));
      expect(smashOuterRadius).toBeGreaterThan(aerialMaxRadius);
    });

    it("animates smash attack through gather phase and concussive power surge", () => {
      // Frame 0: energy gathered close to character
      const gather = createMockAttackCanvas();
      drawAttackArc(
        gather.ctx,
        100,
        100,
        10,
        30,
        true,
        "#3b82f6",
        { type: "smash", direction: "forward" },
        null,
        false,
        0,
      );
      const rGather = Math.max(...gather.arcCalls.map((a) => a.radius));

      // Frame 8: fully surged outward
      const surged = createMockAttackCanvas();
      drawAttackArc(
        surged.ctx,
        100,
        100,
        10,
        30,
        true,
        "#3b82f6",
        { type: "smash", direction: "forward" },
        null,
        false,
        8,
      );
      const rSurged = Math.max(...surged.arcCalls.map((a) => a.radius));

      expect(rGather).toBeLessThan(rSurged);
      expect(rSurged).toBeCloseTo(15 * 2.3, 1);
    });

    it("animates Nair 360-degree shockwave ring expanding outward and persisting", () => {
      const frame0 = createMockAttackCanvas();
      drawAttackArc(
        frame0.ctx,
        100,
        100,
        10,
        30,
        true,
        "#3b82f6",
        { type: "aerial", direction: "neutral" },
        null,
        false,
        0,
      );

      const frame4 = createMockAttackCanvas();
      drawAttackArc(
        frame4.ctx,
        100,
        100,
        10,
        30,
        true,
        "#3b82f6",
        { type: "aerial", direction: "neutral" },
        null,
        false,
        4,
      );

      // Both draw full circle arcs (startAngle = 0, endAngle = 2*PI)
      expect(frame0.arcCalls[0]!.endAngle).toBeCloseTo(Math.PI * 2, 2);
      expect(frame4.arcCalls[0]!.endAngle).toBeCloseTo(Math.PI * 2, 2);

      // Expansion from frame 0 to frame 4
      const r0 = frame0.arcCalls[1]!.radius;
      const r4 = frame4.arcCalls[1]!.radius;
      expect(r0).toBeLessThan(r4);

      // Nair has rotating cyclone turbine vanes with white-hot tips and kinetic spark streaks on active frames
      const whiteStrokes = frame4.strokeCalls.filter(
        (s) =>
          s.strokeStyle === "#ffffff" ||
          s.strokeStyle === "rgba(255, 255, 255, 0.9)" ||
          s.strokeStyle === "rgba(255, 255, 255, 0.88)",
      );
      expect(whiteStrokes.length).toBeGreaterThanOrEqual(4);
    });

    it("tailors directional aerial spans and mid-blade ribbons by direction (Fair, Bair, Uair, Dair)", () => {
      const directions: {
        dir: "forward" | "back" | "up" | "down";
        expectedDeg: number;
      }[] = [
        { dir: "forward", expectedDeg: 95 },
        { dir: "back", expectedDeg: 75 },
        { dir: "up", expectedDeg: 90 },
        { dir: "down", expectedDeg: 80 },
      ];

      for (const { dir, expectedDeg } of directions) {
        const mock = createMockAttackCanvas();
        drawAttackArc(
          mock.ctx,
          100,
          100,
          10,
          30,
          true,
          "#3b82f6",
          { type: "aerial", direction: dir },
          null,
          false,
          5,
        );

        // Primary outer arc is index 1
        const outerArc = mock.arcCalls[1]!;
        const spanRad = outerArc.endAngle! - outerArc.startAngle!;
        const spanDeg = (spanRad * 180) / Math.PI;
        expect(spanDeg).toBeCloseTo(expectedDeg, 1);

        // Mid-blade luminous core band is index 2, positioned between echo and outer radius
        const echoArc = mock.arcCalls[0]!;
        const midArc = mock.arcCalls[2]!;
        expect(midArc.radius).toBeCloseTo(
          (echoArc.radius + outerArc.radius) / 2,
          1,
        );
      }
    });

    it("dissolves white-hot razor core during aerial endlag to signal whiff / cooldown", () => {
      const active = createMockAttackCanvas();
      drawAttackArc(
        active.ctx,
        100,
        100,
        10,
        30,
        true,
        "#3b82f6",
        { type: "aerial", direction: "forward" },
        null,
        false,
        5,
      );

      const endlag = createMockAttackCanvas();
      drawAttackArc(
        endlag.ctx,
        100,
        100,
        10,
        30,
        true,
        "#3b82f6",
        { type: "aerial", direction: "forward" },
        null,
        false,
        18,
      );

      // Active has white razor core stroke
      const activeHasWhite = active.strokeCalls.some(
        (s) => s.strokeStyle === "rgba(255, 255, 255, 0.88)",
      );
      expect(activeHasWhite).toBe(true);

      // Endlag dissolves the white razor core
      const endlagHasWhite = endlag.strokeCalls.some(
        (s) => s.strokeStyle === "rgba(255, 255, 255, 0.88)",
      );
      expect(endlagHasWhite).toBe(false);
    });

    it("defaults cleanly to peak reach when actionFrameCounter is undefined", () => {
      const def = createMockAttackCanvas();
      drawAttackArc(
        def.ctx,
        100,
        100,
        10,
        30,
        true,
        "#3b82f6",
        { type: "aerial", direction: "forward" },
        null,
        false,
        undefined,
      );
      const rDef = def.arcCalls[1]!.radius;
      expect(rDef).toBeCloseTo(15 * 1.85, 1);
    });

    it("animates grounded tilt attack arc expanding outward with trailing echo and glow", () => {
      const frame0 = createMockAttackCanvas();
      drawAttackArc(
        frame0.ctx,
        100,
        100,
        10,
        30,
        true,
        "#ef4444",
        { type: "tilt", direction: "forward" },
        null,
        false,
        0,
      );
      // Primary outer arc is arc index 1 (0 is trailing echo)
      const r0 = frame0.arcCalls[1]!.radius;

      const frame7 = createMockAttackCanvas();
      drawAttackArc(
        frame7.ctx,
        100,
        100,
        10,
        30,
        true,
        "#ef4444",
        { type: "tilt", direction: "forward" },
        null,
        false,
        7,
      );
      const r7 = frame7.arcCalls[1]!.radius;

      expect(r0).toBeLessThan(r7);
      expect(r7).toBeCloseTo(15 * 1.7, 1);
      // Has trailing echo arc
      expect(frame7.arcCalls.length).toBeGreaterThanOrEqual(2);
    });

    it("renders getup-attack with dual ground sweeping crescents and floor friction streaks", () => {
      const getupCanvas = createMockAttackCanvas();
      drawAttackArc(
        getupCanvas.ctx,
        100,
        100,
        12,
        36,
        true,
        "#3b82f6",
        { type: "getup-attack", direction: "neutral" },
        null,
        false,
        6,
      );

      // Has active front and back arc sweeps
      expect(getupCanvas.arcCalls.length).toBeGreaterThanOrEqual(2);
      // Has floor friction streaks and sparks (moveTo/lineTo)
      expect(getupCanvas.moveToCalls.length).toBeGreaterThanOrEqual(2);
      expect(getupCanvas.lineToCalls.length).toBeGreaterThanOrEqual(2);
    });

    it("renders quick ledge attack with rising vault slash and kinetic trails", () => {
      const quickCanvas = createMockAttackCanvas();
      drawAttackArc(
        quickCanvas.ctx,
        100,
        100,
        12,
        36,
        true,
        "#10b981",
        { type: "ledge-attack", direction: "forward", subType: "quick" },
        null,
        false,
        4,
      );

      // Has blade arcs (speed echo, outer blade, inner core) without odd vertical lines
      expect(quickCanvas.arcCalls.length).toBeGreaterThanOrEqual(2);
      expect(quickCanvas.lineToCalls.length).toBe(0);
    });

    it("renders slow ledge attack with heavy dual-layer crescent wedge and burst sparks", () => {
      const slowCanvas = createMockAttackCanvas();
      drawAttackArc(
        slowCanvas.ctx,
        100,
        100,
        12,
        36,
        true,
        "#f59e0b",
        { type: "ledge-attack", direction: "forward", subType: "slow" },
        null,
        false,
        8,
      );

      // Has wedge fill
      expect(slowCanvas.fillCalls.length).toBeGreaterThanOrEqual(1);
      // Has blade arcs and impact burst spark
      expect(slowCanvas.arcCalls.length).toBeGreaterThanOrEqual(2);
      expect(slowCanvas.lineToCalls.length).toBeGreaterThanOrEqual(1);
    });

    it("renders Samus Grapple Beam as an extended electric plasma chain with capture claw", () => {
      const mock = createMockAttackCanvas();
      drawAttackArc(
        mock.ctx,
        100,
        100,
        15,
        40,
        true,
        "#f59e0b",
        { type: "grab", direction: "forward" },
        null,
        false,
        22, // actionFrameCounter at peak
        0x03, // Samus
      );

      // Has muzzle flare, plasma nodes, claw arcs, and capture field
      expect(mock.arcCalls.length).toBeGreaterThanOrEqual(3);
      expect(mock.strokeCalls.length).toBeGreaterThanOrEqual(5);
      // Draws line segments connecting cannon to tip
      expect(mock.lineToCalls.length).toBeGreaterThanOrEqual(2);

      // Directly invocable as standalone helper
      const direct = createMockAttackCanvas();
      drawSamusGrappleBeam(direct.ctx, 100, 100, 15, 40, true, "#38bdf8", 15);
      expect(direct.strokeCalls.length).toBeGreaterThanOrEqual(5);
    });

    it("renders Link Hookshot as an extended steel linked chain with barbed arrowhead", () => {
      const mock = createMockAttackCanvas();
      drawAttackArc(
        mock.ctx,
        100,
        100,
        15,
        40,
        true,
        "#10b981",
        { type: "grab", direction: "forward" },
        null,
        false,
        22, // actionFrameCounter at peak
        0x05, // Link
      );

      // Has launcher spool, chain link highlights, and barbed spearhead
      expect(mock.strokeCalls.length).toBeGreaterThanOrEqual(5);
      // Barbed arrowhead chisel point has lineTo path
      expect(mock.lineToCalls.length).toBeGreaterThanOrEqual(5);

      // Directly invocable as standalone helper
      const direct = createMockAttackCanvas();
      drawLinkHookshot(direct.ctx, 100, 100, 15, 40, true, "#10b981", 15);
      expect(direct.strokeCalls.length).toBeGreaterThanOrEqual(5);
    });

    it("renders Yoshi tongue grab with gaping jaws, saliva stretch, muscular ribbed tongue, and prehensile clasp", () => {
      const mock = createMockAttackCanvas();
      drawAttackArc(
        mock.ctx,
        100,
        100,
        15,
        40,
        true,
        "#10b981",
        { type: "grab", direction: "forward" },
        null,
        false,
        22, // actionFrameCounter at peak
        0x06, // Yoshi
      );

      // Has mouth cavity, jaw arcs, saliva beads, suction cups, and grab latch aura
      expect(mock.arcCalls.length).toBeGreaterThanOrEqual(5);
      // Has muscular striation band lines
      expect(mock.lineToCalls.length).toBeGreaterThanOrEqual(5);
      expect(mock.strokeCalls.length).toBeGreaterThanOrEqual(5);

      // Directly invocable as standalone helper
      const direct = createMockAttackCanvas();
      drawYoshiTongueGrab(direct.ctx, 100, 100, 15, 40, true, "#10b981", 15);
      expect(direct.strokeCalls.length).toBeGreaterThanOrEqual(5);
    });

    it("renders standard cartoon gloved hand for non-grapple characters (e.g. Mario)", () => {
      const mock = createMockAttackCanvas();
      drawAttackArc(
        mock.ctx,
        100,
        100,
        15,
        40,
        true,
        "#ef4444",
        { type: "grab", direction: "forward" },
        null,
        false,
        7,
        0x00, // Mario
      );

      // Has cartoon fingers, thumb, and grab snatch glow
      expect(mock.arcCalls.length).toBeGreaterThanOrEqual(5);
      expect(mock.strokeCalls.length).toBeGreaterThanOrEqual(5);
    });

    it("draws dash-attack with sweeping crescent wave, slide dust plumes, and kinetic sparks", () => {
      const mock = createMockAttackCanvas();
      drawAttackArc(
        mock.ctx,
        100,
        100,
        10,
        30,
        true,
        "#3b82f6",
        { type: "dash-attack", direction: "forward" },
        null,
        false,
        5,
      );

      // Arc calls include ground slide friction dust puffs + floor sparks
      expect(mock.arcCalls.length).toBeGreaterThanOrEqual(5);
      // Fills include dust puffs and crescent body
      expect(mock.fillCalls.length).toBeGreaterThanOrEqual(2);
      // Strokes include outer cutting blade, white-hot core, and slipstreams
      expect(mock.strokeCalls.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("JumpSquat (0x14) Visualization", () => {
    it("draws jumpsquat ground pressure ring, lateral dust puffs, and anticipation chevrons", () => {
      const ellipses: { x: number; y: number; rx: number; ry: number }[] = [];
      const arcs: { x: number; y: number; r: number }[] = [];
      const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
      let currentX = 0;
      let currentY = 0;

      const mockCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: (x: number, y: number) => {
          currentX = x;
          currentY = y;
        },
        lineTo: (x: number, y: number) => {
          lines.push({ x1: currentX, y1: currentY, x2: x, y2: y });
          currentX = x;
          currentY = y;
        },
        arc: (x: number, y: number, r: number) => {
          arcs.push({ x, y, r });
        },
        ellipse: (x: number, y: number, rx: number, ry: number) => {
          ellipses.push({ x, y, rx, ry });
        },
        stroke: () => {},
        fill: () => {},
      } as unknown as CanvasRenderingContext2D;

      // Frame 0: Initial compression
      drawJumpSquatFx(mockCtx, 100, 200, 20, 50, 0, "#3b82f6", false);
      expect(ellipses.length).toBeGreaterThanOrEqual(2); // Outer pressure ring and inner contact ellipse
      expect(arcs.length).toBeGreaterThanOrEqual(4); // Left & right dust billows (primary + secondary)
      expect(lines.length).toBeGreaterThan(0); // Ground skid lines & chevrons

      // Check ground ring is at foot level
      expect(ellipses[0]!.y).toBe(200);

      // Frame 3: Advanced compression with sparks and higher chevrons
      const arcsFrame3: { x: number; y: number; r: number }[] = [];
      const mockCtxF3 = {
        ...mockCtx,
        arc: (x: number, y: number, r: number) => {
          arcsFrame3.push({ x, y, r });
        },
      } as unknown as CanvasRenderingContext2D;

      drawJumpSquatFx(mockCtxF3, 100, 200, 20, 50, 3, "#3b82f6", false);
      // Frame 3 has additional kinetic compression sparks at the feet
      expect(arcsFrame3.length).toBeGreaterThan(arcs.length);
    });

    it("applies spring compression scale transform and renders FX during 0x014 jumpsquat in drawPlayer", () => {
      const scales: { sx: number; sy: number }[] = [];
      const fakeCanvas = {
        getContext: () => ({
          save: () => {},
          restore: () => {},
          beginPath: () => {},
          closePath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          ellipse: () => {},
          arc: () => {},
          quadraticCurveTo: () => {},
          bezierCurveTo: () => {},
          translate: () => {},
          rotate: () => {},
          scale: (sx: number, sy: number) => {
            scales.push({ sx, sy });
          },
          setLineDash: () => {},
          fillRect: () => {},
          clearRect: () => {},
          fillText: () => {},
          measureText: () => ({ width: 10 }),
          fill: () => {},
          stroke: () => {},
          drawImage: () => {},
        }),
        width: 960,
        height: 540,
      } as unknown as HTMLCanvasElement;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const fakeCamera = {
        worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
        worldLengthToScreen: (len: number) => len,
        groundScreenY: () => 400,
      };

      // Draw player in jumpsquat state (0x014) on frame 2
      renderer["drawPlayer"](fakeCamera, 0, {
        positionX: 0,
        positionY: 0,
        facingDirection: 1,
        damagePercent: 0,
        characterId: 0x09, // Pikachu
        actionStateId: 0x014, // JumpSquat
        actionFrameCounter: 2,
        stocksRemaining: 4,
        jumpsRemaining: 1,
      });

      // Verify that spring compression scale was applied (scaleY < 1 and scaleX > 1)
      const jumpSquatScale = scales.find((s) => s.sx > 1.1 && s.sy < 0.8);
      expect(jumpSquatScale).toBeDefined();
      expect(jumpSquatScale!.sy).toBeLessThan(0.75); // Vertical squash
      expect(jumpSquatScale!.sx).toBeGreaterThan(1.15); // Horizontal stretch
    });

    it("renders metallic silver armor with gold outline and includes armor KB in HUD for Yoshi during double jump", () => {
      const texts: string[] = [];
      const fillStyles: string[] = [];
      const strokeStyles: string[] = [];
      const ellipses: Array<{ x: number; y: number; rx: number; ry: number }> =
        [];
      const lines: Array<{ x: number; y: number }> = [];
      let currentFillStyle = "";
      let currentStrokeStyle = "";
      const fakeCanvas = {
        getContext: () => ({
          save: () => {},
          restore: () => {},
          beginPath: () => {},
          closePath: () => {},
          moveTo: () => {},
          lineTo: (x: number, y: number) => {
            lines.push({ x, y });
          },
          ellipse: (x: number, y: number, rx: number, ry: number) => {
            ellipses.push({ x, y, rx, ry });
          },
          arc: () => {},
          roundRect: () => {},
          clip: () => {},
          translate: () => {},
          rotate: () => {},
          scale: () => {},
          createRadialGradient: () => ({ addColorStop: () => {} }),
          fill: () => {
            fillStyles.push(currentFillStyle);
          },
          stroke: () => {
            strokeStyles.push(currentStrokeStyle);
          },
          fillText: (t: string) => {
            texts.push(t);
          },
          measureText: (s: string) => ({ width: s.length * 6 }),
          shadowColor: "",
          shadowBlur: 0,
          font: "",
          get fillStyle() {
            return currentFillStyle;
          },
          set fillStyle(val: string) {
            currentFillStyle = val;
          },
          get strokeStyle() {
            return currentStrokeStyle;
          },
          set strokeStyle(val: string) {
            currentStrokeStyle = val;
          },
          lineWidth: 1,
        }),
        width: 960,
        height: 540,
      } as unknown as HTMLCanvasElement;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const fakeCamera = {
        worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
        worldLengthToScreen: (len: number) => len,
        groundScreenY: () => 400,
      };

      // Yoshi double jump with knockback resistance 140 (US ROM)
      renderer["drawPlayer"](
        fakeCamera,
        0,
        {
          positionX: 50,
          positionY: 100,
          facingDirection: 1,
          damagePercent: 45,
          characterId: 0x06, // Yoshi
          actionStateId: 0x018, // JumpAerialF
          actionFrameCounter: 5,
          stocksRemaining: 4,
          jumpsRemaining: 0,
          knockbackResist: 140,
        },
        null,
        null,
        0,
        true, // isPaused = true -> pause HUD rendered
      );

      // Verify Yoshi's body rendered with metallic silver and gold colors
      expect(fillStyles).toContain("#94a3b8"); // Silver armor body
      expect(fillStyles).toContain("#f59e0b"); // Burnished gold shell
      expect(strokeStyles).toContain("#fbbf24"); // Glowing gold outline
      expect(ellipses.length).toBeGreaterThan(0);

      // Verify pause HUD contains "Armor: 140 KB"
      const armorTextFound = texts.some((t) => t.includes("Armor: 140 KB"));
      expect(armorTextFound).toBe(true);
    });

    it("falls back to super armor for schema 1 Yoshi double jump when knockbackResist is undefined", () => {
      const fillStyles: string[] = [];
      const strokeStyles: string[] = [];
      let currentFillStyle = "";
      let currentStrokeStyle = "";
      const fakeCanvas = {
        getContext: () => ({
          save: () => {},
          restore: () => {},
          beginPath: () => {},
          closePath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          ellipse: () => {},
          arc: () => {},
          roundRect: () => {},
          clip: () => {},
          translate: () => {},
          rotate: () => {},
          scale: () => {},
          createRadialGradient: () => ({ addColorStop: () => {} }),
          fill: () => {
            fillStyles.push(currentFillStyle);
          },
          stroke: () => {
            strokeStyles.push(currentStrokeStyle);
          },
          fillText: () => {},
          measureText: () => ({ width: 10 }),
          get fillStyle() {
            return currentFillStyle;
          },
          set fillStyle(val: string) {
            currentFillStyle = val;
          },
          get strokeStyle() {
            return currentStrokeStyle;
          },
          set strokeStyle(val: string) {
            currentStrokeStyle = val;
          },
          lineWidth: 1,
        }),
        width: 960,
        height: 540,
      } as unknown as HTMLCanvasElement;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const fakeCamera = {
        worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
        worldLengthToScreen: (len: number) => len,
        groundScreenY: () => 400,
      };

      // Yoshi JumpAerialB without knockbackResist defined (Schema 1)
      renderer["drawPlayer"](
        fakeCamera,
        0,
        {
          positionX: 50,
          positionY: 100,
          facingDirection: -1,
          damagePercent: 20,
          characterId: 0x06, // Yoshi
          actionStateId: 0x019, // JumpAerialB
          actionFrameCounter: 8,
          stocksRemaining: 4,
          jumpsRemaining: 0,
          knockbackResist: undefined,
        },
        null,
        null,
        0,
        false,
      );

      // Should still render metallic silver body and gold outline
      expect(fillStyles).toContain("#94a3b8");
      expect(strokeStyles).toContain("#fbbf24");
    });
  });

  describe("Anti-Overlap Pause HUDs De-collision", () => {
    it("staggers overlapping pause HUDs into vertical tiers with indicator stems", () => {
      const roundRectCalls: Array<{
        x: number;
        y: number;
        w: number;
        h: number;
      }> = [];
      const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> =
        [];
      let currentX = 0;
      let currentY = 0;

      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: (x: number, y: number) => {
          currentX = x;
          currentY = y;
        },
        lineTo: (x: number, y: number) => {
          lines.push({ x1: currentX, y1: currentY, x2: x, y2: y });
          currentX = x;
          currentY = y;
        },
        arc: () => {},
        roundRect: (x: number, y: number, w: number, h: number) => {
          roundRectCalls.push({ x, y, w, h });
        },
        fill: () => {},
        stroke: () => {},
        fillText: () => {},
        measureText: (str: string) => ({ width: str.length * 6.5 }),
        setLineDash: () => {},
        shadowColor: "",
        shadowBlur: 0,
        font: "",
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
      } as unknown as CanvasRenderingContext2D;

      // Two characters right next to each other (x = 200 and x = 215)
      const huds = [
        {
          x: 200,
          y: 300,
          stateName: "Wait",
          stateId: 0x00a,
          posX: -10,
          posY: 0,
          tagColor: "#ef4444",
        },
        {
          x: 215,
          y: 300,
          stateName: "Squat",
          stateId: 0x00d,
          posX: -5,
          posY: 0,
          tagColor: "#3b82f6",
        },
      ];

      drawDeconflictedPauseHuds(fakeCtx, huds);

      // Both pills should be drawn
      expect(roundRectCalls).toHaveLength(2);
      const pill1 = roundRectCalls[0]!;
      const pill2 = roundRectCalls[1]!;

      // Pill 2 should be staggered lower than Pill 1 to avoid covering it
      expect(pill2.y).toBeGreaterThan(pill1.y + 20);

      // A dashed leader stem line should connect the lower pill to the fighter's feet
      expect(lines.length).toBeGreaterThan(0);
    });

    it("does not stagger pause HUDs when characters are sufficiently far apart", () => {
      const roundRectCalls: Array<{
        x: number;
        y: number;
        w: number;
        h: number;
      }> = [];
      const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> =
        [];

      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: () => {},
        roundRect: (x: number, y: number, w: number, h: number) => {
          roundRectCalls.push({ x, y, w, h });
        },
        fill: () => {},
        stroke: () => {},
        fillText: () => {},
        measureText: (str: string) => ({ width: str.length * 6.5 }),
        setLineDash: () => {},
        shadowColor: "",
        shadowBlur: 0,
        font: "",
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
      } as unknown as CanvasRenderingContext2D;

      // Two characters far apart (x = 100 and x = 400)
      const huds = [
        {
          x: 100,
          y: 300,
          stateName: "Wait",
          stateId: 0x00a,
          posX: -100,
          posY: 0,
          tagColor: "#ef4444",
        },
        {
          x: 400,
          y: 300,
          stateName: "Wait",
          stateId: 0x00a,
          posX: 100,
          posY: 0,
          tagColor: "#3b82f6",
        },
      ];

      drawDeconflictedPauseHuds(fakeCtx, huds);

      expect(roundRectCalls).toHaveLength(2);
      // Both pills remain in the default top tier (y + 8 = 308)
      expect(roundRectCalls[0]?.y).toBe(308);
      expect(roundRectCalls[1]?.y).toBe(308);
      expect(lines).toHaveLength(0);
    });
  });

  describe("Combo Escape Gap Visuals", () => {
    it("draws yellow highlight backdrop behind character during actionable gap frames", () => {
      const roundRectCalls: Array<{
        x: number;
        y: number;
        w: number;
        h: number;
        r: number;
      }> = [];
      const fillStyles: string[] = [];
      const strokeStyles: string[] = [];
      let shadowColor = "";
      let shadowBlur = 0;

      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        roundRect: (x: number, y: number, w: number, h: number, r: number) => {
          roundRectCalls.push({ x, y, w, h, r });
        },
        fill: () => {
          fillStyles.push(fakeCtx.fillStyle as string);
        },
        stroke: () => {
          strokeStyles.push(fakeCtx.strokeStyle as string);
        },
        get fillStyle() {
          return fillStyles[fillStyles.length - 1] ?? "";
        },
        set fillStyle(val: string) {
          fillStyles.push(val);
        },
        get strokeStyle() {
          return strokeStyles[strokeStyles.length - 1] ?? "";
        },
        set strokeStyle(val: string) {
          strokeStyles.push(val);
        },
        get shadowColor() {
          return shadowColor;
        },
        set shadowColor(val: string) {
          shadowColor = val;
        },
        get shadowBlur() {
          return shadowBlur;
        },
        set shadowBlur(val: number) {
          shadowBlur = val;
        },
        lineWidth: 1,
      } as unknown as CanvasRenderingContext2D;

      drawComboEscapeHighlight(fakeCtx, 100, 200, 20, 60);

      // Should draw outer yellow card and inner highlight card
      expect(roundRectCalls).toHaveLength(2);
      expect(fillStyles).toContain("rgba(250, 204, 21, 0.42)");
      expect(strokeStyles).toContain("rgba(234, 179, 8, 0.95)");
      expect(strokeStyles).toContain("rgba(254, 240, 138, 0.65)");
      expect(shadowColor).toBe("#facc15");
      expect(shadowBlur).toBe(14);
    });

    it("draws fading 'XF gap' text callout beside fighter when alpha > 0.01", () => {
      const fillTextCalls: Array<{ text: string; x: number; y: number }> = [];
      const roundRectCalls: Array<{
        x: number;
        y: number;
        w: number;
        h: number;
      }> = [];

      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        roundRect: (x: number, y: number, w: number, h: number) => {
          roundRectCalls.push({ x, y, w, h });
        },
        measureText: (str: string) => ({ width: str.length * 8 }),
        fillText: (text: string, x: number, y: number) => {
          fillTextCalls.push({ text, x, y });
        },
        fill: () => {},
        stroke: () => {},
        font: "",
        textAlign: "",
        textBaseline: "",
        fillStyle: "",
        strokeStyle: "",
        shadowColor: "",
        shadowBlur: 0,
        lineWidth: 1,
      } as unknown as CanvasRenderingContext2D;

      // When facing right, badge floats to the left behind character
      drawComboEscapeTextCallout(fakeCtx, 200, 300, 25, 60, true, 5, 1.0);

      expect(fillTextCalls).toHaveLength(1);
      expect(fillTextCalls[0]?.text).toBe("5F gap");
      expect(fillTextCalls[0]?.x).toBeLessThan(200); // Behind the fighter (to the left)
      expect(roundRectCalls).toHaveLength(1);
      expect(COMBO_GAP_CALLOUT_FADE_FRAMES).toBe(90);

      // When alpha <= 0.01, it early returns without drawing
      fillTextCalls.length = 0;
      roundRectCalls.length = 0;
      drawComboEscapeTextCallout(fakeCtx, 200, 300, 25, 60, true, 5, 0.005);
      expect(fillTextCalls).toHaveLength(0);
      expect(roundRectCalls).toHaveLength(0);
    });

    it("buckets gap badge colors based on difficulty (<=3f, <=10f, <=20f, >20f)", () => {
      const hardest = getComboGapBadgeColors(2);
      expect(hardest.border).toContain("148, 163, 184"); // Gray

      const tight = getComboGapBadgeColors(7);
      expect(tight.border).toContain("234, 179, 8"); // Yellow

      const moderate = getComboGapBadgeColors(15);
      expect(moderate.border).toContain("249, 115, 22"); // Orange

      const easiest = getComboGapBadgeColors(25);
      expect(easiest.border).toContain("239, 68, 68"); // Crimson Red
    });

    it("resolves red hitstun silhouette colors", () => {
      const dark = getHitstunSilhouetteColors("grid", false);
      expect(dark.fill).toBe("rgba(239, 68, 68, 0.95)");
      expect(dark.glow).toBe("#ef4444");

      const light = getHitstunSilhouetteColors("mountain", true);
      expect(light.fill).toBe("rgba(220, 38, 38, 0.95)");
    });

    it("resolves brilliant glowing silver silhouette colors for invulnerable/invincible fighters", () => {
      const dark = getInvincibleSilhouetteColors("grid", false);
      expect(dark.fill).toBe("rgba(240, 246, 255, 0.98)");
      expect(dark.stroke).toBe("#ffffff");
      expect(dark.glow).toBe("rgba(224, 242, 254, 1.0)");

      const light = getInvincibleSilhouetteColors("mountain", true);
      expect(light.fill).toBe("rgba(218, 228, 240, 0.98)");
      expect(light.stroke).toBe("#ffffff");
      expect(light.glow).toBe("rgba(148, 163, 184, 0.9)");
    });

    it("identifies invulnerable or invincible states correctly with isInvincibleOrInvulnerable", () => {
      expect(
        isInvincibleOrInvulnerable({ actionStateId: 0x00a, hurtboxState: 1 }),
      ).toBe(false);
      expect(
        isInvincibleOrInvulnerable({ actionStateId: 0x00a, hurtboxState: 2 }),
      ).toBe(true);
      expect(
        isInvincibleOrInvulnerable({ actionStateId: 0x09c, hurtboxState: 3 }),
      ).toBe(true);
      expect(
        isInvincibleOrInvulnerable({
          actionStateId: 0x00a,
          hurtboxState: 1,
          specialHitStatus: 2,
        }),
      ).toBe(true);
      expect(
        isInvincibleOrInvulnerable({
          actionStateId: 0x00a,
          specialHitStatus: 3,
        }),
      ).toBe(true);
      expect(isInvincibleOrInvulnerable({ actionStateId: 0x009 })).toBe(true);
      expect(isInvincibleOrInvulnerable({ actionStateId: 0x00a }, 50)).toBe(
        true,
      );
      expect(isInvincibleOrInvulnerable({ actionStateId: 0x00a }, 130)).toBe(
        false,
      );

      // Yoshi shield startup (ShieldOn 0x098, frames 0 and 1) is invincible
      expect(isYoshiShieldInvincibleState(0x06, 0x098, 0)).toBe(true);
      expect(isYoshiShieldInvincibleState(0x06, 0x098, 1)).toBe(true);
      expect(isYoshiShieldInvincibleState(0x06, 0x098, 2)).toBe(false);
      expect(isYoshiShieldInvincibleState(0x06, 0x099, 0)).toBe(false);
      expect(isYoshiShieldInvincibleState(0x00, 0x098, 0)).toBe(false);

      expect(
        isInvincibleOrInvulnerable({
          actionStateId: 0x098,
          characterId: 0x06,
          actionFrameCounter: 0,
        }),
      ).toBe(true);
      expect(
        isInvincibleOrInvulnerable({
          actionStateId: 0x098,
          characterId: 0x06,
          actionFrameCounter: 1,
        }),
      ).toBe(true);
      expect(
        isInvincibleOrInvulnerable({
          actionStateId: 0x098,
          characterId: 0x06,
          actionFrameCounter: 2,
        }),
      ).toBe(false);
      expect(
        isInvincibleOrInvulnerable({
          actionStateId: 0x098,
          characterId: 0x00,
          actionFrameCounter: 0,
        }),
      ).toBe(false);
    });

    it("drawInvincibleSparkles renders shining starlight glints", () => {
      let fillCount = 0;
      let shadowColor = "";
      const fakeCtx = {
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        fill: () => {
          fillCount++;
        },
        fillStyle: "",
        set shadowColor(val: string) {
          shadowColor = val;
        },
        get shadowColor() {
          return shadowColor;
        },
        shadowBlur: 0,
      } as unknown as CanvasRenderingContext2D;

      drawInvincibleSparkles(fakeCtx, 100, 200, 20, 40, 10);
      expect(fillCount).toBeGreaterThan(0);
      expect(shadowColor).toContain("224, 242, 254");
    });

    it("resolves theme-adaptive silhouette colors", () => {
      const darkGrid = getComboEscapeSilhouetteColors("grid", false);
      expect(darkGrid.fill).toBe("rgba(250, 204, 21, 0.95)");

      const autumn = getComboEscapeSilhouetteColors("autumn", false);
      expect(autumn.fill).toBe("rgba(254, 240, 138, 0.95)");

      const light = getComboEscapeSilhouetteColors("mountain", true);
      expect(light.fill).toBe("rgba(234, 179, 8, 0.95)");
      expect(light.stroke).toBe("rgba(161, 98, 7, 0.95)");
    });

    it("createSilhouetteContext locks fillStyle and strokeStyle", () => {
      const realCtx = {
        fillStyle: "#000000",
        strokeStyle: "#ffffff",
      } as unknown as CanvasRenderingContext2D;

      const proxy = createSilhouetteContext(
        realCtx,
        "rgba(250, 204, 21, 0.95)",
        "rgba(234, 179, 8, 0.95)",
      );

      expect(proxy.fillStyle).toBe("rgba(250, 204, 21, 0.95)");
      expect(proxy.strokeStyle).toBe("rgba(234, 179, 8, 0.95)");

      // Overwrite attempts are intercepted
      proxy.fillStyle = "#ff0000";
      expect(proxy.fillStyle).toBe("rgba(250, 204, 21, 0.95)");

      // Overwrite attempts on shadow are intercepted so silhouette halo is preserved
      proxy.shadowColor = "#0000ff";
      proxy.shadowBlur = 0;

      // Native WebIDL setters and getters checking receiver identity execute safely on target
      class MockWebIdlContext {
        public fillStyle = "";
        public strokeStyle = "";
        private _lineWidth = 1.0;
        get lineWidth(): number {
          if (!(this instanceof MockWebIdlContext)) {
            throw new TypeError(
              "'get lineWidth' called on an object that does not implement interface CanvasRenderingContext2D",
            );
          }
          return this._lineWidth;
        }
        set lineWidth(val: number) {
          if (!(this instanceof MockWebIdlContext)) {
            throw new TypeError(
              "'set lineWidth' called on an object that does not implement interface CanvasRenderingContext2D",
            );
          }
          this._lineWidth = val;
        }
      }

      const mockNativeCtx = new MockWebIdlContext();
      const webIdlProxy = createSilhouetteContext(
        mockNativeCtx as unknown as CanvasRenderingContext2D,
        "rgba(250, 204, 21, 0.95)",
        "rgba(234, 179, 8, 0.95)",
      );

      // Should not throw TypeError: 'set lineWidth' called on an object that does not implement interface CanvasRenderingContext2D
      expect(() => {
        webIdlProxy.lineWidth = 1.5;
      }).not.toThrow();
      expect(webIdlProxy.lineWidth).toBe(1.5);
      expect(mockNativeCtx.lineWidth).toBe(1.5);
    });

    it("drawPlayer integrates combo escape gap silhouette and text callout based on comboEscapeState", () => {
      const fillStyles: string[] = [];
      const fillTextCalls: Array<{ text: string; x: number; y: number }> = [];

      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        ellipse: () => {},
        rect: () => {},
        roundRect: () => {},
        fill: () => {},
        stroke: () => {},
        strokeRect: () => {},
        fillRect: () => {},
        clip: () => {},
        measureText: (str: string) => ({ width: str.length * 8 }),
        fillText: (text: string, x: number, y: number) => {
          fillTextCalls.push({ text, x, y });
        },
        strokeText: () => {},
        get fillStyle() {
          return fillStyles[fillStyles.length - 1] ?? "";
        },
        set fillStyle(val: string) {
          fillStyles.push(val);
        },
        strokeStyle: "",
        shadowColor: "",
        shadowBlur: 0,
        font: "",
        textAlign: "",
        textBaseline: "",
        lineWidth: 1,
        setLineDash: () => {},
        createLinearGradient: () => ({
          addColorStop: () => {},
        }),
      };

      const fakeCanvas = {
        getContext: () => fakeCtx,
        width: 960,
        height: 540,
      } as unknown as HTMLCanvasElement;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const fakeCamera = {
        worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
        worldLengthToScreen: (len: number) => len,
        groundScreenY: () => 400,
      };

      // 1. Actionable frame during combo gap: silhouette proxy is active and callout rendered
      renderer["drawPlayer"](
        fakeCamera,
        0,
        {
          positionX: 50,
          positionY: 100,
          facingDirection: 1,
          damagePercent: 40,
          characterId: 0x02, // Fox
          actionStateId: 0x00a, // Wait
          actionFrameCounter: 1,
          stocksRemaining: 4,
          jumpsRemaining: 2,
        },
        null,
        null,
        0,
        false,
        null,
        false,
        {
          isActionableFrame: true,
          actionableFrameCount: 3,
          fadeAlpha: 1.0,
        },
      );

      expect(fillStyles).toContain("rgba(250, 204, 21, 0.95)");
      expect(fillTextCalls.some((c) => c.text === "3F gap")).toBe(true);

      // 1b. Actionable frame for Pikachu (characterId: 0x07) which mutates ctx.lineWidth
      expect(() => {
        renderer["drawPlayer"](
          fakeCamera,
          1,
          {
            positionX: 60,
            positionY: 100,
            facingDirection: 1,
            damagePercent: 20,
            characterId: 0x07, // Pikachu
            actionStateId: 0x00a, // Wait
            actionFrameCounter: 1,
            stocksRemaining: 4,
            jumpsRemaining: 2,
          },
          null,
          null,
          0,
          false,
          null,
          false,
          {
            isActionableFrame: true,
            actionableFrameCount: 4,
            fadeAlpha: 1.0,
          },
        );
      }).not.toThrow();

      // 2. Post-gap frame within 90-frame fadeout: silhouette is OFF, but callout badge is ON
      fillStyles.length = 0;
      fillTextCalls.length = 0;
      renderer["drawPlayer"](
        fakeCamera,
        0,
        {
          positionX: 50,
          positionY: 100,
          facingDirection: 1,
          damagePercent: 40,
          characterId: 0x02, // Fox
          actionStateId: 0x04b, // DamageFlyHi
          actionFrameCounter: 1,
          stocksRemaining: 4,
          jumpsRemaining: 2,
        },
        null,
        null,
        10,
        false,
        null,
        false,
        {
          isActionableFrame: false,
          actionableFrameCount: 3,
          fadeAlpha: 0.75,
        },
      );

      expect(fillStyles).not.toContain("rgba(250, 204, 21, 0.95)");
      expect(fillTextCalls.some((c) => c.text === "3F gap")).toBe(true);

      // 3. Null comboEscapeState: neither silhouette nor callout is rendered
      fillStyles.length = 0;
      fillTextCalls.length = 0;
      renderer["drawPlayer"](
        fakeCamera,
        0,
        {
          positionX: 50,
          positionY: 100,
          facingDirection: 1,
          damagePercent: 40,
          characterId: 0x02, // Fox
          actionStateId: 0x00a, // Wait
          actionFrameCounter: 1,
          stocksRemaining: 4,
          jumpsRemaining: 2,
        },
        null,
        null,
        0,
        false,
        null,
        false,
        null,
      );

      expect(fillStyles).not.toContain("rgba(250, 204, 21, 0.95)");
      expect(fillTextCalls.some((c) => c.text.includes("gap"))).toBe(false);

      // 4. Position locking: Callout renders at anchor coords rather than current position
      fillTextCalls.length = 0;
      renderer["drawPlayer"](
        fakeCamera,
        0,
        {
          positionX: 800, // Player has moved far away
          positionY: 500,
          facingDirection: 1,
          damagePercent: 40,
          characterId: 0x02,
          actionStateId: 0x00a,
          actionFrameCounter: 1,
          stocksRemaining: 4,
          jumpsRemaining: 2,
        },
        null,
        null,
        0,
        false,
        null,
        false,
        {
          isActionableFrame: false,
          actionableFrameCount: 22,
          fadeAlpha: 0.8,
          anchorWorldX: 150, // Locked where gap occurred
          anchorWorldY: 200,
          anchorFacingRight: true,
        },
      );

      expect(fillTextCalls.some((c) => c.text === "22F gap")).toBe(true);
      const callout = fillTextCalls.find((c) => c.text === "22F gap");
      // Callout X should be anchored around worldX = 150, not player position 800
      expect(callout?.x).toBeLessThan(200);
    });

    it("identifies shield drop state (0x022) and applies squat compression", () => {
      expect(isShieldDropState(0x022)).toBe(true);
      expect(isShieldDropState(0x014)).toBe(false);
      expect(isShieldDropState(0x00a)).toBe(false);

      const scaleCalls: Array<{ sx: number; sy: number }> = [];
      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        translate: () => {},
        scale: (sx: number, sy: number) => {
          scaleCalls.push({ sx, sy });
        },
        rotate: () => {},
        arc: () => {},
        ellipse: () => {},
        rect: () => {},
        roundRect: () => {},
        fill: () => {},
        stroke: () => {},
        strokeRect: () => {},
        fillRect: () => {},
        clip: () => {},
        measureText: (str: string) => ({ width: str.length * 8 }),
        fillText: () => {},
        strokeText: () => {},
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        setLineDash: () => {},
      };

      const fakeCanvas = {
        getContext: () => fakeCtx,
        width: 960,
        height: 540,
      } as unknown as HTMLCanvasElement;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const fakeCamera = {
        worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
        worldLengthToScreen: (len: number) => len,
        groundScreenY: () => 400,
      };

      renderer["drawPlayer"](fakeCamera, 0, {
        positionX: 50,
        positionY: 100,
        facingDirection: 1,
        damagePercent: 0,
        characterId: 0x00, // Mario
        actionStateId: 0x022, // ShieldDrop
        actionFrameCounter: 1,
        stocksRemaining: 4,
        jumpsRemaining: 2,
      });

      // Character squashes down (scaleY < 1 and scaleX > 1)
      expect(scaleCalls.some((c) => c.sy < 1.0 && c.sx > 1.0)).toBe(true);
    });

    it("heavy landing (0x020) applies squat compression and does NOT render yellow ground underline", () => {
      const scaleCalls: Array<{ sx: number; sy: number }> = [];
      const strokeStyles: string[] = [];
      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        translate: () => {},
        scale: (sx: number, sy: number) => {
          scaleCalls.push({ sx, sy });
        },
        rotate: () => {},
        arc: () => {},
        ellipse: () => {},
        rect: () => {},
        roundRect: () => {},
        fill: () => {},
        stroke: () => {
          strokeStyles.push(fakeCtx.strokeStyle as string);
        },
        strokeRect: () => {},
        fillRect: () => {},
        clip: () => {},
        measureText: (str: string) => ({ width: str.length * 8 }),
        fillText: () => {},
        strokeText: () => {},
        fillStyle: "",
        get strokeStyle() {
          return strokeStyles[strokeStyles.length - 1] ?? "";
        },
        set strokeStyle(val: string) {
          strokeStyles.push(val);
        },
        lineWidth: 1,
        setLineDash: () => {},
      };

      const fakeCanvas = {
        getContext: () => fakeCtx,
        width: 960,
        height: 540,
      } as unknown as HTMLCanvasElement;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const fakeCamera = {
        worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
        worldLengthToScreen: (len: number) => len,
        groundScreenY: () => 400,
      };

      renderer["drawPlayer"](fakeCamera, 0, {
        positionX: 50,
        positionY: 100,
        facingDirection: 1,
        damagePercent: 0,
        characterId: 0x00, // Mario
        actionStateId: 0x020, // LandingHeavy
        actionFrameCounter: 1,
        stocksRemaining: 4,
        jumpsRemaining: 2,
      });

      // Squat compression is active
      expect(scaleCalls.some((c) => c.sy < 1.0 && c.sx > 1.0)).toBe(true);

      // Yellow ground underline is NOT rendered
      expect(strokeStyles).not.toContain("rgba(251, 191, 36, 0.9)");
    });

    it("light landing (0x01f) applies 4-frame squat compression and does NOT render ground underline", () => {
      expect(isLightLandingState(0x01f)).toBe(true);
      expect(isLightLandingState(0x020)).toBe(false);

      const scaleCalls: Array<{ sx: number; sy: number }> = [];
      const strokeStyles: string[] = [];
      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        translate: () => {},
        scale: (sx: number, sy: number) => {
          scaleCalls.push({ sx, sy });
        },
        rotate: () => {},
        arc: () => {},
        ellipse: () => {},
        rect: () => {},
        roundRect: () => {},
        fill: () => {},
        stroke: () => {
          strokeStyles.push(fakeCtx.strokeStyle as string);
        },
        strokeRect: () => {},
        fillRect: () => {},
        clip: () => {},
        measureText: (str: string) => ({ width: str.length * 8 }),
        fillText: () => {},
        strokeText: () => {},
        fillStyle: "",
        get strokeStyle() {
          return strokeStyles[strokeStyles.length - 1] ?? "";
        },
        set strokeStyle(val: string) {
          strokeStyles.push(val);
        },
        lineWidth: 1,
        setLineDash: () => {},
      };

      const fakeCanvas = {
        getContext: () => fakeCtx,
        width: 960,
        height: 540,
      } as unknown as HTMLCanvasElement;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const fakeCamera = {
        worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
        worldLengthToScreen: (len: number) => len,
        groundScreenY: () => 400,
      };

      renderer["drawPlayer"](fakeCamera, 0, {
        positionX: 50,
        positionY: 100,
        facingDirection: 1,
        damagePercent: 0,
        characterId: 0x00, // Mario
        actionStateId: 0x01f, // LandingLight
        actionFrameCounter: 1,
        stocksRemaining: 4,
        jumpsRemaining: 2,
      });

      // Squat compression is active
      expect(scaleCalls.some((c) => c.sy < 1.0 && c.sx > 1.0)).toBe(true);

      // Floor underline is NOT rendered
      expect(strokeStyles).not.toContain("rgba(226, 232, 240, 0.75)");
    });

    it("special landing lag (0x0ea, Pikachu Quick Attack landing) applies persistent squatting animation across 40+ frames to indicate vulnerability", () => {
      const scaleCalls: Array<{ sx: number; sy: number }> = [];
      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        quadraticCurveTo: () => {},
        bezierCurveTo: () => {},
        translate: () => {},
        scale: (sx: number, sy: number) => {
          scaleCalls.push({ sx, sy });
        },
        rotate: () => {},
        arc: () => {},
        ellipse: () => {},
        rect: () => {},
        roundRect: () => {},
        fill: () => {},
        stroke: () => {},
        strokeRect: () => {},
        fillRect: () => {},
        clip: () => {},
        measureText: (str: string) => ({ width: str.length * 8 }),
        fillText: () => {},
        strokeText: () => {},
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        setLineDash: () => {},
      };

      const fakeCanvas = {
        getContext: () => fakeCtx,
        width: 960,
        height: 540,
      } as unknown as HTMLCanvasElement;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const fakeCamera = {
        worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
        worldLengthToScreen: (len: number) => len,
        groundScreenY: () => 400,
      };

      // Test across the 40 frames of landing lag:
      for (const frame of [0, 5, 15, 25, 35]) {
        scaleCalls.length = 0;
        renderer["drawPlayer"](fakeCamera, 0, {
          positionX: 50,
          positionY: 100,
          facingDirection: 1,
          damagePercent: 0,
          characterId: 0x09, // Pikachu
          actionStateId: 0x0ea, // Quick Attack landing lag
          actionFrameCounter: frame,
          stocksRemaining: 4,
          jumpsRemaining: 2,
        });

        // Squatting compression is active: squashed vertically (sy < 1) and widened horizontally (sx > 1)
        const squat = scaleCalls.find((c) => c.sy < 1.0 && c.sx > 1.0);
        expect(squat).toBeDefined();
        expect(squat!.sy).toBeLessThan(0.95);
        expect(squat!.sx).toBeGreaterThan(1.03);
      }

      // At frame 40 (end of lag): recovery finishes
      scaleCalls.length = 0;
      renderer["drawPlayer"](fakeCamera, 0, {
        positionX: 50,
        positionY: 100,
        facingDirection: 1,
        damagePercent: 0,
        characterId: 0x09, // Pikachu
        actionStateId: 0x0ea, // Quick Attack landing lag
        actionFrameCounter: 40,
        stocksRemaining: 4,
        jumpsRemaining: 2,
      });
      const endSquat = scaleCalls.find((c) => c.sy < 1.0 && c.sx > 1.0);
      expect(endSquat).toBeUndefined();
    });

    it("drawReviveCloud and drawReviveCloudDissipating scale strictly proportionally with halfWidth across camera zooms", () => {
      // Zoomed far out (camera far away): halfWidth = 5
      const farArcs: { x: number; y: number; r: number }[] = [];
      const farCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: (x: number, y: number, r: number) => {
          farArcs.push({ x, y, r });
        },
        createLinearGradient: () => ({ addColorStop: () => {} }),
        fill: () => {},
        stroke: () => {},
        shadowColor: "",
        shadowBlur: 0,
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
      } as unknown as CanvasRenderingContext2D;

      drawReviveCloud(farCtx, 100, 200, 5, 0);

      // Close up (camera zoomed in): halfWidth = 25 (5x larger)
      const closeArcs: { x: number; y: number; r: number }[] = [];
      const closeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: (x: number, y: number, r: number) => {
          closeArcs.push({ x, y, r });
        },
        createLinearGradient: () => ({ addColorStop: () => {} }),
        fill: () => {},
        stroke: () => {},
        shadowColor: "",
        shadowBlur: 0,
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
      } as unknown as CanvasRenderingContext2D;

      drawReviveCloud(closeCtx, 100, 200, 25, 0);

      // Bottom lobe is the first arc:
      // far (halfWidth = 5): w = 8, lobe r = 8 * 0.52 = 4.16
      // close (halfWidth = 25): w = 40, lobe r = 40 * 0.52 = 20.8
      // Ratio must be exactly 5.0 (proportional to camera zoom, NOT clamped to 34px)
      expect(farArcs[0]!.r).toBeCloseTo(4.16, 2);
      expect(closeArcs[0]!.r).toBeCloseTo(20.8, 2);
      expect(closeArcs[0]!.r / farArcs[0]!.r).toBeCloseTo(5.0, 2);

      // Dissipating cloud also scales strictly proportionally
      const farDissipateArcs: { r: number }[] = [];
      const farDissipateCtx = {
        ...farCtx,
        arc: (_x: number, _y: number, r: number) => {
          farDissipateArcs.push({ r });
        },
      } as unknown as CanvasRenderingContext2D;
      drawReviveCloudDissipating(farDissipateCtx, 100, 200, 5, 2);

      const closeDissipateArcs: { r: number }[] = [];
      const closeDissipateCtx = {
        ...closeCtx,
        arc: (_x: number, _y: number, r: number) => {
          closeDissipateArcs.push({ r });
        },
      } as unknown as CanvasRenderingContext2D;
      drawReviveCloudDissipating(closeDissipateCtx, 100, 200, 25, 2);

      expect(closeDissipateArcs[0]!.r / farDissipateArcs[0]!.r).toBeCloseTo(
        5.0,
        2,
      );
    });

    it("renders red silhouette proxy when character is in hitstun", () => {
      const fillStyles: string[] = [];
      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        ellipse: () => {},
        rect: () => {},
        roundRect: () => {},
        fill: () => {},
        stroke: () => {},
        strokeRect: () => {},
        fillRect: () => {},
        clip: () => {},
        measureText: (str: string) => ({ width: str.length * 8 }),
        fillText: () => {},
        strokeText: () => {},
        get fillStyle() {
          return fillStyles[fillStyles.length - 1] ?? "";
        },
        set fillStyle(val: string) {
          fillStyles.push(val);
        },
        strokeStyle: "",
        shadowColor: "",
        shadowBlur: 0,
        lineWidth: 1,
        setLineDash: () => {},
      };

      const fakeCanvas = {
        getContext: () => fakeCtx,
        width: 960,
        height: 540,
      } as unknown as HTMLCanvasElement;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const fakeCamera = {
        worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
        worldLengthToScreen: (len: number) => len,
        groundScreenY: () => 400,
      };

      // DamageFlyHi (0x04b) with hitstunCounter = 20 -> inHitstun = true -> red silhouette
      renderer["drawPlayer"](
        fakeCamera,
        0,
        {
          positionX: 50,
          positionY: 100,
          facingDirection: 1,
          damagePercent: 40,
          characterId: 0x02, // Fox
          actionStateId: 0x033, // DamageFlyHi
          actionFrameCounter: 1,
          hitstunCounter: 20,
          stocksRemaining: 4,
          jumpsRemaining: 2,
        },
        null,
        null,
        0,
        false,
        null,
        false,
        null,
      );

      expect(fillStyles).toContain("rgba(239, 68, 68, 0.95)");
    });

    it("renders brilliant silver silhouette proxy when character is invincible or invulnerable", () => {
      const fillStyles: string[] = [];
      const strokeStyles: string[] = [];
      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: () => {},
        ellipse: () => {},
        roundRect: () => {},
        fill: () => {},
        stroke: () => {},
        fillText: () => {},
        strokeText: () => {},
        measureText: () => ({ width: 40 }),
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        drawImage: () => {},
        clip: () => {},
        setLineDash: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }),
        shadowColor: "",
        shadowBlur: 0,
        font: "",
        lineWidth: 1,
        get fillStyle() {
          return "";
        },
        set fillStyle(val: string) {
          fillStyles.push(val);
        },
        get strokeStyle() {
          return "";
        },
        set strokeStyle(val: string) {
          strokeStyles.push(val);
        },
      } as unknown as CanvasRenderingContext2D;

      const fakeCanvas = {
        getContext: () => fakeCtx,
        width: 960,
        height: 540,
      } as unknown as HTMLCanvasElement;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const fakeCamera = {
        worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
        worldLengthToScreen: (len: number) => len,
        groundScreenY: () => 400,
      };

      // RollF (0x09c) with hurtboxState = 3 -> intangible/invulnerable -> silver silhouette
      renderer["drawPlayer"](
        fakeCamera,
        0,
        {
          positionX: 50,
          positionY: 100,
          facingDirection: 1,
          damagePercent: 0,
          characterId: 0x02,
          actionStateId: 0x09c, // RollF
          actionFrameCounter: 10,
          hurtboxState: 3,
          stocksRemaining: 4,
          jumpsRemaining: 2,
        },
        null,
        null,
        0,
        false,
        null,
        false,
        null,
      );

      expect(fillStyles).toContain("rgba(240, 246, 255, 0.98)");
      expect(strokeStyles).toContain("#ffffff");
    });

    it("displays Invincible / Invulnerable tags in pause HUD based on hurtboxState", () => {
      const fillTextCalls: string[] = [];
      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: () => {},
        roundRect: () => {},
        fill: () => {},
        stroke: () => {},
        fillText: (text: string) => {
          fillTextCalls.push(text);
        },
        measureText: (str: string) => ({ width: str.length * 6.5 }),
        setLineDash: () => {},
        shadowColor: "",
        shadowBlur: 0,
        font: "",
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
      } as unknown as CanvasRenderingContext2D;

      // P1: Invincible (hurtboxState: 2), P2: Invulnerable (hurtboxState: 3)
      const huds = [
        {
          x: 100,
          y: 300,
          stateName: "Wait",
          stateId: 0x00a,
          posX: 0,
          posY: 0,
          tagColor: "#ef4444",
          hurtboxState: 2,
        },
        {
          x: 400,
          y: 300,
          stateName: "RollF",
          stateId: 0x09c,
          posX: 50,
          posY: 0,
          tagColor: "#3b82f6",
          hurtboxState: 3,
        },
      ];

      drawDeconflictedPauseHuds(fakeCtx, huds);

      expect(fillTextCalls.some((t) => t.includes("Invincible"))).toBe(true);
      expect(fillTextCalls.some((t) => t.includes("Invulnerable"))).toBe(true);
    });

    it("identifies revive states correctly with isReviveState", () => {
      expect(isReviveState(0x007)).toBe(true); // Revive1
      expect(isReviveState(0x008)).toBe(true); // Revive2
      expect(isReviveState(0x009)).toBe(true); // ReviveWait

      // Non-revive states
      expect(isReviveState(0x005)).toBe(false); // Entry
      expect(isReviveState(0x00a)).toBe(false); // Wait
      expect(isReviveState(0x016)).toBe(false); // JumpF
      expect(isReviveState(0x02b)).toBe(false); // Fall
      expect(isReviveState(0x000)).toBe(false); // Dead
    });

    it("drawReviveCloud renders cumulus billows with linear gradient and highlights", () => {
      const arcCalls: Array<{ x: number; y: number; r: number }> = [];
      let gradCreated = false;
      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: (x: number, y: number, r: number) => {
          arcCalls.push({ x, y, r });
        },
        fill: () => {},
        stroke: () => {},
        createLinearGradient: () => {
          gradCreated = true;
          return { addColorStop: () => {} };
        },
        shadowColor: "",
        shadowBlur: 0,
        strokeStyle: "",
        fillStyle: "",
        lineWidth: 1,
      } as unknown as CanvasRenderingContext2D;

      drawReviveCloud(fakeCtx, 100, 200, 25, 0, false);
      expect(gradCreated).toBe(true);
      expect(arcCalls.length).toBeGreaterThan(5); // Multi-lobed cloud puffs + highlights + wisps
    });

    it("drawPlayer renders cloud when in revive/revive wait states and disappears when leaving", () => {
      const gradientCoords: Array<{ y1: number; y2: number }> = [];
      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        ellipse: () => {},
        rect: () => {},
        roundRect: () => {},
        fill: () => {},
        stroke: () => {},
        strokeRect: () => {},
        fillRect: () => {},
        clip: () => {},
        measureText: (str: string) => ({ width: str.length * 8 }),
        fillText: () => {},
        strokeText: () => {},
        createLinearGradient: (
          _x1: number,
          y1: number,
          _x2: number,
          y2: number,
        ) => {
          gradientCoords.push({ y1, y2 });
          return { addColorStop: () => {} };
        },
        fillStyle: "",
        strokeStyle: "",
        shadowColor: "",
        shadowBlur: 0,
        lineWidth: 1,
        setLineDash: () => {},
      };

      const fakeCanvas = {
        getContext: () => fakeCtx,
        width: 960,
        height: 540,
      } as unknown as HTMLCanvasElement;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const fakeCamera = {
        worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
        worldLengthToScreen: (len: number) => len,
        groundScreenY: () => 400,
      };

      // 1. In ReviveWait (0x009): Cloud gradient is created underneath feet (y = 100)
      renderer["drawPlayer"](fakeCamera, 0, {
        positionX: 50,
        positionY: 100,
        facingDirection: 1,
        damagePercent: 0,
        characterId: 0x00, // Mario
        actionStateId: 0x009, // ReviveWait
        actionFrameCounter: 1,
        stocksRemaining: 3,
        jumpsRemaining: 2,
      });

      expect(gradientCoords.length).toBeGreaterThan(0);
      const hasCloudGrad = gradientCoords.some(
        (c) => c.y1 <= 100 && c.y2 >= 100,
      );
      expect(hasCloudGrad).toBe(true);

      // 2. Leaves ReviveWait (drops or jumps into 0x02b Fall): Cloud disappears!
      gradientCoords.length = 0;
      renderer["drawPlayer"](fakeCamera, 0, {
        positionX: 50,
        positionY: 100,
        facingDirection: 1,
        damagePercent: 0,
        characterId: 0x00, // Mario
        actionStateId: 0x02b, // Fall
        actionFrameCounter: 1,
        stocksRemaining: 3,
        jumpsRemaining: 2,
      });

      // No cloud gradient created beneath player
      expect(gradientCoords.some((c) => c.y1 >= 95 && c.y2 <= 125)).toBe(false);
    });

    it("identifies shield break fly state correctly with isShieldBreakFlyState", () => {
      expect(isShieldBreakFlyState(0x09e)).toBe(true);
      expect(isShieldBreakFlyState(0x09f)).toBe(false); // ShieldBreakFall
      expect(isShieldBreakFlyState(0x0a0)).toBe(false); // ShieldBreakDownBound
      expect(isShieldBreakFlyState(0x0a1)).toBe(false); // ShieldBreakStand
      expect(isShieldBreakFlyState(0x099)).toBe(false); // Shield
      expect(isShieldBreakFlyState(0x00a)).toBe(false); // Wait
    });

    it("drawShieldBreakPop renders pre-pop crimson stressed bubble in frames 0-3", () => {
      let radialGradCount = 0;
      let strokeCount = 0;
      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {
          strokeCount++;
        },
        createRadialGradient: () => {
          radialGradCount++;
          return { addColorStop: () => {} };
        },
        shadowColor: "",
        shadowBlur: 0,
        strokeStyle: "",
        fillStyle: "",
        lineWidth: 1,
        lineCap: "",
        lineJoin: "",
      } as unknown as CanvasRenderingContext2D;

      // Frame 0: Stressed crimson bubble with fractures
      drawShieldBreakPop(fakeCtx, 100, 100, 10, 30, "#3b82f6", 0, false);
      expect(radialGradCount).toBe(1);
      expect(strokeCount).toBeGreaterThan(0);

      // Frame 2: Bulging bubble with cross-cutting split fissure
      radialGradCount = 0;
      strokeCount = 0;
      drawShieldBreakPop(fakeCtx, 100, 100, 10, 30, "#3b82f6", 2, false);
      expect(radialGradCount).toBe(1);
      expect(strokeCount).toBeGreaterThan(1);
    });

    it("drawShieldBreakPop renders detonation burst flash and rotating shards in frames 4-22", () => {
      let radialGradCount = 0;
      let rotateCount = 0;
      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        translate: () => {},
        rotate: () => {
          rotateCount++;
        },
        createRadialGradient: () => {
          radialGradCount++;
          return { addColorStop: () => {} };
        },
        shadowColor: "",
        shadowBlur: 0,
        strokeStyle: "",
        fillStyle: "",
        lineWidth: 1,
        lineCap: "",
      } as unknown as CanvasRenderingContext2D;

      // Frame 5: Flash burst active + 10 rotating crystal shards flying outward
      drawShieldBreakPop(fakeCtx, 100, 100, 10, 30, "#3b82f6", 5, false);
      expect(radialGradCount).toBe(1); // Central detonation flash
      expect(rotateCount).toBe(10); // 10 shards individually rotated

      // Frame 15: Post-flash, shards continuing flight and spin
      radialGradCount = 0;
      rotateCount = 0;
      drawShieldBreakPop(fakeCtx, 100, 100, 10, 30, "#3b82f6", 15, false);
      expect(radialGradCount).toBe(0); // Flash ended
      expect(rotateCount).toBe(10); // 10 shards still spinning
    });

    it("drawShieldBreakPop terminates cleanly after SHIELD_BREAK_POP_FRAMES", () => {
      let anyOperation = false;
      const fakeCtx = {
        save: () => {
          anyOperation = true;
        },
        restore: () => {},
      } as unknown as CanvasRenderingContext2D;

      drawShieldBreakPop(
        fakeCtx,
        100,
        100,
        10,
        30,
        "#3b82f6",
        SHIELD_BREAK_POP_FRAMES,
        false,
      );
      expect(anyOperation).toBe(false);

      drawShieldBreakPop(fakeCtx, 100, 100, 10, 30, "#3b82f6", 50, false);
      expect(anyOperation).toBe(false);
    });

    it("drawPlayer renders shield break pop animation during 0x09e and disappears when frame >= 24", () => {
      let rotateCount = 0;
      let radialGradCount = 0;
      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {
          rotateCount++;
        },
        arc: () => {},
        ellipse: () => {},
        rect: () => {},
        roundRect: () => {},
        fill: () => {},
        stroke: () => {},
        strokeRect: () => {},
        fillRect: () => {},
        clip: () => {},
        measureText: (str: string) => ({ width: str.length * 8 }),
        fillText: () => {},
        strokeText: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => {
          radialGradCount++;
          return { addColorStop: () => {} };
        },
        fillStyle: "",
        strokeStyle: "",
        shadowColor: "",
        shadowBlur: 0,
        lineWidth: 1,
        setLineDash: () => {},
      };

      const fakeCanvas = {
        getContext: () => fakeCtx,
        width: 960,
        height: 540,
      } as unknown as HTMLCanvasElement;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const fakeCamera = {
        worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
        worldLengthToScreen: (len: number) => len,
        groundScreenY: () => 400,
      };

      // 1. Frame 0 of 0x09e: Pre-pop stressed crimson bubble
      radialGradCount = 0;
      rotateCount = 0;
      renderer["drawPlayer"](fakeCamera, 0, {
        positionX: 50,
        positionY: 100,
        facingDirection: 1,
        damagePercent: 0,
        characterId: 0x00, // Mario
        actionStateId: 0x09e, // ShieldBreakFly
        actionFrameCounter: 0,
        stocksRemaining: 3,
        jumpsRemaining: 2,
      });
      expect(radialGradCount).toBeGreaterThan(0); // Stressed crimson core radial gradient

      // 2. Frame 6 of 0x09e: Pop detonation + 10 flying crystal shards
      radialGradCount = 0;
      rotateCount = 0;
      renderer["drawPlayer"](fakeCamera, 0, {
        positionX: 50,
        positionY: 100,
        facingDirection: 1,
        damagePercent: 0,
        characterId: 0x00, // Mario
        actionStateId: 0x09e, // ShieldBreakFly
        actionFrameCounter: 6,
        stocksRemaining: 3,
        jumpsRemaining: 2,
      });
      // 10 shards rotated + body rotations
      expect(rotateCount).toBeGreaterThanOrEqual(10);
      expect(radialGradCount).toBeGreaterThan(0); // Detonation burst flash

      // 3. Frame 25 of 0x09e: Shield break pop has ended completely
      radialGradCount = 0;
      rotateCount = 0;
      renderer["drawPlayer"](fakeCamera, 0, {
        positionX: 50,
        positionY: 100,
        facingDirection: 1,
        damagePercent: 0,
        characterId: 0x00, // Mario
        actionStateId: 0x09e, // ShieldBreakFly
        actionFrameCounter: 25,
        stocksRemaining: 3,
        jumpsRemaining: 2,
      });
      // No shield pop radial gradients drawn
      expect(radialGradCount).toBe(0);
    });

    it("identifies vulnerable stun states correctly with isVulnerableStunState", () => {
      expect(isVulnerableStunState(0x0a0)).toBe(true); // ShieldBreakDownBound
      expect(isVulnerableStunState(0x0a2)).toBe(true); // FuraFura (shield broken dizzy stuck state)
      expect(isVulnerableStunState(0x0a4)).toBe(true); // Stun
      expect(isVulnerableStunState(0x09e)).toBe(false); // ShieldBreakFly
      expect(isVulnerableStunState(0x09f)).toBe(false); // ShieldBreakFall
      expect(isVulnerableStunState(0x0a1)).toBe(false); // ShieldBreakStand
      expect(isVulnerableStunState(0x00a)).toBe(false); // Wait
    });

    it("drawPlayer renders red hitstun silhouette when in 0x0a0 (ShieldBreakDownBound), 0x0a2 (FuraFura), or 0x0a4 (Stun)", () => {
      const fillStyles: string[] = [];
      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        ellipse: () => {},
        rect: () => {},
        roundRect: () => {},
        fill: () => {},
        stroke: () => {},
        strokeRect: () => {},
        fillRect: () => {},
        clip: () => {},
        measureText: (str: string) => ({ width: str.length * 8 }),
        fillText: () => {},
        strokeText: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }),
        get fillStyle() {
          return fillStyles[fillStyles.length - 1] ?? "";
        },
        set fillStyle(val: string) {
          fillStyles.push(val);
        },
        strokeStyle: "",
        shadowColor: "",
        shadowBlur: 0,
        lineWidth: 1,
        setLineDash: () => {},
      };

      const fakeCanvas = {
        getContext: () => fakeCtx,
        width: 960,
        height: 540,
      } as unknown as HTMLCanvasElement;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const fakeCamera = {
        worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
        worldLengthToScreen: (len: number) => len,
        groundScreenY: () => 400,
      };

      // 1. In 0x0a0 (ShieldBreakDownBound)
      fillStyles.length = 0;
      renderer["drawPlayer"](fakeCamera, 0, {
        positionX: 50,
        positionY: 100,
        facingDirection: 1,
        damagePercent: 0,
        characterId: 0x00,
        actionStateId: 0x0a0,
        actionFrameCounter: 5,
        stocksRemaining: 3,
        jumpsRemaining: 2,
      });
      expect(fillStyles).toContain("rgba(239, 68, 68, 0.95)");

      // 2. In 0x0a2 (FuraFura)
      fillStyles.length = 0;
      renderer["drawPlayer"](fakeCamera, 0, {
        positionX: 50,
        positionY: 100,
        facingDirection: 1,
        damagePercent: 0,
        characterId: 0x00,
        actionStateId: 0x0a2,
        actionFrameCounter: 5,
        stocksRemaining: 3,
        jumpsRemaining: 2,
      });
      expect(fillStyles).toContain("rgba(239, 68, 68, 0.95)");

      // 3. In 0x0a4 (Stun)
      fillStyles.length = 0;
      renderer["drawPlayer"](fakeCamera, 0, {
        positionX: 50,
        positionY: 100,
        facingDirection: 1,
        damagePercent: 0,
        characterId: 0x00,
        actionStateId: 0x0a4,
        actionFrameCounter: 10,
        stocksRemaining: 3,
        jumpsRemaining: 2,
      });
      expect(fillStyles).toContain("rgba(239, 68, 68, 0.95)");

      // 4. Normal idle (0x00a) does not have hitstun silhouette
      fillStyles.length = 0;
      renderer["drawPlayer"](fakeCamera, 0, {
        positionX: 50,
        positionY: 100,
        facingDirection: 1,
        damagePercent: 0,
        characterId: 0x00,
        actionStateId: 0x00a,
        actionFrameCounter: 10,
        stocksRemaining: 3,
        jumpsRemaining: 2,
      });
      expect(fillStyles).not.toContain("rgba(239, 68, 68, 0.95)");
    });

    it("keeps shield break pop centered at the initial world position while fighter ascends in ShieldBreakFly", () => {
      const radialGradCoords: Array<{ x0: number; y0: number }> = [];
      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        ellipse: () => {},
        rect: () => {},
        roundRect: () => {},
        fill: () => {},
        stroke: () => {},
        strokeRect: () => {},
        fillRect: () => {},
        clip: () => {},
        measureText: (str: string) => ({ width: str.length * 8 }),
        fillText: () => {},
        strokeText: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: (x0: number, y0: number) => {
          radialGradCoords.push({ x0, y0 });
          return { addColorStop: () => {} };
        },
        fillStyle: "",
        strokeStyle: "",
        shadowColor: "",
        shadowBlur: 0,
        lineWidth: 1,
        setLineDash: () => {},
      };

      const fakeCanvas = {
        getContext: () => fakeCtx,
        width: 960,
        height: 540,
      } as unknown as HTMLCanvasElement;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const fakeCamera = {
        worldToScreen: (wx: number, wy: number) => ({ x: wx, y: 540 - wy }),
        worldLengthToScreen: (len: number) => len,
        groundScreenY: () => 540,
      };

      // Create a replay where Mario has shield broken on frame 10 at (100, 50).
      // On frame 16 (6 frames later), Mario has flown up to (100, 200).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dummyReplay: any = {
        header: { gameFamily: "smash64", schemaVersion: 1 },
        matchSettings: {
          characterId: [0x00, 0, 0, 0],
          playerNames: ["Mario", "", "", ""],
          slotType: ["human", "empty", "empty", "empty"],
        },
        frames: [
          // Frame 9: Shielding on ground (100, 50)
          {
            frame: 9,
            ports: {
              0: {
                state: {
                  positionX: 100,
                  positionY: 50,
                  characterId: 0x00,
                  actionStateId: 0x099, // Shield
                  actionFrameCounter: 15,
                  stocksRemaining: 3,
                  jumpsRemaining: 2,
                  damagePercent: 0,
                  facingDirection: 1,
                },
              },
            },
          },
          // Frame 10: Shield breaks! Enters ShieldBreakFly at (100, 50)
          {
            frame: 10,
            ports: {
              0: {
                state: {
                  positionX: 100,
                  positionY: 50,
                  characterId: 0x00,
                  actionStateId: 0x09e, // ShieldBreakFly
                  actionFrameCounter: 0,
                  stocksRemaining: 3,
                  jumpsRemaining: 2,
                  damagePercent: 0,
                  facingDirection: 1,
                },
              },
            },
          },
          // Frame 16: 6 frames later, Mario is high in the air at (100, 200)
          {
            frame: 16,
            ports: {
              0: {
                state: {
                  positionX: 100,
                  positionY: 200,
                  characterId: 0x00,
                  actionStateId: 0x09e, // ShieldBreakFly
                  actionFrameCounter: 6,
                  stocksRemaining: 3,
                  jumpsRemaining: 2,
                  damagePercent: 0,
                  facingDirection: 1,
                },
              },
            },
          },
          // Frame 35: 25 frames after break (pop animation ended)
          {
            frame: 35,
            ports: {
              0: {
                state: {
                  positionX: 100,
                  positionY: 300,
                  characterId: 0x00,
                  actionStateId: 0x09e, // ShieldBreakFly
                  actionFrameCounter: 25,
                  stocksRemaining: 3,
                  jumpsRemaining: 2,
                  damagePercent: 0,
                  facingDirection: 1,
                },
              },
            },
          },
        ],
      };

      // Frame 16: render Mario at frame 16
      radialGradCoords.length = 0;
      renderer["drawPlayer"](
        fakeCamera,
        0,
        dummyReplay.frames[2].ports[0].state,
        undefined,
        dummyReplay,
        16,
      );

      // Mario's airborne foot position is at worldToScreen(100, 200) -> screen Y = 540 - 200 = 340.
      // And airborne center is 540 - (200 + 422.5666 / 2) = 128.72.
      // But the shield break pop detonation flash must remain centered at the break frame's starting position:
      // worldX = 100, worldY = 50 + size.height / 2 = 261.28 -> screen Y = 540 - 261.28 = 278.72.
      expect(radialGradCoords.length).toBeGreaterThan(0);
      const popFlash = radialGradCoords[0]!;
      expect(popFlash.x0).toBe(100);
      // The pop flash Y must be centered at 278.72 (ground position), NOT 128.72 (airborne position)
      expect(popFlash.y0).toBeCloseTo(278.72, 1);
      expect(popFlash.y0).not.toBeCloseTo(128.72, 1);

      // Frame 35: pop animation has finished, no radial gradient drawn
      radialGradCoords.length = 0;
      renderer["drawPlayer"](
        fakeCamera,
        0,
        dummyReplay.frames[3].ports[0].state,
        undefined,
        dummyReplay,
        35,
      );
      expect(radialGradCoords.length).toBe(0);
    });

    it("drawReviveCloudDissipating renders expanding dispersing billows and terminates at CLOUD_DISSIPATE_FRAMES", () => {
      let gradCreated = false;
      const arcCalls: Array<{ x: number; y: number; r: number }> = [];
      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: (x: number, y: number, r: number) => {
          arcCalls.push({ x, y, r });
        },
        fill: () => {},
        stroke: () => {},
        createLinearGradient: () => {
          gradCreated = true;
          return { addColorStop: () => {} };
        },
        shadowColor: "",
        shadowBlur: 0,
        strokeStyle: "",
        fillStyle: "",
        lineWidth: 1,
      } as unknown as CanvasRenderingContext2D;

      // Frame 0 of dissipation
      drawReviveCloudDissipating(fakeCtx, 100, 200, 25, 0, false);
      expect(gradCreated).toBe(true);
      expect(arcCalls.length).toBeGreaterThan(5);

      // Frame 10 of dissipation (mid-dissolve)
      arcCalls.length = 0;
      drawReviveCloudDissipating(fakeCtx, 100, 200, 25, 10, false);
      expect(arcCalls.length).toBeGreaterThan(5);

      // Frame 20+ (fully dissipated)
      let anyOp = false;
      const emptyCtx = {
        save: () => {
          anyOp = true;
        },
        restore: () => {},
      } as unknown as CanvasRenderingContext2D;
      drawReviveCloudDissipating(
        emptyCtx,
        100,
        200,
        25,
        CLOUD_DISSIPATE_FRAMES,
        false,
      );
      expect(anyOp).toBe(false);
    });

    it("drawPlayer renders dissipating cloud at exit world coordinates when leaving revive", () => {
      const gradientCoords: Array<{ y1: number; y2: number }> = [];
      const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        ellipse: () => {},
        rect: () => {},
        roundRect: () => {},
        fill: () => {},
        stroke: () => {},
        strokeRect: () => {},
        fillRect: () => {},
        clip: () => {},
        measureText: (str: string) => ({ width: str.length * 8 }),
        fillText: () => {},
        strokeText: () => {},
        createLinearGradient: (
          _x1: number,
          y1: number,
          _x2: number,
          y2: number,
        ) => {
          gradientCoords.push({ y1, y2 });
          return { addColorStop: () => {} };
        },
        createRadialGradient: () => ({ addColorStop: () => {} }),
        fillStyle: "",
        strokeStyle: "",
        shadowColor: "",
        shadowBlur: 0,
        lineWidth: 1,
        setLineDash: () => {},
      };

      const fakeCanvas = {
        getContext: () => fakeCtx,
        width: 960,
        height: 540,
      } as unknown as HTMLCanvasElement;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderer = new (StageRenderer as any)(fakeCanvas);
      const fakeCamera = {
        worldToScreen: (wx: number, wy: number) => ({ x: wx, y: wy }),
        worldLengthToScreen: (len: number) => len,
        groundScreenY: () => 400,
      };

      // Mock replay with revive exit at frame 100, platform at (50, 200)
      const fakeReplay = {
        frames: [
          {
            ports: [
              {
                state: {
                  actionStateId: 0x009,
                  positionX: 50,
                  positionY: 200,
                  characterId: 0,
                },
              },
            ],
          },
          {
            ports: [
              {
                state: {
                  actionStateId: 0x02b,
                  positionX: 60,
                  positionY: 180,
                  characterId: 0,
                },
              },
            ],
          },
        ],
      } as unknown as Replay;

      // Frame 105: Player is in Fall (0x02b) at y=180, but cloud was at y=200 and is now 5 frames into dissipating
      renderer["drawPlayer"](
        fakeCamera,
        0,
        {
          positionX: 60,
          positionY: 180,
          facingDirection: 1,
          damagePercent: 0,
          characterId: 0x00, // Mario
          actionStateId: 0x02b, // Fall
          actionFrameCounter: 5,
          stocksRemaining: 3,
          jumpsRemaining: 2,
        },
        null,
        fakeReplay,
        1, // frameIndex 1 (1 frame after exit at frame 0)
      );

      // Cloud gradient is drawn at platform position (y = 200)
      const hasDissipatingCloud = gradientCoords.some(
        (c) => c.y1 <= 200 && c.y2 >= 200,
      );
      expect(hasDissipatingCloud).toBe(true);
    });
  });
});
