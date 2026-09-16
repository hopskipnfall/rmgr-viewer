import type { GameSummary } from "./gameSummary.js";
import type { Identity } from "./identity.js";
import { groupGamesIntoSessions } from "./session.js";

/** Where one game sits within its play session, and what's on either side. */
export interface SessionNeighbors {
  readonly sessionId: string;
  /** 0-based position within the session, counting from the first game played. */
  readonly index: number;
  readonly total: number;
  readonly previousGameId: string | null;
  readonly nextGameId: string | null;
}

/**
 * The session-order neighbors of `gameId`, or null when it isn't in any
 * session (not in the library at all). Mirrors compute12CbMatchState()'s
 * contract so the match sidebar wires both the same way.
 *
 * Asks for "oldest" ordering so "previous"/"next" mean earlier/later in the
 * session as it was actually played - the library's default is newest-first,
 * which would read backwards here.
 */
export function sessionNeighbors(
  gameId: string,
  summaries: readonly GameSummary[],
  identity: Identity,
): SessionNeighbors | null {
  for (const session of groupGamesIntoSessions(summaries, identity, "oldest")) {
    const index = session.games.findIndex((g) => g.id === gameId);
    if (index === -1) continue;
    return {
      sessionId: session.id,
      index,
      total: session.games.length,
      previousGameId: session.games[index - 1]?.id ?? null,
      nextGameId: session.games[index + 1]?.id ?? null,
    };
  }
  return null;
}
