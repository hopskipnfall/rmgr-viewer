import type { Camera } from "../../camera.js";
import { stageGeometry } from "../../stageGeometry.js";

export function drawAnimatedAutumnLeaves(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  frameIndex?: number,
): void {
  const animFrame =
    frameIndex ??
    (typeof performance !== "undefined"
      ? Math.floor(performance.now() / 16.67)
      : 0);
  const leafPalette = [
    "#dc2626", // Crimson
    "#ea580c", // Flame orange
    "#f59e0b", // Amber gold
    "#991b1b", // Deep scarlet
    "#c2410c", // Burnt copper
    "#facc15", // Bright gold
  ];
  const numLeaves = 14;
  const heightRange = 2600;
  ctx.save();
  for (let i = 0; i < numLeaves; i++) {
    // Deterministic pseudo-random seed per leaf index
    const seedX = -2300 + ((i * 357) % 4600);
    const seedY = ((i * 593) % heightRange) + 200;
    const speed = 1.6 + (i % 4) * 0.5;
    // Current world coordinates
    const worldY =
      ((((seedY - animFrame * speed) % heightRange) + heightRange) %
        heightRange) -
      200;
    const sway = Math.sin(animFrame * 0.03 + i * 1.6) * (70 + (i % 3) * 30);
    const worldX = seedX + sway;
    const screenPos = camera.worldToScreen(worldX, worldY);
    const worldRadius = 18 + (i % 3) * 6;
    const radiusPx = Math.max(1.8, camera.worldLengthToScreen(worldRadius));
    const rot =
      animFrame * (0.02 + (i % 3) * 0.015) +
      i * 1.2 +
      Math.sin(animFrame * 0.04 + i);
    const color = leafPalette[i % leafPalette.length] ?? "#dc2626";
    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);
    ctx.rotate(rot);
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
    ctx.restore();
  }
  ctx.restore();
}

export function drawStageSakuraTrees(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  stageId: number | undefined,
  frameIndex?: number,
  isLight = false,
): void {
  const platforms = stageGeometry(stageId);
  const ground = platforms?.find((p) => p.kind === "ground");
  const groundY = ground ? ground.y : 0;
  // Single grand, ancient flowering Japanese cherry tree close to middle of stage
  drawStageMatureSakuraTree(ctx, camera, -40, groundY, frameIndex, isLight);
}

export function drawStageMatureSakuraTree(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  rootWorldX: number,
  rootWorldY: number,
  frameIndex?: number,
  isLight = false,
): void {
  ctx.save();
  // 1. Broad ancient mossy stone shrine pedestal & spreading buttress roots base
  const baseWorld = { x: rootWorldX, y: rootWorldY };
  const baseScreen = camera.worldToScreen(baseWorld.x, baseWorld.y);
  const stoneRadiusPx = Math.max(5, camera.worldLengthToScreen(180));
  // Weathered ancient stone dais
  ctx.beginPath();
  ctx.ellipse(
    baseScreen.x,
    baseScreen.y,
    stoneRadiusPx,
    stoneRadiusPx * 0.32,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = isLight ? "#94a3b8" : "#1e1b4b";
  ctx.fill();
  // Moss patches (fresh alpine green in day, royal purple at night)
  ctx.beginPath();
  ctx.ellipse(
    baseScreen.x - stoneRadiusPx * 0.4,
    baseScreen.y,
    stoneRadiusPx * 0.45,
    stoneRadiusPx * 0.18,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = isLight ? "#16a34a" : "#3730a3";
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(
    baseScreen.x + stoneRadiusPx * 0.35,
    baseScreen.y,
    stoneRadiusPx * 0.5,
    stoneRadiusPx * 0.2,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = isLight ? "#22c55e" : "#4338ca";
  ctx.fill();
  // 2. Traditional Shinto Stone Lantern (Tōrō) nestled beside the ancient roots
  const lanternX = baseScreen.x + stoneRadiusPx * 0.75;
  const lanternY = baseScreen.y;
  const lW = Math.max(3, camera.worldLengthToScreen(36));
  const lH = Math.max(6, camera.worldLengthToScreen(75));
  // Lantern base & pillar
  ctx.fillStyle = isLight ? "#64748b" : "#312e81";
  ctx.fillRect(lanternX - lW * 0.25, lanternY - lH * 0.55, lW * 0.5, lH * 0.55);
  // Lantern firebox (soft stone interior in day, glowing cyan at night)
  ctx.fillStyle = isLight ? "#cbd5e1" : "#38bdf8";
  ctx.fillRect(lanternX - lW * 0.42, lanternY - lH * 0.85, lW * 0.84, lH * 0.3);
  ctx.fillStyle = isLight ? "#f1f5f9" : "#fdf4ff";
  ctx.fillRect(
    lanternX - lW * 0.22,
    lanternY - lH * 0.78,
    lW * 0.44,
    lH * 0.18,
  );
  // Lantern wide flared pagoda roof cap
  ctx.fillStyle = isLight ? "#475569" : "#1e1b4b";
  ctx.beginPath();
  ctx.moveTo(lanternX - lW * 0.75, lanternY - lH * 0.85);
  ctx.lineTo(lanternX + lW * 0.75, lanternY - lH * 0.85);
  ctx.lineTo(lanternX, lanternY - lH);
  ctx.closePath();
  ctx.fill();
  // 3. Thick, gnarled ancient trunk & buttress root flares
  const deepBarkColor = isLight ? "#573010" : "#1e1b4b";
  const innerBarkColor = isLight ? "#78350f" : "#312e81";
  const woodgrainHighlight = isLight ? "#b45309" : "#6366f1";

  const mainTrunkGirthPx = Math.max(6, camera.worldLengthToScreen(135));
  const boughWidthPx = Math.max(4, camera.worldLengthToScreen(75));
  const branchWidthPx = Math.max(2.5, camera.worldLengthToScreen(42));
  const trunkMidWorld = { x: rootWorldX - 30, y: rootWorldY + 700 };
  const forkWorld = { x: rootWorldX + 20, y: rootWorldY + 1100 };
  const trunkMidScreen = camera.worldToScreen(trunkMidWorld.x, trunkMidWorld.y);
  const forkScreen = camera.worldToScreen(forkWorld.x, forkWorld.y);
  // Buttress root flares spreading outwards into the soil
  const leftRootTip = camera.worldToScreen(rootWorldX - 160, rootWorldY);
  const rightRootTip = camera.worldToScreen(rootWorldX + 130, rootWorldY);
  ctx.strokeStyle = deepBarkColor;
  ctx.lineWidth = mainTrunkGirthPx * 0.65;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(leftRootTip.x, leftRootTip.y);
  ctx.quadraticCurveTo(
    baseScreen.x - stoneRadiusPx * 0.2,
    baseScreen.y - 15,
    trunkMidScreen.x,
    trunkMidScreen.y,
  );
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rightRootTip.x, rightRootTip.y);
  ctx.quadraticCurveTo(
    baseScreen.x + stoneRadiusPx * 0.2,
    baseScreen.y - 15,
    trunkMidScreen.x,
    trunkMidScreen.y,
  );
  ctx.stroke();
  // Main massive ancient trunk body
  ctx.strokeStyle = deepBarkColor; // Deepest bark crevice
  ctx.lineWidth = mainTrunkGirthPx;
  ctx.beginPath();
  ctx.moveTo(baseScreen.x, baseScreen.y);
  ctx.quadraticCurveTo(
    trunkMidScreen.x - 20,
    trunkMidScreen.y,
    forkScreen.x,
    forkScreen.y,
  );
  ctx.stroke();
  // Inner bark tone
  ctx.strokeStyle = innerBarkColor;
  ctx.lineWidth = mainTrunkGirthPx * 0.65;
  ctx.beginPath();
  ctx.moveTo(baseScreen.x, baseScreen.y);
  ctx.quadraticCurveTo(
    trunkMidScreen.x - 20,
    trunkMidScreen.y,
    forkScreen.x,
    forkScreen.y,
  );
  ctx.stroke();
  // Gnarled woodgrain ridge highlights (warm cedar in day, moonlit lilac at night)
  ctx.strokeStyle = woodgrainHighlight;
  ctx.lineWidth = mainTrunkGirthPx * 0.18;
  ctx.beginPath();
  ctx.moveTo(baseScreen.x - 4, baseScreen.y);
  ctx.quadraticCurveTo(
    trunkMidScreen.x - 22,
    trunkMidScreen.y,
    forkScreen.x - 3,
    forkScreen.y,
  );
  ctx.stroke();
  // 4. Massive Ancient Sprawling Boughs & Limbs
  // Left massive bough
  const leftBoughMid = camera.worldToScreen(
    rootWorldX - 340,
    rootWorldY + 1320,
  );
  const leftBoughTip = camera.worldToScreen(
    rootWorldX - 680,
    rootWorldY + 1520,
  );
  ctx.strokeStyle = deepBarkColor;
  ctx.lineWidth = boughWidthPx;
  ctx.beginPath();
  ctx.moveTo(forkScreen.x, forkScreen.y);
  ctx.quadraticCurveTo(
    leftBoughMid.x,
    leftBoughMid.y,
    leftBoughTip.x,
    leftBoughTip.y,
  );
  ctx.stroke();
  ctx.strokeStyle = innerBarkColor;
  ctx.lineWidth = boughWidthPx * 0.6;
  ctx.beginPath();
  ctx.moveTo(forkScreen.x, forkScreen.y);
  ctx.quadraticCurveTo(
    leftBoughMid.x,
    leftBoughMid.y,
    leftBoughTip.x,
    leftBoughTip.y,
  );
  ctx.stroke();
  // Left sub-branch
  const leftSubTip = camera.worldToScreen(rootWorldX - 920, rootWorldY + 1620);
  ctx.strokeStyle = deepBarkColor;
  ctx.lineWidth = branchWidthPx;
  ctx.beginPath();
  ctx.moveTo(leftBoughTip.x, leftBoughTip.y);
  ctx.quadraticCurveTo(
    leftBoughTip.x - 20,
    leftBoughTip.y - 10,
    leftSubTip.x,
    leftSubTip.y,
  );
  ctx.stroke();
  // Right massive bough
  const rightBoughMid = camera.worldToScreen(
    rootWorldX + 320,
    rootWorldY + 1280,
  );
  const rightBoughTip = camera.worldToScreen(
    rootWorldX + 660,
    rootWorldY + 1480,
  );
  ctx.strokeStyle = deepBarkColor;
  ctx.lineWidth = boughWidthPx;
  ctx.beginPath();
  ctx.moveTo(forkScreen.x, forkScreen.y);
  ctx.quadraticCurveTo(
    rightBoughMid.x,
    rightBoughMid.y,
    rightBoughTip.x,
    rightBoughTip.y,
  );
  ctx.stroke();
  ctx.strokeStyle = innerBarkColor;
  ctx.lineWidth = boughWidthPx * 0.6;
  ctx.beginPath();
  ctx.moveTo(forkScreen.x, forkScreen.y);
  ctx.quadraticCurveTo(
    rightBoughMid.x,
    rightBoughMid.y,
    rightBoughTip.x,
    rightBoughTip.y,
  );
  ctx.stroke();
  // Right sub-branch
  const rightSubTip = camera.worldToScreen(rootWorldX + 900, rootWorldY + 1580);
  ctx.strokeStyle = deepBarkColor;
  ctx.lineWidth = branchWidthPx;
  ctx.beginPath();
  ctx.moveTo(rightBoughTip.x, rightBoughTip.y);
  ctx.quadraticCurveTo(
    rightBoughTip.x + 20,
    rightBoughTip.y - 10,
    rightSubTip.x,
    rightSubTip.y,
  );
  ctx.stroke();
  // Central crown upright bough
  const centerBoughTip = camera.worldToScreen(
    rootWorldX + 20,
    rootWorldY + 1750,
  );
  ctx.strokeStyle = deepBarkColor;
  ctx.lineWidth = boughWidthPx * 0.85;
  ctx.beginPath();
  ctx.moveTo(forkScreen.x, forkScreen.y);
  ctx.quadraticCurveTo(
    forkScreen.x - 10,
    forkScreen.y - 50,
    centerBoughTip.x,
    centerBoughTip.y,
  );
  ctx.stroke();
  ctx.strokeStyle = innerBarkColor;
  ctx.lineWidth = boughWidthPx * 0.5;
  ctx.beginPath();
  ctx.moveTo(forkScreen.x, forkScreen.y);
  ctx.quadraticCurveTo(
    forkScreen.x - 10,
    forkScreen.y - 50,
    centerBoughTip.x,
    centerBoughTip.y,
  );
  ctx.stroke();
  // 5. Grand Multi-tiered Flowering Sakura Canopy Clouds
  interface SakuraBlossomCluster {
    worldX: number;
    worldY: number;
    radiusWorld: number;
    color: string;
  }
  const plumBacking = isLight ? "#9d174d" : "#4a044e";
  const deepShadow = isLight ? "#be185d" : "#581c87";
  const richMagenta = isLight ? "#be185d" : "#831843";
  const deepRose = isLight ? "#db2777" : "#9d174d";
  const blossomHighlight = isLight ? "#fdf2f8" : "#fbcfe8";

  const blossomClusters: SakuraBlossomCluster[] = [
    // Base shadow / deep plum blossom backing
    {
      worldX: rootWorldX - 680,
      worldY: rootWorldY + 1460,
      radiusWorld: 420,
      color: plumBacking,
    },
    {
      worldX: rootWorldX + 650,
      worldY: rootWorldY + 1430,
      radiusWorld: 420,
      color: plumBacking,
    },
    {
      worldX: rootWorldX + 20,
      worldY: rootWorldY + 1680,
      radiusWorld: 480,
      color: plumBacking,
    },
    {
      worldX: rootWorldX - 320,
      worldY: rootWorldY + 1620,
      radiusWorld: 440,
      color: deepShadow,
    },
    {
      worldX: rootWorldX + 340,
      worldY: rootWorldY + 1580,
      radiusWorld: 440,
      color: deepShadow,
    },
    // Rich Deep Magenta & Sakura Rose Tier
    {
      worldX: rootWorldX - 750,
      worldY: rootWorldY + 1540,
      radiusWorld: 380,
      color: richMagenta,
    },
    {
      worldX: rootWorldX - 480,
      worldY: rootWorldY + 1480,
      radiusWorld: 390,
      color: deepRose,
    },
    {
      worldX: rootWorldX + 460,
      worldY: rootWorldY + 1450,
      radiusWorld: 390,
      color: deepRose,
    },
    {
      worldX: rootWorldX + 730,
      worldY: rootWorldY + 1520,
      radiusWorld: 380,
      color: richMagenta,
    },
    {
      worldX: rootWorldX - 160,
      worldY: rootWorldY + 1750,
      radiusWorld: 420,
      color: isLight ? "#f472b6" : "#db2777",
    },
    {
      worldX: rootWorldX + 180,
      worldY: rootWorldY + 1720,
      radiusWorld: 420,
      color: isLight ? "#f472b6" : "#db2777",
    },
    {
      worldX: rootWorldX + 10,
      worldY: rootWorldY + 1880,
      radiusWorld: 430,
      color: isLight ? "#fbcfe8" : "#ec4899",
    },
    // Mid-layer Luminous Cherry Pink
    {
      worldX: rootWorldX - 840,
      worldY: rootWorldY + 1600,
      radiusWorld: 320,
      color: isLight ? "#fbcfe8" : "#f472b6",
    },
    {
      worldX: rootWorldX - 580,
      worldY: rootWorldY + 1620,
      radiusWorld: 340,
      color: isLight ? "#fbcfe8" : "#f472b6",
    },
    {
      worldX: rootWorldX - 280,
      worldY: rootWorldY + 1790,
      radiusWorld: 360,
      color: isLight ? "#fbcfe8" : "#f472b6",
    },
    {
      worldX: rootWorldX + 280,
      worldY: rootWorldY + 1760,
      radiusWorld: 360,
      color: isLight ? "#fbcfe8" : "#f472b6",
    },
    {
      worldX: rootWorldX + 590,
      worldY: rootWorldY + 1590,
      radiusWorld: 340,
      color: isLight ? "#fbcfe8" : "#f472b6",
    },
    {
      worldX: rootWorldX + 820,
      worldY: rootWorldY + 1570,
      radiusWorld: 310,
      color: isLight ? "#fbcfe8" : "#f472b6",
    },
    {
      worldX: rootWorldX - 30,
      worldY: rootWorldY + 1950,
      radiusWorld: 380,
      color: isLight ? "#fbcfe8" : "#f472b6",
    },
    // Foreground Pale Cherry Blossom Highlights
    {
      worldX: rootWorldX - 780,
      worldY: rootWorldY + 1660,
      radiusWorld: 260,
      color: blossomHighlight,
    },
    {
      worldX: rootWorldX - 440,
      worldY: rootWorldY + 1690,
      radiusWorld: 290,
      color: blossomHighlight,
    },
    {
      worldX: rootWorldX - 120,
      worldY: rootWorldY + 1880,
      radiusWorld: 320,
      color: blossomHighlight,
    },
    {
      worldX: rootWorldX + 130,
      worldY: rootWorldY + 1850,
      radiusWorld: 320,
      color: blossomHighlight,
    },
    {
      worldX: rootWorldX + 450,
      worldY: rootWorldY + 1670,
      radiusWorld: 290,
      color: blossomHighlight,
    },
    {
      worldX: rootWorldX + 760,
      worldY: rootWorldY + 1640,
      radiusWorld: 260,
      color: blossomHighlight,
    },
    {
      worldX: rootWorldX - 220,
      worldY: rootWorldY + 2020,
      radiusWorld: 280,
      color: blossomHighlight,
    },
    {
      worldX: rootWorldX + 160,
      worldY: rootWorldY + 1990,
      radiusWorld: 280,
      color: blossomHighlight,
    },
    {
      worldX: rootWorldX + 0,
      worldY: rootWorldY + 2040,
      radiusWorld: 300,
      color: "#fbcfe8",
    },
    // Moonlight Frosted Bloom Crowns
    {
      worldX: rootWorldX - 620,
      worldY: rootWorldY + 1720,
      radiusWorld: 210,
      color: "#fdf4ff",
    },
    {
      worldX: rootWorldX - 220,
      worldY: rootWorldY + 1940,
      radiusWorld: 240,
      color: "#fdf4ff",
    },
    {
      worldX: rootWorldX + 220,
      worldY: rootWorldY + 1910,
      radiusWorld: 240,
      color: "#fdf4ff",
    },
    {
      worldX: rootWorldX + 600,
      worldY: rootWorldY + 1690,
      radiusWorld: 210,
      color: "#fdf4ff",
    },
    {
      worldX: rootWorldX + 10,
      worldY: rootWorldY + 2100,
      radiusWorld: 230,
      color: "#fdf4ff",
    },
  ];
  for (const b of blossomClusters) {
    const pos = camera.worldToScreen(b.worldX, b.worldY);
    const rPx = Math.max(2.5, camera.worldLengthToScreen(b.radiusWorld));
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, rPx, 0, Math.PI * 2);
    ctx.fill();
  }
  // 6. Fluttering Falling Sakura Petals drifting gently across the arena
  const anim =
    frameIndex ??
    (typeof performance !== "undefined"
      ? Math.floor(performance.now() / 16.67)
      : 0);
  const petals: Array<{
    baseOffX: number;
    baseOffY: number;
    color: string;
    size: number;
  }> = [
    { baseOffX: -450, baseOffY: 1380, color: "#fbcfe8", size: 4.5 },
    { baseOffX: -260, baseOffY: 920, color: "#fdf4ff", size: 3.8 },
    { baseOffX: -80, baseOffY: 650, color: "#f472b6", size: 4.2 },
    { baseOffX: 160, baseOffY: 820, color: "#fbcfe8", size: 4.0 },
    { baseOffX: 380, baseOffY: 1250, color: "#fdf4ff", size: 3.8 },
    { baseOffX: 580, baseOffY: 960, color: "#f472b6", size: 4.5 },
    { baseOffX: -620, baseOffY: 580, color: "#fbcfe8", size: 3.5 },
    { baseOffX: 280, baseOffY: 420, color: "#fdf4ff", size: 4.0 },
  ];
  for (let pi = 0; pi < petals.length; pi++) {
    const p = petals[pi];
    if (!p) continue;
    const speed = 1.3 + (pi % 3) * 0.35;
    const restDistance = 350;
    const totalCycle = p.baseOffY + restDistance;
    const progress = (anim * speed + pi * 211) % totalCycle;
    const isGrounded = progress >= p.baseOffY;
    let worldX: number;
    let worldY: number;
    let angle: number;
    let radiusXMultiplier: number;
    let radiusYMultiplier: number;
    let alpha: number;
    if (!isGrounded) {
      // Falling through the air
      const fallFraction = progress / p.baseOffY;
      const sway =
        Math.sin(anim * 0.035 + pi * 1.5) * 45 * (1 - fallFraction * 0.25);
      worldX = rootWorldX + p.baseOffX + sway;
      worldY = rootWorldY + (p.baseOffY - progress);
      angle = 0.3 + Math.sin(anim * 0.05 + pi) * 0.4;
      radiusXMultiplier = 1.0;
      radiusYMultiplier = 0.45 + 0.2 * Math.abs(Math.sin(anim * 0.08 + pi));
      // Fade in as it detaches from the canopy
      alpha = Math.min(1, progress / 50);
    } else {
      // Stopped and resting peacefully on the stage surface
      const landingAnim = anim - (progress - p.baseOffY) / speed;
      const landingSway = Math.sin(landingAnim * 0.035 + pi * 1.5) * 45 * 0.75;
      worldX = rootWorldX + p.baseOffX + landingSway;
      worldY = rootWorldY + 10;
      // Flat resting orientation on the stage floor
      angle = 0.05 * Math.sin(pi * 1.7);
      radiusXMultiplier = 1.1;
      radiusYMultiplier = 0.35;
      // Fade out at the end of the rest duration
      const remainingRest = totalCycle - progress;
      alpha = Math.min(1, remainingRest / 70);
    }
    if (alpha <= 0.01) continue;
    const petalPos = camera.worldToScreen(worldX, worldY);
    const s = Math.max(1.8, camera.worldLengthToScreen(p.size * 5));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(
      petalPos.x,
      petalPos.y,
      s * radiusXMultiplier,
      s * radiusYMultiplier,
      angle,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

export function drawStageAutumnTrees(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  stageId: number | undefined,
  isLight = false,
): void {
  const platforms = stageGeometry(stageId);
  const ground = platforms?.find((p) => p.kind === "ground");
  const groundLeftX = ground ? ground.leftX : -2318;
  const groundRightX = ground ? ground.rightX : 2318;
  const groundY = ground ? ground.y : 0;
  // Left Japanese maple tree & stone lantern
  drawStageAutumnTree(ctx, camera, groundLeftX + 280, groundY, -1, isLight);
  // Right Japanese maple tree & stone lantern
  drawStageAutumnTree(ctx, camera, groundRightX - 280, groundY, 1, isLight);
}

export function drawStageAutumnTree(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  rootWorldX: number,
  rootWorldY: number,
  curveDirection: 1 | -1,
  isLight = false,
): void {
  const dir = curveDirection;
  const baseWorld = { x: rootWorldX, y: rootWorldY };
  const ctrlWorld = {
    x: rootWorldX + dir * 160,
    y: rootWorldY + 600,
  };
  const headWorld = {
    x: rootWorldX + dir * 100,
    y: rootWorldY + 1200,
  };
  const baseScreen = camera.worldToScreen(baseWorld.x, baseWorld.y);
  const ctrlScreen = camera.worldToScreen(ctrlWorld.x, ctrlWorld.y);
  const headScreen = camera.worldToScreen(headWorld.x, headWorld.y);
  const trunkWidthPx = Math.max(2, camera.worldLengthToScreen(50));
  const innerWidthPx = Math.max(1, trunkWidthPx * 0.5);
  ctx.save();
  // 1. Mossy Stone Pedestal & Shinto Stone Lantern (Tōrō) next to the tree
  const stoneRadiusPx = Math.max(3, camera.worldLengthToScreen(65));
  ctx.beginPath();
  ctx.ellipse(
    baseScreen.x,
    baseScreen.y,
    stoneRadiusPx,
    stoneRadiusPx * 0.35,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = isLight ? "#78716c" : "#3f3f46"; // Weathered stone base
  ctx.fill();
  // Moss accent
  ctx.beginPath();
  ctx.ellipse(
    baseScreen.x + dir * stoneRadiusPx * 0.3,
    baseScreen.y,
    stoneRadiusPx * 0.5,
    stoneRadiusPx * 0.2,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = isLight ? "#16a34a" : "#15803d"; // Lush green moss
  ctx.fill();
  // Small Traditional Stone Lantern (Tōrō) on stage
  const lanternX = baseScreen.x - dir * stoneRadiusPx * 0.7;
  const lanternY = baseScreen.y;
  const lW = Math.max(2, camera.worldLengthToScreen(26));
  const lH = Math.max(4, camera.worldLengthToScreen(55));
  // Lantern base & pillar
  ctx.fillStyle = isLight ? "#78716c" : "#52525b";
  ctx.fillRect(lanternX - lW * 0.2, lanternY - lH * 0.6, lW * 0.4, lH * 0.6);
  // Lantern light box with warm glowing amber
  ctx.fillStyle = isLight ? "#fde68a" : "#f59e0b";
  ctx.fillRect(lanternX - lW * 0.35, lanternY - lH * 0.85, lW * 0.7, lH * 0.25);
  ctx.fillStyle = isLight ? "#fef9c3" : "#fef08a";
  ctx.fillRect(lanternX - lW * 0.2, lanternY - lH * 0.8, lW * 0.4, lH * 0.15);
  // Lantern curved roof cap
  ctx.fillStyle = isLight ? "#44403c" : "#27272a";
  ctx.beginPath();
  ctx.moveTo(lanternX - lW * 0.6, lanternY - lH * 0.85);
  ctx.lineTo(lanternX + lW * 0.6, lanternY - lH * 0.85);
  ctx.lineTo(lanternX, lanternY - lH);
  ctx.closePath();
  ctx.fill();
  // 2. Trunk main woody bark (warm chestnut in day, dark charcoal at night)
  ctx.strokeStyle = isLight ? "#78350f" : "#292524";
  ctx.lineWidth = trunkWidthPx;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(baseScreen.x, baseScreen.y);
  ctx.quadraticCurveTo(ctrlScreen.x, ctrlScreen.y, headScreen.x, headScreen.y);
  ctx.stroke();
  // 3. Trunk bark highlight
  ctx.strokeStyle = isLight ? "#b45309" : "#44403c";
  ctx.lineWidth = innerWidthPx;
  ctx.beginPath();
  ctx.moveTo(baseScreen.x + dir * 1.5, baseScreen.y);
  ctx.quadraticCurveTo(
    ctrlScreen.x + dir * 1.5,
    ctrlScreen.y,
    headScreen.x + dir * 1,
    headScreen.y,
  );
  ctx.stroke();
  // 4. Secondary gnarled branch
  const branchCtrl = camera.worldToScreen(
    rootWorldX + dir * 80,
    rootWorldY + 850,
  );
  const branchTip = camera.worldToScreen(
    rootWorldX - dir * 280,
    rootWorldY + 1050,
  );
  ctx.strokeStyle = isLight ? "#78350f" : "#292524";
  ctx.lineWidth = Math.max(1.5, trunkWidthPx * 0.6);
  ctx.beginPath();
  ctx.moveTo(
    camera.worldToScreen(rootWorldX + dir * 120, rootWorldY + 700).x,
    camera.worldToScreen(rootWorldX + dir * 120, rootWorldY + 700).y,
  );
  ctx.quadraticCurveTo(branchCtrl.x, branchCtrl.y, branchTip.x, branchTip.y);
  ctx.stroke();
  // 5. Multi-tiered Crimson & Golden Autumn Canopy Clusters
  interface StageCanopyCluster {
    offsetX: number;
    offsetY: number;
    radiusWorld: number;
    color: string;
  }
  const clusters: StageCanopyCluster[] = [
    // Main Crown
    {
      offsetX: dir * 100,
      offsetY: 0,
      radiusWorld: 340,
      color: isLight ? "#dc2626" : "#7f1d1d",
    },
    {
      offsetX: dir * 220,
      offsetY: 80,
      radiusWorld: 280,
      color: isLight ? "#ea580c" : "#991b1b",
    },
    {
      offsetX: dir * 40,
      offsetY: 120,
      radiusWorld: 290,
      color: isLight ? "#f59e0b" : "#dc2626",
    },
    {
      offsetX: -dir * 120,
      offsetY: 40,
      radiusWorld: 260,
      color: isLight ? "#ea580c" : "#b91c1c",
    },
    {
      offsetX: dir * 150,
      offsetY: 180,
      radiusWorld: 240,
      color: isLight ? "#f59e0b" : "#ea580c",
    },
    {
      offsetX: dir * 60,
      offsetY: 220,
      radiusWorld: 210,
      color: isLight ? "#facc15" : "#f59e0b",
    },
    // Secondary branch crown
    {
      offsetX: -dir * 280,
      offsetY: -120,
      radiusWorld: 260,
      color: isLight ? "#ea580c" : "#991b1b",
    },
    {
      offsetX: -dir * 320,
      offsetY: -80,
      radiusWorld: 220,
      color: isLight ? "#f59e0b" : "#dc2626",
    },
    {
      offsetX: -dir * 240,
      offsetY: -40,
      radiusWorld: 190,
      color: isLight ? "#facc15" : "#f59e0b",
    },
  ];
  for (const cl of clusters) {
    const clWorld = {
      x: headWorld.x + cl.offsetX,
      y: headWorld.y + cl.offsetY,
    };
    const clScreen = camera.worldToScreen(clWorld.x, clWorld.y);
    const clRadiusPx = Math.max(2, camera.worldLengthToScreen(cl.radiusWorld));
    ctx.fillStyle = cl.color;
    ctx.beginPath();
    ctx.arc(clScreen.x, clScreen.y, clRadiusPx, 0, Math.PI * 2);
    ctx.fill();
  }
  // 6. Fluttering Fallen Autumn Leaves near the tree base
  const fallingLeaves: Array<{
    offX: number;
    offY: number;
    color: string;
    size: number;
  }> = [
    { offX: dir * 120, offY: 180, color: "#dc2626", size: 4 },
    { offX: dir * 220, offY: 120, color: "#ea580c", size: 3.5 },
    { offX: -dir * 80, offY: 80, color: "#f59e0b", size: 4 },
  ];
  for (const fl of fallingLeaves) {
    const flPos = camera.worldToScreen(
      rootWorldX + fl.offX,
      rootWorldY + fl.offY,
    );
    const s = Math.max(1.5, camera.worldLengthToScreen(fl.size * 6));
    ctx.fillStyle = fl.color;
    ctx.beginPath();
    ctx.ellipse(flPos.x, flPos.y, s, s * 0.5, 0.5 * dir, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawStagePalmTrees(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  stageId: number | undefined,
): void {
  const platforms = stageGeometry(stageId);
  const ground = platforms?.find((p) => p.kind === "ground");
  const groundLeftX = ground ? ground.leftX : -2318;
  const groundRightX = ground ? ground.rightX : 2318;
  const groundY = ground ? ground.y : 0;
  // 1. Left and right pineapple palm trees rooted near stage edges
  drawStagePalmTree(ctx, camera, groundLeftX + 280, groundY, -1);
  drawStagePalmTree(ctx, camera, groundRightX - 280, groundY, 1);
  // 2. Stage floor pineapples and living pineapple plants
  // Left side: flourishing pineapple plant and resting harvested pineapple
  drawStagePineapplePlant(ctx, camera, groundLeftX + 460, groundY, 1.0);
  drawPineapple(ctx, camera, groundLeftX + 600, groundY, 66, 102, 0.36);
  // Right side: harvested pineapples and flourishing pineapple plant
  drawPineapple(ctx, camera, groundRightX - 600, groundY, 64, 98, -0.34);
  drawStagePineapplePlant(ctx, camera, groundRightX - 450, groundY, 0.95);
  drawPineapple(ctx, camera, groundRightX - 350, groundY, 50, 76, 0.22);
}

export function drawStagePalmTree(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  rootWorldX: number,
  rootWorldY: number,
  curveDirection: 1 | -1,
): void {
  const dir = curveDirection;
  const baseWorld = { x: rootWorldX, y: rootWorldY };
  const ctrlWorld = {
    x: rootWorldX + dir * 180,
    y: rootWorldY + 650,
  };
  const headWorld = {
    x: rootWorldX + dir * 120,
    y: rootWorldY + 1300,
  };
  const baseScreen = camera.worldToScreen(baseWorld.x, baseWorld.y);
  const ctrlScreen = camera.worldToScreen(ctrlWorld.x, ctrlWorld.y);
  const headScreen = camera.worldToScreen(headWorld.x, headWorld.y);
  const trunkWidthPx = Math.max(2, camera.worldLengthToScreen(55));
  const innerWidthPx = Math.max(1, trunkWidthPx * 0.55);
  ctx.save();
  // 1. Root base mound (small tropical sand footing on stage)
  const moundRadiusPx = Math.max(3, camera.worldLengthToScreen(60));
  ctx.beginPath();
  ctx.ellipse(
    baseScreen.x,
    baseScreen.y,
    moundRadiusPx,
    moundRadiusPx * 0.4,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#f59e0b"; // Warm golden sand footing
  ctx.fill();
  // 2. Trunk main dark bark
  ctx.strokeStyle = "#451a03";
  ctx.lineWidth = trunkWidthPx;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(baseScreen.x, baseScreen.y);
  ctx.quadraticCurveTo(ctrlScreen.x, ctrlScreen.y, headScreen.x, headScreen.y);
  ctx.stroke();
  // 3. Trunk warm inner bark highlight / ring texture
  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = innerWidthPx;
  ctx.beginPath();
  ctx.moveTo(baseScreen.x + dir * 1.5, baseScreen.y);
  ctx.quadraticCurveTo(
    ctrlScreen.x + dir * 1.5,
    ctrlScreen.y,
    headScreen.x + dir * 1,
    headScreen.y,
  );
  ctx.stroke();
  // 3b. Trunk pineapple-bark scale rings
  ctx.strokeStyle = "#b45309";
  ctx.lineWidth = Math.max(1, trunkWidthPx * 0.15);
  const ringTValues = [0.15, 0.28, 0.42, 0.56, 0.7, 0.84];
  for (const t of ringTValues) {
    const invT = 1 - t;
    const rx =
      invT * invT * baseScreen.x +
      2 * invT * t * ctrlScreen.x +
      t * t * headScreen.x;
    const ry =
      invT * invT * baseScreen.y +
      2 * invT * t * ctrlScreen.y +
      t * t * headScreen.y;
    const rWidth = trunkWidthPx * 0.45;
    ctx.beginPath();
    ctx.moveTo(rx - rWidth, ry);
    ctx.lineTo(rx + rWidth, ry);
    ctx.stroke();
  }
  // 4. Coconut & Pineapple cluster under the crown
  const coconutRadiusPx = Math.max(1.5, camera.worldLengthToScreen(24));
  ctx.fillStyle = "#78350f";
  ctx.beginPath();
  ctx.arc(
    headScreen.x - dir * coconutRadiusPx * 0.7,
    headScreen.y + coconutRadiusPx * 0.8,
    coconutRadiusPx,
    0,
    Math.PI * 2,
  );
  ctx.arc(
    headScreen.x + dir * coconutRadiusPx * 0.7,
    headScreen.y + coconutRadiusPx * 0.9,
    coconutRadiusPx * 0.9,
    0,
    Math.PI * 2,
  );
  ctx.arc(
    headScreen.x,
    headScreen.y + coconutRadiusPx * 1.3,
    coconutRadiusPx * 0.85,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  // Ripe pineapples nestled in the pineapple tree crown
  drawPineapple(
    ctx,
    camera,
    headWorld.x - dir * 85,
    headWorld.y - 70,
    50,
    76,
    -dir * 0.28,
  );
  drawPineapple(
    ctx,
    camera,
    headWorld.x + dir * 75,
    headWorld.y - 80,
    46,
    70,
    dir * 0.32,
  );
  drawPineapple(ctx, camera, headWorld.x, headWorld.y - 30, 56, 86, 0);
  // 5. Crown Palm Fronds (in world offsets from headWorld)
  interface StageFrondSpec {
    tipOffsetX: number;
    tipOffsetY: number;
    ctrlOffsetX: number;
    ctrlOffsetY: number;
    color: string;
    widthWorld: number;
  }
  const frondSpecs: StageFrondSpec[] = [
    // Outward sweeping fronds
    {
      tipOffsetX: dir * 550,
      tipOffsetY: -120,
      ctrlOffsetX: dir * 320,
      ctrlOffsetY: 280,
      color: "#064e3b",
      widthWorld: 65,
    },
    {
      tipOffsetX: dir * 620,
      tipOffsetY: 100,
      ctrlOffsetX: dir * 380,
      ctrlOffsetY: 400,
      color: "#047857",
      widthWorld: 60,
    },
    {
      tipOffsetX: dir * 480,
      tipOffsetY: -350,
      ctrlOffsetX: dir * 280,
      ctrlOffsetY: 80,
      color: "#065f46",
      widthWorld: 55,
    },
    // Upward arching fronds
    {
      tipOffsetX: dir * 220,
      tipOffsetY: 520,
      ctrlOffsetX: dir * 120,
      ctrlOffsetY: 580,
      color: "#059669",
      widthWorld: 55,
    },
    {
      tipOffsetX: -dir * 180,
      tipOffsetY: 500,
      ctrlOffsetX: -dir * 80,
      ctrlOffsetY: 560,
      color: "#10b981",
      widthWorld: 50,
    },
    // Inward / stage-facing fronds
    {
      tipOffsetX: -dir * 480,
      tipOffsetY: 120,
      ctrlOffsetX: -dir * 280,
      ctrlOffsetY: 350,
      color: "#059669",
      widthWorld: 58,
    },
    {
      tipOffsetX: -dir * 420,
      tipOffsetY: -200,
      ctrlOffsetX: -dir * 240,
      ctrlOffsetY: 150,
      color: "#047857",
      widthWorld: 52,
    },
  ];
  for (const fr of frondSpecs) {
    const tipWorld = {
      x: headWorld.x + fr.tipOffsetX,
      y: headWorld.y + fr.tipOffsetY,
    };
    const ctrlWorldFr = {
      x: headWorld.x + fr.ctrlOffsetX,
      y: headWorld.y + fr.ctrlOffsetY,
    };
    const tipScreen = camera.worldToScreen(tipWorld.x, tipWorld.y);
    const ctrlScreenFr = camera.worldToScreen(ctrlWorldFr.x, ctrlWorldFr.y);
    const frondWidthPx = Math.max(1, camera.worldLengthToScreen(fr.widthWorld));
    // Leafy frond stroke
    ctx.strokeStyle = fr.color;
    ctx.lineWidth = frondWidthPx;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(headScreen.x, headScreen.y);
    ctx.quadraticCurveTo(
      ctrlScreenFr.x,
      ctrlScreenFr.y,
      tipScreen.x,
      tipScreen.y,
    );
    ctx.stroke();
    // Bright leaf spine highlight
    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = Math.max(1, frondWidthPx * 0.14);
    ctx.beginPath();
    ctx.moveTo(headScreen.x, headScreen.y);
    ctx.quadraticCurveTo(
      ctrlScreenFr.x,
      ctrlScreenFr.y,
      tipScreen.x,
      tipScreen.y,
    );
    ctx.stroke();
  }
  ctx.restore();
}
/**
 * Draws a stylized pineapple fruit with golden amber diamond scales,
 * brown bract eyes, and a spiky tropical crown of green leaves.
 */
export function drawPineapple(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  worldX: number,
  worldY: number,
  widthWorld: number,
  heightWorld: number,
  tiltAngle: number = 0,
): void {
  const baseScreen = camera.worldToScreen(worldX, worldY);
  const wPx = Math.max(3, camera.worldLengthToScreen(widthWorld));
  const hPx = Math.max(4, camera.worldLengthToScreen(heightWorld));
  const halfW = wPx / 2;
  const halfH = hPx / 2;
  const cos = Math.cos(tiltAngle);
  const sin = Math.sin(tiltAngle);
  const toScreen = (lx: number, ly: number) => ({
    x: baseScreen.x + lx * cos - ly * sin,
    y: baseScreen.y + lx * sin + ly * cos,
  });
  ctx.save();
  // Small woody stem nub at the base
  ctx.fillStyle = "#451a03";
  ctx.beginPath();
  const stemP0 = toScreen(-halfW * 0.2, 0);
  const stemP1 = toScreen(halfW * 0.2, 0);
  const stemP2 = toScreen(halfW * 0.15, halfH * 0.12);
  const stemP3 = toScreen(-halfW * 0.15, halfH * 0.12);
  ctx.moveTo(stemP0.x, stemP0.y);
  ctx.lineTo(stemP1.x, stemP1.y);
  ctx.lineTo(stemP2.x, stemP2.y);
  ctx.lineTo(stemP3.x, stemP3.y);
  ctx.closePath();
  ctx.fill();
  // 1. Spiky Tropical Crown Leaves (drawn at the top of the fruit body at ly = -hPx)
  const crownBase = -hPx + halfH * 0.08;
  const crownH = hPx * 0.75;
  const crownW = wPx * 0.85;
  // Outer / back dark fronds
  ctx.fillStyle = "#14532d";
  const outerLeafSpans = [
    {
      tipLx: -crownW * 0.55,
      tipLy: crownBase - crownH * 0.65,
      ctrlLx: -crownW * 0.35,
      ctrlLy: crownBase - crownH * 0.2,
    },
    {
      tipLx: crownW * 0.55,
      tipLy: crownBase - crownH * 0.65,
      ctrlLx: crownW * 0.35,
      ctrlLy: crownBase - crownH * 0.2,
    },
    {
      tipLx: -crownW * 0.75,
      tipLy: crownBase - crownH * 0.4,
      ctrlLx: -crownW * 0.5,
      ctrlLy: crownBase - crownH * 0.1,
    },
    {
      tipLx: crownW * 0.75,
      tipLy: crownBase - crownH * 0.4,
      ctrlLx: crownW * 0.5,
      ctrlLy: crownBase - crownH * 0.1,
    },
  ];
  for (const leaf of outerLeafSpans) {
    const pBaseL = toScreen(-halfW * 0.18, crownBase);
    const pBaseR = toScreen(halfW * 0.18, crownBase);
    const pCtrlL = toScreen(leaf.ctrlLx - halfW * 0.08, leaf.ctrlLy);
    const pCtrlR = toScreen(leaf.ctrlLx + halfW * 0.08, leaf.ctrlLy);
    const pTip = toScreen(leaf.tipLx, leaf.tipLy);
    ctx.beginPath();
    ctx.moveTo(pBaseL.x, pBaseL.y);
    ctx.quadraticCurveTo(pCtrlL.x, pCtrlL.y, pTip.x, pTip.y);
    ctx.quadraticCurveTo(pCtrlR.x, pCtrlR.y, pBaseR.x, pBaseR.y);
    ctx.closePath();
    ctx.fill();
  }
  // Inner / front vibrant fronds
  ctx.fillStyle = "#16a34a";
  const innerLeafSpans = [
    {
      tipLx: 0,
      tipLy: crownBase - crownH,
      ctrlLx: 0,
      ctrlLy: crownBase - crownH * 0.4,
    },
    {
      tipLx: -crownW * 0.3,
      tipLy: crownBase - crownH * 0.85,
      ctrlLx: -crownW * 0.18,
      ctrlLy: crownBase - crownH * 0.35,
    },
    {
      tipLx: crownW * 0.3,
      tipLy: crownBase - crownH * 0.85,
      ctrlLx: crownW * 0.18,
      ctrlLy: crownBase - crownH * 0.35,
    },
    {
      tipLx: -crownW * 0.15,
      tipLy: crownBase - crownH * 0.7,
      ctrlLx: -crownW * 0.1,
      ctrlLy: crownBase - crownH * 0.3,
    },
    {
      tipLx: crownW * 0.15,
      tipLy: crownBase - crownH * 0.7,
      ctrlLx: crownW * 0.1,
      ctrlLy: crownBase - crownH * 0.3,
    },
  ];
  for (const leaf of innerLeafSpans) {
    const pBaseL = toScreen(-halfW * 0.22, crownBase);
    const pBaseR = toScreen(halfW * 0.22, crownBase);
    const pCtrlL = toScreen(leaf.ctrlLx - halfW * 0.08, leaf.ctrlLy);
    const pCtrlR = toScreen(leaf.ctrlLx + halfW * 0.08, leaf.ctrlLy);
    const pTip = toScreen(leaf.tipLx, leaf.tipLy);
    ctx.beginPath();
    ctx.moveTo(pBaseL.x, pBaseL.y);
    ctx.quadraticCurveTo(pCtrlL.x, pCtrlL.y, pTip.x, pTip.y);
    ctx.quadraticCurveTo(pCtrlR.x, pCtrlR.y, pBaseR.x, pBaseR.y);
    ctx.closePath();
    ctx.fill();
  }
  // Crown leaf spine highlights
  ctx.strokeStyle = "#86efac";
  ctx.lineWidth = Math.max(1, wPx * 0.035);
  ctx.beginPath();
  const spineBase = toScreen(0, crownBase);
  const spineTip = toScreen(0, crownBase - crownH * 0.92);
  ctx.moveTo(spineBase.x, spineBase.y);
  ctx.lineTo(spineTip.x, spineTip.y);
  const spineTipL = toScreen(-crownW * 0.28, crownBase - crownH * 0.8);
  ctx.moveTo(spineBase.x, spineBase.y);
  ctx.lineTo(spineTipL.x, spineTipL.y);
  const spineTipR = toScreen(crownW * 0.28, crownBase - crownH * 0.8);
  ctx.moveTo(spineBase.x, spineBase.y);
  ctx.lineTo(spineTipR.x, spineTipR.y);
  ctx.stroke();
  // 2. Main Pineapple Body
  const bodySteps = 16;
  ctx.beginPath();
  for (let i = 0; i <= bodySteps; i++) {
    const theta = (i / bodySteps) * Math.PI * 2;
    const lx = halfW * Math.cos(theta);
    const ly = -halfH + halfH * Math.sin(theta);
    const pt = toScreen(lx, ly);
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  }
  ctx.closePath();
  const topPt = toScreen(0, -hPx);
  const btmPt = toScreen(0, 0);
  const grad = ctx.createLinearGradient(topPt.x, topPt.y, btmPt.x, btmPt.y);
  grad.addColorStop(0.0, "#fbbf24"); // Sunlit golden yellow top
  grad.addColorStop(0.35, "#f59e0b"); // Warm amber
  grad.addColorStop(0.7, "#d97706"); // Ripe orange amber
  grad.addColorStop(1.0, "#b45309"); // Deep golden brown base
  ctx.fillStyle = grad;
  ctx.fill();
  // Clip texture inside the pineapple body
  ctx.save();
  ctx.clip?.();
  // Diagonal lattice groove lines
  ctx.strokeStyle = "rgba(69, 26, 3, 0.4)";
  ctx.lineWidth = Math.max(1, wPx * 0.05);
  const step = Math.max(3, wPx * 0.28);
  const diagSpan = Math.max(wPx, hPx) * 1.5;
  // +35 degree lines
  for (let offset = -diagSpan; offset <= diagSpan; offset += step) {
    const p1 = toScreen(-diagSpan + offset, -halfH - diagSpan);
    const p2 = toScreen(diagSpan + offset, -halfH + diagSpan);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  // -35 degree lines
  for (let offset = -diagSpan; offset <= diagSpan; offset += step) {
    const p1 = toScreen(diagSpan + offset, -halfH - diagSpan);
    const p2 = toScreen(-diagSpan + offset, -halfH + diagSpan);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  // Pineapple "Eyes" / Diamond scale center facets
  const rows = 5;
  const cols = 5;
  for (let r = 0; r < rows; r++) {
    const fy = (r + 0.5) / rows;
    const ey = -hPx + fy * hPx;
    const dy = (ey - -halfH) / halfH;
    const rowWidth = 2 * halfW * Math.sqrt(Math.max(0, 1 - dy * dy));
    const stagger = r % 2 === 1 ? 0.5 : 0;
    for (let c = 0; c < cols; c++) {
      const fx = (c + stagger) / (cols - 1);
      const ex = (fx - 0.5) * rowWidth * 0.85;
      if (Math.abs(ex) < rowWidth * 0.44) {
        const dotCenter = toScreen(ex, ey);
        const eyeW = Math.max(1, halfW * 0.14);
        const eyeH = Math.max(1, halfH * 0.05);
        // Sunlit scale top facet
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.ellipse(
          dotCenter.x,
          dotCenter.y - eyeH * 0.5,
          eyeW,
          eyeH,
          tiltAngle,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        // Dark brown center bract notch
        ctx.fillStyle = "#451a03";
        ctx.beginPath();
        ctx.ellipse(
          dotCenter.x,
          dotCenter.y,
          eyeW * 0.6,
          eyeH * 0.6,
          tiltAngle,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }
  ctx.restore(); // end clip
  // Body perimeter stroke
  ctx.strokeStyle = "rgba(69, 26, 3, 0.6)";
  ctx.lineWidth = Math.max(1, wPx * 0.05);
  ctx.beginPath();
  for (let i = 0; i <= bodySteps; i++) {
    const theta = (i / bodySteps) * Math.PI * 2;
    const lx = halfW * Math.cos(theta);
    const ly = -halfH + halfH * Math.sin(theta);
    const pt = toScreen(lx, ly);
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
/**
 * Draws a living pineapple plant (bromeliad) rooted in the stage sand:
 * a circular rosette of sword-like spiky leaves, a sturdy fruiting stalk,
 * and a majestic ripe golden pineapple perched proudly in the center.
 */
export function drawStagePineapplePlant(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  rootWorldX: number,
  rootWorldY: number,
  scale: number = 1.0,
): void {
  const baseScreen = camera.worldToScreen(rootWorldX, rootWorldY);
  const sandRadius = Math.max(3, camera.worldLengthToScreen(55 * scale));
  ctx.save();
  // 1. Tropical sand mound at plant base
  ctx.beginPath();
  ctx.ellipse(
    baseScreen.x,
    baseScreen.y,
    sandRadius,
    sandRadius * 0.35,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#f59e0b";
  ctx.fill();
  // 2. Rosette of sword-like bromeliad leaves spreading across the ground
  interface LeafSpec {
    tipXWorld: number;
    tipYWorld: number;
    ctrlXWorld: number;
    ctrlYWorld: number;
    color: string;
    widthWorld: number;
  }
  const leaves: LeafSpec[] = [
    // Outer low spreading leaves
    {
      tipXWorld: -170 * scale,
      tipYWorld: 28 * scale,
      ctrlXWorld: -90 * scale,
      ctrlYWorld: 65 * scale,
      color: "#14532d",
      widthWorld: 22 * scale,
    },
    {
      tipXWorld: 170 * scale,
      tipYWorld: 28 * scale,
      ctrlXWorld: 90 * scale,
      ctrlYWorld: 65 * scale,
      color: "#14532d",
      widthWorld: 22 * scale,
    },
    {
      tipXWorld: -220 * scale,
      tipYWorld: 14 * scale,
      ctrlXWorld: -120 * scale,
      ctrlYWorld: 38 * scale,
      color: "#166534",
      widthWorld: 20 * scale,
    },
    {
      tipXWorld: 220 * scale,
      tipYWorld: 14 * scale,
      ctrlXWorld: 120 * scale,
      ctrlYWorld: 38 * scale,
      color: "#166534",
      widthWorld: 20 * scale,
    },
    // Mid arching leaves
    {
      tipXWorld: -120 * scale,
      tipYWorld: 80 * scale,
      ctrlXWorld: -60 * scale,
      ctrlYWorld: 105 * scale,
      color: "#15803d",
      widthWorld: 24 * scale,
    },
    {
      tipXWorld: 120 * scale,
      tipYWorld: 80 * scale,
      ctrlXWorld: 60 * scale,
      ctrlYWorld: 105 * scale,
      color: "#15803d",
      widthWorld: 24 * scale,
    },
    // Upright leaves hugging stalk
    {
      tipXWorld: -55 * scale,
      tipYWorld: 120 * scale,
      ctrlXWorld: -30 * scale,
      ctrlYWorld: 85 * scale,
      color: "#16a34a",
      widthWorld: 20 * scale,
    },
    {
      tipXWorld: 55 * scale,
      tipYWorld: 120 * scale,
      ctrlXWorld: 30 * scale,
      ctrlYWorld: 85 * scale,
      color: "#16a34a",
      widthWorld: 20 * scale,
    },
  ];
  for (const lf of leaves) {
    const tip = camera.worldToScreen(
      rootWorldX + lf.tipXWorld,
      rootWorldY + lf.tipYWorld,
    );
    const ctrl = camera.worldToScreen(
      rootWorldX + lf.ctrlXWorld,
      rootWorldY + lf.ctrlYWorld,
    );
    const leafW = Math.max(1, camera.worldLengthToScreen(lf.widthWorld));
    ctx.strokeStyle = lf.color;
    ctx.lineWidth = leafW;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(baseScreen.x, baseScreen.y);
    ctx.quadraticCurveTo(ctrl.x, ctrl.y, tip.x, tip.y);
    ctx.stroke();
    // Sharp leaf spine highlight
    ctx.strokeStyle = "#86efac";
    ctx.lineWidth = Math.max(1, leafW * 0.18);
    ctx.beginPath();
    ctx.moveTo(baseScreen.x, baseScreen.y);
    ctx.quadraticCurveTo(ctrl.x, ctrl.y, tip.x, tip.y);
    ctx.stroke();
  }
  // 3. Stout central fruiting stalk
  const stalkTopWorld = { x: rootWorldX, y: rootWorldY + 70 * scale };
  const stalkTopScreen = camera.worldToScreen(stalkTopWorld.x, stalkTopWorld.y);
  const stalkWidthPx = Math.max(2, camera.worldLengthToScreen(28 * scale));
  ctx.strokeStyle = "#15803d";
  ctx.lineWidth = stalkWidthPx;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(baseScreen.x, baseScreen.y);
  ctx.lineTo(stalkTopScreen.x, stalkTopScreen.y);
  ctx.stroke();
  ctx.restore();
  // 4. Perched Pineapple Fruit atop stalk
  drawPineapple(
    ctx,
    camera,
    rootWorldX,
    rootWorldY + 68 * scale,
    68 * scale,
    105 * scale,
    0,
  );
}
/**
 * Draws the stage underbody hull silhouette and descending cliff slopes
 * for stages with defined slope geometry (e.g. Dream Land).
 */
