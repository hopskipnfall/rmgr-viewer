import type { VideoLinkData } from "../video/youtubeSync.js";
import { ANALYSIS_VERSION, isStale } from "./analysisVersion.js";
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
  readonly imported: number;
  /** Entries dropped because their analysis is stale; they get recomputed. */
  readonly skippedStale: number;
}

export function buildProjectFile(
  games: readonly StoredGame[],
  identity: Identity,
  videoLinks: Readonly<Record<string, VideoLinkData>>,
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
    `  }`,
    "}",
    "",
  ]
    // Drop the empty line an empty games/videoLinks list would leave behind.
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
  };
}

/**
 * Merges an imported project into the local library. Never clears: an import
 * adds to what's already there. Entries whose analysis is stale are dropped
 * so they're recomputed when the replay folder is re-added.
 */
export async function mergeProjectFile(
  file: ProjectFile,
  store: LibraryStore,
): Promise<ImportProjectResult> {
  // StoredGame already carries analysisVersion/formatVersion/
  // recorderSchemaVersion - exactly isStale()'s VersionedEntry shape.
  const fresh = file.games.filter((g) => !isStale(g));
  if (fresh.length > 0) await store.putMany(fresh);
  return {
    imported: fresh.length,
    skippedStale: file.games.length - fresh.length,
  };
}
