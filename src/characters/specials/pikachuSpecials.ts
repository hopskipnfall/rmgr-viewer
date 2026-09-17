import type { PikachuSpecialType } from "../../renderer/common/index.js";

/**
 * Visualizes Pikachu's signature special moves:
 * - Thunder (Down-B): Lightning bolt descending from the sky (infinite height, Y=0) down to Pikachu with electric shock halo.
 * - Quick Attack (Up-B): Straight-line high-speed electric motion trails and nose spark.
 */
export function drawPikachuSpecial(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  _color: string,
  specialType: PikachuSpecialType,
): void {
  const dir = facingRight ? 1 : -1;
  const noseX = x + dir * halfWidth;

  if (specialType === "quick_attack_zip") {
    ctx.save();
    // Electric tip flare on nose and glowing electric spark halo around Pikachu
    ctx.beginPath();
    ctx.arc(noseX, centerY, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe600";
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(noseX, centerY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Electric spark aura around triangle
    ctx.beginPath();
    ctx.arc(x, centerY, Math.max(10, halfWidth * 0.9), 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 230, 0, 0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
    return;
  }

  if (specialType === "quick_attack") {
    // Startup/landing electric spark gathered at nose
    ctx.save();
    ctx.beginPath();
    ctx.arc(noseX, centerY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe600";
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }
}
