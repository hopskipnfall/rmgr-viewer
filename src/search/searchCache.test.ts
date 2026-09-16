import { describe, it, expect } from "vitest";
import { SearchCache, searchCacheKey } from "./searchCache.js";
import type { SearchRouteCriteria } from "../router.js";
import type { PlaylistClip } from "../playlist.js";

const criteria: SearchRouteCriteria = {
  type: "edgeGuards",
  result: "failure",
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

const value = (n: number) => ({
  results: Array.from(
    { length: n },
    (_, i) => ({ id: i }) as unknown as PlaylistClip,
  ),
  unloadedCount: 0,
});

describe("searchCacheKey", () => {
  it("is stable regardless of game id order", () => {
    expect(searchCacheKey(criteria, ["b", "a"])).toBe(
      searchCacheKey(criteria, ["a", "b"]),
    );
  });

  it("differs when criteria differ", () => {
    expect(searchCacheKey(criteria, ["a"])).not.toBe(
      searchCacheKey({ ...criteria, result: "success" }, ["a"]),
    );
  });

  it("differs when the searched game set differs", () => {
    expect(searchCacheKey(criteria, ["a"])).not.toBe(
      searchCacheKey(criteria, ["a", "b"]),
    );
  });
});

describe("SearchCache", () => {
  it("returns a stored entry", () => {
    const cache = new SearchCache(3);
    cache.set("k", value(2));
    expect(cache.get("k")?.results).toHaveLength(2);
  });

  it("returns undefined for an unknown key", () => {
    expect(new SearchCache(3).get("nope")).toBeUndefined();
  });

  it("evicts the least recently used entry past its limit", () => {
    const cache = new SearchCache(2);
    cache.set("a", value(1));
    cache.set("b", value(1));
    cache.get("a"); // "a" is now the most recently used
    cache.set("c", value(1));
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBeDefined();
    expect(cache.get("c")).toBeDefined();
  });

  it("clear() empties the cache", () => {
    const cache = new SearchCache(2);
    cache.set("a", value(1));
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
  });
});
