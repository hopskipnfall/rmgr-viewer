import { describe, it, expect, vi, afterEach } from "vitest";
import { LibraryViewController } from "./libraryView.js";
import type { GameSummary, RawCounters } from "../data/gameSummary.js";
import { DREAM_LAND_STAGE_ID } from "../stageGeometry.js";

interface FakeEl {
  hidden: boolean;
  innerHTML: string;
  textContent: string;
  addEventListener: () => void;
  querySelector: () => null;
  querySelectorAll: () => never[];
  classList: { add: () => void; remove: () => void; toggle: () => void };
}

function makeFakeEl(): FakeEl {
  return {
    hidden: false,
    innerHTML: "",
    textContent: "",
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
  };
}

function makeFakeContainer() {
  const byId = new Map<string, FakeEl>();
  const get = (id: string) => {
    if (!byId.has(id)) byId.set(id, makeFakeEl());
    return byId.get(id)!;
  };
  return {
    innerHTML: "",
    querySelector: (selector: string) => {
      const m = /^#([\w-]+)/.exec(selector);
      return m ? get(m[1]!) : makeFakeEl();
    },
    querySelectorAll: () => [],
    byId: get,
  } as unknown as HTMLElement & { byId: (id: string) => FakeEl };
}

function makeTestSummary(
  id: string,
  yourChar: number,
  oppChar: number,
): GameSummary {
  const counters: RawCounters = {
    recoverySituations: 0,
    recoverySuccesses: 0,
    edgeGuardEffectivenessSum: 0,
    edgeGuardEffectivenessCount: 0,
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
    id,
    sourceName: `${id}.rmgr`,
    recordedAt: new Date("2026-01-01T12:00:00Z"),
    stageId: DREAM_LAND_STAGE_ID,
    frameCount: 4000,
    isComplete: true,
    ports: [
      { port: 0, playerName: "Player", characterId: yourChar, finalStocks: 3 },
      { port: 1, playerName: "Opponent", characterId: oppChar, finalStocks: 0 },
    ],
    statsByPort: { 0: counters, 1: { ...counters } },
    fileRef: null,
  };
}

describe("LibraryViewController desktop/mobile game list gating", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hides the game list on desktop when no character is selected", () => {
    vi.stubGlobal("window", { innerWidth: 1200 });
    const container = makeFakeContainer();
    const controller = new LibraryViewController(
      container,
      () => {},
      () => {},
      () => {},
    );
    controller.setSummaries([]);

    expect(container.byId("gameListWrap").hidden).toBe(true);
  });

  it("shows the game list on mobile", () => {
    vi.stubGlobal("window", { innerWidth: 500 });
    const container = makeFakeContainer();
    const controller = new LibraryViewController(
      container,
      () => {},
      () => {},
      () => {},
    );
    controller.setSummaries([]);

    expect(container.byId("gameListWrap").hidden).toBe(false);
  });

  it("shows filtered games on desktop when 'my character' is selected, and further filters when 'opponent character' is chosen", () => {
    vi.stubGlobal("window", { innerWidth: 1200 });
    const container = makeFakeContainer();
    const controller = new LibraryViewController(
      container,
      () => {},
      () => {},
      () => {},
    );
    controller.setIdentity({
      displayName: "Player",
      aliases: new Set(["Player"]),
    });

    const g1 = makeTestSummary("game-fox-mario", 1, 0); // Fox vs Mario
    const g2 = makeTestSummary("game-pika-mario", 9, 0); // Pikachu vs Mario
    const g3 = makeTestSummary("game-fox-link", 1, 5); // Fox vs Link
    controller.setSummaries([g1, g2, g3]);

    // Initially with no character selected, game list is hidden on desktop
    expect(container.byId("gameListWrap").hidden).toBe(true);

    // 1. Select "my character" = Fox (1), no opponent character selected yet
    controller.setSelectedMatchup(1, null);
    expect(container.byId("gameListWrap").hidden).toBe(false);
    expect(container.byId("gameListWrap").innerHTML).toContain(
      "game-fox-mario",
    );
    expect(container.byId("gameListWrap").innerHTML).toContain("game-fox-link");
    expect(container.byId("gameListWrap").innerHTML).not.toContain(
      "game-pika-mario",
    );

    // 2. Select "opponent character" = Mario (0): further filters to Fox vs Mario
    controller.setSelectedMatchup(1, 0);
    expect(container.byId("gameListWrap").hidden).toBe(false);
    expect(container.byId("gameListWrap").innerHTML).toContain(
      "game-fox-mario",
    );
    expect(container.byId("gameListWrap").innerHTML).not.toContain(
      "game-fox-link",
    );
    expect(container.byId("gameListWrap").innerHTML).not.toContain(
      "game-pika-mario",
    );

    // 3. Deselect "opponent character" back to null: shows all Fox games again
    controller.setSelectedMatchup(1, null);
    expect(container.byId("gameListWrap").hidden).toBe(false);
    expect(container.byId("gameListWrap").innerHTML).toContain(
      "game-fox-mario",
    );
    expect(container.byId("gameListWrap").innerHTML).toContain("game-fox-link");

    // 4. Deselect "my character": list hides on desktop
    controller.setSelectedMatchup(null, null);
    expect(container.byId("gameListWrap").hidden).toBe(true);
  });
});
