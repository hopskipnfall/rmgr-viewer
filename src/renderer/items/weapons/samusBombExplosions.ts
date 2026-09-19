/**
 * 4-Phase Samus Morph Ball Bomb Cybernetic Explosion Visual:
 * Phase 1 (p: 0.0 - 0.40): Detonation energy flash, concentric neon-cyan shockwave rings & 4-way targeting reticle spokes.
 * Phase 2 (p: 0.0 - 0.75): High-voltage electric lightning arcs & plasma sparks crackling radially.
 * Phase 3 (p: 0.0 - 0.55): Searing spherical electric plasma energy core bursting outward.
 * Phase 4 (p: 0.20 - 1.00): Ethereal ionized plasma vapor clouds cleanly dissipating (no dirty soot).
 */
export function drawSamusBombExplosionAt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number, // 0.0 to 1.0
  baseRadius = 28,
): void {
  if (progress < 0 || progress > 1) return;
  ctx.save();
  const scale = baseRadius / 28;

  // 1. Concentric Cyan Shockwave Rings & Cybernetic Reticle Spokes (First 45%)
  if (progress < 0.45) {
    const shockProgress = progress / 0.45;
    const shockRadius = (12 + shockProgress * 50) * scale;
    const shockAlpha = Math.max(0, (1 - shockProgress) * 0.9);

    // Primary neon cyan shockwave ring
    ctx.beginPath();
    ctx.arc(x, y, shockRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(34, 211, 238, ${shockAlpha})`;
    ctx.lineWidth = Math.max(1, (4 - shockProgress * 2.8) * scale);
    ctx.shadowColor = "#06b6d4";
    ctx.shadowBlur = 10 * (1 - shockProgress);
    ctx.stroke();

    // Outer faint secondary compression ring
    ctx.beginPath();
    ctx.arc(x, y, shockRadius * 1.2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(103, 232, 249, ${shockAlpha * 0.5})`;
    ctx.lineWidth = Math.max(0.75, 1.6 * scale);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 4-axis rotating cybernetic targeting reticle spokes (matching Morph Ball Bomb reticle)
    const spokeCount = 4;
    const rot = progress * 1.5;
    const spokeLen = shockRadius * 1.15;
    const spokeStart = shockRadius * 0.35;
    ctx.lineWidth = Math.max(1, 2.2 * scale * (1 - shockProgress));
    ctx.strokeStyle = `rgba(56, 189, 248, ${shockAlpha * 0.95})`;
    for (let s = 0; s < spokeCount; s++) {
      const sAngle = (s * Math.PI) / 2 + rot;
      const cosA = Math.cos(sAngle);
      const sinA = Math.sin(sAngle);
      ctx.beginPath();
      ctx.moveTo(x + cosA * spokeStart, y + sinA * spokeStart);
      ctx.lineTo(x + cosA * spokeLen, y + sinA * spokeLen);
      ctx.stroke();
    }

    // Detonation flash burst
    const flashAlpha = (1 - shockProgress) * 0.95;
    const flashRadius = (16 + shockProgress * 32) * scale;
    const flashGrad = ctx.createRadialGradient(x, y, 0, x, y, flashRadius);
    flashGrad.addColorStop(0.0, `rgba(255, 255, 255, ${flashAlpha})`);
    flashGrad.addColorStop(0.35, `rgba(103, 232, 249, ${flashAlpha * 0.85})`);
    flashGrad.addColorStop(0.75, `rgba(6, 182, 212, ${flashAlpha * 0.4})`);
    flashGrad.addColorStop(1.0, "rgba(6, 182, 212, 0)");
    ctx.beginPath();
    ctx.arc(x, y, flashRadius, 0, Math.PI * 2);
    ctx.fillStyle = flashGrad;
    ctx.fill();
  }

  // 2. High-Voltage Electric Lightning Arcs & Plasma Sparks (0.0 to 0.75)
  if (progress < 0.75) {
    const arcProgress = progress / 0.75;
    const arcAlpha = Math.max(0, 1 - arcProgress);
    const sparkCount = 10;

    for (let i = 0; i < sparkCount; i++) {
      const angle = (i * Math.PI * 2) / sparkCount + i * 0.7;
      const speed = 0.8 + ((i * 3) % 4) * 0.2;
      const dist = (8 + arcProgress * speed * 68) * scale;
      const trailLen = 14 * (1 - arcProgress * 0.5) * scale;

      const sx = x + Math.cos(angle) * dist;
      const sy = y + Math.sin(angle) * dist;
      const mx = x + Math.cos(angle) * (dist - trailLen * 0.5) + Math.sin(angle * 2) * (3 * scale);
      const my = y + Math.sin(angle) * (dist - trailLen * 0.5) - Math.cos(angle * 2) * (3 * scale);
      const tx = x + Math.cos(angle) * Math.max(0, dist - trailLen);
      const ty = y + Math.sin(angle) * Math.max(0, dist - trailLen);

      // Zigzagging electric bolt
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(mx, my);
      ctx.lineTo(sx, sy);
      const boltColor =
        i % 3 === 0
          ? `rgba(255, 255, 255, ${arcAlpha})`
          : i % 3 === 1
            ? `rgba(103, 232, 249, ${arcAlpha})`
            : `rgba(250, 204, 21, ${arcAlpha})`;
      ctx.strokeStyle = boltColor;
      ctx.lineWidth = Math.max(1, (2.2 - arcProgress * 1.2) * scale);
      ctx.stroke();

      // Glowing plasma spark head
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.8, 2.2 * scale * (1 - arcProgress * 0.6)), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${arcAlpha})`;
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 6 * arcAlpha;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // 3. Searing Spherical Plasma Energy Core (0.0 to 0.55)
  if (progress < 0.55) {
    const pCore = progress / 0.55;
    const coreAlpha = Math.max(0, (1 - pCore) * 0.95);
    const coreRadius = (12 + pCore * 26) * scale;
    const coreGrad = ctx.createRadialGradient(
      x - 2 * scale,
      y - 2 * scale,
      2 * scale,
      x,
      y,
      coreRadius,
    );
    coreGrad.addColorStop(0.0, `rgba(255, 255, 255, ${coreAlpha})`);
    coreGrad.addColorStop(0.35, `rgba(103, 232, 249, ${coreAlpha * 0.9})`);
    coreGrad.addColorStop(0.7, `rgba(6, 182, 212, ${coreAlpha * 0.7})`);
    coreGrad.addColorStop(1.0, "rgba(2, 132, 199, 0)");
    ctx.beginPath();
    ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();
  }

  // 4. Ethereal Ionized Plasma Vapor Puffs (0.20 to 1.00)
  if (progress >= 0.2) {
    const puffProgress = (progress - 0.2) / 0.8;
    const puffAlpha = Math.max(0, (1 - puffProgress) * 0.75);
    const puffCount = 6;
    const upwardDrift = puffProgress * 15 * scale;

    for (let i = 0; i < puffCount; i++) {
      const angle = (i * Math.PI * 2) / puffCount + 0.3;
      const puffDist = (8 + puffProgress * 32) * scale;
      const puffX = x + Math.cos(angle) * puffDist;
      const puffY = y + Math.sin(angle) * puffDist - upwardDrift * 0.5;
      const puffRadius = (10 + puffProgress * 20) * scale;

      const puffGrad = ctx.createRadialGradient(
        puffX,
        puffY,
        1 * scale,
        puffX,
        puffY,
        puffRadius,
      );
      puffGrad.addColorStop(0.0, `rgba(186, 230, 253, ${puffAlpha * 0.8})`);
      puffGrad.addColorStop(0.4, `rgba(56, 189, 248, ${puffAlpha * 0.5})`);
      puffGrad.addColorStop(0.8, `rgba(14, 116, 144, ${puffAlpha * 0.25})`);
      puffGrad.addColorStop(1.0, "rgba(14, 116, 144, 0)");

      ctx.beginPath();
      ctx.arc(puffX, puffY, puffRadius, 0, Math.PI * 2);
      ctx.fillStyle = puffGrad;
      ctx.fill();
    }

    // Central ionized cloud
    const centralRadius = (14 + puffProgress * 22) * scale;
    const centralGrad = ctx.createRadialGradient(
      x,
      y - upwardDrift * 0.7,
      2 * scale,
      x,
      y - upwardDrift * 0.7,
      centralRadius,
    );
    centralGrad.addColorStop(0.0, `rgba(224, 242, 254, ${puffAlpha * 0.85})`);
    centralGrad.addColorStop(0.4, `rgba(56, 189, 248, ${puffAlpha * 0.45})`);
    centralGrad.addColorStop(0.8, `rgba(6, 182, 212, ${puffAlpha * 0.18})`);
    centralGrad.addColorStop(1.0, "rgba(6, 182, 212, 0)");

    ctx.beginPath();
    ctx.arc(x, y - upwardDrift * 0.7, centralRadius, 0, Math.PI * 2);
    ctx.fillStyle = centralGrad;
    ctx.fill();
  }

  ctx.restore();
}
