import { describe, it, expect } from "vitest";
import {
  findSituations,
  situationClips,
  stageZoneOf,
  type SituationQuery,
} from "./situations.js";
import {
  createEmptyCounters,
  type GameSummary,
  type OpeningRecord,
} from "./gameSummary.js";
import { createDefaultIdentity } from "./identity.js";
import { DREAM_LAND_STAGE_ID } from "../stageGeometry.js";

const PIKACHU = 0x09;
const PIKACHU_JP = 0x32;
const YOSHI = 0x06;
const UAIR = 0x0d4;
const FAIR = 0x0d2;

function opening(over: Partial<OpeningRecord>): OpeningRecord {
  return {
    frameIndex: 600,
    endFrameIndex: 700,
    attackerPort: 0,
    reason: "whiff-punish",
    isGrab: false,
    move: UAIR,
    victimDamage: 50,
    victimX: 0,
    victimY: 0,
    victimGrounded: true,
    damage: 20,
    hits: 3,
    killed: false,
    outcome: "reset",
    ...over,
  };
}

let n = 0;
function game(
  p0: { name: string; char: number },
  p1: { name: string; char: number },
  openings: OpeningRecord[] | undefined,
): GameSummary {
  const id = `g${n++}`;
  return {
    id,
    sourceName: `${id}.rmgr`,
    recordedAt: new Date("2026-09-01T10:00:00Z"),
    stageId: DREAM_LAND_STAGE_ID,
    frameCount: 5000,
    isComplete: true,
    ports: [
      { port: 0, playerName: p0.name, characterId: p0.char, finalStocks: 1 },
      { port: 1, playerName: p1.name, characterId: p1.char, finalStocks: 0 },
    ],
    statsByPort: { 0: createEmptyCounters(), 1: createEmptyCounters() },
    openings,
    source: null,
  };
}

const identity = createDefaultIdentity("nue");
identity.aliases.add("nue");

const anything: SituationQuery = {
  attackerFamily: null,
  victimFamily: null,
  minDamage: 0,
  maxDamage: 999,
  zones: [],
  punisher: "anyone",
  kind: "any",
};

describe("stageZoneOf", () => {
  it("mirrors left/right and splits Dream Land into a 3x3 grid", () => {
    expect(stageZoneOf(0, 0)).toBe("center-low");
    expect(stageZoneOf(-1400, 905)).toBe("side-mid");
    expect(stageZoneOf(1400, 905)).toBe("side-mid");
    expect(stageZoneOf(200, 1542)).toBe("center-high");
    expect(stageZoneOf(-2600, -400)).toBe("offstage-low");
  });
});

describe("findSituations", () => {
  const nueVsWario = game(
    { name: "nue", char: PIKACHU },
    { name: "Wario", char: PIKACHU_JP },
    [
      opening({ attackerPort: 0, victimDamage: 60, damage: 35, move: UAIR }),
      opening({
        attackerPort: 1,
        victimDamage: 65,
        damage: 48,
        move: FAIR,
        killed: true,
      }),
      opening({ attackerPort: 1, victimDamage: 10, damage: 70, move: UAIR }),
      opening({
        attackerPort: 1,
        victimDamage: 70,
        isGrab: true,
        move: 0x0a6,
        damage: 25,
        victimX: 2000,
      }),
    ],
  );
  // A game the library holds between two other players.
  const thirdParty = game(
    { name: "kix", char: PIKACHU },
    { name: "Kurabba", char: YOSHI },
    [opening({ attackerPort: 0, victimDamage: 55, damage: 41 })],
  );
  const legacy = game(
    { name: "nue", char: PIKACHU },
    { name: "somei", char: PIKACHU },
    undefined,
  );
  const library = [nueVsWario, thirdParty, legacy, nueVsWario];

  it("matches by percent range and pools region variants of a character", () => {
    const r = findSituations(library, identity, {
      ...anything,
      attackerFamily: PIKACHU,
      victimFamily: PIKACHU,
      minDamage: 50,
      maxDamage: 80,
    });
    expect(r.matches.map((m) => m.opening.damage)).toEqual([48, 35, 25]);
    expect(r.gamesSearched).toBe(2);
    expect(r.gamesWithoutIndex).toBe(1);
  });

  it("ranks kills first, then damage", () => {
    const r = findSituations(library, identity, anything);
    expect(r.matches[0]!.opening.killed).toBe(true);
    expect(r.matches.slice(1).map((m) => m.opening.damage)).toEqual([
      70, 41, 35, 25,
    ]);
  });

  it("filters by stage zone, punisher and opening type", () => {
    expect(
      findSituations(library, identity, { ...anything, zones: ["side-low"] })
        .matches,
    ).toHaveLength(1);
    expect(
      findSituations(library, identity, {
        ...anything,
        punisher: "you",
      }).matches.map((m) => m.attackerName),
    ).toEqual(["nue"]);
    // Opponents = the people you played, so kix's third-party game is out.
    expect(
      findSituations(library, identity, {
        ...anything,
        punisher: "opponents",
      }).matches.every((m) => m.attackerName === "Wario"),
    ).toBe(true);
    expect(
      findSituations(library, identity, { ...anything, kind: "grab" }).matches,
    ).toHaveLength(1);
  });

  it("summarizes each opening move with average, median and kill rate", () => {
    const r = findSituations(library, identity, {
      ...anything,
      attackerFamily: PIKACHU,
    });
    const uair = r.byMove.find((m) => m.move === UAIR)!;
    expect(uair.count).toBe(3);
    expect(uair.averageDamage).toBeCloseTo((35 + 70 + 41) / 3);
    expect(uair.medianDamage).toBe(41);
    expect(uair.killRate).toBe(0);
    const fair = r.byMove.find((m) => m.move === FAIR)!;
    expect(fair.killRate).toBe(100);
    expect(r.byMove.find((m) => m.isGrab)?.move).toBeNull();
    // Up air (3 samples, avg ~48.7) outranks fair (1 sample, 48) and the grab (1 sample).
    expect(r.byMove[0]!.move).toBe(UAIR);
  });

  it("clips each match with lead-in, clamped to the game", () => {
    const r = findSituations([nueVsWario], identity, {
      ...anything,
      punisher: "you",
    });
    expect(situationClips(r.matches, () => "x")[0]).toEqual({
      gameId: nueVsWario.id,
      startFrameIndex: 510,
      endFrameIndex: 745,
      label: "x",
    });
  });
});
