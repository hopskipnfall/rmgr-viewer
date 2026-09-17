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
