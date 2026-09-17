import type { Camera } from "../../../camera.js";

export function drawAutumnBackground(
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
        renderAutumnScenery(bCtx, bufW, bufH, isLight);
      }
    }
    bufferState.isLight = isLight;
    bufferState.dirty = false;
  }
  // Dynamic depth-of-field lens blur based on camera distance:
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
    renderAutumnScenery(ctx, w, h, isLight);
  }
}

function renderAutumnScenery(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  isLight: boolean,
): void {
  if (isLight) {
    renderAutumnSceneryDay(ctx, w, h);
  } else {
    renderAutumnSceneryNight(ctx, w, h);
  }
}

function renderAutumnSceneryDay(
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
  // 1. Crisp Autumn Afternoon Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
  skyGrad.addColorStop(0.0, "#1e40af"); // Deep autumn blue
  skyGrad.addColorStop(0.25, "#2563eb"); // Royal azure
  skyGrad.addColorStop(0.5, "#60a5fa"); // Clear afternoon sky
  skyGrad.addColorStop(0.72, "#93c5fd"); // Soft blue
  skyGrad.addColorStop(0.88, "#fed7aa"); // Warm golden amber glow
  skyGrad.addColorStop(1.0, "#fef3c7"); // Pale honey horizon glow
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);
  // 2. Warm Afternoon Sun & Golden Ambient Corona
  const sunX = toX(0.32);
  const sunY = h * 0.38;
  const sunR = refW * 0.08;
  const glowGrad = ctx.createRadialGradient(
    sunX,
    sunY,
    sunR * 0.5,
    sunX,
    sunY,
    refW * 0.35,
  );
  glowGrad.addColorStop(0.0, "rgba(254, 215, 170, 0.45)");
  glowGrad.addColorStop(0.35, "rgba(251, 146, 60, 0.25)");
  glowGrad.addColorStop(0.7, "rgba(254, 240, 138, 0.12)");
  glowGrad.addColorStop(1.0, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, refW * 0.35, 0, Math.PI * 2);
  ctx.fill();
  const sunDiscGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  sunDiscGrad.addColorStop(0.0, "#ffffff");
  sunDiscGrad.addColorStop(0.4, "#fffbeb");
  sunDiscGrad.addColorStop(0.85, "#fde047");
  sunDiscGrad.addColorStop(1.0, "#f59e0b");
  ctx.fillStyle = sunDiscGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  // 3. Soft Cirrus Sunset Clouds (Upper Sky)
  const autumnClouds: Array<{ pts: [number, number][]; color: string }> = [
    {
      pts: [
        [Math.min(0, toX(-0.5)), h * 0.14],
        [toX(0.25), h * 0.1],
        [toX(0.55), h * 0.16],
        [toX(0.85), h * 0.11],
        [Math.max(w, toX(1.5)), h * 0.15],
        [Math.max(w, toX(1.5)), h * 0.23],
        [toX(0.7), h * 0.25],
        [toX(0.35), h * 0.18],
        [Math.min(0, toX(-0.5)), h * 0.24],
      ],
      color: "rgba(255, 255, 255, 0.65)",
    },
    {
      pts: [
        [Math.min(0, toX(-0.5)), h * 0.22],
        [toX(0.3), h * 0.17],
        [toX(0.65), h * 0.24],
        [Math.max(w, toX(1.5)), h * 0.2],
        [Math.max(w, toX(1.5)), h * 0.3],
        [toX(0.75), h * 0.32],
        [toX(0.4), h * 0.26],
        [Math.min(0, toX(-0.5)), h * 0.3],
      ],
      color: "rgba(254, 215, 170, 0.45)",
    },
    {
      pts: [
        [toX(0.1), h * 0.29],
        [toX(0.32), h * 0.26],
        [toX(0.58), h * 0.31],
        [toX(0.52), h * 0.37],
        [toX(0.22), h * 0.35],
      ],
      color: "rgba(255, 255, 255, 0.4)",
    },
  ];
  for (const cloud of autumnClouds) {
    drawPoly(cloud.pts, cloud.color);
  }
  // 4. Distant Mountain Ridges & Shinto Shrine Pagoda
  // Far misty mountain range
  drawPoly(
    [
      [Math.min(0, toX(-0.5)), h * 0.52],
      [toX(-0.1), h * 0.44],
      [toX(0.12), h * 0.38],
      [toX(0.28), h * 0.42],
      [toX(0.45), h * 0.36],
      [toX(0.62), h * 0.42],
      [toX(0.78), h * 0.35],
      [toX(0.95), h * 0.41],
      [Math.max(w, toX(1.5)), h * 0.46],
      [Math.max(w, toX(1.5)), h * 0.55],
      [Math.min(0, toX(-0.5)), h * 0.55],
    ],
    "#64748b", // Soft misty blue-slate
  );
  // Mid mountain range
  drawPoly(
    [
      [Math.min(0, toX(-0.5)), h * 0.56],
      [toX(0.18), h * 0.46],
      [toX(0.38), h * 0.42],
      [toX(0.55), h * 0.47],
      [toX(0.75), h * 0.39], // Ridge holding the pagoda
      [toX(0.92), h * 0.45],
      [Math.max(w, toX(1.5)), h * 0.48],
      [Math.max(w, toX(1.5)), h * 0.6],
      [Math.min(0, toX(-0.5)), h * 0.6],
    ],
    "#475569",
  );
  // Pagoda on right ridge
  const pagX = toX(0.75);
  const pagY = h * 0.39;
  const pagW = refW * 0.045;
  ctx.strokeStyle = "#451a03";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pagX, pagY - h * 0.045);
  ctx.lineTo(pagX, pagY - h * 0.02);
  ctx.stroke();
  drawPoly(
    [
      [pagX, pagY - h * 0.022],
      [pagX - pagW * 0.5, pagY - h * 0.015],
      [pagX + pagW * 0.5, pagY - h * 0.015],
    ],
    "#451a03",
  );
  drawPoly(
    [
      [pagX, pagY - h * 0.015],
      [pagX - pagW * 0.75, pagY - h * 0.007],
      [pagX + pagW * 0.75, pagY - h * 0.007],
    ],
    "#451a03",
  );
  drawPoly(
    [
      [pagX, pagY - h * 0.007],
      [pagX - pagW, pagY + h * 0.003],
      [pagX - pagW * 0.7, pagY + h * 0.02],
      [pagX + pagW * 0.7, pagY + h * 0.02],
      [pagX + pagW, pagY + h * 0.003],
    ],
    "#451a03",
  );
  ctx.fillStyle = "rgba(245, 158, 11, 0.9)";
  ctx.fillRect(pagX - 2.5, pagY - h * 0.002, 5, 4);
  // Torii Gate
  const toriiX = toX(0.45);
  const toriiY = h * 0.44;
  const toriiW = refW * 0.022;
  const toriiH = h * 0.02;
  ctx.strokeStyle = "#dc2626"; // Vermilion torii gate
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(toriiX - toriiW * 0.65, toriiY);
  ctx.lineTo(toriiX + toriiW * 0.65, toriiY);
  ctx.moveTo(toriiX - toriiW * 0.55, toriiY + 3);
  ctx.lineTo(toriiX + toriiW * 0.55, toriiY + 3);
  ctx.moveTo(toriiX - toriiW * 0.35, toriiY);
  ctx.lineTo(toriiX - toriiW * 0.35, toriiY + toriiH);
  ctx.moveTo(toriiX + toriiW * 0.35, toriiY);
  ctx.lineTo(toriiX + toriiW * 0.35, toriiY + toriiH);
  ctx.stroke();
  // 5. Sparkling Autumn Valley River
  const riverGrad = ctx.createLinearGradient(0, h * 0.48, 0, h * 0.7);
  riverGrad.addColorStop(0.0, "#0284c7");
  riverGrad.addColorStop(0.35, "#38bdf8");
  riverGrad.addColorStop(0.7, "#7dd3fc");
  riverGrad.addColorStop(1.0, "#bae6fd");
  ctx.fillStyle = riverGrad;
  ctx.fillRect(0, h * 0.48, w, h * 0.22);
  // Warm Sun Reflection Beam on River
  const reflGrad = ctx.createLinearGradient(0, h * 0.48, 0, h * 0.68);
  reflGrad.addColorStop(0.0, "rgba(254, 240, 138, 0.5)");
  reflGrad.addColorStop(0.4, "rgba(251, 146, 60, 0.3)");
  reflGrad.addColorStop(0.8, "rgba(254, 215, 170, 0.15)");
  reflGrad.addColorStop(1.0, "rgba(254, 215, 170, 0)");
  ctx.fillStyle = reflGrad;
  ctx.beginPath();
  ctx.moveTo(sunX - refW * 0.03, h * 0.48);
  ctx.lineTo(sunX + refW * 0.03, h * 0.48);
  ctx.lineTo(sunX + refW * 0.14, h * 0.68);
  ctx.lineTo(sunX - refW * 0.14, h * 0.68);
  ctx.closePath();
  ctx.fill();
  // Shimmering river ripples
  const ripples: Array<{ y: number; wFactor: number; color: string }> = [
    { y: h * 0.51, wFactor: 0.05, color: "rgba(255, 255, 255, 0.65)" },
    { y: h * 0.54, wFactor: 0.08, color: "rgba(254, 240, 138, 0.55)" },
    { y: h * 0.58, wFactor: 0.11, color: "rgba(255, 255, 255, 0.5)" },
    { y: h * 0.62, wFactor: 0.15, color: "rgba(254, 215, 170, 0.4)" },
  ];
  for (const rip of ripples) {
    ctx.fillStyle = rip.color;
    ctx.beginPath();
    ctx.ellipse(sunX, rip.y, refW * rip.wFactor, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 6. Layered Rolling Forest Hills with Radiant Autumn Foliage
  const autumnHillsBack: Array<{ pts: [number, number][]; color: string }> = [
    {
      pts: [
        [Math.min(0, toX(-0.5)), h * 0.62],
        [toX(0.1), h * 0.57],
        [toX(0.28), h * 0.63],
        [toX(0.48), h * 0.58],
        [toX(0.68), h * 0.64],
        [toX(0.88), h * 0.59],
        [Math.max(w, toX(1.5)), h * 0.63],
        [Math.max(w, toX(1.5)), h * 0.78],
        [Math.min(0, toX(-0.5)), h * 0.78],
      ],
      color: "#b91c1c", // Rich crimson
    },
    {
      pts: [
        [toX(0.02), h * 0.61],
        [toX(0.16), h * 0.56],
        [toX(0.32), h * 0.62],
        [toX(0.24), h * 0.72],
        [toX(0.08), h * 0.72],
      ],
      color: "#dc2626", // Scarlet
    },
    {
      pts: [
        [toX(0.42), h * 0.62],
        [toX(0.56), h * 0.57],
        [toX(0.72), h * 0.63],
        [toX(0.64), h * 0.73],
        [toX(0.48), h * 0.73],
      ],
      color: "#ea580c", // Vibrant orange-amber
    },
  ];
  for (const hill of autumnHillsBack) drawPoly(hill.pts, hill.color);
  // Midground Autumn Canopy Hills (Warm Vermilion & Golden Amber)
  const autumnHillsMid: Array<{ pts: [number, number][]; color: string }> = [
    {
      pts: [
        [Math.min(0, toX(-0.5)), h * 0.71],
        [toX(0.18), h * 0.66],
        [toX(0.42), h * 0.72],
        [toX(0.68), h * 0.67],
        [toX(0.92), h * 0.73],
        [Math.max(w, toX(1.5)), h * 0.69],
        [Math.max(w, toX(1.5)), h * 0.86],
        [Math.min(0, toX(-0.5)), h * 0.86],
      ],
      color: "#d97706", // Golden amber base
    },
    {
      pts: [
        [toX(0.12), h * 0.7],
        [toX(0.26), h * 0.65],
        [toX(0.38), h * 0.71],
        [toX(0.32), h * 0.8],
        [toX(0.18), h * 0.8],
      ],
      color: "#ef4444", // Bright vermilion canopy
    },
    {
      pts: [
        [toX(0.58), h * 0.7],
        [toX(0.72), h * 0.65],
        [toX(0.86), h * 0.72],
        [toX(0.78), h * 0.82],
        [toX(0.62), h * 0.82],
      ],
      color: "#f97316", // Brilliant orange canopy
    },
    {
      pts: [
        [toX(0.34), h * 0.73],
        [toX(0.46), h * 0.68],
        [toX(0.58), h * 0.74],
        [toX(0.5), h * 0.82],
        [toX(0.38), h * 0.82],
      ],
      color: "#f59e0b", // Gold canopy cluster
    },
  ];
  for (const hill of autumnHillsMid) drawPoly(hill.pts, hill.color);
  // Foreground Slope & Rich Autumn Earth
  const earthGrad = ctx.createLinearGradient(0, h * 0.78, 0, h);
  earthGrad.addColorStop(0.0, "#78350f"); // Warm loam
  earthGrad.addColorStop(0.4, "#573010"); // Earth
  earthGrad.addColorStop(0.8, "#381e09"); // Rich base
  earthGrad.addColorStop(1.0, "#231104");
  ctx.fillStyle = earthGrad;
  ctx.beginPath();
  ctx.moveTo(Math.min(0, toX(-0.5)), h * 0.8);
  ctx.bezierCurveTo(
    toX(0.25),
    h * 0.78,
    toX(0.6),
    h * 0.82,
    toX(0.85),
    h * 0.79,
  );
  ctx.lineTo(Math.max(w, toX(1.5)), h * 0.82);
  ctx.lineTo(Math.max(w, toX(1.5)), h);
  ctx.lineTo(Math.min(0, toX(-0.5)), h);
  ctx.closePath();
  ctx.fill();
  // 7. Foreground Japanese Maple Branches
  ctx.strokeStyle = "#451a03";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(toX(-0.1), h * 0.05);
  ctx.quadraticCurveTo(toX(0.12), h * 0.12, toX(0.25), h * 0.22);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(toX(0.08), h * 0.11);
  ctx.quadraticCurveTo(toX(0.18), h * 0.06, toX(0.3), h * 0.12);
  ctx.stroke();
  // Left Leaf Clusters
  const leftLeafClusters: Array<{
    x: number;
    y: number;
    r: number;
    color: string;
  }> = [
    { x: toX(0.25), y: h * 0.22, r: refW * 0.045, color: "#dc2626" },
    { x: toX(0.28), y: h * 0.25, r: refW * 0.038, color: "#ea580c" },
    { x: toX(0.2), y: h * 0.24, r: refW * 0.035, color: "#b91c1c" },
    { x: toX(0.3), y: h * 0.12, r: refW * 0.042, color: "#ef4444" },
    { x: toX(0.34), y: h * 0.15, r: refW * 0.034, color: "#f59e0b" },
    { x: toX(0.15), y: h * 0.14, r: refW * 0.04, color: "#dc2626" },
  ];
  for (const lc of leftLeafClusters) {
    ctx.fillStyle = lc.color;
    ctx.beginPath();
    ctx.arc(lc.x, lc.y, lc.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Right Maple Branch & Leaves
  ctx.strokeStyle = "#451a03";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(toX(1.1), h * 0.06);
  ctx.quadraticCurveTo(toX(0.92), h * 0.14, toX(0.78), h * 0.24);
  ctx.stroke();
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(toX(0.95), h * 0.12);
  ctx.quadraticCurveTo(toX(0.85), h * 0.08, toX(0.72), h * 0.15);
  ctx.stroke();
  // Right Leaf Clusters
  const rightLeafClusters: Array<{
    x: number;
    y: number;
    r: number;
    color: string;
  }> = [
    { x: toX(0.78), y: h * 0.24, r: refW * 0.045, color: "#ea580c" },
    { x: toX(0.75), y: h * 0.27, r: refW * 0.036, color: "#dc2626" },
    { x: toX(0.84), y: h * 0.25, r: refW * 0.034, color: "#f59e0b" },
    { x: toX(0.72), y: h * 0.15, r: refW * 0.04, color: "#ef4444" },
    { x: toX(0.68), y: h * 0.18, r: refW * 0.032, color: "#b91c1c" },
    { x: toX(0.86), y: h * 0.13, r: refW * 0.038, color: "#ea580c" },
  ];
  for (const rc of rightLeafClusters) {
    ctx.fillStyle = rc.color;
    ctx.beginPath();
    ctx.arc(rc.x, rc.y, rc.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function renderAutumnSceneryNight(
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
  // 2. Dusky Plum & Apricot Twilight Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
  skyGrad.addColorStop(0.0, "#2a0845"); // Deep cosmic violet
  skyGrad.addColorStop(0.22, "#4a044e"); // Deep royal plum
  skyGrad.addColorStop(0.45, "#701a75"); // Luminous magenta-plum
  skyGrad.addColorStop(0.68, "#9f1239"); // Imperial rose / crimson
  skyGrad.addColorStop(0.86, "#ea580c"); // Sunset amber-orange
  skyGrad.addColorStop(1.0, "#fed7aa"); // Warm soft apricot horizon glow
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);
  // 3. Serene Sun & Ambient Corona Halos
  const sunX = toX(0.32);
  const sunY = h * 0.42;
  const sunR = refW * 0.08;
  // Outer glow halo
  const glowGrad = ctx.createRadialGradient(
    sunX,
    sunY,
    sunR * 0.5,
    sunX,
    sunY,
    refW * 0.35,
  );
  glowGrad.addColorStop(0.0, "rgba(254, 215, 170, 0.4)");
  glowGrad.addColorStop(0.35, "rgba(251, 146, 60, 0.25)");
  glowGrad.addColorStop(0.7, "rgba(159, 18, 57, 0.12)");
  glowGrad.addColorStop(1.0, "rgba(42, 8, 69, 0)");
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, refW * 0.35, 0, Math.PI * 2);
  ctx.fill();
  // Pale golden sun disc
  const sunDiscGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  sunDiscGrad.addColorStop(0.0, "#fff7ed");
  sunDiscGrad.addColorStop(0.4, "#ffedd5");
  sunDiscGrad.addColorStop(0.85, "#fef08a");
  sunDiscGrad.addColorStop(1.0, "#f59e0b");
  ctx.fillStyle = sunDiscGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  // 4. Soft Pastel Sunset Clouds (Upper Sky)
  const autumnClouds: Array<{ pts: [number, number][]; color: string }> = [
    {
      pts: [
        [Math.min(0, toX(-0.5)), h * 0.14],
        [toX(0.25), h * 0.1],
        [toX(0.55), h * 0.16],
        [toX(0.85), h * 0.11],
        [Math.max(w, toX(1.5)), h * 0.15],
        [Math.max(w, toX(1.5)), h * 0.24],
        [toX(0.7), h * 0.26],
        [toX(0.35), h * 0.2],
        [Math.min(0, toX(-0.5)), h * 0.26],
      ],
      color: "rgba(253, 164, 175, 0.15)",
    },
    {
      pts: [
        [Math.min(0, toX(-0.5)), h * 0.25],
        [toX(0.3), h * 0.2],
        [toX(0.65), h * 0.26],
        [Math.max(w, toX(1.5)), h * 0.22],
        [Math.max(w, toX(1.5)), h * 0.33],
        [toX(0.75), h * 0.36],
        [toX(0.4), h * 0.3],
        [Math.min(0, toX(-0.5)), h * 0.35],
      ],
      color: "rgba(251, 146, 60, 0.18)",
    },
  ];
  for (const cloud of autumnClouds) {
    drawPoly(cloud.pts, cloud.color);
  }
  // 5. Distant Mountain Ridges & Shinto Shrine Pagoda Silhouette
  // Far misty mountain range
  drawPoly(
    [
      [Math.min(0, toX(-0.5)), h * 0.52],
      [toX(-0.1), h * 0.44],
      [toX(0.12), h * 0.38],
      [toX(0.28), h * 0.42],
      [toX(0.45), h * 0.36],
      [toX(0.62), h * 0.42],
      [toX(0.78), h * 0.35],
      [toX(0.95), h * 0.41],
      [Math.max(w, toX(1.5)), h * 0.46],
      [Math.max(w, toX(1.5)), h * 0.55],
      [Math.min(0, toX(-0.5)), h * 0.55],
    ],
    "#3b0764", // Deep twilight plum
  );
  // Mid mountain range with lighting facets
  drawPoly(
    [
      [Math.min(0, toX(-0.5)), h * 0.56],
      [toX(0.18), h * 0.46],
      [toX(0.38), h * 0.42],
      [toX(0.55), h * 0.47],
      [toX(0.75), h * 0.39], // Ridge holding the pagoda
      [toX(0.92), h * 0.45],
      [Math.max(w, toX(1.5)), h * 0.48],
      [Math.max(w, toX(1.5)), h * 0.6],
      [Math.min(0, toX(-0.5)), h * 0.6],
    ],
    "#4c1d95",
  );
  // Shinto Shrine Pagoda (Multi-tiered tower on right ridge)
  const pagX = toX(0.75);
  const pagY = h * 0.39;
  const pagW = refW * 0.045;
  // Spire
  ctx.strokeStyle = "#1c1917";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pagX, pagY - h * 0.045);
  ctx.lineTo(pagX, pagY - h * 0.02);
  ctx.stroke();
  // Top roof tier
  drawPoly(
    [
      [pagX, pagY - h * 0.022],
      [pagX - pagW * 0.5, pagY - h * 0.015],
      [pagX + pagW * 0.5, pagY - h * 0.015],
    ],
    "#1c1917",
  );
  // Mid roof tier
  drawPoly(
    [
      [pagX, pagY - h * 0.015],
      [pagX - pagW * 0.75, pagY - h * 0.007],
      [pagX + pagW * 0.75, pagY - h * 0.007],
    ],
    "#1c1917",
  );
  // Base roof tier & structure
  drawPoly(
    [
      [pagX, pagY - h * 0.007],
      [pagX - pagW, pagY + h * 0.003],
      [pagX - pagW * 0.7, pagY + h * 0.02],
      [pagX + pagW * 0.7, pagY + h * 0.02],
      [pagX + pagW, pagY + h * 0.003],
    ],
    "#1c1917",
  );
  // Subtle warm lantern window glow in pagoda
  ctx.fillStyle = "rgba(245, 158, 11, 0.85)";
  ctx.fillRect(pagX - 2.5, pagY - h * 0.002, 5, 4);
  // Distant Torii Gate on mid ridge slope
  const toriiX = toX(0.45);
  const toriiY = h * 0.44;
  const toriiW = refW * 0.022;
  const toriiH = h * 0.02;
  ctx.strokeStyle = "#991b1b"; // Vermilion torii gate
  ctx.lineWidth = 2.5;
  // Crossbars
  ctx.beginPath();
  ctx.moveTo(toriiX - toriiW * 0.65, toriiY);
  ctx.lineTo(toriiX + toriiW * 0.65, toriiY);
  ctx.moveTo(toriiX - toriiW * 0.55, toriiY + 3);
  ctx.lineTo(toriiX + toriiW * 0.55, toriiY + 3);
  // Pillars
  ctx.moveTo(toriiX - toriiW * 0.35, toriiY);
  ctx.lineTo(toriiX - toriiW * 0.35, toriiY + toriiH);
  ctx.moveTo(toriiX + toriiW * 0.35, toriiY);
  ctx.lineTo(toriiX + toriiW * 0.35, toriiY + toriiH);
  ctx.stroke();
  // 6. Misty Valley River / Lake (reflecting sunset apricot)
  const riverGrad = ctx.createLinearGradient(0, h * 0.48, 0, h * 0.7);
  riverGrad.addColorStop(0.0, "#334155"); // Deep slate blue
  riverGrad.addColorStop(0.35, "#475569");
  riverGrad.addColorStop(0.7, "#64748b");
  riverGrad.addColorStop(1.0, "#94a3b8");
  ctx.fillStyle = riverGrad;
  ctx.fillRect(0, h * 0.48, w, h * 0.22);
  // Warm Sunset Reflection Beam on the river
  const reflGrad = ctx.createLinearGradient(0, h * 0.48, 0, h * 0.68);
  reflGrad.addColorStop(0.0, "rgba(254, 215, 170, 0.45)");
  reflGrad.addColorStop(0.4, "rgba(251, 146, 60, 0.3)");
  reflGrad.addColorStop(0.8, "rgba(225, 29, 72, 0.15)");
  reflGrad.addColorStop(1.0, "rgba(254, 215, 170, 0)");
  ctx.fillStyle = reflGrad;
  ctx.beginPath();
  ctx.moveTo(sunX - refW * 0.03, h * 0.48);
  ctx.lineTo(sunX + refW * 0.03, h * 0.48);
  ctx.lineTo(sunX + refW * 0.14, h * 0.68);
  ctx.lineTo(sunX - refW * 0.14, h * 0.68);
  ctx.closePath();
  ctx.fill();
  // Shimmering river ripples
  const ripples: Array<{ y: number; wFactor: number; color: string }> = [
    { y: h * 0.51, wFactor: 0.05, color: "rgba(254, 240, 138, 0.5)" },
    { y: h * 0.54, wFactor: 0.08, color: "rgba(253, 224, 71, 0.4)" },
    { y: h * 0.58, wFactor: 0.11, color: "rgba(251, 146, 60, 0.35)" },
    { y: h * 0.62, wFactor: 0.15, color: "rgba(254, 215, 170, 0.3)" },
  ];
  for (const rip of ripples) {
    ctx.fillStyle = rip.color;
    ctx.beginPath();
    ctx.ellipse(sunX, rip.y, refW * rip.wFactor, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 7. Layered Rolling Forest Hills with Autumn Foliage
  // Background Autumn Tree Canopies (Deep Crimson & Burnt Orange)
  const autumnHillsBack: Array<{ pts: [number, number][]; color: string }> = [
    {
      pts: [
        [Math.min(0, toX(-0.5)), h * 0.62],
        [toX(0.1), h * 0.57],
        [toX(0.28), h * 0.63],
        [toX(0.48), h * 0.58],
        [toX(0.68), h * 0.64],
        [toX(0.88), h * 0.59],
        [Math.max(w, toX(1.5)), h * 0.63],
        [Math.max(w, toX(1.5)), h * 0.78],
        [Math.min(0, toX(-0.5)), h * 0.78],
      ],
      color: "#7f1d1d", // Deep crimson
    },
    {
      pts: [
        [toX(0.02), h * 0.61],
        [toX(0.16), h * 0.56],
        [toX(0.32), h * 0.62],
        [toX(0.24), h * 0.72],
        [toX(0.08), h * 0.72],
      ],
      color: "#991b1b", // Scarlet
    },
    {
      pts: [
        [toX(0.42), h * 0.62],
        [toX(0.56), h * 0.57],
        [toX(0.72), h * 0.63],
        [toX(0.64), h * 0.73],
        [toX(0.48), h * 0.73],
      ],
      color: "#c2410c", // Burnt copper
    },
  ];
  for (const hill of autumnHillsBack) drawPoly(hill.pts, hill.color);
  // Midground Autumn Canopy Hills (Warm Vermilion & Golden Amber)
  const autumnHillsMid: Array<{ pts: [number, number][]; color: string }> = [
    {
      pts: [
        [Math.min(0, toX(-0.5)), h * 0.71],
        [toX(0.18), h * 0.66],
        [toX(0.42), h * 0.72],
        [toX(0.68), h * 0.67],
        [toX(0.92), h * 0.73],
        [Math.max(w, toX(1.5)), h * 0.69],
        [Math.max(w, toX(1.5)), h * 0.86],
        [Math.min(0, toX(-0.5)), h * 0.86],
      ],
      color: "#b45309", // Warm golden amber hill base
    },
    {
      pts: [
        [toX(0.12), h * 0.7],
        [toX(0.26), h * 0.65],
        [toX(0.38), h * 0.71],
        [toX(0.32), h * 0.8],
        [toX(0.18), h * 0.8],
      ],
      color: "#dc2626", // Vermilion canopy cluster
    },
    {
      pts: [
        [toX(0.58), h * 0.7],
        [toX(0.72), h * 0.65],
        [toX(0.86), h * 0.72],
        [toX(0.78), h * 0.82],
        [toX(0.62), h * 0.82],
      ],
      color: "#ea580c", // Bright orange-amber canopy
    },
    {
      pts: [
        [toX(0.34), h * 0.73],
        [toX(0.46), h * 0.68],
        [toX(0.58), h * 0.74],
        [toX(0.5), h * 0.82],
        [toX(0.38), h * 0.82],
      ],
      color: "#f59e0b", // Gold canopy cluster
    },
  ];
  for (const hill of autumnHillsMid) drawPoly(hill.pts, hill.color);
  // Foreground Slope & Mossy Earth
  const earthGrad = ctx.createLinearGradient(0, h * 0.78, 0, h);
  earthGrad.addColorStop(0.0, "#451a03"); // Dark rich soil
  earthGrad.addColorStop(0.4, "#292524"); // Stone & earth
  earthGrad.addColorStop(0.8, "#1c1917"); // Dark base
  earthGrad.addColorStop(1.0, "#0c0a09");
  ctx.fillStyle = earthGrad;
  ctx.beginPath();
  ctx.moveTo(Math.min(0, toX(-0.5)), h * 0.8);
  ctx.bezierCurveTo(
    toX(0.25),
    h * 0.78,
    toX(0.6),
    h * 0.82,
    toX(0.85),
    h * 0.79,
  );
  ctx.lineTo(Math.max(w, toX(1.5)), h * 0.82);
  ctx.lineTo(Math.max(w, toX(1.5)), h);
  ctx.lineTo(Math.min(0, toX(-0.5)), h);
  ctx.closePath();
  ctx.fill();
  // 8. Foreground Japanese Maple Branches (Framing top-left & top-right)
  // Left Maple Branch & Leaves
  ctx.strokeStyle = "#292524";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(toX(-0.1), h * 0.05);
  ctx.quadraticCurveTo(toX(0.12), h * 0.12, toX(0.25), h * 0.22);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(toX(0.08), h * 0.11);
  ctx.quadraticCurveTo(toX(0.18), h * 0.06, toX(0.3), h * 0.12);
  ctx.stroke();
  // Left Leaf Clusters
  const leftLeafClusters: Array<{
    x: number;
    y: number;
    r: number;
    color: string;
  }> = [
    { x: toX(0.25), y: h * 0.22, r: refW * 0.045, color: "#dc2626" },
    { x: toX(0.28), y: h * 0.25, r: refW * 0.038, color: "#ea580c" },
    { x: toX(0.2), y: h * 0.24, r: refW * 0.035, color: "#991b1b" },
    { x: toX(0.3), y: h * 0.12, r: refW * 0.042, color: "#ef4444" },
    { x: toX(0.34), y: h * 0.15, r: refW * 0.034, color: "#f59e0b" },
    { x: toX(0.15), y: h * 0.14, r: refW * 0.04, color: "#b91c1c" },
  ];
  for (const lc of leftLeafClusters) {
    ctx.fillStyle = lc.color;
    ctx.beginPath();
    ctx.arc(lc.x, lc.y, lc.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Right Maple Branch & Leaves
  ctx.strokeStyle = "#292524";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(toX(1.1), h * 0.06);
  ctx.quadraticCurveTo(toX(0.92), h * 0.14, toX(0.78), h * 0.24);
  ctx.stroke();
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(toX(0.95), h * 0.12);
  ctx.quadraticCurveTo(toX(0.85), h * 0.08, toX(0.72), h * 0.15);
  ctx.stroke();
  // Right Leaf Clusters
  const rightLeafClusters: Array<{
    x: number;
    y: number;
    r: number;
    color: string;
  }> = [
    { x: toX(0.78), y: h * 0.24, r: refW * 0.045, color: "#ea580c" },
    { x: toX(0.74), y: h * 0.27, r: refW * 0.038, color: "#dc2626" },
    { x: toX(0.82), y: h * 0.26, r: refW * 0.035, color: "#f59e0b" },
    { x: toX(0.72), y: h * 0.15, r: refW * 0.042, color: "#dc2626" },
    { x: toX(0.68), y: h * 0.18, r: refW * 0.034, color: "#991b1b" },
    { x: toX(0.86), y: h * 0.16, r: refW * 0.04, color: "#ef4444" },
  ];
  for (const lc of rightLeafClusters) {
    ctx.fillStyle = lc.color;
    ctx.beginPath();
    ctx.arc(lc.x, lc.y, lc.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // 9. Floating Autumn Maple Leaves in the Breeze
  const floatingLeaves: Array<{
    x: number;
    y: number;
    rot: number;
    color: string;
    size: number;
  }> = [
    { x: toX(0.22), y: h * 0.35, rot: 0.4, color: "#dc2626", size: 6 },
    { x: toX(0.38), y: h * 0.28, rot: -0.6, color: "#ea580c", size: 5 },
    { x: toX(0.48), y: h * 0.42, rot: 1.1, color: "#f59e0b", size: 5.5 },
    { x: toX(0.62), y: h * 0.32, rot: -0.3, color: "#ef4444", size: 6.5 },
    { x: toX(0.74), y: h * 0.45, rot: 0.8, color: "#dc2626", size: 5 },
    { x: toX(0.84), y: h * 0.38, rot: -1.2, color: "#ea580c", size: 5.5 },
  ];
  for (const fl of floatingLeaves) {
    ctx.save();
    ctx.translate(fl.x, fl.y);
    ctx.rotate(fl.rot);
    ctx.fillStyle = fl.color;
    ctx.beginPath();
    ctx.moveTo(0, -fl.size);
    ctx.lineTo(fl.size * 0.7, -fl.size * 0.3);
    ctx.lineTo(fl.size * 0.9, fl.size * 0.5);
    ctx.lineTo(0, fl.size * 0.3);
    ctx.lineTo(-fl.size * 0.9, fl.size * 0.5);
    ctx.lineTo(-fl.size * 0.7, -fl.size * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // 10. Soft Valley Mist across bottom
  const mistGrad = ctx.createLinearGradient(0, h * 0.75, 0, h);
  mistGrad.addColorStop(0.0, "rgba(251, 146, 60, 0.0)");
  mistGrad.addColorStop(0.4, "rgba(244, 63, 94, 0.08)");
  mistGrad.addColorStop(0.8, "rgba(112, 26, 117, 0.12)");
  mistGrad.addColorStop(1.0, "rgba(28, 25, 23, 0.3)");
  ctx.fillStyle = mistGrad;
  ctx.fillRect(0, h * 0.75, w, h * 0.25);
  ctx.restore();
}
/** Real platform/ground geometry for stages we've measured (see stageGeometry.ts); a plain Y=0 reference line otherwise. */
