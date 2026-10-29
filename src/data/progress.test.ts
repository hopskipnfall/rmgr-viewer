import { describe, it, expect } from "vitest";
import { computeProgress, playedCharacterFamilies } from "./progress.js";
import { characterFamily } from "./characterFamily.js";
import {
  createEmptyCounters,
  type GameSummary,
  type RawCounters,
} from "./gameSummary.js";
import { createDefaultIdentity } from "./identity.js";
import { DREAM_LAND_STAGE_ID } from "../stageGeometry.js";

const PIKACHU = 0x09;
const PIKACHU_JP = 0x32;
const PIKACHU_EU = 0x2d;
const YOSHI = 0x06;
const FOX = 0x01;

let nextId = 0;

/** One game at `at`, you on port 0 with `won`/`lost` neutral openings. */
function game(opts: {
  at: Date;
  opp: string;
  won: number;
  lost: number;
  yourStocks: number;
  oppStocks: number;
  yourChar?: number;
  counters?: Partial<RawCounters>;
}): GameSummary {
  const counters: RawCounters = {
    ...createEmptyCounters(),
    openingsWon: opts.won,
    openingsLost: opts.lost,
    ...opts.counters,
  };
  const id = `g${nextId++}`;
  return {
    id,
    sourceName: `${id}.rmgr`,
    recordedAt: opts.at,
    stageId: DREAM_LAND_STAGE_ID,
    frameCount: 3600,
    isComplete: true,
    ports: [
      {
        port: 0,
        playerName: "nue",
        characterId: opts.yourChar ?? PIKACHU,
        finalStocks: opts.yourStocks,
      },
      {
        port: 1,
        playerName: opts.opp,
        characterId: YOSHI,
        finalStocks: opts.oppStocks,
      },
    ],
    lobbyNames: ["nue", opts.opp],
    statsByPort: { 0: counters, 1: createEmptyCounters() },
    source: null,
  };
}

/** `count` games 5 minutes apart starting at `day`, all with the same result and openings. */
function set(
  day: string,
  count: number,
  g: Omit<Parameters<typeof game>[0], "at">,
): GameSummary[] {
  const start = new Date(`${day}T18:00:00Z`).getTime();
  return Array.from({ length: count }, (_, i) =>
    game({ ...g, at: new Date(start + i * 5 * 60 * 1000) }),
  );
}

const identity = createDefaultIdentity("nue");
identity.aliases.add("nue");

describe("characterFamily", () => {
  it("maps JP and EU variants to the NA character and leaves others alone", () => {
    expect(characterFamily(PIKACHU_JP)).toBe(PIKACHU);
    expect(characterFamily(PIKACHU_EU)).toBe(PIKACHU);
    expect(characterFamily(PIKACHU)).toBe(PIKACHU);
    expect(characterFamily(52)).toBe(52); // Bowser (Remix)
  });
});

describe("computeProgress", () => {
  // Stronger opponents hold you to a lower opening share. A player who performs exactly at
  // expectation against both should show ~0 residual everywhere, even though raw share differs.
  const strongSet = (day: string) =>
    set(day, 8, {
      opp: "Wario",
      won: 40,
      lost: 60,
      yourStocks: 0,
      oppStocks: 3,
    });
  const weakSet = (day: string) =>
    set(day, 8, {
      opp: "somei",
      won: 60,
      lost: 40,
      yourStocks: 3,
      oppStocks: 0,
    });

  it("expects lower numbers against stronger opponents, so on-par sessions sit at zero", () => {
    const games = [
      ...strongSet("2026-08-01"),
      ...weakSet("2026-08-05"),
      ...strongSet("2026-09-01"),
      ...weakSet("2026-09-05"),
    ];
    const report = computeProgress(games, identity, PIKACHU);

    expect(report.points).toHaveLength(4);
    for (const p of report.points) {
      expect(p.metrics.openingShare?.residual).toBeCloseTo(0, 6);
    }
    const wario = report.points.find((p) => p.opponentName === "Wario")!;
    expect(wario.metrics.openingShare?.value).toBeCloseTo(40);
    expect(wario.metrics.openingShare?.expected).toBeCloseTo(40);
    expect(wario.opponentStrength).toBeGreaterThan(0);
  });

  it("shows a better-than-expected session against a strong opponent as positive", () => {
    const games = [
      ...strongSet("2026-08-01"),
      ...weakSet("2026-08-05"),
      ...weakSet("2026-08-10"),
      ...set("2026-09-01", 8, {
        opp: "Wario",
        won: 48,
        lost: 52,
        yourStocks: 0,
        oppStocks: 3,
      }),
    ];
    const report = computeProgress(games, identity, PIKACHU);
    const late = report.points[report.points.length - 1]!;
    expect(late.opponentName).toBe("Wario");
    expect(late.metrics.openingShare!.residual).toBeGreaterThan(0);
    expect(late.metrics.openingShare!.standardError).toBeGreaterThan(0);
  });

  it("flips the sign for lower-is-better metrics so positive always means better", () => {
    const leaky = { damageLeakOnOpenings: 8 * 40 };
    const clean = { damageLeakOnOpenings: 2 * 40 };
    const games = [
      ...set("2026-08-01", 4, {
        opp: "kix",
        won: 40,
        lost: 60,
        yourStocks: 1,
        oppStocks: 2,
        counters: leaky,
      }),
      ...set("2026-08-02", 4, {
        opp: "kix",
        won: 40,
        lost: 60,
        yourStocks: 1,
        oppStocks: 2,
        counters: clean,
      }),
    ];
    const report = computeProgress(games, identity, PIKACHU);
    const [first, second] = report.points;
    expect(first!.metrics.damageGivenBack!.residual).toBeLessThan(0);
    expect(second!.metrics.damageGivenBack!.residual).toBeGreaterThan(0);
  });

  it("counts the same game saved twice once, without splitting its session", () => {
    const games = set("2026-08-01", 5, {
      opp: "kix",
      won: 4,
      lost: 6,
      yourStocks: 0,
      oppStocks: 2,
    });
    const report = computeProgress(
      [...games, ...games.map((g) => ({ ...g, sourceName: "copy.rmgr" }))],
      identity,
      PIKACHU,
    );
    expect(report.games).toBe(5);
    expect(report.points).toHaveLength(1);
    expect(report.points[0]!.games).toBe(5);
  });

  it("scopes to a character family, pooling region variants", () => {
    const games = [
      ...set("2026-08-01", 3, {
        opp: "kix",
        won: 5,
        lost: 5,
        yourStocks: 1,
        oppStocks: 1,
        yourChar: PIKACHU,
      }),
      ...set("2026-08-02", 2, {
        opp: "kix",
        won: 5,
        lost: 5,
        yourStocks: 1,
        oppStocks: 1,
        yourChar: PIKACHU_JP,
      }),
      ...set("2026-08-03", 4, {
        opp: "kix",
        won: 5,
        lost: 5,
        yourStocks: 1,
        oppStocks: 1,
        yourChar: FOX,
      }),
    ];
    expect(computeProgress(games, identity, PIKACHU).games).toBe(5);
    expect(computeProgress(games, identity, null).games).toBe(9);
    expect(playedCharacterFamilies(games, identity)).toEqual([
      { family: PIKACHU, games: 5 },
      { family: FOX, games: 4 },
    ]);
  });

  it("splits trends into the last 30 days vs. earlier, relative to the latest session", () => {
    const games = [
      ...strongSet("2026-06-01"),
      ...weakSet("2026-06-05"),
      ...strongSet("2026-09-20"),
      ...weakSet("2026-09-25"),
    ];
    const share = computeProgress(games, identity, PIKACHU).trends.find(
      (t) => t.id === "openingShare",
    )!;
    expect(share.recent?.points).toBe(2);
    expect(share.earlier?.points).toBe(2);
  });

  it("reports opening share by thirds for long sets", () => {
    const start = new Date("2026-08-01T18:00:00Z").getTime();
    const games = Array.from({ length: 30 }, (_, i) =>
      game({
        at: new Date(start + i * 5 * 60 * 1000),
        opp: "Kurabba",
        won: i < 10 ? 3 : i >= 20 ? 5 : 4,
        lost: i < 10 ? 7 : i >= 20 ? 5 : 6,
        yourStocks: 0,
        oppStocks: 2,
      }),
    );
    const [row] = computeProgress(games, identity, PIKACHU).adaptation;
    expect(row?.firstThirdShare).toBeCloseTo(30);
    expect(row?.lastThirdShare).toBeCloseTo(50);
  });
});

describe("computeProgress with opponent aliases", () => {
  // The same person on two days under two tags.
  const games = [
    ...set("2026-08-01", 4, {
      opp: "kusora",
      won: 4,
      lost: 6,
      yourStocks: 1,
      oppStocks: 2,
    }),
    ...set("2026-08-05", 4, {
      opp: "kusora_JPN",
      won: 5,
      lost: 5,
      yourStocks: 1,
      oppStocks: 2,
    }),
  ];

  it("treats the tags as two opponents without a merge", () => {
    const report = computeProgress(games, identity, PIKACHU);
    expect(report.opponents.map((o) => o.opponentName).sort()).toEqual([
      "kusora",
      "kusora_JPN",
    ]);
    expect(report.repeatedOpponents).toHaveLength(0);
  });

  it("merges them into one opponent, one repeated-opponent track", () => {
    const merged = {
      ...identity,
      opponentAliases: { kusora_JPN: "kusora" },
    };
    const report = computeProgress(games, merged, PIKACHU);
    expect(report.opponents).toHaveLength(1);
    expect(report.opponents[0]!.opponentName).toBe("kusora");
    expect(report.opponents[0]!.games).toBe(8);
    expect(report.points.map((p) => p.opponentName)).toEqual([
      "kusora",
      "kusora",
    ]);
    expect(report.repeatedOpponents).toHaveLength(1);
    expect(report.repeatedOpponents[0]!.opponentName).toBe("kusora");
    expect(report.repeatedOpponents[0]!.points).toHaveLength(2);
  });
});
