# Design: Multi-replay library & cross-game stat aggregation

**Status:** design only — nothing implemented. Written 2026-08-26 against `master` @ `e0f7c8c`.

**Audience:** an agent picking this up to implement it. Assumes familiarity with the
existing `rmgr-viewer` codebase and the `.rmgr` format (see `docs/RMGR_SPEC.md` in
[`rmgr-ts`](https://github.com/hopskipnfall/rmgr-ts)).

---

## The original request (verbatim, for context)

> we've made a few ui changes and changed some stats since you last looked FYI.
>
> ok! next project is going to be to be able to load in multple (perhaps a folder) of
> replay files and aggregate these stats across those games AND characters used and
> played against.
>
> This will take some UI designing. The default page should show a list of games
> (defaulting with that one we already have in the repo), and a button for
> adding/selecting new replay files.
>
> In addition to that list it should also show some kind of visualization for those
> stats. This is a little tricky because it assumes a consistent perspective (player)
> across all of those games. And their player name might be different across the games.
> I'll leave it up to you to design how this should look, and how the stats should be
> organized.
>
> Usually people have a single main character, but they also care about their overall
> stats across the cast of characters and across their opponents' characters. so there
> should be a way to see the stats we created across all games regardless of our or the
> opponent's character, as well as a way to filter to a specific character for "our"
> perspective, and for "their" perspective. And it should be filterable by opponent. I
> want this to be visually pleasing and legible.
>
> The list of games should show the players involved and it should probably allow us to
> select which one is "us" in case there is ambiguity. we should also be able to dive
> into a specific game, in which case we would see the the view that we already built.
>
> Without doing any implementation just yet, i want you to write the technical and
> visual design for this.

---

## 0. Findings from reading the current code

Three things discovered while exploring that materially shape this design. Verify them
before trusting the rest of the document.

### 0.1 `ledgeTrap.ts` has a latent stage bug — fix before aggregating

`edgeGuard.ts:146` gates on stage:

```ts
if (replay.gameStart.stageId !== DREAM_LAND_STAGE_ID) return events;
```

`ledgeTrap.ts` does **not**, but its `isOutsideDangerZone()` hardcodes Dream Land zone
geometry (`ZONE_Y_LO = 58`, `ZONE_X_AT_Y_LO = 2916`, …). On a single Dream Land match
this is invisible. Aggregate a mixed-stage folder and every non-Dream-Land game silently
contributes garbage ledge-trap numbers.

**Fix as a prerequisite:** add the same stage gate to `computeLedgeTrapEvents`, and
factor the duplicated zone constants/`isOutsideDangerZone` out of `ledgeTrap.ts` (it
currently redeclares them locally) so there's one definition shared with `edgeGuard.ts`.

### 0.2 Memory is a hard constraint, not an optimization

The `replays/` folder in the working tree is ~40 files × ~1.2 MB. Parsed into JS, each
replay is ~9,500 frames × 2 ports, each frame carrying object-per-field `pre`/`post`
data — realistically 10–20 MB of heap per replay. Holding 40 parsed replays
simultaneously is 400–800 MB and a dead tab.

The pipeline in §3 (parse → summarize → **discard**) is therefore mandatory.

### 0.3 Every stat module already requires exactly 2 players

`edgeGuard.ts:148`, `ledgeTrap.ts:180`, `angelInvincibility.ts:59`,
`neutralHits.ts:88` all `return` early unless `getSeatedPorts(replay).length === 2`.
This design inherits that limit rather than fighting it.

---

## 1. Scope

**In scope**

- Import multiple replay files, or a whole folder.
- A **library view** that becomes the new landing page, seeded with the bundled sample
  replay so the page is never empty.
- Cross-game aggregation of the four existing stats.
- Filtering by your character, opponent character, opponent, and stage.
- Drilling into a single game → the existing match view, unchanged.

**Explicitly out of scope** (worth building later; not now)

- Trend-over-time charts.
- Any backend, database, or account system.
- Persistence across page reloads (see §8, decision 1).
- 3–4 player support (see §0.3).

---

## 2. The identity problem

The hardest part of this feature, and the reason it isn't just "sum some numbers."

A `.rmgr` file records `playerNames[port]` from RMG-K netplay room metadata. Across a
folder of games the same human may appear under different names, and offline games have
empty names entirely. Port index is equally unreliable — players switch ports.

### 2.1 Model

```ts
interface Identity {
  displayName: string; // "Me"
  aliases: Set<string>; // {"Marcela", "marcela", "Player"}
}
```

### 2.2 Per-game resolution, in strict order

1. A manual per-game override exists → use it.
2. Exactly one seated port's `playerName` is in `aliases` → that port is you.
3. Otherwise → **ambiguous**.

Ambiguous covers: both names match an alias, neither matches, or both names are empty
(offline). Ambiguous games:

- **still appear** in the game list, visibly badged,
- offer a one-click `[ I'm Wario ] [ I'm Player ]` selector inline in the row,
- and are **excluded from all aggregates until resolved**.

Guessing an identity silently would poison every downstream number in a way the user
could never detect. Excluding-and-flagging is the only honest option.

### 2.3 Onboarding

After the first import, show a panel listing every distinct `playerName` observed across
the imported set, ordered by frequency, each with a checkbox: _"Which of these are
you?"_ One interaction resolves all 40 games instead of 40 separate interactions.

Re-openable later from the `[edit]` affordance on the identity card.

---

## 3. Data architecture

### 3.1 The load pipeline

```
File
  → parseReplay()                       (rmgr-ts)
  → run all 4 compute*Events / compute*Stats, for BOTH ports
  → build GameSummary  (~1 KB)
  → DISCARD the parsed Replay           ← the important step
```

### 3.2 `GameSummary`

The only thing retained in memory per game:

```ts
interface GameSummary {
  id: string; // stable: hash of the file's header bytes
  sourceName: string; // filename, for display
  recordedAt: Date; // header.recordedAtEpochSeconds — NOT the filename
  stageId: number;
  frameCount: number; // → duration at 60fps

  ports: {
    port: PortIndex;
    playerName: string; // "" for offline/unnamed
    characterId: number;
    finalStocks: number; // from GameEnd.placements, for W/L display
  }[];

  /** Pre-computed counters for BOTH ports — see §3.3. */
  statsByPort: Partial<Record<PortIndex, RawCounters>>;

  /** For re-parse on drill-in. null for the bundled sample (refetch by URL). */
  fileRef: File | null;
}
```

### 3.3 Why both ports

Computing and storing `RawCounters` for **both** ports at import time means flipping
"who is me" — whether via alias edit or a per-game override — costs zero re-parsing. It
reads the other side of an object already in memory. Given re-parsing means 40 × ~300 ms,
this matters.

### 3.4 Drill-in

Clicking a game re-parses that **one** file on demand from `fileRef` (or refetches the
bundled sample's URL), then hands the `Replay` to the existing match view. One parse,
~300 ms — exactly what the app already does today on load.

### 3.5 Import UX

- `<input type="file" multiple>` **and** `webkitdirectory` (folder picking; the prefix is
  cosmetic, support is universal in practice), plus drag-and-drop of a folder.
- Sequential parse with a progress bar, `await`-yielding to the event loop between files
  so the UI stays responsive.
- **No Web Worker in v1.** 40 files × ~300 ms behind a progress bar is tolerable for a
  one-shot import. If it feels janky in practice, moving parsing to a worker is a
  contained follow-up (ArrayBuffers are transferable).
- Non-`.rmgr` files and parse failures are skipped with a per-file error listed in the
  import summary — one corrupt file must not abort a 40-file import.

---

## 4. Aggregation

### 4.1 Counters only — never store a rate

```ts
interface RawCounters {
  recoverySituations: number;
  recoverySuccesses: number;
  edgeGuardSituations: number;
  edgeGuardSuccesses: number;
  ledgeGetupSituations: number;
  ledgeGetupSuccesses: number;
  ledgeTrapSituations: number;
  ledgeTrapSuccesses: number;
  angelAvoidSituations: number;
  angelAvoidSuccesses: number;
  neutralHitsLanded: number;
  stocksTaken: number;
  // …plus the angel damage/hit sums from AngelInvincibilityStats
}
```

Every field is an integer counter. **No derived rates are ever stored.** Aggregating is
element-wise addition; rates are computed once, at display time, from the summed
counters.

This is a structural fix, not a convention to remember: it makes the
average-of-averages bug impossible to write.

> **The trap this avoids.** "Average neutral hits per stock" across 38 games is
> `Σ neutralHitsLanded / Σ stocksTaken`. It is **not** `mean(per-game averages)` — that
> weights a 1-stock game equally with a 12-stock game and gives a materially different,
> wrong number. Identical reasoning applies to every success-rate here.

### 4.2 Stage-awareness

Each stat declares the stages on which it is meaningful. A game on a stage a stat
doesn't support contributes **nothing** to that stat — not a zero, which would dilute
the denominator, but no term at all.

Given §0.1, that currently means edge-guard and ledge-trap are Dream Land only, while
neutral-hits and angel-invincibility are stage-agnostic. The overall header should say
so plainly: `38 games · 31 on Dream Land`.

### 4.3 Filtering

Filters select a subset of `GameSummary`s, then aggregate that subset:

| Filter             | Values                               |
| ------------------ | ------------------------------------ |
| Your character     | All, or one `characterId` you played |
| Opponent character | All, or one `characterId` faced      |
| Opponent           | All, or one opponent alias-group     |
| Stage              | All, or one `stageId`                |

All filters are AND-ed. Ambiguous-identity games are excluded from every result set
regardless of filters (§2.2).

When filters are applied on the Home Page, the Stat Cards display the filtered rates
alongside delta comparisons against the unfiltered baseline ($\Delta\% = \text{Filtered}\% - \text{Baseline}\%$).

### 4.4 Uneven Start Games (12-Character Battles & Handicaps)

Matches starting with unequal stock counts (`isUnevenStockStart = true`) are tagged with
an `Uneven Start` badge on individual game rows and are **excluded from win/loss and win rate
calculations** to preserve accurate competitive records.

---

## 5. Visual design

### 5.1 Library view

```
┌──────────────────────────────────────────────────────────────────────┐
│ rmgr-viewer        [ + Import replays ]                  [EN|JA]     │
├───────────────┬──────────────────────────────────────────────────────┤
│  YOU          │  OVERALL · 38 games · 31 on Dream Land               │
│ ┌───────────┐ │                                                       │
│ │  Marcela  │ │  ┌─────────────────┐ ┌─────────────────┐             │
│ │ 3 aliases │ │  │ Recovery        │ │ Edge guard      │             │
│ │   [edit]  │ │  │  68%            │ │  41%            │             │
│ └───────────┘ │  │ ▓▓▓▓▓▓▓░░░      │ │ ▓▓▓▓░░░░░░      │             │
│               │  │ 52/76  ▲4 vs all│ │ 31/76  ▼2       │             │
│  FILTERS      │  └─────────────────┘ └─────────────────┘             │
│  Your char    │  ┌─────────────────┐ ┌─────────────────┐             │
│  [ All    ▾]  │  │ Ledge getup     │ │ Neutral hits    │             │
│  Opp char     │  │  55%            │ │  4.2 /stock     │             │
│  [ Pikachu▾]  │  │ ▓▓▓▓▓░░░░░      │ │ 218 hits/52 st. │             │
│  Opponent     │  │ 11/20  ⚠ low n  │ │        ▲0.3     │             │
│  [ All    ▾]  │  └─────────────────┘ └─────────────────┘             │
│  Stage        │                                                       │
│  [ All    ▾]  │  BY OPPONENT CHARACTER                                │
│               │  ┌─────────┬───────┬────────┬────────┬───────┐       │
│  [ Reset ]    │  │ Char    │ Games │ Recov. │ EdgeG. │ NH/St │       │
│               │  ├─────────┼───────┼────────┼────────┼───────┤       │
│               │  │ Falcon  │  12   │  71%   │  38%   │  4.2  │       │
│               │  │ Pikachu │   9   │  64%   │  47%   │  3.8  │       │
│               │  │ Kirby   │   3   │  80% ⚠ │  33% ⚠ │  5.1 ⚠│       │
│               │  └─────────┴───────┴────────┴────────┴───────┘       │
│               │                                                       │
│               │  GAMES (38)                      [ newest first ▾ ]   │
│               │  ┌──────────────────────────────────────────────┐    │
│               │  │ Aug 23 17:11 · Dream Land · 2:41             │    │
│               │  │ Marcela (Falcon)  vs  Penelope (Pikachu)  W  │ ›  │
│               │  ├──────────────────────────────────────────────┤    │
│               │  │ ⚠ Aug 23 17:15 · Dream Land · 1:58           │    │
│               │  │ ? vs ?          [ I'm Wario ] [ I'm Player ] │    │
│               │  └──────────────────────────────────────────────┘    │
└───────────────┴──────────────────────────────────────────────────────┘
```

Left rail is fixed (~320 px) so filters and identity stay visible while the main column
scrolls. Below ~860 px the rail collapses above the content, matching the breakpoint
pattern the match view already uses.

### 5.2 Three decisions that carry the legibility

**Denominators are always visible.** `68%` alone is a lie when n = 3. Every card shows
its fraction (`52/76`). Anything below a small-sample threshold (~10 situations) gets a
`⚠ low n` marker and a desaturated bar. This is the single most important choice in the
view — filtering down to "my Falcon vs their Kirby" gets to tiny sample sizes fast, and
the UI has to make that impossible to miss.

**Delta vs. your own baseline is the payoff.** `41% ▼2` — a bare percentage is trivia;
"you edge-guard 2 points worse against Pikachu than your overall average" is
actionable. Deltas render whenever any filter is active, comparing the filtered set
against unfiltered-you.

**No chart library.** Bars are CSS (`width: %` on a div). The breakdown is a `<table>`.
Current bundle is ~40 KB gzipped; Chart.js would add 60 KB+ to draw horizontal
rectangles. Consistent with how the codebase already renders everything.

### 5.3 Game list rows

Each row shows: date/time, stage, duration, both players as `Name (Character)`, and a
W/L marker derived from `GameEnd.placements`. "You" is rendered first and emphasized.
The whole row is the click target into the match view; the identity selector on
ambiguous rows is a nested control that must `stopPropagation`.

### 5.4 Empty and first-run states

The bundled sample replay is always present, so the list is never empty on first load —
the page opens with one game and a functioning (if trivially small) aggregate view,
which doubles as a self-demo of what importing more will do.

---

## 6. Module structure

`src/main.ts` is already ~830 lines carrying DOM refs, player panels, the event log, the
stats panel, playback wiring, and i18n. Adding a second full view to it makes it
unmaintainable, so this work includes extracting the existing view.

```
src/
  router.ts             # hash routing: #/  and  #/match/<id>
  library/
    libraryView.ts      # composes the library page
    gameList.ts         # rows, sorting, identity selector
    filterPanel.ts      # the four filters + reset
    statCards.ts        # rate card w/ bar, fraction, delta, low-n state
    breakdownTable.ts   # by-opponent-character table
    identityPanel.ts    # alias picker / onboarding
  match/
    matchView.ts        # ← existing view logic, extracted from main.ts
  data/
    gameSummary.ts      # GameSummary type + parse→summarize→discard
    importer.ts         # file/folder input, progress, per-file errors
    identity.ts         # alias model + per-game resolution (§2)
    aggregate.ts        # counter summation, rate derivation, filtering (§4)
```

`main.ts` shrinks to bootstrap + router wiring. **The match view moves largely as-is —
this is an extraction, not a rewrite.** Resist the urge to redesign it en route.

### 6.1 Routing

Hash-based (`#/`, `#/match/<id>`) rather than a history API router: this deploys to
GitHub Pages as a static site with no server-side rewrite, and hash routing gives
working back/forward buttons for free.

`<id>` is the `GameSummary.id` (header-bytes hash), stable within a session. A deep link
into a match after reload won't resolve (no persistence, §8) — fall back to the library
view rather than erroring.

### 6.2 i18n

`src/i18n.ts` carries `en` + `ja`. Every new user-facing string goes through `t()`. The
existing `Translations` interface will need meaningful extension — budget for it rather
than treating it as an afterthought, and keep both languages complete (CI does not
check this; a missing key silently renders `undefined`).

---

## 7. Testing

The viewer currently has no test suite. This design does not propose retrofitting one
broadly — but `aggregate.ts` and `identity.ts` are pure functions with genuinely
error-prone logic:

- the average-of-averages trap (§4.1),
- alias-resolution precedence and the ambiguity rules (§2.2),
- stage-gating exclusion vs. zero-contribution (§4.2).

**Add vitest covering those two modules only.** `rmgr-ts` already uses vitest, so the
setup is familiar and the CI wiring is a near-copy. Everything else stays manually
verified, as it is today.

---

## 8. Decisions made, with rationale (overrule as needed)

1. **No persistence across reloads.** IndexedDB could cache `GameSummary`s cheaply, but
   summaries without file handles produce a broken half-state: visible stats you cannot
   drill into. Re-importing is one click. Real persistence — including whether to store
   raw file bytes so drill-in survives reload — deserves its own deliberate design pass.
2. **2-player only**, inheriting §0.3. 3–4 player games import and list, greyed, marked
   "not supported" — rather than being silently dropped, which would look like a bug.
3. **Deltas compare against unfiltered-you**, not a global/all-players baseline. There
   is no meaningful population baseline in a local-file tool.
4. **Ambiguous games are excluded, not guessed** (§2.2).
5. **Both-port counters stored at import** (§3.3), trading ~1 KB per game for
   instant identity flips.

---

## 9. Suggested build order

Each step leaves the app working:

1. **Prerequisite fix:** `ledgeTrap` stage gate + shared zone geometry (§0.1).
2. **Extraction:** pull the match view out of `main.ts` into `match/matchView.ts`; add
   `router.ts`. App behaves identically, now with `#/match/<id>` URLs.
3. **Data layer:** `gameSummary.ts`, `aggregate.ts`, `identity.ts` + their vitest
   coverage. No UI yet.
4. **Import:** `importer.ts` + the file/folder control.
5. **Library UI:** game list → identity panel → filters → stat cards → breakdown table,
   in that order. The list is useful on its own before any aggregation renders.
