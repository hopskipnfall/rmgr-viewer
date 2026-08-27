import { describe, it, expect } from "vitest";
import {
  filterGameSummaries,
  aggregateFilteredGames,
  computeRateDeltas,
  computeOpponentCharacterBreakdown,
  computeGroupedOpponentCharacterBreakdown,
  computeOverallBaseline,
} from "./aggregate.js";
import type { GameSummary, RawCounters } from "./gameSummary.js";
import { createDefaultIdentity } from "./identity.js";
import { DREAM_LAND_STAGE_ID } from "../stageGeometry.js";

function makeSummary(opts: {
  id: string;
  stageId?: number;
  yourPort?: 0 | 1;
  yourName?: string;
  oppName?: string;
  yourChar?: number;
  oppChar?: number;
  yourFinalStocks?: number;
  oppFinalStocks?: number;
  yourStats: Partial<RawCounters>;
}): GameSummary {
  const yourPort = opts.yourPort ?? 0;
  const oppPort = yourPort === 0 ? 1 : 0;
  const stageId = opts.stageId ?? DREAM_LAND_STAGE_ID;

  const fullCounters: RawCounters = {
    recoverySituations: 0,
    recoverySuccesses: 0,
    edgeGuardSituations: 0,
    edgeGuardSuccesses: 0,
    ledgeGetupSituations: 0,
    ledgeGetupSuccesses: 0,
    ledgeTrapSituations: 0,
    ledgeTrapSuccesses: 0,
    angelAvoidSituations: 0,
    angelAvoidSuccesses: 0,
    neutralHitsLanded: 0,
    stocksTaken: 0,
    ...opts.yourStats,
  };

  return {
    id: opts.id,
    sourceName: `${opts.id}.rmgr`,
    recordedAt: new Date(),
    stageId,
    frameCount: 4000,
    isComplete: true,
    ports: [
      {
        port: yourPort,
        playerName: opts.yourName ?? "Marcela",
        characterId: opts.yourChar ?? 2,
        finalStocks: opts.yourFinalStocks ?? 4,
      },
      {
        port: oppPort,
        playerName: opts.oppName ?? "Penelope",
        characterId: opts.oppChar ?? 7,
        finalStocks: opts.oppFinalStocks ?? 0,
      },
    ],
    statsByPort: {
      [yourPort]: fullCounters,
      [oppPort]: { ...fullCounters },
    },
    fileRef: null,
  };
}

describe("aggregate module", () => {
  const identity = createDefaultIdentity("Marcela");
  identity.aliases.add("Marcela");

  it("filters out ambiguous identity games", () => {
    const g1 = makeSummary({
      id: "g1",
      yourStats: { recoverySituations: 10, recoverySuccesses: 5 },
    });
    const gAmbiguous = makeSummary({
      id: "g2",
      yourName: "Unknown1",
      oppName: "Unknown2",
      yourStats: { recoverySituations: 10, recoverySuccesses: 10 },
    });

    const filtered = filterGameSummaries([g1, gAmbiguous], identity);
    expect(filtered.length).toBe(1);
    expect(filtered[0]?.summary.id).toBe("g1");
  });

  it("filters by character, opponent name, and stage", () => {
    const g1 = makeSummary({
      id: "g1",
      yourChar: 2,
      oppChar: 7,
      oppName: "Penelope",
      stageId: 6,
      yourStats: {},
    });
    const g2 = makeSummary({
      id: "g2",
      yourChar: 2,
      oppChar: 1,
      oppName: "FoxGuy",
      stageId: 6,
      yourStats: {},
    });
    const g3 = makeSummary({
      id: "g3",
      yourChar: 3,
      oppChar: 7,
      oppName: "Penelope",
      stageId: 10,
      yourStats: {},
    });

    const list = [g1, g2, g3];

    // Filter your character
    expect(
      filterGameSummaries(list, identity, { yourCharacterId: 2 }).length,
    ).toBe(2);

    // Filter opp character
    expect(
      filterGameSummaries(list, identity, { oppCharacterId: 7 }).length,
    ).toBe(2);

    // Filter opp name
    expect(
      filterGameSummaries(list, identity, { opponentName: "FoxGuy" }).length,
    ).toBe(1);

    // Filter stage
    expect(filterGameSummaries(list, identity, { stageId: 10 }).length).toBe(1);
  });

  it("sums counters element-wise and derives rates correctly", () => {
    const g1 = makeSummary({
      id: "g1",
      yourStats: {
        recoverySituations: 10,
        recoverySuccesses: 8,
        neutralHitsLanded: 20,
        stocksTaken: 4,
      },
    });
    const g2 = makeSummary({
      id: "g2",
      yourStats: {
        recoverySituations: 2,
        recoverySuccesses: 0,
        neutralHitsLanded: 10,
        stocksTaken: 1,
      },
    });

    const filtered = filterGameSummaries([g1, g2], identity);
    const agg = aggregateFilteredGames(filtered);

    expect(agg.totalGames).toBe(2);
    expect(agg.recoveryTotal).toBe(12);
    expect(agg.recoverySuccesses).toBe(8);
    // 8 / 12 = 66.6666...%
    expect(agg.recoveryPct).toBeCloseTo(66.67, 1);

    // Neutral hits per stock: (20 + 10) / (4 + 1) = 30 / 5 = 6.0
    expect(agg.neutralHitsLanded).toBe(30);
    expect(agg.stocksTaken).toBe(5);
    expect(agg.neutralHitsPerStock).toBe(6.0);
  });

  it("strictly enforces stage-gating for Dream Land stats", () => {
    const gDreamLand = makeSummary({
      id: "gDL",
      stageId: DREAM_LAND_STAGE_ID,
      yourStats: {
        edgeGuardSituations: 10,
        edgeGuardSuccesses: 8,
        angelAvoidSituations: 5,
        angelAvoidSuccesses: 5,
      },
    });
    const gOtherStage = makeSummary({
      id: "gOther",
      stageId: 99, // Non-Dream-Land stage
      yourStats: {
        edgeGuardSituations: 100, // Should be ignored
        edgeGuardSuccesses: 100,
        angelAvoidSituations: 10,
        angelAvoidSuccesses: 5,
      },
    });

    const filtered = filterGameSummaries([gDreamLand, gOtherStage], identity);
    const agg = aggregateFilteredGames(filtered);

    expect(agg.totalGames).toBe(2);
    expect(agg.dreamLandGames).toBe(1);
    // Edge guard only from Dream Land: 8 / 10
    expect(agg.edgeGuardTotal).toBe(10);
    expect(agg.edgeGuardSuccesses).toBe(8);
    expect(agg.edgeGuardPct).toBe(80);

    // Angel avoid from both stages: (5+5) / (5+10) = 10 / 15
    expect(agg.angelAvoidTotal).toBe(15);
    expect(agg.angelAvoidSuccesses).toBe(10);
  });

  it("computes rate deltas against baseline", () => {
    const baseline = aggregateFilteredGames(
      filterGameSummaries(
        [
          makeSummary({
            id: "b1",
            yourStats: {
              recoverySituations: 100,
              recoverySuccesses: 50,
              neutralHitsLanded: 400,
              stocksTaken: 100,
            },
          }),
        ],
        identity,
      ),
    );

    const filtered = aggregateFilteredGames(
      filterGameSummaries(
        [
          makeSummary({
            id: "f1",
            yourStats: {
              recoverySituations: 20,
              recoverySuccesses: 14, // 70%
              neutralHitsLanded: 90,
              stocksTaken: 20, // 4.5 hits/stock
            },
          }),
        ],
        identity,
      ),
    );

    const deltas = computeRateDeltas(filtered, baseline);
    expect(deltas.recoveryPctDelta).toBe(20); // 70% - 50% = +20%
    expect(deltas.neutralHitsPerStockDelta).toBe(0.5); // 4.5 - 4.0 = +0.5
  });

  it("computes opponent character breakdown", () => {
    const gFalcon = makeSummary({
      id: "g1",
      oppChar: 2,
      yourFinalStocks: 4,
      oppFinalStocks: 0,
      yourStats: { recoverySituations: 10, recoverySuccesses: 7 },
    });
    const gPikachu = makeSummary({
      id: "g2",
      oppChar: 7,
      yourFinalStocks: 1,
      oppFinalStocks: 4,
      yourStats: { recoverySituations: 10, recoverySuccesses: 5 },
    });

    const filtered = filterGameSummaries([gFalcon, gPikachu], identity);
    const breakdown = computeOpponentCharacterBreakdown(filtered);

    expect(breakdown.length).toBe(2);
    expect(breakdown[0]?.characterId).toBe(2);
    expect(breakdown[0]?.wins).toBe(1);
    expect(breakdown[0]?.losses).toBe(0);
    expect(breakdown[0]?.rates.recoveryPct).toBe(70);

    expect(breakdown[1]?.characterId).toBe(7);
    expect(breakdown[1]?.wins).toBe(0);
    expect(breakdown[1]?.losses).toBe(1);
    expect(breakdown[1]?.rates.recoveryPct).toBe(50);
  });

  it("calculates wins, losses, and win rate percentage accurately", () => {
    const winGame = makeSummary({
      id: "w1",
      yourFinalStocks: 3,
      oppFinalStocks: 0,
      yourStats: {},
    });
    const lossGame = makeSummary({
      id: "l1",
      yourFinalStocks: 0,
      oppFinalStocks: 2,
      yourStats: {},
    });

    const filtered = filterGameSummaries([winGame, lossGame], identity);
    const agg = aggregateFilteredGames(filtered);

    expect(agg.totalGames).toBe(2);
    expect(agg.wins).toBe(1);
    expect(agg.losses).toBe(1);
    expect(agg.winRatePct).toBe(50);
  });

  it("excludes uneven start games from wins, losses, and win rate calculation", () => {
    const winGame = makeSummary({
      id: "w1",
      yourFinalStocks: 3,
      oppFinalStocks: 0,
      yourStats: {},
    });
    const unevenWinGame = makeSummary({
      id: "uw1",
      yourFinalStocks: 2,
      oppFinalStocks: 0,
      yourStats: {},
    });
    unevenWinGame.isUnevenStockStart = true;

    const unevenLossGame = makeSummary({
      id: "ul1",
      yourFinalStocks: 0,
      oppFinalStocks: 1,
      yourStats: {},
    });
    unevenLossGame.isUnevenStockStart = true;

    const filtered = filterGameSummaries(
      [winGame, unevenWinGame, unevenLossGame],
      identity,
    );
    const agg = aggregateFilteredGames(filtered);

    expect(agg.totalGames).toBe(3);
    expect(agg.wins).toBe(1);
    expect(agg.losses).toBe(0);
    expect(agg.winRatePct).toBe(100);

    const breakdown = computeOpponentCharacterBreakdown(filtered);
    expect(breakdown[0]?.games).toBe(3);
    expect(breakdown[0]?.wins).toBe(1);
    expect(breakdown[0]?.losses).toBe(0);
  });

  it("computes grouped opponent character breakdown by NA, JP, and Remix categories", () => {
    const naGame = makeSummary({
      id: "na1",
      oppChar: 0x01, // Fox (NA)
      yourStats: {},
    });
    const jpGame = makeSummary({
      id: "jp1",
      oppChar: 0x29, // Fox JP (0x29)
      yourStats: {},
    });
    const remixGame = makeSummary({
      id: "remix1",
      oppChar: 0x1d, // Falco (Remix)
      yourStats: {},
    });

    const filtered = filterGameSummaries([naGame, jpGame, remixGame], identity);
    const grouped = computeGroupedOpponentCharacterBreakdown(filtered);

    expect(grouped.length).toBe(3);
    expect(grouped[0]?.group).toBe("na");
    expect(grouped[0]?.rows[0]?.characterId).toBe(0x01);

    expect(grouped[1]?.group).toBe("jp");
    expect(grouped[1]?.rows[0]?.characterId).toBe(0x29);

    expect(grouped[2]?.group).toBe("remix");
    expect(grouped[2]?.rows[0]?.characterId).toBe(0x1d);
  });

  it("computes overall baseline across all resolved games for identity", () => {
    const g1 = makeSummary({
      id: "g1",
      yourStats: { recoverySituations: 7, recoverySuccesses: 4 }, // 57.1%
    });
    const g2 = makeSummary({
      id: "g2",
      yourStats: { recoverySituations: 5, recoverySuccesses: 2 }, // 40.0%
    });
    const g3 = makeSummary({
      id: "g3",
      yourStats: { recoverySituations: 6, recoverySuccesses: 3 }, // 50.0%
    });

    // 1 game: returns null (needs at least 2 games for baseline)
    expect(computeOverallBaseline([g1], identity)).toBeNull();

    // 3 games: aggregates to 9 / 18 = 50.0%
    const baseline = computeOverallBaseline([g1, g2, g3], identity);
    expect(baseline).not.toBeNull();
    expect(baseline?.totalGames).toBe(3);
    expect(baseline?.recoveryTotal).toBe(18);
    expect(baseline?.recoverySuccesses).toBe(9);
    expect(baseline?.recoveryPct).toBe(50);
  });
});
