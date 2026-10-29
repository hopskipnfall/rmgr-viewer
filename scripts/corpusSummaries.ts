/**
 * Summarizes every `.rmgr` file under one or more directories (recursively) with the app's own
 * `summarizeReplay()`, and writes the results as a JSON array of `SerializedGameSummary` - the
 * same per-game data the library caches - for offline analysis scripts to read.
 *
 * Incremental: an existing output file is reused for any replay whose path, size and mtime are
 * unchanged and whose summary was built under the current ANALYSIS_VERSION.
 *
 * Point the output outside the repo: replay corpora are personal data and must not be committed.
 *
 * Usage: npx tsx scripts/corpusSummaries.ts <out.json> <dir> [...more dirs]
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { parseReplay } from "@rmg-k/rmgr";
import {
  serializeGameSummary,
  summarizeReplay,
  type SerializedGameSummary,
} from "../src/data/gameSummary.js";
import { ANALYSIS_VERSION } from "../src/data/analysisVersion.js";

interface CorpusEntry {
  path: string;
  size: number;
  mtimeMs: number;
  analysisVersion: number;
  summary: SerializedGameSummary | null;
  error?: string;
}

function listRmgrFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listRmgrFiles(full));
    else if (entry.name.endsWith(".rmgr")) out.push(full);
  }
  return out;
}

async function main(): Promise<void> {
  const [outArg, ...dirs] = process.argv.slice(2);
  if (!outArg || dirs.length === 0) {
    console.error(
      "Usage: npx tsx scripts/corpusSummaries.ts <out.json> <dir> [...more]",
    );
    process.exit(2);
  }
  const outPath = resolve(outArg);

  const previous = new Map<string, CorpusEntry>();
  if (existsSync(outPath)) {
    for (const e of JSON.parse(
      readFileSync(outPath, "utf8"),
    ) as CorpusEntry[]) {
      previous.set(e.path, e);
    }
  }

  const files = dirs.flatMap((d) => listRmgrFiles(resolve(d))).sort();
  const entries: CorpusEntry[] = [];
  let reused = 0;
  let failed = 0;

  for (const [i, path] of files.entries()) {
    const { size, mtimeMs } = statSync(path);
    const old = previous.get(path);
    if (
      old &&
      old.size === size &&
      old.mtimeMs === mtimeMs &&
      old.analysisVersion === ANALYSIS_VERSION
    ) {
      entries.push(old);
      reused++;
      continue;
    }
    try {
      const buf = readFileSync(path);
      const replay = await parseReplay(
        new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength),
      );
      const summary = summarizeReplay({
        replay,
        sourceName: path.split("/").pop() ?? path,
        recordedAt: new Date(replay.header.recordedAtEpochMillis),
      });
      entries.push({
        path,
        size,
        mtimeMs,
        analysisVersion: ANALYSIS_VERSION,
        summary: serializeGameSummary(summary),
      });
    } catch (err) {
      failed++;
      entries.push({
        path,
        size,
        mtimeMs,
        analysisVersion: ANALYSIS_VERSION,
        summary: null,
        error: String(err),
      });
    }
    if ((i + 1) % 50 === 0) console.error(`${i + 1}/${files.length}`);
  }

  writeFileSync(outPath, JSON.stringify(entries));
  console.error(
    `Wrote ${entries.length} entries (${reused} reused, ${failed} failed) to ${outPath}`,
  );
}

main();
