import type { NessSpecialType } from "../../renderer/common/index.js";

/**
 * Visualizes Ness's signature special moves:
 * - PK Thunder (Up-B): Psychic energy guiding spark & explosive rocket launch.
 * - PSI Magnet (Down-B): Glowing hexagonal psychic absorption barrier shield.
 */
export function drawNessSpecial(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  _color: string,
  specialType: NessSpecialType,
  frameCounter: number,
): void {
  const dir = facingRight ? 1 : -1;

  if (specialType === "pk_thunder_charge") {
    ctx.save();
    // Up-B: Guiding spark orb above Ness
    const sparkY = centerY - heightPx * 0.9;
    const pulse = 1 + 0.25 * Math.sin(frameCounter * 0.4);
    const sparkR = 7 * pulse;

    // Orbiting electric spark ring
    ctx.beginPath();
    ctx.arc(x, sparkY, sparkR * 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(129, 140, 248, 0.75)";
    ctx.lineWidth = 1.6;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Glowing psychic spark orb
    ctx.beginPath();
    ctx.arc(x, sparkY, sparkR, 0, Math.PI * 2);
    ctx.fillStyle = "#818cf8"; // Electric indigo
    ctx.shadowColor = "#6366f1";
    ctx.shadowBlur = 12;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, sparkY, sparkR * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.restore();
    return;
  }

  if (specialType === "pk_thunder_rocket") {
    ctx.save();
    // PK Rocket launch: rocket thruster flames behind Ness
    const backX = x - dir * halfWidth;
    const thrustLen = halfWidth * 2.2;
    ctx.beginPath();
    ctx.moveTo(backX, centerY - heightPx * 0.3);
    ctx.lineTo(backX - dir * thrustLen, centerY);
    ctx.lineTo(backX, centerY + heightPx * 0.3);
    ctx.closePath();
    ctx.fillStyle = "rgba(99, 102, 241, 0.65)";
    ctx.shadowColor = "#818cf8";
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.strokeStyle = "#c084fc";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
    return;
  }

  if (specialType === "psi_magnet") {
    ctx.save();
    // Down-B: Hexagonal PSI absorption barrier shield
    const radius =
      Math.max(16, halfWidth * 1.45) + Math.sin(frameCounter * 0.3) * 2;
    const sides = 6;

    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i * Math.PI * 2) / sides + frameCounter * 0.05;
      const px = x + Math.cos(angle) * radius;
      const py = centerY + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(56, 189, 248, 0.28)"; // Translucent PSI cyan
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Vertex nodes on hexagon
    for (let i = 0; i < sides; i++) {
      const angle = (i * Math.PI * 2) / sides + frameCounter * 0.05;
      const px = x + Math.cos(angle) * radius;
      const py = centerY + Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }

    ctx.restore();
  }
}
