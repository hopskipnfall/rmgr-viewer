# Position Heatmap panel

## Summary

A new collapsible panel, placed directly below the existing "Match Stats"
panel, showing a static heatmap of both players' stage positions across the
whole loaded match. A checkbox restricts the heatmap to only the first 5
seconds after each of the opponent's respawns (their "angel invincibility"
window), to help visualize how the perspective player positions/approaches
during that window.

Follows the app's existing blue-vs-grey perspective/opponent color
convention (`MAIN_PLAYER_COLOR` / `OPPONENT_COLOR` in `src/players.ts`).

## Scope

- 1v1 matches only (`getSeatedPorts(replay).length === 2`). The panel is
  hidden entirely for any other seated-port count, matching how
  `computeAngelInvincibilityEvents` already restricts itself to 2 players.
- Static per-match render — does not track/follow the playhead. Re-renders
  only when a new match loads or the checkbox is toggled.
- No new dependency on unresolved data (e.g. no attacker-attribution field
  needed) — uses only `StateFrame.positionX/positionY`, which is already
  present per-frame per-port.

## Data & filtering (`src/positionHeatmap.ts`, new file)

```ts
export interface HeatmapPoint {
  readonly x: number;
  readonly y: number;
}

export interface HeatmapPoints {
  readonly perspective: readonly HeatmapPoint[];
  readonly opponent: readonly HeatmapPoint[];
}

export function collectHeatmapPoints(
  replay: Replay,
  perspectivePort: PortIndex,
  opponentPort: PortIndex,
  onlyDuringAngelInvincibility: boolean,
): HeatmapPoints;
```

- Default (toggle off): iterate every frame, pushing
  `{ x: state.positionX, y: state.positionY }` for both ports whenever
  `frame.ports[port]?.state` is present.
- Toggle on: call `computeAngelInvincibilityEvents(replay)` (existing,
  `src/angelInvincibility.ts`), filter to events where
  `respawnPort === opponentPort && kind === "angel-entered"`. For each such
  event, include frames `[frameIndex, frameIndex + 300)` (300 = 5s at the
  N64's fixed 60 FPS — `src/playback.ts` has a local, unexported `FPS = 60`
  constant for the same rate; define a local `const WINDOW_FRAMES = 300` in
  `positionHeatmap.ts` rather than importing across that module boundary)
  for **both**
  ports, clamped to `replay.frames.length`. Multiple respawns produce
  multiple (possibly overlapping) windows; a frame covered by more than one
  window is only counted once (dedupe by frame index in a `Set` while
  building the window list before pulling points).
- No new "neutral play" concept — this replaces that idea per the pivot
  during brainstorming.

## Rendering (new function, `renderPositionHeatmap`)

Location: a small addition to `src/renderer.ts` (co-located with the other
canvas-drawing stage helpers, which already import `stageGeometry`/
`stageBlastZone`), or a new `src/positionHeatmapRenderer.ts` if it turns out
cleaner to keep canvas-drawing code separate from the data-collection file
above — implementer's call, whichever keeps `renderer.ts` from growing
further; prefer the new file unless there's meaningful shared state with
`StageRenderer` that makes embedding it there clearly simpler.

Approach: grid-based density heatmap, not per-point blob rendering (chosen
for O(matchLength) performance with matches in the low thousands of frames,
and simpler additive-color math than overlapping radial gradients):

1. Get `stageBlastZone(replay.matchSettings.stageId)` for the world-space
   extent to bucket over (fall back to a sane default extent if `undefined`
   for an unmapped stage — reuse whatever `renderer.ts` already does for
   that case, if anything).
2. Divide that extent into a fixed grid (e.g. 60x36 cells — exact
   resolution is an implementation detail to tune visually, not a decision
   this spec needs to pin down).
3. For each of `perspective`/`opponent` point arrays independently, tally a
   count per grid cell.
4. Normalize each layer's counts to its own max cell count (so the busier
   player's hottest cell is always full intensity, not a fixed absolute
   scale — avoids a heatmap that looks empty just because a match was
   short).
5. Draw two layers on an offscreen or panel-owned `<canvas>`: for each
   non-empty cell, fill a rect (or rounded blob) at that grid position with
   the layer's color (`MAIN_PLAYER_COLOR` / `OPPONENT_COLOR` from
   `src/players.ts`) at `alpha = normalizedCount` (with a floor, e.g.
   `Math.max(0.08, normalizedCount)`, so any visited cell is at least
   faintly visible). Draw perspective first, then opponent, both under
   normal (non-additive) canvas composition — overlap will show as a
   blended color, which is acceptable/expected.
6. Before the two data layers, draw a faint outline of the stage's
   platforms (`stageGeometry(stageId)`) and the blast-zone boundary for
   spatial orientation, reusing the same world-to-canvas scaling math as
   the data layers (a local, panel-scoped transform — this does **not**
   need to share `Camera`/`worldToScreen` from the main stage view, since
   the panel has its own independently-sized canvas).

## UI wiring

`index.html`: new section inserted immediately after `</section>` closing
`#matchStats` (before `<section id="characterMetaWidget">`):

```html
<section id="positionHeatmap" hidden>
  <div id="positionHeatmapHeader">
    <button id="positionHeatmapCollapseBtn">…</button>
    <h2>Position Heatmap</h2>
  </div>
  <div id="positionHeatmapPanel">
    <label>
      <input type="checkbox" id="positionHeatmapAngelToggle" />
      Only first 5s after opponent respawns (angel invincibility)
    </label>
    <canvas id="positionHeatmapCanvas"></canvas>
  </div>
</section>
```

`hidden` by default; `matchView.ts` un-hides it only when the loaded match
is 1v1 (mirrors how other conditionally-relevant panels are shown/hidden
elsewhere in that file).

`src/match/matchView.ts`:

- Field/getElementById wiring for the new elements, following the same
  pattern as `statsCollapseBtn`/`statsPanel` (collapse) and the Quick
  Attack overlay button (checkbox-driven re-render).
- On match load: if 1v1, un-hide the section and call a
  `renderPositionHeatmapPanel(replay)` method that calls
  `collectHeatmapPoints` + `renderPositionHeatmap`; if not 1v1, keep it
  hidden and skip the work entirely.
- Checkbox `change` handler: re-run `renderPositionHeatmapPanel(replay)`
  with the new toggle state — cheap enough (single pass over frames) to
  just recompute rather than caching both variants.
- Collapse button: same show/hide-body + class-toggle pattern as
  `statsCollapseBtn`.

## Testing

- `src/positionHeatmap.test.ts`: unit tests for `collectHeatmapPoints`
  against small hand-built `Replay` fixtures (following the existing v5
  fixture style used in `src/edgeGuard.test.ts`/`src/characterMeta.test.ts`):
  - Toggle off: returns one point per port per frame that has state.
  - Toggle on: returns only points within `[frameIndex, frameIndex + 300)`
    of each `angel-entered` event for `opponentPort`; verify a frame
    outside all windows is excluded, and a frame in two overlapping windows
    is only counted once per port.
  - Non-1v1 replay (or an angel-invincibility event set that's empty
    because seating isn't 2) with the toggle on returns empty arrays rather
    than throwing.
- No dedicated unit test planned for the canvas-drawing function itself
  (consistent with how other canvas-drawing code in `renderer.ts` is
  currently untested) — verified instead via a manual browser smoke test
  loading a real 1v1 replay and toggling the checkbox.

## Out of scope

- The "neutral play" toggle originally discussed — replaced by the angel
  invincibility toggle per the pivot during brainstorming.
- Multi-player (3-4 seat) support.
- Live/playhead-following heatmap.
- Any new attacker-attribution data (not needed for this feature).
