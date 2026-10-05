import type { PortIndex } from "@rmg-k/rmgr";
import type { MatchNote } from "../notes.js";
import type { VideoLinkData } from "../video/youtubeSync.js";
import {
  buildProjectFile,
  type ProjectFile,
  type SerializedIdentity,
} from "./projectFile.js";

/**
 * Maps the user-authored data kept in localStorage (notes, session/matchup comments, identity,
 * YouTube links) to and from a ProjectFile. These key formats are owned by notes.ts,
 * sessionComments.ts, matchupComments.ts, identity.ts and youtubeSync.ts; they're mirrored here
 * so the whole set can be scanned without knowing which ids exist.
 */
const NOTES_PREFIX = "rmgr_notes_";
const SESSION_PREFIX = "rmgr_session_comment_";
const MATCHUP_PREFIX = "rmgr_matchup_comment_";
const VIDEO_PREFIX = "rmgr_yt_link_";
const IDENTITY_KEY = "rmgr-viewer-identity";

const PREFIXES = [NOTES_PREFIX, SESSION_PREFIX, MATCHUP_PREFIX, VIDEO_PREFIX];

function keysOf(storage: Storage): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key) keys.push(key);
  }
  return keys;
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Everything in scope, as a ProjectFile (no cached games; perspective overrides are passed in). */
export function collectUserData(
  storage: Storage,
  perspectiveOverrides: Readonly<Record<string, PortIndex>> = {},
): ProjectFile {
  const notes: Record<string, MatchNote[]> = {};
  const sessionComments: Record<string, string> = {};
  const matchupComments: Record<string, string> = {};
  const videoLinks: Record<string, VideoLinkData> = {};
  for (const key of keysOf(storage)) {
    const raw = storage.getItem(key);
    if (key.startsWith(NOTES_PREFIX)) {
      const parsed = parseJson(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        notes[key.slice(NOTES_PREFIX.length)] = parsed as MatchNote[];
      }
    } else if (key.startsWith(SESSION_PREFIX)) {
      if (raw) sessionComments[key.slice(SESSION_PREFIX.length)] = raw;
    } else if (key.startsWith(MATCHUP_PREFIX)) {
      if (raw) matchupComments[key.slice(MATCHUP_PREFIX.length)] = raw;
    } else if (key.startsWith(VIDEO_PREFIX)) {
      const parsed = parseJson(raw) as Partial<VideoLinkData> | null;
      if (parsed && typeof parsed.videoId === "string") {
        videoLinks[key.slice(VIDEO_PREFIX.length)] = parsed as VideoLinkData;
      }
    }
  }
  const idRaw = parseJson(storage.getItem(IDENTITY_KEY)) as {
    displayName?: unknown;
    aliases?: unknown;
  } | null;
  const aliases =
    idRaw && Array.isArray(idRaw.aliases)
      ? idRaw.aliases.filter((a): a is string => typeof a === "string")
      : [];
  const displayName =
    idRaw && typeof idRaw.displayName === "string" ? idRaw.displayName : "";
  return buildProjectFile(
    [],
    { displayName, aliases: new Set(aliases) },
    videoLinks,
    notes,
    sessionComments,
    matchupComments,
    perspectiveOverrides,
  );
}

/** Removes every in-scope key. Other preferences (theme, language, playback mode) are untouched. */
export function clearUserData(storage: Storage): void {
  for (const key of keysOf(storage)) {
    if (key === IDENTITY_KEY || PREFIXES.some((p) => key.startsWith(p))) {
      storage.removeItem(key);
    }
  }
}

/**
 * Replaces the in-scope localStorage data with a project file's. Writes storage directly (not
 * through the save* helpers) so it doesn't fire change notifications and trigger a re-save.
 */
export function applyUserData(storage: Storage, file: ProjectFile): void {
  clearUserData(storage);
  for (const [id, list] of Object.entries(file.notes)) {
    if (list.length > 0)
      storage.setItem(NOTES_PREFIX + id, JSON.stringify(list));
  }
  for (const [id, text] of Object.entries(file.sessionComments)) {
    if (text) storage.setItem(SESSION_PREFIX + id, text);
  }
  for (const [key, text] of Object.entries(file.matchupComments)) {
    if (text) storage.setItem(MATCHUP_PREFIX + key, text);
  }
  for (const [id, link] of Object.entries(file.videoLinks)) {
    storage.setItem(VIDEO_PREFIX + id, JSON.stringify(link));
  }
  const id: SerializedIdentity = file.identity;
  if (id.displayName || id.aliases.length > 0) {
    storage.setItem(
      IDENTITY_KEY,
      JSON.stringify({ displayName: id.displayName, aliases: id.aliases }),
    );
  }
}
