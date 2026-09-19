import type { Camera } from "../../../camera.js";
import {
  type EggExplosionEvent,
  EGG_EXPLOSION_DURATION,
  MARKER_TUNING_PX_PER_WORLD_UNIT,
} from "../../common/index.js";

/**
 * 4-Phase Yoshi Egg Explosion Visual:
 * Phase 1 (p: 0.0 - 0.30): Initial detonation crack flash, shockwave ring, sharp blast rays.
 * Phase 2 (p: 0.0 - 0.75): Multi-colored Yoshi starbursts & sparkles shooting outward with speed trails.
 * Phase 3 (p: 0.0 - 0.85): Jagged cream eggshell shards with green spots tumbling outward with gravity.
 * Phase 4 (p: 0.15 - 1.00): Billowing soft yolk & cream vapor puffs expanding and gently rising before fading.
 */
export function drawEggExplosionAt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number, // 0.0 to 1.0
  baseRadius = 32,
): void {
  if (progress < 0 || progress > 1) return;
  ctx.save();
  const scale = baseRadius / 32;

  // 1. Supersonic Shockwave Ring & Detonation Crack (First 35% of explosion)
  if (progress < 0.35) {
    const shockProgress = progress / 0.35;
    const shockRadius = (10 + shockProgress * 55) * scale;
    const shockAlpha = Math.max(0, (1 - shockProgress) * 0.85);

    // Inner bright yellow shock ring
    ctx.beginPath();
    ctx.arc(x, y, shockRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(254, 240, 138, ${shockAlpha})`;
    ctx.lineWidth = Math.max(1, (4 - shockProgress * 3) * scale);
    ctx.stroke();

    // Outer soft lime-green expansion ring
    ctx.beginPath();
    ctx.arc(x, y, shockRadius * 1.18, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(134, 239, 172, ${shockAlpha * 0.6})`;
    ctx.lineWidth = Math.max(0.75, 1.6 * scale);
    ctx.stroke();

    // Initial detonation flash & crack spokes
    const flashAlpha = (1 - shockProgress) * 0.9;
    const flashRadius = (18 + shockProgress * 26) * scale;
    const flashGrad = ctx.createRadialGradient(x, y, 0, x, y, flashRadius);
    flashGrad.addColorStop(0.0, `rgba(255, 255, 255, ${flashAlpha})`);
    flashGrad.addColorStop(0.35, `rgba(254, 240, 138, ${flashAlpha * 0.85})`);
    flashGrad.addColorStop(0.75, `rgba(187, 247, 208, ${flashAlpha * 0.5})`);
    flashGrad.addColorStop(1.0, "rgba(74, 222, 128, 0)");
    ctx.beginPath();
    ctx.arc(x, y, flashRadius, 0, Math.PI * 2);
    ctx.fillStyle = flashGrad;
    ctx.fill();

    // Sharp blast spokes
    const spokeCount = 6;
    ctx.lineWidth = Math.max(1.0, 2.5 * scale * (1 - shockProgress));
    ctx.strokeStyle = `rgba(255, 255, 255, ${flashAlpha * 0.9})`;
    for (let s = 0; s < spokeCount; s++) {
      const sAngle = (s * Math.PI * 2) / spokeCount + 0.25;
      const spokeLen = flashRadius * (1.2 + (s % 2) * 0.35);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + Math.cos(sAngle) * spokeLen,
        y + Math.sin(sAngle) * spokeLen,
      );
      ctx.stroke();
    }
  }

  // 2. Soft Yolk & Cream Smoke Puffs (Expands from center, drifts upward, and fades)
  if (progress >= 0.1) {
    const puffCount = 6;
    const upwardDrift = (progress - 0.1) * 22 * scale;
    for (let i = 0; i < puffCount; i++) {
      const angle = (i * Math.PI * 2) / puffCount + 0.4;
      const puffDist = (6 + Math.min(progress, 0.75) * 38) * scale;
      const puffX = x + Math.cos(angle) * puffDist;
      const puffY = y + Math.sin(angle) * puffDist - upwardDrift * 0.6;
      const puffRadius = (12 + progress * 22) * scale;

      const puffGrad = ctx.createRadialGradient(
        puffX - 3 * scale,
        puffY - 3 * scale,
        2 * scale,
        puffX,
        puffY,
        puffRadius,
      );

      if (progress < 0.45) {
        // Warm golden yolk puff
        const pYolk = progress / 0.45;
        puffGrad.addColorStop(0.0, "#ffffff");
        puffGrad.addColorStop(0.3, "#fef08a");
        puffGrad.addColorStop(0.7, "#fde047");
        puffGrad.addColorStop(1.0, `rgba(245, 158, 11, ${1 - pYolk * 0.4})`);
      } else {
        // Dissipating pastel cream vapor
        const pVapor = (progress - 0.45) / 0.55;
        const vaporAlpha = Math.max(0, (1 - pVapor) * 0.85);
        puffGrad.addColorStop(0.0, `rgba(254, 249, 195, ${vaporAlpha * 0.7})`);
        puffGrad.addColorStop(0.4, `rgba(241, 245, 249, ${vaporAlpha * 0.9})`);
        puffGrad.addColorStop(0.8, `rgba(226, 232, 240, ${vaporAlpha * 0.6})`);
        puffGrad.addColorStop(1.0, "rgba(203, 213, 225, 0)");
      }

      ctx.beginPath();
      ctx.arc(puffX, puffY, puffRadius, 0, Math.PI * 2);
      ctx.fillStyle = puffGrad;
      ctx.fill();
    }

    // Central core yolk vapor cloud
    const coreRadius = (15 + progress * 24) * scale;
    const coreY = y - upwardDrift;
    const coreGrad = ctx.createRadialGradient(
      x - 3 * scale,
      coreY - 3 * scale,
      2 * scale,
      x,
      coreY,
      coreRadius,
    );

    if (progress < 0.4) {
      const pCore = progress / 0.4;
      coreGrad.addColorStop(0.0, "#ffffff");
      coreGrad.addColorStop(0.35, "#fef08a");
      coreGrad.addColorStop(0.75, "#facc15");
      coreGrad.addColorStop(1.0, `rgba(245, 158, 11, ${1 - pCore * 0.3})`);
    } else {
      const pSmoke = (progress - 0.4) / 0.6;
      const coreAlpha = Math.max(0, (1 - pSmoke) * 0.9);
      coreGrad.addColorStop(0.0, `rgba(254, 240, 138, ${coreAlpha * 0.6})`);
      coreGrad.addColorStop(0.4, `rgba(248, 250, 252, ${coreAlpha * 0.85})`);
      coreGrad.addColorStop(0.8, `rgba(226, 232, 240, ${coreAlpha * 0.5})`);
      coreGrad.addColorStop(1.0, "rgba(203, 213, 225, 0)");
    }

    ctx.beginPath();
    ctx.arc(x, coreY, coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();
  }

  // 3. Multi-Colored Yoshi Starbursts & Sparkles (Progress 0.0 - 0.75)
  if (progress < 0.75) {
    const starProgress = progress / 0.75;
    const starAlpha = Math.max(0, 1 - starProgress);
    const starColors = [
      "#facc15", // Gold
      "#22c55e", // Green
      "#f43f5e", // Pink/Rose
      "#38bdf8", // Sky Blue
      "#fb923c", // Orange
      "#c084fc", // Purple
      "#4ade80", // Light Green
      "#fef08a", // Pale Yellow
    ];
    const starCount = starColors.length;

    for (let i = 0; i < starCount; i++) {
      const angle = (i * Math.PI * 2) / starCount + i * 0.8;
      const speed = 0.85 + ((i * 3) % 4) * 0.2;
      const dist = (8 + starProgress * speed * 80) * scale;
      const trailLen = 12 * (1 - starProgress * 0.6) * scale;

      const sx = x + Math.cos(angle) * dist;
      const sy = y + Math.sin(angle) * dist;
      const tx = x + Math.cos(angle) * Math.max(0, dist - trailLen);
      const ty = y + Math.sin(angle) * Math.max(0, dist - trailLen);

      // Star speed trail
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = starColors[i]!;
      ctx.globalAlpha = starAlpha * 0.75;
      ctx.lineWidth = Math.max(1, (2.2 - starProgress * 1.2) * scale);
      ctx.stroke();

      // 4-pointed sparkle star at head
      const starR = Math.max(1.2, 4.5 * scale * (1 - starProgress * 0.6));
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle + starProgress * 4);
      ctx.beginPath();
      for (let p = 0; p < 8; p++) {
        const r = p % 2 === 0 ? starR : starR * 0.4;
        const pAngle = (p * Math.PI) / 4;
        const px = Math.cos(pAngle) * r;
        const py = Math.sin(pAngle) * r;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = starColors[i]!;
      ctx.globalAlpha = starAlpha;
      ctx.fill();

      // White star core
      ctx.beginPath();
      ctx.arc(0, 0, starR * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  }

  // 4. Flying Eggshell Shards (Cream shell fragments with Yoshi green spots, 0.0 - 0.85)
  if (progress < 0.85) {
    const shardProgress = progress / 0.85;
    const shardAlpha =
      progress < 0.6 ? 1 : Math.max(0, 1 - (progress - 0.6) / 0.25);
    const shardCount = 8;

    for (let i = 0; i < shardCount; i++) {
      const angle = (i * Math.PI * 2) / shardCount + i * 0.35;
      const speed = 0.75 + ((i * 5) % 4) * 0.18;
      const dist = (6 + shardProgress * speed * 68) * scale;
      // Slight downward parabolic gravity arc
      const dy = shardProgress * shardProgress * 24 * scale;
      const sx = x + Math.cos(angle) * dist;
      const sy = y + Math.sin(angle) * dist + dy;
      // Tumbling rotation
      const tumble =
        angle + shardProgress * (4 + (i % 3) * 2) * (i % 2 === 0 ? 1 : -1);

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(tumble);
      ctx.globalAlpha = shardAlpha;

      // Jagged eggshell fragment polygon
      const sW = (4.5 + (i % 3) * 1.2) * scale;
      const sH = (4.0 + ((i + 1) % 3) * 1.0) * scale;

      ctx.beginPath();
      ctx.moveTo(-sW, -sH * 0.7);
      ctx.quadraticCurveTo(0, -sH, sW, -sH * 0.5);
      ctx.lineTo(sW * 0.8, sH * 0.6);
      ctx.quadraticCurveTo(0, sH * 0.9, -sW * 0.9, sH * 0.5);
      ctx.closePath();

      // Cream shell fill
      const shellGrad = ctx.createLinearGradient(-sW, -sH, sW, sH);
      shellGrad.addColorStop(0.0, "#ffffff");
      shellGrad.addColorStop(0.6, "#fdf6e3");
      shellGrad.addColorStop(1.0, "#fef08a");
      ctx.fillStyle = shellGrad;
      ctx.fill();

      ctx.strokeStyle = "rgba(100, 116, 139, 0.65)";
      ctx.lineWidth = Math.max(0.7, 1.0 * scale);
      ctx.stroke();

      // Iconic Yoshi green spots on alternate shell shards
      if (i % 2 === 0) {
        ctx.beginPath();
        ctx.ellipse(0, 0, sW * 0.45, sH * 0.35, 0.25, 0, Math.PI * 2);
        ctx.fillStyle = "#22c55e";
        ctx.fill();
      }

      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  }

  ctx.restore();
}

/**
 * Renders all active egg explosions at the current frameIndex.
 */
export function drawEggExplosions(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  frameIndex: number,
  explosions: readonly EggExplosionEvent[],
): void {
  if (explosions.length === 0) return;

  for (const exp of explosions) {
    if (
      frameIndex >= exp.startFrame &&
      frameIndex < exp.startFrame + EGG_EXPLOSION_DURATION
    ) {
      const progress = (frameIndex - exp.startFrame) / EGG_EXPLOSION_DURATION;
      const { x, y } = camera.worldToScreen(exp.x, exp.y);
      const markerScale =
        camera.worldLengthToScreen(1) / MARKER_TUNING_PX_PER_WORLD_UNIT;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(markerScale, markerScale);
      ctx.translate(-x, -y);

      drawEggExplosionAt(ctx, x, y, progress, exp.radius);

      ctx.restore();
    }
  }
}
