import { MAIN_PLAYER_COLOR, OPPONENT_COLOR } from "./players.js";
import { stageBlastZone, stageGeometry, stageSlopes } from "./stageGeometry.js";
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
    counts[idx]!++;
    if (counts[idx]! > max) max = counts[idx]!;
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
      const count = counts[row * GRID_COLS + col]!;
      if (count === 0) continue;
      // Position data is heavily long-tailed (spawn points, ledges, center
      // stage dominate), so a linear count/max ratio clamps almost every
      // cell to MIN_CELL_ALPHA. Compress with sqrt so mid-frequency cells
      // stay visually distinct instead of reading as a near-binary map.
      const alpha =
        MIN_CELL_ALPHA + (1 - MIN_CELL_ALPHA) * Math.sqrt(count / max);
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

  const slopes = stageSlopes(stageId);
  if (slopes) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    for (const slope of [slopes.leftSlope, slopes.rightSlope]) {
      ctx.beginPath();
      ctx.moveTo(toCanvasX(slope[0]!.x), toCanvasY(slope[0]!.y));
      for (let i = 1; i < slope.length; i++) {
        ctx.lineTo(toCanvasX(slope[i]!.x), toCanvasY(slope[i]!.y));
      }
      ctx.stroke();
    }
    const bottomL = slopes.leftSlope[slopes.leftSlope.length - 1]!;
    const bottomR = slopes.rightSlope[slopes.rightSlope.length - 1]!;
    ctx.beginPath();
    ctx.moveTo(toCanvasX(bottomL.x), toCanvasY(bottomL.y));
    ctx.lineTo(toCanvasX(bottomR.x), toCanvasY(bottomR.y));
    ctx.stroke();
  }

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
