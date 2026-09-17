import {
  type JigglypuffSpecialType,
  resolveColor,
} from "../../renderer/common/index.js";

/**
 * Visualizes Jigglypuff's signature special moves:
 * - Pound (Neutral-B): Sideways lunging punch attack with outstretched arm, clenched fist, and horizontal strike arc.
 * - Sing (Up-B): Concentric musical soundwave rings radiating outward with floating notes.
 * - Rest (Down-B): Explosive critical hit star bloom with flower petals and Zzz sparkles.
 */
export function drawJigglypuffSpecial(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  _color: string,
  specialType: JigglypuffSpecialType,
  frameCounter: number,
  actionStateId?: number,
): void {
  const dir = facingRight ? 1 : -1;
  const noseX = x + dir * halfWidth;

  if (specialType === "pound") {
    ctx.save();
    // Sideways Punch (Pound): Dynamic horizontal/angled lunging fist with punch strike arc & impact sparks
    const isAngledUp =
      actionStateId === 0x0dd ||
      actionStateId === 0x0e0 ||
      actionStateId === 0x0e1 ||
      actionStateId === 0x0e7;
    const isAngledDown = actionStateId === 0x0de || actionStateId === 0x0e8;

    const angleOffsetY = isAngledUp
      ? -heightPx * 0.18
      : isAngledDown
        ? heightPx * 0.15
        : -heightPx * 0.05;

    const punchProgress = Math.min(1, frameCounter / 15);
    const extendDist =
      halfWidth * (0.35 + 0.85 * Math.sin(punchProgress * Math.PI * 0.75));
    const fistX = noseX + dir * extendDist;
    const fistY = centerY + angleOffsetY;
    const armHeight = Math.max(4, heightPx * 0.18);

    // 1. Horizontal/Angled thrust speed lines
    ctx.beginPath();
    ctx.moveTo(x + dir * (halfWidth * 0.2), fistY - armHeight * 0.85);
    ctx.lineTo(fistX + dir * 6, fistY - armHeight * 0.85);
    ctx.moveTo(x + dir * (halfWidth * 0.2), fistY + armHeight * 0.85);
    ctx.lineTo(fistX + dir * 6, fistY + armHeight * 0.85);
    ctx.moveTo(x + dir * (halfWidth * 0.1), fistY);
    ctx.lineTo(fistX + dir * 10, fistY);
    ctx.strokeStyle = "rgba(244, 114, 182, 0.65)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. Punching Arm (extended from body to fist)
    ctx.beginPath();
    ctx.moveTo(x + dir * (halfWidth * 0.4), centerY - armHeight * 0.4);
    ctx.lineTo(fistX, fistY - armHeight * 0.6);
    ctx.lineTo(fistX, fistY + armHeight * 0.6);
    ctx.lineTo(x + dir * (halfWidth * 0.4), centerY + armHeight * 0.4);
    ctx.closePath();
    ctx.fillStyle = "#f472b6";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 3. Clenched Fist at punch tip
    const fistR = Math.max(6, halfWidth * 0.4);
    const rotationAngle = isAngledUp
      ? facingRight
        ? -0.28
        : 0.28
      : isAngledDown
        ? facingRight
          ? 0.28
          : -0.28
        : 0;

    ctx.beginPath();
    ctx.ellipse(
      fistX,
      fistY,
      fistR * 1.1,
      fistR * 0.9,
      rotationAngle,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#f9a8d4";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Knuckle details on the punching fist
    ctx.beginPath();
    ctx.arc(
      fistX + dir * (fistR * 0.5),
      fistY - fistR * 0.35,
      fistR * 0.35,
      0,
      Math.PI * 2,
    );
    ctx.arc(
      fistX + dir * (fistR * 0.5),
      fistY + fistR * 0.35,
      fistR * 0.35,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#f472b6";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4. Curved Punch Strike Swipe Arc (crescent impact slash)
    const arcDist = fistX + dir * (fistR * 0.7);
    const arcR = fistR * 1.7;
    ctx.beginPath();
    ctx.ellipse(
      arcDist,
      fistY,
      Math.max(3, arcR * 0.45),
      arcR,
      rotationAngle,
      facingRight ? -Math.PI * 0.45 : Math.PI * 0.55,
      facingRight ? Math.PI * 0.45 : Math.PI * 1.45,
    );
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 3.5;
    ctx.shadowColor = "#f472b6";
    ctx.shadowBlur = 10;
    ctx.stroke();

    // 5. Kinetic punch impact flash / shockwave sparks
    const impactProg = (frameCounter % 8) / 8;
    const sparkRadius = fistR * 1.2 + impactProg * (halfWidth * 0.75);
    ctx.beginPath();
    ctx.ellipse(
      fistX + dir * (fistR * 0.6),
      fistY,
      sparkRadius * 0.6,
      sparkRadius,
      rotationAngle,
      0,
      Math.PI * 2,
    );
    ctx.strokeStyle = resolveColor("#ec4899", false, (1 - impactProg) * 0.8);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
    return;
  }

  if (specialType === "sing") {
    ctx.save();
    // Concentric musical soundwave rings + floating notes
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
      const ringProg = (frameCounter * 0.05 + i / ringCount) % 1;
      const r = halfWidth * 0.8 + ringProg * (heightPx * 1.2);
      ctx.beginPath();
      ctx.arc(x, centerY, r, 0, Math.PI * 2);
      ctx.strokeStyle = resolveColor("#f472b6", false, (1 - ringProg) * 0.85);
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Floating musical notes ♪ ♫
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillStyle = "#ec4899";
    ctx.shadowColor = "#f472b6";
    ctx.shadowBlur = 8;
    const note1Y = centerY - heightPx * 0.6 + Math.sin(frameCounter * 0.2) * 4;
    const note2Y = centerY - heightPx * 0.4 + Math.cos(frameCounter * 0.25) * 4;
    ctx.fillText("♪", x - halfWidth * 1.1, note1Y);
    ctx.fillText("♫", x + halfWidth * 0.9, note2Y);

    ctx.restore();
    return;
  }

  if (specialType === "rest") {
    ctx.save();
    // Explosive critical hit star bloom with flower petals and Zzz sparkles
    const bloomR = Math.max(14, heightPx * 0.8);
    const isBurst = frameCounter < 10;

    if (isBurst) {
      // Massive flash beam burst
      const beamCount = 8;
      for (let i = 0; i < beamCount; i++) {
        const ang = (i * Math.PI * 2) / beamCount;
        ctx.beginPath();
        ctx.moveTo(x, centerY);
        ctx.lineTo(
          x + Math.cos(ang) * (bloomR * 1.6),
          centerY + Math.sin(ang) * (bloomR * 1.6),
        );
        ctx.strokeStyle = i % 2 === 0 ? "#f43f5e" : "#fde047";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "#f43f5e";
        ctx.shadowBlur = 14;
        ctx.stroke();
      }
    }

    // Flower petal bloom
    const petalCount = 5;
    for (let i = 0; i < petalCount; i++) {
      const ang = (i * Math.PI * 2) / petalCount;
      const px = x + Math.cos(ang) * (bloomR * 0.6);
      const py = centerY + Math.sin(ang) * (bloomR * 0.6);
      ctx.beginPath();
      ctx.arc(px, py, bloomR * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(244, 63, 94, 0.75)";
      ctx.fill();
    }

    // White center flash
    ctx.beginPath();
    ctx.arc(x, centerY, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Sleeping Zzz
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillStyle = "#93c5fd";
    ctx.fillText("z", x + 8, centerY - heightPx * 0.5);

    ctx.restore();
    return;
  }
}
