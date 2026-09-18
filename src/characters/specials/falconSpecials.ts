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
    drawFalconPunch(
      ctx,
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      frameCounter,
    );
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

  if (specialType === "kick" || specialType === "kick_air") {
    drawFalconKick(
      ctx,
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      frameCounter,
      specialType === "kick_air",
    );
    return;
  }

  if (specialType === "kick_end") {
    drawFalconKickEnd(
      ctx,
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      frameCounter,
    );
    return;
  }
}

/**
 * Visualizes Falcon Punch (Neutral-B):
 * Authentic Smash 64 multi-phase animation:
 * 1. Startup & Charging Windup (Frames 0-39): Cocked fist, swirling spiral fire vortex, intensifying solar core, and pre-ignition strobe.
 * 2. Release & Falcon Strike (Frames 40-54): Muscular thrusting arm & white glove, majestic fiery Falcon raptor phoenix with hooked beak and feathered wings, glowing eye, supersonic shockwave rings, and flame exhaust.
 * 3. Dissipation & Follow-through (Frames 55-88): Dissolving forward ember spray, lingering knuckle heat smoke, and recovery stance.
 */
function drawFalconPunch(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  frameCounter: number,
): void {
  ctx.save();
  const dir = facingRight ? 1 : -1;
  const shoulderX = x - dir * (halfWidth * 0.1);
  const shoulderY = centerY - heightPx * 0.05;

  ctx.translate(shoulderX, shoulderY);
  if (dir < 0) {
    ctx.scale(-1, 1);
  }

  const w = halfWidth;
  const h = heightPx;

  if (frameCounter < 40) {
    // ----------------------------------------------------
    // PHASE 1: CHARGING WINDUP ("FAAAALCOOOON...")
    // ----------------------------------------------------
    const progress = frameCounter / 40; // 0 to 1
    const cockedFistX = -w * (0.35 + progress * 0.15);
    const cockedFistY = h * 0.08;

    // 1. Cocked Arm & Fist (drawn back ready to unleash)
    // Upper arm
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cockedFistX * 0.6, cockedFistY * 0.4);
    ctx.lineTo(cockedFistX * 0.5, cockedFistY * 0.8);
    ctx.lineTo(-w * 0.1, h * 0.1);
    ctx.closePath();
    ctx.fillStyle = "#1e3a8a"; // Navy suit
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Forearm & Gold Bracer
    ctx.beginPath();
    ctx.moveTo(cockedFistX * 0.55, cockedFistY * 0.6);
    ctx.lineTo(cockedFistX, cockedFistY);
    ctx.lineTo(cockedFistX + w * 0.1, cockedFistY + h * 0.12);
    ctx.lineTo(cockedFistX * 0.45, cockedFistY + h * 0.15);
    ctx.closePath();
    ctx.fillStyle = "#fbbf24"; // Gold cuff
    ctx.fill();
    ctx.stroke();

    // Clenched White Glove Fist
    ctx.beginPath();
    ctx.ellipse(
      cockedFistX,
      cockedFistY,
      Math.max(0.1, w * 0.28),
      Math.max(0.1, h * 0.14),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#f8fafc";
    ctx.fill();
    ctx.stroke();

    // 2. Swirling Inward Flame Vortex (6 spiral arms contracting into the fist)
    const spiralArms = 6;
    for (let i = 0; i < spiralArms; i++) {
      const baseAngle = frameCounter * 0.18 + (i * (Math.PI * 2)) / spiralArms;
      const outerR = w * (1.6 - progress * 0.4);
      const innerR = w * 0.25;

      ctx.save();
      ctx.beginPath();
      const startX = cockedFistX + Math.cos(baseAngle) * outerR;
      const startY = cockedFistY + Math.sin(baseAngle) * outerR * 0.7;
      const midAngle = baseAngle + 0.8;
      const midR = (outerR + innerR) * 0.5;
      const midX = cockedFistX + Math.cos(midAngle) * midR;
      const midY = cockedFistY + Math.sin(midAngle) * midR * 0.7;
      const endX = cockedFistX + Math.cos(baseAngle + 1.6) * innerR;
      const endY = cockedFistY + Math.sin(baseAngle + 1.6) * innerR * 0.7;

      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(midX, midY, endX, endY);

      const armAlpha = 0.35 + 0.45 * Math.sin(frameCounter * 0.25 + i);
      ctx.strokeStyle =
        i % 2 === 0
          ? `rgba(249, 115, 22, ${armAlpha})` // Flame orange
          : `rgba(253, 224, 71, ${armAlpha})`; // Solar yellow
      ctx.lineWidth = 2 + progress * 2;
      ctx.shadowColor = "#ff4500";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();
    }

    // 3. Gathering Fiery Embers orbiting and drawn into the core
    for (let e = 0; e < 8; e++) {
      const emberAngle = (frameCounter * 0.28 + e * 0.8) % (Math.PI * 2);
      const emberDist =
        w * (0.35 + 0.65 * ((frameCounter * 0.05 + e * 0.15) % 1));
      const emX = cockedFistX + Math.cos(emberAngle) * emberDist;
      const emY = cockedFistY + Math.sin(emberAngle) * emberDist * 0.7;
      ctx.beginPath();
      ctx.arc(emX, emY, 1.8 + (e % 2) * 1.2, 0, Math.PI * 2);
      ctx.fillStyle =
        e % 3 === 0 ? "#ffffff" : e % 2 === 0 ? "#fef08a" : "#f97316";
      ctx.fill();
    }

    // 4. Intensifying Solar Core at the Knuckle
    const pulseFreq = 0.25 + progress * 0.45;
    const pulse =
      1 + (0.2 + progress * 0.2) * Math.sin(frameCounter * pulseFreq);
    const coreR = Math.max(8, w * 0.35) * (0.7 + progress * 0.6) * pulse;

    // Outer flame corona
    ctx.beginPath();
    ctx.arc(cockedFistX, cockedFistY, coreR * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(234, 88, 12, ${0.3 + progress * 0.35})`;
    ctx.shadowColor = "#ff4500";
    ctx.shadowBlur = 14 + progress * 10;
    ctx.fill();

    // Mid plasma layer
    ctx.beginPath();
    ctx.arc(cockedFistX, cockedFistY, coreR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(251, 191, 36, ${0.6 + progress * 0.35})`;
    ctx.fill();

    // Intense solar center
    ctx.beginPath();
    ctx.arc(cockedFistX, cockedFistY, coreR * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 8;
    ctx.fill();

    // 5. Pre-Ignition Strobe Flash (Frames 35-39)
    if (frameCounter >= 35) {
      const flashProgress = (frameCounter - 35) / 4;
      const flashAlpha = 0.7 + 0.3 * Math.sin(frameCounter * 1.5);
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 18;
      // 4-pointed diamond star flare
      const flareLen = w * (0.8 + flashProgress * 0.8);
      ctx.beginPath();
      ctx.moveTo(cockedFistX - flareLen, cockedFistY);
      ctx.lineTo(cockedFistX + flareLen, cockedFistY);
      ctx.moveTo(cockedFistX, cockedFistY - flareLen * 0.6);
      ctx.lineTo(cockedFistX, cockedFistY + flareLen * 0.6);
      ctx.stroke();
      ctx.restore();
    }
  } else if (frameCounter < 55) {
    // ----------------------------------------------------
    // PHASE 2: RELEASE & FALCON STRIKE ("...PAAAANCH!")
    // ----------------------------------------------------
    const strikeFrame = frameCounter - 40; // 0 to 14
    const thrustProgress = Math.min(1.0, 0.45 + strikeFrame * 0.18);
    const punchDist = w * (1.4 + thrustProgress * 0.85);
    const punchY = h * 0.02;

    // 1. Thrusting Arm & White Gauntlet Fist
    ctx.save();
    // Navy blue sleeve
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.08);
    ctx.lineTo(punchDist * 0.75, punchY - h * 0.07);
    ctx.lineTo(punchDist * 0.75, punchY + h * 0.07);
    ctx.lineTo(0, h * 0.08);
    ctx.closePath();
    ctx.fillStyle = "#1e3a8a";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Gold forearm bracer
    ctx.beginPath();
    ctx.moveTo(punchDist * 0.7, punchY - h * 0.08);
    ctx.lineTo(punchDist * 0.92, punchY - h * 0.07);
    ctx.lineTo(punchDist * 0.92, punchY + h * 0.07);
    ctx.lineTo(punchDist * 0.7, punchY + h * 0.08);
    ctx.closePath();
    ctx.fillStyle = "#fbbf24";
    ctx.fill();
    ctx.stroke();

    // White leather glove clenched fist
    ctx.beginPath();
    ctx.ellipse(
      punchDist,
      punchY,
      Math.max(0.1, w * 0.32),
      Math.max(0.1, h * 0.15),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#f8fafc";
    ctx.fill();
    ctx.stroke();

    // Knuckle ridges on glove
    ctx.beginPath();
    ctx.moveTo(punchDist + w * 0.22, punchY - h * 0.1);
    ctx.lineTo(punchDist + w * 0.28, punchY);
    ctx.lineTo(punchDist + w * 0.22, punchY + h * 0.1);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();

    // 2. Trailing Kinetic Speed Streaks & Fire Exhaust (behind the punch)
    ctx.save();
    ctx.lineWidth = 2.2;
    const streakYOffsets = [-h * 0.12, 0, h * 0.12];
    for (let s = 0; s < streakYOffsets.length; s++) {
      const sy = punchY + (streakYOffsets[s] ?? 0);
      const streakLen = w * (0.8 + (s % 2) * 0.4);
      ctx.beginPath();
      ctx.moveTo(punchDist * 0.8 - streakLen, sy);
      ctx.lineTo(punchDist * 0.85, sy);
      ctx.strokeStyle =
        s === 1 ? "rgba(255, 255, 255, 0.85)" : "rgba(251, 191, 36, 0.75)";
      ctx.stroke();
    }
    ctx.restore();

    // 3. Supersonic Shockwave Ring (expanding outward from release)
    const waveProgress = strikeFrame / 14;
    const waveRadiusX = w * (0.6 + waveProgress * 1.5);
    const waveRadiusY = h * (0.35 + waveProgress * 0.9);
    const waveAlpha = Math.max(0, 1 - waveProgress);
    if (waveAlpha > 0.05) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(
        punchDist * 0.65,
        punchY,
        waveRadiusX,
        waveRadiusY,
        0,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = `rgba(254, 240, 138, ${waveAlpha * 0.85})`;
      ctx.lineWidth = 2.8 * waveAlpha;
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }

    // 4. THE ICONIC FIERY FALCON / PHOENIX SILHOUETTE
    // Originates from punchDist, projecting forward into a majestic raptor shape
    const raptorScale = 1.0 + Math.sin(strikeFrame * 0.3) * 0.08;
    const beakTipX =
      punchDist + w * (1.65 + Math.min(strikeFrame * 0.12, 0.6)) * raptorScale;
    const beakTipY = punchY;
    const headX = punchDist + w * 0.65;
    const wingSpanTop = h * (0.85 + strikeFrame * 0.04) * raptorScale;
    const wingSpanBtm = h * (0.75 + strikeFrame * 0.04) * raptorScale;

    ctx.save();
    ctx.shadowColor = "#ff4500";
    ctx.shadowBlur = 20;

    // --- Outer Fire Plumage (Crimson to Fiery Orange) ---
    ctx.beginPath();
    // Start at back crest
    ctx.moveTo(headX - w * 0.4, punchY - h * 0.28);
    // Top wing upper edge with feathered steps
    ctx.quadraticCurveTo(
      headX,
      punchY - wingSpanTop * 0.85,
      headX - w * 0.35,
      punchY - wingSpanTop,
    );
    ctx.lineTo(headX - w * 0.15, punchY - wingSpanTop * 0.72);
    ctx.lineTo(headX - w * 0.45, punchY - wingSpanTop * 0.82);
    // Forehead curving into top beak
    ctx.quadraticCurveTo(
      headX + w * 0.5,
      punchY - h * 0.32,
      beakTipX - w * 0.25,
      punchY - h * 0.12,
    );
    // Hooked raptor beak tip
    ctx.quadraticCurveTo(
      beakTipX + w * 0.15,
      punchY - h * 0.05,
      beakTipX,
      beakTipY,
    );
    // Beak underside curving back into mouth gape
    ctx.quadraticCurveTo(
      beakTipX - w * 0.2,
      punchY + h * 0.08,
      beakTipX - w * 0.55,
      punchY + h * 0.05,
    );
    // Lower raptor jaw
    ctx.lineTo(beakTipX - w * 0.3, punchY + h * 0.2);
    // Bottom wing lower edge with feathered steps
    ctx.quadraticCurveTo(
      headX,
      punchY + wingSpanBtm * 0.85,
      headX - w * 0.3,
      punchY + wingSpanBtm,
    );
    ctx.lineTo(headX - w * 0.1, punchY + wingSpanBtm * 0.68);
    ctx.lineTo(headX - w * 0.4, punchY + wingSpanBtm * 0.78);
    // Lower breast back to fist
    ctx.quadraticCurveTo(
      punchDist * 0.8,
      punchY + h * 0.3,
      punchDist * 0.5,
      punchY + h * 0.1,
    );
    ctx.closePath();

    ctx.fillStyle = "rgba(234, 88, 12, 0.45)"; // Deep fiery orange outer body
    ctx.fill();
    ctx.strokeStyle = "rgba(249, 115, 22, 0.95)";
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // --- Inner Blazing Amber Raptor Body ---
    ctx.beginPath();
    ctx.moveTo(headX - w * 0.1, punchY - h * 0.18);
    ctx.quadraticCurveTo(
      headX + w * 0.4,
      punchY - wingSpanTop * 0.45,
      beakTipX - w * 0.3,
      punchY - h * 0.06,
    );
    ctx.lineTo(beakTipX - w * 0.05, beakTipY);
    ctx.quadraticCurveTo(
      beakTipX - w * 0.3,
      punchY + h * 0.06,
      headX + w * 0.2,
      punchY + wingSpanBtm * 0.4,
    );
    ctx.quadraticCurveTo(headX, punchY + h * 0.18, punchDist * 0.8, punchY);
    ctx.closePath();
    ctx.fillStyle = "rgba(251, 191, 36, 0.65)"; // Radiant amber gold
    ctx.fill();
    ctx.strokeStyle = "rgba(253, 224, 71, 0.95)";
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // --- Core White-Hot Piercing Blast Shaft ---
    ctx.beginPath();
    ctx.moveTo(punchDist * 0.7, punchY);
    ctx.lineTo(beakTipX + w * 0.1, beakTipY);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = 3.2;
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 12;
    ctx.stroke();

    // --- Glowing Raptor Eye ---
    const eyeX = headX + w * 0.32;
    const eyeY = punchY - h * 0.1;
    ctx.beginPath();
    ctx.ellipse(
      eyeX,
      eyeY,
      Math.max(0.1, w * 0.09),
      Math.max(0.1, h * 0.06),
      -0.2,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 10;
    ctx.fill();

    // Eye Glint Spike
    ctx.beginPath();
    ctx.moveTo(eyeX - w * 0.16, eyeY);
    ctx.lineTo(eyeX + w * 0.16, eyeY);
    ctx.moveTo(eyeX, eyeY - h * 0.1);
    ctx.lineTo(eyeX, eyeY + h * 0.1);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // --- Forward Flying Flame Embers ---
    for (let f = 0; f < 6; f++) {
      const emberOffX = beakTipX + w * (0.15 + ((f * 0.18) % 0.8));
      const emberOffY =
        punchY + Math.sin(strikeFrame * 0.5 + f * 1.3) * h * 0.35;
      ctx.beginPath();
      ctx.arc(emberOffX, emberOffY, 2.5 + (f % 2) * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = f % 2 === 0 ? "#fde047" : "#ffffff";
      ctx.fill();
    }
    ctx.restore();
  } else {
    // ----------------------------------------------------
    // PHASE 3: SMOLDER & DISSIPATION (Frames 55-88)
    // ----------------------------------------------------
    const fadeFrame = frameCounter - 55; // 0 to 33
    const fadeAlpha = Math.max(0, 1 - fadeFrame / 34);
    const punchDist = w * (2.25 - (fadeFrame / 34) * 0.3); // Gradually settling back
    const punchY = h * 0.02;

    // Follow-through Arm & Glove
    ctx.save();
    // Navy blue sleeve
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.08);
    ctx.lineTo(punchDist * 0.75, punchY - h * 0.07);
    ctx.lineTo(punchDist * 0.75, punchY + h * 0.07);
    ctx.lineTo(0, h * 0.08);
    ctx.closePath();
    ctx.fillStyle = "#1e3a8a";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Gold bracer
    ctx.beginPath();
    ctx.moveTo(punchDist * 0.7, punchY - h * 0.08);
    ctx.lineTo(punchDist * 0.92, punchY - h * 0.07);
    ctx.lineTo(punchDist * 0.92, punchY + h * 0.07);
    ctx.lineTo(punchDist * 0.7, punchY + h * 0.08);
    ctx.closePath();
    ctx.fillStyle = "#fbbf24";
    ctx.fill();
    ctx.stroke();

    // White glove
    ctx.beginPath();
    ctx.ellipse(
      punchDist,
      punchY,
      Math.max(0.1, w * 0.3),
      Math.max(0.1, h * 0.14),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#f8fafc";
    ctx.fill();
    ctx.stroke();

    // Cooling Knuckle Heat Glow on glove
    if (fadeAlpha > 0.05) {
      ctx.beginPath();
      ctx.ellipse(
        punchDist + w * 0.12,
        punchY,
        Math.max(0.1, w * 0.22 * fadeAlpha),
        Math.max(0.1, h * 0.12 * fadeAlpha),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = `rgba(249, 115, 22, ${fadeAlpha * 0.65})`;
      ctx.shadowColor = "#ff4500";
      ctx.shadowBlur = 10 * fadeAlpha;
      ctx.fill();
    }
    ctx.restore();

    // Dissolving Ember Spray & Heat Wisps flying forward
    if (fadeAlpha > 0.05) {
      ctx.save();
      for (let p = 0; p < 10; p++) {
        const pDist = punchDist + w * (0.3 + p * 0.22 + fadeFrame * 0.08);
        const pY =
          punchY + Math.sin(fadeFrame * 0.15 + p * 1.7) * (h * 0.2 + p * 4);
        const pAlpha = Math.max(0, fadeAlpha - p * 0.05);
        if (pAlpha > 0) {
          ctx.beginPath();
          ctx.arc(pDist, pY, Math.max(0.5, 2.5 * pAlpha), 0, Math.PI * 2);
          ctx.fillStyle =
            p % 2 === 0
              ? `rgba(251, 191, 36, ${pAlpha})`
              : `rgba(249, 115, 22, ${pAlpha})`;
          ctx.shadowColor = "#ff4500";
          ctx.shadowBlur = 6 * pAlpha;
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  ctx.restore();
}

/**
 * Visualizes Falcon Kick (Down-B):
 * Dynamic supersonic flying kick with outstretched leg, white boot,
 * aerodynamic multi-layered fiery raptor lance / arrowhead, supersonic shockwave rings,
 * trailing flame exhaust jets, and burning ground friction sparks (ground) or
 * supersonic atmospheric re-entry dive wake streaks & embers (air).
 *
 * When isAerial is true (action state 0x0e9), the kick is angled steeply downward-forward
 * at ~20° from straight down (70° below horizontal), matching Captain Falcon's dive trajectory.
 */
function drawFalconKick(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  frameCounter: number,
  isAerial: boolean = false,
): void {
  ctx.save();
  const dir = facingRight ? 1 : -1;
  const hipX = x - dir * (halfWidth * 0.1);
  const hipY = centerY + heightPx * 0.08;

  ctx.translate(hipX, hipY);
  if (dir < 0) {
    ctx.scale(-1, 1);
  }

  if (isAerial) {
    // Angled steeply downward-forward: ~20° from straight down / vertical (70° below horizontal)
    const kickAngle = (70 * Math.PI) / 180;
    ctx.rotate(kickAngle);
  }

  const w = halfWidth;
  const h = heightPx;

  // Lead kicking leg coordinates
  const kneeX = w * 0.7;
  const kneeY = h * 0.06;
  const toeX = w * 1.65;
  const toeY = h * 0.12;

  // 1. Trailing Jet Flame Exhaust behind Falcon
  ctx.save();
  const exhaustCount = 4;
  for (let e = 0; e < exhaustCount; e++) {
    const yOff = (e - 1.5) * (h * 0.12);
    const trailLen =
      w * (1.2 + (e % 2) * 0.5 + Math.sin(frameCounter * 0.4 + e) * 0.25);
    ctx.beginPath();
    ctx.moveTo(-w * 0.3, yOff);
    ctx.quadraticCurveTo(
      -w * 0.8,
      yOff + Math.sin(frameCounter * 0.5 + e) * (h * 0.08),
      -w * 0.3 - trailLen,
      yOff + (e % 2 === 0 ? h * 0.05 : -h * 0.05),
    );
    ctx.strokeStyle =
      e % 2 === 0 ? "rgba(249, 115, 22, 0.85)" : "rgba(253, 224, 71, 0.85)";
    ctx.lineWidth = 2.5 + (e % 2) * 1.5;
    ctx.shadowColor = "#ff4500";
    ctx.shadowBlur = 10;
    ctx.stroke();
  }
  ctx.restore();

  // 2. Ground Friction Sparks & Skid Flame (ground) OR Atmospheric Dive Wake (air)
  if (!isAerial) {
    const floorY = h * 0.38;
    ctx.save();
    // Scorching ground flame line
    ctx.beginPath();
    ctx.moveTo(-w * 1.2, floorY);
    ctx.lineTo(toeX * 0.8, floorY);
    ctx.strokeStyle = "rgba(249, 115, 22, 0.75)";
    ctx.lineWidth = 2.8;
    ctx.shadowColor = "#ea580c";
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Backward-spraying friction sparks
    for (let s = 0; s < 6; s++) {
      const sparkX = -w * (0.2 + s * 0.28 + ((frameCounter * 0.1) % 0.4));
      const sparkY =
        floorY - Math.sin(frameCounter * 0.6 + s * 1.2) * (h * 0.12);
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = s % 2 === 0 ? "#ffffff" : "#fbbf24";
      ctx.fill();
    }
    ctx.restore();
  } else {
    // Aerial dive wake: supersonic air compression streaks trailing upward-backward along dive path
    ctx.save();
    for (let s = 0; s < 5; s++) {
      const wakeY = (s - 2) * (h * 0.16);
      const wakeX = -w * (0.4 + s * 0.3);
      const streakLen = w * (0.9 + ((s + frameCounter * 0.25) % 0.7));
      ctx.beginPath();
      ctx.moveTo(wakeX, wakeY);
      ctx.lineTo(wakeX - streakLen, wakeY);
      ctx.strokeStyle =
        s % 2 === 0 ? "rgba(254, 240, 138, 0.75)" : "rgba(249, 115, 22, 0.65)";
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "#ff4500";
      ctx.shadowBlur = 8;
      ctx.stroke();
    }
    // High-altitude atmospheric friction embers
    for (let e = 0; e < 6; e++) {
      const emberX = -w * (0.3 + e * 0.32 + ((frameCounter * 0.15) % 0.4));
      const emberY = Math.sin(frameCounter * 0.5 + e * 1.5) * (h * 0.2);
      ctx.beginPath();
      ctx.arc(emberX, emberY, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = e % 2 === 0 ? "#ffffff" : "#fbbf24";
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 6;
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. Outstretched Kicking Leg & White Boot
  ctx.save();
  // Navy racing suit thigh
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.06);
  ctx.lineTo(kneeX, kneeY - h * 0.05);
  ctx.lineTo(kneeX, kneeY + h * 0.05);
  ctx.lineTo(0, h * 0.06);
  ctx.closePath();
  ctx.fillStyle = "#1e3a8a";
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Gold knee armor plate
  ctx.beginPath();
  ctx.moveTo(kneeX - w * 0.08, kneeY - h * 0.07);
  ctx.lineTo(kneeX + w * 0.15, kneeY - h * 0.05);
  ctx.lineTo(kneeX + w * 0.12, kneeY + h * 0.06);
  ctx.lineTo(kneeX - w * 0.08, kneeY + h * 0.07);
  ctx.closePath();
  ctx.fillStyle = "#fbbf24";
  ctx.fill();
  ctx.stroke();

  // White leather racing boot
  ctx.beginPath();
  ctx.moveTo(kneeX + w * 0.1, kneeY - h * 0.05);
  ctx.lineTo(toeX, toeY - h * 0.04);
  ctx.lineTo(toeX + w * 0.15, toeY);
  ctx.lineTo(toeX - w * 0.05, toeY + h * 0.08);
  ctx.lineTo(kneeX + w * 0.05, kneeY + h * 0.06);
  ctx.closePath();
  ctx.fillStyle = "#f8fafc";
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Boot sole & heel detail
  ctx.beginPath();
  ctx.moveTo(kneeX + w * 0.12, kneeY + h * 0.06);
  ctx.lineTo(toeX - w * 0.05, toeY + h * 0.08);
  ctx.lineTo(toeX + w * 0.14, toeY + h * 0.02);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2.0;
  ctx.stroke();
  ctx.restore();

  // 4. Aerodynamic Supersonic Flame Spear / Arrowhead (enveloping the boot)
  const pulse = Math.sin(frameCounter * 0.4) * 0.08;
  const spearTipX = toeX + w * (0.85 + pulse);
  const spearTipY = toeY;

  ctx.save();
  ctx.shadowColor = "#ff4500";
  ctx.shadowBlur = 18;

  // Outer blazing flame lance wedge
  ctx.beginPath();
  ctx.moveTo(kneeX + w * 0.1, kneeY - h * 0.2);
  // Upper flame teeth
  ctx.lineTo(toeX - w * 0.2, toeY - h * 0.18);
  ctx.lineTo(toeX - w * 0.05, toeY - h * 0.12);
  ctx.lineTo(toeX + w * 0.2, toeY - h * 0.16);
  // Spear tip
  ctx.quadraticCurveTo(
    spearTipX + w * 0.08,
    spearTipY - h * 0.04,
    spearTipX,
    spearTipY,
  );
  // Lower flame teeth
  ctx.quadraticCurveTo(
    toeX + w * 0.2,
    toeY + h * 0.14,
    toeX - w * 0.1,
    toeY + h * 0.18,
  );
  ctx.lineTo(toeX - w * 0.25, toeY + h * 0.12);
  ctx.lineTo(kneeX + w * 0.2, kneeY + h * 0.16);
  ctx.closePath();
  ctx.fillStyle = "rgba(234, 88, 12, 0.5)"; // Deep crimson/orange
  ctx.fill();
  ctx.strokeStyle = "rgba(249, 115, 22, 0.95)";
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Inner radiant amber core wedge
  ctx.beginPath();
  ctx.moveTo(kneeX + w * 0.4, kneeY - h * 0.1);
  ctx.lineTo(toeX + w * 0.1, toeY - h * 0.08);
  ctx.lineTo(spearTipX - w * 0.1, spearTipY);
  ctx.lineTo(toeX + w * 0.1, toeY + h * 0.08);
  ctx.lineTo(kneeX + w * 0.5, kneeY + h * 0.08);
  ctx.closePath();
  ctx.fillStyle = "rgba(251, 191, 36, 0.75)"; // Bright amber gold
  ctx.fill();
  ctx.strokeStyle = "rgba(253, 224, 71, 0.95)";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Piercing white core thrust line
  ctx.beginPath();
  ctx.moveTo(toeX - w * 0.2, toeY);
  ctx.lineTo(spearTipX + w * 0.08, spearTipY);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.lineWidth = 2.8;
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.restore();

  // 5. Pulsing Supersonic Shockwave Ring
  const waveCycle = (frameCounter * 0.25) % 1;
  const waveAlpha = 1 - waveCycle;
  const waveRadiusX = w * (0.4 + waveCycle * 0.8);
  const waveRadiusY = h * (0.25 + waveCycle * 0.5);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(
    toeX + w * (0.2 + waveCycle * 0.4),
    toeY,
    waveRadiusX,
    waveRadiusY,
    0,
    0,
    Math.PI * 2,
  );
  ctx.strokeStyle = `rgba(254, 240, 138, ${waveAlpha * 0.85})`;
  ctx.lineWidth = 2.2 * waveAlpha;
  ctx.shadowColor = "#f59e0b";
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/**
 * Visualizes Falcon Kick End / Braking Deceleration:
 * Scorched floor skid mark, braking friction spark burst, and cooling smoke plumes.
 */
function drawFalconKickEnd(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  frameCounter: number,
): void {
  ctx.save();
  const dir = facingRight ? 1 : -1;
  const floorY = centerY + heightPx * 0.45;
  const bootX = x + dir * halfWidth * 0.4;
  const progress = Math.min(1.0, frameCounter / 20);
  const fadeAlpha = Math.max(0, 1 - progress);

  // 1. Scorched Ground Skid Mark
  ctx.save();
  ctx.beginPath();
  const skidLen = halfWidth * (1.6 - progress * 0.3);
  ctx.moveTo(bootX - dir * skidLen, floorY);
  ctx.lineTo(bootX, floorY);
  ctx.strokeStyle = `rgba(249, 115, 22, ${fadeAlpha * 0.85})`;
  ctx.lineWidth = 3.5;
  ctx.shadowColor = "#ff4500";
  ctx.shadowBlur = 10 * fadeAlpha;
  ctx.stroke();

  // Dark charcoal skid core
  ctx.beginPath();
  ctx.moveTo(bootX - dir * (skidLen * 0.8), floorY);
  ctx.lineTo(bootX, floorY);
  ctx.strokeStyle = `rgba(30, 41, 59, ${fadeAlpha * 0.9})`;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();

  // 2. Braking Friction Spark Burst
  if (fadeAlpha > 0.05) {
    ctx.save();
    const sparkCount = 8;
    for (let s = 0; s < sparkCount; s++) {
      const angle = (s / sparkCount) * (Math.PI * 0.7) - Math.PI * 0.85;
      const dist = halfWidth * (0.3 + (s % 3) * 0.25) * (1 + progress * 0.5);
      const sx = bootX + dir * Math.cos(angle) * dist;
      const sy = floorY + Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.5, 2.2 * fadeAlpha), 0, Math.PI * 2);
      ctx.fillStyle = s % 2 === 0 ? "#fef08a" : "#ea580c";
      ctx.shadowColor = "#ff4500";
      ctx.shadowBlur = 6 * fadeAlpha;
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. Billowing Smoke Plumes rising from the hot boot
  if (fadeAlpha > 0.05) {
    ctx.save();
    for (let p = 0; p < 4; p++) {
      const puffY = floorY - heightPx * (0.1 + p * 0.09 + progress * 0.15);
      const puffX =
        bootX - dir * (p * 5) + Math.sin(frameCounter * 0.2 + p) * 6;
      const puffR = (halfWidth * 0.18 + p * 4) * (0.8 + progress * 0.6);
      const puffAlpha = fadeAlpha * 0.45 * (1 - p * 0.2);
      ctx.beginPath();
      ctx.arc(puffX, puffY, Math.max(0.5, puffR), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(148, 163, 184, ${puffAlpha})`;
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}
