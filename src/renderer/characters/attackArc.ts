import type { AttackInfo } from "../common/index.js";
import {
  hexToRgba,
  isSamusCharacter,
  isLinkCharacter,
  isYoshiCharacter,
} from "../common/index.js";

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
  characterId?: number,
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
    if (characterId !== undefined && isSamusCharacter(characterId)) {
      drawSamusGrappleBeam(
        ctx,
        x,
        centerY,
        halfWidth,
        heightPx,
        facingRight,
        color,
        actionFrameCounter,
      );
      return;
    }
    if (characterId !== undefined && isLinkCharacter(characterId)) {
      drawLinkHookshot(
        ctx,
        x,
        centerY,
        halfWidth,
        heightPx,
        facingRight,
        color,
        actionFrameCounter,
      );
      return;
    }
    if (characterId !== undefined && isYoshiCharacter(characterId)) {
      drawYoshiTongueGrab(
        ctx,
        x,
        centerY,
        halfWidth,
        heightPx,
        facingRight,
        color,
        actionFrameCounter,
      );
      return;
    }

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
    // Dash Attack: dynamic sweeping ground-slide crescent wave with billowing slide dust & kinetic sparks
    ctx.save();
    const dir = facingRight ? 1 : -1;
    const floorY = centerY + heightPx * 0.48; // Stage floor contact level
    const progress = Math.min(1.0, (frame + 1) / 10);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const fadeOut = frame > 12 ? Math.max(0, 1 - (frame - 12) / 14) : 1.0;

    if (fadeOut <= 0) {
      ctx.restore();
      return;
    }

    // 1. Billowing ground slide friction dust plumes behind sliding feet
    const dustPuffs = [
      { offsetDist: halfWidth * 0.7, r: 4.5, yOff: -3, alphaMul: 0.7 },
      {
        offsetDist: halfWidth * 1.1 + progress * 6,
        r: 3.5,
        yOff: -5,
        alphaMul: 0.55,
      },
      {
        offsetDist: halfWidth * 1.5 + progress * 10,
        r: 2.5,
        yOff: -6,
        alphaMul: 0.4,
      },
    ];
    for (const puff of dustPuffs) {
      const px = x - dir * puff.offsetDist;
      const py = floorY + puff.yOff;
      ctx.beginPath();
      ctx.arc(px, py, puff.r, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba("#e2e8f0", puff.alphaMul * fadeOut);
      ctx.fill();
    }

    // 2. Trailing curved kinetic speed ribbons (aerodynamic slipstream along the slide path)
    const slipstreams = [
      { yRatio: 0.42, startOff: -0.9, endOff: 0.6, w: 2.4, alpha: 0.65 },
      { yRatio: 0.15, startOff: -0.6, endOff: 1.1, w: 1.8, alpha: 0.5 },
      { yRatio: -0.15, startOff: -0.3, endOff: 0.8, w: 1.4, alpha: 0.35 },
    ];
    for (const s of slipstreams) {
      const sy = centerY + heightPx * s.yRatio;
      const sx = x + dir * (halfWidth * s.startOff);
      const ex = x + dir * (halfWidth * (s.endOff * easeOut));
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo((sx + ex) / 2, sy - 2, ex, sy);
      ctx.strokeStyle = hexToRgba(color, s.alpha * fadeOut);
      ctx.lineWidth = s.w;
      ctx.lineCap = "round";
      ctx.stroke();

      // White core on lowest / main friction streak
      if (s.w > 2) {
        ctx.beginPath();
        ctx.moveTo(sx + dir * 4, sy);
        ctx.lineTo(ex - dir * 2, sy);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 * fadeOut})`;
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }
    }

    // 3. Sweeping ground-slide crescent wave (expansive forward curved cutting blade)
    // Starts near the sliding base on the stage floor, arcs forward and swoops upward
    const reachX = halfWidth * (1.2 + 0.7 * easeOut);
    const tipX = x + dir * reachX;
    const tipY = centerY - heightPx * 0.12;
    const baseFloorX = x + dir * (halfWidth * 0.2);
    const baseFloorY = floorY - 2;
    const tailX = x - dir * (halfWidth * 0.4);
    const tailY = floorY - heightPx * 0.18;

    // Translucent crescent body fill
    ctx.beginPath();
    ctx.moveTo(baseFloorX, baseFloorY);
    // Outer leading edge curve: sweeps from floor up to the forward tip
    ctx.bezierCurveTo(
      x + dir * (reachX * 0.7),
      floorY + 2,
      tipX + dir * 6,
      centerY + heightPx * 0.2,
      tipX,
      tipY,
    );
    // Inner trailing edge curve: scoops back inward to the tail
    ctx.bezierCurveTo(
      x + dir * (reachX * 0.4),
      centerY + heightPx * 0.05,
      tailX + dir * (halfWidth * 0.3),
      floorY - heightPx * 0.1,
      tailX,
      tailY,
    );
    // Close base back to baseFloorX
    ctx.quadraticCurveTo(
      (tailX + baseFloorX) / 2,
      floorY,
      baseFloorX,
      baseFloorY,
    );
    ctx.closePath();
    ctx.fillStyle = hexToRgba(color, 0.28 * fadeOut);
    ctx.fill();

    // 4. Vibrant outer cutting blade stroke along the leading edge
    ctx.beginPath();
    ctx.moveTo(baseFloorX, baseFloorY);
    ctx.bezierCurveTo(
      x + dir * (reachX * 0.7),
      floorY + 2,
      tipX + dir * 6,
      centerY + heightPx * 0.2,
      tipX,
      tipY,
    );
    ctx.strokeStyle = hexToRgba(color, 0.9 * fadeOut);
    ctx.lineWidth = 3.8;
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.stroke();

    // 5. White-hot leading razor edge core
    ctx.beginPath();
    ctx.moveTo(baseFloorX + dir * 2, baseFloorY - 1);
    ctx.bezierCurveTo(
      x + dir * (reachX * 0.7),
      floorY,
      tipX + dir * 4,
      centerY + heightPx * 0.2,
      tipX - dir * 1,
      tipY + 1,
    );
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * fadeOut})`;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 6. Kinetic impact sparks leaping from the floor strike zone
    const sparkCount = 4;
    for (let i = 0; i < sparkCount; i++) {
      const sparkT = (i + 1) / (sparkCount + 1);
      const sparkX =
        tipX * sparkT +
        (baseFloorX + dir * (halfWidth * 0.6)) * (1 - sparkT) +
        dir * (i * 3 * easeOut);
      const sparkY =
        tipY * sparkT + baseFloorY * (1 - sparkT) - (i % 2 === 0 ? 4 : -2);
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * fadeOut})`;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.fill();
    }

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
 * Renders Samus's iconic Grapple Beam: an extended, slower electric plasma chain
 * emitted from her arm cannon featuring an energy corona, segmented plasma nodes,
 * crackling electric arcing, and a tripartite magnetic capture claw.
 */
export function drawSamusGrappleBeam(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  color: string,
  actionFrameCounter?: number,
): void {
  const dir = facingRight ? 1 : -1;
  const originX = x + dir * (halfWidth * 0.95);
  const originY = centerY - heightPx * 0.04;
  const frame = actionFrameCounter !== undefined ? actionFrameCounter : 22;

  // Slower, extended reach: extends out smoothly, dwells at peak, then retracts
  const maxReach = Math.max(halfWidth * 5.0, heightPx * 2.2) * 0.7;
  let reachProgress: number;
  if (actionFrameCounter === undefined) {
    reachProgress = 1.0;
  } else if (frame < 6) {
    reachProgress = 0.15 + 0.15 * (frame / 6);
  } else if (frame <= 22) {
    const t = (frame - 6) / 16;
    reachProgress = 0.3 + 0.7 * (1 - Math.pow(1 - t, 2));
  } else if (frame <= 32) {
    reachProgress = 1.0;
  } else {
    const t = Math.min(1.0, (frame - 32) / 28);
    reachProgress = Math.max(0.2, 1.0 - t * 0.8);
  }

  const reach = maxReach * reachProgress;
  const tipX = originX + dir * reach;
  const tipY = originY;

  ctx.save();

  // 1. Arm cannon muzzle flare & energy corona
  const coronaR = Math.max(6, heightPx * 0.14);
  const muzzleGrad = ctx.createRadialGradient(
    originX,
    originY,
    1,
    originX,
    originY,
    coronaR,
  );
  muzzleGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  muzzleGrad.addColorStop(0.4, "rgba(56, 189, 248, 0.85)");
  muzzleGrad.addColorStop(1, "rgba(14, 165, 233, 0)");
  ctx.beginPath();
  ctx.arc(originX, originY, coronaR, 0, Math.PI * 2);
  ctx.fillStyle = muzzleGrad;
  ctx.fill();

  // 2. High-voltage plasma beam core line
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(tipX, tipY);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
  ctx.lineWidth = 5.0;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(tipX, tipY);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.0;
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.restore();

  // 3. Segmented diamond plasma chain nodes along the beam
  const linkDist = 13;
  const numLinks = Math.max(3, Math.floor(reach / linkDist));
  for (let i = 1; i <= numLinks; i++) {
    const t = i / (numLinks + 1);
    const nodeX = originX + dir * (reach * t);
    // Subtle electric vibration
    const jitter = Math.sin(frame * 0.65 + i * 1.4) * 2.2;
    const nodeY = originY + jitter;

    // Diamond energy link node
    ctx.save();
    ctx.translate(nodeX, nodeY);
    ctx.rotate(Math.PI / 4);

    ctx.beginPath();
    ctx.rect(-3.5, -3.5, 7, 7);
    ctx.fillStyle = "#38bdf8";
    ctx.shadowColor = "#0284c7";
    ctx.shadowBlur = 6;
    ctx.fill();

    ctx.beginPath();
    ctx.rect(-1.8, -1.8, 3.6, 3.6);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    // Occasional transverse electric spark
    if (i % 2 === 0) {
      const sparkDir = i % 4 === 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(nodeX, nodeY);
      ctx.lineTo(nodeX + dir * 3, nodeY + sparkDir * 6);
      ctx.lineTo(nodeX + dir * 7, nodeY + sparkDir * 3);
      ctx.strokeStyle = "rgba(224, 242, 254, 0.85)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }

  // 4. Tripartite electric grapple capture claw at the tip
  ctx.save();
  ctx.translate(tipX, tipY);
  if (dir < 0) {
    ctx.scale(-1, 1);
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Central emitter node
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = "#38bdf8";
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Upper claw prong curving forward and inward
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.quadraticCurveTo(6, -11, 15, -7);
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.8;
  ctx.shadowColor = "#0284c7";
  ctx.shadowBlur = 6;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(1, -3);
  ctx.quadraticCurveTo(6, -10, 14, -7);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Lower claw prong curving forward and inward
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.quadraticCurveTo(6, 11, 15, 7);
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.8;
  ctx.shadowColor = "#0284c7";
  ctx.shadowBlur = 6;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(1, 3);
  ctx.quadraticCurveTo(6, 10, 14, 7);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Center capture probe
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.lineTo(13, 0);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Energetic magnetic capture field arc connecting upper and lower claw tips
  const pulseField = Math.sin(frame * 0.7) * 2;
  ctx.beginPath();
  ctx.arc(8, 0, 10 + pulseField, -Math.PI * 0.38, Math.PI * 0.38, false);
  ctx.strokeStyle = "rgba(103, 232, 249, 0.9)";
  ctx.lineWidth = 1.8;
  ctx.shadowColor = "#67e8f9";
  ctx.shadowBlur = 8;
  ctx.stroke();

  // Accent port color aura
  ctx.beginPath();
  ctx.arc(6, 0, 14, -Math.PI * 0.45, Math.PI * 0.45, false);
  ctx.strokeStyle = hexToRgba(color, 0.85);
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}

/**
 * Renders Link's iconic Hookshot: an extended, slower heavy mechanical chain
 * grapple with alternating flat oval and edge-on steel links, launcher spool housing,
 * and a barbed triangular arrowhead spear tip.
 */
export function drawLinkHookshot(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  color: string,
  actionFrameCounter?: number,
): void {
  const dir = facingRight ? 1 : -1;
  const originX = x + dir * (halfWidth * 0.85);
  const originY = centerY - heightPx * 0.02;
  const frame = actionFrameCounter !== undefined ? actionFrameCounter : 22;

  // Slower, extended reach: unspools outward, holds at apex, then retracts
  const maxReach = Math.max(halfWidth * 4.6, heightPx * 2.0) * 0.7;
  let reachProgress: number;
  if (actionFrameCounter === undefined) {
    reachProgress = 1.0;
  } else if (frame < 5) {
    reachProgress = 0.15 + 0.15 * (frame / 5);
  } else if (frame <= 20) {
    const t = (frame - 5) / 15;
    reachProgress = 0.3 + 0.7 * (1 - Math.pow(1 - t, 2));
  } else if (frame <= 30) {
    reachProgress = 1.0;
  } else {
    const t = Math.min(1.0, (frame - 30) / 25);
    reachProgress = Math.max(0.2, 1.0 - t * 0.8);
  }

  const reach = maxReach * reachProgress;
  const tipX = originX + dir * reach;
  const tipY = originY;

  ctx.save();

  // 1. Hookshot launcher barrel / spool housing
  ctx.save();
  ctx.translate(originX, originY);
  if (dir < 0) {
    ctx.scale(-1, 1);
  }
  ctx.beginPath();
  ctx.rect(-8, -5, 10, 10);
  ctx.fillStyle = "#334155";
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 1.6;
  ctx.fill();
  ctx.stroke();

  // Brass rivet bolt
  ctx.beginPath();
  ctx.arc(-3, 0, 2, 0, Math.PI * 2);
  ctx.fillStyle = "#d97706";
  ctx.fill();

  // Launcher muzzle rim
  ctx.beginPath();
  ctx.ellipse(2, 0, 2.5, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#94a3b8";
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 2. Interlocking tempered steel chain links
  const linkLength = 11;
  const numLinks = Math.max(3, Math.floor(reach / linkLength));

  for (let i = 1; i <= numLinks; i++) {
    const t = i / (numLinks + 1);
    const linkX = originX + dir * (reach * t);
    // Subtle chain sag / wave vibration
    const wave =
      Math.sin(t * Math.PI) * (1.8 + Math.sin(frame * 0.35 + i * 0.4) * 0.8);
    const linkY = originY + wave;

    ctx.save();
    ctx.translate(linkX, linkY);
    if (dir < 0) {
      ctx.scale(-1, 1);
    }

    if (i % 2 === 0) {
      // Horizontal flat oval link
      ctx.beginPath();
      ctx.ellipse(0, 0, 5.2, 3.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#94a3b8";
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1.4;
      ctx.fill();
      ctx.stroke();

      // Hollow inner center
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.8, 1.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#1e293b";
      ctx.fill();

      // Specular highlight on top edge
      ctx.beginPath();
      ctx.arc(0, -2.0, 3.5, Math.PI * 1.1, Math.PI * 1.9, false);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 1.0;
      ctx.stroke();
    } else {
      // Vertical connector link
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(-2.2, -3.8, 4.4, 7.6, 1.6);
      } else {
        ctx.rect(-2.2, -3.8, 4.4, 7.6);
      }
      ctx.fillStyle = "#64748b";
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1.4;
      ctx.fill();
      ctx.stroke();

      // Specular glint
      ctx.beginPath();
      ctx.moveTo(-1, -2.5);
      ctx.lineTo(-1, 2.5);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1.0;
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. Barbed Hookshot arrowhead / spearhead at the tip
  ctx.save();
  ctx.translate(tipX, tipY);
  if (dir < 0) {
    ctx.scale(-1, 1);
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Rear mounting ring
  ctx.beginPath();
  ctx.rect(-3, -3.5, 4, 7);
  ctx.fillStyle = "#475569";
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1.4;
  ctx.fill();
  ctx.stroke();

  // Iconic Zelda Hookshot head: triangular spearhead with backward-swept anchor barbs
  ctx.beginPath();
  ctx.moveTo(17, 0); // Sharp forward point
  ctx.lineTo(2, -9); // Upper barb corner
  ctx.lineTo(-2, -12); // Upper backward hook tip
  ctx.lineTo(2, -3.5); // Upper barb underside notch
  ctx.lineTo(2, 3.5); // Lower barb underside notch
  ctx.lineTo(-2, 12); // Lower backward hook tip
  ctx.lineTo(2, 9); // Lower barb corner
  ctx.closePath();

  ctx.fillStyle = "#cbd5e1";
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1.8;
  ctx.fill();
  ctx.stroke();

  // Chisel ridge bevel (upper facet catches highlight)
  ctx.beginPath();
  ctx.moveTo(17, 0);
  ctx.lineTo(2, -9);
  ctx.lineTo(-2, -12);
  ctx.lineTo(2, -3.5);
  ctx.lineTo(2, 0);
  ctx.closePath();
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.fill();

  // Center spine highlight
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.lineTo(16, 0);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Star glint on the spear point
  ctx.beginPath();
  ctx.arc(17, 0, 2, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 6;
  ctx.fill();

  // Port color capture tension aura
  ctx.beginPath();
  ctx.arc(10, 0, 13, -Math.PI * 0.42, Math.PI * 0.42, false);
  ctx.strokeStyle = hexToRgba(color, 0.8);
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}

/**
 * Renders Yoshi's slower, extended tongue grapple grab:
 * Distinct from Neutral-B Egg Lay (which is an upward arcing thin pink tongue with a round bulb),
 * Yoshi's standard grab features a wide-open gaping jaw silhouette with visible mouth cavity,
 * viscous saliva stretch filaments, a thick muscular segmented coral-crimson tongue with transverse
 * muscular ribbing, and a prehensile curling grasping clasp at the tip with grab tension brackets.
 */
export function drawYoshiTongueGrab(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  color: string,
  actionFrameCounter?: number,
): void {
  const dir = facingRight ? 1 : -1;
  const mouthX = x + dir * (halfWidth * 0.65);
  const mouthY = centerY - heightPx * 0.05;
  const frame = actionFrameCounter !== undefined ? actionFrameCounter : 22;

  // Slower, committal reach: jaws open, muscular tongue surges forward, clasps, then reels in
  const maxReach = Math.max(halfWidth * 4.4, heightPx * 1.9) * 0.7;
  let reachProgress: number;
  if (actionFrameCounter === undefined) {
    reachProgress = 1.0;
  } else if (frame < 6) {
    reachProgress = 0.15 + 0.15 * (frame / 6);
  } else if (frame <= 20) {
    const t = (frame - 6) / 14;
    reachProgress = 0.3 + 0.7 * (1 - Math.pow(1 - t, 2));
  } else if (frame <= 30) {
    reachProgress = 1.0;
  } else {
    const t = Math.min(1.0, (frame - 30) / 25);
    reachProgress = Math.max(0.2, 1.0 - t * 0.8);
  }

  const reach = maxReach * reachProgress;
  const tipX = mouthX + dir * reach;
  const tipY = mouthY + Math.sin(frame * 0.25) * 2;

  ctx.save();

  // 1. Wide Gaping Jaw / Maw Silhouette (Yoshi's jaws clamped wide open)
  ctx.save();
  ctx.translate(mouthX, mouthY);
  if (dir < 0) {
    ctx.scale(-1, 1);
  }

  // Dark crimson mouth interior cavity
  ctx.beginPath();
  ctx.ellipse(-2, 0, 9, 13, 0, -Math.PI * 0.5, Math.PI * 0.5, false);
  ctx.fillStyle = "#881337"; // Deep burgundy buccal cavern
  ctx.fill();

  // Upper snout jaw rim (curling upward)
  ctx.beginPath();
  ctx.arc(-2, -8, 8, -Math.PI * 0.2, Math.PI * 0.5, false);
  ctx.strokeStyle = "#16a34a"; // Yoshi green snout
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Lower jaw rim (dropping downward)
  ctx.beginPath();
  ctx.arc(-2, 8, 8, -Math.PI * 0.5, Math.PI * 0.2, false);
  ctx.strokeStyle = "#f8fafc"; // Yoshi white underbelly jaw
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Toothless gum ridges
  ctx.beginPath();
  ctx.arc(-2, -5, 5, 0, Math.PI * 0.5, false);
  ctx.strokeStyle = "#fecdd3";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-2, 5, 5, -Math.PI * 0.5, 0, false);
  ctx.strokeStyle = "#fecdd3";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // 2. Viscous saliva stretch filaments bridging jaws to tongue
  ctx.beginPath();
  ctx.moveTo(-1, -7);
  ctx.quadraticCurveTo(4, -4, 8, -1);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-1, 7);
  ctx.quadraticCurveTo(4, 4, 8, 1);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Saliva droplet beads
  ctx.beginPath();
  ctx.arc(3, -4, 1.2, 0, Math.PI * 2);
  ctx.arc(3, 4, 1.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fill();

  ctx.restore();

  // 3. Thick, muscular, segmented grappling tongue path
  const midX = mouthX + dir * (reach * 0.5);
  const midY = mouthY - 3;

  // Base muscular stroke (deep coral-crimson, noticeably thicker than Neutral-B)
  ctx.beginPath();
  ctx.moveTo(mouthX, mouthY);
  ctx.quadraticCurveTo(midX, midY, tipX, tipY);
  ctx.strokeStyle = "#e11d48"; // Rich coral-crimson muscle
  ctx.lineWidth = 5.6;
  ctx.lineCap = "round";
  ctx.shadowColor = "#be123c";
  ctx.shadowBlur = 6;
  ctx.stroke();

  // Inner flesh core
  ctx.beginPath();
  ctx.moveTo(mouthX, mouthY);
  ctx.quadraticCurveTo(midX, midY, tipX, tipY);
  ctx.strokeStyle = "#fb7185";
  ctx.lineWidth = 3.0;
  ctx.stroke();

  // Luminous wet specular highlight along upper edge
  ctx.beginPath();
  ctx.moveTo(mouthX, mouthY - 1.5);
  ctx.quadraticCurveTo(midX, midY - 1.5, tipX, tipY - 1);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Transverse muscular striation / gripping ribbing bands
  const numRibs = Math.max(3, Math.floor(reach / 9));
  for (let i = 1; i <= numRibs; i++) {
    const t = i / (numRibs + 1);
    // Quadratic bezier point: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
    const rx =
      (1 - t) * (1 - t) * mouthX + 2 * (1 - t) * t * midX + t * t * tipX;
    const ry =
      (1 - t) * (1 - t) * mouthY + 2 * (1 - t) * t * midY + t * t * tipY;

    ctx.beginPath();
    ctx.moveTo(rx, ry - 3.0);
    ctx.lineTo(rx, ry + 3.0);
    ctx.strokeStyle = "#9f1239"; // Darker transverse muscle band
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  // 4. Prehensile Grasping Clasp / Curling Fork Tip (distinct from Neutral-B round bulb)
  ctx.save();
  ctx.translate(tipX, tipY);
  if (dir < 0) {
    ctx.scale(-1, 1);
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Prehensile upper grasping lip curling forward & over
  ctx.beginPath();
  ctx.moveTo(-2, -2);
  ctx.quadraticCurveTo(5, -7, 10, -5);
  ctx.strokeStyle = "#e11d48";
  ctx.lineWidth = 3.4;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-1, -2);
  ctx.quadraticCurveTo(5, -6.5, 9, -5);
  ctx.strokeStyle = "#fb7185";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Prehensile lower grasping lip curling forward & under
  ctx.beginPath();
  ctx.moveTo(-2, 2);
  ctx.quadraticCurveTo(5, 7, 10, 5);
  ctx.strokeStyle = "#e11d48";
  ctx.lineWidth = 3.4;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-1, 2);
  ctx.quadraticCurveTo(5, 6.5, 9, 5);
  ctx.strokeStyle = "#fb7185";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Suction clasp pads at each tip
  ctx.beginPath();
  ctx.arc(10, -5, 2.2, 0, Math.PI * 2);
  ctx.arc(10, 5, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = "#f43f5e";
  ctx.fill();

  // Wet gleam on pads
  ctx.beginPath();
  ctx.arc(9.5, -5.5, 0.9, 0, Math.PI * 2);
  ctx.arc(9.5, 4.5, 0.9, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Flying saliva droplet flicked from tip
  ctx.beginPath();
  ctx.arc(14, -2, 1.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fill();

  // 5. Grab Latch & Capture Brackets in player port color
  ctx.beginPath();
  ctx.arc(6, 0, 11, -Math.PI * 0.45, Math.PI * 0.45, false);
  ctx.strokeStyle = hexToRgba(color, 0.9);
  ctx.lineWidth = 2.0;
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}
