/**
 * One-time migration: replaces the bundled demo replays in `public/replays/` with re-exported
 * versions from `replays/new public/` that have complete data (the current public/replays files
 * were recorded with an older recorder schema and some are missing jumpsRemaining/item data,
 * which skews the recovery classifier -- see src/recoveryHeuristics.ts's own doc comments on this
 * exact problem).
 *
 * Matches each old file to its new counterpart by (character pair, frame count) -- filenames and
 * recorded timestamps differ between the two sets, but those two fields are a reliable fingerprint
 * for "same underlying match." For each matched pair, writes the NEW file's full data (positions,
 * jumpsRemaining, items) but with `matchStart.playerNames` and the header's `recordedAtEpochMillis`
 * overwritten to the OLD file's values -- the new files carry real player handles (nue, kusora_JPN,
 * shidozz2, Wario, Player) that must never ship publicly. Output is written under the OLD file's
 * exact filename, so `src/data/demoReplayFiles.ts`'s `DEMO_REPLAY_FILENAMES` list needs no changes.
 *
 * Verified round-trip lossless beforehand: parse -> flatten -> serializeReplay -> parse reproduces
 * a byte-identical file when no fields are changed.
 *
 * Run: npx tsx scripts/replacePublicDemoReplays.ts
 * Then: npm run generate:demo-summaries
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseReplay,
  serializeReplay,
  getSeatedPorts,
  type Replay,
  type SerializableReplay,
} from "@rmg-k/rmgr";

const OLD_DIR = "public/replays";
const NEW_DIR = "replays/new public";

interface Loaded {
  filename: string;
  replay: Replay;
  chars: string;
  frameCount: number;
}

async function load(dir: string, filename: string): Promise<Loaded> {
  const bytes = readFileSync(join(dir, filename));
  const replay = await parseReplay(new Uint8Array(bytes));
  const seated = getSeatedPorts(replay);
  const chars = seated
    .map((p) => replay.matchSettings?.characterId[p] ?? -1)
    .sort((a, b) => a - b)
    .join(",");
  return { filename, replay, chars, frameCount: replay.frames.length };
}

async function main() {
  const oldFiles = readdirSync(OLD_DIR).filter((f) => f.endsWith(".rmgr"));
  const newFiles = readdirSync(NEW_DIR).filter((f) => f.endsWith(".rmgr"));

  const oldLoaded = await Promise.all(oldFiles.map((f) => load(OLD_DIR, f)));
  const newLoaded = await Promise.all(newFiles.map((f) => load(NEW_DIR, f)));

  const usedNew = new Set<string>();
  const pairs: { old: Loaded; new: Loaded }[] = [];

  for (const o of oldLoaded) {
    const candidates = newLoaded.filter(
      (n) =>
        n.chars === o.chars &&
        n.frameCount === o.frameCount &&
        !usedNew.has(n.filename),
    );
    if (candidates.length === 0) {
      throw new Error(
        `No match found for ${o.filename} (chars=${o.chars}, frames=${o.frameCount}). Aborting -- fix the input set before re-running.`,
      );
    }
    const best = candidates[0]!;
    usedNew.add(best.filename);
    pairs.push({ old: o, new: best });
  }

  const unusedNew = newLoaded.filter((n) => !usedNew.has(n.filename));
  if (unusedNew.length > 0) {
    throw new Error(
      `Unused new file(s), input set doesn't cleanly match 1:1: ${unusedNew.map((n) => n.filename).join(", ")}`,
    );
  }

  console.log(
    `Matched ${pairs.length}/${pairs.length} pairs cleanly. Writing...\n`,
  );

  for (const { old: o, new: n } of pairs) {
    const serializable: SerializableReplay = {
      gameFamily: n.replay.header.gameFamily,
      goodName: n.replay.header.goodName,
      recorderSchemaVersion: n.replay.header.recorderSchemaVersion,
      // Anonymized identity, taken from the OLD file -- never the new file's real timestamp.
      recordedAtEpochMillis: o.replay.header.recordedAtEpochMillis,
      matchStart: {
        // Anonymized identity, taken from the OLD file -- never the new file's real player names.
        playerNames: o.replay.matchStart.playerNames,
        slotType: n.replay.matchStart.slotType,
      },
      matchSettings: n.replay.matchSettings,
      frames: n.replay.frames,
      matchEnd: n.replay.matchEnd,
      matchResult: n.replay.matchResult,
    };

    const bytes = await serializeReplay(serializable);
    const outPath = join(OLD_DIR, o.filename);
    writeFileSync(outPath, bytes);
    console.log(
      `${o.filename}  <-  ${n.filename}  (${n.frameCount} frames, ${bytes.length} bytes)`,
    );
  }

  console.log(`\nWrote ${pairs.length} files to ${OLD_DIR}.`);
  console.log("Next: npm run generate:demo-summaries");
}

main();
