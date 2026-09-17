import type { Camera } from "../../camera.js";
import { type PortIndex, type Replay } from "@rmg-k/rmgr";
import { characterSize } from "../../characterSizes.js";
import {
  isQuickAttackState,
  isRollState,
  isCrouchState,
  type QuickAttackPath,
} from "../common/index.js";

export function drawPikachuQuickAttackStreak(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  port: PortIndex,
  replay: Replay,
  frameIndex: number,
): void {
  const pathPoints: Array<{ x: number; y: number }> = [];

  let currIdx = frameIndex;
  while (currIdx >= 0) {
    const pData = replay.frames[currIdx]?.ports[port]?.state;
    if (!pData || !isQuickAttackState(pData.actionStateId)) {
      break;
    }
    pathPoints.push({ x: pData.positionX, y: pData.positionY });
    if (pData.actionStateId === 0x0e8 || pData.actionStateId === 0x0eb) {
      break;
    }
    currIdx--;
  }

  if (pathPoints.length < 2) return;
  pathPoints.reverse(); // Chronological order: [startPoint, ..., currentPoint]

  const charId = replay.matchSettings?.characterId[port] ?? 0x09;
  const size = characterSize(charId);
  const halfHeightWorld = size.height / 2;

  const screenPoints = pathPoints.map((pt) =>
    camera.worldToScreen(pt.x, pt.y + halfHeightWorld),
  );

  ctx.save();

  // 1. Broad outer lightning glow
  ctx.beginPath();
  ctx.moveTo(screenPoints[0]!.x, screenPoints[0]!.y);
  for (let i = 1; i < screenPoints.length; i++) {
    ctx.lineTo(screenPoints[i]!.x, screenPoints[i]!.y);
  }
  ctx.strokeStyle = "rgba(255, 235, 59, 0.4)";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "#facc15";
  ctx.shadowBlur = 16;
  ctx.stroke();

  // 2. Saturated electric yellow core streak
  ctx.beginPath();
  ctx.moveTo(screenPoints[0]!.x, screenPoints[0]!.y);
  for (let i = 1; i < screenPoints.length; i++) {
    ctx.lineTo(screenPoints[i]!.x, screenPoints[i]!.y);
  }
  ctx.strokeStyle = "#ffe600";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "#fde047";
  ctx.shadowBlur = 8;
  ctx.stroke();

  // 3. Hot-white lightning core
  ctx.beginPath();
  ctx.moveTo(screenPoints[0]!.x, screenPoints[0]!.y);
  for (let i = 1; i < screenPoints.length; i++) {
    ctx.lineTo(screenPoints[i]!.x, screenPoints[i]!.y);
  }
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // 4. Origin spark burst at the starting frame
  const origin = screenPoints[0]!;
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#ffe600";
  ctx.shadowBlur = 12;
  ctx.fill();

  ctx.restore();
}

export function drawQuickAttackOverlay(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  paths: readonly QuickAttackPath[],
  hoveredIndex: number | null,
): void {
  for (const path of paths) {
    const isHovered = path.index === hoveredIndex;
    const screenPts = path.points.map((pt) => camera.worldToScreen(pt.x, pt.y));
    if (screenPts.length < 2) continue;

    ctx.save();

    // 1. Broad outer lightning stroke
    ctx.beginPath();
    ctx.moveTo(screenPts[0]!.x, screenPts[0]!.y);
    for (let i = 1; i < screenPts.length; i++) {
      ctx.lineTo(screenPts[i]!.x, screenPts[i]!.y);
    }
    ctx.strokeStyle = isHovered
      ? "rgba(255, 240, 0, 0.95)"
      : "rgba(255, 215, 0, 0.55)";
    ctx.lineWidth = isHovered ? 13 : 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = isHovered ? "#ffffff" : "#ffd700";
    ctx.shadowBlur = isHovered ? 24 : 12;
    ctx.stroke();

    // 2. Vibrant electric yellow mid-stroke
    ctx.beginPath();
    ctx.moveTo(screenPts[0]!.x, screenPts[0]!.y);
    for (let i = 1; i < screenPts.length; i++) {
      ctx.lineTo(screenPts[i]!.x, screenPts[i]!.y);
    }
    ctx.strokeStyle = isHovered ? "#ffffff" : "#ffe600";
    ctx.lineWidth = isHovered ? 6 : 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // 3. Crisp bright white central lightning core
    ctx.beginPath();
    ctx.moveTo(screenPts[0]!.x, screenPts[0]!.y);
    for (let i = 1; i < screenPts.length; i++) {
      ctx.lineTo(screenPts[i]!.x, screenPts[i]!.y);
    }
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = isHovered ? 2.5 : 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // 4. Start origin spark flare
    const start = screenPts[0]!;
    ctx.beginPath();
    ctx.arc(start.x, start.y, isHovered ? 6 : 4, 0, Math.PI * 2);
    ctx.fillStyle = isHovered ? "#ffffff" : "#ffe600";
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = isHovered ? 16 : 8;
    ctx.fill();

    // 5. Index badge label above start point
    if (isHovered) {
      ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
      ctx.shadowBlur = 4;
      ctx.fillText(`#${path.index}`, start.x, start.y - 12);
    }

    ctx.restore();
  }
}

export function drawRollTrail(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  port: PortIndex,
  replay: Replay,
  frameIndex: number,
): void {
  const pathPoints: Array<{
    x: number;
    y: number;
    halfWidth: number;
    heightPx: number;
    facingDirection: 1 | -1;
    actionStateId: number;
  }> = [];

  let currIdx = frameIndex;
  while (currIdx >= 0) {
    const pData = replay.frames[currIdx]?.ports[port]?.state;
    if (!pData || !isRollState(pData.actionStateId)) {
      break;
    }
    const size = characterSize(pData.characterId);
    const crouching = isCrouchState(pData.actionStateId);
    const heightPx = camera.worldLengthToScreen(
      size.height * (crouching ? 0.5 : 1.0),
    );
    const halfWidth = camera.worldLengthToScreen(size.width) / 2;
    pathPoints.push({
      x: pData.positionX,
      y: pData.positionY,
      halfWidth,
      heightPx,
      facingDirection: pData.facingDirection,
      actionStateId: pData.actionStateId,
    });
    if (pData.actionFrameCounter === 0) {
      break;
    }
    currIdx--;
  }

  if (pathPoints.length < 2) return;
  pathPoints.reverse(); // Chronological order: [start, ..., current]

  ctx.save();

  // 1. Ghost afterimage wireframes along recent positions of the roll
  const ghostIndices = [
    Math.floor(pathPoints.length * 0.25),
    Math.floor(pathPoints.length * 0.55),
    Math.floor(pathPoints.length * 0.8),
  ];

  for (let g = 0; g < ghostIndices.length; g++) {
    const idx = ghostIndices[g]!;
    const pt = pathPoints[idx];
    if (!pt) continue;
    const ghostAlpha = 0.12 + g * 0.12; // 0.12 -> 0.24 -> 0.36
    const screen = camera.worldToScreen(pt.x, pt.y);
    const ghostRadiusX = pt.halfWidth * 0.85;
    const ghostRadiusY = (pt.heightPx / 2) * 0.85;
    const ghostCenterY = screen.y - pt.heightPx / 2;

    ctx.beginPath();
    ctx.ellipse(
      screen.x,
      ghostCenterY,
      ghostRadiusX,
      ghostRadiusY,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = `rgba(255, 255, 255, ${ghostAlpha * 0.4})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 255, 255, ${ghostAlpha})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // 2. Streamlined horizontal speed streaks trailing behind the roll
  const heights = [0.15, 0.5, 0.85]; // bottom, mid, top
  for (let h = 0; h < heights.length; h++) {
    const hFrac = heights[h]!;
    ctx.beginPath();
    for (let i = 0; i < pathPoints.length; i++) {
      const pt = pathPoints[i]!;
      const screen = camera.worldToScreen(pt.x, pt.y);
      const yPos = screen.y - pt.heightPx * hFrac;
      if (i === 0) {
        ctx.moveTo(screen.x, yPos);
      } else {
        ctx.lineTo(screen.x, yPos);
      }
    }
    ctx.strokeStyle =
      h === 1 ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = h === 1 ? 2.0 : 1.2;
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
    ctx.shadowBlur = 6;
    ctx.stroke();
  }

  ctx.restore();
}
