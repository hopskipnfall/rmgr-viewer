# Position Heatmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new collapsible "Position Heatmap" panel below Match Stats, showing a static blue (perspective) / grey (opponent) density heatmap of stage positions for the loaded 1v1 match, with a checkbox to restrict it to the first 5 seconds after each of the opponent's angel-invincibility respawns.

**Architecture:** A pure data module (`src/positionHeatmap.ts`) collects `{x, y}` points per port from `replay.frames`, optionally filtered to angel-invincibility windows via the existing `computeAngelInvincibilityEvents`. A separate rendering module (`src/positionHeatmapRenderer.ts`) buckets those points into a grid over the stage's blast-zone extent and paints two semi-transparent color layers on a `<canvas>`, with a faint platform outline underneath. `src/match/matchView.ts` wires a new HTML section (mirroring the existing Match Stats collapsible-panel pattern) to this data+render pipeline, re-rendering wherever `renderStatsPanel` already gets called.

**Tech Stack:** TypeScript, Vite, vitest, Canvas 2D API, vanilla DOM (no framework) — matches the rest of `rmgr-viewer`.

## Global Constraints

- Branch: `feature/position-heatmap`, based on `feature/rmgr-v5-migration` (NOT `master` — `master` currently fails `tsc` because the sibling `rmgr-ts` package is already v5-only; do not rebase this work onto `master`).
- 1v1 matches only — the panel stays `hidden` for any other seated-port count.
- Static, whole-match rendering — no playhead syncing.
- Reuse `MAIN_PLAYER_COLOR` (`#3b82f6`) / `OPPONENT_COLOR` (`#8a94a6`) from `src/players.ts` — do not introduce new color constants.
- 5 seconds = 300 frames, at this app's fixed 60 FPS (matches `src/playback.ts`'s local `FPS = 60`, but define a local constant in the new file rather than importing across that module boundary — `playback.ts`'s `FPS` is not exported).
- Follow the existing v5 `Replay`/`StateFrame`/`FramePortData` shapes from `@rmg-k/rmgr` (fields: `frame.ports[port]?.state.positionX/positionY`, `replay.matchSettings.stageId`, `replay.matchStart.slotType`) — this codebase has already been fully migrated to format v5 on this branch.
- All new user-visible strings go through `src/i18n.ts`'s `en`/`ja` tables, matching every other panel in this app (e.g. `matchStats`/`statsCollapseTitle` at `src/i18n.ts:29-30,464-465,911-912`) — do not hardcode English strings directly in `index.html` or `matchView.ts`.
- Run `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, and `npx prettier --check .` (auto-fix via `--write` then re-verify) after every task, per this repo's established verification convention.

---

### Task 1: i18n strings for the new panel

**Files:**
- Modify: `src/i18n.ts:5-31` (interface), `src/i18n.ts:462-467` (en table), `src/i18n.ts:909-913` (ja table)

**Interfaces:**
- Produces: `Translations.positionHeatmapTitle: string`, `Translations.positionHeatmapCollapseTitle: string`, `Translations.positionHeatmapAngelToggleLabel: string` — consumed by Task 5 via `t()`.

- [ ] **Step 1: Add the three new fields to the `Translations` interface**

In `src/i18n.ts`, immediately after line 30 (`statsCollapseTitle: string;`), insert:

```ts
  positionHeatmapTitle: string;
  positionHeatmapCollapseTitle: string;
  positionHeatmapAngelToggleLabel: string;
```

- [ ] **Step 2: Add the English strings**

In the `en` table, immediately after line 465 (`statsCollapseTitle: "Collapse / expand Match Stats",`), insert:

```ts
    positionHeatmapTitle: "Position Heatmap",
    positionHeatmapCollapseTitle: "Collapse / expand Position Heatmap",
    positionHeatmapAngelToggleLabel:
      "Only first 5s after opponent respawns (angel invincibility)",
```

- [ ] **Step 3: Add the Japanese strings**

In the `ja` table, immediately after line 912 (`statsCollapseTitle: "対戦データの折りたたみ / 展開",`), insert:

```ts
    positionHeatmapTitle: "ポジションヒートマップ",
    positionHeatmapCollapseTitle: "ポジションヒートマップの折りたたみ / 展開",
    positionHeatmapAngelToggleLabel:
      "相手のリスポーン無敵時間の最初の5秒のみ表示",
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors (both `en` and `ja` objects must satisfy `Translations`, so a missing field in either table would fail this).

- [ ] **Step 5: Commit**

```bash
git add src/i18n.ts
git commit -m "Add i18n strings for the Position Heatmap panel"
```

---

### Task 2: `collectHeatmapPoints` data module (TDD)

**Files:**
- Create: `src/positionHeatmap.ts`
- Test: `src/positionHeatmap.test.ts`

**Interfaces:**
- Consumes: `computeAngelInvincibilityEvents(replay: Replay): AngelInvincibilityEvent[]` from `src/angelInvincibility.ts` (existing; `AngelInvincibilityEvent` has `.kind: "angel-entered" | "angel-avoid-success" | "angel-avoid-failure"`, `.respawnPort: PortIndex`, `.frameIndex: number`). `getSeatedPorts(replay): readonly PortIndex[]` from `@rmg-k/rmgr`.
- Produces: `export interface HeatmapPoint { readonly x: number; readonly y: number; }`, `export interface HeatmapPoints { readonly perspective: readonly HeatmapPoint[]; readonly opponent: readonly HeatmapPoint[]; }`, `export function collectHeatmapPoints(replay: Replay, perspectivePort: PortIndex, opponentPort: PortIndex, onlyDuringAngelInvincibility: boolean): HeatmapPoints` — consumed by Task 5 (`matchView.ts`) and tested here.

- [ ] **Step 1: Write the failing tests**

Create `src/positionHeatmap.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Frame, PortIndex, Replay } from "@rmg-k/rmgr";
import { collectHeatmapPoints } from "./positionHeatmap.js";
import { DREAM_LAND_STAGE_ID } from "./stageGeometry.js";

function makeMockReplay(frames: Frame[], seated: PortIndex[] = [0, 1]): Replay {
  const slotType = ([0, 1, 2, 3] as PortIndex[]).map((p) =>
    seated.includes(p) ? "human" : "empty",
  ) as [
    "human" | "cpu" | "empty",
    "human" | "cpu" | "empty",
    "human" | "cpu" | "empty",
    "human" | "cpu" | "empty",
  ];
  return {
    header: {
      version: 5,
      gameFamily: "smash64",
      goodName: "Super Smash Bros. (U) (V1.0) [!]",
      recorderSchemaVersion: 1,
      recordedAtEpochMillis: 1724300000000,
      uncompressedLength: 0,
      compressedLength: 0,
    },
    matchStart: {
      playerNames: ["nue", "Kurabba", "", ""],
      slotType,
    },
    matchSettings: {
      stageId: DREAM_LAND_STAGE_ID,
      gameType: 2,
      stockCountSetting: 4,
      timeLimitMinutes: 100,
      damageRatio: 100,
      itemFrequency: 0,
      teamsEnabled: false,
      handicapMode: "off",
      characterId: [5, 9, 0, 0], // Link, Pikachu
      costumeId: [0, 0, 0, 0],
      teamColor: [0, 0, 0, 0],
      portTeam: [0, 1, 0, 0],
      portHandicap: [0, 0, 0, 0],
      portCpuLevel: [0, 0, 0, 0],
    },
    frames,
    matchEnd: {
      finalFrame: frames.at(-1)?.frame ?? 0,
      endReason: "normal",
    },
    matchResult: {
      placements: [1, 2, -1, -1],
    },
  };
}

interface PortState {
  state: number;
  x: number;
  y: number;
}

function makeFrame(
  frameNumber: number,
  p0: PortState | undefined,
  p1: PortState | undefined,
): Frame {
  const post = (port: PortIndex, characterId: number, p: PortState) => ({
    input: { frame: frameNumber, port, buttons: 0, stickX: 0, stickY: 0 },
    state: {
      frame: frameNumber,
      port,
      characterId,
      actionStateId: p.state,
      positionX: p.x,
      positionY: p.y,
      facingDirection: 1 as const,
      velocityX: 0,
      velocityY: 0,
      damagePercent: 0,
      stocksRemaining: 3,
      jumpsRemaining: 0,
      grounded: true,
      hurtboxState: 0,
      hitstunCounter: 0,
      actionFrameCounter: 0,
      comboHitCount: 0,
      comboDamage: 0,
    },
  });

  const ports: Record<number, unknown> = {};
  if (p0) ports[0] = post(0 as PortIndex, 5, p0);
  if (p1) ports[1] = post(1 as PortIndex, 9, p1);

  return {
    frame: frameNumber,
    ports: ports as unknown as Frame["ports"],
  };
}

// Action state 0x005 = Entry (spawn descent) — see RESPAWN_STATES in
// src/angelInvincibility.ts. A single frame in this state, followed by a
// frame out of it, produces one "angel-entered" event at the entry frame
// plus a resolve event 120 frames later; we only need the entry frame here.
const IDLE = 0x00a;
const ENTRY = 0x005;

describe("collectHeatmapPoints", () => {
  it("collects both ports' positions for every frame when the toggle is off", () => {
    const frames = [
      makeFrame(0, { state: IDLE, x: 0, y: 0 }, { state: IDLE, x: 100, y: 0 }),
      makeFrame(1, { state: IDLE, x: 10, y: 0 }, { state: IDLE, x: 110, y: 0 }),
    ];
    const replay = makeMockReplay(frames);

    const result = collectHeatmapPoints(replay, 0 as PortIndex, 1 as PortIndex, false);

    expect(result.perspective).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(result.opponent).toEqual([
      { x: 100, y: 0 },
      { x: 110, y: 0 },
    ]);
  });

  it("skips a frame where a port has no state (not seated yet that frame)", () => {
    const frames = [
      makeFrame(0, { state: IDLE, x: 0, y: 0 }, undefined),
      makeFrame(1, { state: IDLE, x: 10, y: 0 }, { state: IDLE, x: 110, y: 0 }),
    ];
    const replay = makeMockReplay(frames);

    const result = collectHeatmapPoints(replay, 0 as PortIndex, 1 as PortIndex, false);

    expect(result.perspective).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(result.opponent).toEqual([{ x: 110, y: 0 }]);
  });

  it("with the toggle on, only includes frames within 300 frames of an angel-entered event for the opponent port", () => {
    const frames: Frame[] = [];
    // Frames 0-4: opponent (port 1) not respawning - outside any window.
    for (let f = 0; f < 5; f++) {
      frames.push(
        makeFrame(f, { state: IDLE, x: 0, y: 0 }, { state: IDLE, x: 999, y: 999 }),
      );
    }
    // Frame 5: opponent enters respawn platform - "angel-entered" fires here.
    frames.push(
      makeFrame(5, { state: IDLE, x: 1, y: 0 }, { state: ENTRY, x: 200, y: 0 }),
    );
    // Frame 6: still within the 300-frame window (5 to 304 inclusive-exclusive).
    frames.push(
      makeFrame(6, { state: IDLE, x: 2, y: 0 }, { state: IDLE, x: 201, y: 0 }),
    );
    // Frame 305: outside the window (5 + 300 = 305).
    frames.push(
      makeFrame(305, { state: IDLE, x: 3, y: 0 }, { state: IDLE, x: 999, y: 999 }),
    );
    const replay = makeMockReplay(frames);

    const result = collectHeatmapPoints(replay, 0 as PortIndex, 1 as PortIndex, true);

    // Frame indices 5 and 6 are within the window (frames array index ==
    // frame number here since every frame number 0..6 is present in order,
    // then index 7 holds frame number 305 which is excluded).
    expect(result.perspective).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
    expect(result.opponent).toEqual([
      { x: 200, y: 0 },
      { x: 201, y: 0 },
    ]);
  });

  it("does not double-count a frame covered by two overlapping angel-invincibility windows", () => {
    const frames: Frame[] = [];
    // Frame 0: opponent enters respawn (window A: frames 0-299).
    frames.push(
      makeFrame(0, { state: IDLE, x: 1, y: 0 }, { state: ENTRY, x: 200, y: 0 }),
    );
    // Frame 1: opponent drops off platform then immediately re-enters
    // (window B: frames 2-301) - overlaps window A over frames 2-299.
    frames.push(
      makeFrame(1, { state: IDLE, x: 2, y: 0 }, { state: IDLE, x: 201, y: 0 }),
    );
    frames.push(
      makeFrame(2, { state: IDLE, x: 3, y: 0 }, { state: ENTRY, x: 202, y: 0 }),
    );

    const replay = makeMockReplay(frames);
    const result = collectHeatmapPoints(replay, 0 as PortIndex, 1 as PortIndex, true);

    // Frame index 2 must appear exactly once, not twice.
    expect(result.perspective).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it("returns empty arrays for a non-1v1 replay (3 seated ports) regardless of the toggle", () => {
    const frames = [
      {
        frame: 0,
        ports: {
          0: {
            input: { frame: 0, port: 0, buttons: 0, stickX: 0, stickY: 0 },
            state: {
              frame: 0,
              port: 0,
              characterId: 5,
              actionStateId: IDLE,
              positionX: 0,
              positionY: 0,
              facingDirection: 1 as const,
              velocityX: 0,
              velocityY: 0,
              damagePercent: 0,
              stocksRemaining: 3,
              jumpsRemaining: 0,
              grounded: true,
              hurtboxState: 0,
              hitstunCounter: 0,
              actionFrameCounter: 0,
              comboHitCount: 0,
              comboDamage: 0,
            },
          },
        },
      } as unknown as Frame,
    ];
    const replay = makeMockReplay(frames, [0, 1, 2] as PortIndex[]);

    const resultOff = collectHeatmapPoints(replay, 0 as PortIndex, 1 as PortIndex, false);
    const resultOn = collectHeatmapPoints(replay, 0 as PortIndex, 1 as PortIndex, true);

    expect(resultOff).toEqual({ perspective: [], opponent: [] });
    expect(resultOn).toEqual({ perspective: [], opponent: [] });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/positionHeatmap.test.ts`
Expected: FAIL — `Cannot find module './positionHeatmap.js'` (the file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/positionHeatmap.ts`:

```ts
import { getSeatedPorts, type PortIndex, type Replay } from "@rmg-k/rmgr";
import { computeAngelInvincibilityEvents } from "./angelInvincibility.js";

export interface HeatmapPoint {
  readonly x: number;
  readonly y: number;
}

export interface HeatmapPoints {
  readonly perspective: readonly HeatmapPoint[];
  readonly opponent: readonly HeatmapPoint[];
}

/** 5 seconds at this app's fixed 60 FPS (see src/playback.ts's local FPS constant). */
const ANGEL_WINDOW_FRAMES = 300;

/**
 * Collects per-frame stage positions for `perspectivePort` and
 * `opponentPort`. When `onlyDuringAngelInvincibility` is true, only frames
 * within 300 frames (5s) after each of the opponent's "angel-entered"
 * respawn events are included, for both ports; overlapping windows aren't
 * double-counted. Empty for any replay that isn't exactly 1v1.
 */
export function collectHeatmapPoints(
  replay: Replay,
  perspectivePort: PortIndex,
  opponentPort: PortIndex,
  onlyDuringAngelInvincibility: boolean,
): HeatmapPoints {
  if (getSeatedPorts(replay).length !== 2) {
    return { perspective: [], opponent: [] };
  }

  let allowedFrameIndices: Set<number> | null = null;
  if (onlyDuringAngelInvincibility) {
    allowedFrameIndices = new Set<number>();
    for (const ev of computeAngelInvincibilityEvents(replay)) {
      if (ev.kind !== "angel-entered" || ev.respawnPort !== opponentPort) continue;
      const end = Math.min(
        replay.frames.length,
        ev.frameIndex + ANGEL_WINDOW_FRAMES,
      );
      for (let i = ev.frameIndex; i < end; i++) {
        allowedFrameIndices.add(i);
      }
    }
  }

  const perspective: HeatmapPoint[] = [];
  const opponent: HeatmapPoint[] = [];

  for (let i = 0; i < replay.frames.length; i++) {
    if (allowedFrameIndices !== null && !allowedFrameIndices.has(i)) continue;
    const frame = replay.frames[i];
    if (!frame) continue;

    const pState = frame.ports[perspectivePort]?.state;
    if (pState) perspective.push({ x: pState.positionX, y: pState.positionY });

    const oState = frame.ports[opponentPort]?.state;
    if (oState) opponent.push({ x: oState.positionX, y: oState.positionY });
  }

  return { perspective, opponent };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/positionHeatmap.test.ts`
Expected: PASS (all 5 tests).

- [ ] **Step 5: Full verification**

Run: `npx tsc --noEmit && npx eslint . && npx prettier --check src/positionHeatmap.ts src/positionHeatmap.test.ts`
Expected: no errors. If prettier fails, run `npx prettier --write src/positionHeatmap.ts src/positionHeatmap.test.ts` and re-check.

- [ ] **Step 6: Commit**

```bash
git add src/positionHeatmap.ts src/positionHeatmap.test.ts
git commit -m "Add collectHeatmapPoints: per-port position collection with angel-invincibility window filter"
```

---

### Task 3: `renderPositionHeatmap` canvas renderer

**Files:**
- Create: `src/positionHeatmapRenderer.ts`

**Interfaces:**
- Consumes: `HeatmapPoints`, `HeatmapPoint` from `./positionHeatmap.js` (Task 2). `stageGeometry(stageId: number | undefined): PlatformSpec[] | undefined` and `stageBlastZone(stageId: number | undefined): BlastZoneSpec | undefined` from `./stageGeometry.js` (existing — `PlatformSpec` has `leftX/rightX/y/kind`, `BlastZoneSpec` has `leftX/rightX/bottomY/topY`). `MAIN_PLAYER_COLOR`, `OPPONENT_COLOR` from `./players.js` (existing).
- Produces: `export function renderPositionHeatmap(canvas: HTMLCanvasElement, stageId: number | undefined, points: HeatmapPoints): void` — consumed by Task 5 (`matchView.ts`).

No unit test for this task, per the design doc: canvas-drawing code elsewhere in this app (`src/renderer.ts`) is untested too; this is verified in Task 6's manual browser smoke test instead.

- [ ] **Step 1: Write the implementation**

Create `src/positionHeatmapRenderer.ts`:

```ts
import { MAIN_PLAYER_COLOR, OPPONENT_COLOR } from "./players.js";
import { stageBlastZone, stageGeometry } from "./stageGeometry.js";
import type { HeatmapPoint, HeatmapPoints } from "./positionHeatmap.js";

const GRID_COLS = 60;
const GRID_ROWS = 36;
/** Any visited cell is at least this visible, even if its count is tiny relative to the hottest cell. */
const MIN_CELL_ALPHA = 0.08;

function buildGrid(
  points: readonly HeatmapPoint[],
  leftX: number,
  rightX: number,
  bottomY: number,
  topY: number,
): { counts: Uint32Array; max: number } {
  const counts = new Uint32Array(GRID_COLS * GRID_ROWS);
  let max = 0;
  const width = rightX - leftX;
  const height = topY - bottomY;

  for (const p of points) {
    if (width <= 0 || height <= 0) continue;
    const nx = (p.x - leftX) / width;
    const ny = (p.y - bottomY) / height;
    if (nx < 0 || nx >= 1 || ny < 0 || ny >= 1) continue;

    const col = Math.min(GRID_COLS - 1, Math.floor(nx * GRID_COLS));
    // Flip vertically: world Y grows up, grid row 0 is the top of the canvas.
    const row = Math.min(
      GRID_ROWS - 1,
      GRID_ROWS - 1 - Math.floor(ny * GRID_ROWS),
    );
    const idx = row * GRID_COLS + col;
    counts[idx]++;
    if (counts[idx] > max) max = counts[idx];
  }

  return { counts, max };
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  counts: Uint32Array,
  max: number,
  color: string,
  cellWidth: number,
  cellHeight: number,
): void {
  if (max === 0) return;
  ctx.fillStyle = color;
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const count = counts[row * GRID_COLS + col];
      if (count === 0) continue;
      const alpha = Math.max(MIN_CELL_ALPHA, count / max);
      ctx.globalAlpha = alpha;
      ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * Renders a static grid-density heatmap of `points` onto `canvas`, scaled
 * to `stageId`'s blast-zone extent. Draws a faint platform outline first
 * for spatial reference. Clears the canvas (no-op draw) if the stage's
 * geometry/blast-zone isn't in the lookup tables yet (see
 * src/stageGeometry.ts — only Dream Land is populated as of this writing).
 */
export function renderPositionHeatmap(
  canvas: HTMLCanvasElement,
  stageId: number | undefined,
  points: HeatmapPoints,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const blastZone = stageBlastZone(stageId);
  if (!blastZone) return;

  const { leftX, rightX, bottomY, topY } = blastZone;
  const worldWidth = rightX - leftX;
  const worldHeight = topY - bottomY;
  if (worldWidth <= 0 || worldHeight <= 0) return;

  const toCanvasX = (x: number) => ((x - leftX) / worldWidth) * canvas.width;
  const toCanvasY = (y: number) =>
    canvas.height - ((y - bottomY) / worldHeight) * canvas.height;

  const platforms = stageGeometry(stageId);
  if (platforms) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    for (const platform of platforms) {
      const y = toCanvasY(platform.y);
      ctx.beginPath();
      ctx.moveTo(toCanvasX(platform.leftX), y);
      ctx.lineTo(toCanvasX(platform.rightX), y);
      ctx.stroke();
    }
  }

  const cellWidth = canvas.width / GRID_COLS;
  const cellHeight = canvas.height / GRID_ROWS;

  const perspectiveGrid = buildGrid(
    points.perspective,
    leftX,
    rightX,
    bottomY,
    topY,
  );
  const opponentGrid = buildGrid(points.opponent, leftX, rightX, bottomY, topY);

  drawLayer(
    ctx,
    perspectiveGrid.counts,
    perspectiveGrid.max,
    MAIN_PLAYER_COLOR,
    cellWidth,
    cellHeight,
  );
  drawLayer(
    ctx,
    opponentGrid.counts,
    opponentGrid.max,
    OPPONENT_COLOR,
    cellWidth,
    cellHeight,
  );
}
```

- [ ] **Step 2: Verify it compiles and lints**

Run: `npx tsc --noEmit && npx eslint . && npx prettier --check src/positionHeatmapRenderer.ts`
Expected: no errors. If prettier fails, run `npx prettier --write src/positionHeatmapRenderer.ts` and re-check.

- [ ] **Step 3: Commit**

```bash
git add src/positionHeatmapRenderer.ts
git commit -m "Add renderPositionHeatmap: grid-density canvas renderer for stage positions"
```

---

### Task 4: HTML markup and CSS for the new panel

**Files:**
- Modify: `index.html:4917` (insert new section after `</section>` closing `#matchStats`), `index.html` `<style>` block (add new rules near the existing `#matchStats`/`#statsPanel` rules at lines 2753-2806 and 3973-3982)

**Interfaces:**
- Produces: DOM elements `#positionHeatmapSection` (the `<section>`, `hidden` by default), `#positionHeatmapCollapseBtn`, `#positionHeatmapPanelBody`, `#positionHeatmapAngelToggle` (checkbox `<input>`), `#positionHeatmapCanvas` — all consumed by Task 5 (`matchView.ts`).

- [ ] **Step 1: Insert the new section markup**

In `index.html`, immediately after line 4917 (`</section>` closing `#matchStats`, right before `<section id="characterMetaWidget" hidden>`), insert:

```html
          <section id="positionHeatmapSection" hidden>
            <div id="positionHeatmapHeader">
              <button
                id="positionHeatmapCollapseBtn"
                title="Collapse / expand Position Heatmap"
              >
                <span class="collapse-icon">▼</span>
                <h2>Position Heatmap</h2>
              </button>
            </div>
            <div id="positionHeatmapPanelBody">
              <label id="positionHeatmapAngelToggleLabel">
                <input type="checkbox" id="positionHeatmapAngelToggle" />
                <span>Only first 5s after opponent respawns (angel invincibility)</span>
              </label>
              <canvas id="positionHeatmapCanvas" width="600" height="360"></canvas>
            </div>
          </section>
```

(The hardcoded English text here — button title, `<h2>`, checkbox label — is a placeholder DOM structure only; Task 5 overwrites all three via `t()` on every render, same as how `#matchStatsHeader h2` is populated dynamically in `matchView.ts`'s existing code. This matches the existing convention: `index.html`'s static text is never actually shown because the constructor/`updateLanguage` path always sets `.textContent`/`.title` from the current language table before first paint.)

- [ ] **Step 2: Add CSS**

In `index.html`'s `<style>` block, immediately after line 2806 (the closing brace of the `#statsCollapseBtn:hover h2, #characterMetaCollapseBtn:hover h2` rule), insert:

```css
      #positionHeatmapSection {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        gap: 0;
        background: var(--panel);
        border: 1px solid var(--panel-border);
        border-radius: 8px;
        overflow: hidden;
      }
      #positionHeatmapSection[hidden] {
        display: none !important;
      }
      #positionHeatmapHeader {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-bottom: 1px solid var(--panel-border);
        flex-shrink: 0;
        flex-wrap: wrap;
      }
      #positionHeatmapCollapseBtn {
        display: flex;
        align-items: center;
        gap: 6px;
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        color: var(--text-dim);
      }
      #positionHeatmapCollapseBtn:hover {
        color: var(--text);
      }
      #positionHeatmapCollapseBtn:hover h2 {
        color: var(--text);
      }
      #positionHeatmapCollapseBtn.collapsed .collapse-icon {
        transform: rotate(-90deg);
      }
      #positionHeatmapHeader h2 {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-dim);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin: 0;
        flex-shrink: 0;
      }
```

And immediately after line 3982 (the closing brace of the `#statsPanel[hidden]` rule), insert:

```css
      #positionHeatmapPanelBody {
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 12px;
      }
      #positionHeatmapPanelBody[hidden] {
        display: none !important;
      }
      #positionHeatmapAngelToggleLabel {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        color: var(--text-dim);
      }
      #positionHeatmapCanvas {
        width: 100%;
        height: auto;
        aspect-ratio: 600 / 360;
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.15);
      }
```

- [ ] **Step 3: Verify the page still loads with no console errors**

This step is manual/visual and is folded into Task 6's browser smoke test rather than repeated here, since `index.html` changes alone (with `matchView.ts` not yet wired) would just show an inert, permanently-hidden section — nothing observable yet.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "Add Position Heatmap panel markup and styles beneath Match Stats"
```

---

### Task 5: Wire the panel into `matchView.ts`

**Files:**
- Modify: `src/match/matchView.ts` (imports; field declarations near line 154-159; constructor `getElementById` wiring near line 371-385; event listener setup near line 778-781; a new `renderPositionHeatmapPanel` method; call sites at `loadMatch` ~line 3907, `buildPerspectiveToggle`'s click handler ~line 1981, and the language-refresh block ~line 1453)

**Interfaces:**
- Consumes: `collectHeatmapPoints` (Task 2), `renderPositionHeatmap` (Task 3), `getSeatedPorts` (already imported from `@rmg-k/rmgr`), `t()` (already imported from `./i18n.js`), `this.perspectivePort: PortIndex | null` (existing field), `this.currentReplay: Replay | null` (existing field).
- Produces: `private renderPositionHeatmapPanel(replay: Replay): void` — no other file calls this (kept private, only used within `matchView.ts`'s own render call sites).

- [ ] **Step 1: Add the import**

In `src/match/matchView.ts`, immediately after line 10 (`import { PORT_LABELS, getPlayerColor } from "../players.js";`), insert:

```ts
import { collectHeatmapPoints } from "../positionHeatmap.js";
import { renderPositionHeatmap } from "../positionHeatmapRenderer.js";
```

- [ ] **Step 2: Add field declarations**

Immediately after line 157 (`private statsPanel: HTMLDivElement;`), insert:

```ts
  private positionHeatmapSection: HTMLElement;
  private positionHeatmapCollapseBtn: HTMLButtonElement;
  private positionHeatmapHeaderTitle: HTMLHeadingElement;
  private positionHeatmapPanelBody: HTMLDivElement;
  private positionHeatmapAngelToggleLabelText: HTMLSpanElement;
  private positionHeatmapAngelToggle: HTMLInputElement;
  private positionHeatmapCanvas: HTMLCanvasElement;
  private positionHeatmapCollapsed = false;
```

- [ ] **Step 3: Add `getElementById` wiring in the constructor**

Immediately after line 380 (`this.statsPanel = document.getElementById("statsPanel") as HTMLDivElement;`), insert:

```ts
    this.positionHeatmapSection = document.getElementById(
      "positionHeatmapSection",
    ) as HTMLElement;
    this.positionHeatmapCollapseBtn = document.getElementById(
      "positionHeatmapCollapseBtn",
    ) as HTMLButtonElement;
    this.positionHeatmapHeaderTitle = document.querySelector(
      "#positionHeatmapHeader h2",
    ) as HTMLHeadingElement;
    this.positionHeatmapPanelBody = document.getElementById(
      "positionHeatmapPanelBody",
    ) as HTMLDivElement;
    this.positionHeatmapAngelToggleLabelText = document.querySelector(
      "#positionHeatmapAngelToggleLabel span",
    ) as HTMLSpanElement;
    this.positionHeatmapAngelToggle = document.getElementById(
      "positionHeatmapAngelToggle",
    ) as HTMLInputElement;
    this.positionHeatmapCanvas = document.getElementById(
      "positionHeatmapCanvas",
    ) as HTMLCanvasElement;
```

- [ ] **Step 4: Add event listeners**

Immediately after line 781 (`this.statsCollapseBtn.classList.toggle("collapsed", this.statsCollapsed);` and its closing `});`), insert:

```ts
    this.positionHeatmapCollapseBtn.addEventListener("click", () => {
      this.positionHeatmapCollapsed = !this.positionHeatmapCollapsed;
      this.positionHeatmapPanelBody.hidden = this.positionHeatmapCollapsed;
      this.positionHeatmapCollapseBtn.classList.toggle(
        "collapsed",
        this.positionHeatmapCollapsed,
      );
    });

    this.positionHeatmapAngelToggle.addEventListener("change", () => {
      if (this.currentReplay) {
        this.renderPositionHeatmapPanel(this.currentReplay);
      }
    });
```

- [ ] **Step 5: Add the `renderPositionHeatmapPanel` method**

Immediately before the existing `private renderStatsPanel(replay: Replay): void {` method (around line 2152), insert:

```ts
  private renderPositionHeatmapPanel(replay: Replay): void {
    const seated = getSeatedPorts(replay);
    if (seated.length !== 2 || this.perspectivePort === null) {
      this.positionHeatmapSection.hidden = true;
      return;
    }

    this.positionHeatmapSection.hidden = false;
    const opponentPort = seated.find((p) => p !== this.perspectivePort)!;

    const points = collectHeatmapPoints(
      replay,
      this.perspectivePort,
      opponentPort,
      this.positionHeatmapAngelToggle.checked,
    );
    renderPositionHeatmap(
      this.positionHeatmapCanvas,
      replay.matchSettings?.stageId,
      points,
    );
  }
```

- [ ] **Step 6: Call it from `loadMatch`**

Immediately after line 3907 (`this.renderStatsPanel(replay);` inside `loadMatch`), insert:

```ts
    this.renderPositionHeatmapPanel(replay);
```

- [ ] **Step 7: Call it from the perspective-toggle click handler**

Immediately after line 1981 (`this.renderStatsPanel(replay);` inside `buildPerspectiveToggle`'s button click handler), insert:

```ts
        this.renderPositionHeatmapPanel(replay);
```

(Note the extra indentation — this call site is nested inside the `btn.addEventListener("click", () => { ... })` callback, one level deeper than Step 6's call site.)

- [ ] **Step 8: Call it from the language-refresh block**

Immediately after line 1453 (`this.renderStatsPanel(this.currentReplay);` inside the `if (this.currentReplay && this.currentLoaded) { ... }` block), insert:

```ts
      this.renderPositionHeatmapPanel(this.currentReplay);
```

- [ ] **Step 9: Wire the i18n text refresh**

Immediately after line 1321 (`this.statsCollapseBtn.title = tr.statsCollapseTitle;`), insert:

```ts
    if (this.positionHeatmapCollapseBtn)
      this.positionHeatmapCollapseBtn.title = tr.positionHeatmapCollapseTitle;
    if (this.positionHeatmapHeaderTitle)
      this.positionHeatmapHeaderTitle.textContent = tr.positionHeatmapTitle;
    if (this.positionHeatmapAngelToggleLabelText)
      this.positionHeatmapAngelToggleLabelText.textContent =
        tr.positionHeatmapAngelToggleLabel;
```

- [ ] **Step 10: Verify it compiles and lints**

Run: `npx tsc --noEmit && npx eslint . && npx prettier --check src/match/matchView.ts`
Expected: no errors. If prettier fails, run `npx prettier --write src/match/matchView.ts` and re-check.

- [ ] **Step 11: Run the full test suite**

Run: `npx vitest run`
Expected: all existing tests still pass (no test targets `matchView.ts` directly today, so this is a regression check on everything else, not new coverage).

- [ ] **Step 12: Commit**

```bash
git add src/match/matchView.ts
git commit -m "Wire Position Heatmap panel into matchView: render on load, perspective change, and language change"
```

---

### Task 6: Manual browser smoke test

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (or use the project's existing Vite dev workflow)

- [ ] **Step 2: Load a real 1v1 Dream Land replay**

Use one of the bundled `public/replays/*.rmgr` files or a file from `replays/nue replays (v5)/`.

- [ ] **Step 3: Verify the panel appears**

Confirm a "Position Heatmap" section is visible directly below "Match Stats", collapsed/expanded via its own button independently of Match Stats.

- [ ] **Step 4: Verify the heatmap content**

Confirm blue cells appear where the perspective player spent time and grey cells where the opponent did, roughly matching the stage's ground/platform outline drawn underneath.

- [ ] **Step 5: Verify the checkbox**

Toggle "Only first 5s after opponent respawns (angel invincibility)" on. Confirm the heatmap changes to a sparser set of cells (or goes blank if that match had no deaths). Toggle it back off and confirm it returns to the full-match heatmap.

- [ ] **Step 6: Verify perspective switching**

Click the other player's perspective-toggle button. Confirm the blue/grey assignment swaps (the panel re-renders with colors flipped) and the checkbox state is preserved across the switch.

- [ ] **Step 7: Verify the panel hides for a non-1v1 or CPU-only edge case if one is available**

If a 1-player or non-Dream-Land (no blast zone data) replay is available, confirm the section either hides itself (non-2-seat case) or renders an empty/no-op canvas without throwing (missing-blast-zone case) — check the browser console for errors in both cases.

- [ ] **Step 8: Check for console errors**

Confirm no new errors/warnings appear in the browser console throughout steps 2-7.
