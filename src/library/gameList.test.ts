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
          edgeGuardSituations: 3,
          edgeGuardSuccesses: 2,
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
    expect(html).toContain('class="game-row single-game-pulse row-won"');
    expect(html).toContain('class="game-row-header"');
    expect(html).toContain('class="game-row-body"');

    // Check header contents
    expect(html).toContain("Dream Land");
    expect(html).toContain("Isai");
    expect(html).toContain("Mew2King");
    expect(html).toContain('<span class="result-badge win">WIN</span>');

    // Check supplementary body contents
    expect(html).toContain("3 – 0");
    expect(html).toContain("Rec</span> 75% (3/4)");
    expect(html).toContain("EG</span> 67% (2/3)");
    expect(html).toContain("Getup</span> 100% (2/2)");

    // Check itemized kill combo chips
    expect(html).toContain("Kill Combos:");
    expect(html).toContain('<span class="chip-label">3 hits</span> 33% → 87% <span class="chip-ko">KO</span>');
    expect(html).toContain('<span class="chip-label">6 hits</span> 21% → 75% <span class="chip-ko">KO</span>');
  });
});
