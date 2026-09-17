import type { BackgroundTheme, CharacterAnimState } from "../common.js";
import { drawCharacterStateAuras, resolveColor } from "../common.js";

export function drawJigglypuffPolygons(
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
  const baseLightPink = isMountainTheme
    ? "#fae8ff"
    : isAutumnTheme
      ? "#fed7aa"
      : "#f9a8d4";
  const baseDeepPink = isMountainTheme
    ? "#f0abfc"
    : isAutumnTheme
      ? "#f59e0b"
      : "#f472b6";
  const baseInnerEar = isMountainTheme
    ? "#3b0764"
    : isAutumnTheme
      ? "#4a044e"
      : "#3f3f46";
  const baseTealEye = isMountainTheme
    ? "#22d3ee"
    : isAutumnTheme
      ? "#10b981"
      : "#14b8a6";
  const baseOutline = isMountainTheme
    ? "rgba(49, 16, 66, 0.75)"
    : isAutumnTheme
      ? "rgba(41, 37, 36, 0.85)"
      : "rgba(0, 0, 0, 0.6)";

  let lightPink = resolveColor(baseLightPink, isOpponent);
  let deepPink = resolveColor(baseDeepPink, isOpponent);
  let innerEar = resolveColor(baseInnerEar, isOpponent);
  let tealEye = resolveColor(baseTealEye, isOpponent);
  const outlineColor = resolveColor(baseOutline, isOpponent);
  const outlineWidth = 1.2;

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    lightPink = resolveColor(`hsl(${hue}, 85%, 75%)`, isOpponent);
    deepPink = resolveColor(`hsl(${(hue + 30) % 360}, 90%, 65%)`, isOpponent);
  } else if (isRoll) {
    lightPink = resolveColor(baseLightPink, isOpponent, 0.45);
    deepPink = resolveColor(baseDeepPink, isOpponent, 0.45);
    innerEar = resolveColor(baseInnerEar, isOpponent, 0.45);
    tealEye = resolveColor(baseTealEye, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Back Ear
  ctx.beginPath();
  ctx.moveTo(posX - 0.38 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX - 0.62 * dir * w, y - 1.15 * h);
  ctx.lineTo(posX - 0.15 * dir * w, y - 0.88 * h);
  ctx.closePath();
  ctx.fillStyle = lightPink;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.76 * h);
  ctx.lineTo(posX - 0.52 * dir * w, y - 1.05 * h);
  ctx.lineTo(posX - 0.2 * dir * w, y - 0.86 * h);
  ctx.closePath();
  ctx.fillStyle = innerEar;
  ctx.fill();

  // Feet
  ctx.beginPath();
  ctx.ellipse(
    posX - 0.28 * dir * w,
    y - 0.08 * h,
    Math.max(0.1, 0.22 * w),
    Math.max(0.1, 0.1 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = deepPink;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    posX + 0.28 * dir * w,
    y - 0.08 * h,
    Math.max(0.1, 0.24 * w),
    Math.max(0.1, 0.1 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = deepPink;
  ctx.fill();
  ctx.stroke();

  // Body Sphere
  ctx.beginPath();
  ctx.ellipse(
    posX,
    y - 0.52 * h,
    Math.max(0.1, 0.76 * w),
    Math.max(0.1, 0.46 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = lightPink;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  // Front Ear
  ctx.beginPath();
  ctx.moveTo(posX + 0.12 * dir * w, y - 0.85 * h);
  ctx.lineTo(posX + 0.42 * dir * w, y - 1.22 * h);
  ctx.lineTo(posX + 0.52 * dir * w, y - 0.75 * h);
  ctx.closePath();
  ctx.fillStyle = lightPink;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX + 0.18 * dir * w, y - 0.86 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y - 1.12 * h);
  ctx.lineTo(posX + 0.44 * dir * w, y - 0.8 * h);
  ctx.closePath();
  ctx.fillStyle = innerEar;
  ctx.fill();

  // Forehead Swirl / Tuft
  ctx.beginPath();
  ctx.moveTo(posX - 0.05 * dir * w, y - 0.78 * h);
  ctx.quadraticCurveTo(
    posX + 0.2 * dir * w,
    y - 1.05 * h,
    posX + 0.45 * dir * w,
    y - 0.88 * h,
  );
  ctx.quadraticCurveTo(
    posX + 0.1 * dir * w,
    y - 0.75 * h,
    posX + 0.22 * dir * w,
    y - 0.72 * h,
  );
  ctx.closePath();
  ctx.fillStyle = deepPink;
  ctx.fill();
  ctx.stroke();

  // Two Big Shiny Teal Eyes & Cute Smile
  if (Math.abs(dir) > 0.15) {
    // 1. Back Eye
    const backEyeX = posX + 0.04 * dir * w;
    const backEyeY = y - 0.54 * h;
    const backR = Math.max(0.1, 0.18 * w);

    ctx.beginPath();
    ctx.arc(backEyeX, backEyeY, backR, 0, Math.PI * 2);
    ctx.fillStyle = tealEye;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Back Eye: Main top glint
    ctx.beginPath();
    ctx.arc(
      backEyeX + 0.03 * dir * w,
      backEyeY - 0.04 * h,
      Math.max(0.1, 0.07 * w),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = resolveColor("#ffffff", isOpponent);
    ctx.fill();

    // Back Eye: Secondary bottom glint
    ctx.beginPath();
    ctx.arc(
      backEyeX - 0.02 * dir * w,
      backEyeY + 0.04 * h,
      Math.max(0.1, 0.03 * w),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = resolveColor("#ffffff", isOpponent);
    ctx.fill();

    // 2. Front Eye (closer, slightly larger in 3/4 view)
    const frontEyeX = posX + 0.36 * dir * w;
    const frontEyeY = y - 0.52 * h;
    const frontR = Math.max(0.1, 0.21 * w);

    ctx.beginPath();
    ctx.arc(frontEyeX, frontEyeY, frontR, 0, Math.PI * 2);
    ctx.fillStyle = tealEye;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Front Eye: Main top glint
    ctx.beginPath();
    ctx.arc(
      frontEyeX + 0.04 * dir * w,
      frontEyeY - 0.04 * h,
      Math.max(0.1, 0.08 * w),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = resolveColor("#ffffff", isOpponent);
    ctx.fill();

    // Front Eye: Secondary bottom glint
    ctx.beginPath();
    ctx.arc(
      frontEyeX - 0.025 * dir * w,
      frontEyeY + 0.045 * h,
      Math.max(0.1, 0.035 * w),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = resolveColor("#ffffff", isOpponent);
    ctx.fill();

    // 3. Cute smile centered between eyes
    ctx.beginPath();
    ctx.arc(
      posX + 0.22 * dir * w,
      y - 0.38 * h,
      Math.max(0.1, 0.09 * w),
      0,
      Math.PI,
    );
    ctx.strokeStyle = resolveColor("#be123c", isOpponent);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}

/**
 * 7. FOX: Pointed fox snout, white cheek ruff, pointed ears, white flight jacket, green jumpsuit, bushy tail.
 */
