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
  actionFrameCounter?: number,
): void {
  const frame = actionFrameCounter !== undefined ? actionFrameCounter : 7;
  const baseRadius = Math.max(halfWidth, heightPx * 0.5);

  if (attack.type === "aerial" && attack.direction === "neutral") {
    // Nair: 360-degree expanding aerodynamic ring with concentric trailing echo ripple
    // Outward expansion in frames 0-6 (7 frames of travel), then sustained at peak reach with energized shimmer
    const progress = Math.min(1.0, (frame + 1) / 7);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const startRadius = baseRadius * 0.75;
    const peakRadius = baseRadius * 1.8;
    const currentRadius = startRadius + (peakRadius - startRadius) * easeOut;
    const pulse =
      frame >= 7 ? Math.sin((frame - 7) * 0.45) * (baseRadius * 0.035) : 0;
    const radius = currentRadius + pulse;

    // Concentric trailing ripple ring (expanding behind the main wave)
    const echoRadius = Math.max(baseRadius * 0.7, radius * 0.82);
    ctx.beginPath();
    ctx.arc(x, centerY, echoRadius, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(color, 0.45);
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Primary aerodynamic ring in port color with energetic glow
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4.2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();

    // Crisp white-hot inner core
    ctx.beginPath();
    ctx.arc(x, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.88)";
    ctx.lineWidth = 2.0;
    ctx.stroke();
    return;
  }

  if (attack.type === "getup-attack") {
    // Missed-Tech Ground Get-Up Attack:
    // Low sweeping twin scythes along the stage floor hitting front and back,
    // with surface friction streaks, expanding energy ripples, and energetic sparks.
    ctx.save();
    const dir = facingRight ? 1 : -1;
    const floorY = centerY + heightPx * 0.48; // Stage floor contact
    const sweepRadius = Math.max(halfWidth * 1.5, heightPx * 0.7);

    // Front sweep: active on early frames (frames 0..15)
    // Back sweep: active on middle frames (frames 4..19)
    const frontActive = frame >= 0 && frame <= 15;
    const backActive = frame >= 4 && frame <= 19;

    // 1. Ground contact shockwave ring (flat horizontal ellipse on stage floor)
    const ringProgress = Math.min(1.0, (frame + 1) / 14);
    const ringAlpha = Math.max(0, 1 - ringProgress);
    if (ringAlpha > 0.05) {
      ctx.beginPath();
      ctx.ellipse(
        x,
        floorY,
        sweepRadius * (0.6 + 0.8 * ringProgress),
        Math.max(3, heightPx * 0.12 * (0.6 + 0.8 * ringProgress)),
        0,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = hexToRgba(color, 0.4 * ringAlpha);
      ctx.lineWidth = 2.0;
      ctx.stroke();
    }

    // 2. Front low-sweeping blade crescent (hits front first in N64)
    if (frontActive) {
      const frontProgress = Math.min(1.0, (frame + 1) / 7);
      const frontEase = 1 - Math.pow(1 - frontProgress, 3);
      const rFront = sweepRadius * (0.7 + 0.5 * frontEase);
      const frontSpan = (70 * Math.PI) / 180;
      const fCenter = facingRight
        ? (30 * Math.PI) / 180
        : (150 * Math.PI) / 180;
      const fStart = fCenter - frontSpan / 2;
      const fEnd = fCenter + frontSpan / 2;

      // Trailing speed echo
      ctx.beginPath();
      ctx.arc(x, centerY + heightPx * 0.15, rFront * 0.82, fStart, fEnd);
      ctx.strokeStyle = hexToRgba(color, 0.4);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.stroke();

      // Outer energetic cutting blade
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, centerY + heightPx * 0.15, rFront, fStart, fEnd);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4.2;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();

      // White-hot core
      ctx.beginPath();
      ctx.arc(x, centerY + heightPx * 0.15, rFront, fStart + 0.08, fEnd - 0.08);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
      ctx.lineWidth = 1.8;
      ctx.lineCap = "round";
      ctx.stroke();

      // Floor friction streak in front
      const streakLen = rFront * 0.6;
      ctx.beginPath();
      ctx.moveTo(x + dir * (halfWidth * 0.5), floorY);
      ctx.lineTo(x + dir * (halfWidth * 0.5 + streakLen), floorY);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    // 3. Back low-sweeping blade crescent (sweeps behind on frames 4..19)
    if (backActive) {
      const backProgress = Math.min(1.0, (frame - 3) / 7);
      const backEase = 1 - Math.pow(1 - backProgress, 3);
      const rBack = sweepRadius * (0.65 + 0.45 * backEase);
      const backSpan = (65 * Math.PI) / 180;
      const bCenter = facingRight
        ? (150 * Math.PI) / 180
        : (30 * Math.PI) / 180;
      const bStart = bCenter - backSpan / 2;
      const bEnd = bCenter + backSpan / 2;

      // Trailing speed echo
      ctx.beginPath();
      ctx.arc(x, centerY + heightPx * 0.15, rBack * 0.82, bStart, bEnd);
      ctx.strokeStyle = hexToRgba(color, 0.4);
      ctx.lineWidth = 2.0;
      ctx.lineCap = "round";
      ctx.stroke();

      // Outer energetic cutting blade
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, centerY + heightPx * 0.15, rBack, bStart, bEnd);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4.0;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();

      // White-hot core
      ctx.beginPath();
      ctx.arc(x, centerY + heightPx * 0.15, rBack, bStart + 0.08, bEnd - 0.08);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 1.8;
      ctx.lineCap = "round";
      ctx.stroke();

      // Floor friction streak behind
      const streakLen = rBack * 0.55;
      ctx.beginPath();
      ctx.moveTo(x - dir * (halfWidth * 0.4), floorY);
      ctx.lineTo(x - dir * (halfWidth * 0.4 + streakLen), floorY);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    // 4. Upward friction sparks from floor during active sweep frames
    if (frame >= 2 && frame <= 14) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      const sparkDir = frame < 8 ? dir : -dir;
      const sparkOriginX = x + sparkDir * (halfWidth * 0.9);
      for (let i = 0; i < 3; i++) {
        const sx = sparkOriginX + sparkDir * (i * 5);
        const sy = floorY;
        const sparkAngle =
          (sparkDir > 0 ? -1 : 1) * (0.35 + i * 0.25) - Math.PI / 2;
        const len = 6 + i * 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(
          sx + Math.cos(sparkAngle) * len,
          sy + Math.sin(sparkAngle) * len,
        );
        ctx.stroke();
      }
    }

    ctx.restore();
    return;
  }

  if (attack.type === "ledge-attack") {
    // Ledge Attack:
    // Vaulting upward-and-forward slash cutting from the ledge lip onto the stage platform.
    // Quick (<100%): agile, razor-sharp rising crescent with forward kinetic trails.
    // Slow (>=100%): heavier dual-layer concussive crescent with windup pulse.
    ctx.save();
    const isSlow = attack.subType === "slow";
    const sweepRadius = Math.max(halfWidth * 1.6, heightPx * 0.8);

    // Timing & animation progress
    const startupFrames = isSlow ? 4 : 2;
    const activeFrames = isSlow ? 12 : 8;
    const surgeProgress = Math.min(
      1.0,
      Math.max(0, frame - startupFrames + 1) / (activeFrames - startupFrames),
    );
    const surgeEase = 1 - Math.pow(1 - surgeProgress, 3);

    // Rising cutting blade arc:
    // Sweeping from below/at ledge lip upwards and into stage
    const arcRadius = sweepRadius * (0.8 + 0.45 * surgeEase);
    const centerAngle = facingRight ? -Math.PI * 0.2 : -Math.PI * 0.8;
    const span = ((isSlow ? 100 : 85) * Math.PI) / 180;
    const startAngle = centerAngle - span / 2;
    const endAngle = centerAngle + span / 2;

    if (isSlow) {
      // Heavy dual-layer wedge fill
      const innerRadius = arcRadius * 0.68;
      ctx.beginPath();
      ctx.arc(x, centerY, arcRadius, startAngle, endAngle);
      ctx.arc(x, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = hexToRgba(color, 0.25);
      ctx.fill();

      // Heavy outer impact blade
      ctx.beginPath();
      ctx.arc(x, centerY, arcRadius, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 5.2;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.stroke();

      // White-hot core
      ctx.beginPath();
      ctx.arc(x, centerY, arcRadius, startAngle + 0.1, endAngle - 0.1);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.stroke();

      // Concussive impact burst sparks at crest of blade on active frames
      if (frame >= 4 && frame <= 14) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 2.0;
        ctx.lineCap = "round";
        const sparkAngle = centerAngle;
        const sx1 = x + Math.cos(sparkAngle) * arcRadius;
        const sy1 = centerY + Math.sin(sparkAngle) * arcRadius;
        const sx2 = x + Math.cos(sparkAngle) * (arcRadius + 14);
        const sy2 = centerY + Math.sin(sparkAngle) * (arcRadius + 14);
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();
      }
    } else {
      // Quick agile slash:
      // Trailing speed echo
      ctx.beginPath();
      ctx.arc(x, centerY, arcRadius * 0.82, startAngle + 0.06, endAngle - 0.06);
      ctx.strokeStyle = hexToRgba(color, 0.45);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.stroke();

      // Outer glowing blade
      ctx.beginPath();
      ctx.arc(x, centerY, arcRadius, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4.2;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.stroke();

      // White-hot inner core
      ctx.beginPath();
      ctx.arc(x, centerY, arcRadius, startAngle + 0.08, endAngle - 0.08);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
      ctx.lineWidth = 2.0;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    ctx.restore();
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

  if (attack.type === "aerial") {
    // Directional aerial attacks (Fair, Bair, Uair, Dair):
    // Fast, agile, aerodynamic razor slash with expansive 7-frame outward sweep and glowing trail
    const progress = Math.min(1.0, (frame + 1) / 7);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const startRadius = baseRadius * 0.75;
    const peakRadius = baseRadius * 1.85;
    const currentRadius = startRadius + (peakRadius - startRadius) * easeOut;
    // Subtle energized shimmer once at peak (persists for entire duration of aerial state)
    const pulse =
      frame >= 7 ? Math.sin((frame - 7) * 0.4) * (baseRadius * 0.035) : 0;
    const radius = currentRadius + pulse;

    const span = (85 * Math.PI) / 180;
    const startAngle = effectiveCenter - span / 2;
    const endAngle = effectiveCenter + span / 2;

    // 1. Trailing speed echo arc (wind smear behind the nimble razor slash)
    const echoRadius = Math.max(baseRadius * 0.7, radius * 0.82);
    ctx.beginPath();
    ctx.arc(x, centerY, echoRadius, startAngle + 0.08, endAngle - 0.08);
    ctx.strokeStyle = hexToRgba(color, 0.5);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.stroke();

    // 2. Primary outer slash arc in player color with vivid energetic glow
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4.2;
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();

    if (hasStickAngle) {
      // Angled direction is significantly brighter in the direction of the joystick
      const highlightAngle =
        effectiveCenter + (facingRight ? -1 : 1) * (tiltFactor * (span * 0.28));
      const hx = x + Math.cos(highlightAngle) * radius;
      const hy = centerY + Math.sin(highlightAngle) * radius;

      ctx.save();
      const flareGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 22);
      flareGrad.addColorStop(0, "rgba(255, 255, 255, 0.98)");
      flareGrad.addColorStop(0.35, hexToRgba(color, 0.92));
      flareGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = flareGrad;
      ctx.beginPath();
      ctx.arc(hx, hy, 22, 0, Math.PI * 2);
      ctx.fill();

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
      ctx.lineWidth = 4.8;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
    } else {
      // 3. Inner white highlight core
      ctx.beginPath();
      ctx.arc(x, centerY, radius, startAngle + 0.08, endAngle - 0.08);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.88)";
      ctx.lineWidth = 2.0;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  } else if (attack.type === "smash") {
    // Smash attack: slow, heavy, massive dual-layer energy crescent with concussive power
    // Multi-phase animation:
    // - Gather phase (frame < 3): dense compact crescent close to body
    // - Concussive surge phase (frame 3..8): expands heavily outward to peak reach
    // - Sustained impact / recovery phase (frame >= 9): holds full wide crescent throughout endlag
    let radiusOuter: number;
    let radiusInner: number;

    if (frame < 3) {
      // Energy gather close to fighter
      radiusOuter = baseRadius * (1.25 + frame * 0.08);
      radiusInner = baseRadius * 0.95;
    } else if (frame <= 8) {
      // Heavy concussive outward expansion
      const surgeProgress = Math.min(1.0, (frame - 2) / 6);
      const surgeEase = 1 - Math.pow(1 - surgeProgress, 3);
      radiusOuter = baseRadius * (1.45 + 0.85 * surgeEase);
      radiusInner = baseRadius * (1.05 + 0.45 * surgeEase);
    } else {
      // Sustained power holding peak reach until smash state finishes
      const deepHum = Math.sin((frame - 8) * 0.3) * (baseRadius * 0.02);
      radiusOuter = baseRadius * 2.3 + deepHum;
      radiusInner = baseRadius * 1.5 + deepHum * 0.5;
    }

    const span = (110 * Math.PI) / 180;
    const startAngle = effectiveCenter - span / 2;
    const endAngle = effectiveCenter + span / 2;

    // 1. Translucent energy wedge fill
    ctx.beginPath();
    ctx.arc(x, centerY, radiusOuter, startAngle, endAngle);
    ctx.arc(x, centerY, radiusInner, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(color, 0.28);
    ctx.fill();

    // 2. Heavy outer glowing impact blade
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, centerY, radiusOuter, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 5.5;
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
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
      ctx.lineWidth = 2.4;
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

    // 5. Concussive radial impact sparks during active impact frames
    if (frame >= 3 && frame <= 14) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 2.0;
      ctx.lineCap = "round";
      const sparkAngles = [
        effectiveCenter - span * 0.35,
        effectiveCenter,
        effectiveCenter + span * 0.35,
      ];
      const sparkLen = baseRadius * 0.22;
      for (const sa of sparkAngles) {
        const sx1 = x + Math.cos(sa) * radiusOuter;
        const sy1 = centerY + Math.sin(sa) * radiusOuter;
        const sx2 = x + Math.cos(sa) * (radiusOuter + sparkLen);
        const sy2 = centerY + Math.sin(sa) * (radiusOuter + sparkLen);
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();
      }
      ctx.restore();
    }
  } else {
    // Grounded Tilts: crisp, sharp direct slash arc with 7-frame outward sweep and trailing echo
    const progress = Math.min(1.0, (frame + 1) / 7);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const startRadius = baseRadius * 0.7;
    const peakRadius = baseRadius * 1.7;
    const radius = startRadius + (peakRadius - startRadius) * easeOut;
    const pulse =
      frame >= 7 ? Math.sin((frame - 7) * 0.35) * (baseRadius * 0.025) : 0;
    const effectiveRadius = radius + pulse;

    const span = (82 * Math.PI) / 180;
    const startAngle = effectiveCenter - span / 2;
    const endAngle = effectiveCenter + span / 2;

    // 1. Trailing speed echo arc
    const echoRadius = Math.max(baseRadius * 0.65, effectiveRadius * 0.82);
    ctx.beginPath();
    ctx.arc(x, centerY, echoRadius, startAngle + 0.08, endAngle - 0.08);
    ctx.strokeStyle = hexToRgba(color, 0.45);
    ctx.lineWidth = 2.0;
    ctx.lineCap = "round";
    ctx.stroke();

    // 2. Outer slash arc in player's color with glowing edge
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, centerY, effectiveRadius, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4.0;
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();

    if (hasStickAngle) {
      // Angled direction is significantly brighter in the direction of the joystick
      const highlightAngle =
        effectiveCenter + (facingRight ? -1 : 1) * (tiltFactor * (span * 0.28));
      const hx = x + Math.cos(highlightAngle) * effectiveRadius;
      const hy = centerY + Math.sin(highlightAngle) * effectiveRadius;

      ctx.save();
      const flareGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 20);
      flareGrad.addColorStop(0, "rgba(255, 255, 255, 0.98)");
      flareGrad.addColorStop(0.35, hexToRgba(color, 0.9));
      flareGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = flareGrad;
      ctx.beginPath();
      ctx.arc(hx, hy, 20, 0, Math.PI * 2);
      ctx.fill();

      const hSpan = span * 0.5;
      ctx.beginPath();
      ctx.arc(
        x,
        centerY,
        effectiveRadius,
        highlightAngle - hSpan / 2,
        highlightAngle + hSpan / 2,
      );
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4.4;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
    } else {
      // 3. Inner white highlight core
      ctx.beginPath();
      ctx.arc(x, centerY, effectiveRadius, startAngle + 0.08, endAngle - 0.08);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1.8;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }
}

/**
 * Visualizes Captain Falcon's signature special moves:
 * - Falcon Punch (Neutral-B): Glowing fiery energy windup & massive forward flame strike cone.
 * - Falcon Dive (Up-B): Upward-angled grab reach jaws, explosive grab catch, and blast release.
 * - Falcon Kick (Down-B): Flaming thrust trail and glowing nose flame tip.
 */
