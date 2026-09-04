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

/**
 * 2. GANONDORF (0x1E): Gerudo King of Evil, heavy dark bronze armor,
 * gold forehead crest with jewel, fiery red-orange hair, high collar cape.
 */
export function drawGanondorfPolygons(
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

  const baseArmor = isMountain ? "#1e1b4b" : isAutumn ? "#292524" : "#1e293b";
  const baseTrim = isMountain ? "#c084fc" : isAutumn ? "#f59e0b" : "#eab308";
  const baseSkin = isMountain ? "#64748b" : isAutumn ? "#78716c" : "#52525b";
  const baseHair = isMountain ? "#ea580c" : isAutumn ? "#c2410c" : "#dc2626";
  const baseCape = isMountain ? "#4a044e" : isAutumn ? "#7f1d1d" : "#581c87";

  let armor = resolveColor(baseArmor, isOpponent);
  let trim = resolveColor(baseTrim, isOpponent);
  let skin = resolveColor(baseSkin, isOpponent);
  let hair = resolveColor(baseHair, isOpponent);
  let cape = resolveColor(baseCape, isOpponent);
  const outline = resolveColor("rgba(0, 0, 0, 0.8)", isOpponent);

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    hair = resolveColor(`hsl(${hue}, 90%, 55%)`, isOpponent);
    cape = resolveColor(`hsl(${(hue + 180) % 360}, 75%, 35%)`, isOpponent);
  } else if (isRoll) {
    armor = resolveColor(baseArmor, isOpponent, 0.45);
    trim = resolveColor(baseTrim, isOpponent, 0.45);
    skin = resolveColor(baseSkin, isOpponent, 0.45);
    hair = resolveColor(baseHair, isOpponent, 0.45);
    cape = resolveColor(baseCape, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Flowing dark cape behind body
  ctx.beginPath();
  ctx.moveTo(posX - 0.2 * dir * w, y - 0.75 * h);
  ctx.lineTo(posX - 0.75 * dir * w, y - 0.2 * h);
  ctx.lineTo(posX - 0.4 * dir * w, y - 0.15 * h);
  ctx.lineTo(posX - 0.05 * dir * w, y - 0.7 * h);
  ctx.closePath();
  ctx.fillStyle = cape;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Heavy armored legs & greaves
  ctx.beginPath();
  ctx.moveTo(posX - 0.3 * dir * w, y - 0.4 * h);
  ctx.lineTo(posX - 0.35 * dir * w, y);
  ctx.lineTo(posX + 0.35 * dir * w, y);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.4 * h);
  ctx.closePath();
  ctx.fillStyle = armor;
  ctx.fill();
  ctx.stroke();

  // Gold knee trim
  ctx.beginPath();
  ctx.arc(
    posX - 0.12 * dir * w,
    y - 0.22 * h,
    Math.max(1, 0.08 * w),
    0,
    Math.PI * 2,
  );
  ctx.arc(
    posX + 0.15 * dir * w,
    y - 0.22 * h,
    Math.max(1, 0.08 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = trim;
  ctx.fill();

  // Muscular armored torso
  ctx.beginPath();
  ctx.moveTo(posX - 0.45 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.45 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.38 * h);
  ctx.lineTo(posX - 0.3 * dir * w, y - 0.38 * h);
  ctx.closePath();
  ctx.fillStyle = armor;
  ctx.fill();
  ctx.stroke();

  // Gold chestplate medallion
  ctx.beginPath();
  ctx.arc(posX, y - 0.55 * h, Math.max(1, 0.12 * w), 0, Math.PI * 2);
  ctx.fillStyle = trim;
  ctx.fill();

  // Head, Gerudo nose & jaw
  ctx.beginPath();
  ctx.moveTo(posX - 0.2 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.32 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.45 * dir * w, y - 0.85 * h); // Aquiline nose
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.95 * h);
  ctx.lineTo(posX - 0.2 * dir * w, y - 0.95 * h);
  ctx.closePath();
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.stroke();

  // Fiery spiky Gerudo hair
  ctx.beginPath();
  ctx.moveTo(posX - 0.15 * dir * w, y - 0.95 * h);
  ctx.lineTo(posX - 0.45 * dir * w, y - 1.08 * h);
  ctx.lineTo(posX - 0.2 * dir * w, y - 1.15 * h);
  ctx.lineTo(posX + 0.1 * dir * w, y - 1.02 * h);
  ctx.closePath();
  ctx.fillStyle = hair;
  ctx.fill();
  ctx.stroke();

  // Gold forehead crown jewel
  ctx.beginPath();
  ctx.arc(
    posX + 0.15 * dir * w,
    y - 0.9 * h,
    Math.max(1, 0.05 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = trim;
  ctx.fill();

  // Glowing evil eye
  ctx.beginPath();
  ctx.arc(
    posX + 0.22 * dir * w,
    y - 0.85 * h,
    Math.max(1, 0.03 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#fbbf24";
  ctx.fill();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}

/**
 * 3. YOUNG LINK (0x1F): Kokiri youth, green tunic, floppy cap,
 * pointed elf ears, wooden Deku shield on back.
 */
export function drawYoungLinkPolygons(
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

  const baseTunic = isMountain ? "#6366f1" : isAutumn ? "#dc2626" : "#65a30d";
  const baseHair = isMountain ? "#fef08a" : isAutumn ? "#fbbf24" : "#facc15";
  const baseSkin = isMountain ? "#fed7aa" : isAutumn ? "#fde68a" : "#fed7aa";
  const baseShield = isMountain ? "#78350f" : isAutumn ? "#451a03" : "#92400e";
  const baseBoots = isMountain ? "#475569" : isAutumn ? "#78350f" : "#854d0e";

  let tunic = resolveColor(baseTunic, isOpponent);
  let hair = resolveColor(baseHair, isOpponent);
  let skin = resolveColor(baseSkin, isOpponent);
  let shield = resolveColor(baseShield, isOpponent);
  const boots = resolveColor(baseBoots, isOpponent);
  const outline = resolveColor("rgba(20, 83, 45, 0.7)", isOpponent);

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    tunic = resolveColor(`hsl(${hue}, 80%, 45%)`, isOpponent);
  } else if (isRoll) {
    tunic = resolveColor(baseTunic, isOpponent, 0.45);
    hair = resolveColor(baseHair, isOpponent, 0.45);
    skin = resolveColor(baseSkin, isOpponent, 0.45);
    shield = resolveColor(baseShield, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Deku Shield on back
  ctx.beginPath();
  ctx.ellipse(
    posX - 0.35 * dir * w,
    y - 0.5 * h,
    Math.max(1, 0.28 * w),
    Math.max(1, 0.22 * h),
    -0.15 * dir,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = shield;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // White tights & boots
  ctx.beginPath();
  ctx.rect(posX - 0.2 * dir * w, y - 0.25 * h, 0.15 * dir * w, 0.25 * h);
  ctx.rect(posX + 0.05 * dir * w, y - 0.25 * h, 0.15 * dir * w, 0.25 * h);
  ctx.fillStyle = boots;
  ctx.fill();
  ctx.stroke();

  // Kokiri Tunic & brown belt
  ctx.beginPath();
  ctx.moveTo(posX - 0.3 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y - 0.25 * h);
  ctx.lineTo(posX - 0.28 * dir * w, y - 0.25 * h);
  ctx.closePath();
  ctx.fillStyle = tunic;
  ctx.fill();
  ctx.stroke();

  // Head & Boyish Face
  ctx.beginPath();
  ctx.arc(
    posX + 0.05 * dir * w,
    y - 0.75 * h,
    Math.max(1, 0.25 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = skin;
  ctx.fill();

  // Pointed Elf Ear
  ctx.beginPath();
  ctx.moveTo(posX - 0.1 * dir * w, y - 0.78 * h);
  ctx.lineTo(posX - 0.4 * dir * w, y - 0.85 * h);
  ctx.lineTo(posX - 0.1 * dir * w, y - 0.72 * h);
  ctx.closePath();
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.stroke();

  // Blonde hair bangs
  ctx.beginPath();
  ctx.moveTo(posX - 0.15 * dir * w, y - 0.85 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.85 * h);
  ctx.lineTo(posX + 0.15 * dir * w, y - 0.72 * h);
  ctx.closePath();
  ctx.fillStyle = hair;
  ctx.fill();

  // Floppy Green Cap
  ctx.beginPath();
  ctx.moveTo(posX - 0.2 * dir * w, y - 0.85 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.85 * h);
  ctx.quadraticCurveTo(
    posX - 0.2 * dir * w,
    y - 1.15 * h,
    posX - 0.6 * dir * w,
    y - 0.95 * h,
  ); // Floppy cap tip draping back
  ctx.closePath();
  ctx.fillStyle = tunic;
  ctx.fill();
  ctx.stroke();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}

/**
 * 4. DR. MARIO (0x20): White lab coat, metallic head mirror,
 * stethoscope around neck, red/blue megavitamin capsule.
 */
export function drawDrMarioPolygons(
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

  const baseCoat = isMountain ? "#e2e8f0" : isAutumn ? "#fed7aa" : "#f8fafc";
  const basePants = isMountain ? "#334155" : isAutumn ? "#292524" : "#1e293b";
  const baseSkin = isMountain ? "#fed7aa" : isAutumn ? "#fed7aa" : "#fed7aa";
  const baseMirror = isMountain ? "#38bdf8" : isAutumn ? "#fbbf24" : "#cbd5e1";
  const baseSteth = isMountain ? "#a855f7" : isAutumn ? "#c2410c" : "#3b82f6";

  let coat = resolveColor(baseCoat, isOpponent);
  let pants = resolveColor(basePants, isOpponent);
  let skin = resolveColor(baseSkin, isOpponent);
  const mirror = resolveColor(baseMirror, isOpponent);
  const steth = resolveColor(baseSteth, isOpponent);
  const outline = resolveColor("rgba(0, 0, 0, 0.75)", isOpponent);

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    coat = resolveColor(`hsl(${hue}, 70%, 75%)`, isOpponent);
  } else if (isRoll) {
    coat = resolveColor(baseCoat, isOpponent, 0.45);
    pants = resolveColor(basePants, isOpponent, 0.45);
    skin = resolveColor(baseSkin, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Dark trousers & shoes
  ctx.beginPath();
  ctx.rect(posX - 0.25 * dir * w, y - 0.25 * h, 0.2 * dir * w, 0.25 * h);
  ctx.rect(posX + 0.05 * dir * w, y - 0.25 * h, 0.2 * dir * w, 0.25 * h);
  ctx.fillStyle = pants;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // White Doctor Lab Coat
  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX + 0.42 * dir * w, y - 0.28 * h);
  ctx.lineTo(posX - 0.38 * dir * w, y - 0.28 * h);
  ctx.closePath();
  ctx.fillStyle = coat;
  ctx.fill();
  ctx.stroke();

  // Stethoscope around neck
  ctx.beginPath();
  ctx.arc(posX, y - 0.58 * h, Math.max(1, 0.18 * w), 0, Math.PI);
  ctx.strokeStyle = steth;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Stethoscope chest bell
  ctx.beginPath();
  ctx.arc(
    posX + 0.05 * dir * w,
    y - 0.48 * h,
    Math.max(1, 0.05 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = mirror;
  ctx.fill();

  // Head & Big Nose
  ctx.beginPath();
  ctx.arc(posX, y - 0.8 * h, Math.max(1, 0.28 * w), 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.stroke();

  // Bulbous nose
  ctx.beginPath();
  ctx.arc(
    posX + 0.25 * dir * w,
    y - 0.78 * h,
    Math.max(1, 0.1 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.stroke();

  // Mustache
  ctx.beginPath();
  ctx.arc(
    posX + 0.2 * dir * w,
    y - 0.73 * h,
    Math.max(1, 0.08 * w),
    0,
    Math.PI,
  );
  ctx.fillStyle = "#1e293b";
  ctx.fill();

  // Metallic Head Mirror on Forehead
  ctx.beginPath();
  ctx.arc(
    posX + 0.15 * dir * w,
    y - 0.95 * h,
    Math.max(1, 0.11 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = mirror;
  ctx.fill();
  ctx.stroke();

  // Head mirror headband
  ctx.beginPath();
  ctx.rect(posX - 0.25 * dir * w, y - 0.96 * h, 0.5 * dir * w, 0.04 * h);
  ctx.fillStyle = "#475569";
  ctx.fill();

  // Megavitamin Pill held in front hand
  const pillX = posX + 0.45 * dir * w;
  const pillY = y - 0.5 * h;
  ctx.beginPath();
  ctx.arc(pillX, pillY - 0.04 * h, Math.max(1, 0.07 * w), Math.PI, 0);
  ctx.fillStyle = "#ef4444"; // Red half
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pillX, pillY - 0.04 * h, Math.max(1, 0.07 * w), 0, Math.PI);
  ctx.fillStyle = "#3b82f6"; // Blue half
  ctx.fill();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}

/**
 * 5. WARIO (0x21): Yellow cap with blue "W", bulbous pink nose,
 * jagged zigzag mustache, pointy ears, purple overalls.
 */
export function drawWarioPolygons(
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

  const baseYellow = isMountain ? "#fef08a" : isAutumn ? "#f59e0b" : "#eab308";
  const basePurple = isMountain ? "#4a044e" : isAutumn ? "#581c87" : "#7e22ce";
  const baseNose = isMountain ? "#f43f5e" : isAutumn ? "#e11d48" : "#ec4899";
  const baseShoes = isMountain ? "#10b981" : isAutumn ? "#15803d" : "#22c55e";

  let yellow = resolveColor(baseYellow, isOpponent);
  let purple = resolveColor(basePurple, isOpponent);
  let nose = resolveColor(baseNose, isOpponent);
  const shoes = resolveColor(baseShoes, isOpponent);
  const skin = resolveColor("#fed7aa", isOpponent);
  const outline = resolveColor("rgba(0, 0, 0, 0.75)", isOpponent);

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    yellow = resolveColor(`hsl(${hue}, 85%, 55%)`, isOpponent);
    purple = resolveColor(`hsl(${(hue + 180) % 360}, 85%, 45%)`, isOpponent);
  } else if (isRoll) {
    yellow = resolveColor(baseYellow, isOpponent, 0.45);
    purple = resolveColor(basePurple, isOpponent, 0.45);
    nose = resolveColor(baseNose, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Green pointy shoes
  ctx.beginPath();
  ctx.ellipse(
    posX - 0.25 * dir * w,
    y - 0.08 * h,
    Math.max(1, 0.22 * w),
    Math.max(1, 0.08 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.ellipse(
    posX + 0.25 * dir * w,
    y - 0.08 * h,
    Math.max(1, 0.22 * w),
    Math.max(1, 0.08 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = shoes;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Rotund Purple Overalls
  ctx.beginPath();
  ctx.ellipse(
    posX,
    y - 0.4 * h,
    Math.max(1, 0.48 * w),
    Math.max(1, 0.28 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = purple;
  ctx.fill();
  ctx.stroke();

  // Yellow shirt under overalls
  ctx.beginPath();
  ctx.moveTo(posX - 0.4 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.4 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.5 * h);
  ctx.lineTo(posX - 0.3 * dir * w, y - 0.5 * h);
  ctx.closePath();
  ctx.fillStyle = yellow;
  ctx.fill();

  // Head & Pointy Ears
  ctx.beginPath();
  ctx.arc(posX, y - 0.72 * h, Math.max(1, 0.32 * w), 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.stroke();

  // Pointed ear
  ctx.beginPath();
  ctx.moveTo(posX - 0.28 * dir * w, y - 0.76 * h);
  ctx.lineTo(posX - 0.55 * dir * w, y - 0.84 * h);
  ctx.lineTo(posX - 0.25 * dir * w, y - 0.68 * h);
  ctx.closePath();
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.stroke();

  // Wario Yellow Cap
  ctx.beginPath();
  ctx.arc(posX, y - 0.85 * h, Math.max(1, 0.36 * w), Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = yellow;
  ctx.fill();
  ctx.stroke();

  // Blue "W" Emblem on Cap
  ctx.beginPath();
  ctx.arc(
    posX + 0.1 * dir * w,
    y - 0.95 * h,
    Math.max(1, 0.1 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(posX + 0.04 * dir * w, y - 1.02 * h);
  ctx.lineTo(posX + 0.07 * dir * w, y - 0.9 * h);
  ctx.lineTo(posX + 0.1 * dir * w, y - 0.96 * h);
  ctx.lineTo(posX + 0.13 * dir * w, y - 0.9 * h);
  ctx.lineTo(posX + 0.16 * dir * w, y - 1.02 * h);
  ctx.strokeStyle = "#1d4ed8";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Bulbous Pink Wario Nose
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.28 * dir * w,
    y - 0.72 * h,
    Math.max(1, 0.16 * w),
    Math.max(1, 0.12 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = nose;
  ctx.fill();
  ctx.stroke();

  // Zigzag Black Mustache
  ctx.beginPath();
  ctx.moveTo(posX + 0.05 * dir * w, y - 0.65 * h);
  ctx.lineTo(posX + 0.2 * dir * w, y - 0.61 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.66 * h);
  ctx.lineTo(posX + 0.52 * dir * w, y - 0.58 * h);
  ctx.lineTo(posX + 0.32 * dir * w, y - 0.58 * h);
  ctx.closePath();
  ctx.fillStyle = "#18181b";
  ctx.fill();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}
