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

export interface Standard12Character {
  readonly key: string;
  readonly nameEn: string;
  readonly nameJa: string;
  readonly shortName: string;
  readonly shortNameJa: string;
  readonly representativeId: number;
}

export const STANDARD_12_CHARACTERS: readonly Standard12Character[] = [
  {
    key: "mario",
    nameEn: "Mario",
    nameJa: "マリオ",
    shortName: "MA",
    shortNameJa: "MA",
    representativeId: 0,
  },
  {
    key: "fox",
    nameEn: "Fox",
    nameJa: "フォックス",
    shortName: "FO",
    shortNameJa: "FO",
    representativeId: 1,
  },
  {
    key: "dk",
    nameEn: "DK",
    nameJa: "DK",
    shortName: "DK",
    shortNameJa: "DK",
    representativeId: 2,
  },
  {
    key: "samus",
    nameEn: "Samus",
    nameJa: "サムス",
    shortName: "SA",
    shortNameJa: "SA",
    representativeId: 3,
  },
  {
    key: "luigi",
    nameEn: "Luigi",
    nameJa: "ルイージ",
    shortName: "LU",
    shortNameJa: "LU",
    representativeId: 4,
  },
  {
    key: "link",
    nameEn: "Link",
    nameJa: "リンク",
    shortName: "LI",
    shortNameJa: "LI",
    representativeId: 5,
  },
  {
    key: "yoshi",
    nameEn: "Yoshi",
    nameJa: "ヨッシー",
    shortName: "YO",
    shortNameJa: "YO",
    representativeId: 6,
  },
  {
    key: "falcon",
    nameEn: "C. Falcon",
    nameJa: "C.ファルコン",
    shortName: "FA",
    shortNameJa: "FA",
    representativeId: 7,
  },
  {
    key: "kirby",
    nameEn: "Kirby",
    nameJa: "カービィ",
    shortName: "KA",
    shortNameJa: "KA",
    representativeId: 8,
  },
  {
    key: "pikachu",
    nameEn: "Pikachu",
    nameJa: "ピカチュウ",
    shortName: "PI",
    shortNameJa: "PI",
    representativeId: 9,
  },
  {
    key: "jigglypuff",
    nameEn: "Jigglypuff",
    nameJa: "プリン",
    shortName: "PU",
    shortNameJa: "PU",
    representativeId: 10,
  },
  {
    key: "ness",
    nameEn: "Ness",
    nameJa: "ネス",
    shortName: "NE",
    shortNameJa: "NE",
    representativeId: 11,
  },
];

export function getCanonicalCharacterKey(characterId: number): string {
  switch (characterId) {
    case 0:
    case 42:
      return "mario";
    case 1:
    case 41:
      return "fox";
    case 2:
    case 44:
      return "dk";
    case 3:
    case 36:
      return "samus";
    case 4:
    case 43:
      return "luigi";
    case 5:
    case 39:
      return "link";
    case 6:
    case 49:
      return "yoshi";
    case 7:
    case 40:
      return "falcon";
    case 8:
    case 48:
      return "kirby";
    case 9:
    case 50:
      return "pikachu";
    case 10:
    case 46:
      return "jigglypuff";
    case 11:
    case 37:
      return "ness";
    default:
      return `char_${characterId}`;
  }
}

export interface TwelveCbCharacterSlot {
  readonly key: string;
  readonly nameEn: string;
  readonly nameJa: string;
  readonly shortName: string;
  readonly shortNameJa: string;
  readonly status: "active" | "available" | "eliminated";
  readonly stocksRemaining?: number;
}

export interface TwelveCbPlayerMatchState {
  readonly port: number;
  readonly name: string;
  readonly isYou: boolean;
  readonly activeCharacterKey: string;
  readonly activeCharacterStocks: number;
  readonly remainingCharacterCount: number;
  readonly eliminatedCharacterCount: number;
  readonly characterSlots: readonly TwelveCbCharacterSlot[];
}

export interface TwelveCbMatchState {
  readonly battleId: string;
  readonly matchIndex: number;
  readonly totalMatches: number;
  readonly players: readonly [
    TwelveCbPlayerMatchState,
    TwelveCbPlayerMatchState,
  ];
  /**
   * Id of the chronologically preceding game in this same battle, or null if
   * this is the first match. Drives the widget's "previous match" link.
   */
  readonly previousGameId: string | null;
  /** Id of the chronologically following game, or null if this is the last. */
  readonly nextGameId: string | null;
}

/**
 * Computes the 12 Character Battle match state (remaining and eliminated characters per player)
 * for a specific game within a 12CB series.
 */
export function compute12CbMatchState(
  gameId: string,
  allGames: readonly GameSummary[],
  identity: Identity,
  currentPerspectivePort?: number | null,
): TwelveCbMatchState | null {
  const battles = detect12CharacterBattles(allGames, identity);
  const battle = battles.find((b) => b.games.some((g) => g.id === gameId));
  if (!battle) return null;

  // Chronologically sorted games in this battle
  const sortedGames = [...battle.games].sort(
    (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
  );
  const gameIndex = sortedGames.findIndex((g) => g.id === gameId);
  if (gameIndex === -1) return null;

  const currentGame = sortedGames[gameIndex]!;
  if (currentGame.ports.length !== 2) return null;

  const firstGame = sortedGames[0]!;
  const p0Port = firstGame.ports[0]!.port;
  const p1Port = firstGame.ports[1]!.port;

  // Track eliminated character keys up to match gameIndex (0..gameIndex - 1)
  const eliminatedKeys0 = new Set<string>();
  const eliminatedKeys1 = new Set<string>();

  for (let i = 0; i < gameIndex; i++) {
    const g = sortedGames[i]!;
    const gP0 = g.ports.find((p) => p.port === p0Port);
    const gP1 = g.ports.find((p) => p.port === p1Port);
    if (gP0 && gP1) {
      if (gP0.finalStocks === 0 && gP1.finalStocks > 0) {
        eliminatedKeys0.add(getCanonicalCharacterKey(gP0.characterId));
      } else if (gP1.finalStocks === 0 && gP0.finalStocks > 0) {
        eliminatedKeys1.add(getCanonicalCharacterKey(gP1.characterId));
      }
    }
  }

  const currP0 =
    currentGame.ports.find((p) => p.port === p0Port) ?? currentGame.ports[0]!;
  const currP1 =
    currentGame.ports.find((p) => p.port === p1Port) ?? currentGame.ports[1]!;

  const activeKey0 = getCanonicalCharacterKey(currP0.characterId);
  const activeKey1 = getCanonicalCharacterKey(currP1.characterId);

  const yourPort =
    currentPerspectivePort !== undefined && currentPerspectivePort !== null
      ? currentPerspectivePort
      : resolvePerspectivePort(currentGame, identity);

  const makePlayerState = (
    portInfo: typeof currP0,
    eliminatedKeys: Set<string>,
    activeKey: string,
  ): TwelveCbPlayerMatchState => {
    const isYou = yourPort !== null && portInfo.port === yourPort;
    const name = portInfo.playerName || `P${portInfo.port + 1}`;
    const activeStocks = portInfo.startStocks ?? 4;

    const slots: TwelveCbCharacterSlot[] = STANDARD_12_CHARACTERS.map(
      (char) => {
        let status: "active" | "available" | "eliminated";
        let stocksRemaining: number | undefined;

        if (char.key === activeKey) {
          status = "active";
          stocksRemaining = activeStocks;
        } else if (eliminatedKeys.has(char.key)) {
          status = "eliminated";
        } else {
          status = "available";
        }

        return {
          key: char.key,
          nameEn: char.nameEn,
          nameJa: char.nameJa,
          shortName: char.shortName,
          shortNameJa: char.shortNameJa,
          status,
          stocksRemaining,
        };
      },
    );

    return {
      port: portInfo.port,
      name,
      isYou,
      activeCharacterKey: activeKey,
      activeCharacterStocks: activeStocks,
      remainingCharacterCount: Math.max(
        0,
        STANDARD_12CB_ROSTER_SIZE - eliminatedKeys.size,
      ),
      eliminatedCharacterCount: eliminatedKeys.size,
      characterSlots: slots,
    };
  };

  const p0State = makePlayerState(currP0, eliminatedKeys0, activeKey0);
  const p1State = makePlayerState(currP1, eliminatedKeys1, activeKey1);

  // If yourPort is p1Port, order players as [p1, p0] so 'You' is first
  const orderedPlayers =
    yourPort === p1Port
      ? ([p1State, p0State] as const)
      : ([p0State, p1State] as const);

  return {
    battleId: battle.id,
    matchIndex: gameIndex + 1,
    totalMatches: sortedGames.length,
    players: orderedPlayers,
    previousGameId: gameIndex > 0 ? sortedGames[gameIndex - 1]!.id : null,
    nextGameId:
      gameIndex < sortedGames.length - 1
        ? sortedGames[gameIndex + 1]!.id
        : null,
  };
}
