import { MAIN_PLAYER_COLOR, OPPONENT_COLOR } from "./players.js";
import type { FrameClassification } from "./matchTimeline.js";

const DISADVANTAGE_COLOR = "#ef4444"; // matches the app's existing failure/danger red
const OTHER_COLOR = "#ec4899"; // pink

const COLOR_BY_CLASSIFICATION: Record<FrameClassification, string> = {
  neutral: OPPONENT_COLOR,
  advantage: MAIN_PLAYER_COLOR,
  disadvantage: DISADVANTAGE_COLOR,
  other: OTHER_COLOR,
};

/**
 * Renders `classifications` (one entry per match frame, from
 * classifyMatchFrames) as a horizontal strip of colored segments spanning
 * the full width of `canvas`. Consecutive frames sharing a classification
 * are drawn as a single rect. Clears the canvas (no-op draw) if
 * `classifications` is empty.
 */
export function renderMatchTimeline(
  canvas: HTMLCanvasElement,
  classifications: readonly FrameClassification[],
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (classifications.length === 0) return;

  const frameWidth = canvas.width / classifications.length;
  let runStart = 0;
  let runClassification = classifications[0]!;

  const flushRun = (endIndexExclusive: number) => {
    ctx.fillStyle = COLOR_BY_CLASSIFICATION[runClassification];
    const x = runStart * frameWidth;
    const width = endIndexExclusive * frameWidth - x;
    ctx.fillRect(x, 0, width, canvas.height);
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
}
