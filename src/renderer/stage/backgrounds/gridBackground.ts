/**
 * Grid Background renderer.
 */
export function drawGridBackground(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  isLight = false,
): void {
  if (isLight) {
    // Light blueprint / high-contrast technical grid
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(15, 23, 42, 0.08)";
    ctx.lineWidth = 1;
    const gridStep = 40;
    for (let x = 0; x < canvas.width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    return;
  }

  ctx.fillStyle = "#12141c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Light grid for spatial reference, since we have no real stage geometry.
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  const gridStep = 40;
  for (let x = 0; x < canvas.width; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}
