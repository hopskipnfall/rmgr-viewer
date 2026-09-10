import { describe, it, expect } from "vitest";
import type { Frame, PortIndex, Replay } from "@rmg-k/rmgr";
import { computeClassifiedSituations } from "./classifiedSituations.js";
import { DREAM_LAND_STAGE_ID } from "./stageGeometry.js";

// Fox fixtures probed directly against classify() (jumpsRemaining=0, actionStateId=0x39,
// facingDirection irrelevant -- Fox is facing-independent):
//   (20000, -5000, vx=5,  vy=-30) -> "dead"
//   (3000,      0, vx=0,  vy=0)   -> "reaches-stage"
//   (5100,   -500, vx=0,  vy=-10) -> "dead-if-ledge-occupied"
const CHAR_FOX = 1;
const CHAR_KIRBY = 8; // unsupported by the classifier -- used for the edge-guarder, who never
// leaves the zone in these fixtures anyway, so its own classification never matters.

const DEAD_FIXTURE = { x: 20000, y: -5000, vx: 5, vy: -30 };
const FREE_FIXTURE = { x: 3000, y: 0, vx: 0, vy: 0 };
const CONTESTABLE_FIXTURE = { x: 5100, y: -500, vx: 0, vy: -10 };

const ACTION_STATE_HITSTUN = 0x037;
const ACTION_STATE_FALL = 0x039;
const ACTION_STATE_STAND = 0x00e;
const ACTION_STATE_DEAD = 0x000;
const ACTION_STATE_CLIFF_CATCH = 0x054;

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
  jumpsRemaining?: number;
}

function makeFrame(frameNumber: number, p0: PortState, p1: PortState): Frame {
  const post = (port: PortIndex, p: PortState) => ({
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
      characterId: p.characterId,
      actionStateId: p.state,
      positionX: p.x,
      positionY: p.y,
      facingDirection: 1 as const,
      velocityX: p.vx ?? 0,
      velocityY: p.vy ?? 0,
      damagePercent: p.dmg ?? 0,
      stocksRemaining: p.stocks ?? 3,
      jumpsRemaining: p.jumpsRemaining ?? 0,
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
      post(0 as PortIndex, p0),
      post(1 as PortIndex, p1),
    ] as unknown as Frame["ports"],
  };
}

const EDGE_GUARDER_ONSTAGE: PortState = {
  characterId: CHAR_KIRBY,
  state: ACTION_STATE_STAND,
  x: 0,
  y: 0,
  grounded: true,
  hitstun: 0,
};

describe("computeClassifiedSituations", () => {
  it("categorizes a genuinely unsurvivable situation as hopeless, with neither flag set", () => {
    const frames: Frame[] = [
      makeFrame(0, EDGE_GUARDER_ONSTAGE, {
        characterId: CHAR_FOX,
        state: ACTION_STATE_HITSTUN,
        x: DEAD_FIXTURE.x,
        y: DEAD_FIXTURE.y,
        vx: DEAD_FIXTURE.vx,
        vy: DEAD_FIXTURE.vy,
        hitstun: 5,
        dmg: 50,
      }),
      // f1: hitstun ends while still outside the zone -- both the edgeGuard situation and the
      // recovery-verdict trigger fire here, on a fixture confirmed to classify() as "dead".
      makeFrame(1, EDGE_GUARDER_ONSTAGE, {
        characterId: CHAR_FOX,
        state: ACTION_STATE_FALL,
        x: DEAD_FIXTURE.x,
        y: DEAD_FIXTURE.y,
        vx: DEAD_FIXTURE.vx,
        vy: DEAD_FIXTURE.vy,
        hitstun: 0,
        dmg: 50,
      }),
      // f2: stock lost -- resolves as recovery-failure. No damage change on the recovering port
      // anywhere in the window, so there's no hit to correlate an accidental save against either.
      makeFrame(2, EDGE_GUARDER_ONSTAGE, {
        characterId: CHAR_FOX,
        state: ACTION_STATE_DEAD,
        x: DEAD_FIXTURE.x,
        y: DEAD_FIXTURE.y - 500,
        vx: DEAD_FIXTURE.vx,
        vy: DEAD_FIXTURE.vy,
        hitstun: 0,
        dmg: 50,
        stocks: 2,
      }),
    ];

    const situations = computeClassifiedSituations(makeMockReplay(frames));
    expect(situations).toHaveLength(1);
    expect(situations[0]).toMatchObject({
      recoveringPort: 1,
      edgeGuardingPort: 0,
      enteredFrameIndex: 1,
      resolutionFrameIndex: 2,
      resolutionKind: "recovery-failure",
      entryVerdict: "dead",
      category: "hopeless",
      edgeGuarderHeldLedge: false,
      missedLedgeHogOpportunity: false,
      possibleAccidentalSave: false,
    });
  });

  it("categorizes a guaranteed-safe situation as free", () => {
    const frames: Frame[] = [
      makeFrame(0, EDGE_GUARDER_ONSTAGE, {
        characterId: CHAR_FOX,
        state: ACTION_STATE_HITSTUN,
        x: FREE_FIXTURE.x,
        y: FREE_FIXTURE.y,
        vx: FREE_FIXTURE.vx,
        vy: FREE_FIXTURE.vy,
        hitstun: 5,
        dmg: 50,
      }),
      makeFrame(1, EDGE_GUARDER_ONSTAGE, {
        characterId: CHAR_FOX,
        state: ACTION_STATE_FALL,
        x: FREE_FIXTURE.x,
        y: FREE_FIXTURE.y,
        vx: FREE_FIXTURE.vx,
        vy: FREE_FIXTURE.vy,
        hitstun: 0,
        dmg: 50,
      }),
    ];
    // f2..f31: 30 consecutive grounded, actionable, inside-zone frames -> recovery-success via
    // the 0.5s safety clock.
    for (let f = 2; f <= 31; f++) {
      frames.push(
        makeFrame(f, EDGE_GUARDER_ONSTAGE, {
          characterId: CHAR_FOX,
          state: ACTION_STATE_STAND,
          x: 100,
          y: 0,
          grounded: true,
          hitstun: 0,
          dmg: 50,
        }),
      );
    }

    const situations = computeClassifiedSituations(makeMockReplay(frames));
    expect(situations).toHaveLength(1);
    expect(situations[0]).toMatchObject({
      resolutionKind: "recovery-success",
      entryVerdict: "reaches-stage",
      category: "free",
      edgeGuarderHeldLedge: false,
      missedLedgeHogOpportunity: false,
      possibleAccidentalSave: false,
    });
  });

  it("flags a missed ledge-hog opportunity: contestable, edge-guarder never holds the ledge, recovering player escapes via the ledge", () => {
    const frames: Frame[] = [
      makeFrame(0, EDGE_GUARDER_ONSTAGE, {
        characterId: CHAR_FOX,
        state: ACTION_STATE_HITSTUN,
        x: CONTESTABLE_FIXTURE.x,
        y: CONTESTABLE_FIXTURE.y,
        vx: CONTESTABLE_FIXTURE.vx,
        vy: CONTESTABLE_FIXTURE.vy,
        hitstun: 5,
        dmg: 50,
      }),
      makeFrame(1, EDGE_GUARDER_ONSTAGE, {
        characterId: CHAR_FOX,
        state: ACTION_STATE_FALL,
        x: CONTESTABLE_FIXTURE.x,
        y: CONTESTABLE_FIXTURE.y,
        vx: CONTESTABLE_FIXTURE.vx,
        vy: CONTESTABLE_FIXTURE.vy,
        hitstun: 0,
        dmg: 50,
      }),
      // f2: grabs the ledge -- the edge-guarder (still onstage, never touched the ledge) could
      // have prevented this simply by holding it.
      makeFrame(2, EDGE_GUARDER_ONSTAGE, {
        characterId: CHAR_FOX,
        state: ACTION_STATE_CLIFF_CATCH,
        x: 2200,
        y: 0,
        hitstun: 0,
        dmg: 50,
      }),
    ];

    const situations = computeClassifiedSituations(makeMockReplay(frames));
    expect(situations).toHaveLength(1);
    expect(situations[0]).toMatchObject({
      resolutionKind: "recovery-success",
      entryVerdict: "dead-if-ledge-occupied",
      category: "contestable",
      edgeGuarderHeldLedge: false,
      missedLedgeHogOpportunity: true,
      possibleAccidentalSave: false,
    });
  });

  it("flags a possible accidental save: hopeless situation, edge-guarder lands a hit, recovering player survives anyway", () => {
    const frames: Frame[] = [
      makeFrame(0, EDGE_GUARDER_ONSTAGE, {
        characterId: CHAR_FOX,
        state: ACTION_STATE_HITSTUN,
        x: DEAD_FIXTURE.x,
        y: DEAD_FIXTURE.y,
        vx: DEAD_FIXTURE.vx,
        vy: DEAD_FIXTURE.vy,
        hitstun: 5,
        dmg: 50,
      }),
      makeFrame(1, EDGE_GUARDER_ONSTAGE, {
        characterId: CHAR_FOX,
        state: ACTION_STATE_FALL,
        x: DEAD_FIXTURE.x,
        y: DEAD_FIXTURE.y,
        vx: DEAD_FIXTURE.vx,
        vy: DEAD_FIXTURE.vy,
        hitstun: 0,
        dmg: 50,
      }),
      // f2: the edge-guarder's own attack connects (damagePercent jump on the recovering port,
      // with the edge-guarder as the only other seated port -- extractAllHitsWithDI attributes it
      // to them automatically).
      makeFrame(2, EDGE_GUARDER_ONSTAGE, {
        characterId: CHAR_FOX,
        state: ACTION_STATE_FALL,
        x: DEAD_FIXTURE.x,
        y: DEAD_FIXTURE.y,
        vx: DEAD_FIXTURE.vx,
        vy: DEAD_FIXTURE.vy,
        hitstun: 0,
        dmg: 65,
      }),
      // f3: against the odds, grabs the ledge anyway.
      makeFrame(3, EDGE_GUARDER_ONSTAGE, {
        characterId: CHAR_FOX,
        state: ACTION_STATE_CLIFF_CATCH,
        x: 2200,
        y: 0,
        hitstun: 0,
        dmg: 65,
      }),
    ];

    const situations = computeClassifiedSituations(makeMockReplay(frames));
    expect(situations).toHaveLength(1);
    expect(situations[0]).toMatchObject({
      resolutionKind: "recovery-success",
      entryVerdict: "dead",
      category: "hopeless",
      edgeGuarderHeldLedge: false,
      // "hopeless" -- not "contestable" -- so this is an accidental save, not a missed ledge hog,
      // even though the resolution frame happens to also be a ledge-action-state.
      missedLedgeHogOpportunity: false,
      possibleAccidentalSave: true,
    });
  });
});
