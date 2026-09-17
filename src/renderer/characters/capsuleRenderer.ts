/**
 * Draws capture lock brackets when character is trapped in a grab.
 */
export function drawGrabbedBrackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  topY: number,
  y: number,
  halfWidth: number,
): void {
  const padX = halfWidth * 1.3;
  const bracketTop = topY - 2;
  const bracketBot = y + 2;
  const armLen = 5;

  ctx.save();
  ctx.strokeStyle = "rgba(255, 215, 60, 0.95)";
  ctx.lineWidth = 2;
  ctx.lineCap = "square";
  ctx.shadowColor = "rgba(255, 180, 0, 0.7)";
  ctx.shadowBlur = 4;

  // Left bracket [
  ctx.beginPath();
  ctx.moveTo(x - padX + armLen, bracketTop);
  ctx.lineTo(x - padX, bracketTop);
  ctx.lineTo(x - padX, bracketBot);
  ctx.lineTo(x - padX + armLen, bracketBot);
  ctx.stroke();

  // Right bracket ]
  ctx.beginPath();
  ctx.moveTo(x + padX - armLen, bracketTop);
  ctx.lineTo(x + padX, bracketTop);
  ctx.lineTo(x + padX, bracketBot);
  ctx.lineTo(x + padX - armLen, bracketBot);
  ctx.stroke();

  ctx.restore();
}
