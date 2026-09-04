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

/**
 * 17. KING DEDEDE (0x40):
 * Regal penguin with scarlet robe, fluffy zigzag trim, yellow beak,
 * blue pom-pom beanie, and massive wooden star hammer.
 */
export function drawDededePolygons(
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
  if (taunting) {
    const bellyBounce =
      Math.abs(Math.sin(actionFrameCounter * 0.3)) * 0.06 * heightPx;
    ctx.translate(0, -bellyBounce);
  }

  const isMountain = backgroundTheme === "mountain";
  const isAutumn = backgroundTheme === "autumn";

  const baseRobe = isMountain ? "#b91c1c" : isAutumn ? "#991b1b" : "#dc2626";
  const baseTrim = isMountain ? "#f1f5f9" : isAutumn ? "#fef3c7" : "#ffffff";
  const baseSkin = isMountain ? "#0284c7" : isAutumn ? "#0369a1" : "#0ea5e9";
  const baseBeak = isMountain ? "#f59e0b" : isAutumn ? "#d97706" : "#fbbf24";
  const baseCap = isMountain ? "#dc2626" : isAutumn ? "#b91c1c" : "#e11d48";
  const baseHammer = isMountain ? "#78350f" : isAutumn ? "#451a03" : "#92400e";

  let robe = resolveColor(baseRobe, isOpponent);
  const trim = resolveColor(baseTrim, isOpponent);
  let skin = resolveColor(baseSkin, isOpponent);
  let beak = resolveColor(baseBeak, isOpponent);
  const cap = resolveColor(baseCap, isOpponent);
  const hammer = resolveColor(baseHammer, isOpponent);
  const outline = resolveColor("rgba(15, 23, 42, 0.8)", isOpponent);

  if (taunting) {
    const starHue = (actionFrameCounter * 15) % 360;
    beak = resolveColor(`hsl(${starHue}, 95%, 55%)`, isOpponent);
  } else if (isRoll) {
    robe = resolveColor(baseRobe, isOpponent, 0.45);
    skin = resolveColor(baseSkin, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Giant wooden hammer slung on back
  ctx.beginPath();
  // Handle
  ctx.moveTo(posX - 0.45 * dir * w, y - 0.15 * h);
  ctx.lineTo(posX - 0.85 * dir * w, y - 0.9 * h);
  ctx.strokeStyle = "#b45309";
  ctx.lineWidth = Math.max(3, 0.08 * w);
  ctx.stroke();
  // Hammer head (large barrel/cylinder)
  ctx.beginPath();
  ctx.moveTo(posX - 0.65 * dir * w, y - 0.95 * h);
  ctx.lineTo(posX - 1.05 * dir * w, y - 0.85 * h);
  ctx.lineTo(posX - 0.95 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX - 0.55 * dir * w, y - 0.75 * h);
  ctx.closePath();
  ctx.fillStyle = hammer;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Golden Star emblem on hammer
  ctx.beginPath();
  ctx.arc(
    posX - 0.8 * dir * w,
    y - 0.8 * h,
    Math.max(2, 0.1 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#facc15";
  ctx.fill();

  // Large webbed yellow feet
  ctx.beginPath();
  ctx.moveTo(posX - 0.5 * dir * w, y - 0.12 * h);
  ctx.lineTo(posX - 0.2 * dir * w, y);
  ctx.lineTo(posX - 0.55 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = beak;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX + 0.1 * dir * w, y - 0.12 * h);
  ctx.lineTo(posX + 0.55 * dir * w, y);
  ctx.lineTo(posX + 0.15 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = beak;
  ctx.fill();

  // Plump Blue Penguin Body & Robe
  ctx.beginPath();
  ctx.arc(posX, y - 0.48 * h, 0.48 * w, 0, Math.PI * 2);
  ctx.fillStyle = robe;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Fluffy white/gold zigzag trim on robe
  ctx.beginPath();
  ctx.moveTo(posX - 0.25 * dir * w, y - 0.2 * h);
  ctx.lineTo(posX - 0.15 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.2 * h);
  ctx.lineTo(posX + 0.05 * dir * w, y - 0.15 * h);
  ctx.closePath();
  ctx.fillStyle = trim;
  ctx.fill();

  // Yellow/gold obi sash
  ctx.beginPath();
  ctx.moveTo(posX - 0.2 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX + 0.28 * dir * w, y - 0.35 * h);
  ctx.lineTo(posX - 0.18 * dir * w, y - 0.35 * h);
  ctx.closePath();
  ctx.fillStyle = "#f59e0b";
  ctx.fill();

  // Blue face
  ctx.beginPath();
  ctx.arc(posX + 0.1 * dir * w, y - 0.72 * h, 0.26 * w, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();

  // Dedede Regal Beanie Cap & Crown band
  ctx.beginPath();
  ctx.moveTo(posX - 0.2 * dir * w, y - 0.82 * h);
  ctx.lineTo(posX + 0.1 * dir * w, y - 0.98 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.82 * h);
  ctx.closePath();
  ctx.fillStyle = cap;
  ctx.fill();
  // Gold crown band
  ctx.beginPath();
  ctx.moveTo(posX - 0.22 * dir * w, y - 0.8 * h);
  ctx.lineTo(posX + 0.36 * dir * w, y - 0.8 * h);
  ctx.lineTo(posX + 0.34 * dir * w, y - 0.76 * h);
  ctx.lineTo(posX - 0.2 * dir * w, y - 0.76 * h);
  ctx.closePath();
  ctx.fillStyle = "#facc15";
  ctx.fill();
  // Fluffy white pom-pom ball
  ctx.beginPath();
  ctx.arc(
    posX + 0.1 * dir * w,
    y - 0.98 * h,
    Math.max(2, 0.08 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = trim;
  ctx.fill();

  // Big yellow bill / beak
  ctx.beginPath();
  ctx.moveTo(posX + 0.05 * dir * w, y - 0.74 * h);
  ctx.lineTo(posX + 0.48 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX + 0.08 * dir * w, y - 0.62 * h);
  ctx.closePath();
  ctx.fillStyle = beak;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Eyes
  ctx.beginPath();
  ctx.arc(
    posX + 0.15 * dir * w,
    y - 0.76 * h,
    Math.max(1.5, 0.035 * h),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#0f172a";
  ctx.fill();

  // Player emblem badge
  ctx.beginPath();
  ctx.arc(posX, y - 0.48 * h, Math.max(2, 0.08 * w), 0, Math.PI * 2);
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
 * 18. BANJO & KAZOOIE (0x44):
 * Honey bear with yellow shorts, blue backpack, shark tooth necklace,
 * and Kazooie popping out with red/gold crest feathers.
 */
export function drawBanjoPolygons(
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
    const kazooieFlap =
      Math.sin(actionFrameCounter * 0.4) * 0.18 * (facingRight ? 1 : -1);
    ctx.translate(posX, centerY);
    ctx.rotate(kazooieFlap);
    ctx.translate(-posX, -centerY);
  }

  const isMountain = backgroundTheme === "mountain";
  const isAutumn = backgroundTheme === "autumn";

  const baseFur = isMountain ? "#78350f" : isAutumn ? "#451a03" : "#92400e";
  const baseSnout = isMountain ? "#fef08a" : isAutumn ? "#fde047" : "#fef08a";
  const baseShorts = isMountain ? "#eab308" : isAutumn ? "#ca8a04" : "#facc15";
  const basePack = isMountain ? "#1d4ed8" : isAutumn ? "#1e3a8a" : "#2563eb";
  const baseKazooie = isMountain ? "#dc2626" : isAutumn ? "#b91c1c" : "#ef4444";
  const baseFeather = isMountain ? "#fbbf24" : isAutumn ? "#f59e0b" : "#facc15";

  let fur = resolveColor(baseFur, isOpponent);
  const snout = resolveColor(baseSnout, isOpponent);
  let shorts = resolveColor(baseShorts, isOpponent);
  const pack = resolveColor(basePack, isOpponent);
  let kazooie = resolveColor(baseKazooie, isOpponent);
  const feather = resolveColor(baseFeather, isOpponent);
  const outline = resolveColor("rgba(15, 23, 42, 0.8)", isOpponent);

  if (taunting) {
    const flapHue = (actionFrameCounter * 14) % 360;
    kazooie = resolveColor(`hsl(${flapHue}, 90%, 50%)`, isOpponent);
  } else if (isRoll) {
    fur = resolveColor(baseFur, isOpponent, 0.45);
    kazooie = resolveColor(baseKazooie, isOpponent, 0.45);
    shorts = resolveColor(baseShorts, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Blue Backpack on back
  ctx.beginPath();
  ctx.moveTo(posX - 0.1 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX - 0.48 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX - 0.42 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX - 0.05 * dir * w, y - 0.44 * h);
  ctx.closePath();
  ctx.fillStyle = pack;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Kazooie head popping out of backpack
  ctx.beginPath();
  ctx.moveTo(posX - 0.3 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX - 0.4 * dir * w, y - 0.95 * h);
  ctx.lineTo(posX - 0.15 * dir * w, y - 0.92 * h);
  ctx.lineTo(posX - 0.15 * dir * w, y - 0.72 * h);
  ctx.closePath();
  ctx.fillStyle = kazooie;
  ctx.fill();

  // Kazooie yellow crest feathers
  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.95 * h);
  ctx.lineTo(posX - 0.5 * dir * w, y - 1.05 * h);
  ctx.lineTo(posX - 0.25 * dir * w, y - 0.98 * h);
  ctx.closePath();
  ctx.fillStyle = feather;
  ctx.fill();

  // Kazooie beak
  ctx.beginPath();
  ctx.moveTo(posX - 0.15 * dir * w, y - 0.92 * h);
  ctx.lineTo(posX + 0.08 * dir * w, y - 0.88 * h);
  ctx.lineTo(posX - 0.15 * dir * w, y - 0.84 * h);
  ctx.closePath();
  ctx.fillStyle = feather;
  ctx.fill();

  // Banjo Bear Feet & Legs
  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.25 * h);
  ctx.lineTo(posX - 0.4 * dir * w, y);
  ctx.lineTo(posX - 0.15 * dir * w, y);
  ctx.lineTo(posX - 0.15 * dir * w, y - 0.25 * h);
  ctx.closePath();
  ctx.fillStyle = fur;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX + 0.1 * dir * w, y - 0.25 * h);
  ctx.lineTo(posX + 0.1 * dir * w, y);
  ctx.lineTo(posX + 0.4 * dir * w, y);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.25 * h);
  ctx.closePath();
  ctx.fillStyle = fur;
  ctx.fill();

  // Yellow shorts
  ctx.beginPath();
  ctx.moveTo(posX - 0.38 * dir * w, y - 0.45 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.45 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y - 0.25 * h);
  ctx.lineTo(posX - 0.38 * dir * w, y - 0.25 * h);
  ctx.closePath();
  ctx.fillStyle = shorts;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Black belt & silver buckle
  ctx.beginPath();
  ctx.moveTo(posX - 0.36 * dir * w, y - 0.44 * h);
  ctx.lineTo(posX + 0.34 * dir * w, y - 0.44 * h);
  ctx.lineTo(posX + 0.34 * dir * w, y - 0.4 * h);
  ctx.lineTo(posX - 0.36 * dir * w, y - 0.4 * h);
  ctx.closePath();
  ctx.fillStyle = "#1e293b";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(posX, y - 0.42 * h, Math.max(1.5, 0.04 * w), 0, Math.PI * 2);
  ctx.fillStyle = "#e2e8f0";
  ctx.fill();

  // Banjo Bear Torso
  ctx.beginPath();
  ctx.moveTo(posX - 0.32 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.45 * h);
  ctx.lineTo(posX - 0.32 * dir * w, y - 0.45 * h);
  ctx.closePath();
  ctx.fillStyle = fur;
  ctx.fill();

  // Shark tooth necklace
  ctx.beginPath();
  ctx.moveTo(posX - 0.15 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX, y - 0.58 * h);
  ctx.lineTo(posX + 0.15 * dir * w, y - 0.65 * h);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(posX - 0.05 * dir * w, y - 0.58 * h);
  ctx.lineTo(posX, y - 0.52 * h);
  ctx.lineTo(posX + 0.05 * dir * w, y - 0.58 * h);
  ctx.closePath();
  ctx.fillStyle = "#f8fafc";
  ctx.fill();

  // Banjo Head & Ears
  ctx.beginPath();
  ctx.arc(posX + 0.08 * dir * w, y - 0.76 * h, 0.24 * w, 0, Math.PI * 2);
  ctx.fillStyle = fur;
  ctx.fill();
  // Ears
  ctx.beginPath();
  ctx.arc(posX - 0.08 * dir * w, y - 0.88 * h, 0.08 * w, 0, Math.PI * 2);
  ctx.arc(posX + 0.22 * dir * w, y - 0.88 * h, 0.08 * w, 0, Math.PI * 2);
  ctx.fillStyle = fur;
  ctx.fill();

  // Snout & black nose
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.22 * dir * w,
    y - 0.74 * h,
    0.14 * w,
    0.09 * h,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = snout;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(
    posX + 0.32 * dir * w,
    y - 0.76 * h,
    Math.max(1.5, 0.04 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#0f172a";
  ctx.fill();

  // Player color badge
  ctx.beginPath();
  ctx.arc(
    posX - 0.25 * dir * w,
    y - 0.55 * h,
    Math.max(1.5, 0.06 * w),
    0,
    Math.PI * 2,
  );
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
 * 19. CRASH BANDICOOT (0x48):
 * Bright orange marsupial with wild mohawk crest, toothy grin,
 * blue denim shorts, and big red sneakers.
 */
export function drawCrashPolygons(
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
    // Classic Crash victory dance spin / wobbly pelvis
    const wobble =
      Math.sin(actionFrameCounter * 0.3) * 0.15 * (facingRight ? 1 : -1);
    ctx.translate(posX, centerY);
    ctx.rotate(wobble);
    ctx.translate(-posX, -centerY);
  }

  const isMountain = backgroundTheme === "mountain";
  const isAutumn = backgroundTheme === "autumn";

  const baseOrange = isMountain ? "#ea580c" : isAutumn ? "#c2410c" : "#f97316";
  const baseChest = isMountain ? "#fed7aa" : isAutumn ? "#ffedd5" : "#fdba74";
  const basePants = isMountain ? "#2563eb" : isAutumn ? "#1d4ed8" : "#3b82f6";
  const baseShoes = isMountain ? "#dc2626" : isAutumn ? "#b91c1c" : "#ef4444";
  const baseHair = isMountain ? "#78350f" : isAutumn ? "#451a03" : "#92400e";

  let orange = resolveColor(baseOrange, isOpponent);
  const chest = resolveColor(baseChest, isOpponent);
  let pants = resolveColor(basePants, isOpponent);
  let shoes = resolveColor(baseShoes, isOpponent);
  const hair = resolveColor(baseHair, isOpponent);
  const outline = resolveColor("rgba(15, 23, 42, 0.8)", isOpponent);

  if (taunting) {
    const shoeHue = (actionFrameCounter * 16) % 360;
    shoes = resolveColor(`hsl(${shoeHue}, 85%, 50%)`, isOpponent);
  } else if (isRoll) {
    orange = resolveColor(baseOrange, isOpponent, 0.45);
    pants = resolveColor(basePants, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Big Chunky Red Sneakers
  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.18 * h);
  ctx.lineTo(posX - 0.1 * dir * w, y);
  ctx.lineTo(posX - 0.5 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = shoes;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX + 0.1 * dir * w, y - 0.18 * h);
  ctx.lineTo(posX + 0.55 * dir * w, y);
  ctx.lineTo(posX + 0.15 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = shoes;
  ctx.fill();

  // Blue Denim Shorts
  ctx.beginPath();
  ctx.moveTo(posX - 0.3 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.2 * h);
  ctx.lineTo(posX - 0.32 * dir * w, y - 0.2 * h);
  ctx.closePath();
  ctx.fillStyle = pants;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Torso (slender top V-shape)
  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX - 0.22 * dir * w, y - 0.42 * h);
  ctx.closePath();
  ctx.fillStyle = orange;
  ctx.fill();

  // Light tan chest patch
  ctx.beginPath();
  ctx.moveTo(posX - 0.15 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.2 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.1 * dir * w, y - 0.44 * h);
  ctx.lineTo(posX - 0.08 * dir * w, y - 0.44 * h);
  ctx.closePath();
  ctx.fillStyle = chest;
  ctx.fill();

  // Wild spiky mohawk crest
  ctx.beginPath();
  ctx.moveTo(posX - 0.15 * dir * w, y - 0.88 * h);
  ctx.lineTo(posX - 0.25 * dir * w, y - 1.05 * h);
  ctx.lineTo(posX - 0.05 * dir * w, y - 0.94 * h);
  ctx.lineTo(posX + 0.05 * dir * w, y - 1.08 * h);
  ctx.lineTo(posX + 0.18 * dir * w, y - 0.9 * h);
  ctx.closePath();
  ctx.fillStyle = hair;
  ctx.fill();

  // Head & Big Cheeks
  ctx.beginPath();
  ctx.moveTo(posX - 0.22 * dir * w, y - 0.88 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.88 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX - 0.15 * dir * w, y - 0.7 * h);
  ctx.closePath();
  ctx.fillStyle = orange;
  ctx.fill();

  // Big Expressive Muzzle & Toothy Grin
  ctx.beginPath();
  ctx.moveTo(posX - 0.05 * dir * w, y - 0.75 * h);
  ctx.lineTo(posX + 0.48 * dir * w, y - 0.74 * h);
  ctx.lineTo(posX + 0.4 * dir * w, y - 0.62 * h);
  ctx.lineTo(posX, y - 0.64 * h);
  ctx.closePath();
  ctx.fillStyle = chest;
  ctx.fill();

  // Big black triangular nose
  ctx.beginPath();
  ctx.moveTo(posX + 0.38 * dir * w, y - 0.78 * h);
  ctx.lineTo(posX + 0.52 * dir * w, y - 0.74 * h);
  ctx.lineTo(posX + 0.4 * dir * w, y - 0.71 * h);
  ctx.closePath();
  ctx.fillStyle = "#0f172a";
  ctx.fill();

  // Green cartoon eyes
  ctx.beginPath();
  ctx.arc(
    posX + 0.15 * dir * w,
    y - 0.8 * h,
    Math.max(1.5, 0.04 * h),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#22c55e";
  ctx.fill();

  // Player badge
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
 * 20. CONKER (0x38):
 * Amber red squirrel with blue hoodie, yellow zipper pull,
 * giant fluffy curled squirrel tail, and blue sneakers.
 */
export function drawConkerPolygons(
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
    const tailWiggle =
      Math.sin(actionFrameCounter * 0.35) * 0.2 * (facingRight ? 1 : -1);
    ctx.translate(posX, centerY);
    ctx.rotate(tailWiggle);
    ctx.translate(-posX, -centerY);
  }

  const isMountain = backgroundTheme === "mountain";
  const isAutumn = backgroundTheme === "autumn";

  const baseFur = isMountain ? "#ea580c" : isAutumn ? "#c2410c" : "#f97316";
  const baseTailTip = isMountain ? "#f1f5f9" : isAutumn ? "#fef3c7" : "#ffffff";
  const baseHoodie = isMountain ? "#1d4ed8" : isAutumn ? "#1e3a8a" : "#2563eb";
  const baseZipper = isMountain ? "#f59e0b" : isAutumn ? "#d97706" : "#fbbf24";
  const baseSneakers = isMountain
    ? "#3b82f6"
    : isAutumn
      ? "#2563eb"
      : "#60a5fa";

  let fur = resolveColor(baseFur, isOpponent);
  const tailTip = resolveColor(baseTailTip, isOpponent);
  let hoodie = resolveColor(baseHoodie, isOpponent);
  let zipper = resolveColor(baseZipper, isOpponent);
  const sneakers = resolveColor(baseSneakers, isOpponent);
  const outline = resolveColor("rgba(15, 23, 42, 0.8)", isOpponent);

  if (taunting) {
    const zHue = (actionFrameCounter * 15) % 360;
    zipper = resolveColor(`hsl(${zHue}, 90%, 55%)`, isOpponent);
  } else if (isRoll) {
    fur = resolveColor(baseFur, isOpponent, 0.45);
    hoodie = resolveColor(baseHoodie, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Giant fluffy squirrel tail arching up and over back
  ctx.beginPath();
  ctx.moveTo(posX - 0.2 * dir * w, y - 0.35 * h);
  ctx.lineTo(posX - 0.7 * dir * w, y - 0.6 * h);
  ctx.lineTo(posX - 0.85 * dir * w, y - 0.9 * h);
  ctx.lineTo(posX - 0.5 * dir * w, y - 1.05 * h);
  ctx.lineTo(posX - 0.3 * dir * w, y - 0.85 * h);
  ctx.lineTo(posX - 0.45 * dir * w, y - 0.55 * h);
  ctx.closePath();
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // White tail tip
  ctx.beginPath();
  ctx.moveTo(posX - 0.85 * dir * w, y - 0.9 * h);
  ctx.lineTo(posX - 0.5 * dir * w, y - 1.05 * h);
  ctx.lineTo(posX - 0.3 * dir * w, y - 0.85 * h);
  ctx.closePath();
  ctx.fillStyle = tailTip;
  ctx.fill();

  // Blue sneakers & feet
  ctx.beginPath();
  ctx.moveTo(posX - 0.3 * dir * w, y - 0.18 * h);
  ctx.lineTo(posX - 0.1 * dir * w, y);
  ctx.lineTo(posX - 0.45 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = sneakers;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX + 0.08 * dir * w, y - 0.18 * h);
  ctx.lineTo(posX + 0.48 * dir * w, y);
  ctx.lineTo(posX + 0.12 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = sneakers;
  ctx.fill();

  // Blue Zip-up Hoodie
  ctx.beginPath();
  ctx.moveTo(posX - 0.32 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.26 * dir * w, y - 0.25 * h);
  ctx.lineTo(posX - 0.28 * dir * w, y - 0.25 * h);
  ctx.closePath();
  ctx.fillStyle = hoodie;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Yellow zipper line & pull
  ctx.beginPath();
  ctx.moveTo(posX + 0.02 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.02 * dir * w, y - 0.25 * h);
  ctx.strokeStyle = zipper;
  ctx.lineWidth = 2.0;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(
    posX + 0.02 * dir * w,
    y - 0.55 * h,
    Math.max(1.5, 0.04 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = zipper;
  ctx.fill();

  // Conker Head & Big Squirrel Cheeks
  ctx.beginPath();
  ctx.arc(posX + 0.08 * dir * w, y - 0.75 * h, 0.26 * w, 0, Math.PI * 2);
  ctx.fillStyle = fur;
  ctx.fill();

  // Rounded squirrel ears
  ctx.beginPath();
  ctx.arc(posX - 0.05 * dir * w, y - 0.92 * h, 0.08 * w, 0, Math.PI * 2);
  ctx.arc(posX + 0.22 * dir * w, y - 0.92 * h, 0.08 * w, 0, Math.PI * 2);
  ctx.fillStyle = fur;
  ctx.fill();

  // Buck teeth & smile
  ctx.beginPath();
  ctx.moveTo(posX + 0.18 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.28 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.26 * dir * w, y - 0.63 * h);
  ctx.lineTo(posX + 0.18 * dir * w, y - 0.63 * h);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Blue eyes
  ctx.beginPath();
  ctx.arc(
    posX + 0.18 * dir * w,
    y - 0.78 * h,
    Math.max(1.5, 0.035 * h),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#0284c7";
  ctx.fill();

  // Player badge
  ctx.beginPath();
  ctx.arc(
    posX - 0.15 * dir * w,
    y - 0.45 * h,
    Math.max(1.5, 0.06 * w),
    0,
    Math.PI * 2,
  );
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
