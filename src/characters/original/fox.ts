import type { BackgroundTheme, CharacterAnimState } from "../common.js";
import { drawCharacterStateAuras, resolveColor } from "../common.js";

export function drawFoxPolygons(
  ctx: CanvasRenderingContext2D,
  backgroundTheme: BackgroundTheme,
  x: number,
  y: number,
  _topY: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
  effectiveDir: number,
  playerColor: string,
  state: CharacterAnimState,
): void {
  const { taunting, inCombo, isRoll, isOpponent, actionFrameCounter } = state;
  ctx.save();
  const posX =
    inCombo && !taunting ? x + (actionFrameCounter % 2 === 0 ? 1.2 : -1.2) : x;
  const facingRight = effectiveDir >= 0;
  if (taunting) {
    const spinAngle = actionFrameCounter * 0.125 * (facingRight ? 1 : -1);
    ctx.translate(posX, centerY);
    ctx.rotate(spinAngle);
    ctx.translate(-posX, -centerY);
  }

  const isMountainTheme = backgroundTheme === "mountain";
  const isAutumnTheme = backgroundTheme === "autumn";
  const baseFur = isMountainTheme
    ? "#fbbf24"
    : isAutumnTheme
      ? "#ea580c"
      : "#c8732a";
  const baseWhiteFur = isMountainTheme
    ? "#fdf4ff"
    : isAutumnTheme
      ? "#fffbeb"
      : "#f8fafc";
  const basePurpleJacket = isMountainTheme
    ? "#7c3aed"
    : isAutumnTheme
      ? "#7f1d1d"
      : "#7c3aed";
  const baseNavyPants = isMountainTheme
    ? "#1e1b4b"
    : isAutumnTheme
      ? "#292524"
      : "#1e3a5f";
  const basePurpleBoots = isMountainTheme
    ? "#ec4899"
    : isAutumnTheme
      ? "#dc2626"
      : "#a855f7";
  const baseDarkEar = isMountainTheme
    ? "#1e1b4b"
    : isAutumnTheme
      ? "#1c1917"
      : "#18181b";
  const baseBelt = isMountainTheme
    ? "#4c1d95"
    : isAutumnTheme
      ? "#451a03"
      : "#3b1f6e";
  const baseScouter = isMountainTheme
    ? "#38bdf8"
    : isAutumnTheme
      ? "#f59e0b"
      : "#06b6d4";
  const baseOutline = isMountainTheme
    ? "rgba(15, 23, 42, 0.85)"
    : isAutumnTheme
      ? "rgba(41, 37, 36, 0.85)"
      : "rgba(0, 0, 0, 0.6)";

  let furColor = resolveColor(baseFur, isOpponent);
  let whiteFur = resolveColor(baseWhiteFur, isOpponent);
  let purpleJacket = resolveColor(basePurpleJacket, isOpponent);
  let navyPants = resolveColor(baseNavyPants, isOpponent);
  let purpleBoots = resolveColor(basePurpleBoots, isOpponent);
  let darkEar = resolveColor(baseDarkEar, isOpponent);
  let beltColor = resolveColor(baseBelt, isOpponent);
  let scouterColor = resolveColor(baseScouter, isOpponent);
  const outlineColor = resolveColor(baseOutline, isOpponent);
  const outlineWidth = 1.2;

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    furColor = resolveColor(`hsl(${hue}, 70%, 50%)`, isOpponent);
    purpleJacket = resolveColor(
      `hsl(${(hue + 120) % 360}, 80%, 45%)`,
      isOpponent,
    );
    navyPants = resolveColor(`hsl(${(hue + 200) % 360}, 75%, 30%)`, isOpponent);
    purpleBoots = resolveColor(
      `hsl(${(hue + 120) % 360}, 80%, 60%)`,
      isOpponent,
    );
  } else if (isRoll) {
    furColor = resolveColor(baseFur, isOpponent, 0.45);
    whiteFur = resolveColor(baseWhiteFur, isOpponent, 0.45);
    purpleJacket = resolveColor(basePurpleJacket, isOpponent, 0.45);
    navyPants = resolveColor(baseNavyPants, isOpponent, 0.45);
    purpleBoots = resolveColor(basePurpleBoots, isOpponent, 0.45);
    darkEar = resolveColor(baseDarkEar, isOpponent, 0.45);
    beltColor = resolveColor(baseBelt, isOpponent, 0.45);
    scouterColor = resolveColor(baseScouter, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // Bushy Fox Tail (Background)
  ctx.beginPath();
  ctx.moveTo(posX - 0.4 * dir * w, y - 0.35 * h);
  ctx.lineTo(posX - 1.05 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX - 0.85 * dir * w, y - 0.82 * h);
  ctx.lineTo(posX - 0.3 * dir * w, y - 0.45 * h);
  ctx.closePath();
  ctx.fillStyle = furColor;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX - 1.05 * dir * w, y - 0.7 * h);
  ctx.lineTo(posX - 1.25 * dir * w, y - 0.8 * h);
  ctx.lineTo(posX - 0.85 * dir * w, y - 0.82 * h);
  ctx.closePath();
  ctx.fillStyle = whiteFur;
  ctx.fill();
  ctx.stroke();

  // Back Ear
  ctx.beginPath();
  ctx.moveTo(posX - 0.15 * dir * w, y - 0.9 * h);
  ctx.lineTo(posX - 0.32 * dir * w, y - 1.32 * h);
  ctx.lineTo(posX + 0.05 * dir * w, y - 1.05 * h);
  ctx.closePath();
  ctx.fillStyle = furColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX - 0.22 * dir * w, y - 1.15 * h);
  ctx.lineTo(posX - 0.32 * dir * w, y - 1.32 * h);
  ctx.lineTo(posX - 0.08 * dir * w, y - 1.18 * h);
  ctx.closePath();
  ctx.fillStyle = darkEar;
  ctx.fill();

  // Dark navy blue pants (legs)
  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.2 * h);
  ctx.lineTo(posX - 0.35 * dir * w, y - 0.2 * h);
  ctx.closePath();
  ctx.fillStyle = navyPants;
  ctx.fill();
  ctx.stroke();

  // Purple boots (left)
  ctx.beginPath();
  ctx.moveTo(posX - 0.42 * dir * w, y - 0.2 * h);
  ctx.lineTo(posX - 0.16 * dir * w, y - 0.2 * h);
  ctx.lineTo(posX - 0.16 * dir * w, y);
  ctx.lineTo(posX - 0.42 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = purpleBoots;
  ctx.fill();
  ctx.stroke();

  // Purple boots (right)
  ctx.beginPath();
  ctx.moveTo(posX + 0.18 * dir * w, y - 0.2 * h);
  ctx.lineTo(posX + 0.5 * dir * w, y - 0.2 * h);
  ctx.lineTo(posX + 0.5 * dir * w, y);
  ctx.lineTo(posX + 0.18 * dir * w, y);
  ctx.closePath();
  ctx.fillStyle = purpleBoots;
  ctx.fill();
  ctx.stroke();

  // Purple jacket / torso
  ctx.beginPath();
  ctx.moveTo(posX - 0.32 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.3 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX - 0.3 * dir * w, y - 0.42 * h);
  ctx.closePath();
  ctx.fillStyle = purpleJacket;
  ctx.fill();
  ctx.stroke();

  // White chest / flight vest patch
  ctx.beginPath();
  ctx.moveTo(posX - 0.1 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.18 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.14 * dir * w, y - 0.52 * h);
  ctx.lineTo(posX - 0.08 * dir * w, y - 0.52 * h);
  ctx.closePath();
  ctx.fillStyle = whiteFur;
  ctx.fill();

  // Belt
  ctx.beginPath();
  ctx.moveTo(posX - 0.32 * dir * w, y - 0.44 * h);
  ctx.lineTo(posX + 0.32 * dir * w, y - 0.44 * h);
  ctx.lineTo(posX + 0.32 * dir * w, y - 0.38 * h);
  ctx.lineTo(posX - 0.32 * dir * w, y - 0.38 * h);
  ctx.closePath();
  ctx.fillStyle = beltColor;
  ctx.fill();

  // Front Ear
  ctx.beginPath();
  ctx.moveTo(posX + 0.12 * dir * w, y - 0.95 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y - 1.35 * h);
  ctx.lineTo(posX + 0.42 * dir * w, y - 0.95 * h);
  ctx.closePath();
  ctx.fillStyle = furColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX + 0.28 * dir * w, y - 1.2 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y - 1.35 * h);
  ctx.lineTo(posX + 0.4 * dir * w, y - 1.15 * h);
  ctx.closePath();
  ctx.fillStyle = darkEar;
  ctx.fill();

  // Fox Snout, Cheeks, Scouter, Eye
  ctx.beginPath();
  ctx.moveTo(posX - 0.15 * dir * w, y - 0.92 * h);
  ctx.lineTo(posX + 0.45 * dir * w, y - 0.92 * h);
  ctx.lineTo(posX + 0.88 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.52 * dir * w, y - 0.6 * h);
  ctx.lineTo(posX - 0.15 * dir * w, y - 0.7 * h);
  ctx.closePath();
  ctx.fillStyle = furColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(posX + 0.35 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.85 * dir * w, y - 0.68 * h);
  ctx.lineTo(posX + 0.55 * dir * w, y - 0.58 * h);
  ctx.closePath();
  ctx.fillStyle = whiteFur;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(
    posX + 0.86 * dir * w,
    y - 0.68 * h,
    Math.max(0.1, 0.06 * w),
    Math.max(0.1, 0.06 * w),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = darkEar;
  ctx.fill();

  // Cyan Scouter Headset
  ctx.beginPath();
  ctx.moveTo(posX + 0.15 * dir * w, y - 0.86 * h);
  ctx.lineTo(posX + 0.33 * dir * w, y - 0.86 * h);
  ctx.lineTo(posX + 0.33 * dir * w, y - 0.78 * h);
  ctx.lineTo(posX + 0.15 * dir * w, y - 0.78 * h);
  ctx.closePath();
  ctx.fillStyle = scouterColor;
  ctx.fill();
  ctx.stroke();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}
