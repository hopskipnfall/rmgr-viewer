import { describe, it, expect } from "vitest";
import {
  isJigglypuffCharacter,
  isNessCharacter,
  isYoshiCharacter,
  hasCharacterMeta,
  computeJigglypuffFThrowEvents,
  computeJigglypuffFThrowStats,
  computeShieldPressureEvents,
  computeShieldPressureStats,
  type JigglypuffFThrowEvent,
} from "./characterMeta.js";
import type { Replay } from "@rmg-k/rmgr";

function makeReplay(
  frames: Array<{
    p0State: number;
    p1State: number;
    p1Combo: number;
  }>,
): Replay {
  return {
    gameStart: {
      stageId: 0x03,
      ports: {
        0: {
          characterId: 0x0a,
          costumeIndex: 0,
          slotType: 0,
          stocksRemaining: 4,
        },
        1: {
          characterId: 0x01,
          costumeIndex: 0,
          slotType: 0,
          stocksRemaining: 4,
        },
      },
      playerNames: { 0: "Puff", 1: "Fox" },
    },
    gameEnd: { gameEndType: 1 },
    frames: frames.map((f, idx) => ({
      frame: idx,
      ports: {
        0: {
          pre: {
            actionStateId: f.p0State,
            stickX: 0,
            stickY: 0,
            buttons: 0,
            trigger: 0,
          },
          post: {
            actionStateId: f.p0State,
            actionFrameCounter: 0,
            characterId: 0x0a,
            positionX: 0,
            positionY: 0,
            facingDirection: 1,
            damagePercent: 0,
            shieldSize: 50,
            comboHitCount: 0,
            hitstunCounter: 0,
            stocksRemaining: 3,
            hurtboxState: 0,
          },
        },
        1: {
          pre: {
            actionStateId: f.p1State,
            stickX: 0,
            stickY: 0,
            buttons: 0,
            trigger: 0,
          },
          post: {
            actionStateId: f.p1State,
            actionFrameCounter: 0,
            characterId: 0x01,
            positionX: 50,
            positionY: 50,
            facingDirection: -1,
            damagePercent: 20,
            shieldSize: 50,
            comboHitCount: f.p1Combo,
            hitstunCounter: 0,
            stocksRemaining: 3,
            hurtboxState: 0,
          },
        },
      },
    })),
  } as unknown as Replay;
}

describe("isJigglypuffCharacter", () => {
  it("identifies Jigglypuff variants correctly", () => {
    expect(isJigglypuffCharacter(0x0a)).toBe(true); // Jigglypuff
    expect(isJigglypuffCharacter(0x18)).toBe(true); // Polygon Jigglypuff
    expect(isJigglypuffCharacter(0x2e)).toBe(true); // Jigglypuff (JP)
    expect(isJigglypuffCharacter(0x2f)).toBe(true); // Jigglypuff (EU)
  });

  it("returns false for non-Jigglypuff characters", () => {
    expect(isJigglypuffCharacter(0x00)).toBe(false); // Mario
    expect(isJigglypuffCharacter(0x01)).toBe(false); // Fox
    expect(isJigglypuffCharacter(0x07)).toBe(false); // Falcon
  });
});

describe("computeJigglypuffFThrowEvents", () => {
  it("detects follow-up hit success after forward throw", () => {
    const replay = makeReplay([
      // Neutral
      { p0State: 0x00a, p1State: 0x00a, p1Combo: 0 },
      // ThrowF begins
      { p0State: 0x0a9, p1State: 0x0ba, p1Combo: 0 },
      { p0State: 0x0a9, p1State: 0x0ba, p1Combo: 1 },
      // ThrowF ends, Puff jumps & attacks, combo increments to 2
      { p0State: 0x014, p1State: 0x037, p1Combo: 1 },
      { p0State: 0x0d2, p1State: 0x033, p1Combo: 2 },
      // Combo resets
      { p0State: 0x00a, p1State: 0x00a, p1Combo: 0 },
    ]);

    const events = computeJigglypuffFThrowEvents(replay);
    expect(events).toHaveLength(2);
    expect(events[0]?.kind).toBe("fthrow-entered");
    expect(events[1]?.kind).toBe("fthrow-success");
    expect(events[1]?.followupHits).toBe(2);

    const stats = computeJigglypuffFThrowStats(events, 0);
    expect(stats.totalThrows).toBe(1);
    expect(stats.followupSuccesses).toBe(1);
    expect(stats.noFollowups).toBe(0);
    expect(stats.followupRate).toBe(100);
  });

  it("detects follow-up hit success within 0.5s (30 frames) after combo reset", () => {
    // 15 frames of combo = 0 after throw, then hit connects
    const neutralFrames = new Array(15).fill({
      p0State: 0x00a,
      p1State: 0x00a,
      p1Combo: 0,
    });

    const replay = makeReplay([
      // ThrowF begins
      { p0State: 0x0a9, p1State: 0x0ba, p1Combo: 0 },
      { p0State: 0x0a9, p1State: 0x0ba, p1Combo: 1 },
      // ThrowF ends, combo drops to 0
      { p0State: 0x014, p1State: 0x037, p1Combo: 0 },
      ...neutralFrames,
      // Hit connects within 0.5s!
      { p0State: 0x0d2, p1State: 0x033, p1Combo: 1 },
    ]);

    const events = computeJigglypuffFThrowEvents(replay);
    expect(events).toHaveLength(2);
    expect(events[0]?.kind).toBe("fthrow-entered");
    expect(events[1]?.kind).toBe("fthrow-success");

    const stats = computeJigglypuffFThrowStats(events, 0);
    expect(stats.totalThrows).toBe(1);
    expect(stats.followupSuccesses).toBe(1);
    expect(stats.noFollowups).toBe(0);
    expect(stats.followupRate).toBe(100);
  });

  it("detects missed follow-up when 30 frames pass after combo resets without a hit", () => {
    // 35 frames of combo = 0 after throw
    const neutralFrames = new Array(35).fill({
      p0State: 0x00a,
      p1State: 0x00a,
      p1Combo: 0,
    });

    const replay = makeReplay([
      // ThrowF begins
      { p0State: 0x0a9, p1State: 0x0ba, p1Combo: 0 },
      { p0State: 0x0a9, p1State: 0x0ba, p1Combo: 1 },
      // ThrowF ends, combo drops to 0
      { p0State: 0x00a, p1State: 0x037, p1Combo: 0 },
      ...neutralFrames,
    ]);

    const events = computeJigglypuffFThrowEvents(replay);
    expect(events).toHaveLength(2);
    expect(events[0]?.kind).toBe("fthrow-entered");
    expect(events[1]?.kind).toBe("fthrow-failure");

    const stats = computeJigglypuffFThrowStats(events, 0);
    expect(stats.totalThrows).toBe(1);
    expect(stats.followupSuccesses).toBe(0);
    expect(stats.noFollowups).toBe(1);
    expect(stats.followupRate).toBe(0);
  });
});

describe("computeJigglypuffFThrowStats", () => {
  it("returns null followupRate when no throws occurred", () => {
    const events: JigglypuffFThrowEvent[] = [];
    const stats = computeJigglypuffFThrowStats(events, 0);
    expect(stats.totalThrows).toBe(0);
    expect(stats.followupSuccesses).toBe(0);
    expect(stats.noFollowups).toBe(0);
    expect(stats.followupRate).toBeNull();
  });
});

describe("isNessCharacter and isYoshiCharacter", () => {
  it("identifies Ness variants correctly", () => {
    expect(isNessCharacter(0x0b)).toBe(true);
    expect(isNessCharacter(0x19)).toBe(true);
    expect(isNessCharacter(0x25)).toBe(true);
    expect(isNessCharacter(0x00)).toBe(false);
  });

  it("identifies Yoshi variants correctly", () => {
    expect(isYoshiCharacter(0x06)).toBe(true);
    expect(isYoshiCharacter(0x14)).toBe(true);
    expect(isYoshiCharacter(0x31)).toBe(true);
    expect(isYoshiCharacter(0x00)).toBe(false);
  });

  it("hasCharacterMeta returns true for Puff, Ness, Yoshi", () => {
    expect(hasCharacterMeta(0x0a)).toBe(true); // Puff
    expect(hasCharacterMeta(0x0b)).toBe(true); // Ness
    expect(hasCharacterMeta(0x06)).toBe(true); // Yoshi
    expect(hasCharacterMeta(0x01)).toBe(false); // Fox
    expect(hasCharacterMeta(0x08)).toBe(false); // Kirby
  });
});

function makeNessReplay(
  frames: Array<{
    p0State: number;
    p1State: number;
    p1ActionFrame?: number;
  }>,
): Replay {
  return {
    gameStart: {
      stageId: 0x06,
      ports: {
        0: {
          characterId: 0x0b, // Ness
          costumeIndex: 0,
          slotType: 0,
          stocksRemaining: 4,
        },
        1: {
          characterId: 0x01, // Fox
          costumeIndex: 0,
          slotType: 0,
          stocksRemaining: 4,
        },
      },
      playerNames: { 0: "Ness", 1: "Fox" },
    },
    gameEnd: { gameEndType: 1 },
    frames: frames.map((f, idx) => ({
      frame: idx,
      ports: {
        0: {
          pre: {
            actionStateId: f.p0State,
            stickX: 0,
            stickY: 0,
            buttons: 0,
            trigger: 0,
          },
          post: {
            actionStateId: f.p0State,
            actionFrameCounter: 0,
            characterId: 0x08,
            positionX: 0,
            positionY: 0,
            facingDirection: 1,
            damagePercent: 0,
            shieldSize: 50,
            comboHitCount: 0,
            hitstunCounter: 0,
            stocksRemaining: 3,
            hurtboxState: 0,
          },
        },
        1: {
          pre: {
            actionStateId: f.p1State,
            stickX: 0,
            stickY: 0,
            buttons: 0,
            trigger: 0,
          },
          post: {
            actionStateId: f.p1State,
            actionFrameCounter: f.p1ActionFrame ?? 0,
            characterId: 0x01,
            positionX: 50,
            positionY: 0,
            facingDirection: -1,
            damagePercent: 20,
            shieldSize: 50,
            comboHitCount: 0,
            hitstunCounter: 0,
            stocksRemaining: 3,
            hurtboxState: 0,
          },
        },
      },
    })),
  } as unknown as Replay;
}

describe("computeShieldPressureEvents", () => {
  it("detects 2+ shield hits resulting in Shield Break", () => {
    const replay = makeNessReplay([
      // Fox enters shield stun (hit 1)
      { p0State: 0x0c7, p1State: 0x09b, p1ActionFrame: 0 },
      { p0State: 0x0c7, p1State: 0x09b, p1ActionFrame: 1 },
      // Ness lands hit 2 (Fox in shield stun resets actionFrame to 0)
      { p0State: 0x0c7, p1State: 0x09b, p1ActionFrame: 0 },
      { p0State: 0x0c7, p1State: 0x09b, p1ActionFrame: 1 },
      // Shield breaks!
      { p0State: 0x00a, p1State: 0x09e, p1ActionFrame: 0 },
    ]);

    const events = computeShieldPressureEvents(replay);
    expect(events).toHaveLength(2);
    expect(events[0]?.kind).toBe("shield-pressure-entered");
    expect(events[1]?.kind).toBe("shield-break");

    const stats = computeShieldPressureStats(events, 0);
    expect(stats.totalPressures).toBe(1);
    expect(stats.shieldBreaks).toBe(1);
    expect(stats.grabs).toBe(0);
    expect(stats.neither).toBe(0);
    expect(stats.conversionRate).toBe(100);
  });

  it("detects 2+ shield hits resulting in Grab confirm", () => {
    const replay = makeNessReplay([
      // Hit 1 on shield
      { p0State: 0x0c7, p1State: 0x09b, p1ActionFrame: 0 },
      { p0State: 0x0c7, p1State: 0x09b, p1ActionFrame: 1 },
      // Hit 2 on shield
      { p0State: 0x0c7, p1State: 0x09b, p1ActionFrame: 0 },
      // Ness grabs
      { p0State: 0x0a6, p1State: 0x0ab, p1ActionFrame: 0 },
    ]);

    const events = computeShieldPressureEvents(replay);
    expect(events).toHaveLength(2);
    expect(events[0]?.kind).toBe("shield-pressure-entered");
    expect(events[1]?.kind).toBe("shield-grab");

    const stats = computeShieldPressureStats(events, 0);
    expect(stats.totalPressures).toBe(1);
    expect(stats.shieldBreaks).toBe(0);
    expect(stats.grabs).toBe(1);
    expect(stats.neither).toBe(0);
    expect(stats.conversionRate).toBe(100);
  });

  it("detects 2+ shield hits resulting in Neither (escaped after 30 frames)", () => {
    const neutralFrames = new Array(35).fill({
      p0State: 0x00a,
      p1State: 0x00a,
    });

    const replay = makeNessReplay([
      // Hit 1
      { p0State: 0x0c7, p1State: 0x09b, p1ActionFrame: 0 },
      // Hit 2
      { p0State: 0x0c7, p1State: 0x09b, p1ActionFrame: 0 },
      // Shield drops and neutral happens
      ...neutralFrames,
    ]);

    const events = computeShieldPressureEvents(replay);
    expect(events).toHaveLength(2);
    expect(events[0]?.kind).toBe("shield-pressure-entered");
    expect(events[1]?.kind).toBe("shield-escape");

    const stats = computeShieldPressureStats(events, 0);
    expect(stats.totalPressures).toBe(1);
    expect(stats.shieldBreaks).toBe(0);
    expect(stats.grabs).toBe(0);
    expect(stats.neither).toBe(1);
    expect(stats.conversionRate).toBe(0);
  });

  it("does not track 1-hit shield stuns as multi-hit pressure attempts", () => {
    const neutralFrames = new Array(35).fill({
      p0State: 0x00a,
      p1State: 0x00a,
    });

    const replay = makeNessReplay([
      // Only 1 hit on shield
      { p0State: 0x0c7, p1State: 0x09b, p1ActionFrame: 0 },
      { p0State: 0x0c7, p1State: 0x09b, p1ActionFrame: 1 },
      ...neutralFrames,
    ]);

    const events = computeShieldPressureEvents(replay);
    expect(events).toHaveLength(0);

    const stats = computeShieldPressureStats(events, 0);
    expect(stats.totalPressures).toBe(0);
    expect(stats.conversionRate).toBeNull();
  });
});
