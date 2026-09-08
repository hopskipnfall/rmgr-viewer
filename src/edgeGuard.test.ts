import { describe, it, expect } from "vitest";
import type { Frame, PortIndex, Replay } from "@rmg-k/rmgr";
import { computeEdgeGuardEvents } from "./edgeGuard.js";
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
      playerNames: ["nue", "Kurabba", "", ""],
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
      characterId: [9, 8, 0, 0], // Pikachu, Kirby
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

interface PortState {
  state: number;
  x: number;
  y: number;
  dmg?: number;
  stocks?: number;
  grounded?: boolean;
  hitstun?: number;
}

function makeFrame(frameNumber: number, p0: PortState, p1: PortState): Frame {
  const post = (port: PortIndex, characterId: number, p: PortState) => ({
    input: {
      frame: frameNumber,
      port,
      buttons: 0,
      stickX: 0,
      stickY: 0,
    },
    state: {
      frame: frameNumber,
      port,
      characterId,
      actionStateId: p.state,
      positionX: p.x,
      positionY: p.y,
      facingDirection: 1 as const,
      velocityX: 0,
      velocityY: 0,
      damagePercent: p.dmg ?? 0,
      stocksRemaining: p.stocks ?? 3,
      jumpsRemaining: 0,
      grounded: p.grounded ?? false,
      hurtboxState: 0,
      hitstunCounter: p.hitstun ?? 0,
      actionFrameCounter: 0,
      comboHitCount: 0,
    },
  });

  return {
    frame: frameNumber,
    ports: [
      post(0 as PortIndex, 9, p0),
      post(1 as PortIndex, 8, p1),
    ] as unknown as Frame["ports"],
  };
}

// Comfortably outside isOutsideZone()'s Dream Land boundary at y=1000 (see
// edgeGuard.ts) - the edge-guarder (port 0) stays put on stage the whole
// time at (0, 0), grounded, never in hitstun.
const OFFSTAGE_X = 5000;
const ONSTAGE = { state: 0x0e, x: 0, y: 0, grounded: true, hitstun: 0 };

describe("computeEdgeGuardEvents", () => {
  it("keeps a recovery situation open through a hit that lands right after a landing, instead of resolving it early", () => {
    const frames: Frame[] = [];

    // f0-f9: port 1 falling offstage, actionable, un-grounded - situation opens.
    for (let f = 0; f <= 9; f++) {
      frames.push(
        makeFrame(f, ONSTAGE, {
          state: 0x39,
          x: OFFSTAGE_X - f * 50,
          y: 1000 - f * 20,
          grounded: false,
          hitstun: 0,
        }),
      );
    }

    // f10: port 1 lands on a platform, actionable - hasTouchedGround should
    // latch true here.
    frames.push(
      makeFrame(10, ONSTAGE, {
        state: 0x0e,
        x: 1400,
        y: 907,
        grounded: true,
        hitstun: 0,
        dmg: 90,
      }),
    );

    // f11: immediately hit again - launched back offstage, damage jumps,
    // large hitstun. This is the exact real-replay scenario (see the
    // 260828205834-nue-Kurabba-6.rmgr bug report): landing on the side
    // platform, then getting hit before 0.5s of safety has passed.
    frames.push(
      makeFrame(11, ONSTAGE, {
        state: 0x37,
        x: 1350,
        y: 950,
        grounded: false,
        hitstun: 40,
        dmg: 100,
      }),
    );

    // f12-f51: hitstun counting down to 0, still airborne, drifting back
    // offstage - never actually safe again.
    for (let f = 12; f <= 51; f++) {
      const hitstun = Math.max(0, 40 - (f - 11));
      frames.push(
        makeFrame(f, ONSTAGE, {
          state: hitstun > 0 ? 0x37 : 0x39,
          x: OFFSTAGE_X - (f - 12) * 60,
          y: 900 - (f - 12) * 40,
          grounded: false,
          hitstun,
          dmg: 100,
        }),
      );
    }

    // f52: dies (stock lost) - the real, final resolution.
    frames.push(
      makeFrame(52, ONSTAGE, {
        state: 0x00,
        x: OFFSTAGE_X - 2500,
        y: -4000,
        grounded: false,
        hitstun: 0,
        dmg: 100,
        stocks: 2,
      }),
    );

    const replay = makeMockReplay(frames);
    const events = computeEdgeGuardEvents(replay);

    // Exactly one situation, resolved by the actual death - no spurious
    // "recovery-success" from the 0.5s clock resuming mid-flight after the
    // post-landing hit's hitstun happened to run out.
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      kind: "situation-entered",
      frameIndex: 0,
      recoveringPort: 1,
      edgeGuardingPort: 0,
    });
    expect(events[1]).toMatchObject({
      kind: "recovery-failure",
      frameIndex: 52,
      recoveringPort: 1,
      edgeGuardingPort: 0,
    });
  });

  it("still resolves recovery-success normally when the player lands and stays safe for 0.5s", () => {
    const frames: Frame[] = [];

    for (let f = 0; f <= 9; f++) {
      frames.push(
        makeFrame(f, ONSTAGE, {
          state: 0x39,
          x: OFFSTAGE_X - f * 50,
          y: 1000 - f * 20,
          grounded: false,
          hitstun: 0,
        }),
      );
    }

    // Lands at f10 and stays grounded, un-hit, for 30+ frames - a clean
    // recovery with no interrupting hit.
    for (let f = 10; f <= 45; f++) {
      frames.push(
        makeFrame(f, ONSTAGE, {
          state: 0x0e,
          x: 1400,
          y: 907,
          grounded: true,
          hitstun: 0,
        }),
      );
    }

    const replay = makeMockReplay(frames);
    const events = computeEdgeGuardEvents(replay);

    expect(events).toHaveLength(2);
    expect(events[0]?.kind).toBe("situation-entered");
    expect(events[1]?.kind).toBe("recovery-success");
    // Resolves once safeFrameStreak reaches RECOVERY_GROUNDED_FRAMES (30) -
    // the landing frame itself (f10) already counts as streak 1, so the
    // 30th counted frame is f10 + 29 = f39.
    expect(events[1]?.frameIndex).toBe(39);
  });
});
