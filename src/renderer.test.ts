import { describe, it, expect } from "vitest";
import {
  getAttackInfo,
  getDeathDirection,
  getFalconSpecialType,
  getPikachuSpecialType,
  isCrouchState,
  isDeadState,
  isFalconCharacter,
  isGrabbedState,
  isLandingState,
  isPikachuCharacter,
  isShieldState,
  isShieldStunState,
  isSpecialState,
  isTauntState,
} from "./renderer.js";
import {
  DREAM_LAND_BLAST_ZONE,
  DREAM_LAND_STAGE_ID,
  stageBlastZone,
} from "./stageGeometry.js";

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
