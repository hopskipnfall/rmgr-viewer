/**
 * Rewrites a batch of `.rmgr` replay files: renames one or more player
 * names (both the header's `gameStart.playerNames` and the resulting
 * filename) and/or shifts every file's `recordedAtEpochMillis` by a fixed
 * number of days - e.g. to bring a freshly re-recorded demo session back
 * onto the date range some other part of the app (like main.ts's
 * hardcoded per-game video sync offsets) expects by filename/timestamp.
 *
 * Output filenames follow docs/RMGR_SPEC.md §3.4's convention
 * (`YYYYMMDD-HHMMSS-Player1-Player2....rmgr`, local wall-clock time
 * truncated to whole seconds, one segment per seated player) - local time
 * is assumed to be UTC+9 (JST), matching every existing recording in this
 * project. Collisions (two files landing on the same filename) get a
 * `-2`, `-3`, ... suffix before the extension, per the same section.
 *
 * Usage:
 *   npx tsx scripts/renameReplays.ts <inputDir> <outputDir> \
 *     [--rename oldName=newName ...] [--shift-days <N>]
 *
 * --shift-days accepts negative numbers (shift earlier) or positive
 * (shift later). Neither flag is required - with none, files are just
 * re-serialized as-is under their spec-convention filename.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { parseReplay, serializeReplay, type Replay } from "@rmg-k/rmgr";

const LOCAL_TZ_OFFSET_MILLIS = 9 * 60 * 60 * 1000; // JST (UTC+9)
const DAY_MILLIS = 24 * 60 * 60 * 1000;

interface Args {
  inputDir: string;
  outputDir: string;
  renames: Map<string, string>;
  shiftDays: number;
}

function parseArgs(argv: string[]): Args {
  const [inputDir, outputDir] = argv;
  if (!inputDir || !outputDir) {
    console.error(
      "Usage: npx tsx scripts/renameReplays.ts <inputDir> <outputDir> [--rename old=new ...] [--shift-days N]",
    );
    process.exit(1);
  }

  const renames = new Map<string, string>();
  let shiftDays = 0;
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--rename") {
      const pair = argv[++i];
      const eq = pair?.indexOf("=") ?? -1;
      if (!pair || eq <= 0) {
        throw new Error(`Invalid --rename value (expected old=new): ${pair}`);
      }
      renames.set(pair.slice(0, eq), pair.slice(eq + 1));
    } else if (arg === "--shift-days") {
      const value = Number(argv[++i]);
      if (!Number.isFinite(value)) {
        throw new Error("Invalid --shift-days value");
      }
      shiftDays = value;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { inputDir, outputDir, renames, shiftDays };
}

function sanitizeNameSegment(name: string): string {
  return name.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 24);
}

/** Formats an epoch-millis instant as local (UTC+9) `YYYYMMDD-HHMMSS`. */
function formatLocalFilenameStamp(epochMillis: number): string {
  const local = new Date(epochMillis + LOCAL_TZ_OFFSET_MILLIS);
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = local.getUTCFullYear();
  const mo = pad(local.getUTCMonth() + 1);
  const d = pad(local.getUTCDate());
  const h = pad(local.getUTCHours());
  const mi = pad(local.getUTCMinutes());
  const s = pad(local.getUTCSeconds());
  return `${y}${mo}${d}-${h}${mi}${s}`;
}

function renamePlayers(
  playerNames: Replay["gameStart"]["playerNames"],
  renames: Map<string, string>,
): [string, string, string, string] {
  return playerNames.map((name) => renames.get(name) ?? name) as [
    string,
    string,
    string,
    string,
  ];
}

function main(): void {
  const { inputDir, outputDir, renames, shiftDays } = parseArgs(
    process.argv.slice(2),
  );
  mkdirSync(outputDir, { recursive: true });

  const files = readdirSync(inputDir)
    .filter((f) => f.endsWith(".rmgr"))
    .sort();
  const usedNames = new Set<string>();
  const shiftMillis = shiftDays * DAY_MILLIS;

  for (const file of files) {
    const bytes = new Uint8Array(readFileSync(path.join(inputDir, file)));
    const replay = parseReplay(bytes);

    const renamedPlayerNames = renamePlayers(
      replay.gameStart.playerNames,
      renames,
    );
    const shiftedEpochMillis =
      replay.header.recordedAtEpochMillis - shiftMillis;

    const seatedNameSegments = renamedPlayerNames
      .filter((name) => name.length > 0)
      .map(sanitizeNameSegment);
    const baseName = [
      formatLocalFilenameStamp(shiftedEpochMillis),
      ...seatedNameSegments,
    ].join("-");

    let outputName = `${baseName}.rmgr`;
    let suffix = 2;
    while (usedNames.has(outputName)) {
      outputName = `${baseName}-${suffix}.rmgr`;
      suffix++;
    }
    usedNames.add(outputName);

    const out = serializeReplay({
      goodName: replay.header.goodName,
      recorderSchemaVersion: replay.header.recorderSchemaVersion,
      recordedAtEpochMillis: shiftedEpochMillis,
      recordedAtNanosOffset: replay.header.recordedAtNanosOffset,
      gameStart: { ...replay.gameStart, playerNames: renamedPlayerNames },
      frames: replay.frames,
      gameEnd: replay.gameEnd,
    });

    writeFileSync(path.join(outputDir, outputName), out);
    console.log(`${file} -> ${outputName}`);
  }

  console.log(`\nWrote ${files.length} file(s) to ${outputDir}`);
}

main();
