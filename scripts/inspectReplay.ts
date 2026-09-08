/**
 * Reports what's actually encoded in one or more `.rmgr` files: header
 * version/game-family/schema, frame count, and per-event-type presence
 * (items, stage hazards) - the events this format makes optional (see
 * docs/RMGR_SPEC.md §5 in the RMG-K repo), so "does this file actually have
 * X" isn't always obvious from the file alone.
 *
 * Usage: `npm run inspect:replay -- <file-or-directory> [...more]`
 * A directory argument is expanded to every `*.rmgr` file directly inside it
 * (not recursive). Exits non-zero if any file fails to parse.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parseReplay, type Replay } from "@rmg-k/rmgr";

interface ReplayReport {
  file: string;
  version: number;
  gameFamily: string;
  recorderSchemaVersion: number;
  recordedAt: string;
  frameCount: number;
  itemFrames: number;
  hazardFrames: number;
}

function expandArgToFiles(arg: string): string[] {
  const stat = statSync(arg);
  if (!stat.isDirectory()) return [arg];
  return readdirSync(arg)
    .filter((name) => name.endsWith(".rmgr"))
    .sort()
    .map((name) => path.join(arg, name));
}

async function inspect(file: string): Promise<ReplayReport> {
  const bytes = new Uint8Array(readFileSync(file));
  const replay: Replay = await parseReplay(bytes);

  let itemFrames = 0;
  let hazardFrames = 0;
  for (const frame of replay.frames) {
    if (frame.items && frame.items.length > 0) itemFrames++;
    if (frame.hazardFlags) hazardFrames++;
  }

  return {
    file: path.basename(file),
    version: replay.header.version,
    gameFamily: replay.header.gameFamily || "(unrecognized)",
    recorderSchemaVersion: replay.header.recorderSchemaVersion,
    recordedAt: new Date(replay.header.recordedAtEpochMillis).toISOString(),
    frameCount: replay.frames.length,
    itemFrames,
    hazardFrames,
  };
}

/** `0` frames out of `0` total reads as "n/a" (nothing to encode either way) rather than the misleading "0/0 frames". */
function presence(count: number, total: number): string {
  if (total === 0) return "n/a";
  return count > 0 ? `${count}/${total} frames` : "none";
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "Usage: npm run inspect:replay -- <file-or-directory> [...more]",
    );
    process.exit(1);
  }

  const files = args.flatMap(expandArgToFiles);
  let failures = 0;

  for (const file of files) {
    let report: ReplayReport;
    try {
      report = await inspect(file);
    } catch (err) {
      console.error(
        `${path.basename(file)}: FAILED TO PARSE - ${(err as Error).message}`,
      );
      failures++;
      continue;
    }

    console.log(report.file);
    console.log(
      `  format v${report.version}, family ${report.gameFamily}, recorder schema v${report.recorderSchemaVersion}, recorded ${report.recordedAt}`,
    );
    console.log(`  ${report.frameCount} frames`);
    console.log(
      `  items:    ${presence(report.itemFrames, report.frameCount)}`,
    );
    console.log(
      `  hazards:  ${presence(report.hazardFrames, report.frameCount)}`,
    );
    console.log();
  }

  if (failures > 0) {
    console.error(`${failures} of ${files.length} file(s) failed to parse.`);
    process.exit(1);
  }
}

main();
