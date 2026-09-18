/**
 * Draws the fluffy Smash 64 cumulus revival cloud platform beneath a respawning fighter's feet
 * during Revive1 (0x007), Revive2 (0x008), and ReviveWait (0x009).
 *
 * Visual design:
 * - Positioned directly beneath the fighter's feet (x, y) with top billows supporting their stance.
 * - Width scales naturally with the fighter model's scale.
 * - Multi-lobed cumulus silhouette with overlapping puffs giving natural 3D depth and volume.
 * - Gradient shading: pure soft white top highlights down to pearlescent sky-blue / lavender underbelly shading.
 * - Ethereal ambient celestial under-glow (shadowBlur).
 * - Subtle drifting micro-wisps bobbing gently with actionFrameCounter for a buoyant floating feel.
 */
export function drawReviveCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  halfWidth: number,
  frameCounter: number = 0,
  isLight: boolean = false,
): void {
  const w = halfWidth * 1.6;
  const s = w / 40;
  // Gentle breathing/buoyancy floating motion
  const hoverOffset = Math.sin(frameCounter * 0.08) * (1.5 * s);
  const cloudY = y + hoverOffset;

  ctx.save();

  // 1. Soft celestial under-glow / shadow
  ctx.shadowColor = isLight
    ? "rgba(100, 116, 139, 0.45)"
    : "rgba(186, 230, 253, 0.75)";
  ctx.shadowBlur = Math.max(1, 12 * s);

  // 2. Base gradient for cumulus volume (white on top, celestial blue/slate underneath)
  const cloudGrad = ctx.createLinearGradient(
    x,
    cloudY - 2 * s,
    x,
    cloudY + 18 * s,
  );
  if (isLight) {
    cloudGrad.addColorStop(0.0, "rgba(255, 255, 255, 0.98)");
    cloudGrad.addColorStop(0.45, "rgba(241, 245, 249, 0.95)");
    cloudGrad.addColorStop(1.0, "rgba(203, 213, 225, 0.9)");
  } else {
    cloudGrad.addColorStop(0.0, "rgba(255, 255, 255, 0.98)");
    cloudGrad.addColorStop(0.4, "rgba(240, 249, 255, 0.95)");
    cloudGrad.addColorStop(1.0, "rgba(186, 230, 253, 0.92)");
  }

  // 3. Draw main cloud body with overlapping billowy lobes
  ctx.fillStyle = cloudGrad;
  ctx.beginPath();

  // Center bottom lobe
  ctx.arc(x, cloudY + 8 * s, w * 0.52, 0, Math.PI * 2);
  // Left mid lobe
  ctx.arc(x - w * 0.44, cloudY + 7 * s, w * 0.42, 0, Math.PI * 2);
  // Right mid lobe
  ctx.arc(x + w * 0.44, cloudY + 7 * s, w * 0.42, 0, Math.PI * 2);
  // Left far outer lobe
  ctx.arc(x - w * 0.78, cloudY + 6 * s, w * 0.3, 0, Math.PI * 2);
  // Right far outer lobe
  ctx.arc(x + w * 0.78, cloudY + 6 * s, w * 0.3, 0, Math.PI * 2);

  // Upper flat-topped landing surface puffs where the feet rest
  ctx.arc(x, cloudY + 2 * s, w * 0.38, 0, Math.PI * 2);
  ctx.arc(x - w * 0.32, cloudY + 3 * s, w * 0.32, 0, Math.PI * 2);
  ctx.arc(x + w * 0.32, cloudY + 3 * s, w * 0.32, 0, Math.PI * 2);

  ctx.fill();

  // 4. Subtle billowy rim stroke
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.strokeStyle = isLight
    ? "rgba(255, 255, 255, 0.95)"
    : "rgba(224, 242, 254, 0.85)";
  ctx.lineWidth = Math.max(0.5, 1.6 * s);
  ctx.stroke();

  // 5. Crisp top highlights on upper curves for a soft, cottony rim
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.lineWidth = Math.max(0.5, 1.8 * s);

  // Center top crest
  ctx.beginPath();
  ctx.arc(x, cloudY + 2 * s, w * 0.36, -Math.PI * 0.85, -Math.PI * 0.15);
  ctx.stroke();

  // Left top crest
  ctx.beginPath();
  ctx.arc(
    x - w * 0.32,
    cloudY + 3 * s,
    w * 0.3,
    -Math.PI * 0.9,
    -Math.PI * 0.2,
  );
  ctx.stroke();

  // Right top crest
  ctx.beginPath();
  ctx.arc(
    x + w * 0.32,
    cloudY + 3 * s,
    w * 0.3,
    -Math.PI * 0.8,
    -Math.PI * 0.1,
  );
  ctx.stroke();

  ctx.restore();

  // 6. Floating micro-wisps (buoyant ambient cloud droplets)
  const wisp1X = x - w * 0.95 + Math.sin(frameCounter * 0.08) * (3 * s);
  const wisp1Y = cloudY + 2 * s + Math.cos(frameCounter * 0.08) * (2 * s);
  const wisp2X = x + w * 0.92 + Math.cos(frameCounter * 0.09) * (3 * s);
  const wisp2Y = cloudY + 4 * s + Math.sin(frameCounter * 0.09) * (2 * s);
  const wisp3X = x + w * 0.25 + Math.sin(frameCounter * 0.06 + 1.2) * (2.5 * s);
  const wisp3Y = cloudY + 14 * s + Math.cos(frameCounter * 0.06) * (1.8 * s);

  ctx.fillStyle = isLight
    ? "rgba(241, 245, 249, 0.85)"
    : "rgba(240, 249, 255, 0.9)";
  ctx.beginPath();
  ctx.arc(wisp1X, wisp1Y, Math.max(0.5, 4.0 * s), 0, Math.PI * 2);
  ctx.arc(wisp2X, wisp2Y, Math.max(0.5, 3.5 * s), 0, Math.PI * 2);
  ctx.arc(wisp3X, wisp3Y, Math.max(0.5, 3.0 * s), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export const CLOUD_DISSIPATE_FRAMES = 20;

/**
 * Draws the dissipating Smash 64 cumulus revival cloud platform after the fighter
 * departs from Revive1 (0x007), Revive2 (0x008), or ReviveWait (0x009).
 *
 * Visual progression across CLOUD_DISSIPATE_FRAMES:
 * - The cloud billow puffs expand outwards and drift apart horizontally and vertically.
 * - Solid upper landing crest highlights dissolve immediately into soft vapor.
 * - The vertical gradient and ethereal under-glow smoothly dissolve with non-linear alpha decay.
 * - Dispersing vapor wisps fan out into the atmosphere and fade away.
 */
export function drawReviveCloudDissipating(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  halfWidth: number,
  framesSinceExit: number,
  isLight: boolean = false,
): void {
  const f = Math.max(0, Math.floor(framesSinceExit));
  if (f >= CLOUD_DISSIPATE_FRAMES) return;

  const progress = f / CLOUD_DISSIPATE_FRAMES; // 0.0 to 1.0
  const alpha = Math.max(0, 1 - progress);
  const w = halfWidth * 1.6;
  const s = w / 40;
  // Soft, subtle dissolution - puffs stay in place and gently fade into mist
  const scale = Math.max(0.7, 1 - progress * 0.2);

  ctx.save();

  // 1. Soft celestial under-glow dissipating in place
  ctx.shadowColor = isLight
    ? `rgba(100, 116, 139, ${0.45 * alpha})`
    : `rgba(186, 230, 253, ${0.75 * alpha})`;
  ctx.shadowBlur = Math.max(0, 12 * alpha * s);

  // 2. Base gradient for cumulus volume fading softly with alpha
  const cloudGrad = ctx.createLinearGradient(x, y - 2 * s, x, y + 18 * s);
  if (isLight) {
    cloudGrad.addColorStop(0.0, `rgba(255, 255, 255, ${0.98 * alpha})`);
    cloudGrad.addColorStop(0.45, `rgba(241, 245, 249, ${0.95 * alpha})`);
    cloudGrad.addColorStop(1.0, `rgba(203, 213, 225, ${0.9 * alpha})`);
  } else {
    cloudGrad.addColorStop(0.0, `rgba(255, 255, 255, ${0.98 * alpha})`);
    cloudGrad.addColorStop(0.4, `rgba(240, 249, 255, ${0.95 * alpha})`);
    cloudGrad.addColorStop(1.0, `rgba(186, 230, 253, ${0.92 * alpha})`);
  }

  ctx.fillStyle = cloudGrad;
  ctx.beginPath();

  // Center bottom lobe
  ctx.arc(x, y + 8 * s, w * 0.52 * scale, 0, Math.PI * 2);
  // Left mid lobe
  ctx.arc(x - w * 0.44, y + 7 * s, w * 0.42 * scale, 0, Math.PI * 2);
  // Right mid lobe
  ctx.arc(x + w * 0.44, y + 7 * s, w * 0.42 * scale, 0, Math.PI * 2);
  // Left far outer lobe
  ctx.arc(x - w * 0.78, y + 6 * s, w * 0.3 * scale, 0, Math.PI * 2);
  // Right far outer lobe
  ctx.arc(x + w * 0.78, y + 6 * s, w * 0.3 * scale, 0, Math.PI * 2);

  // Upper flat-topped landing surface puffs
  ctx.arc(x, y + 2 * s, w * 0.38 * scale, 0, Math.PI * 2);
  ctx.arc(x - w * 0.32, y + 3 * s, w * 0.32 * scale, 0, Math.PI * 2);
  ctx.arc(x + w * 0.32, y + 3 * s, w * 0.32 * scale, 0, Math.PI * 2);

  ctx.fill();

  // 3. Dissipating rim stroke (fades quickly by progress 0.5)
  if (progress < 0.5) {
    const strokeAlpha = alpha * (1 - progress / 0.5);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isLight
      ? `rgba(255, 255, 255, ${0.95 * strokeAlpha})`
      : `rgba(224, 242, 254, ${0.85 * strokeAlpha})`;
    ctx.lineWidth = Math.max(0.5, 1.6 * (1 - progress) * s);
    ctx.stroke();
  }

  // 4. Floating dispersing vapor droplets evaporating upward
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  const wispAlpha = alpha * 0.85;
  ctx.fillStyle = isLight
    ? `rgba(241, 245, 249, ${wispAlpha})`
    : `rgba(240, 249, 255, ${wispAlpha})`;

  const wisps = [
    {
      dx: -w * 0.95,
      dy: (2 - progress * 6) * s,
      r: Math.max(0, 4.0 * (1 - progress) * s),
    },
    {
      dx: w * 0.92,
      dy: (4 - progress * 6) * s,
      r: Math.max(0, 3.5 * (1 - progress) * s),
    },
    {
      dx: w * 0.25,
      dy: (14 - progress * 4) * s,
      r: Math.max(0, 3.0 * (1 - progress) * s),
    },
  ];

  ctx.beginPath();
  for (const wisp of wisps) {
    if (wisp.r > 0.5 * s) {
      ctx.moveTo(x + wisp.dx + wisp.r, y + wisp.dy);
      ctx.arc(x + wisp.dx, y + wisp.dy, wisp.r, 0, Math.PI * 2);
    }
  }
  ctx.fill();

  ctx.restore();
}
