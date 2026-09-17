import { hexToRgba } from "../common/index.js";

/**
 * Renders a Super Smash Bros. forcefield energy bubble surrounding the character.
 * - Normal Shield: Translucent 3D spherical glass forcefield with spherical radial gradient,
 *   glossy specular highlight arcs, glowing outer rim, and player-color energy aura.
 * - Shield Stun: Energized kinetic impact state featuring tight micro-vibration,
 *   a bright impact flash core, energized white rim, and an electric stress highlight arc.
 * - shieldHealth: Optional current shield health (0-55). Ready for shield health scaling spec.
 */
export function drawShieldBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  color: string,
  isShieldStun: boolean,
  frameCounter: number,
  shieldHealth?: number,
): void {
  // Base shield radius (default full shield)
  let baseRadius = Math.max(halfWidth * 1.35, heightPx * 0.58) + 3;

  // If shieldHealth is provided, scale radius according to spec (full: 55, min break: ~0)
  if (shieldHealth !== undefined && shieldHealth >= 0) {
    const healthRatio = Math.max(0, Math.min(1, shieldHealth / 55));
    // Shield scales from 70% to 100% radius based on health
    baseRadius = baseRadius * (0.7 + 0.3 * healthRatio);
  }

  ctx.save();

  if (isShieldStun) {
    // Subtle kinetic micro-vibration under impact
    const jitterX = (((frameCounter * 7) % 3) - 1) * 0.8;
    const jitterY = (((frameCounter * 11) % 3) - 1) * 0.6;
    const cx = x + jitterX;
    const cy = centerY + jitterY;

    // Gentle radius pulse
    const pulse = Math.sin(frameCounter * 0.8) * 1.2;
    const radius = baseRadius + pulse;

    // 1. Energized impact flash fill (brighter, more saturated than normal shield)
    const grad = ctx.createRadialGradient(
      cx - radius * 0.2,
      cy - radius * 0.2,
      radius * 0.1,
      cx,
      cy,
      radius,
    );
    grad.addColorStop(0, "rgba(255, 255, 255, 0.45)");
    grad.addColorStop(0.5, hexToRgba(color, 0.55));
    grad.addColorStop(0.85, hexToRgba(color, 0.8));
    grad.addColorStop(1, "rgba(255, 255, 255, 0.95)");

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 2. High-energy glowing perimeter
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.restore();

    // 3. Electric stress highlight arc
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, -Math.PI * 0.9, -Math.PI * 0.3, false);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();

    // 4. Tight outer compression ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.08, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(color, 0.4);
    ctx.lineWidth = 1.4;
    ctx.stroke();
  } else {
    // Normal protective spherical energy bubble
    const cx = x;
    const cy = centerY;
    const radius = baseRadius;

    // 1. Spherical 3D energy fill with radial gradient (translucent core, luminous rim)
    const grad = ctx.createRadialGradient(
      cx - radius * 0.25,
      cy - radius * 0.25,
      radius * 0.1,
      cx,
      cy,
      radius,
    );
    grad.addColorStop(0, hexToRgba(color, 0.28));
    grad.addColorStop(0.65, hexToRgba(color, 0.45));
    grad.addColorStop(0.88, hexToRgba(color, 0.72));
    grad.addColorStop(1, hexToRgba(color, 0.95));

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 2. Luminous glowing forcefield rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(color, 0.95);
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();

    // 3. Inner concentric forcefield ring shimmer
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.76, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 4. Glossy glass specular reflection arc on upper-left rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, -Math.PI * 0.85, -Math.PI * 0.35, false);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 6;
    ctx.stroke();

    // Secondary smaller specular glint at bottom-right rim
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, Math.PI * 0.25, Math.PI * 0.45, false);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
