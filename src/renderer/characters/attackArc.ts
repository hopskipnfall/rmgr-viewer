import type { AttackInfo } from "../common/index.js";
import { hexToRgba } from "../common/index.js";

export function drawAttackArc(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  color: string,
  attack: AttackInfo,
  joystick?: { x: number; y: number } | null,
  canAngle?: boolean,
): void {
  const baseRadius = Math.max(halfWidth, heightPx * 0.5);

  if (attack.type === "aerial" && attack.direction === "neutral") {
    // Nair: 360-degree sleek aerodynamic ring matching tilt stroke weight
    const radius = baseRadius * 1.55;

    ctx.beginPath();
    ctx.arc(x, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    return;
  }

  let centerAngle: number;
  if (attack.direction === "up") {
    centerAngle = -Math.PI / 2;
  } else if (attack.direction === "down") {
    centerAngle = Math.PI / 2;
  } else if (attack.direction === "back") {
    centerAngle = facingRight ? Math.PI : 0;
  } else {
    // forward
    centerAngle = facingRight ? 0 : Math.PI;
  }

  if (attack.type === "jab") {
    // Jab: small punching boxing glove appearing right in front of the character
    ctx.save();
    const dir = facingRight ? 1 : -1;
    const noseX = x + dir * halfWidth;
    const gloveW = Math.max(8, halfWidth * 0.52);
    const gloveH = Math.max(8, heightPx * 0.24);
    const gloveX = noseX + dir * Math.max(3, halfWidth * 0.18);
    const gloveY = centerY - heightPx * 0.05;

    // 1. Motion thrust speed lines behind the glove
    ctx.beginPath();
    ctx.moveTo(gloveX - dir * (gloveW * 0.5), gloveY - gloveH * 0.35);
    ctx.lineTo(gloveX - dir * (gloveW * 0.95), gloveY - gloveH * 0.35);
    ctx.moveTo(gloveX - dir * (gloveW * 0.5), gloveY + gloveH * 0.35);
    ctx.lineTo(gloveX - dir * (gloveW * 0.95), gloveY + gloveH * 0.35);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.stroke();

    // 2. White wrist cuff band
    ctx.beginPath();
    ctx.ellipse(
      gloveX - dir * (gloveW * 0.42),
      gloveY,
      Math.max(0.1, gloveW * 0.22),
      Math.max(0.1, gloveH * 0.42),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "rgba(240, 245, 255, 0.95)";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 3. Main boxing glove fist / mitten body
    ctx.beginPath();
    ctx.ellipse(
      gloveX + dir * (gloveW * 0.12),
      gloveY,
      Math.max(0.1, gloveW * 0.52),
      Math.max(0.1, gloveH * 0.48),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 4. Thumb folded on upper-front
    ctx.beginPath();
    ctx.ellipse(
      gloveX + dir * (gloveW * 0.18),
      gloveY - gloveH * 0.32,
      Math.max(0.1, gloveW * 0.28),
      Math.max(0.1, gloveH * 0.22),
      dir * 0.35,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = color;
    ctx.fill();
    ctx.stroke();

    // 5. Knuckle shine highlight
    ctx.beginPath();
    ctx.arc(
      gloveX + dir * (gloveW * 0.35),
      gloveY - gloveH * 0.15,
      Math.max(0.1, gloveH * 0.18),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx.fill();

    ctx.restore();
    return;
  }

  if (attack.type === "grab") {
    // Comically large Mickey Mouse-style cartoon gloved grabbing hand
    const dir = facingRight ? 1 : -1;
    const noseX = x + dir * halfWidth;
    const handCenterX = noseX + dir * (halfWidth * 0.45);
    const handCenterY = centerY - heightPx * 0.02;
    const handScale = Math.max(16, heightPx * 0.36);

    ctx.save();
    ctx.translate(handCenterX, handCenterY);
    if (dir < 0) {
      ctx.scale(-1, 1);
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    // 1. Puffy rolled glove wrist cuff
    ctx.beginPath();
    ctx.ellipse(
      -handScale * 0.55,
      0,
      handScale * 0.2,
      handScale * 0.42,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "rgba(15, 23, 42, 0.95)";
    ctx.lineWidth = 2.4;
    ctx.fill();
    ctx.stroke();

    // 2. Main rounded glove palm body
    ctx.beginPath();
    ctx.ellipse(
      -handScale * 0.15,
      0,
      handScale * 0.4,
      handScale * 0.4,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.stroke();

    // 3. 3 Signature dark stitch dart lines on back of glove (classic Mickey glove darts)
    ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
    ctx.lineWidth = 2.0;
    for (let i = -1; i <= 1; i++) {
      const dartY = i * (handScale * 0.15);
      ctx.beginPath();
      ctx.moveTo(-handScale * 0.32, dartY);
      ctx.lineTo(-handScale * 0.08, dartY);
      ctx.stroke();
    }

    // 4. Plump, rounded cartoon fingers reaching forward in a dynamic grab posture
    const fingers = [
      {
        startX: -handScale * 0.05,
        startY: -handScale * 0.35,
        midX: handScale * 0.4,
        midY: -handScale * 0.45,
        tipX: handScale * 0.72,
        tipY: -handScale * 0.28,
        r: handScale * 0.18,
      }, // Index
      {
        startX: handScale * 0.05,
        startY: -handScale * 0.12,
        midX: handScale * 0.52,
        midY: -handScale * 0.18,
        tipX: handScale * 0.8,
        tipY: -handScale * 0.05,
        r: handScale * 0.19,
      }, // Middle
      {
        startX: handScale * 0.02,
        startY: handScale * 0.1,
        midX: handScale * 0.48,
        midY: handScale * 0.12,
        tipX: handScale * 0.75,
        tipY: handScale * 0.18,
        r: handScale * 0.18,
      }, // Ring
      {
        startX: -handScale * 0.05,
        startY: handScale * 0.28,
        midX: handScale * 0.38,
        midY: handScale * 0.35,
        tipX: handScale * 0.65,
        tipY: handScale * 0.36,
        r: handScale * 0.16,
      }, // Pinky
    ];

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "rgba(15, 23, 42, 0.95)";
    ctx.lineWidth = 2.4;

    for (const f of fingers) {
      ctx.beginPath();
      ctx.moveTo(f.startX, f.startY);
      ctx.quadraticCurveTo(f.midX, f.midY, f.tipX, f.tipY);
      ctx.stroke();

      // Bulbous cartoon fingertip pad
      ctx.beginPath();
      ctx.arc(f.tipX, f.tipY, f.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 5. Opposing chubby cartoon thumb curling from underneath
    const thumbStartX = -handScale * 0.18;
    const thumbStartY = handScale * 0.32;
    const thumbMidX = handScale * 0.22;
    const thumbMidY = handScale * 0.52;
    const thumbTipX = handScale * 0.45;
    const thumbTipY = handScale * 0.42;

    ctx.beginPath();
    ctx.moveTo(thumbStartX, thumbStartY);
    ctx.quadraticCurveTo(thumbMidX, thumbMidY, thumbTipX, thumbTipY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(thumbTipX, thumbTipY, handScale * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 6. Accent color energy rim / grab snatch glow
    ctx.beginPath();
    ctx.arc(
      handScale * 0.35,
      0,
      handScale * 0.65,
      -Math.PI * 0.42,
      Math.PI * 0.42,
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.restore();
    return;
  }

  if (attack.type === "dash-attack") {
    // Dash Attack: dynamic low-to-ground forward sliding thrust wave with speed trails
    ctx.save();
    const dir = facingRight ? 1 : -1;
    const frontX = x + dir * (halfWidth * 1.5);
    const startX = x - dir * (halfWidth * 0.4);
    const bottomY = centerY + heightPx * 0.45;
    const midY = centerY + heightPx * 0.15;
    const topY = centerY - heightPx * 0.2;

    // 1. Triple sliding speed streak lines along the ground / lower body
    const trailLevels = [
      {
        y: bottomY,
        xStart: startX - dir * (halfWidth * 0.8),
        xEnd: frontX - dir * (halfWidth * 0.2),
        w: 2.5,
        alpha: 0.8,
      },
      {
        y: midY,
        xStart: startX - dir * (halfWidth * 0.5),
        xEnd: frontX - dir * (halfWidth * 0.4),
        w: 2.0,
        alpha: 0.65,
      },
      {
        y: topY,
        xStart: startX - dir * (halfWidth * 0.2),
        xEnd: frontX - dir * (halfWidth * 0.7),
        w: 1.5,
        alpha: 0.5,
      },
    ];

    for (const t of trailLevels) {
      ctx.beginPath();
      ctx.moveTo(t.xStart, t.y);
      ctx.lineTo(t.xEnd, t.y);
      ctx.strokeStyle = `rgba(255, 255, 255, ${t.alpha})`;
      ctx.lineWidth = t.w;
      ctx.lineCap = "round";
      ctx.stroke();

      // Outer glow on trail
      ctx.beginPath();
      ctx.moveTo(t.xStart, t.y);
      ctx.lineTo(t.xEnd, t.y);
      ctx.strokeStyle = hexToRgba(color, t.alpha * 0.6);
      ctx.lineWidth = t.w + 2;
      ctx.stroke();
    }

    // 2. Translucent forward-lunging energy wedge
    ctx.beginPath();
    ctx.moveTo(startX, bottomY);
    ctx.lineTo(frontX, midY);
    ctx.lineTo(x + dir * (halfWidth * 0.5), topY);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(color, 0.28);
    ctx.fill();

    // 3. Sharp dynamic leading slash blade (forward chevron)
    ctx.beginPath();
    ctx.moveTo(x + dir * (halfWidth * 0.5), topY);
    ctx.lineTo(frontX, midY);
    ctx.lineTo(x + dir * (halfWidth * 0.1), bottomY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4.0;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.stroke();

    // 4. White-hot leading edge core
    ctx.beginPath();
    ctx.moveTo(x + dir * (halfWidth * 0.5), topY + 2);
    ctx.lineTo(frontX - dir * 1, midY);
    ctx.lineTo(x + dir * (halfWidth * 0.1), bottomY - 1);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.restore();
    return;
  }

  // Determine stick tilt if this attack is angleable (e.g. Fox/Falcon/Samus tilt, Falcon/Samus smash)
  const rawStickY = joystick?.y ?? 0;
  const hasStickAngle = Boolean(
    canAngle && attack.direction === "forward" && Math.abs(rawStickY) > 8,
  );
  const tiltFactor = hasStickAngle
    ? Math.max(-1, Math.min(1, rawStickY / 45))
    : 0;
  // In screen coords, +Y is DOWN so stick UP (+Y) rotates counter-clockwise (-angle when facing right)
  const angleShift =
    (facingRight ? -1 : 1) * tiltFactor * ((18 * Math.PI) / 180);
  const effectiveCenter = centerAngle + angleShift;

  if (attack.type === "tilt" || attack.type === "aerial") {
    // Tilts and directional aerials: sleek, sharp aerodynamic single slash arc
    const radius = baseRadius * 1.55;
    const span = (75 * Math.PI) / 180;
    const startAngle = effectiveCenter - span / 2;
    const endAngle = effectiveCenter + span / 2;

    // Outer slash arc in player's color
    ctx.beginPath();
    ctx.arc(x, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.stroke();

    if (hasStickAngle) {
      // Angled direction is significantly brighter in the direction of the joystick
      const highlightAngle =
        effectiveCenter + (facingRight ? -1 : 1) * (tiltFactor * (span * 0.28));
      const hx = x + Math.cos(highlightAngle) * radius;
      const hy = centerY + Math.sin(highlightAngle) * radius;

      ctx.save();
      // 1. Radiant luminous glow flare centered on stick direction
      const flareGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 20);
      flareGrad.addColorStop(0, "rgba(255, 255, 255, 0.98)");
      flareGrad.addColorStop(0.35, hexToRgba(color, 0.9));
      flareGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = flareGrad;
      ctx.beginPath();
      ctx.arc(hx, hy, 20, 0, Math.PI * 2);
      ctx.fill();

      // 2. Overlaid bright white-hot arc segment along the angled section
      const hSpan = span * 0.5;
      ctx.beginPath();
      ctx.arc(
        x,
        centerY,
        radius,
        highlightAngle - hSpan / 2,
        highlightAngle + hSpan / 2,
      );
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4.2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
    } else {
      // Inner white highlight core
      ctx.beginPath();
      ctx.arc(x, centerY, radius, startAngle + 0.08, endAngle - 0.08);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  } else {
    // Smash attack: significantly larger, glowing, heavier dual-layer energy crescent
    const radiusOuter = baseRadius * 2.2;
    const radiusInner = baseRadius * 1.45;
    const span = (105 * Math.PI) / 180;
    const startAngle = effectiveCenter - span / 2;
    const endAngle = effectiveCenter + span / 2;

    // 1. Translucent energy wedge fill
    ctx.beginPath();
    ctx.arc(x, centerY, radiusOuter, startAngle, endAngle);
    ctx.arc(x, centerY, radiusInner, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(color, 0.22);
    ctx.fill();

    // 2. Heavy outer glowing impact blade
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, centerY, radiusOuter, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 5.5;
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();

    if (hasStickAngle) {
      // Angled direction is significantly brighter on the outer blade
      const highlightAngle =
        effectiveCenter + (facingRight ? -1 : 1) * (tiltFactor * (span * 0.28));
      const hx = x + Math.cos(highlightAngle) * radiusOuter;
      const hy = centerY + Math.sin(highlightAngle) * radiusOuter;

      ctx.save();
      const flareGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 24);
      flareGrad.addColorStop(0, "rgba(255, 255, 255, 0.98)");
      flareGrad.addColorStop(0.35, hexToRgba(color, 0.95));
      flareGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = flareGrad;
      ctx.beginPath();
      ctx.arc(hx, hy, 24, 0, Math.PI * 2);
      ctx.fill();

      // Intense white-hot blade overlay on that side
      const hSpan = span * 0.5;
      ctx.beginPath();
      ctx.arc(
        x,
        centerY,
        radiusOuter,
        highlightAngle - hSpan / 2,
        highlightAngle + hSpan / 2,
      );
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6.5;
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 16;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
    } else {
      // 3. Bright intense white energy core
      ctx.beginPath();
      ctx.arc(x, centerY, radiusOuter, startAngle + 0.1, endAngle - 0.1);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    // 4. Trailing inner speed line
    ctx.beginPath();
    ctx.arc(x, centerY, radiusInner, startAngle + 0.15, endAngle - 0.15);
    ctx.strokeStyle = hexToRgba(color, 0.65);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

/**
 * Visualizes Captain Falcon's signature special moves:
 * - Falcon Punch (Neutral-B): Glowing fiery energy windup & massive forward flame strike cone.
 * - Falcon Dive (Up-B): Upward-angled grab reach jaws, explosive grab catch, and blast release.
 * - Falcon Kick (Down-B): Flaming thrust trail and glowing nose flame tip.
 */
