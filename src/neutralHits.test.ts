import { describe, it, expect } from "vitest";
import {
  classifyNeutralOpening,
  computeNeutralHitEvents,
  type NeutralHitEvent,
} from "./neutralHits.js";
import type { Replay, Frame, PortIndex } from "@rmg-k/rmgr";
import { DREAM_LAND_STAGE_ID } from "./stageGeometry.js";

function makeMockReplayWithAction(options: {
  victimActionsBeforeHit: number[];
  victimAirborne?: boolean;
  hitType?: "attack" | "grab";
}): Replay {
  const frames: Frame[] = [];
  const port0 = 0 as PortIndex;
  const port1 = 1 as PortIndex;
  const {
    victimActionsBeforeHit,
    victimAirborne = false,
    hitType = "attack",
  } = options;

  const totalFramesBefore = victimActionsBeforeHit.length;
  // Build frames
  for (let f = 0; f < totalFramesBefore + 5; f++) {
    const isHit = f === totalFramesBefore;
    const isAfterHit = f > totalFramesBefore;
    const actionState =
      f < totalFramesBefore
        ? victimActionsBeforeHit[f]!
        : isHit || isAfterHit
          ? hitType === "grab"
            ? 0x0ac // CaptureWait
            : 0x028 // DamageMid1
          : 0x00a;

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
            actionStateId: isHit ? (hitType === "grab" ? 0x0a6 : 0x0c0) : 0x00a,
            actionFrameCounter: f,
            positionX: 1000,
            positionY: 0,
            positionZ: 0,
            velocityX: 0,
            velocityY: 0,
            velocityZ: 0,
            damagePercent: 0,
            stocksRemaining: 4,
            shieldSize: 50,
            hitstunCounter: 0,
            comboHitCount: 0,
            facingDirection: 1,
          },
        },
        [port1]: {
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
            characterId: 1,
            actionStateId: actionState,
            actionFrameCounter: f,
            positionX: 1100,
            positionY: victimAirborne ? 500 : 0,
            positionZ: 0,
            velocityX: 0,
            velocityY: 0,
            velocityZ: 0,
            damagePercent: isHit || isAfterHit ? 10 : 0,
            stocksRemaining: 4,
            shieldSize: 50,
            hitstunCounter: isHit || isAfterHit ? 20 : 0,
            comboHitCount: isHit || isAfterHit ? 1 : 0,
            facingDirection: -1,
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
    gameStart: {
      stageId: 2,
      isTeams: false,
      itemSpawnRate: 0,
      randomSeed: 0,
      ports: [{ characterId: 0 }, { characterId: 1 }],
    },
    metadata: {
      date: "2026-08-26",
      stage: "Dream Land",
      durationFrames: frames.length,
      durationSeconds: frames.length / 60,
      players: [
        { port: port0, character: "Mario" },
        { port: port1, character: "Fox" },
      ],
    },
    frames,
  } as unknown as Replay;
}

describe("classifyNeutralOpening", () => {
  it("classifies landing lag punish when victim is hit while in landing lag", () => {
    // 5 frames of Idle (0x00a), then 2 frames of LandingAirX (0x0db), then hit on frame 7
    const replay = makeMockReplayWithAction({
      victimActionsBeforeHit: [0x00a, 0x00a, 0x00a, 0x00a, 0x00a, 0x0db, 0x0db],
    });
    const result = classifyNeutralOpening(
      replay,
      7,
      1 as PortIndex,
      0 as PortIndex,
    );
    expect(result.reason).toBe("landing-lag");
  });

  it("classifies whiff punish when victim missed an attack within 30 frames", () => {
    // 5 frames of USmash (0x0cf), then 10 frames of Idle (0x00a), then hit on frame 15
    const actions = [
      0x0cf, 0x0cf, 0x0cf, 0x0cf, 0x0cf, 0x00a, 0x00a, 0x00a, 0x00a, 0x00a,
      0x00a, 0x00a, 0x00a, 0x00a, 0x00a,
    ];
    const replay = makeMockReplayWithAction({
      victimActionsBeforeHit: actions,
    });
    const result = classifyNeutralOpening(
      replay,
      15,
      1 as PortIndex,
      0 as PortIndex,
    );
    expect(result.reason).toBe("whiff-punish");
  });

  it("classifies jump interception when victim jumped within 30 frames without attacking", () => {
    // JumpSquat (0x014), JumpF (0x016) x 8 frames, then hit on frame 9 (airborne)
    const actions = [
      0x014, 0x014, 0x016, 0x016, 0x016, 0x016, 0x016, 0x016, 0x016,
    ];
    const replay = makeMockReplayWithAction({
      victimActionsBeforeHit: actions,
      victimAirborne: true,
    });
    const result = classifyNeutralOpening(
      replay,
      9,
      1 as PortIndex,
      0 as PortIndex,
    );
    expect(result.reason).toBe("jump-punish");
  });

  it("classifies standing hit when victim was hit while grounded in neutral", () => {
    // 10 frames of Idle (0x00a), then hit on frame 10
    const actions = new Array(10).fill(0x00a);
    const replay = makeMockReplayWithAction({
      victimActionsBeforeHit: actions,
      victimAirborne: false,
    });
    const result = classifyNeutralOpening(
      replay,
      10,
      1 as PortIndex,
      0 as PortIndex,
    );
    expect(result.reason).toBe("standing-hit");
  });

  it("prioritizes landing lag over jump if both occurred", () => {
    // JumpF (0x016) x 5 frames, then LandingLight (0x01f) on frame 6, then hit on frame 7
    const actions = [0x016, 0x016, 0x016, 0x016, 0x016, 0x01f];
    const replay = makeMockReplayWithAction({
      victimActionsBeforeHit: actions,
    });
    const result = classifyNeutralOpening(
      replay,
      6,
      1 as PortIndex,
      0 as PortIndex,
    );
    expect(result.reason).toBe("landing-lag");
  });

  it("classifies land punish when victim landed from air within 30 frames", () => {
    // Airborne Bair (0x0d3) x 5, LandingLight (0x01f) x 4, Walk (0x00c) x 5, Idle (0x00a) x 3, then hit on frame 17
    const actions = [
      0x0d3, 0x0d3, 0x0d3, 0x0d3, 0x0d3, 0x01f, 0x01f, 0x01f, 0x01f, 0x00c,
      0x00c, 0x00c, 0x00c, 0x00c, 0x00a, 0x00a, 0x00a,
    ];
    const replay = makeMockReplayWithAction({
      victimActionsBeforeHit: actions,
    });
    const result = classifyNeutralOpening(
      replay,
      actions.length,
      1 as PortIndex,
      0 as PortIndex,
    );
    expect(result.reason).toBe("landing-lag");
  });

  it("classifies unsafe shield pressure when victim attacked into attacker's shield", () => {
    const frames: Frame[] = [];
    const port0 = 0 as PortIndex;
    const port1 = 1 as PortIndex;
    for (let f = 0; f < 25; f++) {
      const isVictimAttacking = f >= 5 && f <= 10;
      const isAttackerShielding = f >= 7 && f <= 12;
      const isHit = f === 15;

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
              actionStateId: isHit
                ? 0x0c0
                : isAttackerShielding
                  ? 0x09b
                  : 0x00a, // 0x09b = ShieldStun
              actionFrameCounter: f,
              positionX: 1000,
              positionY: 0,
              positionZ: 0,
              velocityX: 0,
              velocityY: 0,
              velocityZ: 0,
              damagePercent: 0,
              stocksRemaining: 4,
              shieldSize: 50,
              hitstunCounter: 0,
              comboHitCount: 0,
              facingDirection: 1,
            },
          },
          [port1]: {
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
              characterId: 1,
              actionStateId: isHit ? 0x028 : isVictimAttacking ? 0x0d1 : 0x00a, // 0x0d1 = Nair
              actionFrameCounter: f,
              positionX: 1050,
              positionY: 0,
              positionZ: 0,
              velocityX: 0,
              velocityY: 0,
              velocityZ: 0,
              damagePercent: isHit ? 10 : 0,
              stocksRemaining: 4,
              shieldSize: 50,
              hitstunCounter: isHit ? 20 : 0,
              comboHitCount: isHit ? 1 : 0,
              facingDirection: -1,
            },
          },
        },
      });
    }

    const replay = {
      header: {
        gameMode: 0,
        stageId: DREAM_LAND_STAGE_ID,
        isTeams: false,
        itemSpawnRate: 0,
        randomSeed: 0,
      },
      gameStart: {
        stageId: DREAM_LAND_STAGE_ID,
        isTeams: false,
        itemSpawnRate: 0,
        randomSeed: 0,
        ports: [{ characterId: 0 }, { characterId: 1 }],
      },
      metadata: {
        date: "2026-08-26",
        stage: "Dream Land",
        durationFrames: frames.length,
        durationSeconds: frames.length / 60,
        players: [
          { port: port0, character: "Mario" },
          { port: port1, character: "Fox" },
        ],
      },
      frames,
    } as unknown as Replay;

    const result = classifyNeutralOpening(replay, 15, port1, port0);
    expect(result.reason).toBe("shield-pressure");
  });

  it("does not classify as shield pressure if attacker shielded without shield stun", () => {
    const frames: Frame[] = [];
    const port0 = 0 as PortIndex;
    const port1 = 1 as PortIndex;
    for (let f = 0; f < 25; f++) {
      const isVictimAttacking = f >= 5 && f <= 10;
      const isAttackerShielding = f >= 7 && f <= 12;
      const isHit = f === 15;

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
              actionStateId: isHit
                ? 0x0c0
                : isAttackerShielding
                  ? 0x099 // 0x099 = Normal Shield (NOT ShieldStun)
                  : 0x00a,
              actionFrameCounter: f,
              positionX: 1000,
              positionY: 0,
              positionZ: 0,
              velocityX: 0,
              velocityY: 0,
              velocityZ: 0,
              damagePercent: 0,
              stocksRemaining: 4,
              shieldSize: 50,
              hitstunCounter: 0,
              comboHitCount: 0,
              facingDirection: 1,
            },
          },
          [port1]: {
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
              characterId: 1,
              actionStateId: isHit ? 0x028 : isVictimAttacking ? 0x0d1 : 0x00a, // 0x0d1 = Nair
              actionFrameCounter: f,
              positionX: 1050,
              positionY: 0,
              positionZ: 0,
              velocityX: 0,
              velocityY: 0,
              velocityZ: 0,
              damagePercent: isHit ? 10 : 0,
              stocksRemaining: 4,
              shieldSize: 50,
              hitstunCounter: isHit ? 20 : 0,
              comboHitCount: isHit ? 1 : 0,
              facingDirection: -1,
            },
          },
        },
      });
    }

    const replay = {
      header: {
        gameMode: 0,
        stageId: DREAM_LAND_STAGE_ID,
        isTeams: false,
        itemSpawnRate: 0,
        randomSeed: 0,
      },
      gameStart: {
        stageId: DREAM_LAND_STAGE_ID,
        isTeams: false,
        itemSpawnRate: 0,
        randomSeed: 0,
        ports: [{ characterId: 0 }, { characterId: 1 }],
      },
      metadata: {
        date: "2026-08-26",
        stage: "Dream Land",
        durationFrames: frames.length,
        durationSeconds: frames.length / 60,
        players: [
          { port: port0, character: "Mario" },
          { port: port1, character: "Fox" },
        ],
      },
      frames,
    } as unknown as Replay;

    const result = classifyNeutralOpening(replay, 15, port1, port0);
    expect(result.reason).not.toBe("shield-pressure");
  });

  it("computes neutral hit events with classified reasons", () => {
    const actions = new Array(10).fill(0x00a);
    const replay = makeMockReplayWithAction({
      victimActionsBeforeHit: actions,
    });
    const events: NeutralHitEvent[] = computeNeutralHitEvents(replay);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0]?.attackerPort).toBe(0);
    expect(events[0]?.victimPort).toBe(1);
    expect(events[0]?.reason).toBe("standing-hit");
  });

  it("classifies grabs as neutral openings with reasons", () => {
    // 10 frames of Idle (0x00a), then grabbed on frame 10
    const actions = new Array(10).fill(0x00a);
    const replay = makeMockReplayWithAction({
      victimActionsBeforeHit: actions,
      hitType: "grab",
    });
    const events: NeutralHitEvent[] = computeNeutralHitEvents(replay);

    expect(events.length).toBe(1);
    expect(events[0]?.attackerPort).toBe(0);
    expect(events[0]?.victimPort).toBe(1);
    expect(events[0]?.hitType).toBe("grab");
    expect(events[0]?.reason).toBe("standing-hit");
  });

  it("consolidates multi-hit follow-up hits within 60F into a single neutral interaction", () => {
    // Port 0 hits Port 1 at frame 10. Hitstun ends at frame 25.
    // Port 0 hits Port 1 again at frame 45 (only 20 actionable frames later, < 60F).
    // Both are idle for 70 frames after.
    const frames: Frame[] = [];
    const p0 = 0 as PortIndex;
    const p1 = 1 as PortIndex;

    for (let f = 0; f < 130; f++) {
      const isHit1 = f >= 10 && f < 25;
      const isHit2 = f >= 45 && f < 60;
      const inHit = isHit1 || isHit2;

      frames.push({
        frame: f,
        ports: {
          [p0]: {
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
              positionX: 1000,
              positionY: 0,
              positionZ: 0,
              velocityX: 0,
              velocityY: 0,
              velocityZ: 0,
              damagePercent: 0,
              stocksRemaining: 4,
              shieldSize: 50,
              hitstunCounter: 0,
              comboHitCount: 0,
              facingDirection: 1,
            },
          },
          [p1]: {
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
              characterId: 1,
              actionStateId: inHit ? 0x028 : 0x00a,
              actionFrameCounter: f,
              positionX: 1200,
              positionY: 0,
              positionZ: 0,
              velocityX: 0,
              velocityY: 0,
              velocityZ: 0,
              damagePercent: f >= 45 ? 24 : f >= 10 ? 12 : 0,
              stocksRemaining: 4,
              shieldSize: 50,
              hitstunCounter: inHit ? 10 : 0,
              comboHitCount: inHit ? 1 : 0,
              facingDirection: -1,
            },
          },
        },
      });
    }

    const replay = {
      header: {
        gameMode: 0,
        stageId: 2,
        isTeams: false,
        itemSpawnRate: 0,
        randomSeed: 0,
      },
      gameStart: {
        stageId: 2,
        isTeams: false,
        itemSpawnRate: 0,
        randomSeed: 0,
        ports: [{ characterId: 0 }, { characterId: 1 }],
      },
      metadata: {
        date: "2026-08-26",
        stage: "Dream Land",
        durationFrames: frames.length,
        durationSeconds: frames.length / 60,
        players: [
          { port: p0, character: "Pikachu" },
          { port: p1, character: "Fox" },
        ],
      },
      frames,
    } as unknown as Replay;

    const events = computeNeutralHitEvents(replay);

    // Exactly 1 neutral opening event, at frame 10, with totalHitsLanded = 2
    expect(events.length).toBe(1);
    expect(events[0]?.frame).toBe(10);
    expect(events[0]?.attackerPort).toBe(p0);
    expect(events[0]?.victimPort).toBe(p1);
    expect(events[0]?.totalHitsLanded).toBe(2);
    expect(events[0]?.totalDamageDealt).toBe(24);
    expect(events[0]?.outcome).toBe("reset");
  });

  it("resets neutral and starts a second opening when > 60 actionable frames pass", () => {
    // Port 0 hits Port 1 at frame 10. Hitstun ends at frame 20.
    // 70 frames of mutual idle pass (frame 20 to 90).
    // Port 0 hits Port 1 again at frame 90.
    const frames: Frame[] = [];
    const p0 = 0 as PortIndex;
    const p1 = 1 as PortIndex;

    for (let f = 0; f < 170; f++) {
      const isHit1 = f >= 10 && f < 20;
      const isHit2 = f >= 90 && f < 100;
      const inHit = isHit1 || isHit2;

      frames.push({
        frame: f,
        ports: {
          [p0]: {
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
              positionX: 1000,
              positionY: 0,
              positionZ: 0,
              velocityX: 0,
              velocityY: 0,
              velocityZ: 0,
              damagePercent: 0,
              stocksRemaining: 4,
              shieldSize: 50,
              hitstunCounter: 0,
              comboHitCount: 0,
              facingDirection: 1,
            },
          },
          [p1]: {
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
              characterId: 1,
              actionStateId: inHit ? 0x028 : 0x00a,
              actionFrameCounter: f,
              positionX: 1200,
              positionY: 0,
              positionZ: 0,
              velocityX: 0,
              velocityY: 0,
              velocityZ: 0,
              damagePercent: f >= 90 ? 25 : f >= 10 ? 12 : 0,
              stocksRemaining: 4,
              shieldSize: 50,
              hitstunCounter: inHit ? 10 : 0,
              comboHitCount: inHit ? 1 : 0,
              facingDirection: -1,
            },
          },
        },
      });
    }

    const replay = {
      header: {
        gameMode: 0,
        stageId: 2,
        isTeams: false,
        itemSpawnRate: 0,
        randomSeed: 0,
      },
      gameStart: {
        stageId: 2,
        isTeams: false,
        itemSpawnRate: 0,
        randomSeed: 0,
        ports: [{ characterId: 0 }, { characterId: 1 }],
      },
      metadata: {
        date: "2026-08-26",
        stage: "Dream Land",
        durationFrames: frames.length,
        durationSeconds: frames.length / 60,
        players: [
          { port: p0, character: "Pikachu" },
          { port: p1, character: "Fox" },
        ],
      },
      frames,
    } as unknown as Replay;

    const events = computeNeutralHitEvents(replay);

    // Two distinct neutral openings
    expect(events.length).toBe(2);
    expect(events[0]?.frame).toBe(10);
    expect(events[0]?.totalHitsLanded).toBe(1);
    expect(events[1]?.frame).toBe(90);
    expect(events[1]?.totalHitsLanded).toBe(1);
  });

  it("marks interaction as converted to KO when victim loses stock", () => {
    const frames: Frame[] = [];
    const p0 = 0 as PortIndex;
    const p1 = 1 as PortIndex;

    for (let f = 0; f < 50; f++) {
      const isHit = f >= 10 && f < 30;
      const isDead = f >= 30;

      frames.push({
        frame: f,
        ports: {
          [p0]: {
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
              positionX: 1000,
              positionY: 0,
              positionZ: 0,
              velocityX: 0,
              velocityY: 0,
              velocityZ: 0,
              damagePercent: 0,
              stocksRemaining: 4,
              shieldSize: 50,
              hitstunCounter: 0,
              comboHitCount: 0,
              facingDirection: 1,
            },
          },
          [p1]: {
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
              characterId: 1,
              actionStateId: isDead ? 0x000 : isHit ? 0x028 : 0x00a,
              actionFrameCounter: f,
              positionX: isDead ? 8000 : 1200,
              positionY: 0,
              positionZ: 0,
              velocityX: 0,
              velocityY: 0,
              velocityZ: 0,
              damagePercent: isHit ? 50 : 0,
              stocksRemaining: isDead ? 3 : 4,
              shieldSize: 50,
              hitstunCounter: isHit ? 10 : 0,
              comboHitCount: isHit ? (f === 10 ? 1 : 2) : 0,
              facingDirection: -1,
            },
          },
        },
      });
    }

    const replay = {
      header: {
        gameMode: 0,
        stageId: 2,
        isTeams: false,
        itemSpawnRate: 0,
        randomSeed: 0,
      },
      gameStart: {
        stageId: 2,
        isTeams: false,
        itemSpawnRate: 0,
        randomSeed: 0,
        ports: [{ characterId: 0 }, { characterId: 1 }],
      },
      metadata: {
        date: "2026-08-26",
        stage: "Dream Land",
        durationFrames: frames.length,
        durationSeconds: frames.length / 60,
        players: [
          { port: p0, character: "Pikachu" },
          { port: p1, character: "Fox" },
        ],
      },
      frames,
    } as unknown as Replay;

    const events = computeNeutralHitEvents(replay);

    expect(events.length).toBe(1);
    expect(events[0]?.convertedToKill).toBe(true);
    expect(events[0]?.outcome).toBe("ko");
    expect(events[0]?.winnerPort).toBe(p0);
  });

  it("handles Harold vs George pattern: Jump Punish (233F) + follow-up (275F) into Edge Guard and Ledge Trap", () => {
    const frames: Frame[] = [];
    const p0 = 0 as PortIndex;
    const p1 = 1 as PortIndex;

    // Simulate 200 to 450 frames
    // Frame 233: Jump Punish
    // Frame 275: Follow-up hit
    // Frame 320: Offstage (Danger zone) -> Edge Guard
    // Frame 370: Ledge catch -> Ledge Trap
    // Frame 410: Land on platform, 60 actionable frames pass
    for (let f = 0; f < 500; f++) {
      const isHit1 = f >= 233 && f < 255;
      const isHit2 = f >= 275 && f < 295;
      const inHit = isHit1 || isHit2;
      const isOffstage = f >= 320 && f < 370;
      const isOnLedge = f >= 370 && f < 410;

      let p1State = 0x00a;
      if (inHit) p1State = 0x028;
      else if (isOffstage)
        p1State = 0x01a; // Fall
      else if (isOnLedge) p1State = 0x055; // CliffWait

      frames.push({
        frame: f,
        ports: {
          [p0]: {
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
              positionX: 1000,
              positionY: 0,
              positionZ: 0,
              velocityX: 0,
              velocityY: 0,
              velocityZ: 0,
              damagePercent: 0,
              stocksRemaining: 4,
              shieldSize: 50,
              hitstunCounter: 0,
              comboHitCount: 0,
              facingDirection: 1,
            },
          },
          [p1]: {
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
              characterId: 1,
              actionStateId: p1State,
              actionFrameCounter: f,
              positionX: isOffstage ? 3600 : 1200,
              positionY: isOffstage ? 500 : 0,
              positionZ: 0,
              velocityX: 0,
              velocityY: 0,
              velocityZ: 0,
              damagePercent: f >= 275 ? 34 : f >= 233 ? 18 : 0,
              stocksRemaining: 4,
              shieldSize: 50,
              hitstunCounter: inHit ? 15 : 0,
              comboHitCount: inHit ? 1 : 0,
              facingDirection: -1,
            },
          },
        },
      });
    }

    const replay = {
      header: {
        gameMode: 0,
        stageId: DREAM_LAND_STAGE_ID,
        isTeams: false,
        itemSpawnRate: 0,
        randomSeed: 0,
      },
      gameStart: {
        stageId: DREAM_LAND_STAGE_ID,
        isTeams: false,
        itemSpawnRate: 0,
        randomSeed: 0,
        ports: [{ characterId: 0 }, { characterId: 1 }],
      },
      metadata: {
        date: "2026-08-26",
        stage: "Dream Land",
        durationFrames: frames.length,
        durationSeconds: frames.length / 60,
        players: [
          { port: p0, character: "Pikachu" },
          { port: p1, character: "Kirby" },
        ],
      },
      frames,
    } as unknown as Replay;

    const events = computeNeutralHitEvents(replay);

    expect(events.length).toBe(1);
    const ev = events[0]!;
    expect(ev.frame).toBe(233);
    expect(ev.attackerPort).toBe(p0);
    expect(ev.victimPort).toBe(p1);
    expect(ev.totalHitsLanded).toBe(2);
    expect(ev.totalDamageDealt).toBe(34);
    expect(ev.convertedToEdgeGuard).toBe(true);
    expect(ev.convertedToLedgeTrap).toBe(true);
    expect(ev.outcome).toBe("reset");
  });

  it("handles reversal when defender escapes edge guard and puts attacker into disadvantage", () => {
    const frames: Frame[] = [];
    const p0 = 0 as PortIndex;
    const p1 = 1 as PortIndex;

    // F0-F10: Neutral
    // F10: P0 hits P1 in neutral (Hit 1) -> P1 in hitstun F10-F30
    // F30-F60: P1 offstage (Recovery / Edge Guard)
    // F60-F80: P1 at ledge (Ledge Trap)
    // F80: P1 gets back on stage (CliffWait -> LandingLight -> Idle)
    // F90: P1 hits P0 and sends P0 offstage into Recovery (Reversal!)
    for (let f = 0; f < 120; f++) {
      const isHit1 = f >= 10 && f < 30;
      const isP1Offstage = f >= 30 && f < 60;
      const isP1Ledge = f >= 60 && f < 80;
      const isP0ReversedOffstage = f >= 90;

      frames.push({
        frame: f,
        ports: {
          [p0]: {
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
              actionStateId: isP0ReversedOffstage ? 0x01a : 0x00a,
              actionFrameCounter: f,
              positionX: isP0ReversedOffstage ? 3500 : 1000,
              positionY: isP0ReversedOffstage ? -200 : 0,
              positionZ: 0,
              velocityX: 0,
              velocityY: 0,
              velocityZ: 0,
              damagePercent: isP0ReversedOffstage ? 20 : 0,
              stocksRemaining: 4,
              shieldSize: 50,
              hitstunCounter: isP0ReversedOffstage ? 25 : 0,
              comboHitCount: 0,
              facingDirection: 1,
            },
          },
          [p1]: {
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
              characterId: 1,
              actionStateId: isHit1
                ? 0x028
                : isP1Offstage
                  ? 0x01a
                  : isP1Ledge
                    ? 0x055
                    : 0x00a,
              actionFrameCounter: f,
              positionX: isP1Offstage ? 3200 : isP1Ledge ? 2378 : 1200,
              positionY: isP1Offstage ? 400 : isP1Ledge ? -450 : 0,
              positionZ: 0,
              velocityX: 0,
              velocityY: 0,
              velocityZ: 0,
              damagePercent: isHit1 ? 15 : isP0ReversedOffstage ? 15 : 0,
              stocksRemaining: 4,
              hitstunCounter: isHit1 ? 20 : 0,
              comboHitCount: isHit1 ? 1 : 0,
              facingDirection: -1,
            },
          },
        },
      });
    }

    const replay = {
      header: {
        gameMode: 0,
        stageId: DREAM_LAND_STAGE_ID,
        isTeams: false,
        itemSpawnRate: 0,
        randomSeed: 0,
      },
      gameStart: {
        stageId: DREAM_LAND_STAGE_ID,
        isTeams: false,
        itemSpawnRate: 0,
        randomSeed: 0,
        ports: [{ characterId: 0 }, { characterId: 1 }],
      },
      metadata: {
        date: "2026-08-26",
        stage: "Dream Land",
        durationFrames: frames.length,
        durationSeconds: frames.length / 60,
        players: [
          { port: p0, character: "Mario" },
          { port: p1, character: "Fox" },
        ],
      },
      frames,
    } as unknown as Replay;

    const events = computeNeutralHitEvents(replay);
    expect(events.length).toBeGreaterThan(0);
    const ev = events[0]!;
    expect(ev.attackerPort).toBe(p0);
    expect(ev.victimPort).toBe(p1);
    expect(ev.outcome).toBe("reversal");
    expect(ev.convertedToKill).toBe(false);
  });

  it("does not classify as landing lag punish if victim was airborne at hit frame", () => {
    // 5 frames of airborne JumpAerialF (0x018) with positionY = 500, hit on frame 5
    const replay = makeMockReplayWithAction({
      victimActionsBeforeHit: [0x018, 0x018, 0x018, 0x018, 0x018],
      victimAirborne: true,
    });
    const result = classifyNeutralOpening(
      replay,
      5,
      1 as PortIndex,
      0 as PortIndex,
    );
    expect(result.reason).not.toBe("landing-lag");
  });

  it("counts every hit in a multi-hit combo and records killFrameIndex on death state entry", () => {
    const frames: Frame[] = [];
    const p0 = 0 as PortIndex;
    const p1 = 1 as PortIndex;

    // F0-F9: neutral
    // F10: P0 hits P1 (Hit 1, combo=1)
    // F15: P0 hits P1 (Hit 2, combo=2)
    // F20: P0 hits P1 (Hit 3, combo=3)
    // F25: P0 hits P1 (Hit 4, combo=4)
    // F30: P0 hits P1 (Hit 5, combo=5)
    // F35: P0 hits P1 (Hit 6, combo=6)
    // F40: P1 dies (DeadU 0x002) -> killFrameIndex should be 40
    for (let f = 0; f < 50; f++) {
      let combo = 0;
      let state = 0x00a;
      if (f >= 10 && f < 15) {
        combo = 1;
        state = 0x028;
      } else if (f >= 15 && f < 20) {
        combo = 2;
        state = 0x028;
      } else if (f >= 20 && f < 25) {
        combo = 3;
        state = 0x028;
      } else if (f >= 25 && f < 30) {
        combo = 4;
        state = 0x028;
      } else if (f >= 30 && f < 35) {
        combo = 5;
        state = 0x028;
      } else if (f >= 35 && f < 40) {
        combo = 6;
        state = 0x028;
      } else if (f >= 40) {
        combo = 0;
        state = 0x002; // DeadU (Star KO)
      }

      frames.push({
        frame: f,
        ports: {
          [p0]: {
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
              positionX: 1000,
              positionY: 0,
              positionZ: 0,
              velocityX: 0,
              velocityY: 0,
              velocityZ: 0,
              damagePercent: 0,
              stocksRemaining: 4,
              shieldSize: 50,
              hitstunCounter: 0,
              comboHitCount: 0,
              facingDirection: 1,
            },
          },
          [p1]: {
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
              characterId: 1,
              actionStateId: state,
              actionFrameCounter: f,
              positionX: 1200,
              positionY: 0,
              positionZ: 0,
              velocityX: 0,
              velocityY: 0,
              velocityZ: 0,
              damagePercent: f >= 10 ? 60 : 0,
              stocksRemaining: f >= 40 ? 3 : 4,
              shieldSize: 50,
              hitstunCounter: f >= 10 && f < 40 ? 10 : 0,
              comboHitCount: combo,
              facingDirection: -1,
            },
          },
        },
      });
    }

    const replay = {
      header: {
        gameMode: 0,
        stageId: DREAM_LAND_STAGE_ID,
        isTeams: false,
        itemSpawnRate: 0,
        randomSeed: 0,
      },
      gameStart: {
        stageId: DREAM_LAND_STAGE_ID,
        isTeams: false,
        itemSpawnRate: 0,
        randomSeed: 0,
        ports: [{ characterId: 0 }, { characterId: 1 }],
      },
      metadata: {
        date: "2026-08-26",
        stage: "Dream Land",
        durationFrames: frames.length,
        durationSeconds: frames.length / 60,
        players: [
          { port: p0, character: "Fox" },
          { port: p1, character: "Pikachu" },
        ],
      },
      frames,
    } as unknown as Replay;

    const events = computeNeutralHitEvents(replay);
    expect(events.length).toBe(1);
    const ev = events[0]!;
    expect(ev.totalHitsLanded).toBe(6);
    expect(ev.convertedToKill).toBe(true);
    expect(ev.outcome).toBe("ko");
    expect(ev.killFrameIndex).toBe(40);
  });

  it("never resets neutral interaction while a player is in offstage recovery or disadvantage", () => {
    const frames: Frame[] = [];
    const p0 = 0 as PortIndex;
    const p1 = 1 as PortIndex;

    // F0-F5: Neutral setup
    for (let f = 0; f < 5; f++) {
      frames.push({
        frame: f,
        ports: [
          {
            pre: { frame: f, port: p0, buttons: 0, stickX: 0, stickY: 0 },
            post: {
              frame: f,
              port: p0,
              characterId: 0,
              actionStateId: 0x0a, // Idle
              positionX: -500,
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
              comboDamage: 0,
            },
          },
          {
            pre: { frame: f, port: p1, buttons: 0, stickX: 0, stickY: 0 },
            post: {
              frame: f,
              port: p1,
              characterId: 1,
              actionStateId: 0x0a, // Idle
              positionX: 500,
              positionY: 0,
              facingDirection: -1,
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
              comboDamage: 0,
            },
          },
        ],
      });
    }

    // F5: P0 hits P1
    frames.push({
      frame: 5,
      ports: [
        {
          pre: { frame: 5, port: p0, buttons: 0, stickX: 0, stickY: 0 },
          post: {
            frame: 5,
            port: p0,
            characterId: 0,
            actionStateId: 0x42, // Attack
            positionX: 400,
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
            comboDamage: 0,
          },
        },
        {
          pre: { frame: 5, port: p1, buttons: 0, stickX: 0, stickY: 0 },
          post: {
            frame: 5,
            port: p1,
            characterId: 1,
            actionStateId: 0x33, // DamageFlyRoll
            positionX: 500,
            positionY: 0,
            facingDirection: -1,
            velocityX: 0,
            velocityY: 0,
            damagePercent: 12,
            stocksRemaining: 4,
            jumpsRemaining: 0,
            grounded: false,
            hurtboxState: 0,
            hitstunCounter: 20,
            actionFrameCounter: 0,
            comboHitCount: 1,
            comboDamage: 12,
          },
        },
      ],
    });

    // F6-F80: P1 is launched offstage in recovery (x = 3500, actionable after hitstun)
    // 75 frames pass while P1 is offstage (more than 60 frames!). Neutral must NOT reset here!
    for (let f = 6; f <= 80; f++) {
      const inHitstun = f < 25;
      frames.push({
        frame: f,
        ports: [
          {
            pre: { frame: f, port: p0, buttons: 0, stickX: 0, stickY: 0 },
            post: {
              frame: f,
              port: p0,
              characterId: 0,
              actionStateId: 0x0a, // Idle on stage
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
              comboDamage: 0,
            },
          },
          {
            pre: { frame: f, port: p1, buttons: 0, stickX: 0, stickY: 0 },
            post: {
              frame: f,
              port: p1,
              characterId: 1,
              actionStateId: inHitstun ? 0x33 : 0x16, // DamageFlyRoll then JumpF offstage
              positionX: 3500,
              positionY: -200,
              facingDirection: -1,
              velocityX: 0,
              velocityY: 0,
              damagePercent: 12,
              stocksRemaining: 4,
              jumpsRemaining: 0,
              grounded: false,
              hurtboxState: 0,
              hitstunCounter: inHitstun ? 25 - f : 0,
              actionFrameCounter: 0,
              comboHitCount: 0,
              comboDamage: 0,
            },
          },
        ],
      });
    }

    // F81-F90: P1 recovers back onto stage (x = 1000, y = 0, grounded)
    for (let f = 81; f <= 90; f++) {
      frames.push({
        frame: f,
        ports: [
          {
            pre: { frame: f, port: p0, buttons: 0, stickX: 0, stickY: 0 },
            post: {
              frame: f,
              port: p0,
              characterId: 0,
              actionStateId: 0x0a,
              positionX: -500,
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
              comboDamage: 0,
            },
          },
          {
            pre: { frame: f, port: p1, buttons: 0, stickX: 0, stickY: 0 },
            post: {
              frame: f,
              port: p1,
              characterId: 1,
              actionStateId: 0x0a, // Landing on stage
              positionX: 1000,
              positionY: 0,
              facingDirection: -1,
              velocityX: 0,
              velocityY: 0,
              damagePercent: 12,
              stocksRemaining: 4,
              jumpsRemaining: 0,
              grounded: true,
              hurtboxState: 0,
              hitstunCounter: 0,
              actionFrameCounter: 0,
              comboHitCount: 0,
              comboDamage: 0,
            },
          },
        ],
      });
    }

    // F91-F200: Both players remain actionable on stage for 110 frames (30f to end recovery + 60f to reset neutral)
    for (let f = 91; f <= 200; f++) {
      frames.push({
        frame: f,
        ports: [
          {
            pre: { frame: f, port: p0, buttons: 0, stickX: 0, stickY: 0 },
            post: {
              frame: f,
              port: p0,
              characterId: 0,
              actionStateId: 0x0a,
              positionX: -500,
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
              comboDamage: 0,
            },
          },
          {
            pre: { frame: f, port: p1, buttons: 0, stickX: 0, stickY: 0 },
            post: {
              frame: f,
              port: p1,
              characterId: 1,
              actionStateId: 0x0a,
              positionX: 500,
              positionY: 0,
              facingDirection: -1,
              velocityX: 0,
              velocityY: 0,
              damagePercent: 12,
              stocksRemaining: 4,
              jumpsRemaining: 0,
              grounded: true,
              hurtboxState: 0,
              hitstunCounter: 0,
              actionFrameCounter: 0,
              comboHitCount: 0,
              comboDamage: 0,
            },
          },
        ],
      });
    }

    const replay = {
      header: {
        version: 4,
        streamLength: frames.length,
        goodName: "Super Smash Bros. (U) (V1.0) [!]",
        recorderSchemaVersion: 1,
        recordedAtEpochMillis: 1724300000000,
        recordedAtNanosOffset: 0,
      },
      gameStart: {
        stageId: DREAM_LAND_STAGE_ID,
        randomSeed: 0,
        ports: [{ characterId: 0 }, { characterId: 1 }],
      },
      frames,
    } as unknown as Replay;

    const events = computeNeutralHitEvents(replay);
    expect(events.length).toBe(1);
    const ev = events[0]!;
    expect(ev.outcome).toBe("reset");
    expect(ev.convertedToKill).toBe(false);
    expect(ev.convertedToEdgeGuard).toBe(true);
    // Neutral reset must have happened AFTER P1 was back on stage (>= frame 140), not during offstage F6-F80
    expect(ev.endFrameIndex).toBeGreaterThanOrEqual(140);
  });

  it("splits sequential disadvantage reversals into distinct advantage phases", () => {
    const frames: Frame[] = [];
    const p0 = 0 as PortIndex;
    const p1 = 1 as PortIndex;

    // Helper to push frame
    const pushF = (
      f: number,
      p0Action: number,
      p0Hitstun: number,
      p0Combo: number,
      p1Action: number,
      p1Hitstun: number,
      p1Combo: number,
      p0Stocks = 4,
      p1Stocks = 4,
    ) => {
      frames.push({
        frame: f,
        ports: [
          {
            pre: { frame: f, port: p0, buttons: 0, stickX: 0, stickY: 0 },
            post: {
              frame: f,
              port: p0,
              characterId: 0,
              actionStateId: p0Action,
              positionX: -500,
              positionY: 0,
              facingDirection: 1,
              velocityX: 0,
              velocityY: 0,
              damagePercent: 0,
              stocksRemaining: p0Stocks,
              jumpsRemaining: 0,
              grounded: true,
              hurtboxState: 0,
              hitstunCounter: p0Hitstun,
              actionFrameCounter: 0,
              comboHitCount: p0Combo,
              comboDamage: 0,
            },
          },
          {
            pre: { frame: f, port: p1, buttons: 0, stickX: 0, stickY: 0 },
            post: {
              frame: f,
              port: p1,
              characterId: 1,
              actionStateId: p1Action,
              positionX: 500,
              positionY: 0,
              facingDirection: -1,
              velocityX: 0,
              velocityY: 0,
              damagePercent: 0,
              stocksRemaining: p1Stocks,
              jumpsRemaining: 0,
              grounded: true,
              hurtboxState: 0,
              hitstunCounter: p1Hitstun,
              actionFrameCounter: 0,
              comboHitCount: p1Combo,
              comboDamage: 0,
            },
          },
        ],
      });
    };

    // F0-F9: Neutral
    for (let f = 0; f < 10; f++) pushF(f, 0x0a, 0, 0, 0x0a, 0, 0);

    // F10: P0 hits P1
    pushF(10, 0x42, 0, 0, 0x33, 20, 1);
    for (let f = 11; f < 25; f++) pushF(f, 0x0a, 0, 0, 0x33, 25 - f, 1);
    for (let f = 25; f < 40; f++) pushF(f, 0x0a, 0, 0, 0x16, 0, 0);

    // F40: P1 reverses and hits P0!
    pushF(40, 0x33, 20, 1, 0x42, 0, 0);
    for (let f = 41; f < 55; f++) pushF(f, 0x33, 55 - f, 1, 0x0a, 0, 0);
    for (let f = 55; f < 70; f++) pushF(f, 0x16, 0, 0, 0x0a, 0, 0);

    // F70: P0 reverses back and hits P1!
    pushF(70, 0x42, 0, 0, 0x33, 30, 1);
    for (let f = 71; f < 90; f++) pushF(f, 0x0a, 0, 0, 0x33, 90 - f, 1);

    // F90: P1 dies (KO)
    pushF(90, 0x0a, 0, 0, 0x00, 0, 0, 4, 3);

    const replay = {
      header: {
        version: 4,
        streamLength: frames.length,
        goodName: "Super Smash Bros. (U) (V1.0) [!]",
        recorderSchemaVersion: 1,
        recordedAtEpochMillis: 1724300000000,
        recordedAtNanosOffset: 0,
      },
      gameStart: {
        stageId: DREAM_LAND_STAGE_ID,
        randomSeed: 0,
        ports: [{ characterId: 0 }, { characterId: 1 }],
      },
      frames,
    } as unknown as Replay;

    const events = computeNeutralHitEvents(replay);
    expect(events.length).toBe(3);

    // Event 1: P0 opening on P1, ended in Reversal at F40
    expect(events[0]!.attackerPort).toBe(p0);
    expect(events[0]!.victimPort).toBe(p1);
    expect(events[0]!.outcome).toBe("reversal");
    expect(events[0]!.endFrameIndex).toBe(40);

    // Event 2: P1 reversal on P0, ended in Reversal at F70
    expect(events[1]!.attackerPort).toBe(p1);
    expect(events[1]!.victimPort).toBe(p0);
    expect(events[1]!.reason).toBe("reversal");
    expect(events[1]!.outcome).toBe("reversal");
    expect(events[1]!.endFrameIndex).toBe(70);

    // Event 3: P0 second reversal on P1, ended in KO at F90
    expect(events[2]!.attackerPort).toBe(p0);
    expect(events[2]!.victimPort).toBe(p1);
    expect(events[2]!.reason).toBe("reversal");
    expect(events[2]!.outcome).toBe("ko");
    expect(events[2]!.convertedToKill).toBe(true);
  });
});
