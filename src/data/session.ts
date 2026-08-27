import type { PortIndex } from "@rmg-k/rmgr";
import type { GameSummary } from "./gameSummary.js";
import {
  type Identity,
  resolvePerspectivePort,
  resolveOpponentPort,
} from "./identity.js";
import { loadVideoLink, type VideoLinkData } from "../video/youtubeSync.js";

export interface SessionGroup {
  readonly id: string;
  readonly opponentName: string;
  readonly opponentCharacterIds: readonly number[];
  readonly yourCharacterIds: readonly number[];
  readonly startTime: Date;
  readonly endTime: Date;
  readonly totalDurationFrames: number;
  readonly games: readonly GameSummary[];
  readonly wins: number;
  readonly losses: number;
  readonly hasVideo: boolean;
  readonly videoId?: string;
  readonly videoLinkData?: VideoLinkData | null;
}

/**
 * Maximum gap (in seconds) between consecutive games to be considered part of the same play session.
 * 2 hours = 7200 seconds.
 */
export const MAX_SESSION_GAP_SECONDS = 7200;

function getOpponentSignature(
  summary: GameSummary,
  identity: Identity,
): { opponentName: string; is2Player: boolean; yourPort: PortIndex | null } {
  if (summary.ports.length !== 2) {
    return { opponentName: "", is2Player: false, yourPort: null };
  }

  const yourPort = resolvePerspectivePort(summary, identity);
  if (yourPort === null) {
    // Ambiguous perspective: use both player names
    const names = summary.ports
      .map((p) => p.playerName || `P${p.port + 1}`)
      .sort()
      .join(" vs ");
    return { opponentName: names, is2Player: true, yourPort: null };
  }

  const oppPort = resolveOpponentPort(summary, yourPort);
  const oppP =
    oppPort !== null ? summary.ports.find((p) => p.port === oppPort) : null;
  const oppName =
    oppP?.playerName || (oppPort !== null ? `P${oppPort + 1}` : "");
  return { opponentName: oppName, is2Player: true, yourPort };
}

/**
 * Groups an array of game summaries into logical play sessions.
 * Games are clustered if:
 * 1. They share the same linked YouTube video ID, OR
 * 2. They have matching opponent/participants AND the gap between consecutive games is <= MAX_SESSION_GAP_SECONDS.
 */
export function groupGamesIntoSessions(
  summaries: readonly GameSummary[],
  identity: Identity,
  sortOrder: "newest" | "oldest" = "newest",
): SessionGroup[] {
  if (summaries.length === 0) {
    return [];
  }

  // First sort all games chronologically (oldest first) to build continuous clusters
  const chronological = [...summaries].sort(
    (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
  );

  const rawClusters: GameSummary[][] = [];
  let currentCluster: GameSummary[] = [];

  for (let i = 0; i < chronological.length; i++) {
    const game = chronological[i]!;
    if (currentCluster.length === 0) {
      currentCluster.push(game);
      continue;
    }

    const prevGame = currentCluster[currentCluster.length - 1]!;
    const prevVideo = loadVideoLink(prevGame.id);
    const currVideo = loadVideoLink(game.id);

    // Check shared video link
    const hasSharedVideo =
      Boolean(prevVideo?.videoId) &&
      Boolean(currVideo?.videoId) &&
      prevVideo?.videoId === currVideo?.videoId;

    // Check temporal gap & opponent match
    const prevSig = getOpponentSignature(prevGame, identity);
    const currSig = getOpponentSignature(game, identity);
    const sameOpponent =
      prevSig.is2Player === currSig.is2Player &&
      prevSig.opponentName.toLowerCase() === currSig.opponentName.toLowerCase();

    const timeDeltaSec =
      (game.recordedAt.getTime() - prevGame.recordedAt.getTime()) / 1000;
    const isWithinTimeGap =
      timeDeltaSec >= 0 && timeDeltaSec <= MAX_SESSION_GAP_SECONDS;

    if (hasSharedVideo || (sameOpponent && isWithinTimeGap)) {
      currentCluster.push(game);
    } else {
      rawClusters.push(currentCluster);
      currentCluster = [game];
    }
  }

  if (currentCluster.length > 0) {
    rawClusters.push(currentCluster);
  }

  // Transform each cluster into a SessionGroup
  const sessionGroups: SessionGroup[] = rawClusters.map((cluster) => {
    const firstGame = cluster[0]!;
    const lastGame = cluster[cluster.length - 1]!;

    const startTime = firstGame.recordedAt;
    const endTime = new Date(
      lastGame.recordedAt.getTime() + (lastGame.frameCount / 60) * 1000,
    );

    let totalDurationFrames = 0;
    let wins = 0;
    let losses = 0;
    const yourCharSet = new Set<number>();
    const oppCharSet = new Set<number>();
    let primaryOpponentName = "";
    let sessionVideoLink: VideoLinkData | null = null;

    for (const game of cluster) {
      totalDurationFrames += game.frameCount;
      const vData = loadVideoLink(game.id);
      if (vData && !sessionVideoLink) {
        sessionVideoLink = vData;
      }

      const sig = getOpponentSignature(game, identity);
      if (!primaryOpponentName && sig.opponentName) {
        primaryOpponentName = sig.opponentName;
      }

      if (sig.yourPort !== null && game.ports.length === 2) {
        const yourP = game.ports.find((p) => p.port === sig.yourPort);
        const oppPort = resolveOpponentPort(game, sig.yourPort);
        const oppP =
          oppPort !== null ? game.ports.find((p) => p.port === oppPort) : null;

        if (yourP) yourCharSet.add(yourP.characterId);
        if (oppP) oppCharSet.add(oppP.characterId);

        if (yourP && oppP && yourP.finalStocks >= 0 && oppP.finalStocks >= 0) {
          if (yourP.finalStocks > oppP.finalStocks) {
            wins++;
          } else if (oppP.finalStocks > yourP.finalStocks) {
            losses++;
          }
        }
      } else {
        // Collect characters for non-resolved / solo games
        for (const p of game.ports) {
          yourCharSet.add(p.characterId);
        }
      }
    }

    // Sort games in cluster according to desired sortOrder
    const sortedGames = [...cluster].sort((a, b) => {
      const diff = a.recordedAt.getTime() - b.recordedAt.getTime();
      return sortOrder === "newest" ? -diff : diff;
    });

    return {
      id: `session_${firstGame.id}`,
      opponentName: primaryOpponentName,
      opponentCharacterIds: Array.from(oppCharSet),
      yourCharacterIds: Array.from(yourCharSet),
      startTime,
      endTime,
      totalDurationFrames,
      games: sortedGames,
      wins,
      losses,
      hasVideo: Boolean(sessionVideoLink),
      videoId: sessionVideoLink?.videoId,
      videoLinkData: sessionVideoLink,
    };
  });

  // Sort sessions according to sortOrder (by startTime)
  return sessionGroups.sort((a, b) => {
    const diff = a.startTime.getTime() - b.startTime.getTime();
    return sortOrder === "newest" ? -diff : diff;
  });
}
