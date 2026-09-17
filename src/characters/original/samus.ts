import type { BackgroundTheme, CharacterAnimState } from "../common.js";
import { drawCharacterStateAuras, resolveColor } from "../common.js";

export function drawSamusPolygons(
  ctx: CanvasRenderingContext2D,
  backgroundTheme: BackgroundTheme,
  x: number,
  y: number,
  _topY: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  effectiveDir: number,
  playerColor: string,
  state: CharacterAnimState,
): void {
  const { taunting, inCombo, isRoll, isOpponent, actionFrameCounter } = state;
  ctx.save();
  const posX =
    inCombo && !taunting ? x + (actionFrameCounter % 2 === 0 ? 1.2 : -1.2) : x;
  const facingRight = effectiveDir >= 0;
  if (taunting) {
    const spinAngle = actionFrameCounter * 0.125 * (facingRight ? 1 : -1);
    ctx.translate(posX, centerY);
    ctx.rotate(spinAngle);
    ctx.translate(-posX, -centerY);
  }

  const isMountainTheme = backgroundTheme === "mountain";
  const isAutumnTheme = backgroundTheme === "autumn";
  const baseArmorOrange = isMountainTheme
    ? "#ec4899"
    : isAutumnTheme
      ? "#f59e0b"
      : "#ea580c";
  const baseArmorRed = isMountainTheme
    ? "#db2777"
    : isAutumnTheme
      ? "#dc2626"
      : "#c2410c";
  const basePauldronYellow = isMountainTheme
    ? "#818cf8"
    : isAutumnTheme
      ? "#fbbf24"
      : "#eab308";
  const baseVisorGreen = isMountainTheme
    ? "#38bdf8"
    : isAutumnTheme
      ? "#10b981"
      : "#22c55e";
  const baseCannonGreen = isMountainTheme
    ? "#22d3ee"
    : isAutumnTheme
      ? "#059669"
      : "#15803d";
  const baseOutline = isMountainTheme
    ? "rgba(15, 23, 42, 0.85)"
    : isAutumnTheme
      ? "rgba(41, 37, 36, 0.85)"
      : "rgba(0, 0, 0, 0.6)";

  let armorOrange = resolveColor(baseArmorOrange, isOpponent);
  let armorRed = resolveColor(baseArmorRed, isOpponent);
  let pauldronYellow = resolveColor(basePauldronYellow, isOpponent);
  let visorGreen = resolveColor(baseVisorGreen, isOpponent);
  let cannonGreen = resolveColor(baseCannonGreen, isOpponent);
  const outlineColor = resolveColor(baseOutline, isOpponent);
  const outlineWidth = 1.2;

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    armorOrange = resolveColor(`hsl(${hue}, 90%, 55%)`, isOpponent);
    pauldronYellow = resolveColor(
      `hsl(${(hue + 60) % 360}, 95%, 55%)`,
      isOpponent,
    );
    visorGreen = resolveColor(
      `hsl(${(hue + 180) % 360}, 90%, 55%)`,
      isOpponent,
    );
  } else if (isRoll) {
    armorOrange = resolveColor(baseArmorOrange, isOpponent, 0.45);
    armorRed = resolveColor(baseArmorRed, isOpponent, 0.45);
    pauldronYellow = resolveColor(basePauldronYellow, isOpponent, 0.45);
    visorGreen = resolveColor(baseVisorGreen, isOpponent, 0.45);
    cannonGreen = resolveColor(baseCannonGreen, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Armored Power Boots & Legs
  ctx.beginPath();
  ctx.moveTo(posX - 0.42 * dir * w, y - 0.22 * h);
  ctx.lineTo(posX - 0.16 * dir * w, y - 0.22 * h);
  ctx.lineTo(posX - 0.16 * dir * w, y);
  ctx.lineTo(posX - 0.42 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = armorOrange;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX + 0.18 * dir * w, y - 0.22 * h);
  ctx.lineTo(posX + 0.5 * dir * w, y - 0.22 * h);
  ctx.lineTo(posX + 0.5 * dir * w, y);
  ctx.lineTo(posX + 0.18 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = armorOrange;
  ctx.fill();
  ctx.stroke();

  // Red/Orange Leg Armor & Pelvis
  ctx.beginPath();
  ctx.moveTo(posX - 0.32 * dir * w, y - 0.45 * h);
  ctx.lineTo(posX + 0.32 * dir * w, y - 0.45 * h);
  ctx.lineTo(posX + 0.32 * dir * w, y - 0.22 * h);
  ctx.lineTo(posX - 0.32 * dir * w, y - 0.22 * h);
  ctx.closePath();
  ctx.fillStyle = pauldronYellow;
  ctx.fill();
  ctx.stroke();

  // Red Chest Armor Plate
  ctx.beginPath();
  ctx.moveTo(posX - 0.32 * dir * w, y - 0.75 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y - 0.75 * h);
  ctx.lineTo(posX + 0.28 * dir * w, y - 0.45 * h);
  ctx.lineTo(posX - 0.28 * dir * w, y - 0.45 * h);
  ctx.closePath();
  ctx.fillStyle = armorRed;
  ctx.fill();
  ctx.stroke();

  // Green Chest Gem
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.08 * dir * w,
    y - 0.62 * h,
    Math.max(0.1, 0.09 * w),
    Math.max(0.1, 0.09 * w),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = visorGreen;
  ctx.fill();

  // Back Pauldron
  ctx.beginPath();
  ctx.ellipse(
    posX - 0.35 * dir * w,
    y - 0.75 * h,
    Math.max(0.1, 0.26 * w),
    Math.max(0.1, 0.26 * w),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = pauldronYellow;
  ctx.fill();
  ctx.stroke();

  // Helmet & Glowing Green T-Visor
  ctx.beginPath();
  ctx.moveTo(posX - 0.18 * dir * w, y - 0.78 * h);
  ctx.lineTo(posX - 0.22 * dir * w, y - 0.98 * h);
  ctx.lineTo(posX + 0.1 * dir * w, y - 1.05 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y - 0.92 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.76 * h);
  ctx.closePath();
  ctx.fillStyle = armorRed;
  ctx.fill();
  ctx.stroke();

  // Green T-Visor
  if (Math.abs(dir) > 0.15) {
    ctx.beginPath();
    ctx.moveTo(posX + 0.12 * dir * w, y - 0.9 * h);
    ctx.lineTo(posX + 0.35 * dir * w, y - 0.9 * h);
    ctx.lineTo(posX + 0.28 * dir * w, y - 0.82 * h);
    ctx.lineTo(posX + 0.2 * dir * w, y - 0.82 * h);
    ctx.closePath();
    ctx.fillStyle = visorGreen;
    ctx.fill();
    ctx.stroke();
  }

  // Massive Front Shoulder Pauldron
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.32 * dir * w,
    y - 0.75 * h,
    Math.max(0.1, 0.32 * w),
    Math.max(0.1, 0.32 * w),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = pauldronYellow;
  ctx.fill();
  ctx.stroke();

  // Green Arm Cannon
  ctx.beginPath();
  ctx.moveTo(posX + 0.42 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.92 * dir * w, y - 0.52 * h);
  ctx.lineTo(posX + 0.82 * dir * w, y - 0.38 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y - 0.48 * h);
  ctx.closePath();
  ctx.fillStyle = cannonGreen;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    posX + 0.87 * dir * w,
    y - 0.45 * h,
    Math.max(0.1, 0.08 * w),
    Math.max(0.1, 0.12 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = visorGreen;
  ctx.fill();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}
