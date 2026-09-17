import type { BackgroundTheme, CharacterAnimState } from "../common.js";
import { drawCharacterStateAuras, resolveColor } from "../common.js";

export function drawLuigiPolygons(
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
  const baseGreen = isMountainTheme
    ? "#2dd4bf"
    : isAutumnTheme
      ? "#15803d"
      : "#16a34a";
  const baseNavy = isMountainTheme
    ? "#3730a3"
    : isAutumnTheme
      ? "#292524"
      : "#1e3a8a";
  const baseGold = isMountainTheme
    ? "#ec4899"
    : isAutumnTheme
      ? "#f59e0b"
      : "#facc15";
  const baseWhite = isMountainTheme
    ? "#fdf4ff"
    : isAutumnTheme
      ? "#fffbeb"
      : "#f8fafc";
  const baseSkin = isMountainTheme
    ? "#fce7f3"
    : isAutumnTheme
      ? "#fed7aa"
      : "#fed7aa";
  const baseBrown = isMountainTheme
    ? "#311042"
    : isAutumnTheme
      ? "#78350f"
      : "#78350f";
  const baseHair = isMountainTheme
    ? "#1e1b4b"
    : isAutumnTheme
      ? "#1c1917"
      : "#1c1917";
  const baseOutline = isMountainTheme
    ? "rgba(15, 23, 42, 0.85)"
    : isAutumnTheme
      ? "rgba(41, 37, 36, 0.85)"
      : "rgba(0, 0, 0, 0.6)";

  let greenColor = resolveColor(baseGreen, isOpponent);
  let navyColor = resolveColor(baseNavy, isOpponent);
  let goldColor = resolveColor(baseGold, isOpponent);
  let whiteColor = resolveColor(baseWhite, isOpponent);
  let skinColor = resolveColor(baseSkin, isOpponent);
  let brownColor = resolveColor(baseBrown, isOpponent);
  let hairColor = resolveColor(baseHair, isOpponent);
  const outlineColor = resolveColor(baseOutline, isOpponent);
  const outlineWidth = 1.2;

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    greenColor = resolveColor(`hsl(${hue}, 85%, 45%)`, isOpponent);
    navyColor = resolveColor(`hsl(${(hue + 180) % 360}, 80%, 40%)`, isOpponent);
  } else if (isRoll) {
    greenColor = resolveColor(baseGreen, isOpponent, 0.45);
    navyColor = resolveColor(baseNavy, isOpponent, 0.45);
    goldColor = resolveColor(baseGold, isOpponent, 0.45);
    whiteColor = resolveColor(baseWhite, isOpponent, 0.45);
    skinColor = resolveColor(baseSkin, isOpponent, 0.45);
    brownColor = resolveColor(baseBrown, isOpponent, 0.45);
    hairColor = resolveColor(baseHair, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Back Shoe & Leg
  ctx.beginPath();
  ctx.ellipse(
    posX - 0.32 * dir * w,
    y - 0.08 * h,
    Math.max(0.1, 0.22 * w),
    Math.max(0.1, 0.11 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = brownColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX - 0.12 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX - 0.4 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX - 0.42 * dir * w, y - 0.15 * h);
  ctx.lineTo(posX - 0.18 * dir * w, y - 0.15 * h);
  ctx.closePath();
  ctx.fillStyle = navyColor;
  ctx.fill();
  ctx.stroke();

  // Front Shoe & Leg
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.35 * dir * w,
    y - 0.08 * h,
    Math.max(0.1, 0.25 * w),
    Math.max(0.1, 0.11 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = brownColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX - 0.05 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX + 0.42 * dir * w, y - 0.15 * h);
  ctx.lineTo(posX + 0.16 * dir * w, y - 0.15 * h);
  ctx.closePath();
  ctx.fillStyle = navyColor;
  ctx.fill();
  ctx.stroke();

  // Overalls Torso & Green Shirt
  ctx.beginPath();
  ctx.moveTo(posX - 0.3 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.4 * h);
  ctx.lineTo(posX - 0.3 * dir * w, y - 0.4 * h);
  ctx.closePath();
  ctx.fillStyle = greenColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX - 0.24 * dir * w, y - 0.64 * h);
  ctx.lineTo(posX + 0.24 * dir * w, y - 0.64 * h);
  ctx.lineTo(posX + 0.28 * dir * w, y - 0.4 * h);
  ctx.lineTo(posX - 0.28 * dir * w, y - 0.4 * h);
  ctx.closePath();
  ctx.fillStyle = navyColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    posX + 0.15 * dir * w,
    y - 0.58 * h,
    Math.max(0.1, 0.07 * w),
    Math.max(0.1, 0.07 * w),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = goldColor;
  ctx.fill();

  // Arms & Gloves
  ctx.beginPath();
  ctx.ellipse(
    posX - 0.42 * dir * w,
    y - 0.5 * h,
    Math.max(0.1, 0.15 * w),
    Math.max(0.1, 0.15 * w),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = whiteColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    posX + 0.48 * dir * w,
    y - 0.5 * h,
    Math.max(0.1, 0.16 * w),
    Math.max(0.1, 0.16 * w),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = whiteColor;
  ctx.fill();
  ctx.stroke();

  // Head, Face & Cap
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.1 * dir * w,
    y - 0.78 * h,
    Math.max(0.1, 0.3 * w),
    Math.max(0.1, 0.22 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = skinColor;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(
    posX + 0.42 * dir * w,
    y - 0.76 * h,
    Math.max(0.1, 0.16 * w),
    Math.max(0.1, 0.13 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = skinColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX + 0.15 * dir * w, y - 0.7 * h);
  ctx.quadraticCurveTo(
    posX + 0.35 * dir * w,
    y - 0.65 * h,
    posX + 0.6 * dir * w,
    y - 0.7 * h,
  );
  ctx.lineTo(posX + 0.55 * dir * w, y - 0.64 * h);
  ctx.closePath();
  ctx.fillStyle = hairColor;
  ctx.fill();

  if (Math.abs(dir) > 0.15) {
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.25 * dir * w,
      y - 0.82 * h,
      Math.max(0.1, 0.07 * w),
      Math.max(0.1, 0.11 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = navyColor;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(
      posX + (0.25 + 0.02 * dir) * w,
      y - 0.84 * h,
      Math.max(0.1, 0.03 * w),
      Math.max(0.1, 0.04 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = resolveColor("#ffffff", isOpponent);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.moveTo(posX - 0.25 * dir * w, y - 0.82 * h);
  ctx.lineTo(posX - 0.28 * dir * w, y - 1.04 * h);
  ctx.lineTo(posX + 0.12 * dir * w, y - 1.08 * h);
  ctx.lineTo(posX + 0.48 * dir * w, y - 0.94 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.87 * h);
  ctx.closePath();
  ctx.fillStyle = greenColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX + 0.15 * dir * w, y - 0.9 * h);
  ctx.lineTo(posX + 0.68 * dir * w, y - 0.86 * h);
  ctx.lineTo(posX + 0.48 * dir * w, y - 0.82 * h);
  ctx.closePath();
  ctx.fillStyle = greenColor;
  ctx.fill();
  ctx.stroke();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}

/**
 * 5. KIRBY: Round pink ball body, oversized red feet, blue eyes, rosy cheeks, stubby arms.
 */
