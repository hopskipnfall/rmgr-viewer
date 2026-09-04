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

/**
 * 25. PEPPY HARE (0x42):
 * Veteran Star Fox hare with long upright ears, flight suit,
 * pilot vest, communicator headset, and wise moustache.
 */
export function drawPeppyPolygons(
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
    const earTwitch =
      Math.sin(actionFrameCounter * 0.4) * 0.15 * (facingRight ? 1 : -1);
    ctx.translate(posX, centerY);
    ctx.rotate(earTwitch);
    ctx.translate(-posX, -centerY);
  }

  const isMountain = backgroundTheme === "mountain";
  const isAutumn = backgroundTheme === "autumn";

  const baseFur = isMountain ? "#d4d4d8" : isAutumn ? "#a1a1aa" : "#e2e8f0";
  const baseVest = isMountain ? "#dc2626" : isAutumn ? "#b91c1c" : "#f1f5f9";
  const basePants = isMountain ? "#4d7c0f" : isAutumn ? "#3f6212" : "#65a30d";
  const baseBoots = isMountain ? "#94a3b8" : isAutumn ? "#64748b" : "#cbd5e1";
  const basePink = isMountain ? "#f472b6" : isAutumn ? "#db2777" : "#f472b6";

  let fur = resolveColor(baseFur, isOpponent);
  let vest = resolveColor(baseVest, isOpponent);
  const pants = resolveColor(basePants, isOpponent);
  const boots = resolveColor(baseBoots, isOpponent);
  let pink = resolveColor(basePink, isOpponent);
  const outline = resolveColor("rgba(15, 23, 42, 0.8)", isOpponent);

  if (taunting) {
    const comHue = (actionFrameCounter * 14) % 360;
    pink = resolveColor(`hsl(${comHue}, 85%, 60%)`, isOpponent);
  } else if (isRoll) {
    fur = resolveColor(baseFur, isOpponent, 0.45);
    vest = resolveColor(baseVest, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Pilot boots
  ctx.beginPath();
  ctx.moveTo(posX - 0.28 * dir * w, y - 0.25 * h);
  ctx.lineTo(posX - 0.12 * dir * w, y);
  ctx.lineTo(posX - 0.4 * dir * w, y);
  ctx.lineTo(posX - 0.38 * dir * w, y - 0.25 * h);
  ctx.closePath();
  ctx.fillStyle = boots;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX + 0.08 * dir * w, y - 0.25 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y);
  ctx.lineTo(posX + 0.48 * dir * w, y);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.25 * h);
  ctx.closePath();
  ctx.fillStyle = boots;
  ctx.fill();

  // Green flight suit trousers
  ctx.beginPath();
  ctx.moveTo(posX - 0.32 * dir * w, y - 0.48 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.48 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.22 * h);
  ctx.lineTo(posX - 0.28 * dir * w, y - 0.22 * h);
  ctx.closePath();
  ctx.fillStyle = pants;
  ctx.fill();

  // White flight vest with red trim
  ctx.beginPath();
  ctx.moveTo(posX - 0.32 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.45 * h);
  ctx.lineTo(posX - 0.3 * dir * w, y - 0.45 * h);
  ctx.closePath();
  ctx.fillStyle = vest;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Red shoulder pads
  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX - 0.15 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX - 0.25 * dir * w, y - 0.6 * h);
  ctx.closePath();
  ctx.fillStyle = "#ef4444";
  ctx.fill();

  // Peppy Head & Muzzle
  ctx.beginPath();
  ctx.arc(posX + 0.05 * dir * w, y - 0.76 * h, 0.22 * w, 0, Math.PI * 2);
  ctx.fillStyle = fur;
  ctx.fill();

  // Long upright rabbit ears
  ctx.beginPath();
  ctx.moveTo(posX - 0.12 * dir * w, y - 0.82 * h);
  ctx.lineTo(posX - 0.25 * dir * w, y - 1.15 * h);
  ctx.lineTo(posX - 0.02 * dir * w, y - 1.15 * h);
  ctx.lineTo(posX, y - 0.82 * h);
  ctx.closePath();
  ctx.fillStyle = fur;
  ctx.fill();
  // Pink inner ear
  ctx.beginPath();
  ctx.moveTo(posX - 0.1 * dir * w, y - 0.86 * h);
  ctx.lineTo(posX - 0.2 * dir * w, y - 1.1 * h);
  ctx.lineTo(posX - 0.05 * dir * w, y - 1.1 * h);
  ctx.closePath();
  ctx.fillStyle = pink;
  ctx.fill();

  // Front ear
  ctx.beginPath();
  ctx.moveTo(posX + 0.08 * dir * w, y - 0.82 * h);
  ctx.lineTo(posX + 0.15 * dir * w, y - 1.18 * h);
  ctx.lineTo(posX + 0.32 * dir * w, y - 1.12 * h);
  ctx.lineTo(posX + 0.2 * dir * w, y - 0.82 * h);
  ctx.closePath();
  ctx.fillStyle = fur;
  ctx.fill();
  // Pink inner ear front
  ctx.beginPath();
  ctx.moveTo(posX + 0.12 * dir * w, y - 0.86 * h);
  ctx.lineTo(posX + 0.18 * dir * w, y - 1.12 * h);
  ctx.lineTo(posX + 0.28 * dir * w, y - 1.08 * h);
  ctx.closePath();
  ctx.fillStyle = pink;
  ctx.fill();

  // Headset band & communicator earpiece
  ctx.beginPath();
  ctx.arc(
    posX - 0.05 * dir * w,
    y - 0.78 * h,
    Math.max(2, 0.06 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#facc15";
  ctx.fill();
  // Microphone arm
  ctx.beginPath();
  ctx.moveTo(posX - 0.05 * dir * w, y - 0.78 * h);
  ctx.lineTo(posX + 0.18 * dir * w, y - 0.7 * h);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Veteran Moustache & Muzzle
  ctx.beginPath();
  ctx.moveTo(posX + 0.05 * dir * w, y - 0.74 * h);
  ctx.lineTo(posX + 0.28 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.15 * dir * w, y - 0.65 * h);
  ctx.closePath();
  ctx.fillStyle = "#cbd5e1";
  ctx.fill();

  // Player emblem badge
  ctx.beginPath();
  ctx.arc(posX, y - 0.55 * h, Math.max(1.5, 0.06 * w), 0, Math.PI * 2);
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
 * 26. SLIPPY TOAD (0x43):
 * Star Fox amphibian mechanic with bulbous frog eyes, blue cap,
 * red vest over beige suit, and wrench holster.
 */
export function drawSlippyPolygons(
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
  if (taunting) {
    const frogHop =
      Math.abs(Math.sin(actionFrameCounter * 0.35)) * 0.08 * heightPx;
    ctx.translate(0, -frogHop);
  }

  const isMountain = backgroundTheme === "mountain";
  const isAutumn = backgroundTheme === "autumn";

  const baseSkin = isMountain ? "#15803d" : isAutumn ? "#166534" : "#22c55e";
  const baseCap = isMountain ? "#1e40af" : isAutumn ? "#1e3a8a" : "#2563eb";
  const baseVest = isMountain ? "#dc2626" : isAutumn ? "#b91c1c" : "#ef4444";
  const baseSuit = isMountain ? "#d4d4d8" : isAutumn ? "#a1a1aa" : "#e2e8f0";

  let skin = resolveColor(baseSkin, isOpponent);
  let cap = resolveColor(baseCap, isOpponent);
  let vest = resolveColor(baseVest, isOpponent);
  const suit = resolveColor(baseSuit, isOpponent);
  const outline = resolveColor("rgba(15, 23, 42, 0.8)", isOpponent);

  if (taunting) {
    const eyeHue = (actionFrameCounter * 16) % 360;
    cap = resolveColor(`hsl(${eyeHue}, 85%, 50%)`, isOpponent);
  } else if (isRoll) {
    skin = resolveColor(baseSkin, isOpponent, 0.45);
    vest = resolveColor(baseVest, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Frog webbed feet
  ctx.beginPath();
  ctx.moveTo(posX - 0.32 * dir * w, y - 0.2 * h);
  ctx.lineTo(posX - 0.12 * dir * w, y);
  ctx.lineTo(posX - 0.45 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = skin;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX + 0.08 * dir * w, y - 0.2 * h);
  ctx.lineTo(posX + 0.48 * dir * w, y);
  ctx.lineTo(posX + 0.15 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = skin;
  ctx.fill();

  // Chubby body & suit
  ctx.beginPath();
  ctx.arc(posX, y - 0.45 * h, 0.42 * w, 0, Math.PI * 2);
  ctx.fillStyle = suit;
  ctx.fill();

  // Red flight vest
  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.35 * h);
  ctx.lineTo(posX - 0.28 * dir * w, y - 0.35 * h);
  ctx.closePath();
  ctx.fillStyle = vest;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Frog Head & Wide Mouth
  ctx.beginPath();
  ctx.arc(posX + 0.05 * dir * w, y - 0.7 * h, 0.3 * w, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Wide smiling frog mouth line
  ctx.beginPath();
  ctx.moveTo(posX - 0.1 * dir * w, y - 0.62 * h);
  ctx.lineTo(posX + 0.32 * dir * w, y - 0.64 * h);
  ctx.strokeStyle = "#14532d";
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Blue mechanic flight cap
  ctx.beginPath();
  ctx.moveTo(posX - 0.25 * dir * w, y - 0.82 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.82 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.76 * h);
  ctx.lineTo(posX - 0.22 * dir * w, y - 0.76 * h);
  ctx.closePath();
  ctx.fillStyle = cap;
  ctx.fill();

  // Big bulbous frog eyes popping above head
  ctx.beginPath();
  ctx.arc(posX - 0.08 * dir * w, y - 0.88 * h, 0.1 * w, 0, Math.PI * 2);
  ctx.arc(posX + 0.18 * dir * w, y - 0.88 * h, 0.1 * w, 0, Math.PI * 2);
  ctx.fillStyle = "#facc15";
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Horizontal frog pupils
  ctx.beginPath();
  ctx.moveTo(posX - 0.14 * dir * w, y - 0.88 * h);
  ctx.lineTo(posX - 0.02 * dir * w, y - 0.88 * h);
  ctx.moveTo(posX + 0.12 * dir * w, y - 0.88 * h);
  ctx.lineTo(posX + 0.24 * dir * w, y - 0.88 * h);
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Player emblem badge
  ctx.beginPath();
  ctx.arc(posX, y - 0.45 * h, Math.max(1.5, 0.06 * w), 0, Math.PI * 2);
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
 * 27. METAL LUIGI (0x45):
 * Full reflective polished chrome/steel polygon finish with Luigi's
 * tall slender proportions and specular steel facets.
 */
export function drawMetalLuigiPolygons(
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
    inCombo && !taunting ? x + (actionFrameCounter % 2 === 0 ? 1.0 : -1.0) : x;
  const facingRight = effectiveDir >= 0;
  if (taunting) {
    const shineSpin = actionFrameCounter * 0.15 * (facingRight ? 1 : -1);
    ctx.translate(posX, centerY);
    ctx.rotate(shineSpin);
    ctx.translate(-posX, -centerY);
  }

  const isMountain = backgroundTheme === "mountain";
  const isAutumn = backgroundTheme === "autumn";

  // Polished chrome faceted tones
  const chromeLight = isMountain ? "#f1f5f9" : isAutumn ? "#fef3c7" : "#f8fafc";
  const chromeMid = isMountain ? "#cbd5e1" : isAutumn ? "#d4d4d8" : "#cbd5e1";
  const chromeDark = isMountain ? "#64748b" : isAutumn ? "#52525b" : "#475569";
  const chromeDeep = isMountain ? "#334155" : isAutumn ? "#27272a" : "#1e293b";

  let light = resolveColor(chromeLight, isOpponent);
  let mid = resolveColor(chromeMid, isOpponent);
  const dark = resolveColor(chromeDark, isOpponent);
  const deep = resolveColor(chromeDeep, isOpponent);
  const outline = resolveColor("rgba(15, 23, 42, 0.85)", isOpponent);

  if (taunting) {
    const sparkle = (actionFrameCounter * 20) % 360;
    light = resolveColor(`hsl(${sparkle}, 80%, 80%)`, isOpponent);
  } else if (isRoll) {
    mid = resolveColor(chromeMid, isOpponent, 0.45);
    light = resolveColor(chromeLight, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Metal Boots
  ctx.beginPath();
  ctx.moveTo(posX - 0.28 * dir * w, y - 0.22 * h);
  ctx.lineTo(posX - 0.12 * dir * w, y);
  ctx.lineTo(posX - 0.38 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = dark;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX + 0.08 * dir * w, y - 0.22 * h);
  ctx.lineTo(posX + 0.42 * dir * w, y);
  ctx.lineTo(posX + 0.15 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = mid;
  ctx.fill();

  // Metal Overalls (taller, leaner Luigi frame)
  ctx.beginPath();
  ctx.moveTo(posX - 0.25 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.22 * h);
  ctx.lineTo(posX - 0.22 * dir * w, y - 0.22 * h);
  ctx.closePath();
  ctx.fillStyle = deep;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Specular reflection band across torso
  ctx.beginPath();
  ctx.moveTo(posX - 0.22 * dir * w, y - 0.58 * h);
  ctx.lineTo(posX + 0.1 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.48 * h);
  ctx.lineTo(posX - 0.05 * dir * w, y - 0.42 * h);
  ctx.closePath();
  ctx.fillStyle = light;
  ctx.fill();

  // Metal Luigi Head & Cap
  ctx.beginPath();
  ctx.arc(posX + 0.04 * dir * w, y - 0.76 * h, 0.22 * w, 0, Math.PI * 2);
  ctx.fillStyle = mid;
  ctx.fill();

  // Luigi's tall cap
  ctx.beginPath();
  ctx.moveTo(posX - 0.2 * dir * w, y - 0.82 * h);
  ctx.lineTo(posX + 0.05 * dir * w, y - 1.02 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.88 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.78 * h);
  ctx.closePath();
  ctx.fillStyle = dark;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Cap peak visor
  ctx.beginPath();
  ctx.moveTo(posX + 0.08 * dir * w, y - 0.82 * h);
  ctx.lineTo(posX + 0.42 * dir * w, y - 0.8 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.76 * h);
  ctx.closePath();
  ctx.fillStyle = light;
  ctx.fill();

  // Metallic 'L' emblem on cap
  ctx.beginPath();
  ctx.arc(
    posX + 0.12 * dir * w,
    y - 0.88 * h,
    Math.max(1.5, 0.06 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = light;
  ctx.fill();

  // Metal Moustache
  ctx.beginPath();
  ctx.moveTo(posX + 0.02 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.28 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.2 * dir * w, y - 0.66 * h);
  ctx.closePath();
  ctx.fillStyle = deep;
  ctx.fill();

  // Player emblem badge
  ctx.beginPath();
  ctx.arc(posX, y - 0.48 * h, Math.max(1.5, 0.06 * w), 0, Math.PI * 2);
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
 * 28. DR. LUIGI (0x4b):
 * Luigi in a white lab doctor's coat, green tie, head mirror reflector,
 * and holding an iconic "L"-shaped megavitamin capsule.
 */
export function drawDrLuigiPolygons(
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
    inCombo && !taunting ? x + (actionFrameCounter % 2 === 0 ? 1.0 : -1.0) : x;
  const facingRight = effectiveDir >= 0;
  if (taunting) {
    const pillToss =
      Math.sin(actionFrameCounter * 0.4) * 0.15 * (facingRight ? 1 : -1);
    ctx.translate(posX, centerY);
    ctx.rotate(pillToss);
    ctx.translate(-posX, -centerY);
  }

  const isMountain = backgroundTheme === "mountain";
  const isAutumn = backgroundTheme === "autumn";

  const baseCoat = isMountain ? "#f1f5f9" : isAutumn ? "#fef3c7" : "#ffffff";
  const baseGreen = isMountain ? "#15803d" : isAutumn ? "#166534" : "#16a34a";
  const baseMirror = isMountain ? "#94a3b8" : isAutumn ? "#cbd5e1" : "#e2e8f0";
  const basePillCyan = isMountain
    ? "#06b6d4"
    : isAutumn
      ? "#0891b2"
      : "#06b6d4";
  const basePillYellow = isMountain
    ? "#eab308"
    : isAutumn
      ? "#ca8a04"
      : "#facc15";
  const skin = resolveColor("#fed7aa", isOpponent);

  let coat = resolveColor(baseCoat, isOpponent);
  let green = resolveColor(baseGreen, isOpponent);
  const mirror = resolveColor(baseMirror, isOpponent);
  let pillCyan = resolveColor(basePillCyan, isOpponent);
  const pillYellow = resolveColor(basePillYellow, isOpponent);
  const outline = resolveColor("rgba(15, 23, 42, 0.8)", isOpponent);

  if (taunting) {
    const pVal = (actionFrameCounter * 15) % 360;
    pillCyan = resolveColor(`hsl(${pVal}, 90%, 55%)`, isOpponent);
  } else if (isRoll) {
    coat = resolveColor(baseCoat, isOpponent, 0.45);
    green = resolveColor(baseGreen, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Holding "L"-shaped megavitamin capsule floating beside hand
  ctx.beginPath();
  // Vertical stem of L
  ctx.moveTo(posX + 0.35 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.52 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.52 * dir * w, y - 0.48 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.48 * h);
  ctx.closePath();
  ctx.fillStyle = pillCyan;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();
  // Horizontal foot of L
  ctx.beginPath();
  ctx.moveTo(posX + 0.52 * dir * w, y - 0.6 * h);
  ctx.lineTo(posX + 0.72 * dir * w, y - 0.6 * h);
  ctx.lineTo(posX + 0.72 * dir * w, y - 0.48 * h);
  ctx.lineTo(posX + 0.52 * dir * w, y - 0.48 * h);
  ctx.closePath();
  ctx.fillStyle = pillYellow;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Dark shoes
  ctx.beginPath();
  ctx.moveTo(posX - 0.28 * dir * w, y - 0.18 * h);
  ctx.lineTo(posX - 0.12 * dir * w, y);
  ctx.lineTo(posX - 0.38 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = "#334155";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX + 0.08 * dir * w, y - 0.18 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y);
  ctx.lineTo(posX + 0.15 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = "#334155";
  ctx.fill();

  // Dark trousers under coat
  ctx.beginPath();
  ctx.moveTo(posX - 0.22 * dir * w, y - 0.35 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.35 * h);
  ctx.lineTo(posX + 0.2 * dir * w, y - 0.18 * h);
  ctx.lineTo(posX - 0.2 * dir * w, y - 0.18 * h);
  ctx.closePath();
  ctx.fillStyle = "#1e293b";
  ctx.fill();

  // White Lab Doctor's Coat
  ctx.beginPath();
  ctx.moveTo(posX - 0.28 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.28 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.25 * h);
  ctx.lineTo(posX - 0.32 * dir * w, y - 0.25 * h);
  ctx.closePath();
  ctx.fillStyle = coat;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Green tie & collar
  ctx.beginPath();
  ctx.moveTo(posX - 0.06 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.06 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX, y - 0.48 * h);
  ctx.closePath();
  ctx.fillStyle = green;
  ctx.fill();

  // Head & Face
  ctx.beginPath();
  ctx.arc(posX + 0.05 * dir * w, y - 0.76 * h, 0.22 * w, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();

  // Head Mirror reflector
  ctx.beginPath();
  ctx.arc(
    posX + 0.22 * dir * w,
    y - 0.85 * h,
    Math.max(2, 0.07 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = mirror;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();
  // Headband for mirror
  ctx.beginPath();
  ctx.moveTo(posX - 0.15 * dir * w, y - 0.84 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.84 * h);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Doctor Luigi hair & moustache
  ctx.beginPath();
  ctx.moveTo(posX - 0.18 * dir * w, y - 0.82 * h);
  ctx.lineTo(posX + 0.05 * dir * w, y - 0.98 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.88 * h);
  ctx.closePath();
  ctx.fillStyle = "#451a03";
  ctx.fill();

  // Moustache
  ctx.beginPath();
  ctx.moveTo(posX + 0.02 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.28 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.18 * dir * w, y - 0.66 * h);
  ctx.closePath();
  ctx.fillStyle = "#451a03";
  ctx.fill();

  // Player emblem badge
  ctx.beginPath();
  ctx.arc(posX, y - 0.48 * h, Math.max(1.5, 0.06 * w), 0, Math.PI * 2);
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
 * 29. EBISUMARU (0x46):
 * Goemon's jolly ninja sidekick with round face, rosy cheeks, topknot,
 * purple patterned ninja garb, and giant fan.
 */
export function drawEbisumaruPolygons(
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
    inCombo && !taunting ? x + (actionFrameCounter % 2 === 0 ? 1.5 : -1.5) : x;
  const facingRight = effectiveDir >= 0;
  if (taunting) {
    const fanFlutter =
      Math.sin(actionFrameCounter * 0.5) * 0.18 * (facingRight ? 1 : -1);
    ctx.translate(posX, centerY);
    ctx.rotate(fanFlutter);
    ctx.translate(-posX, -centerY);
  }

  const isMountain = backgroundTheme === "mountain";
  const isAutumn = backgroundTheme === "autumn";

  const baseGarb = isMountain ? "#6b21a8" : isAutumn ? "#581c87" : "#7e22ce";
  const baseSash = isMountain ? "#f59e0b" : isAutumn ? "#d97706" : "#fbbf24";
  const baseFan = isMountain ? "#facc15" : isAutumn ? "#eab308" : "#fde047";
  const skin = resolveColor("#fed7aa", isOpponent);

  let garb = resolveColor(baseGarb, isOpponent);
  let sash = resolveColor(baseSash, isOpponent);
  let fan = resolveColor(baseFan, isOpponent);
  const outline = resolveColor("rgba(15, 23, 42, 0.8)", isOpponent);

  if (taunting) {
    const fanHue = (actionFrameCounter * 16) % 360;
    fan = resolveColor(`hsl(${fanHue}, 95%, 55%)`, isOpponent);
  } else if (isRoll) {
    garb = resolveColor(baseGarb, isOpponent, 0.45);
    sash = resolveColor(baseSash, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Golden Folding War Fan (Tessen) in hand
  ctx.beginPath();
  ctx.moveTo(posX + 0.35 * dir * w, y - 0.45 * h);
  ctx.lineTo(posX + 0.68 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.78 * dir * w, y - 0.55 * h);
  ctx.closePath();
  ctx.fillStyle = fan;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Chubby ninja feet / sandals
  ctx.beginPath();
  ctx.moveTo(posX - 0.4 * dir * w, y - 0.15 * h);
  ctx.lineTo(posX - 0.15 * dir * w, y);
  ctx.lineTo(posX - 0.45 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = "#f8fafc";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX + 0.1 * dir * w, y - 0.15 * h);
  ctx.lineTo(posX + 0.45 * dir * w, y);
  ctx.lineTo(posX + 0.18 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = "#f8fafc";
  ctx.fill();

  // Very round, jolly purple ninja belly & body
  ctx.beginPath();
  ctx.arc(posX, y - 0.44 * h, 0.45 * w, 0, Math.PI * 2);
  ctx.fillStyle = garb;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Yellow twisted rope sash / belt
  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.35 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y - 0.35 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.28 * h);
  ctx.lineTo(posX - 0.32 * dir * w, y - 0.28 * h);
  ctx.closePath();
  ctx.fillStyle = sash;
  ctx.fill();

  // Round face & shaved head with topknot
  ctx.beginPath();
  ctx.arc(posX + 0.06 * dir * w, y - 0.72 * h, 0.28 * w, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Traditional samurai topknot (chonmage)
  ctx.beginPath();
  ctx.moveTo(posX + 0.02 * dir * w, y - 0.95 * h);
  ctx.lineTo(posX - 0.08 * dir * w, y - 1.08 * h);
  ctx.lineTo(posX + 0.15 * dir * w, y - 1.05 * h);
  ctx.closePath();
  ctx.fillStyle = "#0f172a";
  ctx.fill();

  // Rosy pink spiral cheeks
  ctx.beginPath();
  ctx.arc(
    posX + 0.24 * dir * w,
    y - 0.68 * h,
    Math.max(1.5, 0.05 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#f472b6";
  ctx.fill();

  // Squinty happy eyes
  ctx.beginPath();
  ctx.moveTo(posX + 0.12 * dir * w, y - 0.74 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.74 * h);
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Player emblem badge
  ctx.beginPath();
  ctx.arc(posX, y - 0.44 * h, Math.max(1.5, 0.06 * w), 0, Math.PI * 2);
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
 * 30. DRAGON KING (0x47):
 * The prototype Smash 64 fighter mannequin from "Kakuto-Geemu: Ryuoh"
 * with blocky wireframe facets, visor crosshairs, and digital test markings.
 */
export function drawDragonKingPolygons(
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
  if (taunting) {
    const pulseGrid = (Math.sin(actionFrameCounter * 0.3) + 1.0) * 0.05;
    ctx.translate(posX, centerY);
    ctx.scale(1.0 + pulseGrid, 1.0 + pulseGrid);
    ctx.translate(-posX, -centerY);
  }

  const isMountain = backgroundTheme === "mountain";
  const isAutumn = backgroundTheme === "autumn";

  // Muted prototype dummy / mannequin colors
  const baseMannequin = isMountain
    ? "#cbd5e1"
    : isAutumn
      ? "#d4d4d8"
      : "#e2e8f0";
  const baseJoint = isMountain ? "#475569" : isAutumn ? "#3f3f46" : "#64748b";
  const baseGrid = isMountain ? "#38bdf8" : isAutumn ? "#f59e0b" : "#22c55e";

  let mannequin = resolveColor(baseMannequin, isOpponent);
  const joint = resolveColor(baseJoint, isOpponent);
  let grid = resolveColor(baseGrid, isOpponent);
  const outline = resolveColor("rgba(15, 23, 42, 0.85)", isOpponent);

  if (taunting) {
    const gridHue = (actionFrameCounter * 15) % 360;
    grid = resolveColor(`hsl(${gridHue}, 90%, 55%)`, isOpponent);
  } else if (isRoll) {
    mannequin = resolveColor(baseMannequin, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Blocky Prototype Feet & Lower Legs
  ctx.beginPath();
  ctx.moveTo(posX - 0.28 * dir * w, y - 0.25 * h);
  ctx.lineTo(posX - 0.15 * dir * w, y);
  ctx.lineTo(posX - 0.4 * dir * w, y);
  ctx.lineTo(posX - 0.35 * dir * w, y - 0.25 * h);
  ctx.closePath();
  ctx.fillStyle = mannequin;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX + 0.08 * dir * w, y - 0.25 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y);
  ctx.lineTo(posX + 0.45 * dir * w, y);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.25 * h);
  ctx.closePath();
  ctx.fillStyle = mannequin;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Angular Blocky Pelvis & Knee Joints
  ctx.beginPath();
  ctx.arc(
    posX - 0.22 * dir * w,
    y - 0.28 * h,
    Math.max(1.5, 0.04 * w),
    0,
    Math.PI * 2,
  );
  ctx.arc(
    posX + 0.18 * dir * w,
    y - 0.28 * h,
    Math.max(1.5, 0.04 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = joint;
  ctx.fill();

  // Angular Faceted Mannequin Torso
  ctx.beginPath();
  ctx.moveTo(posX - 0.32 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.32 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.35 * h);
  ctx.lineTo(posX - 0.22 * dir * w, y - 0.35 * h);
  ctx.closePath();
  ctx.fillStyle = mannequin;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Wireframe test grid lines on torso
  ctx.beginPath();
  ctx.moveTo(posX - 0.28 * dir * w, y - 0.54 * h);
  ctx.lineTo(posX + 0.28 * dir * w, y - 0.54 * h);
  ctx.moveTo(posX, y - 0.72 * h);
  ctx.lineTo(posX, y - 0.35 * h);
  ctx.strokeStyle = grid;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Blocky Faceted Head
  ctx.beginPath();
  ctx.moveTo(posX - 0.18 * dir * w, y - 0.75 * h);
  ctx.lineTo(posX - 0.15 * dir * w, y - 0.95 * h);
  ctx.lineTo(posX + 0.2 * dir * w, y - 0.95 * h);
  ctx.lineTo(posX + 0.28 * dir * w, y - 0.75 * h);
  ctx.closePath();
  ctx.fillStyle = mannequin;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Prototype Crosshair / Target Visor
  ctx.beginPath();
  ctx.arc(
    posX + 0.08 * dir * w,
    y - 0.85 * h,
    Math.max(2, 0.07 * w),
    0,
    Math.PI * 2,
  );
  ctx.strokeStyle = grid;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(posX + 0.08 * dir * w, y - 0.92 * h);
  ctx.lineTo(posX + 0.08 * dir * w, y - 0.78 * h);
  ctx.moveTo(posX + (0.08 - 0.07) * dir * w, y - 0.85 * h);
  ctx.lineTo(posX + (0.08 + 0.07) * dir * w, y - 0.85 * h);
  ctx.stroke();

  // Player emblem badge
  ctx.beginPath();
  ctx.arc(posX, y - 0.45 * h, Math.max(1.5, 0.06 * w), 0, Math.PI * 2);
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
