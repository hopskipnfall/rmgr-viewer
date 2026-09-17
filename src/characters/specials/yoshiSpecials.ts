import {
  type YoshiSpecialType,
  resolveColor,
} from "../../renderer/common/index.js";

/**
 * Visualizes Yoshi's signature special moves:
 * - Egg Lay (Neutral-B): Long pink/red elastic tongue extending from snout with sticky bulb tip.
 * - Yoshi Bomb / Hip Drop (Down-B): Downward star-butt plummet and ground impact shockwave stars.
 * - Egg Throw (Up-B): Egg aiming trajectory arc.
 */
export function drawYoshiSpecial(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  _color: string,
  specialType: YoshiSpecialType,
  frameCounter: number,
): void {
  const dir = facingRight ? 1 : -1;
  const noseX = x + dir * (halfWidth * 0.7);
  const noseY = centerY - heightPx * 0.05;

  if (specialType === "egg_lay_tongue") {
    ctx.save();
    // Elastic tongue shoot / reach curve
    const reachProgress = Math.sin(Math.min(frameCounter / 16, 1) * Math.PI);
    const maxReach = halfWidth * 3.4;
    const tongueLen = Math.max(4, reachProgress * maxReach);
    const tipX = noseX + dir * tongueLen;
    const tipY = noseY + Math.sin(frameCounter * 0.2) * 3;

    // 1. Elastic tongue path
    ctx.beginPath();
    ctx.moveTo(noseX, noseY);
    ctx.quadraticCurveTo(
      noseX + dir * (tongueLen * 0.5),
      noseY - 4,
      tipX,
      tipY,
    );
    ctx.strokeStyle = "#f43f5e"; // Vivid rose-red tongue
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.shadowColor = "#e11d48";
    ctx.shadowBlur = 6;
    ctx.stroke();

    // Inner lighter pink stripe
    ctx.beginPath();
    ctx.moveTo(noseX, noseY);
    ctx.quadraticCurveTo(
      noseX + dir * (tongueLen * 0.5),
      noseY - 4,
      tipX,
      tipY,
    );
    ctx.strokeStyle = "#fda4af";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // 2. Rounded sticky bulb tip at tongue end
    ctx.beginPath();
    ctx.arc(tipX, tipY, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#f43f5e";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tipX - dir * 1, tipY - 1, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.restore();
    return;
  }

  if (
    specialType === "yoshi_bomb_start" ||
    specialType === "yoshi_bomb_plummet"
  ) {
    ctx.save();
    // Downward plummet trail and star aura
    const trailH = heightPx * 1.2;
    ctx.beginPath();
    ctx.moveTo(x - halfWidth * 0.6, centerY - trailH);
    ctx.lineTo(x - halfWidth * 0.3, centerY);
    ctx.moveTo(x + halfWidth * 0.6, centerY - trailH);
    ctx.lineTo(x + halfWidth * 0.3, centerY);
    ctx.strokeStyle = "rgba(251, 191, 36, 0.8)";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Plummet star icon
    const starR = 7;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? starR : starR * 0.45;
      const angle = (i * Math.PI) / 4 + frameCounter * 0.15;
      const sx = x + Math.cos(angle) * r;
      const sy = y + 4 + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fillStyle = "#facc15";
    ctx.fill();
    ctx.restore();
    return;
  }

  if (specialType === "yoshi_bomb_land") {
    ctx.save();
    const progress = Math.min(frameCounter / 18, 1);
    const alpha = 1 - progress;
    if (alpha <= 0) {
      ctx.restore();
      return;
    }

    // Ground impact dust shockwave
    const shockR = halfWidth * 1.6 + progress * 32;
    ctx.beginPath();
    ctx.ellipse(x, y, shockR, 5 + progress * 4, 0, 0, Math.PI * 2);
    ctx.strokeStyle = resolveColor("#f59e0b", false, alpha * 0.9);
    ctx.lineWidth = 2.2;
    ctx.shadowColor = "#d97706";
    ctx.shadowBlur = 8;
    ctx.stroke();

    // 2 Giant Yoshi Bomb stars shooting outward left and right across the floor
    const starDist = progress * 38;
    for (const sDir of [-1, 1]) {
      const starX = x + sDir * (halfWidth * 0.8 + starDist);
      const starY = y - 4;
      const starR = Math.max(2, (1 - progress * 0.5) * 8);

      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 === 0 ? starR : starR * 0.4;
        const angle = (i * Math.PI) / 4 + sDir * progress * 4;
        const px = starX + Math.cos(angle) * r;
        const py = starY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = resolveColor("#facc15", false, alpha);
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 6;
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  if (specialType === "egg_throw") {
    // Dotted trajectory line and duplicate egg removed per user feedback.
    // The thrown egg is an active in-game weapon entity (WPKind.EggThrow) rendered by drawCustomWeaponShape.
    return;
  }
}
