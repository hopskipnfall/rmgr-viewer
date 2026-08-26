import { DREAM_LAND_STAGE_ID } from "../stageGeometry.js";
import type { GameSummary } from "./gameSummary.js";
import {
  resolvePerspectivePort,
  resolveOpponentPort,
  type Identity,
} from "./identity.js";
import { getCharacterGroup, type CharacterGroup } from "../lookups.js";

export interface FilterCriteria {
  yourCharacterId?: number | "all";
  oppCharacterId?: number | "all";
  opponentName?: string | "all";
  stageId?: number | "all";
}

export interface DerivedRates {
  totalGames: number;
  dreamLandGames: number;
  wins: number;
  losses: number;
  winRatePct: number | null;

  recoveryPct: number | null;
  recoverySuccesses: number;
  recoveryTotal: number;

  edgeGuardPct: number | null;
  edgeGuardSuccesses: number;
  edgeGuardTotal: number;

  ledgeGetupPct: number | null;
  ledgeGetupSuccesses: number;
  ledgeGetupTotal: number;

  ledgeTrapPct: number | null;
  ledgeTrapSuccesses: number;
  ledgeTrapTotal: number;

  angelAvoidPct: number | null;
  angelAvoidSuccesses: number;
  angelAvoidTotal: number;

  neutralHitsPerStock: number | null;
  neutralHitsLanded: number;
  stocksTaken: number;
}

export interface RateDeltas {
  winRatePctDelta: number | null;
  recoveryPctDelta: number | null;
  edgeGuardPctDelta: number | null;
  ledgeGetupPctDelta: number | null;
  ledgeTrapPctDelta: number | null;
  angelAvoidPctDelta: number | null;
  neutralHitsPerStockDelta: number | null;
}

export interface CharacterBreakdownRow {
  characterId: number;
  games: number;
  wins: number;
  losses: number;
  rates: DerivedRates;
}

/**
 * Checks if any filter is actively applied.
 */
export function hasActiveFilters(criteria: FilterCriteria): boolean {
  return (
    (criteria.yourCharacterId !== undefined &&
      criteria.yourCharacterId !== "all") ||
    (criteria.oppCharacterId !== undefined &&
      criteria.oppCharacterId !== "all") ||
    (criteria.opponentName !== undefined && criteria.opponentName !== "all") ||
    (criteria.stageId !== undefined && criteria.stageId !== "all")
  );
}

/**
 * Filters game summaries according to identity and criteria.
 * Ambiguous identity games are strictly excluded from aggregates (§2.2).
 */
export function filterGameSummaries(
  summaries: GameSummary[],
  identity: Identity,
  criteria: FilterCriteria = {},
): { summary: GameSummary; yourPort: number; oppPort: number }[] {
  const result: { summary: GameSummary; yourPort: number; oppPort: number }[] =
    [];

  for (const summary of summaries) {
    if (summary.ports.length !== 2) continue;

    const yourPort = resolvePerspectivePort(summary, identity);
    if (yourPort === null) continue; // Ambiguous or unseated

    const oppPort = resolveOpponentPort(summary, yourPort);
    if (oppPort === null) continue;

    const yourPortSummary = summary.ports.find((p) => p.port === yourPort);
    const oppPortSummary = summary.ports.find((p) => p.port === oppPort);
    if (!yourPortSummary || !oppPortSummary) continue;

    // Filter: your character
    if (
      criteria.yourCharacterId !== undefined &&
      criteria.yourCharacterId !== "all" &&
      yourPortSummary.characterId !== criteria.yourCharacterId
    ) {
      continue;
    }

    // Filter: opponent character
    if (
      criteria.oppCharacterId !== undefined &&
      criteria.oppCharacterId !== "all" &&
      oppPortSummary.characterId !== criteria.oppCharacterId
    ) {
      continue;
    }

    // Filter: opponent name
    if (
      criteria.opponentName !== undefined &&
      criteria.opponentName !== "all" &&
      oppPortSummary.playerName.trim() !== criteria.opponentName.trim()
    ) {
      continue;
    }

    // Filter: stage
    if (
      criteria.stageId !== undefined &&
      criteria.stageId !== "all" &&
      summary.stageId !== criteria.stageId
    ) {
      continue;
    }

    result.push({ summary, yourPort, oppPort });
  }

  return result;
}

/**
 * Aggregates a filtered set of games into integer sums and derives rates.
 * Avoids average-of-averages trap (§4.1) and enforces stage gating (§4.2).
 */
export function aggregateFilteredGames(
  resolvedGames: { summary: GameSummary; yourPort: number; oppPort: number }[],
): DerivedRates {
  let dreamLandGames = 0;
  let wins = 0;
  let losses = 0;

  // Dream Land only counters
  let recoverySituations = 0;
  let recoverySuccesses = 0;
  let edgeGuardSituations = 0;
  let edgeGuardSuccesses = 0;
  let ledgeGetupSituations = 0;
  let ledgeGetupSuccesses = 0;
  let ledgeTrapSituations = 0;
  let ledgeTrapSuccesses = 0;

  // Stage-agnostic counters
  let angelAvoidSituations = 0;
  let angelAvoidSuccesses = 0;
  let neutralHitsLanded = 0;
  let stocksTaken = 0;

  for (const { summary, yourPort, oppPort } of resolvedGames) {
    const yourP = summary.ports.find((p) => p.port === yourPort);
    const oppP = summary.ports.find((p) => p.port === oppPort);
    if (yourP && oppP && yourP.finalStocks >= 0 && oppP.finalStocks >= 0) {
      if (yourP.finalStocks > oppP.finalStocks) {
        wins++;
      } else if (oppP.finalStocks > yourP.finalStocks) {
        losses++;
      }
    }

    const stats = summary.statsByPort[yourPort as 0 | 1 | 2 | 3];
    if (!stats) continue;

    const isDreamLand = summary.stageId === DREAM_LAND_STAGE_ID;
    if (isDreamLand) {
      dreamLandGames++;
      recoverySituations += stats.recoverySituations;
      recoverySuccesses += stats.recoverySuccesses;
      edgeGuardSituations += stats.edgeGuardSituations;
      edgeGuardSuccesses += stats.edgeGuardSuccesses;
      ledgeGetupSituations += stats.ledgeGetupSituations;
      ledgeGetupSuccesses += stats.ledgeGetupSuccesses;
      ledgeTrapSituations += stats.ledgeTrapSituations;
      ledgeTrapSuccesses += stats.ledgeTrapSuccesses;
    }

    angelAvoidSituations += stats.angelAvoidSituations;
    angelAvoidSuccesses += stats.angelAvoidSuccesses;
    neutralHitsLanded += stats.neutralHitsLanded;
    stocksTaken += stats.stocksTaken;
  }

  const rate = (num: number, den: number): number | null =>
    den > 0 ? (num / den) * 100 : null;

  const totalDecided = wins + losses;
  const winRatePct = totalDecided > 0 ? (wins / totalDecided) * 100 : null;

  return {
    totalGames: resolvedGames.length,
    dreamLandGames,
    wins,
    losses,
    winRatePct,

    recoveryPct: rate(recoverySuccesses, recoverySituations),
    recoverySuccesses,
    recoveryTotal: recoverySituations,

    edgeGuardPct: rate(edgeGuardSuccesses, edgeGuardSituations),
    edgeGuardSuccesses,
    edgeGuardTotal: edgeGuardSituations,

    ledgeGetupPct: rate(ledgeGetupSuccesses, ledgeGetupSituations),
    ledgeGetupSuccesses,
    ledgeGetupTotal: ledgeGetupSituations,

    ledgeTrapPct: rate(ledgeTrapSuccesses, ledgeTrapSituations),
    ledgeTrapSuccesses,
    ledgeTrapTotal: ledgeTrapSituations,

    angelAvoidPct: rate(angelAvoidSuccesses, angelAvoidSituations),
    angelAvoidSuccesses,
    angelAvoidTotal: angelAvoidSituations,

    neutralHitsPerStock:
      stocksTaken > 0 ? neutralHitsLanded / stocksTaken : null,
    neutralHitsLanded,
    stocksTaken,
  };
}

/**
 * Computes deltas between a filtered rate set and baseline (unfiltered-you).
 */
export function computeRateDeltas(
  filtered: DerivedRates,
  baseline: DerivedRates,
): RateDeltas {
  const delta = (
    f: number | null,
    b: number | null,
    round = false,
  ): number | null => {
    if (f === null || b === null) return null;
    const diff = f - b;
    return round ? Math.round(diff) : Number(diff.toFixed(1));
  };

  return {
    winRatePctDelta: delta(filtered.winRatePct, baseline.winRatePct, true),
    recoveryPctDelta: delta(filtered.recoveryPct, baseline.recoveryPct, true),
    edgeGuardPctDelta: delta(
      filtered.edgeGuardPct,
      baseline.edgeGuardPct,
      true,
    ),
    ledgeGetupPctDelta: delta(
      filtered.ledgeGetupPct,
      baseline.ledgeGetupPct,
      true,
    ),
    ledgeTrapPctDelta: delta(
      filtered.ledgeTrapPct,
      baseline.ledgeTrapPct,
      true,
    ),
    angelAvoidPctDelta: delta(
      filtered.angelAvoidPct,
      baseline.angelAvoidPct,
      true,
    ),
    neutralHitsPerStockDelta: delta(
      filtered.neutralHitsPerStock,
      baseline.neutralHitsPerStock,
      false,
    ),
  };
}

/**
 * Computes the overall baseline across all resolved games for the user's identity.
 * Returns null if fewer than 2 resolved games exist.
 */
export function computeOverallBaseline(
  summaries: GameSummary[],
  identity: Identity,
): DerivedRates | null {
  const resolved = filterGameSummaries(summaries, identity, {});
  if (resolved.length < 2) return null;
  return aggregateFilteredGames(resolved);
}

/**
 * Computes the aggregate baseline for a specific character matchup across all games.
 * If matchup games exist, aggregates those; otherwise aggregates all games for your character.
 */
export function computeMatchupBaseline(
  summaries: GameSummary[],
  identity: Identity,
  yourCharId: number,
  oppCharId: number,
): DerivedRates {
  if (identity.aliases.size > 0) {
    const matchupGames = filterGameSummaries(summaries, identity, {
      yourCharacterId: yourCharId,
      oppCharacterId: oppCharId,
    });

    if (matchupGames.length > 0) {
      return aggregateFilteredGames(matchupGames);
    }

    // Fallback to all games with your character
    const yourCharGames = filterGameSummaries(summaries, identity, {
      yourCharacterId: yourCharId,
    });
    if (yourCharGames.length > 0) {
      return aggregateFilteredGames(yourCharGames);
    }

    // Fallback to overall
    return aggregateFilteredGames(filterGameSummaries(summaries, identity, {}));
  }

  // If no identity aliases configured, aggregate directly by character matchup across all games
  const directMatchupGames: {
    summary: GameSummary;
    yourPort: number;
    oppPort: number;
  }[] = [];
  for (const s of summaries) {
    if (s.ports.length !== 2) continue;
    const p0 = s.ports[0]!;
    const p1 = s.ports[1]!;
    if (p0.characterId === yourCharId && p1.characterId === oppCharId) {
      directMatchupGames.push({
        summary: s,
        yourPort: p0.port,
        oppPort: p1.port,
      });
    } else if (p1.characterId === yourCharId && p0.characterId === oppCharId) {
      directMatchupGames.push({
        summary: s,
        yourPort: p1.port,
        oppPort: p0.port,
      });
    }
  }

  if (directMatchupGames.length > 0) {
    return aggregateFilteredGames(directMatchupGames);
  }

  const directCharGames: {
    summary: GameSummary;
    yourPort: number;
    oppPort: number;
  }[] = [];
  for (const s of summaries) {
    if (s.ports.length !== 2) continue;
    const p0 = s.ports[0]!;
    const p1 = s.ports[1]!;
    if (p0.characterId === yourCharId) {
      directCharGames.push({
        summary: s,
        yourPort: p0.port,
        oppPort: p1.port,
      });
    } else if (p1.characterId === yourCharId) {
      directCharGames.push({
        summary: s,
        yourPort: p1.port,
        oppPort: p0.port,
      });
    }
  }

  if (directCharGames.length > 0) {
    return aggregateFilteredGames(directCharGames);
  }

  // Fallback to all 2-player games
  const all2pGames: {
    summary: GameSummary;
    yourPort: number;
    oppPort: number;
  }[] = [];
  for (const s of summaries) {
    if (s.ports.length === 2) {
      all2pGames.push({
        summary: s,
        yourPort: s.ports[0]!.port,
        oppPort: s.ports[1]!.port,
      });
    }
  }
  return aggregateFilteredGames(all2pGames);
}

/**
 * Computes the breakdown by opponent character for the filtered subset of games.
 */
export function computeOpponentCharacterBreakdown(
  resolvedGames: { summary: GameSummary; yourPort: number; oppPort: number }[],
): CharacterBreakdownRow[] {
  const gamesByChar = new Map<
    number,
    { summary: GameSummary; yourPort: number; oppPort: number }[]
  >();

  for (const item of resolvedGames) {
    const oppSummary = item.summary.ports.find((p) => p.port === item.oppPort);
    if (!oppSummary) continue;
    const charId = oppSummary.characterId;
    const list = gamesByChar.get(charId) || [];
    list.push(item);
    gamesByChar.set(charId, list);
  }

  const rows: CharacterBreakdownRow[] = [];

  for (const [characterId, games] of gamesByChar.entries()) {
    let wins = 0;
    let losses = 0;

    for (const g of games) {
      const yourP = g.summary.ports.find((p) => p.port === g.yourPort);
      const oppP = g.summary.ports.find((p) => p.port === g.oppPort);
      if (yourP && oppP) {
        if (yourP.finalStocks > oppP.finalStocks) {
          wins++;
        } else if (oppP.finalStocks > yourP.finalStocks) {
          losses++;
        }
      }
    }

    const rates = aggregateFilteredGames(games);
    rows.push({
      characterId,
      games: games.length,
      wins,
      losses,
      rates,
    });
  }

  // Sort descending by games count, then character ID
  rows.sort((a, b) => b.games - a.games || a.characterId - b.characterId);
  return rows;
}

export interface GroupedCharacterBreakdown {
  group: CharacterGroup;
  rows: CharacterBreakdownRow[];
}

/**
 * Computes opponent character breakdown grouped by character roster category:
 * 1. North America (Original 12)
 * 2. Japan (Original 12 J)
 * 3. Remix Characters
 */
export function computeGroupedOpponentCharacterBreakdown(
  resolvedGames: { summary: GameSummary; yourPort: number; oppPort: number }[],
): GroupedCharacterBreakdown[] {
  const allRows = computeOpponentCharacterBreakdown(resolvedGames);
  const naRows: CharacterBreakdownRow[] = [];
  const jpRows: CharacterBreakdownRow[] = [];
  const remixRows: CharacterBreakdownRow[] = [];

  for (const row of allRows) {
    const group = getCharacterGroup(row.characterId);
    if (group === "na") {
      naRows.push(row);
    } else if (group === "jp") {
      jpRows.push(row);
    } else {
      remixRows.push(row);
    }
  }

  const groups: GroupedCharacterBreakdown[] = [];
  if (naRows.length > 0) {
    groups.push({ group: "na", rows: naRows });
  }
  if (jpRows.length > 0) {
    groups.push({ group: "jp", rows: jpRows });
  }
  if (remixRows.length > 0) {
    groups.push({ group: "remix", rows: remixRows });
  }

  return groups;
}
