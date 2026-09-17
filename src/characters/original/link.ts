import type { BackgroundTheme, CharacterAnimState } from "../common.js";
import { drawCharacterStateAuras, resolveColor } from "../common.js";

export function drawLinkPolygons(
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
  const baseTunic = isMountainTheme
    ? "#6366f1"
    : isAutumnTheme
      ? "#dc2626"
      : "#16a34a";
  const baseHair = isMountainTheme
    ? "#fde047"
    : isAutumnTheme
      ? "#fbbf24"
      : "#facc15";
  const baseSkin = isMountainTheme
    ? "#fce7f3"
    : isAutumnTheme
      ? "#fed7aa"
      : "#fed7aa";
  const baseLeather = isMountainTheme
    ? "#3b0764"
    : isAutumnTheme
      ? "#451a03"
      : "#78350f";
  const baseShield = isMountainTheme
    ? "#38bdf8"
    : isAutumnTheme
      ? "#1c1917"
      : "#1e3a8a";
  const baseShieldSilver = isMountainTheme
    ? "#f1f5f9"
    : isAutumnTheme
      ? "#f59e0b"
      : "#cbd5e1";
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

  let tunicGreen = resolveColor(baseTunic, isOpponent);
  let blondeHair = resolveColor(baseHair, isOpponent);
  let skinColor = resolveColor(baseSkin, isOpponent);
  let leatherBrown = resolveColor(baseLeather, isOpponent);
  let shieldBlue = resolveColor(baseShield, isOpponent);
  let shieldSilver = resolveColor(baseShieldSilver, isOpponent);
  let whiteColor = resolveColor(baseWhite, isOpponent);
  const outlineColor = resolveColor(baseOutline, isOpponent);
  const outlineWidth = 1.2;

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    tunicGreen = resolveColor(`hsl(${hue}, 85%, 45%)`, isOpponent);
    shieldBlue = resolveColor(
      `hsl(${(hue + 180) % 360}, 80%, 45%)`,
      isOpponent,
    );
  } else if (isRoll) {
    tunicGreen = resolveColor(baseTunic, isOpponent, 0.45);
    blondeHair = resolveColor(baseHair, isOpponent, 0.45);
    skinColor = resolveColor(baseSkin, isOpponent, 0.45);
    leatherBrown = resolveColor(baseLeather, isOpponent, 0.45);
    shieldBlue = resolveColor(baseShield, isOpponent, 0.45);
    shieldSilver = resolveColor(baseShieldSilver, isOpponent, 0.45);
    whiteColor = resolveColor(baseWhite, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Hylian Shield on Back
  ctx.beginPath();
  ctx.moveTo(posX - 0.25 * dir * w, y - 0.78 * h);
  ctx.lineTo(posX - 0.65 * dir * w, y - 0.78 * h);
  ctx.lineTo(posX - 0.55 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX - 0.22 * dir * w, y - 0.45 * h);
  ctx.closePath();
  ctx.fillStyle = shieldBlue;
  ctx.fill();
  ctx.strokeStyle = shieldSilver;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Floppy Green Cap (Trailing)
  ctx.beginPath();
  ctx.moveTo(posX - 0.15 * dir * w, y - 0.88 * h);
  ctx.lineTo(posX - 0.95 * dir * w, y - 0.85 * h);
  ctx.lineTo(posX - 0.22 * dir * w, y - 1.05 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.98 * h);
  ctx.closePath();
  ctx.fillStyle = tunicGreen;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  // Legs, Boots, Tights
  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.2 * h);
  ctx.lineTo(posX - 0.35 * dir * w, y - 0.2 * h);
  ctx.closePath();
  ctx.fillStyle = whiteColor;
  ctx.fill();
  ctx.stroke();

  // Back boot
  ctx.beginPath();
  ctx.moveTo(posX - 0.4 * dir * w, y - 0.2 * h);
  ctx.lineTo(posX - 0.1 * dir * w, y - 0.2 * h);
  ctx.lineTo(posX - 0.1 * dir * w, y);
  ctx.lineTo(posX - 0.4 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = leatherBrown;
  ctx.fill();
  ctx.stroke();

  // Front boot
  ctx.beginPath();
  ctx.moveTo(posX + 0.15 * dir * w, y - 0.2 * h);
  ctx.lineTo(posX + 0.47 * dir * w, y - 0.2 * h);
  ctx.lineTo(posX + 0.47 * dir * w, y);
  ctx.lineTo(posX + 0.15 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = leatherBrown;
  ctx.fill();
  ctx.stroke();

  // Green Tunic Torso & Belt
  ctx.beginPath();
  ctx.moveTo(posX - 0.3 * dir * w, y - 0.75 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.75 * h);
  ctx.lineTo(posX + 0.45 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX - 0.35 * dir * w, y - 0.42 * h);
  ctx.closePath();
  ctx.fillStyle = tunicGreen;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.48 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y - 0.48 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX - 0.35 * dir * w, y - 0.42 * h);
  ctx.closePath();
  ctx.fillStyle = leatherBrown;
  ctx.fill();

  // Head, Blonde Hair, Pointed Ear
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.15 * dir * w,
    y - 0.78 * h,
    Math.max(0.1, 0.28 * w),
    Math.max(0.1, 0.18 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = skinColor;
  ctx.fill();

  // Pointed Elf Ear
  ctx.beginPath();
  ctx.moveTo(posX - 0.05 * dir * w, y - 0.8 * h);
  ctx.lineTo(posX - 0.35 * dir * w, y - 0.86 * h);
  ctx.lineTo(posX - 0.08 * dir * w, y - 0.74 * h);
  ctx.closePath();
  ctx.fillStyle = skinColor;
  ctx.fill();
  ctx.stroke();

  // Blonde Hair Bangs
  ctx.beginPath();
  ctx.moveTo(posX - 0.05 * dir * w, y - 0.9 * h);
  ctx.lineTo(posX + 0.45 * dir * w, y - 0.88 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y - 0.76 * h);
  ctx.lineTo(posX + 0.12 * dir * w, y - 0.8 * h);
  ctx.closePath();
  ctx.fillStyle = blondeHair;
  ctx.fill();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}

/**
 * 11. NESS: Red baseball cap with blue brim, yellow/blue striped shirt, blue shorts, red sneakers, backpack.
 */
