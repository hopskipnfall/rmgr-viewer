import { describe, expect, it } from "vitest";
import { ANALYSIS_VERSION } from "./analysisVersion.js";
import {
  decideEntry,
  findFastPathMatch,
  pickPreferred,
  type FileMeta,
} from "./importPlanner.js";
import type { StoredGame } from "./libraryStore.js";

function game(id: string, overrides: Partial<StoredGame> = {}): StoredGame {
  return {
    id,
    contentHash: "h",
    formatVersion: 5,
    recorderSchemaVersion: 1,
    analysisVersion: ANALYSIS_VERSION,
    sourcePath: `dir/${id}.rmgr`,
    size: 100,
    lastModified: 1000,
    manualPerspectivePort: null,
    summary: {
      id,
      sourceName: `${id}.rmgr`,
      recordedAt: "2026-01-01T00:00:00.000Z",
      stageId: 0,
      frameCount: 1,
      isComplete: true,
      ports: [],
      statsByPort: {},
    },
    ...overrides,
  };
}

function byPath(...games: StoredGame[]): Map<string, StoredGame> {
  return new Map(games.map((g) => [g.sourcePath, g]));
}

const meta: FileMeta = {
  sourcePath: "dir/a.rmgr",
  size: 100,
  lastModified: 1000,
};

describe("findFastPathMatch", () => {
  it("matches a fresh entry with the same path, size and mtime", () => {
    const a = game("a");
    expect(findFastPathMatch(meta, byPath(a))).toBe(a);
  });

  it("misses when the size differs", () => {
    expect(findFastPathMatch({ ...meta, size: 101 }, byPath(game("a")))).toBe(
      null,
    );
  });

  it("misses when the last-modified time differs", () => {
    expect(
      findFastPathMatch({ ...meta, lastModified: 1001 }, byPath(game("a"))),
    ).toBe(null);
  });

  it("misses when the path is unknown", () => {
    expect(
      findFastPathMatch(
        { ...meta, sourcePath: "other/a.rmgr" },
        byPath(game("a")),
      ),
    ).toBe(null);
  });

  it("misses when the entry is stale, so it gets re-parsed", () => {
    const stale = game("a", { analysisVersion: ANALYSIS_VERSION - 1 });
    expect(findFastPathMatch(meta, byPath(stale))).toBe(null);
  });
});

describe("decideEntry", () => {
  it("adds an unknown game", () => {
    expect(decideEntry(undefined, { contentHash: "h" })).toBe("add");
  });

  it("only touches a known game whose bytes are unchanged", () => {
    expect(decideEntry(game("a"), { contentHash: "h" })).toBe("touch");
  });

  it("replaces a known game whose bytes changed", () => {
    expect(decideEntry(game("a"), { contentHash: "other" })).toBe("replace");
  });

  it("replaces a stale entry even when the bytes are unchanged", () => {
    const stale = game("a", { analysisVersion: ANALYSIS_VERSION - 1 });
    expect(decideEntry(stale, { contentHash: "h" })).toBe("replace");
  });
});

describe("pickPreferred", () => {
  const v = (formatVersion: number, recorderSchemaVersion: number) => ({
    formatVersion,
    recorderSchemaVersion,
  });

  it("prefers the newer format version", () => {
    const newer = v(6, 1);
    expect(pickPreferred(v(5, 9), newer)).toBe(newer);
  });

  it("falls back to the newer recorder schema version", () => {
    const newer = v(5, 2);
    expect(pickPreferred(newer, v(5, 1))).toBe(newer);
  });

  it("keeps the first on a tie", () => {
    const first = v(5, 1);
    expect(pickPreferred(first, v(5, 1))).toBe(first);
  });
});
