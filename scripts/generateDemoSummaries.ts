/**
 * Precomputes `GameSummary` data for the bundled demo `.rmgr` replays and
 * writes it to `public/replays/demo-summaries.json`.
 *
 * Why: on startup, demo mode used to fetch and fully parse every demo
 * `.rmgr` file just to build the small per-game summary the library list
 * needs (character matchups, stage, duration, stats, ...). Those files can
 * be large, so that meant a lot of network + CPU work before the user saw
 * anything. Precomputing the summaries once (here, offline) lets the app
 * fetch one small JSON file at startup instead, and lazily fetch+parse an
 * individual replay's full frame data only when the user opens that
 * specific game (see `replaySource.ts` and the "match" route handler in
 * `main.ts`).
 *
 * Run with `npm run generate:demo-summaries` whenever a demo replay file
 * is added, removed, or replaced (also update `DEMO_REPLAY_FILENAMES` in
 * `src/data/demoReplayFiles.ts` if the set of files changes).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseReplay } from "@rmg-k/rmgr";
import {
  serializeGameSummary,
  summarizeReplay,
  type SerializedGameSummary,
} from "../src/data/gameSummary.js";
import type { LoadedReplay } from "../src/replaySource.js";
import { DEMO_REPLAY_FILENAMES } from "../src/data/demoReplayFiles.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const replaysDir = resolve(__dirname, "../public/replays");
const outPath = resolve(replaysDir, "demo-summaries.json");

function loadReplayFromDisk(filename: string): LoadedReplay {
  const buffer = readFileSync(resolve(replaysDir, filename));
  const bytes = new Uint8Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  const replay = parseReplay(bytes);
  return {
    replay,
    sourceName: filename,
    recordedAt: new Date(replay.header.recordedAtEpochMillis),
  };
}

function main(): void {
  const results: SerializedGameSummary[] = [];

  for (const filename of DEMO_REPLAY_FILENAMES) {
    const loaded = loadReplayFromDisk(filename);
    const summary = summarizeReplay(loaded, null);
    results.push(serializeGameSummary(summary));
    console.log(`Summarized ${filename}`);
  }

  writeFileSync(outPath, JSON.stringify(results, null, 2) + "\n");
  console.log(`\nWrote ${results.length} summaries to ${outPath}`);
}

main();
