import type { BackgroundTheme, CharacterAnimState } from "../common.js";
import { drawCharacterStateAuras, resolveColor } from "../common.js";

export function drawNessPolygons(
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
  const baseCapRed = isMountainTheme
    ? "#ec4899"
    : isAutumnTheme
      ? "#dc2626"
      : "#dc2626";
  const baseBrimBlue = isMountainTheme
    ? "#38bdf8"
    : isAutumnTheme
      ? "#292524"
      : "#2563eb";
  const baseStripeYellow = isMountainTheme
    ? "#ec4899"
    : isAutumnTheme
      ? "#f59e0b"
      : "#facc15";
  const baseStripeBlue = isMountainTheme
    ? "#38bdf8"
    : isAutumnTheme
      ? "#991b1b"
      : "#1e3a8a";
  const baseBackpackBrown = isMountainTheme
    ? "#818cf8"
    : isAutumnTheme
      ? "#d97706"
      : "#92400e";
  const baseSkin = isMountainTheme
    ? "#fce7f3"
    : isAutumnTheme
      ? "#fed7aa"
      : "#fed7aa";
  const baseWhite = isMountainTheme
    ? "#fdf4ff"
    : isAutumnTheme
      ? "#fffbeb"
      : "#f8fafc";
  const baseOutline = isMountainTheme
    ? "rgba(15, 23, 42, 0.85)"
    : isAutumnTheme
      ? "rgba(41, 37, 36, 0.85)"
      : "rgba(0, 0, 0, 0.6)";

  let capRed = resolveColor(baseCapRed, isOpponent);
  let brimBlue = resolveColor(baseBrimBlue, isOpponent);
  let stripeYellow = resolveColor(baseStripeYellow, isOpponent);
  let stripeBlue = resolveColor(baseStripeBlue, isOpponent);
  let backpackBrown = resolveColor(baseBackpackBrown, isOpponent);
  let skinColor = resolveColor(baseSkin, isOpponent);
  let whiteColor = resolveColor(baseWhite, isOpponent);
  const outlineColor = resolveColor(baseOutline, isOpponent);
  const outlineWidth = 1.2;

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    capRed = resolveColor(`hsl(${hue}, 85%, 55%)`, isOpponent);
    stripeYellow = resolveColor(
      `hsl(${(hue + 60) % 360}, 90%, 55%)`,
      isOpponent,
    );
  } else if (isRoll) {
    capRed = resolveColor(baseCapRed, isOpponent, 0.45);
    brimBlue = resolveColor(baseBrimBlue, isOpponent, 0.45);
    stripeYellow = resolveColor(baseStripeYellow, isOpponent, 0.45);
    stripeBlue = resolveColor(baseStripeBlue, isOpponent, 0.45);
    backpackBrown = resolveColor(baseBackpackBrown, isOpponent, 0.45);
    skinColor = resolveColor(baseSkin, isOpponent, 0.45);
    whiteColor = resolveColor(baseWhite, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Backpack (Background)
  ctx.beginPath();
  ctx.moveTo(posX - 0.55 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX - 0.27 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX - 0.27 * dir * w, y - 0.36 * h);
  ctx.lineTo(posX - 0.55 * dir * w, y - 0.36 * h);
  ctx.closePath();
  ctx.fillStyle = backpackBrown;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  // Red Sneakers & White Socks
  ctx.beginPath();
  ctx.moveTo(posX - 0.36 * dir * w, y - 0.18 * h);
  ctx.lineTo(posX - 0.14 * dir * w, y - 0.18 * h);
  ctx.lineTo(posX - 0.14 * dir * w, y - 0.1 * h);
  ctx.lineTo(posX - 0.36 * dir * w, y - 0.1 * h);
  ctx.closePath();
  ctx.fillStyle = whiteColor;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX + 0.24 * dir * w, y - 0.18 * h);
  ctx.lineTo(posX + 0.46 * dir * w, y - 0.18 * h);
  ctx.lineTo(posX + 0.46 * dir * w, y - 0.1 * h);
  ctx.lineTo(posX + 0.24 * dir * w, y - 0.1 * h);
  ctx.closePath();
  ctx.fillStyle = whiteColor;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(
    posX - 0.32 * dir * w,
    y - 0.08 * h,
    Math.max(0.1, 0.25 * w),
    Math.max(0.1, 0.12 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = capRed;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    posX + 0.35 * dir * w,
    y - 0.08 * h,
    Math.max(0.1, 0.28 * w),
    Math.max(0.1, 0.12 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = capRed;
  ctx.fill();
  ctx.stroke();

  // Blue Shorts
  ctx.beginPath();
  ctx.moveTo(posX - 0.32 * dir * w, y - 0.38 * h);
  ctx.lineTo(posX + 0.32 * dir * w, y - 0.38 * h);
  ctx.lineTo(posX + 0.32 * dir * w, y - 0.18 * h);
  ctx.lineTo(posX - 0.32 * dir * w, y - 0.18 * h);
  ctx.closePath();
  ctx.fillStyle = stripeBlue;
  ctx.fill();
  ctx.stroke();

  // Striped Shirt Torso
  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.38 * h);
  ctx.lineTo(posX - 0.35 * dir * w, y - 0.38 * h);
  ctx.closePath();
  ctx.fillStyle = stripeYellow;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.58 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.58 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.48 * h);
  ctx.lineTo(posX - 0.35 * dir * w, y - 0.48 * h);
  ctx.closePath();
  ctx.fillStyle = stripeBlue;
  ctx.fill();

  // Head, Face & Baseball Cap
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.12 * dir * w,
    y - 0.78 * h,
    Math.max(0.1, 0.35 * w),
    Math.max(0.1, 0.22 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = skinColor;
  ctx.fill();

  // Eye & Smile
  if (Math.abs(dir) > 0.15) {
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.32 * dir * w,
      y - 0.78 * h,
      Math.max(0.1, 0.06 * w),
      Math.max(0.1, 0.09 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = resolveColor("#18181b", isOpponent);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
      posX + 0.28 * dir * w,
      y - 0.68 * h,
      Math.max(0.1, 0.08 * w),
      0,
      Math.PI,
    );
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Red Cap Dome & Blue Visor Brim
  ctx.beginPath();
  ctx.moveTo(posX - 0.28 * dir * w, y - 0.82 * h);
  ctx.lineTo(posX - 0.3 * dir * w, y - 1.05 * h);
  ctx.lineTo(posX + 0.15 * dir * w, y - 1.08 * h);
  ctx.lineTo(posX + 0.45 * dir * w, y - 0.94 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.86 * h);
  ctx.closePath();
  ctx.fillStyle = capRed;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX + 0.18 * dir * w, y - 0.9 * h);
  ctx.lineTo(posX + 0.72 * dir * w, y - 0.86 * h);
  ctx.lineTo(posX + 0.45 * dir * w, y - 0.82 * h);
  ctx.closePath();
  ctx.fillStyle = brimBlue;
  ctx.fill();
  ctx.stroke();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}

/**
 * 12. SAMUS: Varia Suit power armor, red/orange helmet with green T-visor, massive yellow sphere pauldrons, arm cannon.
 */
