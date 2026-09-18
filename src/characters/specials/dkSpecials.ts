import {
  type BackgroundTheme,
  type DKSpecialType,
  resolveColor,
} from "../../renderer/common/index.js";

/**
 * Visualizes Donkey Kong's signature special moves:
 * - Spinning Kong (Up-B): Rapid helicopter arm rotation discs and wind vortex swooshes.
 * - Hand Slap (Down-B): Rhythmic ground quake slam with expanding earthquake shockwave rings and floor cracks.
 * - Giant Punch (Neutral-B): Glowing charged fist windup.
 */
export function drawDKSpecial(
  ctx: CanvasRenderingContext2D,
  backgroundTheme: BackgroundTheme,
  x: number,
  y: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  _color: string,
  specialType: DKSpecialType,
  frameCounter: number,
  characterSpecific?: number,
): void {
  const dir = facingRight ? 1 : -1;
  const isMountainTheme = backgroundTheme === "mountain";
  const isAutumnTheme = backgroundTheme === "autumn";

  if (specialType === "spinning_kong") {
    ctx.save();
    // Helicopter spin vortex discs
    const spinSpeed = 0.45;
    const vortexR = halfWidth * 1.55;

    // 1. Horizontal wind vortex ellipse
    ctx.beginPath();
    ctx.ellipse(x, centerY, vortexR, heightPx * 0.35, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 2.4;
    ctx.shadowColor = isMountainTheme
      ? "#ec4899"
      : isAutumnTheme
        ? "#f59e0b"
        : "#fbbf24";
    ctx.shadowBlur = 8;
    ctx.stroke();

    // 2. Spinning arm blur trails orbiting DK
    const armFur = isMountainTheme
      ? "#6366f1"
      : isAutumnTheme
        ? "#451a03"
        : "#92400e";
    const armSkin = isMountainTheme
      ? "#fdf4ff"
      : isAutumnTheme
        ? "#fde68a"
        : "#fed7aa";
    for (let i = 0; i < 2; i++) {
      const angle = frameCounter * spinSpeed + i * Math.PI;
      const armX = x + Math.cos(angle) * vortexR;
      const armY = centerY + Math.sin(angle) * (heightPx * 0.25);

      ctx.beginPath();
      ctx.arc(armX, armY, Math.max(1.5, halfWidth * 0.32), 0, Math.PI * 2);
      ctx.fillStyle = armFur;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(armX, armY, Math.max(1.0, halfWidth * 0.2), 0, Math.PI * 2);
      ctx.fillStyle = armSkin;
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  if (specialType === "hand_slap") {
    ctx.save();
    // Down-B: Hand Slap ground earthquake shockwaves
    const slamProg = (frameCounter % 14) / 14;
    const shockRadius = halfWidth * (1.4 + slamProg * 1.4);
    const alpha = 1 - slamProg;

    const ripple1Color = isMountainTheme
      ? "#c084fc"
      : isAutumnTheme
        ? "#f97316"
        : "#f59e0b";
    const ripple1Glow = isMountainTheme
      ? "#a855f7"
      : isAutumnTheme
        ? "#ea580c"
        : "#d97706";
    const ripple2Color = isMountainTheme
      ? "#38bdf8"
      : isAutumnTheme
        ? "#facc15"
        : "#fbbf24";
    const crackColor = isMountainTheme
      ? "#7e22ce"
      : isAutumnTheme
        ? "#78350f"
        : "#b45309";

    // 1. Expanding earthquake floor ripple ellipse
    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      shockRadius,
      Math.max(1, heightPx * (0.08 + slamProg * 0.05)),
      0,
      0,
      Math.PI * 2,
    );
    ctx.strokeStyle = resolveColor(ripple1Color, false, alpha * 0.95);
    ctx.lineWidth = Math.max(1, 2.8 * (halfWidth / 25));
    ctx.shadowColor = ripple1Glow;
    ctx.shadowBlur = Math.max(2, 10 * (halfWidth / 25));
    ctx.stroke();

    // 2. Secondary inner shock ripple
    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      shockRadius * 0.6,
      Math.max(0.8, heightPx * 0.05),
      0,
      0,
      Math.PI * 2,
    );
    ctx.strokeStyle = resolveColor(ripple2Color, false, alpha * 0.7);
    ctx.lineWidth = Math.max(0.8, 1.8 * (halfWidth / 25));
    ctx.stroke();

    // 3. Jagged floor fracture fissure lines radiating outwards
    ctx.lineWidth = Math.max(0.8, 2 * (halfWidth / 25));
    ctx.strokeStyle = resolveColor(crackColor, false, alpha * 0.85);
    for (const side of [-1, 1]) {
      const crackX1 = x + side * (halfWidth * 0.5);
      const crackX2 = x + side * (shockRadius * 0.9);
      ctx.beginPath();
      ctx.moveTo(crackX1, y);
      ctx.lineTo(crackX1 + side * (halfWidth * 0.3), y - heightPx * 0.04);
      ctx.lineTo(crackX1 + side * (halfWidth * 0.6), y + heightPx * 0.03);
      ctx.lineTo(crackX2, y);
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  if (specialType === "giant_punch_windup") {
    ctx.save();
    // Neutral-B: Giant Punch rotating arm windup
    // Shoulder pivot joint positioned on DK's upper back
    const shoulderX = x - dir * (halfWidth * 0.25);
    const shoulderY = centerY - heightPx * 0.12;

    ctx.translate(shoulderX, shoulderY);
    if (dir < 0) {
      ctx.scale(-1, 1);
    }

    // Backward windmill arm rotation
    const spinSpeed = 0.45;
    const rotAngle = -frameCounter * spinSpeed;
    // Scaled proportionally to DK's body dimensions (scales naturally with camera distance)
    const armRadius = halfWidth * 1.55;
    const armRadiusY = armRadius * 0.86;

    const fistX = Math.cos(rotAngle) * armRadius;
    const fistY = Math.sin(rotAngle) * armRadiusY;

    const isFullCharge =
      characterSpecific !== undefined && characterSpecific >= 10;

    // 1. Circular wind trail swoosh arc behind the rotating fist
    const trailArc = Math.PI * 1.15;
    ctx.beginPath();
    ctx.ellipse(0, 0, armRadius, armRadiusY, 0, rotAngle, rotAngle + trailArc);
    const trailStroke = isFullCharge
      ? `hsl(${(frameCounter * 8) % 360}, 95%, 65%)`
      : isMountainTheme
        ? "rgba(236, 72, 153, 0.65)"
        : isAutumnTheme
          ? "rgba(249, 115, 22, 0.65)"
          : "rgba(251, 191, 36, 0.7)";
    ctx.strokeStyle = trailStroke;
    ctx.lineWidth = Math.max(1, halfWidth * 0.18);
    ctx.shadowColor = isFullCharge
      ? `hsl(${(frameCounter * 8) % 360}, 95%, 65%)`
      : isMountainTheme
        ? "#f43f5e"
        : isAutumnTheme
          ? "#ea580c"
          : "#f59e0b";
    ctx.shadowBlur = Math.max(2, 10 * (halfWidth / 25));
    ctx.stroke();

    // 2. Thick gorilla arm linking shoulder to fist
    const armThickness = halfWidth * 0.42;
    const armFur = isMountainTheme
      ? "#4f46e5"
      : isAutumnTheme
        ? "#451a03"
        : "#78350f";
    const armHighlight = isMountainTheme
      ? "#818cf8"
      : isAutumnTheme
        ? "#78350f"
        : "#92400e";

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(fistX, fistY);
    ctx.strokeStyle = armFur;
    ctx.lineWidth = Math.max(1, armThickness);
    ctx.lineCap = "round";
    ctx.shadowBlur = 0;
    ctx.stroke();

    // Muscular bicep highlight on arm
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(fistX * 0.75, fistY * 0.75);
    ctx.strokeStyle = armHighlight;
    ctx.lineWidth = Math.max(0.5, armThickness * 0.35);
    ctx.stroke();

    // 3. Clenched gorilla fist (fur knuckle mass with peach palm)
    const fistRadius = halfWidth * 0.55;
    const fistFur = isMountainTheme
      ? "#6366f1"
      : isAutumnTheme
        ? "#5c2406"
        : "#92400e";
    const fistSkin = isMountainTheme
      ? "#fdf4ff"
      : isAutumnTheme
        ? "#fde68a"
        : "#fed7aa";

    ctx.beginPath();
    ctx.arc(fistX, fistY, fistRadius, 0, Math.PI * 2);
    ctx.fillStyle = fistFur;
    if (isFullCharge) {
      ctx.shadowColor = `hsl(${(frameCounter * 8) % 360}, 95%, 65%)`;
      ctx.shadowBlur = Math.max(3, 14 * (halfWidth / 25));
    } else {
      ctx.shadowColor = isMountainTheme ? "#ec4899" : "#f59e0b";
      ctx.shadowBlur = Math.max(2, 8 * (halfWidth / 25));
    }
    ctx.fill();

    // Tan skin palm/knuckle center
    ctx.beginPath();
    ctx.arc(fistX, fistY, fistRadius * 0.62, 0, Math.PI * 2);
    ctx.fillStyle = fistSkin;
    ctx.shadowBlur = 0;
    ctx.fill();

    // Knuckle definition bumps on the rotating fist
    const fistAngle = rotAngle + Math.PI * 0.5;
    for (let k = -1.5; k <= 1.5; k += 1) {
      const kAngle = fistAngle + k * 0.45;
      const kx = fistX + Math.cos(kAngle) * (fistRadius * 0.85);
      const ky = fistY + Math.sin(kAngle) * (fistRadius * 0.85);
      ctx.beginPath();
      ctx.arc(kx, ky, fistRadius * 0.26, 0, Math.PI * 2);
      ctx.fillStyle = fistSkin;
      ctx.fill();
      ctx.strokeStyle = fistFur;
      ctx.lineWidth = Math.max(0.5, fistRadius * 0.1);
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  if (specialType === "giant_punch") {
    ctx.save();
    // Neutral-B: Giant Punch punch execution / forward haymaker release
    const charge = Math.min(10, Math.max(0, characterSpecific ?? 0));
    const isFullCharge = charge >= 10;
    const chargeRatio = charge / 10;

    // Shoulder joint
    const shoulderX = x - dir * (halfWidth * 0.2);
    const shoulderY = centerY - heightPx * 0.08;

    ctx.translate(shoulderX, shoulderY);
    if (dir < 0) {
      ctx.scale(-1, 1);
    }

    // Punch reach extends forward with charge and frame progression
    const baseReach = halfWidth * 1.5;
    const chargeBonus = halfWidth * (0.3 + chargeRatio * 0.6);
    const thrustProgress = Math.min(
      1.0,
      0.6 + Math.min(frameCounter, 8) * 0.05,
    );
    const punchDist = (baseReach + chargeBonus) * thrustProgress;
    const punchY = heightPx * 0.02;

    const fistRadius = halfWidth * 0.65 * (1 + chargeRatio * 0.22);
    const armThickness = halfWidth * 0.44;

    // Fur & skin colors matching DK theme
    const armFur = isMountainTheme
      ? "#4f46e5"
      : isAutumnTheme
        ? "#451a03"
        : "#78350f";
    const armHighlight = isMountainTheme
      ? "#818cf8"
      : isAutumnTheme
        ? "#78350f"
        : "#92400e";
    const fistFur = isMountainTheme
      ? "#6366f1"
      : isAutumnTheme
        ? "#5c2406"
        : "#92400e";
    const fistSkin = isMountainTheme
      ? "#fdf4ff"
      : isAutumnTheme
        ? "#fde68a"
        : "#fed7aa";

    const primaryGlow = isFullCharge
      ? `hsl(${(frameCounter * 12) % 360}, 95%, 65%)`
      : isMountainTheme
        ? "#ec4899"
        : isAutumnTheme
          ? "#ea580c"
          : "#f59e0b";
    const secondaryGlow = isFullCharge
      ? `hsl(${(frameCounter * 12 + 60) % 360}, 95%, 70%)`
      : isMountainTheme
        ? "#f43f5e"
        : isAutumnTheme
          ? "#f97316"
          : "#fbbf24";

    // 1. Kinetic speed streaks trailing behind the thrusting fist
    ctx.lineWidth = Math.max(1, 2.4 * (halfWidth / 25));
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    const streakOffsets = [-armThickness * 0.6, 0, armThickness * 0.6];
    for (let i = 0; i < streakOffsets.length; i++) {
      const offset = streakOffsets[i] ?? 0;
      const offY = punchY + offset;
      const len = punchDist * (0.45 + (i % 2) * 0.25);
      ctx.beginPath();
      ctx.moveTo(punchDist * 0.7 - len, offY);
      ctx.lineTo(punchDist * 0.85, offY);
      ctx.stroke();
    }

    // 2. Thick muscular gorilla arm
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(punchDist, punchY);
    ctx.strokeStyle = armFur;
    ctx.lineWidth = Math.max(1, armThickness);
    ctx.lineCap = "round";
    ctx.shadowColor = primaryGlow;
    ctx.shadowBlur = Math.max(2, (isFullCharge ? 14 : 6) * (halfWidth / 25));
    ctx.stroke();

    // Arm muscle highlight core
    ctx.beginPath();
    ctx.moveTo(armThickness * 0.2, -1);
    ctx.lineTo(punchDist - fistRadius * 0.4, punchY - 1);
    ctx.strokeStyle = armHighlight;
    ctx.lineWidth = Math.max(0.5, armThickness * 0.35);
    ctx.shadowBlur = 0;
    ctx.stroke();

    // 3. Giant Clenched Fist
    // Fur backing
    ctx.beginPath();
    ctx.arc(punchDist, punchY, fistRadius, 0, Math.PI * 2);
    ctx.fillStyle = fistFur;
    ctx.shadowColor = primaryGlow;
    ctx.shadowBlur = Math.max(2, (isFullCharge ? 18 : 10) * (halfWidth / 25));
    ctx.fill();

    // Tan skin palm/knuckle plate
    ctx.beginPath();
    ctx.arc(
      punchDist + fistRadius * 0.15,
      punchY,
      fistRadius * 0.65,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = fistSkin;
    ctx.shadowBlur = 0;
    ctx.fill();

    // Clenched knuckles along the forward face of the fist
    const knuckleCount = 4;
    const knuckleSpan = fistRadius * 1.3;
    const knuckleR = fistRadius * 0.28;
    for (let k = 0; k < knuckleCount; k++) {
      const ky =
        punchY - knuckleSpan * 0.5 + (k / (knuckleCount - 1)) * knuckleSpan;
      const kx = punchDist + fistRadius * 0.8;
      ctx.beginPath();
      ctx.arc(kx, ky, knuckleR, 0, Math.PI * 2);
      ctx.fillStyle = fistSkin;
      ctx.fill();
      ctx.strokeStyle = fistFur;
      ctx.lineWidth = Math.max(0.5, fistRadius * 0.1);
      ctx.stroke();
    }

    // 4. Conical impact shockwaves radiating forward
    const shockwaveCount = isFullCharge ? 3 : 2;
    for (let s = 1; s <= shockwaveCount; s++) {
      const swDist =
        punchDist + fistRadius + s * halfWidth * (0.45 + chargeRatio * 0.3);
      const swRadiusX = halfWidth * (0.22 + s * 0.15) * (1 + chargeRatio * 0.4);
      const swRadiusY = fistRadius * (1.1 + s * 0.45);
      ctx.beginPath();
      ctx.ellipse(
        swDist,
        punchY,
        swRadiusX,
        swRadiusY,
        0,
        -Math.PI * 0.42,
        Math.PI * 0.42,
      );
      ctx.strokeStyle = s === 1 ? primaryGlow : secondaryGlow;
      ctx.lineWidth = Math.max(
        1,
        (4 - s * 0.8 + chargeRatio * 1.5) * (halfWidth / 25),
      );
      ctx.shadowColor = primaryGlow;
      ctx.shadowBlur = Math.max(2, (10 + s * 4) * (halfWidth / 25));
      ctx.stroke();
    }

    // 5. Full-charge or high-charge explosive starburst impact flash
    if (charge >= 5) {
      const burstX = punchDist + fistRadius * 1.05;
      const burstY = punchY;
      const starR = fistRadius * (0.7 + chargeRatio * 0.6);
      ctx.save();
      ctx.translate(burstX, burstY);
      ctx.beginPath();
      for (let p = 0; p < 8; p++) {
        const angle = (p * Math.PI) / 4 + frameCounter * 0.2;
        const r = p % 2 === 0 ? starR : starR * 0.35;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = isFullCharge ? "#ffffff" : secondaryGlow;
      ctx.shadowColor = primaryGlow;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
    return;
  }
}
