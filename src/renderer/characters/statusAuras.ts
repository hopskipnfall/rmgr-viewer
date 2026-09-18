import { resolveColor } from "../common/index.js";

/**
 * Draws 3 glowing golden stars orbiting in an inclined 3D ellipse above the character's head
 * when their shield is broken and they are stuck in the dizzy state (FuraFura / Stun).
 */
export function drawDizzyStars(
  ctx: CanvasRenderingContext2D,
  x: number,
  headY: number,
  frameCounter: number,
  isOpponent: boolean,
): void {
  const starCount = 3;
  const orbitRadiusX = 18;
  const orbitRadiusY = 7;
  const speed = 0.12;

  ctx.save();
  for (let i = 0; i < starCount; i++) {
    const phase = (i * Math.PI * 2) / starCount;
    const angle = frameCounter * speed + phase;
    const starX = x + Math.cos(angle) * orbitRadiusX;
    // Slanted elliptical orbit for a 3D perspective effect
    const starY = headY + Math.sin(angle) * orbitRadiusY + Math.cos(angle) * 2;

    // 3D depth scaling: stars in front (sin > 0) are larger and brighter than stars in back (sin < 0)
    const depth = Math.sin(angle); // -1 (back) to +1 (front)
    const depthScale = 0.7 + 0.35 * ((depth + 1) / 2);
    const starRadius = 5 * depthScale;
    const alpha = 0.55 + 0.45 * ((depth + 1) / 2);

    ctx.save();
    ctx.translate(starX, starY);
    ctx.rotate(frameCounter * 0.18 + phase);

    const starColor = resolveColor("#facc15", isOpponent, alpha); // Bright gold / yellow
    const starGlow = resolveColor("#ca8a04", isOpponent, alpha * 0.8);

    ctx.fillStyle = starColor;
    ctx.shadowColor = starGlow;
    ctx.shadowBlur = 6 * depthScale;

    // 4-pointed sparkle star geometry
    ctx.beginPath();
    for (let p = 0; p < 8; p++) {
      const r = p % 2 === 0 ? starRadius : starRadius * 0.4;
      const pAngle = (p * Math.PI) / 4;
      const px = Math.cos(pAngle) * r;
      const py = Math.sin(pAngle) * r;
      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // White hot-spot core on front-facing stars
    if (depth > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, starRadius * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = resolveColor("#ffffff", isOpponent, alpha);
      ctx.fill();
    }

    ctx.restore();
  }
  ctx.restore();
}

/**
 * Draws rising "Z z z" text bubbles when a character is asleep (e.g. from Sing).
 */
export function drawSleepZzz(
  ctx: CanvasRenderingContext2D,
  x: number,
  topY: number,
  frameCounter: number,
  isOpponent: boolean,
): void {
  const zCount = 3;
  ctx.save();
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < zCount; i++) {
    const cycle = (frameCounter + i * 25) % 75;
    const progress = cycle / 75; // 0 to 1
    const zY = topY - progress * 24;
    const zX = x + Math.sin(progress * Math.PI * 2) * 6 + i * 4;
    const zScale = 0.7 + progress * 0.5;
    const alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;

    ctx.save();
    ctx.translate(zX, zY);
    ctx.scale(zScale, zScale);
    ctx.fillStyle = resolveColor("#93c5fd", isOpponent, alpha * 0.9);
    ctx.shadowColor = resolveColor("#3b82f6", isOpponent, alpha * 0.6);
    ctx.shadowBlur = 4;
    ctx.fillText(i === 0 ? "Z" : "z", 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Draws a dynamic swirling wind/motion aura around a character reeling in tumble.
 */
export function drawTumbleAura(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  frameCounter: number,
  isOpponent: boolean,
): void {
  const radius = halfWidth * 1.35;
  const speed = 0.2;
  ctx.save();
  ctx.lineWidth = 1.8;

  for (let i = 0; i < 3; i++) {
    const angle = frameCounter * speed + (i * Math.PI * 2) / 3;
    const alpha = 0.4 + 0.3 * Math.sin(angle);
    ctx.strokeStyle = resolveColor("#f59e0b", isOpponent, alpha); // Amber/orange wind streak
    ctx.shadowColor = resolveColor("#d97706", isOpponent, alpha * 0.6);
    ctx.shadowBlur = 4;

    ctx.beginPath();
    ctx.arc(x, centerY, radius + i * 2, angle, angle + Math.PI * 0.55);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws ground impact dust shockwaves and sparks when a player misses a tech
 * and bounces hard on the floor (DownBound).
 */
export function drawMissedTechBounce(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  halfWidth: number,
  frameCounter: number,
  isOpponent: boolean,
): void {
  const progress = Math.min(frameCounter / 14, 1);
  const alpha = 1 - progress;
  if (alpha <= 0) return;

  ctx.save();

  // 1. Horizontal expanding floor dust ellipse
  const dustRadiusX = halfWidth * 1.5 + progress * 24;
  const dustRadiusY = 4 + progress * 3;
  ctx.beginPath();
  ctx.ellipse(x, y, dustRadiusX, dustRadiusY, 0, 0, Math.PI * 2);
  ctx.fillStyle = resolveColor(
    "rgba(148, 163, 184, 0.45)",
    isOpponent,
    alpha * 0.5,
  );
  ctx.fill();
  ctx.strokeStyle = resolveColor("#f97316", isOpponent, alpha * 0.8); // Orange impact ring
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 2. Upward impact spark lines
  const sparkCount = 5;
  for (let i = 0; i < sparkCount; i++) {
    const sparkAngle = -Math.PI * 0.85 + (i * Math.PI * 0.7) / (sparkCount - 1);
    const sparkDist = 8 + progress * 16;
    const sx = x + Math.cos(sparkAngle) * (dustRadiusX * 0.6);
    const sy = y + Math.sin(sparkAngle) * sparkDist;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(sparkAngle) * 4, y);
    ctx.lineTo(sx, sy);
    ctx.strokeStyle = resolveColor("#fde047", isOpponent, alpha);
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws a crisp breakfall ground flash and upward recovery burst on a successful Tech.
 */
export function drawTechBreakfall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  halfWidth: number,
  frameCounter: number,
  isOpponent: boolean,
): void {
  const progress = Math.min(frameCounter / 16, 1);
  const alpha = 1 - progress;
  if (alpha <= 0) return;

  ctx.save();

  // 1. Cyan tech impact ring on floor
  const ringRadiusX = halfWidth * 1.2 + progress * 20;
  const ringRadiusY = 3 + progress * 3;
  ctx.beginPath();
  ctx.ellipse(x, y, ringRadiusX, ringRadiusY, 0, 0, Math.PI * 2);
  ctx.strokeStyle = resolveColor("#22d3ee", isOpponent, alpha * 0.9);
  ctx.lineWidth = 2.2;
  ctx.shadowColor = resolveColor("#06b6d4", isOpponent, alpha * 0.8);
  ctx.shadowBlur = 8;
  ctx.stroke();

  // 2. Rising green/cyan tech recovery sparks
  for (let i = 0; i < 4; i++) {
    const sparkX = x + (i - 1.5) * (halfWidth * 0.8);
    const sparkY = y - progress * 22 - (i % 2) * 4;
    const sparkSize = Math.max(1, (1 - progress) * 3);
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
    ctx.fillStyle = resolveColor("#34d399", isOpponent, alpha);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws electric speed lines and cyan trail for Tech Rolls.
 */
export function drawTechRollSpeedLines(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  topY: number,
  effectiveDir: number,
  halfWidth: number,
  frameCounter: number,
  isOpponent: boolean,
): void {
  ctx.save();
  const trailDir = -effectiveDir; // Speed lines trail behind movement
  const lineCount = 4;
  const height = y - topY;

  for (let i = 0; i < lineCount; i++) {
    const lineY = topY + (height * (i + 1)) / (lineCount + 1);
    const startX = x + trailDir * (halfWidth * 0.4);
    const lineLen = 14 + ((frameCounter * 7 + i * 11) % 16);
    const endX = startX + trailDir * lineLen;

    ctx.beginPath();
    ctx.moveTo(startX, lineY);
    ctx.lineTo(endX, lineY);
    ctx.strokeStyle = resolveColor("#22d3ee", isOpponent, 0.75);
    ctx.lineWidth = 1.6;
    ctx.shadowColor = resolveColor("#06b6d4", isOpponent, 0.7);
    ctx.shadowBlur = 4;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws dynamic jumpsquat anticipation visuals during action state 0x014 / 0x015:
 * 1. Lateral ground dust kick puffs billowing outward left & right from the planted feet
 * 2. Expanding ground compression pressure ring directly under the soles
 * 3. Rising jump anticipation chevrons and vertical energy streaks flanking the character
 * 4. Ground compression sparks at the soles on later frames
 */
export function drawJumpSquatFx(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  halfWidth: number,
  heightPx: number,
  frameCounter: number,
  playerColor: string,
  isOpponent: boolean,
): void {
  ctx.save();

  // Progress through jumpsquat (ranges 3-7 frames depending on character)
  const f = Math.max(0, frameCounter);
  const progress = Math.min(1, f / 4);

  // 1. Ground Compression Pressure Ring on the stage floor
  const ringRadiusX = halfWidth * (1.15 + progress * 0.35);
  const ringRadiusY = Math.max(2.5, 3 + progress * 1.5);
  const ringAlpha = 0.85 - progress * 0.2;

  ctx.beginPath();
  ctx.ellipse(x, y, ringRadiusX, ringRadiusY, 0, 0, Math.PI * 2);
  ctx.strokeStyle = resolveColor(playerColor, isOpponent, ringAlpha);
  ctx.lineWidth = 2.0;
  ctx.shadowColor = resolveColor(playerColor, isOpponent, 0.8);
  ctx.shadowBlur = 8;
  ctx.stroke();

  // Soft inner ground contact fill
  ctx.beginPath();
  ctx.ellipse(x, y, ringRadiusX * 0.75, ringRadiusY * 0.75, 0, 0, Math.PI * 2);
  ctx.fillStyle = resolveColor(playerColor, isOpponent, 0.15 + progress * 0.15);
  ctx.fill();

  // 2. Lateral Ground Dust Kick Puffs (Left and Right)
  // When planting feet and coiling, friction sends dust puffs outward to both sides
  const dustColor = resolveColor("rgba(203, 213, 225, 0.75)", isOpponent, 0.75);
  const dustBorder = resolveColor("rgba(148, 163, 184, 0.6)", isOpponent, 0.6);

  for (const dir of [-1, 1] as const) {
    const baseOffset = halfWidth * 0.6;
    const travel = f * 3.5;
    const dustX = x + dir * (baseOffset + travel);
    const dustY = y - 1;
    const dustAlpha = Math.max(0.2, 0.75 - f * 0.08);

    // Primary billow
    const r1 = Math.max(2, 3.5 + f * 1.2);
    ctx.beginPath();
    ctx.arc(dustX, dustY, r1, 0, Math.PI * 2);
    ctx.fillStyle = resolveColor(dustColor, isOpponent, dustAlpha);
    ctx.fill();
    ctx.strokeStyle = resolveColor(dustBorder, isOpponent, dustAlpha * 0.8);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Secondary trailing billow
    const r2 = Math.max(1.5, 2.2 + f * 0.8);
    ctx.beginPath();
    ctx.arc(dustX - dir * (r1 * 0.8), dustY + 0.5, r2, 0, Math.PI * 2);
    ctx.fillStyle = resolveColor(dustColor, isOpponent, dustAlpha * 0.7);
    ctx.fill();

    // Ground skid streak
    ctx.beginPath();
    ctx.moveTo(x + dir * (baseOffset * 0.5), y);
    ctx.lineTo(dustX + dir * r1, y);
    ctx.strokeStyle = resolveColor("#e2e8f0", isOpponent, dustAlpha * 0.8);
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  // 3. Upward Jump Anticipation Chevrons / Vertical Energy Streaks
  // Flanking the fighter's legs/torso, telegraphing the upcoming vertical launch
  const chevronCount = 2;
  for (let i = 0; i < chevronCount; i++) {
    const side = i === 0 ? -1 : 1;
    const chevronX = x + side * (halfWidth * 0.75);
    // Rises higher as frames advance
    const riseDist = 6 + f * 4.5;
    const chevronY = y - riseDist;
    const chevAlpha = 0.5 + progress * 0.45;
    const chevSpan = 5;

    ctx.beginPath();
    ctx.moveTo(chevronX - chevSpan, chevronY + 4);
    ctx.lineTo(chevronX, chevronY);
    ctx.lineTo(chevronX + chevSpan, chevronY + 4);
    ctx.strokeStyle = resolveColor("#ffffff", isOpponent, chevAlpha);
    ctx.lineWidth = 1.8;
    ctx.shadowColor = resolveColor(playerColor, isOpponent, 0.8);
    ctx.shadowBlur = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // Vertical trailing energy line below the chevron
    ctx.beginPath();
    ctx.moveTo(chevronX, chevronY + 4);
    ctx.lineTo(chevronX, y - 2);
    ctx.strokeStyle = resolveColor(playerColor, isOpponent, chevAlpha * 0.6);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // 4. Kinetic Compression Sparks at the Soles
  if (f >= 1) {
    const sparkAlpha = Math.min(1.0, 0.4 + f * 0.15);
    for (const side of [-1, 1] as const) {
      const sx = x + side * (halfWidth * 0.35);
      const sy = y - 1;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = resolveColor("#ffffff", isOpponent, sparkAlpha);
      ctx.shadowColor = resolveColor(playerColor, isOpponent, 0.9);
      ctx.shadowBlur = 5;
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Draws Yoshi's Super Armor effect during his double jump (JumpAerialF/B).
 * Knockback resistance (140 US / 110 JP) protects him from being interrupted by light hits.
 *
 * Rather than an ambiguous generic circle/bubble that conflicts with neutral air attack arcs,
 * this conforms directly to Yoshi's organic dinosaur silhouette:
 * 1. An anatomical body contour conforming to Yoshi's snout, eyes, neck spines, back shell,
 *    belly, boots, and tail.
 * 2. Crystalline armor facet plates that wrap his body segments.
 * 3. A reinforced shell carapace plating that highlights his red back shell.
 * 4. Flutter wings radiating from his shell with flapping oscillation.
 * 5. Kinetic diamond spark nodes along his body outline.
 */
export function drawSuperArmorAura(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  effectiveDir: number,
  frameCounter: number,
  armorValue: number,
  playerColor: string,
  isOpponent: boolean,
): void {
  ctx.save();

  const facingRight = effectiveDir >= 0;
  const dir = facingRight ? 1 : -1;
  const w = halfWidth;
  const h = heightPx;

  // Pulse & shimmer frequencies based on frameCounter
  const pulse = Math.sin(frameCounter * 0.32) * 0.08;
  const armorScale = 1.08 + pulse; // Conforms tightly around Yoshi's body (~8% offset)

  // Primary armor theme colors: iridescent crystalline emerald / diamond cyan accented with player color
  const armorHex = armorValue >= 130 ? "#34d399" : "#38bdf8"; // 140 US = emerald, 110 JP = sky/diamond
  const auraFill = resolveColor(armorHex, isOpponent, 0.22);
  const outerBorder = resolveColor(armorHex, isOpponent, 0.9);
  const innerCore = resolveColor("#ffffff", isOpponent, 0.9);

  // 1. Anatomical Dinosaur Body-Conforming Armor Aura
  // Traces the precise perimeter of Yoshi (snout, eyes, neck spines, back shell, tail, boots, belly)
  ctx.save();
  ctx.beginPath();

  // Head: eye crown top
  ctx.moveTo(x + 0.1 * dir * w * armorScale, y - 0.98 * h * armorScale);
  // Snout top ridge down to nose tip
  ctx.lineTo(x + 0.45 * dir * w * armorScale, y - 0.9 * h * armorScale);
  ctx.lineTo(x + 0.88 * dir * w * armorScale, y - 0.74 * h * armorScale);
  // Snout bottom curve to mouth
  ctx.lineTo(x + 0.75 * dir * w * armorScale, y - 0.6 * h * armorScale);
  ctx.lineTo(x + 0.45 * dir * w * armorScale, y - 0.52 * h * armorScale);
  // Front chest & white belly curve down to front boot
  ctx.lineTo(x + 0.44 * dir * w * armorScale, y - 0.35 * h * armorScale);
  ctx.lineTo(x + 0.58 * dir * w * armorScale, y - 0.12 * h * armorScale);
  ctx.lineTo(x + 0.38 * dir * w * armorScale, y - 0.02 * h);
  // Between boots (underbelly / soles)
  ctx.lineTo(x + 0.05 * dir * w, y - 0.05 * h);
  // Rear boot
  ctx.lineTo(x - 0.22 * dir * w * armorScale, y - 0.02 * h);
  ctx.lineTo(x - 0.52 * dir * w * armorScale, y - 0.12 * h * armorScale);
  // Rear leg up to tail base
  ctx.lineTo(x - 0.4 * dir * w * armorScale, y - 0.26 * h * armorScale);
  // Tail point
  ctx.lineTo(x - 1.08 * dir * w * armorScale, y - 0.52 * h * armorScale);
  ctx.lineTo(x - 0.52 * dir * w * armorScale, y - 0.62 * h * armorScale);
  // Back shell bulge
  ctx.lineTo(x - 0.68 * dir * w * armorScale, y - 0.72 * h * armorScale);
  ctx.lineTo(x - 0.42 * dir * w * armorScale, y - 0.78 * h * armorScale);
  // Neck spines
  ctx.lineTo(x - 0.46 * dir * w * armorScale, y - 0.92 * h * armorScale);
  ctx.lineTo(x - 0.15 * dir * w * armorScale, y - 0.88 * h * armorScale);
  ctx.closePath();

  // Translucent crystalline armor fill
  ctx.fillStyle = auraFill;
  ctx.fill();

  // Glowing outer reinforced armor contour
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = outerBorder;
  ctx.shadowColor = resolveColor(armorHex, isOpponent, 0.9);
  ctx.shadowBlur = 9;
  ctx.lineJoin = "round";
  ctx.stroke();

  // Crisp high-tensile core stroke
  ctx.lineWidth = 1.0;
  ctx.strokeStyle = innerCore;
  ctx.stroke();
  ctx.restore();

  // 2. Reinforced Shell Carapace Armor Ring
  // Yoshi's shell is the origin of his armor / flutter energy
  const shellX = x - 0.48 * dir * w;
  const shellY = y - 0.62 * h;
  const shellRadiusW = Math.max(0.1, 0.32 * w);
  const shellRadiusH = Math.max(0.1, 0.22 * h);

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(
    shellX,
    shellY,
    shellRadiusW * armorScale,
    shellRadiusH * armorScale,
    0,
    0,
    Math.PI * 2,
  );
  ctx.strokeStyle = resolveColor("#ffffff", isOpponent, 0.9);
  ctx.lineWidth = 2.0;
  ctx.shadowColor = resolveColor(armorHex, isOpponent, 0.95);
  ctx.shadowBlur = 8;
  ctx.stroke();

  // Crystalline ridge cross on the shell
  ctx.beginPath();
  ctx.moveTo(shellX - shellRadiusW * 0.7, shellY);
  ctx.lineTo(shellX + shellRadiusW * 0.7, shellY);
  ctx.moveTo(shellX, shellY - shellRadiusH * 0.7);
  ctx.lineTo(shellX, shellY + shellRadiusH * 0.7);
  ctx.strokeStyle = resolveColor(armorHex, isOpponent, 0.85);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();

  // 3. Flutter Wings Accents
  // Radiating from Yoshi's back shell during his double jump flutter
  const flapAngle = Math.sin(frameCounter * 0.55) * 0.35;
  const wingAlpha = 0.65 + Math.cos(frameCounter * 0.55) * 0.25;

  ctx.save();
  ctx.translate(shellX, shellY);
  ctx.scale(dir, 1);

  for (const wingIndex of [0, 1] as const) {
    const isTop = wingIndex === 0;
    const baseRot = isTop ? -0.55 + flapAngle : 0.35 - flapAngle * 0.7;
    const wingLen = isTop ? w * 1.1 : w * 0.85;
    const wingThick = isTop ? h * 0.22 : h * 0.16;

    ctx.save();
    ctx.rotate(baseRot);
    ctx.beginPath();
    ctx.ellipse(
      -wingLen * 0.45,
      0,
      wingLen * 0.55,
      wingThick * 0.5,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = resolveColor("#e0f2fe", isOpponent, wingAlpha * 0.4);
    ctx.fill();
    ctx.strokeStyle = resolveColor("#38bdf8", isOpponent, wingAlpha * 0.9);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // 4. Kinetic Armor Diamond Spark Nodes along Yoshi's Body
  // Placed at key anatomical vertices (snout tip, crown, spines, shell, tail tip, soles)
  const sparkVertices = [
    { px: x + 0.88 * dir * w * armorScale, py: y - 0.74 * h * armorScale }, // Snout tip
    { px: x + 0.1 * dir * w * armorScale, py: y - 0.98 * h * armorScale }, // Head crest
    { px: x - 0.46 * dir * w * armorScale, py: y - 0.92 * h * armorScale }, // Neck spines
    { px: x - 1.08 * dir * w * armorScale, py: y - 0.52 * h * armorScale }, // Tail tip
    { px: x + 0.58 * dir * w * armorScale, py: y - 0.12 * h * armorScale }, // Front boot
    { px: x - 0.52 * dir * w * armorScale, py: y - 0.12 * h * armorScale }, // Rear boot
  ];

  ctx.save();
  for (let i = 0; i < sparkVertices.length; i++) {
    const v = sparkVertices[i];
    if (!v) continue;
    const sparkPhase = frameCounter * 0.25 + i * 1.2;
    const sparkPulse = 0.5 + 0.5 * Math.sin(sparkPhase);
    const sparkRadius = 1.8 + 1.2 * sparkPulse;

    // Small 4-pointed diamond spark
    ctx.beginPath();
    ctx.moveTo(v.px, v.py - sparkRadius * 1.4);
    ctx.lineTo(v.px + sparkRadius, v.py);
    ctx.lineTo(v.px, v.py + sparkRadius * 1.4);
    ctx.lineTo(v.px - sparkRadius, v.py);
    ctx.closePath();
    ctx.fillStyle = resolveColor("#ffffff", isOpponent, 0.9);
    ctx.shadowColor = resolveColor(armorHex, isOpponent, 0.95);
    ctx.shadowBlur = 6;
    ctx.fill();
  }
  ctx.restore();

  ctx.restore();
}
