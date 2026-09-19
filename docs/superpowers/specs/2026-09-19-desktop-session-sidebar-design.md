# Desktop session sidebar — design

Date: 2026-09-19
Status: approved (design), not yet implemented

## Problem

The desktop home page's sidebar holds only Import replays and the "YOU"
identity panel — under-using the space. Sessions are currently a list of
collapsible panels inline in the main game list. We want the sidebar to
list every session; selecting one loads that session's page on the right.

Mobile is explicitly out of scope: it keeps today's collapsible-panel
layout unchanged.

**Also explicitly out of scope:** removing or reworking the "YOU" identity
panel. Jonn is separately considering moving identity resolution to
per-game (assigned at import, corrected individually per game), which
would let the panel go away — that's a distinct project, sized and
brainstormed on its own later. This design treats the YOU panel as an
unchanged, opaque block so that later work doesn't require touching
anything built here.

## The architectural issue this surfaces

Today `librarySidebar` (Import + YOU panel) is rendered *inside*
`LibraryViewController`'s own container (`libraryView.ts:151`), and
`main.ts`'s router (`handleRouteChange`) hides that whole container when
navigating to `#/session/:id`. A session list living in that sidebar would
therefore vanish the moment you click a session - exactly when it needs to
stay, so you can click the next one.

**Resolution: a persistent sidebar shell.** Pull the sidebar (Import, YOU
panel, new session list) out of `LibraryViewController` into its own
always-mounted container, a sibling of the library/session content panes.
`main.ts`'s router swaps only the right-side content pane between Overview
and a session page; the sidebar itself never unmounts while in the "home"
experience (library or session routes). Match/search/matchup routes are
unaffected - they keep today's full-bleed layout with no persistent
sidebar, since this request is specifically about the home page.

Rejected alternatives:
- **Duplicate the sidebar inside `SessionViewController` too.** Avoids
  touching the router, but creates two places rendering "the session
  list" that can drift out of sync - the kind of duplication this
  codebase has consistently avoided (the session page already reuses
  `GameList`/`StatCards` rather than reimplementing them).
- **Half-measure: only the session list persists, Import/YOU still
  disappear on the session route.** Contradicts calling it "the sidebar."

## Desktop/mobile split

Same `860px` breakpoint already used for the existing mobile sidebar
toggle (`index.html`'s `@media (max-width: 860px)`, `libraryView.ts`'s
`mobileSidebarExpanded`). Below it, nothing in this design applies -
`LibraryViewController` keeps rendering today's collapsible per-session
`GameList` panels exactly as now.

This is a real branch in *what gets built*, not just CSS: one DOM tree is
active at a time, decided by `window.matchMedia("(min-width: 861px)")`
plus a change listener, following the existing pattern in `theme.ts`
(`theme.ts:92-97`, `window.matchMedia("(prefers-color-scheme: dark)")` +
listener) rather than inventing a new one. Building both DOM trees and
hiding one with CSS was considered and rejected: it means duplicating
every real session/game row in the DOM for no benefit, and keeping two
render paths for the same data in sync.

## Sidebar (desktop only), top to bottom

1. Import replays - unchanged.
2. YOU panel - unchanged.
3. **New: session list.** Own scrolling region (a long session history
   must not push Import/YOU off-screen), under two non-collapsible section
   headers, **"This week"** and **"Older"** (no other grouping, no
   collapsing). Sessions sorted newest-first within each group.

   Each row is two lines:
   - Line 1: `with <names>` - every other seated player in the session,
     not just one opponent, so a 3-4-player rotation lobby lists everyone.
     Comes directly from `SessionGroup.opponentName`
     (`src/data/session.ts:76`), which already resolves to a comma-joined
     list of every non-self lobby name (`getOpponentInfo`'s
     `.filter((n) => !matchesAlias(n, identity)).join(", ")`) - no new
     data plumbing needed, only a `with ${session.opponentName}` format
     string. Solo/practice sessions (empty `opponentName`) are assumed not
     to occur and aren't handled here - unlike `GameList`'s existing
     inline rendering (`gameList.ts:320`, `tr.sessionSoloGame`), which
     stays as-is for the mobile path. If one ever does show up, this row
     will read `with ` (blank) rather than silently reintroducing handling
     Jonn explicitly asked to leave out.
   - Line 2: date + W-L record (`session.startTime`, `session.wins`/
     `session.losses` - both already on `SessionGroup`).

   Clicking a row calls the existing `navigateToSession(id)`
   (`router.ts`) → `#/session/:id`, already wired end to end via
   `SessionViewController`. The row for the session matching the current
   route is visually marked as selected, the same `aria-current="page"`
   convention already used for the header's Library/Search nav links
   (`index.html`'s `.header-nav-link[aria-current="page"]`).

   **"This week" boundary:** a rolling last-7-days window (now back
   through 6 days ago), not a calendar-week (Sunday/Monday) cutoff -
   avoids a start-of-week convention debate and matches how "recency"
   reads casually mid-week. A session is "This week" if
   `session.startTime` falls in that window, else "Older".

## Right side (desktop)

- **Default** (library route, or any home-experience route that isn't a
  specific session): today's Overview content, *minus* the game list at
  the bottom - filters, stats, matchups only. Browsing individual games
  now happens by opening a session from the sidebar.
- **A session selected:** today's session page (`SessionViewController`),
  unchanged.

The session page is never reachable without the sidebar. Since
`#sessionView` lives inside the persistent shell rather than as an
independent top-level view, navigating straight to `#/session/:id` -
whether by pasting the URL, a bookmark, or a link from elsewhere (e.g. the
match view's "Game 3 of 9" session link) - lands on the same home
experience with that session selected, not a bare session page.

## Component changes

- **New sidebar-shell container** in `index.html`, sibling to
  `#libraryView`/`#sessionView`, always shown on desktop for the library
  and session routes (hidden below 860px, and hidden entirely on
  match/search/matchup routes - those are unaffected by this change).
- **New session-list component** (e.g. `src/library/sessionSidebarList.ts`)
  owning the "This week"/"Older" grouping and row rendering, given the
  full session list + current route so it can mark the selected row. Pure
  presentation over `groupGamesIntoSessions` output - no new data
  computation.
- **`main.ts`** grows ownership of the sidebar shell: constructs and
  mounts Import + YOU panel + the new session list once (not per-route),
  updates them whenever the library data changes (same hooks
  `libraryController` already receives today), and toggles the shell's
  visibility per route the same way it already toggles `libraryViewEl`/
  `sessionViewEl`/etc.
- **`LibraryViewController`** loses ownership of the import zone, the
  identity panel, and the game list on desktop. On mobile it is
  unchanged - it still renders all of that inline, exactly as today. This
  means `LibraryViewController` needs the same `matchMedia` check to know
  which of its two render paths to use.

## Testing

- Session-list component: grouping ("this week" vs "older" boundary,
  timezone-safe), row content (`with X, Y` formatting including 3-4
  player lobbies, single-opponent case), newest-first ordering, selected
  row matches current route.
- `main.ts`/routing: sidebar shell stays mounted across library ↔ session
  navigation; is hidden on match/search/matchup; is hidden below the
  860px breakpoint with `LibraryViewController` falling back to its
  current inline rendering.
- Existing `LibraryViewController`/`GameList`/`SessionViewController`
  tests must keep passing unchanged for the mobile path.

Manual browser testing (both breakpoints) is done by Jonn.

## Out of scope

- Any change to identity resolution, the YOU panel's contents, or moving
  identity assignment to import time - separate future project.
- Any change to match/search/matchup page layout.
- Collapsing/customizing the "This week"/"Older" grouping.
