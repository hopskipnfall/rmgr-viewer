/**
 * Prints the Progress view's numbers (src/data/progress.ts) for a corpus summarized by
 * scripts/corpusSummaries.ts, so the model can be checked against a real library from the
 * command line.
 *
 * Usage: npx tsx scripts/progressReport.ts <corpus.json> <alias>[,<alias>...] [characterId]
 * characterId defaults to the most-played character family; pass "all" for every character.
 */
import { readFileSync } from "node:fs";
import {
  deserializeGameSummary,
  type SerializedGameSummary,
} from "../src/data/gameSummary.js";
import {
  computeProgress,
  playedCharacterFamilies,
} from "../src/data/progress.js";

const [corpusPath, aliasArg, charArg] = process.argv.slice(2);
if (!corpusPath || !aliasArg) {
  console.error(
    "Usage: npx tsx scripts/progressReport.ts <corpus.json> <alias,...> [characterId|all]",
  );
  process.exit(2);
}

const entries = JSON.parse(readFileSync(corpusPath, "utf8")) as {
  summary: SerializedGameSummary | null;
}[];
const summaries = entries
  .filter((e) => e.summary)
  .map((e) => deserializeGameSummary(e.summary!));
const aliases = aliasArg.split(",");
const identity = { displayName: aliases[0]!, aliases: new Set(aliases) };

const families = playedCharacterFamilies(summaries, identity);
const family =
  charArg === "all"
    ? null
    : charArg !== undefined
      ? Number(charArg)
      : (families[0]?.family ?? null);
const report = computeProgress(summaries, identity, family);

const fmt = (n: number | null | undefined, d = 1) =>
  n === null || n === undefined ? "-" : n.toFixed(d);

console.log(
  `scope family=${family ?? "all"} games=${report.games} points=${report.points.length}`,
);
console.log("\nopponent strength (+ = stronger than you)");
for (const o of report.opponents) {
  console.log(
    `  ${o.opponentName.padEnd(18)} ${fmt(o.strength, 2).padStart(6)}  n=${o.games}`,
  );
}
console.log(
  "\nmetric            pooled   r(strength)  recent (±se, n)       earlier",
);
for (const t of report.trends) {
  const w = (s: typeof t.recent) =>
    s ? `${fmt(s.meanResidual)} ±${fmt(s.standardError)} (${s.points})` : "-";
  console.log(
    `  ${t.id.padEnd(16)} ${fmt(t.pooled).padStart(6)}   ${fmt(t.strengthCorrelation, 2).padStart(5)}      ${w(t.recent).padEnd(20)}  ${w(t.earlier)}`,
  );
}
console.log("\nsessions (residual: + = better than expected)");
for (const p of report.points) {
  if (p.games < 3) continue;
  const m = p.metrics;
  console.log(
    `  ${p.start.toISOString().slice(0, 10)} ${p.opponentName.padEnd(16)} ${String(p.games).padStart(3)} ${p.wins}-${p.losses}`.padEnd(
      44,
    ) +
      ` share ${fmt(m.openingShare?.residual).padStart(5)} ±${fmt(m.openingShare?.standardError)}` +
      ` dmg ${fmt(m.damagePerOpening?.residual).padStart(5)}` +
      ` bait ${fmt(m.baitShare?.residual).padStart(5)}` +
      ` hitback ${fmt(m.hitBackShare?.residual).padStart(5)}`,
  );
}
console.log("\nrepeated opponents");
for (const r of report.repeatedOpponents) {
  console.log(
    `  ${r.opponentName}: ` +
      r.points
        .map(
          (p) =>
            `${p.start.toISOString().slice(5, 10)} share ${fmt(p.metrics.openingShare?.value)}`,
        )
        .join(" | "),
  );
}
console.log("\nlong sets: opening share first third -> last third");
for (const a of report.adaptation) {
  console.log(
    `  ${a.start.toISOString().slice(0, 10)} ${a.opponentName} (${a.games}): ${fmt(a.firstThirdShare)} -> ${fmt(a.lastThirdShare)}`,
  );
}
