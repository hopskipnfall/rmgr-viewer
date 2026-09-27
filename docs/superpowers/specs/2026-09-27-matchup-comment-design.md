# Matchup Comment Design

**Goal:** Extend the just-shipped session-comment feature (PR #94) to the
character matchup page: a single free-text comment per matchup, always
editable.

**Where this lives:** `src/matchup/matchupView.ts`'s matchup page
(`#/matchup/:myChar/:oppChar`).

## Data Model & Persistence

New file `src/matchupComments.ts`. A matchup has no existing stable id the
way a session (`SessionGroup.id`) or a game (`gameIdFor(...)`) does - it's
identified purely by the directed pair of character ids in the route
(`myChar`, `oppChar`; per `src/router.ts`'s `matchup` route, "directed"
because "my Fox vs their Falco" and "my Falco vs their Fox" are different
pages). This module owns that key format itself:

```ts
const STORAGE_KEY_PREFIX = "rmgr_matchup_comment_";

function storageKey(myChar: number, oppChar: number): string {
  return `${STORAGE_KEY_PREFIX}${myChar}_${oppChar}`;
}

/** Returns "" if no comment is saved for this matchup. Never throws. */
export function loadMatchupComment(myChar: number, oppChar: number): string;

/** Saves `text` (trimmed) for this matchup. An empty/whitespace-only text
 * removes the storage entry entirely. */
export function saveMatchupComment(
  myChar: number,
  oppChar: number,
  text: string,
): void;

/**
 * Every saved matchup comment, keyed by "myChar_oppChar" (no storage
 * prefix). Matchups aren't enumerated anywhere else in the app the way
 * sessions/games are (there's no "list of all matchups" to check against),
 * so export scans localStorage directly for this prefix instead of the
 * notes.ts/sessionComments.ts pattern of iterating a known id list.
 */
export function getAllMatchupComments(): Record<string, string>;

/** Restores a comment from an exported "myChar_oppChar" key (see
 * getAllMatchupComments) - used by project import. */
export function saveMatchupCommentByKey(key: string, text: string): void;
```

## Export/Import

`ProjectFile` (`src/data/projectFile.ts`) gains
`matchupComments: Readonly<Record<string, string>>`, alongside
`videoLinks`/`notes`/`sessionComments`. `buildProjectFile` gets a new
optional 6th parameter `matchupComments: Readonly<Record<string, string>> =
{}`, so every existing call site keeps compiling unchanged.
`serializeProjectFile`/`parseProjectFile` gain a `matchupComments` section
following the same pattern the other three already use. In `main.ts`, the
export handler calls `getAllMatchupComments()` directly (no per-matchup
loop needed, unlike notes/sessionComments, since the scan already finds
every existing comment); the import handler calls
`saveMatchupCommentByKey(key, comment)` for each entry.

## UI

A new section in `MatchupViewController.render()`
(`src/matchup/matchupView.ts`), inserted immediately after the
`.matchup-stats-grid` `<div>` and before the `.matchup-workshop-banner`
`<div>` - directly under the stats, above the recovery-workshop banner and
the game list below it, per your placement choice.

```html
<section class="matchup-comment-section">
  <h3>Matchup Comment</h3>
  <textarea
    id="matchupCommentInput"
    class="matchup-comment-input"
    placeholder="Write a comment about this matchup..."
  ></textarea>
  <span id="matchupCommentSaved" class="matchup-comment-saved">Saved</span>
</section>
```

Wired up identically to the session comment (same always-editable, save-on-
blur, brief "Saved" indicator pattern - no new interaction design, just the
matchup-specific CSS class names and `loadMatchupComment(myChar,
oppChar)`/`saveMatchupComment(myChar, oppChar, text)` calls in place of the
session versions):

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

## i18n

Three new strings in `src/i18n.ts` (EN + JA): a section heading, the
textarea's placeholder, and the "Saved" label - the same three the session
comment added, just matchup-scoped names (`matchupCommentTitle`,
`matchupCommentPlaceholder`, `matchupCommentSaved`).

## Testing

- `src/matchupComments.test.ts`: unit tests for load/save round-trip,
  empty/whitespace removing the entry, `getAllMatchupComments()` returning
  every saved comment keyed correctly, and `saveMatchupCommentByKey`
  restoring a comment from an exported key.
- `src/data/projectFile.test.ts`: extend the existing export/import
  round-trip tests to cover `matchupComments`, mirroring the existing
  `sessionComments` coverage.
- Manual verification in the browser preview: type a comment on a matchup
  page, blur, reload, confirm it persisted; confirm the two directions of a
  pairing (`#/matchup/2/12` vs `#/matchup/12/2`) have independent comments;
  export + reimport a project and confirm matchup comments survive.
