import { describe, expect, it } from "vitest";
import { parseRoute, searchHash, type SearchRouteCriteria } from "./router.js";

const base: SearchRouteCriteria = {
  type: "edgeGuards",
  result: null,
  sessionId: null,
  playerName: null,
  playerCharacterId: null,
  opponentCharacterId: null,
  jumpCount: null,
  startingAreaBox: null,
  victimName: null,
  minHits: null,
  killed: null,
  allowGaps: false,
};

describe("search route", () => {
  it("round-trips every combo filter through the URL", () => {
    const criteria: SearchRouteCriteria = {
      ...base,
      type: "combos",
      sessionId: "session_g_abc",
      playerName: "nue",
      victimName: "kix",
      playerCharacterId: 50,
      opponentCharacterId: 2,
      minHits: 5,
      killed: true,
      allowGaps: true,
    };
    expect(parseRoute(searchHash(criteria))).toEqual({
      view: "search",
      ...criteria,
    });
  });

  it("round-trips 'did not KO'", () => {
    const criteria = { ...base, type: "combos" as const, killed: false };
    expect(parseRoute(searchHash(criteria))).toEqual({
      view: "search",
      ...criteria,
    });
  });

  it("reads older edge-guard links (no type) as edge-guard searches", () => {
    expect(parseRoute("#/search?result=failure&player=nue")).toEqual({
      view: "search",
      ...base,
      result: "failure",
      playerName: "nue",
    });
  });
});
