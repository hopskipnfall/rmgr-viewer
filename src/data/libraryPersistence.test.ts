import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import { ANALYSIS_VERSION } from "./analysisVersion.js";
import { DEMO_REPLAY_FILENAMES } from "./demoReplayFiles.js";
import * as importer from "./importer.js";
import { openLibraryStore, type LibraryStore } from "./libraryStore.js";
import {
  importIntoLibrary,
  loadPersistedLibrary,
  setManualPerspective,
} from "./libraryPersistence.js";

const replaysDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../public/replays",
);
const NAMES = DEMO_REPLAY_FILENAMES.slice(0, 3);
const BYTES = NAMES.map(
  (name) => new Uint8Array(readFileSync(resolve(replaysDir, name))),
);

function demoFiles(rename: (name: string) => string = (n) => n): File[] {
  return NAMES.map(
    (name, i) => new File([BYTES[i]!], rename(name), { lastModified: 1000 }),
  );
}

async function freshStore(): Promise<LibraryStore> {
  return openLibraryStore(new IDBFactory());
}

describe("importIntoLibrary + loadPersistedLibrary", () => {
  it("persists imported games, which load after a 'refresh' with no files attached", async () => {
    const store = await freshStore();
    const imported = await importIntoLibrary(store, demoFiles());

    expect(imported.errors).toEqual([]);
    expect(imported.summaries).toHaveLength(3);
    expect(imported.summaries.every((s) => s.fileRef !== null)).toBe(true);
    expect(imported.newIds).toHaveLength(3);

    const loaded = await loadPersistedLibrary(store);
    expect(loaded.staleEntries).toEqual([]);
    expect(loaded.summaries.map((s) => s.id).sort()).toEqual(
      imported.summaries.map((s) => s.id).sort(),
    );
    expect(loaded.summaries.every((s) => s.fileRef === null)).toBe(true);
    expect(loaded.summaries[0]!.recordedAt).toBeInstanceOf(Date);
  });

  it("re-importing unchanged files attaches them without parsing", async () => {
    const store = await freshStore();
    await importIntoLibrary(store, demoFiles());

    const spy = vi.spyOn(importer, "importReplayFiles");
    const again = await importIntoLibrary(store, demoFiles());
    const parsedFileCount = spy.mock.calls.reduce(
      (n, [files]) => n + Array.from(files).length,
      0,
    );
    spy.mockRestore();

    expect(parsedFileCount).toBe(0);
    expect(again.summaries).toHaveLength(3);
    expect(again.summaries.every((s) => s.fileRef !== null)).toBe(true);
    expect(again.newIds).toEqual([]);
  });

  it("sets stale entries aside, then replaces them on re-import", async () => {
    const store = await freshStore();
    await importIntoLibrary(store, demoFiles());
    const all = await store.getAll();
    await store.putMany(
      all.map((g) => ({ ...g, analysisVersion: ANALYSIS_VERSION - 1 })),
    );

    const loaded = await loadPersistedLibrary(store);
    expect(loaded.summaries).toEqual([]);
    expect(loaded.staleEntries).toHaveLength(3);

    const reimported = await importIntoLibrary(store, demoFiles());
    expect(reimported.staleEntries).toEqual([]);
    expect(reimported.newIds).toEqual([]);
    const after = await store.getAll();
    expect(after.every((g) => g.analysisVersion === ANALYSIS_VERSION)).toBe(
      true,
    );
  });

  it("a moved/renamed file with the same bytes only updates its path", async () => {
    const store = await freshStore();
    await importIntoLibrary(store, demoFiles());

    await importIntoLibrary(
      store,
      demoFiles((n) => `moved-${n}`),
    );
    const all = await store.getAll();
    expect(all).toHaveLength(3);
    expect(all.every((g) => g.sourcePath.startsWith("moved-"))).toBe(true);
  });

  it("reports stale entries that this import didn't cover", async () => {
    const store = await freshStore();
    await importIntoLibrary(store, demoFiles());
    const all = await store.getAll();
    await store.putMany(
      all.map((g) => ({ ...g, analysisVersion: ANALYSIS_VERSION - 1 })),
    );

    const partial = await importIntoLibrary(store, demoFiles().slice(0, 1));
    expect(partial.staleEntries).toHaveLength(2);
  });

  it("collapses duplicate copies of one game in the same import", async () => {
    const store = await freshStore();
    const [first] = demoFiles();
    const copy = new File([BYTES[0]!], `copy-${NAMES[0]}`, {
      lastModified: 1000,
    });

    const result = await importIntoLibrary(store, [first!, copy]);
    expect(result.duplicateCount).toBe(1);
    expect(result.summaries).toHaveLength(1);
    expect(await store.getAll()).toHaveLength(1);
  });

  it("never stores a file that fails to parse", async () => {
    const store = await freshStore();
    const junk = new File([new Uint8Array([1, 2, 3])], "junk.rmgr");
    const result = await importIntoLibrary(store, [junk]);
    expect(result.errors.map((e) => e.fileName)).toEqual(["junk.rmgr"]);
    expect(await store.getAll()).toEqual([]);
  });
});

describe("setManualPerspective", () => {
  it("persists the override and restores it on load", async () => {
    const store = await freshStore();
    const { summaries } = await importIntoLibrary(store, demoFiles());
    const id = summaries[0]!.id;

    await setManualPerspective(store, id, 1);
    const loaded = await loadPersistedLibrary(store);
    expect(
      loaded.summaries.find((s) => s.id === id)!.manualPerspectivePort,
    ).toBe(1);

    await setManualPerspective(store, id, null);
    const cleared = await loadPersistedLibrary(store);
    expect(
      cleared.summaries.find((s) => s.id === id)!.manualPerspectivePort,
    ).toBeUndefined();
  });
});
