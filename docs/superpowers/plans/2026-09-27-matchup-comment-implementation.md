# Matchup Comment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user write a single free-text comment per character matchup, always editable from the matchup page; also surface the Edge Guard Workshop link (currently only on the matchup page) anywhere the same stats are shown with both characters selected.

**Architecture:** A new `src/matchupComments.ts` module persists one plain string per matchup in localStorage, keyed by a directed character-ID pair (`myChar_oppChar`) rather than any existing stable id — and, since matchups aren't enumerated anywhere else in the app, it also owns its own export-time scan of localStorage. `src/matchup/matchupView.ts` gets the same always-editable textarea + blur-to-save + "Saved" indicator pattern the session comment already uses. Separately, `src/library/matchupStatsView.ts` (the shared stats-grid component already reused by both the home page and the session page) gains the same Edge Guard Workshop banner `matchupView.ts` already renders on its own page.

**Tech Stack:** TypeScript, Vite, Vitest, plain DOM — matches the rest of this codebase.

## Global Constraints

- Storage key prefix: `rmgr_matchup_comment_` + `<myChar>_<oppChar>`, mirroring `rmgr_session_comment_` in `src/sessionComments.ts`.
- A matchup has at most one comment: no array, no id field, no timestamps - just a string, same as a session comment.
- Saving an empty or whitespace-only comment removes the storage entry entirely (trimmed centrally, not left to callers).
- No separate view/edit state: the textarea is always editable, pre-filled from storage, and saves on `blur`, with a brief "Saved" indicator (same UX as the session comment).
- The matchup pair is directed: `(myChar, oppChar)` and `(oppChar, myChar)` have independent comments.
- The Edge Guard Workshop link, added to the shared `MatchupStatsView` component, appears on both the home page and the session page (per your explicit choice) - it depends only on the character pair, not the page.
- New i18n strings need both English and Japanese (`src/i18n.ts` has both locales for every existing key).

---

### Task 1: `src/matchupComments.ts` persistence module

**Files:**

- Create: `src/matchupComments.ts`
- Create: `src/matchupComments.test.ts`

**Interfaces:**

- Produces:
  - `function loadMatchupComment(myChar: number, oppChar: number): string`
  - `function saveMatchupComment(myChar: number, oppChar: number, text: string): void`
  - `function getAllMatchupComments(): Record<string, string>` (keyed `"myChar_oppChar"`, no storage prefix)
  - `function saveMatchupCommentByKey(key: string, text: string): void` (key format matches `getAllMatchupComments`'s output)

- [ ] **Step 1: Write `src/matchupComments.ts`**

```ts
/**
 * A single free-text comment per character matchup, persisted the same way session comments are
 * (src/sessionComments.ts) - but a matchup has no existing stable id the way a session
 * (SessionGroup.id) or a game (gameIdFor(...)) does: it's identified purely by the directed pair
 * of character ids in the route (myChar, oppChar - see src/router.ts's "matchup" route;
 * "directed" because "my Fox vs their Falco" and "my Falco vs their Fox" are different pages).
 * This module owns that key format itself. Matchups also aren't enumerated anywhere else in the
 * app the way sessions/games are, so export (see getAllMatchupComments) scans localStorage
 * directly for this prefix instead of the notes.ts/sessionComments.ts pattern of iterating a
 * known id list, and this is folded into project export/import (see src/data/projectFile.ts).
 */
const STORAGE_KEY_PREFIX = "rmgr_matchup_comment_";

function storageKey(myChar: number, oppChar: number): string {
  return `${STORAGE_KEY_PREFIX}${myChar}_${oppChar}`;
}

/** Returns "" if no comment is saved for this matchup. Never throws. */
export function loadMatchupComment(myChar: number, oppChar: number): string {
  try {
    return localStorage.getItem(storageKey(myChar, oppChar)) ?? "";
  } catch {
    return "";
  }
}

/** Saves `text` (trimmed) for this matchup. An empty/whitespace-only text removes the storage
 * entry entirely, the same way saveSessionComment does. */
export function saveMatchupComment(
  myChar: number,
  oppChar: number,
  text: string,
): void {
  try {
    const trimmed = text.trim();
    const key = storageKey(myChar, oppChar);
    if (trimmed.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, trimmed);
    }
  } catch {
    // Ignore localStorage write errors
  }
}

/**
 * Every saved matchup comment, keyed by "myChar_oppChar" (no storage prefix) - for project
 * export. Matchups aren't enumerated anywhere else in the app, so this scans localStorage
 * directly rather than being handed a list of known matchups to check.
 */
export function getAllMatchupComments(): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_KEY_PREFIX)) continue;
      const value = localStorage.getItem(key);
      if (value) result[key.slice(STORAGE_KEY_PREFIX.length)] = value;
    }
  } catch {
    // Ignore localStorage read errors
  }
  return result;
}

/** Restores a comment from an exported "myChar_oppChar" key (see getAllMatchupComments) - used
 * by project import. */
export function saveMatchupCommentByKey(key: string, text: string): void {
  if (!key) return;
  try {
    const trimmed = text.trim();
    const fullKey = STORAGE_KEY_PREFIX + key;
    if (trimmed.length === 0) {
      localStorage.removeItem(fullKey);
    } else {
      localStorage.setItem(fullKey, trimmed);
    }
  } catch {
    // Ignore localStorage write errors
  }
}
```

- [ ] **Step 2: Write `src/matchupComments.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  loadMatchupComment,
  saveMatchupComment,
  getAllMatchupComments,
  saveMatchupCommentByKey,
} from "./matchupComments.js";

describe("matchup comment persistence", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      get length() {
        return store.size;
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
    };
    (
      globalThis as unknown as { localStorage: typeof mockStorage }
    ).localStorage = mockStorage;
  });

  it("returns an empty string when nothing is saved", () => {
    expect(loadMatchupComment(2, 12)).toBe("");
  });

  it("saves and loads a comment for a matchup", () => {
    saveMatchupComment(2, 12, "Watch out for his up-smash");
    expect(loadMatchupComment(2, 12)).toBe("Watch out for his up-smash");
  });

  it("trims whitespace before saving", () => {
    saveMatchupComment(2, 12, "  padded text  ");
    expect(loadMatchupComment(2, 12)).toBe("padded text");
  });

  it("removes the storage entry when saving an empty string", () => {
    saveMatchupComment(2, 12, "something");
    saveMatchupComment(2, 12, "");
    expect(localStorage.getItem("rmgr_matchup_comment_2_12")).toBeNull();
    expect(loadMatchupComment(2, 12)).toBe("");
  });

  it("removes the storage entry when saving a whitespace-only string", () => {
    saveMatchupComment(2, 12, "something");
    saveMatchupComment(2, 12, "   \n  ");
    expect(loadMatchupComment(2, 12)).toBe("");
  });

  it("treats a matchup pair as directed - (2,12) and (12,2) are independent", () => {
    saveMatchupComment(2, 12, "my side");
    saveMatchupComment(12, 2, "their side");
    expect(loadMatchupComment(2, 12)).toBe("my side");
    expect(loadMatchupComment(12, 2)).toBe("their side");
  });

  it("overwrites an existing comment", () => {
    saveMatchupComment(2, 12, "first");
    saveMatchupComment(2, 12, "second");
    expect(loadMatchupComment(2, 12)).toBe("second");
  });

  describe("getAllMatchupComments", () => {
    it("returns an empty object when nothing is saved", () => {
      expect(getAllMatchupComments()).toEqual({});
    });

    it("returns every saved comment keyed by myChar_oppChar", () => {
      saveMatchupComment(2, 12, "comment a");
      saveMatchupComment(48, 50, "comment b");
      expect(getAllMatchupComments()).toEqual({
        "2_12": "comment a",
        "48_50": "comment b",
      });
    });

    it("does not include unrelated localStorage keys", () => {
      localStorage.setItem("rmgr_session_comment_session_x", "unrelated");
      saveMatchupComment(2, 12, "comment a");
      expect(getAllMatchupComments()).toEqual({ "2_12": "comment a" });
    });
  });

  describe("saveMatchupCommentByKey", () => {
    it("restores a comment from an exported key", () => {
      saveMatchupCommentByKey("2_12", "restored comment");
      expect(loadMatchupComment(2, 12)).toBe("restored comment");
    });

    it("is a no-op for an empty key", () => {
      saveMatchupCommentByKey("", "text");
      expect(getAllMatchupComments()).toEqual({});
    });
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/matchupComments.test.ts`
Expected: PASS, all 12 tests green.

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/matchupComments.ts src/matchupComments.test.ts`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/matchupComments.ts src/matchupComments.test.ts
git commit -m "Add src/matchupComments.ts: per-matchup free-text comment persistence"
```

---

### Task 2: Project export/import wiring

**Files:**

- Modify: `src/data/projectFile.ts`
- Modify: `src/main.ts`
- Modify: `src/data/projectFile.test.ts`

**Interfaces:**

- Consumes: `getAllMatchupComments`/`saveMatchupCommentByKey` (from `src/matchupComments.ts`, Task 1).
- Produces:
  - `ProjectFile.matchupComments: Readonly<Record<string, string>>`
  - `buildProjectFile(games, identity, videoLinks, notes, sessionComments, matchupComments = {})` — 6th param optional, defaults to `{}` so every existing call site keeps compiling unchanged.

- [ ] **Step 1: Add a failing test for the round trip**

In `src/data/projectFile.test.ts`, add this new `describe` block at the very end of the file (after the existing `describe("session comments export/import", ...)` block):

```ts
describe("matchup comments export/import", () => {
  it("round-trips comments keyed by matchup pair", () => {
    const built = buildProjectFile(
      [storedGame("a")],
      createDefaultIdentity(),
      {},
      {},
      {},
      { "2_12": "Watch out for his up-smash" },
    );
    const parsed = parseProjectFile(JSON.stringify(built));
    expect(parsed.matchupComments["2_12"]).toBe("Watch out for his up-smash");
  });

  it("defaults to no matchup comments when the 6th argument is omitted", () => {
    const built = buildProjectFile(
      [storedGame("a")],
      createDefaultIdentity(),
      {},
    );
    expect(built.matchupComments).toEqual({});
  });

  it("puts each matchup's comment on its own line, and still parses", async () => {
    const built = buildProjectFile(
      [storedGame("a"), storedGame("b")],
      createDefaultIdentity(),
      {},
      {},
      {},
      { "2_12": "comment text" },
    );
    const text = await serializeProjectFile(built).text();
    const commentLines = text
      .split("\n")
      .filter((l) => l.includes('"comment text"'));
    expect(commentLines).toHaveLength(1);

    const parsed = parseProjectFile(text);
    expect(parsed.matchupComments["2_12"]).toBe("comment text");
  });

  it("stays valid JSON with no matchup comments", async () => {
    const text = await serializeProjectFile(
      buildProjectFile([], createDefaultIdentity(), {}),
    ).text();
    const parsed = parseProjectFile(text);
    expect(parsed.matchupComments).toEqual({});
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/projectFile.test.ts`
Expected: FAIL — `buildProjectFile` doesn't accept a 6th argument yet, and `ProjectFile` has no `matchupComments` field.

- [ ] **Step 3: Modify `src/data/projectFile.ts`**

In the `ProjectFile` interface, add a new field right after `sessionComments`:

```ts
  /** Keyed by session id (SessionGroup.id, from data/session.ts), as stored in localStorage by
   * sessionComments.ts. */
  readonly sessionComments: Readonly<Record<string, string>>;
  /** Keyed by "myChar_oppChar" (a directed character-id pair, from router.ts's matchup route),
   * as stored in localStorage by matchupComments.ts. */
  readonly matchupComments: Readonly<Record<string, string>>;
```

Replace the `buildProjectFile` function with:

```ts
export function buildProjectFile(
  games: readonly StoredGame[],
  identity: Identity,
  videoLinks: Readonly<Record<string, VideoLinkData>>,
  notes: Readonly<Record<string, readonly MatchNote[]>> = {},
  sessionComments: Readonly<Record<string, string>> = {},
  matchupComments: Readonly<Record<string, string>> = {},
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
    matchupComments,
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
  const matchupComments = listLines(
    Object.entries(file.matchupComments).map(
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
    `  },`,
    `  "matchupComments": {`,
    matchupComments,
    `  }`,
    "}",
    "",
  ]
    // Drop the empty line an empty games/videoLinks/notes/sessionComments/matchupComments list
    // would leave behind.
    .filter((line) => line !== "")
    .join("\n")
    .concat("\n");

  return new Blob([text], { type: "application/json" });
}
```

In `parseProjectFile`, add `matchupComments` to the returned object, right after `sessionComments`:

```ts
    sessionComments: file.sessionComments ?? {},
    matchupComments: file.matchupComments ?? {},
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/data/projectFile.test.ts`
Expected: PASS, including the four new tests and every pre-existing test in the file.

- [ ] **Step 5: Wire real export/import in `src/main.ts`**

Add this import near the existing `sessionComments.js` import:

```ts
import { loadSessionComment, saveSessionComment } from "./sessionComments.js";
import {
  getAllMatchupComments,
  saveMatchupCommentByKey,
} from "./matchupComments.js";
```

In the export handler, change:

```ts
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

to:

```ts
const sessions = groupGamesIntoSessions(
  libraryController.getSummaries(),
  libraryController.getIdentity(),
);
const sessionComments: Record<string, string> = {};
for (const session of sessions) {
  const comment = loadSessionComment(session.id);
  if (comment) sessionComments[session.id] = comment;
}
const matchupComments = getAllMatchupComments();
const blob = serializeProjectFile(
  buildProjectFile(
    rows,
    libraryController.getIdentity(),
    videoLinks,
    notes,
    sessionComments,
    matchupComments,
  ),
);
```

In the import handler, change:

```ts
for (const [id, comment] of Object.entries(parsed.sessionComments)) {
  saveSessionComment(id, comment);
}
```

to:

```ts
for (const [id, comment] of Object.entries(parsed.sessionComments)) {
  saveSessionComment(id, comment);
}
for (const [key, comment] of Object.entries(parsed.matchupComments)) {
  saveMatchupCommentByKey(key, comment);
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
git commit -m "Fold matchup comments into project export/import"
```

---

### Task 3: `src/i18n.ts` translation strings

**Files:**

- Modify: `src/i18n.ts`

**Interfaces:**

- Produces (added to the `Translations` interface, and both the English and Japanese `Translations` objects):
  - `matchupCommentTitle: string`
  - `matchupCommentPlaceholder: string`
  - `matchupCommentSaved: string`

- [ ] **Step 1: Modify the `Translations` interface**

Find:

```ts
matchupStatsSectionTitle: string;
matchupGamesSectionTitle: string;
```

Replace with:

```ts
matchupStatsSectionTitle: string;
matchupCommentTitle: string;
matchupCommentPlaceholder: string;
matchupCommentSaved: string;
matchupGamesSectionTitle: string;
```

- [ ] **Step 2: Modify the English translations object**

Find:

```ts
    matchupStatsSectionTitle: "STATS",
    matchupGamesSectionTitle: "GAMES",
```

Replace with:

```ts
    matchupStatsSectionTitle: "STATS",
    matchupCommentTitle: "Matchup Comment",
    matchupCommentPlaceholder: "Write a comment about this matchup...",
    matchupCommentSaved: "Saved",
    matchupGamesSectionTitle: "GAMES",
```

- [ ] **Step 3: Modify the Japanese translations object**

Find:

```ts
    matchupStatsSectionTitle: "統計",
    matchupGamesSectionTitle: "試合一覧",
```

Replace with:

```ts
    matchupStatsSectionTitle: "統計",
    matchupCommentTitle: "対戦カードコメント",
    matchupCommentPlaceholder: "この対戦カードについてコメントを入力...",
    matchupCommentSaved: "保存しました",
    matchupGamesSectionTitle: "試合一覧",
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
git commit -m "Add matchup-comment translations"
```

---

### Task 4: Matchup page UI

**Files:**

- Modify: `index.html`
- Modify: `src/matchup/matchupView.ts`

**Interfaces:**

- Consumes: `loadMatchupComment`/`saveMatchupComment` (from `src/matchupComments.ts`, Task 1); `matchupCommentTitle`/`matchupCommentPlaceholder`/`matchupCommentSaved` (from `src/i18n.ts`, Task 3).

- [ ] **Step 1: Add CSS to `index.html`**

Find:

```css
.matchup-link-btn:hover {
  opacity: 0.8;
}
```

Immediately after its closing `}`, insert:

```css
.matchup-comment-section {
  margin: 12px 0;
}
.matchup-comment-section h3 {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-dim);
  margin: 0 0 8px;
}
.matchup-comment-input {
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
.matchup-comment-saved {
  display: inline-block;
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-dim);
  opacity: 0;
  transition: opacity 0.3s;
}
.matchup-comment-saved.visible {
  opacity: 1;
}
```

- [ ] **Step 2: Add the import to `src/matchup/matchupView.ts`**

Find:

```ts
import type { SessionGroup } from "../data/session.js";
```

Immediately after it, insert:

```ts
import { loadMatchupComment, saveMatchupComment } from "../matchupComments.js";
```

- [ ] **Step 3: Add the comment section to the page template**

Find:

```ts
        <div class="matchup-stats-grid">
          ${statCard(tr.recovCol, fmtPooled(rates.recoverySuccesses, rates.recoveryTotal), excludedRecovery > 0 ? tr.matchupExcludedGames(excludedRecovery) : "")}
          ${statCard(tr.matchupEdgeGuardEffectivenessLabel, fmtGrade(rates.edgeGuardEffectivenessAvg, rates.edgeGuardEffectivenessCount, tr), "")}
          ${statCard(tr.matchupEdgeGuardConversionLabel, fmtPooled(rates.edgeGuardConversionKills, rates.edgeGuardConversionTotal), "")}
          ${statCard(tr.ledgeGCol, fmtPooled(rates.ledgeGetupSuccesses, rates.ledgeGetupTotal), "")}
          ${statCard(tr.ledgeTCol, fmtPooled(rates.ledgeTrapSuccesses, rates.ledgeTrapTotal), "")}
          ${statCard(tr.matchupOpeningShareLabel, rates.openingShare !== null ? fmtPooled(rates.openingsWon, rates.openingsWon + rates.openingsLost) : "—", "")}
          ${statCard(tr.matchupDamagePerOpeningLabel, rates.damagePerOpening !== null ? `${rates.damagePerOpening.toFixed(1)}%` : "—", "")}
          ${statCard(tr.matchupKillConversionLabel, fmtPooled(rates.openingsConvertedToKill, rates.openingsWon), "")}
          ${statCard(tr.nhPerStockCol, fmtHits(rates.neutralHitsPerStock, rates.stocksTaken, tr), "")}
        </div>

        <div class="matchup-workshop-banner">
```

Replace with:

```ts
        <div class="matchup-stats-grid">
          ${statCard(tr.recovCol, fmtPooled(rates.recoverySuccesses, rates.recoveryTotal), excludedRecovery > 0 ? tr.matchupExcludedGames(excludedRecovery) : "")}
          ${statCard(tr.matchupEdgeGuardEffectivenessLabel, fmtGrade(rates.edgeGuardEffectivenessAvg, rates.edgeGuardEffectivenessCount, tr), "")}
          ${statCard(tr.matchupEdgeGuardConversionLabel, fmtPooled(rates.edgeGuardConversionKills, rates.edgeGuardConversionTotal), "")}
          ${statCard(tr.ledgeGCol, fmtPooled(rates.ledgeGetupSuccesses, rates.ledgeGetupTotal), "")}
          ${statCard(tr.ledgeTCol, fmtPooled(rates.ledgeTrapSuccesses, rates.ledgeTrapTotal), "")}
          ${statCard(tr.matchupOpeningShareLabel, rates.openingShare !== null ? fmtPooled(rates.openingsWon, rates.openingsWon + rates.openingsLost) : "—", "")}
          ${statCard(tr.matchupDamagePerOpeningLabel, rates.damagePerOpening !== null ? `${rates.damagePerOpening.toFixed(1)}%` : "—", "")}
          ${statCard(tr.matchupKillConversionLabel, fmtPooled(rates.openingsConvertedToKill, rates.openingsWon), "")}
          ${statCard(tr.nhPerStockCol, fmtHits(rates.neutralHitsPerStock, rates.stocksTaken, tr), "")}
        </div>

        <section class="matchup-comment-section">
          <h3>${escapeHtml(tr.matchupCommentTitle)}</h3>
          <textarea
            id="matchupCommentInput"
            class="matchup-comment-input"
            placeholder="${escapeHtml(tr.matchupCommentPlaceholder)}"
          ></textarea>
          <span id="matchupCommentSaved" class="matchup-comment-saved">${escapeHtml(
            tr.matchupCommentSaved,
          )}</span>
        </section>

        <div class="matchup-workshop-banner">
```

- [ ] **Step 4: Wire the textarea after the template renders**

Find:

```ts
const gameListWrap = this.container.querySelector(
  "#matchupGameListWrap",
) as HTMLElement;
```

Immediately before it, insert:

```ts
const commentEl = this.container.querySelector<HTMLTextAreaElement>(
  "#matchupCommentInput",
);
const commentSavedEl = this.container.querySelector<HTMLElement>(
  "#matchupCommentSaved",
);
if (commentEl) {
  commentEl.value = loadMatchupComment(myChar, oppChar);
  commentEl.addEventListener("blur", () => {
    saveMatchupComment(myChar, oppChar, commentEl.value);
    if (commentSavedEl) {
      commentSavedEl.classList.add("visible");
      setTimeout(() => commentSavedEl.classList.remove("visible"), 2000);
    }
  });
}
```

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/matchup/matchupView.ts`
Expected: no errors.

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, no regressions.

- [ ] **Step 7: Manual browser check**

Start the dev preview, navigate to a matchup page (`#/matchup/2/12`, using whatever character ids exist in your library data). Confirm the "Matchup Comment" textarea appears right below the stats grid, above the Edge Guard Workshop banner. Type a comment, blur, reload, confirm it persisted. Navigate to the reversed pairing (`#/matchup/12/2`) and confirm it has its own, independent (empty) comment. Clear a comment, blur, reload, confirm it's empty (not a lingering blank entry).

- [ ] **Step 8: Commit**

```bash
git add index.html src/matchup/matchupView.ts
git commit -m "Add per-matchup free-text comment to the matchup page"
```

---

### Task 5: Edge Guard Workshop link on the shared matchup stats view

**Files:**

- Modify: `src/library/matchupStatsView.ts`

**Interfaces:**

- Consumes: none new (uses `tr.matchupEdgeGuardWorkshopBtn`, which already exists in `src/i18n.ts`).

- [ ] **Step 1: Add the workshop banner to `MatchupStatsView.render()`**

Find:

```ts
        ${microStatsSectionHtml(rates, tr)}
      </div>
    `;
  }
}
```

Replace with:

```ts
        ${microStatsSectionHtml(rates, tr)}

        <div class="matchup-workshop-banner">
          <a href="#/matchup/${myChar}/${oppChar}/recoveries" class="matchup-workshop-btn">
            <span class="matchup-workshop-btn-icon">🎯</span>
            <span class="matchup-workshop-btn-text">
              <span class="matchup-workshop-btn-title">${escapeHtml(tr.matchupEdgeGuardWorkshopBtn)}</span>
              <span class="matchup-workshop-btn-desc">Visualize recovery starting positions & replay edge guards</span>
            </span>
            <span class="matchup-workshop-btn-arrow">&rarr;</span>
          </a>
        </div>
      </div>
    `;
  }
}
```

(This reuses the exact same markup and CSS classes `src/matchup/matchupView.ts` already renders on its own page - `.matchup-workshop-banner`/`.matchup-workshop-btn*` are already styled in `index.html`, so no new CSS is needed. The banner's `id="matchupWorkshopBtn"` from `matchupView.ts`'s copy is intentionally omitted here since nothing reads that id and `MatchupStatsView` can be instantiated more than once across the app's lifetime - an unused id isn't worth carrying over. The English-only `.matchup-workshop-btn-desc` text is copied verbatim, including its existing lack of i18n - a pre-existing gap in `matchupView.ts`, not something to fix here.)

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/library/matchupStatsView.ts`
Expected: no errors.

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, no regressions.

- [ ] **Step 4: Manual browser check**

Start the dev preview. On the home/library page, select both your character and an opponent character in the matchup chip selector - confirm the Edge Guard Workshop banner now appears below the stats grid (and micro-stats disclosure, if present) and links to `#/matchup/<myChar>/<oppChar>/recoveries`. Open a session page and select a matchup chip there too - confirm the same banner appears in the session's matchup stats box. Confirm the actual matchup page (`#/matchup/:myChar/:oppChar`) still shows exactly one banner (its own, from `matchupView.ts` - unchanged by this task), not two.

- [ ] **Step 5: Commit**

```bash
git add src/library/matchupStatsView.ts
git commit -m "Show Edge Guard Workshop link wherever matchup stats appear with both characters selected"
```

---

### Final check

- [ ] Run `npx vitest run` one more time for the whole suite.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npx eslint .` and `npx prettier --check .` across the whole repo (not just changed files - a prior PR in this project broke CI by only checking changed files and missing stray formatting elsewhere).
- [ ] Re-read `docs/superpowers/specs/2026-09-27-matchup-comment-design.md` once more and confirm every requirement has a corresponding change above: persistence (Task 1), export/import (Task 2), i18n (Task 3), UI placement and blur-to-save behavior (Task 4). Task 5 (the workshop link) was requested mid-implementation and isn't in that spec, but is covered by the design decision recorded in this plan's Global Constraints.
