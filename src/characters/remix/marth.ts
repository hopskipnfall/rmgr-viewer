import type { BackgroundTheme, CharacterAnimState } from "./common.js";
import { drawCharacterStateAuras, resolveColor } from "./common.js";

/**
 * 9. MARTH (0x3A): Hero-King with navy blue tunic, gold trim,
 * cape with crimson lining, tiara, and silver Falchion blade.
 */
export function drawMarthPolygons(
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

  const baseTunic = isMountain ? "#1e3a8a" : isAutumn ? "#1e293b" : "#1d4ed8";
  const baseCape = isMountain ? "#312e81" : isAutumn ? "#7f1d1d" : "#1e1b4b";
  const baseHair = isMountain ? "#38bdf8" : isAutumn ? "#0284c7" : "#2563eb";
  const baseTrim = isMountain ? "#fef08a" : isAutumn ? "#f59e0b" : "#facc15";
  const baseSword = isMountain ? "#e2e8f0" : isAutumn ? "#fde68a" : "#f1f5f9";
  const skin = resolveColor("#fed7aa", isOpponent);

  let tunic = resolveColor(baseTunic, isOpponent);
  let cape = resolveColor(baseCape, isOpponent);
  let hair = resolveColor(baseHair, isOpponent);
  const trim = resolveColor(baseTrim, isOpponent);
  const sword = resolveColor(baseSword, isOpponent);
  const outline = resolveColor("rgba(15, 23, 42, 0.75)", isOpponent);

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    cape = resolveColor(`hsl(${hue}, 85%, 45%)`, isOpponent);
  } else if (isRoll) {
    tunic = resolveColor(baseTunic, isOpponent, 0.45);
    cape = resolveColor(baseCape, isOpponent, 0.45);
    hair = resolveColor(baseHair, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Flowing royal cape behind body
  ctx.beginPath();
  ctx.moveTo(posX - 0.2 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX - 0.65 * dir * w, y - 0.15 * h);
  ctx.lineTo(posX - 0.35 * dir * w, y - 0.1 * h);
  ctx.lineTo(posX - 0.05 * dir * w, y - 0.65 * h);
  ctx.closePath();
  ctx.fillStyle = cape;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Boots & Trousers
  ctx.beginPath();
  ctx.rect(posX - 0.2 * dir * w, y - 0.3 * h, 0.16 * dir * w, 0.3 * h);
  ctx.rect(posX + 0.06 * dir * w, y - 0.3 * h, 0.16 * dir * w, 0.3 * h);
  ctx.fillStyle = "#334155";
  ctx.fill();
  ctx.stroke();

  // Tunic with gold breastplate trim
  ctx.beginPath();
  ctx.moveTo(posX - 0.28 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.32 * h);
  ctx.lineTo(posX - 0.22 * dir * w, y - 0.32 * h);
  ctx.closePath();
  ctx.fillStyle = tunic;
  ctx.fill();
  ctx.stroke();

  // Gold armor trim
  ctx.beginPath();
  ctx.moveTo(posX - 0.15 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX, y - 0.52 * h);
  ctx.lineTo(posX + 0.15 * dir * w, y - 0.68 * h);
  ctx.strokeStyle = trim;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Head & refined face
  ctx.beginPath();
  ctx.arc(posX, y - 0.8 * h, Math.max(1, 0.22 * w), 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();

  // Royal Tiara
  ctx.beginPath();
  ctx.moveTo(posX - 0.15 * dir * w, y - 0.86 * h);
  ctx.lineTo(posX + 0.2 * dir * w, y - 0.86 * h);
  ctx.strokeStyle = trim;
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Sleek blue hair
  ctx.beginPath();
  ctx.moveTo(posX - 0.22 * dir * w, y - 0.8 * h);
  ctx.lineTo(posX - 0.35 * dir * w, y - 0.95 * h);
  ctx.lineTo(posX + 0.18 * dir * w, y - 0.96 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.78 * h);
  ctx.closePath();
  ctx.fillStyle = hair;
  ctx.fill();

  // Falchion sword held forward
  ctx.beginPath();
  ctx.moveTo(posX + 0.25 * dir * w, y - 0.52 * h);
  ctx.lineTo(posX + 0.75 * dir * w, y - 0.8 * h); // Sword blade tip
  ctx.lineTo(posX + 0.78 * dir * w, y - 0.78 * h);
  ctx.lineTo(posX + 0.28 * dir * w, y - 0.48 * h);
  ctx.closePath();
  ctx.fillStyle = sword;
  ctx.fill();
  ctx.stroke();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}
