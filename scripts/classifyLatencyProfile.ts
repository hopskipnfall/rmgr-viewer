/**
 * Profiles every single classify() call (src/recoveryHeuristics.ts) triggered by processing the
 * ENTIRE replay corpus under replays/ -- exactly the workload real import would produce, since
 * this drives the exact same entry point data/gameSummary.ts's summarizeReplay() calls at import
 * time: computeClassifiedSituations(replay), once per file (memoized internally, so calling it
 * once per file here matches summarizeReplay()'s per-port loop hitting the cache on the second
 * port exactly as it would in the real app).
 *
 * For every classify() call this records: the source file, the character, every input
 * (x/y/vx/vy/jumpsRemaining/actionStateId/facingDirection), the verdict returned, and the
 * wall-clock duration -- written to a SQLite database (scripts/classify-latency-profile.sqlite)
 * for downstream querying (percentiles, group-by-character, slowest-N, etc.).
 *
 * VERSIONED: each invocation is one row in `runs` (tagged with a label, git commit SHA, and
 * whether the working tree was dirty at the time) and every `files`/`classify_calls` row is
 * tagged with that run's id. The database is never dropped between invocations -- re-run this
 * after an optimization pass to compare against earlier runs, e.g.:
 *
 *   SELECT r.label, cc.character_name, AVG(cc.duration_ms) AS avg_ms, COUNT(*) AS n
 *   FROM classify_calls cc JOIN runs r ON r.id = cc.run_id
 *   GROUP BY r.id, cc.character_name ORDER BY cc.character_name, r.started_at;
 *
 * Uses node:sqlite (Node 22+ built-in, no new dependency).
 *
 * Run: npx tsx scripts/classifyLatencyProfile.ts [--label "some label"]
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { parseReplay, type Replay } from "@rmg-k/rmgr";
import {
  startClassifyProfiling,
  stopClassifyProfiling,
  type ClassifyCallRecord,
} from "../src/recoveryHeuristics.js";
import { computeClassifiedSituations } from "../src/classifiedSituations.js";
import { characterName } from "../src/lookups.js";

const REPLAYS_ROOT = "/Users/ness/workspaces/rmgr-viewer/replays";
const DB_PATH = join(import.meta.dirname, "classify-latency-profile.sqlite");

function listRmgrFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listRmgrFilesRecursive(full));
    } else if (entry.toLowerCase().endsWith(".rmgr")) {
      out.push(full);
    }
  }
  return out;
}

function parseLabelArg(): string | null {
  const idx = process.argv.indexOf("--label");
  if (idx === -1 || !process.argv[idx + 1]) return null;
  return process.argv[idx + 1]!;
}

function tryGit(cmd: string): string | null {
  try {
    return execSync(cmd, { cwd: import.meta.dirname, encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

function ensureSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT,
      git_sha TEXT,
      git_dirty INTEGER,
      node_version TEXT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      files_processed INTEGER,
      total_classify_calls INTEGER,
      total_classify_duration_ms REAL,
      wall_clock_ms REAL
    );
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL REFERENCES runs(id),
      path TEXT NOT NULL,
      stage_id INTEGER,
      frame_count INTEGER,
      parse_error TEXT,
      total_classify_calls INTEGER NOT NULL DEFAULT 0,
      total_classify_duration_ms REAL NOT NULL DEFAULT 0,
      file_process_duration_ms REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS classify_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL REFERENCES runs(id),
      file_id INTEGER NOT NULL REFERENCES files(id),
      file_path TEXT NOT NULL,
      character_id INTEGER NOT NULL,
      character_name TEXT,
      x REAL NOT NULL,
      y REAL NOT NULL,
      vx REAL NOT NULL,
      vy REAL NOT NULL,
      jumps_remaining INTEGER NOT NULL,
      action_state_id INTEGER NOT NULL,
      facing_direction INTEGER NOT NULL,
      verdict TEXT,
      duration_ms REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_calls_run ON classify_calls(run_id);
    CREATE INDEX IF NOT EXISTS idx_calls_character ON classify_calls(character_id);
    CREATE INDEX IF NOT EXISTS idx_calls_duration ON classify_calls(duration_ms);
    CREATE INDEX IF NOT EXISTS idx_calls_file ON classify_calls(file_id);
    CREATE INDEX IF NOT EXISTS idx_files_run ON files(run_id);
  `);
}

async function main() {
  const isNewDb = !existsSync(DB_PATH);
  const db = new DatabaseSync(DB_PATH);
  ensureSchema(db);

  const gitSha = tryGit("git rev-parse HEAD");
  const gitDirty = tryGit("git status --porcelain");
  const label = parseLabelArg();

  const insertRun = db.prepare(
    `INSERT INTO runs (label, git_sha, git_dirty, node_version, started_at)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const runId = insertRun.run(
    label,
    gitSha,
    gitDirty === null ? null : gitDirty.length > 0 ? 1 : 0,
    process.version,
    new Date().toISOString(),
  ).lastInsertRowid as number;

  console.error(
    `${isNewDb ? "Created" : "Reusing"} ${DB_PATH} -- run #${runId}` +
      (label ? ` ("${label}")` : "") +
      (gitSha ? ` @ ${gitSha.slice(0, 8)}${gitDirty ? "+dirty" : ""}` : ""),
  );

  const files = listRmgrFilesRecursive(REPLAYS_ROOT);
  console.error(`Found ${files.length} .rmgr files under ${REPLAYS_ROOT}`);

  const insertFile = db.prepare(
    `INSERT INTO files (run_id, path, stage_id, frame_count, parse_error, total_classify_calls, total_classify_duration_ms, file_process_duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertCall = db.prepare(
    `INSERT INTO classify_calls
       (run_id, file_id, file_path, character_id, character_name, x, y, vx, vy, jumps_remaining, action_state_id, facing_direction, verdict, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  let grandTotalCalls = 0;
  let grandTotalDurationMs = 0;
  let filesProcessed = 0;
  const scriptStart = performance.now();

  for (const path of files) {
    const relPath = path.replace(REPLAYS_ROOT + "/", "");
    const bytes = readFileSync(path);

    let replay: Replay | null = null;
    let parseError: string | null = null;
    try {
      replay = await parseReplay(new Uint8Array(bytes));
    } catch (e) {
      parseError = (e as Error).message ?? String(e);
    }

    if (!replay) {
      insertFile.run(runId, relPath, null, null, parseError, 0, 0, 0);
      continue;
    }

    startClassifyProfiling();
    const fileStart = performance.now();
    // The exact call the real import pipeline makes (data/gameSummary.ts's
    // computeRawCountersForPort, called once per seated port but memoized internally -- so one
    // call here reproduces the real per-file cost, not double-counted).
    computeClassifiedSituations(replay);
    const fileProcessDurationMs = performance.now() - fileStart;
    const calls: ClassifyCallRecord[] = stopClassifyProfiling();

    const fileTotalDuration = calls.reduce((sum, c) => sum + c.durationMs, 0);
    const fileId = insertFile.run(
      runId,
      relPath,
      replay.matchSettings?.stageId ?? null,
      replay.frames.length,
      null,
      calls.length,
      fileTotalDuration,
      fileProcessDurationMs,
    ).lastInsertRowid as number;

    for (const call of calls) {
      insertCall.run(
        runId,
        fileId,
        relPath,
        call.characterId,
        characterName(call.characterId),
        call.x,
        call.y,
        call.vx,
        call.vy,
        call.jumpsRemaining,
        call.actionStateId,
        call.facingDirection,
        call.verdict,
        call.durationMs,
      );
    }

    grandTotalCalls += calls.length;
    grandTotalDurationMs += fileTotalDuration;
    filesProcessed++;
    if (filesProcessed % 25 === 0) {
      console.error(`  ...${filesProcessed}/${files.length} files processed`);
    }
  }

  const wallClockMs = performance.now() - scriptStart;

  db.prepare(
    `UPDATE runs SET finished_at = ?, files_processed = ?, total_classify_calls = ?, total_classify_duration_ms = ?, wall_clock_ms = ? WHERE id = ?`,
  ).run(
    new Date().toISOString(),
    filesProcessed,
    grandTotalCalls,
    grandTotalDurationMs,
    wallClockMs,
    runId,
  );

  console.log("\n=== Summary (this run) ===");
  console.log(`Files processed: ${filesProcessed}/${files.length}`);
  console.log(`Total classify() calls: ${grandTotalCalls}`);
  console.log(
    `Total time inside classify(): ${(grandTotalDurationMs / 1000).toFixed(2)}s`,
  );
  console.log(`Wall-clock script time: ${(wallClockMs / 1000).toFixed(2)}s`);
  console.log(
    `Average per call: ${grandTotalCalls > 0 ? (grandTotalDurationMs / grandTotalCalls).toFixed(3) : "n/a"}ms`,
  );

  console.log("\n=== Slowest 20 individual classify() calls (this run) ===");
  const slowest = db
    .prepare(
      `SELECT file_path, character_name, x, y, vx, vy, jumps_remaining, verdict, duration_ms
       FROM classify_calls WHERE run_id = ? ORDER BY duration_ms DESC LIMIT 20`,
    )
    .all(runId);
  for (const row of slowest as Record<string, unknown>[]) {
    console.log(
      `  ${(row.duration_ms as number).toFixed(1)}ms  ${row.character_name}  ` +
        `x=${(row.x as number).toFixed(0)} y=${(row.y as number).toFixed(0)} ` +
        `vx=${(row.vx as number).toFixed(1)} vy=${(row.vy as number).toFixed(1)} ` +
        `jumps=${row.jumps_remaining} verdict=${row.verdict}  [${row.file_path}]`,
    );
  }

  console.log("\n=== Per-character aggregate, this run (total time descending) ===");
  const perChar = db
    .prepare(
      `SELECT character_name, COUNT(*) as n, SUM(duration_ms) as total_ms, AVG(duration_ms) as avg_ms, MAX(duration_ms) as max_ms
       FROM classify_calls WHERE run_id = ? GROUP BY character_name ORDER BY total_ms DESC`,
    )
    .all(runId);
  for (const row of perChar as Record<string, unknown>[]) {
    console.log(
      `  ${row.character_name}: n=${row.n} total=${(row.total_ms as number).toFixed(0)}ms ` +
        `avg=${(row.avg_ms as number).toFixed(2)}ms max=${(row.max_ms as number).toFixed(1)}ms`,
    );
  }

  console.log("\n=== Slowest 10 files, this run (total time inside classify()) ===");
  const slowestFiles = db
    .prepare(
      `SELECT path, total_classify_calls, total_classify_duration_ms, file_process_duration_ms
       FROM files WHERE run_id = ? ORDER BY total_classify_duration_ms DESC LIMIT 10`,
    )
    .all(runId);
  for (const row of slowestFiles as Record<string, unknown>[]) {
    console.log(
      `  ${(row.total_classify_duration_ms as number).toFixed(0)}ms (${row.total_classify_calls} calls, ` +
        `file total ${(row.file_process_duration_ms as number).toFixed(0)}ms)  ${row.path}`,
    );
  }

  const priorRuns = db
    .prepare(
      `SELECT id, label, git_sha, started_at, total_classify_calls, total_classify_duration_ms, wall_clock_ms
       FROM runs WHERE id != ? ORDER BY started_at`,
    )
    .all(runId);
  if (priorRuns.length > 0) {
    console.log("\n=== All runs recorded in this database (for version comparison) ===");
    for (const row of [...priorRuns, { id: runId, label, git_sha: gitSha, started_at: "(this run)", total_classify_calls: grandTotalCalls, total_classify_duration_ms: grandTotalDurationMs, wall_clock_ms: wallClockMs }] as Record<string, unknown>[]) {
      console.log(
        `  run #${row.id}${row.label ? ` "${row.label}"` : ""} [${(row.git_sha as string | null)?.slice(0, 8) ?? "?"}] ${row.started_at}: ` +
          `${row.total_classify_calls} calls, ${((row.total_classify_duration_ms as number) / 1000).toFixed(2)}s total, ${((row.wall_clock_ms as number) / 1000).toFixed(2)}s wall-clock`,
      );
    }
  }

  db.close();
  console.log(`\nWrote ${grandTotalCalls} call records to ${DB_PATH} (run #${runId})`);
}

main();
