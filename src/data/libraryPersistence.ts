import type { PortIndex } from "@rmg-k/rmgr";
import { ANALYSIS_VERSION, isStale } from "./analysisVersion.js";
import {
  deserializeGameSummary,
  legacyGameId,
  serializeGameSummary,
  type GameSummary,
} from "./gameSummary.js";
import {
  importReplayFiles,
  fileMeta,
  type ImportError,
  type ImportProgress,
  type ImportedGame,
} from "./importer.js";
import {
  decideEntry,
  findFastPathMatch,
  pickPreferred,
} from "./importPlanner.js";
import type { LibraryStore, StoredGame } from "./libraryStore.js";

/**
 * Glue between the IndexedDB cache (libraryStore.ts), the pure import
 * rules (importPlanner.ts) and the parser (importer.ts). See
 * docs/superpowers/specs/2026-09-15-persistent-library-design.md §4-§5.
 */

export interface LoadedLibrary {
  /** Fresh entries, ready for the library. `fileRef` is null - no file is loaded yet this session. */
  summaries: GameSummary[];
  /** Entries needing re-import (older ANALYSIS_VERSION or a known-bad encoding). Kept out of the library and stats. */
  staleEntries: StoredGame[];
}

function summaryFromEntry(entry: StoredGame, file: File | null): GameSummary {
  const summary = deserializeGameSummary(entry.summary);
  summary.fileRef = file;
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
    else summaries.push(summaryFromEntry(entry, null));
  }
  return { summaries, staleEntries };
}

export interface PersistImportResult {
  /** Every game this import attached to the session (`fileRef` set). */
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
  files: readonly File[],
  onProgress?: (progress: ImportProgress) => void,
): Promise<PersistImportResult> {
  const existing = await store.getAll();
  const byPath = new Map(existing.map((e) => [e.sourcePath, e]));
  const byId = new Map(existing.map((e) => [e.id, e]));

  const summaries: GameSummary[] = [];
  const attachedIds = new Set<string>();
  const toParse: File[] = [];

  // 1. Fast path: unchanged files attach straight from the cache, unread.
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".rmgr")) continue;
    const match = findFastPathMatch(fileMeta(file), byPath);
    if (match && !attachedIds.has(match.id)) {
      summaries.push(summaryFromEntry(match, file));
      attachedIds.add(match.id);
    } else if (!match) {
      toParse.push(file);
    }
  }

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
