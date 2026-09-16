# Session page, project export, and search UX — design

Date: 2026-09-16
Status: approved (design), not yet implemented

Five related gaps in the viewer, designed together because three of them
(nav, session page, search links) touch the same navigation surface.

1. Search is reachable only through the "Failed Edge Guards" link.
2. Project export was discussed during the persistent-library work but never
   specced or built. No export code exists in `src/`.
3. No per-session page for deeper review.
4. No prev/next navigation between games of a session.
5. Search re-runs from scratch every time and shows no progress.

## 1. Global navigation

A header nav present on every route: **Library** and **Search**, alongside the
existing theme toggle. The Search link routes to `#/search` with no criteria,
which `parseRoute` already accepts.

No other entry points are removed; "Failed Edge Guards" keeps working.

New i18n keys (EN + JA): `navLibrary`, `navSearch`.

## 2. Project export / import

New module `src/data/projectFile.ts`. No new storage; it reads and writes the
stores that already exist.

```ts
interface ProjectFile {
  kind: "rmgr-viewer-project";
  fileVersion: 1;            // this file format
  analysisVersion: number;   // ANALYSIS_VERSION at export time
  exportedAt: string;        // ISO 8601
  games: StoredGame[];       // the IndexedDB library rows, as stored
  identity: Identity;        // localStorage (identity.ts)
  videoLinks: Record<string, VideoLinkData>;  // localStorage, per replay id
}
```

`StoredGame` rows are exported whole rather than just their
`SerializedGameSummary`: they also carry `manualPerspectivePort` (which the
user set by hand and must survive), plus `contentHash`/`sourcePath`/`size`,
which is what lets re-adding the folder match entries by the existing fast
path instead of re-analyzing.

- `exportProject(...)` gathers those three sources and returns a `Blob`. The
  UI downloads it via an object-URL anchor, which works in Firefox.
- `importProject(file, ...)` validates `kind`/`fileVersion`, then merges:
  games by `id` (an entry whose `analysisVersion` is stale by
  `analysisVersion.ts`'s existing `isStale` is dropped, so it is recomputed
  when the folder is re-added), identity replaces, video links merge by
  replay id.
- Neither replay bytes nor search results are included. After importing on a
  new machine the user re-adds the replay folder to watch or search, exactly
  as after a page refresh today.
- Per-game `manualPerspectivePort` rides along on each row, so a hand-set
  perspective survives the move.

UI: **Export project** / **Import project** buttons in the library, beside
Clear local data. Import shows a summary ("142 games, 3 recomputed") and
cannot silently clobber: it merges.

New i18n keys: `exportProject`, `importProject`, `importProjectResult(n, m)`,
`importProjectInvalid`.

## 3. Session page

New route `#/session/:id`, added to `Route` in `router.ts`. `SessionGroup.id`
already exists and is already used as search's `sessionId`, so no new
identity scheme.

New `src/session/sessionView.ts` (`SessionViewController`), following
`LibraryViewController`'s shape. Sections:

1. **Header** — date, opponent, your/their characters, record (W–L), game
   count, total play time. All from `SessionGroup`.
2. **Stats** — the library's existing stat cards and breakdown, scoped to
   this session's games, each shown against the all-time baseline. Reuses
   `filterGameSummaries` / `aggregateFilteredGames` / `computeRateDeltas` /
   `computeOverallBaseline`; the session is just another filtered set.
3. **Matchup breakdown** — `computeGroupedOpponentCharacterBreakdown` over the
   session's games.
4. **Game list** — every game in order with characters, stocks, result, and a
   link to `#/match/:id`.
5. **Videos** — the session's attached video(s) (`videoId` /
   `videoLinkData`), each linking out to YouTube.
6. **Quick searches** — links built with the router's existing
   `searchRouteToHash`, pre-filtered to `sessionId`: Failed Edge Guards,
   Combos, Kill Combos.

Library session rows keep their current behavior and gain a link to this page.

**Refactor required by this section:** the stat cards, breakdown and neutral
score are currently rendered by `libraryView.ts` (837 lines) directly against
markup ids defined in its own template. Extract that rendering into
`src/stats/statsPanels.ts` exposing pure `renderStatCards(...)` /
`renderBreakdown(...)` that take data and a container, so both pages call the
same code. No behavior change; the library's existing tests must still pass.

New i18n keys: `sessionPageTitle`, `sessionRecord`, `sessionGames`,
`sessionDuration`, `sessionVideos`, `sessionQuickSearches`, `viewSession`.

## 4. Prev/next game within a session

New `src/data/sessionNavigation.ts`:

```ts
interface SessionNeighbors {
  sessionId: string;
  index: number;      // 0-based position within the session
  total: number;
  previousGameId: string | null;
  nextGameId: string | null;
}
function sessionNeighbors(
  gameId: string,
  summaries: readonly GameSummary[],
  identity: Identity,
): SessionNeighbors | null;   // null when the game isn't in any session
```

Built on `groupGamesIntoSessions`, mirroring `compute12CbMatchState`'s
contract so the match sidebar wiring is the same shape as the existing
12-character-battle buttons.

Match sidebar gains one control: `◀ Game 3 of 9 ▶`, shown for every game in a
session, each button linking to `#/match/:id`. The label links to the session
page. The 12-character-battle widget keeps its own prev/next, so during a
battle both are available: one steps within the battle, one within the
session.

New i18n keys: `sessionGameCounter(index, total)`, `previousGame`, `nextGame`.

## 5. Search cache and progress

### Cache

New `src/search/searchCache.ts`: an in-memory LRU of the last **10** searches.

- Key: JSON of the normalized criteria + the sorted ids of the games actually
  searched + `ANALYSIS_VERSION`. Including the id list means a cache entry
  can't outlive a library change that adds or removes games.
- Value: `{ results: PlaylistClip[]; unloadedCount: number }`.
- Cleared wholesale on library import, project import, and Clear local data.
- Not persisted: results depend on replay data that a refresh loses anyway.

`runSearch` checks the cache before its loop and stores on completion. A
superseded search (the existing `searchToken` check) stores nothing.

### Progress

`runSearch` already iterates games one at a time and awaits each load, so it
reports `{ done, total }` after each game. The results pane shows a progress
bar and `12 / 48 games` while searching, replacing today's generic searching
state. A cached hit renders immediately with no bar.

New i18n keys: `searchProgress(done, total)`.

## Testing

Unit tests (vitest, Node env — no browser):

- `projectFile.test.ts` — export/import round-trip; stale-analysis entries
  dropped; invalid/foreign file rejected; merge doesn't drop existing games.
- `sessionNavigation.test.ts` — first/last game have null neighbors; a game in
  no session returns null; ordering matches session order.
- `searchCache.test.ts` — same criteria hit; changed criteria, changed game
  set, or changed analysis version miss; LRU evicts past 10; clear empties.
- `sessionView.test.ts` — session stats scope to the session's games, and the
  quick-search links carry `sessionId`.
- Existing `libraryView`/`gameList` tests must pass unchanged after the
  `statsPanels.ts` extraction.

Manual browser testing is done by Jonn.

## Out of scope

- Persisting search results or parsed replays across refreshes.
- Per-session or per-matchup notes.
- Replacing the library's expandable session rows.
