import type { Frame, PortIndex } from "@rmg-k/rmgr";
import { Camera } from "./camera.js";
import { PORT_COLORS } from "./players.js";
import { stageGeometry, type PlatformSpec } from "./stageGeometry.js";
import { characterSize } from "./characterSizes.js";

export class StageRenderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
  }

  render(
    camera: Camera,
    frame: Frame | undefined,
    stageId: number | undefined,
    hoverScreen: { x: number; y: number } | undefined,
  ): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawBackground();
    this.drawStage(camera, stageId);

    if (frame) {
      for (const key of Object.keys(frame.ports)) {
        const port = Number(key) as PortIndex;
        const portData = frame.ports[port];
        if (!portData) continue;
        this.drawPlayer(camera, port, portData.post);
      }
    }

    if (hoverScreen) {
      this.drawHoverCoordinates(camera, hoverScreen);
    }
  }

  private drawBackground(): void {
    const { ctx, canvas } = this;

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

  /** Real platform/ground geometry for stages we've measured (see stageGeometry.ts); a plain Y=0 reference line otherwise. */
  private drawStage(camera: Camera, stageId: number | undefined): void {
    const platforms = stageGeometry(stageId);
    if (!platforms) {
      this.drawFallbackGroundLine(camera);
      return;
    }
    for (const platform of platforms) {
      this.drawPlatform(camera, platform);
    }
  }

  private drawPlatform(camera: Camera, platform: PlatformSpec): void {
    const { ctx } = this;
    const left = camera.worldToScreen(platform.leftX, platform.y);
    const right = camera.worldToScreen(platform.rightX, platform.y);

    ctx.strokeStyle =
      platform.kind === "ground"
        ? "rgba(210,215,225,0.9)"
        : "rgba(160,195,255,0.8)";
    ctx.lineWidth = platform.kind === "ground" ? 8 : 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.stroke();
  }

  private drawFallbackGroundLine(camera: Camera): void {
    const { ctx, canvas } = this;
    const groundY = camera.groundScreenY();
    if (groundY < 0 || groundY > canvas.height) return;
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawPlayer(
    camera: Camera,
    port: PortIndex,
    post: {
      positionX: number;
      positionY: number;
      facingDirection: 1 | -1;
      damagePercent: number;
      characterId: number;
    },
  ): void {
    const { ctx } = this;
    // positionY is the character's foot position, not their center - Teeter
    // samples land exactly on platform surface Y (see stageGeometry.ts), so
    // the marker's bottom edge (not its middle) belongs at y.
    const { x, y } = camera.worldToScreen(post.positionX, post.positionY);
    const color = PORT_COLORS[port];
    const facingRight = post.facingDirection === 1;

    const size = characterSize(post.characterId);
    const halfWidth = camera.worldLengthToScreen(size.width) / 2;
    const heightPx = camera.worldLengthToScreen(size.height);
    const topY = y - heightPx;
    const noseY = y - heightPx * 0.5;

    // Isosceles triangle, nose pointing in the facing direction, feet at y and head at topY.
    const noseX = x + (facingRight ? halfWidth : -halfWidth);
    const backX = x + (facingRight ? -halfWidth : halfWidth);

    ctx.beginPath();
    ctx.moveTo(noseX, noseY);
    ctx.lineTo(backX, topY);
    ctx.lineTo(backX, y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Damage% label above the triangle, in the player's color.
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 3;
    ctx.fillText(`${post.damagePercent}%`, x, topY - 8);
    ctx.shadowBlur = 0;
  }

  /** World-space coordinates under the cursor, in a small label offset from the pointer. */
  private drawHoverCoordinates(
    camera: Camera,
    hoverScreen: { x: number; y: number },
  ): void {
    const { ctx } = this;
    const world = camera.screenToWorld(hoverScreen.x, hoverScreen.y);
    const label = `(${world.x.toFixed(0)}, ${world.y.toFixed(0)})`;

    const offsetX = 14;
    const offsetY = 18;
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "left";
    const textWidth = ctx.measureText(label).width;

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(
      hoverScreen.x + offsetX - 4,
      hoverScreen.y + offsetY - 12,
      textWidth + 8,
      17,
    );

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(label, hoverScreen.x + offsetX, hoverScreen.y + offsetY);
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
