import { describe, expect, it } from "vitest";
import { ActionStateId, CharacterId } from "@rmg-k/rmgr";
import {
  getAttackAnimationAngle,
  PIKACHU_UP_AIR_SEGMENTS,
  FALCON_UP_AIR_SEGMENTS,
  KIRBY_UP_AIR_SEGMENTS,
} from "./attackAnimation.js";

const toDeg = (rad: number): number => (rad * 180) / Math.PI;

describe("getAttackAnimationAngle", () => {
  it("returns null for a character/state with no registered animation", () => {
    expect(
      getAttackAnimationAngle(CharacterId.Fox, ActionStateId.Uair, 0, true),
    ).toBeNull();
    expect(
      getAttackAnimationAngle(CharacterId.Pikachu, ActionStateId.Nair, 0, true),
    ).toBeNull();
  });

  it("returns null outside the 0-34 frame window", () => {
    expect(
      getAttackAnimationAngle(
        CharacterId.Pikachu,
        ActionStateId.Uair,
        -1,
        true,
      ),
    ).toBeNull();
    expect(
      getAttackAnimationAngle(
        CharacterId.Pikachu,
        ActionStateId.Uair,
        35,
        true,
      ),
    ).toBeNull();
  });

  it("starts at 0 degrees on frame 0", () => {
    const angle = getAttackAnimationAngle(
      CharacterId.Pikachu,
      ActionStateId.Uair,
      0,
      true,
    );
    expect(angle).not.toBeNull();
    expect(toDeg(angle!)).toBeCloseTo(0, 5);
  });

  it("ends at ~359.889 degrees on the last frame - one full spin, not multiple", () => {
    const angle = getAttackAnimationAngle(
      CharacterId.Pikachu,
      ActionStateId.Uair,
      34,
      true,
    );
    expect(angle).not.toBeNull();
    expect(toDeg(angle!)).toBeCloseTo(359.88911506654836, 6);
  });

  it("is continuous across segment boundaries (exact decoded values)", () => {
    // Segment 1 (linear) ends at frame 4; segment 2 (eased) starts there too.
    const boundaryAngle = getAttackAnimationAngle(
      CharacterId.Pikachu,
      ActionStateId.Uair,
      4,
      true,
    );
    expect(toDeg(boundaryAngle!)).toBeCloseTo(16.785872904223336, 6);

    // Segment 3 ends / segment 4 starts at frame 11.
    const secondBoundary = getAttackAnimationAngle(
      CharacterId.Pikachu,
      ActionStateId.Uair,
      11,
      true,
    );
    expect(toDeg(secondBoundary!)).toBeCloseTo(169.98493961010166, 6);
  });

  it("has matching values across every segment boundary", () => {
    for (let i = 0; i < PIKACHU_UP_AIR_SEGMENTS.length - 1; i++) {
      expect(PIKACHU_UP_AIR_SEGMENTS[i]!.endDeg).toBe(
        PIKACHU_UP_AIR_SEGMENTS[i + 1]!.startDeg,
      );
    }
  });

  it("has matching tangent rates across the eased (cubic) segment boundaries", () => {
    // Per Game Expert: each eased segment's end tangent rate exactly equals the next eased
    // segment's start tangent rate - confirming these were decoded as one continuous curve, not
    // independently fitted segments that merely happen to connect in value. Segment 1 is linear
    // (no tangent parameters - a flat rate throughout), so this only applies from segment 2 on.
    const eased = PIKACHU_UP_AIR_SEGMENTS.slice(1);
    for (let i = 0; i < eased.length - 1; i++) {
      expect(eased[i]!.rateEndDegPerFrame).toBe(
        eased[i + 1]!.rateStartDegPerFrame,
      );
    }
  });

  it("mirrors the rotation direction for facing left", () => {
    const right = getAttackAnimationAngle(
      CharacterId.Pikachu,
      ActionStateId.Uair,
      20,
      true,
    );
    const left = getAttackAnimationAngle(
      CharacterId.Pikachu,
      ActionStateId.Uair,
      20,
      false,
    );
    expect(left).toBeCloseTo(-right!, 10);
  });

  it("increases monotonically through the eased segments (no backward wobble)", () => {
    let prev = -Infinity;
    for (let f = 0; f <= 34; f++) {
      const angle = getAttackAnimationAngle(
        CharacterId.Pikachu,
        ActionStateId.Uair,
        f,
        true,
      )!;
      expect(angle).toBeGreaterThanOrEqual(prev);
      prev = angle;
    }
  });

  it("Falcon: starts at 0 and ends at ~-359.889 degrees - one full spin, opposite direction from Pikachu", () => {
    const start = getAttackAnimationAngle(
      CharacterId.CaptainFalcon,
      ActionStateId.Uair,
      0,
      true,
    );
    const end = getAttackAnimationAngle(
      CharacterId.CaptainFalcon,
      ActionStateId.Uair,
      34,
      true,
    );
    expect(toDeg(start!)).toBeCloseTo(0, 6);
    expect(toDeg(end!)).toBeCloseTo(-359.88911506654836, 6);
  });

  it("Falcon: has matching values and tangent rates across every boundary (all 3 segments are cubic)", () => {
    for (let i = 0; i < FALCON_UP_AIR_SEGMENTS.length - 1; i++) {
      expect(FALCON_UP_AIR_SEGMENTS[i]!.endDeg).toBe(
        FALCON_UP_AIR_SEGMENTS[i + 1]!.startDeg,
      );
      expect(FALCON_UP_AIR_SEGMENTS[i]!.rateEndDegPerFrame).toBe(
        FALCON_UP_AIR_SEGMENTS[i + 1]!.rateStartDegPerFrame,
      );
    }
  });

  it("Falcon: the main spin (frames 8-26) decreases monotonically", () => {
    // Unlike Pikachu's curve, Falcon's isn't globally monotonic: the given tangent values produce
    // a real (and plausible - anticipation/overshoot are standard animation techniques) small
    // forward bump during the windup (frames 0-3, peaking ~+9.8deg before crashing through 0) and
    // a slight past-360 overshoot before settling near the very end. Only the main spin in between
    // is checked here for monotonicity.
    let prev = Infinity;
    for (let f = 8; f <= 26; f++) {
      const angle = getAttackAnimationAngle(
        CharacterId.CaptainFalcon,
        ActionStateId.Uair,
        f,
        true,
      )!;
      expect(angle).toBeLessThanOrEqual(prev);
      prev = angle;
    }
  });

  it("returns null outside Falcon's 0-34 frame window", () => {
    expect(
      getAttackAnimationAngle(
        CharacterId.CaptainFalcon,
        ActionStateId.Uair,
        -1,
        true,
      ),
    ).toBeNull();
    expect(
      getAttackAnimationAngle(
        CharacterId.CaptainFalcon,
        ActionStateId.Uair,
        35,
        true,
      ),
    ).toBeNull();
  });

  it("Kirby: starts at 0 and reaches ~1799.893 degrees (5 full rotations), held through the last frame", () => {
    const start = getAttackAnimationAngle(
      CharacterId.Kirby,
      ActionStateId.Uair,
      0,
      true,
    );
    expect(toDeg(start!)).toBeCloseTo(0, 6);

    for (const f of [75, 76, 78, 80]) {
      const angle = getAttackAnimationAngle(
        CharacterId.Kirby,
        ActionStateId.Uair,
        f,
        true,
      );
      expect(toDeg(angle!)).toBeCloseTo(1799.8931986101877, 6);
    }
  });

  it("returns null outside Kirby's 0-80 frame window", () => {
    expect(
      getAttackAnimationAngle(CharacterId.Kirby, ActionStateId.Uair, -1, true),
    ).toBeNull();
    expect(
      getAttackAnimationAngle(CharacterId.Kirby, ActionStateId.Uair, 81, true),
    ).toBeNull();
  });

  it("Kirby: has matching values at every segment boundary, including the deliberate windup/whip kink", () => {
    for (let i = 0; i < KIRBY_UP_AIR_SEGMENTS.length - 1; i++) {
      expect(KIRBY_UP_AIR_SEGMENTS[i]!.endDeg).toBe(
        KIRBY_UP_AIR_SEGMENTS[i + 1]!.startDeg,
      );
    }
  });

  it("Kirby: has matching tangent rates only where segments are meant to connect smoothly (main spin into the hold)", () => {
    // Segment 1->2 (windup into snap-back) is a deliberate kink, not a bug - no rate match
    // expected there. Segment 3->4 (main spin into the hold) IS meant to connect smoothly.
    expect(KIRBY_UP_AIR_SEGMENTS[2]!.rateEndDegPerFrame).toBe(
      KIRBY_UP_AIR_SEGMENTS[3]!.rateStartDegPerFrame,
    );
  });

  it("Kirby: the main spin (frames 10-75) decelerates monotonically to a stop", () => {
    let prev = -Infinity;
    for (let f = 10; f <= 75; f++) {
      const angle = getAttackAnimationAngle(
        CharacterId.Kirby,
        ActionStateId.Uair,
        f,
        true,
      )!;
      expect(angle).toBeGreaterThanOrEqual(prev);
      prev = angle;
    }
  });
});
