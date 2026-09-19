import type { Camera } from "../../../camera.js";
import {
  type BombExplosionEvent,
  EXPLOSION_DURATION,
  MARKER_TUNING_PX_PER_WORLD_UNIT,
} from "../../common/index.js";
import { drawSamusBombExplosionAt } from "./samusBombExplosions.js";
export { drawSamusBombExplosionAt };

/**
 * 3-Phase Bomb Explosion Visual:
 * Phase 1 (p: 0.0 - 0.25): Initial supersonic flash, shockwave ring, radial blast spokes.
 * Phase 2 (p: 0.15 - 0.70): Multi-lobed boiling fireball clouds, fiery shrapnel & spark trails.
 * Phase 3 (p: 0.50 - 1.00): Billowing dark charcoal/slate smoke puffs drifting upward and fading.
 */
export function drawBombExplosionAt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number, // 0.0 to 1.0
  isBobOmb = false,
  baseRadius = 36,
  isSamusBomb = false,
): void {
  if (isSamusBomb) {
    drawSamusBombExplosionAt(ctx, x, y, progress, baseRadius);
    return;
  }
  if (progress < 0 || progress > 1) return;
  ctx.save();
  const scale = (baseRadius / 36) * (isBobOmb ? 1.25 : 1.0);
  // 1. Supersonic Shockwave Ring (expands rapidly outward and fades)
  if (progress < 0.75) {
    const shockProgress = progress / 0.75;
    const shockRadius = (16 + shockProgress * 85) * scale;
    const shockAlpha = Math.max(0, (1 - shockProgress) * 0.85);
    ctx.beginPath();
    ctx.arc(x, y, shockRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(251, 191, 36, ${shockAlpha})`;
    ctx.lineWidth = Math.max(1, (5 - shockProgress * 3.5) * scale);
    ctx.stroke();
    // Outer faint secondary compression ring
    ctx.beginPath();
    ctx.arc(x, y, shockRadius * 1.15, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(254, 240, 138, ${shockAlpha * 0.45})`;
    ctx.lineWidth = Math.max(0.75, 1.8 * scale);
    ctx.stroke();
  }
  // 2. Flying Shrapnel & Fire Sparks (shoot outward radially with speed trails)
  if (progress < 0.85) {
    const sparkCount = 12;
    const sparkProgress = progress / 0.85;
    const sparkAlpha = Math.max(0, 1 - sparkProgress);
    for (let i = 0; i < sparkCount; i++) {
      const angle = (i * Math.PI * 2) / sparkCount + i * 1.37;
      const speed = 0.8 + ((i * 7) % 5) * 0.18;
      const dist = (12 + sparkProgress * speed * 95) * scale;
      const trailLen = 14 * (1 - sparkProgress * 0.5) * scale;
      const sx = x + Math.cos(angle) * dist;
      const sy = y + Math.sin(angle) * dist;
      const tx = x + Math.cos(angle) * Math.max(0, dist - trailLen);
      const ty = y + Math.sin(angle) * Math.max(0, dist - trailLen);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle =
        i % 2 === 0
          ? `rgba(254, 240, 138, ${sparkAlpha})`
          : `rgba(249, 115, 22, ${sparkAlpha})`;
      ctx.lineWidth = Math.max(1, (2.6 - sparkProgress * 1.5) * scale);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(
        sx,
        sy,
        Math.max(0.8, 2.5 * scale * (1 - sparkProgress * 0.6)),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = `rgba(255, 255, 255, ${sparkAlpha})`;
      ctx.fill();
    }
  }
  // 3. Multi-Lobed Boiling Fireball Puffs & Rising Smoke Puffs
  const puffCount = 8;
  const upwardDrift = Math.max(0, progress - 0.35) * 35 * scale;
  for (let i = 0; i < puffCount; i++) {
    const angle = (i * Math.PI * 2) / puffCount + 0.35;
    const puffDist = (10 + Math.min(progress, 0.7) * 46) * scale;
    const puffX = x + Math.cos(angle) * puffDist;
    const puffY = y + Math.sin(angle) * puffDist - upwardDrift * 0.5;
    const puffRadius = (16 + progress * 24) * scale;
    const puffGrad = ctx.createRadialGradient(
      puffX - 4 * scale,
      puffY - 4 * scale,
      2 * scale,
      puffX,
      puffY,
      puffRadius,
    );
    if (progress < 0.45) {
      // Fireball stage
      const pFire = progress / 0.45;
      puffGrad.addColorStop(0.0, "#ffffff");
      puffGrad.addColorStop(0.25, "#fde047");
      puffGrad.addColorStop(0.65, "#f97316");
      puffGrad.addColorStop(1.0, `rgba(220, 38, 38, ${1 - pFire * 0.3})`);
    } else {
      // Cooling smoke stage
      const pSmoke = (progress - 0.45) / 0.55;
      const smokeAlpha = Math.max(0, (1 - pSmoke) * 0.9);
      puffGrad.addColorStop(0.0, `rgba(249, 115, 22, ${smokeAlpha * 0.6})`);
      puffGrad.addColorStop(0.3, `rgba(71, 85, 105, ${smokeAlpha})`);
      puffGrad.addColorStop(0.75, `rgba(30, 41, 59, ${smokeAlpha})`);
      puffGrad.addColorStop(1.0, "rgba(15, 23, 42, 0)");
    }
    ctx.beginPath();
    ctx.arc(puffX, puffY, puffRadius, 0, Math.PI * 2);
    ctx.fillStyle = puffGrad;
    ctx.fill();
  }
  // 4. Central Dominant Fireball / Smoke Core
  const coreRadius = (22 + progress * 28) * scale;
  const coreY = y - upwardDrift;
  const coreGrad = ctx.createRadialGradient(
    x - 4 * scale,
    coreY - 4 * scale,
    3 * scale,
    x,
    coreY,
    coreRadius,
  );
  if (progress < 0.4) {
    const pCore = progress / 0.4;
    coreGrad.addColorStop(0.0, "#ffffff");
    coreGrad.addColorStop(0.3, "#fef08a");
    coreGrad.addColorStop(0.7, "#f97316");
    coreGrad.addColorStop(1.0, `rgba(185, 28, 28, ${1 - pCore * 0.25})`);
  } else {
    const pSmoke = (progress - 0.4) / 0.6;
    const alpha = Math.max(0, (1 - pSmoke) * 0.95);
    coreGrad.addColorStop(0.0, `rgba(253, 224, 71, ${alpha * 0.5})`);
    coreGrad.addColorStop(0.35, `rgba(71, 85, 105, ${alpha})`);
    coreGrad.addColorStop(0.8, `rgba(15, 23, 42, ${alpha})`);
    coreGrad.addColorStop(1.0, "rgba(15, 23, 42, 0)");
  }
  ctx.beginPath();
  ctx.arc(x, coreY, coreRadius, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad;
  ctx.fill();
  // 5. Initial Detonation Flash & Sharp Blast Rays (First 6 frames / progress < 0.25)
  if (progress < 0.25) {
    const flashProgress = progress / 0.25;
    const flashAlpha = (1 - flashProgress) * 0.95;
    const flashRadius = (28 + flashProgress * 42) * scale;
    const flashGrad = ctx.createRadialGradient(x, y, 0, x, y, flashRadius);
    flashGrad.addColorStop(0.0, `rgba(255, 255, 255, ${flashAlpha})`);
    flashGrad.addColorStop(0.4, `rgba(254, 240, 138, ${flashAlpha * 0.8})`);
    flashGrad.addColorStop(1.0, "rgba(249, 115, 22, 0)");
    ctx.beginPath();
    ctx.arc(x, y, flashRadius, 0, Math.PI * 2);
    ctx.fillStyle = flashGrad;
    ctx.fill();
    // Sharp blast spokes
    const spokeCount = 8;
    ctx.lineWidth = Math.max(1.2, 3.5 * scale * (1 - flashProgress));
    ctx.strokeStyle = `rgba(255, 255, 255, ${flashAlpha * 0.85})`;
    for (let s = 0; s < spokeCount; s++) {
      const sAngle = (s * Math.PI * 2) / spokeCount;
      const spokeLen = flashRadius * (1.1 + (s % 2) * 0.4) * scale;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + Math.cos(sAngle) * spokeLen,
        y + Math.sin(sAngle) * spokeLen,
      );
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Renders all active bomb explosions at the current frameIndex.
 */
export function drawBombExplosions(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  frameIndex: number,
  explosions: readonly BombExplosionEvent[],
): void {
  if (explosions.length === 0) return;

  for (const exp of explosions) {
    if (
      frameIndex >= exp.startFrame &&
      frameIndex < exp.startFrame + EXPLOSION_DURATION
    ) {
      const progress = (frameIndex - exp.startFrame) / EXPLOSION_DURATION;
      const { x, y } = camera.worldToScreen(exp.x, exp.y);
      const markerScale =
        camera.worldLengthToScreen(1) / MARKER_TUNING_PX_PER_WORLD_UNIT;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(markerScale, markerScale);
      ctx.translate(-x, -y);

      drawBombExplosionAt(
        ctx,
        x,
        y,
        progress,
        exp.isBobOmb ?? false,
        exp.radius,
        exp.isSamusBomb ?? false,
      );

      ctx.restore();
    }
  }
}
