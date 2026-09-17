import {
  CHARGE_SHOT_FULL_CHARGE_RADIUS_WORLD,
  CHARGE_SHOT_FULL_CHARGE_SCALE,
  MARKER_TUNING_PX_PER_WORLD_UNIT,
} from "../../common/index.js";

/**
 * Samus's Charge Shot projectile (WPKind.ChargeShot):
 * - Radiant cyan outer glow halo
 * - Deep magenta/violet 3D sphere gradient core
 * - White-hot pulsating nucleus
 * - Electric discharge spikes radiating outward
 */
export function drawChargeShotMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spinAngle = 0,
  /** Recorded render scale (gfx_size / 30 for its charge level); undefined for replays from before it was recorded. */
  gameScale?: number,
): void {
  ctx.save();
  // Real world-unit radius converted through camera zoom. The surrounding item
  // code (drawItemObjects) applies markerScale = camera.worldLengthToScreen(1) /
  // MARKER_TUNING_PX_PER_WORLD_UNIT to ctx. To match camera.worldLengthToScreen(worldRadius)
  // on screen without applying zoom twice:
  //   csRadius = worldRadius * MARKER_TUNING_PX_PER_WORLD_UNIT
  // Full charge (scale 23.33) uses CHARGE_SHOT_FULL_CHARGE_RADIUS_WORLD (130 world units,
  // 260 world units diameter); lower charges shrink in proportion to the recorded
  // scale (levels 0-7: 5.00 to 23.33). Replays from recorder schema 1 have undefined scale
  // and fall back to full charge.
  const worldRadius =
    gameScale === undefined
      ? CHARGE_SHOT_FULL_CHARGE_RADIUS_WORLD
      : (CHARGE_SHOT_FULL_CHARGE_RADIUS_WORLD * gameScale) /
        CHARGE_SHOT_FULL_CHARGE_SCALE;
  const csRadius = Math.max(2, worldRadius * MARKER_TUNING_PX_PER_WORLD_UNIT);

  // 1. Outer pulsating electric magenta/violet corona
  const pulse = 1 + 0.12 * Math.sin(spinAngle * 3);
  ctx.beginPath();
  ctx.arc(x, y, csRadius * 1.45 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(192, 38, 211, 0.35)";
  ctx.shadowColor = "#d946ef";
  ctx.shadowBlur = 22;
  ctx.fill();

  // 2. Swirling energetic orbital arcs
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = "rgba(250, 204, 21, 0.75)";
  ctx.beginPath();
  ctx.ellipse(x, y, csRadius * 1.3, csRadius * 0.65, spinAngle, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(56, 189, 248, 0.75)";
  ctx.beginPath();
  ctx.ellipse(
    x,
    y,
    csRadius * 1.3,
    csRadius * 0.65,
    spinAngle + Math.PI / 2,
    0,
    Math.PI * 2,
  );
  ctx.stroke();

  // 3. Spherical 3D plasma body
  const grad = ctx.createRadialGradient(
    x - csRadius * 0.25,
    y - csRadius * 0.25,
    Math.max(1, csRadius * 0.12),
    x,
    y,
    csRadius,
  );
  grad.addColorStop(0.0, "#ffffff");
  grad.addColorStop(0.2, "#f472b6");
  grad.addColorStop(0.55, "#c026d3");
  grad.addColorStop(0.85, "#6b21a8");
  grad.addColorStop(1.0, "#3b0764");

  ctx.beginPath();
  ctx.arc(x, y, csRadius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.shadowColor = "#c026d3";
  ctx.shadowBlur = 16;
  ctx.fill();

  // 4. White-hot crackling center
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(x, y, csRadius * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // 5. Electric discharge spikes radiating outward
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 + spinAngle * 2;
    const r1 = csRadius * 0.7;
    const r2 = csRadius * (1.1 + ((i * 3) % 4) * 0.1);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    ctx.lineTo(
      x + Math.cos(a + 0.1) * ((r1 + r2) / 2),
      y + Math.sin(a + 0.1) * ((r1 + r2) / 2),
    );
    ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2);
    ctx.stroke();
  }

  ctx.restore();
}
