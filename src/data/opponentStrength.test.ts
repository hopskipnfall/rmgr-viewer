import { describe, it, expect } from "vitest";
import { computeOpponentStrength } from "./opponentStrength.js";
import type { GameSummary, RawCounters } from "./gameSummary.js";
import { createDefaultIdentity } from "./identity.js";
import { DREAM_LAND_STAGE_ID } from "../stageGeometry.js";

function makeSummary(opts: {
  id: string;
  yourFinalStocks: number;
  oppFinalStocks: number;
  oppName?: string;
}): GameSummary {
  const counters: RawCounters = {
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
  };

  return {
    id: opts.id,
    sourceName: `${opts.id}.rmgr`,
    recordedAt: new Date(),
    stageId: DREAM_LAND_STAGE_ID,
    frameCount: 4000,
    isComplete: true,
    ports: [
      {
        port: 0,
        playerName: "Marcela",
        characterId: 2,
        finalStocks: opts.yourFinalStocks,
      },
      {
        port: 1,
        playerName: opts.oppName ?? "kix",
        characterId: 7,
        finalStocks: opts.oppFinalStocks,
      },
    ],
    statsByPort: { 0: counters, 1: { ...counters } },
    fileRef: null,
  };
}

describe("opponentStrength module", () => {
  const identity = createDefaultIdentity("Marcela");
  identity.aliases.add("Marcela");

  it("tiers a consistently-losing opponent as 'above'", () => {
    const games: GameSummary[] = Array.from({ length: 6 }, (_, i) =>
      makeSummary({ id: `g${i}`, yourFinalStocks: 0, oppFinalStocks: 3 }),
    );
    const strengths = computeOpponentStrength(games, identity);
    const kix = strengths.get("kix");
    expect(kix?.n).toBe(6);
    expect(kix?.marginRaw).toBe(-3);
    expect(kix?.tier).toBe("above");
  });

  it("tiers a consistently-beaten opponent as 'below'", () => {
    const games: GameSummary[] = Array.from({ length: 6 }, (_, i) =>
      makeSummary({
        id: `g${i}`,
        yourFinalStocks: 3,
        oppFinalStocks: 0,
        oppName: "somei",
      }),
    );
    const strengths = computeOpponentStrength(games, identity);
    expect(strengths.get("somei")?.tier).toBe("below");
  });

  it("marks an opponent with too few games as 'unknown'", () => {
    const games: GameSummary[] = [
      makeSummary({
        id: "g0",
        yourFinalStocks: 0,
        oppFinalStocks: 3,
        oppName: "newOpponent",
      }),
    ];
    const strengths = computeOpponentStrength(games, identity);
    expect(strengths.get("newOpponent")?.tier).toBe("unknown");
  });

  it("tiers an evenly-matched opponent as 'peer'", () => {
    const games: GameSummary[] = [
      makeSummary({
        id: "g0",
        yourFinalStocks: 3,
        oppFinalStocks: 2,
        oppName: "shidozz2",
      }),
      makeSummary({
        id: "g1",
        yourFinalStocks: 2,
        oppFinalStocks: 3,
        oppName: "shidozz2",
      }),
      makeSummary({
        id: "g2",
        yourFinalStocks: 3,
        oppFinalStocks: 3,
        oppName: "shidozz2",
      }),
      makeSummary({
        id: "g3",
        yourFinalStocks: 3,
        oppFinalStocks: 2,
        oppName: "shidozz2",
      }),
    ];
    const strengths = computeOpponentStrength(games, identity);
    expect(strengths.get("shidozz2")?.tier).toBe("peer");
  });
});
