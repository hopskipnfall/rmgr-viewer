import type { FoxSpecialType } from "../../renderer/common/index.js";

/**
 * Visualizes Fox's signature special moves:
 * - Fire Fox (Up-B): Blazing fiery launch charge aura, flame thruster cone, and forward shockwave cone.
 * - Reflector / Shine (Down-B): Luminous cyan hexagonal crystal barrier with central starburst flare.
 * - Blaster (Neutral-B): Held firearm pistol with metallic receiver, cyan energy conduit, and muzzle flash.
 *
 * Blaster laser projectile itself is handled in drawItemObjects() as WPKind.Blaster.
 */
export function drawFoxSpecial(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  _color: string,
  specialType: FoxSpecialType,
  frameCounter: number,
  flightAngle?: number | null,
): void {
  if (specialType === "firefox_charge") {
    ctx.save();
    const chargeRadius = Math.max(16, heightPx * 0.75);
    const pulse = Math.sin(frameCounter * 0.45) * 3;
    const currentRadius = chargeRadius + pulse;

    // 1. Fiery heat aura
    ctx.beginPath();
    ctx.arc(x, centerY, currentRadius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 80, 0, 0.3)";
    ctx.shadowColor = "#ff4500";
    ctx.shadowBlur = 16;
    ctx.fill();

    // 2. Radiating flame sparks / bursts
    const sparkCount = 6;
    const baseAngle = frameCounter * 0.22;
    ctx.beginPath();
    for (let i = 0; i < sparkCount; i++) {
      const ang = baseAngle + (i * Math.PI * 2) / sparkCount;
      const rInner = currentRadius * 0.65;
      const rOuter = currentRadius * (1.15 + (i % 2 === 0 ? 0.25 : 0));
      ctx.moveTo(x + Math.cos(ang) * rInner, centerY + Math.sin(ang) * rInner);
      ctx.lineTo(x + Math.cos(ang) * rOuter, centerY + Math.sin(ang) * rOuter);
    }
    ctx.strokeStyle = "#ffbb00";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();

    // 3. Central white-hot ignition core
    ctx.beginPath();
    ctx.arc(x, centerY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.restore();
    return;
  }

  if (specialType === "firefox_fly") {
    ctx.save();
    // Translate to Fox's center and rotate to align +X with flight direction on screen
    const angle =
      flightAngle !== null && flightAngle !== undefined
        ? flightAngle
        : facingRight
          ? 0
          : Math.PI;

    ctx.translate(x, centerY);
    ctx.rotate(angle);

    const flameLen = Math.max(halfWidth * 2.4, heightPx * 1.5);
    const flameWidth = Math.max(halfWidth * 1.1, heightPx * 0.5);

    // Flickering flame variations based on frameCounter
    const flick1 = Math.sin(frameCounter * 0.8) * (flameWidth * 0.15);
    const flick2 = Math.cos(frameCounter * 0.9) * (flameWidth * 0.15);
    const flickLen = Math.sin(frameCounter * 1.1) * (flameLen * 0.1);

    // 1. Outer blazing thrust flame cone pointing OPPOSITE to flight direction (-X)
    ctx.beginPath();
    ctx.moveTo(0, -flameWidth * 0.45);
    ctx.lineTo(-flameLen * 0.5, -flameWidth * 0.65 + flick1);
    ctx.lineTo(-(flameLen + flickLen), 0); // Main apex exhaust flame tip
    ctx.lineTo(-flameLen * 0.5, flameWidth * 0.65 + flick2);
    ctx.lineTo(0, flameWidth * 0.45);
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 69, 0, 0.75)";
    ctx.shadowColor = "#ff4500";
    ctx.shadowBlur = 14;
    ctx.fill();

    // 2. Mid golden-yellow flame body
    ctx.beginPath();
    ctx.moveTo(0, -flameWidth * 0.3);
    ctx.lineTo(-flameLen * 0.4, -flameWidth * 0.45 - flick2);
    ctx.lineTo(-(flameLen * 0.75 + flickLen * 0.5), 0);
    ctx.lineTo(-flameLen * 0.4, flameWidth * 0.45 - flick1);
    ctx.lineTo(0, flameWidth * 0.3);
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 204, 0, 0.9)";
    ctx.fill();

    // 3. Inner intense white-hot thrust core
    ctx.beginPath();
    ctx.moveTo(0, -flameWidth * 0.15);
    ctx.lineTo(-flameLen * 0.35, 0);
    ctx.lineTo(0, flameWidth * 0.15);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // 4. Forward aerodynamic shock cone enveloping Fox's front in flight (+X)
    ctx.beginPath();
    ctx.moveTo(-flameWidth * 0.2, -flameWidth * 0.5);
    ctx.lineTo(halfWidth * 1.1, 0);
    ctx.lineTo(-flameWidth * 0.2, flameWidth * 0.5);
    ctx.strokeStyle = "rgba(255, 220, 100, 0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
    return;
  }

  if (specialType === "firefox_end") {
    // Lingering smoke / ember ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, centerY, 12, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 120, 0, 0.35)";
    ctx.fill();
    ctx.restore();
    return;
  }

  if (
    specialType === "shine_start" ||
    specialType === "shine_loop" ||
    specialType === "shine_hit" ||
    specialType === "shine_end"
  ) {
    ctx.save();
    const radius = Math.max(16, heightPx * 0.85);

    // Compute regular hexagon vertices
    const hexPoints: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 6; i++) {
      const theta = (i * Math.PI) / 3 - Math.PI / 6;
      hexPoints.push({
        x: x + Math.cos(theta) * radius,
        y: centerY + Math.sin(theta) * radius,
      });
    }

    // 1. Semi-transparent luminous cyan crystal fill
    ctx.beginPath();
    ctx.moveTo(hexPoints[0]!.x, hexPoints[0]!.y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(hexPoints[i]!.x, hexPoints[i]!.y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(0, 220, 255, 0.22)";
    ctx.shadowColor = "#00d4ff";
    ctx.shadowBlur = 12;
    ctx.fill();

    // 2. Radiant cyan hexagon border
    ctx.strokeStyle = "rgba(0, 240, 255, 0.95)";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3. Inner crystal facet lines (connecting center to each vertex)
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      ctx.moveTo(x, centerY);
      ctx.lineTo(hexPoints[i]!.x, hexPoints[i]!.y);
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4. Central starburst / flare spark on startup or hit
    const isStartOrHit =
      specialType === "shine_start" ||
      specialType === "shine_hit" ||
      frameCounter < 4;

    if (isStartOrHit) {
      // Bright 4-point starburst flare
      const flareSize = radius * 0.8;
      ctx.beginPath();
      ctx.moveTo(x - flareSize, centerY);
      ctx.quadraticCurveTo(x, centerY, x, centerY - flareSize);
      ctx.quadraticCurveTo(x, centerY, x + flareSize, centerY);
      ctx.quadraticCurveTo(x, centerY, x, centerY + flareSize);
      ctx.quadraticCurveTo(x, centerY, x - flareSize, centerY);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 16;
      ctx.fill();
    } else {
      // Subtle central diamond core
      const coreSize = 4;
      ctx.beginPath();
      ctx.moveTo(x - coreSize, centerY);
      ctx.lineTo(x, centerY - coreSize);
      ctx.lineTo(x + coreSize, centerY);
      ctx.lineTo(x, centerY + coreSize);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  if (specialType === "blaster_gun") {
    ctx.save();
    const dir = facingRight ? 1 : -1;
    const noseX = x + dir * halfWidth;
    const gunY = centerY + heightPx * 0.05;

    // 1. Fox's outstretched arm / glove reaching into the gun grip
    ctx.beginPath();
    ctx.moveTo(noseX - dir * 4, gunY);
    ctx.lineTo(noseX + dir * 6, gunY);
    ctx.strokeStyle = "#e2e8f0"; // white glove / uniform sleeve
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.stroke();

    // 2. Pistol grip (angled downward)
    ctx.beginPath();
    ctx.moveTo(noseX + dir * 6, gunY);
    ctx.lineTo(noseX + dir * 3, gunY + 7);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3.0;
    ctx.lineCap = "round";
    ctx.stroke();

    // 3. Sci-fi Blaster receiver & barrel (silver/gunmetal body)
    const barrelStartX = noseX + dir * 4;
    const barrelLen = 14;
    const barrelEndX = barrelStartX + dir * barrelLen;

    // Main metallic blaster receiver
    ctx.beginPath();
    ctx.roundRect(
      dir > 0 ? barrelStartX : barrelStartX - barrelLen,
      gunY - 3.5,
      barrelLen,
      7,
      2,
    );
    ctx.fillStyle = "#334155";
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 1.2;
    ctx.fill();
    ctx.stroke();

    // 4. Cyan plasma energy power cell / glowing conduit along the side
    ctx.beginPath();
    ctx.moveTo(barrelStartX + dir * 2, gunY);
    ctx.lineTo(barrelEndX - dir * 3, gunY);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 5. Top scope / red targeting sensor light
    ctx.beginPath();
    ctx.arc(barrelStartX + dir * 4, gunY - 4.5, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ef4444";
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 4;
    ctx.fill();

    // 6. Muzzle tip and small firing spark
    ctx.beginPath();
    ctx.arc(barrelEndX, gunY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#f8fafc";
    ctx.fill();

    // Pulsing muzzle flare flash at barrel tip during active shots
    const flashSize = 4 + (frameCounter % 3);
    ctx.beginPath();
    ctx.arc(barrelEndX + dir * 2, gunY, flashSize, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 68, 68, 0.4)";
    ctx.shadowColor = "#ff2222";
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(barrelEndX + dir * 2, gunY, flashSize * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.restore();
    return;
  }
}
