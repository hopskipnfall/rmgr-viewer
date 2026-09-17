import type { BackgroundTheme, CharacterAnimState } from "../common.js";
import { drawCharacterStateAuras, resolveColor } from "../common.js";

export function drawMarioPolygons(
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
  const baseRed = isMountainTheme
    ? "#f43f5e"
    : isAutumnTheme
      ? "#dc2626"
      : "#dc2626";
  const baseBlue = isMountainTheme
    ? "#4f46e5"
    : isAutumnTheme
      ? "#292524"
      : "#2563eb";
  const baseGold = isMountainTheme
    ? "#38bdf8"
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

  let redColor = resolveColor(baseRed, isOpponent);
  let blueColor = resolveColor(baseBlue, isOpponent);
  let goldColor = resolveColor(baseGold, isOpponent);
  let whiteColor = resolveColor(baseWhite, isOpponent);
  let skinColor = resolveColor(baseSkin, isOpponent);
  let brownColor = resolveColor(baseBrown, isOpponent);
  let hairColor = resolveColor(baseHair, isOpponent);
  const outlineColor = resolveColor(baseOutline, isOpponent);
  const outlineWidth = 1.2;

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    redColor = resolveColor(`hsl(${hue}, 85%, 50%)`, isOpponent);
    blueColor = resolveColor(`hsl(${(hue + 180) % 360}, 80%, 45%)`, isOpponent);
  } else if (isRoll) {
    redColor = resolveColor(baseRed, isOpponent, 0.45);
    blueColor = resolveColor(baseBlue, isOpponent, 0.45);
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
    posX - 0.35 * dir * w,
    y - 0.08 * h,
    Math.max(0.1, 0.25 * w),
    Math.max(0.1, 0.12 * h),
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
  ctx.moveTo(posX - 0.15 * dir * w, y - 0.4 * h);
  ctx.lineTo(posX - 0.45 * dir * w, y - 0.4 * h);
  ctx.lineTo(posX - 0.48 * dir * w, y - 0.15 * h);
  ctx.lineTo(posX - 0.22 * dir * w, y - 0.15 * h);
  ctx.closePath();
  ctx.fillStyle = blueColor;
  ctx.fill();
  ctx.stroke();

  // Front Shoe & Leg
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.38 * dir * w,
    y - 0.08 * h,
    Math.max(0.1, 0.28 * w),
    Math.max(0.1, 0.12 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = brownColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX - 0.05 * dir * w, y - 0.4 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.4 * h);
  ctx.lineTo(posX + 0.48 * dir * w, y - 0.15 * h);
  ctx.lineTo(posX + 0.18 * dir * w, y - 0.15 * h);
  ctx.closePath();
  ctx.fillStyle = blueColor;
  ctx.fill();
  ctx.stroke();

  // Overalls Torso & Red Shirt
  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.38 * h);
  ctx.lineTo(posX - 0.35 * dir * w, y - 0.38 * h);
  ctx.closePath();
  ctx.fillStyle = redColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX - 0.28 * dir * w, y - 0.62 * h);
  ctx.lineTo(posX + 0.28 * dir * w, y - 0.62 * h);
  ctx.lineTo(posX + 0.32 * dir * w, y - 0.38 * h);
  ctx.lineTo(posX - 0.32 * dir * w, y - 0.38 * h);
  ctx.closePath();
  ctx.fillStyle = blueColor;
  ctx.fill();
  ctx.stroke();

  // Yellow Button on Overalls
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.18 * dir * w,
    y - 0.55 * h,
    Math.max(0.1, 0.08 * w),
    Math.max(0.1, 0.08 * w),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = goldColor;
  ctx.fill();

  // Arms & White Gloves
  ctx.beginPath();
  ctx.ellipse(
    posX - 0.45 * dir * w,
    y - 0.48 * h,
    Math.max(0.1, 0.16 * w),
    Math.max(0.1, 0.16 * w),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = whiteColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    posX + 0.52 * dir * w,
    y - 0.48 * h,
    Math.max(0.1, 0.18 * w),
    Math.max(0.1, 0.18 * w),
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
    posX + 0.12 * dir * w,
    y - 0.76 * h,
    Math.max(0.1, 0.35 * w),
    Math.max(0.1, 0.22 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = skinColor;
  ctx.fill();

  // Big Mario Nose
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.46 * dir * w,
    y - 0.74 * h,
    Math.max(0.1, 0.18 * w),
    Math.max(0.1, 0.14 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = skinColor;
  ctx.fill();
  ctx.stroke();

  // Mustache
  ctx.beginPath();
  ctx.moveTo(posX + 0.18 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.62 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.68 * dir * w, y - 0.62 * h);
  ctx.lineTo(posX + 0.32 * dir * w, y - 0.62 * h);
  ctx.closePath();
  ctx.fillStyle = hairColor;
  ctx.fill();

  // Eye
  if (Math.abs(dir) > 0.15) {
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.28 * dir * w,
      y - 0.8 * h,
      Math.max(0.1, 0.08 * w),
      Math.max(0.1, 0.12 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = blueColor;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(
      posX + (0.28 + 0.03 * dir) * w,
      y - 0.82 * h,
      Math.max(0.1, 0.03 * w),
      Math.max(0.1, 0.04 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = resolveColor("#ffffff", isOpponent);
    ctx.fill();
  }

  // Red Cap Dome & Visor
  ctx.beginPath();
  ctx.moveTo(posX - 0.28 * dir * w, y - 0.8 * h);
  ctx.lineTo(posX - 0.32 * dir * w, y - 1.0 * h);
  ctx.lineTo(posX + 0.15 * dir * w, y - 1.05 * h);
  ctx.lineTo(posX + 0.52 * dir * w, y - 0.92 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.85 * h);
  ctx.closePath();
  ctx.fillStyle = redColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX + 0.18 * dir * w, y - 0.88 * h);
  ctx.lineTo(posX + 0.72 * dir * w, y - 0.84 * h);
  ctx.lineTo(posX + 0.52 * dir * w, y - 0.8 * h);
  ctx.closePath();
  ctx.fillStyle = redColor;
  ctx.fill();
  ctx.stroke();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}

/**
 * 4. LUIGI: Green cap with brim, navy overalls with yellow buttons, green shirt, wavy mustache.
 */
