import { MAIN_PLAYER_COLOR, OPPONENT_COLOR } from "./players.js";
import type { FrameClassification, StockLossMarker } from "./matchTimeline.js";

const DISADVANTAGE_COLOR = "#ef4444"; // matches the app's existing failure/danger red
const OTHER_COLOR = "#ec4899"; // pink

const COLOR_BY_CLASSIFICATION: Record<FrameClassification, string> = {
  neutral: OPPONENT_COLOR,
  advantage: MAIN_PLAYER_COLOR,
  disadvantage: DISADVANTAGE_COLOR,
  other: OTHER_COLOR,
};

const STOCK_LOSS_MARKER_WIDTH_PX = 2;
/** The colored classification strip only fills the middle 40% of the bar's height - stock-loss markers span the full height (see below), so they visibly stick out above/below it rather than blending into a same-colored segment. */
const COLOR_BAND_FRACTION = 0.4;

/**
 * Renders `classifications` (one entry per match frame, from
 * classifyMatchFrames) as a horizontal strip of colored segments, vertically
 * centered within `canvas` at COLOR_BAND_FRACTION of its height. Then draws
 * a vertical line spanning the canvas's FULL height at each of
 * `stockLossMarkers`' frame positions (blue for the perspective player,
 * grey for the opponent, with a dark outline for contrast against a
 * same-colored segment), on top. Consecutive frames sharing a
 * classification are drawn as a single rect. Clears the canvas (no-op
 * draw) if `classifications` is empty.
 */
export function renderMatchTimeline(
  canvas: HTMLCanvasElement,
  classifications: readonly FrameClassification[],
  stockLossMarkers: readonly StockLossMarker[] = [],
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (classifications.length === 0) return;

  const bandHeight = canvas.height * COLOR_BAND_FRACTION;
  const bandY = (canvas.height - bandHeight) / 2;

  const frameWidth = canvas.width / classifications.length;
  let runStart = 0;
  let runClassification = classifications[0]!;

  const flushRun = (endIndexExclusive: number) => {
    ctx.fillStyle = COLOR_BY_CLASSIFICATION[runClassification];
    const x = runStart * frameWidth;
    const width = endIndexExclusive * frameWidth - x;
    ctx.fillRect(x, bandY, width, bandHeight);
  };

  for (let i = 1; i < classifications.length; i++) {
    const c = classifications[i]!;
    if (c !== runClassification) {
      flushRun(i);
      runStart = i;
      runClassification = c;
    }
  }
  flushRun(classifications.length);

  for (const marker of stockLossMarkers) {
    const x = marker.frameIndex * frameWidth - STOCK_LOSS_MARKER_WIDTH_PX / 2;
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(x - 1, 0, STOCK_LOSS_MARKER_WIDTH_PX + 2, canvas.height);
    ctx.fillStyle =
      marker.side === "perspective" ? MAIN_PLAYER_COLOR : OPPONENT_COLOR;
    ctx.fillRect(x, 0, STOCK_LOSS_MARKER_WIDTH_PX, canvas.height);
  }
}
