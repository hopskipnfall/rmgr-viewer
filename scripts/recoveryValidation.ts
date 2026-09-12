/**
 * Validates src/recoveryHeuristics.ts's classifier against real replay data.
 *
 * For each "situation-entered" recovery event (as already defined by src/edgeGuard.ts's
 * computeEdgeGuardEvents), runs the matching character's classifier against the recovering
 * player's actual (x, y, vx, vy, jumpsRemaining) at that instant, then compares the prediction
 * against what really happened. Flags any case where the heuristic said "cannot reach
 * ledge/stage" but the player did anyway, without taking damage along the way (taking a hit can
 * assist recovery, which would confound the test).
 *
 * Whatever's in SUPPORTED_CHARACTERS (NA + the JP variants confirmed region-independent -- see its
 * own doc comment in recoveryHeuristics.ts). Dream Land only.
 *
 * Tracked (not .tmp.ts) and imports the real classify() from src/recoveryHeuristics.ts directly
 * -- an earlier version of this script embedded a full standalone duplicate of the physics, which
 * went stale relative to the shipped implementation and vanished from disk twice under the old
 * .tmp.ts untracked-scratch convention. This version can't drift: it IS the shipped code, run
 * against real data.
 *
 * Run: npx tsx scripts/recoveryValidation.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  parseReplay,
  type PortIndex,
  type Replay,
  type StateFrame,
} from "@rmg-k/rmgr";
import {
  computeEdgeGuardEvents,
  type EdgeGuardEvent,
} from "../src/edgeGuard.js";
import { DREAM_LAND_STAGE_ID } from "../src/stageGeometry.js";
import { LEDGE_ACTION_STATES } from "../src/ledgeTrap.js";
import {
  classify,
  SUPPORTED_CHARACTERS,
  CHARACTER_NAME,
  type RecoveryVerdict,
} from "../src/recoveryHeuristics.js";

interface ValidationResult {
  file: string;
  frame: number;
  frameIndex: number;
  resolutionFrameIndex: number;
  port: PortIndex;
  character: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  jumpsRemaining: number;
  predicted: RecoveryVerdict;
  actualOutcome: "ledge" | "stage" | "died" | "opponent-died" | "unresolved";
  damageAssisted: boolean;
  wrongLedge: boolean;
  wrongStage: boolean;
}

function listRmgrFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".rmgr"))
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

async function processFile(
  path: string,
  results: ValidationResult[],
  counts: Record<string, number>,
) {
  const bytes = readFileSync(path);
  let replay: Replay;
  try {
    replay = await parseReplay(new Uint8Array(bytes));
  } catch {
    counts.parseErrors = (counts.parseErrors ?? 0) + 1;
    return;
  }
  if (replay.header.gameFamily !== "smash64" || !replay.matchSettings) return;
  if (replay.matchSettings.stageId !== DREAM_LAND_STAGE_ID) return;

  const events = computeEdgeGuardEvents(replay);
  if (events.length === 0) return;

  const fileLabel = path.split("/").pop()!;

  for (let i = 0; i < events.length; i++) {
    const entered = events[i]!;
    if (entered.kind !== "situation-entered") continue;
    counts.totalSituations = (counts.totalSituations ?? 0) + 1;

    const resolution: EdgeGuardEvent | undefined = events[i + 1];
    if (
      !resolution ||
      (resolution.kind !== "recovery-success" &&
        resolution.kind !== "recovery-failure") ||
      resolution.recoveringPort !== entered.recoveringPort ||
      resolution.edgeGuardingPort !== entered.edgeGuardingPort
    ) {
      counts.malformedPairs = (counts.malformedPairs ?? 0) + 1;
      continue;
    }

    const recoveringPort = entered.recoveringPort;
    const edgeGuardingPort = entered.edgeGuardingPort;
    const characterId = replay.matchSettings.characterId[recoveringPort];

    if (!SUPPORTED_CHARACTERS.has(characterId)) {
      counts.unsupportedCharacter = (counts.unsupportedCharacter ?? 0) + 1;
      continue;
    }

    const entryFrame = replay.frames[entered.frameIndex];
    const entryState: StateFrame | undefined =
      entryFrame?.ports[recoveringPort]?.state;
    if (!entryState) {
      counts.missingEntryState = (counts.missingEntryState ?? 0) + 1;
      continue;
    }

    const predicted = classify(
      characterId,
      entryState.positionX,
      entryState.positionY,
      entryState.velocityX,
      entryState.velocityY,
      entryState.jumpsRemaining,
      entryState.actionStateId,
      entryState.facingDirection,
    );
    if (predicted === null) {
      counts.unsupportedJumps = (counts.unsupportedJumps ?? 0) + 1;
      continue;
    }
    if (predicted === "not-implemented") {
      counts.notImplemented = (counts.notImplemented ?? 0) + 1;
      continue;
    }

    const entryDamage = entryState.damagePercent;
    let damageAssisted = false;
    let actualOutcome: ValidationResult["actualOutcome"];

    for (let f = entered.frameIndex; f <= resolution.frameIndex; f++) {
      const post = replay.frames[f]?.ports[recoveringPort]?.state;
      if (post && post.damagePercent > entryDamage) damageAssisted = true;
    }

    if (resolution.kind === "recovery-failure") {
      actualOutcome = "died";
    } else {
      const resolutionFrame = replay.frames[resolution.frameIndex];
      const recoveringAtResolution =
        resolutionFrame?.ports[recoveringPort]?.state;
      const edgeGuardingAtResolution =
        resolutionFrame?.ports[edgeGuardingPort]?.state;
      const entryFrameForEG = replay.frames[entered.frameIndex];
      const edgeGuardingAtEntry =
        entryFrameForEG?.ports[edgeGuardingPort]?.state;

      if (
        edgeGuardingAtResolution &&
        edgeGuardingAtEntry &&
        edgeGuardingAtResolution.stocksRemaining <
          edgeGuardingAtEntry.stocksRemaining
      ) {
        actualOutcome = "opponent-died";
      } else if (
        recoveringAtResolution &&
        LEDGE_ACTION_STATES.has(recoveringAtResolution.actionStateId)
      ) {
        actualOutcome = "ledge";
      } else {
        actualOutcome = "stage";
      }
    }

    // canReachStage (predicted === "reaches-stage") does NOT by itself prove the ledge was also
    // reachable in every failure mode we'd want to flag -- but by construction (see
    // checkLedgeGrab's doc comment in recoveryHeuristics.ts) it DOES always imply canReachLedge,
    // so only "dead" (neither reachable) counts as a wrong ledge-miss prediction.
    const wrongStage =
      predicted !== "reaches-stage" &&
      actualOutcome === "stage" &&
      !damageAssisted;
    const wrongLedge =
      predicted === "dead" && actualOutcome === "ledge" && !damageAssisted;

    const result: ValidationResult = {
      file: fileLabel,
      frame: entered.frame,
      frameIndex: entered.frameIndex,
      resolutionFrameIndex: resolution.frameIndex,
      port: recoveringPort,
      character: CHARACTER_NAME[characterId] ?? `0x${characterId.toString(16)}`,
      x: entryState.positionX,
      y: entryState.positionY,
      vx: entryState.velocityX,
      vy: entryState.velocityY,
      jumpsRemaining: entryState.jumpsRemaining,
      predicted,
      actualOutcome,
      damageAssisted,
      wrongLedge,
      wrongStage,
    };
    results.push(result);

    counts.classified = (counts.classified ?? 0) + 1;
    if (damageAssisted)
      counts.damageAssisted = (counts.damageAssisted ?? 0) + 1;
    if (wrongLedge || wrongStage) counts.wrong = (counts.wrong ?? 0) + 1;
  }
}

async function main() {
  const dirs = ["replays/nue replays"];
  const files = dirs.flatMap((d) => listRmgrFiles(d));
  console.error(`Processing ${files.length} files...`);

  const results: ValidationResult[] = [];
  const counts: Record<string, number> = {};

  for (const f of files) {
    await processFile(f, results, counts);
  }

  console.log("=== Counts ===");
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k}: ${v}`);
  }

  const byCharacter = new Map<string, ValidationResult[]>();
  for (const r of results) {
    if (!byCharacter.has(r.character)) byCharacter.set(r.character, []);
    byCharacter.get(r.character)!.push(r);
  }

  console.log("\n=== Per-character summary ===");
  for (const [char, rs] of [...byCharacter.entries()].sort()) {
    const wrong = rs.filter((r) => r.wrongLedge || r.wrongStage);
    const wrongLedgeOnly = rs.filter((r) => r.wrongLedge && !r.wrongStage);
    const damageAssisted = rs.filter((r) => r.damageAssisted);
    const withJump = rs.filter((r) => r.jumpsRemaining > 0);
    console.log(
      `${char}: n=${rs.length} (jumps=1: ${withJump.length}), damage-assisted (excluded)=${damageAssisted.length}, WRONG=${wrong.length} (ledge-only: ${wrongLedgeOnly.length})`,
    );
  }

  const wrongResults = results.filter((r) => r.wrongLedge || r.wrongStage);
  console.log(`\n=== WRONG instances (${wrongResults.length}) ===`);
  for (const r of wrongResults.slice(0, 60)) {
    console.log(
      `${r.character} port${r.port} file=${r.file} frame=${r.frame} ` +
        `pos=(${r.x.toFixed(1)},${r.y.toFixed(1)}) vel=(${r.vx.toFixed(1)},${r.vy.toFixed(1)}) jumps=${r.jumpsRemaining} ` +
        `predicted=${r.predicted} actual=${r.actualOutcome} ` +
        `wrongLedge=${r.wrongLedge} wrongStage=${r.wrongStage} duration=${r.resolutionFrameIndex - r.frameIndex}`,
    );
  }
  if (wrongResults.length > 60) {
    console.log(
      `  ... and ${wrongResults.length - 60} more (see results.json)`,
    );
  }

  const fs = await import("node:fs");
  fs.writeFileSync(
    "scripts/recovery-validation-results.json",
    JSON.stringify({ counts, results }, null, 2),
  );
}

main();
