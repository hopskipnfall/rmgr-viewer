import type { PortIndex } from "@rmg-k/rmgr";
import type { SerializedGameSummary } from "./gameSummary.js";

/**
 * One imported game's cached analysis, persisted in IndexedDB so the
 * library survives a page refresh without re-reading any replay files.
 * Only derived data lives here - never the raw `.rmgr` bytes (see
 * docs/superpowers/specs/2026-09-15-persistent-library-design.md §2).
 */
export interface StoredGame {
  /** `gameIdFor(recordedAtEpochMillis, frameCount)`. */
  id: string;
  /** SHA-256 hex of the file's bytes - detects a changed file behind a known id. */
  contentHash: string;
  /** `replay.header.version`. */
  formatVersion: number;
  recorderSchemaVersion: number;
  /** The ANALYSIS_VERSION `summary` was computed with. */
  analysisVersion: number;
  /** Path relative to the imported folder (`webkitRelativePath`), or the bare filename. */
  sourcePath: string;
  size: number;
  lastModified: number;
  manualPerspectivePort: PortIndex | null;
  summary: SerializedGameSummary;
}

export interface LibraryStore {
  getAll(): Promise<StoredGame[]>;
  /** Inserts or overwrites (by `id`) every entry in one transaction. */
  putMany(games: readonly StoredGame[]): Promise<void>;
  delete(id: string): Promise<void>;
  /** Deletes every cached game ("Clear local data"). */
  clear(): Promise<void>;
}

const DB_NAME = "rmgr-viewer";
const DB_VERSION = 1;
const GAMES = "games";

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function openLibraryStore(
  factory: IDBFactory = indexedDB,
  dbName: string = DB_NAME,
): Promise<LibraryStore> {
  const openRequest = factory.open(dbName, DB_VERSION);
  openRequest.onupgradeneeded = () => {
    const db = openRequest.result;
    if (!db.objectStoreNames.contains(GAMES)) {
      db.createObjectStore(GAMES, { keyPath: "id" });
    }
  };
  const db = await requestResult(openRequest);

  return {
    getAll() {
      const store = db.transaction(GAMES).objectStore(GAMES);
      return requestResult(store.getAll() as IDBRequest<StoredGame[]>);
    },
    async putMany(games) {
      if (games.length === 0) return;
      const tx = db.transaction(GAMES, "readwrite");
      const store = tx.objectStore(GAMES);
      for (const game of games) store.put(game);
      await transactionDone(tx);
    },
    async delete(id) {
      const tx = db.transaction(GAMES, "readwrite");
      tx.objectStore(GAMES).delete(id);
      await transactionDone(tx);
    },
    async clear() {
      const tx = db.transaction(GAMES, "readwrite");
      tx.objectStore(GAMES).clear();
      await transactionDone(tx);
    },
  };
}
