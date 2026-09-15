import { parseReplay } from "@rmg-k/rmgr";
import { summarizeReplay, type GameSummary } from "./gameSummary.js";
import type { FileMeta } from "./importPlanner.js";
import type { LoadedReplay } from "../replaySource.js";

export interface ImportProgress {
  loaded: number;
  total: number;
  currentFileName: string;
}

export interface ImportError {
  fileName: string;
  error: string;
}

/** One parsed file: its summary (with `fileRef` set) plus what a persistent cache entry needs. */
export interface ImportedGame {
  summary: GameSummary;
  /** SHA-256 hex of the file's bytes. */
  contentHash: string;
  /** `replay.header.version`. */
  formatVersion: number;
  recorderSchemaVersion: number;
  meta: FileMeta;
}

export interface ImportResult {
  games: ImportedGame[];
  errors: ImportError[];
}

export function fileMeta(file: File): FileMeta {
  return {
    sourcePath: file.webkitRelativePath || file.name,
    size: file.size,
    lastModified: file.lastModified,
  };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // Replay bytes always come from File.arrayBuffer()/readFileSync, never a
  // SharedArrayBuffer, which is all SubtleCrypto's BufferSource excludes.
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes as Uint8Array<ArrayBuffer>,
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * Parses multiple .rmgr files sequentially with event-loop yielding,
 * converts each into a compact GameSummary, and discards the parsed Replay to save memory (§3.1).
 */
export async function importReplayFiles(
  files: File[] | FileList,
  onProgress?: (progress: ImportProgress) => void,
): Promise<ImportResult> {
  const fileArray = Array.from(files);
  const rmgrFiles = fileArray.filter((f) =>
    f.name.toLowerCase().endsWith(".rmgr"),
  );

  const games: ImportedGame[] = [];
  const errors: ImportError[] = [];

  const total = rmgrFiles.length;

  for (let i = 0; i < total; i++) {
    const file = rmgrFiles[i]!;
    onProgress?.({
      loaded: i,
      total,
      currentFileName: file.name,
    });

    // Yield to the event loop so the UI remains responsive and progress renders (§3.5)
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const replay = await parseReplay(bytes);
      const loaded: LoadedReplay = {
        replay,
        sourceName: file.name,
        recordedAt: new Date(replay.header.recordedAtEpochMillis),
      };

      games.push({
        summary: summarizeReplay(loaded, file),
        contentHash: await sha256Hex(bytes),
        formatVersion: replay.header.version,
        recorderSchemaVersion: replay.header.recorderSchemaVersion,
        meta: fileMeta(file),
      });
    } catch (err) {
      errors.push({
        fileName: file.name,
        error: (err as Error).message || "Unknown error while parsing replay",
      });
    }
  }

  onProgress?.({
    loaded: total,
    total,
    currentFileName: "",
  });

  return { games, errors };
}
