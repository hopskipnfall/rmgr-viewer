/**
 * Prints punish-finder results (src/data/situations.ts) for a corpus summarized by
 * scripts/corpusSummaries.ts, to sanity-check the index and rankings from the command line.
 *
 * Usage: npx tsx scripts/punishReport.ts <corpus.json> <alias,...> <attackerCharId|any> <victimCharId|any> <min%> <max%> [zone,...]
 */
import { readFileSync } from "node:fs";
import { getActionStateName } from "@rmg-k/rmgr";
import {
  deserializeGameSummary,
  type SerializedGameSummary,
} from "../src/data/gameSummary.js";
import { findSituations, type StageZone } from "../src/data/situations.js";

const [corpusPath, aliasArg, att, vic, min, max, zoneArg] =
  process.argv.slice(2);
if (!corpusPath || !aliasArg || !att || !vic || !min || !max) {
  console.error(
    "Usage: npx tsx scripts/punishReport.ts <corpus.json> <alias,...> <attacker|any> <victim|any> <min%> <max%> [zones]",
  );
  process.exit(2);
}
const summaries = (
  JSON.parse(readFileSync(corpusPath, "utf8")) as {
    summary: SerializedGameSummary | null;
  }[]
)
  .filter((e) => e.summary)
  .map((e) => deserializeGameSummary(e.summary!));
const aliases = aliasArg.split(",");
const r = findSituations(
  summaries,
  { displayName: aliases[0]!, aliases: new Set(aliases) },
  {
    attackerFamily: att === "any" ? null : Number(att),
    victimFamily: vic === "any" ? null : Number(vic),
    minDamage: Number(min),
    maxDamage: Number(max),
    zones: zoneArg ? (zoneArg.split(",") as StageZone[]) : [],
    punisher: "anyone",
    kind: "any",
  },
);
const name = (m: number | null, isGrab: boolean, ch: number) =>
  isGrab
    ? "Grab"
    : m === null
      ? "-"
      : getActionStateName(m, { characterId: ch });
console.log(
  `${r.matches.length} matches in ${r.gamesSearched} games (${r.gamesWithoutIndex} without index)`,
);
console.log("\nopener              n    avg   median  KO%");
for (const m of r.byMove.filter((x) => x.count >= 5).slice(0, 15)) {
  console.log(
    `  ${name(m.move, m.isGrab, m.best.attackerCharacterId).padEnd(16)} ${String(m.count).padStart(4)}  ${m.averageDamage.toFixed(1).padStart(5)}  ${m.medianDamage.toFixed(0).padStart(5)}  ${m.killRate.toFixed(0).padStart(4)}`,
  );
}
console.log("\nbest");
for (const m of r.matches.slice(0, 12)) {
  console.log(
    `  ${m.attackerName.padEnd(10)} on ${m.victimName.padEnd(10)} ${name(m.opening.move, m.opening.isGrab, m.attackerCharacterId).padEnd(14)} at ${String(m.opening.victimDamage).padStart(3)}% -> +${m.opening.damage}${m.opening.killed ? " KO" : ""} (${m.opening.hits} hits)`,
  );
}
