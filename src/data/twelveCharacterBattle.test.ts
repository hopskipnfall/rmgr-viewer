import { describe, it, expect } from "vitest";
import { detect12CharacterBattles } from "./twelveCharacterBattle.js";
import type { GameSummary } from "./gameSummary.js";
import { createDefaultIdentity } from "./identity.js";

describe("detect12CharacterBattles", () => {
  const identity = {
    ...createDefaultIdentity("nue"),
    aliases: new Set(["nue"]),
  };

  const createGame = (opts: {
    id: string;
    time: Date;
    p0Char: number;
    p1Char: number;
    p0Start: number;
    p1Start: number;
    p0Final: number;
    p1Final: number;
  }): GameSummary => ({
    id: opts.id,
    sourceName: `${opts.id}.rmgr`,
    recordedAt: opts.time,
    stageId: 2,
    frameCount: 3600,
    isComplete: true,
    isUnevenStockStart: opts.p0Start !== opts.p1Start,
    ports: [
      {
        port: 0,
        playerName: "nue",
        characterId: opts.p0Char,
        startStocks: opts.p0Start,
        finalStocks: opts.p0Final,
      },
      {
        port: 1,
        playerName: "shidozz2",
        characterId: opts.p1Char,
        startStocks: opts.p1Start,
        finalStocks: opts.p1Final,
      },
    ],
    statsByPort: {},
    fileRef: null,
  });

  it("detects a complete 12CB battle when one player loses 12 characters", () => {
    const baseTime = new Date("2026-08-27T17:00:00Z");
    const games: GameSummary[] = [];

    // Simulate 12 matches where P0 (Pikachu) beats 12 different P1 characters
    for (let i = 0; i < 12; i++) {
      games.push(
        createGame({
          id: `g${i + 1}`,
          time: new Date(baseTime.getTime() + i * 3 * 60 * 1000),
          p0Char: 9, // Pikachu
          p1Char: 10 + i, // Opponent counterpicks new char each match
          p0Start: i === 0 ? 4 : 3, // P0 started match 1 at 4 stocks, remaining matches at 3
          p1Start: 4, // P1 starts fresh with 4 stocks
          p0Final: 3, // P0 wins with 3 stocks
          p1Final: 0, // P1 eliminated
        }),
      );
    }

    const battles = detect12CharacterBattles(games, identity);
    expect(battles.length).toBe(1);

    const b = battles[0]!;
    expect(b.games.length).toBe(12);
    expect(b.winner).toBe("you");
    expect(b.winnerName).toBe("nue");
    expect(b.winnerRemainingCharacters).toBe(12); // P0 never lost a character
    expect(b.winnerRemainingStocks).toBe(3);
    expect(b.isComplete).toBe(true);
    expect(b.yourSummary?.charactersEliminated).toBe(0);
    expect(b.oppSummary?.charactersEliminated).toBe(12);
    expect(b.oppSummary?.remainingCharacters).toBe(0);
  });

  it("detects multiple 12CB battles in the same session", () => {
    const baseTime = new Date("2026-08-27T17:00:00Z");
    const games: GameSummary[] = [];

    // Battle 1 (3 games)
    games.push(
      createGame({
        id: "b1_g1",
        time: new Date(baseTime.getTime()),
        p0Char: 1,
        p1Char: 2,
        p0Start: 4,
        p1Start: 4,
        p0Final: 2,
        p1Final: 0,
      }),
      createGame({
        id: "b1_g2",
        time: new Date(baseTime.getTime() + 3 * 60 * 1000),
        p0Char: 1,
        p1Char: 3,
        p0Start: 2,
        p1Start: 4,
        p0Final: 1,
        p1Final: 0,
      }),
    );

    // Battle 2 (Fresh 4v4 start, 2 games)
    const b2Time = new Date(baseTime.getTime() + 40 * 60 * 1000);
    games.push(
      createGame({
        id: "b2_g1",
        time: new Date(b2Time.getTime()),
        p0Char: 4,
        p1Char: 5,
        p0Start: 4,
        p1Start: 4,
        p0Final: 3,
        p1Final: 0,
      }),
      createGame({
        id: "b2_g2",
        time: new Date(b2Time.getTime() + 3 * 60 * 1000),
        p0Char: 4,
        p1Char: 6,
        p0Start: 3,
        p1Start: 4,
        p0Final: 2,
        p1Final: 0,
      }),
    );

    const battles = detect12CharacterBattles(games, identity);
    expect(battles.length).toBe(2);
    expect(battles[0]!.games.length).toBe(2);
    expect(battles[1]!.games.length).toBe(2);
  });

  it("returns empty array for regular matches without uneven start", () => {
    const baseTime = new Date("2026-08-27T17:00:00Z");
    const games = [
      createGame({
        id: "reg1",
        time: baseTime,
        p0Char: 1,
        p1Char: 2,
        p0Start: 4,
        p1Start: 4,
        p0Final: 2,
        p1Final: 0,
      }),
      createGame({
        id: "reg2",
        time: new Date(baseTime.getTime() + 5 * 60 * 1000),
        p0Char: 1,
        p1Char: 2,
        p0Start: 4,
        p1Start: 4,
        p0Final: 0,
        p1Final: 1,
      }),
    ];

    const battles = detect12CharacterBattles(games, identity);
    expect(battles.length).toBe(0);
  });
});
