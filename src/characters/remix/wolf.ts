import type { BackgroundTheme, CharacterAnimState } from "./common.js";
import { drawCharacterStateAuras, resolveColor } from "./common.js";

/**
 * 16. WOLF O'DONNELL (0x37):
 * Fox/Falco rival with grey fur, jagged collar, plum pilot jacket, eyepatch,
 * clawed boots, and blaster holster.
 */
export function drawWolfPolygons(
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
    const headTilt =
      Math.sin(actionFrameCounter * 0.25) * 0.15 * (facingRight ? 1 : -1);
    ctx.translate(posX, centerY);
    ctx.rotate(headTilt);
    ctx.translate(-posX, -centerY);
  }

  const isMountain = backgroundTheme === "mountain";
  const isAutumn = backgroundTheme === "autumn";

  const baseJacket = isMountain ? "#4c1d95" : isAutumn ? "#3b0764" : "#581c87";
  const baseVest = isMountain ? "#374151" : isAutumn ? "#262626" : "#4b5563";
  const baseFur = isMountain ? "#6b7280" : isAutumn ? "#52525b" : "#71717a";
  const baseDarkFur = isMountain ? "#374151" : isAutumn ? "#27272a" : "#3f3f46";
  const baseBoots = isMountain ? "#9ca3af" : isAutumn ? "#a1a1aa" : "#cbd5e1";
  const baseEyepatch = isMountain
    ? "#0f172a"
    : isAutumn
      ? "#18181b"
      : "#0f172a";

  let jacket = resolveColor(baseJacket, isOpponent);
  let vest = resolveColor(baseVest, isOpponent);
  let fur = resolveColor(baseFur, isOpponent);
  const darkFur = resolveColor(baseDarkFur, isOpponent);
  const boots = resolveColor(baseBoots, isOpponent);
  let eyepatch = resolveColor(baseEyepatch, isOpponent);
  const outline = resolveColor("rgba(15, 23, 42, 0.8)", isOpponent);

  if (taunting) {
    const eyeHue = (actionFrameCounter * 12) % 360;
    eyepatch = resolveColor(`hsl(${eyeHue}, 90%, 50%)`, isOpponent);
  } else if (isRoll) {
    jacket = resolveColor(baseJacket, isOpponent, 0.45);
    vest = resolveColor(baseVest, isOpponent, 0.45);
    fur = resolveColor(baseFur, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Bushy wolf tail behind body
  ctx.beginPath();
  ctx.moveTo(posX - 0.25 * dir * w, y - 0.35 * h);
  ctx.lineTo(posX - 0.75 * dir * w, y - 0.48 * h);
  ctx.lineTo(posX - 0.9 * dir * w, y - 0.38 * h);
  ctx.lineTo(posX - 0.6 * dir * w, y - 0.25 * h);
  ctx.lineTo(posX - 0.2 * dir * w, y - 0.28 * h);
  ctx.closePath();
  ctx.fillStyle = darkFur;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Boots & Legs
  ctx.beginPath();
  ctx.moveTo(posX - 0.3 * dir * w, y - 0.3 * h);
  ctx.lineTo(posX - 0.15 * dir * w, y);
  ctx.lineTo(posX - 0.4 * dir * w, y);
  ctx.lineTo(posX - 0.45 * dir * w, y - 0.3 * h);
  ctx.closePath();
  ctx.fillStyle = boots;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX + 0.05 * dir * w, y - 0.3 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y);
  ctx.lineTo(posX + 0.45 * dir * w, y);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.3 * h);
  ctx.closePath();
  ctx.fillStyle = boots;
  ctx.fill();

  // Dark pilot pants
  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.5 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.5 * h);
  ctx.lineTo(posX + 0.2 * dir * w, y - 0.3 * h);
  ctx.lineTo(posX - 0.3 * dir * w, y - 0.3 * h);
  ctx.closePath();
  ctx.fillStyle = vest;
  ctx.fill();

  // Purple Jacket Body & Holster
  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.45 * h);
  ctx.lineTo(posX - 0.35 * dir * w, y - 0.45 * h);
  ctx.closePath();
  ctx.fillStyle = jacket;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Jagged fur collar
  ctx.beginPath();
  ctx.moveTo(posX - 0.4 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX - 0.25 * dir * w, y - 0.8 * h);
  ctx.lineTo(posX - 0.05 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX + 0.15 * dir * w, y - 0.82 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX + 0.2 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX - 0.25 * dir * w, y - 0.65 * h);
  ctx.closePath();
  ctx.fillStyle = darkFur;
  ctx.fill();

  // Sharp Wolf Head & Muzzle
  ctx.beginPath();
  ctx.moveTo(posX - 0.25 * dir * w, y - 0.82 * h);
  ctx.lineTo(posX - 0.3 * dir * w, y - 0.98 * h); // Ear back
  ctx.lineTo(posX - 0.1 * dir * w, y - 0.85 * h);
  ctx.lineTo(posX + 0.05 * dir * w, y - 0.96 * h); // Ear front
  ctx.lineTo(posX + 0.18 * dir * w, y - 0.83 * h);
  ctx.lineTo(posX + 0.48 * dir * w, y - 0.77 * h); // Snout tip
  ctx.lineTo(posX + 0.2 * dir * w, y - 0.7 * h); // Lower jaw
  ctx.lineTo(posX - 0.2 * dir * w, y - 0.72 * h);
  ctx.closePath();
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Eyepatch over right eye / visor
  ctx.beginPath();
  ctx.moveTo(posX + 0.05 * dir * w, y - 0.84 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.82 * h);
  ctx.lineTo(posX + 0.18 * dir * w, y - 0.76 * h);
  ctx.lineTo(posX + 0.02 * dir * w, y - 0.78 * h);
  ctx.closePath();
  ctx.fillStyle = eyepatch;
  ctx.fill();

  // Glowing red eye glint inside eyepatch
  ctx.beginPath();
  ctx.arc(
    posX + 0.12 * dir * w,
    y - 0.8 * h,
    Math.max(1, 0.03 * h),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#ef4444";
  ctx.fill();

  // Player badge ring
  ctx.beginPath();
  ctx.arc(posX, y - 0.58 * h, Math.max(1.5, 0.08 * w), 0, Math.PI * 2);
  ctx.fillStyle = playerColor;
  ctx.fill();

  ctx.restore();
  drawCharacterStateAuras(
    ctx,
    posX,
    y,
    halfWidth,
    heightPx,
    effectiveDir,
    state,
  );
}
