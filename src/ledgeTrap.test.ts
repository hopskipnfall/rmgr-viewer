import { describe, it, expect } from "vitest";
import type { Frame, PortIndex, Replay } from "@rmg-k/rmgr";
import {
  computeLedgeTrapEvents,
  computeLedgeTrapStats,
  LEDGE_ACTION_STATES,
} from "./ledgeTrap.js";
import { DREAM_LAND_STAGE_ID } from "./stageGeometry.js";
import { computeNeutralHitEvents } from "./neutralHits.js";

function makeMockReplay(frames: Frame[]): Replay {
  return {
    header: {
      version: 3,
      streamLength: 1000,
      goodName: "Super Smash Bros. (U) (V1.0) [!]",
      recorderSchemaVersion: 1,
      recordedAtEpochSeconds: 1724300000,
    },
    gameStart: {
      stageId: DREAM_LAND_STAGE_ID,
      gameType: 2,
      stockCountSetting: 3,
      timeLimitMinutes: 100,
      damageRatio: 100,
      itemFrequency: 0,
      teamsEnabled: false,
      handicapMode: "off",
      ports: [
        {
          slotType: "human",
          characterId: 41,
          costumeId: 0,
          teamColor: 0,
          team: 0,
          handicap: 0,
          cpuLevel: 0,
        },
        {
          slotType: "human",
          characterId: 39,
          costumeId: 0,
          teamColor: 0,
          team: 1,
          handicap: 0,
          cpuLevel: 0,
        },
        {
          slotType: "empty",
          characterId: 0,
          costumeId: 0,
          teamColor: 0,
          team: 0,
          handicap: 0,
          cpuLevel: 0,
        },
        {
          slotType: "empty",
          characterId: 0,
          costumeId: 0,
          teamColor: 0,
          team: 0,
          handicap: 0,
          cpuLevel: 0,
        },
      ],
      playerNames: ["kusora", "nue", "", ""],
    },
    frames,
    gameEnd: {
      endReason: "normal",
      placements: [2, 1, -1, -1],
    },
    isComplete: true,
  };
}

function makeFrame(
  frameNumber: number,
  p0: {
    state: number;
    x: number;
    y: number;
    dmg?: number;
    stocks?: number;
    grounded?: boolean;
    hitstun?: number;
    comboHit?: number;
  },
  p1: {
    state: number;
    x: number;
    y: number;
    dmg?: number;
    stocks?: number;
    grounded?: boolean;
    hitstun?: number;
    comboHit?: number;
  },
): Frame {
  return {
    frame: frameNumber,
    ports: [
      {
        pre: {
          frame: frameNumber,
          port: 0 as PortIndex,
          buttons: 0,
          stickX: 0,
          stickY: 0,
        },
        post: {
          frame: frameNumber,
          port: 0 as PortIndex,
          characterId: 41,
          actionStateId: p0.state,
          positionX: p0.x,
          positionY: p0.y,
          facingDirection: 1,
          velocityX: 0,
          velocityY: 0,
          damagePercent: p0.dmg ?? 0,
          stocksRemaining: p0.stocks ?? 4,
          jumpsUsed: 0,
          grounded: p0.grounded ?? false,
          hurtboxState: 0,
          hitstunCounter: p0.hitstun ?? 0,
          actionFrameCounter: 0,
          comboHitCount: p0.comboHit ?? 0,
        },
      },
      {
        pre: {
          frame: frameNumber,
          port: 1 as PortIndex,
          buttons: 0,
          stickX: 0,
          stickY: 0,
        },
        post: {
          frame: frameNumber,
          port: 1 as PortIndex,
          characterId: 39,
          actionStateId: p1.state,
          positionX: p1.x,
          positionY: p1.y,
          facingDirection: -1,
          velocityX: 0,
          velocityY: 0,
          damagePercent: p1.dmg ?? 0,
          stocksRemaining: p1.stocks ?? 4,
          jumpsUsed: 0,
          grounded: p1.grounded ?? true,
          hurtboxState: 0,
          hitstunCounter: p1.hitstun ?? 0,
          actionFrameCounter: 0,
          comboHitCount: p1.comboHit ?? 0,
        },
      },
    ] as unknown as Frame["ports"],
  };
}

describe("Ledge Trap & Getup analysis", () => {
  it("recognizes all ledge action states (0x54..0x63)", () => {
    for (let st = 0x54; st <= 0x63; st++) {
      expect(LEDGE_ACTION_STATES.has(st)).toBe(true);
    }
  });

  it("detects failed ledge getup when grabbed out of slow ledge roll and thrown offstage", () => {
    const frames: Frame[] = [];

    // F0: Port 0 grabs ledge at 126% damage (CliffCatch)
    frames.push(
      makeFrame(
        0,
        { state: 0x54, x: -2400, y: -450, dmg: 126 },
        { state: 0x9a, x: -2000, y: 0 },
      ),
    );
    // F1..F5: CliffWait
    for (let f = 1; f <= 5; f++) {
      frames.push(
        makeFrame(
          f,
          { state: 0x55, x: -2378, y: -450, dmg: 126 },
          { state: 0x0a, x: -2000, y: 0 },
        ),
      );
    }
    // F6..F15: CliffSlow (0x59)
    for (let f = 6; f <= 15; f++) {
      frames.push(
        makeFrame(
          f,
          { state: 0x59, x: -2378, y: -400, dmg: 126 },
          { state: 0x0a, x: -2000, y: 0 },
        ),
      );
    }
    // F16..F25: CliffEscapeSlow1 (0x62)
    for (let f = 16; f <= 25; f++) {
      frames.push(
        makeFrame(
          f,
          { state: 0x62, x: -2378, y: -200, dmg: 126 },
          { state: 0x0a, x: -2000, y: 0 },
        ),
      );
    }
    // F26..F35: CliffEscapeSlow2 (0x63) grounded on stage
    for (let f = 26; f <= 35; f++) {
      frames.push(
        makeFrame(
          f,
          { state: 0x63, x: -1600, y: 0, dmg: 126, grounded: true },
          { state: 0xa6, x: -1300, y: 0 },
        ),
      );
    }
    // F36..F45: Port 1 grabs Port 0 (0xab CapturePull, 0xac CaptureWait)
    for (let f = 36; f <= 45; f++) {
      frames.push(
        makeFrame(
          f,
          { state: 0xac, x: -1600, y: 0, dmg: 126, grounded: true },
          { state: 0xa8, x: -1300, y: 0 },
        ),
      );
    }
    // F46: Port 1 throws Port 0 offstage into DamageFly (0x34) at x = -2500
    frames.push(
      makeFrame(
        46,
        { state: 0x34, x: -2500, y: 400, dmg: 135, hitstun: 50 },
        { state: 0xa9, x: -1600, y: 0 },
      ),
    );

    const replay = makeMockReplay(frames);
    const events = computeLedgeTrapEvents(replay);

    expect(events.length).toBe(2);
    expect(events[0]?.kind).toBe("ledge-getup-entered");
    expect(events[0]?.damageAtEntry).toBe(126);
    expect(events[0]?.isUnder100).toBe(false);

    expect(events[1]?.kind).toBe("ledge-getup-failure");
    expect(events[1]?.frame).toBe(46);
    expect(events[1]?.isUnder100).toBe(false);

    // Verify neutral hits ignores this grab during the ledge trap
    const neutralEvents = computeNeutralHitEvents(replay);
    expect(neutralEvents.length).toBe(0);

    // Check stats aggregation
    const p0Stats = computeLedgeTrapStats(events, 0);
    expect(p0Stats.ledgeGetupSituations).toBe(1);
    expect(p0Stats.ledgeGetupSuccesses).toBe(0);
    expect(p0Stats.ledgeGetupOver100Situations).toBe(1);
    expect(p0Stats.ledgeGetupOver100Successes).toBe(0);
    expect(p0Stats.ledgeGetupUnder100Situations).toBe(0);

    const p1Stats = computeLedgeTrapStats(events, 1);
    expect(p1Stats.ledgeTrapSituations).toBe(1);
    expect(p1Stats.ledgeTrapSuccesses).toBe(1);
    expect(p1Stats.ledgeTrapOver100Situations).toBe(1);
    expect(p1Stats.ledgeTrapOver100Successes).toBe(1);
  });

  it("detects successful ledge getup when remaining grounded and safe for 30 frames after exiting ledge animation", () => {
    const frames: Frame[] = [];

    // F0: Port 1 grabs ledge at 45% damage (<100%)
    frames.push(
      makeFrame(
        0,
        { state: 0x0a, x: 0, y: 0 },
        { state: 0x54, x: 2400, y: -450, dmg: 45 },
      ),
    );
    // F1..F5: CliffQuick (0x56)
    for (let f = 1; f <= 5; f++) {
      frames.push(
        makeFrame(
          f,
          { state: 0x0a, x: 0, y: 0 },
          { state: 0x56, x: 2350, y: -300, dmg: 45 },
        ),
      );
    }
    // F6..F10: CliffClimbQuick2 (0x57)
    for (let f = 6; f <= 10; f++) {
      frames.push(
        makeFrame(
          f,
          { state: 0x0a, x: 0, y: 0 },
          { state: 0x57, x: 2200, y: 0, dmg: 45, grounded: true },
        ),
      );
    }
    // F11..F40: Stand / Wait on stage (0x0a) grounded and safe for 30 frames
    for (let f = 11; f <= 40; f++) {
      frames.push(
        makeFrame(
          f,
          { state: 0x0a, x: 0, y: 0 },
          { state: 0x0a, x: 2000, y: 0, dmg: 45, grounded: true },
        ),
      );
    }

    const replay = makeMockReplay(frames);
    const events = computeLedgeTrapEvents(replay);

    expect(events.length).toBe(2);
    expect(events[0]?.kind).toBe("ledge-getup-entered");
    expect(events[0]?.isUnder100).toBe(true);
    expect(events[0]?.damageAtEntry).toBe(45);

    expect(events[1]?.kind).toBe("ledge-getup-success");
    expect(events[1]?.isUnder100).toBe(true);

    const p1Stats = computeLedgeTrapStats(events, 1);
    expect(p1Stats.ledgeGetupSituations).toBe(1);
    expect(p1Stats.ledgeGetupSuccesses).toBe(1);
    expect(p1Stats.ledgeGetupUnder100Situations).toBe(1);
    expect(p1Stats.ledgeGetupUnder100Successes).toBe(1);
  });
});
