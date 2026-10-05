/**
 * Timestamped free-text annotations on a match, persisted per game the same
 * way src/video/youtubeSync.ts persists video links - one JSON blob in
 * localStorage per game id, folded into project export/import (see
 * src/data/projectFile.ts).
 */
import { notifyUserDataChanged } from "./data/userDataChanged.js";

export interface MatchNote {
  readonly id: string;
  readonly frameIndex: number;
  readonly text: string;
  /** Present = anchored to the NeutralHitEvent whose frameIndex matches this
   * value (one note per event, enforced by upsertAnchoredNote's upsert-by-
   * eventFrameIndex below). Absent = a freeform note, placed wherever the
   * user was paused/playing when they added it. */
  readonly eventFrameIndex?: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

const STORAGE_KEY_PREFIX = "rmgr_notes_";

/** Loads all notes saved for a game, oldest first (insertion order). Never throws. */
export function loadMatchNotes(gameId: string): MatchNote[] {
  if (!gameId) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + gameId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is MatchNote =>
        n &&
        typeof n === "object" &&
        typeof n.id === "string" &&
        typeof n.frameIndex === "number" &&
        typeof n.text === "string",
    );
  } catch {
    return [];
  }
}

/** Overwrites the full note list for a game. An empty list removes the storage entry entirely. */
export function saveMatchNotes(
  gameId: string,
  notes: readonly MatchNote[],
): void {
  if (!gameId) return;
  try {
    if (notes.length === 0) {
      localStorage.removeItem(STORAGE_KEY_PREFIX + gameId);
    } else {
      localStorage.setItem(STORAGE_KEY_PREFIX + gameId, JSON.stringify(notes));
    }
    notifyUserDataChanged();
  } catch {
    // Ignore localStorage write errors
  }
}

function newNoteId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Creates or replaces the single note anchored to `eventFrameIndex` - at
 * most one note per neutral-interaction row, per the design (see
 * docs/superpowers/specs/2026-09-27-match-notes-design.md). Returns the
 * game's full, already-saved note list.
 */
export function upsertAnchoredNote(
  gameId: string,
  eventFrameIndex: number,
  text: string,
): MatchNote[] {
  const notes = loadMatchNotes(gameId);
  const now = Date.now();
  const existing = notes.find((n) => n.eventFrameIndex === eventFrameIndex);
  const updated: MatchNote = existing
    ? { ...existing, text, updatedAt: now }
    : {
        id: newNoteId(),
        frameIndex: eventFrameIndex,
        eventFrameIndex,
        text,
        createdAt: now,
        updatedAt: now,
      };
  const next = existing
    ? notes.map((n) => (n.id === existing.id ? updated : n))
    : [...notes, updated];
  saveMatchNotes(gameId, next);
  return next;
}

/**
 * Adds a new freeform note at `frameIndex` - always creates a new note,
 * never upserts (unlike upsertAnchoredNote), since freeform notes have no
 * natural one-per-key identity to merge on. Returns the game's full,
 * already-saved note list.
 */
export function addFreeformNote(
  gameId: string,
  frameIndex: number,
  text: string,
): MatchNote[] {
  const notes = loadMatchNotes(gameId);
  const now = Date.now();
  const note: MatchNote = {
    id: newNoteId(),
    frameIndex,
    text,
    createdAt: now,
    updatedAt: now,
  };
  const next = [...notes, note];
  saveMatchNotes(gameId, next);
  return next;
}

/** Updates an existing note's text by id. A no-op (returns the list unchanged) if noteId isn't found. */
export function updateNoteText(
  gameId: string,
  noteId: string,
  text: string,
): MatchNote[] {
  const notes = loadMatchNotes(gameId);
  const now = Date.now();
  const next = notes.map((n) =>
    n.id === noteId ? { ...n, text, updatedAt: now } : n,
  );
  saveMatchNotes(gameId, next);
  return next;
}

/** Removes a note by id. A no-op if noteId isn't found. */
export function deleteMatchNote(gameId: string, noteId: string): MatchNote[] {
  const notes = loadMatchNotes(gameId);
  const next = notes.filter((n) => n.id !== noteId);
  saveMatchNotes(gameId, next);
  return next;
}
