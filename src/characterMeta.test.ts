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
  getJigglypuffFThrowSituations,
  getShieldPressureSituations,
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
    matchSettings: {
      stageId: 0x03,
      characterId: [0x0a, 0x01],
    },
    matchStart: {
      playerNames: ["Puff", "Fox", "", ""],
    },
    matchEnd: { endReason: "normal" },
    frames: frames.map((f, idx) => ({
      frame: idx,
      ports: {
        0: {
          input: {
            actionStateId: f.p0State,
            stickX: 0,
            stickY: 0,
            buttons: 0,
          },
          state: {
            actionStateId: f.p0State,
            actionFrameCounter: 0,
            characterId: 0x0a,
            positionX: 0,
            positionY: 0,
            facingDirection: 1,
            damagePercent: 0,
            comboHitCount: 0,
            hitstunCounter: 0,
            stocksRemaining: 3,
            hurtboxState: 0,
          },
        },
        1: {
          input: {
            actionStateId: f.p1State,
            stickX: 0,
            stickY: 0,
            buttons: 0,
          },
          state: {
            actionStateId: f.p1State,
            actionFrameCounter: 0,
            characterId: 0x01,
            positionX: 50,
            positionY: 50,
            facingDirection: -1,
            damagePercent: 20,
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
  it("does not count the throw release hit as a follow-up when grab was preceded by a hit", () => {
    const replay = makeReplay([
      // Pre-grab hit: opponent damage 3%, combo hit 1
      { p0State: 0x00a, p1State: 0x026, p1Combo: 1, p1Dmg: 3 },
      // Grab & ThrowF begins
      { p0State: 0x0a9, p1State: 0x0ba, p1Combo: 1, p1Dmg: 3 },
      // Throw release: damage becomes 17%, combo becomes 2 while ThrowF is still active
      { p0State: 0x0a9, p1State: 0x036, p1Combo: 2, p1Dmg: 17 },
      // Throw ends (Puff in Wait 0x00a, opponent still in hitstun at 17% damage, combo 2)
      { p0State: 0x00a, p1State: 0x036, p1Combo: 2, p1Dmg: 17 },
      // Hitstun ends without Puff landing another hit, combo drops to 0
      { p0State: 0x00a, p1State: 0x018, p1Combo: 0, p1Dmg: 17 },
      // 35 frames pass after hitstun reset without any hit
      ...new Array(35).fill({
        p0State: 0x00a,
        p1State: 0x018,
        p1Combo: 0,
        p1Dmg: 17,
      }),
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
    matchSettings: {
      stageId: 0x06,
      characterId: [0x0b, 0x01], // Ness, Fox
    },
    matchStart: {
      playerNames: ["Ness", "Fox", "", ""],
    },
    matchEnd: { endReason: "normal" },
    frames: frames.map((f, idx) => ({
      frame: idx,
      ports: {
        0: {
          input: {
            actionStateId: f.p0State,
            stickX: 0,
            stickY: 0,
            buttons: 0,
          },
          state: {
            actionStateId: f.p0State,
            actionFrameCounter: 0,
            characterId: 0x08,
            positionX: 0,
            positionY: 0,
            facingDirection: 1,
            damagePercent: 0,
            comboHitCount: 0,
            hitstunCounter: 0,
            stocksRemaining: 3,
            hurtboxState: 0,
          },
        },
        1: {
          input: {
            actionStateId: f.p1State,
            stickX: 0,
            stickY: 0,
            buttons: 0,
          },
          state: {
            actionStateId: f.p1State,
            actionFrameCounter: f.p1ActionFrame ?? 0,
            characterId: 0x01,
            positionX: 50,
            positionY: 0,
            facingDirection: -1,
            damagePercent: 20,
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

  it("extracts structured ShieldPressureSituation list for timeline and widget display", () => {
    const replay = makeNessReplay([
      // Situation 1: Shield break
      { p0State: 0x0c7, p1State: 0x09b, p1ActionFrame: 0 },
      { p0State: 0x0c7, p1State: 0x09b, p1ActionFrame: 0 },
      { p0State: 0x0cf, p1State: 0x09e, p1ActionFrame: 0 },
      // Neutral gap
      { p0State: 0x00a, p1State: 0x00a },
      { p0State: 0x00a, p1State: 0x00a },
      // Situation 2: Grab
      { p0State: 0x0c7, p1State: 0x09b, p1ActionFrame: 0 },
      { p0State: 0x0c7, p1State: 0x09b, p1ActionFrame: 0 },
      { p0State: 0x0a6, p1State: 0x0ab, p1ActionFrame: 0 },
    ]);

    const events = computeShieldPressureEvents(replay);
    const situations = getShieldPressureSituations(events, 0);

    expect(situations).toHaveLength(2);
    expect(situations[0]?.outcome).toBe("shield-break");
    expect(situations[0]?.hitsOnShield).toBe(2);
    expect(situations[0]?.enteredFrameIndex).toBe(1);

    expect(situations[1]?.outcome).toBe("shield-grab");
    expect(situations[1]?.hitsOnShield).toBe(2);
  });
});

describe("getJigglypuffFThrowSituations", () => {
  it("extracts structured JigglypuffFThrowSituation list for timeline and widget display", () => {
    const replay = makeReplay([
      { p0State: 0x0a9, p1State: 0x0ba, p1Combo: 0 },
      { p0State: 0x0a9, p1State: 0x0ba, p1Combo: 0 },
      { p0State: 0x0d2, p1State: 0x034, p1Combo: 1 },
      { p0State: 0x0d2, p1State: 0x034, p1Combo: 2 },
    ]);

    const events = computeJigglypuffFThrowEvents(replay);
    const situations = getJigglypuffFThrowSituations(events, 0);

    expect(situations).toHaveLength(1);
    expect(situations[0]?.outcome).toBe("success");
    expect(situations[0]?.followupHits).toBe(2);
    expect(situations[0]?.enteredFrameIndex).toBe(0);
  });
});
