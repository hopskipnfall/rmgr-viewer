/**
 * Poké Ball item visual (ITKind.Pokeball):
 * - Red upper dome, white lower dome, black belt divider, center release button
 */
export function drawPokeballItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  const pbRadius = 20;
  // Shadow & outer rim
  ctx.beginPath();
  ctx.arc(x, y, pbRadius, 0, Math.PI * 2);
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#0f172a";
  ctx.fill();
  ctx.shadowBlur = 0;
  // Top hemisphere (Red)
  const topGrad = ctx.createRadialGradient(x - 5, y - 6, 2, x, y - 5, pbRadius);
  topGrad.addColorStop(0.0, "#f87171");
  topGrad.addColorStop(0.4, "#ef4444");
  topGrad.addColorStop(1.0, "#991b1b");
  ctx.beginPath();
  ctx.arc(x, y, pbRadius, Math.PI, 0);
  ctx.fillStyle = topGrad;
  ctx.fill();
  // Bottom hemisphere (White)
  const botGrad = ctx.createRadialGradient(x - 5, y + 4, 2, x, y + 5, pbRadius);
  botGrad.addColorStop(0.0, "#ffffff");
  botGrad.addColorStop(0.6, "#e2e8f0");
  botGrad.addColorStop(1.0, "#94a3b8");
  ctx.beginPath();
  ctx.arc(x, y, pbRadius, 0, Math.PI);
  ctx.fillStyle = botGrad;
  ctx.fill();
  // Black equator belt line
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = "#0f172a";
  ctx.beginPath();
  ctx.moveTo(x - pbRadius, y);
  ctx.lineTo(x + pbRadius, y);
  ctx.stroke();
  // Outer circle border
  ctx.beginPath();
  ctx.arc(x, y, pbRadius, 0, Math.PI * 2);
  ctx.stroke();
  // Center release button (black outer ring, white inner button)
  ctx.beginPath();
  ctx.arc(x, y, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = "#0f172a";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, 4.2, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 1;
  ctx.fill();
  ctx.stroke();
  // Specular highlight on top dome
  ctx.beginPath();
  ctx.ellipse(x - 7, y - 8, 4.5, 2.5, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.fill();
  ctx.restore();
}

/**
 * Super Star item visual (ITKind.Star):
 * - 5-pointed Mario star with vertical black oval eyes and golden glow
 */
export function drawSuperStarItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frameCounter = 0,
): void {
  ctx.save();
  const rOuter = 22;
  const rInner = 9.5;
  const points = 5;
  // Golden glow aura
  ctx.shadowColor = "#facc15";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const starGrad = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, rOuter);
  starGrad.addColorStop(0.0, "#ffffff");
  starGrad.addColorStop(0.3, "#fef08a");
  starGrad.addColorStop(0.75, "#facc15");
  starGrad.addColorStop(1.0, "#ca8a04");
  ctx.fillStyle = starGrad;
  ctx.fill();
  ctx.strokeStyle = "#854d0e";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Two vertical black oval eyes
  const eyeSpacing = 4.2;
  const eyeY = y + 0.5;
  ctx.fillStyle = "#0f172a";
  for (const ex of [x - eyeSpacing, x + eyeSpacing]) {
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, 1.8, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eye specular dot
    ctx.beginPath();
    ctx.arc(ex - 0.4, eyeY - 1.8, 0.8, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.fillStyle = "#0f172a";
  }
  // Sparkles
  for (let s = 0; s < 3; s++) {
    const sa = (s * Math.PI * 2) / 3 + frameCounter * 0.08;
    const dist = rOuter * 1.35;
    ctx.beginPath();
    ctx.arc(
      x + Math.cos(sa) * dist,
      y + Math.sin(sa) * dist,
      1.6,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#fef08a";
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Maxim Tomato item visual (ITKind.MaximTomato):
 * - Red plump tomato with green calyx stem and bold black "M"
 */
export function drawMaximTomatoItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  const tomRadius = 20;
  // Tomato plump body
  const tomGrad = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, tomRadius);
  tomGrad.addColorStop(0.0, "#f87171");
  tomGrad.addColorStop(0.35, "#ef4444");
  tomGrad.addColorStop(0.8, "#dc2626");
  tomGrad.addColorStop(1.0, "#991b1b");
  ctx.beginPath();
  ctx.arc(x, y + 2, tomRadius, 0, Math.PI * 2);
  ctx.fillStyle = tomGrad;
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#7f1d1d";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Specular shine
  ctx.beginPath();
  ctx.ellipse(x - 7, y - 5, 4.5, 2.5, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.fill();
  // Green leafy stem on top
  const stemY = y - tomRadius + 2;
  ctx.fillStyle = "#16a34a";
  ctx.beginPath();
  ctx.moveTo(x, stemY);
  ctx.lineTo(x - 8, stemY - 5);
  ctx.lineTo(x - 3, stemY + 1);
  ctx.lineTo(x + 8, stemY - 5);
  ctx.lineTo(x + 3, stemY + 1);
  ctx.closePath();
  ctx.fill();
  // Black letter "M" insignia on front
  ctx.font = "900 17px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("M", x, y + 4);
  ctx.restore();
}

/**
 * Heart Container item visual (ITKind.Heart):
 * - Crystalline heart container with glowing ruby inner heart
 */
export function drawHeartContainerItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frameCounter = 0,
): void {
  ctx.save();
  const pulse = Math.sin((frameCounter * Math.PI) / 16) * 1.2;
  const hW = 26 + pulse;
  const hH = 26 + pulse;
  const drawHeartPath = (ox: number, oy: number, w: number, h: number) => {
    ctx.beginPath();
    ctx.moveTo(ox, oy + h * 0.35);
    ctx.bezierCurveTo(
      ox,
      oy - h * 0.15,
      ox - w * 0.6,
      oy - h * 0.15,
      ox - w * 0.6,
      oy + h * 0.35,
    );
    ctx.bezierCurveTo(
      ox - w * 0.6,
      oy + h * 0.7,
      ox,
      oy + h * 0.95,
      ox,
      oy + h,
    );
    ctx.bezierCurveTo(
      ox,
      oy + h * 0.95,
      ox + w * 0.6,
      oy + h * 0.7,
      ox + w * 0.6,
      oy + h * 0.35,
    );
    ctx.bezierCurveTo(
      ox + w * 0.6,
      oy - h * 0.15,
      ox,
      oy - h * 0.15,
      ox,
      oy + h * 0.35,
    );
    ctx.closePath();
  };
  // Gold outer frame
  ctx.shadowColor = "#f43f5e";
  ctx.shadowBlur = 12;
  drawHeartPath(x, y - hH * 0.5, hW * 1.15, hH * 1.15);
  ctx.fillStyle = "#eab308";
  ctx.fill();
  ctx.shadowBlur = 0;
  // Glowing ruby-red gem heart inside
  const rubyGrad = ctx.createRadialGradient(x - 3, y - 2, 2, x, y, hW * 0.6);
  rubyGrad.addColorStop(0.0, "#fda4af");
  rubyGrad.addColorStop(0.4, "#f43f5e");
  rubyGrad.addColorStop(0.85, "#be123c");
  rubyGrad.addColorStop(1.0, "#881337");
  drawHeartPath(x, y - hH * 0.5 + 2, hW * 0.9, hH * 0.9);
  ctx.fillStyle = rubyGrad;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Specular crystal glint
  ctx.beginPath();
  ctx.ellipse(x - 5, y - 5, 3.5, 1.8, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.fill();
  ctx.restore();
}

/**
 * Motion Sensor Bomb proximity landmine (ITKind.MotionSensorBomb).
 */
export function drawMotionSensorBombItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frameCounter = 0,
): void {
  ctx.save();
  const size = 26;
  const hs = size / 2;
  ctx.fillStyle = "#1e293b";
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.roundRect(x - hs, y - hs, size, size, 5);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Yellow hazard warning stripes
  ctx.fillStyle = "#eab308";
  ctx.fillRect(x - hs + 3, y - hs + 3, size - 6, 3);
  ctx.fillRect(x - hs + 3, y + hs - 6, size - 6, 3);
  // Central optical sensor eye with blinking red lens
  const blink = (Math.sin(frameCounter * 0.25) + 1) * 0.5;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#0f172a";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fillStyle = blink > 0.35 ? "#ef4444" : "#7f1d1d";
  ctx.shadowColor = "#ef4444";
  ctx.shadowBlur = blink > 0.35 ? 8 : 0;
  ctx.fill();
  ctx.restore();
}

/**
 * Koopa Shell item visual (ITKind.GreenShell, ITKind.RedShell).
 */
export function drawKoopaShellItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isRed = false,
  frameCounter = 0,
): void {
  ctx.save();
  const wobble = Math.sin((frameCounter * Math.PI) / 15) * 0.8;
  ctx.translate(0, wobble);
  const sW = 32;
  const sH = 22;
  const domeGrad = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, sW / 2);
  if (isRed) {
    domeGrad.addColorStop(0.0, "#f87171");
    domeGrad.addColorStop(0.5, "#dc2626");
    domeGrad.addColorStop(1.0, "#991b1b");
  } else {
    domeGrad.addColorStop(0.0, "#4ade80");
    domeGrad.addColorStop(0.5, "#16a34a");
    domeGrad.addColorStop(1.0, "#14532d");
  }
  ctx.beginPath();
  ctx.ellipse(x, y - 2, sW / 2, sH / 2, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = domeGrad;
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = isRed ? "#7f1d1d" : "#052e16";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Hexagonal scute pattern on dome
  ctx.strokeStyle = isRed ? "#fca5a5" : "#86efac";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 8);
  ctx.lineTo(x + 6, y - 8);
  ctx.lineTo(x + 9, y - 3);
  ctx.lineTo(x - 9, y - 3);
  ctx.closePath();
  ctx.stroke();
  // White underbelly rim
  ctx.beginPath();
  ctx.ellipse(x, y + 2, sW / 2 + 2, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#f8fafc";
  ctx.fill();
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

/**
 * Bumper item visual (ITKind.Bumper, ITKind.StageBumper).
 */
export function drawBumperItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frameCounter = 0,
): void {
  ctx.save();
  const bRadius = 18;
  // Metallic weighted disc base
  ctx.beginPath();
  ctx.ellipse(x, y + 8, bRadius * 0.95, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#64748b";
  ctx.fill();
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Chrome domed cap with red rim
  const pulse = 1 + 0.05 * Math.sin(frameCounter * 0.3);
  ctx.beginPath();
  ctx.arc(x, y - 2, bRadius * pulse, 0, Math.PI * 2);
  ctx.fillStyle = "#dc2626";
  ctx.shadowColor = "rgba(220, 38, 38, 0.45)";
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#991b1b";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Blue inner dome
  ctx.beginPath();
  ctx.arc(x, y - 2, bRadius * 0.72 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = "#2563eb";
  ctx.fill();
  // White 5-pointed star in center
  const starR = 7 * pulse;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? starR : starR * 0.45;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const px = x + Math.cos(a) * r;
    const py = y - 2 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Towering roaring column of psychic flame for PK Fire Pillar (ITKind.PKFirePillar).
 */
export function drawPKFirePillarItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frameCounter = 0,
): void {
  ctx.save();
  const pW = 28;
  const pH = 66;
  // Ground impact ring
  ctx.beginPath();
  ctx.ellipse(x, y, pW * 0.7, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(249, 115, 22, 0.45)";
  ctx.shadowColor = "#f97316";
  ctx.shadowBlur = 14;
  ctx.fill();
  // Surging psychic flame pillar
  const topY = y - pH;
  const wave = Math.sin(frameCounter * 0.4) * 4;
  const fireGrad = ctx.createLinearGradient(x, y, x, topY);
  fireGrad.addColorStop(0.0, "#ef4444");
  fireGrad.addColorStop(0.4, "#f97316");
  fireGrad.addColorStop(0.85, "#fde047");
  fireGrad.addColorStop(1.0, "#ffffff");
  ctx.beginPath();
  ctx.moveTo(x - pW * 0.5, y);
  ctx.quadraticCurveTo(
    x - pW * 0.7 + wave,
    y - pH * 0.35,
    x - pW * 0.3,
    y - pH * 0.7,
  );
  ctx.lineTo(x + wave * 0.5, topY);
  ctx.lineTo(x + pW * 0.3, y - pH * 0.7);
  ctx.quadraticCurveTo(x + pW * 0.7 + wave, y - pH * 0.35, x + pW * 0.5, y);
  ctx.closePath();
  ctx.fillStyle = fireGrad;
  ctx.shadowColor = "#ea580c";
  ctx.shadowBlur = 18;
  ctx.fill();
  // Bright white-hot core column
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(x - pW * 0.2, y);
  ctx.lineTo(x - pW * 0.1 + wave * 0.5, y - pH * 0.8);
  ctx.lineTo(x + wave * 0.5, topY + 6);
  ctx.lineTo(x + pW * 0.1 + wave * 0.5, y - pH * 0.8);
  ctx.lineTo(x + pW * 0.2, y);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  // Discharging electric sparks
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const sy = y - ((frameCounter * 3 + i * 16) % pH);
    const sx = x + (i % 2 === 0 ? 1 : -1) * (pW * 0.6 + i * 3);
    ctx.beginPath();
    ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = "#fde047";
    ctx.fill();
  }
  ctx.restore();
}
