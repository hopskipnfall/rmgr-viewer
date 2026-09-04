import type { BackgroundTheme, CharacterAnimState } from "./common.js";
import { drawCharacterStateAuras, resolveColor } from "./common.js";

/**
 * 1. FALCO (0x1D): Blue avian ace pilot, sleek feathers, sharp beak,
 * white/red Star Fox pilot jacket, gold boots, communicator headset.
 */
export function drawFalcoPolygons(
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

  const isMountain = backgroundTheme === "mountain";
  const isAutumn = backgroundTheme === "autumn";

  const baseFeathers = isMountain
    ? "#38bdf8"
    : isAutumn
      ? "#0284c7"
      : "#2563eb";
  const baseFeathersDark = isMountain
    ? "#1e40af"
    : isAutumn
      ? "#0369a1"
      : "#1d4ed8";
  const baseBeak = isMountain ? "#fde047" : isAutumn ? "#f59e0b" : "#eab308";
  const baseJacket = isMountain ? "#e2e8f0" : isAutumn ? "#fed7aa" : "#f8fafc";
  const baseVest = isMountain ? "#f43f5e" : isAutumn ? "#dc2626" : "#ef4444";
  const basePants = isMountain ? "#334155" : isAutumn ? "#475569" : "#1e293b";
  const baseBoots = isMountain ? "#facc15" : isAutumn ? "#ea580c" : "#eab308";
  const baseHeadset = isMountain ? "#94a3b8" : isAutumn ? "#78716c" : "#64748b";

  let feathers = resolveColor(baseFeathers, isOpponent);
  let feathersDark = resolveColor(baseFeathersDark, isOpponent);
  const beak = resolveColor(baseBeak, isOpponent);
  let jacket = resolveColor(baseJacket, isOpponent);
  let vest = resolveColor(baseVest, isOpponent);
  let pants = resolveColor(basePants, isOpponent);
  let boots = resolveColor(baseBoots, isOpponent);
  const headset = resolveColor(baseHeadset, isOpponent);
  const outline = resolveColor("rgba(15, 23, 42, 0.7)", isOpponent);

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    feathers = resolveColor(`hsl(${hue}, 80%, 50%)`, isOpponent);
    jacket = resolveColor(`hsl(${(hue + 120) % 360}, 80%, 60%)`, isOpponent);
  } else if (isRoll) {
    feathers = resolveColor(baseFeathers, isOpponent, 0.45);
    feathersDark = resolveColor(baseFeathersDark, isOpponent, 0.45);
    jacket = resolveColor(baseJacket, isOpponent, 0.45);
    vest = resolveColor(baseVest, isOpponent, 0.45);
    pants = resolveColor(basePants, isOpponent, 0.45);
    boots = resolveColor(baseBoots, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Tail feathers
  ctx.beginPath();
  ctx.moveTo(posX - 0.3 * dir * w, y - 0.35 * h);
  ctx.lineTo(posX - 0.7 * dir * w, y - 0.45 * h);
  ctx.lineTo(posX - 0.4 * dir * w, y - 0.28 * h);
  ctx.closePath();
  ctx.fillStyle = feathersDark;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Legs & Boots
  ctx.beginPath();
  ctx.moveTo(posX - 0.15 * dir * w, y - 0.38 * h);
  ctx.lineTo(posX - 0.25 * dir * w, y - 0.15 * h);
  ctx.lineTo(posX + 0.15 * dir * w, y - 0.15 * h);
  ctx.lineTo(posX + 0.05 * dir * w, y - 0.38 * h);
  ctx.closePath();
  ctx.fillStyle = pants;
  ctx.fill();
  ctx.stroke();

  // High boots
  ctx.beginPath();
  ctx.rect(posX - 0.3 * dir * w, y - 0.15 * h, 0.2 * dir * w, 0.15 * h);
  ctx.rect(posX + 0.05 * dir * w, y - 0.15 * h, 0.2 * dir * w, 0.15 * h);
  ctx.fillStyle = boots;
  ctx.fill();
  ctx.stroke();

  // Torso / Star Fox Pilot Jacket
  ctx.beginPath();
  ctx.moveTo(posX - 0.3 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.38 * h);
  ctx.lineTo(posX - 0.25 * dir * w, y - 0.38 * h);
  ctx.closePath();
  ctx.fillStyle = jacket;
  ctx.fill();
  ctx.stroke();

  // Red vest inside jacket
  ctx.beginPath();
  ctx.moveTo(posX - 0.05 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.2 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.1 * dir * w, y - 0.4 * h);
  ctx.lineTo(posX - 0.05 * dir * w, y - 0.4 * h);
  ctx.closePath();
  ctx.fillStyle = vest;
  ctx.fill();

  // Head & Crest feathers
  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX - 0.5 * dir * w, y - 0.95 * h); // Swept back feather crest
  ctx.lineTo(posX - 0.1 * dir * w, y - 0.92 * h);
  ctx.lineTo(posX + 0.18 * dir * w, y - 0.9 * h);
  ctx.lineTo(posX + 0.2 * dir * w, y - 0.68 * h);
  ctx.closePath();
  ctx.fillStyle = feathers;
  ctx.fill();
  ctx.stroke();

  // Sharp avian beak
  ctx.beginPath();
  ctx.moveTo(posX + 0.15 * dir * w, y - 0.82 * h);
  ctx.lineTo(posX + 0.65 * dir * w, y - 0.78 * h); // Beak tip
  ctx.lineTo(posX + 0.15 * dir * w, y - 0.7 * h);
  ctx.closePath();
  ctx.fillStyle = beak;
  ctx.fill();
  ctx.stroke();

  // Headset on temple
  ctx.beginPath();
  ctx.arc(
    posX - 0.05 * dir * w,
    y - 0.8 * h,
    Math.max(1, 0.08 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = headset;
  ctx.fill();
  ctx.stroke();

  // Fierce avian eye
  ctx.beginPath();
  ctx.arc(
    posX + 0.12 * dir * w,
    y - 0.82 * h,
    Math.max(1, 0.035 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(
    posX + 0.14 * dir * w,
    y - 0.82 * h,
    Math.max(0.5, 0.02 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#0f172a";
  ctx.fill();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}
