import { hexToRgba } from "../common/index.js";

/**
 * Renders a Super Smash Bros. forcefield energy bubble surrounding the character.
 * - Normal Shield: Translucent 3D spherical glass forcefield with spherical radial gradient,
 *   glossy specular highlight arcs, glowing outer rim, and player-color energy aura.
 * - Shield Stun: Energized kinetic impact state featuring tight micro-vibration,
 *   a bright impact flash core, energized white rim, and an electric stress highlight arc.
 * - shieldHealth: Optional current shield health (0-55). Ready for shield health scaling spec.
 */
export function drawShieldBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  color: string,
  isShieldStun: boolean,
  frameCounter: number,
  shieldHealth?: number,
  isPaused?: boolean,
): void {
  // Full health defaults to 55 (Smash 64 standard max shield health)
  const health = shieldHealth !== undefined ? shieldHealth : 55;
  const healthRatio = Math.max(0, Math.min(1, health / 55));

  // Physical radius scaling: 48% at 0 HP up to 100% at 55 HP
  const radiusScale = 0.48 + 0.52 * healthRatio;
  const unscaledRadius = Math.max(halfWidth * 1.35, heightPx * 0.58) + 3;
  const baseRadius = unscaledRadius * radiusScale;

  // Color & stress escalation tiers
  // - Critical (<= 11 HP): High-contrast flashing red/white strobe (one hit away from break)
  // - Low (12-25 HP): Deep warning crimson
  // - Medium (26-41 HP): Warm amber / orange
  // - High (>= 42 HP): Standard player port color
  let shieldColor = color;
  if (health <= 11) {
    shieldColor = frameCounter % 8 < 4 ? "#ffffff" : "#ef4444";
  } else if (health <= 25) {
    shieldColor = "#dc2626";
  } else if (health <= 41) {
    shieldColor = "#f59e0b";
  }

  ctx.save();

  let cx = x;
  let cy = centerY;
  let radius = baseRadius;

  if (isShieldStun) {
    // Subtle kinetic micro-vibration under impact
    const jitterX = (((frameCounter * 7) % 3) - 1) * 0.8;
    const jitterY = (((frameCounter * 11) % 3) - 1) * 0.6;
    cx = x + jitterX;
    cy = centerY + jitterY;

    // Gentle radius pulse
    const pulse = Math.sin(frameCounter * 0.8) * 1.2;
    radius = baseRadius + pulse;

    // 1. Energized impact flash fill (brighter, more saturated than normal shield)
    const grad = ctx.createRadialGradient(
      cx - radius * 0.2,
      cy - radius * 0.2,
      radius * 0.1,
      cx,
      cy,
      radius,
    );
    grad.addColorStop(0, "rgba(255, 255, 255, 0.45)");
    grad.addColorStop(0.5, hexToRgba(shieldColor, 0.55));
    grad.addColorStop(0.85, hexToRgba(shieldColor, 0.8));
    grad.addColorStop(1, "rgba(255, 255, 255, 0.95)");

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 2. High-energy glowing perimeter
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = health <= 11 ? shieldColor : "#ffffff";
    ctx.lineWidth = 3.5;
    ctx.shadowColor = shieldColor;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.restore();

    // 3. Electric stress highlight arc
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, -Math.PI * 0.9, -Math.PI * 0.3, false);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();

    // 4. Tight outer compression ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.08, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(shieldColor, 0.4);
    ctx.lineWidth = 1.4;
    ctx.stroke();
  } else {
    // Normal protective spherical energy bubble
    // 1. Spherical 3D energy fill with radial gradient (translucent core, luminous rim)
    const grad = ctx.createRadialGradient(
      cx - radius * 0.25,
      cy - radius * 0.25,
      radius * 0.1,
      cx,
      cy,
      radius,
    );
    grad.addColorStop(0, hexToRgba(shieldColor, 0.28));
    grad.addColorStop(0.65, hexToRgba(shieldColor, 0.45));
    grad.addColorStop(0.88, hexToRgba(shieldColor, 0.72));
    grad.addColorStop(1, hexToRgba(shieldColor, 0.95));

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 2. Luminous glowing forcefield rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(shieldColor, 0.95);
    ctx.lineWidth = health <= 25 ? 3.5 : 3;
    ctx.shadowColor = shieldColor;
    ctx.shadowBlur = health <= 25 ? 12 + Math.sin(frameCounter * 0.6) * 4 : 10;
    ctx.stroke();
    ctx.restore();

    // 3. Inner concentric forcefield ring shimmer
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.76, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 4. Glossy glass specular reflection arc on upper-left rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, -Math.PI * 0.85, -Math.PI * 0.35, false);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 6;
    ctx.stroke();

    // Secondary smaller specular glint at bottom-right rim
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, Math.PI * 0.25, Math.PI * 0.45, false);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  }

  // 5. Glass micro-cracks under severe stress (health <= 25)
  if (health <= 25) {
    const crackCount = health <= 11 ? 4 : 2;
    drawMicroCracks(ctx, cx, cy, radius, crackCount);
  }

  // 6. Perimeter arc ring gauge showing remaining health fraction
  drawPerimeterGauge(ctx, cx, cy, radius, health, healthRatio, frameCounter);

  // 7. Paused HUD status badge (exact numbers without cluttering active 60 FPS play)
  if (isPaused) {
    drawShieldPausedBadge(ctx, cx, cy - radius - 8, health);
  }

  ctx.restore();
}

/**
 * Draws jagged fracture fissures across the bubble surface when shield health is critically low.
 */
function drawMicroCracks(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  count: number,
): void {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "bevel";
  ctx.shadowColor = "rgba(255, 100, 100, 0.8)";
  ctx.shadowBlur = 3;

  // Crack 1: Upper-left branching fissure
  ctx.beginPath();
  ctx.moveTo(cx - radius * 0.65, cy - radius * 0.45);
  ctx.lineTo(cx - radius * 0.45, cy - radius * 0.3);
  ctx.lineTo(cx - radius * 0.5, cy - radius * 0.15);
  ctx.lineTo(cx - radius * 0.22, cy - radius * 0.05);
  // Branch
  ctx.moveTo(cx - radius * 0.45, cy - radius * 0.3);
  ctx.lineTo(cx - radius * 0.3, cy - radius * 0.35);
  ctx.stroke();

  // Crack 2: Lower-right jagged fissure
  ctx.beginPath();
  ctx.moveTo(cx + radius * 0.6, cy + radius * 0.4);
  ctx.lineTo(cx + radius * 0.4, cy + radius * 0.25);
  ctx.lineTo(cx + radius * 0.35, cy + radius * 0.05);
  ctx.lineTo(cx + radius * 0.15, cy - radius * 0.05);
  // Branch
  ctx.moveTo(cx + radius * 0.4, cy + radius * 0.25);
  ctx.lineTo(cx + radius * 0.28, cy + radius * 0.38);
  ctx.stroke();

  if (count >= 4) {
    // Crack 3: Upper-right jagged fissure
    ctx.beginPath();
    ctx.moveTo(cx + radius * 0.55, cy - radius * 0.5);
    ctx.lineTo(cx + radius * 0.35, cy - radius * 0.3);
    ctx.lineTo(cx + radius * 0.4, cy - radius * 0.1);
    ctx.lineTo(cx + radius * 0.15, cy - radius * 0.18);
    // Branch
    ctx.moveTo(cx + radius * 0.35, cy - radius * 0.3);
    ctx.lineTo(cx + radius * 0.22, cy - radius * 0.38);
    ctx.stroke();

    // Crack 4: Lower-left jagged fissure
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.55, cy + radius * 0.5);
    ctx.lineTo(cx - radius * 0.35, cy + radius * 0.35);
    ctx.lineTo(cx - radius * 0.3, cy + radius * 0.15);
    ctx.lineTo(cx - radius * 0.1, cy + radius * 0.1);
    // Branch
    ctx.moveTo(cx - radius * 0.35, cy + radius * 0.35);
    ctx.lineTo(cx - radius * 0.2, cy + radius * 0.42);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws a thin luminous perimeter arc ring gauge around the shield bubble.
 * Starts at 12 o'clock (-PI/2) and extends clockwise based on remaining healthRatio.
 */
function drawPerimeterGauge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  health: number,
  healthRatio: number,
  frameCounter: number,
): void {
  const gaugeRadius = radius + 2.5;

  // Background track (subtle translucent ring)
  ctx.beginPath();
  ctx.arc(cx, cy, gaugeRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  if (healthRatio > 0) {
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * healthRatio;

    let gaugeColor = "#22c55e"; // Healthy green
    if (health <= 11) {
      gaugeColor = frameCounter % 8 < 4 ? "#ffffff" : "#ef4444";
    } else if (health <= 25) {
      gaugeColor = "#ef4444";
    } else if (health <= 41) {
      gaugeColor = "#f59e0b";
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, gaugeRadius, startAngle, endAngle, false);
    ctx.strokeStyle = gaugeColor;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.shadowColor = gaugeColor;
    ctx.shadowBlur = 4;
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Renders a compact paused status badge above the shield bubble during analysis/scrubbing.
 */
function drawShieldPausedBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  badgeY: number,
  health: number,
): void {
  ctx.save();
  const isCritical = health <= 11;
  const text = `🛡️ ${Math.round(health)}/55`;
  const tierColor =
    health <= 11
      ? "#ef4444"
      : health <= 25
        ? "#ef4444"
        : health <= 41
          ? "#f59e0b"
          : "#10b981";

  ctx.font = "bold 9px 'SF Pro Text', -apple-system, sans-serif";
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const paddingX = 5;
  const badgeHeight = 14;
  const badgeWidth = textWidth + paddingX * 2;
  const badgeX = cx - badgeWidth / 2;
  const cornerRadius = 3;

  // Background pill
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(
      badgeX,
      badgeY - badgeHeight + 3,
      badgeWidth,
      badgeHeight,
      cornerRadius,
    );
  } else {
    ctx.rect(badgeX, badgeY - badgeHeight + 3, badgeWidth, badgeHeight);
  }
  ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
  ctx.fill();

  // Subtle border in tier color
  ctx.strokeStyle = tierColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Text
  ctx.fillStyle = isCritical ? "#fca5a5" : "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, cx, badgeY);

  ctx.restore();
}
