# Persistent library — design

_Status: draft for Jonn's review, 2026-09-15. Supersedes the "Persistence" entry under "Parked designs" in `docs/product/README.md`._

## Goal

Refreshing the page should not lose the library. The user imports a folder of `.rmgr` files once. After that, the library, stats and matchup pages load instantly from browser storage, with no files needed. The raw replay file is only needed again to play back a game or to run a search.

## Constraints

- **Firefox must work.** Firefox has no persistent directory access (`showDirectoryPicker`), so the app cannot keep a handle to the folder. The user re-picks the folder, or a single file, when raw data is needed.
- **Don't copy replays into browser storage.** Only derived data is stored. The raw files stay on the user's disk.
- **Cloud storage is out of scope.** The design should not block it later (see "Future").

## Scope

**Stored:** the per-game `GameSummary` (today's `SerializedGameSummary`, about 1.6 KB per game) plus the user's own settings.

**Not stored:**

- Frame-by-frame replay data.
- Search data. Search keeps computing clips from the raw replays, so new search options don't need any cache changes.

## Design

### 1. Game identity

`gameId = hash(recordedAtEpochMillis, frameCount)`

This replaces the filename-based `generateGameId` in `src/data/gameSummary.ts`. Both inputs come from the recording itself, so the ID survives renaming or moving the file and editing player names.

The file format version and recorder schema version are deliberately left out of the ID. A re-export that fixes an encoding bug is the same game with better data, not a second game; putting the version in the ID would double-count that game in pooled stats. Version handling belongs to the cache entry (§2, §3).

Routes (`#/match/<id>`, clips' `gameId`) use the new IDs.

### 2. Storage

IndexedDB database `rmgr-viewer`, accessed only through one module, `src/data/libraryStore.ts`. IndexedDB rather than localStorage because localStorage caps out at about 5 MB (roughly 3,000 games). The reference user records about 350 games every three weeks, so that cap would be hit within months.

**Store `games`** — one entry per game, keyed by `gameId`:

| Field                                    | Purpose                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `id`                                     | `gameId` (§1)                                                                                  |
| `contentHash`                            | SHA-256 of the file bytes. Detects a changed file behind a known ID                            |
| `formatVersion`, `recorderSchemaVersion` | From the file header. Used by staleness (§3)                                                   |
| `analysisVersion`                        | The `ANALYSIS_VERSION` the summary was computed with                                           |
| `sourcePath`                             | Path relative to the imported folder (or the filename). Used in prompts and fast-path matching |
| `size`, `lastModified`                   | From the `File` object. Used for fast-path matching                                            |
| `summary`                                | `SerializedGameSummary`                                                                        |

**Store `userData`** — things the user chose that can't be recomputed from replays:

- Identity: display name and aliases. This stops being session-only; `loadIdentity()` currently clears it on every load.
- Manual perspective overrides, keyed by `gameId`.
- YouTube video links, keyed by `gameId`. These move out of their current localStorage keys.

### 3. Staleness

An entry is **stale** if either:

- its `analysisVersion` is not the current `ANALYSIS_VERSION`, or
- its `formatVersion`/`recorderSchemaVersion` is on the known-bad list (for versions later found to have encoded data wrongly).

Both `ANALYSIS_VERSION` and the known-bad list live in one module, `src/data/analysisVersion.ts`.

**Guard against forgetting to bump the version:** a snapshot test runs `summarizeReplay` over the 23 bundled demo replays and compares the result with a committed snapshot. Any change to analysis output fails the test. The fix is to bump `ANALYSIS_VERSION` and update the snapshot in the same change.

**How stale games show up:** they stay in the library list with a "needs re-import" badge, but are **left out of pooled stats**. Mixing old and new metric definitions can reverse a conclusion (see "Lesson learned" in the product README). A banner says "N games need re-import" and has a re-import button.

### 4. Start-up

1. Read every entry from `games` and `userData`.
2. Render the library, stats and matchup pages straight away.

No files are needed for any of this.

### 5. Importing (folder or individual files)

The session keeps a `gameId → File` map, which is empty after a refresh. For each imported `.rmgr` file:

1. **Fast path.** If an entry has the same `sourcePath`, `size` and `lastModified` and is not stale, add the file to the session map. The file is not read.
2. **Otherwise parse and summarize it** (today's `importReplayFiles` path), compute `gameId` and `contentHash`, then:
   - **Unknown ID:** add a new entry.
   - **Known ID, same hash, not stale:** only update `sourcePath`, `size` and `lastModified` (the file was moved or touched).
   - **Known ID, different hash, or stale:** recompute and replace the entry.
   - In every case, add the file to the session map.
3. **Duplicate IDs in one import** (e.g. an old and a re-exported copy of the same game): warn, and keep the file with the newer format/recorder version.

Parse errors are reported as they are today. A file that fails to parse never overwrites an existing entry.

### 6. Opening a game or playing a clip

`loadReplayForSummary` (`src/main.ts`) looks the game up in the session file map.

- **File is loaded:** play it, as today.
- **File isn't loaded:** show a prompt: "This replay isn't loaded this session", naming its `sourcePath`, with two buttons — **Import this file** and **Re-import folder**. If the chosen file's ID matches, the game opens. If it doesn't, the prompt says the file doesn't match.

Playlists and matchup-page links go through the same path.

### 7. Search

Search is unchanged apart from where files come from: it still parses each candidate game's raw replay. It runs over the games whose files are loaded this session.

- **Some games in scope aren't loaded:** show "N games not loaded this session — re-import the folder to include them", with a button. Principle 6: never leave them out silently.
- **None are loaded:** show only that prompt.

"Failed edge guards" goes through search, so it behaves the same.

### 8. Migration and demo mode

- **Video links:** existing links are keyed by old filename-based IDs. When a file is imported, compute both its old and new IDs, and move any link from the old key to the new one in `userData`.
- **Manual perspective overrides and identity:** these were never saved before, so there's nothing to migrate.
- **Demo mode:** regenerate `public/replays/demo-summaries.json` (`npm run generate:demo-summaries`) with the new IDs. Demo mode stays separate: demo games are never written to the user's `games` store.

## Phase 2: export / import project

Built on the same store, as a separate piece of work.

- **Export:** a `.zip` (using `fflate`) containing every `.rmgr` file under its `sourcePath`, plus `project.json`: `{ projectFormatVersion, entries, userData }`. Export needs every game's file loaded this session. If any aren't, it asks the user to re-import the folder first.
- **Import project:** unzip, write the entries and `userData` to the store, and put the files into the session map. Stale entries get recomputed from the included files.
- **After a refresh in the receiving browser:** it is in the same position as any other user. The library loads from the store, and playback needs the zip re-opened (or unzipped to a folder and imported).

## Testing

- **Unit tests:** `gameId`; staleness rules; fast-path matching and the replace/update rules (§5); duplicate-ID handling; `libraryStore` against `fake-indexeddb` (new dev dependency); video-link migration.
- **Snapshot test:** analysis output over the demo replays (§3).
- **Browser check, in Firefox and Chrome:** import a folder → refresh → library loads without files → open a game (import prompt) → import one file → it plays → re-import the folder (fast path, nothing re-parsed) → bump `ANALYSIS_VERSION` → stale badge and banner → re-import clears it.
- **i18n:** every new string in both EN and JA (`src/i18n.ts`).

## Build order

1. `gameId` change, `libraryStore`, and saving summaries on import.
2. Start-up from the store; session file map; import/open prompts (§5–§7).
3. Staleness, `ANALYSIS_VERSION`, snapshot test, badge and banner.
4. Persisted `userData` and video-link migration; regenerate demo summaries.
5. Phase 2: export / import project.

## Future (not designed here)

- **Chromium's persistent directory access** could remove the re-import prompts for Chrome/Edge users. It would plug in as another way to fill the session file map.
- **A localhost helper or cloud storage** would be further sources of raw files behind the same "get the bytes for game X" lookup. Because summaries are keyed by `gameId` and content hash rather than by path, cached results carry across sources.
