import type { Camera } from "../../../camera.js";

export function drawMountainBackground(
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
        renderMountainScenery(bCtx, bufW, bufH, isLight);
      }
    }
    bufferState.isLight = isLight;
    bufferState.dirty = false;
  }
  // Dynamic depth-of-field lens blur based on camera distance:
  // pxPerUnit represents current screen pixels per world unit.
  // When the camera is close up (higher pxPerUnit), blur increases (up to ~5.5px) for creamy bokeh and punchy character contrast.
  // When the camera pulls far back (lower pxPerUnit), blur reduces (down to ~0.5px) so the landscape stays clear in wide shots.
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
    renderMountainScenery(ctx, w, h, isLight);
  }
}

function renderMountainScenery(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  isLight: boolean,
): void {
  if (isLight) {
    renderMountainSceneryDay(ctx, w, h);
  } else {
    renderMountainSceneryNight(ctx, w, h);
  }
}

function renderMountainSceneryDay(
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
  // 1. Radiant Alpine Morning Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0.0, "#0284c7"); // Clear deep alpine azure
  skyGrad.addColorStop(0.25, "#38bdf8"); // Cerulean
  skyGrad.addColorStop(0.55, "#7dd3fc"); // Bright morning blue
  skyGrad.addColorStop(0.8, "#bae6fd"); // Luminous sky
  skyGrad.addColorStop(1.0, "#f0f9ff"); // Soft horizon glow
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);
  // 2. Drifting Soft White Cumulus Clouds
  const clouds: Array<{ points: [number, number][]; color: string }> = [
    {
      points: [
        [Math.min(0, toX(-0.5)), h * 0.16],
        [toX(0.2), h * 0.11],
        [toX(0.5), h * 0.18],
        [toX(0.85), h * 0.13],
        [Math.max(w, toX(1.5)), h * 0.17],
        [Math.max(w, toX(1.5)), h * 0.28],
        [toX(0.7), h * 0.32],
        [toX(0.35), h * 0.24],
        [Math.min(0, toX(-0.5)), h * 0.3],
      ],
      color: "rgba(255, 255, 255, 0.55)",
    },
    {
      points: [
        [Math.min(0, toX(-0.5)), h * 0.28],
        [toX(0.25), h * 0.22],
        [toX(0.6), h * 0.3],
        [Math.max(w, toX(1.5)), h * 0.24],
        [Math.max(w, toX(1.5)), h * 0.38],
        [toX(0.75), h * 0.42],
        [toX(0.4), h * 0.34],
        [Math.min(0, toX(-0.5)), h * 0.4],
      ],
      color: "rgba(255, 255, 255, 0.45)",
    },
    {
      points: [
        [toX(0.05), h * 0.35],
        [toX(0.35), h * 0.3],
        [toX(0.65), h * 0.36],
        [toX(0.95), h * 0.32],
        [toX(0.75), h * 0.45],
        [toX(0.25), h * 0.44],
      ],
      color: "rgba(255, 255, 255, 0.32)",
    },
  ];
  for (const cloud of clouds) {
    drawPoly(cloud.points, cloud.color);
  }
  // 3. Radiant Alpine Morning Sun & Golden Halos
  const sunX = toX(0.76);
  const sunY = h * 0.2;
  const sunR = Math.max(18, h * 0.065);
  const haloGradients = [
    { r: sunR * 3.8, color: "rgba(254, 240, 138, 0.12)" },
    { r: sunR * 2.4, color: "rgba(253, 224, 71, 0.2)" },
    { r: sunR * 1.5, color: "rgba(254, 249, 195, 0.35)" },
    { r: sunR * 1.18, color: "rgba(255, 255, 255, 0.55)" },
  ];
  for (const halo of haloGradients) {
    ctx.beginPath();
    ctx.arc(sunX, sunY, halo.r, 0, Math.PI * 2);
    ctx.fillStyle = halo.color;
    ctx.fill();
  }
  const sunGrad = ctx.createLinearGradient(
    sunX - sunR,
    sunY - sunR,
    sunX + sunR,
    sunY + sunR,
  );
  sunGrad.addColorStop(0.0, "#ffffff");
  sunGrad.addColorStop(0.5, "#fffbeb");
  sunGrad.addColorStop(1.0, "#fde047");
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fillStyle = sunGrad;
  ctx.shadowColor = "#fef08a";
  ctx.shadowBlur = 22;
  ctx.fill();
  ctx.shadowBlur = 0;
  // Subtle sun shimmer ray glints
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 1.5;
  for (const angle of [0, Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.75]) {
    ctx.beginPath();
    ctx.moveTo(
      sunX + Math.cos(angle) * (sunR * 1.3),
      sunY + Math.sin(angle) * (sunR * 1.3),
    );
    ctx.lineTo(
      sunX + Math.cos(angle) * (sunR * 2.2),
      sunY + Math.sin(angle) * (sunR * 2.2),
    );
    ctx.moveTo(
      sunX - Math.cos(angle) * (sunR * 1.3),
      sunY - Math.sin(angle) * (sunR * 1.3),
    );
    ctx.lineTo(
      sunX - Math.cos(angle) * (sunR * 2.2),
      sunY - Math.sin(angle) * (sunR * 2.2),
    );
    ctx.stroke();
  }
  // 4. Far Mountain Silhouette Range (Layer 1: Sunlit Slate Blue)
  const farRidgePoints: [number, number][] = [
    [Math.min(0, toX(-0.8)), h * 0.78],
    [Math.min(0, toX(-0.8)), h * 0.58],
    [toX(-0.6), h * 0.48],
    [toX(-0.4), h * 0.54],
    [toX(-0.2), h * 0.46],
    [toX(-0.05), h * 0.55],
    [toX(0.06), h * 0.5],
    [toX(0.15), h * 0.56],
    [toX(0.24), h * 0.46],
    [toX(0.35), h * 0.53],
    [toX(0.48), h * 0.42],
    [toX(0.58), h * 0.51],
    [toX(0.68), h * 0.44],
    [toX(0.79), h * 0.5],
    [toX(0.9), h * 0.45],
    [toX(1.05), h * 0.52],
    [toX(1.22), h * 0.46],
    [toX(1.4), h * 0.53],
    [toX(1.6), h * 0.47],
    [Math.max(w, toX(1.8)), h * 0.56],
    [Math.max(w, toX(1.8)), h * 0.78],
  ];
  drawPoly(farRidgePoints, "#64748b");
  const farFacets: Array<{ pts: [number, number][]; color: string }> = [
    {
      pts: [
        [toX(-0.6), h * 0.48],
        [toX(-0.4), h * 0.54],
        [toX(-0.5), h * 0.78],
      ],
      color: "#94a3b8",
    },
    {
      pts: [
        [toX(-0.2), h * 0.46],
        [toX(-0.05), h * 0.55],
        [toX(-0.12), h * 0.78],
      ],
      color: "#94a3b8",
    },
    {
      pts: [
        [toX(0.06), h * 0.5],
        [toX(0.15), h * 0.56],
        [toX(0.1), h * 0.78],
      ],
      color: "#475569",
    },
    {
      pts: [
        [toX(0.24), h * 0.46],
        [toX(0.35), h * 0.53],
        [toX(0.3), h * 0.78],
      ],
      color: "#94a3b8",
    },
    {
      pts: [
        [toX(0.48), h * 0.42],
        [toX(0.58), h * 0.51],
        [toX(0.52), h * 0.78],
      ],
      color: "#94a3b8",
    },
    {
      pts: [
        [toX(0.68), h * 0.44],
        [toX(0.79), h * 0.5],
        [toX(0.73), h * 0.78],
      ],
      color: "#cbd5e1",
    },
    {
      pts: [
        [toX(0.9), h * 0.45],
        [toX(1.05), h * 0.52],
        [toX(0.96), h * 0.78],
      ],
      color: "#cbd5e1",
    },
    {
      pts: [
        [toX(1.22), h * 0.46],
        [toX(1.4), h * 0.53],
        [toX(1.3), h * 0.78],
      ],
      color: "#94a3b8",
    },
    {
      pts: [
        [toX(1.6), h * 0.47],
        [Math.max(w, toX(1.8)), h * 0.56],
        [toX(1.7), h * 0.78],
      ],
      color: "#475569",
    },
  ];
  for (const f of farFacets) drawPoly(f.pts, f.color);
  // 5. Mid Mountain Range (Layer 2: Snow-Peaked Alpine Peaks)
  interface MountainSpec {
    apex: [number, number];
    leftBase: [number, number];
    rightBase: [number, number];
    centerBase: [number, number];
    snowLeftZig: [number, number];
    snowMidZig: [number, number];
    snowRightZig: [number, number];
  }
  const midMountains: MountainSpec[] = [
    {
      apex: [toX(-0.46), h * 0.42],
      leftBase: [toX(-0.68), h * 0.88],
      rightBase: [toX(-0.24), h * 0.88],
      centerBase: [toX(-0.45), h * 0.88],
      snowLeftZig: [toX(-0.55), h * 0.57],
      snowMidZig: [toX(-0.45), h * 0.61],
      snowRightZig: [toX(-0.37), h * 0.56],
    },
    {
      apex: [toX(-0.24), h * 0.36],
      leftBase: [toX(-0.44), h * 0.86],
      rightBase: [toX(-0.02), h * 0.86],
      centerBase: [toX(-0.22), h * 0.86],
      snowLeftZig: [toX(-0.32), h * 0.52],
      snowMidZig: [toX(-0.22), h * 0.56],
      snowRightZig: [toX(-0.15), h * 0.51],
    },
    {
      apex: [toX(0.16), h * 0.35],
      leftBase: [toX(-0.06), h * 0.85],
      rightBase: [toX(0.38), h * 0.85],
      centerBase: [toX(0.18), h * 0.85],
      snowLeftZig: [toX(0.08), h * 0.51],
      snowMidZig: [toX(0.17), h * 0.55],
      snowRightZig: [toX(0.24), h * 0.5],
    },
    {
      apex: [toX(0.36), h * 0.42],
      leftBase: [toX(0.18), h * 0.86],
      rightBase: [toX(0.54), h * 0.86],
      centerBase: [toX(0.37), h * 0.86],
      snowLeftZig: [toX(0.29), h * 0.56],
      snowMidZig: [toX(0.37), h * 0.59],
      snowRightZig: [toX(0.43), h * 0.55],
    },
    {
      apex: [toX(0.58), h * 0.3],
      leftBase: [toX(0.38), h * 0.88],
      rightBase: [toX(0.78), h * 0.88],
      centerBase: [toX(0.59), h * 0.88],
      snowLeftZig: [toX(0.49), h * 0.49],
      snowMidZig: [toX(0.59), h * 0.53],
      snowRightZig: [toX(0.67), h * 0.48],
    },
    {
      apex: [toX(0.82), h * 0.38],
      leftBase: [toX(0.64), h * 0.88],
      rightBase: [toX(1.02), h * 0.88],
      centerBase: [toX(0.83), h * 0.88],
      snowLeftZig: [toX(0.73), h * 0.56],
      snowMidZig: [toX(0.83), h * 0.6],
      snowRightZig: [toX(0.91), h * 0.54],
    },
    {
      apex: [toX(1.02), h * 0.44],
      leftBase: [toX(0.84), h * 0.9],
      rightBase: [toX(1.14), h * 0.9],
      centerBase: [toX(1.02), h * 0.9],
      snowLeftZig: [toX(0.95), h * 0.58],
      snowMidZig: [toX(1.02), h * 0.62],
      snowRightZig: [toX(1.07), h * 0.57],
    },
    {
      apex: [toX(-0.02), h * 0.42],
      leftBase: [toX(-0.16), h * 0.88],
      rightBase: [toX(0.14), h * 0.88],
      centerBase: [toX(-0.01), h * 0.88],
      snowLeftZig: [toX(-0.08), h * 0.56],
      snowMidZig: [toX(-0.01), h * 0.6],
      snowRightZig: [toX(0.06), h * 0.55],
    },
    {
      apex: [toX(1.24), h * 0.37],
      leftBase: [toX(1.04), h * 0.88],
      rightBase: [toX(1.44), h * 0.88],
      centerBase: [toX(1.25), h * 0.88],
      snowLeftZig: [toX(1.15), h * 0.52],
      snowMidZig: [toX(1.25), h * 0.56],
      snowRightZig: [toX(1.33), h * 0.51],
    },
    {
      apex: [toX(1.46), h * 0.43],
      leftBase: [toX(1.26), h * 0.9],
      rightBase: [toX(1.68), h * 0.9],
      centerBase: [toX(1.46), h * 0.9],
      snowLeftZig: [toX(1.38), h * 0.58],
      snowMidZig: [toX(1.46), h * 0.62],
      snowRightZig: [toX(1.53), h * 0.57],
    },
  ];
  for (const m of midMountains) {
    // 1. Left shadow face (solid cool alpine rock)
    drawPoly([m.apex, m.leftBase, m.centerBase], "#334155");
    drawPoly(
      [
        m.apex,
        [m.leftBase[0] * 0.4 + m.centerBase[0] * 0.6, m.leftBase[1]],
        m.centerBase,
      ],
      "#475569",
    );
    // 2. Right sunlit face (sun-warmed granite)
    drawPoly([m.apex, m.centerBase, m.rightBase], "#64748b");
    drawPoly(
      [
        m.apex,
        m.centerBase,
        [m.centerBase[0] * 0.4 + m.rightBase[0] * 0.6, m.rightBase[1]],
      ],
      "#94a3b8",
    );
    // 3. Snow Cap (Shadow Side)
    drawPoly([m.apex, m.snowLeftZig, m.snowMidZig], "#cbd5e1");
    drawPoly(
      [
        m.apex,
        [m.snowLeftZig[0] * 0.5 + m.snowMidZig[0] * 0.5, m.snowMidZig[1]],
        m.snowMidZig,
      ],
      "#e2e8f0",
    );
    // 4. Snow Cap (Sunlit Side - Brilliant Pristine Alpine Snow)
    drawPoly([m.apex, m.snowMidZig, m.snowRightZig], "#ffffff");
    drawPoly(
      [
        m.apex,
        m.snowMidZig,
        [m.snowMidZig[0] * 0.4 + m.snowRightZig[0] * 0.6, m.snowRightZig[1]],
      ],
      "#f8fafc",
    );
  }
  // 6. Near Mountain Foothills & Rolling Forest Ridges
  const foothills: Array<{ pts: [number, number][]; color: string }> = [
    {
      pts: [
        [Math.min(0, toX(-0.8)), h * 0.76],
        [toX(-0.4), h * 0.72],
        [toX(-0.1), h * 0.78],
        [toX(-0.3), h],
        [Math.min(0, toX(-0.8)), h],
      ],
      color: "#1e293b",
    },
    {
      pts: [
        [toX(-0.2), h * 0.77],
        [toX(0.18), h * 0.7],
        [toX(0.38), h * 0.78],
        [toX(0.2), h],
        [toX(-0.1), h],
      ],
      color: "#166534", // Alpine evergreen ridge
    },
    {
      pts: [
        [toX(0.28), h * 0.76],
        [toX(0.58), h * 0.68],
        [toX(0.85), h * 0.78],
        [toX(0.68), h],
        [toX(0.4), h],
      ],
      color: "#0f172a",
    },
    {
      pts: [
        [toX(0.72), h * 0.76],
        [toX(1.05), h * 0.71],
        [toX(1.35), h * 0.79],
        [toX(1.15), h],
        [toX(0.85), h],
      ],
      color: "#166534",
    },
    {
      pts: [
        [toX(1.18), h * 0.77],
        [toX(1.5), h * 0.73],
        [Math.max(w, toX(1.8)), h * 0.78],
        [Math.max(w, toX(1.8)), h],
        [toX(1.3), h],
      ],
      color: "#1e293b",
    },
  ];
  for (const f of foothills) drawPoly(f.pts, f.color);
  // 7. Alpine Coniferous Trees (Rich Forest Green)
  const treeClusters: Array<[number, number, number]> = [
    [-0.42, 0.72, 22],
    [-0.39, 0.71, 28],
    [-0.36, 0.72, 20],
    [-0.18, 0.74, 18],
    [-0.15, 0.73, 25],
    [-0.12, 0.74, 19],
    [0.12, 0.71, 16],
    [0.15, 0.7, 24],
    [0.17, 0.7, 20],
    [0.19, 0.71, 15],
    [0.44, 0.71, 20],
    [0.46, 0.7, 26],
    [0.48, 0.69, 22],
    [0.5, 0.68, 28],
    [0.52, 0.68, 24],
    [0.54, 0.7, 18],
    [0.78, 0.73, 20],
    [0.8, 0.72, 26],
    [0.82, 0.71, 22],
    [0.84, 0.71, 27],
    [0.86, 0.72, 21],
    [0.88, 0.73, 16],
    [1.15, 0.73, 19],
    [1.18, 0.72, 25],
    [1.21, 0.73, 18],
    [1.38, 0.72, 22],
    [1.41, 0.71, 27],
    [1.44, 0.72, 20],
  ];
  for (const [tx, ty, th] of treeClusters) {
    const px = toX(tx);
    if (px < -30 || px > w + 30) continue;
    const py = ty * h;
    const tw = th * 0.45;
    drawPoly(
      [
        [px, py - th],
        [px - tw * 0.5, py - th * 0.6],
        [px - tw * 0.25, py - th * 0.6],
        [px - tw * 0.75, py - th * 0.25],
        [px - tw * 0.4, py - th * 0.25],
        [px - tw, py],
        [px + tw, py],
        [px + tw * 0.4, py - th * 0.25],
        [px + tw * 0.75, py - th * 0.25],
        [px + tw * 0.25, py - th * 0.6],
        [px + tw * 0.5, py - th * 0.6],
      ],
      "#064e3b",
    );
  }
  // 8. Soft Morning Valley Mist across full canvas
  const mistGrad = ctx.createLinearGradient(0, h * 0.75, 0, h);
  mistGrad.addColorStop(0.0, "rgba(224, 242, 254, 0.0)");
  mistGrad.addColorStop(0.3, "rgba(186, 230, 253, 0.18)");
  mistGrad.addColorStop(0.7, "rgba(224, 242, 254, 0.22)");
  mistGrad.addColorStop(1.0, "rgba(241, 245, 249, 0.4)");
  ctx.fillStyle = mistGrad;
  ctx.fillRect(0, h * 0.75, w, h * 0.25);
  ctx.restore();
}

function renderMountainSceneryNight(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  ctx.save();
  // 1. Fixed Aspect Ratio Coordinate Transform:
  // Lock horizontal scaling to match the natural ~1.05 aspect ratio from the default
  // sidebar-shown view. When sidebars are collapsed (wide canvas), the mountains, moon,
  // and snow caps maintain their exact steepness and proportions without horizontal stretching!
  const baseAspect = 1.05;
  const refW = h * baseAspect;
  const offsetX = (w - refW) * 0.5;
  const toX = (relX: number) => offsetX + relX * refW;
  // Helper to draw filled polygons with strict array bounds checks
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
  // 2. Deep Midnight Twilight Sky Gradient (Purple to Indigo Blue) across full width
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0.0, "#080516"); // Deep cosmic black-violet
  skyGrad.addColorStop(0.25, "#150b33"); // Deep royal purple
  skyGrad.addColorStop(0.5, "#22134e"); // Luminous twilight amethyst
  skyGrad.addColorStop(0.75, "#191f52"); // Indigo night
  skyGrad.addColorStop(1.0, "#121b36"); // Horizon navy
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);
  // 3. Translucent Atmospheric Aurora / Nebula Cloud Polygons
  const nebulaBands: Array<{ points: [number, number][]; color: string }> = [
    {
      points: [
        [Math.min(0, toX(-0.5)), h * 0.18],
        [toX(0.25), h * 0.12],
        [toX(0.55), h * 0.22],
        [toX(0.85), h * 0.14],
        [Math.max(w, toX(1.5)), h * 0.2],
        [Math.max(w, toX(1.5)), h * 0.38],
        [toX(0.7), h * 0.42],
        [toX(0.35), h * 0.32],
        [Math.min(0, toX(-0.5)), h * 0.4],
      ],
      color: "rgba(168, 85, 247, 0.07)",
    },
    {
      points: [
        [Math.min(0, toX(-0.5)), h * 0.32],
        [toX(0.3), h * 0.26],
        [toX(0.65), h * 0.35],
        [Math.max(w, toX(1.5)), h * 0.28],
        [Math.max(w, toX(1.5)), h * 0.5],
        [toX(0.75), h * 0.56],
        [toX(0.4), h * 0.46],
        [Math.min(0, toX(-0.5)), h * 0.54],
      ],
      color: "rgba(99, 102, 241, 0.06)",
    },
    {
      points: [
        [Math.min(0, toX(-0.3)), h * 0.45],
        [toX(0.45), h * 0.4],
        [toX(0.8), h * 0.48],
        [Math.max(w, toX(1.3)), h * 0.44],
        [Math.max(w, toX(1.3)), h * 0.62],
        [toX(0.6), h * 0.68],
        [toX(0.2), h * 0.58],
      ],
      color: "rgba(56, 189, 248, 0.04)",
    },
  ];
  for (const band of nebulaBands) {
    drawPoly(band.points, band.color);
  }
  // 4. Celestial Starfield (Fixed deterministic star distribution)
  const stars: Array<[number, number, number, number]> = [
    [-0.4, 0.12, 1.3, 0.7],
    [-0.3, 0.2, 1.0, 0.55],
    [-0.2, 0.08, 1.5, 0.8],
    [-0.1, 0.16, 1.1, 0.6],
    [0.05, 0.08, 1.2, 0.75],
    [0.12, 0.16, 1.0, 0.6],
    [0.18, 0.05, 1.6, 0.9],
    [0.22, 0.22, 1.1, 0.55],
    [0.28, 0.11, 1.4, 0.8],
    [0.34, 0.06, 1.0, 0.5],
    [0.38, 0.19, 1.8, 0.95],
    [0.44, 0.12, 1.1, 0.65],
    [0.48, 0.04, 1.5, 0.85],
    [0.52, 0.24, 0.9, 0.5],
    [0.58, 0.09, 1.3, 0.7],
    [0.62, 0.17, 1.7, 0.9],
    [0.68, 0.07, 1.1, 0.6],
    [0.82, 0.06, 1.5, 0.85],
    [0.88, 0.14, 1.2, 0.7],
    [0.92, 0.05, 1.8, 0.95],
    [0.96, 0.2, 1.0, 0.6],
    [1.1, 0.1, 1.3, 0.75],
    [1.2, 0.18, 1.1, 0.6],
    [1.3, 0.07, 1.6, 0.85],
    [1.4, 0.15, 1.2, 0.7],
    [0.08, 0.28, 1.1, 0.55],
    [0.15, 0.35, 0.9, 0.45],
    [0.26, 0.31, 1.3, 0.65],
    [0.42, 0.33, 1.0, 0.5],
    [0.55, 0.36, 1.2, 0.6],
    [0.71, 0.32, 1.1, 0.55],
    [0.85, 0.28, 1.4, 0.75],
    [0.94, 0.34, 1.0, 0.5],
  ];
  for (const [sx, sy, sr, sa] of stars) {
    const px = toX(sx);
    if (px < -10 || px > w + 10) continue;
    const py = sy * h;
    ctx.beginPath();
    ctx.arc(px, py, sr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(240, 245, 255, ${sa})`;
    ctx.fill();
    // Diamond shimmer spark for brightest stars
    if (sa > 0.8) {
      ctx.beginPath();
      ctx.moveTo(px - sr * 2.2, py);
      ctx.lineTo(px, py - sr * 2.2);
      ctx.lineTo(px + sr * 2.2, py);
      ctx.lineTo(px, py + sr * 2.2);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 255, 255, ${sa * 0.4})`;
      ctx.fill();
    }
  }
  // 5. Luminous Full Moon (Anchored relative to scene proportion)
  const moonX = toX(0.76);
  const moonY = h * 0.2;
  const moonR = Math.max(18, h * 0.065);
  // Expanding soft atmospheric moonlight halos
  const haloGradients = [
    { r: moonR * 3.8, color: "rgba(192, 132, 252, 0.04)" },
    { r: moonR * 2.4, color: "rgba(216, 180, 254, 0.09)" },
    { r: moonR * 1.5, color: "rgba(243, 232, 255, 0.18)" },
    { r: moonR * 1.18, color: "rgba(255, 255, 255, 0.28)" },
  ];
  for (const halo of haloGradients) {
    ctx.beginPath();
    ctx.arc(moonX, moonY, halo.r, 0, Math.PI * 2);
    ctx.fillStyle = halo.color;
    ctx.fill();
  }
  // Moon disc
  const moonGrad = ctx.createLinearGradient(
    moonX - moonR,
    moonY - moonR,
    moonX + moonR,
    moonY + moonR,
  );
  moonGrad.addColorStop(0.0, "#ffffff");
  moonGrad.addColorStop(0.65, "#f1f5f9");
  moonGrad.addColorStop(1.0, "#cbd5e1");
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fillStyle = moonGrad;
  ctx.shadowColor = "#e9d5ff";
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.shadowBlur = 0;
  // Subtle low-poly lunar maria craters
  const craters: Array<[number, number, number, number]> = [
    [-0.32, -0.18, 0.26, 0.22],
    [-0.1, 0.22, 0.3, 0.25],
    [0.22, -0.28, 0.22, 0.2],
    [0.28, 0.14, 0.28, 0.24],
    [-0.2, -0.4, 0.18, 0.15],
  ];
  ctx.fillStyle = "rgba(148, 163, 184, 0.18)";
  for (const [cx, cy, crx, cry] of craters) {
    ctx.beginPath();
    ctx.ellipse(
      moonX + cx * moonR,
      moonY + cy * moonR,
      crx * moonR,
      cry * moonR,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  // 6. Far Mountain Silhouette Range (Layer 1: Deep Amethyst / Indigo)
  const farRidgePoints: [number, number][] = [
    [Math.min(0, toX(-0.8)), h * 0.78],
    [Math.min(0, toX(-0.8)), h * 0.58],
    [toX(-0.6), h * 0.48],
    [toX(-0.4), h * 0.54],
    [toX(-0.2), h * 0.46],
    [toX(-0.05), h * 0.55],
    [toX(0.06), h * 0.5],
    [toX(0.15), h * 0.56],
    [toX(0.24), h * 0.46],
    [toX(0.35), h * 0.53],
    [toX(0.48), h * 0.42],
    [toX(0.58), h * 0.51],
    [toX(0.68), h * 0.44],
    [toX(0.79), h * 0.5],
    [toX(0.9), h * 0.45],
    [toX(1.05), h * 0.52],
    [toX(1.22), h * 0.46],
    [toX(1.4), h * 0.53],
    [toX(1.6), h * 0.47],
    [Math.max(w, toX(1.8)), h * 0.56],
    [Math.max(w, toX(1.8)), h * 0.78],
  ];
  drawPoly(farRidgePoints, "#181333");
  // Far mountain facet shading
  const farFacets: Array<{ pts: [number, number][]; color: string }> = [
    {
      pts: [
        [toX(-0.6), h * 0.48],
        [toX(-0.4), h * 0.54],
        [toX(-0.5), h * 0.78],
      ],
      color: "#1e1840",
    },
    {
      pts: [
        [toX(-0.2), h * 0.46],
        [toX(-0.05), h * 0.55],
        [toX(-0.12), h * 0.78],
      ],
      color: "#221a47",
    },
    {
      pts: [
        [toX(0.06), h * 0.5],
        [toX(0.15), h * 0.56],
        [toX(0.1), h * 0.78],
      ],
      color: "#1e1840",
    },
    {
      pts: [
        [toX(0.24), h * 0.46],
        [toX(0.35), h * 0.53],
        [toX(0.3), h * 0.78],
      ],
      color: "#221a47",
    },
    {
      pts: [
        [toX(0.48), h * 0.42],
        [toX(0.58), h * 0.51],
        [toX(0.52), h * 0.78],
      ],
      color: "#251c4e",
    },
    {
      pts: [
        [toX(0.68), h * 0.44],
        [toX(0.79), h * 0.5],
        [toX(0.73), h * 0.78],
      ],
      color: "#2b2158",
    },
    {
      pts: [
        [toX(0.9), h * 0.45],
        [toX(1.05), h * 0.52],
        [toX(0.96), h * 0.78],
      ],
      color: "#241d4a",
    },
    {
      pts: [
        [toX(1.22), h * 0.46],
        [toX(1.4), h * 0.53],
        [toX(1.3), h * 0.78],
      ],
      color: "#221a47",
    },
    {
      pts: [
        [toX(1.6), h * 0.47],
        [Math.max(w, toX(1.8)), h * 0.56],
        [toX(1.7), h * 0.78],
      ],
      color: "#1e1840",
    },
  ];
  for (const f of farFacets) drawPoly(f.pts, f.color);
  // 7. Mid Mountain Range (Layer 2: Snow-Peaked Faceted Peaks)
  interface MountainSpec {
    apex: [number, number];
    leftBase: [number, number];
    rightBase: [number, number];
    centerBase: [number, number];
    snowLeftZig: [number, number];
    snowMidZig: [number, number];
    snowRightZig: [number, number];
  }
  const midMountains: MountainSpec[] = [
    // Left flanking peak 2
    {
      apex: [toX(-0.46), h * 0.42],
      leftBase: [toX(-0.68), h * 0.88],
      rightBase: [toX(-0.24), h * 0.88],
      centerBase: [toX(-0.45), h * 0.88],
      snowLeftZig: [toX(-0.55), h * 0.57],
      snowMidZig: [toX(-0.45), h * 0.61],
      snowRightZig: [toX(-0.37), h * 0.56],
    },
    // Left flanking peak 1
    {
      apex: [toX(-0.24), h * 0.36],
      leftBase: [toX(-0.44), h * 0.86],
      rightBase: [toX(-0.02), h * 0.86],
      centerBase: [toX(-0.22), h * 0.86],
      snowLeftZig: [toX(-0.32), h * 0.52],
      snowMidZig: [toX(-0.22), h * 0.56],
      snowRightZig: [toX(-0.15), h * 0.51],
    },
    // Left mountain (from screenshot)
    {
      apex: [toX(0.16), h * 0.35],
      leftBase: [toX(-0.06), h * 0.85],
      rightBase: [toX(0.38), h * 0.85],
      centerBase: [toX(0.18), h * 0.85],
      snowLeftZig: [toX(0.08), h * 0.51],
      snowMidZig: [toX(0.17), h * 0.55],
      snowRightZig: [toX(0.24), h * 0.5],
    },
    // Left-mid mountain (from screenshot)
    {
      apex: [toX(0.36), h * 0.42],
      leftBase: [toX(0.18), h * 0.86],
      rightBase: [toX(0.54), h * 0.86],
      centerBase: [toX(0.37), h * 0.86],
      snowLeftZig: [toX(0.29), h * 0.56],
      snowMidZig: [toX(0.37), h * 0.59],
      snowRightZig: [toX(0.43), h * 0.55],
    },
    // Highest center-right mountain (from screenshot)
    {
      apex: [toX(0.58), h * 0.3],
      leftBase: [toX(0.38), h * 0.88],
      rightBase: [toX(0.78), h * 0.88],
      centerBase: [toX(0.59), h * 0.88],
      snowLeftZig: [toX(0.49), h * 0.49],
      snowMidZig: [toX(0.59), h * 0.53],
      snowRightZig: [toX(0.67), h * 0.48],
    },
    // Moonlit mountain beneath moon (from screenshot)
    {
      apex: [toX(0.82), h * 0.38],
      leftBase: [toX(0.64), h * 0.88],
      rightBase: [toX(1.02), h * 0.88],
      centerBase: [toX(0.83), h * 0.88],
      snowLeftZig: [toX(0.73), h * 0.56],
      snowMidZig: [toX(0.83), h * 0.6],
      snowRightZig: [toX(0.91), h * 0.54],
    },
    // Far right mountain (from screenshot)
    {
      apex: [toX(1.02), h * 0.44],
      leftBase: [toX(0.84), h * 0.9],
      rightBase: [toX(1.14), h * 0.9],
      centerBase: [toX(1.02), h * 0.9],
      snowLeftZig: [toX(0.95), h * 0.58],
      snowMidZig: [toX(1.02), h * 0.62],
      snowRightZig: [toX(1.07), h * 0.57],
    },
    // Far left mountain (from screenshot)
    {
      apex: [toX(-0.02), h * 0.42],
      leftBase: [toX(-0.16), h * 0.88],
      rightBase: [toX(0.14), h * 0.88],
      centerBase: [toX(-0.01), h * 0.88],
      snowLeftZig: [toX(-0.08), h * 0.56],
      snowMidZig: [toX(-0.01), h * 0.6],
      snowRightZig: [toX(0.06), h * 0.55],
    },
    // Right flanking peak 1
    {
      apex: [toX(1.24), h * 0.37],
      leftBase: [toX(1.04), h * 0.88],
      rightBase: [toX(1.44), h * 0.88],
      centerBase: [toX(1.25), h * 0.88],
      snowLeftZig: [toX(1.15), h * 0.52],
      snowMidZig: [toX(1.25), h * 0.56],
      snowRightZig: [toX(1.33), h * 0.51],
    },
    // Right flanking peak 2
    {
      apex: [toX(1.46), h * 0.43],
      leftBase: [toX(1.26), h * 0.9],
      rightBase: [toX(1.68), h * 0.9],
      centerBase: [toX(1.46), h * 0.9],
      snowLeftZig: [toX(1.38), h * 0.58],
      snowMidZig: [toX(1.46), h * 0.62],
      snowRightZig: [toX(1.53), h * 0.57],
    },
  ];
  // Draw base mountain bodies and faceted shading
  for (const m of midMountains) {
    // 1. Left dark shadow face
    drawPoly([m.apex, m.leftBase, m.centerBase], "#14172b");
    // Inner shadow facet
    drawPoly(
      [
        m.apex,
        [m.leftBase[0] * 0.4 + m.centerBase[0] * 0.6, m.leftBase[1]],
        m.centerBase,
      ],
      "#1a1e38",
    );
    // 2. Right moonlit face
    drawPoly([m.apex, m.centerBase, m.rightBase], "#283454");
    // Secondary moonlit highlight facet
    drawPoly(
      [
        m.apex,
        m.centerBase,
        [m.centerBase[0] * 0.4 + m.rightBase[0] * 0.6, m.rightBase[1]],
      ],
      "#36456c",
    );
    // 3. Snow Cap (Shadow Side - Amethyst / Indigo Snow)
    drawPoly([m.apex, m.snowLeftZig, m.snowMidZig], "rgba(99, 102, 241, 0.75)");
    // Secondary shadow snow facet
    drawPoly(
      [
        m.apex,
        [m.snowLeftZig[0] * 0.5 + m.snowMidZig[0] * 0.5, m.snowMidZig[1]],
        m.snowMidZig,
      ],
      "rgba(129, 140, 248, 0.65)",
    );
    // 4. Snow Cap (Moonlit Side - Brilliant Icy White/Lavender Snow)
    drawPoly([m.apex, m.snowMidZig, m.snowRightZig], "#f8fafc");
    // Secondary moonlit snow facet
    drawPoly(
      [
        m.apex,
        m.snowMidZig,
        [m.snowMidZig[0] * 0.4 + m.snowRightZig[0] * 0.6, m.snowRightZig[1]],
      ],
      "#e0e7ff",
    );
  }
  // 8. Near Mountain Foothills & Rolling Ridges (Layer 3)
  const foothills: Array<{ pts: [number, number][]; color: string }> = [
    {
      pts: [
        [Math.min(0, toX(-0.8)), h * 0.76],
        [toX(-0.4), h * 0.72],
        [toX(-0.1), h * 0.78],
        [toX(-0.3), h],
        [Math.min(0, toX(-0.8)), h],
      ],
      color: "#0c101f",
    },
    {
      pts: [
        [toX(-0.2), h * 0.77],
        [toX(0.18), h * 0.7],
        [toX(0.38), h * 0.78],
        [toX(0.2), h],
        [toX(-0.2), h],
      ],
      color: "#0d1222",
    },
    {
      pts: [
        [toX(0.3), h * 0.78],
        [toX(0.52), h * 0.68],
        [toX(0.72), h * 0.76],
        [toX(0.55), h],
        [toX(0.25), h],
      ],
      color: "#10162a",
    },
    {
      pts: [
        [toX(0.64), h * 0.76],
        [toX(0.85), h * 0.71],
        [toX(1.15), h * 0.77],
        [toX(0.9), h],
        [toX(0.6), h],
      ],
      color: "#0f1528",
    },
    {
      pts: [
        [toX(1.05), h * 0.77],
        [toX(1.35), h * 0.71],
        [Math.max(w, toX(1.8)), h * 0.76],
        [Math.max(w, toX(1.8)), h],
        [toX(1.2), h],
      ],
      color: "#0c101f",
    },
  ];
  for (const fh of foothills) drawPoly(fh.pts, fh.color);
  // 9. Low-Poly Coniferous Pine Tree Silhouettes along the ridges
  const treeClusters: Array<[number, number, number]> = [
    // Left flanking trees
    [-0.45, 0.73, 20],
    [-0.42, 0.72, 25],
    [-0.38, 0.73, 18],
    [-0.15, 0.73, 19],
    [-0.12, 0.72, 24],
    [-0.09, 0.73, 17],
    // Center range trees (from screenshot)
    [0.08, 0.72, 18],
    [0.1, 0.71, 22],
    [0.12, 0.71, 16],
    [0.15, 0.7, 24],
    [0.17, 0.7, 20],
    [0.19, 0.71, 15],
    [0.44, 0.71, 20],
    [0.46, 0.7, 26],
    [0.48, 0.69, 22],
    [0.5, 0.68, 28],
    [0.52, 0.68, 24],
    [0.54, 0.7, 18],
    [0.78, 0.73, 20],
    [0.8, 0.72, 26],
    [0.82, 0.71, 22],
    [0.84, 0.71, 27],
    [0.86, 0.72, 21],
    [0.88, 0.73, 16],
    // Right flanking trees
    [1.15, 0.73, 19],
    [1.18, 0.72, 25],
    [1.21, 0.73, 18],
    [1.38, 0.72, 22],
    [1.41, 0.71, 27],
    [1.44, 0.72, 20],
  ];
  for (const [tx, ty, th] of treeClusters) {
    const px = toX(tx);
    if (px < -30 || px > w + 30) continue;
    const py = ty * h;
    const tw = th * 0.45;
    // 3-tiered pine tree polygon
    drawPoly(
      [
        [px, py - th],
        [px - tw * 0.5, py - th * 0.6],
        [px - tw * 0.25, py - th * 0.6],
        [px - tw * 0.75, py - th * 0.25],
        [px - tw * 0.4, py - th * 0.25],
        [px - tw, py],
        [px + tw, py],
        [px + tw * 0.4, py - th * 0.25],
        [px + tw * 0.75, py - th * 0.25],
        [px + tw * 0.25, py - th * 0.6],
        [px + tw * 0.5, py - th * 0.6],
      ],
      "#050812",
    );
  }
  // 10. Soft Valley Mist & Moonlit Ground Fog across full canvas
  const mistGrad = ctx.createLinearGradient(0, h * 0.75, 0, h);
  mistGrad.addColorStop(0.0, "rgba(168, 85, 247, 0.0)");
  mistGrad.addColorStop(0.3, "rgba(168, 85, 247, 0.06)");
  mistGrad.addColorStop(0.6, "rgba(59, 130, 246, 0.08)");
  mistGrad.addColorStop(1.0, "rgba(15, 23, 42, 0.25)");
  ctx.fillStyle = mistGrad;
  ctx.fillRect(0, h * 0.75, w, h * 0.25);
  ctx.restore();
}
