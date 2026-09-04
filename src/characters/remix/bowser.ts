import type { BackgroundTheme, CharacterAnimState } from "./common.js";
import { drawCharacterStateAuras, resolveColor } from "./common.js";

/**
 * 13. BOWSER: Heavy reptilian King of the Koopas with spiked green carapace, padded cream rim,
 * conical shell spikes, segmented yellow underbelly, spiked armbands, curved bull horns,
 * sharp fangs, and fiery crimson hair mane.
 */
export function drawBowserPolygons(
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
  const baseScales = isMountainTheme
    ? "#3730a3"
    : isAutumnTheme
      ? "#4d7c0f"
      : "#15803d";
  const baseScalesDark = isMountainTheme
    ? "#1e1b4b"
    : isAutumnTheme
      ? "#365314"
      : "#166534";
  const baseShell = isMountainTheme
    ? "#1e1b4b"
    : isAutumnTheme
      ? "#365314"
      : "#14532d";
  const baseShellRim = isMountainTheme
    ? "#c7d2fe"
    : isAutumnTheme
      ? "#fde68a"
      : "#fef08a";
  const baseBelly = isMountainTheme
    ? "#e0e7ff"
    : isAutumnTheme
      ? "#f59e0b"
      : "#fde047";
  const baseSnout = isMountainTheme
    ? "#c7d2fe"
    : isAutumnTheme
      ? "#fde68a"
      : "#fed7aa";
  const baseSpikes = isMountainTheme
    ? "#38bdf8"
    : isAutumnTheme
      ? "#facc15"
      : "#fef9c3";
  const baseSpikeRings = isMountainTheme
    ? "#6366f1"
    : isAutumnTheme
      ? "#b91c1c"
      : "#ea580c";
  const baseHair = isMountainTheme
    ? "#ec4899"
    : isAutumnTheme
      ? "#dc2626"
      : "#dc2626";
  const baseBands = isMountainTheme
    ? "#0f172a"
    : isAutumnTheme
      ? "#292524"
      : "#27272a";
  const baseOutline = isMountainTheme
    ? "rgba(15, 23, 42, 0.85)"
    : isAutumnTheme
      ? "rgba(41, 37, 36, 0.85)"
      : "rgba(0, 0, 0, 0.65)";

  let scalesColor = resolveColor(baseScales, isOpponent);
  let scalesDark = resolveColor(baseScalesDark, isOpponent);
  let shellColor = resolveColor(baseShell, isOpponent);
  let shellRimColor = resolveColor(baseShellRim, isOpponent);
  let bellyColor = resolveColor(baseBelly, isOpponent);
  let snoutColor = resolveColor(baseSnout, isOpponent);
  let spikeColor = resolveColor(baseSpikes, isOpponent);
  let spikeRingColor = resolveColor(baseSpikeRings, isOpponent);
  let hairColor = resolveColor(baseHair, isOpponent);
  let bandColor = resolveColor(baseBands, isOpponent);
  const outlineColor = resolveColor(baseOutline, isOpponent);
  const outlineWidth = 1.2;

  if (taunting) {
    const hue = (actionFrameCounter * 10) % 360;
    scalesColor = resolveColor(`hsl(${hue}, 75%, 40%)`, isOpponent);
    hairColor = resolveColor(`hsl(${(hue + 90) % 360}, 90%, 55%)`, isOpponent);
    shellColor = resolveColor(
      `hsl(${(hue + 180) % 360}, 70%, 30%)`,
      isOpponent,
    );
  } else if (isRoll) {
    scalesColor = resolveColor(baseScales, isOpponent, 0.45);
    scalesDark = resolveColor(baseScalesDark, isOpponent, 0.45);
    shellColor = resolveColor(baseShell, isOpponent, 0.45);
    shellRimColor = resolveColor(baseShellRim, isOpponent, 0.45);
    bellyColor = resolveColor(baseBelly, isOpponent, 0.45);
    snoutColor = resolveColor(baseSnout, isOpponent, 0.45);
    spikeColor = resolveColor(baseSpikes, isOpponent, 0.45);
    spikeRingColor = resolveColor(baseSpikeRings, isOpponent, 0.45);
    hairColor = resolveColor(baseHair, isOpponent, 0.45);
    bandColor = resolveColor(baseBands, isOpponent, 0.45);
  }

  const dir = effectiveDir;
  const w = halfWidth;
  const h = heightPx;

  // 1. Back Arm & Claws (behind body)
  ctx.beginPath();
  ctx.moveTo(posX + 0.12 * dir * w, y - 0.58 * h);
  ctx.lineTo(posX + 0.52 * dir * w, y - 0.44 * h);
  ctx.lineTo(posX + 0.48 * dir * w, y - 0.3 * h);
  ctx.lineTo(posX + 0.08 * dir * w, y - 0.42 * h);
  ctx.closePath();
  ctx.fillStyle = scalesDark;
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.stroke();

  // Back arm wristband with spike
  ctx.beginPath();
  ctx.moveTo(posX + 0.38 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX + 0.48 * dir * w, y - 0.42 * h);
  ctx.lineTo(posX + 0.48 * dir * w, y - 0.34 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y - 0.34 * h);
  ctx.closePath();
  ctx.fillStyle = bandColor;
  ctx.fill();

  // 2. Spiked Tail (extends backwards)
  ctx.beginPath();
  ctx.moveTo(posX - 0.35 * dir * w, y - 0.3 * h);
  ctx.quadraticCurveTo(
    posX - 0.75 * dir * w,
    y - 0.28 * h,
    posX - 1.08 * dir * w,
    y - 0.14 * h,
  );
  ctx.quadraticCurveTo(
    posX - 0.65 * dir * w,
    y - 0.08 * h,
    posX - 0.22 * dir * w,
    y - 0.12 * h,
  );
  ctx.closePath();
  ctx.fillStyle = scalesColor;
  ctx.fill();
  ctx.stroke();

  // Tail Spike (sharp cone near tail tip)
  ctx.beginPath();
  ctx.moveTo(posX - 0.78 * dir * w, y - 0.24 * h);
  ctx.lineTo(posX - 0.94 * dir * w, y - 0.38 * h);
  ctx.lineTo(posX - 0.64 * dir * w, y - 0.25 * h);
  ctx.closePath();
  ctx.fillStyle = spikeColor;
  ctx.fill();
  ctx.stroke();

  // 3. Back Leg & Clawed Foot
  ctx.beginPath();
  ctx.ellipse(
    posX - 0.34 * dir * w,
    y - 0.11 * h,
    Math.max(0.1, 0.32 * w),
    Math.max(0.1, 0.13 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = scalesDark;
  ctx.fill();
  ctx.stroke();

  // Back foot claws
  for (let c = 0; c < 3; c++) {
    ctx.beginPath();
    const clawBaseX = posX - (0.46 - c * 0.1) * dir * w;
    ctx.moveTo(clawBaseX, y - 0.05 * h);
    ctx.lineTo(clawBaseX + 0.08 * dir * w, y - 0.01 * h);
    ctx.lineTo(clawBaseX + 0.03 * dir * w, y - 0.07 * h);
    ctx.closePath();
    ctx.fillStyle = spikeColor;
    ctx.fill();
  }

  // 4. Heavy Spiked Carapace (Shell on Back)
  // Shell Outer Padded Rim (cream / pale yellow scalloped border)
  ctx.beginPath();
  ctx.ellipse(
    posX - 0.38 * dir * w,
    y - 0.52 * h,
    Math.max(0.1, 0.44 * w),
    Math.max(0.1, 0.36 * h),
    -0.08 * dir,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = shellRimColor;
  ctx.fill();
  ctx.stroke();

  // Inner Green Shell Dome
  ctx.beginPath();
  ctx.ellipse(
    posX - 0.44 * dir * w,
    y - 0.52 * h,
    Math.max(0.1, 0.38 * w),
    Math.max(0.1, 0.31 * h),
    -0.08 * dir,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = shellColor;
  ctx.fill();
  ctx.stroke();

  // 3 Prominent Conical Shell Spikes with orange/red base rings:
  // Top Shell Spike
  ctx.beginPath();
  ctx.ellipse(
    posX - 0.46 * dir * w,
    y - 0.71 * h,
    Math.max(0.1, 0.09 * w),
    Math.max(0.1, 0.06 * h),
    -0.4 * dir,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = spikeRingColor;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX - 0.54 * dir * w, y - 0.73 * h);
  ctx.lineTo(posX - 0.74 * dir * w, y - 0.93 * h);
  ctx.lineTo(posX - 0.39 * dir * w, y - 0.72 * h);
  ctx.closePath();
  ctx.fillStyle = spikeColor;
  ctx.fill();
  ctx.stroke();

  // Middle Shell Spike
  ctx.beginPath();
  ctx.ellipse(
    posX - 0.65 * dir * w,
    y - 0.52 * h,
    Math.max(0.1, 0.08 * w),
    Math.max(0.1, 0.06 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = spikeRingColor;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX - 0.68 * dir * w, y - 0.57 * h);
  ctx.lineTo(posX - 0.98 * dir * w, y - 0.52 * h);
  ctx.lineTo(posX - 0.67 * dir * w, y - 0.46 * h);
  ctx.closePath();
  ctx.fillStyle = spikeColor;
  ctx.fill();
  ctx.stroke();

  // Bottom Shell Spike
  ctx.beginPath();
  ctx.ellipse(
    posX - 0.52 * dir * w,
    y - 0.34 * h,
    Math.max(0.1, 0.08 * w),
    Math.max(0.1, 0.05 * h),
    0.35 * dir,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = spikeRingColor;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(posX - 0.58 * dir * w, y - 0.38 * h);
  ctx.lineTo(posX - 0.8 * dir * w, y - 0.24 * h);
  ctx.lineTo(posX - 0.45 * dir * w, y - 0.3 * h);
  ctx.closePath();
  ctx.fillStyle = spikeColor;
  ctx.fill();
  ctx.stroke();

  // 5. Front Muscular Leg & Clawed Foot
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.16 * dir * w,
    y - 0.11 * h,
    Math.max(0.1, 0.36 * w),
    Math.max(0.1, 0.14 * h),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = scalesColor;
  ctx.fill();
  ctx.stroke();

  // Front foot claws (3 claws)
  for (let c = 0; c < 3; c++) {
    ctx.beginPath();
    const clawBaseX = posX + (0.15 + c * 0.12) * dir * w;
    ctx.moveTo(clawBaseX, y - 0.06 * h);
    ctx.lineTo(clawBaseX + 0.12 * dir * w, y - 0.01 * h);
    ctx.lineTo(clawBaseX + 0.04 * dir * w, y - 0.09 * h);
    ctx.closePath();
    ctx.fillStyle = spikeColor;
    ctx.fill();
  }

  // 6. Torso & Segmented Padded Belly
  ctx.beginPath();
  ctx.moveTo(posX - 0.12 * dir * w, y - 0.69 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y - 0.69 * h);
  ctx.lineTo(posX + 0.48 * dir * w, y - 0.38 * h);
  ctx.lineTo(posX + 0.28 * dir * w, y - 0.2 * h);
  ctx.lineTo(posX - 0.06 * dir * w, y - 0.2 * h);
  ctx.closePath();
  ctx.fillStyle = bellyColor;
  ctx.fill();
  ctx.stroke();

  // Horizontal segmented lines on belly plate
  const bellyLineColor = isMountainTheme
    ? "rgba(99, 102, 241, 0.6)"
    : isAutumnTheme
      ? "rgba(180, 83, 9, 0.6)"
      : "rgba(161, 98, 7, 0.65)";
  ctx.save();
  ctx.strokeStyle = resolveColor(bellyLineColor, isOpponent);
  ctx.lineWidth = 1.4;
  for (const lineFrac of [0.57, 0.45, 0.33]) {
    ctx.beginPath();
    ctx.moveTo(posX - 0.05 * dir * w, y - lineFrac * h);
    ctx.lineTo(posX + 0.38 * dir * w, y - lineFrac * h);
    ctx.stroke();
  }
  ctx.restore();

  // 7. Muscular Front Arm with Spiked Bands and Claws
  ctx.beginPath();
  ctx.moveTo(posX + 0.22 * dir * w, y - 0.64 * h);
  ctx.lineTo(posX + 0.58 * dir * w, y - 0.54 * h);
  ctx.lineTo(posX + 0.72 * dir * w, y - 0.34 * h);
  ctx.lineTo(posX + 0.54 * dir * w, y - 0.26 * h);
  ctx.lineTo(posX + 0.14 * dir * w, y - 0.44 * h);
  ctx.closePath();
  ctx.fillStyle = scalesColor;
  ctx.fill();
  ctx.stroke();

  // Bicep Spiked Band
  ctx.beginPath();
  ctx.moveTo(posX + 0.28 * dir * w, y - 0.62 * h);
  ctx.lineTo(posX + 0.42 * dir * w, y - 0.56 * h);
  ctx.lineTo(posX + 0.38 * dir * w, y - 0.48 * h);
  ctx.lineTo(posX + 0.24 * dir * w, y - 0.54 * h);
  ctx.closePath();
  ctx.fillStyle = bandColor;
  ctx.fill();
  ctx.stroke();

  // Wrist Spiked Band
  ctx.beginPath();
  ctx.moveTo(posX + 0.52 * dir * w, y - 0.43 * h);
  ctx.lineTo(posX + 0.67 * dir * w, y - 0.36 * h);
  ctx.lineTo(posX + 0.62 * dir * w, y - 0.28 * h);
  ctx.lineTo(posX + 0.47 * dir * w, y - 0.35 * h);
  ctx.closePath();
  ctx.fillStyle = bandColor;
  ctx.fill();
  ctx.stroke();

  // Silver studs on wristband
  ctx.beginPath();
  ctx.arc(
    posX + 0.63 * dir * w,
    y - 0.34 * h,
    Math.max(1, 0.03 * w),
    0,
    Math.PI * 2,
  );
  ctx.arc(
    posX + 0.53 * dir * w,
    y - 0.4 * h,
    Math.max(1, 0.03 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = spikeColor;
  ctx.fill();

  // Hand Claws
  for (let c = 0; c < 3; c++) {
    ctx.beginPath();
    const clawX = posX + (0.68 + c * 0.08) * dir * w;
    const clawY = y - (0.33 - c * 0.05) * h;
    ctx.moveTo(clawX, clawY);
    ctx.lineTo(clawX + 0.12 * dir * w, clawY + 0.04 * h);
    ctx.lineTo(clawX + 0.02 * dir * w, clawY + 0.08 * h);
    ctx.closePath();
    ctx.fillStyle = spikeColor;
    ctx.fill();
  }

  // 8. Head Base & Neck
  ctx.beginPath();
  ctx.moveTo(posX - 0.08 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX - 0.15 * dir * w, y - 0.92 * h);
  ctx.lineTo(posX + 0.25 * dir * w, y - 0.96 * h);
  ctx.lineTo(posX + 0.35 * dir * w, y - 0.72 * h);
  ctx.closePath();
  ctx.fillStyle = scalesColor;
  ctx.fill();
  ctx.stroke();

  // 9. Back Horn (partially behind hair)
  ctx.beginPath();
  ctx.moveTo(posX - 0.02 * dir * w, y - 0.88 * h);
  ctx.quadraticCurveTo(
    posX - 0.18 * dir * w,
    y - 1.15 * h,
    posX - 0.42 * dir * w,
    y - 1.08 * h,
  );
  ctx.quadraticCurveTo(
    posX - 0.22 * dir * w,
    y - 0.96 * h,
    posX - 0.12 * dir * w,
    y - 0.86 * h,
  );
  ctx.closePath();
  ctx.fillStyle = spikeColor;
  ctx.fill();
  ctx.stroke();

  // 10. Tan Snout / Jaws & Fangs
  // Upper snout
  ctx.beginPath();
  ctx.moveTo(posX + 0.18 * dir * w, y - 0.88 * h);
  ctx.lineTo(posX + 0.68 * dir * w, y - 0.88 * h);
  ctx.lineTo(posX + 0.84 * dir * w, y - 0.78 * h);
  ctx.lineTo(posX + 0.68 * dir * w, y - 0.71 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.72 * h);
  ctx.closePath();
  ctx.fillStyle = snoutColor;
  ctx.fill();
  ctx.stroke();

  // Lower jaw
  ctx.beginPath();
  ctx.moveTo(posX + 0.25 * dir * w, y - 0.71 * h);
  ctx.lineTo(posX + 0.72 * dir * w, y - 0.71 * h);
  ctx.lineTo(posX + 0.62 * dir * w, y - 0.63 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.65 * h);
  ctx.closePath();
  ctx.fillStyle = snoutColor;
  ctx.fill();
  ctx.stroke();

  // Sharp white teeth / fangs
  ctx.beginPath();
  // Top fang pointing down
  ctx.moveTo(posX + 0.66 * dir * w, y - 0.72 * h);
  ctx.lineTo(posX + 0.71 * dir * w, y - 0.66 * h);
  ctx.lineTo(posX + 0.76 * dir * w, y - 0.72 * h);
  // Bottom fang pointing up
  ctx.moveTo(posX + 0.52 * dir * w, y - 0.71 * h);
  ctx.lineTo(posX + 0.56 * dir * w, y - 0.77 * h);
  ctx.lineTo(posX + 0.6 * dir * w, y - 0.71 * h);
  ctx.closePath();
  ctx.fillStyle = spikeColor;
  ctx.fill();

  // Nostril dot
  ctx.beginPath();
  ctx.arc(
    posX + 0.72 * dir * w,
    y - 0.81 * h,
    Math.max(0.8, 0.02 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = outlineColor;
  ctx.fill();

  // 11. Fierce Eye & Heavy Brow Ridge
  // Eye socket / sclera
  ctx.beginPath();
  ctx.ellipse(
    posX + 0.35 * dir * w,
    y - 0.85 * h,
    Math.max(0.1, 0.08 * w),
    Math.max(0.1, 0.06 * h),
    0.15 * dir,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Red pupil
  ctx.beginPath();
  ctx.arc(
    posX + 0.38 * dir * w,
    y - 0.85 * h,
    Math.max(0.1, 0.04 * w),
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "#dc2626";
  ctx.fill();

  // Heavy brow ridge
  ctx.beginPath();
  ctx.moveTo(posX + 0.2 * dir * w, y - 0.88 * h);
  ctx.lineTo(posX + 0.46 * dir * w, y - 0.9 * h);
  ctx.lineTo(posX + 0.48 * dir * w, y - 0.87 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 0.85 * h);
  ctx.closePath();
  ctx.fillStyle = hairColor;
  ctx.fill();

  // 12. Front Curved Bull Horn
  ctx.beginPath();
  ctx.moveTo(posX + 0.04 * dir * w, y - 0.89 * h);
  ctx.quadraticCurveTo(
    posX - 0.12 * dir * w,
    y - 1.2 * h,
    posX - 0.42 * dir * w,
    y - 1.14 * h,
  );
  ctx.quadraticCurveTo(
    posX - 0.18 * dir * w,
    y - 0.98 * h,
    posX - 0.08 * dir * w,
    y - 0.88 * h,
  );
  ctx.closePath();
  ctx.fillStyle = spikeColor;
  ctx.fill();
  ctx.stroke();

  // 13. Fiery Crimson Spiky Mane / Hair
  ctx.beginPath();
  ctx.moveTo(posX + 0.26 * dir * w, y - 0.92 * h);
  ctx.lineTo(posX + 0.22 * dir * w, y - 1.1 * h); // Front flame tip
  ctx.lineTo(posX + 0.08 * dir * w, y - 0.98 * h);
  ctx.lineTo(posX - 0.05 * dir * w, y - 1.22 * h); // Center highest flame tip
  ctx.lineTo(posX - 0.15 * dir * w, y - 1.02 * h);
  ctx.lineTo(posX - 0.32 * dir * w, y - 1.14 * h); // Back flame tip
  ctx.lineTo(posX - 0.36 * dir * w, y - 0.88 * h);
  ctx.lineTo(posX + 0.12 * dir * w, y - 0.85 * h);
  ctx.closePath();
  ctx.fillStyle = hairColor;
  ctx.fill();
  ctx.stroke();

  drawCharacterStateAuras(ctx, posX, y, w, h, dir, state);
  ctx.restore();
}
