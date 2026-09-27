/**
 * A single free-text comment per character matchup, persisted the same way session comments are
 * (src/sessionComments.ts) - but a matchup has no existing stable id the way a session
 * (SessionGroup.id) or a game (gameIdFor(...)) does: it's identified purely by the directed pair
 * of character ids in the route (myChar, oppChar - see src/router.ts's "matchup" route;
 * "directed" because "my Fox vs their Falco" and "my Falco vs their Fox" are different pages).
 * This module owns that key format itself. Matchups also aren't enumerated anywhere else in the
 * app the way sessions/games are, so export (see getAllMatchupComments) scans localStorage
 * directly for this prefix instead of the notes.ts/sessionComments.ts pattern of iterating a
 * known id list, and this is folded into project export/import (see src/data/projectFile.ts).
 */
const STORAGE_KEY_PREFIX = "rmgr_matchup_comment_";

function storageKey(myChar: number, oppChar: number): string {
  return `${STORAGE_KEY_PREFIX}${myChar}_${oppChar}`;
}

/** Returns "" if no comment is saved for this matchup. Never throws. */
export function loadMatchupComment(myChar: number, oppChar: number): string {
  try {
    return localStorage.getItem(storageKey(myChar, oppChar)) ?? "";
  } catch {
    return "";
  }
}

/** Saves `text` (trimmed) for this matchup. An empty/whitespace-only text removes the storage
 * entry entirely, the same way saveSessionComment does. */
export function saveMatchupComment(
  myChar: number,
  oppChar: number,
  text: string,
): void {
  try {
    const trimmed = text.trim();
    const key = storageKey(myChar, oppChar);
    if (trimmed.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, trimmed);
    }
  } catch {
    // Ignore localStorage write errors
  }
}

/**
 * Every saved matchup comment, keyed by "myChar_oppChar" (no storage prefix) - for project
 * export. Matchups aren't enumerated anywhere else in the app, so this scans localStorage
 * directly rather than being handed a list of known matchups to check.
 */
export function getAllMatchupComments(): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_KEY_PREFIX)) continue;
      const value = localStorage.getItem(key);
      if (value) result[key.slice(STORAGE_KEY_PREFIX.length)] = value;
    }
  } catch {
    // Ignore localStorage read errors
  }
  return result;
}

/** Restores a comment from an exported "myChar_oppChar" key (see getAllMatchupComments) - used
 * by project import. */
export function saveMatchupCommentByKey(key: string, text: string): void {
  if (!key) return;
  try {
    const trimmed = text.trim();
    const fullKey = STORAGE_KEY_PREFIX + key;
    if (trimmed.length === 0) {
      localStorage.removeItem(fullKey);
    } else {
      localStorage.setItem(fullKey, trimmed);
    }
  } catch {
    // Ignore localStorage write errors
  }
}
