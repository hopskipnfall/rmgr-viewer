/** Total frames at match start where player name tags are displayed (240 frames = 4.0s @ 60fps). */
export const START_NAME_DISPLAY_FRAMES = 240;
/** Frames at match start with 100% full opacity before fading out. */
export const START_NAME_SOLID_FRAMES = 180;

/**
 * Calculates opacity alpha (0.0 to 1.0) for player name tags at the start of a match.
 * Full opacity for the first 3 seconds (0..180 frames), then fades out smoothly over the next 1 second (180..240 frames).
 */
export function getStartNameAlpha(frameIndex: number | undefined): number {
  if (
    frameIndex === undefined ||
    frameIndex < 0 ||
    frameIndex >= START_NAME_DISPLAY_FRAMES
  ) {
    return 0;
  }
  if (frameIndex <= START_NAME_SOLID_FRAMES) {
    return 1;
  }
  return (
    (START_NAME_DISPLAY_FRAMES - frameIndex) /
    (START_NAME_DISPLAY_FRAMES - START_NAME_SOLID_FRAMES)
  );
}
