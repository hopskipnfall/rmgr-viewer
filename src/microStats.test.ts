import { describe, it, expect } from "vitest";
import type { Frame, PortIndex, Replay } from "@rmg-k/rmgr";
import { computeMicroStats } from "./microStats.js";
import { DREAM_LAND_STAGE_ID } from "./stageGeometry.js";

function makeMockReplay(frames: Frame[]): Replay {
  return {
    header: {
      version: 5,
      gameFamily: "smash64",
      goodName: "Super Smash Bros. (U) (V1.0) [!]",
      recorderSchemaVersion: 1,
      recordedAtEpochMillis: 1724300000000,
      uncompressedLength: 0,
      compressedLength: 0,
    },
    matchStart: {
      playerNames: ["Harold", "George", "", ""],
      slotType: ["human", "human", "empty", "empty"],
    },
    matchSettings: {
      stageId: DREAM_LAND_STAGE_ID,
      gameType: 2,
      stockCountSetting: 4,
      timeLimitMinutes: 100,
      damageRatio: 100,
      itemFrequency: 0,
      teamsEnabled: false,
      handicapMode: "off",
      characterId: [1, 0, 0, 0],
      costumeId: [0, 0, 0, 0],
      teamColor: [0, 0, 0, 0],
      portTeam: [0, 1, 0, 0],
      portHandicap: [0, 0, 0, 0],
      portCpuLevel: [0, 0, 0, 0],
    },
    frames,
    matchEnd: {
      finalFrame: frames.at(-1)?.frame ?? 0,
      endReason: "normal",
    },
    matchResult: {
      placements: [1, 2, -1, -1],
    },
  };
}

/** Builds a frame where port 1 (the tracked player) has the given state; port 0 stays idle. */
function makeFrame(
  frameNumber: number,
  p1: { state: number; hitstun?: number; characterId?: number },
): Frame {
  return {
    frame: frameNumber,
    ports: [
      {
        input: {
          frame: frameNumber,
          port: 0 as PortIndex,
          buttons: 0,
          stickX: 0,
          stickY: 0,
        },
        state: {
          frame: frameNumber,
          port: 0 as PortIndex,
          characterId: 1,
          actionStateId: 0x0a, // Idle
          positionX: 0,
          positionY: 0,
          facingDirection: 1,
          velocityX: 0,
          velocityY: 0,
          damagePercent: 0,
          stocksRemaining: 4,
          jumpsRemaining: 0,
          grounded: true,
          hurtboxState: 0,
          hitstunCounter: 0,
          actionFrameCounter: 0,
          comboHitCount: 0,
        },
      },
      {
        input: {
          frame: frameNumber,
          port: 1 as PortIndex,
          buttons: 0,
          stickX: 0,
          stickY: 0,
        },
        state: {
          frame: frameNumber,
          port: 1 as PortIndex,
          characterId: p1.characterId ?? 0,
          actionStateId: p1.state,
          positionX: 50,
          positionY: 0,
          facingDirection: -1,
          velocityX: 0,
          velocityY: 0,
          damagePercent: 0,
          stocksRemaining: 4,
          jumpsRemaining: 0,
          grounded: true,
          hurtboxState: 0,
          hitstunCounter: p1.hitstun ?? 0,
          actionFrameCounter: 0,
          comboHitCount: 0,
        },
      },
    ] as unknown as Frame["ports"],
  };
}

const IDLE = 0x0a;
const FSMASH1 = 202;
const FSMASH3 = 204;
const USMASH = 207;
const DSMASH = 208;
const UTILT = 199;
const HITSTUN = 0x33; // Within isHitstunState's DamageFlyMid range
const CAPTURE = 0x0ab; // CapturePulled

// Character IDs (see @rmg-k/rmgr's CharacterId)
const FOX = 1;
const LINK = 5;
const YOSHI = 6;
const PIKACHU = 9;
const NESS = 11;
const PIKACHU_JP = 50;

describe("computeMicroStats", () => {
  it("returns empty object when there are fewer than 2 seated players", () => {
    const replay = makeMockReplay([]);
    expect(computeMicroStats(replay, 1 as PortIndex)).toEqual({});
  });

  it("does not count an unpunished forward smash", () => {
    const frames: Frame[] = [];
    for (let f = 0; f <= 10; f++) {
      frames.push(makeFrame(f, { state: FSMASH1 }));
    }
    for (let f = 11; f <= 60; f++) {
      frames.push(makeFrame(f, { state: IDLE }));
    }

    const stats = computeMicroStats(makeMockReplay(frames), 1 as PortIndex);
    expect(stats["smash-forward"] ?? 0).toBe(0);
  });

  it("counts a forward smash punished by a hit within 30 frames of it ending", () => {
    const frames: Frame[] = [];
    for (let f = 0; f <= 10; f++) {
      frames.push(makeFrame(f, { state: FSMASH1 }));
    }
    // Safe frames 11..30 (20 frames, within the 30-frame window)
    for (let f = 11; f <= 30; f++) {
      frames.push(makeFrame(f, { state: IDLE }));
    }
    // Hit lands on frame 31
    frames.push(makeFrame(31, { state: HITSTUN, hitstun: 20 }));

    const stats = computeMicroStats(makeMockReplay(frames), 1 as PortIndex);
    expect(stats["smash-forward"]).toBe(1);
  });

  it("does not count a hit landing more than 30 frames after the attack ends", () => {
    const frames: Frame[] = [];
    for (let f = 0; f <= 10; f++) {
      frames.push(makeFrame(f, { state: FSMASH1 }));
    }
    for (let f = 11; f <= 45; f++) {
      frames.push(makeFrame(f, { state: IDLE }));
    }
    // Hit lands on frame 46 - 35 frames after the attack ended, outside the window
    frames.push(makeFrame(46, { state: HITSTUN, hitstun: 20 }));

    const stats = computeMicroStats(makeMockReplay(frames), 1 as PortIndex);
    expect(stats["smash-forward"] ?? 0).toBe(0);
  });

  it("counts being grabbed within the window as punished", () => {
    const frames: Frame[] = [];
    for (let f = 0; f <= 5; f++) {
      frames.push(makeFrame(f, { state: DSMASH }));
    }
    for (let f = 6; f <= 10; f++) {
      frames.push(makeFrame(f, { state: IDLE }));
    }
    frames.push(makeFrame(11, { state: CAPTURE }));

    const stats = computeMicroStats(makeMockReplay(frames), 1 as PortIndex);
    expect(stats["smash-down"]).toBe(1);
  });

  it("tracks forward, up, and down smash as independent counts", () => {
    const frames: Frame[] = [];
    // Unpunished forward smash
    for (let f = 0; f <= 5; f++) frames.push(makeFrame(f, { state: FSMASH1 }));
    for (let f = 6; f <= 40; f++) frames.push(makeFrame(f, { state: IDLE }));
    // Punished up smash
    for (let f = 41; f <= 45; f++) frames.push(makeFrame(f, { state: USMASH }));
    frames.push(makeFrame(46, { state: HITSTUN, hitstun: 20 }));
    for (let f = 47; f <= 80; f++) frames.push(makeFrame(f, { state: IDLE }));

    const stats = computeMicroStats(makeMockReplay(frames), 1 as PortIndex);
    expect(stats["smash-forward"] ?? 0).toBe(0);
    expect(stats["smash-up"]).toBe(1);
    expect(stats["smash-down"] ?? 0).toBe(0);
  });

  it("treats a change between forward smash angle variants as one continuous attempt", () => {
    const frames: Frame[] = [];
    for (let f = 0; f <= 5; f++) frames.push(makeFrame(f, { state: FSMASH1 }));
    // Player adjusts the angle mid-swing - still one attack, not a second one
    for (let f = 6; f <= 10; f++) frames.push(makeFrame(f, { state: FSMASH3 }));
    // Hit right as it ends - if this were wrongly split into two attempts, both would be
    // punished (2); as one continuous attempt, it's punished once.
    frames.push(makeFrame(11, { state: HITSTUN, hitstun: 20 }));

    const stats = computeMicroStats(makeMockReplay(frames), 1 as PortIndex);
    expect(stats["smash-forward"]).toBe(1);
  });

  it("counts a punished up tilt for Pikachu, including the JP character id", () => {
    const frames: Frame[] = [];
    for (let f = 0; f <= 5; f++) {
      frames.push(makeFrame(f, { state: UTILT, characterId: PIKACHU }));
    }
    frames.push(
      makeFrame(6, { state: HITSTUN, hitstun: 20, characterId: PIKACHU }),
    );

    const jpFrames: Frame[] = [];
    for (let f = 0; f <= 5; f++) {
      jpFrames.push(makeFrame(f, { state: UTILT, characterId: PIKACHU_JP }));
    }
    jpFrames.push(
      makeFrame(6, { state: HITSTUN, hitstun: 20, characterId: PIKACHU_JP }),
    );

    expect(
      computeMicroStats(makeMockReplay(frames), 1 as PortIndex)[
        "utilt-pikachu"
      ],
    ).toBe(1);
    expect(
      computeMicroStats(makeMockReplay(jpFrames), 1 as PortIndex)[
        "utilt-pikachu"
      ],
    ).toBe(1);
  });

  it("counts a punished up tilt for Ness, Yoshi, and Link as independent stats", () => {
    const makeUtiltCase = (characterId: number): Frame[] => {
      const frames: Frame[] = [];
      for (let f = 0; f <= 5; f++) {
        frames.push(makeFrame(f, { state: UTILT, characterId }));
      }
      frames.push(makeFrame(6, { state: HITSTUN, hitstun: 20, characterId }));
      return frames;
    };

    expect(
      computeMicroStats(makeMockReplay(makeUtiltCase(NESS)), 1 as PortIndex)[
        "utilt-ness"
      ],
    ).toBe(1);
    expect(
      computeMicroStats(makeMockReplay(makeUtiltCase(YOSHI)), 1 as PortIndex)[
        "utilt-yoshi"
      ],
    ).toBe(1);
    expect(
      computeMicroStats(makeMockReplay(makeUtiltCase(LINK)), 1 as PortIndex)[
        "utilt-link"
      ],
    ).toBe(1);
  });

  it("does not count a punished up tilt for a character not in the tracked list", () => {
    const frames: Frame[] = [];
    for (let f = 0; f <= 5; f++) {
      frames.push(makeFrame(f, { state: UTILT, characterId: FOX }));
    }
    frames.push(
      makeFrame(6, { state: HITSTUN, hitstun: 20, characterId: FOX }),
    );

    const stats = computeMicroStats(makeMockReplay(frames), 1 as PortIndex);
    expect(stats["utilt-pikachu"] ?? 0).toBe(0);
    expect(stats["utilt-ness"] ?? 0).toBe(0);
    expect(stats["utilt-yoshi"] ?? 0).toBe(0);
    expect(stats["utilt-link"] ?? 0).toBe(0);
  });
});
