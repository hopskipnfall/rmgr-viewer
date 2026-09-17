import type { MarioSpecialType } from "../../renderer/common/index.js";

/**
 * Visualizes Mario / Luigi special moves:
 * - Super Jump Punch (Up-B): Uppercut flight with scattering spinning gold coins and Luigi sweetspot burst.
 * - Mario Tornado / Luigi Cyclone (Down-B): Whirling multi-tier cyclone discs.
 */
export function drawMarioSpecial(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  isLuigi: boolean,
  specialType: MarioSpecialType,
  frameCounter: number,
): void {
  const dir = facingRight ? 1 : -1;
  const noseX = x + dir * halfWidth;

  if (specialType === "super_jump_punch") {
    ctx.save();
    const fistX = noseX + dir * (halfWidth * 0.3);
    const fistY = centerY - heightPx * 0.65;

    // 1. Spinning golden coins scattering upward
    const coinCount = 5;
    for (let i = 0; i < coinCount; i++) {
      const coinAngle = (i * Math.PI * 2) / coinCount + frameCounter * 0.35;
      const coinDist = (i + 1) * (halfWidth * 0.45);
      const cx = fistX + Math.cos(coinAngle) * coinDist;
      const cy = fistY - i * 6 + Math.sin(coinAngle) * 4;
      const spinW = Math.max(
        1,
        Math.abs(Math.cos(frameCounter * 0.4 + i)) * 4.5,
      );

      ctx.beginPath();
      ctx.ellipse(cx, cy, spinW, 5.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#facc15";
      ctx.shadowColor = "#eab308";
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.strokeStyle = "#ca8a04";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 2. Punch impact burst / Luigi sweetspot flare
    if (isLuigi && frameCounter < 8) {
      // Luigi sweetspot: explosive red-orange fire blast
      ctx.beginPath();
      ctx.arc(fistX, fistY, 14, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(239, 68, 68, 0.6)";
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 16;
      ctx.fill();
    }

    // Rising speed streaks
    ctx.beginPath();
    ctx.moveTo(x - halfWidth * 0.4, y);
    ctx.lineTo(fistX - dir * 4, fistY + 8);
    ctx.moveTo(x + halfWidth * 0.4, y);
    ctx.lineTo(fistX + dir * 4, fistY + 8);
    ctx.strokeStyle = "rgba(250, 204, 21, 0.75)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
    return;
  }

  if (specialType === "tornado") {
    ctx.save();
    // Whirling tornado cyclone discs
    const discCount = 3;
    const spinRot = frameCounter * 0.45;

    for (let i = 0; i < discCount; i++) {
      const dy = centerY + (i - 1) * (heightPx * 0.28);
      const radiusX = halfWidth * (1.35 + i * 0.2);
      const radiusY = Math.max(4, heightPx * 0.14);

      ctx.beginPath();
      ctx.ellipse(x, dy, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.strokeStyle = isLuigi
        ? i % 2 === 0
          ? "#22c55e"
          : "#86efac"
        : i % 2 === 0
          ? "#ef4444"
          : "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = isLuigi ? "#22c55e" : "#ef4444";
      ctx.shadowBlur = 8;
      ctx.stroke();

      // Wind swirl streaks
      const swirlX = x + Math.cos(spinRot + i * 1.5) * (radiusX * 0.85);
      ctx.beginPath();
      ctx.arc(swirlX, dy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }

    ctx.restore();
    return;
  }
}
