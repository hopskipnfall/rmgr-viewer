# Persistent Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist per-game summaries in IndexedDB so the library survives a refresh. The raw `.rmgr` file is only re-requested for playback and search.

**Architecture:** `libraryStore.ts` (IndexedDB CRUD) + `importPlanner.ts` (pure decisions) + `libraryPersistence.ts` (orchestration: load, import, stale). `main.ts` wires them into start-up, import, match loading and search. "Loaded this session" means `summary.fileRef !== null`.

**Tech Stack:** TypeScript, Vite, vitest (Node env), IndexedDB (`fake-indexeddb` in tests).

**Spec:** `docs/superpowers/specs/2026-09-15-persistent-library-design.md`

## Global Constraints

- **No git commits or pushes.** Jonn has said not to commit until he asks. Every "commit" step in this plan is replaced by running the checks.
- Checks: `npm run typecheck && npm run lint && npm test && npm run build`, then `npx prettier --write <touched files>`.
- Every new user-facing string goes in both the EN and JA blocks of `src/i18n.ts`, plus the `Translations` interface.
- Firefox must work. No `showDirectoryPicker`.
- Pooled-stat math stays in `src/data/aggregate.ts`. Don't hand-roll aggregation.
- Don't touch the Data Analyst's `scripts/` files or the PM's `docs/product/`.

### Deviations from the spec (agreed simplifications)

1. **Stale games** are kept out of the library list and all stats. They surface only as a banner ("N games need re-import" + re-import button), not as a per-row badge. This keeps `GameList`/`aggregate.ts` untouched.
2. **Identity and video links stay in localStorage.** Identity starts being saved; video links already are, and their API is synchronous. The manual perspective override is stored on the game's IndexedDB entry. So there is no separate `userData` IndexedDB store.
3. **`gameId`** is the readable combination `g_<recordedAtEpochMillis base36>_<frameCount base36>`, not a hash, so collisions are impossible.
4. **The analysis snapshot** is `public/replays/demo-summaries.json` itself, now stamped with `analysisVersion`.

---

### Task 1: New game ID + analysis version module

**Files:**

- Create: `src/data/analysisVersion.ts`, `src/data/analysisVersion.test.ts`
- Modify: `src/data/gameSummary.ts` — rename `generateGameId` → `legacyGameId` (kept for video-link migration); add `gameIdFor`; `summarizeReplay` uses `gameIdFor`.
- Test: `src/data/gameSummary.test.ts` (add cases; create if absent)

**Produces:**

- `gameIdFor(recordedAtEpochMillis: number, frameCount: number): string`
- `legacyGameId(...)` — same signature as the old `generateGameId`
- `ANALYSIS_VERSION: number` (starts at `1`)
- `isStale(v: { analysisVersion: number; formatVersion: number; recorderSchemaVersion: number }): boolean`
- `KNOWN_BAD_VERSIONS: readonly { formatVersion?: number; recorderSchemaVersion?: number }[]` (starts empty)

- [ ] **Step 1: Failing tests**

```ts
// gameSummary.test.ts
import { describe, expect, it } from "vitest";
import { gameIdFor } from "./gameSummary.js";
describe("gameIdFor", () => {
  it("combines timestamp and frame count", () => {
    expect(gameIdFor(1757000000000, 8420)).toBe(
      `g_${(1757000000000).toString(36)}_${(8420).toString(36)}`,
    );
  });
  it("differs when either input differs", () => {
    expect(gameIdFor(1, 2)).not.toBe(gameIdFor(1, 3));
    expect(gameIdFor(1, 2)).not.toBe(gameIdFor(2, 2));
  });
});
```

```ts
// analysisVersion.test.ts
import { describe, expect, it } from "vitest";
import { ANALYSIS_VERSION, isStale } from "./analysisVersion.js";
const base = {
  analysisVersion: ANALYSIS_VERSION,
  formatVersion: 5,
  recorderSchemaVersion: 1,
};
describe("isStale", () => {
  it("is fresh at the current version", () =>
    expect(isStale(base)).toBe(false));
  it("is stale at an older analysis version", () =>
    expect(isStale({ ...base, analysisVersion: ANALYSIS_VERSION - 1 })).toBe(
      true,
    ));
  it("honours the known-bad list", () =>
    expect(isStale(base, [{ recorderSchemaVersion: 1 }])).toBe(true));
});
```

- [ ] **Step 2: Run `npx vitest run src/data/gameSummary.test.ts src/data/analysisVersion.test.ts`.** Expect FAIL (not exported).

- [ ] **Step 3: Implement**

```ts
// analysisVersion.ts
/**
 * Bump whenever any change alters what summarizeReplay() produces. The
 * demo-summaries snapshot test (demoSummaries.test.ts) fails until you do.
 */
export const ANALYSIS_VERSION = 1;

export interface VersionMatcher {
  formatVersion?: number;
  recorderSchemaVersion?: number;
}
/** Replay encodings later found to be wrong - entries from these are always recomputed. */
export const KNOWN_BAD_VERSIONS: readonly VersionMatcher[] = [];

export function isStale(
  v: {
    analysisVersion: number;
    formatVersion: number;
    recorderSchemaVersion: number;
  },
  knownBad: readonly VersionMatcher[] = KNOWN_BAD_VERSIONS,
): boolean {
  if (v.analysisVersion !== ANALYSIS_VERSION) return true;
  return knownBad.some(
    (m) =>
      (m.formatVersion === undefined || m.formatVersion === v.formatVersion) &&
      (m.recorderSchemaVersion === undefined ||
        m.recorderSchemaVersion === v.recorderSchemaVersion) &&
      (m.formatVersion !== undefined || m.recorderSchemaVersion !== undefined),
  );
}
```

`gameSummary.ts`:

- Rename `generateGameId` → `legacyGameId`.
- Add:
  ```ts
  export function gameIdFor(
    recordedAtEpochMillis: number,
    frameCount: number,
  ): string {
    return `g_${recordedAtEpochMillis.toString(36)}_${frameCount.toString(36)}`;
  }
  ```
- In `summarizeReplay`, set `const id = gameIdFor(replay.header.recordedAtEpochMillis, replay.frames.length);`.
- Update any test that called `generateGameId`.

- [ ] **Step 4: Run the full test suite.** Expect PASS, except demo-summary-dependent tests if any — those are fixed in Task 2.

### Task 2: Stamped demo summaries + snapshot guard

**Files:**

- Modify: `scripts/generateDemoSummaries.ts`, `src/main.ts` (demo loader, ~line 766), `public/replays/demo-summaries.json` (regenerated)
- Create: `src/data/demoSummaries.test.ts`
- Check: `src/data/demoReplayFiles.ts`, `scripts/replacePublicDemoReplays.ts` — both mention the file; update them only if they read its shape.

**Produces:** `demo-summaries.json` shape `{ analysisVersion: number; games: SerializedGameSummary[] }`, typed as `DemoSummariesFile` exported from `gameSummary.ts`.

- [ ] **Step 1: Failing test** `demoSummaries.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseReplay } from "@rmg-k/rmgr";
import {
  serializeGameSummary,
  summarizeReplay,
  type DemoSummariesFile,
} from "./gameSummary.js";
import { ANALYSIS_VERSION } from "./analysisVersion.js";
import { DEMO_REPLAY_FILENAMES } from "./demoReplayFiles.js";

const dir = resolve(__dirname, "../../public/replays");
const file = JSON.parse(
  readFileSync(resolve(dir, "demo-summaries.json"), "utf8"),
) as DemoSummariesFile;

describe("demo-summaries.json snapshot", () => {
  it("is stamped with the current ANALYSIS_VERSION", () => {
    expect(file.analysisVersion, "run npm run generate:demo-summaries").toBe(
      ANALYSIS_VERSION,
    );
  });
  it("matches current analysis output (bump ANALYSIS_VERSION + regenerate if this fails)", async () => {
    const fresh = [];
    for (const name of DEMO_REPLAY_FILENAMES) {
      const bytes = new Uint8Array(readFileSync(resolve(dir, name)));
      const replay = await parseReplay(bytes);
      fresh.push(
        serializeGameSummary(
          summarizeReplay(
            {
              replay,
              sourceName: name,
              recordedAt: new Date(replay.header.recordedAtEpochMillis),
            },
            null,
          ),
        ),
      );
    }
    expect(JSON.parse(JSON.stringify(fresh))).toEqual(file.games);
  }, 120_000);
});
```

- [ ] **Step 2: Run it.** Expect FAIL (the file is still an array).

- [ ] **Step 3: Implement**
- Add to `gameSummary.ts`:
  ```ts
  export interface DemoSummariesFile {
    analysisVersion: number;
    games: SerializedGameSummary[];
  }
  ```
- `generateDemoSummaries.ts`:
  - Read the existing file if it exists (accept the old array shape as `{analysisVersion: 0, games: arr}`).
  - Write `{ analysisVersion: ANALYSIS_VERSION, games: results }`.
  - **Refuse to write** (throw with the message "analysis output changed — bump ANALYSIS_VERSION in src/data/analysisVersion.ts") when `JSON.stringify(old.games) !== JSON.stringify(results)` and `old.analysisVersion === ANALYSIS_VERSION`.
  - The old-array case has version 0, so the first regeneration passes.
- `main.ts` demo loader: `const file = (await response.json()) as DemoSummariesFile; const serialized = file.games;`.
- Run `npm run generate:demo-summaries`.

- [ ] **Step 4: Run the full suite + typecheck.** Expect PASS.

### Task 3: IndexedDB store

**Files:**

- Create: `src/data/libraryStore.ts`, `src/data/libraryStore.test.ts`
- Modify: `package.json` (dev dependency `fake-indexeddb`)

**Produces:**

```ts
export interface StoredGame {
  id: string;
  contentHash: string; // SHA-256 hex of file bytes
  formatVersion: number; // replay.header.version
  recorderSchemaVersion: number;
  analysisVersion: number;
  sourcePath: string; // webkitRelativePath || name
  size: number;
  lastModified: number;
  manualPerspectivePort: PortIndex | null;
  summary: SerializedGameSummary;
}
export interface LibraryStore {
  getAll(): Promise<StoredGame[]>;
  putMany(games: StoredGame[]): Promise<void>;
  delete(id: string): Promise<void>;
}
export function openLibraryStore(
  factory?: IDBFactory,
  dbName?: string,
): Promise<LibraryStore>;
```

- [ ] **Step 1:** `npm install --save-dev fake-indexeddb`

- [ ] **Step 2: Failing test**

```ts
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { openLibraryStore, type StoredGame } from "./libraryStore.js";

function game(id: string, over: Partial<StoredGame> = {}): StoredGame {
  return {
    id,
    contentHash: "h",
    formatVersion: 5,
    recorderSchemaVersion: 1,
    analysisVersion: 1,
    sourcePath: `${id}.rmgr`,
    size: 1,
    lastModified: 1,
    manualPerspectivePort: null,
    summary: {
      id,
      sourceName: `${id}.rmgr`,
      recordedAt: "2026-01-01T00:00:00.000Z",
      stageId: 0,
      frameCount: 1,
      isComplete: true,
      ports: [],
      statsByPort: {},
    },
    ...over,
  };
}

describe("libraryStore", () => {
  it("round-trips, overwrites by id, and deletes", async () => {
    const store = await openLibraryStore(new IDBFactory());
    await store.putMany([game("a"), game("b")]);
    await store.putMany([game("a", { contentHash: "h2" })]);
    await store.delete("b");
    const all = await store.getAll();
    expect(all.map((g) => [g.id, g.contentHash])).toEqual([["a", "h2"]]);
  });
  it("persists across reopen of the same factory", async () => {
    const f = new IDBFactory();
    await (await openLibraryStore(f)).putMany([game("a")]);
    expect((await (await openLibraryStore(f)).getAll()).length).toBe(1);
  });
});
```

- [ ] **Step 3: Run it.** Expect FAIL (module missing).

- [ ] **Step 4: Implement** — hand-rolled wrapper, no runtime dependency:

```ts
const DB_NAME = "rmgr-viewer";
const DB_VERSION = 1;
const GAMES = "games";

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function done(tx: IDBTransaction): Promise<void> {
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  });
}

export async function openLibraryStore(
  factory: IDBFactory = indexedDB,
  dbName = DB_NAME,
): Promise<LibraryStore> {
  const open = factory.open(dbName, DB_VERSION);
  open.onupgradeneeded = () => {
    if (!open.result.objectStoreNames.contains(GAMES))
      open.result.createObjectStore(GAMES, { keyPath: "id" });
  };
  const db = await req(open);
  return {
    getAll: () =>
      req(
        db.transaction(GAMES).objectStore(GAMES).getAll() as IDBRequest<
          StoredGame[]
        >,
      ),
    async putMany(games) {
      const tx = db.transaction(GAMES, "readwrite");
      for (const g of games) tx.objectStore(GAMES).put(g);
      await done(tx);
    },
    async delete(id) {
      const tx = db.transaction(GAMES, "readwrite");
      tx.objectStore(GAMES).delete(id);
      await done(tx);
    },
  };
}
```

- [ ] **Step 5: Run the tests.** Expect PASS.

### Task 4: Import planner (pure decisions)

**Files:** Create `src/data/importPlanner.ts`, `src/data/importPlanner.test.ts`

**Consumes:** `StoredGame`, `isStale`.

**Produces:**

```ts
export interface FileMeta {
  sourcePath: string;
  size: number;
  lastModified: number;
}
/** A fresh stored entry whose path/size/mtime match, or null (meaning: must parse). */
export function findFastPathMatch(
  meta: FileMeta,
  byPath: ReadonlyMap<string, StoredGame>,
): StoredGame | null;
export type EntryDecision = "add" | "touch" | "replace";
export function decideEntry(
  existing: StoredGame | undefined,
  parsed: { contentHash: string },
): EntryDecision;
/** Among parsed files sharing an id, the one to keep: newest (formatVersion, recorderSchemaVersion). */
export function pickPreferred<
  T extends { formatVersion: number; recorderSchemaVersion: number },
>(a: T, b: T): T;
```

**Rules:**

- `findFastPathMatch` returns the entry only if path, size and lastModified all match **and** `!isStale(entry)`.
- `decideEntry`:
  - `undefined` → `"add"`
  - stale → `"replace"`
  - same hash → `"touch"`
  - otherwise → `"replace"`
- `pickPreferred` keeps `a` on a tie.

- [ ] **Step 1: Failing tests** — one `it` per rule:
  - fast path hit
  - miss on size
  - miss on mtime
  - miss when stale (`analysisVersion: 0`)
  - `decideEntry` add / touch / replace-on-hash / replace-on-stale
  - `pickPreferred` by formatVersion, then recorderSchemaVersion, then tie keeps `a`

  Use the `game()` helper from Task 3's test, copied into this file.

- [ ] **Step 2: Run.** Expect FAIL. **Step 3:** Implement per the rules above. **Step 4:** Run. Expect PASS.

### Task 5: Importer returns stored-entry metadata

**Files:** Modify `src/data/importer.ts`; test `src/data/importer.test.ts` (create).

**Produces:**

```ts
export interface ImportedGame {
  summary: GameSummary; // fileRef = the File
  contentHash: string;
  formatVersion: number;
  recorderSchemaVersion: number;
  meta: FileMeta;
}
export interface ImportResult {
  games: ImportedGame[];
  errors: ImportError[];
}
export function fileMeta(file: File): FileMeta; // webkitRelativePath || name
export async function sha256Hex(bytes: Uint8Array): Promise<string>; // crypto.subtle
```

`importReplayFiles(files, onProgress)` keeps its signature and its progress/yield behaviour, but returns `ImportedGame[]`. The only existing caller, `main.ts`'s `handleImport`, is rewritten in Task 7.

- [ ] **Step 1: Failing test:** build a `File` from `public/replays/<DEMO_REPLAY_FILENAMES[0]>` (Node 26 has a global `File`) and import it. Assert:
  - the summary id is `gameIdFor(...)`
  - `contentHash` is 64 hex chars and equals `sha256Hex(bytes)`
  - `formatVersion === replay.header.version`
  - `meta.sourcePath === name`
  - a garbage file lands in `errors`
- [ ] **Step 2: Run.** Expect FAIL. **Step 3:** Implement. **Step 4:** Run. Expect PASS.

### Task 6: Persistence orchestration

**Files:** Create `src/data/libraryPersistence.ts`, `src/data/libraryPersistence.test.ts`

**Consumes:** Tasks 1, 3, 4 and 5.

**Produces:**

```ts
export interface LoadedLibrary {
  summaries: GameSummary[];
  staleEntries: StoredGame[];
}
/** Fresh entries -> GameSummary (fileRef null, manualPerspectivePort restored); stale ones set aside. */
export async function loadPersistedLibrary(
  store: LibraryStore,
): Promise<LoadedLibrary>;

export interface PersistImportResult {
  summaries: GameSummary[]; // every game now attached this session (fileRef set)
  staleEntries: StoredGame[]; // still stale after this import
  errors: ImportError[];
  duplicateCount: number; // parsed files dropped by pickPreferred
  newIds: { id: string; legacyId: string }[]; // added entries, for video-link migration
}
export async function importIntoLibrary(
  store: LibraryStore,
  files: File[],
  onProgress?: (p: ImportProgress) => void,
): Promise<PersistImportResult>;

export async function setManualPerspective(
  store: LibraryStore,
  id: string,
  port: PortIndex | null,
): Promise<void>;
```

**`importIntoLibrary` algorithm:**

1. `all = await store.getAll()`; `byPath` = map sourcePath → entry; `byId` = map id → entry.
2. For each `.rmgr` file: if `findFastPathMatch` hits, attach the summary (`deserializeGameSummary(entry.summary)`, `fileRef = file`, restore `manualPerspectivePort`). Otherwise queue the file for parsing.
3. Parse the queued files with `importReplayFiles` (progress passes through). Group by id and fold with `pickPreferred`, counting dropped files into `duplicateCount`.
4. For each kept parsed game, `decideEntry(byId.get(id), game)`:
   - **add / replace:** write a full `StoredGame` (`analysisVersion: ANALYSIS_VERSION`; keep the existing `manualPerspectivePort` on replace).
   - **touch:** write the existing entry with the new `sourcePath/size/lastModified`.
   - **add only:** also push `{id, legacyId}`, where `legacyId = legacyGameId(meta.sourcePath basename, recordedAtEpochMillis, stageId, frameCount, ports)`, computed exactly as the old `summarizeReplay` did.
5. One `putMany` for all writes. `staleEntries` = the entries from step 1 that are stale and whose id was not written in step 4.

- [ ] **Step 1: Failing tests** (fake-indexeddb, demo replay `File`s):
  - First import adds N entries. `loadPersistedLibrary` then returns N summaries with `fileRef === null`.
  - Re-import of the same `File`s: every one takes the fast path. Assert with `vi.spyOn(importerModule, "importReplayFiles")` receiving 0 files.
  - Stored `analysisVersion: 0` → excluded from `loadPersistedLibrary` and listed in `staleEntries`. Re-import replaces it and clears the stale list.
  - The same bytes under a different `File` name → `touch`: `sourcePath` updates, no new entry.
  - `setManualPerspective` persists, and `loadPersistedLibrary` restores it.
- [ ] **Step 2: Run.** Expect FAIL. **Step 3:** Implement. **Step 4:** Run. Expect PASS.

### Task 7: Wire start-up, import, and remove into the app

**Files:** Modify `src/main.ts`, `src/library/libraryView.ts`, `src/data/identity.ts`, `src/video/youtubeSync.ts` (add `migrateVideoLink`), `src/i18n.ts`, `index.html`

**Changes:**

- **`identity.ts`:**
  - `loadIdentity()` reads `localStorage[STORAGE_KEY]` as `{displayName, aliases: string[]}`, falling back to the default. Remove the `removeItem`.
  - `saveIdentity(identity: Identity)` writes it. Keep the try/catch style.
  - Add tests next to the existing identity tests, using the mock-storage pattern from `session.test.ts`.
- **`libraryView.ts`:**
  - Constructor gains `onPersistChange: { identity(i: Identity): void; perspective(id: string, port: PortIndex | null): void; remove(id: string): void }`.
  - Call `identity()` after every identity mutation, **except in demo mode**: in `setIdentity`, `selectPlayerPerspective`, and the `identityPanel` `onIdentityChanged` callback (identityPanel.ts:186).
  - Call `perspective()` in the manual-override branch of `selectPlayerPerspective`.
  - Call `remove()` in `removeSummary`.
- **`youtubeSync.ts`:** `migrateVideoLink(fromId, toId)` moves a link if `from` exists and `to` doesn't. Add a test in `youtubeSync.test.ts`.
- **`main.ts`:**
  - `let libraryStore: LibraryStore | null` opened in `init()` (catch → `null`, so the app still works without persistence).
  - `let staleEntries: StoredGame[] = []`.
  - **Start-up**, before demo seeding: `loadPersistedLibrary`. If it returns any summaries or stale entries, `libraryController.addSummaries(summaries)`, skip demo seeding, and render the stale banner.
  - **`handleImport`**:
    1. Call `importIntoLibrary(libraryStore, [...files], progress)`.
    2. Update each existing summary with the same id by setting its `fileRef`, then call `libraryController.addSummaries` for the rest.
    3. `migrateVideoLink(legacyId, id)` for each of `newIds`.
    4. Update `staleEntries` and the banner.
    5. Status line: errors (existing text) + `tr.importDuplicatesSkipped(n)` when `duplicateCount > 0`.
    6. If the store is `null`, fall back to today's `importReplayFiles` path.
- **Stale banner:** `#staleBanner` in `index.html` inside the library view, above the list. Text `tr.staleBanner(n)` plus a button `tr.reimportFolder` that clicks `folderPicker`. Hidden when `n === 0`.
- **i18n (EN/JA):**
  - `staleBanner(n)`: "N games were analyzed with an older version and need re-import." / "N件のゲームは古いバージョンで解析されています。再インポートしてください。"
  - `reimportFolder`: "Re-import folder" / "フォルダを再インポート"
  - `importDuplicatesSkipped(n)`: "Skipped N duplicate copies of the same game." / "同じゲームの重複 N 件をスキップしました。"

- [ ] **Step 1:** Identity and `migrateVideoLink` tests first (fail → implement → pass).
- [ ] **Step 2:** Wire `libraryView.ts`, `main.ts`, `index.html` and `i18n.ts`.
- [ ] **Step 3:** Run the checks.

### Task 8: Missing-file prompt (open game / playlist) and search gating

**Files:** Create `src/library/missingFilePrompt.ts`. Modify `src/main.ts`, `src/search/searchView.ts`, `src/i18n.ts`, `index.html` (CSS).

**Produces:**

```ts
/** Resolves true once summary.fileRef is set (user imported a matching file or folder), false if dismissed. */
export function promptForMissingFile(
  modalContainer: HTMLElement,
  summary: GameSummary,
  importFiles: (files: File[]) => Promise<void>,
  pickFolder: () => Promise<File[]>,
  pickFile: () => Promise<File[]>,
): Promise<boolean>;
```

**Changes:**

- **`main.ts`:**
  - `loadReplayForSummary`: if `!summary.fileRef && !summary.url`, `await promptForMissingFile(...)`. If it returns false, throw `new Error(tr.missingFileCancelled)`. The old `DEMO_REPLAY_URLS[0]` fallback is removed.
  - `pickFile` / `pickFolder` wrap the existing `filePicker` / `folderPicker` inputs in a promise that resolves on `change`.
  - After `importFiles`, the prompt checks `summary.fileRef`. The id is stable, so `handleImport` sets `fileRef` on the same object. If it's still null, show `tr.missingFileNoMatch(sourceName)` and stay open.
- **Playlists:** the playlist loader (main.ts ~537) goes through `loadReplayForSummary`, so it gets the prompt for free.
- **`searchView.ts`:**
  - Constructor gains `onReimportFolder: () => void`.
  - In `runSearch`, split candidates into loaded (`fileRef || url`) and unloaded. Search only the loaded ones, and store `this.unloadedCount`.
  - `renderResultsList` appends, when `unloadedCount > 0`, `tr.searchUnloadedGames(n)` and a `tr.reimportFolder` button wired to `onReimportFolder`.
  - `main.ts` passes `() => folderPicker.click()`. After an import while on the search route, re-run the route so the search refreshes.
- **i18n (EN/JA):**
  - `missingFileTitle`: "Replay not loaded" / "リプレイが読み込まれていません"
  - `missingFileBody(path)`: "This replay isn't loaded in this session: {path}" / "このリプレイは現在のセッションで読み込まれていません：{path}"
  - `importThisFile`: "Import this file" / "このファイルをインポート"
  - `missingFileNoMatch(path)`: "That file isn't {path}. Choose the matching replay." / "{path} ではありません。対応するリプレイを選んでください。"
  - `missingFileCancelled`: "Replay not loaded." / "リプレイが読み込まれていません。"
  - `searchUnloadedGames(n)`: "N games aren't loaded this session and were not searched." / "N件のゲームは読み込まれていないため検索されませんでした。"

- [ ] **Step 1:** Implement. Unit-test `searchView`'s loaded/unloaded split if the class allows construction without the DOM; otherwise cover it in the browser check.
- [ ] **Step 2:** Run the checks.

### Task 9: Browser verification (Firefox + Chrome flows)

Using the Vite dev server in the Browser pane, verify and screenshot each step:

1. Import a folder of the `nue replays` corpus.
2. Refresh → the library appears with no import.
3. Open a game → prompt → "Import this file" → it plays.
4. Re-import the folder → fast (no parsing), and the game opens directly.
5. Search with nothing loaded → the unloaded notice and button appear.
6. Temporarily set `ANALYSIS_VERSION = 2` → the banner shows the count and the games vanish from the list → re-import → the banner clears. **Then revert to 1.**
7. Pick a perspective / identity → refresh → it's kept.
8. Remove a game → refresh → it stays removed.

Firefox itself can't be driven from here. The Browser pane is Chromium, so the plan relies on the fact that nothing uses Chromium-only APIs. Jonn should do a quick Firefox pass.

- [ ] Run the full check suite, then `npx prettier --write` on the touched files. Report the results. **No commit.**
