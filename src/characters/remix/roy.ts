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

/**
 * 10. ROY (0x4A): Young Lion of Pherae, spiky red hair, headband,
 * blue/gold armor, fiery blade of seals.
 */
export function drawRoyPolygons(
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

  const baseHair = isMountain ? "#f43f5e" : isAutumn ? "#ea580c" : "#dc2626";
  const baseArmor = isMountain ? "#312e81" : isAutumn ? "#1e293b" : "#1e40af";
  const baseCape = isMountain ? "#881337" : isAutumn ? "#991b1b" : "#b91c1c";
  const baseFlame = isMountain ? "#38bdf8" : isAutumn ? "#f59e0b" : "#f97316";
  const skin = resolveColor("#fed7aa", isOpponent);

  let hair = resolveColor(baseHair, isOpponent);
  let armor = resolveColor(baseArmor, isOpponent);
  let cape = resolveColor(baseCape, isOpponent);
  let flame = resolveColor(baseFlame, isOpponent);
  const outline = resolveColor("rgba(0, 0, 0, 0.75)", isOpponent);

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    hair = resolveColor(`hsl(${hue}, 90%, 55%)`, isOpponent);
    flame = resolveColor(`hsl(${(hue + 60) % 360}, 95%, 60%)`, isOpponent);
  } else if (isRoll) {
    hair = resolveColor(baseHair, isOpponent, 0.45);
    armor = resolveColor(baseArmor, isOpponent, 0.45);
    cape = resolveColor(baseCape, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Red cape behind
  ctx.beginPath();
  ctx.moveTo(posX - 0.15 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX - 0.6 * dir * w, y - 0.18 * h);
  ctx.lineTo(posX - 0.3 * dir * w, y - 0.1 * h);
  ctx.lineTo(posX - 0.05 * dir * w, y - 0.65 * h);
  ctx.closePath();
  ctx.fillStyle = cape;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Greaves & armored boots
  ctx.beginPath();
  ctx.rect(posX - 0.2 * dir * w, y - 0.3 * h, 0.16 * dir * w, 0.3 * h);
  ctx.rect(posX + 0.06 * dir * w, y - 0.3 * h, 0.16 * dir * w, 0.3 * h);
  ctx.fillStyle = armor;
  ctx.fill();
  ctx.stroke();

  // Breastplate
  ctx.beginPath();
  ctx.moveTo(posX - 0.28 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX + 0.2 * dir * w, y - 0.32 * h);
  ctx.lineTo(posX - 0.2 * dir * w, y - 0.32 * h);
  ctx.closePath();
  ctx.fillStyle = armor;
  ctx.fill();
  ctx.stroke();

  // Head & Face
  ctx.beginPath();
  ctx.arc(posX, y - 0.8 * h, Math.max(1, 0.22 * w), 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();

  // White Headband
  ctx.beginPath();
  ctx.rect(posX - 0.18 * dir * w, y - 0.86 * h, 0.4 * dir * w, 0.04 * h);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Spiky fiery crimson hair
  ctx.beginPath();
  ctx.moveTo(posX - 0.2 * dir * w, y - 0.85 * h);
  ctx.lineTo(posX - 0.4 * dir * w, y - 1.05 * h); // Back hair spike
  ctx.lineTo(posX - 0.1 * dir * w, y - 1.15 * h); // Top hair spike
  ctx.lineTo(posX + 0.25 * dir * w, y - 1.05 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.85 * h);
  ctx.closePath();
  ctx.fillStyle = hair;
  ctx.fill();
  ctx.stroke();

  // Sword of Seals with flame burst
  ctx.beginPath();
  ctx.moveTo(posX + 0.25 * dir * w, y - 0.5 * h);
  ctx.lineTo(posX + 0.8 * dir * w, y - 0.75 * h);
  ctx.lineTo(posX + 0.28 * dir * w, y - 0.45 * h);
  ctx.closePath();
  ctx.fillStyle = "#cbd5e1";
  ctx.fill();
  ctx.stroke();

  // Fiery flare on sword tip
  ctx.beginPath();
  ctx.arc(
    posX + 0.8 * dir * w,
    y - 0.75 * h,
    Math.max(1, 0.08 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = flame;
  ctx.fill();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}
