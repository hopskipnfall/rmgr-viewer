import type { SessionGroup } from "../data/session.js";

const RECENCY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface RecencyGroups {
  readonly thisWeek: readonly SessionGroup[];
  readonly older: readonly SessionGroup[];
}

/**
 * "This week" is a rolling last-7-days window (now back through 6 days
 * ago), not a calendar week - avoids a Sunday/Monday start-of-week
 * convention debate. Each group is sorted newest-first.
 */
export function groupSessionsByRecency(
  sessions: readonly SessionGroup[],
  now: Date,
): RecencyGroups {
  const cutoff = now.getTime() - RECENCY_WINDOW_MS;
  const sorted = [...sessions].sort(
    (a, b) => b.startTime.getTime() - a.startTime.getTime(),
  );
  return {
    thisWeek: sorted.filter((s) => s.startTime.getTime() > cutoff),
    older: sorted.filter((s) => s.startTime.getTime() <= cutoff),
  };
}

/**
 * Line 1 of a sidebar session row. `opponentName` is already a
 * comma-joined list of every other lobby member (session.ts's
 * getOpponentInfo), so a 3-4 player rotation session lists everyone.
 * Solo/no-opponent sessions (empty opponentName) are assumed not to
 * occur - this deliberately does not special-case that, per the design.
 */
export function sessionOpponentLine(session: SessionGroup): string {
  return `with ${session.opponentName}`;
}

/** Line 2 of a sidebar session row: date + W-L record. */
export function sessionDateRecordLine(session: SessionGroup): string {
  const dateStr = session.startTime.toLocaleDateString();
  return `${dateStr} · ${session.wins}-${session.losses}`;
}
