import { describe, it, expect } from "vitest";
import {
  detect12CharacterBattles,
  compute12CbMatchState,
} from "./twelveCharacterBattle.js";
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

  /** A full 12CB: P0 (one character, carrying 3 stocks over) beats 12 fresh P1 characters in a row. */
  const completeBattle = (prefix: string, start: Date, p0Char: number) =>
    Array.from({ length: 12 }, (_, i) =>
      createGame({
        id: `${prefix}_g${i + 1}`,
        time: new Date(start.getTime() + i * 3 * 60 * 1000),
        p0Char,
        p1Char: 10 + i,
        p0Start: i === 0 ? 4 : 3,
        p1Start: 4,
        p0Final: 3,
        p1Final: 0,
      }),
    );

  it("detects multiple complete 12CB battles in the same session", () => {
    const baseTime = new Date("2026-08-27T17:00:00Z");
    // Battle 2 starts 40 minutes after battle 1's last game (a fresh 4v4 start).
    const games = [
      ...completeBattle("b1", baseTime, 1),
      ...completeBattle(
        "b2",
        new Date(baseTime.getTime() + (33 + 40) * 60 * 1000),
        4,
      ),
    ];

    const battles = detect12CharacterBattles(games, identity);
    expect(battles.length).toBe(2);
    expect(battles[0]!.games.length).toBe(12);
    expect(battles[1]!.games.length).toBe(12);
  });

  it("does not report a 12CB that wasn't played through to the end", () => {
    // Two linked games with a stock carry-over look like a 12CB's opening,
    // but nobody lost all 12 characters - not a 12CB (yet).
    const baseTime = new Date("2026-08-27T17:00:00Z");
    const games = completeBattle("partial", baseTime, 1).slice(0, 2);

    expect(detect12CharacterBattles(games, identity)).toEqual([]);
  });

  it("does not report a 12CB that stopped one character short", () => {
    const baseTime = new Date("2026-08-27T17:00:00Z");
    const games = completeBattle("short", baseTime, 1).slice(0, 11);

    expect(detect12CharacterBattles(games, identity)).toEqual([]);
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

  it("computes accurate 12CB match state including eliminated and active characters", () => {
    const baseTime = new Date("2026-08-27T17:00:00Z");
    const games = [
      createGame({
        id: "g1",
        time: baseTime,
        p0Char: 43, // Luigi (JP)
        p1Char: 39, // Link (JP)
        p0Start: 4,
        p1Start: 4,
        p0Final: 2,
        p1Final: 0, // Link eliminated
      }),
      createGame({
        id: "g2",
        time: new Date(baseTime.getTime() + 3 * 60 * 1000),
        p0Char: 43, // Luigi (JP)
        p1Char: 40, // Falcon (JP)
        p0Start: 2,
        p1Start: 4,
        p0Final: 0, // Luigi eliminated
        p1Final: 3,
      }),
      createGame({
        id: "g3",
        time: new Date(baseTime.getTime() + 6 * 60 * 1000),
        p0Char: 41, // Fox (JP)
        p1Char: 40, // Falcon (JP)
        p0Start: 4,
        p1Start: 3,
        p0Final: 2,
        p1Final: 0, // Falcon eliminated
      }),
      // Games 4-13: Fox (carrying 2 stocks) beats P1's remaining 10
      // characters, so the battle is played through to the end.
      ...[36, 37, 41, 42, 43, 44, 46, 48, 49, 50].map((p1Char, i) =>
        createGame({
          id: `g${i + 4}`,
          time: new Date(baseTime.getTime() + (i + 3) * 3 * 60 * 1000),
          p0Char: 41, // Fox (JP)
          p1Char,
          p0Start: 2,
          p1Start: 4,
          p0Final: 2,
          p1Final: 0,
        }),
      ),
    ];

    // State at Game 1
    const state1 = compute12CbMatchState("g1", games, identity);
    expect(state1).not.toBeNull();
    expect(state1?.matchIndex).toBe(1);
    expect(state1?.totalMatches).toBe(13);
    const [p0_1, p1_1] = state1!.players;
    expect(p0_1.remainingCharacterCount).toBe(12);
    expect(p0_1.activeCharacterKey).toBe("luigi");
    expect(p0_1.characterSlots.find((s) => s.key === "luigi")?.status).toBe(
      "active",
    );
    expect(p1_1.remainingCharacterCount).toBe(12);
    expect(p1_1.activeCharacterKey).toBe("link");

    // State at Game 2: P1's Link should be eliminated
    const state2 = compute12CbMatchState("g2", games, identity);
    expect(state2).not.toBeNull();
    expect(state2?.matchIndex).toBe(2);
    const [p0_2, p1_2] = state2!.players;
    expect(p0_2.remainingCharacterCount).toBe(12);
    expect(p0_2.activeCharacterStocks).toBe(2);
    expect(p1_2.remainingCharacterCount).toBe(11);
    expect(p1_2.characterSlots.find((s) => s.key === "link")?.status).toBe(
      "eliminated",
    );
    expect(p1_2.characterSlots.find((s) => s.key === "falcon")?.status).toBe(
      "active",
    );
    expect(p1_2.characterSlots.find((s) => s.key === "mario")?.status).toBe(
      "available",
    );

    // State at Game 3: P0's Luigi and P1's Link are eliminated
    const state3 = compute12CbMatchState("g3", games, identity);
    expect(state3).not.toBeNull();
    const [p0_3, p1_3] = state3!.players;
    expect(p0_3.remainingCharacterCount).toBe(11);
    expect(p0_3.characterSlots.find((s) => s.key === "luigi")?.status).toBe(
      "eliminated",
    );
    expect(p0_3.characterSlots.find((s) => s.key === "fox")?.status).toBe(
      "active",
    );
    expect(p1_3.characterSlots.find((s) => s.key === "link")?.status).toBe(
      "eliminated",
    );
    expect(p1_3.characterSlots.find((s) => s.key === "falcon")?.status).toBe(
      "active",
    );
  });
});
