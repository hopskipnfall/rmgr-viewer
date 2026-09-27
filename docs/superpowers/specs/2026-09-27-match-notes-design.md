# Match Notes (Timestamped Annotations) Design

**Goal:** Let the user write their own free-text notes at specific timestamps in a
match, surfaced in the Neutral Analysis panel — either anchored to an existing
neutral-interaction row, or dropped freely at the current playback frame.

**Where this lives:** `src/match/matchView.ts`'s Neutral Analysis panel
(`renderNeutralHitsPanel`, currently rendering `NeutralHitEvent[]` rows from
`src/neutralHits.ts`).

## Data Model & Persistence

New file `src/notes.ts`, following the same per-game localStorage pattern as
`src/video/youtubeSync.ts`'s video links:

```ts
export interface MatchNote {
  readonly id: string; // uuid, stable identity for edit/delete
  readonly frameIndex: number; // where it's anchored/placed, for sorting
  readonly text: string;
  /** Present = anchored to the NeutralHitEvent whose frameIndex matches this
   * value (one note per event, enforced by upsert-on-eventFrameIndex when
   * creating). Absent = a freeform note, placed wherever the user was
   * paused/playing when they clicked "Add note". */
  readonly eventFrameIndex?: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export function loadMatchNotes(gameId: string): MatchNote[];
export function saveMatchNotes(gameId: string, notes: readonly MatchNote[]): void;
export function upsertAnchoredNote(gameId: string, eventFrameIndex: number, text: string): MatchNote[];
export function addFreeformNote(gameId: string, frameIndex: number, text: string): MatchNote[];
export function updateNoteText(gameId: string, noteId: string, text: string): MatchNote[];
export function deleteMatchNote(gameId: string, noteId: string): MatchNote[];
```

Storage key: `rmgr_notes_<gameId>` (mirrors `rmgr_yt_link_<gameId>`), one JSON
array per game.

**Project export/import:** `ProjectFile` gains
`notes: Readonly<Record<string, readonly MatchNote[]>>` (gameId → notes),
alongside the existing `videoLinks` field, threaded through
`buildProjectFile`/`serializeProjectFile`/`parseProjectFile`/`mergeProjectFile`
in `src/data/projectFile.ts`, and both `main.ts` export/import handlers —
same shape and same call sites as `videoLinks` today.

## Neutral Analysis Panel Changes

### Filter bar: from single-select to three independent toggles

Today: All / Openings / Punishes, single-select tabs
(`this.neutralHitFilter`). This becomes three independent on/off toggle
chips, replacing that field with a set of enabled categories:

- **Win** (was "Openings" — rows where `attackerPort === perspectivePort`).
  **Off by default** — recognizing when you got hit matters more day-to-day
  than when you landed one.
- **Loss** (was "Punishes" — rows where `victimPort === perspectivePort`).
  **On by default.**
- **Comments** (new — controls note rendering, both anchored and freeform).
  **On by default.**

Each is an independent toggle (not mutually exclusive); any combination is
valid, including all-off (empty state). Counts shown in parens as today,
e.g. `Loss (7)`. No "All" option — Win+Loss+Comments all on covers that
case.

This only applies when `perspectivePort !== null` (as today — no perspective
means no Win/Loss concept). When there's no perspective port, all
`NeutralHitEvent` rows render as before; the Comments toggle still applies to
notes.

### Merged, chronological render

`renderNeutralHitsPanel` builds one list, sorted by `frameIndex`:

- Every `NeutralHitEvent` whose Win/Loss category is currently enabled.
- Every freeform `MatchNote` (no `eventFrameIndex`), only when Comments is
  enabled.

For each `NeutralHitEvent` row, if Comments is enabled and an anchored
`MatchNote` exists for its `eventFrameIndex`, that note renders immediately
above the row, both wrapped in one container element (shared border/
background) so they read as visually grouped — a note anchored to a Win/Loss
row always accompanies that row when the row is shown; it does not have its
own independent Win/Loss visibility, only the Comments toggle affects it.

### Adding a note

**Anchored (from a row):** hovering a Win/Loss row reveals a speech-bubble
button (new CSS hover-reveal pattern — opacity 0→1 on `:hover`, this
codebase's rows don't currently have hover-revealed actions). Clicking it
opens an inline composer (textarea + Save/Cancel) directly above the row.
Saving calls `upsertAnchoredNote` and replaces the button with the rendered
note block. If a note already exists for that row, hovering shows the note
block itself instead of the add-button (the note block is the affordance —
clicking its text re-opens the composer, pre-filled).

**Freeform (arbitrary timestamp):** a new "🗨 Add note" button in the
playback footer (`index.html`'s `#matchFooter`, placed after the speed
control, before the scrubber). Clicking it captures whatever frame is
currently playing/paused (`this.playback`'s current frame) and opens the
same inline composer. Saving calls `addFreeformNote` with that frame and
inserts the note into the merged list at its correct chronological position.

### Editing and deleting

- **Edit:** clicking a note's rendered text reopens the inline composer,
  pre-filled with its current text.
- **Delete:** a small trash icon, visible on hover of the note block (same
  hover-reveal pattern as the add-note button), calls `deleteMatchNote`
  immediately — no confirmation dialog, matching how lightweight the rest of
  this annotation UI is.

Freeform note rows do not seek playback on click (unlike `NeutralHitEvent`
rows) — clicking one is always "edit," per the click-to-edit decision above.
Anchored notes are a separate DOM element from their event row, so the row's
existing click-to-seek behavior is unaffected.

## Styling

Reuses existing conventions rather than introducing a new visual language:
`.situation-row` border/hover conventions for note rows, `.neutral-filter-btn`
active-state styling (adapted for independent toggle state instead of
single-select) for the three new toggle chips.

## i18n

New strings (add/edit/delete/save/cancel labels, toggle labels, empty-state
text if all three toggles are off) go into `src/i18n.ts` for both EN and JA,
following the file's existing convention.

## Testing

- `src/notes.ts`: unit tests for load/save round-trip, upsert-by-eventFrameIndex
  enforcing one-note-per-row, add/update/delete.
- `src/data/projectFile.test.ts`: extend existing export/import round-trip
  tests to cover `notes`, mirroring the existing `videoLinks` coverage.
- Manual verification in the browser preview: add an anchored note, add a
  freeform note, toggle Win/Loss/Comments independently, edit, delete,
  export+reimport a project and confirm notes survive.
