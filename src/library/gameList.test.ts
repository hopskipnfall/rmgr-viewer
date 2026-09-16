import { describe, it, expect } from "vitest";
import { GameList } from "./gameList.js";
import type { GameSummary } from "../data/gameSummary.js";
import { createDefaultIdentity } from "../data/identity.js";
import { DREAM_LAND_STAGE_ID } from "../stageGeometry.js";

describe("GameList rendering", () => {
  it("renders game row with widget header and supplementary body containing itemized combo chips", () => {
    const mockContainer = {
      innerHTML: "",
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as HTMLElement;

    const gameList = new GameList(
      mockContainer,
      () => {},
      () => {},
      () => {},
      () => {},
      () => {},
    );

    const identity = {
      ...createDefaultIdentity(),
      aliases: new Set(["Isai"]),
    };

    const summary: GameSummary = {
      id: "game-1",
      sourceName: "20260823-171117-Pikachu-Isai-1.rmgr",
      recordedAt: new Date("2026-08-23T17:11:17"),
      stageId: DREAM_LAND_STAGE_ID,
      frameCount: 3600, // 1:00
      isComplete: true,
      fileRef: null,
      ports: [
        { port: 0, playerName: "Isai", characterId: 0x09, finalStocks: 3 }, // Pikachu
        { port: 1, playerName: "Mew2King", characterId: 0x01, finalStocks: 0 }, // Fox
      ],
      statsByPort: {
        0: {
          recoverySituations: 4,
          recoverySuccesses: 3,
          edgeGuardEffectivenessSum: 210,
          edgeGuardEffectivenessCount: 3,
          ledgeGetupSituations: 2,
          ledgeGetupSuccesses: 2,
          ledgeTrapSituations: 1,
          ledgeTrapSuccesses: 1,
          angelAvoidSituations: 1,
          angelAvoidSuccesses: 1,
          neutralHitsLanded: 12,
          stocksTaken: 4,
          killCombos: 2,
          combosList: [
            { hitCount: 3, startDamage: 33, endDamage: 87 },
            { hitCount: 6, startDamage: 21, endDamage: 75 },
          ],
        },
      },
    };

    gameList.render([summary], identity, 1);

    const html = mockContainer.innerHTML;

    // Check widget classes
    expect(html).toContain(
      'class="game-row compact single-game-pulse row-won"',
    );
    expect(html).toContain('class="game-row-header"');
    expect(html).toContain('class="game-row-body"');

    // Check header contents
    expect(html).toContain("Dream Land");
    expect(html).not.toContain("Isai");
    expect(html).toContain("Pikachu");
    expect(html).toContain("Mew2King");
    expect(html).toContain("Fox");
    // The one game's matchup is the session's matchup - shown in the header.
    expect(html).toContain('class="session-matchup"');

    // Check supplementary body contents
    expect(html).toContain("W · 3 left");
    expect(html).toContain("Stocks Remaining: 3"); // result tooltip
    expect(html).toContain("Rec</span> 75% (3/4)");
    expect(html).toContain("EG</span> A (3)");
    expect(html).toContain("Getup</span> 100% (2/2)");
    expect(html).toContain('class="session-group"');
    expect(html).toContain('class="session-header"');

    // Check itemized kill combo chips
    expect(html).toContain("Kill Combos:");
    expect(html).toContain(
      '<span class="chip-label">3 hits</span> 33% → 87% <span class="chip-ko">KO</span>',
    );
    expect(html).toContain(
      '<span class="chip-label">6 hits</span> 21% → 75% <span class="chip-ko">KO</span>',
    );
  });

  it("renders game-video-badge when a video is linked", async () => {
    const store = new Map<string, string>();
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    };
    (
      globalThis as unknown as { localStorage: typeof mockStorage }
    ).localStorage = mockStorage;

    const { saveVideoLink, deleteVideoLink } =
      await import("../video/youtubeSync.js");
    const mockContainer = {
      innerHTML: "",
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as HTMLElement;

    const gameList = new GameList(
      mockContainer,
      () => {},
      () => {},
      () => {},
      () => {},
      () => {},
    );

    const identity = createDefaultIdentity();
    const summary: GameSummary = {
      id: "game-with-video",
      sourceName: "match.rmgr",
      recordedAt: new Date("2026-08-23T17:11:17"),
      stageId: DREAM_LAND_STAGE_ID,
      frameCount: 3600,
      isComplete: true,
      fileRef: null,
      ports: [
        { port: 0, playerName: "Player 1", characterId: 0x09, finalStocks: 3 },
        { port: 1, playerName: "Player 2", characterId: 0x01, finalStocks: 0 },
      ],
      statsByPort: {},
    };

    saveVideoLink("game-with-video", {
      videoId: "dQw4w9WgXcQ",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      offsetSeconds: 0,
      viewMode: "video-pip",
    });

    gameList.render([summary], identity, 1);
    expect(mockContainer.innerHTML).toContain('class="game-video-badge"');
    expect(mockContainer.innerHTML).toContain("🎬");

    deleteVideoLink("game-with-video");
  });

  it("renders flat list without session groups when groupBySession is false", () => {
    const mockContainer = {
      innerHTML: "",
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as HTMLElement;

    const gameList = new GameList(
      mockContainer,
      () => {},
      () => {},
      () => {},
      () => {},
      () => {},
    );

    const identity = createDefaultIdentity();
    const summary: GameSummary = {
      id: "flat-game",
      sourceName: "flat.rmgr",
      recordedAt: new Date("2026-08-23T17:11:17"),
      stageId: DREAM_LAND_STAGE_ID,
      frameCount: 3600,
      isComplete: true,
      fileRef: null,
      ports: [
        { port: 0, playerName: "Player 1", characterId: 0x09, finalStocks: 3 },
        { port: 1, playerName: "Player 2", characterId: 0x01, finalStocks: 0 },
      ],
      statsByPort: {},
    };

    gameList.setGroupBySession(false);
    gameList.render([summary], identity, 1);

    expect(mockContainer.innerHTML).not.toContain('class="session-group"');
    expect(mockContainer.innerHTML).toContain('class="game-row');
  });

  it("renders Uneven Start badge on game row when starting stocks are uneven", () => {
    const mockContainer = {
      innerHTML: "",
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as HTMLElement;

    const gameList = new GameList(
      mockContainer,
      () => {},
      () => {},
      () => {},
      () => {},
      () => {},
    );

    const identity = {
      ...createDefaultIdentity(),
      aliases: new Set(["nue"]),
    };

    const summary: GameSummary = {
      id: "uneven-game",
      sourceName: "20260827-171139-nue-shidozz2.rmgr",
      recordedAt: new Date("2026-08-27T17:11:39"),
      stageId: DREAM_LAND_STAGE_ID,
      frameCount: 3600,
      isComplete: true,
      fileRef: null,
      isUnevenStockStart: true,
      ports: [
        {
          port: 0,
          playerName: "nue",
          characterId: 43,
          finalStocks: 0,
          startStocks: 2,
        },
        {
          port: 1,
          playerName: "shidozz2",
          characterId: 43,
          finalStocks: 1,
          startStocks: 4,
        },
      ],
      statsByPort: {},
    };

    gameList.render([summary], identity, 1);

    const html = mockContainer.innerHTML;
    expect(html).toContain('class="uneven-stocks-badge"');
    expect(html).toContain("Uneven Start");
    expect(html).toContain("Excluded from overall W-L stats");
  });

  it("renders 12CB session pill, banner, and match index badge for 12CB sessions", () => {
    const mockContainer = {
      innerHTML: "",
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as HTMLElement;

    const gameList = new GameList(
      mockContainer,
      () => {},
      () => {},
      () => {},
      () => {},
      () => {},
    );

    const identity = {
      ...createDefaultIdentity("nue"),
      aliases: new Set(["nue"]),
    };

    // A complete 12CB: nue's Luigi (carrying 2 stocks after game 1) beats
    // all 12 of shidozz2's characters. Only complete battles are shown.
    const opponentChars = [39, 40, 41, 42, 36, 37, 44, 46, 48, 49, 50, 43];
    const games: GameSummary[] = opponentChars.map((oppChar, i) => ({
      id: `cb${i + 1}`,
      sourceName: `g${i + 1}.rmgr`,
      recordedAt: new Date(Date.UTC(2026, 7, 27, 17, i * 3)),
      stageId: DREAM_LAND_STAGE_ID,
      frameCount: 3600,
      isComplete: true,
      fileRef: null,
      isUnevenStockStart: i > 0,
      ports: [
        {
          port: 0,
          playerName: "nue",
          characterId: 43,
          finalStocks: 2,
          startStocks: i === 0 ? 4 : 2,
        },
        {
          port: 1,
          playerName: "shidozz2",
          characterId: oppChar,
          finalStocks: 0,
          startStocks: 4,
        },
      ],
      statsByPort: {},
    }));

    gameList.render(games, identity, games.length);

    const html = mockContainer.innerHTML;
    expect(html).toContain('class="session-stat-pill session-12cb-pill"');
    expect(html).toContain("12CB");
    expect(html).toContain('class="twelve-cb-section"');
    expect(html).toContain('class="twelve-cb-outcome-pill');
    expect(html).toContain("Match 1/12");
    expect(html).toContain("Match 12/12");
    expect(html).toContain('class="player-entry winner"');
    expect(html).toContain('class="player-entry loser"');
  });

  describe("compact session rows", () => {
    const identity = {
      ...createDefaultIdentity("nue"),
      aliases: new Set(["nue"]),
    };

    const makeGame = (
      id: string,
      time: string,
      oppName: string,
      yourChar: number,
      oppChar: number,
      yourStocks: number,
      oppStocks: number,
    ): GameSummary => ({
      id,
      sourceName: `${id}.rmgr`,
      recordedAt: new Date(time),
      stageId: DREAM_LAND_STAGE_ID,
      frameCount: 3600,
      isComplete: true,
      fileRef: null,
      ports: [
        {
          port: 0,
          playerName: "nue",
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

    const renderHtml = (games: GameSummary[]): string => {
      const container = {
        innerHTML: "",
        querySelector: () => null,
        querySelectorAll: () => [],
      } as unknown as HTMLElement;
      new GameList(
        container,
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
      ).render(games, identity, games.length);
      return container.innerHTML;
    };

    it("shows what every game shares once, in the session header", () => {
      const html = renderHtml([
        makeGame("a", "2026-08-23T18:32:00", "Wario", 9, 2, 0, 2),
        makeGame("b", "2026-08-23T18:35:00", "Wario", 9, 2, 1, 0),
      ]);

      expect(html).toContain('class="session-matchup"');
      expect(html.split("Dream Land").length - 1).toBe(1); // header only
      expect(html).not.toContain('class="player-entry'); // no per-row matchup
      expect(html).toContain("L · 2 left");
      expect(html).toContain("W · 1 left");
    });

    it("keeps characters in the rows when the matchup varies", () => {
      const html = renderHtml([
        makeGame("a", "2026-08-23T18:32:00", "Wario", 9, 2, 0, 2),
        makeGame("b", "2026-08-23T18:35:00", "Wario", 9, 1, 1, 0),
      ]);

      expect(html).not.toContain('class="session-matchup"');
      expect(html).toContain('class="player-entry');
    });

    it("collapses every session except the most recent", () => {
      const html = renderHtml([
        makeGame("old", "2026-08-20T18:00:00", "Wario", 9, 2, 1, 0),
        makeGame("new", "2026-08-23T18:00:00", "kix", 9, 1, 1, 0),
      ]);

      expect(html).toContain(
        'class="session-group" data-session-id="session_new"',
      );
      expect(html).toContain(
        'class="session-group collapsed" data-session-id="session_old"',
      );
    });

    it("shows games you only watched as dimmed 'watched' rows, with no player chooser", () => {
      // nue is in the lobby but sat out: shidozzzz vs zabuton.
      const watched: GameSummary = {
        ...makeGame("w", "2026-08-23T18:38:00", "zabuton", 9, 2, 1, 0),
        lobbyNames: ["shidozzzz", "zabuton", "nue"],
        ports: [
          { port: 0, playerName: "shidozzzz", characterId: 9, finalStocks: 1 },
          { port: 1, playerName: "zabuton", characterId: 2, finalStocks: 0 },
        ],
      };
      const html = renderHtml([watched]);

      expect(html).toContain('class="game-row watched');
      expect(html).toContain("Watched");
      expect(html).toContain("shidozzzz");
      expect(html).not.toContain("inline-perspective-btn");
    });
  });
});
