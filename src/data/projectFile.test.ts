import { describe, it, expect } from "vitest";
import {
  buildProjectFile,
  identityOf,
  mergeProjectFile,
  parseProjectFile,
  ProjectFileError,
  serializeProjectFile,
} from "./projectFile.js";
import { ANALYSIS_VERSION } from "./analysisVersion.js";
import { createDefaultIdentity } from "./identity.js";
import type { LibraryStore, StoredGame } from "./libraryStore.js";
import type { VideoLinkData } from "../video/youtubeSync.js";

function storedGame(
  id: string,
  analysisVersion = ANALYSIS_VERSION,
): StoredGame {
  return {
    id,
    contentHash: `hash-${id}`,
    formatVersion: 5,
    recorderSchemaVersion: 1,
    analysisVersion,
    sourcePath: `folder/${id}.rmgr`,
    size: 1234,
    manualPerspectivePort: null,
    summary: { id },
  } as unknown as StoredGame;
}

function fakeStore(initial: StoredGame[] = []): LibraryStore & {
  rows: StoredGame[];
} {
  const rows = [...initial];
  return {
    rows,
    getAll: async () => [...rows],
    putMany: async (games: readonly StoredGame[]) => {
      for (const g of games) {
        const at = rows.findIndex((r) => r.id === g.id);
        if (at === -1) rows.push(g);
        else rows[at] = g;
      }
    },
    delete: async (id: string) => {
      const at = rows.findIndex((r) => r.id === id);
      if (at !== -1) rows.splice(at, 1);
    },
    clear: async () => {
      rows.length = 0;
    },
  };
}

describe("project file round trip", () => {
  it("parses back exactly what it built", () => {
    const built = buildProjectFile(
      [storedGame("a")],
      createDefaultIdentity("Jonn"),
      { a: { videoId: "abc123" } as unknown as VideoLinkData },
    );
    const parsed = parseProjectFile(JSON.stringify(built));

    expect(parsed.games).toHaveLength(1);
    expect(parsed.games[0]?.id).toBe("a");
    expect(parsed.games[0]?.contentHash).toBe("hash-a");
    expect(parsed.videoLinks.a).toBeDefined();
    expect(parsed.analysisVersion).toBe(ANALYSIS_VERSION);
  });

  it("round-trips identity aliases (a Set, which JSON.stringify would drop)", () => {
    const identity = {
      displayName: "Jonn",
      aliases: new Set(["Jonn", "nue"]),
    };
    const built = buildProjectFile([], identity, {});
    const parsed = parseProjectFile(JSON.stringify(built));

    expect([...parsed.identity.aliases].sort()).toEqual(["Jonn", "nue"]);
    expect(identityOf(parsed).aliases.has("nue")).toBe(true);
    expect(identityOf(parsed).displayName).toBe("Jonn");
  });

  it("keeps a hand-set perspective", () => {
    const built = buildProjectFile(
      [{ ...storedGame("a"), manualPerspectivePort: 1 }],
      createDefaultIdentity(),
      {},
    );
    expect(
      parseProjectFile(JSON.stringify(built)).games[0]?.manualPerspectivePort,
    ).toBe(1);
  });

  it("rejects a file that isn't a project file", () => {
    expect(() => parseProjectFile('{"kind":"something-else"}')).toThrow(
      ProjectFileError,
    );
    expect(() => parseProjectFile("not json")).toThrow(ProjectFileError);
  });

  it("rejects a project file from a newer app version", () => {
    const built = buildProjectFile([], createDefaultIdentity(), {});
    const newer = JSON.stringify({ ...built, fileVersion: 99 });
    expect(() => parseProjectFile(newer)).toThrow(ProjectFileError);
  });
});

describe("serializeProjectFile layout", () => {
  it("puts each game and video link on its own line, and still parses", async () => {
    const built = buildProjectFile(
      [storedGame("a"), storedGame("b"), storedGame("c")],
      createDefaultIdentity("Jonn"),
      {
        a: { videoId: "v1" } as unknown as VideoLinkData,
        b: { videoId: "v2" } as unknown as VideoLinkData,
      },
    );
    const text = await serializeProjectFile(built).text();

    const gameLines = text
      .split("\n")
      .filter((l) => l.includes('"contentHash"'));
    expect(gameLines).toHaveLength(3);
    const linkLines = text.split("\n").filter((l) => l.includes('"videoId"'));
    expect(linkLines).toHaveLength(2);

    const parsed = parseProjectFile(text);
    expect(parsed.games.map((g) => g.id)).toEqual(["a", "b", "c"]);
    expect(parsed.videoLinks.b?.videoId).toBe("v2");
    expect(parsed.identity.displayName).toBe("Jonn");
  });

  it("stays valid JSON with no games and no video links", async () => {
    const text = await serializeProjectFile(
      buildProjectFile([], createDefaultIdentity(), {}),
    ).text();

    const parsed = parseProjectFile(text);
    expect(parsed.games).toEqual([]);
    expect(parsed.videoLinks).toEqual({});
  });
});

describe("mergeProjectFile", () => {
  it("adds games and reports the count", async () => {
    const store = fakeStore();
    const file = buildProjectFile(
      [storedGame("a"), storedGame("b")],
      createDefaultIdentity(),
      {},
    );
    const result = await mergeProjectFile(file, store);

    expect(result.imported).toBe(2);
    expect(result.skippedStale).toBe(0);
    expect(store.rows).toHaveLength(2);
  });

  it("drops entries analyzed by an older version so they get recomputed", async () => {
    const store = fakeStore();
    const file = buildProjectFile(
      [storedGame("a"), storedGame("old", ANALYSIS_VERSION - 1)],
      createDefaultIdentity(),
      {},
    );
    const result = await mergeProjectFile(file, store);

    expect(result.imported).toBe(1);
    expect(result.skippedStale).toBe(1);
    expect(store.rows.map((r) => r.id)).toEqual(["a"]);
  });

  it("merges rather than replacing the existing library", async () => {
    const store = fakeStore([storedGame("existing")]);
    const file = buildProjectFile(
      [storedGame("new")],
      createDefaultIdentity(),
      {},
    );
    await mergeProjectFile(file, store);

    expect(store.rows.map((r) => r.id).sort()).toEqual(["existing", "new"]);
  });
});
