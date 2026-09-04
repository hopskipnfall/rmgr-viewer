import { describe, it, expect } from "vitest";
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
  isKirbyCharacter,
  isLandingState,
  isHeavyLandingState,
  isLinkCharacter,
  isLuigiCharacter,
  isMarioCharacter,
  isMissedTechState,
  isNessCharacter,
  isNormalRollState,
  isPikachuCharacter,
  isProneState,
  isQuickAttackState,
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
  isTechRollState,
  isTumbleState,
  isTurnState,
  isYoshiCharacter,
  toGrayscale,
  toBlandPalette,
  computeLedgeGrabCandidates,
  LEDGE_GRAB_FADE_FRAMES,
  StageRenderer,
} from "./renderer.js";
import {
  HazardFlag,
  type Frame,
  type PortIndex,
  type PostFrameUpdate,
  type PreFrameUpdate,
  type Replay,
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
    expect(getFalconSpecialType(0x07, 0x0e9)).toBe("dive_reach");
    expect(getFalconSpecialType(0x07, 0x0ea)).toBe("dive_catch");
    expect(getFalconSpecialType(0x07, 0x0ee)).toBe("dive_explosion");
    expect(getFalconSpecialType(0x28, 0x0ea)).toBe("dive_catch");
  });

  it("classifies Falcon Kick states correctly", () => {
    expect(getFalconSpecialType(0x07, 0x0eb)).toBe("kick");
    expect(getFalconSpecialType(0x07, 0x0ec)).toBe("kick");
    expect(getFalconSpecialType(0x07, 0x0ed)).toBe("kick_end");
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
  it("classifies Thunder (Down-B) correctly", () => {
    expect(getPikachuSpecialType(0x09, 0x0e3)).toBe("thunder");
    expect(getPikachuSpecialType(0x09, 0x0e4)).toBe("thunder");
    expect(getPikachuSpecialType(0x09, 0x0e5)).toBe("thunder");
    expect(getPikachuSpecialType(0x09, 0x0e6)).toBe("thunder");
    expect(getPikachuSpecialType(0x09, 0x0e7)).toBe("thunder");
    expect(getPikachuSpecialType(0x32, 0x0e3)).toBe("thunder");
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

describe("extractAllQuickAttackPaths", () => {
  it("extracts all Quick Attack path segments for Pikachu", () => {
    const replay = {
      gameStart: {
        stageId: DREAM_LAND_STAGE_ID,
        ports: [
          { characterId: 0x09 }, // Pikachu
          { characterId: 0x01 }, // Fox
        ],
      },
      frames: [
        // Frame 0: Idle
        {
          frame: 0,
          ports: [
            { post: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
        // Frame 1-3: Quick Attack 1 (Startup -> Zip 1 -> End)
        {
          frame: 1,
          ports: [
            { post: { actionStateId: 0x0e8, positionX: 10, positionY: 0 } },
          ],
        },
        {
          frame: 2,
          ports: [
            { post: { actionStateId: 0x0ec, positionX: 100, positionY: 50 } },
          ],
        },
        {
          frame: 3,
          ports: [
            { post: { actionStateId: 0x0e9, positionX: 150, positionY: 50 } },
          ],
        },
        // Frame 4: Landed / Idle
        {
          frame: 4,
          ports: [
            { post: { actionStateId: 0x0a, positionX: 150, positionY: 0 } },
          ],
        },
        // Frame 5-8: Quick Attack 2 (Startup -> Zip 1 -> Zip 2 -> End)
        {
          frame: 5,
          ports: [
            { post: { actionStateId: 0x0eb, positionX: 200, positionY: 100 } },
          ],
        },
        {
          frame: 6,
          ports: [
            { post: { actionStateId: 0x0ec, positionX: 300, positionY: 200 } },
          ],
        },
        {
          frame: 7,
          ports: [
            { post: { actionStateId: 0x0ed, positionX: 400, positionY: 250 } },
          ],
        },
        {
          frame: 8,
          ports: [
            { post: { actionStateId: 0x0ea, positionX: 450, positionY: 250 } },
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
      gameStart: {
        stageId: DREAM_LAND_STAGE_ID,
        ports: [{ characterId: 0x09 }, { characterId: 0x01 }],
      },
      frames: [
        // Frame 0: Offstage outside danger zone (starts recovery situation)
        {
          frame: 0,
          ports: [
            { post: { actionStateId: 0x18, positionX: -3500, positionY: 500 } },
            { post: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
        // Frame 1-3: Quick Attack during recovery
        {
          frame: 1,
          ports: [
            {
              post: { actionStateId: 0x0e8, positionX: -3500, positionY: 500 },
            },
            { post: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
        {
          frame: 2,
          ports: [
            {
              post: { actionStateId: 0x0ec, positionX: -2000, positionY: 500 },
            },
            { post: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
        {
          frame: 3,
          ports: [
            { post: { actionStateId: 0x0e9, positionX: -500, positionY: 500 } },
            { post: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
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
      gameStart: {
        stageId: DREAM_LAND_STAGE_ID,
        ports: [{ characterId: 0x09 }, { characterId: 0x01 }],
      },
      frames: [
        // Frame 0: Offstage falling (starts recovery)
        {
          frame: 0,
          ports: [
            { post: { actionStateId: 0x1a, positionX: -3600, positionY: 300 } }, // Fall
            { post: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
        // Frame 1: Still falling
        {
          frame: 1,
          ports: [
            { post: { actionStateId: 0x1a, positionX: -3500, positionY: 200 } }, // Fall
            { post: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
        // Frame 2: Mid-air jump
        {
          frame: 2,
          ports: [
            { post: { actionStateId: 0x18, positionX: -3400, positionY: 350 } }, // JumpAerialF
            { post: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
        // Frame 3: Mid-air jump rising
        {
          frame: 3,
          ports: [
            { post: { actionStateId: 0x18, positionX: -3300, positionY: 500 } }, // JumpAerialF
            { post: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
        // Frame 4-5: Up-B
        {
          frame: 4,
          ports: [
            {
              post: { actionStateId: 0x0e8, positionX: -3300, positionY: 500 },
            },
            { post: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
          ],
        },
        {
          frame: 5,
          ports: [
            {
              post: { actionStateId: 0x0ec, positionX: -1500, positionY: 500 },
            },
            { post: { actionStateId: 0x0a, positionX: 0, positionY: 0 } },
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
      gameStart: {
        stageId: DREAM_LAND_STAGE_ID,
        ports: [{ characterId: 0x01 }], // Fox
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
    expect(getAttackInfo(0x0e5, 0x05)).toEqual({
      type: "grab",
      direction: "forward",
    }); // Link Hookshot grab
    expect(getAttackInfo(0x0e5, 0x03)).toEqual({
      type: "grab",
      direction: "forward",
    }); // Samus Grapple Beam grab
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
  });

  it("returns null for non-attack states", () => {
    expect(getAttackInfo(0x00a)).toBeNull(); // Idle
    expect(getAttackInfo(0x0db)).toBeNull(); // LandingAirX
    expect(getAttackInfo(0x099)).toBeNull(); // Shield
    expect(getAttackInfo(0x0ab)).toBeNull(); // CapturePull
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
        { ports: { 0: { post: { positionX: 0, positionY: 0 } } } },
        { ports: { 0: { post: { positionX: 0, positionY: 5 } } } },
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
        { ports: { 0: { post: { positionX: 0, positionY: 0 } } } },
        { ports: { 0: { post: { positionX: 5, positionY: 0 } } } },
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
        { ports: { 0: { post: { positionX: 0, positionY: 0 } } } },
        { ports: { 0: { post: { positionX: 5, positionY: 5 } } } },
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
    expect(getFalconSpecialType(0x07, 0x0eb)).toBe("kick");
    expect(getFalconSpecialType(0x07, 0x0ed)).toBe("kick_end");
  });

  it("returns null for non-Falcon or non-special states", () => {
    expect(getFalconSpecialType(0x01, 0x0e6)).toBeNull(); // Fox
    expect(getFalconSpecialType(0x07, 0x00a)).toBeNull(); // Idle
  });
});

describe("getPikachuSpecialType", () => {
  it("identifies Thunder (Down-B) states", () => {
    expect(getPikachuSpecialType(0x09, 0x0e3)).toBe("thunder");
    expect(getPikachuSpecialType(0x09, 0x0e5)).toBe("thunder");
    expect(getPikachuSpecialType(0x32, 0x0e7)).toBe("thunder");
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
    expect(isTechInPlaceState(0x049)).toBe(false); // TechF
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
    expect(getDKSpecialType(0x02, 0x0eb)).toBe("giant_punch_windup");
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
    expect(getSamusSpecialType(0x03, 0x0e8)).toBe("bomb");
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

  it("classifies 0x0e6 as dropping a bomb, not screw attack (confirmed empirically - previously misclassified as screw attack)", () => {
    expect(getSamusSpecialType(0x03, 0x0e6)).toBe("bomb");
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
  function makePre(port: PortIndex, frameNum: number): PreFrameUpdate {
    return { frame: frameNum, port, buttons: 0, stickX: 0, stickY: 0 };
  }

  function makePost(
    overrides: Partial<PostFrameUpdate> & { port: PortIndex },
  ): PostFrameUpdate {
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

  function makeFrame(frameNum: number, posts: PostFrameUpdate[]): Frame {
    const ports: { -readonly [K in PortIndex]?: Frame["ports"][K] } = {};
    for (const post of posts) {
      ports[post.port] = { pre: makePre(post.port, frameNum), post };
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
    post: Omit<PostFrameUpdate, "frame">,
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
  const FOX_OFF_RIGHT_EDGE: Omit<PostFrameUpdate, "frame"> = {
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
    expect(fills).toContain("#f59e0b"); // Sand root mound
    expect(fills).toContain("#78350f"); // Coconut
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
});
