/**
 * Two-tone medical Capsule item visual (ITKind.Capsule).
 */
export function drawCapsuleItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  const w = 26;
  const h = 13;
  // Left red half
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w / 2, h, [h / 2, 0, 0, h / 2]);
  ctx.fill();
  // Right white half
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.roundRect(0, -h / 2, w / 2, h, [0, h / 2, h / 2, 0]);
  ctx.fill();
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
  ctx.stroke();
  // Highlight
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fillRect(-w / 2 + 3, -h / 2 + 2, w - 6, 2.5);
  ctx.restore();
}

/**
 * Wooden Crate item visual (ITKind.Crate).
 */
export function drawCrateItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  const size = 30;
  const hs = size / 2;
  ctx.fillStyle = "#d97706";
  ctx.fillRect(x - hs, y - hs, size, size);
  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - hs, y - hs, size, size);
  // Diagonal "X" cross-bracing
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#92400e";
  ctx.beginPath();
  ctx.moveTo(x - hs, y - hs);
  ctx.lineTo(x + hs, y + hs);
  ctx.moveTo(x + hs, y - hs);
  ctx.lineTo(x - hs, y + hs);
  ctx.stroke();
  ctx.restore();
}

/**
 * Wooden Barrel item visual (ITKind.Barrel).
 */
export function drawBarrelItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  const bw = 26;
  const bh = 32;
  ctx.beginPath();
  ctx.moveTo(x - bw * 0.4, y - bh * 0.5);
  ctx.quadraticCurveTo(x - bw * 0.6, y, x - bw * 0.4, y + bh * 0.5);
  ctx.lineTo(x + bw * 0.4, y + bh * 0.5);
  ctx.quadraticCurveTo(x + bw * 0.6, y, x + bw * 0.4, y - bh * 0.5);
  ctx.closePath();
  const woodGrad = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
  woodGrad.addColorStop(0.0, "#78350f");
  woodGrad.addColorStop(0.4, "#b45309");
  woodGrad.addColorStop(1.0, "#451a03");
  ctx.fillStyle = woodGrad;
  ctx.fill();
  ctx.strokeStyle = "#292524";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Dark iron bands
  ctx.fillStyle = "#334155";
  ctx.fillRect(x - bw * 0.45, y - bh * 0.35, bw * 0.9, 3);
  ctx.fillRect(x - bw * 0.52, y - 1.5, bw * 1.04, 3);
  ctx.fillRect(x - bw * 0.45, y + bh * 0.35 - 3, bw * 0.9, 3);
  ctx.restore();
}

/**
 * POW Block item visual (ITKind.PowBlock).
 */
export function drawPowBlockItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  const size = 28;
  const hs = size / 2;
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(x - hs, y - hs, size, size);
  ctx.strokeStyle = "#1d4ed8";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - hs, y - hs, size, size);
  // Bevel edges
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.fillRect(x - hs, y - hs, size, 3);
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(x - hs, y + hs - 3, size, 3);
  // "POW" text
  ctx.font = "900 13px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("POW", x, y + 0.5);
  ctx.restore();
}

/**
 * Yoshi Egg item container visual (ITKind.Egg).
 */
export function drawEggItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  const rx = 18;
  const ry = 25;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#f8fafc";
  ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Green spots
  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.arc(x - 5, y - 8, 4.5, 0, Math.PI * 2);
  ctx.arc(x + 6, y + 5, 4.2, 0, Math.PI * 2);
  ctx.arc(x - 4, y + 10, 3.2, 0, Math.PI * 2);
  ctx.arc(x + 7, y - 7, 3.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
