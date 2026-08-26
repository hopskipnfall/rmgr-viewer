import { describe, it, expect } from "vitest";
import {
  classifyNeutralOpening,
  computeNeutralHitEvents,
  type NeutralHitEvent,
} from "./neutralHits.js";
import type { Replay, Frame, PortIndex } from "@rmg-k/rmgr";

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

  it("classifies landing lag grab punish", () => {
    // 5 frames Idle, then 2 frames LandingAirX (0x0db), then grabbed on frame 7
    const actions = [0x00a, 0x00a, 0x00a, 0x00a, 0x00a, 0x0db, 0x0db];
    const replay = makeMockReplayWithAction({
      victimActionsBeforeHit: actions,
      hitType: "grab",
    });
    const events: NeutralHitEvent[] = computeNeutralHitEvents(replay);

    expect(events.length).toBe(1);
    expect(events[0]?.hitType).toBe("grab");
    expect(events[0]?.reason).toBe("landing-lag");
  });
});
