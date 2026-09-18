import type { BackgroundTheme, CharacterAnimState } from "../../renderer.js";
import {
  resolveColor,
  hexToRgba,
  toBlandPalette,
  toGrayscale,
} from "../../renderer.js";

export type { BackgroundTheme, CharacterAnimState };
export { resolveColor, hexToRgba, toBlandPalette, toGrayscale };

/**
 * Common state auras (hitstun combo outline and landing impact shockwaves).
 */
export function drawCharacterStateAuras(
  ctx: CanvasRenderingContext2D,
  posX: number,
  y: number,
  w: number,
  h: number,
  dir: number,
  state: CharacterAnimState,
): void {
  // Hitstun and combo gaps are now rendered as full character silhouettes (red for hitstun, yellow for actionable gap),
  // replacing the old red ellipse outline around the fighter.
  void [ctx, posX, y, w, h, dir, state];
}
