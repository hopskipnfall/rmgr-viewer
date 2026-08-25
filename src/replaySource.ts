import { parseReplay, type Replay } from "@rmg-k/rmgr";

export interface LoadedReplay {
  replay: Replay;
  /** Display label for wherever this came from - a filename or URL basename. */
  sourceName: string;
  /** Real-world recording start time, from the file's own `header.recordedAtEpochSeconds` (docs/RMGR_SPEC.md §3.1). */
  recordedAt: Date;
}

function recordedAtFromReplay(replay: Replay): Date {
  return new Date(replay.header.recordedAtEpochSeconds * 1000);
}

export async function loadReplayFromUrl(url: string): Promise<LoadedReplay> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }
  const buffer = await response.arrayBuffer();
  const replay = parseReplay(new Uint8Array(buffer));
  return {
    replay,
    sourceName: url.split("/").pop() ?? url,
    recordedAt: recordedAtFromReplay(replay),
  };
}

export async function loadReplayFromFile(file: File): Promise<LoadedReplay> {
  const buffer = await file.arrayBuffer();
  const replay = parseReplay(new Uint8Array(buffer));
  return {
    replay,
    sourceName: file.name,
    recordedAt: recordedAtFromReplay(replay),
  };
}
