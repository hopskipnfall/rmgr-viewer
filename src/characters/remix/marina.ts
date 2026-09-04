import type { BackgroundTheme, CharacterAnimState } from "./common.js";
import { drawCharacterStateAuras, resolveColor } from "./common.js";

/**
 * 23. MARINA LITEYEARS (0x3f):
 * Mischief Makers robotic heroine with silver/purple suit, red belt,
 * yellow antenna ears, visor, and dual-nozzle rocket thrusters.
 */
export function drawMarinaPolygons(
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
    const shake =
      Math.sin(actionFrameCounter * 0.6) * 0.12 * (facingRight ? 1 : -1);
    ctx.translate(posX, centerY);
    ctx.rotate(shake);
    ctx.translate(-posX, -centerY);
  }

  const isMountain = backgroundTheme === "mountain";
  const isAutumn = backgroundTheme === "autumn";

  const baseArmor = isMountain ? "#cbd5e1" : isAutumn ? "#94a3b8" : "#e2e8f0";
  const basePurple = isMountain ? "#6b21a8" : isAutumn ? "#581c87" : "#7e22ce";
  const baseRed = isMountain ? "#dc2626" : isAutumn ? "#b91c1c" : "#ef4444";
  const baseYellow = isMountain ? "#f59e0b" : isAutumn ? "#d97706" : "#facc15";

  let armor = resolveColor(baseArmor, isOpponent);
  let purple = resolveColor(basePurple, isOpponent);
  const red = resolveColor(baseRed, isOpponent);
  let yellow = resolveColor(baseYellow, isOpponent);
  const outline = resolveColor("rgba(15, 23, 42, 0.8)", isOpponent);

  if (taunting) {
    const flameHue = (actionFrameCounter * 16) % 360;
    yellow = resolveColor(`hsl(${flameHue}, 95%, 55%)`, isOpponent);
  } else if (isRoll) {
    armor = resolveColor(baseArmor, isOpponent, 0.45);
    purple = resolveColor(basePurple, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Rocket Thruster Pack on back
  ctx.beginPath();
  ctx.moveTo(posX - 0.15 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX - 0.45 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX - 0.42 * dir * w, y - 0.45 * h);
  ctx.lineTo(posX - 0.12 * dir * w, y - 0.48 * h);
  ctx.closePath();
  ctx.fillStyle = "#475569";
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Booster flame exhaust
  ctx.beginPath();
  ctx.moveTo(posX - 0.45 * dir * w, y - 0.52 * h);
  ctx.lineTo(posX - 0.65 * dir * w, y - 0.48 * h);
  ctx.lineTo(posX - 0.42 * dir * w, y - 0.44 * h);
  ctx.closePath();
  ctx.fillStyle = yellow;
  ctx.fill();

  // Silver boots & legs
  ctx.beginPath();
  ctx.moveTo(posX - 0.28 * dir * w, y - 0.28 * h);
  ctx.lineTo(posX - 0.15 * dir * w, y);
  ctx.lineTo(posX - 0.38 * dir * w, y);
  ctx.lineTo(posX - 0.38 * dir * w, y - 0.28 * h);
  ctx.closePath();
  ctx.fillStyle = armor;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX + 0.08 * dir * w, y - 0.28 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y);
  ctx.lineTo(posX + 0.45 * dir * w, y);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.28 * h);
  ctx.closePath();
  ctx.fillStyle = armor;
  ctx.fill();

  // Purple robotic torso & suit
  ctx.beginPath();
  ctx.moveTo(posX - 0.3 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.32 * h);
  ctx.lineTo(posX - 0.25 * dir * w, y - 0.32 * h);
  ctx.closePath();
  ctx.fillStyle = purple;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Red belt & buckle
  ctx.beginPath();
  ctx.moveTo(posX - 0.26 * dir * w, y - 0.36 * h);
  ctx.lineTo(posX + 0.24 * dir * w, y - 0.36 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.3 * h);
  ctx.lineTo(posX - 0.25 * dir * w, y - 0.3 * h);
  ctx.closePath();
  ctx.fillStyle = red;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(posX, y - 0.33 * h, Math.max(1.5, 0.04 * w), 0, Math.PI * 2);
  ctx.fillStyle = yellow;
  ctx.fill();

  // Silver chest plate
  ctx.beginPath();
  ctx.moveTo(posX - 0.18 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.18 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.1 * dir * w, y - 0.45 * h);
  ctx.lineTo(posX - 0.1 * dir * w, y - 0.45 * h);
  ctx.closePath();
  ctx.fillStyle = armor;
  ctx.fill();

  // Head & Robot Helmet
  ctx.beginPath();
  ctx.arc(posX + 0.05 * dir * w, y - 0.76 * h, 0.22 * w, 0, Math.PI * 2);
  ctx.fillStyle = armor;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Yellow Antennae / Ear Pods
  ctx.beginPath();
  ctx.moveTo(posX - 0.15 * dir * w, y - 0.85 * h);
  ctx.lineTo(posX - 0.28 * dir * w, y - 0.98 * h);
  ctx.lineTo(posX - 0.12 * dir * w, y - 0.92 * h);
  ctx.closePath();
  ctx.fillStyle = yellow;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX + 0.2 * dir * w, y - 0.85 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.98 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.92 * h);
  ctx.closePath();
  ctx.fillStyle = yellow;
  ctx.fill();

  // Green Visor / Anime Optics
  ctx.beginPath();
  ctx.moveTo(posX + 0.02 * dir * w, y - 0.8 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.78 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.02 * dir * w, y - 0.73 * h);
  ctx.closePath();
  ctx.fillStyle = "#10b981";
  ctx.fill();

  // Player emblem badge
  ctx.beginPath();
  ctx.arc(posX, y - 0.52 * h, Math.max(1.5, 0.06 * w), 0, Math.PI * 2);
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
