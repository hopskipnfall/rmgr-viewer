import { HazardFlag, hasHazardFlag, type Frame } from "@rmg-k/rmgr";
import type { Camera } from "../../camera.js";
import { stageBlastZone, DREAM_LAND_STAGE_ID } from "../../stageGeometry.js";
import { recoveryZoneBoundary } from "../../edgeGuard.js";
import type { BackgroundTheme } from "../common/index.js";

// Whispy Woods wind-affected box on Dream Land, in world units
export const WHISPY_WIND_X = -525.0;
export const WHISPY_WIND_BOX_TOP = 1000.0;
export const WHISPY_WIND_BOX_BOTTOM = -10.0;
export const WHISPY_WIND_BOX_EDGE_LEFT = -2325.0;
export const WHISPY_WIND_BOX_EDGE_RIGHT = 2275.0;

/**
 * The edge-guard zone (edgeGuard.ts isOutsideZone / recoveryZoneBoundary):
 * a player past these lines who can act again counts as recovering, which
 * opens an edge-guard situation. Per side: vertical below stage height, the
 * slanted segment, vertical again above it; the offstage side is tinted out
 * to the blast zone.
 */
export function drawRecoveryZone(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  stageId: number | undefined,
): void {
  const zone = recoveryZoneBoundary(stageId);
  const blastZone = stageBlastZone(stageId);
  if (!zone || !blastZone) return;

  ctx.save();
  for (const side of [1, -1] as const) {
    const outerX = side === 1 ? blastZone.rightX : blastZone.leftX;
    const boundary = [
      camera.worldToScreen(side * zone.xAtLow, blastZone.bottomY),
      camera.worldToScreen(side * zone.xAtLow, zone.yLow),
      camera.worldToScreen(side * zone.xAtHigh, zone.yHigh),
      camera.worldToScreen(side * zone.xAtHigh, blastZone.topY),
    ];
    // Tint the offstage side, from the boundary out to the blast zone.
    ctx.beginPath();
    boundary.forEach((p, i) =>
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
    );
    const outerTop = camera.worldToScreen(outerX, blastZone.topY);
    const outerBottom = camera.worldToScreen(outerX, blastZone.bottomY);
    ctx.lineTo(outerTop.x, outerTop.y);
    ctx.lineTo(outerBottom.x, outerBottom.y);
    ctx.closePath();
    ctx.fillStyle = "rgba(250, 204, 21, 0.08)";
    ctx.fill();
    // The boundary itself.
    ctx.beginPath();
    boundary.forEach((p, i) =>
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
    );
    ctx.strokeStyle = "rgba(250, 204, 21, 0.9)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/**
 * Draws the outer stage blast zone boundary (death boundary rectangle).
 * Shaded with a subtle outer danger tint and an inward-facing edge gradient.
 */
export function drawBlastZone(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  camera: Camera,
  stageId: number | undefined,
): void {
  const blastZone = stageBlastZone(stageId);
  if (!blastZone) return;

  const tl = camera.worldToScreen(blastZone.leftX, blastZone.topY);
  const br = camera.worldToScreen(blastZone.rightX, blastZone.bottomY);
  const rectX = tl.x;
  const rectY = tl.y;
  const rectW = br.x - tl.x;
  const rectH = br.y - tl.y;
  // 1. Subtle dark danger shade outside the blast zone rectangle
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);
  ctx.rect(rectX, rectY, rectW, rectH);
  ctx.fillStyle = "rgba(255, 30, 20, 0.05)";
  ctx.fill("evenodd");
  // 2. Blast zone perimeter outline with subtle glow
  ctx.beginPath();
  ctx.rect(rectX, rectY, rectW, rectH);
  ctx.strokeStyle = "rgba(255, 60, 40, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  // 3. Corner brackets at all 4 corners
  const bracketSize = 14;
  ctx.strokeStyle = "rgba(255, 90, 60, 0.75)";
  ctx.lineWidth = 2.5;
  // Top-Left
  ctx.beginPath();
  ctx.moveTo(rectX, rectY + bracketSize);
  ctx.lineTo(rectX, rectY);
  ctx.lineTo(rectX + bracketSize, rectY);
  ctx.stroke();
  // Top-Right
  ctx.beginPath();
  ctx.moveTo(rectX + rectW - bracketSize, rectY);
  ctx.lineTo(rectX + rectW, rectY);
  ctx.lineTo(rectX + rectW, rectY + bracketSize);
  ctx.stroke();
  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(rectX + rectW, rectY + rectH - bracketSize);
  ctx.lineTo(rectX + rectW, rectY + rectH);
  ctx.lineTo(rectX + rectW - bracketSize, rectY + rectH);
  ctx.stroke();
  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(rectX + bracketSize, rectY + rectH);
  ctx.lineTo(rectX, rectY + rectH);
  ctx.lineTo(rectX, rectY + rectH - bracketSize);
  ctx.stroke();
  // 4. Subtle inward perimeter gradient
  const gradDepth = 24;
  // Left edge
  const gLeft = ctx.createLinearGradient(rectX, 0, rectX + gradDepth, 0);
  gLeft.addColorStop(0, "rgba(255, 50, 30, 0.12)");
  gLeft.addColorStop(1, "rgba(255, 50, 30, 0)");
  ctx.fillStyle = gLeft;
  ctx.fillRect(rectX, rectY, gradDepth, rectH);
  // Right edge
  const gRight = ctx.createLinearGradient(
    rectX + rectW,
    0,
    rectX + rectW - gradDepth,
    0,
  );
  gRight.addColorStop(0, "rgba(255, 50, 30, 0.12)");
  gRight.addColorStop(1, "rgba(255, 50, 30, 0)");
  ctx.fillStyle = gRight;
  ctx.fillRect(rectX + rectW - gradDepth, rectY, gradDepth, rectH);
  // Top edge
  const gTop = ctx.createLinearGradient(0, rectY, 0, rectY + gradDepth);
  gTop.addColorStop(0, "rgba(255, 50, 30, 0.12)");
  gTop.addColorStop(1, "rgba(255, 50, 30, 0)");
  ctx.fillStyle = gTop;
  ctx.fillRect(rectX, rectY, rectW, gradDepth);
  // Bottom edge
  const gBot = ctx.createLinearGradient(
    0,
    rectY + rectH,
    0,
    rectY + rectH - gradDepth,
  );
  gBot.addColorStop(0, "rgba(255, 50, 30, 0.12)");
  gBot.addColorStop(1, "rgba(255, 50, 30, 0)");
  ctx.fillStyle = gBot;
  ctx.fillRect(rectX, rectY + rectH - gradDepth, rectW, gradDepth);
  ctx.restore();
}

/**
 * Highlights Whispy Woods' current wind-affected area on Dream Land with
 * stage-aware flowing breeze streamlines, swirling sakura petals / autumn leaves /
 * cyber vector particles, and smooth linear strength fall-off decaying away
 * from Whispy's mouth.
 */
export function drawWindZone(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  stageId: number | undefined,
  frame: Frame | undefined,
  frameIndex = 0,
  theme?: BackgroundTheme,
  isLight = false,
): void {
  if (stageId !== DREAM_LAND_STAGE_ID || !frame) return;
  const hazardFlags = frame.hazardFlags ?? 0;
  if (!hasHazardFlag(hazardFlags, HazardFlag.WhispyBlowing)) return;
  const blowingRight = hasHazardFlag(
    hazardFlags,
    HazardFlag.WhispyBlowingRight,
  );
  const dir = blowingRight ? 1 : -1;
  const boxLeftWorld = blowingRight ? WHISPY_WIND_X : WHISPY_WIND_BOX_EDGE_LEFT;
  const boxRightWorld = blowingRight
    ? WHISPY_WIND_BOX_EDGE_RIGHT
    : WHISPY_WIND_X;
  const spanWorld = blowingRight
    ? WHISPY_WIND_BOX_EDGE_RIGHT - WHISPY_WIND_X
    : WHISPY_WIND_X - WHISPY_WIND_BOX_EDGE_LEFT;
  const heightWorld = WHISPY_WIND_BOX_TOP - WHISPY_WIND_BOX_BOTTOM;
  const topLeft = camera.worldToScreen(boxLeftWorld, WHISPY_WIND_BOX_TOP);
  const bottomRight = camera.worldToScreen(
    boxRightWorld,
    WHISPY_WIND_BOX_BOTTOM,
  );
  const boxX = Math.min(topLeft.x, bottomRight.x);
  const boxY = Math.min(topLeft.y, bottomRight.y);
  const boxWidth = Math.abs(bottomRight.x - topLeft.x);
  const boxHeight = Math.abs(bottomRight.y - topLeft.y);
  if (boxWidth <= 0 || boxHeight <= 0) return;

  const animFrame =
    frameIndex ??
    (typeof performance !== "undefined"
      ? Math.floor(performance.now() / 16.67)
      : 0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(boxX, boxY, boxWidth, boxHeight);
  ctx.clip();
  // 1. Soft atmospheric wind tunnel gradient with falloff from Whispy to the boundary
  const whispyScreenX = camera.worldToScreen(
    WHISPY_WIND_X,
    WHISPY_WIND_BOX_TOP,
  ).x;
  const farEdgeScreenX = blowingRight ? boxX + boxWidth : boxX;
  const grad = ctx.createLinearGradient(whispyScreenX, 0, farEdgeScreenX, 0);

  if (theme === "autumn") {
    grad.addColorStop(
      0,
      isLight ? "rgba(217, 119, 6, 0.25)" : "rgba(245, 158, 11, 0.18)",
    );
    grad.addColorStop(
      0.5,
      isLight ? "rgba(185, 28, 28, 0.12)" : "rgba(234, 88, 12, 0.08)",
    );
    grad.addColorStop(1, "rgba(220, 38, 38, 0.01)");
  } else if (theme === "grid") {
    grad.addColorStop(
      0,
      isLight ? "rgba(37, 99, 235, 0.25)" : "rgba(56, 189, 248, 0.18)",
    );
    grad.addColorStop(
      0.5,
      isLight ? "rgba(29, 78, 216, 0.12)" : "rgba(59, 130, 246, 0.08)",
    );
    grad.addColorStop(1, "rgba(59, 130, 246, 0.01)");
  } else if (theme === "beach") {
    grad.addColorStop(
      0,
      isLight ? "rgba(13, 148, 136, 0.25)" : "rgba(20, 184, 166, 0.18)",
    );
    grad.addColorStop(
      0.5,
      isLight ? "rgba(217, 119, 6, 0.12)" : "rgba(253, 224, 71, 0.08)",
    );
    grad.addColorStop(1, "rgba(253, 224, 71, 0.01)");
  } else {
    // mountain
    grad.addColorStop(
      0,
      isLight ? "rgba(219, 39, 119, 0.22)" : "rgba(244, 114, 182, 0.16)",
    );
    grad.addColorStop(
      0.5,
      isLight ? "rgba(147, 51, 234, 0.1)" : "rgba(216, 180, 254, 0.07)",
    );
    grad.addColorStop(1, "rgba(168, 85, 247, 0.01)");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
  // On grid theme: draw subtle cyber boundary indicator
  if (theme === "grid") {
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = isLight
      ? "rgba(37, 99, 235, 0.45)"
      : "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    ctx.restore();
  }
  // 2. Animated breeze streamlines / air currents with linear strength fall-off
  const numStreams = 6;
  for (let s = 0; s < numStreams; s++) {
    const streamRelY = (s + 0.5) / numStreams;
    const baseWorldY = WHISPY_WIND_BOX_BOTTOM + streamRelY * heightWorld;
    // Draw 2-3 flowing breeze wave wisps along this streamline
    const numWisps = 3;
    for (let w = 0; w < numWisps; w++) {
      const wispCycle = spanWorld;
      const wispSpeed = 16.0 + (s % 3) * 3.0;
      const wispOffset = (w * (spanWorld / numWisps) + s * 190) % spanWorld;
      const wispDist =
        (((animFrame * wispSpeed + wispOffset) % wispCycle) + wispCycle) %
        wispCycle;
      const u = wispDist / spanWorld; // 0 (near Whispy) to 1 (far edge)
      const strength = 1.0 - u;
      // Fade in near Whispy, fade out toward outer boundary
      const alphaFade =
        Math.min(1.0, u / 0.08) * Math.min(1.0, (1.0 - u) / 0.15);
      const wispAlpha = alphaFade * (0.2 + 0.6 * strength);
      if (wispAlpha <= 0.01) continue;
      const wispLenWorld = 120 + 80 * strength;
      const headWorldX = WHISPY_WIND_X + dir * wispDist;
      const tailWorldX = headWorldX - dir * wispLenWorld;
      const headScreen = camera.worldToScreen(
        headWorldX,
        baseWorldY + Math.sin(animFrame * 0.05 + s + u * 4) * 14 * strength,
      );
      const midScreen = camera.worldToScreen(
        (headWorldX + tailWorldX) / 2,
        baseWorldY +
          Math.sin(animFrame * 0.05 + s + u * 4 + 0.5) * 18 * strength,
      );
      const tailScreen = camera.worldToScreen(tailWorldX, baseWorldY);
      ctx.save();
      ctx.globalAlpha = wispAlpha;
      if (theme === "autumn") {
        ctx.strokeStyle =
          s % 2 === 0 ? "rgba(251, 191, 36, 0.85)" : "rgba(249, 115, 22, 0.75)";
      } else if (theme === "grid") {
        ctx.strokeStyle =
          s % 2 === 0 ? "rgba(56, 189, 248, 0.85)" : "rgba(96, 165, 250, 0.75)";
      } else if (theme === "beach") {
        ctx.strokeStyle =
          s % 2 === 0 ? "rgba(20, 184, 166, 0.85)" : "rgba(253, 224, 71, 0.75)";
      } else {
        // mountain: soft sakura moonlight breeze
        ctx.strokeStyle =
          s % 2 === 0
            ? "rgba(244, 114, 182, 0.85)"
            : "rgba(216, 180, 254, 0.75)";
      }
      ctx.lineWidth = Math.max(
        1.0,
        camera.worldLengthToScreen(3.5 + 2.5 * strength),
      );
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tailScreen.x, tailScreen.y);
      ctx.quadraticCurveTo(
        midScreen.x,
        midScreen.y,
        headScreen.x,
        headScreen.y,
      );
      ctx.stroke();
      ctx.restore();
    }
  }
  // 3. Swirling blowing particles (Sakura cherry petals / Autumn maple leaves / Cyber energy vectors)
  const numParticles = 36;
  for (let i = 0; i < numParticles; i++) {
    // Deterministic pseudo-random seed per particle
    const seedDist = (i * 197.3) % spanWorld;
    const speedMult = 0.85 + ((i * 29) % 7) * 0.08;
    const baseSpeed = 15.0 * speedMult;
    const distFromWhispy =
      (((seedDist + animFrame * baseSpeed) % spanWorld) + spanWorld) %
      spanWorld;
    const u = distFromWhispy / spanWorld; // 0 at Whispy, 1 at edge
    const strength = 1.0 - u; // Linear falloff from 1.0 to 0.0
    // Smooth fade-in at origin, smooth fade-out at boundary
    const fadeIn = Math.min(1.0, u / 0.06);
    const fadeOut = Math.min(1.0, (1.0 - u) / 0.1);
    const alpha = fadeIn * fadeOut * (0.35 + 0.65 * strength);
    if (alpha <= 0.01) continue;
    const worldX = WHISPY_WIND_X + dir * distFromWhispy;
    const relY = ((i * 433) % 880) + 50; // Inside [-10, 1000]
    const baseWorldY = WHISPY_WIND_BOX_BOTTOM + relY;
    const turbFreq = 0.035 + (i % 4) * 0.012;
    const turbAmp = 22.0 + 20.0 * strength;
    const turbPhase = i * 1.6;
    const worldY =
      baseWorldY +
      Math.sin(animFrame * turbFreq + turbPhase + u * 3.5) * turbAmp +
      Math.cos(animFrame * 0.02 + i) * 10.0;
    const screenPos = camera.worldToScreen(worldX, worldY);
    const worldRadius = 14.0 + (i % 4) * 4.0;
    const radiusPx = Math.max(1.8, camera.worldLengthToScreen(worldRadius));
    const rot = dir * (animFrame * (0.04 + 0.04 * strength) + i * 1.15);
    const flutter = Math.cos(animFrame * 0.07 + i * 2.3);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (theme === "autumn") {
      // --- Autumn Theme: Japanese Maple Leaves ---
      const autumnPalette = [
        "#dc2626", // Crimson
        "#ea580c", // Flame orange
        "#f59e0b", // Amber gold
        "#991b1b", // Deep scarlet
        "#c2410c", // Burnt copper
        "#facc15", // Bright gold
      ];
      const color = autumnPalette[i % autumnPalette.length] ?? "#dc2626";
      ctx.translate(screenPos.x, screenPos.y);
      ctx.rotate(rot);
      ctx.scale(1.0, 0.45 + 0.55 * Math.abs(flutter));
      ctx.fillStyle = color;
      ctx.beginPath();
      // 5-point maple leaf polygon
      ctx.moveTo(0, -radiusPx);
      ctx.lineTo(radiusPx * 0.35, -radiusPx * 0.35);
      ctx.lineTo(radiusPx * 0.9, -radiusPx * 0.25);
      ctx.lineTo(radiusPx * 0.45, radiusPx * 0.2);
      ctx.lineTo(radiusPx * 0.7, radiusPx * 0.85);
      ctx.lineTo(0, radiusPx * 0.45);
      ctx.lineTo(-radiusPx * 0.7, radiusPx * 0.85);
      ctx.lineTo(-radiusPx * 0.45, radiusPx * 0.2);
      ctx.lineTo(-radiusPx * 0.9, -radiusPx * 0.25);
      ctx.lineTo(-radiusPx * 0.35, -radiusPx * 0.35);
      ctx.closePath();
      ctx.fill();
    } else if (theme === "grid") {
      // --- Grid Theme: Cyber Vector Particles & Chevrons ---
      const gridPalette = [
        "#38bdf8", // Sky blue
        "#60a5fa", // Blue
        "#93c5fd", // Light blue
        "#818cf8", // Indigo
        "#38bdf8",
      ];
      const color = gridPalette[i % gridPalette.length] ?? "#38bdf8";
      ctx.translate(screenPos.x, screenPos.y);
      // Trailing speed streak
      const streakLen = Math.max(3.0, radiusPx * (1.2 + 2.0 * strength));
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.0, radiusPx * 0.28);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-dir * streakLen, 0);
      ctx.lineTo(0, 0);
      ctx.stroke();
      // Directional glowing chevron / diamond head
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(dir * radiusPx * 0.6, 0);
      ctx.lineTo(-dir * radiusPx * 0.35, -radiusPx * 0.45);
      ctx.lineTo(-dir * radiusPx * 0.1, 0);
      ctx.lineTo(-dir * radiusPx * 0.35, radiusPx * 0.45);
      ctx.closePath();
      ctx.fill();
    } else if (theme === "beach") {
      // --- Beach Theme: Tropical Leaflets ---
      const beachPalette = ["#34d399", "#10b981", "#059669", "#fde047"];
      const color = beachPalette[i % beachPalette.length] ?? "#10b981";
      ctx.translate(screenPos.x, screenPos.y);
      ctx.rotate(rot);
      ctx.scale(1.0, 0.4 + 0.6 * Math.abs(flutter));
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, radiusPx, radiusPx * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // --- Mountain Theme: Cherry (Sakura) Blossom Petals ---
      const sakuraPalette = [
        "#fdf4ff", // Frosted moonlight bloom
        "#fbcfe8", // Pale pink
        "#f472b6", // Vibrant cherry blossom pink
        "#db2777", // Rose
        "#ec4899", // Luminous cherry pink
      ];
      const color = sakuraPalette[i % sakuraPalette.length] ?? "#fbcfe8";
      ctx.translate(screenPos.x, screenPos.y);
      ctx.rotate(rot);
      ctx.scale(1.0, 0.4 + 0.6 * Math.abs(flutter));
      ctx.fillStyle = color;
      ctx.beginPath();
      // Notched organic cherry blossom petal
      ctx.moveTo(0, -radiusPx);
      ctx.bezierCurveTo(
        radiusPx * 0.75,
        -radiusPx * 0.85,
        radiusPx * 0.9,
        radiusPx * 0.4,
        0,
        radiusPx,
      );
      ctx.bezierCurveTo(
        -radiusPx * 0.9,
        radiusPx * 0.4,
        -radiusPx * 0.75,
        -radiusPx * 0.85,
        0,
        -radiusPx,
      );
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}
