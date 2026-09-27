# Match Notes (Timestamped Annotations) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user write timestamped free-text notes on a match, surfaced in the Neutral Analysis panel — anchored to a specific neutral-interaction row, or dropped freely at the current playback frame.

**Architecture:** A new `src/notes.ts` module persists notes per game in localStorage, exactly like `src/video/youtubeSync.ts` persists video links. `src/match/matchView.ts`'s Neutral Analysis panel (`renderNeutralHitsPanel`) is rewritten to render a single chronologically-sorted list mixing `NeutralHitEvent` rows and `MatchNote` blocks, gated by three independent toggle chips (Win/Loss/Comments) instead of the current single-select All/Openings/Punishes tabs. Notes are folded into the existing project export/import flow (`src/data/projectFile.ts`, `src/main.ts`) alongside video links.

**Tech Stack:** TypeScript, Vite, Vitest, plain DOM (no framework) — matches the rest of this codebase.

## Global Constraints

- Storage key prefix for notes: `rmgr_notes_` + game id (one JSON array per game), mirroring `rmgr_yt_link_` in `src/video/youtubeSync.ts`.
- "Win" toggle (was "Openings") starts **off** by default. "Loss" toggle (was "Punishes") and "Comments" toggle both start **on** by default.
- One note per neutral-interaction row: creating an anchored note when one already exists replaces it (upsert by the event's `frameIndex`), never adds a second.
- No confirmation dialog on delete.
- Clicking a note's text always opens it for editing — freeform note rows do **not** seek playback on click (unlike event rows).
- An anchored note's visibility is controlled only by the Comments toggle, not by Win/Loss (it always accompanies its row whenever Comments is on, regardless of whether Win or Loss is on).
- New/renamed i18n strings need both English and Japanese (`src/i18n.ts` has both locales for every existing key).
- Follow existing codebase conventions: `t()` for translated strings, `document.createElement` DOM building (no template literals with untrusted content beyond the existing `escapeHtml` usages elsewhere), `localStorage` wrapped in try/catch.

---

### Task 1: `src/notes.ts` persistence module

**Files:**

- Create: `src/notes.ts`
- Create: `src/notes.test.ts`

**Interfaces:**

- Produces:
  - `interface MatchNote { readonly id: string; readonly frameIndex: number; readonly text: string; readonly eventFrameIndex?: number; readonly createdAt: number; readonly updatedAt: number; }`
  - `function loadMatchNotes(gameId: string): MatchNote[]`
  - `function saveMatchNotes(gameId: string, notes: readonly MatchNote[]): void`
  - `function upsertAnchoredNote(gameId: string, eventFrameIndex: number, text: string): MatchNote[]`
  - `function addFreeformNote(gameId: string, frameIndex: number, text: string): MatchNote[]`
  - `function updateNoteText(gameId: string, noteId: string, text: string): MatchNote[]`
  - `function deleteMatchNote(gameId: string, noteId: string): MatchNote[]`

- [ ] **Step 1: Write `src/notes.ts`**

```ts
/**
 * Timestamped free-text annotations on a match, persisted per game the same
 * way src/video/youtubeSync.ts persists video links - one JSON blob in
 * localStorage per game id, folded into project export/import (see
 * src/data/projectFile.ts).
 */
export interface MatchNote {
  readonly id: string;
  readonly frameIndex: number;
  readonly text: string;
  /** Present = anchored to the NeutralHitEvent whose frameIndex matches this
   * value (one note per event, enforced by upsertAnchoredNote's upsert-by-
   * eventFrameIndex below). Absent = a freeform note, placed wherever the
   * user was paused/playing when they added it. */
  readonly eventFrameIndex?: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

const STORAGE_KEY_PREFIX = "rmgr_notes_";

/** Loads all notes saved for a game, oldest first (insertion order). Never throws. */
export function loadMatchNotes(gameId: string): MatchNote[] {
  if (!gameId) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + gameId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is MatchNote =>
        n &&
        typeof n === "object" &&
        typeof n.id === "string" &&
        typeof n.frameIndex === "number" &&
        typeof n.text === "string",
    );
  } catch {
    return [];
  }
}

/** Overwrites the full note list for a game. An empty list removes the storage entry entirely. */
export function saveMatchNotes(
  gameId: string,
  notes: readonly MatchNote[],
): void {
  if (!gameId) return;
  try {
    if (notes.length === 0) {
      localStorage.removeItem(STORAGE_KEY_PREFIX + gameId);
    } else {
      localStorage.setItem(STORAGE_KEY_PREFIX + gameId, JSON.stringify(notes));
    }
  } catch {
    // Ignore localStorage write errors
  }
}

function newNoteId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Creates or replaces the single note anchored to `eventFrameIndex` - at
 * most one note per neutral-interaction row, per the design (see
 * docs/superpowers/specs/2026-09-27-match-notes-design.md). Returns the
 * game's full, already-saved note list.
 */
export function upsertAnchoredNote(
  gameId: string,
  eventFrameIndex: number,
  text: string,
): MatchNote[] {
  const notes = loadMatchNotes(gameId);
  const now = Date.now();
  const existing = notes.find((n) => n.eventFrameIndex === eventFrameIndex);
  const updated: MatchNote = existing
    ? { ...existing, text, updatedAt: now }
    : {
        id: newNoteId(),
        frameIndex: eventFrameIndex,
        eventFrameIndex,
        text,
        createdAt: now,
        updatedAt: now,
      };
  const next = existing
    ? notes.map((n) => (n.id === existing.id ? updated : n))
    : [...notes, updated];
  saveMatchNotes(gameId, next);
  return next;
}

/**
 * Adds a new freeform note at `frameIndex` - always creates a new note,
 * never upserts (unlike upsertAnchoredNote), since freeform notes have no
 * natural one-per-key identity to merge on. Returns the game's full,
 * already-saved note list.
 */
export function addFreeformNote(
  gameId: string,
  frameIndex: number,
  text: string,
): MatchNote[] {
  const notes = loadMatchNotes(gameId);
  const now = Date.now();
  const note: MatchNote = {
    id: newNoteId(),
    frameIndex,
    text,
    createdAt: now,
    updatedAt: now,
  };
  const next = [...notes, note];
  saveMatchNotes(gameId, next);
  return next;
}

/** Updates an existing note's text by id. A no-op (returns the list unchanged) if noteId isn't found. */
export function updateNoteText(
  gameId: string,
  noteId: string,
  text: string,
): MatchNote[] {
  const notes = loadMatchNotes(gameId);
  const now = Date.now();
  const next = notes.map((n) =>
    n.id === noteId ? { ...n, text, updatedAt: now } : n,
  );
  saveMatchNotes(gameId, next);
  return next;
}

/** Removes a note by id. A no-op if noteId isn't found. */
export function deleteMatchNote(gameId: string, noteId: string): MatchNote[] {
  const notes = loadMatchNotes(gameId);
  const next = notes.filter((n) => n.id !== noteId);
  saveMatchNotes(gameId, next);
  return next;
}
```

- [ ] **Step 2: Write `src/notes.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  loadMatchNotes,
  saveMatchNotes,
  upsertAnchoredNote,
  addFreeformNote,
  updateNoteText,
  deleteMatchNote,
  type MatchNote,
} from "./notes.js";

describe("match notes persistence", () => {
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

  it("returns an empty array when nothing is saved", () => {
    expect(loadMatchNotes("game-1")).toEqual([]);
  });

  it("saves and loads notes for a game", () => {
    const note: MatchNote = {
      id: "n1",
      frameIndex: 120,
      text: "hello",
      createdAt: 1,
      updatedAt: 1,
    };
    saveMatchNotes("game-1", [note]);
    expect(loadMatchNotes("game-1")).toEqual([note]);
  });

  it("removes the storage entry when saving an empty array", () => {
    saveMatchNotes("game-1", [
      { id: "n1", frameIndex: 0, text: "x", createdAt: 1, updatedAt: 1 },
    ]);
    saveMatchNotes("game-1", []);
    expect(localStorage.getItem("rmgr_notes_game-1")).toBeNull();
  });

  it("keeps notes for different games separate", () => {
    addFreeformNote("game-1", 10, "note for game 1");
    addFreeformNote("game-2", 20, "note for game 2");
    expect(loadMatchNotes("game-1")).toHaveLength(1);
    expect(loadMatchNotes("game-2")).toHaveLength(1);
    expect(loadMatchNotes("game-1")[0]!.text).toBe("note for game 1");
  });

  describe("upsertAnchoredNote", () => {
    it("creates a new anchored note", () => {
      const notes = upsertAnchoredNote("game-1", 500, "opening comment");
      expect(notes).toHaveLength(1);
      expect(notes[0]!.eventFrameIndex).toBe(500);
      expect(notes[0]!.frameIndex).toBe(500);
      expect(notes[0]!.text).toBe("opening comment");
    });

    it("replaces the existing note for the same eventFrameIndex instead of adding a second one", () => {
      upsertAnchoredNote("game-1", 500, "first draft");
      const notes = upsertAnchoredNote("game-1", 500, "revised");
      expect(notes).toHaveLength(1);
      expect(notes[0]!.text).toBe("revised");
    });

    it("keeps notes anchored to different events separate", () => {
      upsertAnchoredNote("game-1", 500, "a");
      const notes = upsertAnchoredNote("game-1", 900, "b");
      expect(notes).toHaveLength(2);
    });
  });

  describe("addFreeformNote", () => {
    it("always adds a new note, even at a repeated frame index", () => {
      addFreeformNote("game-1", 300, "first");
      const notes = addFreeformNote("game-1", 300, "second");
      expect(notes).toHaveLength(2);
      expect(notes.map((n) => n.text)).toEqual(["first", "second"]);
    });

    it("does not set eventFrameIndex", () => {
      const notes = addFreeformNote("game-1", 300, "freeform");
      expect(notes[0]!.eventFrameIndex).toBeUndefined();
    });
  });

  describe("updateNoteText", () => {
    it("updates the text of an existing note by id", () => {
      const [created] = addFreeformNote("game-1", 300, "original");
      const notes = updateNoteText("game-1", created!.id, "edited");
      expect(notes[0]!.text).toBe("edited");
      expect(notes[0]!.id).toBe(created!.id);
    });

    it("is a no-op for an unknown note id", () => {
      addFreeformNote("game-1", 300, "original");
      const notes = updateNoteText("game-1", "does-not-exist", "edited");
      expect(notes).toHaveLength(1);
      expect(notes[0]!.text).toBe("original");
    });
  });

  describe("deleteMatchNote", () => {
    it("removes a note by id", () => {
      const [created] = addFreeformNote("game-1", 300, "to delete");
      const notes = deleteMatchNote("game-1", created!.id);
      expect(notes).toHaveLength(0);
      expect(loadMatchNotes("game-1")).toHaveLength(0);
    });
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run src/notes.test.ts`
Expected: PASS, all tests in the new file green.

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/notes.ts src/notes.test.ts`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/notes.ts src/notes.test.ts
git commit -m "Add src/notes.ts: per-game timestamped match notes persistence"
```

---

### Task 2: Project export/import wiring

**Files:**

- Modify: `src/data/projectFile.ts`
- Modify: `src/main.ts`
- Modify: `src/data/projectFile.test.ts`

**Interfaces:**

- Consumes: `MatchNote` (from `src/notes.ts`, Task 1), `loadMatchNotes`/`saveMatchNotes` (from `src/notes.ts`, Task 1).
- Produces:
  - `ProjectFile.notes: Readonly<Record<string, readonly MatchNote[]>>`
  - `buildProjectFile(games, identity, videoLinks, notes = {})` — 4th param optional, defaults to `{}` so every existing 3-arg call site keeps compiling unchanged.

- [ ] **Step 1: Add a failing test for the round trip**

In `src/data/projectFile.test.ts`, add this new `describe` block after the existing `describe("mergeProjectFile", ...)` block (i.e. at the end of the file, before the final closing):

```ts
describe("notes export/import", () => {
  it("round-trips notes keyed by game id", () => {
    const note = {
      id: "n1",
      frameIndex: 120,
      text: "hello",
      createdAt: 1,
      updatedAt: 1,
    };
    const built = buildProjectFile(
      [storedGame("a")],
      createDefaultIdentity(),
      {},
      { a: [note] },
    );
    const parsed = parseProjectFile(JSON.stringify(built));
    expect(parsed.notes.a).toEqual([note]);
  });

  it("defaults to no notes when the 4th argument is omitted", () => {
    const built = buildProjectFile(
      [storedGame("a")],
      createDefaultIdentity(),
      {},
    );
    expect(built.notes).toEqual({});
  });

  it("puts each game's notes on its own line, and still parses", async () => {
    const note = {
      id: "n1",
      frameIndex: 10,
      text: "note text",
      createdAt: 1,
      updatedAt: 1,
    };
    const built = buildProjectFile(
      [storedGame("a"), storedGame("b")],
      createDefaultIdentity(),
      {},
      { a: [note] },
    );
    const text = await serializeProjectFile(built).text();
    const noteLines = text.split("\n").filter((l) => l.includes('"note text"'));
    expect(noteLines).toHaveLength(1);

    const parsed = parseProjectFile(text);
    expect(parsed.notes.a?.[0]?.text).toBe("note text");
  });

  it("stays valid JSON with no notes", async () => {
    const text = await serializeProjectFile(
      buildProjectFile([], createDefaultIdentity(), {}),
    ).text();
    const parsed = parseProjectFile(text);
    expect(parsed.notes).toEqual({});
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/projectFile.test.ts`
Expected: FAIL — `buildProjectFile` doesn't accept a 4th argument yet, and `ProjectFile` has no `notes` field (TypeScript compile error surfaced by vitest/esbuild, or a runtime `undefined` mismatch).

- [ ] **Step 3: Modify `src/data/projectFile.ts`**

Add the import at the top of the file, alongside the existing `VideoLinkData` import:

```ts
import type { VideoLinkData } from "../video/youtubeSync.js";
import type { MatchNote } from "../notes.js";
```

In the `ProjectFile` interface, add a new field right after `videoLinks`:

```ts
  /** Keyed by replay id, as stored in localStorage by youtubeSync.ts. */
  readonly videoLinks: Readonly<Record<string, VideoLinkData>>;
  /** Keyed by replay id, as stored in localStorage by notes.ts. */
  readonly notes: Readonly<Record<string, readonly MatchNote[]>>;
```

Replace the `buildProjectFile` function with:

```ts
export function buildProjectFile(
  games: readonly StoredGame[],
  identity: Identity,
  videoLinks: Readonly<Record<string, VideoLinkData>>,
  notes: Readonly<Record<string, readonly MatchNote[]>> = {},
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
    `  }`,
    "}",
    "",
  ]
    // Drop the empty line an empty games/videoLinks/notes list would leave behind.
    .filter((line) => line !== "")
    .join("\n")
    .concat("\n");

  return new Blob([text], { type: "application/json" });
}
```

In `parseProjectFile`, add `notes` to the returned object, right after `videoLinks`:

```ts
    videoLinks: file.videoLinks ?? {},
    notes: file.notes ?? {},
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/data/projectFile.test.ts`
Expected: PASS, including the four new tests and every pre-existing test in the file.

- [ ] **Step 5: Wire real export/import in `src/main.ts`**

Add this import near the existing `youtubeSync.js` import block:

```ts
import { loadMatchNotes, saveMatchNotes, type MatchNote } from "./notes.js";
```

In the export handler, change:

```ts
  exportProjectBtn?.addEventListener("click", () => {
    void (async () => {
      if (!libraryStore) return;
      const rows = await libraryStore.getAll();
      const videoLinks: Record<string, VideoLinkData> = {};
      for (const row of rows) {
        const link = loadVideoLink(row.id);
        if (link) videoLinks[row.id] = link;
      }
      const blob = serializeProjectFile(
        buildProjectFile(rows, libraryController.getIdentity(), videoLinks),
      );
```

to:

```ts
  exportProjectBtn?.addEventListener("click", () => {
    void (async () => {
      if (!libraryStore) return;
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
        buildProjectFile(
          rows,
          libraryController.getIdentity(),
          videoLinks,
          notes,
        ),
      );
```

In the import handler, change:

```ts
const parsed = parseProjectFile(await file.text());
const result = await mergeProjectFile(parsed, libraryStore);
saveIdentity(identityOf(parsed));
for (const [id, link] of Object.entries(parsed.videoLinks)) {
  saveVideoLink(id, link);
}
```

to:

```ts
const parsed = parseProjectFile(await file.text());
const result = await mergeProjectFile(parsed, libraryStore);
saveIdentity(identityOf(parsed));
for (const [id, link] of Object.entries(parsed.videoLinks)) {
  saveVideoLink(id, link);
}
for (const [id, gameNotes] of Object.entries(parsed.notes)) {
  saveMatchNotes(id, gameNotes);
}
```

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/data/projectFile.ts src/main.ts src/data/projectFile.test.ts`
Expected: no errors.

- [ ] **Step 7: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, no regressions in any other file (`videoLinks`-related tests especially, since `buildProjectFile`'s signature changed).

- [ ] **Step 8: Commit**

```bash
git add src/data/projectFile.ts src/main.ts src/data/projectFile.test.ts
git commit -m "Fold match notes into project export/import, alongside video links"
```

---

### Task 3: `src/i18n.ts` translation strings

**Files:**

- Modify: `src/i18n.ts`

**Interfaces:**

- Produces (added to the `Translations` interface, and both the English and Japanese `Translations` objects):
  - `neutralFilterWin: (count: number) => string` (replaces `neutralFilterOpenings`)
  - `neutralFilterLoss: (count: number) => string` (replaces `neutralFilterPunishes`)
  - `neutralFilterComments: (count: number) => string` (new)
  - `addNoteButtonTitle: string` (new — footer "add note" button tooltip)
  - `addNoteRowTitle: string` (new — hover speech-bubble button tooltip)
  - `notePlaceholder: string` (new — composer textarea placeholder)
  - `noteSaveButton: string` (new)
  - `noteCancelButton: string` (new)
  - `noteEditTitle: string` (new — note text tooltip)
  - `noteDeleteTitle: string` (new — trash icon tooltip)
  - Removed: `neutralFilterAll`, `noNeutralOpeningsLanded`, `noNeutralPunishesTaken` (the "All" tab and its two now-unreachable empty-state strings go away with the single-select filter).

- [ ] **Step 1: Modify the `Translations` interface**

Find this block (around line 449-458):

```ts
// Neutral Openings widget
neutralHitsWidgetTitle: string;
neutralFilterAll: (count: number) => string;
neutralFilterOpenings: (count: number) => string;
neutralFilterPunishes: (count: number) => string;
neutralOpeningsGroupTitle: (count: number) => string;
neutralPunishesGroupTitle: (count: number) => string;
noNeutralHits: string;
noNeutralOpeningsLanded: string;
noNeutralPunishesTaken: string;
```

Replace it with:

```ts
// Neutral Openings widget
neutralHitsWidgetTitle: string;
neutralFilterWin: (count: number) => string;
neutralFilterLoss: (count: number) => string;
neutralFilterComments: (count: number) => string;
neutralOpeningsGroupTitle: (count: number) => string;
neutralPunishesGroupTitle: (count: number) => string;
noNeutralHits: string;
addNoteButtonTitle: string;
addNoteRowTitle: string;
notePlaceholder: string;
noteSaveButton: string;
noteCancelButton: string;
noteEditTitle: string;
noteDeleteTitle: string;
```

- [ ] **Step 2: Modify the English translations object**

Find this block (around line 1152-1160):

```ts
    neutralHitsWidgetTitle: "Neutral Analysis",
    neutralFilterAll: (count) => `All (${count})`,
    neutralFilterOpenings: (count) => `Openings (${count})`,
    neutralFilterPunishes: (count) => `Punishes (${count})`,
    neutralOpeningsGroupTitle: (count) => `Neutral Openings (${count})`,
    neutralPunishesGroupTitle: (count) => `Neutral Punishes Taken (${count})`,
    noNeutralHits: "No neutral hits in this match.",
    noNeutralOpeningsLanded: "No neutral openings landed.",
    noNeutralPunishesTaken: "No neutral punishes taken.",
```

Replace it with:

```ts
    neutralHitsWidgetTitle: "Neutral Analysis",
    neutralFilterWin: (count) => `Win (${count})`,
    neutralFilterLoss: (count) => `Loss (${count})`,
    neutralFilterComments: (count) => `Comments (${count})`,
    neutralOpeningsGroupTitle: (count) => `Neutral Openings (${count})`,
    neutralPunishesGroupTitle: (count) => `Neutral Punishes Taken (${count})`,
    noNeutralHits: "No neutral hits in this match.",
    addNoteButtonTitle: "Add a note at the current frame",
    addNoteRowTitle: "Add a note for this interaction",
    notePlaceholder: "Write a note...",
    noteSaveButton: "Save",
    noteCancelButton: "Cancel",
    noteEditTitle: "Click to edit",
    noteDeleteTitle: "Delete note",
```

- [ ] **Step 3: Modify the Japanese translations object**

Find this block (around line 1842-1850):

```ts
    neutralHitsWidgetTitle: "立ち回り分析",
    neutralFilterAll: (count) => `すべて (${count})`,
    neutralFilterOpenings: (count) => `差し込み (${count})`,
    neutralFilterPunishes: (count) => `被弾 (${count})`,
    neutralOpeningsGroupTitle: (count) => `差し込み成功 (${count})`,
    neutralPunishesGroupTitle: (count) => `被弾・被差し返し (${count})`,
    noNeutralHits: "この試合で差し込みヒットはありません。",
    noNeutralOpeningsLanded: "差し込みヒットはありません。",
    noNeutralPunishesTaken: "立ち回りでの被弾はありません。",
```

Replace it with:

```ts
    neutralHitsWidgetTitle: "立ち回り分析",
    neutralFilterWin: (count) => `差し込み (${count})`,
    neutralFilterLoss: (count) => `被弾 (${count})`,
    neutralFilterComments: (count) => `コメント (${count})`,
    neutralOpeningsGroupTitle: (count) => `差し込み成功 (${count})`,
    neutralPunishesGroupTitle: (count) => `被弾・被差し返し (${count})`,
    noNeutralHits: "この試合で差し込みヒットはありません。",
    addNoteButtonTitle: "現在のフレームにメモを追加",
    addNoteRowTitle: "この場面にメモを追加",
    notePlaceholder: "メモを入力...",
    noteSaveButton: "保存",
    noteCancelButton: "キャンセル",
    noteEditTitle: "クリックして編集",
    noteDeleteTitle: "メモを削除",
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (This is the real "test" for this task — a mismatched key between the interface and either locale object fails the build immediately, since both locale objects are typed as `Translations`.)

- [ ] **Step 5: Lint and format**

Run: `npx eslint src/i18n.ts && npx prettier --check src/i18n.ts`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/i18n.ts
git commit -m "Add match-notes translations; rename neutral filter tabs to Win/Loss/Comments"
```

---

### Task 4: Win/Loss/Comments toggle bar + anchored notes in `matchView.ts`

**Files:**

- Modify: `index.html`
- Modify: `src/match/matchView.ts`

**Interfaces:**

- Consumes: `MatchNote`, `loadMatchNotes`, `upsertAnchoredNote`, `updateNoteText`, `deleteMatchNote` (from `src/notes.ts`, Task 1); `neutralFilterWin`/`neutralFilterLoss`/`neutralFilterComments`/`addNoteRowTitle`/`notePlaceholder`/`noteSaveButton`/`noteCancelButton`/`noteEditTitle`/`noteDeleteTitle`/`noNeutralHits` (from `src/i18n.ts`, Task 3).
- Produces (for Task 5 to build on):
  - `private createNoteComposer(initialText: string, onSave: (text: string) => void, onCancel: () => void): HTMLElement`
  - `private createNoteBlock(note: MatchNote, replay: Replay): HTMLElement`
  - `private matchNotes: MatchNote[]` field, loaded fresh in `loadMatch()`
  - `private pendingAnchoredNoteFrameIndex: number | null` field

- [ ] **Step 1: Add CSS to `index.html`**

Find this block (search for `.situation-row.neutral-row-punish.active`):

```css
.situation-row.neutral-row-punish.active {
  background: rgba(224, 71, 63, 0.24);
  box-shadow: inset 0 0 0 1px rgba(224, 71, 63, 0.8);
}
```

Immediately after its closing `}`, insert:

```css
.neutral-filter-btn.filter-comments.active {
  background: rgba(250, 204, 21, 0.18);
  border-color: #facc15;
  color: #92730a;
}
[data-theme="dark"] .neutral-filter-btn.filter-comments.active {
  color: #facc15;
}
.add-note-btn {
  opacity: 0;
  margin-left: auto;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 2px 4px;
  border-radius: 4px;
  flex-shrink: 0;
  transition:
    opacity 0.1s,
    background 0.1s;
}
.neutral-interaction-row:hover .add-note-btn {
  opacity: 1;
}
.add-note-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}
.match-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 12px 6px 20px;
  border-bottom: 1px solid var(--panel-border);
  background: rgba(250, 204, 21, 0.06);
  border-left: 3px solid #facc15;
}
.match-note-text {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text);
  white-space: pre-wrap;
  cursor: pointer;
}
.match-note-delete {
  opacity: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 12px;
  flex-shrink: 0;
  transition: opacity 0.1s;
}
.match-note:hover .match-note-delete {
  opacity: 1;
}
.note-composer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px 8px 20px;
  border-bottom: 1px solid var(--panel-border);
  background: rgba(250, 204, 21, 0.08);
  border-left: 3px solid #facc15;
}
.note-composer-input {
  width: 100%;
  min-height: 48px;
  resize: vertical;
  font-family: inherit;
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid var(--panel-border);
  background: var(--card-bg);
  color: var(--text);
  box-sizing: border-box;
}
.note-composer-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.note-composer-save,
.note-composer-cancel {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid var(--panel-border);
  font-family: inherit;
}
.note-composer-save {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.note-composer-save:hover {
  background: var(--accent-hover);
}
.note-composer-cancel {
  background: var(--btn-secondary-bg);
  color: var(--text);
}
.note-composer-cancel:hover {
  background: var(--btn-secondary-hover);
}
```

Then rename the two existing class selectors just above (search for `filter-openings` and `filter-punishes`):

```css
.neutral-filter-btn.filter-openings.active {
  background: rgba(59, 130, 246, 0.18);
  border-color: #60a5fa;
  color: #2563eb;
}
[data-theme="dark"] .neutral-filter-btn.filter-openings.active {
  color: #60a5fa;
}
.neutral-filter-btn.filter-punishes.active {
  background: rgba(224, 71, 63, 0.18);
  border-color: #e0473f;
  color: #dc2626;
}
[data-theme="dark"] .neutral-filter-btn.filter-punishes.active {
  color: #f87171;
}
```

to:

```css
.neutral-filter-btn.filter-win.active {
  background: rgba(59, 130, 246, 0.18);
  border-color: #60a5fa;
  color: #2563eb;
}
[data-theme="dark"] .neutral-filter-btn.filter-win.active {
  color: #60a5fa;
}
.neutral-filter-btn.filter-loss.active {
  background: rgba(224, 71, 63, 0.18);
  border-color: #e0473f;
  color: #dc2626;
}
[data-theme="dark"] .neutral-filter-btn.filter-loss.active {
  color: #f87171;
}
```

- [ ] **Step 2: Add new fields to `MatchViewController`**

Find:

```ts
  private neutralHitFilter: "all" | "openings" | "punishes" = "all";
```

Replace with:

```ts
  private neutralShowWin = false;
  private neutralShowLoss = true;
  private neutralShowComments = true;
  private matchNotes: MatchNote[] = [];
  private pendingAnchoredNoteFrameIndex: number | null = null;
```

- [ ] **Step 3: Add the import**

Add near the existing `youtubeSync.js` import block:

```ts
import {
  type MatchNote,
  loadMatchNotes,
  upsertAnchoredNote,
  updateNoteText,
  deleteMatchNote,
} from "../notes.js";
```

- [ ] **Step 4: Load notes in `loadMatch()`**

Find (inside `public loadMatch(...)`):

```ts
const neutralEvents = computeNeutralHitEvents(replay);
this.neutralHitEvents = neutralEvents;
```

Replace with:

```ts
const neutralEvents = computeNeutralHitEvents(replay);
this.neutralHitEvents = neutralEvents;
this.matchNotes = loadMatchNotes(this.currentReplayId ?? "");
this.pendingAnchoredNoteFrameIndex = null;
```

- [ ] **Step 5: Rewrite `renderNeutralHitsPanel` and add the two new helper methods**

Replace the entire `renderNeutralHitsPanel` method (from `private renderNeutralHitsPanel(replay: Replay): void {` through its closing `}`, i.e. everything that was lines 4000-4304 before this task) with:

```ts
  private renderNeutralHitsPanel(replay: Replay): void {
    const tr = t();
    this.neutralHitsList.innerHTML = "";

    if (replay.frames.length === 0) {
      this.updateSidebarVisibility();
      return;
    }

    this.updateSidebarVisibility();

    const anchoredNoteByFrame = new Map<number, MatchNote>();
    if (this.neutralShowComments) {
      for (const n of this.matchNotes) {
        if (n.eventFrameIndex !== undefined) {
          anchoredNoteByFrame.set(n.eventFrameIndex, n);
        }
      }
    }

    const createRow = (
      e: NeutralHitEvent,
      suppressAddNoteButton: boolean,
    ): HTMLElement => {
      const row = document.createElement("div");
      row.className = "situation-row neutral-interaction-row";
      row.dataset.frameIndex = String(e.frameIndex);
      row.dataset.endFrameIndex = String(e.endFrameIndex ?? e.frameIndex + 60);

      const topLine = document.createElement("div");
      topLine.className = "neutral-interaction-top";

      const timeCol = document.createElement("div");
      timeCol.className = "neutral-time-col";

      const timeEl = document.createElement("span");
      timeEl.className = "situation-time";
      timeEl.textContent = formatElapsed(e.frameIndex);

      const frameEl = document.createElement("span");
      frameEl.className = "situation-frame";
      frameEl.textContent = `${e.frame}F`;

      timeCol.appendChild(timeEl);
      timeCol.appendChild(frameEl);
      topLine.appendChild(timeCol);

      const chipsWrap = document.createElement("div");
      chipsWrap.className = "neutral-chips-wrap";

      const badgeEl = document.createElement("span");
      badgeEl.dataset.chip = "reason";
      badgeEl.dataset.startFrame = String(e.frameIndex);
      badgeEl.dataset.endFrame = String(
        e.openingEndFrameIndex ?? e.frameIndex + 30,
      );
      switch (e.reason) {
        case "shield-pressure":
          badgeEl.className = "neutral-badge-shield";
          badgeEl.textContent = tr.neutralReasonShieldPressure;
          break;
        case "landing-lag":
          badgeEl.className = "neutral-badge-landing";
          badgeEl.textContent = tr.neutralReasonLandingLag;
          break;
        case "whiff-punish":
          badgeEl.className = "neutral-badge-whiff";
          badgeEl.textContent = tr.neutralReasonWhiffPunish;
          break;
        case "jump-punish":
          badgeEl.className = "neutral-badge-jump";
          badgeEl.textContent = tr.neutralReasonJumpPunish;
          break;
        case "standing-hit":
          badgeEl.className = "neutral-badge-standing";
          badgeEl.textContent =
            e.hitType === "grab"
              ? tr.neutralReasonStandingGrab
              : tr.neutralReasonStandingHit;
          break;
        case "reversal":
          badgeEl.className = "neutral-badge-reversal";
          badgeEl.textContent = tr.neutralReasonReversal;
          break;
        default:
          badgeEl.className = "neutral-badge-unknown";
          badgeEl.textContent = tr.neutralReasonUnknown;
          break;
      }
      if (e.reasonDetail) {
        badgeEl.title = e.reasonDetail;
      }
      chipsWrap.appendChild(badgeEl);

      const preSituationHits = e.preSituationHits ?? e.totalHitsLanded;
      const hasSituationHits = (e.situationHits ?? 0) > 0;
      if (
        preSituationHits !== undefined &&
        (preSituationHits > 1 || hasSituationHits)
      ) {
        const hitsBadge = document.createElement("span");
        hitsBadge.className = "neutral-badge-hits";
        hitsBadge.dataset.chip = "hits";
        hitsBadge.dataset.startFrame = String(e.frameIndex);
        hitsBadge.dataset.endFrame = String(
          e.lastHitFrameIndex ?? e.frameIndex + 45,
        );
        hitsBadge.textContent = tr.neutralHitsBadge(preSituationHits);
        chipsWrap.appendChild(hitsBadge);
      }

      if (e.convertedToLedgeTrap) {
        const ltBadge = document.createElement("span");
        ltBadge.className = "neutral-badge-conversion";
        ltBadge.dataset.chip = "ledge-trap";
        ltBadge.dataset.startFrame = String(
          e.ledgeTrapStartFrameIndex ?? e.frameIndex,
        );
        ltBadge.dataset.endFrame = String(
          e.ledgeTrapEndFrameIndex ?? e.endFrameIndex ?? e.frameIndex + 60,
        );
        ltBadge.textContent = tr.neutralConversionLedgeTrap;
        chipsWrap.appendChild(ltBadge);
      } else if (e.convertedToEdgeGuard) {
        const egBadge = document.createElement("span");
        egBadge.className = "neutral-badge-conversion";
        egBadge.dataset.chip = "edge-guard";
        egBadge.dataset.startFrame = String(
          e.edgeGuardStartFrameIndex ?? e.frameIndex,
        );
        egBadge.dataset.endFrame = String(
          e.edgeGuardEndFrameIndex ?? e.endFrameIndex ?? e.frameIndex + 60,
        );
        egBadge.textContent = tr.neutralConversionEdgeGuard;
        chipsWrap.appendChild(egBadge);
      }

      if (e.situationHits !== undefined && e.situationHits > 0) {
        const situationHitsBadge = document.createElement("span");
        situationHitsBadge.className = "neutral-badge-hits";
        situationHitsBadge.dataset.chip = "situation-hits";
        situationHitsBadge.dataset.startFrame = String(
          e.ledgeTrapStartFrameIndex ??
            e.edgeGuardStartFrameIndex ??
            e.frameIndex,
        );
        situationHitsBadge.dataset.endFrame = String(
          e.lastHitFrameIndex ?? e.endFrameIndex ?? e.frameIndex + 60,
        );
        situationHitsBadge.textContent = tr.neutralHitsBadge(e.situationHits);
        chipsWrap.appendChild(situationHitsBadge);
      }

      if (e.convertedToKill) {
        const koBadge = document.createElement("span");
        koBadge.className = "neutral-badge-ko";
        koBadge.dataset.chip = "ko";
        koBadge.dataset.startFrame = String(
          e.killFrameIndex ?? e.endFrameIndex ?? e.frameIndex,
        );
        koBadge.dataset.endFrame = String(
          (e.killFrameIndex ?? e.endFrameIndex ?? e.frameIndex) + 60,
        );
        koBadge.textContent = tr.neutralConversionKO;
        chipsWrap.appendChild(koBadge);
      } else if (e.outcome === "reversal") {
        const reversalBadge = document.createElement("span");
        reversalBadge.className = "neutral-badge-reversal-outcome";
        reversalBadge.dataset.chip = "reversal";
        const endFrame = e.endFrameIndex ?? e.frameIndex + 30;
        reversalBadge.dataset.startFrame = String(
          Math.max(e.frameIndex, endFrame - 30),
        );
        reversalBadge.dataset.endFrame = String(endFrame);
        reversalBadge.textContent = tr.neutralConversionReversal;
        chipsWrap.appendChild(reversalBadge);
      } else {
        const resetBadge = document.createElement("span");
        resetBadge.className = "neutral-badge-reset";
        resetBadge.dataset.chip = "reset";
        const endFrame = e.endFrameIndex ?? e.frameIndex + 60;
        resetBadge.dataset.startFrame = String(
          Math.max(e.frameIndex, endFrame - 60),
        );
        resetBadge.dataset.endFrame = String(endFrame);
        resetBadge.textContent = tr.neutralConversionReset;
        chipsWrap.appendChild(resetBadge);
      }

      topLine.appendChild(chipsWrap);

      if (!suppressAddNoteButton && this.neutralShowComments) {
        const addNoteBtn = document.createElement("button");
        addNoteBtn.type = "button";
        addNoteBtn.className = "add-note-btn";
        addNoteBtn.title = tr.addNoteRowTitle;
        addNoteBtn.textContent = "💬";
        addNoteBtn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          this.pendingAnchoredNoteFrameIndex = e.frameIndex;
          this.renderNeutralHitsPanel(replay);
        });
        topLine.appendChild(addNoteBtn);
      }

      row.appendChild(topLine);

      if (
        !e.convertedToKill &&
        e.outcome !== "reversal" &&
        (e.totalDamageDealt ?? 0) > 0
      ) {
        const resultLine = document.createElement("div");
        resultLine.className = "neutral-result-line";
        resultLine.textContent = tr.neutralResultBadge(
          Math.round(e.totalDamageDealt!),
        );
        row.appendChild(resultLine);
      }

      row.addEventListener("click", () => {
        this.dismissQuickAttackOverlay();
        const seekTarget = Math.max(0, e.frameIndex - 60);
        this.playback?.seek(seekTarget);
        this.playback?.play();
      });

      return row;
    };

    if (this.perspectivePort !== null) {
      const winCount = this.neutralHitEvents.filter(
        (e) => e.attackerPort === this.perspectivePort,
      ).length;
      const lossCount = this.neutralHitEvents.filter(
        (e) => e.victimPort === this.perspectivePort,
      ).length;
      const commentsCount = this.matchNotes.length;

      const filterContainer = document.createElement("div");
      filterContainer.className = "neutral-filters";

      const makeToggle = (
        active: boolean,
        colorClass: string,
        label: string,
        onToggle: () => void,
      ): HTMLButtonElement => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `neutral-filter-btn ${colorClass}${active ? " active" : ""}`;
        btn.textContent = label;
        btn.setAttribute("aria-pressed", String(active));
        btn.addEventListener("click", () => {
          onToggle();
          this.renderNeutralHitsPanel(replay);
        });
        return btn;
      };

      filterContainer.appendChild(
        makeToggle(
          this.neutralShowWin,
          "filter-win",
          tr.neutralFilterWin(winCount),
          () => {
            this.neutralShowWin = !this.neutralShowWin;
          },
        ),
      );
      filterContainer.appendChild(
        makeToggle(
          this.neutralShowLoss,
          "filter-loss",
          tr.neutralFilterLoss(lossCount),
          () => {
            this.neutralShowLoss = !this.neutralShowLoss;
          },
        ),
      );
      filterContainer.appendChild(
        makeToggle(
          this.neutralShowComments,
          "filter-comments",
          tr.neutralFilterComments(commentsCount),
          () => {
            this.neutralShowComments = !this.neutralShowComments;
          },
        ),
      );
      this.neutralHitsList.appendChild(filterContainer);
    }

    let eventsToRender = this.neutralHitEvents;
    if (this.perspectivePort !== null) {
      eventsToRender = this.neutralHitEvents.filter((e) => {
        const isWin = e.attackerPort === this.perspectivePort;
        const isLoss = e.victimPort === this.perspectivePort;
        if (isWin && !this.neutralShowWin) return false;
        if (isLoss && !this.neutralShowLoss) return false;
        return true;
      });
    }

    if (eventsToRender.length === 0) {
      const empty = document.createElement("div");
      empty.className = "situation-empty";
      empty.textContent = tr.noNeutralHits;
      this.neutralHitsList.appendChild(empty);
    } else {
      eventsToRender.forEach((e) => {
        const anchored = anchoredNoteByFrame.get(e.frameIndex) ?? null;
        const pendingHere =
          this.pendingAnchoredNoteFrameIndex === e.frameIndex;
        if (anchored) {
          this.neutralHitsList.appendChild(
            this.createNoteBlock(anchored, replay),
          );
        } else if (pendingHere && this.neutralShowComments) {
          const composer = this.createNoteComposer(
            "",
            (text) => {
              if (this.currentReplayId) {
                this.matchNotes = upsertAnchoredNote(
                  this.currentReplayId,
                  e.frameIndex,
                  text,
                );
              }
              this.pendingAnchoredNoteFrameIndex = null;
              this.renderNeutralHitsPanel(replay);
            },
            () => {
              this.pendingAnchoredNoteFrameIndex = null;
              this.renderNeutralHitsPanel(replay);
            },
          );
          this.neutralHitsList.appendChild(composer);
        }

        const row = createRow(e, Boolean(anchored) || pendingHere);
        if (this.perspectivePort !== null) {
          if (e.attackerPort === this.perspectivePort) {
            row.classList.add("neutral-row-opening");
          } else {
            row.classList.add("neutral-row-punish");
          }
        }
        this.neutralHitsList.appendChild(row);
      });
    }
  }

  /** A textarea + Save/Cancel used for both a new note and editing an existing one. */
  private createNoteComposer(
    initialText: string,
    onSave: (text: string) => void,
    onCancel: () => void,
  ): HTMLElement {
    const tr = t();
    const wrap = document.createElement("div");
    wrap.className = "note-composer";

    const textarea = document.createElement("textarea");
    textarea.className = "note-composer-input";
    textarea.value = initialText;
    textarea.placeholder = tr.notePlaceholder;
    textarea.addEventListener("click", (ev) => ev.stopPropagation());
    wrap.appendChild(textarea);

    const actions = document.createElement("div");
    actions.className = "note-composer-actions";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "note-composer-save";
    saveBtn.textContent = tr.noteSaveButton;
    saveBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const text = textarea.value.trim();
      if (text) onSave(text);
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "note-composer-cancel";
    cancelBtn.textContent = tr.noteCancelButton;
    cancelBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      onCancel();
    });

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    wrap.appendChild(actions);

    setTimeout(() => textarea.focus(), 0);
    return wrap;
  }

  /** A rendered note - its text (click to edit) and a hover-reveal delete button. */
  private createNoteBlock(note: MatchNote, replay: Replay): HTMLElement {
    const tr = t();
    const wrap = document.createElement("div");
    wrap.className = "match-note";
    wrap.dataset.frameIndex = String(note.frameIndex);

    const renderView = (): void => {
      wrap.innerHTML = "";

      const textEl = document.createElement("div");
      textEl.className = "match-note-text";
      textEl.textContent = note.text;
      textEl.title = tr.noteEditTitle;
      textEl.addEventListener("click", (ev) => {
        ev.stopPropagation();
        renderEdit();
      });
      wrap.appendChild(textEl);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "match-note-delete";
      deleteBtn.title = tr.noteDeleteTitle;
      deleteBtn.textContent = "🗑";
      deleteBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (this.currentReplayId) {
          this.matchNotes = deleteMatchNote(this.currentReplayId, note.id);
        }
        this.renderNeutralHitsPanel(replay);
      });
      wrap.appendChild(deleteBtn);
    };

    const renderEdit = (): void => {
      wrap.innerHTML = "";
      wrap.appendChild(
        this.createNoteComposer(
          note.text,
          (text) => {
            if (this.currentReplayId) {
              this.matchNotes = updateNoteText(
                this.currentReplayId,
                note.id,
                text,
              );
            }
            this.renderNeutralHitsPanel(replay);
          },
          renderView,
        ),
      );
    };

    renderView();
    return wrap;
  }
```

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/match/matchView.ts`
Expected: no errors.

- [ ] **Step 7: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, no regressions.

- [ ] **Step 8: Manual browser check**

Start the dev preview, open a match with neutral interactions, switch to a player perspective so the toggle bar appears. Confirm: "Win" starts unchecked, "Loss" and "Comments" start checked; toggling each changes which rows show; hovering a Win/Loss row reveals a speech-bubble button; clicking it opens a composer above the row; Save adds a note block above the row that persists after toggling Loss off and back on; clicking the note's text reopens it for editing; the trash icon (on hover) deletes it.

- [ ] **Step 9: Commit**

```bash
git add index.html src/match/matchView.ts
git commit -m "Add Win/Loss/Comments toggle bar and anchored match notes to Neutral Analysis panel"
```

---

### Task 5: Freeform notes (footer button + merged chronological list)

**Files:**

- Modify: `index.html`
- Modify: `src/match/matchView.ts`

**Interfaces:**

- Consumes: `addFreeformNote` (from `src/notes.ts`, Task 1); `createNoteComposer`, `createNoteBlock` (from Task 4, unchanged); `addNoteButtonTitle` (from `src/i18n.ts`, Task 3).

- [ ] **Step 1: Add the footer button markup to `index.html`**

Find:

```html
      </div>
      <div id="scrubberContainer">
```

(this is the closing `</div>` of `#speedMenuContainer`, immediately before `#scrubberContainer` — confirm by checking the line above it is `</div>` closing the `#speedDropdown`/`#speedMenuContainer` structure). Insert a new button between them:

```html
      </div>
      <button id="addNoteBtn" title="Add a note at the current frame">
        🗨
      </button>
      <div id="scrubberContainer">
```

(The `footer button` CSS rule already in `index.html` styles this automatically — no new CSS needed for the button itself.)

- [ ] **Step 2: Add the field and DOM lookup in `matchView.ts`**

Find:

```ts
  private pendingAnchoredNoteFrameIndex: number | null = null;
```

Replace with:

```ts
  private pendingAnchoredNoteFrameIndex: number | null = null;
  private pendingFreeformNoteFrameIndex: number | null = null;
  private addNoteBtn: HTMLButtonElement;
```

Find:

```ts
this.stepForwardBtn = document.getElementById(
  "stepForward",
) as HTMLButtonElement;
```

Immediately after it, insert:

```ts
this.addNoteBtn = document.getElementById("addNoteBtn") as HTMLButtonElement;
```

- [ ] **Step 3: Extend the notes import**

Find:

```ts
import {
  type MatchNote,
  loadMatchNotes,
  upsertAnchoredNote,
  updateNoteText,
  deleteMatchNote,
} from "../notes.js";
```

Replace with:

```ts
import {
  type MatchNote,
  loadMatchNotes,
  upsertAnchoredNote,
  addFreeformNote,
  updateNoteText,
  deleteMatchNote,
} from "../notes.js";
```

- [ ] **Step 4: Wire the footer button's click listener**

Find:

```ts
this.playPauseBtn.addEventListener("click", () => {
  this.dismissQuickAttackOverlay();
  this.playback?.toggle();
});
```

Immediately before it, insert:

```ts
this.addNoteBtn.addEventListener("click", () => {
  if (!this.currentReplay) return;
  this.pendingFreeformNoteFrameIndex = this.playback?.currentIndex ?? 0;
  this.renderNeutralHitsPanel(this.currentReplay);
});
```

- [ ] **Step 5: Reset the new pending field on load**

Find (from Task 4's change to `loadMatch()`):

```ts
this.matchNotes = loadMatchNotes(this.currentReplayId ?? "");
this.pendingAnchoredNoteFrameIndex = null;
```

Replace with:

```ts
this.matchNotes = loadMatchNotes(this.currentReplayId ?? "");
this.pendingAnchoredNoteFrameIndex = null;
this.pendingFreeformNoteFrameIndex = null;
```

- [ ] **Step 6: Fix `updateSidebarVisibility` to account for notes**

Find:

```ts
  private updateSidebarVisibility(): void {
    const hasNeutralHits =
      Boolean(this.currentReplay) &&
      (this.currentReplay?.frames.length ?? 0) > 0 &&
      this.neutralHitEvents.length > 0;
```

Replace with:

```ts
  private updateSidebarVisibility(): void {
    const hasNeutralHits =
      Boolean(this.currentReplay) &&
      (this.currentReplay?.frames.length ?? 0) > 0 &&
      (this.neutralHitEvents.length > 0 || this.matchNotes.length > 0);
```

- [ ] **Step 7: Merge freeform notes into the render loop**

In `renderNeutralHitsPanel` (from Task 4), find:

```ts
const anchoredNoteByFrame = new Map<number, MatchNote>();
if (this.neutralShowComments) {
  for (const n of this.matchNotes) {
    if (n.eventFrameIndex !== undefined) {
      anchoredNoteByFrame.set(n.eventFrameIndex, n);
    }
  }
}
```

Replace with:

```ts
const anchoredNoteByFrame = new Map<number, MatchNote>();
const freeformNotes: MatchNote[] = [];
if (this.neutralShowComments) {
  for (const n of this.matchNotes) {
    if (n.eventFrameIndex !== undefined) {
      anchoredNoteByFrame.set(n.eventFrameIndex, n);
    } else {
      freeformNotes.push(n);
    }
  }
}
```

Then find the entire block from the `let eventsToRender = this.neutralHitEvents;` line through the end of the method (the `if (eventsToRender.length === 0) { ... } else { eventsToRender.forEach(...) }` block and the method's closing `}`):

```ts
    let eventsToRender = this.neutralHitEvents;
    if (this.perspectivePort !== null) {
      eventsToRender = this.neutralHitEvents.filter((e) => {
        const isWin = e.attackerPort === this.perspectivePort;
        const isLoss = e.victimPort === this.perspectivePort;
        if (isWin && !this.neutralShowWin) return false;
        if (isLoss && !this.neutralShowLoss) return false;
        return true;
      });
    }

    if (eventsToRender.length === 0) {
      const empty = document.createElement("div");
      empty.className = "situation-empty";
      empty.textContent = tr.noNeutralHits;
      this.neutralHitsList.appendChild(empty);
    } else {
      eventsToRender.forEach((e) => {
        const anchored = anchoredNoteByFrame.get(e.frameIndex) ?? null;
        const pendingHere =
          this.pendingAnchoredNoteFrameIndex === e.frameIndex;
        if (anchored) {
          this.neutralHitsList.appendChild(
            this.createNoteBlock(anchored, replay),
          );
        } else if (pendingHere && this.neutralShowComments) {
          const composer = this.createNoteComposer(
            "",
            (text) => {
              if (this.currentReplayId) {
                this.matchNotes = upsertAnchoredNote(
                  this.currentReplayId,
                  e.frameIndex,
                  text,
                );
              }
              this.pendingAnchoredNoteFrameIndex = null;
              this.renderNeutralHitsPanel(replay);
            },
            () => {
              this.pendingAnchoredNoteFrameIndex = null;
              this.renderNeutralHitsPanel(replay);
            },
          );
          this.neutralHitsList.appendChild(composer);
        }

        const row = createRow(e, Boolean(anchored) || pendingHere);
        if (this.perspectivePort !== null) {
          if (e.attackerPort === this.perspectivePort) {
            row.classList.add("neutral-row-opening");
          } else {
            row.classList.add("neutral-row-punish");
          }
        }
        this.neutralHitsList.appendChild(row);
      });
    }
  }
```

Replace it with:

```ts
    let eventsToRender = this.neutralHitEvents;
    if (this.perspectivePort !== null) {
      eventsToRender = this.neutralHitEvents.filter((e) => {
        const isWin = e.attackerPort === this.perspectivePort;
        const isLoss = e.victimPort === this.perspectivePort;
        if (isWin && !this.neutralShowWin) return false;
        if (isLoss && !this.neutralShowLoss) return false;
        return true;
      });
    }

    type NeutralRenderItem =
      | { frameIndex: number; kind: "event"; event: NeutralHitEvent }
      | { frameIndex: number; kind: "note"; note: MatchNote }
      | { frameIndex: number; kind: "new-note" };

    const items: NeutralRenderItem[] = [
      ...eventsToRender.map(
        (event): NeutralRenderItem => ({
          frameIndex: event.frameIndex,
          kind: "event",
          event,
        }),
      ),
      ...freeformNotes.map(
        (note): NeutralRenderItem => ({
          frameIndex: note.frameIndex,
          kind: "note",
          note,
        }),
      ),
    ];
    if (this.pendingFreeformNoteFrameIndex !== null) {
      items.push({
        frameIndex: this.pendingFreeformNoteFrameIndex,
        kind: "new-note",
      });
    }
    items.sort((a, b) => a.frameIndex - b.frameIndex);

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "situation-empty";
      empty.textContent = tr.noNeutralHits;
      this.neutralHitsList.appendChild(empty);
      return;
    }

    for (const item of items) {
      if (item.kind === "event") {
        const e = item.event;
        const anchored = anchoredNoteByFrame.get(e.frameIndex) ?? null;
        const pendingHere =
          this.pendingAnchoredNoteFrameIndex === e.frameIndex;
        if (anchored) {
          this.neutralHitsList.appendChild(
            this.createNoteBlock(anchored, replay),
          );
        } else if (pendingHere && this.neutralShowComments) {
          const composer = this.createNoteComposer(
            "",
            (text) => {
              if (this.currentReplayId) {
                this.matchNotes = upsertAnchoredNote(
                  this.currentReplayId,
                  e.frameIndex,
                  text,
                );
              }
              this.pendingAnchoredNoteFrameIndex = null;
              this.renderNeutralHitsPanel(replay);
            },
            () => {
              this.pendingAnchoredNoteFrameIndex = null;
              this.renderNeutralHitsPanel(replay);
            },
          );
          this.neutralHitsList.appendChild(composer);
        }

        const row = createRow(e, Boolean(anchored) || pendingHere);
        if (this.perspectivePort !== null) {
          if (e.attackerPort === this.perspectivePort) {
            row.classList.add("neutral-row-opening");
          } else {
            row.classList.add("neutral-row-punish");
          }
        }
        this.neutralHitsList.appendChild(row);
      } else if (item.kind === "note") {
        this.neutralHitsList.appendChild(
          this.createNoteBlock(item.note, replay),
        );
      } else {
        const frameIndex = item.frameIndex;
        const composer = this.createNoteComposer(
          "",
          (text) => {
            if (this.currentReplayId) {
              this.matchNotes = addFreeformNote(
                this.currentReplayId,
                frameIndex,
                text,
              );
            }
            this.pendingFreeformNoteFrameIndex = null;
            this.renderNeutralHitsPanel(replay);
          },
          () => {
            this.pendingFreeformNoteFrameIndex = null;
            this.renderNeutralHitsPanel(replay);
          },
        );
        this.neutralHitsList.appendChild(composer);
      }
    }
  }
```

- [ ] **Step 8: Set the footer button's tooltip from i18n**

Find the block in the translation-refresh method that sets other footer button titles:

```ts
if (this.stepBackBtn) this.stepBackBtn.title = tr.prevFrameTooltip;
if (this.playPauseBtn) this.playPauseBtn.title = tr.playPauseTooltip;
if (this.stepForwardBtn) this.stepForwardBtn.title = tr.nextFrameTooltip;
```

Replace with:

```ts
if (this.stepBackBtn) this.stepBackBtn.title = tr.prevFrameTooltip;
if (this.playPauseBtn) this.playPauseBtn.title = tr.playPauseTooltip;
if (this.stepForwardBtn) this.stepForwardBtn.title = tr.nextFrameTooltip;
if (this.addNoteBtn) this.addNoteBtn.title = tr.addNoteButtonTitle;
```

- [ ] **Step 9: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/match/matchView.ts`
Expected: no errors.

- [ ] **Step 10: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, no regressions.

- [ ] **Step 11: Manual browser check**

Start the dev preview, open a match. Pause at some frame with no neutral interaction nearby, click the footer's "Add note" button (🗨), confirm a composer appears at the correct chronological position in the Neutral Analysis list, save it, confirm it renders as its own row and does NOT seek playback when clicked (clicking it reopens the composer instead). Toggle Comments off and confirm the freeform note disappears; toggle it back on and confirm it reappears. Load a match with zero neutral interactions at all, confirm the panel is hidden until you add a freeform note to it, at which point it appears. Export a project file, clear local data, import it back, and confirm both the anchored and freeform notes are restored.

- [ ] **Step 12: Commit**

```bash
git add index.html src/match/matchView.ts
git commit -m "Add freeform match notes via a footer button, merged into the Neutral Analysis timeline"
```

---

### Final check

- [ ] Run `npx vitest run` one more time for the whole suite.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npx eslint .` (or the project's usual lint script) and `npx prettier --check .` (or the project's format-check script) across all changed files.
- [ ] Re-read `docs/superpowers/specs/2026-09-27-match-notes-design.md` once more and confirm every requirement in it has a corresponding change above: persistence + export/import (Tasks 1-2), Win/Loss/Comments toggles (Task 4), anchored notes with hover add/edit/delete (Task 4), freeform notes via the footer button merged chronologically (Task 5), i18n (Task 3).
