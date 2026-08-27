import { describe, it, expect, beforeEach } from "vitest";
import { groupGamesIntoSessions } from "./session.js";
import type { GameSummary } from "./gameSummary.js";
import { createDefaultIdentity } from "./identity.js";
import { saveVideoLink } from "../video/youtubeSync.js";

describe("groupGamesIntoSessions", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    };
    (
      globalThis as unknown as { localStorage: typeof mockStorage }
    ).localStorage = mockStorage;
  });

  const identity = {
    ...createDefaultIdentity(),
    aliases: new Set(["Isai"]),
  };

  const createGame = (
    id: string,
    time: Date,
    oppName: string,
    yourChar: number,
    oppChar: number,
    yourStocks: number,
    oppStocks: number,
    frames = 3600,
  ): GameSummary => ({
    id,
    sourceName: `${id}.rmgr`,
    recordedAt: time,
    stageId: 0x02,
    frameCount: frames,
    isComplete: true,
    fileRef: null,
    ports: [
      {
        port: 0,
        playerName: "Isai",
        characterId: yourChar,
        finalStocks: yourStocks,
      },
      {
        port: 1,
        playerName: oppName,
        characterId: oppChar,
        finalStocks: oppStocks,
      },
    ],
    statsByPort: {},
  });

  it("clusters consecutive games against the same opponent within time window", () => {
    const baseTime = new Date("2026-08-23T14:00:00Z");
    const games = [
      createGame("g1", baseTime, "Mew2King", 0x09, 0x01, 3, 0), // Pikachu vs Fox, Win
      createGame(
        "g2",
        new Date(baseTime.getTime() + 15 * 60 * 1000), // 15 mins later
        "Mew2King",
        0x09,
        0x01,
        0,
        2, // Loss
      ),
      createGame(
        "g3",
        new Date(baseTime.getTime() + 30 * 60 * 1000), // 30 mins later
        "Mew2King",
        0x09,
        0x03, // Marth (opp changed char)
        2,
        0, // Win
      ),
    ];

    const sessions = groupGamesIntoSessions(games, identity, "newest");
    expect(sessions.length).toBe(1);

    const session = sessions[0]!;
    expect(session.opponentName).toBe("Mew2King");
    expect(session.games.length).toBe(3);
    expect(session.wins).toBe(2);
    expect(session.losses).toBe(1);
    expect(session.opponentCharacterIds).toContain(0x01);
    expect(session.opponentCharacterIds).toContain(0x03);
    expect(session.totalDurationFrames).toBe(3600 * 3);
  });

  it("splits sessions when opponent changes or gap exceeds MAX_SESSION_GAP_SECONDS", () => {
    const baseTime = new Date("2026-08-23T14:00:00Z");
    const games = [
      createGame("g1", baseTime, "Mew2King", 0x09, 0x01, 3, 0),
      // Long gap: 3 hours (> 2 hours max gap)
      createGame(
        "g2",
        new Date(baseTime.getTime() + 3 * 3600 * 1000),
        "Mew2King",
        0x09,
        0x01,
        2,
        0,
      ),
      // Different opponent
      createGame(
        "g3",
        new Date(baseTime.getTime() + 3.2 * 3600 * 1000),
        "Armada",
        0x09,
        0x08,
        3,
        0,
      ),
    ];

    const sessions = groupGamesIntoSessions(games, identity, "newest");
    expect(sessions.length).toBe(3);
    expect(sessions[0]!.opponentName).toBe("Armada");
    expect(sessions[1]!.opponentName).toBe("Mew2King");
    expect(sessions[2]!.opponentName).toBe("Mew2King");
  });

  it("clusters games sharing the same YouTube video ID even across long gaps", () => {
    const baseTime = new Date("2026-08-23T14:00:00Z");
    const games = [
      createGame("g1", baseTime, "Mew2King", 0x09, 0x01, 3, 0),
      // 4 hours later (exceeds gap), but same video!
      createGame(
        "g2",
        new Date(baseTime.getTime() + 4 * 3600 * 1000),
        "Mew2King",
        0x09,
        0x01,
        2,
        0,
      ),
    ];

    saveVideoLink("g1", {
      videoId: "cmw0olwhLaQ",
      url: "https://www.youtube.com/watch?v=cmw0olwhLaQ",
      offsetSeconds: 10,
      viewMode: "video-pip",
    });
    saveVideoLink("g2", {
      videoId: "cmw0olwhLaQ",
      url: "https://www.youtube.com/watch?v=cmw0olwhLaQ",
      offsetSeconds: 240,
      viewMode: "video-pip",
    });

    const sessions = groupGamesIntoSessions(games, identity, "newest");
    expect(sessions.length).toBe(1);
    expect(sessions[0]!.hasVideo).toBe(true);
    expect(sessions[0]!.videoId).toBe("cmw0olwhLaQ");
  });

  it("excludes uneven start games from session win and loss tallies", () => {
    const baseTime = new Date("2026-08-23T14:00:00Z");
    const g1 = createGame("g1", baseTime, "Mew2King", 0x09, 0x01, 3, 0); // Win
    const g2 = createGame(
      "g2",
      new Date(baseTime.getTime() + 5 * 60 * 1000),
      "Mew2King",
      0x09,
      0x01,
      1,
      0,
    );
    g2.isUnevenStockStart = true; // Uneven start game won

    const g3 = createGame(
      "g3",
      new Date(baseTime.getTime() + 10 * 60 * 1000),
      "Mew2King",
      0x09,
      0x01,
      0,
      2,
    );
    g3.isUnevenStockStart = true; // Uneven start game lost

    const sessions = groupGamesIntoSessions([g1, g2, g3], identity, "newest");
    expect(sessions.length).toBe(1);
    expect(sessions[0]!.games.length).toBe(3);
    expect(sessions[0]!.wins).toBe(1);
    expect(sessions[0]!.losses).toBe(0);
    expect(sessions[0]!.twelveCharacterBattles?.length).toBe(1);
  });
});
