import { DREAM_LAND_STAGE_ID } from "../stageGeometry.js";
import type { GameSummary, OpeningReasonCounts } from "./gameSummary.js";
import {
  resolvePerspectivePort,
  resolveOpponentPort,
  type Identity,
} from "./identity.js";
import { getCharacterGroup, type CharacterGroup } from "../lookups.js";
import type { NeutralOpeningReason } from "../neutralHits.js";

export const NEUTRAL_OPENING_REASONS: readonly NeutralOpeningReason[] = [
  "whiff-punish",
  "reversal",
  "landing-lag",
  "jump-punish",
  "standing-hit",
  "shield-pressure",
  "unknown",
];

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

  /** Total frames across the resolved games, for opportunity-rate ("per minute") displays (§5.3). */
  totalFrames: number;

  // Neutral game / opening share (§5.1-5.2) — symmetric, self-normalizing.
  openingsWon: number;
  openingsLost: number;
  /** won / (won + lost) as a percentage — the "Neutral Score" (§6). */
  openingShare: number | null;
  openingsWonByReason: OpeningReasonCounts;
  openingsLostByReason: OpeningReasonCounts;

  /** Sum of damage dealt across openings won. */
  damageDealtOnOpenings: number;
  /** Damage per opening won — conversion efficiency. */
  damagePerOpening: number | null;
  /** Sum of damage taken while holding advantage on openings won ("leak"). */
  damageLeakOnOpenings: number;
  /** Leak per opening won — advantage retention. */
  leakPerOpening: number | null;
  openingsConvertedToKill: number;
  /** % of openings won that converted all the way to a kill. */
  conversionToKillPct: number | null;
}

export interface ReasonDifferential {
  reason: NeutralOpeningReason;
  wonPct: number | null;
  lostPct: number | null;
  /** wonPct - lostPct. Positive = this reason favors you; negative = it favors your opponent. */
  differential: number | null;
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
  let totalFrames = 0;

  let openingsWon = 0;
  let openingsLost = 0;
  const openingsWonByReason: OpeningReasonCounts = {};
  const openingsLostByReason: OpeningReasonCounts = {};
  let damageDealtOnOpenings = 0;
  let damageLeakOnOpenings = 0;
  let openingsConvertedToKill = 0;

  for (const { summary, yourPort, oppPort } of resolvedGames) {
    const yourP = summary.ports.find((p) => p.port === yourPort);
    const oppP = summary.ports.find((p) => p.port === oppPort);
    if (
      yourP &&
      oppP &&
      yourP.finalStocks >= 0 &&
      oppP.finalStocks >= 0 &&
      !summary.isUnevenStockStart
    ) {
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
    totalFrames += summary.frameCount;

    openingsWon += stats.openingsWon ?? 0;
    openingsLost += stats.openingsLost ?? 0;
    damageDealtOnOpenings += stats.damageDealtOnOpenings ?? 0;
    damageLeakOnOpenings += stats.damageLeakOnOpenings ?? 0;
    openingsConvertedToKill += stats.openingsConvertedToKill ?? 0;
    for (const reason of NEUTRAL_OPENING_REASONS) {
      openingsWonByReason[reason] =
        (openingsWonByReason[reason] ?? 0) +
        (stats.openingsWonByReason?.[reason] ?? 0);
      openingsLostByReason[reason] =
        (openingsLostByReason[reason] ?? 0) +
        (stats.openingsLostByReason?.[reason] ?? 0);
    }
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

    totalFrames,

    openingsWon,
    openingsLost,
    openingShare: rate(openingsWon, openingsWon + openingsLost),
    openingsWonByReason,
    openingsLostByReason,

    damageDealtOnOpenings,
    damagePerOpening:
      openingsWon > 0 ? damageDealtOnOpenings / openingsWon : null,
    damageLeakOnOpenings,
    leakPerOpening: openingsWon > 0 ? damageLeakOnOpenings / openingsWon : null,
    openingsConvertedToKill,
    conversionToKillPct: rate(openingsConvertedToKill, openingsWon),
  };
}

/** Frames per second replays are recorded at. */
const FRAMES_PER_SECOND = 60;

/** Converts a `DerivedRates.totalFrames` count into minutes of play. */
export function ratesToMinutes(rates: DerivedRates): number {
  return rates.totalFrames / FRAMES_PER_SECOND / 60;
}

/**
 * Computes the per-reason won%/conceded% differential (§5.2) — the "neutral fingerprint".
 * Positive differential means that reason favors you; negative means it favors your opponent.
 */
export function computeReasonDifferentials(
  rates: DerivedRates,
): ReasonDifferential[] {
  return NEUTRAL_OPENING_REASONS.map((reason) => {
    const wonCount = rates.openingsWonByReason[reason] ?? 0;
    const lostCount = rates.openingsLostByReason[reason] ?? 0;
    const wonPct =
      rates.openingsWon > 0 ? (wonCount / rates.openingsWon) * 100 : null;
    const lostPct =
      rates.openingsLost > 0 ? (lostCount / rates.openingsLost) * 100 : null;
    const differential =
      wonPct !== null && lostPct !== null ? wonPct - lostPct : null;
    return { reason, wonPct, lostPct, differential };
  });
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
      if (yourP && oppP && !g.summary.isUnevenStockStart) {
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

// ---------------------------------------------------------------------------
// Character-level shrinkage baselines (§4.1)
//
// Recovery success is driven almost entirely by *your* character; edge guard
// success is driven almost entirely by the *opponent's* character (§1.1-1.2).
// Every asymmetric rate is displayed shrunk toward its parent so a 12/12
// doesn't read as a flawless 100% and a 1/3 doesn't scream as a 33%.
// ---------------------------------------------------------------------------

/** Shrinkage constant (in opportunities) for character-level baselines. */
const SHRINKAGE_K = 15;

export interface ShrunkRate {
  raw: number | null;
  shrunk: number | null;
  successes: number;
  opportunities: number;
}

function shrinkRate(
  successes: number,
  opportunities: number,
  parentRatePct: number | null,
): ShrunkRate {
  const raw = opportunities > 0 ? (successes / opportunities) * 100 : null;
  if (parentRatePct === null) {
    return { raw, shrunk: raw, successes, opportunities };
  }
  const parentFrac = parentRatePct / 100;
  const shrunk =
    ((successes + SHRINKAGE_K * parentFrac) / (opportunities + SHRINKAGE_K)) *
    100;
  return { raw, shrunk, successes, opportunities };
}

export interface CharacterBaselines {
  globalRecovery: ShrunkRate;
  globalEdgeGuard: ShrunkRate;
  /** Recovery baseline per your-character ID, shrunk toward the global rate. */
  recoveryByMyCharacter: Map<number, ShrunkRate>;
  /** Edge guard baseline per opponent-character ID, shrunk toward the global rate. */
  edgeGuardByOppCharacter: Map<number, ShrunkRate>;
}

/**
 * Computes the aggregation hierarchy from §4: global -> my character (recovery)
 * and global -> opponent character (edge guard). Always pools over every
 * resolved game for the identity, ignoring the currently active filter —
 * baselines must be stable regardless of what the user is looking at.
 */
export function computeCharacterBaselines(
  summaries: GameSummary[],
  identity: Identity,
): CharacterBaselines {
  const allResolved = filterGameSummaries(summaries, identity, {});
  const overall = aggregateFilteredGames(allResolved);
  const globalRecovery = shrinkRate(
    overall.recoverySuccesses,
    overall.recoveryTotal,
    null,
  );
  const globalEdgeGuard = shrinkRate(
    overall.edgeGuardSuccesses,
    overall.edgeGuardTotal,
    null,
  );

  const byMyChar = new Map<number, { succ: number; opp: number }>();
  const byOppChar = new Map<number, { succ: number; opp: number }>();

  for (const { summary, yourPort, oppPort } of allResolved) {
    if (summary.stageId !== DREAM_LAND_STAGE_ID) continue; // recovery/edge guard are Dream Land-only (§4.2 of aggregateFilteredGames)
    const yourP = summary.ports.find((p) => p.port === yourPort);
    const oppP = summary.ports.find((p) => p.port === oppPort);
    const stats = summary.statsByPort[yourPort as 0 | 1 | 2 | 3];
    if (!yourP || !oppP || !stats) continue;

    const rc = byMyChar.get(yourP.characterId) ?? { succ: 0, opp: 0 };
    rc.succ += stats.recoverySuccesses;
    rc.opp += stats.recoverySituations;
    byMyChar.set(yourP.characterId, rc);

    const ec = byOppChar.get(oppP.characterId) ?? { succ: 0, opp: 0 };
    ec.succ += stats.edgeGuardSuccesses;
    ec.opp += stats.edgeGuardSituations;
    byOppChar.set(oppP.characterId, ec);
  }

  const recoveryByMyCharacter = new Map<number, ShrunkRate>();
  for (const [charId, { succ, opp }] of byMyChar) {
    recoveryByMyCharacter.set(
      charId,
      shrinkRate(succ, opp, globalRecovery.raw),
    );
  }

  const edgeGuardByOppCharacter = new Map<number, ShrunkRate>();
  for (const [charId, { succ, opp }] of byOppChar) {
    edgeGuardByOppCharacter.set(
      charId,
      shrinkRate(succ, opp, globalEdgeGuard.raw),
    );
  }

  return {
    globalRecovery,
    globalEdgeGuard,
    recoveryByMyCharacter,
    edgeGuardByOppCharacter,
  };
}

export interface BaselineDeltas {
  /** Filtered raw recovery% minus the shrunk baseline for the selected my-character (or global, if "all"). */
  recoveryDeltaPct: number | null;
  recoveryBaselinePct: number | null;
  /** Filtered raw edge guard% minus the shrunk baseline for the selected opponent-character (or global, if "all"). */
  edgeGuardDeltaPct: number | null;
  edgeGuardBaselinePct: number | null;
}

/**
 * Computes Recovery Δ / Edge guard Δ (§6 items 4-5) — always shown as a delta
 * against the character baseline, never as a bare percentage.
 */
export function computeBaselineDeltas(
  filteredRates: DerivedRates,
  baselines: CharacterBaselines,
  myCharacterId: number | "all",
  oppCharacterId: number | "all",
): BaselineDeltas {
  const recoveryBaselinePct =
    (myCharacterId !== "all"
      ? baselines.recoveryByMyCharacter.get(myCharacterId)?.shrunk
      : undefined) ?? baselines.globalRecovery.shrunk;
  const edgeGuardBaselinePct =
    (oppCharacterId !== "all"
      ? baselines.edgeGuardByOppCharacter.get(oppCharacterId)?.shrunk
      : undefined) ?? baselines.globalEdgeGuard.shrunk;

  const round1 = (v: number): number => Number(v.toFixed(1));

  return {
    recoveryDeltaPct:
      filteredRates.recoveryPct !== null && recoveryBaselinePct !== null
        ? round1(filteredRates.recoveryPct - recoveryBaselinePct)
        : null,
    recoveryBaselinePct: recoveryBaselinePct ?? null,
    edgeGuardDeltaPct:
      filteredRates.edgeGuardPct !== null && edgeGuardBaselinePct !== null
        ? round1(filteredRates.edgeGuardPct - edgeGuardBaselinePct)
        : null,
    edgeGuardBaselinePct: edgeGuardBaselinePct ?? null,
  };
}
