/**
 * Crackling plasma orb for Ness's PK Thunder Head.
 */
export function drawPKThunderHeadMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spinAngle = 0,
): void {
  ctx.save();
  const thRadius = 15;
  // Glowing cyan electrical corona
  ctx.beginPath();
  ctx.arc(x, y, thRadius * 1.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 18;
  ctx.fill();
  // Electric plasma ball core
  const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, thRadius);
  grad.addColorStop(0.0, "#ffffff");
  grad.addColorStop(0.3, "#7dd3fc");
  grad.addColorStop(0.7, "#0284c7");
  grad.addColorStop(1.0, "#075985");
  ctx.beginPath();
  ctx.arc(x, y, thRadius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  // 6 crackling zig-zag lightning sparks
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + spinAngle * 2.5;
    const midR = thRadius * 0.9;
    const endR = thRadius * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a + 0.15) * midR, y + Math.sin(a + 0.15) * midR);
    ctx.lineTo(x + Math.cos(a) * endR, y + Math.sin(a) * endR);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, thRadius * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
}

/**
 * Trailing electric plasma mote for PK Thunder Trail and Pikachu Thunder Trail.
 */
export function drawPKThunderTrailMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spinAngle = 0,
): void {
  ctx.save();
  const trRadius = 10;
  ctx.beginPath();
  ctx.arc(x, y, trRadius * 1.35, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
  ctx.shadowColor = "#0ea5e9";
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, trRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#38bdf8";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, trRadius * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  // Small sparks
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 + spinAngle;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x + Math.cos(a) * trRadius * 1.4,
      y + Math.sin(a) * trRadius * 1.4,
    );
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Pikachu Down-B Thunder Trail marker (WPKind.ThunderTrail):
 * Trailing vertical lightning column segment crashing down from the sky.
 * Adjacent segments are spaced 450 world units (~171 screen px) apart.
 * Spanning from y - 88 to y + 88 with anchored center endpoints ensures
 * adjacent segments connect seamlessly into a continuous, crackling lightning bolt.
 */
export function drawThunderTrailMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spinAngle = 0,
): void {
  ctx.save();
  // Use spinAngle and y coordinate to give each segment a jagged zig-zag
  // while keeping the outer ends anchored at the center x.
  const seed = spinAngle * 4.3 + y * 0.02;
  const dx1 = Math.sin(seed + 1.2) * 14 + 10;
  const dx2 = -Math.sin(seed + 2.5) * 16 - 12;
  const dx3 = Math.sin(seed + 3.8) * 15 + 11;
  const dx4 = -Math.sin(seed + 5.1) * 17 - 13;
  const dx5 = Math.sin(seed + 6.4) * 14 + 9;
  const pts = [
    { x: x, y: y - 88 },
    { x: x + dx1, y: y - 58 },
    { x: x + dx2, y: y - 29 },
    { x: x + dx3, y: y },
    { x: x + dx4, y: y + 29 },
    { x: x + dx5, y: y + 58 },
    { x: x, y: y + 88 },
  ];
  const buildPath = () => {
    ctx.beginPath();
    const first = pts[0]!;
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < pts.length; i++) {
      const pt = pts[i]!;
      ctx.lineTo(pt.x, pt.y);
    }
  };
  // 1. Wide electric aura / ambient glow
  buildPath();
  ctx.strokeStyle = "rgba(250, 204, 21, 0.4)";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.lineJoin = "miter";
  ctx.miterLimit = 3;
  ctx.shadowColor = "#f59e0b";
  ctx.shadowBlur = 18;
  ctx.stroke();
  // 2. Mid electric yellow energy body
  buildPath();
  ctx.strokeStyle = "#fde047";
  ctx.lineWidth = 5.5;
  ctx.shadowColor = "#ffd700";
  ctx.shadowBlur = 10;
  ctx.stroke();
  // 3. Searing white-hot core
  buildPath();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.4;
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 4;
  ctx.stroke();
  // 4. Branching electric discharge arcs
  const p2 = pts[2]!;
  const p4 = pts[4]!;
  ctx.strokeStyle = "rgba(254, 240, 138, 0.85)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(p2.x, p2.y);
  ctx.lineTo(p2.x - 16, p2.y - 14);
  ctx.lineTo(p2.x - 24, p2.y - 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(p4.x, p4.y);
  ctx.lineTo(p4.x + 18, p4.y + 12);
  ctx.lineTo(p4.x + 26, p4.y + 20);
  ctx.stroke();
  // 5. Plasma energy nodes at vertices
  ctx.fillStyle = "#ffffff";
  for (let i = 1; i < pts.length - 1; i++) {
    const pt = pts[i]!;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Pikachu Down-B Thunder Head marker (WPKind.ThunderHead):
 * The leading impact head of the lightning strike crashing down from the sky.
 * Connects at top with trailing segments (y - 88) and terminates in a powerful
 * electric arrowhead / diamond impact spear with downward discharge prongs.
 */
export function drawThunderHeadMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spinAngle = 0,
): void {
  ctx.save();
  const seed = spinAngle * 4.3 + y * 0.02;
  const dx1 = Math.sin(seed + 1.2) * 14 + 10;
  const dx2 = -Math.sin(seed + 2.5) * 16 - 12;
  const dx3 = Math.sin(seed + 3.8) * 15 + 11;
  const dx4 = -Math.sin(seed + 5.1) * 17 - 13;
  const pts = [
    { x: x, y: y - 88 },
    { x: x + dx1, y: y - 60 },
    { x: x + dx2, y: y - 34 },
    { x: x + dx3, y: y - 10 },
    { x: x + dx4, y: y + 10 },
    { x: x, y: y + 26 }, // Head impact tip
  ];
  const buildPath = () => {
    ctx.beginPath();
    const first = pts[0]!;
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < pts.length; i++) {
      const pt = pts[i]!;
      ctx.lineTo(pt.x, pt.y);
    }
  };
  // 1. Column glow
  buildPath();
  ctx.strokeStyle = "rgba(250, 204, 21, 0.45)";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.lineJoin = "miter";
  ctx.miterLimit = 3;
  ctx.shadowColor = "#f59e0b";
  ctx.shadowBlur = 20;
  ctx.stroke();
  // Mid yellow stroke
  buildPath();
  ctx.strokeStyle = "#fde047";
  ctx.lineWidth = 6;
  ctx.shadowColor = "#ffd700";
  ctx.shadowBlur = 12;
  ctx.stroke();
  // White core
  buildPath();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.6;
  ctx.stroke();
  // 2. Powerful crashing arrowhead / diamond impact spear
  const lastPt = pts[pts.length - 1]!;
  const tipX = lastPt.x;
  const tipY = lastPt.y;
  // Outer spear aura
  ctx.beginPath();
  ctx.moveTo(tipX, tipY + 16);
  ctx.lineTo(tipX + 20, tipY - 14);
  ctx.lineTo(tipX, tipY - 6);
  ctx.lineTo(tipX - 20, tipY - 14);
  ctx.closePath();
  ctx.fillStyle = "rgba(253, 224, 71, 0.5)";
  ctx.shadowColor = "#ffd700";
  ctx.shadowBlur = 24;
  ctx.fill();
  // Inner diamond spear
  ctx.beginPath();
  ctx.moveTo(tipX, tipY + 14);
  ctx.lineTo(tipX + 14, tipY - 10);
  ctx.lineTo(tipX, tipY - 4);
  ctx.lineTo(tipX - 14, tipY - 10);
  ctx.closePath();
  ctx.fillStyle = "#fef08a";
  ctx.fill();
  // White-hot core diamond
  ctx.beginPath();
  ctx.moveTo(tipX, tipY + 9);
  ctx.lineTo(tipX + 7, tipY - 6);
  ctx.lineTo(tipX, tipY - 2);
  ctx.lineTo(tipX - 7, tipY - 6);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  // Downward radiating lightning discharge prongs
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.shadowColor = "#ffd700";
  ctx.shadowBlur = 10;
  // Left prong
  ctx.beginPath();
  ctx.moveTo(tipX - 6, tipY + 6);
  ctx.lineTo(tipX - 22, tipY + 26);
  ctx.lineTo(tipX - 30, tipY + 36);
  ctx.stroke();
  // Right prong
  ctx.beginPath();
  ctx.moveTo(tipX + 6, tipY + 6);
  ctx.lineTo(tipX + 22, tipY + 26);
  ctx.lineTo(tipX + 30, tipY + 36);
  ctx.stroke();
  // Center piercing spark
  ctx.beginPath();
  ctx.moveTo(tipX, tipY + 12);
  ctx.lineTo(tipX + Math.sin(seed * 3) * 6, tipY + 34);
  ctx.stroke();
  ctx.restore();
}
