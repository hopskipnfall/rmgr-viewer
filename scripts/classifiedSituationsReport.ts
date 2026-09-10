/**
 * Runs computeClassifiedSituations (src/classifiedSituations.ts) across the real replay corpus
 * and reports category breakdown counts plus every missedLedgeHogOpportunity /
 * possibleAccidentalSave instance found, for spot-checking by eye -- see phase 1 of
 * docs/superpowers/specs/2026-09-10-classifier-aware-recovery-stats.md.
 *
 * Run: npx tsx scripts/classifiedSituationsReport.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseReplay, type Replay } from "@rmg-k/rmgr";
import {
  computeClassifiedSituations,
  type ClassifiedSituation,
} from "../src/classifiedSituations.js";
import { DREAM_LAND_STAGE_ID } from "../src/stageGeometry.js";

function listRmgrFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".rmgr"))
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

interface Row {
  file: string;
  situation: ClassifiedSituation;
}

async function main() {
  const dirs = ["replays/nue replays"];
  const files = dirs.flatMap((d) => listRmgrFiles(d));
  console.error(`Processing ${files.length} files...`);

  const rows: Row[] = [];
  const categoryCounts: Record<string, number> = {
    hopeless: 0,
    free: 0,
    contestable: 0,
    unclassified: 0,
  };
  let totalSituations = 0;

  for (const path of files) {
    const bytes = readFileSync(path);
    let replay: Replay;
    try {
      replay = await parseReplay(new Uint8Array(bytes));
    } catch {
      continue;
    }
    if (replay.header.gameFamily !== "smash64" || !replay.matchSettings)
      continue;
    if (replay.matchSettings.stageId !== DREAM_LAND_STAGE_ID) continue;

    const fileLabel = path.split("/").pop()!;
    const situations = computeClassifiedSituations(replay);
    for (const situation of situations) {
      totalSituations++;
      categoryCounts[situation.category] =
        (categoryCounts[situation.category] ?? 0) + 1;
      if (situation.missedLedgeHogOpportunity || situation.possibleAccidentalSave) {
        rows.push({ file: fileLabel, situation });
      }
    }
  }

  console.log("=== Category breakdown ===");
  console.log(`total situations: ${totalSituations}`);
  for (const [category, count] of Object.entries(categoryCounts)) {
    const pct = totalSituations > 0 ? ((count / totalSituations) * 100).toFixed(1) : "0.0";
    console.log(`  ${category}: ${count} (${pct}%)`);
  }
  const classified = totalSituations - (categoryCounts.unclassified ?? 0);
  const classifiedPct =
    totalSituations > 0 ? ((classified / totalSituations) * 100).toFixed(1) : "0.0";
  console.log(`classified: ${classified}/${totalSituations} (${classifiedPct}%)`);

  const contestable = categoryCounts.contestable ?? 0;
  const missedLedgeHogs = rows.filter((r) => r.situation.missedLedgeHogOpportunity);
  console.log(
    `\n=== Ledge-hog opportunities: ${missedLedgeHogs.length}/${contestable} contestable situations missed ===`,
  );
  for (const r of missedLedgeHogs) {
    const s = r.situation;
    console.log(
      `  ${r.file} frame~${s.enteredFrameIndex}->${s.resolutionFrameIndex} ` +
        `recoveringPort=${s.recoveringPort} edgeGuardingPort=${s.edgeGuardingPort}`,
    );
  }

  const accidentalSaves = rows.filter((r) => r.situation.possibleAccidentalSave);
  console.log(`\n=== Possible accidental saves: ${accidentalSaves.length} ===`);
  for (const r of accidentalSaves) {
    const s = r.situation;
    console.log(
      `  ${r.file} frame~${s.enteredFrameIndex}->${s.resolutionFrameIndex} ` +
        `recoveringPort=${s.recoveringPort} edgeGuardingPort=${s.edgeGuardingPort} ` +
        `category=${s.category} edgeGuarderHeldLedge=${s.edgeGuarderHeldLedge}`,
    );
  }

  const fs = await import("node:fs");
  fs.writeFileSync(
    "scripts/classified-situations-report.json",
    JSON.stringify({ categoryCounts, totalSituations, rows }, null, 2),
  );
}

main();
