import type { FalconSpecialType } from "../../renderer/common/index.js";

/**
 * Visualizes Captain Falcon's signature special moves:
 * - Falcon Punch (Neutral-B): Glowing fiery energy windup & massive forward flame strike cone.
 * - Falcon Dive (Up-B): Upward-angled grab reach jaws, explosive grab catch, and blast release.
 * - Falcon Kick (Down-B): Flaming thrust trail and glowing nose flame tip.
 */
export function drawFalconSpecial(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  _color: string,
  specialType: FalconSpecialType,
  frameCounter: number,
): void {
  const dir = facingRight ? 1 : -1;
  const noseX = x + dir * halfWidth;

  if (specialType === "punch") {
    const isCharging = frameCounter < 50;
    ctx.save();
    if (isCharging) {
      // Windup/charge: intense pulsing fiery energy spark condensing at fist/nose
      const pulse = 1 + 0.25 * Math.sin(frameCounter * 0.35);
      const radius = Math.max(8, halfWidth * 0.45) * pulse;

      // 1. Outer flame aura
      ctx.beginPath();
      ctx.arc(noseX + dir * 4, centerY, radius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 69, 0, 0.35)";
      ctx.shadowColor = "#ff4500";
      ctx.shadowBlur = 12;
      ctx.fill();

      // 2. Core flame spark
      ctx.beginPath();
      ctx.arc(noseX + dir * 4, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#ffaa00";
      ctx.fill();

      // 3. Electric white center
      ctx.beginPath();
      ctx.arc(noseX + dir * 4, centerY, radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    } else {
      // Punch release: massive fiery falcon strike cone projecting forward
      const punchLen = halfWidth * 1.75;
      const tipX = noseX + dir * punchLen;
      const wingSpan = heightPx * 0.65;

      // 1. Radiant fiery falcon beak fill
      ctx.beginPath();
      ctx.moveTo(noseX, centerY - wingSpan * 0.7);
      ctx.quadraticCurveTo(
        noseX + dir * punchLen * 0.5,
        centerY - wingSpan,
        tipX,
        centerY,
      );
      ctx.quadraticCurveTo(
        noseX + dir * punchLen * 0.5,
        centerY + wingSpan,
        noseX,
        centerY + wingSpan * 0.7,
      );
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 69, 0, 0.4)";
      ctx.shadowColor = "#ff4500";
      ctx.shadowBlur = 14;
      ctx.fill();

      // 2. Flaming outer stroke
      ctx.strokeStyle = "#ffaa00";
      ctx.lineWidth = 3;
      ctx.stroke();

      // 3. Bright white central piercing thrust beam
      ctx.beginPath();
      ctx.moveTo(noseX, centerY);
      ctx.lineTo(tipX + dir * 6, centerY);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (specialType === "dive_reach") {
    // Falcon Dive Up-B Reach: upward-angled (45 deg) grabbing jaws
    const reachLen = halfWidth * 1.45;
    const reachX = noseX + dir * reachLen * 0.75;
    const reachY = centerY - heightPx * 0.55;
    const toothLen = heightPx * 0.2;

    ctx.save();
    ctx.strokeStyle = "#ff6600";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.shadowColor = "#ff6600";
    ctx.shadowBlur = 8;

    // Top claw arm
    ctx.beginPath();
    ctx.moveTo(noseX, centerY - heightPx * 0.2);
    ctx.lineTo(reachX, reachY);
    ctx.lineTo(reachX - dir * toothLen * 0.5, reachY + toothLen);
    ctx.stroke();

    // Bottom claw arm
    ctx.beginPath();
    ctx.moveTo(noseX, centerY + heightPx * 0.1);
    ctx.lineTo(reachX, reachY + heightPx * 0.35);
    ctx.lineTo(
      reachX - dir * toothLen * 0.5,
      reachY + heightPx * 0.35 - toothLen,
    );
    ctx.stroke();

    // White inner claw highlights
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Dashed capture field line between the claw teeth
    ctx.beginPath();
    ctx.moveTo(reachX - dir * toothLen * 0.5, reachY + toothLen + 2);
    ctx.lineTo(
      reachX - dir * toothLen * 0.5,
      reachY + heightPx * 0.35 - toothLen - 2,
    );
    ctx.strokeStyle = "rgba(255, 220, 100, 0.95)";
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
    return;
  }

  if (specialType === "dive_catch") {
    // Falcon Dive Catch: explosive grab lock burst at contact point
    ctx.save();
    const burstX = noseX + dir * halfWidth * 0.5;
    const burstRadius = 14;

    ctx.beginPath();
    ctx.arc(burstX, centerY, burstRadius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 180, 0, 0.4)";
    ctx.shadowColor = "#ffbb00";
    ctx.shadowBlur = 10;
    ctx.fill();

    // 4 radial spark spikes
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(burstX - 18, centerY);
    ctx.lineTo(burstX + 18, centerY);
    ctx.moveTo(burstX, centerY - 18);
    ctx.lineTo(burstX, centerY + 18);
    ctx.stroke();

    ctx.restore();
    return;
  }

  if (specialType === "dive_explosion") {
    // Falcon Dive Detachment Detonation: punchy forward fiery explosion at contact point
    ctx.save();
    // Center the blast in front of Falcon's chest where the victim was grabbed & launched
    const blastX = x + dir * halfWidth * 0.7;
    const blastY = centerY - heightPx * 0.1;

    const baseRadius = Math.max(halfWidth * 0.75, heightPx * 0.35);
    const frameProgress = Math.min(1, (frameCounter + 1) / 8);
    const radius = baseRadius * (0.75 + 0.35 * frameProgress);

    // 1. Fiery explosion glow aura
    const grad = ctx.createRadialGradient(
      blastX,
      blastY,
      radius * 0.1,
      blastX,
      blastY,
      radius,
    );
    grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    grad.addColorStop(0.25, "rgba(255, 220, 50, 0.85)");
    grad.addColorStop(0.6, "rgba(255, 80, 0, 0.65)");
    grad.addColorStop(1, "rgba(220, 20, 0, 0)");

    ctx.beginPath();
    ctx.arc(blastX, blastY, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.shadowColor = "#ff4500";
    ctx.shadowBlur = 10;
    ctx.fill();

    // 2. Starburst flame spikes radiating from blast center
    const spikeCount = 8;
    const innerR = radius * 0.45;
    const outerR = radius * 1.2;
    ctx.beginPath();
    for (let i = 0; i < spikeCount * 2; i++) {
      const angle = (i * Math.PI) / spikeCount + frameCounter * 0.1;
      const r = i % 2 === 0 ? outerR : innerR;
      const px = blastX + Math.cos(angle) * r;
      const py = blastY + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 200, 40, 0.75)";
    ctx.strokeStyle = "rgba(255, 80, 0, 0.9)";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // 3. Shockwave ring expanding outward
    ctx.beginPath();
    ctx.arc(blastX, blastY, radius * 1.15, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "#ffea00";
    ctx.shadowBlur = 8;
    ctx.stroke();

    // 4. Intense white core flash
    ctx.beginPath();
    ctx.arc(blastX, blastY, radius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.restore();
    return;
  }

  if (specialType === "kick") {
    // Falcon Kick Down-B: flaming speed trail + glowing nose flame
    ctx.save();
    const trailLen = halfWidth * 1.6;
    const backX = x - dir * halfWidth;

    // 1. Trailing speed flames behind the triangle
    ctx.beginPath();
    ctx.moveTo(backX, centerY - heightPx * 0.35);
    ctx.lineTo(backX - dir * trailLen, centerY - heightPx * 0.2);
    ctx.moveTo(backX, centerY);
    ctx.lineTo(backX - dir * (trailLen * 1.2), centerY);
    ctx.moveTo(backX, centerY + heightPx * 0.35);
    ctx.lineTo(backX - dir * trailLen, centerY + heightPx * 0.2);
    ctx.strokeStyle = "rgba(255, 100, 0, 0.85)";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.shadowColor = "#ff4500";
    ctx.shadowBlur = 8;
    ctx.stroke();

    // 2. Fiery thrust tip on nose
    ctx.beginPath();
    ctx.arc(noseX, centerY, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ff5500";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(noseX, centerY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.restore();
    return;
  }

  if (specialType === "kick_end") {
    // Lingering flame particles on slide/wall hit
    ctx.save();
    ctx.beginPath();
    ctx.arc(noseX, centerY, 6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 120, 0, 0.5)";
    ctx.fill();
    ctx.restore();
  }
}
