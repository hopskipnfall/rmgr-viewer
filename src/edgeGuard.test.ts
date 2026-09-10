import { describe, it, expect } from "vitest";
import type { Frame, PortIndex, Replay } from "@rmg-k/rmgr";
import {
  computeEdgeGuardEvents,
  computeEdgeGuardStats,
  type EdgeGuardEvent,
} from "./edgeGuard.js";
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
  it("does not resolve recovery-success while the recovering player is grabbed right after landing, even if the grab+throw ends in death", () => {
    // Real bug report: 260823171117-Wario-Player-30.rmgr, frame 9123 -- Wario lands, is
    // immediately grabbed, back-thrown, and killed, but the situation had already resolved
    // "recovery-success" (via the grounded-safety-clock) before the death registered, because
    // grab/throw action states aren't hitstun and the clock kept running straight through them.
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
    // f10: lands, grounded and actionable - hasTouchedGround latches true, streak starts.
    frames.push(makeFrame(10, ONSTAGE, { state: 0x0e, x: 1400, y: 0, grounded: true, hitstun: 0 }));
    // f11: grabbed (CaptureWait) almost immediately after landing - well under the 30-frame
    // safety window. Under the bug, the streak (still only 1 frame in) wouldn't yet have
    // resolved success on its own here, so this alone doesn't reproduce it -- the bug needs the
    // grab+throw sequence itself to run long enough for the streak to keep silently climbing
    // through it. f11-f40: held in the grab (30 frames - long enough that, if grab/throw were
    // wrongly treated as "safe" like the pre-fix code did, the streak would hit 30 and resolve
    // success right in the middle of the grab).
    for (let f = 11; f <= 40; f++) {
      frames.push(
        makeFrame(f, ONSTAGE, { state: 0x0ac, x: 1400, y: 0, grounded: false, hitstun: 0 }),
      );
    }
    // f41: thrown (DamageThrown).
    frames.push(
      makeFrame(41, ONSTAGE, { state: 0x0ba, x: 1400, y: 0, grounded: false, hitstun: 0 }),
    );
    // f42: dies (stock lost) - the real, final resolution.
    frames.push(
      makeFrame(42, ONSTAGE, {
        state: 0x00,
        x: OFFSTAGE_X,
        y: -4000,
        grounded: false,
        hitstun: 0,
        stocks: 2,
      }),
    );

    const replay = makeMockReplay(frames);
    const events = computeEdgeGuardEvents(replay);

    // Exactly one situation, resolved by the actual death - no spurious "recovery-success" from
    // the 0.5s clock running through the grab/throw sequence.
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      kind: "situation-entered",
      frameIndex: 0,
      recoveringPort: 1,
      edgeGuardingPort: 0,
    });
    expect(events[1]).toMatchObject({
      kind: "recovery-failure",
      frameIndex: 42,
      recoveringPort: 1,
      edgeGuardingPort: 0,
    });
  });


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

describe("computeEdgeGuardStats", () => {
  const PORT_RECOVERING = 1 as PortIndex;
  const PORT_GUARDING = 0 as PortIndex;

  // Two situations: one at enteredFrameIndex=10 (resolves success at 20), one at
  // enteredFrameIndex=100 (resolves failure at 110).
  const events: EdgeGuardEvent[] = [
    {
      frame: 10,
      frameIndex: 10,
      kind: "situation-entered",
      recoveringPort: PORT_RECOVERING,
      edgeGuardingPort: PORT_GUARDING,
    },
    {
      frame: 20,
      frameIndex: 20,
      kind: "recovery-success",
      recoveringPort: PORT_RECOVERING,
      edgeGuardingPort: PORT_GUARDING,
    },
    {
      frame: 100,
      frameIndex: 100,
      kind: "situation-entered",
      recoveringPort: PORT_RECOVERING,
      edgeGuardingPort: PORT_GUARDING,
    },
    {
      frame: 110,
      frameIndex: 110,
      kind: "recovery-failure",
      recoveringPort: PORT_RECOVERING,
      edgeGuardingPort: PORT_GUARDING,
    },
  ];

  it("counts both situations when nothing is excluded", () => {
    const stats = computeEdgeGuardStats(events, PORT_RECOVERING);
    expect(stats.recoverySituations).toBe(2);
    expect(stats.recoverySuccesses).toBe(1);
  });

  it("drops an excluded situation from both the numerator and denominator, not just the numerator", () => {
    // Exclude the first situation (the successful one) -- its success must NOT still be counted,
    // and the situation itself must not still inflate the denominator.
    const excluded = new Set([10]);

    const stats = computeEdgeGuardStats(events, PORT_RECOVERING, excluded);
    expect(stats.recoverySituations).toBe(1);
    expect(stats.recoverySuccesses).toBe(0);
  });

  it("excluding the second situation doesn't affect the first", () => {
    const excluded = new Set([100]);

    const stats = computeEdgeGuardStats(events, PORT_RECOVERING, excluded);
    expect(stats.recoverySituations).toBe(1);
    expect(stats.recoverySuccesses).toBe(1);
  });
});
