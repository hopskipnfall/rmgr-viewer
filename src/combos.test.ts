import { describe, it, expect } from "vitest";
import type { Frame, PortIndex, Replay } from "@rmg-k/rmgr";
import {
  computeCombos,
  computeKillCombos,
  joinCombosAcrossGaps,
  COMBO_JUMP_LEAD_IN_FRAMES,
  type Combo,
} from "./combos.js";
import { computeComboClips, type ComboSearchCriteria } from "./playlist.js";
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
      characterId: [1, 0, 0, 0], // Fox, Mario
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

/**
 * A 3-hit true combo (frames 10-20) on port 1, the combo meter resets, then
 * 25 frames later a separate 2-hit combo launches them into the blast zone.
 */
function droppedComboFrames(): Frame[] {
  return [
    makeFrame(
      10,
      { state: 0x0a, x: 0, y: 0 },
      { state: 0x36, x: 50, y: 0, dmg: 10, comboHit: 1, hitstun: 20 },
    ),
    makeFrame(
      15,
      { state: 0x0a, x: 0, y: 0 },
      { state: 0x36, x: 100, y: 0, dmg: 20, comboHit: 2, hitstun: 20 },
    ),
    makeFrame(
      20,
      { state: 0x0a, x: 0, y: 0 },
      { state: 0x36, x: 150, y: 0, dmg: 30, comboHit: 3, hitstun: 20 },
    ),
    makeFrame(
      45,
      { state: 0x0a, x: 0, y: 0 },
      { state: 0x36, x: 200, y: 0, dmg: 45, comboHit: 1, hitstun: 20 },
    ),
    makeFrame(
      50,
      { state: 0x0a, x: 0, y: 0 },
      { state: 0x34, x: 300, y: 0, dmg: 60, comboHit: 2, hitstun: 60 },
    ),
    makeFrame(
      70,
      { state: 0x0a, x: 0, y: 0 },
      { state: 0x00, x: 5000, y: 0, dmg: 60, stocks: 3 },
    ),
  ];
}

describe("computeCombos (every combo, with whether it killed)", () => {
  it("reports a combo that didn't kill, ending on its last comboed frame", () => {
    const frames: Frame[] = [
      makeFrame(
        10,
        { state: 0x0a, x: 0, y: 0 },
        { state: 0x36, x: 50, y: 0, dmg: 10, comboHit: 1, hitstun: 20 },
      ),
      makeFrame(
        15,
        { state: 0x0a, x: 0, y: 0 },
        { state: 0x36, x: 100, y: 0, dmg: 20, comboHit: 2, hitstun: 20 },
      ),
      makeFrame(
        20,
        { state: 0x0a, x: 0, y: 0 },
        { state: 0x36, x: 150, y: 0, dmg: 30, comboHit: 3, hitstun: 20 },
      ),
      // Out of hitstun, standing on stage: the combo is over and they're safe.
      makeFrame(
        40,
        { state: 0x0a, x: 0, y: 0 },
        { state: 0x0a, x: 150, y: 0, dmg: 30, grounded: true },
      ),
      makeFrame(
        45,
        { state: 0x0a, x: 0, y: 0 },
        { state: 0x0a, x: 150, y: 0, dmg: 30, grounded: true },
      ),
    ];

    const combos = computeCombos(makeMockReplay(frames));
    expect(combos).toHaveLength(1);
    expect(combos[0]).toMatchObject({
      attackerPort: 0,
      victimPort: 1,
      hitCount: 3,
      killed: false,
      startFrame: 10,
      endFrame: 20,
      comboEndFrame: 20,
      // First frame of the replay: no earlier frame to read pre-hit damage from.
      startDamage: 10,
      endDamage: 30,
    });
  });

  it("splits a dropped combo into two true combos, crediting the kill to the second", () => {
    const combos = computeCombos(makeMockReplay(droppedComboFrames()));
    expect(
      combos.map((c) => [c.startFrame, c.hitCount, c.killed, c.comboEndFrame]),
    ).toEqual([
      [10, 3, false, 20],
      [45, 2, true, 70],
    ]);
  });

  it("computeKillCombos still only credits 3+ hit combos that killed", () => {
    expect(computeKillCombos(makeMockReplay(droppedComboFrames()))).toEqual([]);
  });
});

describe("joinCombosAcrossGaps", () => {
  it("joins combos whose meter reset for 0.5s or less into one", () => {
    const joined = joinCombosAcrossGaps(
      computeCombos(makeMockReplay(droppedComboFrames())),
    );
    expect(joined).toHaveLength(1);
    expect(joined[0]).toMatchObject({
      startFrame: 10,
      hitCount: 5,
      killed: true,
      startDamage: 10,
      endDamage: 60,
    });
  });

  it("keeps combos separate when the gap is longer than 0.5s", () => {
    const combos = computeCombos(makeMockReplay(droppedComboFrames()));
    // The gap between the two is 25 frames (20 -> 45).
    expect(joinCombosAcrossGaps(combos, 24)).toHaveLength(2);
  });

  it("keeps combos separate when the victim hit back in between", () => {
    const a = computeCombos(makeMockReplay(droppedComboFrames()));
    // A combo by port 1 on port 0 during the gap breaks the string.
    const counter: Combo = {
      ...a[0]!,
      attackerPort: 1,
      victimPort: 0,
      startFrame: 30,
      comboEndFrame: 35,
      endFrame: 35,
      hitCount: 1,
      killed: false,
    };
    expect(joinCombosAcrossGaps([...a, counter])).toHaveLength(3);
  });
});

describe("computeComboClips", () => {
  const replay = makeMockReplay(droppedComboFrames());
  const label = (c: Combo) => `${c.hitCount}${c.killed ? " KO" : ""}`;
  const base: ComboSearchCriteria = {
    attackerPort: null,
    victimPort: null,
    attackerCharacterId: null,
    victimCharacterId: null,
    minHits: 3,
    killed: null,
    allowGaps: false,
  };
  const clips = (criteria: Partial<ComboSearchCriteria>) =>
    computeComboClips(replay, "g1", { ...base, ...criteria }, label).map(
      (c) => c.label,
    );

  it("true combos only: the 3-hit string, which didn't kill", () => {
    expect(clips({})).toEqual(["3"]);
    expect(clips({ killed: true })).toEqual([]);
    expect(clips({ killed: false })).toEqual(["3"]);
  });

  it("allowing short gaps: one 5-hit combo that killed", () => {
    expect(clips({ allowGaps: true })).toEqual(["5 KO"]);
    expect(clips({ allowGaps: true, minHits: 6 })).toEqual([]);
    expect(clips({ allowGaps: true, killed: false })).toEqual([]);
  });

  it("filters by who did it and who it was done on, and their characters", () => {
    expect(clips({ attackerPort: 0, victimPort: 1 })).toEqual(["3"]);
    expect(clips({ attackerPort: 1 })).toEqual([]);
    expect(clips({ attackerCharacterId: 1, victimCharacterId: 0 })).toEqual([
      "3",
    ]);
    expect(clips({ victimCharacterId: 1 })).toEqual([]);
  });

  it("pads each clip by 1s either side, clamped to the replay", () => {
    const [clip] = computeComboClips(replay, "g1", base, label);
    expect(clip).toMatchObject({
      gameId: "g1",
      startFrameIndex: 0,
      endFrameIndex: 5,
    });
  });
});

describe("computeKillCombos: recovery-classifier-confirmed hopeless kills", () => {
  // Fox fixture confirmed by classify() to be "dead" regardless of any input (see
  // classifiedSituations.test.ts's own use of this exact fixture/frame sequence, which this test
  // mirrors) -- jumpsRemaining=0, action-state transition from hitstun into Fall while still
  // outside the zone.
  const DEAD_FIXTURE = { x: 20000, y: -5000, vx: 5, vy: -30 };
  const CHAR_FOX = 1;
  const CHAR_KIRBY = 8; // edge-guarder here -- only the RECOVERING port's character is ever
  // passed to classify(), so this could be any character at all.
  const ACTION_STATE_HITSTUN = 0x037;
  const ACTION_STATE_FALL = 0x039;
  const ACTION_STATE_DEAD = 0x000;
  const ACTION_STATE_STAND = 0x00e;

  interface RichPortState {
    characterId: number;
    state: number;
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    dmg?: number;
    stocks?: number;
    grounded?: boolean;
    hitstun?: number;
    comboHit?: number;
  }

  function makeRichFrame(
    frameNumber: number,
    p0: RichPortState,
    p1: RichPortState,
  ): Frame {
    const post = (port: PortIndex, p: RichPortState) => ({
      input: { frame: frameNumber, port, buttons: 0, stickX: 0, stickY: 0 },
      state: {
        frame: frameNumber,
        port,
        characterId: p.characterId,
        actionStateId: p.state,
        positionX: p.x,
        positionY: p.y,
        facingDirection: 1 as const,
        velocityX: p.vx ?? 0,
        velocityY: p.vy ?? 0,
        damagePercent: p.dmg ?? 0,
        stocksRemaining: p.stocks ?? 4,
        jumpsRemaining: 0,
        grounded: p.grounded ?? false,
        hurtboxState: 0,
        hitstunCounter: p.hitstun ?? 0,
        actionFrameCounter: 0,
        comboHitCount: p.comboHit ?? 0,
      },
    });
    return {
      frame: frameNumber,
      ports: [
        post(0 as PortIndex, p0),
        post(1 as PortIndex, p1),
      ] as unknown as Frame["ports"],
    };
  }

  function makeRichMockReplay(frames: Frame[]): Replay {
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
        playerNames: ["edgeguarder", "recoverer", "", ""],
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
        characterId: [CHAR_KIRBY, CHAR_FOX, 0, 0],
        costumeId: [0, 0, 0, 0],
        teamColor: [0, 0, 0, 0],
        portTeam: [0, 1, 0, 0],
        portHandicap: [0, 0, 0, 0],
        portCpuLevel: [0, 0, 0, 0],
      },
      frames,
      matchEnd: { finalFrame: frames.at(-1)?.frame ?? 0, endReason: "normal" },
      matchResult: { placements: [0, 1, -1, -1] },
    };
  }

  it("credits a kill combo the instant the classifier confirms the position is hopeless, without waiting on this file's own landed/ledge/damage tracking", () => {
    const frames: Frame[] = [
      // f0: victim (port1, Fox) in hitstun at a fixture confirmed dead by classify(); combo hit
      // count reaches 3.
      makeRichFrame(
        0,
        {
          characterId: CHAR_KIRBY,
          state: ACTION_STATE_STAND,
          x: 0,
          y: 0,
          grounded: true,
        },
        {
          characterId: CHAR_FOX,
          state: ACTION_STATE_HITSTUN,
          x: DEAD_FIXTURE.x,
          y: DEAD_FIXTURE.y,
          vx: DEAD_FIXTURE.vx,
          vy: DEAD_FIXTURE.vy,
          hitstun: 5,
          dmg: 50,
          comboHit: 3,
        },
      ),
      // f1: hitstun ends while still outside the zone -- both edgeGuard.ts's situation-entered
      // trigger and this file's own "no longer isCombod" transition fire here, on the same frame.
      makeRichFrame(
        1,
        {
          characterId: CHAR_KIRBY,
          state: ACTION_STATE_STAND,
          x: 0,
          y: 0,
          grounded: true,
        },
        {
          characterId: CHAR_FOX,
          state: ACTION_STATE_FALL,
          x: DEAD_FIXTURE.x,
          y: DEAD_FIXTURE.y,
          vx: DEAD_FIXTURE.vx,
          vy: DEAD_FIXTURE.vy,
          hitstun: 0,
          dmg: 50,
        },
      ),
      // f2: stock lost. The point of this test is that the kill is credited at f1, not f2 -- the
      // shortcut doesn't wait for this frame at all.
      makeRichFrame(
        2,
        {
          characterId: CHAR_KIRBY,
          state: ACTION_STATE_STAND,
          x: 0,
          y: 0,
          grounded: true,
        },
        {
          characterId: CHAR_FOX,
          state: ACTION_STATE_DEAD,
          x: DEAD_FIXTURE.x,
          y: DEAD_FIXTURE.y - 500,
          vx: DEAD_FIXTURE.vx,
          vy: DEAD_FIXTURE.vy,
          hitstun: 0,
          dmg: 50,
          stocks: 3,
        },
      ),
    ];

    const combos = computeKillCombos(makeRichMockReplay(frames));
    expect(combos.length).toBe(1);
    expect(combos[0]).toMatchObject({
      attackerPort: 0,
      victimPort: 1,
      hitCount: 3,
      startFrame: 0,
      endFrameIndex: 2,
    });
  });

  it("does NOT credit a kill combo when the classifier says the victim could still get back, even if they then die", () => {
    // Per the user: "a combo that ultimately converted to a kill, but the combo did not KO"
    // (e.g. 260828205834-nue-Kurabba-29's combo at frame 4368). classify() rates a jumpless Fox
    // here "reaches-stage" -- category "contestable".
    const CONTESTABLE_FIXTURE = { x: -3000, y: 200, vx: 0, vy: -10 };
    const guarder = {
      characterId: CHAR_KIRBY,
      state: ACTION_STATE_STAND,
      x: 0,
      y: 0,
      grounded: true,
    };
    const frames: Frame[] = [
      makeRichFrame(0, guarder, {
        characterId: CHAR_FOX,
        state: ACTION_STATE_HITSTUN,
        ...CONTESTABLE_FIXTURE,
        hitstun: 5,
        dmg: 50,
        comboHit: 3,
      }),
      // Hitstun ends with the stage still reachable...
      makeRichFrame(1, guarder, {
        characterId: CHAR_FOX,
        state: ACTION_STATE_FALL,
        ...CONTESTABLE_FIXTURE,
        hitstun: 0,
        dmg: 50,
      }),
      // ...but they die anyway, untouched.
      makeRichFrame(2, guarder, {
        characterId: CHAR_FOX,
        state: ACTION_STATE_DEAD,
        ...CONTESTABLE_FIXTURE,
        y: CONTESTABLE_FIXTURE.y - 4000,
        hitstun: 0,
        dmg: 50,
        stocks: 3,
      }),
    ];
    const replay = makeRichMockReplay(frames);

    expect(computeKillCombos(replay)).toEqual([]);
    const combos = computeCombos(replay).filter((c) => c.hitCount >= 3);
    expect(combos).toHaveLength(1);
    expect(combos[0]).toMatchObject({ hitCount: 3, killed: false });
  });

  it("credits the kill even when the replay ends mid-fall with no literal death recorded -- edgeGuard.ts treats an unresolved situation at end-of-replay as a recovery-failure, and the classifier already knows the position was hopeless", () => {
    const frames: Frame[] = [
      makeRichFrame(
        0,
        {
          characterId: CHAR_KIRBY,
          state: ACTION_STATE_STAND,
          x: 0,
          y: 0,
          grounded: true,
        },
        {
          characterId: CHAR_FOX,
          state: ACTION_STATE_HITSTUN,
          x: DEAD_FIXTURE.x,
          y: DEAD_FIXTURE.y,
          vx: DEAD_FIXTURE.vx,
          vy: DEAD_FIXTURE.vy,
          hitstun: 5,
          dmg: 50,
          comboHit: 3,
        },
      ),
      // f1: hitstun ends -- the replay simply stops here, still outside the zone, no landing/
      // ledge/death ever recorded. This is exactly the real-world case of a match-ending combo
      // where the recording cuts before the death animation plays out.
      makeRichFrame(
        1,
        {
          characterId: CHAR_KIRBY,
          state: ACTION_STATE_STAND,
          x: 0,
          y: 0,
          grounded: true,
        },
        {
          characterId: CHAR_FOX,
          state: ACTION_STATE_FALL,
          x: DEAD_FIXTURE.x,
          y: DEAD_FIXTURE.y,
          vx: DEAD_FIXTURE.vx,
          vy: DEAD_FIXTURE.vy,
          hitstun: 0,
          dmg: 50,
        },
      ),
    ];

    const combos = computeKillCombos(makeRichMockReplay(frames));
    expect(combos.length).toBe(1);
    expect(combos[0]).toMatchObject({ victimPort: 1, hitCount: 3 });
  });

  it("does NOT credit a kill for an unsupported character in the same truncated-replay scenario -- falls through to the existing pending-lethal tracking unchanged, which correctly stays unresolved", () => {
    const CHAR_MARIO = 0; // unsupported by the recovery classifier
    const frames: Frame[] = [
      makeRichFrame(
        0,
        {
          characterId: CHAR_KIRBY,
          state: ACTION_STATE_STAND,
          x: 0,
          y: 0,
          grounded: true,
        },
        {
          characterId: CHAR_MARIO,
          state: ACTION_STATE_HITSTUN,
          x: DEAD_FIXTURE.x,
          y: DEAD_FIXTURE.y,
          vx: DEAD_FIXTURE.vx,
          vy: DEAD_FIXTURE.vy,
          hitstun: 5,
          dmg: 50,
          comboHit: 3,
        },
      ),
      makeRichFrame(
        1,
        {
          characterId: CHAR_KIRBY,
          state: ACTION_STATE_STAND,
          x: 0,
          y: 0,
          grounded: true,
        },
        {
          characterId: CHAR_MARIO,
          state: ACTION_STATE_FALL,
          x: DEAD_FIXTURE.x,
          y: DEAD_FIXTURE.y,
          vx: DEAD_FIXTURE.vx,
          vy: DEAD_FIXTURE.vy,
          hitstun: 0,
          dmg: 50,
        },
      ),
    ];

    const combos = computeKillCombos(makeRichMockReplay(frames));
    expect(combos.length).toBe(0);
  });
});
