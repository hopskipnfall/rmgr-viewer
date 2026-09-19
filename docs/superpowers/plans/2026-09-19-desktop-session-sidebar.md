# Desktop Session Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On desktop, replace the game list's collapsible per-session panels with a persistent sidebar session list; selecting a session shows its page on the right. Mobile is untouched.

**Architecture:** Pull the sidebar (Import + YOU panel, now also a session list) out of `LibraryViewController`'s dynamically-built markup into a static `index.html` container that stays mounted across the library and session routes, owned by a new `HomeSidebarController`. `LibraryViewController` shrinks to just filters/stats/matchups on desktop (its game list is gated off there, unchanged on mobile). A `window.matchMedia` breakpoint (reusing the app's existing 860px convention) decides which of the two behaviors is active, following the addEventListener/legacy-addListener pattern already used in `theme.ts`.

**Tech Stack:** TypeScript, Vite, vanilla DOM (no framework), vitest (Node environment, no real DOM - tests use the mock-container pattern from `src/library/gameList.test.ts`).

**Spec:** `docs/superpowers/specs/2026-09-19-desktop-session-sidebar-design.md`

## Global Constraints

- **No commits** until Jonn says so. Every task ends with checks run and the work left in the tree.
- Breakpoint: `860px`, matching the existing `@media (max-width: 860px)` in `index.html` and `LibraryViewController`'s `mobileSidebarExpanded` mobile-toggle behavior. Desktop = `min-width: 861px`.
- "This week" = a rolling last-7-days window (now back through 6 days ago), not a calendar week. A session is "This week" if `session.startTime` falls in that window, else "Older". No collapsing of either group.
- Session row line 1: `with <names>` from `session.opponentName` (already a comma-joined list of every non-self lobby member). Solo/no-opponent sessions (empty `opponentName`) are assumed not to occur and are NOT specially handled - such a row would read `with ` blank, which is accepted per the spec.
- Session row line 2: date + W-L record from `session.startTime`/`session.wins`/`session.losses`.
- Selected-row marking: `aria-current="page"`, the same convention already used for the header's Library/Search nav links (`index.html`'s `.header-nav-link[aria-current="page"]`).
- Match/search/matchup routes are unaffected - no persistent sidebar there, unchanged from today.
- Any new user-facing string needs EN and JA entries in all three places in `src/i18n.ts` (the `Translations` interface, `en`, `ja`). Check for an existing key first.
- Full check command, run at the end of every task: `npx tsc --noEmit && npx vitest run && npm run build`. Also run `npm run lint` and `npx prettier --write <files you touched>` before finishing.
- Prettier only files you touched.

---

## File Structure

**Create:**

- `src/responsive.ts` - shared desktop/mobile breakpoint check + change listener.
- `src/responsive.test.ts`
- `src/library/sessionSidebarList.ts` - "This week"/"Older" grouping, row formatting, and the `SessionSidebarList` DOM component.
- `src/library/sessionSidebarList.test.ts`
- `src/library/homeSidebar.ts` - `HomeSidebarController`: owns `IdentityPanel`, the mobile toggle, and `SessionSidebarList`, mounted on the (now static) sidebar markup.

**Modify:**

- `index.html` - introduce `#homeShell` wrapping `#libraryView`/`#sessionView`; move the sidebar's markup out of `LibraryViewController`'s template into static HTML inside `#homeShell`; add the `#sessionSidebarListWrap` mount point; fix the one ID-scoped mobile CSS rule.
- `src/library/libraryView.ts` - stop building/owning the sidebar (import zone, `IdentityPanel`, mobile toggle); gate the game list section on desktop vs mobile.
- `src/main.ts` - construct `HomeSidebarController`; feed it library data; update `handleRouteChange` so the sidebar stays visible across library+session routes and hidden elsewhere; re-point the import-button delegated click listener onto the new persistent container; mark the sidebar's selected session row.
- `src/i18n.ts` - no new keys are anticipated (the two sidebar lines are plain data, not translated strings), but check while implementing Task 3 in case a "no sessions yet" empty state is added.

---

### Task 1: Responsive breakpoint utility

**Files:**

- Create: `src/responsive.ts`
- Test: `src/responsive.test.ts`

**Interfaces:**

- Produces: `export function isDesktopWidth(): boolean` (true when `window.innerWidth >= 861`, false if `window`/`matchMedia` is unavailable - matches Node/test environments defaulting to "not desktop", i.e. the safer/simpler mobile path); `export function watchDesktopWidth(onChange: (isDesktop: boolean) => void): () => void` returning a cleanup function, following `theme.ts`'s `initTheme` listener-registration shape (`theme.ts:84-134`) including its legacy `addListener`/`removeListener` fallback for older `MediaQueryList` implementations.

- [ ] **Step 1: Write the failing tests**

```ts
// src/responsive.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { isDesktopWidth, watchDesktopWidth } from "./responsive.js";

describe("isDesktopWidth", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is true at/above the 861px breakpoint", () => {
    vi.stubGlobal("window", { innerWidth: 861 });
    expect(isDesktopWidth()).toBe(true);
    vi.stubGlobal("window", { innerWidth: 1200 });
    expect(isDesktopWidth()).toBe(true);
  });

  it("is false below the breakpoint", () => {
    vi.stubGlobal("window", { innerWidth: 860 });
    expect(isDesktopWidth()).toBe(false);
  });

  it("is false when window is unavailable (defaults to the safer mobile path)", () => {
    vi.stubGlobal("window", undefined);
    expect(isDesktopWidth()).toBe(false);
  });
});

describe("watchDesktopWidth", () => {
  it("calls back with the current value immediately, then again on change", () => {
    const listeners: Array<() => void> = [];
    const mq = {
      matches: false,
      addEventListener: (_: string, fn: () => void) => listeners.push(fn),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("window", {
      innerWidth: 500,
      matchMedia: () => mq,
    });

    const onChange = vi.fn();
    watchDesktopWidth(onChange);
    expect(onChange).toHaveBeenCalledWith(false);

    mq.matches = true;
    listeners.forEach((fn) => fn());
    expect(onChange).toHaveBeenCalledWith(true);

    vi.unstubAllGlobals();
  });

  it("returns a cleanup function that removes the listener", () => {
    const removeEventListener = vi.fn();
    vi.stubGlobal("window", {
      innerWidth: 500,
      matchMedia: () => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener,
      }),
    });

    const cleanup = watchDesktopWidth(() => {});
    cleanup();
    expect(removeEventListener).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/responsive.test.ts`
Expected: FAIL - cannot resolve `./responsive.js`.

- [ ] **Step 3: Write the implementation**

```ts
// src/responsive.ts
/**
 * Shared desktop/mobile breakpoint, matching the 860px cutoff index.html
 * already uses for the mobile sidebar toggle (@media (max-width: 860px)).
 * Desktop is >= 861px.
 */
const DESKTOP_MIN_WIDTH = 861;

export function isDesktopWidth(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth >= DESKTOP_MIN_WIDTH;
}

/**
 * Calls `onChange` immediately with the current value, then again whenever
 * the viewport crosses the breakpoint. Mirrors theme.ts's initTheme()
 * listener setup, including the legacy MediaQueryList.addListener fallback
 * for older browsers that don't support addEventListener on it.
 */
export function watchDesktopWidth(
  onChange: (isDesktop: boolean) => void,
): () => void {
  onChange(isDesktopWidth());

  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }

  const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);
  const listener = () => onChange(mq.matches);

  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }
  const legacy = mq as unknown as {
    addListener: (fn: () => void) => void;
    removeListener: (fn: () => void) => void;
  };
  if (typeof legacy.addListener === "function") {
    legacy.addListener(listener);
    return () => legacy.removeListener(listener);
  }
  return () => {};
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/responsive.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the full checks**

Run: `npx prettier --write src/responsive.ts src/responsive.test.ts && npx tsc --noEmit && npx vitest run && npm run build`
Expected: typecheck clean, all tests pass, build succeeds.

- [ ] **Step 6: Leave the work uncommitted**

Report: "Task 1 done: responsive breakpoint utility."

---

### Task 2: Session grouping and row formatting (pure logic)

**Files:**

- Create: `src/library/sessionSidebarList.ts` (this task writes only the pure functions; Task 3 adds the DOM component to the same file)
- Test: `src/library/sessionSidebarList.test.ts`

**Interfaces:**

- Consumes: `SessionGroup` (`src/data/session.ts:15`, fields used: `id`, `opponentName`, `startTime`, `wins`, `losses`).
- Produces: `export interface RecencyGroups { readonly thisWeek: readonly SessionGroup[]; readonly older: readonly SessionGroup[]; }`; `export function groupSessionsByRecency(sessions: readonly SessionGroup[], now: Date): RecencyGroups`; `export function sessionOpponentLine(session: SessionGroup): string`; `export function sessionDateRecordLine(session: SessionGroup): string`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/library/sessionSidebarList.test.ts
import { describe, it, expect } from "vitest";
import {
  groupSessionsByRecency,
  sessionOpponentLine,
  sessionDateRecordLine,
} from "./sessionSidebarList.js";
import type { SessionGroup } from "../data/session.js";

function makeSession(overrides: Partial<SessionGroup> = {}): SessionGroup {
  return {
    id: "s1",
    opponentName: "Harold",
    opponentCharacterIds: [],
    yourCharacterIds: [],
    startTime: new Date("2026-09-15T12:00:00Z"),
    endTime: new Date("2026-09-15T13:00:00Z"),
    totalDurationFrames: 3600,
    games: [],
    wins: 2,
    losses: 1,
    hasVideo: false,
    ...overrides,
  };
}

describe("groupSessionsByRecency", () => {
  const now = new Date("2026-09-19T12:00:00Z");

  it("puts a session from today in thisWeek", () => {
    const session = makeSession({ startTime: now });
    const { thisWeek, older } = groupSessionsByRecency([session], now);
    expect(thisWeek).toEqual([session]);
    expect(older).toEqual([]);
  });

  it("puts a session from exactly 6 days ago in thisWeek (rolling window, inclusive)", () => {
    const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const session = makeSession({ startTime: sixDaysAgo });
    const { thisWeek, older } = groupSessionsByRecency([session], now);
    expect(thisWeek).toEqual([session]);
    expect(older).toEqual([]);
  });

  it("puts a session from 8 days ago in older", () => {
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const session = makeSession({ startTime: eightDaysAgo });
    const { thisWeek, older } = groupSessionsByRecency([session], now);
    expect(thisWeek).toEqual([]);
    expect(older).toEqual([session]);
  });

  it("sorts each group newest-first", () => {
    const a = makeSession({
      id: "a",
      startTime: new Date(now.getTime() - 1000),
    });
    const b = makeSession({ id: "b", startTime: now });
    const { thisWeek } = groupSessionsByRecency([a, b], now);
    expect(thisWeek.map((s) => s.id)).toEqual(["b", "a"]);
  });
});

describe("sessionOpponentLine", () => {
  it("prefixes the opponent name(s) with 'with '", () => {
    expect(sessionOpponentLine(makeSession({ opponentName: "Harold" }))).toBe(
      "with Harold",
    );
  });

  it("lists every other lobby member for a rotation session", () => {
    expect(
      sessionOpponentLine(makeSession({ opponentName: "Harold, Nue" })),
    ).toBe("with Harold, Nue");
  });
});

describe("sessionDateRecordLine", () => {
  it("includes the date and the W-L record", () => {
    const line = sessionDateRecordLine(
      makeSession({
        startTime: new Date("2026-09-15T12:00:00Z"),
        wins: 3,
        losses: 1,
      }),
    );
    expect(line).toContain("3");
    expect(line).toContain("1");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/library/sessionSidebarList.test.ts`
Expected: FAIL - cannot resolve `./sessionSidebarList.js`.

- [ ] **Step 3: Write the implementation**

```ts
// src/library/sessionSidebarList.ts
import type { SessionGroup } from "../data/session.js";

const RECENCY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface RecencyGroups {
  readonly thisWeek: readonly SessionGroup[];
  readonly older: readonly SessionGroup[];
}

/**
 * "This week" is a rolling last-7-days window (now back through 6 days
 * ago), not a calendar week - avoids a Sunday/Monday start-of-week
 * convention debate. Each group is sorted newest-first.
 */
export function groupSessionsByRecency(
  sessions: readonly SessionGroup[],
  now: Date,
): RecencyGroups {
  const cutoff = now.getTime() - RECENCY_WINDOW_MS;
  const sorted = [...sessions].sort(
    (a, b) => b.startTime.getTime() - a.startTime.getTime(),
  );
  return {
    thisWeek: sorted.filter((s) => s.startTime.getTime() > cutoff),
    older: sorted.filter((s) => s.startTime.getTime() <= cutoff),
  };
}

/**
 * Line 1 of a sidebar session row. `opponentName` is already a
 * comma-joined list of every other lobby member (session.ts's
 * getOpponentInfo), so a 3-4 player rotation session lists everyone.
 * Solo/no-opponent sessions (empty opponentName) are assumed not to
 * occur - this deliberately does not special-case that, per the design.
 */
export function sessionOpponentLine(session: SessionGroup): string {
  return `with ${session.opponentName}`;
}

/** Line 2 of a sidebar session row: date + W-L record. */
export function sessionDateRecordLine(session: SessionGroup): string {
  const dateStr = session.startTime.toLocaleDateString();
  return `${dateStr} · ${session.wins}-${session.losses}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/library/sessionSidebarList.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Run the full checks**

Run: `npx prettier --write src/library/sessionSidebarList.ts src/library/sessionSidebarList.test.ts && npx tsc --noEmit && npx vitest run && npm run build`

- [ ] **Step 6: Leave the work uncommitted**

Report: "Task 2 done: session recency grouping and row formatting."

---

### Task 3: SessionSidebarList DOM component

**Files:**

- Modify: `src/library/sessionSidebarList.ts` (add to the same file)
- Modify: `src/library/sessionSidebarList.test.ts` (add to the same file)

**Interfaces:**

- Consumes: `groupSessionsByRecency`, `sessionOpponentLine`, `sessionDateRecordLine` (Task 2, same file); `navigateToSession` (`src/router.ts:110`); `t()` (`src/i18n.ts`) only if a translated label is needed (the two data lines are not translated strings, per Global Constraints).
- Produces: `export class SessionSidebarList { constructor(container: HTMLElement, onSelectSession: (id: string) => void); setSessions(sessions: readonly SessionGroup[]): void; setSelectedSessionId(id: string | null): void; render(): void; }`.

- [ ] **Step 1: Write the failing tests**

Vitest runs in the plain Node environment here - no real `document`/DOM
(confirmed: no `environment` override in `vite.config.ts`, so vitest's
"node" default applies). Every test file in this codebase that renders
DOM writes its own inline, purpose-built mock rather than sharing one
(see `gameList.test.ts` and `preview/characterPreview.test.ts`) - follow
that convention rather than introducing a new shared helper. This mock
needs to be a little richer than `gameList.test.ts`'s (which never reads
attributes back): `querySelector`/`querySelectorAll` need to return
_stateful_ fake elements - the same object on repeat queries for the same
selector - so a test can render, then read back what `render()` set on
them (`aria-current`, click handlers).

```ts
// appended to src/library/sessionSidebarList.test.ts
import { SessionSidebarList } from "./sessionSidebarList.js";

/** A minimal fake element: enough for SessionSidebarList's render() to
 * write innerHTML, walk rows, and set attributes/listeners - not a real
 * DOM node. */
interface FakeEl {
  innerHTML: string;
  attributes: Record<string, string>;
  dataset: Record<string, string>;
  listeners: Record<string, Array<() => void>>;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  addEventListener(type: string, fn: () => void): void;
  dispatchEvent(type: string): void;
}

function makeFakeEl(): FakeEl {
  const el: FakeEl = {
    innerHTML: "",
    attributes: {},
    dataset: {},
    listeners: {},
    setAttribute(name, value) {
      el.attributes[name] = value;
    },
    getAttribute(name) {
      return el.attributes[name] ?? null;
    },
    addEventListener(type, fn) {
      (el.listeners[type] ??= []).push(fn);
    },
    dispatchEvent(type) {
      for (const fn of el.listeners[type] ?? []) fn();
    },
  };
  return el;
}

/**
 * A fake container whose innerHTML setter parses out `data-session-id`
 * values from SessionSidebarList's own markup and creates one FakeEl per
 * row (with aria-current copied over if the markup included it), so
 * querySelectorAll(".session-sidebar-row") and
 * querySelector('[data-session-id="..."]') both work against the same
 * row objects render() then attaches click listeners to.
 */
function makeFakeContainer() {
  const rowsById = new Map<string, FakeEl>();
  let html = "";
  return {
    get innerHTML() {
      return html;
    },
    set innerHTML(value: string) {
      html = value;
      rowsById.clear();
      const rowRe = /data-session-id="([^"]+)"(\s+aria-current="page")?/g;
      let match: RegExpExecArray | null;
      while ((match = rowRe.exec(value))) {
        const el = makeFakeEl();
        el.dataset.sessionId = match[1]!;
        if (match[2]) el.setAttribute("aria-current", "page");
        rowsById.set(match[1]!, el);
      }
    },
    querySelectorAll(selector: string) {
      if (selector === ".session-sidebar-row") {
        return [...rowsById.values()];
      }
      return [];
    },
    querySelector(selector: string) {
      const m = /\[data-session-id="([^"]+)"\]/.exec(selector);
      if (m) return rowsById.get(m[1]!) ?? null;
      return null;
    },
  } as unknown as HTMLElement;
}

describe("SessionSidebarList", () => {
  it("groups sessions under 'This week' and 'Older' headings", () => {
    const now = new Date("2026-09-19T12:00:00Z");
    const recent = makeSession({ id: "recent", startTime: now });
    const old = makeSession({
      id: "old",
      startTime: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    });
    const container = makeFakeContainer();

    const list = new SessionSidebarList(container, () => {});
    list.setSessions([recent, old]);
    list.render(now);

    expect(container.innerHTML).toContain("This week");
    expect(container.innerHTML).toContain("Older");
    expect(container.innerHTML).toContain("recent");
    expect(container.innerHTML).toContain("old");
  });

  it("calls onSelectSession with the clicked session's id", () => {
    const container = makeFakeContainer();
    const selected: string[] = [];
    const session = makeSession({ id: "clicked" });

    const list = new SessionSidebarList(container, (id) => selected.push(id));
    list.setSessions([session]);
    list.render(new Date("2026-09-19T12:00:00Z"));

    (
      container.querySelector(
        '[data-session-id="clicked"]',
      ) as unknown as FakeEl
    ).dispatchEvent("click");
    expect(selected).toEqual(["clicked"]);
  });

  it("marks the selected session row with aria-current", () => {
    const container = makeFakeContainer();
    const session = makeSession({ id: "s1" });

    const list = new SessionSidebarList(container, () => {});
    list.setSessions([session]);
    list.setSelectedSessionId("s1");
    list.render(new Date("2026-09-19T12:00:00Z"));

    const row = container.querySelector(
      '[data-session-id="s1"]',
    ) as unknown as FakeEl | null;
    expect(row?.getAttribute("aria-current")).toBe("page");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/library/sessionSidebarList.test.ts`
Expected: FAIL - `SessionSidebarList` is not exported.

- [ ] **Step 3: Write the implementation**

```ts
// appended to src/library/sessionSidebarList.ts
import { navigateToSession } from "../router.js";

/** Matches gameList.ts's escapeHtml exactly - document is undefined under
 * vitest's plain Node test environment. */
function escapeHtml(s: string): string {
  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export class SessionSidebarList {
  private sessions: readonly SessionGroup[] = [];
  private selectedSessionId: string | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly onSelectSession: (id: string) => void,
  ) {}

  public setSessions(sessions: readonly SessionGroup[]): void {
    this.sessions = sessions;
  }

  public setSelectedSessionId(id: string | null): void {
    this.selectedSessionId = id;
  }

  /** `now` is injectable for tests; defaults to the real current time. */
  public render(now: Date = new Date()): void {
    const { thisWeek, older } = groupSessionsByRecency(this.sessions, now);

    const renderGroup = (label: string, sessions: readonly SessionGroup[]) => {
      if (sessions.length === 0) return "";
      const rows = sessions
        .map((session) => {
          const selected = session.id === this.selectedSessionId;
          return `
            <button
              class="session-sidebar-row"
              data-session-id="${escapeHtml(session.id)}"
              ${selected ? 'aria-current="page"' : ""}
            >
              <span class="session-sidebar-row-line1">${escapeHtml(sessionOpponentLine(session))}</span>
              <span class="session-sidebar-row-line2">${escapeHtml(sessionDateRecordLine(session))}</span>
            </button>
          `;
        })
        .join("");
      return `
        <div class="session-sidebar-group">
          <h4 class="session-sidebar-group-label">${escapeHtml(label)}</h4>
          ${rows}
        </div>
      `;
    };

    this.container.innerHTML =
      renderGroup("This week", thisWeek) + renderGroup("Older", older);

    this.container
      .querySelectorAll<HTMLElement>(".session-sidebar-row")
      .forEach((row) => {
        row.addEventListener("click", () => {
          const id = row.dataset.sessionId;
          if (id) this.onSelectSession(id);
        });
      });
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/library/sessionSidebarList.test.ts`
Expected: PASS.

- [ ] **Step 5: Add sidebar row CSS**

In `index.html`'s `<style>` block, near `.library-sidebar`'s other rules (search for `.library-sidebar-content` around line 1199):

```css
.session-sidebar-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 8px;
}
.session-sidebar-group-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 8px 4px 4px;
}
.session-sidebar-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--text);
  font-family: inherit;
  cursor: pointer;
}
.session-sidebar-row:hover {
  background: var(--card-header-hover);
}
.session-sidebar-row[aria-current="page"] {
  background: var(--accent-subtle);
  border-color: var(--accent);
}
.session-sidebar-row-line1 {
  font-size: 12px;
  font-weight: 600;
}
.session-sidebar-row-line2 {
  font-size: 11px;
  color: var(--text-dim);
}
```

(Confirm `--accent-subtle`/`--card-header-hover`/`--text-dim` exist under `:root` before using them - they were established earlier in this project's header-nav and library-collapsible styling; if a name doesn't match, use whichever equivalent variable those existing rules use.)

- [ ] **Step 6: Run the full checks**

Run: `npx prettier --write src/library/sessionSidebarList.ts src/library/sessionSidebarList.test.ts index.html && npx tsc --noEmit && npx vitest run && npm run build`

- [ ] **Step 7: Leave the work uncommitted**

Report: "Task 3 done: SessionSidebarList component with tests and styling."

---

### Task 4: index.html restructuring - persistent sidebar shell

**Files:**

- Modify: `index.html`

**Interfaces:**

- Produces: static markup with ids `#homeShell`, `#librarySidebar` (moved here from `LibraryViewController`'s template, content unchanged except a new `#sessionSidebarListWrap` mount point added inside `#librarySidebarContent`), `#libraryView` and `#sessionView` now nested inside `#homeShell` instead of being direct children of `<main>`.
- Consumes: nothing new - this is a pure markup move.

- [ ] **Step 1: Read the current structure precisely**

Read `index.html` around line 6130 (`<main>`'s children) and line 151-200 of `src/library/libraryView.ts` (the sidebar markup being moved) before editing, to copy the sidebar's markup byte-for-byte rather than retyping it from memory.

- [ ] **Step 2: Wrap `#libraryView`/`#sessionView` in `#homeShell`, and add the static sidebar**

In `index.html`, replace:

```html
<!-- Library View -->
<div id="libraryView" class="view-container"></div>

<!-- Preview View -->
<div id="previewView" class="view-container" hidden></div>

<!-- Search View -->
<div id="searchView" class="view-container" hidden></div>
<div id="sessionView" class="view-container" hidden></div>
```

with:

```html
<!-- Home shell: persistent sidebar (Import, YOU panel, session list) +
           swappable content pane (library overview or a session page).
           Stays mounted across the library <-> session routes; hidden
           entirely for every other route. Below the 860px breakpoint,
           #librarySidebar's content instead renders inline via the mobile
           toggle, matching today's behavior exactly - see the
           @media (max-width: 860px) block. -->
<div id="homeShell" class="home-shell">
  <div id="librarySidebar" class="library-sidebar">
    <div class="library-import-zone">
      <div class="import-container" id="importContainer">
        <button id="importBtn" class="btn-primary library-import-btn">
          + Import replays
        </button>
        <div
          id="importDropdownMenu"
          class="dropdown-menu library-import-dropdown"
          hidden
        >
          <button id="importFilesBtn">Select files (.rmgr)</button>
          <button id="importFolderBtn">Select folder</button>
        </div>
      </div>
      <div id="libImportProgressWrap" class="import-progress-wrap" hidden>
        <div class="import-progress-bar" id="libImportProgressBar"></div>
        <span id="libImportProgressText"></span>
      </div>
      <span id="libLoadStatus" class="lib-load-status"></span>
      <div id="libStaleBanner" class="stale-banner" hidden>
        <span id="libStaleBannerText"></span>
        <button id="libStaleBannerBtn"></button>
      </div>
    </div>
    <button
      id="mobileSidebarToggle"
      class="mobile-sidebar-toggle"
      aria-expanded="false"
    >
      <div class="mobile-toggle-left">
        <span class="mobile-toggle-icon">👤</span>
        <span id="mobileIdentitySummary" class="mobile-toggle-name"></span>
      </div>
      <div class="mobile-toggle-right">
        <span class="mobile-toggle-arrow">▾</span>
      </div>
    </button>
    <div id="librarySidebarContent" class="library-sidebar-content">
      <div id="identityCard" class="identity-card"></div>
      <div id="sessionSidebarListWrap" class="session-sidebar-list"></div>
    </div>
  </div>
  <div id="libraryView" class="view-container"></div>
  <div id="sessionView" class="view-container" hidden></div>
</div>

<!-- Preview View -->
<div id="previewView" class="view-container" hidden></div>

<!-- Search View -->
<div id="searchView" class="view-container" hidden></div>
```

Note `#sessionView` moved out of its old spot (next to `#searchView`) into `#homeShell`; don't leave a duplicate `#sessionView` behind.

- [ ] **Step 3: Add `#homeShell`'s layout CSS and fix the one ID-scoped mobile rule**

Near `main { ... }` (around line 1093):

```css
#homeShell {
  flex: 1;
  display: flex;
  min-height: 0;
  min-width: 0;
}
#homeShell[hidden] {
  display: none;
}
```

In the `@media (max-width: 860px)` block (around line 5674), replace:

```css
#libraryView {
  flex-direction: column;
  overflow-y: auto;
  padding: 12px;
  gap: 16px;
}
```

with:

```css
#homeShell {
  flex-direction: column;
}
#libraryView {
  overflow-y: auto;
  padding: 12px;
  gap: 16px;
}
```

(`flex-direction` moves to the new shell since `#librarySidebar` is no longer `#libraryView`'s child; `overflow-y`/`padding`/`gap` stay on `#libraryView` itself, unchanged from today.)

- [ ] **Step 4: Run the full checks**

Run: `npx prettier --write index.html && npx tsc --noEmit && npx vitest run && npm run build`
Expected: build succeeds. Tests will very likely fail here (`LibraryViewController` still tries to build the sidebar markup it used to own into `#libraryView`, which is now missing pieces like `#identityCard` being outside its container) - that's expected and gets fixed in Task 6. Note which tests fail so Task 6 can confirm they're the same ones.

- [ ] **Step 5: Leave the work uncommitted**

Report: "Task 4 done: index.html restructured with a persistent #homeShell sidebar. Some LibraryViewController tests are expected to fail until Task 6."

---

### Task 5: HomeSidebarController

**Files:**

- Create: `src/library/homeSidebar.ts`

**Interfaces:**

- Consumes: `IdentityPanel` (`src/library/identityPanel.ts`, constructor `(container, modalContainer, identity, getSummaries, onIdentityChanged)`); `SessionSidebarList` (Task 3); `groupGamesIntoSessions` (`src/data/session.ts`); `watchDesktopWidth`/`isDesktopWidth` (Task 1); `GameSummary`, `Identity`.
- Produces: `export class HomeSidebarController { constructor(container: HTMLElement, modalContainer: HTMLElement, identity: Identity, onIdentityChanged: (identity: Identity) => void, onSelectSession: (id: string) => void); setData(summaries: GameSummary[], identity: Identity): void; setSelectedSessionId(id: string | null): void; setDemoMode(isDemo: boolean): void; }`. Mirrors `LibraryViewController`'s existing `setDemoMode`/identity-update shape so `main.ts` can wire it the same way.

- [ ] **Step 1: Write the implementation**

No new pure logic here (Task 2/3 already covered that) - this is wiring, so write it directly rather than TDD-ing a thin composition class. Verify with the full checks in Step 2.

```ts
// src/library/homeSidebar.ts
import type { GameSummary } from "../data/gameSummary.js";
import { type Identity } from "../data/identity.js";
import { groupGamesIntoSessions } from "../data/session.js";
import { t } from "../i18n.js";
import { IdentityPanel } from "./identityPanel.js";
import { SessionSidebarList } from "./sessionSidebarList.js";

/**
 * Owns the persistent desktop sidebar shell (index.html's #librarySidebar,
 * now static markup, mounted inside #homeShell): Import replays, the YOU
 * (identity) panel, and the session list. Stays mounted across the library
 * <-> session routes - see docs/superpowers/specs/2026-09-19-desktop-session-sidebar-design.md.
 *
 * Below the 860px breakpoint this sidebar's content is unused - mobile
 * still gets its sidebar rendered inline by LibraryViewController, exactly
 * as before this change.
 */
export class HomeSidebarController {
  private identityPanel: IdentityPanel;
  private sessionList: SessionSidebarList;
  private summaries: GameSummary[] = [];
  private identity: Identity;
  private isDemoMode = false;
  /** Mobile only (below 860px) - moved here verbatim from
   * LibraryViewController, which used to own this same markup. */
  private mobileSidebarExpanded = false;

  constructor(
    private readonly container: HTMLElement,
    modalContainer: HTMLElement,
    identity: Identity,
    onIdentityChanged: (identity: Identity) => void,
    onSelectSession: (id: string) => void,
  ) {
    this.identity = identity;

    const identityCard = container.querySelector<HTMLElement>("#identityCard");
    const sessionListWrap = container.querySelector<HTMLElement>(
      "#sessionSidebarListWrap",
    );

    this.identityPanel = new IdentityPanel(
      identityCard ?? document.createElement("div"),
      modalContainer,
      identity,
      () => this.summaries,
      onIdentityChanged,
    );
    this.sessionList = new SessionSidebarList(
      sessionListWrap ?? document.createElement("div"),
      onSelectSession,
    );

    // Mobile collapse/expand toggle - moved verbatim from
    // LibraryViewController's old constructor (it owned this same
    // #mobileSidebarToggle/#librarySidebarContent markup before this
    // change). Inert on desktop; only visible/interactive below 860px per
    // index.html's existing @media (max-width: 860px) rules.
    const mobileSidebarToggle = container.querySelector<HTMLButtonElement>(
      "#mobileSidebarToggle",
    );
    const librarySidebarContent = container.querySelector<HTMLElement>(
      "#librarySidebarContent",
    );
    mobileSidebarToggle?.addEventListener("click", () => {
      this.mobileSidebarExpanded = !this.mobileSidebarExpanded;
      mobileSidebarToggle.classList.toggle(
        "expanded",
        this.mobileSidebarExpanded,
      );
      mobileSidebarToggle.setAttribute(
        "aria-expanded",
        String(this.mobileSidebarExpanded),
      );
      librarySidebarContent?.classList.toggle(
        "expanded",
        this.mobileSidebarExpanded,
      );
    });
  }

  public setDemoMode(isDemo: boolean): void {
    this.isDemoMode = isDemo;
  }

  public setData(summaries: GameSummary[], identity: Identity): void {
    this.summaries = summaries;
    this.identity = identity;
    this.identityPanel.setIdentity(identity);
    const sessions = groupGamesIntoSessions(summaries, identity);
    this.sessionList.setSessions(sessions);
    this.sessionList.render();
    this.renderMobileIdentitySummary();
  }

  /**
   * The mobile toggle's collapsed-state summary text - moved verbatim from
   * LibraryViewController.render()'s "Update mobile sidebar toggle
   * summary" block, which owned this same #mobileIdentitySummary element
   * before this change.
   */
  private renderMobileIdentitySummary(): void {
    const el = this.container.querySelector<HTMLElement>(
      "#mobileIdentitySummary",
    );
    if (!el) return;
    const aliases = Array.from(this.identity.aliases);
    if (aliases.length > 0) {
      el.textContent = aliases.join(", ");
      el.classList.remove("not-selected");
    } else {
      el.textContent = t().noNamesSelected;
      el.classList.add("not-selected");
    }
  }

  public setSelectedSessionId(id: string | null): void {
    this.sessionList.setSelectedSessionId(id);
    this.sessionList.render();
  }
}
```

`this.isDemoMode` is currently unused inside this class - it's accepted for interface parity with `LibraryViewController`'s existing `setDemoMode`, and is available if the sidebar ever needs demo-specific behavior. If `npm run lint` flags it as an unused private field, remove it and drop `setDemoMode` from this class instead (check whether `main.ts` actually calls `setDemoMode` on more than one controller before deciding - see Task 6).

- [ ] **Step 2: Run the full checks**

Run: `npx prettier --write src/library/homeSidebar.ts && npx tsc --noEmit && npx vitest run && npm run build`
Expected: typechecks; existing tests are still in the same state as the end of Task 4 (nothing new wires this class into `main.ts` yet).

- [ ] **Step 3: Leave the work uncommitted**

Report: "Task 5 done: HomeSidebarController created (not yet wired into main.ts)."

---

### Task 6: Trim LibraryViewController

**Files:**

- Modify: `src/library/libraryView.ts`
- Create: `src/library/libraryView.test.ts` (none exists today - `ls src/library/*.test.ts` currently shows only `gameList.test.ts` - so the new desktop/mobile gating behavior needs its own test file from scratch, not an addition to an existing one)

**Interfaces:**

- Consumes: `isDesktopWidth`, `watchDesktopWidth` (Task 1).
- Produces: `LibraryViewController`'s constructor **drops the `modalContainer` parameter entirely** - confirmed (`grep -n "modalContainer" src/library/libraryView.ts`) it has exactly one use today, passed straight to `new IdentityPanel(...)`, and that construction moves to `HomeSidebarController` (Task 5). New constructor signature:
  `constructor(container: HTMLElement, onSelectGame: (summary: GameSummary) => void, onShowFailedEdgeGuards: (session: SessionGroup) => void, onSelectMatchup: (myChar: number, oppChar: number) => void)`.
  This is a breaking change to the call site in `main.ts` - Task 7 updates it. Public API otherwise unchanged (`setSummaries`, `setIdentity`, `addSummaries`, `removeSummary`, `getSummaries`, `getIdentity`, `getSummaryById`, `selectPlayerPerspective`, `updateTranslations`, `setPersistenceHooks`, `setDemoMode`, `render`) - `main.ts` keeps calling all of these unchanged.

- [ ] **Step 1: Write the failing test for the desktop/mobile gate**

No test file exists for `LibraryViewController` yet. `render()` touches
many selectors (filter bar, stats, matchups, game list) - most of that is
skipped when `this.summaries` is empty (`hasSufficientGames` and the
`filterBarEl.hidden = true` branches both short-circuit on zero games),
so an empty-summaries render exercises the new gating logic in Task 6's
Step 2 without needing a mock that handles every other branch. The mock
below returns one shared generic fake element for _any_ selector it
doesn't specifically care about, so calls like `.hidden = true` or
`.innerHTML = ...` on parts of `render()` this test isn't checking don't
throw.

```ts
// src/library/libraryView.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { LibraryViewController } from "./libraryView.js";

interface FakeEl {
  hidden: boolean;
  innerHTML: string;
  textContent: string;
  addEventListener: () => void;
  querySelector: () => null;
  querySelectorAll: () => never[];
  classList: { add: () => void; remove: () => void; toggle: () => void };
}

function makeFakeEl(): FakeEl {
  return {
    hidden: false,
    innerHTML: "",
    textContent: "",
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
  };
}

function makeFakeContainer() {
  const byId = new Map<string, FakeEl>();
  const get = (id: string) => {
    if (!byId.has(id)) byId.set(id, makeFakeEl());
    return byId.get(id)!;
  };
  return {
    innerHTML: "",
    querySelector: (selector: string) => {
      const m = /^#([\w-]+)/.exec(selector);
      return m ? get(m[1]!) : makeFakeEl();
    },
    querySelectorAll: () => [],
    byId: get,
  } as unknown as HTMLElement & { byId: (id: string) => FakeEl };
}

describe("LibraryViewController desktop/mobile game list gating", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hides the game list on desktop", () => {
    vi.stubGlobal("window", { innerWidth: 1200 });
    const container = makeFakeContainer();
    const controller = new LibraryViewController(
      container,
      () => {},
      () => {},
      () => {},
    );
    controller.setSummaries([]);

    expect(container.byId("gameListWrap").hidden).toBe(true);
  });

  it("shows the game list on mobile", () => {
    vi.stubGlobal("window", { innerWidth: 500 });
    const container = makeFakeContainer();
    const controller = new LibraryViewController(
      container,
      () => {},
      () => {},
      () => {},
    );
    controller.setSummaries([]);

    expect(container.byId("gameListWrap").hidden).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/library/libraryView.test.ts`
Expected: FAIL - either a constructor argument-count mismatch (this test
already uses the trimmed 4-argument signature Step 4 below introduces) or
`#gameListWrap` is never hidden today regardless of width. Either failure
confirms there's real behavior to build, not a vacuous test.

- [ ] **Step 3: Remove sidebar ownership from the constructor**

In `libraryView.ts`, the constructor's `this.container.innerHTML` template (around line 150) currently builds both `#librarySidebar` and `#libraryMain`. Replace the whole template with just what was inside `#libraryMain` (the disclaimer banner, filter bar, stats/matchups `<details>`, game list wrap) - `#librarySidebar`'s markup is deleted here since Task 4 made it static HTML elsewhere:

```ts
this.container.innerHTML = `
      <div id="libraryMain" class="library-main">
        <div id="disclaimerBanner" class="disclaimer-banner"></div>
        <div id="libraryFilterBar" class="library-filter-bar"></div>
        <details id="overallStatsDetails" class="library-collapsible">
          <summary id="overallHeader" class="overall-header"></summary>
          <div id="neutralScoreWrap" class="neutral-score-wrap"></div>
          <div id="statCardsWrap" class="stat-cards-wrap"></div>
          <div id="breakdownWrap" class="breakdown-wrap"></div>
        </details>
        <details id="matchupPickerDetails" class="library-collapsible">
          <summary class="breakdown-section-header"><h3 id="matchupPickerTitle"></h3></summary>
          <div id="matchupPickerWrap" class="breakdown-wrap"></div>
        </details>
        <div id="gameListWrap" class="game-list-wrap"></div>
      </div>
    `;
```

Remove the `mobileSidebarToggle`/`librarySidebarContent` lookups and the click listener that follows (lines ~202-223) - that toggle is now wired inside `HomeSidebarController`'s own constructor (Task 5), not here or in `main.ts`.

Also remove `render()`'s separate "Update mobile sidebar toggle summary" block (the one that sets `#mobileIdentitySummary`'s text from `this.identity.aliases`, using `tr.noNamesSelected`) - it moved to `HomeSidebarController.renderMobileIdentitySummary()` (Task 5). Don't leave both places writing to the same element.

Remove `identityCard` lookup and the `this.identityPanel = new IdentityPanel(...)` construction (lines ~225-254) - `HomeSidebarController` owns this now. Delete the `identityPanel` field and `openOnboardingModal()` (its only method that forwarded to `identityPanel`) - confirmed via `grep -rn "openOnboardingModal" src/` that nothing in the codebase calls it, so this is dead code being removed as part of the same cleanup, not a behavior change needing its own decision.

Remove the `modalContainer` constructor parameter (per this task's Interfaces section above) and its now-unused JSDoc/type import if `identityPanel.ts`'s import becomes unused after removing the construction - check with `npx tsc --noEmit` in Step 4.

- [ ] **Step 4: Gate the game list on desktop vs mobile**

In `render()`, at step 7 (the existing `// 7. Game List` block near the end, around line 815):

```ts
// 7. Game List - desktop drops this entirely (browsing games happens
// through a session's own page now, opened from the sidebar); mobile
// keeps it exactly as before this change.
const gameListWrapEl =
  this.container.querySelector<HTMLElement>("#gameListWrap");
if (isDesktopWidth()) {
  if (gameListWrapEl) gameListWrapEl.hidden = true;
} else {
  if (gameListWrapEl) gameListWrapEl.hidden = false;
  const displayedSummaries = this.summaries.filter((s) =>
    matchesFilters(s, this.identity, this.filters),
  );
  this.gameList.setSortOrder(this.sortOrder);
  this.gameList.render(
    displayedSummaries,
    this.identity,
    displayedSummaries.length,
  );
}
```

Add the import: `import { isDesktopWidth, watchDesktopWidth } from "../responsive.js";`

- [ ] **Step 5: Re-render on breakpoint crossing**

In the constructor, after the existing field assignments, add a listener so resizing across 860px re-renders (showing/hiding the game list appropriately) without needing a manual refresh:

```ts
watchDesktopWidth(() => this.render());
```

Place this after `this.gameList = new GameList(...)` (the constructor's last statement) so `this.gameList` exists before the first callback could fire.

- [ ] **Step 6: Run the gating test to verify it now passes**

Run: `npx vitest run src/library/libraryView.test.ts`
Expected: PASS (2 tests, from Step 1).

- [ ] **Step 7: Run the full checks and confirm the Task 4 failures are gone**

Run: `npx prettier --write src/library/libraryView.ts src/library/libraryView.test.ts && npx tsc --noEmit && npx vitest run && npm run build`
Expected: the tests that failed at the end of Task 4 now pass.

- [ ] **Step 8: Leave the work uncommitted**

Report: "Task 6 done: LibraryViewController no longer owns the sidebar (dropped the modalContainer parameter and openOnboardingModal, confirmed dead); game list gated to mobile only, with a passing test for both widths."

---

### Task 7: Wire main.ts

**Files:**

- Modify: `src/main.ts`

**Interfaces:**

- Consumes: `HomeSidebarController` (Task 5); everything already imported (`libraryController`, `sessionController`, `navigateToSession`-adjacent routing).
- Produces: no new public interfaces - this is composition root wiring.

- [ ] **Step 1: Construct `HomeSidebarController`**

Near where `libraryController = new LibraryViewController(...)` is constructed (around line 855), add:

```ts
const homeSidebarEl = document.getElementById(
  "librarySidebar",
) as HTMLDivElement;
```

next to the other `const xEl = document.getElementById(...)` declarations at the top of the file (near `libraryViewEl`, line ~85), and construct the controller alongside `libraryController`:

```ts
homeSidebarController = new HomeSidebarController(
  homeSidebarEl,
  modalContainerEl,
  libraryController.getIdentity(),
  (identity) => {
    saveIdentity(identity);
    libraryController.setIdentity(identity);
  },
  (sessionId) => navigateToSession(sessionId),
);
```

Add `let homeSidebarController: HomeSidebarController;` alongside the other top-level `let xController: XController;` declarations, and the import:

```ts
import { HomeSidebarController } from "./library/homeSidebar.js";
```

**Also update the existing `new LibraryViewController(...)` call** (Task 6 dropped its `modalContainer` parameter): remove the `modalContainerEl,` argument from that call so it now starts `libraryController = new LibraryViewController(libraryViewEl, (selectedSummary) => {...`. `modalContainerEl` itself is still declared and still used elsewhere in this file (confirmed: also passed to `SearchViewController`'s construction) - only this one call site's argument is removed, redirected to the new `HomeSidebarController` construction above instead.

- [ ] **Step 2: Feed it data at the same points `libraryController` gets updated**

Search `grep -n "libraryController.setSummaries\|libraryController.addSummaries\|libraryController.setIdentity" src/main.ts` for every call site. After each one, add the matching call so the sidebar's session list and identity stay in sync:

```ts
homeSidebarController.setData(
  libraryController.getSummaries(),
  libraryController.getIdentity(),
);
```

Do this at every site the search finds - do not guess there's only one; `addSummaries` (import completing), `setSummaries` (initial load / demo mode), and `setIdentity` (onboarding) are all separate call sites per `libraryView.ts`'s existing public API.

- [ ] **Step 3: Keep the sidebar visible across library <-> session routes**

In `handleRouteChange`, the `route.view === "library"` branch (around line 641-646) currently does:

```ts
sessionViewEl.hidden = true;
matchupViewEl.hidden = true;
backToLibraryBtn.hidden = true;

libraryViewEl.hidden = false;
libraryController.render();
```

`#homeShell` wraps both `libraryViewEl` and `sessionViewEl` now (Task 4), so it must be shown whenever either of those routes is active, and hidden for every other route. Add `homeShellEl.hidden = false;` to this branch and the `route.view === "session"` branch (around line 707-717), and `homeShellEl.hidden = true;` to every other branch (`preview`, `search`, `match`, `matchup` - the same set of branches that already set `libraryViewEl.hidden = true` and `sessionViewEl.hidden = true`). Declare `const homeShellEl = document.getElementById("homeShell") as HTMLDivElement;` alongside `libraryViewEl`.

In the `route.view === "session"` branch specifically, also mark the selected row:

```ts
homeSidebarController.setSelectedSessionId(route.id);
```

In the `route.view === "library"` branch, clear it:

```ts
homeSidebarController.setSelectedSessionId(null);
```

**This is what makes a session unreachable without its sidebar**, per the
spec's explicit requirement: since `sessionViewEl` only lives inside
`homeShellEl` (Task 4), there is no branch anywhere in `handleRouteChange`
that shows `sessionViewEl` without also setting `homeShellEl.hidden =
false` - true whether the route was reached by clicking a sidebar row, a
direct URL (`#/session/:id` typed or bookmarked), or a link from
elsewhere (e.g. the match view's "Game 3 of 9" session link, which calls
the same `navigateToSession`). Don't special-case "direct navigation" -
there's exactly one `route.view === "session"` branch and it's the only
place `sessionViewEl.hidden` is set to `false`.

- [ ] **Step 4: Re-point the import-button delegated click listener**

The existing listener (around line 957, `libraryViewEl.addEventListener("click", (e) => { ... importBtn ... })`) targets elements (`#importBtn`, `#importFilesBtn`, `#importFolderBtn`) that Task 4 moved out of `libraryViewEl`'s subtree into `#librarySidebar` (now outside it, inside `#homeShell` but a sibling of `libraryViewEl`, not a descendant). Change the listener's target from `libraryViewEl` to `homeSidebarEl`:

```ts
homeSidebarEl.addEventListener("click", (e) => {
  // ...unchanged body...
});
```

Do the same for the second listener at line ~986 (the one that closes the dropdown on an outside click) if it's also currently attached to `libraryViewEl` - re-point it the same way.

- [ ] **Step 5: Run the full checks**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: typecheck clean, all tests pass, build succeeds.

- [ ] **Step 6: Leave the work uncommitted**

Report: "Task 7 done: main.ts wires HomeSidebarController, keeps #homeShell visible across library/session routes, re-points import-button delegation."

---

## Final verification

- [ ] Run `npx tsc --noEmit && npx vitest run && npm run build` - all green.
- [ ] Run `npm run lint` - clean apart from the Data Analyst's known 2 errors in `scripts/skillMetricsAnalysis.ts` (leave that file alone).
- [ ] Run `npx prettier --check .` on files you touched.
- [ ] Confirm `git status` shows no changes to `docs/product/` or the Data Analyst's scripts.
- [ ] Manually verify: navigate directly to a session URL (e.g. paste
      `#/session/<some-id>` into the address bar and reload) and confirm
      the sidebar is visible alongside the session page, not a bare
      session view with no sidebar.
- [ ] Report to Jonn for manual browser testing at both breakpoints (desktop sidebar session list + persistence across session navigation; mobile collapsible panels unchanged). Do not commit.
