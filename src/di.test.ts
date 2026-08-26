import { describe, it, expect } from "vitest";
import {
  calculateDIFrames,
  calculateHitlagFrames,
  checkDIActivation,
  classifyDICardinal,
  classifyDIRelative,
  calculateHitDI,
  extractAllHitsWithDI,
  DI_STICK_DISPLACEMENT_FACTOR,
} from "./di.js";
import type { Replay, Frame, PortIndex } from "@rmg-k/rmgr";

describe("calculateHitlagFrames and calculateDIFrames", () => {
  it("calculates U version standard hitlag frames correctly (+5 bonus)", () => {
    // formula: floor(damage / 3) + 5
    expect(calculateHitlagFrames(0, { version: "U" })).toBe(0);
    expect(calculateHitlagFrames(3, { version: "U" })).toBe(6); // floor(3/3)+5 = 6
    expect(calculateHitlagFrames(8, { version: "U" })).toBe(7); // floor(8/3)+5 = 7
    expect(calculateHitlagFrames(10, { version: "U" })).toBe(8); // floor(10/3)+5 = 8
    expect(calculateDIFrames(10)).toBe(8);
    expect(calculateHitlagFrames(16, { version: "U" })).toBe(10); // Falcon uair: floor(16/3)+5 = 10
  });

  it("calculates J version standard hitlag frames correctly (+4 bonus)", () => {
    // formula: floor(damage / 3) + 4
    expect(calculateHitlagFrames(10, { version: "J" })).toBe(7); // floor(10/3)+4 = 7
    expect(calculateHitlagFrames(16, { version: "J" })).toBe(9); // floor(16/3)+4 = 9
  });

  it("calculates crouch-cancel hitlag frames correctly", () => {
    // formula: floor((floor(dmg/3)*2 + bonus*2) / 3)
    // 10% on U version: floor((3*2 + 5*2) / 3) = floor(16/3) = 5
    expect(
      calculateHitlagFrames(10, { targetState: "crouching", version: "U" }),
    ).toBe(5);
  });

  it("calculates laying target hitlag frames correctly", () => {
    // formula: floor(ceil(dmg/2)/3) + bonus
    // 10% on U version: ceil(10/2) = 5 -> floor(5/3)+5 = 1+5 = 6
    expect(
      calculateHitlagFrames(10, { targetState: "laying", version: "U" }),
    ).toBe(6);
  });

  it("calculates electric attack hitlag frames with 1.5x multiplier", () => {
    // formula: floor(floor(damage / 3 + 5) * 1.5) on U version
    expect(calculateHitlagFrames(10, { isElectric: true, version: "U" })).toBe(
      Math.floor(8 * 1.5),
    ); // 12
    expect(calculateHitlagFrames(16, { isElectric: true, version: "U" })).toBe(
      Math.floor(10 * 1.5),
    ); // 15
  });

  it("verifies 2.1 units per stick input constant", () => {
    expect(DI_STICK_DISPLACEMENT_FACTOR).toBe(2.1);
    expect(80 * DI_STICK_DISPLACEMENT_FACTOR).toBe(168.0);
  });
});

describe("checkDIActivation", () => {
  it("triggers activation when stick leaves the deadzone box into active magnitude", () => {
    // was in deadzone (0,0), now at (80, 0) (magnitude 80 >= 53)
    expect(checkDIActivation(0, 0, 80, 0)).toBe(true);
    // was at (15, 10), now at (0, -70)
    expect(checkDIActivation(15, 10, 0, -70)).toBe(true);
    // was at (-20, 20), now at (-60, -60) (magnitude ~84.8 >= 53)
    expect(checkDIActivation(-20, 20, -60, -60)).toBe(true);
  });

  it("triggers activation when stick crosses opposite side across center", () => {
    // left (-80, 0) to right (80, 0)
    expect(checkDIActivation(-80, 0, 80, 0)).toBe(true);
    // down (0, -70) to up (0, 75)
    expect(checkDIActivation(0, -70, 0, 75)).toBe(true);
  });

  it("does not trigger when stick stays in the same active quadrant", () => {
    // held right (80, 0) -> (78, 2)
    expect(checkDIActivation(80, 0, 78, 2)).toBe(false);
    // held up (0, 80) -> (0, 75)
    expect(checkDIActivation(0, 80, 0, 75)).toBe(false);
  });

  it("does not trigger when magnitude is below 53", () => {
    // (0,0) -> (35, 0) (magnitude 35 < 53)
    expect(checkDIActivation(0, 0, 35, 0)).toBe(false);
    // (0,0) -> (35, 35) (magnitude 49.5 < 53)
    expect(checkDIActivation(0, 0, 35, 35)).toBe(false);
  });
});

describe("classifyDICardinal", () => {
  it("classifies cardinal angles correctly", () => {
    expect(classifyDICardinal(0, 0)).toBe("neutral");
    expect(classifyDICardinal(100, 0)).toBe("right");
    expect(classifyDICardinal(-100, 0)).toBe("left");
    expect(classifyDICardinal(0, 100)).toBe("up");
    expect(classifyDICardinal(0, -100)).toBe("down");
    expect(classifyDICardinal(100, 100)).toBe("up-right");
    expect(classifyDICardinal(-100, 100)).toBe("up-left");
    expect(classifyDICardinal(-100, -100)).toBe("down-left");
    expect(classifyDICardinal(100, -100)).toBe("down-right");
  });
});

describe("classifyDIRelative", () => {
  it("classifies DI relative to opponent position correctly", () => {
    // Victim at x=1000, Attacker at x=1200 (on right)
    // Moving left (-100, 0) is AWAY
    expect(classifyDIRelative(-100, 0, 1000, 1200)).toBe("away");
    // Moving right (100, 0) is IN
    expect(classifyDIRelative(100, 0, 1000, 1200)).toBe("in");
    // Moving up-left (-100, 100) is UP-AWAY
    expect(classifyDIRelative(-100, 100, 1000, 1200)).toBe("up-away");
    // Moving up-right (100, 100) is UP-IN
    expect(classifyDIRelative(100, 100, 1000, 1200)).toBe("up-in");
  });
});

describe("calculateHitDI and extractAllHitsWithDI", () => {
  function makeMockReplay(opts?: {
    hitActionState?: number;
    withDI?: boolean;
    stickX?: number;
    stickY?: number;
    zeroDisplacement?: boolean;
  }): Replay {
    const frames: Frame[] = [];
    const port0 = 0 as PortIndex;
    const port1 = 1 as PortIndex;
    const hitState = opts?.hitActionState ?? 0x033;
    const withDI = opts?.withDI ?? true;
    const customStickX = opts?.stickX ?? -80;
    const customStickY = opts?.stickY ?? 0;

    // Build 30 frames:
    // Frame 0-9: Victim on Port 1 is at (1000, 500) with 0% damage
    // Frame 10: Hit lands on Port 1: damage increases from 0% to 10% (DI window: 7 frames, 10 to 17)
    // Frame 10-12: Stick at (0, 0), pos (1000, 500)
    // Frame 13: Stick moves to (-80, 0) (triggers DI left), pos shifts to (832, 500)
    // Frame 17: Hitlag ends
    for (let f = 0; f < 30; f++) {
      const isHitlag = f >= 10 && f <= 17;
      const dmg = f < 10 ? 0 : 10;
      const stickX = withDI && f >= 13 && f <= 17 ? customStickX : 0;
      const stickY = withDI && f >= 13 && f <= 17 ? customStickY : 0;
      const posX = withDI && f >= 13 && !opts?.zeroDisplacement ? 832 : 1000;
      const velX = f >= 18 ? -20 : 0;

      frames.push({
        frame: f,
        ports: {
          [port0]: {
            pre: {
              stickX: 0,
              stickY: 0,
              buttonA: false,
              buttonB: false,
              buttonZ: false,
              buttonL: false,
              buttonR: false,
              buttonCUp: false,
              buttonCDown: false,
              buttonCLeft: false,
              buttonCRight: false,
              buttonStart: false,
            },
            post: {
              characterId: 0,
              actionStateId: 0x00a,
              actionFrameCounter: f,
              positionX: 1200,
              positionY: 500,
              positionZ: 0,
              velocityX: 0,
              velocityY: 0,
              velocityZ: 0,
              damagePercent: 0,
              stocksRemaining: 4,
              shieldSize: 50,
              airborne: false,
              hitstunCounter: 0,
              comboHitCount: 0,
              facingDirection: -1,
            },
          },
          [port1]: {
            pre: {
              stickX,
              stickY,
              buttonA: false,
              buttonB: false,
              buttonZ: false,
              buttonL: false,
              buttonR: false,
              buttonCUp: false,
              buttonCDown: false,
              buttonCLeft: false,
              buttonCRight: false,
              buttonStart: false,
            },
            post: {
              characterId: 1,
              actionStateId: isHitlag ? hitState : 0x00a,
              actionFrameCounter: isHitlag ? f - 10 : f,
              positionX: posX,
              positionY: 500,
              positionZ: 0,
              velocityX: velX,
              velocityY: 0,
              velocityZ: 0,
              damagePercent: dmg,
              stocksRemaining: 4,
              shieldSize: 50,
              airborne: true,
              hitstunCounter: isHitlag ? 20 : 0,
              comboHitCount: isHitlag ? 1 : 0,
              facingDirection: 1,
            },
          },
        },
      });
    }

    return {
      header: {
        gameMode: 0,
        stageId: 2,
        isTeams: false,
        itemSpawnRate: 0,
        randomSeed: 0,
      },
      metadata: {
        date: "2026-08-26",
        stage: "Dream Land",
        durationFrames: 30,
        durationSeconds: 0.5,
        players: [
          { port: port0, character: "Mario" },
          { port: port1, character: "Fox" },
        ],
      },
      frames,
    } as unknown as Replay;
  }

  it("calculates DI result accurately from hitlag sequence", () => {
    const replay = makeMockReplay();
    const hitDI = calculateHitDI(replay, 10, 1 as PortIndex, 0 as PortIndex);

    expect(hitDI).not.toBeNull();
    expect(hitDI?.damageDealt).toBe(10);
    expect(hitDI?.diWindowFrames).toBe(8);
    expect(hitDI?.inputCount).toBe(1);
    expect(hitDI?.startPos.x).toBe(1000);
    expect(hitDI?.endPos.x).toBe(832);
    expect(hitDI?.displacement.dx).toBe(-168);
    expect(hitDI?.theoreticalDisplacement?.dx).toBe(-168);
    expect(hitDI?.cardinal).toBe("left");
    expect(hitDI?.relative).toBe("away");
  });

  it("extracts all hits across replay", () => {
    const replay = makeMockReplay();
    const allHits = extractAllHitsWithDI(replay);

    expect(allHits).toHaveLength(1);
    expect(allHits[0]?.victimPort).toBe(1);
    expect(allHits[0]?.damageDealt).toBe(10);
    expect(allHits[0]?.inputCount).toBe(1);
  });

  it("ignores hits originating from throw or capture action states", () => {
    // Simulate victim in DamageThrown (0x0ba)
    const replay = makeMockReplay({ hitActionState: 0x0ba });
    const hitDI = calculateHitDI(replay, 10, 1 as PortIndex, 0 as PortIndex);
    expect(hitDI).toBeNull();
  });

  it("returns zero displacement and distance when no DI inputs occur", () => {
    const replay = makeMockReplay({ withDI: false });
    const hitDI = calculateHitDI(replay, 10, 1 as PortIndex, 0 as PortIndex);
    expect(hitDI).not.toBeNull();
    expect(hitDI?.inputCount).toBe(0);
    expect(hitDI?.displacement.dx).toBe(0);
    expect(hitDI?.displacement.dy).toBe(0);
    expect(hitDI?.displacement.distance).toBe(0);
    expect(hitDI?.cardinal).toBe("neutral");
  });

  it("derives intended direction from stick vector when displacement is constrained", () => {
    // Stick input down (X=0, Y=-80), but physical displacement is 0 (grounded)
    const replay = makeMockReplay({
      withDI: true,
      stickX: 0,
      stickY: -80,
      zeroDisplacement: true,
    });
    const hitDI = calculateHitDI(replay, 10, 1 as PortIndex, 0 as PortIndex);
    expect(hitDI).not.toBeNull();
    expect(hitDI?.inputCount).toBe(1);
    expect(hitDI?.cardinal).toBe("down");
    expect(hitDI?.relative).toBe("down");
  });
});
