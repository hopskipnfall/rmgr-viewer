# Tauri Desktop App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Tauri 2 desktop build with a persistent, watched library folder, from the same codebase as the web app.

**Architecture:** Replace `File` with a lazy `ReplayFileSource` as the unit of import (web and desktop both produce it). A desktop-only module (`src/desktop/`) resolves the library root, scans, and watches it through a mockable `fsAdapter`, feeding the existing `importIntoLibrary`. `main.ts` dynamic-imports it only when `isTauri()`.

**Tech Stack:** TypeScript, Vite, vitest, Tauri 2 (`plugin-fs` w/ watch, `plugin-dialog`, `plugin-store`, `plugin-persisted-scope`), GitHub Actions `tauri-apps/tauri-action`.

Spec: `docs/superpowers/specs/2026-10-05-tauri-desktop-app-design.md` (copy from the sibling worktree `tauri-app-bundling-design-b7f787` into this branch in Task 1).

## Global Constraints

- Web app at replay.12cb.dev keeps working with today's import flow; `npm run build`, `npm run dev`, GitHub Pages deploy unchanged.
- Existing test suite passes unchanged in behavior (only `fileRef` → `source` mechanical renames).
- Tauri 2; devUrl `http://localhost:5183`, frontendDist `../dist`; default library `$DOCUMENT/Replays`.
- fs capabilities `read-file`, `stat`, `read-dir`, `exists`, `mkdir`, `watch` scoped to `$DOCUMENT/Replays/**`; also `dialog:allow-open`, `store:default`.
- Watch: `watch(root, { recursive: true, delayMs: 1000 })`. Stability check = two `stat`s ~1s apart with same size; retry parse once.
- Plugin code must not enter the web bundle's initial chunk (dynamic import behind `isTauri()`).
- Unsigned release; no commits unless the user asks (workflow hook blocks weekday business hours).

## File Structure

- Create `src/data/replayFileSource.ts` — `ReplayFileSource`, `FileMeta`-compatible meta, `fromBrowserFile`.
- Create `src/desktop/fsAdapter.ts` — only file importing `@tauri-apps/plugin-*`; mock seam.
- Create `src/desktop/libraryFolder.ts` — `fromLibraryPath`, root resolution, scan, watcher handling.
- Create `src/desktop/desktopUi.ts` — Rescan button, folder row, banner, first-launch hint, desktop missing-file prompt.
- Create `src-tauri/*`, `.github/workflows/release.yml`.
- Modify `gameSummary.ts`, `importer.ts`, `importPlanner.ts`, `libraryPersistence.ts`, `replaySource.ts`, `missingFilePrompt.ts`, `main.ts`, `searchView.ts`, `i18n.ts`, `index.html`, tests using `fileRef`, `package.json`, `ci.yml`, `README.md`, `.gitignore`.

---

### Task 1: `ReplayFileSource` refactor (web behavior unchanged)

**Files:** create `src/data/replayFileSource.ts` (+ `.test.ts`); modify `gameSummary.ts` (`fileRef`→`source`, `summarizeReplay` 2nd param), `importer.ts`, `importPlanner.ts` (`FileMeta` re-exported from replayFileSource), `libraryPersistence.ts`, `replaySource.ts`, `main.ts`, `searchView.ts:422`, `missingFilePrompt.ts`, all tests/scripts referencing `fileRef`/`File`.

**Interfaces — Produces:**

```ts
// src/data/replayFileSource.ts
export interface FileMeta {
  sourcePath: string;
  size: number;
  lastModified: number;
}
export interface ReplayFileSource {
  meta: FileMeta;
  name: string;
  read(): Promise<Uint8Array>;
}
export function fromBrowserFile(file: File): ReplayFileSource;
// replaySource.ts
export async function loadReplayFromSource(
  source: ReplayFileSource,
): Promise<LoadedReplay>;
// importer.ts
export function importReplayFiles(
  sources: readonly ReplayFileSource[],
  onProgress?,
): Promise<ImportResult>;
// libraryPersistence.ts
export function importIntoLibrary(
  store,
  sources: readonly ReplayFileSource[],
  onProgress?,
  onFastPathMatched?,
): Promise<PersistImportResult>;
```

`GameSummary.source: ReplayFileSource | null`. `importer.fileMeta` is removed (meta lives on the source).

- [ ] **Step 1: Failing test** `src/data/replayFileSource.test.ts`: `fromBrowserFile(new File([bytes], "a.rmgr", {lastModified: 5}))` yields `meta {sourcePath:"a.rmgr", size, lastModified:5}`, `name "a.rmgr"`, `read()` equals bytes; with `webkitRelativePath` defined via `Object.defineProperty` → `sourcePath` is that path. Use `globalThis.File ?? NodeFile` as in `importer.test.ts`.
- [ ] **Step 2:** `npx vitest run src/data/replayFileSource.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement**

```ts
export function fromBrowserFile(file: File): ReplayFileSource {
  return {
    meta: {
      sourcePath: file.webkitRelativePath || file.name,
      size: file.size,
      lastModified: file.lastModified,
    },
    name: file.name,
    read: async () => new Uint8Array(await file.arrayBuffer()),
  };
}
```

- [ ] **Step 4:** Mechanical refactor, then `npm run typecheck` until clean:
  - `importer.ts`: take `ReplayFileSource[]`; filter on `s.name`; `bytes = await s.read()`; `summarizeReplay(loaded, s)`; `meta: s.meta`. Delete `fileMeta` and its test block (replace with the `fromBrowserFile` test from Step 1).
  - `importPlanner.ts`: `import type { FileMeta }` from replayFileSource and `export type { FileMeta }` so existing imports keep working.
  - `libraryPersistence.ts`: `summaryFromEntry(entry, source: ReplayFileSource | null)` sets `summary.source`; `importIntoLibrary` uses `source.meta` instead of `fileMeta(file)`; types `File`→`ReplayFileSource`.
  - `replaySource.ts`: rename `loadReplayFromFile(file)` → `loadReplayFromSource(source)` using `source.read()` and `source.name`.
  - `main.ts`: `handleImport(files: ReplayFileSource[])`; `filePicker`/`folderPicker` change handlers call `handleImport([...files].map(fromBrowserFile))`; `loadReplayForSummary` uses `summary.source` / `loadReplayFromSource`.
  - `missingFilePrompt.ts` and `searchView.ts`: `fileRef`→`source`.
  - Tests: `fileRef: null` → `source: null`; `importer.test.ts`/`libraryPersistence.test.ts` wrap `File`s with `fromBrowserFile` (change `demoFiles()` to return `ReplayFileSource[]`, assertions `.source`).
- [ ] **Step 5:** `npm run typecheck && npm run lint && npm test` → all PASS.

---

### Task 2: Lazy attach + rename behaviour tests (planner)

**Files:** modify `src/data/libraryPersistence.test.ts`.

- [ ] **Step 1:** Add tests using sources whose `read` is a `vi.fn` wrapper over real demo bytes:
  1. After an initial import, re-import with same meta → `read` called 0 times, summaries have `source` set (existing "without parsing" test, extended to count `read` calls).
  2. Rename: same bytes, different `sourcePath` and same size/mtime → parsed once; `store.getAll()` length unchanged (no duplicate), entry `sourcePath` updated, summary id unchanged (existing `decideEntry` "touch" path).
- [ ] **Step 2:** Run `npx vitest run src/data/libraryPersistence.test.ts`. Expected PASS (behavior already exists; if the rename test fails, fix the planner rather than the test).

---

### Task 3: Desktop fs adapter, library folder, scan, watcher

**Files:** create `src/desktop/fsAdapter.ts`, `src/desktop/libraryFolder.ts`, `src/desktop/libraryFolder.test.ts`; `npm i @tauri-apps/api @tauri-apps/plugin-fs @tauri-apps/plugin-dialog @tauri-apps/plugin-store` and `npm i -D @tauri-apps/cli`.

**Interfaces — Produces:**

```ts
// fsAdapter.ts
export interface DirEntryInfo {
  name: string;
  isDirectory: boolean;
}
export interface FsAdapter {
  documentDir(): Promise<string>;
  join(...parts: string[]): Promise<string>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  readDir(path: string): Promise<DirEntryInfo[]>;
  stat(path: string): Promise<{ size: number; mtime: number }>;
  readFile(path: string): Promise<Uint8Array>;
  watch(
    root: string,
    cb: (e: {
      kind: "create" | "modify" | "remove" | "other";
      paths: string[];
    }) => void,
  ): Promise<() => void>;
  pickDirectory(): Promise<string | null>;
  getSavedRoot(): Promise<string | null>;
  saveRoot(path: string): Promise<void>;
}
export const tauriFs: FsAdapter; // real implementation
// libraryFolder.ts
export function fromLibraryPath(
  fs: FsAdapter,
  root: string,
  relPath: string,
  stat: { size: number; mtime: number },
): ReplayFileSource;
export type RootState =
  { kind: "ok"; root: string } | { kind: "missing"; root: string };
export function resolveRoot(fs: FsAdapter): Promise<RootState>;
export function scanLibrary(
  fs: FsAdapter,
  root: string,
): Promise<ReplayFileSource[]>;
export interface LibraryWatcherHandlers {
  onSource(source: ReplayFileSource): Promise<void>; // import one stable file; throws on parse failure
  onRemove(sourcePath: string): void;
}
export function startWatcher(
  fs: FsAdapter,
  root: string,
  h: LibraryWatcherHandlers,
  opts?: { stabilityMs?: number },
): Promise<() => void>;
```

`sourcePath` for desktop sources is `relPath` with `/` separators, relative to root. `mtime` is ms epoch.

- [ ] **Step 1: Failing tests** (`libraryFolder.test.ts`, with an in-memory fake `FsAdapter` and `vi.useFakeTimers`):
  - `fromLibraryPath`: meta = `{sourcePath: "sub/a.rmgr", size, lastModified}`, `name "a.rmgr"`, `read()` returns bytes from `fs.readFile(join(root, rel))`.
  - `resolveRoot`: no saved root & default missing → `mkdir` called, `{kind:"ok"}`; saved root that doesn't exist → `{kind:"missing"}`, no `mkdir`; saved existing → ok.
  - `scanLibrary`: recurses, keeps `*.RMGR`/`*.rmgr` case-insensitively, ignores other files, no `readFile` calls.
  - Watcher: create event → `onSource` is NOT called until two stats ~stabilityMs apart report same size (size changes between stats → waits again); 5 modify events for one path within the window → one `onSource`; `remove` → `onRemove(relPath)`; `onSource` rejecting once → retried once after another stability wait; second rejection → error surfaced via `onError`-style rejection logged (add optional `onError(path, err)` handler to `LibraryWatcherHandlers`); non-`.rmgr` events ignored.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.** `tauriFs` uses `@tauri-apps/api/path` (`documentDir`, `join`), `plugin-fs` (`exists`, `mkdir({recursive:true})`, `readDir`, `stat` → `mtime?.getTime()`, `readFile`, `watch(root, cb, {recursive:true, delayMs:1000})` mapping `event.type` (`{create}`/`{modify}`/`{remove}` keys) to `kind`), `plugin-dialog` `open({directory:true})`, `plugin-store` `Store.load("settings.json")` key `libraryRoot`. Watcher keeps `Map<path, Timer>` to coalesce; per-path in-flight set prevents concurrent imports.
- [ ] **Step 4:** `npx vitest run src/desktop` → PASS; `npm run typecheck`.

---

### Task 4: Desktop wiring in `main.ts` + UI

**Files:** create `src/desktop/desktopUi.ts`; modify `main.ts`, `index.html`, `i18n.ts` (en + ja), `missingFilePrompt.ts`.

**Interfaces — Consumes:** Task 3 exports; `importIntoLibrary`, `attachImportedSummaries`, `libraryController`.

- [ ] **Step 1:** In `main.ts` add `const isDesktop = isTauri()` (`@tauri-apps/api/core`). After the persisted library loads in `init()`, if desktop: `const lf = await import("./desktop/libraryFolder.js"); const { tauriFs } = await import("./desktop/fsAdapter.js")` and `startDesktopLibrary()`:
  1. `resolveRoot`; if `missing`, show banner "Library folder not found" + **Change…** and stop.
  2. `scanLibrary` → `handleImport(sources)` (reuses fast path, progress, banners).
  3. `startWatcher` with `onSource: s => handleImport([s])` (needs `handleImport` to throw on parse error for a single file: have it return `{errorCount}` and have the handler throw when `errorCount>0`), `onRemove: path => set matching summary `source = null`(match on`summary.source?.meta.sourcePath === path`) then `libraryController.render()`.
  4. Keep `stopWatcher` handle in module state.
- [ ] **Step 2:** `changeLibraryFolder()`: `pickDirectory()` → null = no-op; `saveRoot`; stop watcher; null every summary's `source`; rescan; new watcher. `rescan()`: re-runs scan (no folder change).
- [ ] **Step 3:** UI (`desktopUi.ts` + `index.html` ids `libraryFolderRow`, `rescanBtn`, `libFolderBanner`, `desktopHint`, all `hidden` by default): on desktop hide `#importContainer`, show `#rescanBtn` and the row "Library folder: `<path>` [Change…]"; first-launch hint (dismiss stored in `localStorage` key `rmgr.desktopHintDismissed`) text: notes, comments and settings from the web version can be brought over with project export/import. Add i18n keys `rescan`, `libraryFolder`, `change`, `libraryFolderNotFound`, `desktopHint`, `notInLibraryTitle`, `notInLibraryBody`.
- [ ] **Step 4:** Missing-file prompt: add `variant: "web" | "desktop"` option. Desktop variant (title/body "Not found in your library folder", buttons **Rescan** and **Cancel**) calls `options.rescan()`; reuse the `onImportFinished` listener to resolve once `summary.source` is set. In `loadReplayForSummary`: `if (summary.source) { try { return await loadReplayFromSource(summary.source) } catch { if (!isDesktop) throw; /* fall through to prompt */ } }`.
- [ ] **Step 5:** `npm run typecheck && npm run lint && npm test && npm run build`; check `dist/assets` initial chunk does not contain `plugin-fs` (grep `dist/index*.js`).

---

### Task 5: `src-tauri` scaffold

**Files:** create `src-tauri/Cargo.toml`, `build.rs`, `tauri.conf.json`, `capabilities/default.json`, `src/main.rs`, `icons/` (via `npx tauri icon public/<existing png/svg>` or a placeholder), `.gitignore` entries `src-tauri/target`, `src-tauri/gen`; modify `package.json` (`"tauri:dev": "tauri dev"`, `"tauri:build": "tauri build"`).

- [ ] **Step 1:** `tauri.conf.json`: `productName "RMGR Viewer"`, `identifier "dev.12cb.rmgr-viewer"`, `version "../package.json"`, `build: { devUrl:"http://localhost:5183", frontendDist:"../dist", beforeDevCommand:"npm run dev", beforeBuildCommand:"npm run build" }`, `app.security.csp` including `frame-src https://www.youtube.com https://www.youtube-nocookie.com`, `bundle.targets "all"`, `bundle.resources` none (demo replays already inside `dist`).
- [ ] **Step 2:** `Cargo.toml` deps: `tauri = "2"`, `tauri-plugin-fs = { version="2", features=["watch"] }`, `tauri-plugin-dialog = "2"`, `tauri-plugin-store = "2"`, `tauri-plugin-persisted-scope = "2"`. `main.rs` registers the four plugins only.
- [ ] **Step 3:** `capabilities/default.json`: permissions `core:default`, `dialog:allow-open`, `store:default`, `fs:allow-read-file`, `fs:allow-stat`, `fs:allow-read-dir`, `fs:allow-exists`, `fs:allow-mkdir`, `fs:allow-watch`, `fs:allow-unwatch`, with fs entries scoped `{"allow":[{"path":"$DOCUMENT/Replays/**"},{"path":"$DOCUMENT/Replays"}]}`.
- [ ] **Step 4:** `cargo check --manifest-path src-tauri/Cargo.toml` → success. (Full `npm run tauri:dev` GUI run is the user's manual smoke test.)

---

### Task 6: CI, release workflow, README

**Files:** modify `.github/workflows/ci.yml`, `README.md`; create `.github/workflows/release.yml`.

- [ ] **Step 1:** `ci.yml`: new job `tauri-check` on `ubuntu-22.04`: checkout both repos, build `rmgr-ts`, install apt deps (`libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`), `dtolnay/rust-toolchain@stable`, `npm ci`, `npm run build` (creates `dist` for `generate_context!`), `cargo check --manifest-path src-tauri/Cargo.toml`.
- [ ] **Step 2:** `release.yml`: `on: push: tags: ["v*"]`; matrix `macos-latest` (args `--target universal-apple-darwin`, rust targets `aarch64-apple-darwin,x86_64-apple-darwin`), `windows-latest`, `ubuntu-22.04`; steps per spec (both checkouts, build rmgr-ts, node 22, rust stable, apt on ubuntu, `npm ci`), then `tauri-apps/tauri-action@v0` with `projectPath: rmgr-viewer`, `releaseDraft: true`, `tagName: ${{ github.ref_name }}`, `GITHUB_TOKEN`. Permissions `contents: write`.
- [ ] **Step 3:** README "Desktop app" section: download from Releases, macOS Gatekeeper (right-click → Open / `xattr -dr com.apple.quarantine`), Windows SmartScreen (More info → Run anyway), default folder `~/Documents/Replays` and changing it, importing web data via project export/import, `npm run tauri:dev` for development.
- [ ] **Step 4:** `npm run format:check` (run `npx prettier --write` on touched files if needed).

---

### Task 7: Manual smoke checklist (user-run, per OS)

1. First launch creates `~/Documents/Replays`; library loads.
2. Record a game in RMG-K into the folder: it appears automatically.
3. Rename a replay in Finder/Explorer: same entry, notes intact, no duplicate.
4. Delete a replay, then open it: desktop prompt; Rescan works.
5. Change the folder: re-scans, new folder watched.
6. Quit/relaunch: custom folder still readable, no prompt.
7. Open a match with a YouTube link: playback works or is labeled unavailable (if not, label video sync unavailable on desktop).

## Self-Review

Spec coverage: runtime switch/Task 4; `ReplayFileSource`/Task 1; lazy attach & rename/Task 2; scan/watch/stability/coalesce/remove/root resolution/Task 3; open-game prompt, folder change, Rescan, hint/Task 4; Tauri scaffold/capabilities/scripts/Task 5; release + ci + README/Task 6; YouTube CSP/Task 5; smoke test/Task 7. Chrome backend, folder management, signing: out of scope per spec.
