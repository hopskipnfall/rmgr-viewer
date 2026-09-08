import { parseReplay } from "@rmg-k/rmgr";
import { summarizeReplay, type GameSummary } from "./gameSummary.js";
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

export interface ImportResult {
  summaries: GameSummary[];
  errors: ImportError[];
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

  const summaries: GameSummary[] = [];
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
      const buffer = await file.arrayBuffer();
      const replay = await parseReplay(new Uint8Array(buffer));
      const loaded: LoadedReplay = {
        replay,
        sourceName: file.name,
        recordedAt: new Date(replay.header.recordedAtEpochMillis),
      };

      const summary = summarizeReplay(loaded, file);
      summaries.push(summary);
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

  return { summaries, errors };
}
