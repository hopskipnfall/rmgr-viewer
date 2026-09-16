import type { PortIndex } from "@rmg-k/rmgr";
import { beforeEach, describe, expect, it } from "vitest";
import type { GameSummary } from "./gameSummary.js";
import { createDefaultIdentity } from "./identity.js";
import { groupGamesIntoSessions } from "./session.js";

/**
 * Lobby sessions: 3-4 players in one netplay lobby rotating who plays 1v1.
 * Every game's header lists the whole lobby (lobbyNames), whoever sits out.
 */
describe("groupGamesIntoSessions - rotating lobbies", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: Partial<Storage> }).localStorage =
      {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
      };
  });

  const identity = {
    ...createDefaultIdentity("nue"),
    aliases: new Set(["nue"]),
  };
  const LOBBY = ["shidozzzz", "zabuton", "nue"];

  /** A 2-minute game starting `minute` minutes in, between the two `seated` lobby ports. */
  function lobbyGame(
    id: string,
    minute: number,
    seated: [PortIndex, PortIndex],
    finals: [number, number],
    /** null = a summary from before lobbyNames existed. */
    lobbyNames: string[] | null = LOBBY,
  ): GameSummary {
    return {
      id,
      sourceName: `${id}.rmgr`,
      recordedAt: new Date(Date.UTC(2026, 8, 12, 15, minute)),
      stageId: 0x02,
      frameCount: 120 * 60,
      isComplete: true,
      fileRef: null,
      lobbyNames: lobbyNames ?? undefined,
      ports: seated.map((port, i) => ({
        port,
        playerName: LOBBY[port]!,
        characterId: 40 + port,
        finalStocks: finals[i]!,
      })),
      statsByPort: {},
    };
  }

  it("keeps a rotation night in one session, including games you only watched", () => {
    const sessions = groupGamesIntoSessions(
      [
        lobbyGame("g1", 0, [0, 2], [0, 2]), // nue beats shidozzzz
        lobbyGame("g2", 3, [1, 2], [3, 0]), // zabuton beats nue
        lobbyGame("g3", 6, [0, 1], [1, 0]), // nue watches
      ],
      identity,
      "oldest",
    );

    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.games.map((g) => g.id)).toEqual(["g1", "g2", "g3"]);
    expect(sessions[0]!.opponentName).toBe("shidozzzz, zabuton");
    expect(sessions[0]!.wins).toBe(1);
    expect(sessions[0]!.losses).toBe(1);
  });

  it("splits when a game starts before the previous one ended", () => {
    // g1 runs 15:00-15:02; g2 starting at 15:01 can't be the same lobby's next game.
    const sessions = groupGamesIntoSessions(
      [lobbyGame("g1", 0, [0, 2], [0, 2]), lobbyGame("g2", 1, [1, 2], [3, 0])],
      identity,
    );
    expect(sessions).toHaveLength(2);
  });

  it("splits when the lobby changes", () => {
    const sessions = groupGamesIntoSessions(
      [
        lobbyGame("g1", 0, [0, 2], [0, 2]),
        lobbyGame("g2", 3, [0, 2], [0, 2], ["shidozzzz", "", "nue"]),
      ],
      identity,
    );
    expect(sessions).toHaveLength(2);
  });

  it("groups older summaries without lobby names by their two players, as before", () => {
    const sessions = groupGamesIntoSessions(
      [
        lobbyGame("g1", 0, [0, 2], [0, 2], null),
        lobbyGame("g2", 3, [0, 2], [2, 0], null),
      ],
      identity,
    );
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.opponentName).toBe("shidozzzz");
  });
});
