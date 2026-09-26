/**
 * Version of everything `summarizeReplay()` computes. Persisted alongside
 * every cached game summary (see libraryStore.ts); a cached entry whose
 * version differs is stale and gets recomputed from the raw replay on the
 * next import.
 *
 * Bump this whenever a change alters summarizeReplay()'s output - a new
 * stat, a changed definition, a detector fix. demoSummaries.test.ts fails
 * until you do, and `npm run generate:demo-summaries` refuses to overwrite
 * changed output without a bump.
 */
export const ANALYSIS_VERSION = 9;
// History:
// 1 - initial persistent library.
// 2 - GameSummary.lobbyNames (whole lobby, for rotating 3-4 player sessions).
// 3 - recovery classifier: Link's Spin Attack full-gravity switch at frame 12
//     (was 45) and death at the real bottom blast zone (-3500, was -6000).
// 4 - recovery classifier: Captain Falcon can reposition with an aerial
//     Falcon Punch's release burst before Falcon Dive.
// 5 - kill combos: a combo that leaves the victim in a "contestable" position
//     (stage/ledge still reachable) isn't a kill combo, even if they die.
// 6 - recovery classifier: checkLandsOnMainFloor now credits a trajectory
//     that passes over the stage's X span while still airborne, not just an
//     exact landing crossing (see docs/recovery-heuristics/README.md); the
//     stale Pikachu fast-dead-rejection table this invalidated was removed.
// 7 - RawCounters.microStats: granular/secondary stats not shown as top-level
//     numbers yet, starting with punished up/down/forward smash attempts
//     (see microStats.ts).
// 8 - microStats only tracks punish counts now, not attempt counts (each
//     MicroStatId maps to a number, not {attempted, punished}).
// 9 - microStats: added punished up tilt for Pikachu, Ness, Yoshi, and Link
//     (US+JP) as four new stat ids.

/** Matches replays by the versions in their file header. An unset field matches any value. */
export interface VersionMatcher {
  formatVersion?: number;
  recorderSchemaVersion?: number;
}

/**
 * Replay encodings later found to have been written incorrectly. Cached
 * entries from a matching file are always treated as stale, so a fixed
 * re-export of the same game replaces them on import.
 */
export const KNOWN_BAD_VERSIONS: readonly VersionMatcher[] = [];

export interface VersionedEntry {
  analysisVersion: number;
  formatVersion: number;
  recorderSchemaVersion: number;
}

export function isStale(
  entry: VersionedEntry,
  knownBad: readonly VersionMatcher[] = KNOWN_BAD_VERSIONS,
): boolean {
  if (entry.analysisVersion !== ANALYSIS_VERSION) return true;
  return knownBad.some(
    (m) =>
      (m.formatVersion !== undefined ||
        m.recorderSchemaVersion !== undefined) &&
      (m.formatVersion === undefined ||
        m.formatVersion === entry.formatVersion) &&
      (m.recorderSchemaVersion === undefined ||
        m.recorderSchemaVersion === entry.recorderSchemaVersion),
  );
}
