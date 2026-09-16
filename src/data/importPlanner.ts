import { isStale } from "./analysisVersion.js";
import type { StoredGame } from "./libraryStore.js";

/**
 * Pure decisions for importing replay files into the persistent library
 * (docs/superpowers/specs/2026-09-15-persistent-library-design.md §5).
 * No I/O here - libraryPersistence.ts does the reading and writing.
 */

/** What a `File` tells us about itself without reading its bytes. */
export interface FileMeta {
  /** `webkitRelativePath` for a folder pick, otherwise the bare filename. */
  sourcePath: string;
  size: number;
  lastModified: number;
}

/**
 * The cached entry a file can be attached to without parsing it: same
 * path, size and last-modified time, and not stale. Null means the file
 * must be parsed.
 */
export function findFastPathMatch(
  meta: FileMeta,
  byPath: ReadonlyMap<string, StoredGame>,
): StoredGame | null {
  const entry = byPath.get(meta.sourcePath);
  if (!entry) return null;
  if (entry.size !== meta.size || entry.lastModified !== meta.lastModified) {
    return null;
  }
  return isStale(entry) ? null : entry;
}

/**
 * What to do with a parsed file, given the cached entry (if any) with the
 * same game id:
 * - "add": new game.
 * - "touch": same bytes, entry still fresh - only its path/size/mtime changed.
 * - "replace": the bytes changed (a re-export or metadata edit) or the
 *   entry is stale - store the freshly computed summary.
 */
export type EntryDecision = "add" | "touch" | "replace";

export function decideEntry(
  existing: StoredGame | undefined,
  parsed: { contentHash: string },
): EntryDecision {
  if (!existing) return "add";
  if (isStale(existing)) return "replace";
  return existing.contentHash === parsed.contentHash ? "touch" : "replace";
}

/**
 * Of two parsed files with the same game id (e.g. an original and a fixed
 * re-export in the same folder), the one to keep: the newer file format,
 * then the newer recorder schema. Ties keep `a`.
 */
export function pickPreferred<
  T extends { formatVersion: number; recorderSchemaVersion: number },
>(a: T, b: T): T {
  if (b.formatVersion !== a.formatVersion) {
    return b.formatVersion > a.formatVersion ? b : a;
  }
  return b.recorderSchemaVersion > a.recorderSchemaVersion ? b : a;
}
