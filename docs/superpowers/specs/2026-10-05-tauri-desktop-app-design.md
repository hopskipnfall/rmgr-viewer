# Tauri Desktop App: Persistent Library Folder

Date: 2026-10-05
Status: Draft, awaiting review

## Problem

Game summaries persist in IndexedDB (`src/data/libraryPersistence.ts`), but replay bytes do not.
`GameSummary.fileRef` is a session-only browser `File`, so after every reload, opening a game hits
`promptForMissingFile` (`src/library/missingFilePrompt.ts`) and the user must re-import the replays
folder. Firefox (the primary user's browser) has no persistent directory-handle API, so the fix is a
desktop build with real filesystem access.

## Goals

- Ship a Tauri 2 desktop app (macOS, Windows, Linux) from the same codebase as the web app.
- The desktop app points at a library folder (default `~/Documents/Replays`, user-changeable) and
  has permanent read access to it: no re-import, no missing-file prompt for files that exist.
- New recordings appear in the library automatically (scan on launch + live file watching).
- The web app at replay.12cb.dev keeps working with today's import flow.

## Non-goals (separate sub-projects)

- **Chrome File System Access backend.** It will be a third `ReplayFileSource` producer (stored
  directory handle). The interface below is designed so it slots in, but it is not built here.
- **Folder management (rename, move, organize).** This spec ships read-only access. Entries are
  matched by content hash so a later spec can add write operations without re-keying the library.
- Code signing, notarization, auto-update.
- Copying files from outside the library folder into it.

## 1. Architecture

### Repo layout

```
src-tauri/
  Cargo.toml
  tauri.conf.json          # devUrl http://localhost:5183, frontendDist ../dist, version from ../package.json
  capabilities/default.json
  src/main.rs              # registers plugins only
src/desktop/
  libraryFolder.ts         # root resolution, scan, watch
  fsAdapter.ts             # thin wrapper over plugin-fs/dialog/store (the mock seam for tests)
src/data/replayFileSource.ts
```

Tauri plugins: `fs` (with the `watch` feature), `dialog`, `store`, `persisted-scope`.
Capabilities: fs `read-file`, `stat`, `read-dir`, `exists`, `mkdir`, `watch` scoped to
`$DOCUMENT/Replays/**`. Folders chosen through the dialog are added to the scope at runtime and kept
across restarts by `persisted-scope`. Also `dialog:allow-open` and `store:default`.

New npm scripts: `tauri:dev` (`tauri dev`) and `tauri:build` (`tauri build`). `npm run build`, `npm run dev`,
and the GitHub Pages deploy are unchanged.

### Runtime switch

`main.ts` checks `isTauri()` (`@tauri-apps/api/core`) at startup. On desktop it dynamic-imports
`src/desktop/libraryFolder.ts`, so plugin code never enters the web bundle's initial chunk.

### `ReplayFileSource`: replaces `File` as the unit of import

```ts
// src/data/replayFileSource.ts
export interface ReplayFileSource {
  /** sourcePath is relative to the library root on desktop, webkitRelativePath || name on web. */
  meta: FileMeta;
  name: string;
  /** Lazy. Called only when parsing a new/changed file or opening a game. */
  read(): Promise<Uint8Array>;
}

export function fromBrowserFile(file: File): ReplayFileSource;
// src/desktop/libraryFolder.ts
export function fromLibraryPath(
  root: string,
  relPath: string,
  stat: { size: number; mtime: number },
): ReplayFileSource;
```

Refactor:

- `GameSummary.fileRef: File | null` becomes `source: ReplayFileSource | null`.
- `fileMeta(file)`, the importer, and `importPlanner` take `ReplayFileSource[]` instead of `FileList`/`File`.
- `loadReplayFromFile(file)` becomes `loadReplayFromSource(source)` in `src/replaySource.ts`.
- Web pickers (`filePicker`, `folderPicker` in `main.ts`) map `FileList` through `fromBrowserFile`.
  Web behavior is unchanged.

Because `read()` is lazy, the planner can attach an unchanged file to its cached summary from `stat`
data alone (path + size + mtime), with no bytes read.

## 2. Data flow

### Desktop launch

1. Load cached summaries from IndexedDB, as today. The library renders immediately.
2. Resolve the root: the saved `plugin-store` value, else `$DOCUMENT/Replays`. If the default does not
   exist, create it. If a saved non-default root no longer exists, show the library with no sources
   and a banner: "Library folder not found" plus a **Change…** button.
3. Scan: recursive `readDir`, filter `*.rmgr` (case-insensitive), `stat` each file, build sources, and pass
   them to the existing background import:
   - path/size/mtime match: attach the source to the cached summary, zero reads.
   - new or changed: parse and summarize (existing idle-yielding import).
   - path unknown but content hash matches an existing entry (renamed/moved outside the app):
     update that entry's `sourcePath`. No duplicate entry.
4. Cached summaries not matched by the scan keep `source = null`.
5. Start `watch(root, { recursive: true, delayMs: 1000 })`.

### Watcher events

- **Create/modify of `*.rmgr`:** stability check (two `stat`s ~1s apart, same size), then import that
  single source. If parsing fails, retry once after another stability wait. A second failure goes
  to the normal import error list.
- **Remove:** set the matching summary's `source` to null. The summary, notes, and comments are kept.
  If the file reappears, it re-attaches.
- Events for the same path are coalesced, so a burst of modify events triggers one import.

### Opening a game

`loadReplayForSummary` calls `summary.source.read()`. If `source` is null or `read()` throws, the
desktop app shows a desktop variant of the missing-file prompt ("Not found in your library folder")
with **Rescan** and **Cancel**. The web prompt is unchanged.

### Changing the library folder

A settings row "Library folder: `<path>` [Change…]":

1. Opens `dialog.open({ directory: true })`. Cancel means no change.
2. Saves the path to `plugin-store`.
3. Stops the old watcher, sets every summary's `source` to null, rescans, and starts a new watcher.

Summaries from the old folder remain without sources.

### UI differences on desktop

- "Import file" / "Import folder" are replaced by **Rescan** (re-runs the launch scan).
- First launch only: a dismissible one-line hint that notes, comments, and settings from the web
  version can be brought over with project export/import (desktop storage is a separate origin).

Unchanged: bundled demo replays (URL-loaded from the app bundle), notes, comments, project
export/import, hash routing.

## 3. Release pipeline

### `.github/workflows/release.yml` (new)

- Trigger: push of a `v*` tag.
- Matrix: `macos-latest` (`--target universal-apple-darwin`), `windows-latest`, `ubuntu-22.04`.
- Steps: check out `rmgr-viewer` + sibling `rmgr-ts` (same as `ci.yml`), build `rmgr-ts`, install Node
  and the stable Rust toolchain. On Ubuntu, install `libwebkit2gtk-4.1-dev libappindicator3-dev
librsvg2-dev patchelf`. Then run `npm ci` and `tauri-apps/tauri-action`.
- Output: a draft GitHub Release with `.dmg`, `.msi`, `-setup.exe`, `.AppImage`, `.deb`.
- Unsigned. The README gets a "Desktop app" section covering install and first-launch Gatekeeper/SmartScreen steps.

### `ci.yml`

Add one job: `cargo check --manifest-path src-tauri/Cargo.toml` on `ubuntu-22.04` (same apt
dependencies), so the Rust side cannot rot between releases.

## 4. Risks

| Risk                                                                                   | Mitigation                                                                                                                                           |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| YouTube iframe API refuses to play from `tauri://localhost` / `http://tauri.localhost` | Set the `origin` player param and a CSP `frame-src https://www.youtube.com`. If it still fails, label the video-sync feature unavailable on desktop. |
| Desktop IndexedDB/localStorage start empty (separate origin)                           | Project export/import as the migration path, plus the first-launch hint.                                                                             |
| Linux inotify watch limits on large trees                                              | Acceptable for expected folder sizes. Rescan is the fallback.                                                                                        |
| WebView differences (WebKitGTK, WebView2, WKWebView)                                   | Covered by the per-OS smoke test. `requestIdleCallback` already has a fallback.                                                                      |

## 5. Testing

Unit tests (vitest; plugin calls mocked at `src/desktop/fsAdapter.ts`):

- `fromBrowserFile` and `fromLibraryPath` produce the correct `meta`, and `read()` returns the bytes.
- Planner with lazy sources: unchanged files attach with `read()` called zero times.
- Hash-matched rename updates `sourcePath` and creates no duplicate.
- Watcher handling: the stability check delays the import until size settles. Remove nulls `source`, and
  re-add re-attaches. Bursts coalesce into one import.
- Root resolution: default created when missing; a saved-but-missing root shows the banner state.

The existing test suite passes unchanged on web, which confirms the refactor did not change behavior.

Manual smoke test on each OS (checklist carried into the plan):

1. First launch creates `~/Documents/Replays` and the library loads.
2. Record a game in RMG-K into the folder: it appears without user action.
3. Rename a replay in Finder/Explorer: same entry, notes intact, no duplicate.
4. Delete a replay, then open it: desktop missing-file prompt, and Rescan works.
5. Change the folder: library re-scans and the new folder is watched.
6. Quit and relaunch: the custom folder is still readable, with no prompt.
7. Open a match with a YouTube link: playback works or is labeled unavailable.
