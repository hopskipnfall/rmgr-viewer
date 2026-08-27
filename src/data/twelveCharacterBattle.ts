import type { GameSummary } from "./gameSummary.js";
import {
  type Identity,
  resolvePerspectivePort,
  resolveOpponentPort,
} from "./identity.js";

export interface TwelveCharacterBattlePlayerSummary {
  readonly playerName: string;
  readonly charactersUsed: readonly number[];
  readonly charactersEliminated: number;
  readonly remainingCharacters: number;
  readonly finalRemainingStocks: number;
}

export interface TwelveCharacterBattle {
  readonly id: string;
  readonly games: readonly GameSummary[];
  readonly startTime: Date;
  readonly endTime: Date;
  readonly yourSummary: TwelveCharacterBattlePlayerSummary | null;
  readonly oppSummary: TwelveCharacterBattlePlayerSummary | null;
  readonly winner: "you" | "opponent" | "tie" | null;
  readonly winnerName: string;
  readonly winnerRemainingCharacters: number;
  readonly winnerRemainingStocks: number;
  readonly isComplete: boolean;
}

/**
 * Maximum gap (in seconds) between consecutive games to be considered part of the same 12CB.
 * 30 minutes = 1800 seconds.
 */
const MAX_12CB_GAP_SECONDS = 1800;

/**
 * Standard roster size for 12 Character Battles in Super Smash Bros. (N64).
 */
export const STANDARD_12CB_ROSTER_SIZE = 12;

/**
 * Detects and parses 12 Character Battle (12CB) sets from a chronological sequence of games.
 */
export function detect12CharacterBattles(
  games: readonly GameSummary[],
  identity: Identity,
): TwelveCharacterBattle[] {
  if (games.length < 2) return [];

  // Sort games chronologically
  const sorted = [...games].sort(
    (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
  );

  const battles: TwelveCharacterBattle[] = [];
  let currentCluster: GameSummary[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const g = sorted[i]!;
    if (g.ports.length !== 2) {
      if (currentCluster.length > 0) {
        processCluster(currentCluster, identity, battles);
        currentCluster = [];
      }
      continue;
    }

    if (currentCluster.length === 0) {
      currentCluster.push(g);
    } else {
      const prev = currentCluster[currentCluster.length - 1]!;
      const gapSec =
        (g.recordedAt.getTime() - prev.recordedAt.getTime()) / 1000;

      const isContinuation = checkIs12CbContinuation(prev, g, gapSec);

      if (isContinuation) {
        currentCluster.push(g);
      } else {
        processCluster(currentCluster, identity, battles);
        currentCluster = [g];
      }
    }
  }

  if (currentCluster.length > 0) {
    processCluster(currentCluster, identity, battles);
  }

  return battles;
}

function checkIs12CbContinuation(
  prev: GameSummary,
  curr: GameSummary,
  gapSec: number,
): boolean {
  if (gapSec > MAX_12CB_GAP_SECONDS) return false;
  if (prev.ports.length !== 2 || curr.ports.length !== 2) return false;

  const prevP0 = prev.ports[0]!;
  const prevP1 = prev.ports[1]!;
  const currP0 = curr.ports[0]!;
  const currP1 = curr.ports[1]!;

  const prevP0Won = prevP0.finalStocks > prevP1.finalStocks;
  const prevP1Won = prevP1.finalStocks > prevP0.finalStocks;

  if (prevP0Won) {
    // P0 won previous game: P0 should carry over character and remaining stocks
    if (
      currP0.characterId === prevP0.characterId &&
      currP0.startStocks === prevP0.finalStocks
    ) {
      return true;
    }
    // If current match has an uneven start, treat as 12CB continuation within time window
    if (curr.isUnevenStockStart) {
      return true;
    }
  } else if (prevP1Won) {
    // P1 won previous game: P1 should carry over character and remaining stocks
    if (
      currP1.characterId === prevP1.characterId &&
      currP1.startStocks === prevP1.finalStocks
    ) {
      return true;
    }
    if (curr.isUnevenStockStart) {
      return true;
    }
  }

  // If current game has an uneven start, it is inherently part of a handicap / 12CB carry-over
  if (curr.isUnevenStockStart) {
    return true;
  }

  return false;
}

function processCluster(
  cluster: GameSummary[],
  identity: Identity,
  battles: TwelveCharacterBattle[],
): void {
  if (cluster.length < 2) return;

  // A 12CB battle must contain at least one uneven start match
  const hasUneven = cluster.some((g) => g.isUnevenStockStart);
  if (!hasUneven) return;

  // Check identity resolution across cluster
  const firstGame = cluster[0]!;
  const lastGame = cluster[cluster.length - 1]!;

  const yourPort = resolvePerspectivePort(firstGame, identity);
  const oppPort =
    yourPort !== null ? resolveOpponentPort(firstGame, yourPort) : null;

  // Track player stats
  const p0 = firstGame.ports[0]!;
  const p1 = firstGame.ports[1]!;

  const p0Chars = new Set<number>();
  const p1Chars = new Set<number>();
  let p0Eliminations = 0;
  let p1Eliminations = 0;

  for (const g of cluster) {
    const port0 = g.ports.find((p) => p.port === p0.port);
    const port1 = g.ports.find((p) => p.port === p1.port);

    if (port0) p0Chars.add(port0.characterId);
    if (port1) p1Chars.add(port1.characterId);

    if (port0 && port1) {
      if (port0.finalStocks === 0 && port1.finalStocks > 0) {
        p0Eliminations++;
      } else if (port1.finalStocks === 0 && port0.finalStocks > 0) {
        p1Eliminations++;
      }
    }
  }

  const lastP0 = lastGame.ports.find((p) => p.port === p0.port);
  const lastP1 = lastGame.ports.find((p) => p.port === p1.port);

  const lastP0Final = lastP0?.finalStocks ?? 0;
  const lastP1Final = lastP1?.finalStocks ?? 0;

  const p0Won = lastP0Final > lastP1Final;
  const p1Won = lastP1Final > lastP0Final;

  let winnerRelative: "you" | "opponent" | "tie" | null = null;
  let winnerName: string;
  let winnerRemainingChars = 0;
  let winnerRemainingStocks = 0;

  if (p0Won) {
    winnerName = p0.playerName || "Player 1";
    winnerRemainingStocks = lastP0Final;
    winnerRemainingChars = Math.max(
      0,
      STANDARD_12CB_ROSTER_SIZE - p0Eliminations,
    );
    if (yourPort !== null) {
      winnerRelative = yourPort === p0.port ? "you" : "opponent";
    }
  } else if (p1Won) {
    winnerName = p1.playerName || "Player 2";
    winnerRemainingStocks = lastP1Final;
    winnerRemainingChars = Math.max(
      0,
      STANDARD_12CB_ROSTER_SIZE - p1Eliminations,
    );
    if (yourPort !== null) {
      winnerRelative = yourPort === p1.port ? "you" : "opponent";
    }
  } else {
    winnerRelative = "tie";
    winnerName = "Tie";
  }

  const isComplete =
    p0Eliminations >= STANDARD_12CB_ROSTER_SIZE ||
    p1Eliminations >= STANDARD_12CB_ROSTER_SIZE;

  const yourSummary: TwelveCharacterBattlePlayerSummary | null =
    yourPort !== null
      ? {
          playerName:
            (yourPort === p0.port ? p0.playerName : p1.playerName) || "You",
          charactersUsed: Array.from(yourPort === p0.port ? p0Chars : p1Chars),
          charactersEliminated:
            yourPort === p0.port ? p0Eliminations : p1Eliminations,
          remainingCharacters: Math.max(
            0,
            STANDARD_12CB_ROSTER_SIZE -
              (yourPort === p0.port ? p0Eliminations : p1Eliminations),
          ),
          finalRemainingStocks:
            yourPort === p0.port
              ? p0Won
                ? lastP0Final
                : 0
              : p1Won
                ? lastP1Final
                : 0,
        }
      : null;

  const oppSummary: TwelveCharacterBattlePlayerSummary | null =
    oppPort !== null
      ? {
          playerName:
            (oppPort === p0.port ? p0.playerName : p1.playerName) || "Opponent",
          charactersUsed: Array.from(oppPort === p0.port ? p0Chars : p1Chars),
          charactersEliminated:
            oppPort === p0.port ? p0Eliminations : p1Eliminations,
          remainingCharacters: Math.max(
            0,
            STANDARD_12CB_ROSTER_SIZE -
              (oppPort === p0.port ? p0Eliminations : p1Eliminations),
          ),
          finalRemainingStocks:
            oppPort === p0.port
              ? p0Won
                ? lastP0Final
                : 0
              : p1Won
                ? lastP1Final
                : 0,
        }
      : null;

  battles.push({
    id: `12cb_${firstGame.id}`,
    games: cluster,
    startTime: firstGame.recordedAt,
    endTime: lastGame.recordedAt,
    yourSummary,
    oppSummary,
    winner: winnerRelative,
    winnerName,
    winnerRemainingCharacters: winnerRemainingChars,
    winnerRemainingStocks: winnerRemainingStocks,
    isComplete,
  });
}
