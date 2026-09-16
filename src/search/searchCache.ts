import { ANALYSIS_VERSION } from "../data/analysisVersion.js";
import type { PlaylistClip } from "../playlist.js";
import type { SearchRouteCriteria } from "../router.js";

/** What one completed search produced. */
export interface CachedSearch {
  readonly results: PlaylistClip[];
  readonly unloadedCount: number;
}

/**
 * Cache key for one search: its criteria, the exact games searched, and the
 * analysis version. Including the game ids means an entry can't outlive a
 * library change that adds or removes games; including the analysis version
 * means re-analyzed detection never hands back a stale result list.
 */
export function searchCacheKey(
  criteria: SearchRouteCriteria,
  gameIds: readonly string[],
): string {
  return JSON.stringify({
    v: ANALYSIS_VERSION,
    c: criteria,
    g: [...gameIds].sort(),
  });
}

/**
 * Least-recently-used cache of search results, in memory only - a refresh
 * loses the replay data these were computed from anyway, so there's nothing
 * worth persisting.
 */
export class SearchCache {
  private readonly entries = new Map<string, CachedSearch>();

  constructor(private readonly limit: number) {}

  public get(key: string): CachedSearch | undefined {
    const hit = this.entries.get(key);
    if (hit === undefined) return undefined;
    // Re-insert so this entry counts as the most recently used.
    this.entries.delete(key);
    this.entries.set(key, hit);
    return hit;
  }

  public set(key: string, value: CachedSearch): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    while (this.entries.size > this.limit) {
      const oldest = this.entries.keys().next();
      if (oldest.done === true) break;
      this.entries.delete(oldest.value);
    }
  }

  public clear(): void {
    this.entries.clear();
  }
}

/** Shared by every search; cleared whenever the library changes. */
export const searchCache = new SearchCache(10);
