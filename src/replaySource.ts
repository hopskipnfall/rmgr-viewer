import { parseReplay, type Replay } from "@rmg-k/rmgr";
import type { ReplayFileSource } from "./data/replayFileSource.js";

export interface LoadedReplay {
  replay: Replay;
  /** Display label for wherever this came from - a filename or URL basename. */
  sourceName: string;
  /** Real-world recording start time, from the file's own `header.recordedAtEpochMillis` (docs/RMGR_SPEC.md §3.1). */
  recordedAt: Date;
}

function recordedAtFromReplay(replay: Replay): Date {
  return new Date(replay.header.recordedAtEpochMillis);
}

export async function loadReplayFromUrl(url: string): Promise<LoadedReplay> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }
  const buffer = await response.arrayBuffer();
  const replay = await parseReplay(new Uint8Array(buffer));
  return {
    replay,
    sourceName: url.split("/").pop() ?? url,
    recordedAt: recordedAtFromReplay(replay),
  };
}

export async function loadReplayFromSource(
  source: ReplayFileSource,
): Promise<LoadedReplay> {
  const replay = await parseReplay(await source.read());
  return {
    replay,
    sourceName: source.name,
    recordedAt: recordedAtFromReplay(replay),
  };
}
