import { searchCache } from "../search/searchCache.js";
import type { LibraryStore } from "./libraryStore.js";

/**
 * Every localStorage key this app writes starts with one of these:
 * "rmgr-viewer-" (identity, language, match-view preferences) and
 * "rmgr_yt_link_" (per-game YouTube links, youtubeSync.ts).
 */
const APP_KEY_PREFIXES = ["rmgr-viewer-", "rmgr_yt_link_"];

/**
 * "Clear local data": wipes everything this app has saved in the browser -
 * the cached game summaries (IndexedDB) and every app-owned localStorage
 * key - so a user can recover from bad saved state. Replay files on disk
 * are never touched. Callers should reload the page afterward.
 */
export async function clearLocalData(
  store: LibraryStore | null,
  storage: Storage = localStorage,
): Promise<void> {
  await store?.clear();

  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && APP_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      keys.push(key);
    }
  }
  for (const key of keys) storage.removeItem(key);

  // Cached search results were computed from the library we just wiped.
  searchCache.clear();
}
