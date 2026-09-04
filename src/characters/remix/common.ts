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
  _dir: number,
  state: CharacterAnimState,
): void {
  const { inCombo, isLanding, isHeavyLanding } = state;

  if (inCombo) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 60, 40, 0.95)";
    ctx.lineWidth = 5.0;
    ctx.shadowColor = "rgba(255, 120, 0, 0.85)";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(
      posX,
      y - 0.5 * h,
      Math.max(0.1, 0.8 * w),
      Math.max(0.1, 0.5 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      posX,
      y - 0.5 * h,
      Math.max(0.1, 0.8 * w),
      Math.max(0.1, 0.5 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.strokeStyle = "rgba(255, 220, 180, 0.9)";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }

  if (isLanding) {
    ctx.save();
    const impactSpread = isHeavyLanding ? w * 1.35 : w * 0.9;

    ctx.beginPath();
    ctx.moveTo(posX - impactSpread, y);
    ctx.lineTo(posX + impactSpread, y);
    ctx.strokeStyle = isHeavyLanding
      ? "rgba(251, 191, 36, 0.9)"
      : "rgba(226, 232, 240, 0.75)";
    ctx.lineWidth = isHeavyLanding ? 3 : 1.8;
    ctx.stroke();

    ctx.fillStyle = isHeavyLanding
      ? "rgba(245, 158, 11, 0.65)"
      : "rgba(226, 232, 240, 0.55)";

    ctx.beginPath();
    ctx.arc(
      posX - impactSpread * 0.75,
      y - 3,
      isHeavyLanding ? 4.5 : 3,
      0,
      Math.PI * 2,
    );
    ctx.arc(
      posX - impactSpread * 1.05,
      y - 2,
      isHeavyLanding ? 3.5 : 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
      posX + impactSpread * 0.75,
      y - 3,
      isHeavyLanding ? 4.5 : 3,
      0,
      Math.PI * 2,
    );
    ctx.arc(
      posX + impactSpread * 1.05,
      y - 2,
      isHeavyLanding ? 3.5 : 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    if (isHeavyLanding) {
      ctx.strokeStyle = "rgba(245, 158, 11, 0.85)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(posX - w * 0.45, y);
      ctx.lineTo(posX - w * 0.65, y - 5);
      ctx.moveTo(posX + w * 0.45, y);
      ctx.lineTo(posX + w * 0.65, y - 5);
      ctx.stroke();
    }
    ctx.restore();
  }
}
