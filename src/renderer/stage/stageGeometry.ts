import type { Camera } from "../../camera.js";
import {
  stageGeometry,
  stageSlopes,
  stageLedges,
  type PlatformSpec,
} from "../../stageGeometry.js";
import {
  LEDGE_GRAB_ZONE_WIDTH,
  LEDGE_GRAB_DOT_RADIUS_WORLD_UNITS,
} from "../../ledgeGrabRange.js";
import type { BackgroundTheme, LedgeGrabCandidate } from "../common/index.js";
import {
  drawAnimatedAutumnLeaves,
  drawStageSakuraTrees,
  drawStageAutumnTrees,
  drawStagePalmTrees,
} from "./decorations.js";

/** Real platform/ground geometry for stages we've measured (see stageGeometry.ts); a plain Y=0 reference line otherwise. */
export function drawStage(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  stageId: number | undefined,
  frameIndex = 0,
  theme: BackgroundTheme = "mountain",
  isLight = false,
  canvas?: HTMLCanvasElement,
): void {
  const platforms = stageGeometry(stageId);
  if (!platforms) {
    drawFallbackGroundLine(ctx, camera, theme, isLight, canvas);
    if (theme === "beach") {
      drawStagePalmTrees(ctx, camera, stageId);
    } else if (theme === "autumn") {
      drawStageAutumnTrees(ctx, camera, stageId);
      drawAnimatedAutumnLeaves(ctx, camera, frameIndex);
    } else if (theme === "mountain") {
      drawStageSakuraTrees(ctx, camera, stageId, frameIndex, isLight);
    }
    return;
  }
  drawStageSlopesAndSilhouette(ctx, camera, stageId, theme, isLight);
  if (theme === "beach") {
    drawStagePalmTrees(ctx, camera, stageId);
  } else if (theme === "autumn") {
    drawStageAutumnTrees(ctx, camera, stageId);
    drawAnimatedAutumnLeaves(ctx, camera, frameIndex);
  } else if (theme === "mountain") {
    drawStageSakuraTrees(ctx, camera, stageId, frameIndex, isLight);
  }
  for (const platform of platforms) {
    drawPlatform(ctx, camera, platform, theme, isLight);
  }
}

/**
 * Draws the stage underbody hull silhouette and descending cliff slopes
 * for stages with defined slope geometry (e.g. Dream Land).
 */
export function drawStageSlopesAndSilhouette(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  stageId: number | undefined,
  theme: BackgroundTheme = "mountain",
  isLight = false,
): void {
  const slopes = stageSlopes(stageId);
  if (!slopes) return;
  const bodyScreen = slopes.bodyPolygon.map((v) =>
    camera.worldToScreen(v.x, v.y),
  );
  if (bodyScreen.length < 3) return;
  ctx.save();
  // 1. Solid opaque base fill to cleanly occlude background scenery
  ctx.beginPath();
  const firstBodyPt = bodyScreen[0]!;
  ctx.moveTo(firstBodyPt.x, firstBodyPt.y);
  for (let i = 1; i < bodyScreen.length; i++) {
    const pt = bodyScreen[i]!;
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.closePath();
  if (theme === "autumn") {
    ctx.fillStyle = isLight ? "#573010" : "#180b07";
  } else if (theme === "grid") {
    ctx.fillStyle = isLight ? "#e2e8f0" : "#020617";
  } else if (theme === "beach") {
    ctx.fillStyle = isLight ? "#b45309" : "#78350f";
  } else {
    // Mountain
    ctx.fillStyle = isLight ? "#334155" : "#0c0a1a";
  }
  ctx.fill();
  // 2. Themed interior faceted structure
  const drawWorldPoly = (
    pts: readonly { x: number; y: number }[],
    fill: string,
  ) => {
    if (pts.length < 3) return;
    const first = camera.worldToScreen(pts[0]!.x, pts[0]!.y);
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < pts.length; i++) {
      const p = camera.worldToScreen(pts[i]!.x, pts[i]!.y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  if (theme === "autumn") {
    // Autumn theme: Carved garden stone & dark lacquer foundation
    drawWorldPoly(
      [
        { x: -2318, y: 0 },
        { x: -2307, y: -124 },
        { x: -2290, y: -331 },
        { x: -1400, y: -420 },
      ],
      "#23100a",
    );
    drawWorldPoly(
      [
        { x: -2290, y: -331 },
        { x: -2075, y: -834 },
        { x: -1400, y: -420 },
      ],
      "#1a0c07",
    );
    drawWorldPoly(
      [
        { x: -2075, y: -834 },
        { x: -1972, y: -1072 },
        { x: -600, y: -750 },
        { x: -1400, y: -420 },
      ],
      "#2b140c",
    );
    drawWorldPoly(
      [
        { x: -1972, y: -1072 },
        { x: 0, y: -1072 },
        { x: -600, y: -750 },
      ],
      "#150805",
    );
    drawWorldPoly(
      [
        { x: -2318, y: 0 },
        { x: -1400, y: -420 },
        { x: 0, y: -500 },
        { x: 0, y: 0 },
      ],
      "#2f160e",
    );
    drawWorldPoly(
      [
        { x: -1400, y: -420 },
        { x: -600, y: -750 },
        { x: 0, y: -1072 },
        { x: 0, y: -500 },
      ],
      "#200e08",
    );
    drawWorldPoly(
      [
        { x: 2318, y: 0 },
        { x: 2307, y: -124 },
        { x: 2290, y: -331 },
        { x: 1400, y: -420 },
      ],
      "#3a1c11",
    );
    drawWorldPoly(
      [
        { x: 2290, y: -331 },
        { x: 2075, y: -834 },
        { x: 1400, y: -420 },
      ],
      "#32170e",
    );
    drawWorldPoly(
      [
        { x: 2075, y: -834 },
        { x: 1972, y: -1072 },
        { x: 600, y: -750 },
        { x: 1400, y: -420 },
      ],
      "#442215",
    );
    drawWorldPoly(
      [
        { x: 1972, y: -1072 },
        { x: 0, y: -1072 },
        { x: 600, y: -750 },
      ],
      "#28120a",
    );
    drawWorldPoly(
      [
        { x: 2318, y: 0 },
        { x: 1400, y: -420 },
        { x: 0, y: -500 },
        { x: 0, y: 0 },
      ],
      "#3e1e12",
    );
    drawWorldPoly(
      [
        { x: 1400, y: -420 },
        { x: 600, y: -750 },
        { x: 0, y: -1072 },
        { x: 0, y: -500 },
      ],
      "#35190f",
    );
    // Autumn turf rim
    drawWorldPoly(
      [
        { x: -2318, y: 0 },
        { x: 2318, y: 0 },
        { x: 2307, y: -30 },
        { x: -2307, y: -30 },
      ],
      "#14532d",
    );
    drawWorldPoly(
      [
        { x: -1200, y: 0 },
        { x: 1200, y: 0 },
        { x: 1190, y: -20 },
        { x: -1190, y: -20 },
      ],
      "#78350f",
    );
    ctx.strokeStyle = "rgba(245, 158, 11, 0.12)";
    ctx.lineWidth = 1;
    const seamPaths = [
      [
        { x: -1400, y: -420 },
        { x: 0, y: -500 },
        { x: 1400, y: -420 },
      ],
      [
        { x: 0, y: 0 },
        { x: 0, y: -500 },
        { x: 0, y: -1072 },
      ],
      [
        { x: -1400, y: -420 },
        { x: -600, y: -750 },
        { x: 0, y: -1072 },
        { x: 600, y: -750 },
        { x: 1400, y: -420 },
      ],
    ];
    for (const sp of seamPaths) {
      ctx.beginPath();
      const p0 = camera.worldToScreen(sp[0]!.x, sp[0]!.y);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < sp.length; i++) {
        const pt = camera.worldToScreen(sp[i]!.x, sp[i]!.y);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
  } else if (theme === "grid") {
    // Grid theme: Cyber wireframe hull with structural ribs & glowing vector nodes
    ctx.strokeStyle = isLight
      ? "rgba(30, 58, 138, 0.45)"
      : "rgba(29, 78, 216, 0.35)";
    ctx.lineWidth = 1.5;
    const strataY = [-250, -500, -750];
    for (const sy of strataY) {
      const t = sy / -1072;
      const leftHullX = -2318 + t * (2318 - 1972);
      const rightHullX = 2318 - t * (2318 - 1972);
      const pL = camera.worldToScreen(leftHullX, sy);
      const pR = camera.worldToScreen(rightHullX, sy);
      ctx.beginPath();
      ctx.moveTo(pL.x, pL.y);
      ctx.lineTo(pR.x, pR.y);
      ctx.stroke();
    }
    ctx.strokeStyle = isLight
      ? "rgba(37, 99, 235, 0.35)"
      : "rgba(56, 189, 248, 0.22)";
    ctx.lineWidth = 1.5;
    const ribsX = [-1600, -1200, -800, -400, 0, 400, 800, 1200, 1600];
    for (const rx of ribsX) {
      const topP = camera.worldToScreen(rx, 0);
      const botP = camera.worldToScreen(rx, -1072);
      ctx.beginPath();
      ctx.moveTo(topP.x, topP.y);
      ctx.lineTo(botP.x, botP.y);
      ctx.stroke();
    }
    ctx.strokeStyle = isLight
      ? "rgba(29, 78, 216, 0.45)"
      : "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 1.5;
    const braces = [
      [
        { x: -2318, y: 0 },
        { x: -1972, y: -1072 },
      ],
      [
        { x: -2290, y: -331 },
        { x: 0, y: -1072 },
      ],
      [
        { x: 0, y: 0 },
        { x: 0, y: -1072 },
      ],
      [
        { x: 2290, y: -331 },
        { x: 0, y: -1072 },
      ],
      [
        { x: 2318, y: 0 },
        { x: 1972, y: -1072 },
      ],
    ];
    for (const b of braces) {
      const p0 = camera.worldToScreen(b[0]!.x, b[0]!.y);
      const p1 = camera.worldToScreen(b[1]!.x, b[1]!.y);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    const nodes = [
      { x: 0, y: 0 },
      { x: 0, y: -500 },
      { x: 0, y: -1072 },
      { x: -1200, y: -500 },
      { x: 1200, y: -500 },
      { x: -1972, y: -1072 },
      { x: 1972, y: -1072 },
    ];
    ctx.fillStyle = isLight ? "#1d4ed8" : "#38bdf8";
    for (const n of nodes) {
      const np = camera.worldToScreen(n.x, n.y);
      ctx.beginPath();
      ctx.arc(np.x, np.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (theme === "beach") {
    // Tropical Beach theme: Bottom of a pineapple!
    ctx.save();
    ctx.beginPath();
    const firstClipPt = bodyScreen[0]!;
    ctx.moveTo(firstClipPt.x, firstClipPt.y);
    for (let i = 1; i < bodyScreen.length; i++) {
      const pt = bodyScreen[i]!;
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.clip?.();
    // A. Pineapple diamond scales ("eyes")
    const scaleRows = [
      { y: -140, startX: -2400, count: 20, stagger: 0 },
      { y: -280, startX: -2350, count: 19, stagger: 130 },
      { y: -420, startX: -2300, count: 18, stagger: 0 },
      { y: -560, startX: -2250, count: 18, stagger: 130 },
      { y: -700, startX: -2200, count: 17, stagger: 0 },
      { y: -840, startX: -2150, count: 17, stagger: 130 },
      { y: -980, startX: -2100, count: 16, stagger: 0 },
    ];
    const stepX = 260;
    const halfX = stepX * 0.48;
    const halfY = 65;
    const pineappleScalePalette = [
      { top: "#fbbf24", bot: "#d97706" }, // Golden yellow / amber
      { top: "#f59e0b", bot: "#b45309" }, // Warm gold / honey brown
      { top: "#fcd34d", bot: "#ea580c" }, // Sunlit yellow / ripe orange
      { top: "#f59e0b", bot: "#c2410c" }, // Deep honey / burnt orange
    ];
    for (let ri = 0; ri < scaleRows.length; ri++) {
      const row = scaleRows[ri]!;
      for (let ci = 0; ci < row.count; ci++) {
        const cx = row.startX + ci * stepX + row.stagger;
        const cy = row.y;
        const pal =
          pineappleScalePalette[(ri * 3 + ci) % pineappleScalePalette.length]!;
        // Upper facet (sunlit gold)
        drawWorldPoly(
          [
            { x: cx, y: cy + halfY },
            { x: cx + halfX, y: cy },
            { x: cx, y: cy },
            { x: cx - halfX, y: cy },
          ],
          pal.top,
        );
        // Lower facet (shaded amber)
        drawWorldPoly(
          [
            { x: cx - halfX, y: cy },
            { x: cx, y: cy },
            { x: cx + halfX, y: cy },
            { x: cx, y: cy - halfY },
          ],
          pal.bot,
        );
        // Central brown bract / spine spike ("eye" center)
        drawWorldPoly(
          [
            { x: cx, y: cy + 14 },
            { x: cx + 20, y: cy - 10 },
            { x: cx - 20, y: cy - 10 },
          ],
          "#451a03",
        );
      }
    }
    // B. Pineapple scale groove seam lines
    ctx.strokeStyle = "rgba(69, 26, 3, 0.45)";
    ctx.lineWidth = 2;
    for (let x = -3000; x <= 3000; x += 260) {
      const p0 = camera.worldToScreen(x, 0);
      const p1 = camera.worldToScreen(x + 1072, -1072);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      const p2 = camera.worldToScreen(x, 0);
      const p3 = camera.worldToScreen(x - 1072, -1072);
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.stroke();
    }
    // C. Tropical crown fronds / spiky pineapple leaves under the platform rim
    const crownLeafWidth = 140;
    for (let lx = -2300; lx <= 2300; lx += crownLeafWidth) {
      const leafIndex = Math.floor((lx + 2300) / crownLeafWidth);
      const leafLen = 70 + (leafIndex % 3) * 30;
      const leafColor = leafIndex % 2 === 0 ? "#16a34a" : "#15803d";
      const tipHighlight = leafIndex % 3 === 0 ? "#4ade80" : "#22c55e";
      drawWorldPoly(
        [
          { x: lx - crownLeafWidth * 0.45, y: 0 },
          { x: lx + crownLeafWidth * 0.45, y: 0 },
          { x: lx, y: -leafLen },
        ],
        leafColor,
      );
      drawWorldPoly(
        [
          { x: lx - crownLeafWidth * 0.15, y: 0 },
          { x: lx + crownLeafWidth * 0.15, y: 0 },
          { x: lx, y: -leafLen * 0.85 },
        ],
        tipHighlight,
      );
    }
    // D. Woody pineapple bottom stem / navel
    const stemCenter = camera.worldToScreen(0, -1072);
    const stemRadiusX = Math.max(8, camera.worldLengthToScreen(240));
    const stemRadiusY = Math.max(3, camera.worldLengthToScreen(80));
    ctx.fillStyle = "#451a03";
    ctx.beginPath();
    ctx.ellipse(
      stemCenter.x,
      stemCenter.y,
      stemRadiusX,
      stemRadiusY,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.fillStyle = "#78350f";
    ctx.beginPath();
    ctx.ellipse(
      stemCenter.x,
      stemCenter.y,
      stemRadiusX * 0.55,
      stemRadiusY * 0.55,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.ellipse(
      stemCenter.x,
      stemCenter.y,
      stemRadiusX * 0.25,
      stemRadiusY * 0.25,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  } else {
    // Mountain theme: Low-poly rock crags with moonlit facets
    drawWorldPoly(
      [
        { x: -2318, y: 0 },
        { x: -2307, y: -124 },
        { x: -2290, y: -331 },
        { x: -1400, y: -420 },
      ],
      "#110e28",
    );
    drawWorldPoly(
      [
        { x: -2290, y: -331 },
        { x: -2075, y: -834 },
        { x: -1400, y: -420 },
      ],
      "#0d0b20",
    );
    drawWorldPoly(
      [
        { x: -2075, y: -834 },
        { x: -1972, y: -1072 },
        { x: -600, y: -750 },
        { x: -1400, y: -420 },
      ],
      "#141032",
    );
    drawWorldPoly(
      [
        { x: -1972, y: -1072 },
        { x: 0, y: -1072 },
        { x: -600, y: -750 },
      ],
      "#090716",
    );
    drawWorldPoly(
      [
        { x: -2318, y: 0 },
        { x: -1400, y: -420 },
        { x: 0, y: -500 },
        { x: 0, y: 0 },
      ],
      "#161338",
    );
    drawWorldPoly(
      [
        { x: -1400, y: -420 },
        { x: -600, y: -750 },
        { x: 0, y: -1072 },
        { x: 0, y: -500 },
      ],
      "#120f2d",
    );
    drawWorldPoly(
      [
        { x: 2318, y: 0 },
        { x: 2307, y: -124 },
        { x: 2290, y: -331 },
        { x: 1400, y: -420 },
      ],
      "#251f50",
    );
    drawWorldPoly(
      [
        { x: 2290, y: -331 },
        { x: 2075, y: -834 },
        { x: 1400, y: -420 },
      ],
      "#201a45",
    );
    drawWorldPoly(
      [
        { x: 2075, y: -834 },
        { x: 1972, y: -1072 },
        { x: 600, y: -750 },
        { x: 1400, y: -420 },
      ],
      "#2b245c",
    );
    drawWorldPoly(
      [
        { x: 1972, y: -1072 },
        { x: 0, y: -1072 },
        { x: 600, y: -750 },
      ],
      "#191438",
    );
    drawWorldPoly(
      [
        { x: 2318, y: 0 },
        { x: 1400, y: -420 },
        { x: 0, y: -500 },
        { x: 0, y: 0 },
      ],
      "#282256",
    );
    drawWorldPoly(
      [
        { x: 1400, y: -420 },
        { x: 600, y: -750 },
        { x: 0, y: -1072 },
        { x: 0, y: -500 },
      ],
      "#221c4b",
    );
    drawWorldPoly(
      [
        { x: -2318, y: 0 },
        { x: 2318, y: 0 },
        { x: 2307, y: -32 },
        { x: -2307, y: -32 },
      ],
      "#064e3b",
    );
    drawWorldPoly(
      [
        { x: 0, y: 0 },
        { x: 2318, y: 0 },
        { x: 2307, y: -22 },
        { x: 0, y: -22 },
      ],
      "#0f766e",
    );
    ctx.strokeStyle = "rgba(168, 85, 247, 0.12)";
    ctx.lineWidth = 1;
    const seamPaths = [
      [
        { x: -1400, y: -420 },
        { x: 0, y: -500 },
        { x: 1400, y: -420 },
      ],
      [
        { x: 0, y: 0 },
        { x: 0, y: -500 },
        { x: 0, y: -1072 },
      ],
      [
        { x: -1400, y: -420 },
        { x: -600, y: -750 },
        { x: 0, y: -1072 },
        { x: 600, y: -750 },
        { x: 1400, y: -420 },
      ],
    ];
    for (const sp of seamPaths) {
      ctx.beginPath();
      const p0 = camera.worldToScreen(sp[0]!.x, sp[0]!.y);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < sp.length; i++) {
        const pt = camera.worldToScreen(sp[i]!.x, sp[i]!.y);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
  }
  // 2. Descending slope cliff edge strokes
  const lineSpacing = Math.max(1, camera.worldLengthToScreen(20.0));
  const outerWidth = lineSpacing * 1.4;
  const coreWidth = Math.max(1, lineSpacing * 0.7);
  let outerColor: string;
  let coreColor: string;
  let bottomBorderColor: string;
  if (theme === "autumn") {
    outerColor = isLight
      ? "rgba(185, 28, 28, 0.75)"
      : "rgba(220, 38, 38, 0.65)";
    coreColor = isLight ? "#b45309" : "#f59e0b";
    bottomBorderColor = isLight
      ? "rgba(146, 64, 14, 0.45)"
      : "rgba(180, 83, 9, 0.35)";
  } else if (theme === "grid") {
    outerColor = isLight
      ? "rgba(30, 58, 138, 0.75)"
      : "rgba(29, 78, 216, 0.65)";
    coreColor = isLight ? "#2563eb" : "#93c5fd";
    bottomBorderColor = isLight
      ? "rgba(29, 78, 216, 0.4)"
      : "rgba(56, 189, 248, 0.3)";
  } else if (theme === "beach") {
    outerColor = isLight
      ? "rgba(194, 65, 12, 0.75)"
      : "rgba(249, 115, 22, 0.65)";
    coreColor = isLight ? "#0d9488" : "#14b8a6";
    bottomBorderColor = isLight
      ? "rgba(180, 83, 9, 0.4)"
      : "rgba(253, 224, 71, 0.3)";
  } else {
    // Mountain
    outerColor = isLight
      ? "rgba(30, 58, 138, 0.75)"
      : "rgba(51, 75, 163, 0.65)";
    coreColor = isLight ? "#7c3aed" : "#a855f7";
    bottomBorderColor = isLight
      ? "rgba(37, 99, 235, 0.4)"
      : "rgba(139, 202, 240, 0.3)";
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Draw outer glow and core line for both left and right slopes
  for (const slope of [slopes.leftSlope, slopes.rightSlope]) {
    const screenPts = slope.map((v) => camera.worldToScreen(v.x, v.y));
    if (screenPts.length === 0) continue;
    const firstPt = screenPts[0]!;
    // Outer glow line
    ctx.lineWidth = outerWidth;
    ctx.strokeStyle = outerColor;
    ctx.beginPath();
    ctx.moveTo(firstPt.x, firstPt.y);
    for (let i = 1; i < screenPts.length; i++) {
      const pt = screenPts[i]!;
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
    // Core crisp line
    ctx.lineWidth = coreWidth;
    ctx.strokeStyle = coreColor;
    ctx.beginPath();
    ctx.moveTo(firstPt.x, firstPt.y);
    for (let i = 1; i < screenPts.length; i++) {
      const pt = screenPts[i]!;
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }
  // 3. Understage bottom edge connecting (-1972, -1072) and (1972, -1072)
  const bottomL = camera.worldToScreen(-1972, -1072);
  const bottomR = camera.worldToScreen(1972, -1072);
  ctx.lineWidth = Math.max(1, lineSpacing * 0.5);
  ctx.strokeStyle = bottomBorderColor;
  ctx.beginPath();
  ctx.moveTo(bottomL.x, bottomL.y);
  ctx.lineTo(bottomR.x, bottomR.y);
  ctx.stroke();
  ctx.restore();
}

export function drawPlatform(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  platform: PlatformSpec,
  theme: BackgroundTheme = "mountain",
  isLight = false,
): void {
  const left = camera.worldToScreen(platform.leftX, platform.y);
  const right = camera.worldToScreen(platform.rightX, platform.y);
  const isGround = platform.kind === "ground";
  // World-unit thickness (tuned so they match the old fixed-pixel look
  // at a typical close-quarters camera framing), converted to screen
  // pixels every frame so platform edges actually get thicker as the
  // camera zooms in and thinner as it zooms out, instead of staying a
  // constant pixel width regardless of zoom. Floored at 1px so they
  // don't vanish into sub-pixel invisibility on a wide zoomed-out shot.
  const lineSpacing = Math.max(
    1,
    camera.worldLengthToScreen(isGround ? 20.0 : 16.0),
  );
  // Each line's stroke has to be at least as thick as lineSpacing or the
  // three stacked lines (top/middle/bottom) leave a gap between them
  // that shows the background through - overlap by 30% so anti-aliased
  // edges don't leave a hairline gap either.
  const lineWidth = lineSpacing * 1.3;
  // Linear gradient for the outer lines:
  const outerGrad = ctx.createLinearGradient(left.x, left.y, right.x, right.y);
  let middleColor: string;
  if (theme === "beach") {
    if (isLight) {
      // High-contrast warm amber & tangerine borders with deep ocean teal core
      outerGrad.addColorStop(0.0, "#d97706");
      outerGrad.addColorStop(1 / 3, "#ea580c");
      outerGrad.addColorStop(2 / 3, "#ea580c");
      outerGrad.addColorStop(1.0, "#d97706");
      middleColor = "#0d9488";
    } else {
      // Warm golden edges with sunset orange center and vibrant turquoise core
      outerGrad.addColorStop(0.0, "#fde047");
      outerGrad.addColorStop(1 / 3, "#f97316");
      outerGrad.addColorStop(2 / 3, "#f97316");
      outerGrad.addColorStop(1.0, "#fde047");
      middleColor = "#14b8a6";
    }
  } else if (theme === "autumn") {
    if (isLight) {
      // Rich amber & crimson borders with warm russet core
      outerGrad.addColorStop(0.0, "#d97706");
      outerGrad.addColorStop(1 / 3, "#b91c1c");
      outerGrad.addColorStop(2 / 3, "#b91c1c");
      outerGrad.addColorStop(1.0, "#d97706");
      middleColor = "#b45309";
    } else {
      // Polished dark lacquer wood with imperial vermilion and warm golden amber trim
      outerGrad.addColorStop(0.0, "#fbbf24");
      outerGrad.addColorStop(1 / 3, "#dc2626");
      outerGrad.addColorStop(2 / 3, "#dc2626");
      outerGrad.addColorStop(1.0, "#fbbf24");
      middleColor = "#f59e0b";
    }
  } else if (theme === "grid") {
    if (isLight) {
      // Blueprint royal & navy blue palette for crisp daylight contrast
      outerGrad.addColorStop(0.0, "#1d4ed8");
      outerGrad.addColorStop(1 / 3, "#1e3a8a");
      outerGrad.addColorStop(2 / 3, "#1e3a8a");
      outerGrad.addColorStop(1.0, "#1d4ed8");
      middleColor = "#2563eb";
    } else {
      // Classic clean tech cyan/blue palette
      outerGrad.addColorStop(0.0, "#38bdf8");
      outerGrad.addColorStop(1 / 3, "#1d4ed8");
      outerGrad.addColorStop(2 / 3, "#1d4ed8");
      outerGrad.addColorStop(1.0, "#38bdf8");
      middleColor = "#93c5fd";
    }
  } else {
    if (isLight) {
      // Mountain: Deep azure-to-navy outer lines with royal violet center
      outerGrad.addColorStop(0.0, "#0284c7");
      outerGrad.addColorStop(1 / 3, "#1e3a8a");
      outerGrad.addColorStop(2 / 3, "#1e3a8a");
      outerGrad.addColorStop(1.0, "#0284c7");
      middleColor = "#7c3aed";
    } else {
      // Mountain: Cyan-to-royal-blue-to-cyan outer lines with aurora purple center
      outerGrad.addColorStop(0.0, "#8bcaf0");
      outerGrad.addColorStop(1 / 3, "#334ba3");
      outerGrad.addColorStop(2 / 3, "#334ba3");
      outerGrad.addColorStop(1.0, "#8bcaf0");
      middleColor = "#a855f7";
    }
  }
  ctx.save();
  // lineCap = "butt" guarantees the line strictly ends at left.x and right.x without
  // extending past the platform's terminating point by any rounding or cap radius.
  ctx.lineCap = "butt";
  ctx.lineWidth = lineWidth;
  // 1. Top outer line
  ctx.strokeStyle = outerGrad;
  ctx.beginPath();
  ctx.moveTo(left.x, left.y - lineSpacing);
  ctx.lineTo(right.x, right.y - lineSpacing);
  ctx.stroke();
  // 2. Middle inner line
  ctx.strokeStyle = middleColor;
  ctx.beginPath();
  ctx.moveTo(left.x, left.y);
  ctx.lineTo(right.x, right.y);
  ctx.stroke();
  // 3. Bottom outer line
  ctx.strokeStyle = outerGrad;
  ctx.beginPath();
  ctx.moveTo(left.x, left.y + lineSpacing);
  ctx.lineTo(right.x, right.y + lineSpacing);
  ctx.stroke();
  ctx.restore();
}

/** Highlights the grabbable 800-unit ledge strip (see ledgeGrabRange.ts) for any edge a candidate is near. */
export function drawLedgeGrabZoneHighlight(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  stageId: number | undefined,
  candidates: readonly LedgeGrabCandidate[],
  theme: BackgroundTheme = "mountain",
  isLight = false,
): void {
  if (candidates.length === 0) return;
  const ledges = stageLedges(stageId);
  if (!ledges) return;
  // Multiple ports can be near the same edge at different fade progress
  // (one just arriving, one just leaving) - show that edge at whichever
  // is more visible right now, not the first one found.
  const alphaBySide = new Map<"left" | "right", number>();
  for (const candidate of candidates) {
    alphaBySide.set(
      candidate.edgeSide,
      Math.max(alphaBySide.get(candidate.edgeSide) ?? 0, candidate.alpha),
    );
  }
  for (const ledge of ledges) {
    const alpha = alphaBySide.get(ledge.side);
    if (!alpha) continue;
    // Grabbable area extends inward from the edge (toward the stage
    // center) - left edge's "inward" is +X, right edge's is -X.
    const inwardSign = ledge.side === "left" ? 1 : -1;
    const innerX = ledge.x + inwardSign * LEDGE_GRAB_ZONE_WIDTH;
    const outer = camera.worldToScreen(ledge.x, ledge.y);
    const inner = camera.worldToScreen(innerX, ledge.y);
    // Highlight harmonizing with the active theme palette
    let ledgeColorRgba = isLight
      ? `rgba(126, 34, 206, ${0.95 * alpha})`
      : `rgba(216, 180, 254, ${0.95 * alpha})`;
    if (theme === "beach") {
      ledgeColorRgba = isLight
        ? `rgba(180, 83, 9, ${0.95 * alpha})`
        : `rgba(253, 224, 71, ${0.95 * alpha})`;
    } else if (theme === "autumn") {
      ledgeColorRgba = isLight
        ? `rgba(185, 28, 28, ${0.95 * alpha})`
        : `rgba(251, 191, 36, ${0.95 * alpha})`;
    } else if (theme === "grid") {
      ledgeColorRgba = isLight
        ? `rgba(29, 78, 216, ${0.95 * alpha})`
        : `rgba(147, 197, 253, ${0.95 * alpha})`;
    }
    ctx.strokeStyle = ledgeColorRgba;
    ctx.lineWidth = 10;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(outer.x, outer.y);
    ctx.lineTo(inner.x, inner.y);
    ctx.stroke();
  }
}

/**
 * Advisory highlight for the recovery classifier: the recovering port
 * can't make it back to the stage, but can still grab the ledge from
 * here, so this is the moment to ledge-hog rather than let them past. A
 * distinct green glow, separate from drawLedgeGrabZoneHighlight's
 * theme-colored bar (which means something different -- "a player's own
 * ledge-grab check point is nearby right now", not "here's what the
 * classifier recommends"). See computeRecoveryVerdictFrames().
 */
export function drawRecoveryLedgeHighlight(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  stageId: number | undefined,
  side: "left" | "right",
): void {
  const ledges = stageLedges(stageId);
  if (!ledges) return;
  const ledge = ledges.find((l) => l.side === side);
  if (!ledge) return;
  const inwardSign = side === "left" ? 1 : -1;
  const innerX = ledge.x + inwardSign * LEDGE_GRAB_ZONE_WIDTH;
  const outer = camera.worldToScreen(ledge.x, ledge.y);
  const inner = camera.worldToScreen(innerX, ledge.y);
  ctx.save();
  ctx.strokeStyle = "rgba(74, 222, 128, 0.9)";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(74, 222, 128, 0.8)";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(outer.x, outer.y);
  ctx.lineTo(inner.x, inner.y);
  ctx.stroke();
  ctx.restore();
}

/** The luminous ledge-grab check-point dot(s) - see computeLedgeGrabCandidates(). Drawn on top of everything else so it's never hidden behind a player marker. */
export function drawLedgeGrabDots(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  candidates: readonly LedgeGrabCandidate[],
  theme: BackgroundTheme = "mountain",
  isLight = false,
): void {
  // World units, not fixed screen pixels - so the dot shrinks/grows with
  // the camera the same way a character marker does, instead of looking
  // correctly-sized at only one specific zoom level (see
  // LEDGE_GRAB_DOT_RADIUS_WORLD_UNITS's own doc comment).
  const radiusPx = camera.worldLengthToScreen(
    LEDGE_GRAB_DOT_RADIUS_WORLD_UNITS,
  );
  const strokeWidthPx = Math.max(1, radiusPx * 0.25);
  let dotFill = isLight ? "#7e22ce" : "#d8b4fe";
  if (theme === "beach") {
    dotFill = isLight ? "#d97706" : "#fde047";
  } else if (theme === "autumn") {
    dotFill = isLight ? "#dc2626" : "#fbbf24";
  } else if (theme === "grid") {
    dotFill = isLight ? "#2563eb" : "#93c5fd";
  }
  for (const candidate of candidates) {
    const { x, y } = camera.worldToScreen(
      candidate.dotWorldX,
      candidate.dotWorldY,
    );
    ctx.globalAlpha = candidate.alpha;
    ctx.beginPath();
    ctx.arc(x, y, radiusPx, 0, Math.PI * 2);
    ctx.fillStyle = dotFill;
    ctx.fill();
    ctx.lineWidth = strokeWidthPx;
    ctx.strokeStyle = isLight
      ? "rgba(15, 23, 42, 0.75)"
      : "rgba(255,255,255,0.85)";
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

export function drawFallbackGroundLine(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  theme: BackgroundTheme = "mountain",
  isLight = false,
  canvas?: HTMLCanvasElement,
): void {
  const c = canvas ?? (ctx.canvas as HTMLCanvasElement | undefined);
  const groundY = camera.groundScreenY();
  if (c && (groundY < 0 || groundY > c.height)) return;
  if (theme === "beach") {
    ctx.strokeStyle = isLight
      ? "rgba(180, 83, 9, 0.45)"
      : "rgba(253, 224, 71, 0.3)";
  } else if (theme === "autumn") {
    ctx.strokeStyle = isLight
      ? "rgba(185, 28, 28, 0.45)"
      : "rgba(245, 158, 11, 0.35)";
  } else if (theme === "grid") {
    ctx.strokeStyle = isLight
      ? "rgba(30, 58, 138, 0.35)"
      : "rgba(255, 255, 255, 0.18)";
  } else {
    ctx.strokeStyle = isLight
      ? "rgba(109, 40, 217, 0.45)"
      : "rgba(168, 85, 247, 0.3)";
  }
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(c ? c.width : 2000, groundY);
  ctx.stroke();
  ctx.setLineDash([]);
}
