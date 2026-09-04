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

/**
 * 11. MEWTWO (0x39): Slender psychic Pokémon, pale lilac feline body,
 * long muscular purple tail, psychic aura glow.
 */
export function drawMewtwoPolygons(
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

  const baseBody = isMountain ? "#e2e8f0" : isAutumn ? "#fed7aa" : "#f1f5f9";
  const baseTail = isMountain ? "#a855f7" : isAutumn ? "#b91c1c" : "#9333ea";
  const basePsychic = isMountain ? "#38bdf8" : isAutumn ? "#f59e0b" : "#c084fc";

  let body = resolveColor(baseBody, isOpponent);
  let tail = resolveColor(baseTail, isOpponent);
  let psychic = resolveColor(basePsychic, isOpponent);
  const outline = resolveColor("rgba(147, 51, 234, 0.4)", isOpponent);

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    psychic = resolveColor(`hsl(${hue}, 95%, 65%)`, isOpponent);
  } else if (isRoll) {
    body = resolveColor(baseBody, isOpponent, 0.45);
    tail = resolveColor(baseTail, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Thick muscular purple tail curving behind
  ctx.beginPath();
  ctx.moveTo(posX - 0.2 * dir * w, y - 0.3 * h);
  ctx.quadraticCurveTo(
    posX - 0.85 * dir * w,
    y - 0.45 * h,
    posX - 0.9 * dir * w,
    y - 0.15 * h,
  );
  ctx.quadraticCurveTo(
    posX - 0.6 * dir * w,
    y + 0.05 * h,
    posX - 0.15 * dir * w,
    y - 0.2 * h,
  );
  ctx.closePath();
  ctx.fillStyle = tail;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Slender feline legs
  ctx.beginPath();
  ctx.rect(posX - 0.18 * dir * w, y - 0.35 * h, 0.14 * dir * w, 0.35 * h);
  ctx.rect(posX + 0.04 * dir * w, y - 0.35 * h, 0.14 * dir * w, 0.35 * h);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.stroke();

  // Slender torso with purple underbelly
  ctx.beginPath();
  ctx.ellipse(
    posX,
    y - 0.52 * h,
    Math.max(1, 0.25 * w),
    Math.max(1, 0.2 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = body;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    posX + 0.05 * dir * w,
    y - 0.48 * h,
    Math.max(1, 0.15 * w),
    Math.max(1, 0.14 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = tail;
  ctx.fill();

  // Head with cranial horns
  ctx.beginPath();
  ctx.ellipse(
    posX,
    y - 0.8 * h,
    Math.max(1, 0.22 * w),
    Math.max(1, 0.18 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = body;
  ctx.fill();
  ctx.stroke();

  // Cranial Horns on top of head
  ctx.beginPath();
  ctx.moveTo(posX - 0.12 * dir * w, y - 0.92 * h);
  ctx.lineTo(posX - 0.25 * dir * w, y - 1.08 * h);
  ctx.lineTo(posX - 0.05 * dir * w, y - 0.95 * h);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX + 0.05 * dir * w, y - 0.95 * h);
  ctx.lineTo(posX + 0.2 * dir * w, y - 1.08 * h);
  ctx.lineTo(posX + 0.15 * dir * w, y - 0.92 * h);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();
  ctx.stroke();

  // Glowing Purple Psychic Eye
  ctx.beginPath();
  ctx.arc(
    posX + 0.12 * dir * w,
    y - 0.8 * h,
    Math.max(1, 0.035 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = psychic;
  ctx.fill();

  // Psychic glow on hand fingertips
  ctx.beginPath();
  ctx.arc(
    posX + 0.35 * dir * w,
    y - 0.55 * h,
    Math.max(1, 0.06 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = psychic;
  ctx.fill();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}

/**
 * 12. SHEIK (0x3E): Sheikah ninja, wrapped blue bodysuit, white cowl/mask,
 * red Sheikah eye symbol on torso, bandaged limbs.
 */
export function drawSheikPolygons(
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

  const baseSuit = isMountain ? "#312e81" : isAutumn ? "#1e293b" : "#1d4ed8";
  const baseBandage = isMountain ? "#cbd5e1" : isAutumn ? "#fed7aa" : "#e2e8f0";
  const baseEye = isMountain ? "#f43f5e" : isAutumn ? "#ea580c" : "#dc2626";

  let suit = resolveColor(baseSuit, isOpponent);
  let bandage = resolveColor(baseBandage, isOpponent);
  let eye = resolveColor(baseEye, isOpponent);
  const outline = resolveColor("rgba(0, 0, 0, 0.7)", isOpponent);

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    eye = resolveColor(`hsl(${hue}, 95%, 60%)`, isOpponent);
  } else if (isRoll) {
    suit = resolveColor(baseSuit, isOpponent, 0.45);
    bandage = resolveColor(baseBandage, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Agile ninja legs with white bandage wraps
  ctx.beginPath();
  ctx.rect(posX - 0.2 * dir * w, y - 0.35 * h, 0.16 * dir * w, 0.35 * h);
  ctx.rect(posX + 0.05 * dir * w, y - 0.35 * h, 0.16 * dir * w, 0.35 * h);
  ctx.fillStyle = suit;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Leg bandages
  ctx.fillStyle = bandage;
  ctx.fillRect(posX - 0.2 * dir * w, y - 0.2 * h, 0.16 * dir * w, 0.08 * h);
  ctx.fillRect(posX + 0.05 * dir * w, y - 0.2 * h, 0.16 * dir * w, 0.08 * h);

  // Slim ninja torso
  ctx.beginPath();
  ctx.moveTo(posX - 0.28 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX + 0.28 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX + 0.2 * dir * w, y - 0.35 * h);
  ctx.lineTo(posX - 0.2 * dir * w, y - 0.35 * h);
  ctx.closePath();
  ctx.fillStyle = suit;
  ctx.fill();
  ctx.stroke();

  // Red Sheikah Eye symbol on chest
  ctx.beginPath();
  ctx.arc(posX, y - 0.52 * h, Math.max(1, 0.08 * w), 0, Math.PI * 2);
  ctx.fillStyle = eye;
  ctx.fill();
  // Three teardrops under eye
  ctx.beginPath();
  ctx.moveTo(posX, y - 0.44 * h);
  ctx.lineTo(posX, y - 0.38 * h);
  ctx.strokeStyle = eye;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Head wrapped in ninja cowl / turban
  ctx.beginPath();
  ctx.arc(posX, y - 0.8 * h, Math.max(1, 0.22 * w), 0, Math.PI * 2);
  ctx.fillStyle = bandage;
  ctx.fill();
  ctx.stroke();

  // Red fierce eyes visible through cowl slit
  ctx.beginPath();
  ctx.rect(posX + 0.05 * dir * w, y - 0.83 * h, 0.12 * dir * w, 0.05 * h);
  ctx.fillStyle = eye;
  ctx.fill();

  // Blonde ponytail behind head
  ctx.beginPath();
  ctx.moveTo(posX - 0.18 * dir * w, y - 0.8 * h);
  ctx.lineTo(posX - 0.45 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX - 0.2 * dir * w, y - 0.65 * h);
  ctx.closePath();
  ctx.fillStyle = "#facc15";
  ctx.fill();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}

/**
 * 13. PEACH (0x49): Princess of the Mushroom Kingdom, pink royal gown,
 * golden crown with gems, blonde hair, royal parasol.
 */
export function drawPeachPolygons(
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

  const baseDress = isMountain ? "#fae8ff" : isAutumn ? "#fed7aa" : "#f472b6";
  const basePannier = isMountain ? "#ec4899" : isAutumn ? "#ea580c" : "#db2777";
  const baseHair = isMountain ? "#fef08a" : isAutumn ? "#fbbf24" : "#facc15";
  const baseCrown = isMountain ? "#facc15" : isAutumn ? "#f59e0b" : "#eab308";
  const skin = resolveColor("#fed7aa", isOpponent);

  let dress = resolveColor(baseDress, isOpponent);
  let pannier = resolveColor(basePannier, isOpponent);
  let hair = resolveColor(baseHair, isOpponent);
  const crown = resolveColor(baseCrown, isOpponent);
  const outline = resolveColor("rgba(0, 0, 0, 0.7)", isOpponent);

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    dress = resolveColor(`hsl(${hue}, 85%, 70%)`, isOpponent);
  } else if (isRoll) {
    dress = resolveColor(baseDress, isOpponent, 0.45);
    pannier = resolveColor(basePannier, isOpponent, 0.45);
    hair = resolveColor(baseHair, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Broad bell-shaped pink ballgown skirt
  ctx.beginPath();
  ctx.moveTo(posX - 0.2 * dir * w, y - 0.5 * h);
  ctx.lineTo(posX + 0.2 * dir * w, y - 0.5 * h);
  ctx.lineTo(posX + 0.55 * dir * w, y);
  ctx.lineTo(posX - 0.55 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = dress;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();

  // Dark pink hip panniers
  ctx.beginPath();
  ctx.ellipse(
    posX - 0.25 * dir * w,
    y - 0.45 * h,
    Math.max(1, 0.18 * w),
    Math.max(1, 0.1 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.ellipse(
    posX + 0.25 * dir * w,
    y - 0.45 * h,
    Math.max(1, 0.18 * w),
    Math.max(1, 0.1 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = pannier;
  ctx.fill();

  // Slim bodice
  ctx.beginPath();
  ctx.moveTo(posX - 0.22 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.18 * dir * w, y - 0.5 * h);
  ctx.lineTo(posX - 0.18 * dir * w, y - 0.5 * h);
  ctx.closePath();
  ctx.fillStyle = dress;
  ctx.fill();
  ctx.stroke();

  // Head & refined face
  ctx.beginPath();
  ctx.arc(posX, y - 0.8 * h, Math.max(1, 0.22 * w), 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();

  // Voluminous blonde hair
  ctx.beginPath();
  ctx.arc(
    posX - 0.12 * dir * w,
    y - 0.82 * h,
    Math.max(1, 0.24 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = hair;
  ctx.fill();

  // Golden Crown with red/blue gems
  ctx.beginPath();
  ctx.moveTo(posX - 0.12 * dir * w, y - 0.95 * h);
  ctx.lineTo(posX - 0.16 * dir * w, y - 1.08 * h);
  ctx.lineTo(posX, y - 1.02 * h);
  ctx.lineTo(posX + 0.16 * dir * w, y - 1.08 * h);
  ctx.lineTo(posX + 0.12 * dir * w, y - 0.95 * h);
  ctx.closePath();
  ctx.fillStyle = crown;
  ctx.fill();
  ctx.stroke();

  // Parasol held in front hand
  ctx.beginPath();
  ctx.moveTo(posX + 0.35 * dir * w, y - 0.45 * h);
  ctx.lineTo(posX + 0.65 * dir * w, y - 0.9 * h);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Parasol canopy
  ctx.beginPath();
  ctx.arc(
    posX + 0.65 * dir * w,
    y - 0.9 * h,
    Math.max(1, 0.18 * w),
    Math.PI,
    0,
  );
  ctx.fillStyle = pannier;
  ctx.fill();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}

/**
 * 14. SONIC (0x3B): Cobalt blue hedgehog, aerodynamic swept-back quills,
 * white running gloves, red sneakers with white strap.
 */
export function drawSonicPolygons(
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

  const baseBlue = isMountain ? "#38bdf8" : isAutumn ? "#0284c7" : "#0284c7";
  const baseRed = isMountain ? "#f43f5e" : isAutumn ? "#dc2626" : "#ef4444";
  const baseSkin = isMountain ? "#fed7aa" : isAutumn ? "#fde68a" : "#fed7aa";

  let blue = resolveColor(baseBlue, isOpponent);
  let red = resolveColor(baseRed, isOpponent);
  const skin = resolveColor(baseSkin, isOpponent);

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    blue = resolveColor(`hsl(${hue}, 90%, 55%)`, isOpponent);
  } else if (isRoll) {
    blue = resolveColor(baseBlue, isOpponent, 0.45);
    red = resolveColor(baseRed, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Red speed sneakers with white buckle
  ctx.beginPath();
  ctx.ellipse(
    posX - 0.22 * dir * w,
    y - 0.1 * h,
    Math.max(1, 0.22 * w),
    Math.max(1, 0.1 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.ellipse(
    posX + 0.22 * dir * w,
    y - 0.1 * h,
    Math.max(1, 0.22 * w),
    Math.max(1, 0.1 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = red;
  ctx.fill();
  ctx.strokeStyle = "#000000";
  ctx.stroke();

  // White sneaker straps
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(posX - 0.24 * dir * w, y - 0.15 * h, 0.08 * dir * w, 0.1 * h);
  ctx.fillRect(posX + 0.2 * dir * w, y - 0.15 * h, 0.08 * dir * w, 0.1 * h);

  // Compact blue torso with peach chest oval
  ctx.beginPath();
  ctx.ellipse(
    posX,
    y - 0.42 * h,
    Math.max(1, 0.28 * w),
    Math.max(1, 0.2 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = blue;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    posX + 0.08 * dir * w,
    y - 0.42 * h,
    Math.max(1, 0.16 * w),
    Math.max(1, 0.14 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = skin;
  ctx.fill();

  // Head & Muzzle
  ctx.beginPath();
  ctx.arc(posX, y - 0.72 * h, Math.max(1, 0.28 * w), 0, Math.PI * 2);
  ctx.fillStyle = blue;
  ctx.fill();
  ctx.stroke();

  // Peach muzzle & smile
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.15 * dir * w,
    y - 0.68 * h,
    Math.max(1, 0.18 * w),
    Math.max(1, 0.12 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = skin;
  ctx.fill();

  // Black button nose
  ctx.beginPath();
  ctx.arc(
    posX + 0.3 * dir * w,
    y - 0.72 * h,
    Math.max(1, 0.04 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#09090b";
  ctx.fill();

  // Three aerodynamic swept-back quills
  for (const [qy, qlen] of [
    [0.85, 0.55],
    [0.72, 0.65],
    [0.58, 0.45],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(posX - 0.15 * dir * w, y - (qy + 0.08) * h);
    ctx.lineTo(posX - (0.15 + qlen) * dir * w, y - (qy - 0.05) * h); // Quill tip
    ctx.lineTo(posX - 0.15 * dir * w, y - (qy - 0.08) * h);
    ctx.closePath();
    ctx.fillStyle = blue;
    ctx.fill();
    ctx.stroke();
  }

  // Green eye
  ctx.beginPath();
  ctx.arc(
    posX + 0.15 * dir * w,
    y - 0.78 * h,
    Math.max(1, 0.04 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#10b981";
  ctx.fill();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}
