import { describe, it, expect, vi } from "vitest";
import {
  PIKACHU_UTIL_TAIL_KEYFRAMES,
  getUtiltTailSample,
  getUtiltTailStretch,
  getUtiltSwingAngleDeg,
  getPikachuUtiltTailTransform,
  applyPikachuUtiltTailTransform,
} from "./pikachuUtiltAnimation.js";

describe("pikachuUtiltAnimation", () => {
  it("matches keyframe data at exact frame points", () => {
    for (const kf of PIKACHU_UTIL_TAIL_KEYFRAMES) {
      const sample = getUtiltTailSample(kf.frame);
      expect(sample.x).toBeCloseTo(kf.x, 3);
      expect(sample.y).toBeCloseTo(kf.y, 3);
      expect(sample.z).toBeCloseTo(kf.z, 3);
    }
  });

  it("smoothly interpolates intermediate frames", () => {
    const sHalf = getUtiltTailSample(0.5);
    expect(sHalf.x).toBeLessThan(PIKACHU_UTIL_TAIL_KEYFRAMES[0]!.x);
    expect(sHalf.x).toBeGreaterThan(PIKACHU_UTIL_TAIL_KEYFRAMES[1]!.x);

    // Clamps out of bounds
    const sNeg = getUtiltTailSample(-5);
    expect(sNeg.x).toBeCloseTo(PIKACHU_UTIL_TAIL_KEYFRAMES[0]!.x, 3);
    const sOver = getUtiltTailSample(30);
    expect(sOver.x).toBeCloseTo(
      PIKACHU_UTIL_TAIL_KEYFRAMES[PIKACHU_UTIL_TAIL_KEYFRAMES.length - 1]!.x,
      3,
    );
  });

  it("calculates stretch multiplier correctly", () => {
    expect(getUtiltTailStretch(0)).toBe(1.0);
    expect(getUtiltTailStretch(5)).toBe(1.0);
    expect(getUtiltTailStretch(10)).toBeCloseTo(1.5, 4);
    expect(getUtiltTailStretch(14)).toBeCloseTo(1.0, 4);
    expect(getUtiltTailStretch(20)).toBe(1.0);
    expect(getUtiltTailStretch(26)).toBe(1.0);
  });

  it("calculates fluid swing angle progression peaking at frame 10", () => {
    expect(getUtiltSwingAngleDeg(0)).toBe(0.0);
    // Slight anticipation dip
    expect(getUtiltSwingAngleDeg(2)).toBe(-5.0);
    // Sweeps upward
    expect(getUtiltSwingAngleDeg(6)).toBeGreaterThan(50);
    // Peak forward whip crack
    expect(getUtiltSwingAngleDeg(10)).toBe(115.0);
    // Decelerates smoothly back to resting pose
    expect(getUtiltSwingAngleDeg(26)).toBe(0.0);
  });

  it("returns identity-equivalent transform at frame 0 and frame 26", () => {
    const t0 = getPikachuUtiltTailTransform(0, 1, 20, 40);
    expect(t0.deltaAngle).toBeCloseTo(0, 3);
    expect(t0.stretch).toBeCloseTo(1.0, 3);

    const t26 = getPikachuUtiltTailTransform(26, 1, 20, 40);
    expect(t26.deltaAngle).toBeCloseTo(0, 3);
    expect(t26.stretch).toBeCloseTo(1.0, 3);
  });

  it("mirrors rotation angle symmetrically when facing opposite directions", () => {
    // Peak frame 8
    const tRight = getPikachuUtiltTailTransform(8, 1, 20, 40);
    const tLeft = getPikachuUtiltTailTransform(8, -1, 20, 40);

    expect(tRight.stretch).toBeCloseTo(tLeft.stretch, 4);
    // Facing right rotates counter-clockwise / forward, facing left rotates clockwise / forward
    expect(tRight.deltaAngle).toBeCloseTo(-tLeft.deltaAngle, 3);
  });

  it("applies canvas operations in the correct order", () => {
    const calls: string[] = [];
    const dummyCtx = {
      translate: (x: number, y: number) => {
        calls.push(`translate(${x},${y})`);
      },
      rotate: (rad: number) => {
        calls.push(`rotate(${rad.toFixed(3)})`);
      },
      scale: (sx: number, sy: number) => {
        calls.push(`scale(${sx.toFixed(3)},${sy.toFixed(3)})`);
      },
    } as unknown as CanvasRenderingContext2D;

    applyPikachuUtiltTailTransform(dummyCtx, 100, 200, 1, 20, 40, 8);
    expect(calls[0]).toBe("translate(100,200)");
    expect(calls[calls.length - 1]).toBe("translate(-100,-200)");
  });
});

import { drawPikachuPolygons } from "./pikachu.js";
import type { CharacterAnimState } from "../common.js";

describe("drawPikachuPolygons animation gating", () => {
  function makeMockCtx() {
    return {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      quadraticCurveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      rect: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
  }

  const baseState: CharacterAnimState = {
    taunting: false,
    inCombo: false,
    isRoll: false,
    isTechRoll: false,
    isTechInPlace: false,
    isTumble: false,
    isProne: false,
    isDownBound: false,
    isInvulnerable: false,
    isSpecial: false,
    isLanding: false,
    isDizzy: false,
    isSleep: false,
    isOpponent: false,
    actionFrameCounter: 8,
  };

  it("does not animate tail when animationEnabled is false or unset", () => {
    const ctx = makeMockCtx();
    drawPikachuPolygons(ctx, "grid", 100, 100, 60, 80, 20, 40, 1, "#ff0000", {
      ...baseState,
      animationEnabled: false,
      isUtilt: true,
    });

    // Initial save from drawPikachuPolygons, but no second save for animated tail
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.scale).not.toHaveBeenCalled();
  });

  it("does not animate tail when isUtilt is false", () => {
    const ctx = makeMockCtx();
    drawPikachuPolygons(ctx, "grid", 100, 100, 60, 80, 20, 40, 1, "#ff0000", {
      ...baseState,
      animationEnabled: true,
      isUtilt: false,
    });

    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.scale).not.toHaveBeenCalled();
  });

  it("does not animate tail when actionFrameCounter is 27 or greater", () => {
    const ctx = makeMockCtx();
    drawPikachuPolygons(ctx, "grid", 100, 100, 60, 80, 20, 40, 1, "#ff0000", {
      ...baseState,
      actionFrameCounter: 27,
      animationEnabled: true,
      isUtilt: true,
    });

    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.scale).not.toHaveBeenCalled();
  });

  it("animates tail when animationEnabled and isUtilt are true within frame range", () => {
    const ctx = makeMockCtx();
    drawPikachuPolygons(ctx, "grid", 100, 100, 60, 80, 20, 40, 1, "#ff0000", {
      ...baseState,
      actionFrameCounter: 8,
      animationEnabled: true,
      isUtilt: true,
    });

    // 1 save for the avatar + 1 save for the animated tail
    expect(ctx.save).toHaveBeenCalledTimes(2);
    expect(ctx.restore).toHaveBeenCalledTimes(2);
    expect(ctx.scale).toHaveBeenCalled();
  });
});
