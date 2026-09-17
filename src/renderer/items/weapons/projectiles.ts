/**
 * Fireball projectile visual (Mario / Luigi Neutral-B):
 * - Outer flame aura with glow (Red for Mario, Emerald for Luigi)
 * - Bright core (Yellow for Mario, Mint for Luigi)
 * - White-hot center
 * - Trailing sparks and rolling flame licks behind the fireball
 */
export function drawFireballMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isLuigi: boolean,
  dir = 1,
): void {
  const fbRadius = 17;
  ctx.save();
  // 1. Fireball outer flame aura
  ctx.beginPath();
  ctx.arc(x, y, fbRadius * 1.4, 0, Math.PI * 2);
  ctx.fillStyle = isLuigi
    ? "rgba(34, 197, 94, 0.45)"
    : "rgba(239, 68, 68, 0.45)";
  ctx.shadowColor = isLuigi ? "#22c55e" : "#ef4444";
  ctx.shadowBlur = 18;
  ctx.fill();
  // 2. Fireball bright core
  ctx.beginPath();
  ctx.arc(x, y, fbRadius, 0, Math.PI * 2);
  ctx.fillStyle = isLuigi ? "#86efac" : "#fde047";
  ctx.fill();
  // 3. White-hot center
  ctx.beginPath();
  ctx.arc(x - dir * 2.5, y - 2, fbRadius * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  // 4. Trailing sparks & flame licks
  ctx.beginPath();
  ctx.arc(x - dir * (fbRadius * 1.5), y + 4, 3.8, 0, Math.PI * 2);
  ctx.arc(x - dir * (fbRadius * 2.2), y - 4, 2.8, 0, Math.PI * 2);
  ctx.arc(x - dir * (fbRadius * 2.9), y + 1.5, 2.0, 0, Math.PI * 2);
  ctx.fillStyle = isLuigi ? "#4ade80" : "#f97316";
  ctx.fill();
  ctx.restore();
}

/**
 * Searing psychic flame projectile, for Ness's PK Fire (Neutral-B):
 * - Outer psychic flame aura & glow (Amber/Orange)
 * - Bright core (Electric Yellow)
 * - White-hot center
 * - Trailing psychic sparks aligned with direction
 */
export function drawPKFireMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir = 1,
): void {
  const pkRadius = 15;
  ctx.save();
  // 1. Fiery outer flame aura
  ctx.beginPath();
  ctx.arc(x, y, pkRadius * 1.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(249, 115, 22, 0.45)"; // Vibrant PK Fire orange
  ctx.shadowColor = "#ef4444";
  ctx.shadowBlur = 16;
  ctx.fill();
  // 2. Bright yellow flame core
  ctx.beginPath();
  ctx.arc(x, y, pkRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#fde047";
  ctx.fill();
  // 3. White-hot center
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(x - dir * 2.5, y - 1.5, pkRadius * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  // 4. Trailing sparks
  ctx.beginPath();
  ctx.arc(x - dir * (pkRadius * 1.5), y + 3, 3.4, 0, Math.PI * 2);
  ctx.arc(x - dir * (pkRadius * 2.2), y - 3, 2.4, 0, Math.PI * 2);
  ctx.arc(x - dir * (pkRadius * 2.8), y + 1.5, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = "#fbbf24";
  ctx.fill();
  ctx.restore();
}

/**
 * Electric spark sphere & discharging shockwaves, for Pikachu's Thunder Jolt (Neutral-B):
 * - Expanding / pulsating electric shock ring
 * - Electric blue-cyan / vibrant yellow core spark
 * - 4 branching zig-zag lightning sparks spinning and jittering with frame
 * - Crisp white central lightning core
 */
export function drawThunderJoltMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isGround: boolean,
  dir = 1,
  spinAngle = 0,
): void {
  const tjRadius = 16;
  ctx.save();
  // 1. Expanding electric shockwave ring
  const ringPhase = (spinAngle * 2) % (Math.PI * 2);
  const ringScale = 0.8 + 0.5 * Math.sin(ringPhase);
  ctx.beginPath();
  ctx.arc(x, y, tjRadius * 1.5 * ringScale, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.65)"; // Electric cyan
  ctx.lineWidth = 2.2;
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 12;
  ctx.stroke();
  // 2. Electric spark aura & glow
  ctx.beginPath();
  ctx.arc(x, y, tjRadius * 1.25, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(250, 204, 21, 0.45)"; // Bright electric yellow
  ctx.shadowColor = "#facc15";
  ctx.shadowBlur = 16;
  ctx.fill();
  // 3. Electric core
  ctx.beginPath();
  ctx.arc(x, y, tjRadius, 0, Math.PI * 2);
  ctx.fillStyle = isGround ? "#fde047" : "#38bdf8";
  ctx.fill();
  // 4. White-hot center
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(x, y, tjRadius * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  // 5. 4 Branching zig-zag electric sparks radiating outward
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = "#fef08a";
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    const sAngle = (i * Math.PI) / 2 + spinAngle;
    const midDist = tjRadius * 0.85;
    const midX = x + Math.cos(sAngle) * midDist + (i % 2 === 0 ? 3 : -3);
    const midY = y + Math.sin(sAngle) * midDist + (i % 2 === 0 ? -3 : 3);
    const endX = x + Math.cos(sAngle) * (tjRadius * 1.7);
    const endY = y + Math.sin(sAngle) * (tjRadius * 1.7);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(midX, midY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }
  // 6. Trailing spark dots behind travel direction
  ctx.beginPath();
  ctx.arc(x - dir * (tjRadius * 1.5), y + 2.5, 3.0, 0, Math.PI * 2);
  ctx.arc(x - dir * (tjRadius * 2.2), y - 2.5, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = "#38bdf8";
  ctx.fill();
  ctx.restore();
}

/**
 * Link's Boomerang projectile visual (WPKind.Boomerang):
 * - Spinning aerodynamic curved chevron / returning boomerang silhouette
 * - Proportional scale with distinct curved wings and rounded elbow
 * - Dynamic spinning speed / wind trail arcs
 * - Warm golden/amber glowing outer body, vibrant light-gold core, and crisp spine highlight
 */
export function drawBoomerangMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  spinAngle = 0,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spinAngle);
  // 1. Spinning circular wind / speed trail arcs
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 0.7);
  ctx.strokeStyle = "rgba(253, 224, 71, 0.35)";
  ctx.lineWidth = 1.75;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 22, Math.PI, Math.PI * 1.7);
  ctx.stroke();
  // 2. Outer glowing boomerang body with aerodynamic wing curvature
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-21, -12);
  ctx.quadraticCurveTo(-11, 2, 0, 9);
  ctx.quadraticCurveTo(11, 2, 21, -12);
  ctx.stroke();
  // 3. Bright vibrant golden core
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 3.8;
  ctx.stroke();
  // 4. Crisp spine highlight
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

/**
 * Fox's Blaster Laser Bolt visual (WPKind.Blaster):
 * - Red/crimson glowing laser beam capsule with energetic aura
 * - White-hot core beam
 * - Front laser flare star
 * - Trailing energy sparks behind the bolt
 */
export function drawLaserMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir = 1,
): void {
  ctx.save();
  const beamLen = 36;
  const beamHalfH = 4.2;
  // 1. Glowing red outer laser bolt
  ctx.beginPath();
  ctx.roundRect(
    x - (dir > 0 ? beamLen * 0.75 : beamLen * 0.25),
    y - beamHalfH,
    beamLen,
    beamHalfH * 2,
    beamHalfH,
  );
  ctx.fillStyle = "rgba(239, 68, 68, 0.95)";
  ctx.shadowColor = "#ff0033";
  ctx.shadowBlur = 14;
  ctx.fill();
  // 2. White-hot inner core
  ctx.beginPath();
  ctx.roundRect(
    x - (dir > 0 ? (beamLen - 5) * 0.75 : (beamLen - 5) * 0.25),
    y - 1.6,
    beamLen - 5,
    3.2,
    1.6,
  );
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  // 3. Leading tip star / energy flare
  const tipX = x + dir * (beamLen * 0.55);
  ctx.beginPath();
  ctx.arc(tipX, y, 3.8, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#ff6688";
  ctx.shadowBlur = 10;
  ctx.fill();
  // 4. Trailing energy wake sparks
  const tailX = x - dir * (beamLen * 0.6);
  ctx.beginPath();
  ctx.arc(tailX - dir * 5, y, 2.0, 0, Math.PI * 2);
  ctx.arc(tailX - dir * 11, y - 1.5, 1.4, 0, Math.PI * 2);
  ctx.arc(tailX - dir * 17, y + 1.5, 1.0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 120, 120, 0.85)";
  ctx.fill();
  ctx.restore();
}

/**
 * Kirby's Final Cutter Wave projectile visual (WPKind.Cutter):
 * - Vertical crescent energy blade surging forward along the ground
 * - Outer glowing cyan aura
 * - Crisp white-hot leading edge
 * - Multi-tiered energy crest teeth
 * - Trailing motion streaks behind the wave
 */
export function drawCutterWaveMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir = 1,
): void {
  ctx.save();
  const waveH = 32;
  const waveW = 18;
  // 1. Glowing cyan aura
  ctx.beginPath();
  ctx.moveTo(x + dir * (waveW * 0.7), y);
  ctx.lineTo(x + dir * (waveW * 0.4), y - waveH * 0.45);
  ctx.lineTo(x + dir * (waveW * 0.8), y - waveH * 0.75);
  ctx.lineTo(x + dir * (waveW * 0.2), y - waveH);
  ctx.lineTo(x - dir * (waveW * 0.6), y - waveH * 0.5);
  ctx.lineTo(x - dir * (waveW * 0.8), y);
  ctx.closePath();
  ctx.fillStyle = "rgba(56, 189, 248, 0.45)";
  ctx.shadowColor = "#0284c7";
  ctx.shadowBlur = 16;
  ctx.fill();
  // 2. Solid cyan/blue energy blade core
  ctx.beginPath();
  ctx.moveTo(x + dir * (waveW * 0.6), y);
  ctx.lineTo(x + dir * (waveW * 0.3), y - waveH * 0.45);
  ctx.lineTo(x + dir * (waveW * 0.7), y - waveH * 0.75);
  ctx.lineTo(x + dir * (waveW * 0.1), y - waveH * 0.95);
  ctx.lineTo(x - dir * (waveW * 0.45), y - waveH * 0.5);
  ctx.lineTo(x - dir * (waveW * 0.65), y);
  ctx.closePath();
  ctx.fillStyle = "#38bdf8";
  ctx.fill();
  // 3. Bright white-hot leading crest edge
  ctx.beginPath();
  ctx.moveTo(x + dir * (waveW * 0.6), y);
  ctx.lineTo(x + dir * (waveW * 0.3), y - waveH * 0.45);
  ctx.lineTo(x + dir * (waveW * 0.7), y - waveH * 0.75);
  ctx.lineTo(x + dir * (waveW * 0.1), y - waveH * 0.95);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.stroke();
  // 4. Trailing velocity streaks
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "rgba(186, 230, 253, 0.85)";
  ctx.beginPath();
  ctx.moveTo(x - dir * (waveW * 0.5), y - waveH * 0.25);
  ctx.lineTo(x - dir * (waveW * 1.4), y - waveH * 0.25);
  ctx.moveTo(x - dir * (waveW * 0.3), y - waveH * 0.65);
  ctx.lineTo(x - dir * (waveW * 1.1), y - waveH * 0.65);
  ctx.stroke();
  ctx.restore();
}

/**
 * Yoshi's Egg Throw projectile (WPKind.EggThrow):
 * - Proportional ~18x13 tilted egg shell
 * - Clean white/cream shell with 3D gradient
 * - Emerald green spots
 * - Aerodynamic velocity wind arcs
 */
export function drawEggThrowMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spinAngle = 0,
  dir = 1,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spinAngle * dir);
  const rx = 26;
  const ry = 19;
  // Aerodynamic wind trail arcs
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 1.35, ry * 1.35, 0, -Math.PI * 0.4, Math.PI * 0.4);
  ctx.strokeStyle = "rgba(187, 247, 208, 0.55)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Egg body 3D radial gradient
  const eggGrad = ctx.createRadialGradient(-6, -6, 4, 0, 0, rx);
  eggGrad.addColorStop(0.0, "#ffffff");
  eggGrad.addColorStop(0.65, "#f1f5f9");
  eggGrad.addColorStop(1.0, "#cbd5e1");
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = eggGrad;
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.strokeStyle = "rgba(71, 85, 105, 0.75)";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // Green spotted pattern on egg shell
  ctx.fillStyle = "#22c55e";
  const spots = [
    { x: -7, y: -6, r: 6 },
    { x: 9, y: 5, r: 5.5 },
    { x: 4, y: -7, r: 4.2 },
    { x: -10, y: 6, r: 4.5 },
    { x: 13, y: -2, r: 3.8 },
  ];
  for (const spot of spots) {
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Samus's Morph Ball Bomb (WPKind.SamusBomb):
 * - Glowing cybernetic energy sphere
 * - Rotating neon reticle rings
 * - Blinking red detonator lens
 */
export function drawSamusBombMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spinAngle = 0,
): void {
  ctx.save();
  const sbRadius = 15;
  // Glowing cyan/blue aura
  ctx.beginPath();
  ctx.arc(x, y, sbRadius * 1.35, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(6, 182, 212, 0.35)";
  ctx.shadowColor = "#06b6d4";
  ctx.shadowBlur = 14;
  ctx.fill();
  // Dark cyber-metallic chassis
  const bodyGrad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, sbRadius);
  bodyGrad.addColorStop(0.0, "#475569");
  bodyGrad.addColorStop(0.7, "#1e293b");
  bodyGrad.addColorStop(1.0, "#090d16");
  ctx.beginPath();
  ctx.arc(x, y, sbRadius, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Rotating neon crosshair / reticle
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = "#22d3ee";
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + spinAngle;
    ctx.beginPath();
    ctx.moveTo(
      x + Math.cos(a) * (sbRadius * 0.4),
      y + Math.sin(a) * (sbRadius * 0.4),
    );
    ctx.lineTo(
      x + Math.cos(a) * (sbRadius * 0.9),
      y + Math.sin(a) * (sbRadius * 0.9),
    );
    ctx.stroke();
  }
  // Blinking red detonator core
  const blink = (Math.sin(spinAngle * 4) + 1) * 0.5;
  ctx.beginPath();
  ctx.arc(x, y, sbRadius * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = blink > 0.4 ? "#ef4444" : "#991b1b";
  ctx.shadowColor = "#ef4444";
  ctx.shadowBlur = blink > 0.4 ? 10 : 0;
  ctx.fill();
  ctx.restore();
}

/**
 * 5-point golden/sparkling star for Yoshi Star (WPKind.YoshiStar) and Star Rod Star (WPKind.StarRodStar).
 */
export function drawStarProjectileMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spinAngle = 0,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spinAngle);
  const rOuter = 18;
  const rInner = 8;
  const points = 5;
  ctx.shadowColor = "#facc15";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const starGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, rOuter);
  starGrad.addColorStop(0.0, "#ffffff");
  starGrad.addColorStop(0.35, "#fef08a");
  starGrad.addColorStop(0.8, "#facc15");
  starGrad.addColorStop(1.0, "#eab308");
  ctx.fillStyle = starGrad;
  ctx.fill();
  ctx.strokeStyle = "#ca8a04";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Glitter sparks around star
  ctx.shadowBlur = 0;
  for (let s = 0; s < 3; s++) {
    const sa = (s * Math.PI * 2) / 3 + spinAngle * 1.5;
    const dist = rOuter * (1.25 + ((s * 3) % 2) * 0.2);
    ctx.beginPath();
    ctx.arc(Math.cos(sa) * dist, Math.sin(sa) * dist, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Searing green blaster energy bolt for Ray Gun bullet (WPKind.BulletNormal, BulletHard, LGunAmmo).
 */
export function drawRayGunBulletMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir = 1,
): void {
  ctx.save();
  const len = 28;
  const halfH = 3.5;
  // Glowing green aura
  ctx.beginPath();
  ctx.roundRect(
    x - (dir > 0 ? len * 0.75 : len * 0.25),
    y - halfH * 1.4,
    len,
    halfH * 2.8,
    halfH * 1.4,
  );
  ctx.fillStyle = "rgba(34, 197, 94, 0.4)";
  ctx.shadowColor = "#22c55e";
  ctx.shadowBlur = 12;
  ctx.fill();
  // Solid emerald body
  ctx.beginPath();
  ctx.roundRect(
    x - (dir > 0 ? len * 0.75 : len * 0.25),
    y - halfH,
    len,
    halfH * 2,
    halfH,
  );
  ctx.fillStyle = "#4ade80";
  ctx.fill();
  // White-hot core
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.roundRect(
    x - (dir > 0 ? (len - 6) * 0.75 : (len - 6) * 0.25),
    y - 1.2,
    len - 6,
    2.4,
    1.2,
  );
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  // Trailing sparks
  const tailX = x - dir * (len * 0.6);
  ctx.fillStyle = "#86efac";
  ctx.beginPath();
  ctx.arc(tailX - dir * 4, y, 1.5, 0, Math.PI * 2);
  ctx.arc(tailX - dir * 9, y - 1, 1.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Sector Z twin green laser cannons for ArwingLaser (WPKind.ArwingLaser2D, ArwingLaser3D).
 */
export function drawArwingLaserMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir = 1,
): void {
  ctx.save();
  const len = 38;
  const beamH = 4;
  const gap = 10;
  for (const offset of [-gap / 2, gap / 2]) {
    const by = y + offset;
    ctx.beginPath();
    ctx.roundRect(
      x - (dir > 0 ? len * 0.75 : len * 0.25),
      by - beamH / 2,
      len,
      beamH,
      beamH / 2,
    );
    ctx.fillStyle = "#22c55e";
    ctx.shadowColor = "#4ade80";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.roundRect(
      x - (dir > 0 ? (len - 8) * 0.75 : (len - 8) * 0.25),
      by - 1,
      len - 8,
      2,
      1,
    );
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Fire Flower continuous flame blast stream (WPKind.FFlowerFlame).
 */
export function drawFireFlowerFlameMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir = 1,
  spinAngle = 0,
): void {
  ctx.save();
  const puffs = [
    { dx: 0, r: 8 },
    { dx: 12, r: 13 },
    { dx: 26, r: 18 },
  ];
  for (let i = 0; i < puffs.length; i++) {
    const p = puffs[i]!;
    const px = x + dir * p.dx;
    const py = y + Math.sin(spinAngle * 2 + i) * 3;
    ctx.beginPath();
    ctx.arc(px, py, p.r, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? "#fde047" : i === 1 ? "#f97316" : "#ef4444";
    ctx.shadowColor = "#f97316";
    ctx.shadowBlur = 10;
    ctx.fill();
  }
  ctx.restore();
}
