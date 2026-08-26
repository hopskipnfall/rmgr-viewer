import { describe, it, expect } from "vitest";
import {
  createDefaultIdentity,
  matchesAlias,
  resolvePerspectivePort,
  resolveOpponentPort,
  extractAllPlayerNames,
  type Identity,
} from "./identity.js";
import type { GameSummary, RawCounters } from "./gameSummary.js";

function dummyCounters(): RawCounters {
  return {
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
}

function createDummySummary(
  id: string,
  ports: { port: 0 | 1 | 2 | 3; playerName: string; characterId: number }[],
  stageId = 6,
  manualPerspectivePort: 0 | 1 | 2 | 3 | null = null,
): GameSummary {
  return {
    id,
    sourceName: `${id}.rmgr`,
    recordedAt: new Date(2026, 7, 25),
    stageId,
    frameCount: 5000,
    isComplete: true,
    ports: ports.map((p) => ({
      port: p.port,
      playerName: p.playerName,
      characterId: p.characterId,
      finalStocks: 4,
    })),
    statsByPort: {
      [ports[0]!.port]: dummyCounters(),
      [ports[1]!.port]: dummyCounters(),
    },
    manualPerspectivePort,
    fileRef: null,
  };
}

describe("identity module", () => {
  it("matches aliases case-insensitively and trimmed", () => {
    const id: Identity = {
      displayName: "Me",
      aliases: new Set(["Marcela", "FalconMain"]),
    };
    expect(matchesAlias("Marcela", id)).toBe(true);
    expect(matchesAlias("marcela", id)).toBe(true);
    expect(matchesAlias("  MARCELA  ", id)).toBe(true);
    expect(matchesAlias("FalconMain", id)).toBe(true);
    expect(matchesAlias("Penelope", id)).toBe(false);
    expect(matchesAlias("", id)).toBe(false);
  });

  it("resolves perspective based on manual override first", () => {
    const id = createDefaultIdentity("Marcela");
    id.aliases.add("Marcela");

    const summary = createDummySummary(
      "g1",
      [
        { port: 0, playerName: "Marcela", characterId: 2 },
        { port: 1, playerName: "Penelope", characterId: 7 },
      ],
      6,
      1, // Manual override to port 1
    );

    expect(resolvePerspectivePort(summary, id)).toBe(1);
  });

  it("resolves perspective based on unique alias match", () => {
    const id = createDefaultIdentity("Marcela");
    id.aliases.add("Marcela");

    const summary = createDummySummary("g1", [
      { port: 0, playerName: "Penelope", characterId: 7 },
      { port: 1, playerName: "Marcela", characterId: 2 },
    ]);

    expect(resolvePerspectivePort(summary, id)).toBe(1);
    expect(resolveOpponentPort(summary, 1)).toBe(0);
  });

  it("returns null (ambiguous) when multiple ports match alias", () => {
    const id = createDefaultIdentity("Marcela");
    id.aliases.add("Marcela");
    id.aliases.add("Player");

    const summary = createDummySummary("g1", [
      { port: 0, playerName: "Marcela", characterId: 2 },
      { port: 1, playerName: "Player", characterId: 7 },
    ]);

    expect(resolvePerspectivePort(summary, id)).toBe(null);
  });

  it("returns null (ambiguous) when no port matches alias or offline", () => {
    const id = createDefaultIdentity("Marcela");
    id.aliases.add("Marcela");

    const summary = createDummySummary("g1", [
      { port: 0, playerName: "", characterId: 2 },
      { port: 1, playerName: "", characterId: 7 },
    ]);

    expect(resolvePerspectivePort(summary, id)).toBe(null);
  });

  it("extracts and tallies unique player names ordered by count", () => {
    const s1 = createDummySummary("g1", [
      { port: 0, playerName: "Marcela", characterId: 2 },
      { port: 1, playerName: "Penelope", characterId: 7 },
    ]);
    const s2 = createDummySummary("g2", [
      { port: 0, playerName: "Marcela", characterId: 2 },
      { port: 1, playerName: "FoxMaster", characterId: 1 },
    ]);
    const s3 = createDummySummary("g3", [
      { port: 0, playerName: "Marcela", characterId: 2 },
      { port: 1, playerName: "Penelope", characterId: 7 },
    ]);

    const names = extractAllPlayerNames([s1, s2, s3]);
    expect(names).toEqual([
      { name: "Marcela", count: 3 },
      { name: "Penelope", count: 2 },
      { name: "FoxMaster", count: 1 },
    ]);
  });

  it("creates default identity with initial name and supports reset", () => {
    const demoIdentity = createDefaultIdentity("George");
    expect(demoIdentity.displayName).toBe("George");
    expect(demoIdentity.aliases.has("George")).toBe(true);

    const clearedIdentity = createDefaultIdentity("");
    expect(clearedIdentity.displayName).toBe("");
    expect(clearedIdentity.aliases.size).toBe(0);
  });
});
