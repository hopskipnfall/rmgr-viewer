import type { BackgroundTheme } from "../common/themes.js";

/**
 * Duration in frames for the "XF gap" text callout to fade out after the escape gap ends.
 * At 60 FPS, 90 frames gives viewers 1.5 seconds to clearly read the gap duration.
 */
export const COMBO_GAP_CALLOUT_FADE_FRAMES = 90;

export interface ComboGapBadgeColors {
  readonly border: string;
  readonly text: string;
  readonly glow: string;
}

/**
 * Resolves color palette for combo escape badges based on escape difficulty:
 * - <= 3f: Muted silver slate (hardest escape, near impossible to react)
 * - <= 10f: Luminous yellow (tight window)
 * - <= 20f: Alert orange (moderate window)
 * - > 20f: Crimson red (easiest escape, massive window player should have gotten out of)
 */
export function getComboGapBadgeColors(
  actionableFrameCount: number,
  alpha: number = 1.0,
): ComboGapBadgeColors {
  if (actionableFrameCount <= 3) {
    return {
      border: `rgba(148, 163, 184, ${0.9 * alpha})`,
      text: `rgba(226, 232, 240, ${alpha})`,
      glow: `rgba(148, 163, 184, ${0.6 * alpha})`,
    };
  }
  if (actionableFrameCount <= 10) {
    return {
      border: `rgba(234, 179, 8, ${0.92 * alpha})`,
      text: `rgba(254, 240, 138, ${alpha})`,
      glow: `rgba(250, 204, 21, ${0.75 * alpha})`,
    };
  }
  if (actionableFrameCount <= 20) {
    return {
      border: `rgba(249, 115, 22, ${0.92 * alpha})`,
      text: `rgba(254, 215, 170, ${alpha})`,
      glow: `rgba(249, 115, 22, ${0.75 * alpha})`,
    };
  }
  return {
    border: `rgba(239, 68, 68, ${0.92 * alpha})`,
    text: `rgba(254, 202, 202, ${alpha})`,
    glow: `rgba(239, 68, 68, ${0.75 * alpha})`,
  };
}

export interface ComboEscapeSilhouetteColors {
  readonly fill: string;
  readonly stroke: string;
  readonly glow: string;
}

/**
 * Resolves theme-adaptive silhouette colors for actionable fighters:
 * - Dark themes: luminous radiant yellow with warm golden amber outline and glow
 * - Light/day themes: deep golden amber with dark contour for high sky contrast
 * - Autumn theme: electric lemon yellow to pop clearly against red/orange leaves
 */
export function getComboEscapeSilhouetteColors(
  theme: BackgroundTheme,
  isLight: boolean,
): ComboEscapeSilhouetteColors {
  if (isLight) {
    return {
      fill: "rgba(234, 179, 8, 0.95)",
      stroke: "rgba(161, 98, 7, 0.95)",
      glow: "rgba(202, 138, 4, 0.6)",
    };
  }
  if (theme === "autumn") {
    return {
      fill: "rgba(254, 240, 138, 0.95)",
      stroke: "rgba(250, 204, 21, 0.95)",
      glow: "#facc15",
    };
  }
  if (theme === "mountain") {
    return {
      fill: "rgba(250, 204, 21, 0.95)",
      stroke: "rgba(234, 179, 8, 0.95)",
      glow: "#fbbf24",
    };
  }
  return {
    fill: "rgba(250, 204, 21, 0.95)",
    stroke: "rgba(234, 179, 8, 0.95)",
    glow: "#facc15",
  };
}

/**
 * Resolves red silhouette colors for fighters trapped in hitstun:
 * - Dark themes: luminous intense crimson with dark red contour and radiant red glow
 * - Light/day themes: deep crimson red for high daylight contrast
 */
export function getHitstunSilhouetteColors(
  _theme: BackgroundTheme,
  isLight: boolean,
): ComboEscapeSilhouetteColors {
  if (isLight) {
    return {
      fill: "rgba(220, 38, 38, 0.95)",
      stroke: "rgba(153, 27, 27, 0.95)",
      glow: "rgba(220, 38, 38, 0.65)",
    };
  }
  return {
    fill: "rgba(239, 68, 68, 0.95)",
    stroke: "rgba(185, 28, 28, 0.95)",
    glow: "#ef4444",
  };
}

/**
 * Resolves silver/chrome silhouette colors for invulnerable or invincible fighters:
 * - Dark themes: luminous liquid platinum silver with pure white specular contours and radiant starlight cyan-silver glow
 * - Light/day themes: sleek polished platinum silver with pure white contour and crisp silver glow for sky contrast
 */
export function getInvincibleSilhouetteColors(
  _theme: BackgroundTheme,
  isLight: boolean,
): ComboEscapeSilhouetteColors {
  if (isLight) {
    return {
      fill: "rgba(218, 228, 240, 0.98)",
      stroke: "#ffffff",
      glow: "rgba(148, 163, 184, 0.9)",
    };
  }
  return {
    fill: "rgba(240, 246, 255, 0.98)",
    stroke: "#ffffff",
    glow: "rgba(224, 242, 254, 1.0)",
  };
}

/**
 * Creates a transparent proxy around CanvasRenderingContext2D that intercepts all fillStyle
 * and strokeStyle mutations, locking them to the active silhouette colors.
 * This turns all drawn polygon geometry for any character model into a solid, crisp silhouette.
 */
export function createSilhouetteContext(
  ctx: CanvasRenderingContext2D,
  fillStyle: string,
  strokeStyle: string,
): CanvasRenderingContext2D {
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  return new Proxy(ctx, {
    get(target, prop) {
      if (prop === "fillStyle") {
        return fillStyle;
      }
      if (prop === "strokeStyle") {
        return strokeStyle;
      }
      const val = Reflect.get(target, prop, target);
      if (typeof val === "function") {
        return val.bind(target);
      }
      return val;
    },
    set(target, prop, value) {
      if (
        prop === "fillStyle" ||
        prop === "strokeStyle" ||
        prop === "shadowColor" ||
        prop === "shadowBlur"
      ) {
        // Suppress individual polygon color and shadow changes so silhouette remains uniform
        return true;
      }
      return Reflect.set(target, prop, value, target);
    },
  });
}

/**
 * Backwards-compatible helper for rectangular highlight card tests.
 */
export function drawComboEscapeHighlight(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
): void {
  ctx.save();
  const boxW = Math.max(38, halfWidth * 2.3);
  const boxH = Math.max(48, heightPx * 1.3);
  const boxX = x - boxW / 2;
  const boxY = centerY - boxH / 2;
  const radius = 8;

  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, radius);
  ctx.fillStyle = "rgba(250, 204, 21, 0.42)";
  ctx.shadowColor = "#facc15";
  ctx.shadowBlur = 14;
  ctx.fill();

  ctx.strokeStyle = "rgba(234, 179, 8, 0.95)";
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(
    boxX + 2,
    boxY + 2,
    boxW - 4,
    boxH - 4,
    Math.max(2, radius - 2),
  );
  ctx.strokeStyle = "rgba(254, 240, 138, 0.65)";
  ctx.lineWidth = 1.0;
  ctx.stroke();

  ctx.restore();
}

/**
 * Renders the floating "XF gap" badge beside the fighter that smoothly fades out.
 *
 * @param ctx Canvas 2D rendering context
 * @param x Fighter screen center X (or locked anchor X)
 * @param centerY Fighter screen center Y (or locked anchor centerY)
 * @param halfWidth Fighter screen half width
 * @param _heightPx Fighter screen height
 * @param facingRight Whether the fighter was facing right
 * @param actionableFrameCount Total actionable frames in this gap (e.g. 2, 5, 22)
 * @param alpha Current opacity (1.0 during gap, decaying to 0 over 90 frames post-gap)
 */
export function drawComboEscapeTextCallout(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  _heightPx: number,
  facingRight: boolean,
  actionableFrameCount: number,
  alpha: number,
): void {
  if (alpha <= 0.01) return;

  ctx.save();

  // Subtle float upward during fadeout
  const floatUp = (1 - alpha) * 10;
  const sideDir = facingRight ? -1 : 1; // Float behind the fighter's back to avoid overlap
  const text = `${actionableFrameCount}F gap`;

  ctx.font = "800 15px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const textMetrics = ctx.measureText(text);
  const pillW = Math.max(54, textMetrics.width + 18);
  const pillH = 26;

  const pillX = x + sideDir * (halfWidth + pillW / 2 + 10);
  const pillY = centerY - 10 - floatUp;

  const colors = getComboGapBadgeColors(actionableFrameCount, alpha);

  // Dark slate backdrop pill
  ctx.beginPath();
  ctx.roundRect(pillX - pillW / 2, pillY - pillH / 2, pillW, pillH, 6);
  ctx.fillStyle = `rgba(15, 23, 42, ${0.9 * alpha})`;
  ctx.shadowColor = `rgba(0, 0, 0, ${0.7 * alpha})`;
  ctx.shadowBlur = 6;
  ctx.fill();

  // Difficulty-colored border
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Punchy text with difficulty glow
  ctx.fillStyle = colors.text;
  ctx.shadowColor = colors.glow;
  ctx.shadowBlur = 5;
  ctx.fillText(text, pillX, pillY);

  ctx.restore();
}

/**
 * Draws shining silver diamond sparkles / glints around an invincible or invulnerable character.
 */
export function drawInvincibleSparkles(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  frameCounter: number,
): void {
  ctx.save();
  const glints = [
    { phase: 0, relX: -0.65, relY: -0.4, scale: 1.0 },
    { phase: 1.8, relX: 0.6, relY: -0.25, scale: 0.85 },
    { phase: 3.5, relX: -0.3, relY: 0.35, scale: 0.95 },
    { phase: 5.0, relX: 0.45, relY: 0.4, scale: 0.75 },
  ];
  for (let i = 0; i < glints.length; i++) {
    const g = glints[i]!;
    const cycle = (frameCounter * 0.14 + g.phase) % (Math.PI * 2);
    const sparkleAlpha = Math.max(0, Math.sin(cycle));
    if (sparkleAlpha <= 0.08) continue;
    const sx = x + g.relX * halfWidth * 1.35;
    const sy = centerY + g.relY * heightPx * 0.5;
    const size = (3.5 + sparkleAlpha * 3.5) * g.scale;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(frameCounter * 0.08 + g.phase);
    ctx.fillStyle = `rgba(255, 255, 255, ${sparkleAlpha * 0.95})`;
    ctx.shadowColor = "rgba(224, 242, 254, 0.95)";
    ctx.shadowBlur = 8;

    // 4-point star sparkle
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.22, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.22, 0);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(0, size * 0.22);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, -size * 0.22);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
  ctx.restore();
}
