import { MAIN_PLAYER_COLOR } from "./players.js";
import {
  stageBlastZone,
  stageGeometry,
  stageHeatmapBounds,
  stageSlopes,
} from "./stageGeometry.js";
import type { HeatmapPoint, HeatmapPoints } from "./neutralHeatmap.js";

export type HeatmapTarget = "me" | "opponent";

export const HEATMAP_ME_COLOR = MAIN_PLAYER_COLOR; // Blue (#3b82f6)
export const HEATMAP_OPPONENT_COLOR = "#ef4444"; // Red

const GRID_COLS = 60;
const GRID_ROWS = 36;
/** Any visited cell is at least this visible, even if its count is tiny relative to the hottest cell. */
const MIN_CELL_ALPHA = 0.05;

/** Weight for the immediate square occupied in a frame. */
const KERNEL_CENTER = 1.0;
/** Weight for the 4 orthogonal squares immediately adjacent (up, down, left, right). */
const KERNEL_ORTHOGONAL = 0.5;
/** Weight for the 4 diagonal corner squares. */
const KERNEL_DIAGONAL = 0.25;

function buildGrid(
  points: readonly HeatmapPoint[],
  leftX: number,
  rightX: number,
  bottomY: number,
  topY: number,
): { counts: Float32Array; max: number } {
  const counts = new Float32Array(GRID_COLS * GRID_ROWS);
  let max = 0;
  const width = rightX - leftX;
  const height = topY - bottomY;

  for (const p of points) {
    if (width <= 0 || height <= 0) continue;
    const nx = (p.x - leftX) / width;
    const ny = (p.y - bottomY) / height;
    if (nx < 0 || nx >= 1 || ny < 0 || ny >= 1) continue;

    const centerCol = Math.min(GRID_COLS - 1, Math.floor(nx * GRID_COLS));
    // Flip vertically: world Y grows up, grid row 0 is the top of the canvas.
    const centerRow = Math.min(
      GRID_ROWS - 1,
      GRID_ROWS - 1 - Math.floor(ny * GRID_ROWS),
    );

    for (let dr = -1; dr <= 1; dr++) {
      const r = centerRow + dr;
      if (r < 0 || r >= GRID_ROWS) continue;
      for (let dc = -1; dc <= 1; dc++) {
        const c = centerCol + dc;
        if (c < 0 || c >= GRID_COLS) continue;

        const weight =
          dr === 0 && dc === 0
            ? KERNEL_CENTER
            : dr === 0 || dc === 0
              ? KERNEL_ORTHOGONAL
              : KERNEL_DIAGONAL;

        const idx = r * GRID_COLS + c;
        const nextVal = counts[idx]! + weight;
        counts[idx] = nextVal;
        if (nextVal > max) max = nextVal;
      }
    }
  }

  return { counts, max };
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  counts: Float32Array,
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
      if (count <= 0) continue;
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
 * to `stageId`'s stage framing bounds. Draws a faint platform outline first
 * for spatial reference. Renders only the selected target ("me" in blue or
 * "opponent" in red) so characters do not overlap or clutter each other.
 */
export function renderNeutralHeatmap(
  canvas: HTMLCanvasElement,
  stageId: number | undefined,
  points: HeatmapPoints,
  target: HeatmapTarget = "me",
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bounds = stageHeatmapBounds(stageId) ?? stageBlastZone(stageId);
  if (!bounds) return;

  const { leftX, rightX, bottomY, topY } = bounds;
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

  const targetPoints =
    target === "opponent" ? points.opponent : points.perspective;
  const targetColor =
    target === "opponent" ? HEATMAP_OPPONENT_COLOR : HEATMAP_ME_COLOR;

  const grid = buildGrid(targetPoints, leftX, rightX, bottomY, topY);
  drawLayer(ctx, grid.counts, grid.max, targetColor, cellWidth, cellHeight);
}
