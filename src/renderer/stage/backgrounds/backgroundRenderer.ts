import type { Camera } from "../../../camera.js";
import type { BackgroundTheme } from "../../common/index.js";
import { drawGridBackground } from "./gridBackground.js";
import { drawMountainBackground } from "./mountainBackground.js";
import { drawBeachBackground } from "./beachBackground.js";
import { drawAutumnBackground } from "./autumnBackground.js";

export interface BackgroundBufferState {
  canvas?: HTMLCanvasElement;
  dirty: boolean;
  isLight?: boolean;
}

export class BackgroundRenderer {
  private bufferState: BackgroundBufferState = { dirty: true };

  invalidateBuffer(): void {
    this.bufferState.dirty = true;
  }

  drawGridBackground(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    isLight: boolean,
  ): void {
    drawGridBackground(ctx, canvas, isLight);
  }

  drawMountainBackground(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    isLight: boolean,
    camera?: Camera,
  ): void {
    drawMountainBackground(ctx, canvas, isLight, this.bufferState, camera);
  }

  drawBeachBackground(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    isLight: boolean,
    camera?: Camera,
  ): void {
    drawBeachBackground(ctx, canvas, isLight, this.bufferState, camera);
  }

  drawAutumnBackground(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    isLight: boolean,
    camera?: Camera,
  ): void {
    drawAutumnBackground(ctx, canvas, isLight, this.bufferState, camera);
  }

  drawBackground(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    theme: BackgroundTheme,
    isLight: boolean,
    camera?: Camera,
  ): void {
    if (theme === "grid") {
      this.drawGridBackground(ctx, canvas, isLight);
    } else if (theme === "beach") {
      this.drawBeachBackground(ctx, canvas, isLight, camera);
    } else if (theme === "autumn") {
      this.drawAutumnBackground(ctx, canvas, isLight, camera);
    } else {
      this.drawMountainBackground(ctx, canvas, isLight, camera);
    }
  }
}
