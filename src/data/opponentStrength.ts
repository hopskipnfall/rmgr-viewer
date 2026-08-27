import type { GameSummary } from "./gameSummary.js";
import type { Identity } from "./identity.js";
import { filterGameSummaries, aggregateFilteredGames } from "./aggregate.js";

/**
 * Relative strength tier of an opponent, inferred from stock margin (§3).
 * "above"/"below" are relative to the identity's own skill, not an absolute rating.
 */
export type StrengthTier = "above" | "peer" | "below" | "unknown";

/** Shrinkage constant (in games) for the opponent-strength margin estimator. */
const K_OPP = 5;
/** Games required before a tier is asserted; below this the opponent is "unknown". */
const MIN_GAMES_FOR_TIER = 4;
/** Dead zone half-width (in stocks) around 0 that counts as "peer". */
const TIER_DEAD_ZONE = 0.5;

export interface OpponentStrengthEntry {
  opponentName: string;
  /** Decided (non-uneven-start) games used for the margin estimate. */
  n: number;
  /** mean(yourFinalStocks - oppFinalStocks) over decided games. Negative = you lose on average. */
  marginRaw: number;
  /** marginRaw shrunk toward 0 by n/(n+K_opp). Negative = opponent tiers "above" you. */
  shrunkMargin: number;
  /** Cross-check: your opening share against this opponent (§3.2). Non-saturating, unlike win rate. */
  openingShare: number | null;
  tier: StrengthTier;
}

/**
 * Infers each opponent's relative strength from stock margin (§3.1), cross-checked
 * against opening share (§3.2). No manual tiering — estimated entirely from loaded data.
 */
export function computeOpponentStrength(
  summaries: GameSummary[],
  identity: Identity,
): Map<string, OpponentStrengthEntry> {
  const resolved = filterGameSummaries(summaries, identity, {});

  const byOpponent = new Map<
    string,
    { summary: GameSummary; yourPort: number; oppPort: number }[]
  >();
  for (const item of resolved) {
    const oppP = item.summary.ports.find((p) => p.port === item.oppPort);
    const name = oppP?.playerName.trim();
    if (!name) continue;
    const list = byOpponent.get(name) ?? [];
    list.push(item);
    byOpponent.set(name, list);
  }

  const result = new Map<string, OpponentStrengthEntry>();

  for (const [opponentName, games] of byOpponent) {
    let marginSum = 0;
    let n = 0;
    for (const g of games) {
      if (g.summary.isUnevenStockStart) continue;
      const yourP = g.summary.ports.find((p) => p.port === g.yourPort);
      const oppP = g.summary.ports.find((p) => p.port === g.oppPort);
      if (!yourP || !oppP) continue;
      if (yourP.finalStocks < 0 || oppP.finalStocks < 0) continue;
      marginSum += yourP.finalStocks - oppP.finalStocks;
      n++;
    }

    const marginRaw = n > 0 ? marginSum / n : 0;
    const shrunkMargin = marginRaw * (n / (n + K_OPP));

    const rates = aggregateFilteredGames(games);
    const openingShare = rates.openingShare;

    let tier: StrengthTier;
    if (n < MIN_GAMES_FOR_TIER) {
      tier = "unknown";
    } else if (shrunkMargin <= -TIER_DEAD_ZONE) {
      tier = "above";
    } else if (shrunkMargin >= TIER_DEAD_ZONE) {
      tier = "below";
    } else {
      tier = "peer";
    }

    result.set(opponentName, {
      opponentName,
      n,
      marginRaw,
      shrunkMargin,
      openingShare,
      tier,
    });
  }

  return result;
}

/** Opponent name -> tier lookup, for filtering games without recomputing strength repeatedly. */
export function tierByOpponentName(
  strengths: Map<string, OpponentStrengthEntry>,
): Map<string, StrengthTier> {
  const map = new Map<string, StrengthTier>();
  for (const [name, entry] of strengths) {
    map.set(name, entry.tier);
  }
  return map;
}
