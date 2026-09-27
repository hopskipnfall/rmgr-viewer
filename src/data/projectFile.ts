import type { VideoLinkData } from "../video/youtubeSync.js";
import type { MatchNote } from "../notes.js";
import {
  ANALYSIS_VERSION,
  isStale,
  isKnownBadEncoding,
  KNOWN_BAD_VERSIONS,
  type VersionMatcher,
} from "./analysisVersion.js";
import type { Identity } from "./identity.js";
import type { LibraryStore, StoredGame } from "./libraryStore.js";

/** Marker so an unrelated JSON file can't be imported by accident. */
const KIND = "rmgr-viewer-project";
/** This file format's own version, independent of ANALYSIS_VERSION. */
const FILE_VERSION = 1;

/**
 * An exported project: everything the app knows about a library except the
 * replay bytes themselves. Importing it on another machine (or another
 * browser) restores the library; the user then re-adds the replay folder to
 * watch or search, exactly as after a page refresh.
 */
export interface ProjectFile {
  readonly kind: typeof KIND;
  readonly fileVersion: number;
  readonly analysisVersion: number;
  readonly exportedAt: string;
  /**
   * The library rows as stored. Whole rows rather than just their summaries:
   * they also carry manualPerspectivePort (set by hand, must survive) and
   * contentHash/sourcePath/size, which let re-adding the folder match these
   * entries by the existing fast path instead of re-analyzing every file.
   */
  readonly games: readonly StoredGame[];
  readonly identity: SerializedIdentity;
  /** Keyed by replay id, as stored in localStorage by youtubeSync.ts. */
  readonly videoLinks: Readonly<Record<string, VideoLinkData>>;
  /** Keyed by replay id, as stored in localStorage by notes.ts. */
  readonly notes: Readonly<Record<string, readonly MatchNote[]>>;
  /** Keyed by session id (SessionGroup.id, from data/session.ts), as stored in localStorage by
   * sessionComments.ts. */
  readonly sessionComments: Readonly<Record<string, string>>;
}

/**
 * `Identity.aliases` is a Set, which `JSON.stringify` turns into `{}` - so
 * the file stores aliases as an array, the same way identity.ts persists
 * them to localStorage. Converted back to a Set by `identityOf()`.
 */
export interface SerializedIdentity {
  readonly displayName: string;
  readonly aliases: readonly string[];
}

/** The usable Identity for a parsed project file. */
export function identityOf(file: ProjectFile): Identity {
  return {
    displayName: file.identity?.displayName ?? "",
    aliases: new Set(
      (file.identity?.aliases ?? []).filter((a) => typeof a === "string"),
    ),
  };
}

/** A file that isn't a usable project export (wrong kind, newer format, not JSON). */
export class ProjectFileError extends Error {}

export interface ImportProjectResult {
  /** Entries actually stored - everything except known-bad encodings (see isKnownBadEncoding()). */
  readonly imported: number;
  /**
   * Of the imported entries, how many are on an older analysis version - they're shown using
   * their cached stats right away (see libraryPersistence.ts's loadPersistedLibrary()) and get
   * recomputed automatically once the user reconnects the original replay folder.
   */
  readonly pendingRecompute: number;
}

export function buildProjectFile(
  games: readonly StoredGame[],
  identity: Identity,
  videoLinks: Readonly<Record<string, VideoLinkData>>,
  notes: Readonly<Record<string, readonly MatchNote[]>> = {},
  sessionComments: Readonly<Record<string, string>> = {},
): ProjectFile {
  return {
    kind: KIND,
    fileVersion: FILE_VERSION,
    analysisVersion: ANALYSIS_VERSION,
    exportedAt: new Date().toISOString(),
    games: [...games],
    identity: {
      displayName: identity.displayName,
      aliases: [...identity.aliases],
    },
    videoLinks,
    notes,
    sessionComments,
  };
}

/**
 * Valid JSON, laid out one record per line: each game and each video link
 * gets its own line, and the records themselves stay compact. Fully
 * pretty-printing would bloat the file (thousands of lines per game's stats);
 * a single line would make a diff unreadable. This way a project file kept in
 * git shows one changed line per changed game.
 */
export function serializeProjectFile(file: ProjectFile): Blob {
  const j = (value: unknown): string => JSON.stringify(value);
  const listLines = (items: readonly string[]): string =>
    items
      .map((line, i) => `    ${line}${i < items.length - 1 ? "," : ""}`)
      .join("\n");

  const games = listLines(file.games.map((g) => j(g)));
  const videoLinks = listLines(
    Object.entries(file.videoLinks).map(([id, link]) => `${j(id)}: ${j(link)}`),
  );
  const notes = listLines(
    Object.entries(file.notes).map(([id, list]) => `${j(id)}: ${j(list)}`),
  );
  const sessionComments = listLines(
    Object.entries(file.sessionComments).map(
      ([id, comment]) => `${j(id)}: ${j(comment)}`,
    ),
  );

  const text = [
    "{",
    `  "kind": ${j(file.kind)},`,
    `  "fileVersion": ${j(file.fileVersion)},`,
    `  "analysisVersion": ${j(file.analysisVersion)},`,
    `  "exportedAt": ${j(file.exportedAt)},`,
    `  "identity": ${j(file.identity)},`,
    `  "games": [`,
    games,
    `  ],`,
    `  "videoLinks": {`,
    videoLinks,
    `  },`,
    `  "notes": {`,
    notes,
    `  },`,
    `  "sessionComments": {`,
    sessionComments,
    `  }`,
    "}",
    "",
  ]
    // Drop the empty line an empty games/videoLinks/notes/sessionComments list would leave behind.
    .filter((line) => line !== "")
    .join("\n")
    .concat("\n");

  return new Blob([text], { type: "application/json" });
}

export function parseProjectFile(text: string): ProjectFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ProjectFileError("not valid JSON");
  }
  const file = raw as Partial<ProjectFile> | null;
  if (file?.kind !== KIND) {
    throw new ProjectFileError("not an rmgr-viewer project file");
  }
  if (typeof file.fileVersion !== "number" || file.fileVersion > FILE_VERSION) {
    throw new ProjectFileError("unsupported project file version");
  }
  return {
    kind: KIND,
    fileVersion: file.fileVersion,
    analysisVersion: file.analysisVersion ?? 0,
    exportedAt: file.exportedAt ?? "",
    games: file.games ?? [],
    identity: {
      displayName:
        typeof file.identity?.displayName === "string"
          ? file.identity.displayName
          : "",
      aliases: Array.isArray(file.identity?.aliases)
        ? file.identity.aliases
        : [],
    },
    videoLinks: file.videoLinks ?? {},
    notes: file.notes ?? {},
    sessionComments: file.sessionComments ?? {},
  };
}

/**
 * Merges an imported project into the local library. Never clears: an import
 * adds to what's already there. Only entries with a genuinely broken encoding
 * (isKnownBadEncoding()) are dropped - an older analysis version alone isn't a
 * reason to discard a game, since the user importing a project file often
 * doesn't have the original replay handy to trigger a recompute (that's the
 * point of exporting a portable project file in the first place). Those
 * entries are still imported and shown with their cached stats; they get
 * recomputed automatically once the replay folder is re-added.
 */
export async function mergeProjectFile(
  file: ProjectFile,
  store: LibraryStore,
  knownBad: readonly VersionMatcher[] = KNOWN_BAD_VERSIONS,
): Promise<ImportProjectResult> {
  // StoredGame already carries analysisVersion/formatVersion/
  // recorderSchemaVersion - exactly isKnownBadEncoding()'s VersionedEntry shape.
  const usable = file.games.filter((g) => !isKnownBadEncoding(g, knownBad));
  if (usable.length > 0) await store.putMany(usable);
  return {
    imported: usable.length,
    pendingRecompute: usable.filter((g) => isStale(g, knownBad)).length,
  };
}
