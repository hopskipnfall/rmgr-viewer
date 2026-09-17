import type { BackgroundTheme, CharacterAnimState } from "../common.js";
import { drawCharacterStateAuras, resolveColor } from "../common.js";

export function drawYoshiPolygons(
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
    ? "#38bdf8"
    : isAutumnTheme
      ? "#facc15"
      : "#22c55e";
  const baseWhite = isMountainTheme
    ? "#fdf4ff"
    : isAutumnTheme
      ? "#fffbeb"
      : "#f8fafc";
  const baseOrangeBoot = isMountainTheme
    ? "#c084fc"
    : isAutumnTheme
      ? "#dc2626"
      : "#f97316";
  const baseRedShell = isMountainTheme
    ? "#f43f5e"
    : isAutumnTheme
      ? "#991b1b"
      : "#ef4444";
  const baseOutline = isMountainTheme
    ? "rgba(15, 23, 42, 0.85)"
    : isAutumnTheme
      ? "rgba(41, 37, 36, 0.85)"
      : "rgba(0, 0, 0, 0.6)";

  let greenColor = resolveColor(baseGreen, isOpponent);
  let whiteColor = resolveColor(baseWhite, isOpponent);
  let orangeBoot = resolveColor(baseOrangeBoot, isOpponent);
  let redShell = resolveColor(baseRedShell, isOpponent);
  const outlineColor = resolveColor(baseOutline, isOpponent);
  const outlineWidth = 1.2;

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    greenColor = resolveColor(`hsl(${hue}, 85%, 50%)`, isOpponent);
    orangeBoot = resolveColor(`hsl(${(hue + 60) % 360}, 90%, 55%)`, isOpponent);
  } else if (isRoll) {
    greenColor = resolveColor(baseGreen, isOpponent, 0.45);
    whiteColor = resolveColor(baseWhite, isOpponent, 0.45);
    orangeBoot = resolveColor(baseOrangeBoot, isOpponent, 0.45);
    redShell = resolveColor(baseRedShell, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Tail & Red Shell (Background)
  ctx.beginPath();
  ctx.moveTo(posX - 0.4 * dir * w, y - 0.3 * h);
  ctx.lineTo(posX - 0.95 * dir * w, y - 0.52 * h);
  ctx.lineTo(posX - 0.45 * dir * w, y - 0.58 * h);
  ctx.closePath();
  ctx.fillStyle = greenColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    posX - 0.48 * dir * w,
    y - 0.62 * h,
    Math.max(0.1, 0.24 * w),
    Math.max(0.1, 0.16 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = redShell;
  ctx.fill();
  ctx.stroke();

  // Orange Boots
  ctx.beginPath();
  ctx.ellipse(
    posX - 0.35 * dir * w,
    y - 0.1 * h,
    Math.max(0.1, 0.28 * w),
    Math.max(0.1, 0.14 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = orangeBoot;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    posX + 0.32 * dir * w,
    y - 0.1 * h,
    Math.max(0.1, 0.32 * w),
    Math.max(0.1, 0.14 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = orangeBoot;
  ctx.fill();
  ctx.stroke();

  // Body & White Belly
  ctx.beginPath();
  ctx.moveTo(posX - 0.4 * dir * w, y - 0.2 * h);
  ctx.lineTo(posX - 0.45 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.15 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.42 * dir * w, y - 0.35 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.2 * h);
  ctx.closePath();
  ctx.fillStyle = greenColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX - 0.1 * dir * w, y - 0.25 * h);
  ctx.lineTo(posX + 0.15 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX + 0.4 * dir * w, y - 0.45 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.22 * h);
  ctx.closePath();
  ctx.fillStyle = whiteColor;
  ctx.fill();

  // Big Rounded Green Snout
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.48 * dir * w,
    y - 0.72 * h,
    Math.max(0.1, 0.38 * w),
    Math.max(0.1, 0.22 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = greenColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  // Nostril
  if (Math.abs(dir) > 0.15) {
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.68 * dir * w,
      y - 0.76 * h,
      Math.max(0.1, 0.035 * w),
      Math.max(0.1, 0.045 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = resolveColor("#18181b", isOpponent);
    ctx.fill();
  }

  // Eye White (on top of snout bridge)
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.1 * dir * w,
    y - 0.85 * h,
    Math.max(0.1, 0.14 * w),
    Math.max(0.1, 0.18 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = whiteColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  // Eye Pupil (properly directional-flipped)
  if (Math.abs(dir) > 0.15) {
    ctx.beginPath();
    ctx.ellipse(
      posX + 0.14 * dir * w,
      y - 0.85 * h,
      Math.max(0.1, 0.05 * w),
      Math.max(0.1, 0.08 * h),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = resolveColor("#18181b", isOpponent);
    ctx.fill();
  }

  // Red Spines along neck
  ctx.beginPath();
  ctx.moveTo(posX - 0.2 * dir * w, y - 0.82 * h);
  ctx.lineTo(posX - 0.38 * dir * w, y - 0.88 * h);
  ctx.lineTo(posX - 0.25 * dir * w, y - 0.74 * h);
  ctx.closePath();
  ctx.fillStyle = redShell;
  ctx.fill();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}

/**
 * 9. DONKEY KONG: Muscular brown gorilla body, head crest, tan face & chest plate, red "DK" tie.
 */
