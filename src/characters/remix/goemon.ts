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

/**
 * 24. GOEMON (0x41):
 * Mystical Ninja hero with huge blue spiky hair, white headband,
 * blue haori vest, red kimono, straw sandals, and giant smoking pipe.
 */
export function drawGoemonPolygons(
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
    const pipeSpin = actionFrameCounter * 0.2 * (facingRight ? 1 : -1);
    ctx.translate(posX, centerY);
    ctx.rotate(pipeSpin);
    ctx.translate(-posX, -centerY);
  }

  const isMountain = backgroundTheme === "mountain";
  const isAutumn = backgroundTheme === "autumn";

  const baseHair = isMountain ? "#0284c7" : isAutumn ? "#0369a1" : "#0284c7";
  const baseVest = isMountain ? "#1e3a8a" : isAutumn ? "#1e293b" : "#2563eb";
  const baseKimono = isMountain ? "#dc2626" : isAutumn ? "#b91c1c" : "#ef4444";
  const basePipe = isMountain ? "#b45309" : isAutumn ? "#78350f" : "#d97706";
  const skin = resolveColor("#fed7aa", isOpponent);

  let hair = resolveColor(baseHair, isOpponent);
  let vest = resolveColor(baseVest, isOpponent);
  const kimono = resolveColor(baseKimono, isOpponent);
  let pipe = resolveColor(basePipe, isOpponent);
  const outline = resolveColor("rgba(15, 23, 42, 0.8)", isOpponent);

  if (taunting) {
    const coinHue = (actionFrameCounter * 16) % 360;
    pipe = resolveColor(`hsl(${coinHue}, 90%, 55%)`, isOpponent);
  } else if (isRoll) {
    hair = resolveColor(baseHair, isOpponent, 0.45);
    vest = resolveColor(baseVest, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Giant smoking pipe (kiseru) slung over back / shoulder
  ctx.beginPath();
  ctx.moveTo(posX - 0.45 * dir * w, y - 0.25 * h);
  ctx.lineTo(posX - 0.75 * dir * w, y - 0.92 * h);
  ctx.strokeStyle = pipe;
  ctx.lineWidth = Math.max(3, 0.08 * w);
  ctx.stroke();
  // Pipe bowl & golden tip
  ctx.beginPath();
  ctx.arc(
    posX - 0.78 * dir * w,
    y - 0.95 * h,
    Math.max(2, 0.07 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#facc15";
  ctx.fill();

  // White hakama pants & sandals
  ctx.beginPath();
  ctx.moveTo(posX - 0.3 * dir * w, y - 0.28 * h);
  ctx.lineTo(posX - 0.15 * dir * w, y);
  ctx.lineTo(posX - 0.42 * dir * w, y);
  ctx.lineTo(posX - 0.4 * dir * w, y - 0.28 * h);
  ctx.closePath();
  ctx.fillStyle = "#f8fafc";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX + 0.08 * dir * w, y - 0.28 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y);
  ctx.lineTo(posX + 0.48 * dir * w, y);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.28 * h);
  ctx.closePath();
  ctx.fillStyle = "#f8fafc";
  ctx.fill();

  // Blue Haori Vest & Red Kimono
  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.28 * dir * w, y - 0.28 * h);
  ctx.lineTo(posX - 0.28 * dir * w, y - 0.28 * h);
  ctx.closePath();
  ctx.fillStyle = vest;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Red inner kimono V-neck
  ctx.beginPath();
  ctx.moveTo(posX - 0.12 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.12 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX, y - 0.48 * h);
  ctx.closePath();
  ctx.fillStyle = kimono;
  ctx.fill();

  // Head & Face
  ctx.beginPath();
  ctx.arc(posX + 0.05 * dir * w, y - 0.72 * h, 0.24 * w, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();

  // White Headband (Hachimaki)
  ctx.beginPath();
  ctx.moveTo(posX - 0.2 * dir * w, y - 0.77 * h);
  ctx.lineTo(posX + 0.32 * dir * w, y - 0.77 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX - 0.18 * dir * w, y - 0.72 * h);
  ctx.closePath();
  ctx.fillStyle = "#f8fafc";
  ctx.fill();

  // Giant shock of bright blue spiky hair!
  ctx.beginPath();
  ctx.moveTo(posX - 0.25 * dir * w, y - 0.78 * h);
  ctx.lineTo(posX - 0.5 * dir * w, y - 0.95 * h);
  ctx.lineTo(posX - 0.3 * dir * w, y - 1.05 * h);
  ctx.lineTo(posX - 0.05 * dir * w, y - 1.15 * h);
  ctx.lineTo(posX + 0.2 * dir * w, y - 1.08 * h);
  ctx.lineTo(posX + 0.45 * dir * w, y - 0.95 * h);
  ctx.lineTo(posX + 0.28 * dir * w, y - 0.78 * h);
  ctx.closePath();
  ctx.fillStyle = hair;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Expressive eyes
  ctx.beginPath();
  ctx.arc(
    posX + 0.15 * dir * w,
    y - 0.7 * h,
    Math.max(1.5, 0.035 * h),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#0f172a";
  ctx.fill();

  // Player emblem badge
  ctx.beginPath();
  ctx.arc(posX, y - 0.42 * h, Math.max(1.5, 0.06 * w), 0, Math.PI * 2);
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
