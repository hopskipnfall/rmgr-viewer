import type { BackgroundTheme, CharacterAnimState } from "../common.js";
import { drawCharacterStateAuras, resolveColor } from "../common.js";

export function drawKirbyPolygons(
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
  const basePink = isMountainTheme
    ? "#fbcfe8"
    : isAutumnTheme
      ? "#fde68a"
      : "#f472b6";
  const baseFoot = isMountainTheme
    ? "#c026d3"
    : isAutumnTheme
      ? "#dc2626"
      : "#e11d48";
  const baseCheek = isMountainTheme
    ? "#f43f5e"
    : isAutumnTheme
      ? "#f87171"
      : "#fb7185";
  const baseEye = isMountainTheme
    ? "#38bdf8"
    : isAutumnTheme
      ? "#f59e0b"
      : "#3b82f6";
  const baseMouth = isMountainTheme
    ? "#701a75"
    : isAutumnTheme
      ? "#991b1b"
      : "#be123c";
  const baseOutline = isMountainTheme
    ? "rgba(49, 16, 66, 0.75)"
    : isAutumnTheme
      ? "rgba(41, 37, 36, 0.85)"
      : "rgba(0, 0, 0, 0.6)";

  let pinkColor = resolveColor(basePink, isOpponent);
  let redFootColor = resolveColor(baseFoot, isOpponent);
  let cheekColor = resolveColor(baseCheek, isOpponent);
  let eyeBlue = resolveColor(baseEye, isOpponent);
  let mouthColor = resolveColor(baseMouth, isOpponent);
  const outlineColor = resolveColor(baseOutline, isOpponent);
  const outlineWidth = 1.2;

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    pinkColor = resolveColor(`hsl(${hue}, 85%, 65%)`, isOpponent);
    redFootColor = resolveColor(
      `hsl(${(hue + 45) % 360}, 90%, 55%)`,
      isOpponent,
    );
  } else if (isRoll) {
    pinkColor = resolveColor(basePink, isOpponent, 0.45);
    redFootColor = resolveColor(baseFoot, isOpponent, 0.45);
    cheekColor = resolveColor(baseCheek, isOpponent, 0.45);
    eyeBlue = resolveColor(baseEye, isOpponent, 0.45);
    mouthColor = resolveColor(baseMouth, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Back Foot & Arm
  ctx.beginPath();
  ctx.ellipse(
    posX - 0.42 * dir * w,
    y - 0.16 * h,
    Math.max(0.1, 0.38 * w),
    Math.max(0.1, 0.18 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = redFootColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    posX - 0.68 * dir * w,
    y - 0.52 * h,
    Math.max(0.1, 0.22 * w),
    Math.max(0.1, 0.22 * w),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = pinkColor;
  ctx.fill();
  ctx.stroke();

  // Main Pink Body Sphere
  ctx.beginPath();
  ctx.ellipse(
    posX,
    y - 0.52 * h,
    Math.max(0.1, 0.78 * w),
    Math.max(0.1, 0.46 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = pinkColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  // Front Foot & Arm
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.42 * dir * w,
    y - 0.16 * h,
    Math.max(0.1, 0.42 * w),
    Math.max(0.1, 0.18 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = redFootColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    posX + 0.68 * dir * w,
    y - 0.48 * h,
    Math.max(0.1, 0.24 * w),
    Math.max(0.1, 0.24 * w),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = pinkColor;
  ctx.fill();
  ctx.stroke();

  // Face: Rosy Cheeks (front & back), Two Blue Eyes, Open Smile
  // Back cheek
  ctx.beginPath();
  ctx.ellipse(
    posX - 0.06 * dir * w,
    y - 0.44 * h,
    Math.max(0.1, 0.14 * w),
    Math.max(0.1, 0.09 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = cheekColor;
  ctx.fill();

  // Front cheek
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.44 * dir * w,
    y - 0.44 * h,
    Math.max(0.1, 0.16 * w),
    Math.max(0.1, 0.1 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = cheekColor;
  ctx.fill();

  if (Math.abs(dir) > 0.15) {
    // 1. Back Eye
    const backEyeX = posX + 0.08 * dir * w;
    ctx.beginPath();
    ctx.ellipse(
      backEyeX,
      y - 0.62 * h,
      Math.max(0.1, 0.085 * w),
      Math.max(0.1, 0.2 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = resolveColor("#18181b", isOpponent);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(
      backEyeX,
      y - 0.54 * h,
      Math.max(0.1, 0.07 * w),
      Math.max(0.1, 0.1 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = eyeBlue;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(
      backEyeX + 0.01 * dir * w,
      y - 0.68 * h,
      Math.max(0.1, 0.04 * w),
      Math.max(0.1, 0.065 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = resolveColor("#ffffff", isOpponent);
    ctx.fill();

    // 2. Front Eye
    const frontEyeX = posX + 0.3 * dir * w;
    ctx.beginPath();
    ctx.ellipse(
      frontEyeX,
      y - 0.62 * h,
      Math.max(0.1, 0.095 * w),
      Math.max(0.1, 0.22 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = resolveColor("#18181b", isOpponent);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(
      frontEyeX,
      y - 0.54 * h,
      Math.max(0.1, 0.08 * w),
      Math.max(0.1, 0.11 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = eyeBlue;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(
      frontEyeX + 0.01 * dir * w,
      y - 0.68 * h,
      Math.max(0.1, 0.045 * w),
      Math.max(0.1, 0.07 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = resolveColor("#ffffff", isOpponent);
    ctx.fill();

    // 3. Open smile / mouth between eyes
    ctx.beginPath();
    ctx.arc(
      posX + 0.18 * dir * w,
      y - 0.42 * h,
      Math.max(0.1, 0.11 * w),
      0,
      Math.PI,
    );
    ctx.fillStyle = mouthColor;
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}

/**
 * 6. JIGGLYPUFF: Light pink balloon body, forehead swirl tuft, cat-like ears with dark inner ears, teal shiny eyes.
 */
