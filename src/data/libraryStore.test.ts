import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { openLibraryStore, type StoredGame } from "./libraryStore.js";

function game(id: string, overrides: Partial<StoredGame> = {}): StoredGame {
  return {
    id,
    contentHash: "h",
    formatVersion: 5,
    recorderSchemaVersion: 1,
    analysisVersion: 1,
    sourcePath: `${id}.rmgr`,
    size: 1,
    lastModified: 1,
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

describe("libraryStore", () => {
  it("round-trips entries, overwrites by id, and deletes", async () => {
    const store = await openLibraryStore(new IDBFactory());
    await store.putMany([game("a"), game("b")]);
    await store.putMany([game("a", { contentHash: "h2" })]);
    await store.delete("b");

    const all = await store.getAll();
    expect(all.map((g) => [g.id, g.contentHash])).toEqual([["a", "h2"]]);
  });

  it("persists across reopening the same database", async () => {
    const factory = new IDBFactory();
    await (await openLibraryStore(factory)).putMany([game("a")]);

    const reopened = await openLibraryStore(factory);
    expect((await reopened.getAll()).map((g) => g.id)).toEqual(["a"]);
  });

  it("clears every entry", async () => {
    const store = await openLibraryStore(new IDBFactory());
    await store.putMany([game("a"), game("b")]);
    await store.clear();
    expect(await store.getAll()).toEqual([]);
  });

  it("writes nothing for an empty batch", async () => {
    const store = await openLibraryStore(new IDBFactory());
    await store.putMany([]);
    expect(await store.getAll()).toEqual([]);
  });
});
