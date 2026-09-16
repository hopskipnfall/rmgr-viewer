# Session Page, Project Export, and Search UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global Search link, project export/import, a per-session page, session prev/next in the match sidebar, and search result caching with a progress bar.

**Architecture:** Five mostly independent slices over the existing vanilla-TS SPA. New pure modules (`searchCache.ts`, `sessionNavigation.ts`, `projectFile.ts`) hold logic and are unit-tested in isolation; view controllers stay thin wiring layers. The session page reuses the library's existing aggregation functions, which requires first extracting the library's stat-panel rendering into a shared module.

**Tech Stack:** TypeScript, Vite, vanilla DOM (no framework), vitest (Node environment), IndexedDB + localStorage, `@rmg-k/rmgr` (aliased to `../rmgr-ts/src`).

**Spec:** `docs/superpowers/specs/2026-09-16-session-page-and-search-ux-design.md`

## Global Constraints

- **No commits and no `gh` commands** until Jonn says so. Every task ends by running checks and leaving the work in the tree.
- Every new user-facing string needs an entry in all three places in `src/i18n.ts`: the `Translations` interface, the `en` object, and the `ja` object.
- Reuse existing code rather than reimplementing: `aggregate.ts` for stats, `session.ts` for grouping, `searchHash()` for search URLs, `libraryStore.ts` for persistence.
- Prettier only files you touched: `npx prettier --write <paths>`.
- Do not modify `docs/product/` (PM's) or `scripts/corpusSurvey.ts`, `scripts/percentBracketAndRuleTrend.ts`, `scripts/percentCrossTab.ts`, `scripts/skillMetricsAnalysis.ts` (Data Analyst's; the last has 2 known lint errors).
- Full check command, run at the end of every task: `npx tsc --noEmit && npx vitest run && npm run build`
- Vitest runs in the Node environment: no real DOM. Tests use the mock-container pattern from `src/library/gameList.test.ts` or test pure functions directly.
- Jonn does all manual browser testing.

---

## File Structure

**Create:**

- `src/search/searchCache.ts` — LRU cache of search results, keyed by criteria + game set + analysis version.
- `src/search/searchCache.test.ts`
- `src/data/sessionNavigation.ts` — previous/next game within a session.
- `src/data/sessionNavigation.test.ts`
- `src/data/projectFile.ts` — export/import of the project JSON.
- `src/data/projectFile.test.ts`
- `src/stats/statsPanels.ts` — stat cards + breakdown rendering, shared by library and session pages.
- `src/session/sessionView.ts` — the session page controller.
- `src/session/sessionView.test.ts`

**Modify:**

- `src/router.ts` — add the `session` route.
- `index.html` — header nav, session view container, search progress bar, library export/import buttons.
- `src/main.ts` — route dispatch and controller wiring for the session view.
- `src/i18n.ts` — new keys (EN + JA).
- `src/search/searchView.ts` — cache + progress reporting.
- `src/library/libraryView.ts` — use `statsPanels.ts`; export/import buttons; link to session pages.
- `src/match/matchView.ts` — session prev/next control.

---

### Task 1: Global header nav with a Search link

**Files:**

- Modify: `index.html` (header block, around line 5904)
- Modify: `src/i18n.ts`
- Modify: `src/main.ts` (wiring, near the other header control listeners)

**Interfaces:**

- Consumes: `searchHash()` from `src/router.ts` (existing).
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Add the i18n keys**

In `src/i18n.ts`, add to the `Translations` interface (near `themeToggleDark`):

```ts
navLibrary: string;
navSearch: string;
```

In the `en` object:

```ts
  navLibrary: "Library",
  navSearch: "Search",
```

In the `ja` object:

```ts
  navLibrary: "ライブラリ",
  navSearch: "検索",
```

- [ ] **Step 2: Add the nav markup**

In `index.html`, inside `<div class="header-controls">` and BEFORE the `theme-select-wrap` div, insert:

```html
<nav class="header-nav">
  <a id="navLibraryLink" class="header-nav-link" href="#/">Library</a>
  <a id="navSearchLink" class="header-nav-link" href="#/search">Search</a>
</nav>
```

- [ ] **Step 3: Style the nav**

In `index.html`'s `<style>` block, next to the existing `.header-controls` rule:

```css
.header-nav {
  display: flex;
  gap: 4px;
}
.header-nav-link {
  padding: 4px 10px;
  border-radius: 6px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 13px;
}
.header-nav-link:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
.header-nav-link[aria-current="page"] {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
```

(If those exact CSS variable names don't exist, copy the ones used by the adjacent `.header-select` rule.)

- [ ] **Step 4: Localize the labels and mark the current route**

In `src/main.ts`, find where other header controls get their text on language change (search for `langSelect` and the function that applies `t()` to header elements) and add, in that same function:

```ts
const navLibraryLink = document.getElementById("navLibraryLink");
const navSearchLink = document.getElementById("navSearchLink");
if (navLibraryLink) navLibraryLink.textContent = t().navLibrary;
if (navSearchLink) navSearchLink.textContent = t().navSearch;
```

In `handleRouteChange` (line ~560), at the top of the function after `const myRouteGeneration = ++routeGeneration;`:

```ts
// Highlight whichever nav entry matches the route being shown.
document
  .getElementById("navLibraryLink")
  ?.toggleAttribute("aria-current", route.view === "library");
document
  .getElementById("navSearchLink")
  ?.toggleAttribute("aria-current", route.view === "search");
```

Note `toggleAttribute` sets the value to the empty string; the CSS above matches `[aria-current="page"]`, so instead set it explicitly:

```ts
const setCurrent = (id: string, current: boolean): void => {
  const el = document.getElementById(id);
  if (!el) return;
  if (current) el.setAttribute("aria-current", "page");
  else el.removeAttribute("aria-current");
};
setCurrent("navLibraryLink", route.view === "library");
setCurrent("navSearchLink", route.view === "search");
```

Use only this second version.

- [ ] **Step 5: Run the full checks**

Run: `npx prettier --write index.html src/main.ts src/i18n.ts && npx tsc --noEmit && npx vitest run && npm run build`
Expected: typecheck clean, all tests pass, build succeeds.

- [ ] **Step 6: Leave the work uncommitted**

Do not commit. Report: "Task 1 done: header nav with Library/Search links, EN+JA."

---

### Task 2: Search result cache

**Files:**

- Create: `src/search/searchCache.ts`
- Create: `src/search/searchCache.test.ts`
- Modify: `src/search/searchView.ts` (`runSearch`, around line 396)

**Interfaces:**

- Consumes: `SearchRouteCriteria` (`src/router.ts`), `PlaylistClip` (`src/playlist.ts`), `ANALYSIS_VERSION` (`src/data/analysisVersion.ts`).
- Produces: `SearchCache` class with `get(key)`, `set(key, value)`, `clear()`, and `searchCacheKey(criteria, gameIds)`; a module-level `searchCache` singleton.

- [ ] **Step 1: Write the failing test**

Create `src/search/searchCache.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SearchCache, searchCacheKey } from "./searchCache.js";
import type { SearchRouteCriteria } from "../router.js";
import type { PlaylistClip } from "../playlist.js";

const criteria: SearchRouteCriteria = {
  type: "edgeGuards",
  result: "failure",
  sessionId: null,
  playerName: null,
  playerCharacterId: null,
  opponentCharacterId: null,
  jumpCount: null,
  startingAreaBox: null,
  victimName: null,
  minHits: null,
  killed: null,
  allowGaps: false,
};

const value = (n: number) => ({
  results: Array.from(
    { length: n },
    (_, i) => ({ id: i }) as unknown as PlaylistClip,
  ),
  unloadedCount: 0,
});

describe("searchCacheKey", () => {
  it("is stable regardless of game id order", () => {
    expect(searchCacheKey(criteria, ["b", "a"])).toBe(
      searchCacheKey(criteria, ["a", "b"]),
    );
  });

  it("differs when criteria differ", () => {
    expect(searchCacheKey(criteria, ["a"])).not.toBe(
      searchCacheKey({ ...criteria, result: "success" }, ["a"]),
    );
  });

  it("differs when the searched game set differs", () => {
    expect(searchCacheKey(criteria, ["a"])).not.toBe(
      searchCacheKey(criteria, ["a", "b"]),
    );
  });
});

describe("SearchCache", () => {
  it("returns a stored entry", () => {
    const cache = new SearchCache(3);
    cache.set("k", value(2));
    expect(cache.get("k")?.results).toHaveLength(2);
  });

  it("returns undefined for an unknown key", () => {
    expect(new SearchCache(3).get("nope")).toBeUndefined();
  });

  it("evicts the least recently used entry past its limit", () => {
    const cache = new SearchCache(2);
    cache.set("a", value(1));
    cache.set("b", value(1));
    cache.get("a"); // "a" is now the most recently used
    cache.set("c", value(1));
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBeDefined();
    expect(cache.get("c")).toBeDefined();
  });

  it("clear() empties the cache", () => {
    const cache = new SearchCache(2);
    cache.set("a", value(1));
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/search/searchCache.test.ts`
Expected: FAIL — cannot resolve `./searchCache.js`.

- [ ] **Step 3: Write the implementation**

Create `src/search/searchCache.ts`:

```ts
import { ANALYSIS_VERSION } from "../data/analysisVersion.js";
import type { PlaylistClip } from "../playlist.js";
import type { SearchRouteCriteria } from "../router.js";

/** What one completed search produced. */
export interface CachedSearch {
  readonly results: PlaylistClip[];
  readonly unloadedCount: number;
}

/**
 * Cache key for one search: its criteria, the exact games searched, and the
 * analysis version. Including the game ids means an entry can't outlive a
 * library change that adds or removes games, and including the analysis
 * version means re-analyzed detection never returns a stale result list.
 */
export function searchCacheKey(
  criteria: SearchRouteCriteria,
  gameIds: readonly string[],
): string {
  return JSON.stringify({
    v: ANALYSIS_VERSION,
    c: criteria,
    g: [...gameIds].sort(),
  });
}

/**
 * Least-recently-used cache, in memory only - a page refresh loses the replay
 * data these results were computed from anyway, so there's nothing to persist.
 */
export class SearchCache {
  private readonly entries = new Map<string, CachedSearch>();

  constructor(private readonly limit: number) {}

  public get(key: string): CachedSearch | undefined {
    const hit = this.entries.get(key);
    if (hit === undefined) return undefined;
    // Re-insert so this entry counts as most recently used.
    this.entries.delete(key);
    this.entries.set(key, hit);
    return hit;
  }

  public set(key: string, value: CachedSearch): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    while (this.entries.size > this.limit) {
      const oldest = this.entries.keys().next();
      if (oldest.done === true) break;
      this.entries.delete(oldest.value);
    }
  }

  public clear(): void {
    this.entries.clear();
  }
}

/** Shared by every search; cleared whenever the library changes. */
export const searchCache = new SearchCache(10);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/search/searchCache.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Use the cache in runSearch**

In `src/search/searchView.ts`, add to the imports:

```ts
import { searchCache, searchCacheKey } from "./searchCache.js";
```

In `runSearch`, after `const games = candidates.filter(isLoaded);` and the `this.unloadedCount = ...` line, insert:

```ts
const cacheKey = searchCacheKey(
  this.criteria,
  games.map((g) => g.id),
);
const cached = searchCache.get(cacheKey);
if (cached) {
  this.results = [...cached.results];
  this.unloadedCount = cached.unloadedCount;
  this.searching = false;
  this.renderResultsList();
  return;
}
```

At the end of `runSearch`, replace:

```ts
if (token !== this.searchToken) return;
this.results = results;
```

with:

```ts
if (token !== this.searchToken) return; // superseded: don't cache a partial run
searchCache.set(cacheKey, { results, unloadedCount: this.unloadedCount });
this.results = results;
```

- [ ] **Step 6: Clear the cache when the library changes**

In `src/data/clearLocalData.ts`, add the import and call `searchCache.clear()` inside `clearLocalData` before it returns:

```ts
import { searchCache } from "../search/searchCache.js";
```

```ts
searchCache.clear();
```

In `src/data/libraryPersistence.ts`, inside `importIntoLibrary`, after the writes are persisted and before returning its result:

```ts
searchCache.clear();
```

with the matching import:

```ts
import { searchCache } from "../search/searchCache.js";
```

- [ ] **Step 7: Run the full checks**

Run: `npx prettier --write src/search/searchCache.ts src/search/searchCache.test.ts src/search/searchView.ts src/data/clearLocalData.ts src/data/libraryPersistence.ts && npx tsc --noEmit && npx vitest run && npm run build`
Expected: typecheck clean, all tests pass (including the existing `clearLocalData` and `libraryPersistence` suites), build succeeds.

- [ ] **Step 8: Leave the work uncommitted**

Do not commit. Report: "Task 2 done: search cache with LRU eviction, cleared on library change."

---

### Task 3: Search progress bar

**Files:**

- Modify: `src/search/searchView.ts` (`runSearch` and `renderResultsList`)
- Modify: `src/i18n.ts`
- Modify: `index.html` (CSS only)

**Interfaces:**

- Consumes: Task 2's cache (a cached hit must render with no progress bar).
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Add the i18n keys**

`Translations` interface (next to `searchInProgress`):

```ts
searchProgress: (done: number, total: number) => string;
```

`en`:

```ts
  searchProgress: (done, total) => `Searching… ${done} / ${total} games`,
```

`ja`:

```ts
  searchProgress: (done, total) => `検索中… ${done} / ${total} 試合`,
```

- [ ] **Step 2: Track progress state**

In `SearchViewController`, next to `private searching = false;`:

```ts
  /** Games searched so far / to search, for the progress bar. */
  private progress: { done: number; total: number } = { done: 0, total: 0 };
```

- [ ] **Step 3: Report progress from the search loop**

In `runSearch`, immediately before `for (const summary of games) {`:

```ts
this.progress = { done: 0, total: games.length };
this.renderResultsList();
```

At the very end of the `for` loop body (after the `try`/`catch` block closes, still inside the loop):

```ts
this.progress = { done: this.progress.done + 1, total: games.length };
this.renderResultsList();
```

- [ ] **Step 4: Render the bar**

In `renderResultsList`, replace this existing block:

```ts
if (this.searching) {
  statusEl.textContent = tr.searchInProgress;
  listEl.innerHTML = "";
  return;
}
```

with:

```ts
if (this.searching) {
  const { done, total } = this.progress;
  statusEl.textContent =
    total > 0 ? tr.searchProgress(done, total) : tr.searchInProgress;
  listEl.innerHTML =
    total > 0
      ? `<div class="search-progress"><div class="search-progress-bar" style="width:${Math.round(
          (done / total) * 100,
        )}%"></div></div>`
      : "";
  return;
}
```

- [ ] **Step 5: Style the bar**

In `index.html`'s `<style>` block, next to the other `.search-*` rules:

```css
.search-progress {
  height: 6px;
  border-radius: 3px;
  background: var(--bg-tertiary);
  overflow: hidden;
  margin: 8px 0;
}
.search-progress-bar {
  height: 100%;
  background: var(--accent);
  transition: width 120ms linear;
}
```

(If `--accent` doesn't exist, use whichever accent variable the existing buttons use.)

- [ ] **Step 6: Run the full checks**

Run: `npx prettier --write src/search/searchView.ts src/i18n.ts index.html && npx tsc --noEmit && npx vitest run && npm run build`
Expected: all green.

- [ ] **Step 7: Leave the work uncommitted**

Do not commit. Report: "Task 3 done: search progress bar, EN+JA."

---

### Task 4: Session prev/next in the match sidebar

**Files:**

- Create: `src/data/sessionNavigation.ts`
- Create: `src/data/sessionNavigation.test.ts`
- Modify: `index.html` (sidebar markup near the 12CB widget)
- Modify: `src/match/matchView.ts` (around the `twelveCbPrevMatchBtn` wiring, line ~3943)
- Modify: `src/i18n.ts`

**Interfaces:**

- Consumes: `groupGamesIntoSessions` (`src/data/session.ts`), `GameSummary`, `Identity`.
- Produces: `sessionNeighbors(gameId, summaries, identity): SessionNeighbors | null` where `SessionNeighbors = { sessionId: string; index: number; total: number; previousGameId: string | null; nextGameId: string | null }`.

- [ ] **Step 1: Write the failing test**

Create `src/data/sessionNavigation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sessionNeighbors } from "./sessionNavigation.js";
import { createDefaultIdentity } from "./identity.js";
import type { GameSummary } from "./gameSummary.js";
import { DREAM_LAND_STAGE_ID } from "../stageGeometry.js";

function game(id: string, minutesFromStart: number): GameSummary {
  return {
    id,
    sourceName: `${id}.rmgr`,
    recordedAt: new Date(Date.UTC(2026, 8, 16, 12, minutesFromStart)),
    stageId: DREAM_LAND_STAGE_ID,
    frameCount: 3600,
    isComplete: true,
    fileRef: null,
    ports: [
      { port: 0, playerName: "Jonn", characterId: 0x09, finalStocks: 3 },
      { port: 1, playerName: "Nue", characterId: 0x05, finalStocks: 0 },
    ],
    statsByPort: {},
  } as unknown as GameSummary;
}

const identity = {
  ...createDefaultIdentity(),
  aliases: new Set(["Jonn"]),
};

describe("sessionNeighbors", () => {
  const summaries = [game("a", 0), game("b", 10), game("c", 20)];

  it("gives the middle game both neighbors", () => {
    const nav = sessionNeighbors("b", summaries, identity);
    expect(nav?.previousGameId).toBe("a");
    expect(nav?.nextGameId).toBe("c");
    expect(nav?.index).toBe(1);
    expect(nav?.total).toBe(3);
  });

  it("gives the first game no previous", () => {
    const nav = sessionNeighbors("a", summaries, identity);
    expect(nav?.previousGameId).toBeNull();
    expect(nav?.nextGameId).toBe("b");
  });

  it("gives the last game no next", () => {
    const nav = sessionNeighbors("c", summaries, identity);
    expect(nav?.previousGameId).toBe("b");
    expect(nav?.nextGameId).toBeNull();
  });

  it("returns null for a game that isn't in the library", () => {
    expect(sessionNeighbors("missing", summaries, identity)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/sessionNavigation.test.ts`
Expected: FAIL — cannot resolve `./sessionNavigation.js`.

- [ ] **Step 3: Write the implementation**

Create `src/data/sessionNavigation.ts`:

```ts
import type { GameSummary } from "./gameSummary.js";
import type { Identity } from "./identity.js";
import { groupGamesIntoSessions } from "./session.js";

/** Where one game sits within its play session, and what's on either side. */
export interface SessionNeighbors {
  readonly sessionId: string;
  /** 0-based position within the session. */
  readonly index: number;
  readonly total: number;
  readonly previousGameId: string | null;
  readonly nextGameId: string | null;
}

/**
 * The session-order neighbors of `gameId`, or null when it isn't in any
 * session (not in the library at all). Mirrors compute12CbMatchState()'s
 * contract so the match sidebar wires both the same way.
 */
export function sessionNeighbors(
  gameId: string,
  summaries: readonly GameSummary[],
  identity: Identity,
): SessionNeighbors | null {
  for (const session of groupGamesIntoSessions([...summaries], identity)) {
    const index = session.games.findIndex((g) => g.id === gameId);
    if (index === -1) continue;
    return {
      sessionId: session.id,
      index,
      total: session.games.length,
      previousGameId: session.games[index - 1]?.id ?? null,
      nextGameId: session.games[index + 1]?.id ?? null,
    };
  }
  return null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/data/sessionNavigation.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Add the i18n keys**

`Translations` interface:

```ts
sessionGameCounter: (index: number, total: number) => string;
previousGame: string;
nextGame: string;
```

`en`:

```ts
  sessionGameCounter: (index, total) => `Game ${index} of ${total}`,
  previousGame: "Previous game",
  nextGame: "Next game",
```

`ja`:

```ts
  sessionGameCounter: (index, total) => `${total} 試合中 ${index} 試合目`,
  previousGame: "前の試合",
  nextGame: "次の試合",
```

- [ ] **Step 6: Add the sidebar markup**

In `index.html`, immediately before the 12-character-battle widget element in the match sidebar (search for `twelveCbMatchWidget`), insert:

```html
<div id="sessionNavWidget" class="session-nav-widget" hidden>
  <button id="sessionPrevGameBtn" class="btn-secondary session-nav-btn">
    ◀
  </button>
  <a id="sessionNavLabel" class="session-nav-label" href="#/"></a>
  <button id="sessionNextGameBtn" class="btn-secondary session-nav-btn">
    ▶
  </button>
</div>
```

With CSS in the same file:

```css
.session-nav-widget {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
  margin-bottom: 8px;
}
.session-nav-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-decoration: none;
}
.session-nav-label:hover {
  text-decoration: underline;
}
```

- [ ] **Step 7: Wire the control**

In `src/match/matchView.ts`, add to the imports:

```ts
import { sessionNeighbors } from "../data/sessionNavigation.js";
```

Add fields next to the existing `twelveCbPrevMatchBtn` field declarations:

```ts
  private sessionNavWidget: HTMLElement | null = null;
  private sessionPrevGameBtn: HTMLButtonElement | null = null;
  private sessionNextGameBtn: HTMLButtonElement | null = null;
  private sessionNavLabel: HTMLAnchorElement | null = null;
```

Where the 12CB buttons are looked up and given click handlers, add the same for these, navigating with the existing helper:

```ts
this.sessionNavWidget = document.getElementById("sessionNavWidget");
this.sessionPrevGameBtn = document.getElementById(
  "sessionPrevGameBtn",
) as HTMLButtonElement | null;
this.sessionNextGameBtn = document.getElementById(
  "sessionNextGameBtn",
) as HTMLButtonElement | null;
this.sessionNavLabel = document.getElementById(
  "sessionNavLabel",
) as HTMLAnchorElement | null;
this.sessionPrevGameBtn?.addEventListener("click", () => {
  const id = this.sessionPrevGameBtn?.dataset.gameId;
  if (id) navigateToMatch(id);
});
this.sessionNextGameBtn?.addEventListener("click", () => {
  const id = this.sessionNextGameBtn?.dataset.gameId;
  if (id) navigateToMatch(id);
});
```

(`navigateToMatch` is already imported by this file for the 12CB buttons; if not, import it from `../router.js`.)

In the same method that calls `compute12CbMatchState` (line ~3924), after the 12CB handling, add:

```ts
this.renderSessionNav();
```

And add the method itself, next to the 12CB rendering methods:

```ts
  /**
   * Session-order prev/next. Independent of the 12-character-battle buttons:
   * during a battle both are shown, one stepping within the battle and one
   * within the whole session.
   */
  private renderSessionNav(): void {
    const tr = t();
    const nav =
      this.currentReplayId && this.identity
        ? sessionNeighbors(
            this.currentReplayId,
            this.sessionSummaries,
            this.identity,
          )
        : null;
    if (!this.sessionNavWidget) return;
    if (!nav) {
      this.sessionNavWidget.hidden = true;
      return;
    }
    this.sessionNavWidget.hidden = false;
    if (this.sessionNavLabel) {
      this.sessionNavLabel.textContent = tr.sessionGameCounter(
        nav.index + 1,
        nav.total,
      );
      this.sessionNavLabel.href = `#/session/${encodeURIComponent(
        nav.sessionId,
      )}`;
    }
    if (this.sessionPrevGameBtn) {
      this.sessionPrevGameBtn.title = tr.previousGame;
      this.sessionPrevGameBtn.disabled = nav.previousGameId === null;
      if (nav.previousGameId) {
        this.sessionPrevGameBtn.dataset.gameId = nav.previousGameId;
      } else {
        delete this.sessionPrevGameBtn.dataset.gameId;
      }
    }
    if (this.sessionNextGameBtn) {
      this.sessionNextGameBtn.title = tr.nextGame;
      this.sessionNextGameBtn.disabled = nav.nextGameId === null;
      if (nav.nextGameId) {
        this.sessionNextGameBtn.dataset.gameId = nav.nextGameId;
      } else {
        delete this.sessionNextGameBtn.dataset.gameId;
      }
    }
  }
```

The session-page link is dead until Task 7 adds that route; that is expected and harmless.

- [ ] **Step 8: Run the full checks**

Run: `npx prettier --write src/data/sessionNavigation.ts src/data/sessionNavigation.test.ts src/match/matchView.ts src/i18n.ts index.html && npx tsc --noEmit && npx vitest run && npm run build`
Expected: all green.

- [ ] **Step 9: Leave the work uncommitted**

Do not commit. Report: "Task 4 done: session prev/next in the match sidebar."

---

### Task 5: Project export and import

**Files:**

- Create: `src/data/projectFile.ts`
- Create: `src/data/projectFile.test.ts`
- Modify: `src/library/libraryView.ts` (buttons next to Clear local data)
- Modify: `index.html` (two buttons + a file input)
- Modify: `src/i18n.ts`

**Interfaces:**

- Consumes: `LibraryStore`/`StoredGame` (`src/data/libraryStore.ts`), `Identity`/`loadIdentity`/`saveIdentity` (`src/data/identity.ts`), `VideoLinkData`/`loadVideoLink`/`saveVideoLink` (`src/video/youtubeSync.ts`), `isStale`/`ANALYSIS_VERSION` (`src/data/analysisVersion.ts`).
- Produces: `buildProjectFile(games, identity, videoLinks): ProjectFile`, `serializeProjectFile(file): Blob`, `parseProjectFile(text): ProjectFile` (throws `ProjectFileError`), `mergeProjectFile(file, store): Promise<ImportProjectResult>` where `ImportProjectResult = { imported: number; skippedStale: number }`.

- [ ] **Step 1: Write the failing test**

Create `src/data/projectFile.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  buildProjectFile,
  parseProjectFile,
  ProjectFileError,
  mergeProjectFile,
} from "./projectFile.js";
import { ANALYSIS_VERSION } from "./analysisVersion.js";
import { createDefaultIdentity } from "./identity.js";
import type { StoredGame } from "./libraryStore.js";
import type { LibraryStore } from "./libraryStore.js";

function storedGame(
  id: string,
  analysisVersion = ANALYSIS_VERSION,
): StoredGame {
  return {
    id,
    contentHash: `hash-${id}`,
    formatVersion: 5,
    recorderSchemaVersion: 1,
    analysisVersion,
    sourcePath: `folder/${id}.rmgr`,
    size: 1234,
    manualPerspectivePort: null,
    summary: { id } as unknown as StoredGame["summary"],
  } as StoredGame;
}

function fakeStore(initial: StoredGame[] = []): LibraryStore & {
  rows: StoredGame[];
} {
  const rows = [...initial];
  return {
    rows,
    getAll: async () => [...rows],
    putMany: async (games) => {
      for (const g of games) {
        const at = rows.findIndex((r) => r.id === g.id);
        if (at === -1) rows.push(g);
        else rows[at] = g;
      }
    },
    delete: async (id) => {
      const at = rows.findIndex((r) => r.id === id);
      if (at !== -1) rows.splice(at, 1);
    },
    clear: async () => {
      rows.length = 0;
    },
  };
}

describe("project file round trip", () => {
  it("parses back exactly what it built", () => {
    const identity = { ...createDefaultIdentity("Jonn") };
    const built = buildProjectFile([storedGame("a")], identity, {
      a: { videoId: "abc123", offsetSeconds: 12 } as never,
    });
    const parsed = parseProjectFile(JSON.stringify(built));

    expect(parsed.games).toHaveLength(1);
    expect(parsed.games[0]?.id).toBe("a");
    expect(parsed.games[0]?.manualPerspectivePort).toBeNull();
    expect(parsed.videoLinks.a).toBeDefined();
    expect(parsed.analysisVersion).toBe(ANALYSIS_VERSION);
  });

  it("keeps a hand-set perspective", () => {
    const built = buildProjectFile(
      [{ ...storedGame("a"), manualPerspectivePort: 1 }],
      createDefaultIdentity(),
      {},
    );
    expect(
      parseProjectFile(JSON.stringify(built)).games[0]?.manualPerspectivePort,
    ).toBe(1);
  });

  it("rejects a file that isn't a project file", () => {
    expect(() => parseProjectFile('{"kind":"something-else"}')).toThrow(
      ProjectFileError,
    );
    expect(() => parseProjectFile("not json")).toThrow(ProjectFileError);
  });
});

describe("mergeProjectFile", () => {
  it("adds games and reports the count", async () => {
    const store = fakeStore();
    const file = buildProjectFile(
      [storedGame("a"), storedGame("b")],
      createDefaultIdentity(),
      {},
    );
    const result = await mergeProjectFile(file, store);

    expect(result.imported).toBe(2);
    expect(result.skippedStale).toBe(0);
    expect(store.rows).toHaveLength(2);
  });

  it("drops entries analyzed by an older version so they get recomputed", async () => {
    const store = fakeStore();
    const file = buildProjectFile(
      [storedGame("a"), storedGame("old", ANALYSIS_VERSION - 1)],
      createDefaultIdentity(),
      {},
    );
    const result = await mergeProjectFile(file, store);

    expect(result.imported).toBe(1);
    expect(result.skippedStale).toBe(1);
    expect(store.rows.map((r) => r.id)).toEqual(["a"]);
  });

  it("merges rather than replacing the existing library", async () => {
    const store = fakeStore([storedGame("existing")]);
    const file = buildProjectFile(
      [storedGame("new")],
      createDefaultIdentity(),
      {},
    );
    await mergeProjectFile(file, store);

    expect(store.rows.map((r) => r.id).sort()).toEqual(["existing", "new"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/projectFile.test.ts`
Expected: FAIL — cannot resolve `./projectFile.js`.

- [ ] **Step 3: Write the implementation**

Create `src/data/projectFile.ts`:

```ts
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
 * replay bytes themselves. Importing it on another machine restores the
 * library; the user then re-adds the replay folder to watch or search, the
 * same as after a page refresh.
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
  readonly identity: Identity;
  /** Keyed by replay id, as stored in localStorage. */
  readonly videoLinks: Readonly<Record<string, VideoLinkData>>;
}

export class ProjectFileError extends Error {}

export interface ImportProjectResult {
  readonly imported: number;
  /** Entries dropped because they were analyzed by an older version. */
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
    identity,
    videoLinks,
  };
}

export function serializeProjectFile(file: ProjectFile): Blob {
  return new Blob([JSON.stringify(file)], { type: "application/json" });
}

export function parseProjectFile(text: string): ProjectFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ProjectFileError("not valid JSON");
  }
  const file = raw as Partial<ProjectFile>;
  if (file?.kind !== KIND) {
    throw new ProjectFileError("not an rmgr-viewer project file");
  }
  if (typeof file.fileVersion !== "number" || file.fileVersion > FILE_VERSION) {
    throw new ProjectFileError(`unsupported project file version`);
  }
  return {
    kind: KIND,
    fileVersion: file.fileVersion,
    analysisVersion: file.analysisVersion ?? 0,
    exportedAt: file.exportedAt ?? "",
    games: file.games ?? [],
    identity: file.identity as Identity,
    videoLinks: file.videoLinks ?? {},
  };
}

/**
 * Merges an imported project into the local library. Never clears: an import
 * adds to what's already there. Entries whose analysis is stale are dropped
 * so they're recomputed when the folder is re-added.
 */
export async function mergeProjectFile(
  file: ProjectFile,
  store: LibraryStore,
): Promise<ImportProjectResult> {
  // StoredGame already carries analysisVersion/formatVersion/
  // recorderSchemaVersion, which is exactly VersionedEntry's shape.
  const fresh = file.games.filter((g) => !isStale(g));
  if (fresh.length > 0) await store.putMany(fresh);
  return {
    imported: fresh.length,
    skippedStale: file.games.length - fresh.length,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/data/projectFile.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Add the i18n keys**

`Translations` interface (next to the clear-local-data keys):

```ts
exportProject: string;
importProject: string;
exportProjectDone: (games: number) => string;
importProjectDone: (imported: number, recomputed: number) => string;
importProjectInvalid: string;
```

`en`:

```ts
  exportProject: "Export project",
  importProject: "Import project",
  exportProjectDone: (games) => `Exported ${games} games.`,
  importProjectDone: (imported, recomputed) =>
    recomputed > 0
      ? `Imported ${imported} games; ${recomputed} need re-analysis.`
      : `Imported ${imported} games.`,
  importProjectInvalid: "That file isn't an rmgr-viewer project file.",
```

`ja`:

```ts
  exportProject: "プロジェクトを書き出す",
  importProject: "プロジェクトを読み込む",
  exportProjectDone: (games) => `${games} 試合を書き出しました。`,
  importProjectDone: (imported, recomputed) =>
    recomputed > 0
      ? `${imported} 試合を読み込みました（${recomputed} 件は再解析が必要）。`
      : `${imported} 試合を読み込みました。`,
  importProjectInvalid:
    "このファイルは rmgr-viewer のプロジェクトファイルではありません。",
```

- [ ] **Step 6: Add the buttons**

In `index.html`, next to the Clear local data button (search for the element id used by `clearLocalData` wiring):

```html
<button id="exportProjectBtn" class="btn-secondary">Export project</button>
<button id="importProjectBtn" class="btn-secondary">Import project</button>
<input
  id="importProjectInput"
  type="file"
  accept="application/json,.json"
  hidden
/>
<span id="projectFileStatus" class="project-file-status"></span>
```

- [ ] **Step 7: Wire them in the library view**

In `src/library/libraryView.ts`, add imports:

```ts
import {
  buildProjectFile,
  mergeProjectFile,
  parseProjectFile,
  ProjectFileError,
  serializeProjectFile,
} from "../data/projectFile.js";
import { loadVideoLink } from "../video/youtubeSync.js";
```

Where the Clear local data button is wired, add:

```ts
const exportBtn =
  this.container.querySelector<HTMLButtonElement>("#exportProjectBtn");
const importBtn =
  this.container.querySelector<HTMLButtonElement>("#importProjectBtn");
const importInput = this.container.querySelector<HTMLInputElement>(
  "#importProjectInput",
);
const statusEl =
  this.container.querySelector<HTMLElement>("#projectFileStatus");

exportBtn?.addEventListener("click", () => {
  void (async () => {
    const rows = await this.store.getAll();
    const videoLinks: Record<string, VideoLinkData> = {};
    for (const row of rows) {
      const link = loadVideoLink(row.id);
      if (link) videoLinks[row.id] = link;
    }
    const blob = serializeProjectFile(
      buildProjectFile(rows, this.identity, videoLinks),
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rmgr-viewer-project-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (statusEl) statusEl.textContent = t().exportProjectDone(rows.length);
  })();
});

importBtn?.addEventListener("click", () => importInput?.click());
importInput?.addEventListener("change", () => {
  void (async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      const parsed = parseProjectFile(await file.text());
      const result = await mergeProjectFile(parsed, this.store);
      saveIdentity(parsed.identity);
      for (const [id, link] of Object.entries(parsed.videoLinks)) {
        saveVideoLink(id, link);
      }
      if (statusEl) {
        statusEl.textContent = t().importProjectDone(
          result.imported,
          result.skippedStale,
        );
      }
      await this.reloadFromStore();
    } catch (err) {
      if (statusEl) {
        statusEl.textContent =
          err instanceof ProjectFileError
            ? t().importProjectInvalid
            : String(err);
      }
    } finally {
      importInput.value = "";
    }
  })();
});
```

Import `saveIdentity` from `../data/identity.js`, `saveVideoLink` and the `VideoLinkData` type from `../video/youtubeSync.js`.

**`this.store` and `this.reloadFromStore()` are placeholders for whatever this controller already uses** to reach the `LibraryStore` and to re-render from it (see how `LibraryPersistenceHooks` at line 92 and the Clear local data handler do it). Use the existing members; do not add a second path to the store.

- [ ] **Step 8: Run the full checks**

Run: `npx prettier --write src/data/projectFile.ts src/data/projectFile.test.ts src/library/libraryView.ts src/i18n.ts index.html && npx tsc --noEmit && npx vitest run && npm run build`
Expected: all green.

- [ ] **Step 9: Leave the work uncommitted**

Do not commit. Report: "Task 5 done: project export/import, EN+JA."

---

### Task 6: Extract the stat panels into a shared module

**Files:**

- Create: `src/stats/statsPanels.ts`
- Modify: `src/library/libraryView.ts` (the stats rendering around lines 655-780)

**Interfaces:**

- Consumes: `DerivedRates`, `RateDeltas`, `GroupedCharacterBreakdown` (`src/data/aggregate.ts`).
- Produces: `renderStatCards(container: HTMLElement, input: StatCardsInput)` and `renderBreakdown(container: HTMLElement, breakdown: readonly GroupedCharacterBreakdown[])`, both pure DOM writers taking an explicit container. `StatCardsInput = { rates: DerivedRates; deltas: RateDeltas | null }`.

This is a pure refactor: no behavior change. The existing library tests are the guard.

- [ ] **Step 1: Confirm the current behavior is green**

Run: `npx vitest run src/library src/data/aggregate.test.ts`
Expected: PASS. Note the number of tests; it must not change.

- [ ] **Step 2: Create the module**

Create `src/stats/statsPanels.ts`. Move the stat-card and breakdown building code out of `libraryView.ts` verbatim, changing only how it reaches its container and data:

```ts
import type {
  DerivedRates,
  GroupedCharacterBreakdown,
  RateDeltas,
} from "../data/aggregate.js";

export interface StatCardsInput {
  readonly rates: DerivedRates;
  /** Comparison against a baseline, or null to show no deltas. */
  readonly deltas: RateDeltas | null;
}

/**
 * Renders the stat cards into `container`. Shared by the library (all games,
 * filtered) and the session page (one session, against the all-time
 * baseline), so it takes its data and container rather than reaching for
 * fixed element ids.
 */
export function renderStatCards(
  container: HTMLElement,
  input: StatCardsInput,
): void {
  // ... the exact markup-building code moved out of libraryView.ts ...
}

export function renderBreakdown(
  container: HTMLElement,
  breakdown: readonly GroupedCharacterBreakdown[],
): void {
  // ... the exact markup-building code moved out of libraryView.ts ...
}
```

Keep the moved code byte-identical where possible. Where it referenced `this.container.querySelector("#statCardsWrap")`, use the passed-in `container` instead.

- [ ] **Step 3: Call it from the library view**

In `libraryView.ts`, replace the moved blocks with calls:

```ts
if (statCardsWrapEl) {
  renderStatCards(statCardsWrapEl, {
    rates: filteredRates,
    deltas,
  });
}
if (breakdownWrapEl) {
  renderBreakdown(breakdownWrapEl, breakdown);
}
```

Keep every surrounding concern (the `hasSufficientGames` hidden/shown logic, the collapsible `<details>` handling, the matchup picker) in `libraryView.ts` — only the panel-body rendering moves.

- [ ] **Step 4: Verify nothing changed**

Run: `npx vitest run src/library src/data/aggregate.test.ts`
Expected: PASS, with the same test count as Step 1.

- [ ] **Step 5: Run the full checks**

Run: `npx prettier --write src/stats/statsPanels.ts src/library/libraryView.ts && npx tsc --noEmit && npx vitest run && npm run build`
Expected: all green.

- [ ] **Step 6: Leave the work uncommitted**

Do not commit. Report: "Task 6 done: stat panels extracted, library behavior unchanged."

---

### Task 7: Session page

**Files:**

- Create: `src/session/sessionView.ts`
- Create: `src/session/sessionView.test.ts`
- Modify: `src/router.ts`
- Modify: `index.html` (a `#sessionView` container)
- Modify: `src/main.ts` (route dispatch + controller construction)
- Modify: `src/library/libraryView.ts` (link from each session row)
- Modify: `src/i18n.ts`

**Interfaces:**

- Consumes: Task 6's `renderStatCards`/`renderBreakdown`; `groupGamesIntoSessions`; `aggregateFilteredGames`, `computeRateDeltas`, `computeGroupedOpponentCharacterBreakdown` (`src/data/aggregate.ts`); `searchHash` (`src/router.ts`).
- Produces: `SessionViewController` with `setData(summaries, identity)`, `setSessionId(id)`, `render()`; `navigateToSession(id)` and the `{ view: "session"; id: string }` route.

- [ ] **Step 1: Write the failing test**

Create `src/session/sessionView.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sessionQuickSearchLinks } from "./sessionView.js";

describe("sessionQuickSearchLinks", () => {
  it("scopes every quick search to the session", () => {
    const links = sessionQuickSearchLinks("session-1");
    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link.href).toContain("sessionId=session-1");
    }
  });

  it("builds failed edge guards, combos, and kill combos", () => {
    const [failed, combos, kills] = sessionQuickSearchLinks("s");
    expect(failed?.href).toContain("result=failure");
    expect(combos?.href).toContain("type=combos");
    expect(kills?.href).toContain("ko=1");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/session/sessionView.test.ts`
Expected: FAIL — cannot resolve `./sessionView.js`.

- [ ] **Step 3: Add the route**

In `src/router.ts`:

```ts
export type Route =
  | { view: "library" }
  | { view: "match"; id: string }
  | { view: "preview" }
  | { view: "session"; id: string }
  | { view: "matchup"; myChar: number; oppChar: number }
  | ({ view: "search" } & SearchRouteCriteria);
```

In `parseRoute`, before the `matchup/` branch:

```ts
if (clean.startsWith("session/")) {
  const id = decodeURIComponent(clean.slice("session/".length));
  if (id) return { view: "session", id };
}
```

And next to the other navigate helpers:

```ts
export function navigateToSession(id: string): void {
  window.location.hash = `#/session/${encodeURIComponent(id)}`;
}
```

- [ ] **Step 4: Write the quick-search link builder and the controller**

Create `src/session/sessionView.ts`:

```ts
import {
  aggregateFilteredGames,
  computeGroupedOpponentCharacterBreakdown,
  computeRateDeltas,
  filterGameSummaries,
} from "../data/aggregate.js";
import type { GameSummary } from "../data/gameSummary.js";
import type { Identity } from "../data/identity.js";
import { groupGamesIntoSessions, type SessionGroup } from "../data/session.js";
import { t } from "../i18n.js";
import { searchHash, type SearchRouteCriteria } from "../router.js";
import { renderBreakdown, renderStatCards } from "../stats/statsPanels.js";

const EMPTY_CRITERIA: SearchRouteCriteria = {
  type: "edgeGuards",
  result: null,
  sessionId: null,
  playerName: null,
  playerCharacterId: null,
  opponentCharacterId: null,
  jumpCount: null,
  startingAreaBox: null,
  victimName: null,
  minHits: null,
  killed: null,
  allowGaps: false,
};

export interface QuickSearchLink {
  readonly labelKey:
    | "quickSearchFailedEdgeGuards"
    | "quickSearchCombos"
    | "quickSearchKillCombos";
  readonly href: string;
}

/** The session page's pre-filtered search links, in display order. */
export function sessionQuickSearchLinks(
  sessionId: string,
): readonly QuickSearchLink[] {
  return [
    {
      labelKey: "quickSearchFailedEdgeGuards",
      href: searchHash({ ...EMPTY_CRITERIA, sessionId, result: "failure" }),
    },
    {
      labelKey: "quickSearchCombos",
      href: searchHash({ ...EMPTY_CRITERIA, sessionId, type: "combos" }),
    },
    {
      labelKey: "quickSearchKillCombos",
      href: searchHash({
        ...EMPTY_CRITERIA,
        sessionId,
        type: "combos",
        killed: true,
      }),
    },
  ];
}

/**
 * The per-session deep-dive page. Reuses the library's aggregation and the
 * shared stat panels - a session is just another filtered set of games,
 * compared against the all-time baseline.
 */
export class SessionViewController {
  private summaries: GameSummary[] = [];
  private identity: Identity | null = null;
  private sessionId: string | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly onOpenMatch: (gameId: string) => void,
  ) {}

  public setData(summaries: GameSummary[], identity: Identity): void {
    this.summaries = summaries;
    this.identity = identity;
  }

  public setSessionId(id: string): void {
    this.sessionId = id;
    this.render();
  }

  private currentSession(): SessionGroup | null {
    if (!this.identity || !this.sessionId) return null;
    return (
      groupGamesIntoSessions(this.summaries, this.identity).find(
        (s) => s.id === this.sessionId,
      ) ?? null
    );
  }

  public render(): void {
    const tr = t();
    const session = this.currentSession();
    if (!session || !this.identity) {
      this.container.innerHTML = `<p class="session-empty">${tr.sessionNotFound}</p>`;
      return;
    }

    // aggregate.ts works on *resolved* games ({summary, yourPort, oppPort}),
    // which filterGameSummaries produces; a session is just the subset of
    // those whose game is in this session.
    const allResolved = filterGameSummaries(this.summaries, this.identity, {});
    const sessionGameIds = new Set(session.games.map((g) => g.id));
    const sessionResolved = allResolved.filter((r) =>
      sessionGameIds.has(r.summary.id),
    );

    const sessionRates = aggregateFilteredGames(sessionResolved);
    const baselineRates = aggregateFilteredGames(allResolved);
    const deltas = computeRateDeltas(sessionRates, baselineRates);
    const breakdown = computeGroupedOpponentCharacterBreakdown(sessionResolved);

    this.container.innerHTML = `
      <section class="session-header">
        <h2>${escapeHtml(session.opponentName)}</h2>
        <p class="session-meta">
          <span>${escapeHtml(formatDateRange(session))}</span>
          <span>${tr.sessionRecord(session.wins, session.losses)}</span>
          <span>${tr.sessionGames(session.games.length)}</span>
        </p>
      </section>
      <section class="session-quick-searches">
        <h3>${tr.sessionQuickSearches}</h3>
        <div id="sessionQuickSearchLinks" class="session-quick-search-links"></div>
      </section>
      <section class="session-videos" id="sessionVideos"></section>
      <section class="session-stats">
        <h3>${tr.matchStats}</h3>
        <div id="sessionStatCards"></div>
        <div id="sessionBreakdown"></div>
      </section>
      <section class="session-games">
        <h3>${tr.sessionGamesHeading}</h3>
        <div id="sessionGameList"></div>
      </section>
    `;

    const cardsEl =
      this.container.querySelector<HTMLElement>("#sessionStatCards");
    if (cardsEl) renderStatCards(cardsEl, { rates: sessionRates, deltas });
    const breakdownEl =
      this.container.querySelector<HTMLElement>("#sessionBreakdown");
    if (breakdownEl) renderBreakdown(breakdownEl, breakdown);

    const linksEl = this.container.querySelector<HTMLElement>(
      "#sessionQuickSearchLinks",
    );
    if (linksEl) {
      linksEl.innerHTML = sessionQuickSearchLinks(session.id)
        .map(
          (link) =>
            `<a class="btn-secondary" href="${link.href}">${tr[link.labelKey]}</a>`,
        )
        .join(" ");
    }

    const videosEl =
      this.container.querySelector<HTMLElement>("#sessionVideos");
    if (videosEl) {
      videosEl.innerHTML = session.videoId
        ? `<h3>${tr.sessionVideos}</h3><a href="https://www.youtube.com/watch?v=${encodeURIComponent(
            session.videoId,
          )}" target="_blank" rel="noopener">▶ ${tr.vodWatchOnYouTube} ↗</a>`
        : "";
    }

    const listEl =
      this.container.querySelector<HTMLElement>("#sessionGameList");
    if (listEl) {
      listEl.innerHTML = session.games
        .map(
          (g, i) =>
            `<div class="session-game-row" data-game-id="${escapeHtml(g.id)}">
               <span>${i + 1}</span>
               <span>${escapeHtml(g.sourceName)}</span>
             </div>`,
        )
        .join("");
      listEl
        .querySelectorAll<HTMLElement>(".session-game-row")
        .forEach((row) => {
          row.addEventListener("click", () => {
            const id = row.dataset.gameId;
            if (id) this.onOpenMatch(id);
          });
        });
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateRange(session: SessionGroup): string {
  const start = session.startTime.toLocaleString();
  const end = session.endTime.toLocaleTimeString();
  return `${start} – ${end}`;
}
```

Note `renderBreakdown` takes the array `computeGroupedOpponentCharacterBreakdown` returns; Task 6 defines it as taking one `GroupedCharacterBreakdown`, so declare it as `readonly GroupedCharacterBreakdown[]` in Task 6 if the library renders all groups (it does).

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/session/sessionView.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Add the i18n keys**

`Translations` interface:

```ts
sessionNotFound: string;
sessionRecord: (wins: number, losses: number) => string;
sessionGames: (count: number) => string;
sessionGamesHeading: string;
sessionVideos: string;
sessionQuickSearches: string;
quickSearchFailedEdgeGuards: string;
quickSearchCombos: string;
quickSearchKillCombos: string;
viewSession: string;
```

`en`:

```ts
  sessionNotFound: "That session isn't in your library.",
  sessionRecord: (wins, losses) => `${wins}–${losses}`,
  sessionGames: (count) => `${count} games`,
  sessionGamesHeading: "Games",
  sessionVideos: "Video",
  sessionQuickSearches: "Quick searches",
  quickSearchFailedEdgeGuards: "Failed Edge Guards",
  quickSearchCombos: "Combos",
  quickSearchKillCombos: "Kill Combos",
  viewSession: "Session details",
```

`ja`:

```ts
  sessionNotFound: "そのセッションはライブラリにありません。",
  sessionRecord: (wins, losses) => `${wins}勝${losses}敗`,
  sessionGames: (count) => `${count} 試合`,
  sessionGamesHeading: "試合",
  sessionVideos: "動画",
  sessionQuickSearches: "クイック検索",
  quickSearchFailedEdgeGuards: "失敗した復帰阻止",
  quickSearchCombos: "コンボ",
  quickSearchKillCombos: "撃墜コンボ",
  viewSession: "セッション詳細",
```

- [ ] **Step 7: Add the container and mount the view**

In `index.html`, next to `<div id="searchView" ...>`:

```html
<div id="sessionView" class="view" hidden></div>
```

In `src/main.ts`, next to the other controller declarations and construction (line ~794):

```ts
let sessionController: SessionViewController;
```

```ts
sessionController = new SessionViewController(
  document.getElementById("sessionView") as HTMLElement,
  (gameId) => navigateToMatch(gameId),
);
```

Add a `sessionViewEl` lookup alongside `searchViewEl`, hide it in every other branch of `handleRouteChange` (the same way `searchViewEl.hidden = true;` appears in each), and add the new branch after the `search` branch:

```ts
  } else if (route.view === "session") {
    currentMatchSummary = null;
    currentMatchupRoute = null;
    matchController.deactivate();
    previewController?.deactivate();
    matchViewEl.hidden = true;
    matchFooterEl.hidden = true;
    previewViewEl.hidden = true;
    libraryViewEl.hidden = true;
    searchViewEl.hidden = true;
    matchupViewEl.hidden = true;
    backToLibraryBtn.hidden = false;

    sessionViewEl.hidden = false;
    sessionController.setData(
      libraryController.getSummaries(),
      libraryController.getIdentity(),
    );
    sessionController.setSessionId(route.id);
```

- [ ] **Step 8: Link from the library's session rows**

In `src/library/libraryView.ts`, where a session row's header is built, add a link (keeping the existing expand/collapse behavior intact — the link must not toggle the row):

```ts
`<a class="session-details-link" href="#/session/${encodeURIComponent(
  session.id,
)}" onclick="event.stopPropagation()">${t().viewSession}</a>`;
```

Prefer an `addEventListener("click", (e) => e.stopPropagation())` on the rendered anchor over the inline `onclick` if the surrounding code builds rows with `addEventListener`.

- [ ] **Step 9: Run the full checks**

Run: `npx prettier --write src/session/sessionView.ts src/session/sessionView.test.ts src/router.ts src/main.ts src/library/libraryView.ts src/i18n.ts index.html && npx tsc --noEmit && npx vitest run && npm run build`
Expected: all green.

- [ ] **Step 10: Leave the work uncommitted**

Do not commit. Report: "Task 7 done: session page at #/session/:id, linked from library rows and the match sidebar."

---

## Final verification

- [ ] Run `npx tsc --noEmit && npx vitest run && npm run build` — all green.
- [ ] Run `npm run lint` — clean apart from the 2 known errors in `scripts/skillMetricsAnalysis.ts` (Data Analyst's file; leave it alone).
- [ ] Confirm `git status` shows no changes to `docs/product/` or the Data Analyst's scripts.
- [ ] Report to Jonn for manual browser testing. Do not commit.
