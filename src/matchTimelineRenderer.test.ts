import { describe, it, expect } from "vitest";
import {
  renderMatchTimeline,
  OPPONENT_STOCK_LOSS_COLOR,
  STOCK_LOSS_MARKER_WIDTH_PX,
} from "./matchTimelineRenderer.js";
import { MAIN_PLAYER_COLOR } from "./players.js";
import type { FrameClassification, StockLossMarker } from "./matchTimeline.js";

describe("matchTimelineRenderer", () => {
  it("renders opponent stock losses with red color and perspective stock losses with blue color", () => {
    interface FillRectCall {
      x: number;
      y: number;
      width: number;
      height: number;
      fillStyle: string;
    }

    const fillRectCalls: FillRectCall[] = [];
    let currentFillStyle = "";

    const fakeCtx = {
      get fillStyle() {
        return currentFillStyle;
      },
      set fillStyle(val: string) {
        currentFillStyle = val;
      },
      fillRect(x: number, y: number, width: number, height: number) {
        fillRectCalls.push({
          x,
          y,
          width,
          height,
          fillStyle: currentFillStyle,
        });
      },
      clearRect: () => {},
    };

    const fakeCanvas = {
      getContext: () => fakeCtx,
      width: 1000,
      height: 40,
    } as unknown as HTMLCanvasElement;

    const classifications: FrameClassification[] = [
      "neutral",
      "neutral",
      "advantage",
      "advantage",
      "disadvantage",
      "disadvantage",
      "other",
      "other",
      "neutral",
      "neutral",
    ];

    const stockLossMarkers: StockLossMarker[] = [
      { frameIndex: 4, side: "opponent" },
      { frameIndex: 7, side: "perspective" },
    ];

    renderMatchTimeline(fakeCanvas, classifications, stockLossMarkers);

    // Verify stock loss markers were rendered across full canvas height
    const opponentLossDraws = fillRectCalls.filter(
      (c) =>
        c.fillStyle === OPPONENT_STOCK_LOSS_COLOR &&
        c.height === fakeCanvas.height,
    );
    expect(opponentLossDraws.length).toBe(1);
    expect(opponentLossDraws[0]!.width).toBeGreaterThanOrEqual(
      STOCK_LOSS_MARKER_WIDTH_PX,
    );
    expect(OPPONENT_STOCK_LOSS_COLOR).toBe("#ef4444");

    const perspectiveLossDraws = fillRectCalls.filter(
      (c) =>
        c.fillStyle === MAIN_PLAYER_COLOR && c.height === fakeCanvas.height,
    );
    expect(perspectiveLossDraws.length).toBe(1);
    expect(perspectiveLossDraws[0]!.width).toBeGreaterThanOrEqual(
      STOCK_LOSS_MARKER_WIDTH_PX,
    );

    // Verify dark outline precedes the marker draws
    const outlineCalls = fillRectCalls.filter(
      (c) => c.fillStyle === "rgba(0, 0, 0, 0.9)",
    );
    expect(outlineCalls.length).toBe(2);
    for (const outline of outlineCalls) {
      expect(outline.height).toBe(fakeCanvas.height);
      expect(outline.width).toBeGreaterThan(STOCK_LOSS_MARKER_WIDTH_PX);
    }
  });

  it("handles empty classifications gracefully", () => {
    let cleared = false;
    const fakeCtx = {
      clearRect: () => {
        cleared = true;
      },
      fillRect: () => {},
    };
    const fakeCanvas = {
      getContext: () => fakeCtx,
      width: 500,
      height: 20,
    } as unknown as HTMLCanvasElement;

    renderMatchTimeline(fakeCanvas, []);
    expect(cleared).toBe(true);
  });
});
