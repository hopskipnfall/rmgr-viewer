import type { PortIndex } from "@rmg-k/rmgr";
import {
  ANALYSIS_VERSION,
  isStale,
  isKnownBadEncoding,
} from "./analysisVersion.js";
import {
  deserializeGameSummary,
  legacyGameId,
  serializeGameSummary,
  type GameSummary,
} from "./gameSummary.js";
import {
  importReplayFiles,
  type ImportError,
  type ImportProgress,
  type ImportedGame,
} from "./importer.js";
import {
  decideEntry,
  findFastPathMatch,
  pickPreferred,
} from "./importPlanner.js";
import type { ReplayFileSource } from "./replayFileSource.js";
import type { LibraryStore, StoredGame } from "./libraryStore.js";
import { searchCache } from "../search/searchCache.js";

/**
 * Glue between the IndexedDB cache (libraryStore.ts), the pure import
 * rules (importPlanner.ts) and the parser (importer.ts). See
 * docs/superpowers/specs/2026-09-15-persistent-library-design.md §4-§5.
 */

export interface LoadedLibrary {
  /**
   * Entries shown in the library, `source` null (no file loaded yet this session). Includes
   * entries on an older ANALYSIS_VERSION - their cached stats may reflect an older stat
   * definition, but showing possibly-slightly-outdated numbers beats hiding the game entirely,
   * especially for a project import where the user may not have the original replay file handy to
   * trigger a recompute (see projectFile.ts). Only entries matching KNOWN_BAD_VERSIONS (the replay
   * itself was parsed from a broken encoding, not just an old stat definition) are excluded here.
   */
  summaries: GameSummary[];
  /** Entries needing re-import (older ANALYSIS_VERSION or a known-bad encoding) - drives the "N games need reimporting" banner. May overlap with `summaries`. */
  staleEntries: StoredGame[];
}

function summaryFromEntry(
  entry: StoredGame,
  source: ReplayFileSource | null,
): GameSummary {
  const summary = deserializeGameSummary(entry.summary);
  summary.source = source;
  if (entry.manualPerspectivePort !== null) {
    summary.manualPerspectivePort = entry.manualPerspectivePort;
  }
  return summary;
}

export async function loadPersistedLibrary(
  store: LibraryStore,
): Promise<LoadedLibrary> {
  const summaries: GameSummary[] = [];
  const staleEntries: StoredGame[] = [];
  for (const entry of await store.getAll()) {
    if (isStale(entry)) staleEntries.push(entry);
    if (!isKnownBadEncoding(entry))
      summaries.push(summaryFromEntry(entry, null));
  }
  return { summaries, staleEntries };
}

export interface PersistImportResult {
  /** Every game this import attached to the session (`source` set). */
  summaries: GameSummary[];
  /** Cached entries that are still stale after this import. */
  staleEntries: StoredGame[];
  errors: ImportError[];
  /** Extra files dropped because another file in this import was the same game. */
  duplicateCount: number;
  /** Games added for the first time, with their old filename-based id for migrating video links. */
  newIds: { id: string; legacyId: string }[];
}

function legacyIdFor(game: ImportedGame): string {
  const { summary } = game;
  return legacyGameId(
    summary.sourceName,
    summary.recordedAt.getTime(),
    summary.stageId,
    summary.frameCount,
    summary.ports.map((p) => ({
      port: p.port,
      characterId: p.characterId,
      name: p.playerName,
    })),
  );
}

function entryFromImport(
  game: ImportedGame,
  manualPerspectivePort: PortIndex | null,
): StoredGame {
  return {
    id: game.summary.id,
    contentHash: game.contentHash,
    formatVersion: game.formatVersion,
    recorderSchemaVersion: game.recorderSchemaVersion,
    analysisVersion: ANALYSIS_VERSION,
    sourcePath: game.meta.sourcePath,
    size: game.meta.size,
    lastModified: game.meta.lastModified,
    manualPerspectivePort,
    summary: serializeGameSummary(game.summary),
  };
}

export async function importIntoLibrary(
  store: LibraryStore,
  files: readonly ReplayFileSource[],
  onProgress?: (progress: ImportProgress) => void,
  /**
   * Fired right after the fast path (step 1) finishes, before the slow
   * parse of anything uncached even starts - so a caller that's waiting on
   * one specific already-cached game (e.g. the missing-file prompt) can act
   * on it immediately instead of blocking on the rest of a large folder's
   * worth of genuinely-new files. Those still get parsed and attached
   * normally via this function's own return value; this is purely an
   * early, redundant preview of the subset that didn't need parsing.
   */
  onFastPathMatched?: (summaries: readonly GameSummary[]) => void,
): Promise<PersistImportResult> {
  const existing = await store.getAll();
  const byPath = new Map(existing.map((e) => [e.sourcePath, e]));
  const byId = new Map(existing.map((e) => [e.id, e]));

  const summaries: GameSummary[] = [];
  const attachedIds = new Set<string>();
  const toParse: ReplayFileSource[] = [];

  // 1. Fast path: unchanged files attach straight from the cache, unread.
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".rmgr")) continue;
    const match = findFastPathMatch(file.meta, byPath);
    if (match && !attachedIds.has(match.id)) {
      summaries.push(summaryFromEntry(match, file));
      attachedIds.add(match.id);
    } else if (!match) {
      toParse.push(file);
    }
  }
  onFastPathMatched?.(summaries);

  // 2. Parse the rest, collapsing copies of the same game.
  const { games, errors } = await importReplayFiles(toParse, onProgress);
  const preferred = new Map<string, ImportedGame>();
  let duplicateCount = 0;
  for (const game of games) {
    const id = game.summary.id;
    const seen = preferred.get(id);
    if (seen) duplicateCount++;
    preferred.set(id, seen ? pickPreferred(seen, game) : game);
  }

  // 3. Decide and write each parsed game.
  const writes: StoredGame[] = [];
  const newIds: { id: string; legacyId: string }[] = [];
  for (const [id, game] of preferred) {
    if (attachedIds.has(id)) {
      duplicateCount++; // same game already attached via the fast path
      continue;
    }
    const current = byId.get(id);
    const decision = decideEntry(current, game);
    const perspective = current?.manualPerspectivePort ?? null;
    if (decision === "touch") {
      writes.push({ ...current!, ...game.meta });
    } else {
      writes.push(entryFromImport(game, perspective));
      if (decision === "add") newIds.push({ id, legacyId: legacyIdFor(game) });
    }
    if (perspective !== null) game.summary.manualPerspectivePort = perspective;
    summaries.push(game.summary);
    attachedIds.add(id);
  }
  await store.putMany(writes);

  const writtenIds = new Set(writes.map((w) => w.id));
  const staleEntries = existing.filter(
    (e) => isStale(e) && !writtenIds.has(e.id),
  );

  // The game set a cached search ran over just changed.
  searchCache.clear();

  return { summaries, staleEntries, errors, duplicateCount, newIds };
}

export async function setManualPerspective(
  store: LibraryStore,
  id: string,
  port: PortIndex | null,
): Promise<void> {
  const entry = (await store.getAll()).find((e) => e.id === id);
  if (!entry) return;
  await store.putMany([{ ...entry, manualPerspectivePort: port }]);
}
