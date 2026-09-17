import type { BackgroundTheme, CharacterAnimState } from "../common.js";
import { drawCharacterStateAuras, resolveColor } from "../common.js";

export function drawPikachuPolygons(
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
  const baseBody = isMountainTheme
    ? "#38bdf8"
    : isAutumnTheme
      ? "#fbbf24"
      : "#facc15";
  const baseEarTip = isMountainTheme
    ? "#1e1b4b"
    : isAutumnTheme
      ? "#1c1917"
      : "#1e1e24";
  const baseCheek = isMountainTheme
    ? "#ec4899"
    : isAutumnTheme
      ? "#dc2626"
      : "#ef4444";
  const baseStripe = isMountainTheme
    ? "#6b21a8"
    : isAutumnTheme
      ? "#991b1b"
      : "#854d0e";
  const baseTailBase = isMountainTheme
    ? "#6b21a8"
    : isAutumnTheme
      ? "#991b1b"
      : "#854d0e";
  const baseOutline = isMountainTheme
    ? "rgba(15, 23, 42, 0.85)"
    : isAutumnTheme
      ? "rgba(41, 37, 36, 0.85)"
      : "rgba(0, 0, 0, 0.6)";

  let bodyColor = resolveColor(baseBody, isOpponent);
  let earTipColor = resolveColor(baseEarTip, isOpponent);
  let cheekColor = resolveColor(baseCheek, isOpponent);
  let stripeColor = resolveColor(baseStripe, isOpponent);
  let tailBaseColor = resolveColor(baseTailBase, isOpponent);
  const outlineColor = resolveColor(baseOutline, isOpponent);
  const outlineWidth = 1.2;

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    bodyColor = resolveColor(`hsl(${hue}, 85%, 55%)`, isOpponent);
    cheekColor = resolveColor(`hsl(${(hue + 60) % 360}, 90%, 55%)`, isOpponent);
  } else if (isRoll) {
    bodyColor = resolveColor(baseBody, isOpponent, 0.45);
    earTipColor = resolveColor(baseEarTip, isOpponent, 0.45);
    cheekColor = resolveColor(baseCheek, isOpponent, 0.45);
    stripeColor = resolveColor(baseStripe, isOpponent, 0.45);
    tailBaseColor = resolveColor(baseTailBase, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Tail Base (Brown)
  ctx.beginPath();
  ctx.moveTo(posX - 0.45 * dir * w, y - 0.32 * h);
  ctx.lineTo(posX - 0.68 * dir * w, y - 0.44 * h);
  ctx.lineTo(posX - 0.72 * dir * w, y - 0.36 * h);
  ctx.lineTo(posX - 0.5 * dir * w, y - 0.24 * h);
  ctx.closePath();
  ctx.fillStyle = tailBaseColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  // Tail Mid & Tip (Yellow Lightning Bolt)
  ctx.beginPath();
  ctx.moveTo(posX - 0.68 * dir * w, y - 0.44 * h);
  ctx.lineTo(posX - 0.52 * dir * w, y - 0.64 * h);
  ctx.lineTo(posX - 0.76 * dir * w, y - 0.62 * h);
  ctx.lineTo(posX - 0.62 * dir * w, y - 0.85 * h);
  ctx.lineTo(posX - 0.95 * dir * w, y - 1.12 * h);
  ctx.lineTo(posX - 1.28 * dir * w, y - 0.88 * h);
  ctx.lineTo(posX - 0.92 * dir * w, y - 0.75 * h);
  ctx.lineTo(posX - 0.72 * dir * w, y - 0.36 * h);
  ctx.closePath();
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  // Back Ear
  ctx.beginPath();
  ctx.moveTo(posX - 0.18 * dir * w, y - 0.94 * h);
  ctx.lineTo(posX - 0.02 * dir * w, y - 0.98 * h);
  ctx.lineTo(posX - 0.2 * dir * w, y - 1.2 * h);
  ctx.lineTo(posX - 0.3 * dir * w, y - 1.18 * h);
  ctx.closePath();
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  // Back Ear Black Tip
  ctx.beginPath();
  ctx.moveTo(posX - 0.3 * dir * w, y - 1.18 * h);
  ctx.lineTo(posX - 0.2 * dir * w, y - 1.2 * h);
  ctx.lineTo(posX - 0.4 * dir * w, y - 1.4 * h);
  ctx.closePath();
  ctx.fillStyle = earTipColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  // Main Body & Head
  ctx.beginPath();
  ctx.moveTo(posX - 0.4 * dir * w, y);
  ctx.lineTo(posX - 0.66 * dir * w, y - 0.28 * h);
  ctx.lineTo(posX - 0.62 * dir * w, y - 0.62 * h);
  ctx.lineTo(posX - 0.42 * dir * w, y - 0.84 * h);
  ctx.lineTo(posX - 0.2 * dir * w, y - 0.96 * h);
  ctx.lineTo(posX + 0.12 * dir * w, y - 1.02 * h);
  ctx.lineTo(posX + 0.58 * dir * w, y - 0.86 * h);
  ctx.lineTo(posX + 0.86 * dir * w, y - 0.6 * h);
  ctx.lineTo(posX + 0.66 * dir * w, y - 0.46 * h);
  ctx.lineTo(posX + 0.78 * dir * w, y - 0.3 * h);
  ctx.lineTo(posX + 0.46 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  // Back Stripes
  ctx.beginPath();
  ctx.moveTo(posX - 0.6 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX - 0.22 * dir * w, y - 0.66 * h);
  ctx.lineTo(posX - 0.24 * dir * w, y - 0.58 * h);
  ctx.lineTo(posX - 0.62 * dir * w, y - 0.62 * h);
  ctx.closePath();
  ctx.fillStyle = stripeColor;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX - 0.65 * dir * w, y - 0.48 * h);
  ctx.lineTo(posX - 0.2 * dir * w, y - 0.44 * h);
  ctx.lineTo(posX - 0.22 * dir * w, y - 0.36 * h);
  ctx.lineTo(posX - 0.66 * dir * w, y - 0.4 * h);
  ctx.closePath();
  ctx.fillStyle = stripeColor;
  ctx.fill();

  // Front Ear
  ctx.beginPath();
  ctx.moveTo(posX + 0.14 * dir * w, y - 1.0 * h);
  ctx.lineTo(posX + 0.36 * dir * w, y - 0.9 * h);
  ctx.lineTo(posX + 0.64 * dir * w, y - 1.18 * h);
  ctx.lineTo(posX + 0.48 * dir * w, y - 1.22 * h);
  ctx.closePath();
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  // Front Ear Black Tip
  ctx.beginPath();
  ctx.moveTo(posX + 0.48 * dir * w, y - 1.22 * h);
  ctx.lineTo(posX + 0.64 * dir * w, y - 1.18 * h);
  ctx.lineTo(posX + 0.88 * dir * w, y - 1.44 * h);
  ctx.closePath();
  ctx.fillStyle = earTipColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  // Red Cheek
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.46 * dir * w,
    y - 0.54 * h,
    Math.max(0.1, Math.abs(0.18 * w)),
    Math.max(0.1, 0.18 * w),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = cheekColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Eye, Nose, Smile
  if (Math.abs(dir) > 0.15) {
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.44 * dir * w,
      y - 0.74 * h,
      Math.max(0.1, Math.abs(0.11 * w)),
      Math.max(0.1, 0.13 * w),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = resolveColor("#18181b", isOpponent);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(
      posX + (0.44 + 0.04 * dir) * w,
      y - 0.77 * h,
      Math.max(0.1, Math.abs(0.04 * w)),
      Math.max(0.1, 0.04 * w),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = resolveColor("#ffffff", isOpponent);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(posX + 0.82 * dir * w, y - 0.62 * h);
    ctx.lineTo(posX + 0.78 * dir * w, y - 0.6 * h);
    ctx.lineTo(posX + 0.78 * dir * w, y - 0.64 * h);
    ctx.closePath();
    ctx.fillStyle = resolveColor("#18181b", isOpponent);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(posX + 0.64 * dir * w, y - 0.54 * h);
    ctx.quadraticCurveTo(
      posX + 0.7 * dir * w,
      y - 0.5 * h,
      posX + 0.74 * dir * w,
      y - 0.54 * h,
    );
    ctx.strokeStyle = stripeColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}

/**
 * 2. CAPTAIN FALCON: Helmet with gold crest and white visor, flowing yellow scarf, athletic racing suit, boots.
 */
