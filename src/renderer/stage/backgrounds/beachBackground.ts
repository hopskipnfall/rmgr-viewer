import type { Camera } from "../../../camera.js";

export function drawBeachBackground(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  isLight: boolean,
  bufferState: {
    canvas?: HTMLCanvasElement;
    dirty: boolean;
    isLight?: boolean;
  },
  camera?: Camera,
): void {
  const w = canvas.width;
  const h = canvas.height;
  // Generous buffer margin to prevent edge-transparency bleed during gaussian blurring
  const margin = 32;
  const bufW = w + margin * 2;
  const bufH = h + margin * 2;

  // Cache the pristine unblurred background into an offscreen canvas to guarantee maximum 60fps performance
  if (
    !bufferState.canvas ||
    bufferState.canvas.width !== bufW ||
    bufferState.canvas.height !== bufH ||
    bufferState.dirty ||
    bufferState.isLight !== isLight
  ) {
    if (!bufferState.canvas && typeof document !== "undefined") {
      bufferState.canvas = document.createElement("canvas");
    }
    if (bufferState.canvas) {
      bufferState.canvas.width = bufW;
      bufferState.canvas.height = bufH;
      const bCtx = bufferState.canvas.getContext("2d");
      if (bCtx) {
        renderBeachScenery(bCtx, bufW, bufH, isLight);
      }
    }
    bufferState.isLight = isLight;
    bufferState.dirty = false;
  }
  // Dynamic depth-of-field lens blur based on camera distance:
  // pxPerUnit represents current screen pixels per world unit.
  const pxPerUnit = camera ? camera.worldLengthToScreen(1) : 0.3;
  const closeness = Math.max(0, Math.min(1, (pxPerUnit - 0.12) / 0.33));
  const blurPx = 0.5 + closeness * 5.0;
  if (bufferState.canvas) {
    ctx.save();
    try {
      ctx.filter = `blur(${blurPx.toFixed(1)}px)`;
    } catch {
      // ignore if unsupported in current environment
    }
    ctx.drawImage(bufferState.canvas, -margin, -margin);
    ctx.restore();
  } else {
    renderBeachScenery(ctx, w, h, isLight);
  }
}

function renderBeachScenery(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  isLight: boolean,
): void {
  if (isLight) {
    renderBeachSceneryDay(ctx, w, h);
  } else {
    renderBeachSceneryNight(ctx, w, h);
  }
}

function renderBeachSceneryDay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  ctx.save();
  const baseAspect = 1.05;
  const refW = h * baseAspect;
  const offsetX = (w - refW) * 0.5;
  const toX = (relX: number) => offsetX + relX * refW;
  const drawPoly = (pts: [number, number][], fill: string) => {
    const first = pts[0];
    if (!first) return;
    ctx.beginPath();
    ctx.moveTo(first[0], first[1]);
    for (let i = 1; i < pts.length; i++) {
      const pt = pts[i];
      if (pt) {
        ctx.lineTo(pt[0], pt[1]);
      }
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  // 1. Vibrant Tropical Sunny Day Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.58);
  skyGrad.addColorStop(0.0, "#0284c7"); // Deep tropical azure
  skyGrad.addColorStop(0.25, "#0ea5e9"); // Sky blue
  skyGrad.addColorStop(0.5, "#38bdf8"); // Cerulean
  skyGrad.addColorStop(0.75, "#7dd3fc"); // Sunny cyan
  skyGrad.addColorStop(1.0, "#cffafe"); // Shimmering tropical horizon glow
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);
  // 2. High Tropical Midday Sun & Shimmering Rays
  const sunX = toX(0.72);
  const sunY = h * 0.32;
  const sunR = refW * 0.075;
  // Outer glow halo
  const glowGrad = ctx.createRadialGradient(
    sunX,
    sunY,
    sunR * 0.5,
    sunX,
    sunY,
    refW * 0.35,
  );
  glowGrad.addColorStop(0.0, "rgba(254, 240, 138, 0.4)");
  glowGrad.addColorStop(0.3, "rgba(253, 224, 71, 0.22)");
  glowGrad.addColorStop(0.7, "rgba(254, 249, 195, 0.12)");
  glowGrad.addColorStop(1.0, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, refW * 0.35, 0, Math.PI * 2);
  ctx.fill();
  // Brilliant golden sun disc
  const sunDiscGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  sunDiscGrad.addColorStop(0.0, "#ffffff");
  sunDiscGrad.addColorStop(0.4, "#fffbeb");
  sunDiscGrad.addColorStop(0.85, "#fde047");
  sunDiscGrad.addColorStop(1.0, "#f59e0b");
  ctx.fillStyle = sunDiscGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  // Radiant sun glints
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 1.6;
  for (const angle of [0, Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.75]) {
    ctx.beginPath();
    ctx.moveTo(
      sunX + Math.cos(angle) * (sunR * 1.3),
      sunY + Math.sin(angle) * (sunR * 1.3),
    );
    ctx.lineTo(
      sunX + Math.cos(angle) * (sunR * 2.3),
      sunY + Math.sin(angle) * (sunR * 2.3),
    );
    ctx.moveTo(
      sunX - Math.cos(angle) * (sunR * 1.3),
      sunY - Math.sin(angle) * (sunR * 1.3),
    );
    ctx.lineTo(
      sunX - Math.cos(angle) * (sunR * 2.3),
      sunY - Math.sin(angle) * (sunR * 2.3),
    );
    ctx.stroke();
  }
  // 3. Puffy Soft White Trade-Wind Clouds
  const tradeClouds: Array<{ pts: [number, number][]; color: string }> = [
    {
      pts: [
        [Math.min(0, toX(-0.5)), h * 0.14],
        [toX(0.2), h * 0.1],
        [toX(0.45), h * 0.16],
        [toX(0.8), h * 0.11],
        [Math.max(w, toX(1.5)), h * 0.15],
        [Math.max(w, toX(1.5)), h * 0.25],
        [toX(0.65), h * 0.26],
        [toX(0.3), h * 0.2],
        [Math.min(0, toX(-0.5)), h * 0.26],
      ],
      color: "rgba(255, 255, 255, 0.65)",
    },
    {
      pts: [
        [Math.min(0, toX(-0.5)), h * 0.24],
        [toX(0.25), h * 0.19],
        [toX(0.6), h * 0.26],
        [Math.max(w, toX(1.5)), h * 0.22],
        [Math.max(w, toX(1.5)), h * 0.33],
        [toX(0.7), h * 0.36],
        [toX(0.35), h * 0.3],
        [Math.min(0, toX(-0.5)), h * 0.35],
      ],
      color: "rgba(255, 255, 255, 0.5)",
    },
    {
      pts: [
        [toX(0.38), h * 0.28],
        [toX(0.58), h * 0.25],
        [toX(0.82), h * 0.29],
        [toX(0.78), h * 0.35],
        [toX(0.52), h * 0.34],
      ],
      color: "rgba(255, 255, 255, 0.42)",
    },
  ];
  for (const cloud of tradeClouds) {
    drawPoly(cloud.pts, cloud.color);
  }
  // 4. Distant Tropical Volcanic Islands on Horizon (Lush Rainforest Greens)
  drawPoly(
    [
      [Math.min(0, toX(-0.5)), h * 0.52],
      [toX(0.04), h * 0.48],
      [toX(0.14), h * 0.44],
      [toX(0.22), h * 0.41], // Volcano peak
      [toX(0.26), h * 0.43],
      [toX(0.34), h * 0.46],
      [toX(0.44), h * 0.49],
      [toX(0.52), h * 0.52],
      [Math.min(0, toX(-0.5)), h * 0.52],
    ],
    "#166534", // Lush tropical jungle green
  );
  drawPoly(
    [
      [toX(0.14), h * 0.44],
      [toX(0.22), h * 0.41],
      [toX(0.26), h * 0.43],
      [toX(0.3), h * 0.48],
      [toX(0.18), h * 0.5],
    ],
    "#22c55e", // Sunlit rainforest canopy highlight
  );
  drawPoly(
    [
      [toX(0.86), h * 0.52],
      [toX(0.9), h * 0.47],
      [toX(0.93), h * 0.46],
      [toX(0.97), h * 0.52],
    ],
    "#15803d",
  );
  drawPoly(
    [
      [toX(0.9), h * 0.47],
      [toX(0.93), h * 0.46],
      [toX(0.95), h * 0.49],
    ],
    "#4ade80",
  );
  // 5. Layered Sparkling Turquoise Ocean Lagoon & Sun Reflection
  const oceanGrad = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.74);
  oceanGrad.addColorStop(0.0, "#0369a1"); // Deep ocean azure at horizon
  oceanGrad.addColorStop(0.2, "#0284c7"); // Ocean blue
  oceanGrad.addColorStop(0.45, "#0891b2"); // Tropical teal
  oceanGrad.addColorStop(0.7, "#06b6d4"); // Turquoise lagoon
  oceanGrad.addColorStop(0.9, "#14b8a6"); // Bright aqua
  oceanGrad.addColorStop(1.0, "#2dd4bf"); // Glistening shallow reef water
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, h * 0.5, w, h * 0.24);
  // Sun Reflection Path down the water
  const reflGrad = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.72);
  reflGrad.addColorStop(0.0, "rgba(255, 255, 255, 0.65)");
  reflGrad.addColorStop(0.35, "rgba(254, 240, 138, 0.45)");
  reflGrad.addColorStop(0.75, "rgba(253, 224, 71, 0.25)");
  reflGrad.addColorStop(1.0, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = reflGrad;
  ctx.beginPath();
  ctx.moveTo(sunX - refW * 0.04, h * 0.5);
  ctx.lineTo(sunX + refW * 0.04, h * 0.5);
  ctx.lineTo(sunX + refW * 0.18, h * 0.72);
  ctx.lineTo(sunX - refW * 0.18, h * 0.72);
  ctx.closePath();
  ctx.fill();
  // Stylized horizontal wave reflection bands
  const waveBands: Array<{ y: number; wFactor: number; color: string }> = [
    { y: h * 0.53, wFactor: 0.06, color: "rgba(255, 255, 255, 0.75)" },
    { y: h * 0.56, wFactor: 0.09, color: "rgba(254, 240, 138, 0.6)" },
    { y: h * 0.6, wFactor: 0.12, color: "rgba(255, 255, 255, 0.6)" },
    { y: h * 0.64, wFactor: 0.16, color: "rgba(254, 249, 195, 0.5)" },
    { y: h * 0.68, wFactor: 0.22, color: "rgba(255, 255, 255, 0.55)" },
  ];
  for (const wb of waveBands) {
    ctx.fillStyle = wb.color;
    ctx.beginPath();
    ctx.ellipse(sunX, wb.y, refW * wb.wFactor, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Shallow aquamarine wave crests along shoreline
  drawPoly(
    [
      [Math.min(0, toX(-0.5)), h * 0.69],
      [toX(0.2), h * 0.68],
      [toX(0.5), h * 0.7],
      [toX(0.8), h * 0.68],
      [Math.max(w, toX(1.5)), h * 0.71],
      [Math.max(w, toX(1.5)), h * 0.76],
      [toX(0.7), h * 0.76],
      [toX(0.3), h * 0.74],
      [Math.min(0, toX(-0.5)), h * 0.75],
    ],
    "rgba(45, 212, 191, 0.6)",
  );
  // White Surf Foam Line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(Math.min(0, toX(-0.5)), h * 0.72);
  ctx.bezierCurveTo(
    toX(0.25),
    h * 0.7,
    toX(0.6),
    h * 0.75,
    toX(0.85),
    h * 0.71,
  );
  ctx.lineTo(Math.max(w, toX(1.5)), h * 0.74);
  ctx.stroke();
  // 6. Sun-Drenched Golden Sandy Beach
  const sandGrad = ctx.createLinearGradient(0, h * 0.72, 0, h);
  sandGrad.addColorStop(0.0, "#f59e0b"); // Warm amber wet sand
  sandGrad.addColorStop(0.2, "#fbbf24"); // Golden sand
  sandGrad.addColorStop(0.5, "#fde047"); // Bright sunlit sand
  sandGrad.addColorStop(0.8, "#fef08a"); // Highlighted dunes
  sandGrad.addColorStop(1.0, "#fef9c3"); // Warm pale sand base
  ctx.fillStyle = sandGrad;
  ctx.beginPath();
  ctx.moveTo(Math.min(0, toX(-0.5)), h * 0.72);
  ctx.bezierCurveTo(
    toX(0.25),
    h * 0.7,
    toX(0.6),
    h * 0.75,
    toX(0.85),
    h * 0.71,
  );
  ctx.lineTo(Math.max(w, toX(1.5)), h * 0.74);
  ctx.lineTo(Math.max(w, toX(1.5)), h);
  ctx.lineTo(Math.min(0, toX(-0.5)), h);
  ctx.closePath();
  ctx.fill();
  // Dune Shadow / Shading Facets
  drawPoly(
    [
      [toX(0.15), h * 0.85],
      [toX(0.4), h * 0.82],
      [toX(0.65), h * 0.89],
      [toX(0.35), h * 0.94],
    ],
    "rgba(217, 119, 6, 0.18)",
  );
  drawPoly(
    [
      [toX(0.6), h * 0.88],
      [toX(0.9), h * 0.85],
      [toX(1.1), h * 0.95],
      [toX(0.75), h * 0.97],
    ],
    "rgba(217, 119, 6, 0.14)",
  );
  // 7. Tropical Coconut Palm Trees
  const trunkStartX = toX(0.08);
  const trunkStartY = h * 1.02;
  const trunkCtrlX = toX(0.18);
  const trunkCtrlY = h * 0.65;
  const palmHeadX = toX(0.26);
  const palmHeadY = h * 0.32;
  ctx.strokeStyle = "#5c2b09"; // Warm wood
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(trunkStartX, trunkStartY);
  ctx.quadraticCurveTo(trunkCtrlX, trunkCtrlY, palmHeadX, palmHeadY);
  ctx.stroke();
  ctx.strokeStyle = "#92400e";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(trunkStartX + 2, trunkStartY);
  ctx.quadraticCurveTo(trunkCtrlX + 2, trunkCtrlY, palmHeadX + 1, palmHeadY);
  ctx.stroke();
  // Coconuts under crown
  ctx.fillStyle = "#78350f";
  ctx.beginPath();
  ctx.arc(palmHeadX - 4, palmHeadY + 4, 6, 0, Math.PI * 2);
  ctx.arc(palmHeadX + 5, palmHeadY + 5, 5.5, 0, Math.PI * 2);
  ctx.arc(palmHeadX + 1, palmHeadY + 8, 5, 0, Math.PI * 2);
  ctx.fill();
  interface PalmFrond {
    tipX: number;
    tipY: number;
    ctrlX: number;
    ctrlY: number;
    color: string;
    w: number;
  }
  const fronds: PalmFrond[] = [
    {
      tipX: palmHeadX - refW * 0.18,
      tipY: palmHeadY + h * 0.05,
      ctrlX: palmHeadX - refW * 0.12,
      ctrlY: palmHeadY - h * 0.08,
      color: "#047857",
      w: 18,
    },
    {
      tipX: palmHeadX - refW * 0.22,
      tipY: palmHeadY - h * 0.02,
      ctrlX: palmHeadX - refW * 0.14,
      ctrlY: palmHeadY - h * 0.14,
      color: "#059669",
      w: 16,
    },
    {
      tipX: palmHeadX - refW * 0.08,
      tipY: palmHeadY - h * 0.16,
      ctrlX: palmHeadX - refW * 0.04,
      ctrlY: palmHeadY - h * 0.18,
      color: "#10b981",
      w: 16,
    },
    {
      tipX: palmHeadX + refW * 0.08,
      tipY: palmHeadY - h * 0.15,
      ctrlX: palmHeadX + refW * 0.05,
      ctrlY: palmHeadY - h * 0.17,
      color: "#34d399",
      w: 15,
    },
    {
      tipX: palmHeadX + refW * 0.2,
      tipY: palmHeadY - h * 0.04,
      ctrlX: palmHeadX + refW * 0.12,
      ctrlY: palmHeadY - h * 0.12,
      color: "#10b981",
      w: 18,
    },
    {
      tipX: palmHeadX + refW * 0.18,
      tipY: palmHeadY + h * 0.07,
      ctrlX: palmHeadX + refW * 0.11,
      ctrlY: palmHeadY - h * 0.03,
      color: "#059669",
      w: 16,
    },
    {
      tipX: palmHeadX + refW * 0.12,
      tipY: palmHeadY + h * 0.14,
      ctrlX: palmHeadX + refW * 0.06,
      ctrlY: palmHeadY + h * 0.06,
      color: "#047857",
      w: 14,
    },
  ];
  for (const fr of fronds) {
    ctx.strokeStyle = fr.color;
    ctx.lineWidth = fr.w;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(palmHeadX, palmHeadY);
    ctx.quadraticCurveTo(fr.ctrlX, fr.ctrlY, fr.tipX, fr.tipY);
    ctx.stroke();
    ctx.strokeStyle = "#6ee7b7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(palmHeadX, palmHeadY);
    ctx.quadraticCurveTo(fr.ctrlX, fr.ctrlY, fr.tipX, fr.tipY);
    ctx.stroke();
  }
  // Right Overhanging Tropical Palm Crown
  const rightHeadX = toX(0.98);
  const rightHeadY = h * 0.12;
  const rightFronds: PalmFrond[] = [
    {
      tipX: rightHeadX - refW * 0.24,
      tipY: rightHeadY + h * 0.12,
      ctrlX: rightHeadX - refW * 0.14,
      ctrlY: rightHeadY + h * 0.02,
      color: "#047857",
      w: 18,
    },
    {
      tipX: rightHeadX - refW * 0.28,
      tipY: rightHeadY + h * 0.03,
      ctrlX: rightHeadX - refW * 0.16,
      ctrlY: rightHeadY - h * 0.06,
      color: "#059669",
      w: 16,
    },
    {
      tipX: rightHeadX - refW * 0.18,
      tipY: rightHeadY - h * 0.08,
      ctrlX: rightHeadX - refW * 0.08,
      ctrlY: rightHeadY - h * 0.12,
      color: "#10b981",
      w: 15,
    },
    {
      tipX: rightHeadX - refW * 0.14,
      tipY: rightHeadY + h * 0.2,
      ctrlX: rightHeadX - refW * 0.06,
      ctrlY: rightHeadY + h * 0.1,
      color: "#059669",
      w: 16,
    },
  ];
  for (const fr of rightFronds) {
    ctx.strokeStyle = fr.color;
    ctx.lineWidth = fr.w;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(rightHeadX, rightHeadY);
    ctx.quadraticCurveTo(fr.ctrlX, fr.ctrlY, fr.tipX, fr.tipY);
    ctx.stroke();
    ctx.strokeStyle = "#6ee7b7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rightHeadX, rightHeadY);
    ctx.quadraticCurveTo(fr.ctrlX, fr.ctrlY, fr.tipX, fr.tipY);
    ctx.stroke();
  }
  // 8. Tropical Seabirds soaring in clear blue sky
  const birds: [number, number, number][] = [
    [toX(0.52), h * 0.28, 7],
    [toX(0.58), h * 0.24, 9],
    [toX(0.64), h * 0.3, 6],
  ];
  ctx.strokeStyle = "rgba(14, 116, 144, 0.85)";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  for (const [bx, by, bSize] of birds) {
    ctx.beginPath();
    ctx.moveTo(bx - bSize, by + bSize * 0.3);
    ctx.quadraticCurveTo(bx - bSize * 0.4, by - bSize * 0.4, bx, by);
    ctx.quadraticCurveTo(
      bx + bSize * 0.4,
      by - bSize * 0.4,
      bx + bSize,
      by + bSize * 0.3,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function renderBeachSceneryNight(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  ctx.save();
  // 1. Fixed Aspect Ratio Coordinate Transform:
  const baseAspect = 1.05;
  const refW = h * baseAspect;
  const offsetX = (w - refW) * 0.5;
  const toX = (relX: number) => offsetX + relX * refW;
  const drawPoly = (pts: [number, number][], fill: string) => {
    const first = pts[0];
    if (!first) return;
    ctx.beginPath();
    ctx.moveTo(first[0], first[1]);
    for (let i = 1; i < pts.length; i++) {
      const pt = pts[i];
      if (pt) {
        ctx.lineTo(pt[0], pt[1]);
      }
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  // 2. Warm Tropical Sunset Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.58);
  skyGrad.addColorStop(0.0, "#1e1b4b"); // Deep twilight indigo
  skyGrad.addColorStop(0.2, "#312e81"); // Sapphire
  skyGrad.addColorStop(0.4, "#6d28d9"); // Royal purple
  skyGrad.addColorStop(0.62, "#be185d"); // Tropical rose / magenta
  skyGrad.addColorStop(0.82, "#f97316"); // Vibrant sunset orange
  skyGrad.addColorStop(1.0, "#fde047"); // Luminous golden horizon glow
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);
  // 3. Setting Sun & Atmospheric Corona Halos
  const sunX = toX(0.72);
  const sunY = h * 0.44;
  const sunR = refW * 0.075;
  // Outer glow halo
  const glowGrad = ctx.createRadialGradient(
    sunX,
    sunY,
    sunR * 0.5,
    sunX,
    sunY,
    refW * 0.32,
  );
  glowGrad.addColorStop(0.0, "rgba(253, 224, 71, 0.45)");
  glowGrad.addColorStop(0.3, "rgba(249, 115, 22, 0.25)");
  glowGrad.addColorStop(0.7, "rgba(190, 24, 93, 0.1)");
  glowGrad.addColorStop(1.0, "rgba(30, 27, 75, 0)");
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, refW * 0.32, 0, Math.PI * 2);
  ctx.fill();
  // Brilliant golden sun disc
  const sunDiscGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  sunDiscGrad.addColorStop(0.0, "#ffffff");
  sunDiscGrad.addColorStop(0.4, "#fffbeb");
  sunDiscGrad.addColorStop(0.85, "#fde047");
  sunDiscGrad.addColorStop(1.0, "#f59e0b");
  ctx.fillStyle = sunDiscGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  // 4. Soft Pastel Sunset Clouds (Upper Sky)
  const sunsetClouds: Array<{ pts: [number, number][]; color: string }> = [
    {
      pts: [
        [Math.min(0, toX(-0.5)), h * 0.16],
        [toX(0.2), h * 0.12],
        [toX(0.45), h * 0.18],
        [toX(0.8), h * 0.13],
        [Math.max(w, toX(1.5)), h * 0.17],
        [Math.max(w, toX(1.5)), h * 0.26],
        [toX(0.65), h * 0.28],
        [toX(0.3), h * 0.22],
        [Math.min(0, toX(-0.5)), h * 0.28],
      ],
      color: "rgba(244, 114, 182, 0.12)",
    },
    {
      pts: [
        [Math.min(0, toX(-0.5)), h * 0.26],
        [toX(0.25), h * 0.22],
        [toX(0.6), h * 0.28],
        [Math.max(w, toX(1.5)), h * 0.24],
        [Math.max(w, toX(1.5)), h * 0.35],
        [toX(0.7), h * 0.38],
        [toX(0.35), h * 0.32],
        [Math.min(0, toX(-0.5)), h * 0.38],
      ],
      color: "rgba(251, 146, 60, 0.16)",
    },
    {
      pts: [
        [toX(0.4), h * 0.36],
        [toX(0.6), h * 0.34],
        [toX(0.85), h * 0.37],
        [toX(0.8), h * 0.42],
        [toX(0.55), h * 0.41],
      ],
      color: "rgba(253, 224, 71, 0.22)",
    },
  ];
  for (const cloud of sunsetClouds) {
    drawPoly(cloud.pts, cloud.color);
  }
  // 5. Distant Tropical Islands on Horizon
  // Far island silhouette (Left/Center)
  drawPoly(
    [
      [Math.min(0, toX(-0.5)), h * 0.52],
      [toX(0.04), h * 0.48],
      [toX(0.14), h * 0.44],
      [toX(0.22), h * 0.41], // Volcano peak
      [toX(0.26), h * 0.43],
      [toX(0.34), h * 0.46],
      [toX(0.44), h * 0.49],
      [toX(0.52), h * 0.52],
      [Math.min(0, toX(-0.5)), h * 0.52],
    ],
    "#2e1065", // Deep twilight purple
  );
  // Island ridge lighting facet
  drawPoly(
    [
      [toX(0.14), h * 0.44],
      [toX(0.22), h * 0.41],
      [toX(0.26), h * 0.43],
      [toX(0.3), h * 0.48],
      [toX(0.18), h * 0.5],
    ],
    "#4c1d95", // Highlighted purple facet
  );
  // Distant right sea stack / rock
  drawPoly(
    [
      [toX(0.86), h * 0.52],
      [toX(0.9), h * 0.47],
      [toX(0.93), h * 0.46],
      [toX(0.97), h * 0.52],
    ],
    "#3b0764",
  );
  // 6. Layered Ocean Lagoon & Sun Reflection Beam
  // Ocean base gradient
  const oceanGrad = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.74);
  oceanGrad.addColorStop(0.0, "#1e3a8a"); // Deep navy blue near horizon
  oceanGrad.addColorStop(0.2, "#0369a1"); // Ocean blue
  oceanGrad.addColorStop(0.45, "#0284c7"); // Cerulean
  oceanGrad.addColorStop(0.7, "#0891b2"); // Teal
  oceanGrad.addColorStop(0.9, "#0d9488"); // Turquoise lagoon
  oceanGrad.addColorStop(1.0, "#14b8a6"); // Shallow seafoam
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, h * 0.5, w, h * 0.24);
  // Golden Sunset Reflection Path down the water
  const reflGrad = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.72);
  reflGrad.addColorStop(0.0, "rgba(253, 224, 71, 0.45)");
  reflGrad.addColorStop(0.35, "rgba(249, 115, 22, 0.3)");
  reflGrad.addColorStop(0.75, "rgba(244, 63, 94, 0.18)");
  reflGrad.addColorStop(1.0, "rgba(253, 224, 71, 0)");
  ctx.fillStyle = reflGrad;
  ctx.beginPath();
  ctx.moveTo(sunX - refW * 0.04, h * 0.5);
  ctx.lineTo(sunX + refW * 0.04, h * 0.5);
  ctx.lineTo(sunX + refW * 0.18, h * 0.72);
  ctx.lineTo(sunX - refW * 0.18, h * 0.72);
  ctx.closePath();
  ctx.fill();
  // Stylized horizontal wave reflection bands
  const waveBands: Array<{ y: number; wFactor: number; color: string }> = [
    { y: h * 0.53, wFactor: 0.06, color: "rgba(254, 240, 138, 0.5)" },
    { y: h * 0.56, wFactor: 0.09, color: "rgba(253, 224, 71, 0.4)" },
    { y: h * 0.6, wFactor: 0.12, color: "rgba(251, 146, 60, 0.35)" },
    { y: h * 0.64, wFactor: 0.16, color: "rgba(254, 215, 170, 0.3)" },
    { y: h * 0.68, wFactor: 0.22, color: "rgba(255, 255, 255, 0.35)" },
  ];
  for (const wb of waveBands) {
    ctx.fillStyle = wb.color;
    ctx.beginPath();
    ctx.ellipse(sunX, wb.y, refW * wb.wFactor, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Shallow aquamarine wave crests along shoreline
  drawPoly(
    [
      [Math.min(0, toX(-0.5)), h * 0.69],
      [toX(0.2), h * 0.68],
      [toX(0.5), h * 0.7],
      [toX(0.8), h * 0.68],
      [Math.max(w, toX(1.5)), h * 0.71],
      [Math.max(w, toX(1.5)), h * 0.76],
      [toX(0.7), h * 0.76],
      [toX(0.3), h * 0.74],
      [Math.min(0, toX(-0.5)), h * 0.75],
    ],
    "rgba(45, 212, 191, 0.45)", // Luminous mint/aquamarine
  );
  // White Surf Foam Line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(Math.min(0, toX(-0.5)), h * 0.72);
  ctx.bezierCurveTo(
    toX(0.25),
    h * 0.7,
    toX(0.6),
    h * 0.75,
    toX(0.85),
    h * 0.71,
  );
  ctx.lineTo(Math.max(w, toX(1.5)), h * 0.74);
  ctx.stroke();
  // 7. Golden Sandy Beach & Foreground Dunes
  const sandGrad = ctx.createLinearGradient(0, h * 0.72, 0, h);
  sandGrad.addColorStop(0.0, "#d97706"); // Wet reflective sand
  sandGrad.addColorStop(0.2, "#f59e0b"); // Warm amber sand
  sandGrad.addColorStop(0.5, "#fbbf24"); // Bright golden sand
  sandGrad.addColorStop(0.8, "#fef08a"); // Highlighted dunes
  sandGrad.addColorStop(1.0, "#fde047"); // Warm base
  ctx.fillStyle = sandGrad;
  ctx.beginPath();
  ctx.moveTo(Math.min(0, toX(-0.5)), h * 0.72);
  ctx.bezierCurveTo(
    toX(0.25),
    h * 0.7,
    toX(0.6),
    h * 0.75,
    toX(0.85),
    h * 0.71,
  );
  ctx.lineTo(Math.max(w, toX(1.5)), h * 0.74);
  ctx.lineTo(Math.max(w, toX(1.5)), h);
  ctx.lineTo(Math.min(0, toX(-0.5)), h);
  ctx.closePath();
  ctx.fill();
  // Dune Shadow / Shading Facets
  drawPoly(
    [
      [toX(0.15), h * 0.85],
      [toX(0.4), h * 0.82],
      [toX(0.65), h * 0.89],
      [toX(0.35), h * 0.94],
    ],
    "rgba(180, 83, 9, 0.22)", // Warm amber dune shadow
  );
  drawPoly(
    [
      [toX(0.6), h * 0.88],
      [toX(0.9), h * 0.85],
      [toX(1.1), h * 0.95],
      [toX(0.75), h * 0.97],
    ],
    "rgba(180, 83, 9, 0.18)",
  );
  // 8. Graceful Coconut Palm Trees
  // Left Main Palm Tree Trunk
  const trunkStartX = toX(0.08);
  const trunkStartY = h * 1.02;
  const trunkCtrlX = toX(0.18);
  const trunkCtrlY = h * 0.65;
  const palmHeadX = toX(0.26);
  const palmHeadY = h * 0.32;
  ctx.strokeStyle = "#451a03"; // Rich dark wood
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(trunkStartX, trunkStartY);
  ctx.quadraticCurveTo(trunkCtrlX, trunkCtrlY, palmHeadX, palmHeadY);
  ctx.stroke();
  // Trunk Bark Highlights / Ring segments
  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(trunkStartX + 2, trunkStartY);
  ctx.quadraticCurveTo(trunkCtrlX + 2, trunkCtrlY, palmHeadX + 1, palmHeadY);
  ctx.stroke();
  // Coconuts under crown
  ctx.fillStyle = "#78350f";
  ctx.beginPath();
  ctx.arc(palmHeadX - 4, palmHeadY + 4, 6, 0, Math.PI * 2);
  ctx.arc(palmHeadX + 5, palmHeadY + 5, 5.5, 0, Math.PI * 2);
  ctx.arc(palmHeadX + 1, palmHeadY + 8, 5, 0, Math.PI * 2);
  ctx.fill();
  interface PalmFrond {
    tipX: number;
    tipY: number;
    ctrlX: number;
    ctrlY: number;
    color: string;
    w: number;
  }
  const fronds: PalmFrond[] = [
    // Sweeping Left
    {
      tipX: palmHeadX - refW * 0.18,
      tipY: palmHeadY + h * 0.05,
      ctrlX: palmHeadX - refW * 0.12,
      ctrlY: palmHeadY - h * 0.08,
      color: "#064e3b",
      w: 18,
    },
    {
      tipX: palmHeadX - refW * 0.22,
      tipY: palmHeadY - h * 0.02,
      ctrlX: palmHeadX - refW * 0.14,
      ctrlY: palmHeadY - h * 0.14,
      color: "#047857",
      w: 16,
    },
    // Up & Arching
    {
      tipX: palmHeadX - refW * 0.08,
      tipY: palmHeadY - h * 0.16,
      ctrlX: palmHeadX - refW * 0.04,
      ctrlY: palmHeadY - h * 0.18,
      color: "#059669",
      w: 16,
    },
    {
      tipX: palmHeadX + refW * 0.08,
      tipY: palmHeadY - h * 0.15,
      ctrlX: palmHeadX + refW * 0.05,
      ctrlY: palmHeadY - h * 0.17,
      color: "#10b981",
      w: 15,
    },
    // Sweeping Right
    {
      tipX: palmHeadX + refW * 0.2,
      tipY: palmHeadY - h * 0.04,
      ctrlX: palmHeadX + refW * 0.12,
      ctrlY: palmHeadY - h * 0.12,
      color: "#059669",
      w: 18,
    },
    {
      tipX: palmHeadX + refW * 0.18,
      tipY: palmHeadY + h * 0.07,
      ctrlX: palmHeadX + refW * 0.11,
      ctrlY: palmHeadY - h * 0.03,
      color: "#047857",
      w: 16,
    },
    {
      tipX: palmHeadX + refW * 0.12,
      tipY: palmHeadY + h * 0.14,
      ctrlX: palmHeadX + refW * 0.06,
      ctrlY: palmHeadY + h * 0.06,
      color: "#064e3b",
      w: 14,
    },
  ];
  for (const fr of fronds) {
    ctx.strokeStyle = fr.color;
    ctx.lineWidth = fr.w;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(palmHeadX, palmHeadY);
    ctx.quadraticCurveTo(fr.ctrlX, fr.ctrlY, fr.tipX, fr.tipY);
    ctx.stroke();
    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(palmHeadX, palmHeadY);
    ctx.quadraticCurveTo(fr.ctrlX, fr.ctrlY, fr.tipX, fr.tipY);
    ctx.stroke();
  }
  // Right Overhanging Tropical Palm Crown (Framing top-right)
  const rightHeadX = toX(0.98);
  const rightHeadY = h * 0.12;
  const rightFronds: PalmFrond[] = [
    {
      tipX: rightHeadX - refW * 0.24,
      tipY: rightHeadY + h * 0.12,
      ctrlX: rightHeadX - refW * 0.14,
      ctrlY: rightHeadY + h * 0.02,
      color: "#064e3b",
      w: 18,
    },
    {
      tipX: rightHeadX - refW * 0.28,
      tipY: rightHeadY + h * 0.03,
      ctrlX: rightHeadX - refW * 0.16,
      ctrlY: rightHeadY - h * 0.06,
      color: "#047857",
      w: 16,
    },
    {
      tipX: rightHeadX - refW * 0.18,
      tipY: rightHeadY - h * 0.08,
      ctrlX: rightHeadX - refW * 0.08,
      ctrlY: rightHeadY - h * 0.12,
      color: "#059669",
      w: 15,
    },
    {
      tipX: rightHeadX - refW * 0.14,
      tipY: rightHeadY + h * 0.2,
      ctrlX: rightHeadX - refW * 0.06,
      ctrlY: rightHeadY + h * 0.1,
      color: "#065f46",
      w: 16,
    },
  ];
  for (const fr of rightFronds) {
    ctx.strokeStyle = fr.color;
    ctx.lineWidth = fr.w;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(rightHeadX, rightHeadY);
    ctx.quadraticCurveTo(fr.ctrlX, fr.ctrlY, fr.tipX, fr.tipY);
    ctx.stroke();
    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rightHeadX, rightHeadY);
    ctx.quadraticCurveTo(fr.ctrlX, fr.ctrlY, fr.tipX, fr.tipY);
    ctx.stroke();
  }
  // 9. Seabirds soaring near sunset
  const birds: [number, number, number][] = [
    [toX(0.52), h * 0.32, 7],
    [toX(0.58), h * 0.28, 9],
    [toX(0.64), h * 0.34, 6],
  ];
  ctx.strokeStyle = "rgba(49, 46, 129, 0.75)";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  for (const [bx, by, bSize] of birds) {
    ctx.beginPath();
    ctx.moveTo(bx - bSize, by + bSize * 0.3);
    ctx.quadraticCurveTo(bx - bSize * 0.4, by - bSize * 0.4, bx, by);
    ctx.quadraticCurveTo(
      bx + bSize * 0.4,
      by - bSize * 0.4,
      bx + bSize,
      by + bSize * 0.3,
    );
    ctx.stroke();
  }
  ctx.restore();
}
