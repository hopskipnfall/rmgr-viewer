import type { KirbySpecialType } from "../../renderer/common/index.js";

/**
 * Visualizes Kirby's signature special moves:
 * - Inhale (Neutral-B): Billowing translucent suction wind cone converging into wide mouth.
 * - Final Cutter (Up-B): Vertical sword slash trail rising up, somersault, downward dive, and floor shockwave.
 * - Stone (Down-B): Heavy slate rock transformation with floor fracture puffs.
 */
export function drawKirbySpecial(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  _color: string,
  specialType: KirbySpecialType,
  frameCounter: number,
  actionStateId?: number,
): void {
  const dir = facingRight ? 1 : -1;
  const mouthX = x + dir * (halfWidth * 0.7);

  if (specialType === "inhale") {
    ctx.save();
    // Suction wind cone expanding forward from mouth
    const coneLen = halfWidth * 3.2;
    const coneEndW = heightPx * 1.1;

    // 1. Translucent suction cone fill
    ctx.beginPath();
    ctx.moveTo(mouthX, centerY);
    ctx.lineTo(mouthX + dir * coneLen, centerY - coneEndW * 0.5);
    ctx.lineTo(mouthX + dir * coneLen, centerY + coneEndW * 0.5);
    ctx.closePath();
    ctx.fillStyle = "rgba(186, 230, 253, 0.25)";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 10;
    ctx.fill();

    // 2. Swirling air stream curves
    const streamCount = 4;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";

    for (let i = 0; i < streamCount; i++) {
      const streamProg = (frameCounter * 0.08 + i / streamCount) % 1;
      const sx = mouthX + dir * (coneLen * (1 - streamProg));
      const sy =
        centerY + (i - 1.5) * (coneEndW * 0.28 * (1 - streamProg * 0.5));

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(
        mouthX + dir * (coneLen * 0.4),
        centerY + Math.sin(frameCounter * 0.3 + i) * 6,
        mouthX,
        centerY,
      );
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  if (specialType === "final_cutter") {
    ctx.save();
    const fc = Math.max(1, frameCounter);
    const isLanded = actionStateId === 0x101 || actionStateId === 0x0e8;
    const isFallingFast = !isLanded && fc > 45;

    // Blade positioning:
    // In the air: held forward in Kirby's front hand at chest/hand level
    // On the ground: slammed down into the floor
    const bladeY = isLanded ? y - 4 : centerY - heightPx * 0.02;

    // Horizontal blade dimensions
    const bladeW = Math.max(26, halfWidth * 1.85);
    const bladeH = 5.5;
    const hiltX = isLanded
      ? x + dir * (halfWidth * 0.45)
      : x + dir * (halfWidth * 0.58);
    const tipX = hiltX + dir * bladeW;
    const leftX = Math.min(hiltX, tipX);
    const rightX = Math.max(hiltX, tipX);
    const bladeCenterX = (leftX + rightX) * 0.5;

    // 1. Slashing Trail Behind the Horizontal Blade (streaming upward above the blade)
    if (isFallingFast) {
      // In-flight downward slash: high-speed vertical energy wake streaming upward behind plunging blade
      const dropFrames = fc - 45;
      const trailHeight = Math.min(heightPx * 3.0, dropFrames * 5.5);
      const trailTopY = bladeY - trailHeight;
      const trailBottomY = bladeY;

      const trailGrad = ctx.createLinearGradient(0, trailTopY, 0, trailBottomY);
      trailGrad.addColorStop(0.0, "rgba(56, 189, 248, 0.0)");
      trailGrad.addColorStop(0.4, "rgba(56, 189, 248, 0.3)");
      trailGrad.addColorStop(0.8, "rgba(56, 189, 248, 0.65)");
      trailGrad.addColorStop(1.0, "rgba(186, 230, 253, 0.85)");

      ctx.beginPath();
      ctx.moveTo(leftX + 2, trailTopY);
      ctx.lineTo(rightX - 2, trailTopY);
      ctx.lineTo(rightX, trailBottomY);
      ctx.lineTo(leftX, trailBottomY);
      ctx.closePath();
      ctx.fillStyle = trailGrad;
      ctx.shadowColor = "#0284c7";
      ctx.shadowBlur = 18;
      ctx.fill();

      // White-hot core stream lines
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.beginPath();
      ctx.moveTo(
        bladeCenterX - dir * 3,
        trailTopY + (trailBottomY - trailTopY) * 0.25,
      );
      ctx.lineTo(bladeCenterX - dir * 3, trailBottomY);
      ctx.moveTo(
        bladeCenterX + dir * 4,
        trailTopY + (trailBottomY - trailTopY) * 0.1,
      );
      ctx.lineTo(bladeCenterX + dir * 4, trailBottomY);
      ctx.stroke();

      // Speed streaks
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(125, 211, 252, 0.75)";
      ctx.beginPath();
      ctx.moveTo(leftX + 4, trailTopY + (trailBottomY - trailTopY) * 0.35);
      ctx.lineTo(leftX + 4, trailBottomY);
      ctx.moveTo(rightX - 6, trailTopY + (trailBottomY - trailTopY) * 0.18);
      ctx.lineTo(rightX - 6, trailBottomY);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (isLanded) {
      // Ground landing after striking through air: dissipating upward energy residue
      const residueH = Math.max(8, heightPx * 0.9 - fc * 1.2);
      const trailTopY = bladeY - residueH;
      const trailBottomY = bladeY;
      const alpha = Math.max(0, 0.7 - fc * 0.05);

      if (alpha > 0) {
        const resGrad = ctx.createLinearGradient(0, trailTopY, 0, trailBottomY);
        resGrad.addColorStop(0.0, `rgba(56, 189, 248, 0.0)`);
        resGrad.addColorStop(1.0, `rgba(186, 230, 253, ${alpha})`);

        ctx.beginPath();
        ctx.moveTo(leftX + 4, trailTopY);
        ctx.lineTo(rightX - 4, trailTopY);
        ctx.lineTo(rightX, trailBottomY);
        ctx.lineTo(leftX, trailBottomY);
        ctx.closePath();
        ctx.fillStyle = resGrad;
        ctx.fill();
      }
    }

    // 2. Horizontal Cutter Blade
    // Outer cyan aura glow
    ctx.beginPath();
    ctx.roundRect(
      leftX - 3,
      bladeY - bladeH * 0.5 - 3,
      bladeW + 6,
      bladeH + 6,
      4,
    );
    ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
    ctx.shadowColor = "#0284c7";
    ctx.shadowBlur = 14;
    ctx.fill();

    // Sharp horizontal blade polygon (tapered forward tip)
    ctx.beginPath();
    ctx.moveTo(hiltX + dir * 3, bladeY - bladeH * 0.5);
    ctx.lineTo(tipX - dir * 5, bladeY - bladeH * 0.5);
    ctx.lineTo(tipX, bladeY);
    ctx.lineTo(tipX - dir * 5, bladeY + bladeH * 0.5);
    ctx.lineTo(hiltX + dir * 3, bladeY + bladeH * 0.5);
    ctx.closePath();
    ctx.fillStyle = "#f0f9ff";
    ctx.fill();
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Center cyan energy fuller line
    ctx.beginPath();
    ctx.moveTo(hiltX + dir * 5, bladeY);
    ctx.lineTo(tipX - dir * 6, bladeY);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // White-hot cutting edge
    ctx.beginPath();
    ctx.moveTo(hiltX + dir * 3, bladeY - bladeH * 0.5);
    ctx.lineTo(tipX - dir * 5, bladeY - bladeH * 0.5);
    ctx.lineTo(tipX, bladeY);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Gold crossguard & pommel at the hilt end
    ctx.beginPath();
    ctx.ellipse(hiltX + dir * 2, bladeY, 2.8, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#facc15";
    ctx.fill();
    ctx.strokeStyle = "#854d0e";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(hiltX - dir * 2, bladeY, 2.2, 2.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ca8a04";
    ctx.fill();

    // 3. Front Hand Grip
    ctx.beginPath();
    ctx.ellipse(
      hiltX + dir * 1,
      bladeY,
      Math.max(0.1, 0.22 * halfWidth),
      Math.max(0.1, 0.22 * halfWidth),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#f472b6";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // 4. Ground impact shockwave on landing (surges strictly forward in front of Kirby)
    if (isLanded) {
      const startX = x + dir * (halfWidth * 0.35);
      const impW = Math.max(32, halfWidth * (2.2 + fc * 0.35));
      const waveEndX = startX + dir * impW;
      const waveH = Math.max(6, 12 - fc * 0.25);

      // Forward-surging ground shockwave wedge / crest
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.quadraticCurveTo(startX + dir * (impW * 0.5), y - waveH, waveEndX, y);
      ctx.closePath();
      ctx.fillStyle = "rgba(56, 189, 248, 0.8)";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 16;
      ctx.fill();

      // White-hot forward leading crest line
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.quadraticCurveTo(
        startX + dir * (impW * 0.45),
        y - waveH * 0.85,
        waveEndX,
        y,
      );
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Forward ground wave base streak line
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(186, 230, 253, 0.9)";
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(waveEndX, y);
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  if (specialType === "stone") {
    ctx.save();
    // Solid stone/brick block
    const stoneW = halfWidth * 1.8;
    const stoneH = heightPx * 0.95;
    const left = x - stoneW * 0.5;
    const top = y - stoneH;

    // Stone block body
    ctx.fillStyle = "#64748b"; // Slate rock
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.fillRect(left, top, stoneW, stoneH);
    ctx.strokeRect(left, top, stoneW, stoneH);

    // Chiseled highlights
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(left + 2, top + 2, stoneW - 4, 3);
    ctx.fillRect(left + 2, top + 2, 3, stoneH - 4);

    // Floor impact dust puffs
    ctx.beginPath();
    ctx.ellipse(x - stoneW * 0.6, y, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.ellipse(x + stoneW * 0.6, y, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(203, 213, 225, 0.65)";
    ctx.fill();

    ctx.restore();
    return;
  }
}
