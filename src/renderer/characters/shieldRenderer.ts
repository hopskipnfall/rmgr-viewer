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
  isInvincible?: boolean,
  isLight?: boolean,
): void {
  // Full health defaults to 55 (Smash 64 standard max shield health)
  const health = shieldHealth !== undefined ? shieldHealth : 55;
  const healthRatio = Math.max(0, Math.min(1, health / 55));

  // Physical radius scaling: 48% at 0 HP up to 100% at 55 HP
  const radiusScale = 0.48 + 0.52 * healthRatio;
  const unscaledRadius = Math.max(halfWidth * 1.35, heightPx * 0.58) + 3;
  const baseRadius = unscaledRadius * radiusScale;

  // Color & stress escalation tiers
  // - Invincible: Luminous liquid platinum silver
  // - Critical (<= 11 HP): High-contrast flashing red/white strobe (one hit away from break)
  // - Low (12-25 HP): Deep warning crimson
  // - Medium (26-41 HP): Warm amber / orange
  // - High (>= 42 HP): Standard player port color
  let shieldColor = color;
  if (isInvincible) {
    shieldColor = isLight
      ? "rgba(218, 228, 240, 0.98)"
      : "rgba(240, 246, 255, 0.98)";
  } else if (health <= 11) {
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
    if (isInvincible) {
      grad.addColorStop(0, "rgba(255, 255, 255, 0.7)");
      grad.addColorStop(0.5, "rgba(240, 246, 255, 0.85)");
      grad.addColorStop(0.85, "rgba(224, 242, 254, 0.95)");
      grad.addColorStop(1, "rgba(255, 255, 255, 1.0)");
    } else {
      grad.addColorStop(0, "rgba(255, 255, 255, 0.45)");
      grad.addColorStop(0.5, hexToRgba(shieldColor, 0.55));
      grad.addColorStop(0.85, hexToRgba(shieldColor, 0.8));
      grad.addColorStop(1, "rgba(255, 255, 255, 0.95)");
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 2. High-energy glowing perimeter
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = isInvincible
      ? "#ffffff"
      : health <= 11
        ? shieldColor
        : "#ffffff";
    ctx.lineWidth = 3.5;
    ctx.shadowColor = isInvincible
      ? isLight
        ? "rgba(148, 163, 184, 0.95)"
        : "rgba(224, 242, 254, 1.0)"
      : shieldColor;
    ctx.shadowBlur = isInvincible ? 16 : 12;
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
    if (isInvincible) {
      if (isLight) {
        grad.addColorStop(0, "rgba(255, 255, 255, 0.65)");
        grad.addColorStop(0.55, "rgba(226, 232, 240, 0.75)");
        grad.addColorStop(0.85, "rgba(203, 213, 225, 0.90)");
        grad.addColorStop(1, "rgba(241, 245, 249, 0.98)");
      } else {
        grad.addColorStop(0, "rgba(255, 255, 255, 0.70)");
        grad.addColorStop(0.55, "rgba(240, 246, 255, 0.80)");
        grad.addColorStop(0.85, "rgba(224, 242, 254, 0.92)");
        grad.addColorStop(1, "rgba(255, 255, 255, 1.0)");
      }
    } else {
      grad.addColorStop(0, hexToRgba(shieldColor, 0.28));
      grad.addColorStop(0.65, hexToRgba(shieldColor, 0.45));
      grad.addColorStop(0.88, hexToRgba(shieldColor, 0.72));
      grad.addColorStop(1, hexToRgba(shieldColor, 0.95));
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 2. Luminous glowing forcefield rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = isInvincible ? "#ffffff" : hexToRgba(shieldColor, 0.95);
    ctx.lineWidth = isInvincible ? 3.5 : health <= 25 ? 3.5 : 3;
    ctx.shadowColor = isInvincible
      ? isLight
        ? "rgba(148, 163, 184, 0.95)"
        : "rgba(224, 242, 254, 1.0)"
      : shieldColor;
    ctx.shadowBlur = isInvincible
      ? 18 + Math.sin(frameCounter * 0.28) * 4
      : health <= 25
        ? 12 + Math.sin(frameCounter * 0.6) * 4
        : 10;
    ctx.stroke();
    ctx.restore();

    // 3. Inner concentric forcefield ring shimmer
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.76, 0, Math.PI * 2);
    ctx.strokeStyle = isInvincible
      ? "rgba(255, 255, 255, 0.45)"
      : "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = isInvincible ? 1.4 : 1.2;
    ctx.stroke();

    // 4. Glossy glass specular reflection arc on upper-left rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, -Math.PI * 0.85, -Math.PI * 0.35, false);
    ctx.strokeStyle = isInvincible ? "#ffffff" : "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = isInvincible ? 3 : 2.5;
    ctx.lineCap = "round";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = isInvincible ? 8 : 6;
    ctx.stroke();

    // Secondary smaller specular glint at bottom-right rim
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, Math.PI * 0.25, Math.PI * 0.45, false);
    ctx.strokeStyle = isInvincible
      ? "rgba(255, 255, 255, 0.65)"
      : "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = isInvincible ? 2 : 1.8;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  }

  // 5. Glass micro-cracks under severe stress (health <= 25)
  if (!isInvincible && health <= 25) {
    const crackCount = health <= 11 ? 4 : 2;
    drawMicroCracks(ctx, cx, cy, radius, crackCount);
  }

  // 6. Perimeter arc ring gauge showing remaining health fraction
  drawPerimeterGauge(
    ctx,
    cx,
    cy,
    radius,
    health,
    healthRatio,
    frameCounter,
    isInvincible,
  );

  // 7. Paused HUD status badge (exact numbers without cluttering active 60 FPS play)
  if (isPaused) {
    drawShieldPausedBadge(ctx, cx, cy - radius - 8, health, isInvincible);
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
  isInvincible?: boolean,
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
    if (isInvincible) {
      gaugeColor = "#ffffff";
    } else if (health <= 11) {
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
    ctx.shadowBlur = isInvincible ? 6 : 4;
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
  isInvincible?: boolean,
): void {
  ctx.save();
  const isCritical = !isInvincible && health <= 11;
  const text = isInvincible
    ? `🛡️ Invincible • ${Math.round(health)}/55`
    : `🛡️ ${Math.round(health)}/55`;
  const tierColor = isInvincible
    ? "#ffffff"
    : health <= 11
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

export const SHIELD_BREAK_POP_FRAMES = 24;

interface PopShard {
  angle: number;
  speed: number;
  size: number;
  spinDir: number;
  aspect: number;
}

const POP_SHARDS: readonly PopShard[] = [
  { angle: 0.15, speed: 1.8, size: 8, spinDir: 1, aspect: 1.3 },
  { angle: 0.78, speed: 1.4, size: 7, spinDir: -1, aspect: 0.9 },
  { angle: 1.41, speed: 2.1, size: 9, spinDir: 1, aspect: 1.1 },
  { angle: 2.05, speed: 1.6, size: 6.5, spinDir: -1, aspect: 1.4 },
  { angle: 2.68, speed: 1.9, size: 8.5, spinDir: 1, aspect: 1.0 },
  { angle: 3.32, speed: 1.5, size: 7.5, spinDir: -1, aspect: 1.2 },
  { angle: 3.95, speed: 2.2, size: 9, spinDir: 1, aspect: 0.8 },
  { angle: 4.58, speed: 1.7, size: 6.5, spinDir: -1, aspect: 1.5 },
  { angle: 5.21, speed: 2.0, size: 8, spinDir: 1, aspect: 1.1 },
  { angle: 5.84, speed: 1.5, size: 7, spinDir: -1, aspect: 1.2 },
];

interface PopSpark {
  angle: number;
  speed: number;
  size: number;
  color: string;
}

const POP_SPARKS: readonly PopSpark[] = [
  { angle: 0.35, speed: 2.8, size: 2.5, color: "#ffffff" },
  { angle: 0.95, speed: 3.2, size: 2.0, color: "#fca5a5" },
  { angle: 1.55, speed: 2.5, size: 2.2, color: "#ef4444" },
  { angle: 2.15, speed: 3.4, size: 1.8, color: "#ffffff" },
  { angle: 2.75, speed: 2.9, size: 2.4, color: "#fca5a5" },
  { angle: 3.35, speed: 3.1, size: 2.0, color: "#ef4444" },
  { angle: 3.95, speed: 2.6, size: 2.2, color: "#ffffff" },
  { angle: 4.55, speed: 3.5, size: 1.9, color: "#fca5a5" },
  { angle: 5.15, speed: 2.7, size: 2.3, color: "#ef4444" },
  { angle: 5.75, speed: 3.3, size: 2.1, color: "#ffffff" },
  { angle: 1.15, speed: 3.6, size: 1.7, color: "#fbbf24" },
  { angle: 4.15, speed: 3.7, size: 1.7, color: "#fbbf24" },
];

/**
 * Renders the explosive Smash 64 shield break "pop" animation.
 * When a fighter's shield breaks and they enter state 0x9e (ShieldBreakFly):
 * - Frames 0-3: The shield is shown in its ultimate critical, over-pressurized state:
 *   intense crimson/white strobe, violent tremor/jitter, and spreading spiderweb fractures bulging outwards.
 * - Frames 4-7: The shield violently "POPS":
 *   central detonation burst flash, expanding shockwave rings, and radiating energy spikes.
 * - Frames 4-22: The shattered crystal/glass fragments blast outward in all directions,
 *   spinning with realistic ballistic deceleration and glowing rim highlights before dissolving into crimson embers.
 * - Frames 4-23: Dispersing high-velocity spark flecks.
 * - Frame 24+: Clean screen, transition complete.
 */
export function drawShieldBreakPop(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  color: string,
  frameCounter: number,
  isLight: boolean = false,
): void {
  const f = Math.max(0, Math.floor(frameCounter));
  if (f >= SHIELD_BREAK_POP_FRAMES) {
    return;
  }

  const unscaledRadius = Math.max(halfWidth * 1.35, heightPx * 0.58) + 3;
  const baseRadius = unscaledRadius * 0.48; // Critical 0 HP shield radius

  ctx.save();

  if (f < 4) {
    // -------------------------------------------------------------
    // PHASE 1: Imminent Rupture (Frames 0 to 3)
    // Stressed, bulging crimson shield flashing white with fissures
    // -------------------------------------------------------------
    const jitterX = (((f * 13 + 3) % 5) - 2) * (1.2 + f * 0.4);
    const jitterY = (((f * 17 + 7) % 5) - 2) * (1.0 + f * 0.4);
    const cx = x + jitterX;
    const cy = centerY + jitterY;

    // Radius balloons outward under extreme internal pressure
    const expansionMult = [1.0, 1.1, 1.25, 1.45][f] ?? 1.0;
    const radius = baseRadius * expansionMult;

    // Strobe between incandescent white and intense warning crimson
    const isWhiteStrobe = f % 2 === 1;
    const rimColor = isWhiteStrobe ? "#ffffff" : "#ef4444";

    // 1. Core radial gradient fill
    const grad = ctx.createRadialGradient(
      cx - radius * 0.15,
      cy - radius * 0.15,
      radius * 0.05,
      cx,
      cy,
      radius,
    );
    if (isWhiteStrobe) {
      grad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
      grad.addColorStop(0.45, "rgba(254, 202, 202, 0.8)");
      grad.addColorStop(0.8, "rgba(239, 68, 68, 0.85)");
      grad.addColorStop(1, "rgba(185, 28, 28, 0.95)");
    } else {
      grad.addColorStop(0, "rgba(255, 255, 255, 0.65)");
      grad.addColorStop(0.4, "rgba(239, 68, 68, 0.75)");
      grad.addColorStop(0.85, "rgba(220, 38, 38, 0.88)");
      grad.addColorStop(1, "rgba(153, 27, 27, 0.98)");
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 2. High-energy perimeter rim with glowing shadow
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = 3.5 + f * 0.5;
    ctx.shadowColor = isLight ? "rgba(220, 38, 38, 0.8)" : "#ef4444";
    ctx.shadowBlur = 14 + f * 4;
    ctx.stroke();

    // 3. Dense fracture network spreading across the surface
    drawMicroCracks(ctx, cx, cy, radius, 4);

    // Extra cross-cutting split fissures during frames 2 and 3
    if (f >= 2) {
      ctx.beginPath();
      ctx.moveTo(cx - radius * 0.7, cy);
      ctx.lineTo(cx - radius * 0.2, cy + radius * 0.2);
      ctx.lineTo(cx + radius * 0.2, cy - radius * 0.15);
      ctx.lineTo(cx + radius * 0.75, cy + radius * 0.1);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
  } else {
    // -------------------------------------------------------------
    // PHASE 2 & 3: The "POP", Shockwave Halos & Shattered Flying Shards
    // -------------------------------------------------------------
    const elapsed = f - 3; // 1 to 20

    // 1. Central Detonation Burst Flash (Frames 4 to 7)
    if (f <= 7) {
      const flashProgress = (f - 4) / 3; // 0 to 1
      const flashRadius = baseRadius * (1.2 + flashProgress * 1.0);
      const flashAlpha = (1 - flashProgress) * 0.9;

      const flashGrad = ctx.createRadialGradient(
        x,
        centerY,
        0,
        x,
        centerY,
        flashRadius,
      );
      flashGrad.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
      flashGrad.addColorStop(0.4, `rgba(254, 202, 202, ${flashAlpha * 0.85})`);
      flashGrad.addColorStop(0.8, `rgba(239, 68, 68, ${flashAlpha * 0.6})`);
      flashGrad.addColorStop(1, "rgba(239, 68, 68, 0)");

      ctx.beginPath();
      ctx.arc(x, centerY, flashRadius, 0, Math.PI * 2);
      ctx.fillStyle = flashGrad;
      ctx.fill();

      // Radiant energy burst spike rays
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      for (let k = 0; k < 8; k++) {
        const spikeAngle = (k * Math.PI) / 4 + 0.18;
        const innerR = baseRadius * 0.6;
        const outerR =
          baseRadius * (1.4 + (k % 2 === 0 ? 0.7 : 0.35) * (1 - flashProgress));
        ctx.beginPath();
        ctx.moveTo(
          x + Math.cos(spikeAngle) * innerR,
          centerY + Math.sin(spikeAngle) * innerR,
        );
        ctx.lineTo(
          x + Math.cos(spikeAngle) * outerR,
          centerY + Math.sin(spikeAngle) * outerR,
        );
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Primary Expanding Shockwave Ring (Frames 4 to 18)
    if (f <= 18) {
      const ringProgress = (f - 4) / 14; // 0 to 1
      const ringRadius = baseRadius * (1.1 + ringProgress * 2.2);
      const ringAlpha = Math.max(0, (1 - ringProgress) * 0.85);

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, centerY, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle =
        ringProgress < 0.3
          ? `rgba(255, 255, 255, ${ringAlpha})`
          : `rgba(239, 68, 68, ${ringAlpha})`;
      ctx.lineWidth = Math.max(1, 3.8 * (1 - ringProgress));
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 8 * (1 - ringProgress);
      ctx.stroke();

      // Secondary trailing ripple
      if (ringProgress > 0.1) {
        ctx.beginPath();
        ctx.arc(x, centerY, ringRadius * 0.78, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(254, 202, 202, ${ringAlpha * 0.55})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Exploding Shattered Crystal Shards (Frames 4 to 22)
    if (f <= 22) {
      // Shard alpha fades gracefully after frame 9
      const shardAlpha = f <= 9 ? 1.0 : Math.max(0, 1 - (f - 9) / 13);

      for (const shard of POP_SHARDS) {
        const dist =
          baseRadius * 1.1 + shard.speed * Math.pow(elapsed, 0.86) * 4.4;
        const sx = x + Math.cos(shard.angle) * dist;
        const sy = centerY + Math.sin(shard.angle) * dist;
        const spin = elapsed * 0.24 * shard.spinDir;
        const sz = shard.size * (1 - (elapsed / 22) * 0.25);
        const asp = shard.aspect;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(shard.angle + spin);

        // Draw multi-faceted crystal shard polygon
        ctx.beginPath();
        ctx.moveTo(-sz * 0.6, -sz * 0.35 * asp);
        ctx.lineTo(sz * 0.7, -sz * 0.2 * asp);
        ctx.lineTo(sz * 0.3, sz * 0.7 * asp);
        ctx.lineTo(-sz * 0.5, sz * 0.45 * asp);
        ctx.closePath();

        // Crimson ruby shard fill
        ctx.fillStyle = `rgba(239, 68, 68, ${shardAlpha * 0.88})`;
        ctx.fill();

        // Gleaming shard border
        ctx.strokeStyle = `rgba(255, 255, 255, ${shardAlpha * 0.95})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();
      }
    }

    // 4. Dispersing High-Velocity Spark Flecks (Frames 4 to 23)
    if (f <= 23) {
      const sparkAlpha = Math.max(0, 1 - elapsed / 20);

      ctx.save();
      for (const spark of POP_SPARKS) {
        const dist =
          baseRadius * 1.0 + spark.speed * Math.pow(elapsed, 0.9) * 5.0;
        const px = x + Math.cos(spark.angle) * dist;
        const py = centerY + Math.sin(spark.angle) * dist;
        const sparkRadius = Math.max(0.6, spark.size * (1 - elapsed / 22));

        ctx.beginPath();
        ctx.arc(px, py, sparkRadius, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(spark.color, sparkAlpha * 0.9);
        ctx.shadowColor = spark.color;
        ctx.shadowBlur = 4;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  ctx.restore();
}
