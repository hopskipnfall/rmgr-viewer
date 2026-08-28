import { describe, it, expect } from "vitest";
import type { Frame, PortIndex, Replay } from "@rmg-k/rmgr";
import { computeKillCombos, COMBO_JUMP_LEAD_IN_FRAMES } from "./combos.js";
import { DREAM_LAND_STAGE_ID } from "./stageGeometry.js";

function makeMockReplay(frames: Frame[]): Replay {
  return {
    header: {
      version: 4,
      streamLength: 1000,
      goodName: "Super Smash Bros. (U) (V1.0) [!]",
      recorderSchemaVersion: 1,
      recordedAtEpochMillis: 1724300000000,
      recordedAtNanosOffset: 0,
    },
    gameStart: {
      stageId: DREAM_LAND_STAGE_ID,
      gameType: 2,
      stockCountSetting: 4,
      timeLimitMinutes: 100,
      damageRatio: 100,
      itemFrequency: 0,
      teamsEnabled: false,
      handicapMode: "off",
      ports: [
        {
          slotType: "human",
          characterId: 1, // Fox
          costumeId: 0,
          teamColor: 0,
          team: 0,
          handicap: 0,
          cpuLevel: 0,
        },
        {
          slotType: "human",
          characterId: 0, // Mario
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
      playerNames: ["Harold", "George", "", ""],
    },
    frames,
    gameEnd: {
      endReason: "normal",
      placements: [1, 2, -1, -1],
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
          characterId: 1,
          actionStateId: p0.state,
          positionX: p0.x,
          positionY: p0.y,
          facingDirection: 1,
          velocityX: 0,
          velocityY: 0,
          damagePercent: p0.dmg ?? 0,
          stocksRemaining: p0.stocks ?? 4,
          jumpsRemaining: 0,
          grounded: p0.grounded ?? true,
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
          characterId: 0,
          actionStateId: p1.state,
          positionX: p1.x,
          positionY: p1.y,
          facingDirection: -1,
          velocityX: 0,
          velocityY: 0,
          damagePercent: p1.dmg ?? 0,
          stocksRemaining: p1.stocks ?? 4,
          jumpsRemaining: 0,
          grounded: p1.grounded ?? false,
          hurtboxState: 0,
          hitstunCounter: p1.hitstun ?? 0,
          actionFrameCounter: 0,
          comboHitCount: p1.comboHit ?? 0,
        },
      },
    ] as unknown as Frame["ports"],
  };
}

describe("computeKillCombos", () => {
  it("ignores combos with fewer than 3 hits", () => {
    const frames: Frame[] = [];
    // 2-hit combo that takes a stock
    for (let f = 0; f <= 20; f++) {
      frames.push(
        makeFrame(
          f,
          { state: 0x0a, x: 0, y: 0 },
          { state: 0x33, x: 200, y: 100, dmg: 24, comboHit: 2, hitstun: 20 },
        ),
      );
    }
    // Stock lost
    frames.push(
      makeFrame(
        21,
        { state: 0x0a, x: 0, y: 0 },
        { state: 0x01, x: 5000, y: 1000, dmg: 24, stocks: 3, hitstun: 0 },
      ),
    );

    const combos = computeKillCombos(makeMockReplay(frames));
    expect(combos.length).toBe(0);
  });

  it("detects direct KO combo with >= 3 hits and sets jumpFrameIndex 90 frames earlier", () => {
    const frames: Frame[] = [];
    // Lead-in neutral frames
    for (let f = 0; f < 120; f++) {
      frames.push(
        makeFrame(
          f,
          { state: 0x0a, x: 0, y: 0 },
          { state: 0x0a, x: 50, y: 0, dmg: 0, grounded: true },
        ),
      );
    }
    // 4-hit combo starting at frame 120
    for (let f = 120; f <= 160; f++) {
      frames.push(
        makeFrame(
          f,
          { state: 0xcc, x: 0, y: 0 },
          { state: 0x33, x: 100, y: 50, dmg: 58, comboHit: 4, hitstun: 30 },
        ),
      );
    }
    // Death at frame 161
    frames.push(
      makeFrame(
        161,
        { state: 0x0a, x: 0, y: 0 },
        { state: 0x01, x: 6000, y: 2000, dmg: 58, stocks: 3 },
      ),
    );

    const combos = computeKillCombos(makeMockReplay(frames));
    expect(combos.length).toBe(1);
    const c = combos[0]!;
    expect(c.attackerPort).toBe(0);
    expect(c.victimPort).toBe(1);
    expect(c.hitCount).toBe(4);
    expect(c.startFrame).toBe(120);
    expect(c.jumpFrameIndex).toBe(120 - COMBO_JUMP_LEAD_IN_FRAMES); // 30
    expect(c.damageDealt).toBe(58);
  });

  it("detects lethal combo where opponent dies offstage without landing, ledge, or extra damage", () => {
    const frames: Frame[] = [];
    // Lead-in neutral frame
    frames.push(
      makeFrame(
        0,
        { state: 0x0a, x: 0, y: 0 },
        { state: 0x0a, x: 100, y: 0, dmg: 0 },
      ),
    );
    // Combo from frame 1 to 40 (3 hits, 0% -> 42%)
    for (let f = 1; f <= 40; f++) {
      frames.push(
        makeFrame(
          f,
          { state: 0xcc, x: 0, y: 0 },
          { state: 0x33, x: 1000, y: 200, dmg: 42, comboHit: 3, hitstun: 10 },
        ),
      );
    }
    // Hitstun ends at frame 41, opponent is falling in the air offstage (0x1a)
    for (let f = 41; f <= 70; f++) {
      frames.push(
        makeFrame(
          f,
          { state: 0x0a, x: 0, y: 0 },
          { state: 0x1a, x: 2500, y: -200 - f * 20, dmg: 42, grounded: false },
        ),
      );
    }
    // Opponent falls into bottom blast zone at frame 71
    frames.push(
      makeFrame(
        71,
        { state: 0x0a, x: 0, y: 0 },
        { state: 0x00, x: 2500, y: -5000, dmg: 42, stocks: 3 },
      ),
    );

    const combos = computeKillCombos(makeMockReplay(frames));
    expect(combos.length).toBe(1);
    expect(combos[0]?.hitCount).toBe(3);
    expect(combos[0]?.startDamage).toBe(0);
    expect(combos[0]?.endDamage).toBe(42);
  });

  it("cancels kill combo if opponent lands safely on stage before dying", () => {
    const frames: Frame[] = [];
    // 3-hit combo
    for (let f = 0; f <= 40; f++) {
      frames.push(
        makeFrame(
          f,
          { state: 0xcc, x: 0, y: 0 },
          { state: 0x33, x: 200, y: 50, dmg: 45, comboHit: 3, hitstun: 5 },
        ),
      );
    }
    // Opponent lands on stage (grounded: true, state: 0x1f LandingLight)
    for (let f = 41; f <= 60; f++) {
      frames.push(
        makeFrame(
          f,
          { state: 0x0a, x: 0, y: 0 },
          { state: 0x1f, x: 200, y: 0, dmg: 45, grounded: true },
        ),
      );
    }
    // Much later, dies to something else
    frames.push(
      makeFrame(
        100,
        { state: 0x0a, x: 0, y: 0 },
        { state: 0x00, x: 0, y: -5000, dmg: 45, stocks: 3 },
      ),
    );

    const combos = computeKillCombos(makeMockReplay(frames));
    expect(combos.length).toBe(0);
  });

  it("does not count 3-hit combo if it dropped and a separate 2-hit combo finished the kill", () => {
    const frames: Frame[] = [];
    // Hit 1: 0% -> 10%
    frames.push(
      makeFrame(
        10,
        { state: 0x0a, x: 0, y: 0 },
        { state: 0x36, x: 50, y: 0, dmg: 10, comboHit: 1, hitstun: 20 },
      ),
    );
    // Hit 2: 10% -> 20%
    frames.push(
      makeFrame(
        15,
        { state: 0x0a, x: 0, y: 0 },
        { state: 0x36, x: 100, y: 0, dmg: 20, comboHit: 2, hitstun: 20 },
      ),
    );
    // Hit 3: 20% -> 30%
    frames.push(
      makeFrame(
        20,
        { state: 0x0a, x: 0, y: 0 },
        { state: 0x36, x: 150, y: 0, dmg: 30, comboHit: 3, hitstun: 20 },
      ),
    );
    // Combo dropped: hits resets to 1 with a new hit dealing extra damage!
    frames.push(
      makeFrame(
        45,
        { state: 0x0a, x: 0, y: 0 },
        { state: 0x36, x: 200, y: 0, dmg: 45, comboHit: 1, hitstun: 20 },
      ),
    );
    // Hit 2 of second combo: 45% -> 60% (launch into blastzone)
    frames.push(
      makeFrame(
        50,
        { state: 0x0a, x: 0, y: 0 },
        { state: 0x34, x: 300, y: 0, dmg: 60, comboHit: 2, hitstun: 60 },
      ),
    );
    // Victim dies at frame 70
    frames.push(
      makeFrame(
        70,
        { state: 0x0a, x: 0, y: 0 },
        { state: 0x00, x: 5000, y: 0, dmg: 60, stocks: 3 },
      ),
    );

    const combos = computeKillCombos(makeMockReplay(frames));
    // Neither sequence was a valid >=3 hit kill combo!
    expect(combos.length).toBe(0);
  });
});
