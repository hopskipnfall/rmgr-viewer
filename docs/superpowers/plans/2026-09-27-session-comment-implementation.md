# Session Comment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user write a single free-text comment per session, always editable from the session page.

**Architecture:** A new `src/sessionComments.ts` module persists one plain string per session in localStorage, keyed by `SessionGroup.id`, exactly like `src/notes.ts` persists match notes but without an array/id/timestamps since there's at most one comment. `src/session/sessionView.ts` gets a new always-editable `<textarea>` section that loads on render and saves on blur. The comment is folded into the existing project export/import flow (`src/data/projectFile.ts`, `src/main.ts`) alongside video links and notes.

**Tech Stack:** TypeScript, Vite, Vitest, plain DOM — matches the rest of this codebase.

## Global Constraints

- Storage key prefix: `rmgr_session_comment_` + session id, mirroring `rmgr_notes_` in `src/notes.ts`.
- A session has at most one comment: no array, no id field, no timestamps - just a string.
- Saving an empty or whitespace-only comment removes the storage entry entirely (trimmed centrally inside `saveSessionComment`, not left to callers).
- No separate view/edit state: the textarea is always editable, pre-filled from storage, and saves on `blur`. No Save/Cancel buttons.
- New i18n strings need both English and Japanese (`src/i18n.ts` has both locales for every existing key).

---

### Task 1: `src/sessionComments.ts` persistence module

**Files:**

- Create: `src/sessionComments.ts`
- Create: `src/sessionComments.test.ts`

**Interfaces:**

- Produces:
  - `function loadSessionComment(sessionId: string): string`
  - `function saveSessionComment(sessionId: string, text: string): void`

- [ ] **Step 1: Write `src/sessionComments.ts`**

```ts
/**
 * A single free-text comment per session, persisted the same way match notes and video links are
 * - one localStorage entry per session id (SessionGroup.id, from src/data/session.ts), folded
 * into project export/import (see src/data/projectFile.ts). Unlike src/notes.ts, a session has at
 * most one comment, so this stores a plain string rather than an array of records.
 */
const STORAGE_KEY_PREFIX = "rmgr_session_comment_";

/** Returns "" if no comment is saved for this session. Never throws. */
export function loadSessionComment(sessionId: string): string {
  if (!sessionId) return "";
  try {
    return localStorage.getItem(STORAGE_KEY_PREFIX + sessionId) ?? "";
  } catch {
    return "";
  }
}

/** Saves `text` (trimmed) for this session. An empty/whitespace-only text removes the storage
 * entry entirely, the same way an empty MatchNote[] removes its key in notes.ts. */
export function saveSessionComment(sessionId: string, text: string): void {
  if (!sessionId) return;
  try {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      localStorage.removeItem(STORAGE_KEY_PREFIX + sessionId);
    } else {
      localStorage.setItem(STORAGE_KEY_PREFIX + sessionId, trimmed);
    }
  } catch {
    // Ignore localStorage write errors
  }
}
```

- [ ] **Step 2: Write `src/sessionComments.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { loadSessionComment, saveSessionComment } from "./sessionComments.js";

describe("session comment persistence", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    };
    (
      globalThis as unknown as { localStorage: typeof mockStorage }
    ).localStorage = mockStorage;
  });

  it("returns an empty string when nothing is saved", () => {
    expect(loadSessionComment("session-1")).toBe("");
  });

  it("saves and loads a comment for a session", () => {
    saveSessionComment(
      "session-1",
      "Great matches, watch out for his up-smash",
    );
    expect(loadSessionComment("session-1")).toBe(
      "Great matches, watch out for his up-smash",
    );
  });

  it("trims whitespace before saving", () => {
    saveSessionComment("session-1", "  padded text  ");
    expect(loadSessionComment("session-1")).toBe("padded text");
  });

  it("removes the storage entry when saving an empty string", () => {
    saveSessionComment("session-1", "something");
    saveSessionComment("session-1", "");
    expect(localStorage.getItem("rmgr_session_comment_session-1")).toBeNull();
    expect(loadSessionComment("session-1")).toBe("");
  });

  it("removes the storage entry when saving a whitespace-only string", () => {
    saveSessionComment("session-1", "something");
    saveSessionComment("session-1", "   \n  ");
    expect(loadSessionComment("session-1")).toBe("");
  });

  it("keeps comments for different sessions separate", () => {
    saveSessionComment("session-1", "comment 1");
    saveSessionComment("session-2", "comment 2");
    expect(loadSessionComment("session-1")).toBe("comment 1");
    expect(loadSessionComment("session-2")).toBe("comment 2");
  });

  it("overwrites an existing comment", () => {
    saveSessionComment("session-1", "first");
    saveSessionComment("session-1", "second");
    expect(loadSessionComment("session-1")).toBe("second");
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/sessionComments.test.ts`
Expected: PASS, all 7 tests green.

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/sessionComments.ts src/sessionComments.test.ts`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/sessionComments.ts src/sessionComments.test.ts
git commit -m "Add src/sessionComments.ts: per-session free-text comment persistence"
```

---

### Task 2: Project export/import wiring

**Files:**

- Modify: `src/data/projectFile.ts`
- Modify: `src/main.ts`
- Modify: `src/data/projectFile.test.ts`

**Interfaces:**

- Consumes: `loadSessionComment`/`saveSessionComment` (from `src/sessionComments.ts`, Task 1); `groupGamesIntoSessions` (already imported in `main.ts` from `./data/session.js`).
- Produces:
  - `ProjectFile.sessionComments: Readonly<Record<string, string>>`
  - `buildProjectFile(games, identity, videoLinks, notes, sessionComments = {})` — 5th param optional, defaults to `{}` so every existing 3- and 4-arg call site keeps compiling unchanged.

- [ ] **Step 1: Add a failing test for the round trip**

In `src/data/projectFile.test.ts`, add this new `describe` block at the very end of the file (after the existing `describe("notes export/import", ...)` block):

```ts
describe("session comments export/import", () => {
  it("round-trips comments keyed by session id", () => {
    const built = buildProjectFile(
      [storedGame("a")],
      createDefaultIdentity(),
      {},
      {},
      { session_a: "Great set, watch the ledge trap" },
    );
    const parsed = parseProjectFile(JSON.stringify(built));
    expect(parsed.sessionComments.session_a).toBe(
      "Great set, watch the ledge trap",
    );
  });

  it("defaults to no session comments when the 5th argument is omitted", () => {
    const built = buildProjectFile(
      [storedGame("a")],
      createDefaultIdentity(),
      {},
    );
    expect(built.sessionComments).toEqual({});
  });

  it("puts each session's comment on its own line, and still parses", async () => {
    const built = buildProjectFile(
      [storedGame("a"), storedGame("b")],
      createDefaultIdentity(),
      {},
      {},
      { session_a: "comment text" },
    );
    const text = await serializeProjectFile(built).text();
    const commentLines = text
      .split("\n")
      .filter((l) => l.includes('"comment text"'));
    expect(commentLines).toHaveLength(1);

    const parsed = parseProjectFile(text);
    expect(parsed.sessionComments.session_a).toBe("comment text");
  });

  it("stays valid JSON with no session comments", async () => {
    const text = await serializeProjectFile(
      buildProjectFile([], createDefaultIdentity(), {}),
    ).text();
    const parsed = parseProjectFile(text);
    expect(parsed.sessionComments).toEqual({});
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/projectFile.test.ts`
Expected: FAIL — `buildProjectFile` doesn't accept a 5th argument yet, and `ProjectFile` has no `sessionComments` field.

- [ ] **Step 3: Modify `src/data/projectFile.ts`**

In the `ProjectFile` interface, add a new field right after `notes`:

```ts
  /** Keyed by replay id, as stored in localStorage by notes.ts. */
  readonly notes: Readonly<Record<string, readonly MatchNote[]>>;
  /** Keyed by session id (SessionGroup.id, from data/session.ts), as stored in localStorage by
   * sessionComments.ts. */
  readonly sessionComments: Readonly<Record<string, string>>;
```

Replace the `buildProjectFile` function with:

```ts
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
```

Replace `serializeProjectFile` with:

```ts
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
```

In `parseProjectFile`, add `sessionComments` to the returned object, right after `notes`:

```ts
    notes: file.notes ?? {},
    sessionComments: file.sessionComments ?? {},
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/data/projectFile.test.ts`
Expected: PASS, including the four new tests and every pre-existing test in the file.

- [ ] **Step 5: Wire real export/import in `src/main.ts`**

Add this import near the existing `notes.js` import:

```ts
import { loadMatchNotes, saveMatchNotes, type MatchNote } from "./notes.js";
import { loadSessionComment, saveSessionComment } from "./sessionComments.js";
```

In the export handler, change:

```ts
const rows = await libraryStore.getAll();
const videoLinks: Record<string, VideoLinkData> = {};
const notes: Record<string, MatchNote[]> = {};
for (const row of rows) {
  const link = loadVideoLink(row.id);
  if (link) videoLinks[row.id] = link;
  const gameNotes = loadMatchNotes(row.id);
  if (gameNotes.length > 0) notes[row.id] = gameNotes;
}
const blob = serializeProjectFile(
  buildProjectFile(rows, libraryController.getIdentity(), videoLinks, notes),
);
```

to:

```ts
const rows = await libraryStore.getAll();
const videoLinks: Record<string, VideoLinkData> = {};
const notes: Record<string, MatchNote[]> = {};
for (const row of rows) {
  const link = loadVideoLink(row.id);
  if (link) videoLinks[row.id] = link;
  const gameNotes = loadMatchNotes(row.id);
  if (gameNotes.length > 0) notes[row.id] = gameNotes;
}
const sessions = groupGamesIntoSessions(
  libraryController.getSummaries(),
  libraryController.getIdentity(),
);
const sessionComments: Record<string, string> = {};
for (const session of sessions) {
  const comment = loadSessionComment(session.id);
  if (comment) sessionComments[session.id] = comment;
}
const blob = serializeProjectFile(
  buildProjectFile(
    rows,
    libraryController.getIdentity(),
    videoLinks,
    notes,
    sessionComments,
  ),
);
```

In the import handler, change:

```ts
for (const [id, gameNotes] of Object.entries(parsed.notes)) {
  saveMatchNotes(id, gameNotes);
}
```

to:

```ts
for (const [id, gameNotes] of Object.entries(parsed.notes)) {
  saveMatchNotes(id, gameNotes);
}
for (const [id, comment] of Object.entries(parsed.sessionComments)) {
  saveSessionComment(id, comment);
}
```

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/data/projectFile.ts src/main.ts src/data/projectFile.test.ts`
Expected: no errors.

- [ ] **Step 7: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, no regressions.

- [ ] **Step 8: Commit**

```bash
git add src/data/projectFile.ts src/main.ts src/data/projectFile.test.ts
git commit -m "Fold session comments into project export/import"
```

---

### Task 3: `src/i18n.ts` translation strings

**Files:**

- Modify: `src/i18n.ts`

**Interfaces:**

- Produces (added to the `Translations` interface, and both the English and Japanese `Translations` objects):
  - `sessionCommentTitle: string`
  - `sessionCommentPlaceholder: string`

- [ ] **Step 1: Modify the `Translations` interface**

Find:

```ts
sessionVideos: string;
sessionQuickSearches: string;
```

Replace with:

```ts
sessionVideos: string;
sessionCommentTitle: string;
sessionCommentPlaceholder: string;
sessionQuickSearches: string;
```

- [ ] **Step 2: Modify the English translations object**

Find:

```ts
    sessionVideos: "Video",
    sessionQuickSearches: "Quick searches",
```

Replace with:

```ts
    sessionVideos: "Video",
    sessionCommentTitle: "Session Comment",
    sessionCommentPlaceholder: "Write a comment about this session...",
    sessionQuickSearches: "Quick searches",
```

- [ ] **Step 3: Modify the Japanese translations object**

Find:

```ts
    sessionVideos: "動画",
    sessionQuickSearches: "クイック検索",
```

Replace with:

```ts
    sessionVideos: "動画",
    sessionCommentTitle: "セッションコメント",
    sessionCommentPlaceholder: "このセッションについてコメントを入力...",
    sessionQuickSearches: "クイック検索",
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Lint and format**

Run: `npx eslint src/i18n.ts && npx prettier --check src/i18n.ts`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/i18n.ts
git commit -m "Add session-comment translations"
```

---

### Task 4: Session page UI

**Files:**

- Modify: `index.html`
- Modify: `src/session/sessionView.ts`

**Interfaces:**

- Consumes: `loadSessionComment`/`saveSessionComment` (from `src/sessionComments.ts`, Task 1); `sessionCommentTitle`/`sessionCommentPlaceholder` (from `src/i18n.ts`, Task 3).

- [ ] **Step 1: Add CSS to `index.html`**

Find:

```css
.session-page-section h3 {
  font-size: 13px;
  margin: 0 0 8px;
}
```

Immediately after its closing `}`, insert:

```css
.session-comment-input {
  width: 100%;
  min-height: 64px;
  resize: vertical;
  font-family: inherit;
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid var(--panel-border);
  background: var(--card-bg);
  color: var(--text);
  box-sizing: border-box;
}
```

- [ ] **Step 2: Add the import to `src/session/sessionView.ts`**

Find:

```ts
import { searchHash, type SearchRouteCriteria } from "../router.js";
```

Immediately after it, insert:

```ts
import { loadSessionComment, saveSessionComment } from "../sessionComments.js";
```

- [ ] **Step 3: Add the comment section to the page template**

Find:

```ts
        <section class="session-page-header">
          <h2>${escapeHtml(session.opponentName)}</h2>
          <p class="session-page-meta">
            <span>${escapeHtml(dateStr)}</span>
            <span>${escapeHtml(tr.sessionRecord(session.wins, session.losses))}</span>
          </p>
        </section>
        <section class="session-page-section">
          <h3>${escapeHtml(tr.sessionQuickSearches)}</h3>
          <div id="sessionQuickSearchLinks" class="session-quick-search-links"></div>
        </section>
```

Replace with:

```ts
        <section class="session-page-header">
          <h2>${escapeHtml(session.opponentName)}</h2>
          <p class="session-page-meta">
            <span>${escapeHtml(dateStr)}</span>
            <span>${escapeHtml(tr.sessionRecord(session.wins, session.losses))}</span>
          </p>
        </section>
        <section class="session-page-section">
          <h3>${escapeHtml(tr.sessionCommentTitle)}</h3>
          <textarea
            id="sessionCommentInput"
            class="session-comment-input"
            placeholder="${escapeHtml(tr.sessionCommentPlaceholder)}"
          ></textarea>
        </section>
        <section class="session-page-section">
          <h3>${escapeHtml(tr.sessionQuickSearches)}</h3>
          <div id="sessionQuickSearchLinks" class="session-quick-search-links"></div>
        </section>
```

- [ ] **Step 4: Wire the textarea after the template renders**

Find:

```ts
const selectorEl = this.container.querySelector<HTMLElement>(
  "#sessionMatchupSelector",
);
```

Immediately before it, insert:

```ts
const commentEl = this.container.querySelector<HTMLTextAreaElement>(
  "#sessionCommentInput",
);
if (commentEl) {
  commentEl.value = loadSessionComment(session.id);
  commentEl.addEventListener("blur", () => {
    saveSessionComment(session.id, commentEl.value);
  });
}
```

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/session/sessionView.ts`
Expected: no errors.

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, no regressions.

- [ ] **Step 7: Manual browser check**

Start the dev preview, open a session page (`#/session/:id`). Confirm the "Session Comment" textarea appears right below the header, above "Quick searches". Type a comment, click elsewhere on the page to blur it, reload the page, and confirm the comment is still there. Clear the text, blur, reload, and confirm it's empty (not a lingering blank entry). Switch the matchup chip selector (which triggers a full `render()`) after typing a comment without blurring first - confirm the comment isn't lost, since chip clicks blur the textarea before the click handler runs. Export a project, clear local data, import it back, and confirm the session comment is restored.

- [ ] **Step 8: Commit**

```bash
git add index.html src/session/sessionView.ts
git commit -m "Add per-session free-text comment to the session page"
```

---

### Final check

- [ ] Run `npx vitest run` one more time for the whole suite.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npx eslint .` and `npx prettier --check .` across all changed files.
- [ ] Re-read `docs/superpowers/specs/2026-09-27-session-comment-design.md` once more and confirm every requirement has a corresponding change above: persistence (Task 1), export/import (Task 2), i18n (Task 3), UI placement and blur-to-save behavior (Task 4).
