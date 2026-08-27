import { describe, it, expect } from "vitest";
import { detectMainCharacter } from "./mainCharacter.js";
import type { GameSummary, RawCounters } from "./gameSummary.js";
import { createDefaultIdentity } from "./identity.js";
import { DREAM_LAND_STAGE_ID } from "../stageGeometry.js";

function makeSummary(id: string, yourChar: number): GameSummary {
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
    id,
    sourceName: `${id}.rmgr`,
    recordedAt: new Date(),
    stageId: DREAM_LAND_STAGE_ID,
    frameCount: 4000,
    isComplete: true,
    ports: [
      { port: 0, playerName: "Marcela", characterId: yourChar, finalStocks: 3 },
      { port: 1, playerName: "Penelope", characterId: 2, finalStocks: 0 },
    ],
    statsByPort: { 0: counters, 1: { ...counters } },
    fileRef: null,
  };
}

describe("mainCharacter module", () => {
  const identity = createDefaultIdentity("Marcela");
  identity.aliases.add("Marcela");

  it("detects a clear main above the usage threshold", () => {
    const games = [
      ...Array.from({ length: 8 }, (_, i) => makeSummary(`pika${i}`, 7)),
      ...Array.from({ length: 2 }, (_, i) => makeSummary(`other${i}`, 1)),
    ];
    expect(detectMainCharacter(games, identity)).toBe(7);
  });

  it("returns null when no character clears the threshold (all-rounder)", () => {
    const games = [
      makeSummary("a", 1),
      makeSummary("b", 2),
      makeSummary("c", 3),
      makeSummary("d", 4),
      makeSummary("e", 5),
    ];
    expect(detectMainCharacter(games, identity)).toBeNull();
  });

  it("returns null with no resolved games", () => {
    expect(detectMainCharacter([], identity)).toBeNull();
  });
});
