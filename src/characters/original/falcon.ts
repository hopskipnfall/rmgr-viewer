import type { BackgroundTheme, CharacterAnimState } from "../common.js";
import { drawCharacterStateAuras, resolveColor } from "../common.js";

export function drawFalconPolygons(
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
  const baseSuit = isMountainTheme
    ? "#4338ca"
    : isAutumnTheme
      ? "#4a044e"
      : "#1e293b";
  const baseGold = isMountainTheme
    ? "#38bdf8"
    : isAutumnTheme
      ? "#f59e0b"
      : "#fbbf24";
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
  const baseHelmet = isMountainTheme
    ? "#312e81"
    : isAutumnTheme
      ? "#991b1b"
      : "#1e3a8a";
  const baseScarf = isMountainTheme
    ? "#ec4899"
    : isAutumnTheme
      ? "#f97316"
      : "#fbbf24";
  const baseOutline = isMountainTheme
    ? "rgba(15, 23, 42, 0.85)"
    : isAutumnTheme
      ? "rgba(41, 37, 36, 0.85)"
      : "rgba(0, 0, 0, 0.6)";

  let suitColor = resolveColor(baseSuit, isOpponent);
  let goldColor = resolveColor(baseGold, isOpponent);
  let whiteColor = resolveColor(baseWhite, isOpponent);
  let skinColor = resolveColor(baseSkin, isOpponent);
  let helmetColor = resolveColor(baseHelmet, isOpponent);
  let scarfColor = resolveColor(baseScarf, isOpponent);
  const outlineColor = resolveColor(baseOutline, isOpponent);
  const outlineWidth = 1.2;

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    suitColor = resolveColor(`hsl(${hue}, 80%, 45%)`, isOpponent);
    goldColor = resolveColor(`hsl(${(hue + 60) % 360}, 90%, 55%)`, isOpponent);
    helmetColor = resolveColor(
      `hsl(${(hue + 20) % 360}, 85%, 40%)`,
      isOpponent,
    );
    scarfColor = resolveColor(`hsl(${(hue + 60) % 360}, 90%, 55%)`, isOpponent);
  } else if (isRoll) {
    suitColor = resolveColor(baseSuit, isOpponent, 0.45);
    goldColor = resolveColor(baseGold, isOpponent, 0.45);
    whiteColor = resolveColor(baseWhite, isOpponent, 0.45);
    skinColor = resolveColor(baseSkin, isOpponent, 0.45);
    helmetColor = resolveColor(baseHelmet, isOpponent, 0.45);
    scarfColor = resolveColor(baseScarf, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Scarf
  ctx.beginPath();
  ctx.moveTo(posX - 0.12 * dir * w, y - 0.74 * h);
  ctx.lineTo(posX - 0.55 * dir * w, y - 0.78 * h);
  ctx.lineTo(posX - 1.05 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX - 0.85 * dir * w, y - 0.75 * h);
  ctx.lineTo(posX - 1.15 * dir * w, y - 0.82 * h);
  ctx.lineTo(posX - 0.5 * dir * w, y - 0.84 * h);
  ctx.lineTo(posX - 0.08 * dir * w, y - 0.8 * h);
  ctx.closePath();
  ctx.fillStyle = scarfColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  // Back Leg & Boot
  ctx.beginPath();
  ctx.moveTo(posX - 0.18 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX - 0.42 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX - 0.48 * dir * w, y - 0.22 * h);
  ctx.lineTo(posX - 0.28 * dir * w, y - 0.22 * h);
  ctx.closePath();
  ctx.fillStyle = suitColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX - 0.49 * dir * w, y - 0.23 * h);
  ctx.lineTo(posX - 0.27 * dir * w, y - 0.23 * h);
  ctx.lineTo(posX - 0.29 * dir * w, y - 0.17 * h);
  ctx.lineTo(posX - 0.47 * dir * w, y - 0.17 * h);
  ctx.closePath();
  ctx.fillStyle = goldColor;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX - 0.47 * dir * w, y - 0.17 * h);
  ctx.lineTo(posX - 0.29 * dir * w, y - 0.17 * h);
  ctx.lineTo(posX - 0.22 * dir * w, y);
  ctx.lineTo(posX - 0.55 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = whiteColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  // Front Leg & Boot
  ctx.beginPath();
  ctx.moveTo(posX - 0.05 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y - 0.22 * h);
  ctx.lineTo(posX + 0.16 * dir * w, y - 0.22 * h);
  ctx.closePath();
  ctx.fillStyle = suitColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX + 0.15 * dir * w, y - 0.23 * h);
  ctx.lineTo(posX + 0.39 * dir * w, y - 0.23 * h);
  ctx.lineTo(posX + 0.42 * dir * w, y - 0.17 * h);
  ctx.lineTo(posX + 0.18 * dir * w, y - 0.17 * h);
  ctx.closePath();
  ctx.fillStyle = goldColor;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX + 0.18 * dir * w, y - 0.17 * h);
  ctx.lineTo(posX + 0.42 * dir * w, y - 0.17 * h);
  ctx.lineTo(posX + 0.65 * dir * w, y);
  ctx.lineTo(posX + 0.28 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = whiteColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  // Torso & Belt
  ctx.beginPath();
  ctx.moveTo(posX - 0.32 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX - 0.38 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX - 0.18 * dir * w, y - 0.78 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.78 * h);
  ctx.lineTo(posX + 0.46 * dir * w, y - 0.66 * h);
  ctx.lineTo(posX + 0.26 * dir * w, y - 0.42 * h);
  ctx.closePath();
  ctx.fillStyle = suitColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX - 0.34 * dir * w, y - 0.43 * h);
  ctx.lineTo(posX + 0.28 * dir * w, y - 0.43 * h);
  ctx.lineTo(posX + 0.26 * dir * w, y - 0.38 * h);
  ctx.lineTo(posX - 0.32 * dir * w, y - 0.38 * h);
  ctx.closePath();
  ctx.fillStyle = goldColor;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX - 0.12 * dir * w, y - 0.76 * h);
  ctx.lineTo(posX - 0.02 * dir * w, y - 0.77 * h);
  ctx.lineTo(posX + 0.24 * dir * w, y - 0.46 * h);
  ctx.lineTo(posX + 0.16 * dir * w, y - 0.45 * h);
  ctx.closePath();
  ctx.fillStyle = whiteColor;
  ctx.fill();

  // Shoulder Pauldron
  ctx.beginPath();
  ctx.moveTo(posX + 0.12 * dir * w, y - 0.78 * h);
  ctx.lineTo(posX + 0.54 * dir * w, y - 0.75 * h);
  ctx.lineTo(posX + 0.46 * dir * w, y - 0.62 * h);
  ctx.lineTo(posX + 0.16 * dir * w, y - 0.65 * h);
  ctx.closePath();
  ctx.fillStyle = goldColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  // Arms & Gloves
  ctx.beginPath();
  ctx.moveTo(posX + 0.44 * dir * w, y - 0.64 * h);
  ctx.lineTo(posX + 0.72 * dir * w, y - 0.56 * h);
  ctx.lineTo(posX + 0.88 * dir * w, y - 0.48 * h);
  ctx.lineTo(posX + 0.74 * dir * w, y - 0.44 * h);
  ctx.lineTo(posX + 0.46 * dir * w, y - 0.52 * h);
  ctx.closePath();
  ctx.fillStyle = suitColor;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX + 0.68 * dir * w, y - 0.57 * h);
  ctx.lineTo(posX + 0.88 * dir * w, y - 0.48 * h);
  ctx.lineTo(posX + 0.74 * dir * w, y - 0.44 * h);
  ctx.lineTo(posX + 0.62 * dir * w, y - 0.52 * h);
  ctx.closePath();
  ctx.fillStyle = whiteColor;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX - 0.32 * dir * w, y - 0.64 * h);
  ctx.lineTo(posX - 0.58 * dir * w, y - 0.52 * h);
  ctx.lineTo(posX - 0.46 * dir * w, y - 0.46 * h);
  ctx.closePath();
  ctx.fillStyle = whiteColor;
  ctx.fill();

  // Helmet & Visor
  ctx.beginPath();
  ctx.moveTo(posX - 0.16 * dir * w, y - 0.78 * h);
  ctx.lineTo(posX - 0.22 * dir * w, y - 0.94 * h);
  ctx.lineTo(posX + 0.06 * dir * w, y - 1.02 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y - 0.92 * h);
  ctx.lineTo(posX + 0.1 * dir * w, y - 0.82 * h);
  ctx.lineTo(posX - 0.08 * dir * w, y - 0.76 * h);
  ctx.closePath();
  ctx.fillStyle = helmetColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX + 0.06 * dir * w, y - 0.8 * h);
  ctx.lineTo(posX + 0.24 * dir * w, y - 0.8 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.73 * h);
  ctx.lineTo(posX + 0.12 * dir * w, y - 0.74 * h);
  ctx.closePath();
  ctx.fillStyle = skinColor;
  ctx.fill();

  if (Math.abs(dir) > 0.15) {
    ctx.beginPath();
    ctx.moveTo(posX + 0.12 * dir * w, y - 0.88 * h);
    ctx.lineTo(posX + 0.36 * dir * w, y - 0.88 * h);
    ctx.lineTo(posX + 0.32 * dir * w, y - 0.82 * h);
    ctx.lineTo(posX + 0.14 * dir * w, y - 0.82 * h);
    ctx.closePath();
    ctx.fillStyle = whiteColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(posX + 0.36 * dir * w, y - 0.94 * h);
  ctx.lineTo(posX + 0.18 * dir * w, y - 1.0 * h);
  ctx.lineTo(posX - 0.02 * dir * w, y - 0.96 * h);
  ctx.lineTo(posX + 0.16 * dir * w, y - 0.93 * h);
  ctx.closePath();
  ctx.fillStyle = goldColor;
  ctx.fill();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}

/**
 * 3. MARIO: Red cap with brim, blue overalls with yellow buttons, red shirt, mustache, brown shoes.
 */
