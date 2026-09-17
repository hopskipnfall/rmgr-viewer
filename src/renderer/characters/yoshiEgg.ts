/**
 * Encased-in-egg overlay (action state 0x0b2, universal across
 * characters) - a cream Yoshi egg shell with green spots, replacing the
 * fully-obscured character body.
 */
export function drawYoshiEggShell(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  halfWidth: number,
  heightPx: number,
): void {
  drawYoshiEgg(ctx, x, centerY, halfWidth * 1.3, heightPx * 0.55);
}

/**
 * The egg shape itself - cream shell with green spots - shared by the
 * encased-in-egg overlay above (sized to cover a whole character) and
 * the WPKind.EggThrow item marker in drawCustomWeaponShape (sized as a
 * small in-flight egg).
 */
export function drawYoshiEgg(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  eggW: number,
  eggH: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, eggW, eggH, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#fdf6e3";
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const spots: [number, number, number][] = [
    [-eggW * 0.35, -eggH * 0.35, eggW * 0.18],
    [eggW * 0.3, -eggH * 0.05, eggW * 0.14],
    [-eggW * 0.05, eggH * 0.4, eggW * 0.16],
    [eggW * 0.35, eggH * 0.35, eggW * 0.13],
  ];
  ctx.fillStyle = "#4ade80";
  for (const [dx, dy, r] of spots) {
    ctx.beginPath();
    ctx.ellipse(x + dx, y + dy, r, r * 0.75, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
