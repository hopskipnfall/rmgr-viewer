import { describe, it, expect } from "vitest";
import {
  DREAM_LAND_STAGE_ID,
  stageGeometry,
  stageSlopes,
  stageLedges,
  stageBlastZone,
  stageHeatmapBounds,
  DREAM_LAND_LEFT_SLOPE,
  DREAM_LAND_RIGHT_SLOPE,
  DREAM_LAND_BODY_POLYGON,
} from "./stageGeometry.js";

describe("stageGeometry", () => {
  it("returns platforms for Dream Land with ground from -2318 to 2318 at y=0", () => {
    const platforms = stageGeometry(DREAM_LAND_STAGE_ID);
    expect(platforms).toBeDefined();
    expect(platforms).toHaveLength(4);

    const ground = platforms!.find((p) => p.kind === "ground");
    expect(ground).toBeDefined();
    expect(ground!.leftX).toBe(-2318);
    expect(ground!.rightX).toBe(2318);
    expect(ground!.y).toBe(0);
  });

  it("returns undefined for unknown stage ID", () => {
    expect(stageGeometry(99999)).toBeUndefined();
    expect(stageGeometry(undefined)).toBeUndefined();
  });
});

describe("stageSlopes", () => {
  it("returns slopes and body polygon for Dream Land", () => {
    const slopes = stageSlopes(DREAM_LAND_STAGE_ID);
    expect(slopes).toBeDefined();
    expect(slopes!.leftSlope).toBe(DREAM_LAND_LEFT_SLOPE);
    expect(slopes!.rightSlope).toBe(DREAM_LAND_RIGHT_SLOPE);
    expect(slopes!.bodyPolygon).toBe(DREAM_LAND_BODY_POLYGON);
  });

  it("has exact authored coordinates for Dream Land left slope", () => {
    expect(DREAM_LAND_LEFT_SLOPE).toEqual([
      { x: -2318, y: 0 },
      { x: -2307, y: -124 },
      { x: -2290, y: -331 },
      { x: -2075, y: -834 },
      { x: -1972, y: -1072 },
    ]);
  });

  it("has right slope that is an exact mirror of left slope across x=0", () => {
    expect(DREAM_LAND_RIGHT_SLOPE).toHaveLength(DREAM_LAND_LEFT_SLOPE.length);
    for (let i = 0; i < DREAM_LAND_LEFT_SLOPE.length; i++) {
      const left = DREAM_LAND_LEFT_SLOPE[i]!;
      const right = DREAM_LAND_RIGHT_SLOPE[i]!;
      expect(right.x).toBe(-left.x);
      expect(right.y).toBe(left.y);
    }
  });

  it("connects ledges directly to the top vertices of left and right slopes", () => {
    const ledges = stageLedges(DREAM_LAND_STAGE_ID);
    expect(ledges).toBeDefined();
    const [leftLedge, rightLedge] = ledges!;

    expect(leftLedge.x).toBe(DREAM_LAND_LEFT_SLOPE[0]!.x);
    expect(leftLedge.y).toBe(DREAM_LAND_LEFT_SLOPE[0]!.y);

    expect(rightLedge.x).toBe(DREAM_LAND_RIGHT_SLOPE[0]!.x);
    expect(rightLedge.y).toBe(DREAM_LAND_RIGHT_SLOPE[0]!.y);
  });

  it("defines a closed body polygon connecting main floor, slopes, and bottom boundary", () => {
    expect(DREAM_LAND_BODY_POLYGON).toHaveLength(10);
    // Starts at left ledge
    expect(DREAM_LAND_BODY_POLYGON[0]).toEqual({ x: -2318, y: 0 });
    // Across main floor to right ledge
    expect(DREAM_LAND_BODY_POLYGON[1]).toEqual({ x: 2318, y: 0 });
    // Down right slope to bottom vertex
    expect(DREAM_LAND_BODY_POLYGON[5]).toEqual({ x: 1972, y: -1072 });
    // Across underbody bottom to bottom-left vertex
    expect(DREAM_LAND_BODY_POLYGON[6]).toEqual({ x: -1972, y: -1072 });
    // Up left slope back to below left ledge
    expect(DREAM_LAND_BODY_POLYGON[9]).toEqual({ x: -2307, y: -124 });
  });

  it("returns undefined for unknown stage ID", () => {
    expect(stageSlopes(99999)).toBeUndefined();
    expect(stageSlopes(undefined)).toBeUndefined();
  });
});

describe("stageBlastZone", () => {
  it("returns blast zones for Dream Land", () => {
    const bz = stageBlastZone(DREAM_LAND_STAGE_ID);
    expect(bz).toBeDefined();
    expect(bz!.leftX).toBe(-9000);
    expect(bz!.rightX).toBe(9000);
    expect(bz!.bottomY).toBe(-3500);
    expect(bz!.topY).toBe(8300);
  });
});

describe("stageHeatmapBounds", () => {
  it("returns tight stage-framed bounds for Dream Land with 5:3 aspect ratio", () => {
    const bounds = stageHeatmapBounds(DREAM_LAND_STAGE_ID);
    expect(bounds).toBeDefined();
    expect(bounds!.leftX).toBe(-3200);
    expect(bounds!.rightX).toBe(3200);
    expect(bounds!.bottomY).toBe(-1440);
    expect(bounds!.topY).toBe(2400);

    const width = bounds!.rightX - bounds!.leftX;
    const height = bounds!.topY - bounds!.bottomY;
    expect(width / height).toBeCloseTo(5 / 3, 5);
  });

  it("fully encloses stage ground, top platform, and lower hull vertices with buffer", () => {
    const bounds = stageHeatmapBounds(DREAM_LAND_STAGE_ID)!;
    // Dream Land ground: [-2318, 2318] at y=0
    expect(bounds.leftX).toBeLessThan(-2318);
    expect(bounds.rightX).toBeGreaterThan(2318);
    // Dream Land top platform at y=1542
    expect(bounds.topY).toBeGreaterThan(1542);
    // Dream Land lower hull bottom at y=-1072
    expect(bounds.bottomY).toBeLessThan(-1072);
  });

  it("returns undefined for unknown stage ID", () => {
    expect(stageHeatmapBounds(99999)).toBeUndefined();
    expect(stageHeatmapBounds(undefined)).toBeUndefined();
  });
});
