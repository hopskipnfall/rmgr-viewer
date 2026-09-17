import type { Camera } from "../../camera.js";
import { type Frame, type PortIndex, type Replay } from "@rmg-k/rmgr";
import {
  getDeathDirection,
  isSamusCharacter,
  isDonkeyKongCharacter,
  isSamusCharging,
  isDKCharging,
} from "../common/index.js";
import type { HitDIResult } from "../../di.js";

export function drawDeathDirectionFlashes(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  frame: Frame | undefined,
): void {
  if (!frame) return;

  for (const key of Object.keys(frame.ports)) {
    const port = Number(key) as PortIndex;
    const portData = frame.ports[port];
    if (!portData || !portData.state) continue;

    const { actionStateId, positionX, actionFrameCounter } = portData.state;
    const direction = getDeathDirection(actionStateId, positionX);
    if (!direction) continue;

    // Death animation fade: strongest on frames 0-10, fading until frame 45
    const MAX_DEATH_FRAMES = 45;
    if (actionFrameCounter >= MAX_DEATH_FRAMES) continue;

    const progress = actionFrameCounter / MAX_DEATH_FRAMES;
    const intensity = Math.max(0, 1 - progress);
    const opacity = intensity * 0.75;
    const depth = 80 + intensity * 140; // 80px - 220px deep sweep

    ctx.save();
    if (direction === "bottom") {
      const grad = ctx.createLinearGradient(
        0,
        canvas.height,
        0,
        canvas.height - depth,
      );
      grad.addColorStop(0, `rgba(255, 30, 20, ${opacity * 0.85})`);
      grad.addColorStop(0.35, `rgba(255, 70, 20, ${opacity * 0.5})`);
      grad.addColorStop(1, "rgba(255, 30, 20, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, canvas.height - depth, canvas.width, depth);
    } else if (direction === "top") {
      const grad = ctx.createLinearGradient(0, 0, 0, depth);
      grad.addColorStop(0, `rgba(255, 30, 20, ${opacity * 0.85})`);
      grad.addColorStop(0.35, `rgba(255, 70, 20, ${opacity * 0.5})`);
      grad.addColorStop(1, "rgba(255, 30, 20, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, depth);
    } else if (direction === "left") {
      const grad = ctx.createLinearGradient(0, 0, depth, 0);
      grad.addColorStop(0, `rgba(255, 30, 20, ${opacity * 0.85})`);
      grad.addColorStop(0.35, `rgba(255, 70, 20, ${opacity * 0.5})`);
      grad.addColorStop(1, "rgba(255, 30, 20, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, depth, canvas.height);
    } else if (direction === "right") {
      const grad = ctx.createLinearGradient(
        canvas.width,
        0,
        canvas.width - depth,
        0,
      );
      grad.addColorStop(0, `rgba(255, 30, 20, ${opacity * 0.85})`);
      grad.addColorStop(0.35, `rgba(255, 70, 20, ${opacity * 0.5})`);
      grad.addColorStop(1, "rgba(255, 30, 20, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(canvas.width - depth, 0, depth, canvas.height);
    } else if (direction === "screen") {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = Math.max(canvas.width, canvas.height) * 0.6;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, `rgba(255, 45, 20, ${opacity * 0.65})`);
      grad.addColorStop(0.45, `rgba(255, 80, 20, ${opacity * 0.3})`);
      grad.addColorStop(1, "rgba(255, 30, 20, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
  }
}

export function drawDIIndicator(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  hitDI: HitDIResult,
  currentFrameIndex: number,
): void {
  if (hitDI.inputCount === 0 || hitDI.displacement.distance < 6) return;

  const startScreen = camera.worldToScreen(hitDI.startPos.x, hitDI.startPos.y);
  const endScreen = camera.worldToScreen(hitDI.endPos.x, hitDI.endPos.y);

  const isDuringHitlag =
    currentFrameIndex >= hitDI.hitFrameIndex &&
    currentFrameIndex <= hitDI.endHitlagFrameIndex;
  const framesAfterHitlag = currentFrameIndex - hitDI.endHitlagFrameIndex;
  const maxPostFrames = 22;
  if (framesAfterHitlag > maxPostFrames) return;

  const alpha = isDuringHitlag
    ? 1.0
    : Math.max(0, 1.0 - framesAfterHitlag / maxPostFrames);

  ctx.save();

  const isStrongDI = hitDI.inputCount >= 2;
  const strokeColor = isStrongDI
    ? `rgba(251, 191, 36, ${alpha * 0.98})` // Bold amber gold for 2x+ DI
    : `rgba(56, 189, 248, ${alpha * 0.98})`; // Bright cyan for 1x DI

  const glowColor = isStrongDI
    ? `rgba(245, 158, 11, ${alpha * 0.85})`
    : `rgba(14, 165, 233, ${alpha * 0.85})`;

  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.lineWidth = isStrongDI ? 4 : 2.5;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = isStrongDI ? 10 : 6;

  ctx.beginPath();
  ctx.moveTo(startScreen.x, startScreen.y);
  ctx.lineTo(endScreen.x, endScreen.y);
  ctx.stroke();

  const angle = Math.atan2(
    endScreen.y - startScreen.y,
    endScreen.x - startScreen.x,
  );
  const headLen = isStrongDI ? 11 : 9;
  ctx.beginPath();
  ctx.moveTo(endScreen.x, endScreen.y);
  ctx.lineTo(
    endScreen.x - headLen * Math.cos(angle - Math.PI / 5.5),
    endScreen.y - headLen * Math.sin(angle - Math.PI / 5.5),
  );
  ctx.lineTo(
    endScreen.x - headLen * Math.cos(angle + Math.PI / 5.5),
    endScreen.y - headLen * Math.sin(angle + Math.PI / 5.5),
  );
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(startScreen.x, startScreen.y, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(startScreen.x, startScreen.y, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
  ctx.fill();

  if (hitDI.inputCount > 1) {
    for (let i = 1; i < hitDI.inputCount; i++) {
      const t = i / hitDI.inputCount;
      const px = startScreen.x + (endScreen.x - startScreen.x) * t;
      const py = startScreen.y + (endScreen.y - startScreen.y) * t;
      ctx.beginPath();
      ctx.arc(px, py, 2.8, 0, Math.PI * 2);
      ctx.fillStyle = strokeColor;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
      ctx.fill();
    }
  }

  ctx.restore();
}

export function drawRecoveryJumpCount(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  jumpsRemaining: number,
  color: string,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = "900 34px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const text = String(jumpsRemaining);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.strokeText(text, x, y);

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillText(text, x, y);

  ctx.restore();
}

export function drawPlayerNameTag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  tagColor: string,
  isPerspective: boolean,
  alpha: number,
  characterId: number,
  stockCount: number,
  getCharacterIconImage: (characterId: number) => HTMLImageElement | null,
): void {
  if (alpha <= 0 || !name) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  const nameFont = "bold 13px system-ui, -apple-system, sans-serif";
  const stockFont = "bold 12px system-ui, -apple-system, sans-serif";
  const stockIconSize = 20;
  const stockGap = 3;
  const stockText = `×${stockCount}`;
  const stockIcon = getCharacterIconImage(characterId);

  ctx.font = nameFont;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const nameWidth = ctx.measureText(name).width;

  ctx.font = stockFont;
  const stockTextWidth = ctx.measureText(
    stockIcon ? stockText : `⭐${stockText}`,
  ).width;
  const stockRowWidth = stockIcon
    ? stockIconSize + stockGap + stockTextWidth
    : stockTextWidth;

  const paddingX = 10;
  const contentWidth = Math.max(nameWidth, stockRowWidth);
  const pillWidth = Math.max(contentWidth + paddingX * 2, 44);
  const nameLineHeight = 18;
  const stockLineHeight = 22;
  const pillHeight = nameLineHeight + stockLineHeight + 8;
  const pillX = x - pillWidth / 2;
  const pillY = y - pillHeight - 6;
  const borderRadius = 6;

  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillWidth, pillHeight, borderRadius);
  ctx.fillStyle = "rgba(15, 17, 23, 0.88)";
  ctx.fill();

  ctx.lineWidth = isPerspective ? 2 : 1.5;
  ctx.strokeStyle = tagColor;
  ctx.stroke();

  ctx.beginPath();
  const arrowSize = 5;
  ctx.moveTo(x - arrowSize, pillY + pillHeight);
  ctx.lineTo(x + arrowSize, pillY + pillHeight);
  ctx.lineTo(x, pillY + pillHeight + arrowSize);
  ctx.closePath();
  ctx.fillStyle = "rgba(15, 17, 23, 0.88)";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const nameCenterY = pillY + 4 + nameLineHeight / 2;
  ctx.font = nameFont;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = tagColor;
  ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = 3;
  ctx.fillText(name, x, nameCenterY);
  ctx.shadowBlur = 0;

  const stockCenterY = pillY + 4 + nameLineHeight + stockLineHeight / 2;
  ctx.font = stockFont;
  ctx.textBaseline = "middle";

  if (stockIcon) {
    const stockRowLeft = x - stockRowWidth / 2;
    const iconX = stockRowLeft;
    const iconY = stockCenterY - stockIconSize / 2;
    ctx.drawImage(stockIcon, iconX, iconY, stockIconSize, stockIconSize);

    ctx.textAlign = "left";
    ctx.fillStyle = "#e5e7eb";
    ctx.fillText(
      stockText,
      stockRowLeft + stockIconSize + stockGap,
      stockCenterY,
    );
  } else {
    ctx.textAlign = "center";
    ctx.fillStyle = "#e5e7eb";
    ctx.fillText(`⭐${stockText}`, x, stockCenterY);
  }

  ctx.restore();
}

export function drawPlayerStateInfo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  stateName: string,
  stateId: number,
  posX: number,
  posY: number,
  tagColor: string,
): void {
  ctx.save();

  const font = "bold 11px system-ui, -apple-system, sans-serif";
  const stateText = `${stateName} (0x${stateId.toString(16)})`;
  const positionText = `(${posX.toFixed(1)}, ${posY.toFixed(1)})`;

  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const contentWidth = Math.max(
    ctx.measureText(stateText).width,
    ctx.measureText(positionText).width,
  );

  const paddingX = 8;
  const pillWidth = Math.max(contentWidth + paddingX * 2, 40);
  const lineHeight = 15;
  const paddingY = 5;
  const pillHeight = lineHeight * 2 + paddingY;
  const pillX = x - pillWidth / 2;
  const pillY = y + 8; // just below the character's feet
  const borderRadius = 5;

  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillWidth, pillHeight, borderRadius);
  ctx.fillStyle = "rgba(15, 17, 23, 0.85)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = tagColor;
  ctx.stroke();

  ctx.fillStyle = "#e5e7eb";
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 2;
  ctx.fillText(stateText, x, pillY + paddingY / 2 + lineHeight / 2);
  ctx.fillText(
    positionText,
    x,
    pillY + paddingY / 2 + lineHeight + lineHeight / 2,
  );
  ctx.shadowBlur = 0;

  ctx.restore();
}

export function drawChargeMeter(
  ctx: CanvasRenderingContext2D,
  isLight: boolean,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  post: {
    characterId: number;
    actionStateId: number;
    characterSpecific?: number;
  },
  port: PortIndex,
  replay?: Replay | null,
  frameIndex?: number,
  isPaused?: boolean,
): void {
  const isSamus = isSamusCharacter(post.characterId);
  const isDK = isDonkeyKongCharacter(post.characterId);
  if (!isSamus && !isDK) return;

  // Schema 1 fallback: characterSpecific is undefined, do not draw an empty UI
  const charge = post.characterSpecific;
  if (charge === undefined) return;

  const totalStages = isSamus ? 8 : 11;
  const maxCharge = isSamus ? 7 : 10;
  const isCharging = isSamus
    ? isSamusCharging(post.actionStateId)
    : isDKCharging(post.actionStateId);

  const CHARGE_METER_FADE_FRAMES = 45;
  let alpha = 0;

  if (isPaused) {
    // Reappear at full opacity when playback is paused if charging or holding a charge
    if (isCharging || charge > 0) {
      alpha = 1.0;
    }
  } else if (isCharging) {
    alpha = 1.0;
  } else if (charge > 0) {
    // Fade out once charging stops
    let framesSinceCharging = Infinity;
    if (replay && frameIndex !== undefined) {
      const startScan = Math.max(0, frameIndex - CHARGE_METER_FADE_FRAMES);
      for (let i = frameIndex - 1; i >= startScan; i--) {
        const priorState = replay.frames[i]?.ports[port]?.state;
        if (priorState) {
          const wasCharging = isSamus
            ? isSamusCharging(priorState.actionStateId)
            : isDKCharging(priorState.actionStateId);
          if (wasCharging) {
            framesSinceCharging = frameIndex - i;
            break;
          }
        }
      }
    }
    if (framesSinceCharging < CHARGE_METER_FADE_FRAMES) {
      alpha = 1 - framesSinceCharging / CHARGE_METER_FADE_FRAMES;
    }
  }

  if (alpha <= 0) return;

  const isFullCharge = charge >= maxCharge;
  const filledStages = Math.min(totalStages, charge + 1);

  const dir = facingRight ? -1 : 1;
  const meterX = x + dir * (halfWidth + 9);
  const meterY = centerY;
  const meterW = 7;
  const meterH = Math.max(34, Math.min(48, heightPx * 0.72));
  const stageH = meterH / totalStages;

  const batteryX = meterX - meterW / 2;
  const batteryY = meterY - meterH / 2;
  const borderRadius = 2;

  ctx.save();
  ctx.globalAlpha = alpha;

  // 1. Top terminal nub
  const nubW = 3;
  const nubH = 2;
  const nubX = meterX - nubW / 2;
  const nubY = batteryY - nubH;
  ctx.fillStyle = isLight
    ? "rgba(15, 23, 42, 0.7)"
    : "rgba(255, 255, 255, 0.7)";
  ctx.fillRect(nubX, nubY, nubW, nubH);

  // 2. Battery background casing
  ctx.beginPath();
  ctx.roundRect(batteryX, batteryY, meterW, meterH, borderRadius);
  ctx.fillStyle = isLight
    ? "rgba(241, 245, 249, 0.9)"
    : "rgba(15, 23, 42, 0.85)";
  ctx.fill();

  // 3. Discrete stages from bottom to top
  for (let s = 0; s < totalStages; s++) {
    const segY = batteryY + meterH - (s + 1) * stageH;
    const segH = stageH;

    if (s < filledStages) {
      if (isFullCharge) {
        // Rainbow effect at full charge
        const animOffset = (frameIndex ?? 0) * 6;
        const hue = ((s / totalStages) * 320 + animOffset) % 360;
        ctx.fillStyle = `hsl(${hue}, 95%, 58%)`;
        ctx.shadowColor = `hsl(${hue}, 95%, 65%)`;
        ctx.shadowBlur = 6;
      } else {
        const frac = s / totalStages;
        if (frac < 0.35) {
          ctx.fillStyle = isSamus ? "#38bdf8" : "#22c55e";
        } else if (frac < 0.7) {
          ctx.fillStyle = "#eab308";
        } else {
          ctx.fillStyle = "#f97316";
        }
        ctx.shadowBlur = 0;
      }
      ctx.fillRect(batteryX + 1, segY + 0.5, meterW - 2, segH - 1);
    } else {
      ctx.shadowBlur = 0;
      ctx.fillStyle = isLight
        ? "rgba(15, 23, 42, 0.08)"
        : "rgba(255, 255, 255, 0.08)";
      ctx.fillRect(batteryX + 1, segY + 0.5, meterW - 2, segH - 1);
    }
  }

  ctx.shadowBlur = 0;

  // 4. Divider lines between discrete stages
  ctx.lineWidth = 1;
  ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.6)" : "rgba(0, 0, 0, 0.75)";
  for (let s = 1; s < totalStages; s++) {
    const divY = Math.round(batteryY + s * stageH);
    ctx.beginPath();
    ctx.moveTo(batteryX + 0.5, divY);
    ctx.lineTo(batteryX + meterW - 0.5, divY);
    ctx.stroke();
  }

  // 5. Battery outer border
  ctx.beginPath();
  ctx.roundRect(batteryX, batteryY, meterW, meterH, borderRadius);
  if (isFullCharge) {
    const animOffset = (frameIndex ?? 0) * 6;
    ctx.strokeStyle = `hsl(${animOffset % 360}, 90%, 65%)`;
    ctx.lineWidth = 1.4;
    ctx.shadowColor = `hsl(${animOffset % 360}, 90%, 65%)`;
    ctx.shadowBlur = 8;
  } else {
    ctx.strokeStyle = isLight
      ? "rgba(15, 23, 42, 0.75)"
      : "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
  }
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws the remaining-jumps count above a recovering Kirby/Jigglypuff's
 * head, faded by `alpha` (caller fades it out over ~1s after each jump).
 */
