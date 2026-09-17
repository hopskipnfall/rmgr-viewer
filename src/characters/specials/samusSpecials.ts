import type { Camera } from "../../camera.js";
import {
  type SamusSpecialType,
  CHARGE_SHOT_LEVEL_SCALES,
  MARKER_TUNING_PX_PER_WORLD_UNIT,
} from "../../renderer/common/index.js";
import { drawChargeShotMarker } from "../../renderer/items/weapons/chargeShot.js";

/**
 * Visualizes Samus's signature special moves:
 * - Charge Shot (Neutral-B): Electric plasma charging sphere at cannon tip.
 * - Screw Attack (Up-B): Multihit somersaulting electric cyclone shield.
 *
 * Bomb (Down-B) used to have a synthetic dropped bomb animation here too,
 * but that's gone now that the real recorded Weapon object
 * (WPKind.SamusBomb) gets its own marker in drawItemObjects() - keeping
 * both would just show two bombs at once.
 */
export function drawSamusSpecial(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  _color: string,
  specialType: SamusSpecialType,
  frameCounter: number,
  characterSpecific?: number,
): void {
  const dir = facingRight ? 1 : -1;
  const cannonX = x + dir * (halfWidth * 1.15);
  const cannonY = centerY - heightPx * 0.05;

  if (specialType === "charge_shot") {
    // Use the exact same Charge Shot plasma orb animation as the fired weapon,
    // sized to her stored charge level (0-7, or smoothly growing in schema 1).
    const chargeLevel =
      characterSpecific !== undefined
        ? Math.min(7, Math.max(0, characterSpecific))
        : Math.min(7, Math.floor(frameCounter / 16));
    const gameScale = CHARGE_SHOT_LEVEL_SCALES[chargeLevel];
    const spinAngle = frameCounter * 0.45;

    const markerScale =
      camera.worldLengthToScreen(1) / MARKER_TUNING_PX_PER_WORLD_UNIT;

    ctx.save();
    ctx.translate(cannonX, cannonY);
    ctx.scale(markerScale, markerScale);
    ctx.translate(-cannonX, -cannonY);
    drawChargeShotMarker(ctx, cannonX, cannonY, spinAngle, gameScale);
    ctx.restore();
    return;
  }

  if (specialType === "charge_shot_startup") {
    ctx.save();
    // Arm cannon drawing/extending out, growing to full length as the
    // charge is about to begin - a small spark at the tip, no plasma ball yet.
    const extend = Math.min(1, (frameCounter + 1) / 6);
    const cannonLen = Math.max(6, halfWidth * 0.5) * extend;
    const cannonBaseX = x + dir * (halfWidth * 0.65);
    const cannonTipX = cannonBaseX + dir * cannonLen;

    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cannonBaseX, cannonY);
    ctx.lineTo(cannonTipX, cannonY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cannonTipX, cannonY, 3 * extend, 0, Math.PI * 2);
    ctx.fillStyle = "#fdf4ff";
    ctx.shadowColor = "#c026d3";
    ctx.shadowBlur = 6;
    ctx.fill();

    ctx.restore();
    return;
  }

  if (specialType === "charge_shot_fire") {
    ctx.save();
    // Traveling plasma bolt fired from the cannon tip.
    const travel = Math.min(1, frameCounter / 6);
    const boltX = cannonX + dir * travel * halfWidth * 3;
    const boltLen = Math.max(10, halfWidth * 1.1);

    ctx.strokeStyle = "#f472b6";
    ctx.lineWidth = 4;
    ctx.shadowColor = "#c026d3";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(boltX - dir * boltLen, cannonY);
    ctx.lineTo(boltX, cannonY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(boltX, cannonY, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.restore();
    return;
  }

  if (specialType === "screw_attack") {
    ctx.save();
    const screwRadius = Math.max(16, heightPx * 0.75);
    const rot = frameCounter * 0.55;

    // 1. Electrified somersault sphere aura
    ctx.beginPath();
    ctx.arc(x, centerY, screwRadius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 14;
    ctx.fill();

    // 2. Rotating lightning cutting rings
    for (let i = 0; i < 3; i++) {
      const ang = rot + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.ellipse(
        x,
        centerY,
        screwRadius * 0.95,
        screwRadius * 0.45,
        ang,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = i % 2 === 0 ? "#facc15" : "#38bdf8";
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    // 3. Central white energy spark
    ctx.beginPath();
    ctx.arc(x, centerY, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.restore();
    return;
  }
}
