import type { LinkSpecialType } from "../../renderer/common/index.js";
import { drawRoundBombItem } from "../../renderer/items/pickups/roundBomb.js";

/**
 * Visualizes Link's signature special moves:
 * - Spin Attack (Up-B): 360-degree hurricane sword slash ring with glowing cyan edge trails.
 * - Bomb (Down-B): Blue cartoon bomb with flickering burning fuse.
 *
 * Boomerang (Neutral-B) used to have a synthetic in-flight animation
 * here too, but that's gone now that the real recorded Weapon object
 * (WPKind.Boomerang) gets its own marker in drawItemObjects() - keeping
 * both would just show two boomerangs at once.
 */
export function drawLinkSpecial(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  _color: string,
  specialType: LinkSpecialType,
  frameCounter: number,
): void {
  const dir = facingRight ? 1 : -1;
  const noseX = x + dir * halfWidth;

  if (specialType === "spin_attack") {
    ctx.save();
    // Vertically-squashed hurricane sword slash oval disc
    const spinRadiusX = Math.max(18, halfWidth * 2.4);
    const spinRadiusY = spinRadiusX * 0.285;
    const rot = frameCounter * 0.5;

    // 1. Translucent cyan cutting oval disc
    ctx.beginPath();
    ctx.ellipse(x, centerY, spinRadiusX, spinRadiusY, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(56, 189, 248, 0.22)";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 12;
    ctx.fill();

    // 2. Twin glowing blade trails along oval perimeter
    for (let i = 0; i < 2; i++) {
      const startAng = rot + i * Math.PI;
      ctx.beginPath();
      ctx.ellipse(
        x,
        centerY,
        spinRadiusX,
        spinRadiusY,
        0,
        startAng,
        startAng + 1.6,
      );
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        x,
        centerY,
        spinRadiusX,
        spinRadiusY,
        0,
        startAng + 0.2,
        startAng + 1.4,
      );
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  if (specialType === "bomb") {
    // Round bomb with burning-down fuse held in Link's hand (proportional to Link's body/hand)
    const handBombRadius = Math.max(6.5, halfWidth * 0.42);
    const bombX = noseX + dir * (halfWidth * 0.3);
    const bombY = centerY - heightPx * 0.26;
    drawRoundBombItem(ctx, bombX, bombY, frameCounter, false, handBombRadius);
    return;
  }
}
