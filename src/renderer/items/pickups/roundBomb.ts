/**
 * Render standard round bomb (Link's held bomb or ITKind.BobOmb / ITKind.Bomb):
 * - Spherical cast-iron gradient shell with specular gleam
 * - Cylindrical brass collar neck
 * - Realistic winding braided hemp rope fuse
 * - Sizzling flame tip with glowing aura, white-hot core, and flying sparks
 */
export function drawRoundBombItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frameCounter = 0,
  isBobOmb = false,
  bombRadius = 32,
): void {
  ctx.save();
  const scale = bombRadius / 32;
  const bodyCenterY = y + 8 * scale;

  // 1. Bomb Sphere Shadow & Body with 3D Radial Lighting
  const bombGrad = ctx.createRadialGradient(
    x - 9 * scale,
    bodyCenterY - 9 * scale,
    5 * scale,
    x,
    bodyCenterY,
    bombRadius,
  );
  bombGrad.addColorStop(0.0, "#64748b"); // Specular highlight
  bombGrad.addColorStop(0.35, "#1e293b"); // Main slate-iron body
  bombGrad.addColorStop(1.0, "#090d16"); // Deep shadow edge

  ctx.beginPath();
  ctx.arc(x, bodyCenterY, bombRadius, 0, Math.PI * 2);
  ctx.fillStyle = bombGrad;
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 16 * scale;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
  ctx.lineWidth = Math.max(1, 2.4 * scale);
  ctx.stroke();

  // Specular shine dot
  ctx.beginPath();
  ctx.ellipse(
    x - 11 * scale,
    bodyCenterY - 11 * scale,
    7.5 * scale,
    4.6 * scale,
    -Math.PI / 4,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.fill();

  // Optional Bob-omb eyes
  if (isBobOmb) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(
      x - 8 * scale,
      bodyCenterY,
      4.5 * scale,
      9 * scale,
      0,
      0,
      Math.PI * 2,
    );
    ctx.ellipse(
      x + 8 * scale,
      bodyCenterY,
      4.5 * scale,
      9 * scale,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(x - 8 * scale, bodyCenterY, 2.8 * scale, 0, Math.PI * 2);
    ctx.arc(x + 8 * scale, bodyCenterY, 2.8 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Brass/Gold Metal Cap on Top
  const capY = bodyCenterY - bombRadius;
  ctx.beginPath();
  ctx.roundRect(
    x - 11 * scale,
    capY - 9 * scale,
    22 * scale,
    10 * scale,
    3.5 * scale,
  );
  ctx.fillStyle = "#eab308";
  ctx.fill();
  ctx.strokeStyle = "#854d0e";
  ctx.lineWidth = Math.max(0.8, 2 * scale);
  ctx.stroke();

  // 3. Burning Down S-Curved Fuse
  // Fuse curves from neck (x, capY - 9 * scale) through control points to full length tip
  // Burn down progress: burns from 1.0 (full length) down to 0.15 (near cap)
  const burnCycle = 90; // frames per full fuse burn cycle
  const burnProg = (frameCounter % burnCycle) / burnCycle;
  const fuseFraction = Math.max(0.12, 1 - burnProg * 0.85);

  // Fuse bezier control points: P0 -> P1 -> P2 -> P3
  const p0 = { x: x, y: capY - 9 * scale };
  const p1 = { x: x - 11 * scale, y: capY - 30 * scale };
  const p2 = { x: x + 22 * scale, y: capY - 48 * scale };
  const p3 = { x: x + 36 * scale, y: capY - 38 * scale };

  // Function to sample cubic bezier at t
  const sampleBezier = (t: number) => {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    return {
      x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
      y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
    };
  };

  // Draw remaining unburnt fuse rope
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * fuseFraction;
    const pt = sampleBezier(t);
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.strokeStyle = "#d97706"; // Hemp rope
  ctx.lineWidth = Math.max(1.2, 4.5 * scale);
  ctx.lineCap = "round";
  ctx.stroke();

  // 4. Sizzling Spark & Flame at the Burning Tip
  const sparkTip = sampleBezier(fuseFraction);

  // Glowing flame aura
  ctx.beginPath();
  ctx.arc(
    sparkTip.x,
    sparkTip.y,
    (13 + Math.sin(frameCounter * 0.8) * 3) * scale,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "rgba(249, 115, 22, 0.45)";
  ctx.shadowColor = "#ea580c";
  ctx.shadowBlur = 24 * scale;
  ctx.fill();

  // Bright orange flame core
  ctx.beginPath();
  ctx.arc(
    sparkTip.x,
    sparkTip.y,
    (9 + Math.sin(frameCounter * 0.6) * 2) * scale,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#f97316";
  ctx.fill();

  // Yellow bright center
  ctx.beginPath();
  ctx.arc(sparkTip.x, sparkTip.y, 5.5 * scale, 0, Math.PI * 2);
  ctx.fillStyle = "#fde047";
  ctx.fill();

  // White-hot spark dot
  ctx.beginPath();
  ctx.arc(sparkTip.x, sparkTip.y, 2.8 * scale, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // 5. Flying Spark Particles
  ctx.shadowBlur = 0;
  for (let i = 0; i < 4; i++) {
    const sparkAngle = (frameCounter * 1.7 + i * 1.6) % (Math.PI * 2);
    const sparkDist = (9 + ((frameCounter + i * 6) % 12)) * scale;
    const sx = sparkTip.x + Math.cos(sparkAngle) * sparkDist;
    const sy = sparkTip.y + Math.sin(sparkAngle) * sparkDist;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(0.6, 2.4 * scale), 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? "#fef08a" : "#fb923c";
    ctx.fill();
  }

  ctx.restore();
}
