import { describe, it, expect } from "vitest";
import { sessionNeighbors } from "./sessionNavigation.js";
import { createDefaultIdentity } from "./identity.js";
import type { GameSummary } from "./gameSummary.js";
import { DREAM_LAND_STAGE_ID } from "../stageGeometry.js";

function game(id: string, minutesFromStart: number): GameSummary {
  return {
    id,
    sourceName: `${id}.rmgr`,
    recordedAt: new Date(Date.UTC(2026, 8, 16, 12, minutesFromStart)),
    stageId: DREAM_LAND_STAGE_ID,
    frameCount: 3600,
    isComplete: true,
    fileRef: null,
    ports: [
      { port: 0, playerName: "Jonn", characterId: 0x09, finalStocks: 3 },
      { port: 1, playerName: "Nue", characterId: 0x05, finalStocks: 0 },
    ],
    statsByPort: {},
  } as unknown as GameSummary;
}

const identity = {
  ...createDefaultIdentity(),
  aliases: new Set(["Jonn"]),
};

describe("sessionNeighbors", () => {
  // Deliberately out of chronological order: neighbors follow play order,
  // not the order the caller happened to pass games in.
  const summaries = [game("b", 10), game("c", 20), game("a", 0)];

  it("gives the middle game both neighbors, in play order", () => {
    const nav = sessionNeighbors("b", summaries, identity);
    expect(nav?.previousGameId).toBe("a");
    expect(nav?.nextGameId).toBe("c");
    expect(nav?.index).toBe(1);
    expect(nav?.total).toBe(3);
  });

  it("gives the first game of the session no previous", () => {
    const nav = sessionNeighbors("a", summaries, identity);
    expect(nav?.index).toBe(0);
    expect(nav?.previousGameId).toBeNull();
    expect(nav?.nextGameId).toBe("b");
  });

  it("gives the last game of the session no next", () => {
    const nav = sessionNeighbors("c", summaries, identity);
    expect(nav?.index).toBe(2);
    expect(nav?.previousGameId).toBe("b");
    expect(nav?.nextGameId).toBeNull();
  });

  it("returns null for a game that isn't in the library", () => {
    expect(sessionNeighbors("missing", summaries, identity)).toBeNull();
  });
});
