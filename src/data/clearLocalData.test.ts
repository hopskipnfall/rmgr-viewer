import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { clearLocalData } from "./clearLocalData.js";
import { openLibraryStore, type StoredGame } from "./libraryStore.js";

function memoryStorage(entries: Record<string, string>): Storage {
  const map = new Map(Object.entries(entries));
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  };
}

const entry = {
  id: "a",
  contentHash: "h",
  formatVersion: 5,
  recorderSchemaVersion: 1,
  analysisVersion: 1,
  sourcePath: "a.rmgr",
  size: 1,
  lastModified: 1,
  manualPerspectivePort: null,
  summary: {
    id: "a",
    sourceName: "a.rmgr",
    recordedAt: "2026-01-01T00:00:00.000Z",
    stageId: 0,
    frameCount: 1,
    isComplete: true,
    ports: [],
    statsByPort: {},
  },
} satisfies StoredGame;

describe("clearLocalData", () => {
  it("empties the game cache and removes only this app's localStorage keys", async () => {
    const store = await openLibraryStore(new IDBFactory());
    await store.putMany([entry]);
    const storage = memoryStorage({
      "rmgr-viewer-identity": "{}",
      "rmgr-viewer-lang": "ja",
      rmgr_yt_link_g_abc: "{}",
      "someone-elses-key": "keep",
    });

    await clearLocalData(store, storage);

    expect(await store.getAll()).toEqual([]);
    expect(storage.length).toBe(1);
    expect(storage.getItem("someone-elses-key")).toBe("keep");
  });

  it("still clears localStorage when there is no IndexedDB store", async () => {
    const storage = memoryStorage({ "rmgr-viewer-hud": "true" });
    await clearLocalData(null, storage);
    expect(storage.length).toBe(0);
  });
});
