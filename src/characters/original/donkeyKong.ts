import type { BackgroundTheme, CharacterAnimState } from "../common.js";
import { drawCharacterStateAuras, resolveColor } from "../common.js";

export function drawDonkeyKongPolygons(
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
  const baseFur = isMountainTheme
    ? "#6366f1"
    : isAutumnTheme
      ? "#451a03"
      : "#78350f";
  const baseSkin = isMountainTheme
    ? "#fdf4ff"
    : isAutumnTheme
      ? "#fde68a"
      : "#fed7aa";
  const baseTie = isMountainTheme
    ? "#ec4899"
    : isAutumnTheme
      ? "#dc2626"
      : "#dc2626";
  const baseEmblem = isMountainTheme
    ? "#38bdf8"
    : isAutumnTheme
      ? "#facc15"
      : "#facc15";
  const baseOutline = isMountainTheme
    ? "rgba(30, 27, 75, 0.85)"
    : isAutumnTheme
      ? "rgba(41, 37, 36, 0.85)"
      : "rgba(0, 0, 0, 0.6)";

  let furColor = resolveColor(baseFur, isOpponent);
  let skinColor = resolveColor(baseSkin, isOpponent);
  let tieRed = resolveColor(baseTie, isOpponent);
  let tieYellow = resolveColor(baseEmblem, isOpponent);
  const outlineColor = resolveColor(baseOutline, isOpponent);
  const outlineWidth = 1.2;

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    furColor = resolveColor(`hsl(${hue}, 80%, 35%)`, isOpponent);
    tieRed = resolveColor(`hsl(${(hue + 60) % 360}, 90%, 55%)`, isOpponent);
  } else if (isRoll) {
    furColor = resolveColor(baseFur, isOpponent, 0.45);
    skinColor = resolveColor(baseSkin, isOpponent, 0.45);
    tieRed = resolveColor(baseTie, isOpponent, 0.45);
    tieYellow = resolveColor(baseEmblem, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Heavy Gorilla Feet & Legs
  ctx.beginPath();
  ctx.ellipse(
    posX - 0.4 * dir * w,
    y - 0.1 * h,
    Math.max(0.1, 0.35 * w),
    Math.max(0.1, 0.15 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = furColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    posX + 0.38 * dir * w,
    y - 0.1 * h,
    Math.max(0.1, 0.38 * w),
    Math.max(0.1, 0.15 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = furColor;
  ctx.fill();
  ctx.stroke();

  // Muscular Torso & Arms
  ctx.beginPath();
  ctx.moveTo(posX - 0.45 * dir * w, y - 0.25 * h);
  ctx.lineTo(posX - 0.55 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX + 0.55 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX + 0.45 * dir * w, y - 0.25 * h);
  ctx.closePath();
  ctx.fillStyle = furColor;
  ctx.fill();
  ctx.stroke();

  // Tan Pectoral Chest Plate
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.12 * dir * w,
    y - 0.55 * h,
    Math.max(0.1, 0.38 * w),
    Math.max(0.1, 0.22 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = skinColor;
  ctx.fill();

  // Red Necktie with "DK" Mark
  ctx.beginPath();
  ctx.moveTo(posX + 0.05 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.32 * dir * w, y - 0.38 * h);
  ctx.lineTo(posX + 0.18 * dir * w, y - 0.32 * h);
  ctx.lineTo(posX + 0.08 * dir * w, y - 0.42 * h);
  ctx.closePath();
  ctx.fillStyle = tieRed;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    posX + 0.2 * dir * w,
    y - 0.48 * h,
    Math.max(0.1, 0.08 * w),
    Math.max(0.1, 0.06 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = tieYellow;
  ctx.fill();

  // Head with Hair Peak & Tan Face
  ctx.beginPath();
  ctx.moveTo(posX - 0.3 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX - 0.35 * dir * w, y - 0.98 * h);
  ctx.lineTo(posX - 0.1 * dir * w, y - 1.15 * h); // Hair peak
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.98 * h);
  ctx.lineTo(posX + 0.42 * dir * w, y - 0.72 * h);
  ctx.closePath();
  ctx.fillStyle = furColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    posX + 0.25 * dir * w,
    y - 0.8 * h,
    Math.max(0.1, 0.28 * w),
    Math.max(0.1, 0.16 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = skinColor;
  ctx.fill();
  ctx.stroke();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}

/**
 * 10. LINK: Green floppy cap, blonde hair bangs, pointed elf ear, green tunic, Hylian shield on back.
 */
