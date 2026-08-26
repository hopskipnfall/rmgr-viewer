import { describe, it, expect } from "vitest";
import {
  getAttackInfo,
  getDeathDirection,
  getFalconSpecialType,
  getFoxFlightAngle,
  getFoxSpecialType,
  getPikachuSpecialType,
  getStartNameAlpha,
  START_NAME_DISPLAY_FRAMES,
  START_NAME_SOLID_FRAMES,
  isCrouchState,
  isDeadState,
  isDonkeyKongCharacter,
  isFalconCharacter,
  isFireFoxFlightState,
  isFoxCharacter,
  isGrabbedState,
  isJigglypuffCharacter,
  isKirbyCharacter,
  isLandingState,
  isLinkCharacter,
  isLuigiCharacter,
  isMarioCharacter,
  isNessCharacter,
  isPikachuCharacter,
  isQuickAttackState,
  isRollForward,
  isRollState,
  isSamusCharacter,
  isShieldState,
  isShieldStunState,
  isSpecialState,
  isTauntState,
  isTurnState,
  isYoshiCharacter,
  toGrayscale,
} from "./renderer.js";
import type { Replay } from "@rmg-k/rmgr";
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

  it("identifies grab attempts correctly", () => {
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
  });

  it("returns null for non-attack states", () => {
    expect(getAttackInfo(0x00a)).toBeNull(); // Idle
    expect(getAttackInfo(0x0c0)).toBeNull(); // DashAttack
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

  it("identifies Blaster (Neutral-B) states correctly", () => {
    expect(getFoxSpecialType(0x01, 0x0dc)).toBe("blaster");
    expect(getFoxSpecialType(0x29, 0x0dd)).toBe("blaster");
    expect(getFoxSpecialType(0x01, 0x0e1)).toBe("blaster");
    expect(getFoxSpecialType(0x29, 0x0e2)).toBe("blaster");
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
