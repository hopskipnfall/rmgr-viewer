/**
 * Beam Sword item visual (ITKind.BeamSword):
 * - Sleek hilt projecting a vibrant glowing laser blade
 */
export function drawBeamSwordItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frameCounter = 0,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 4);
  // Hilt (dark metallic cylinder with silver emitter guard)
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(-18, -3, 14, 6);
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 1;
  ctx.strokeRect(-18, -3, 14, 6);
  // Emitter collar
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(-4, -4.5, 4, 9);
  // Laser blade
  const shimmer = Math.sin((frameCounter * Math.PI) / 8) * 1.5;
  const bladeLen = 36 + shimmer;
  ctx.shadowColor = "#ec4899";
  ctx.shadowBlur = 14 + shimmer;
  // Outer energy glow
  ctx.fillStyle = "rgba(236, 72, 153, 0.45)";
  ctx.beginPath();
  ctx.roundRect(0, -5, bladeLen, 10, 4);
  ctx.fill();
  // Solid magenta/pink laser
  ctx.fillStyle = "#f472b6";
  ctx.beginPath();
  ctx.roundRect(0, -3.2, bladeLen, 6.4, 2.8);
  ctx.fill();
  // White-hot inner plasma core
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(0, -1.2, bladeLen - 2, 2.4, 1.2);
  ctx.fill();
  ctx.restore();
}

/**
 * Home Run Bat item visual (ITKind.HomeRunBat):
 * - Wooden baseball bat with grip wrap and polished woodgrain
 */
export function drawHomeRunBatItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 4);
  const batGrad = ctx.createLinearGradient(0, -6, 0, 6);
  batGrad.addColorStop(0.0, "#fef3c7");
  batGrad.addColorStop(0.35, "#d97706");
  batGrad.addColorStop(0.85, "#b45309");
  batGrad.addColorStop(1.0, "#78350f");
  // Bat barrel and taper
  ctx.beginPath();
  ctx.moveTo(-18, -2);
  ctx.lineTo(-4, -2.5);
  ctx.lineTo(20, -5.5);
  ctx.quadraticCurveTo(24, 0, 20, 5.5);
  ctx.lineTo(-4, 2.5);
  ctx.lineTo(-18, 2);
  ctx.closePath();
  ctx.fillStyle = batGrad;
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#451a03";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // White grip tape on handle
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(-17, -2.2, 10, 4.4);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-17, -2.2, 10, 4.4);
  // Knob at base
  ctx.fillStyle = "#92400e";
  ctx.beginPath();
  ctx.ellipse(-19, 0, 2, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Paper pleated Harisen Fan item visual (ITKind.Fan).
 */
export function drawFanItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  const fanRadius = 24;
  const startAngle = -Math.PI * 0.85;
  const endAngle = -Math.PI * 0.15;
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.arc(0, 8, fanRadius, startAngle, endAngle);
  ctx.closePath();
  ctx.fillStyle = "#fef2f2";
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#dc2626";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Red decorative ribs
  const pleats = 6;
  for (let i = 0; i <= pleats; i++) {
    const a = startAngle + (i * (endAngle - startAngle)) / pleats;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(Math.cos(a) * fanRadius, 8 + Math.sin(a) * fanRadius);
    ctx.strokeStyle = i % 2 === 0 ? "#ef4444" : "#fca5a5";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  // Bamboo pivot handle
  ctx.fillStyle = "#b45309";
  ctx.fillRect(-2.5, 6, 5, 9);
  ctx.beginPath();
  ctx.arc(0, 8, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#facc15";
  ctx.fill();
  ctx.restore();
}

/**
 * Star Rod item visual (ITKind.StarRod):
 * - Red/white wand with golden collar and sparkling star tip
 */
export function drawStarRodItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frameCounter = 0,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(-18, -2.5, 20, 5);
  ctx.strokeStyle = "#991b1b";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-18, -2.5, 20, 5);
  // White diagonal stripes
  ctx.fillStyle = "#ffffff";
  for (let s = -16; s < 0; s += 6) {
    ctx.fillRect(s, -2.5, 2.5, 5);
  }
  // Golden neck collar
  ctx.fillStyle = "#facc15";
  ctx.fillRect(1, -4, 4, 8);
  // Golden 4-point star on tip
  const starR = 12;
  ctx.translate(12, 0);
  ctx.rotate((frameCounter * Math.PI) / 30);
  ctx.shadowColor = "#facc15";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  ctx.moveTo(0, -starR);
  ctx.quadraticCurveTo(2, -2, starR, 0);
  ctx.quadraticCurveTo(2, 2, 0, starR);
  ctx.quadraticCurveTo(-2, 2, -starR, 0);
  ctx.quadraticCurveTo(-2, -2, 0, -starR);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#ca8a04";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

/**
 * Ray Gun weapon item visual (ITKind.RayGun).
 */
export function drawRayGunItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  // Finned handle
  ctx.fillStyle = "#475569";
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-14, 14);
  ctx.lineTo(-8, 14);
  ctx.lineTo(-4, 0);
  ctx.closePath();
  ctx.fill();
  // Main barrel housing
  ctx.fillStyle = "#94a3b8";
  ctx.beginPath();
  ctx.roundRect(-12, -7, 24, 11, 3);
  ctx.fill();
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Glowing green liquid energy chamber
  ctx.fillStyle = "#22c55e";
  ctx.shadowColor = "#4ade80";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.roundRect(-6, -4, 12, 5, 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Concentric emitter rings on nozzle
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(12, -5, 4, 7);
  ctx.fillRect(17, -3.5, 3, 4);
  // Glowing green nozzle tip
  ctx.beginPath();
  ctx.arc(20, -1.5, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = "#4ade80";
  ctx.fill();
  ctx.restore();
}

/**
 * Fire Flower item visual (ITKind.FireFlower).
 */
export function drawFireFlowerItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  // Slender green stem
  ctx.strokeStyle = "#16a34a";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 14);
  ctx.stroke();
  // Two curved green leaves at base
  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.ellipse(-7, 12, 6, 3, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(7, 12, 6, 3, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  // Concentric flower bloom: Red outer oval
  ctx.beginPath();
  ctx.ellipse(0, -6, 15, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#ef4444";
  ctx.shadowColor = "rgba(239, 68, 68, 0.4)";
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  // Orange middle ring
  ctx.beginPath();
  ctx.ellipse(0, -6, 11, 8.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#f97316";
  ctx.fill();
  // White/Yellow inner face
  ctx.beginPath();
  ctx.ellipse(0, -6, 7.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#fef08a";
  ctx.fill();
  // Two black oval smiling eyes
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.ellipse(-2.8, -6, 1.2, 2.4, 0, 0, Math.PI * 2);
  ctx.ellipse(2.8, -6, 1.2, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Hammer weapon item visual (ITKind.Hammer).
 */
export function drawHammerItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 6);
  // Sturdy wooden shaft
  ctx.fillStyle = "#b45309";
  ctx.fillRect(-3, -12, 6, 32);
  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 1;
  ctx.strokeRect(-3, -12, 6, 32);
  // Dark oak barrel mallet head
  const headW = 32;
  const headH = 20;
  const hx = -headW / 2;
  const hy = -16 - headH / 2;
  const headGrad = ctx.createLinearGradient(hx, 0, hx + headW, 0);
  headGrad.addColorStop(0.0, "#78350f");
  headGrad.addColorStop(0.3, "#92400e");
  headGrad.addColorStop(0.7, "#78350f");
  headGrad.addColorStop(1.0, "#451a03");
  ctx.beginPath();
  ctx.roundRect(hx, hy, headW, headH, 4);
  ctx.fillStyle = headGrad;
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#292524";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Two steel reinforcement bands
  ctx.fillStyle = "#64748b";
  ctx.fillRect(hx + 6, hy, 4, headH);
  ctx.fillRect(hx + headW - 10, hy, 4, headH);
  ctx.restore();
}
