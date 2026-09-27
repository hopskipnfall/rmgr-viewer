/**
 * A single free-text comment per session, persisted the same way match notes and video links are
 * - one localStorage entry per session id (SessionGroup.id, from src/data/session.ts), folded
 * into project export/import (see src/data/projectFile.ts). Unlike src/notes.ts, a session has at
 * most one comment, so this stores a plain string rather than an array of records.
 */
const STORAGE_KEY_PREFIX = "rmgr_session_comment_";

/** Returns "" if no comment is saved for this session. Never throws. */
export function loadSessionComment(sessionId: string): string {
  if (!sessionId) return "";
  try {
    return localStorage.getItem(STORAGE_KEY_PREFIX + sessionId) ?? "";
  } catch {
    return "";
  }
}

/** Saves `text` (trimmed) for this session. An empty/whitespace-only text removes the storage
 * entry entirely, the same way an empty MatchNote[] removes its key in notes.ts. */
export function saveSessionComment(sessionId: string, text: string): void {
  if (!sessionId) return;
  try {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      localStorage.removeItem(STORAGE_KEY_PREFIX + sessionId);
    } else {
      localStorage.setItem(STORAGE_KEY_PREFIX + sessionId, trimmed);
    }
  } catch {
    // Ignore localStorage write errors
  }
}
