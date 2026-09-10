import { describe, it, expect } from "vitest";
import {
  applyGravity,
  clampAirVelX,
  applyFriction,
  outcomeThisFrame,
  vyAtFrame,
  yAtFrame,
  vxAtFrame,
  xAtFrame,
  firstCrossingFrame,
  evaluatePhase,
  classify,
  dkRecoveryOutcomesFrameStepped,
} from "./recoveryHeuristics.js";

/**
 * Fuzz + boundary-case coverage for the closed-form primitives (evaluatePhase,
 * firstCrossingFrame, and friends), ported 1:1 from
 * smashremix/scripts/recovery_analysis/test_closed_form.py -- same trial counts, same boundary
 * cases, same reasoning. See that file's own comments for the fuller story; kept brief here to
 * avoid duplicating it.
 *
 * The boundary suite matters more than the fuzz suite: uniform-random floats structurally cannot
 * hit exact-equality cases (landing exactly on a target height, step === 0, nMax === 0, y0 exactly
 * at the death threshold) -- these are measure-zero under a continuous distribution. Two real bugs
 * in this codebase's closed-form math were found via review, not fuzzing, and both lived exactly
 * in these boundary cases -- see firstCrossingFrame's and vxAtFrame's own doc comments in
 * recoveryHeuristics.ts for the specifics. This suite exists so a future change can't reintroduce
 * either one without a test catching it.
 */

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
function randInt(min: number, max: number): number {
  return Math.floor(randRange(min, max + 1));
}
function choice<T>(options: readonly T[]): T {
  return options[Math.floor(Math.random() * options.length)]!;
}

function stepGravityReference(
  y0: number,
  vy0: number,
  gravity: number,
  tvel: number,
  k: number,
): { y: number; vy: number } {
  let y = y0;
  let vy = vy0;
  for (let i = 0; i < k; i++) {
    vy = applyGravity(vy, gravity, tvel);
    y += vy;
  }
  return { y, vy };
}

function stepDriftReference(
  x0: number,
  vx0: number,
  targetLr: 1 | -1,
  accel: number,
  speedMax: number,
  k: number,
): { x: number; vx: number } {
  let x = x0;
  let vx = vx0;
  for (let i = 0; i < k; i++) {
    vx = clampAirVelX(vx, targetLr * 80, accel, speedMax);
    x += vx;
  }
  return { x, vx };
}

/** Matches descendingCrossingX's exact requirement: `y < prevY` (a genuine descent, STRICT) AND
 * `prevY >= target >= y` (landing ON the target counts, non-strict) -- not just the non-strict
 * bound alone, which would also (wrongly) accept a flat/tied step. */
function referenceFirstCrossing(
  y0: number,
  vy0: number,
  gravity: number,
  tvel: number,
  target: number,
  nMax: number,
): number | null {
  let y = y0;
  let vy = vy0;
  for (let k = 1; k <= nMax; k++) {
    const prevY = y;
    vy = applyGravity(vy, gravity, tvel);
    y += vy;
    if (y < prevY && prevY >= target && target >= y) return k;
  }
  return null;
}

function referenceEvaluatePhase(
  x0: number,
  y0: number,
  vx0: number,
  vy0: number,
  gravity: number,
  tvel: number,
  targetLr: 1 | -1,
  accel: number,
  speedMax: number,
  cliffcatchX: number,
  cliffcatchY: number,
  nMax: number,
  deathY = -6000.0,
): {
  outcome: ReturnType<typeof outcomeThisFrame>;
  end: readonly [number, number, number, number] | null;
  died: boolean;
} {
  let x = x0;
  let y = y0;
  let vx = vx0;
  let vy = vy0;
  for (let i = 0; i < nMax; i++) {
    const prevX = x;
    const prevY = y;
    vy = applyGravity(vy, gravity, tvel);
    vx = clampAirVelX(vx, targetLr * 80, accel, speedMax);
    x += vx;
    y += vy;
    const outcome = outcomeThisFrame(
      prevX,
      prevY,
      x,
      y,
      cliffcatchX,
      cliffcatchY,
    );
    if (outcome) return { outcome, end: null, died: false };
    if (y < deathY) return { outcome: null, end: null, died: true };
  }
  return { outcome: null, end: [x, y, vx, vy], died: false };
}

function stepFrictionReference(
  vx0: number,
  friction: number,
  k: number,
): number {
  let vx = vx0;
  for (let i = 0; i < k; i++) vx = applyFriction(vx, friction);
  return vx;
}

const N_TRIALS = 20000;
const N_PHASE_TRIALS = 20000;

describe("closed-form primitives vs naive frame-stepping (fuzz)", () => {
  it("yAtFrame/vyAtFrame match applyGravity stepped N_TRIALS times", () => {
    const mismatches: string[] = [];
    for (let i = 0; i < N_TRIALS; i++) {
      const gravity = randRange(0.5, 5.0);
      const tvel = randRange(10.0, 80.0);
      const vy0 = randRange(-100.0, 120.0);
      const y0 = randRange(-3000.0, 3000.0);
      const k = randInt(0, 500);

      const ref = stepGravityReference(y0, vy0, gravity, tvel, k);
      const gotY = yAtFrame(y0, vy0, gravity, tvel, k);
      const gotVy = vyAtFrame(vy0, gravity, tvel, k);
      if (Math.abs(gotY - ref.y) > 1e-3 || Math.abs(gotVy - ref.vy) > 1e-6) {
        mismatches.push(
          `gravity=${gravity} tvel=${tvel} vy0=${vy0} y0=${y0} k=${k}: got y=${gotY} vy=${gotVy}, expected y=${ref.y} vy=${ref.vy}`,
        );
      }
    }
    expect(mismatches.slice(0, 5)).toEqual([]);
  });

  it("xAtFrame/vxAtFrame match clampAirVelX stepped N_TRIALS times", () => {
    const mismatches: string[] = [];
    for (let i = 0; i < N_TRIALS; i++) {
      const accel = randRange(0.01, 0.1);
      const speedMax = randRange(10.0, 60.0);
      const vx0 = randRange(-80.0, 80.0);
      const x0 = randRange(-3000.0, 3000.0);
      const targetLr = choice([1, -1] as const);
      const k = randInt(0, 500);

      const ref = stepDriftReference(x0, vx0, targetLr, accel, speedMax, k);
      const target = targetLr * speedMax;
      const step = accel * 80;
      const gotX = xAtFrame(x0, vx0, target, step, k);
      const gotVx = vxAtFrame(vx0, target, step, k);
      if (Math.abs(gotX - ref.x) > 1e-3 || Math.abs(gotVx - ref.vx) > 1e-6) {
        mismatches.push(
          `accel=${accel} speedMax=${speedMax} vx0=${vx0} x0=${x0} targetLr=${targetLr} k=${k}: got x=${gotX} vx=${gotVx}, expected x=${ref.x} vx=${ref.vx}`,
        );
      }
    }
    expect(mismatches.slice(0, 5)).toEqual([]);
  });

  it("firstCrossingFrame matches a naive per-frame scan", () => {
    const mismatches: string[] = [];
    for (let i = 0; i < N_TRIALS; i++) {
      const gravity = randRange(0.5, 5.0);
      const tvel = randRange(10.0, 80.0);
      const vy0 = randRange(-100.0, 120.0);
      const y0 = randRange(-3000.0, 3000.0);
      const target = Math.random() < 0.5 ? 0.0 : randRange(-800.0, 800.0);
      const nMax = randInt(1, 500);

      const ref = referenceFirstCrossing(y0, vy0, gravity, tvel, target, nMax);
      const got = firstCrossingFrame(y0, vy0, gravity, tvel, target, nMax);
      if (got !== ref) {
        mismatches.push(
          `gravity=${gravity} tvel=${tvel} vy0=${vy0} y0=${y0} target=${target} nMax=${nMax}: got ${got}, expected ${ref}`,
        );
      }
    }
    expect(mismatches.slice(0, 5)).toEqual([]);
  });

  it("evaluatePhase matches a naive per-frame reference", () => {
    let mismatches = 0;
    const details: string[] = [];
    for (let i = 0; i < N_PHASE_TRIALS; i++) {
      const gravity = randRange(0.5, 5.0);
      const tvel = randRange(10.0, 80.0);
      const accel = randRange(0.01, 0.1);
      const speedMax = randRange(10.0, 60.0);
      const cliffcatchX = randRange(100.0, 600.0);
      const cliffcatchY = randRange(100.0, 700.0);
      const targetLr = choice([1, -1] as const);
      const vy0 = randRange(-100.0, 120.0);
      const vx0 = randRange(-80.0, 80.0);
      const y0 = randRange(-3000.0, 1500.0);
      const x0 = randRange(-3500.0, 3500.0);
      const nMax = randInt(1, 200);

      const target = targetLr * speedMax;
      const step = accel * 80;

      const ref = referenceEvaluatePhase(
        x0,
        y0,
        vx0,
        vy0,
        gravity,
        tvel,
        targetLr,
        accel,
        speedMax,
        cliffcatchX,
        cliffcatchY,
        nMax,
      );
      const got = evaluatePhase(
        x0,
        y0,
        vx0,
        vy0,
        gravity,
        tvel,
        target,
        step,
        cliffcatchX,
        cliffcatchY,
        nMax,
      );

      let ok = got.outcome === ref.outcome && got.died === ref.died;
      if (ok && ref.outcome === null && !ref.died && got.endState && ref.end) {
        ok = got.endState.every(
          (v, idx) => Math.abs(v - ref.end![idx]!) < 1e-3,
        );
      }
      if (!ok) {
        mismatches++;
        if (details.length < 10) {
          details.push(
            `got=(${got.outcome},${got.died}) expected=(${ref.outcome},${ref.died}) endGot=${JSON.stringify(got.endState)} endRef=${JSON.stringify(ref.end)} (gravity=${gravity} tvel=${tvel} accel=${accel} speedMax=${speedMax} ccx=${cliffcatchX} ccy=${cliffcatchY} targetLr=${targetLr} vy0=${vy0} vx0=${vx0} y0=${y0} x0=${x0} nMax=${nMax})`,
          );
        }
      }
    }
    expect({ mismatches, details }).toEqual({ mismatches: 0, details: [] });
  });

  it("vxAtFrame(vx0, 0, friction, k) matches applyFriction stepped N_TRIALS times", () => {
    const mismatches: string[] = [];
    for (let i = 0; i < N_TRIALS; i++) {
      const vx0 = randRange(-80.0, 80.0);
      const friction = randRange(0.05, 1.0);
      const k = randInt(0, 500);
      const ref = stepFrictionReference(vx0, friction, k);
      const got = vxAtFrame(vx0, 0.0, friction, k);
      if (Math.abs(got - ref) > 1e-6) {
        mismatches.push(
          `vx0=${vx0} friction=${friction} k=${k}: got ${got}, expected ${ref}`,
        );
      }
    }
    expect(mismatches.slice(0, 5)).toEqual([]);
  });
});

describe("closed-form primitives: boundary/exact-integer cases", () => {
  // Exact-integer gravity/vy0 combinations chosen so the trajectory lands EXACTLY on target at
  // some integer frame (not just near it) -- this is exactly the case the strictness-mismatch bug
  // (found by review, since fixed) could only be caught by.
  it("firstCrossingFrame: exact-integer crossings", () => {
    const mismatches: string[] = [];
    for (const gravity of [1, 2, 3, 4, 5]) {
      for (let vy0 = -20; vy0 <= 20; vy0++) {
        for (const tvel of [10, 20, 40, 80]) {
          for (const y0 of [0, 50, -50, 100, -100]) {
            for (const target of [0, y0, -100]) {
              for (const nMax of [1, 5, 10, 50, 200]) {
                const ref = referenceFirstCrossing(
                  y0,
                  vy0,
                  gravity,
                  tvel,
                  target,
                  nMax,
                );
                const got = firstCrossingFrame(
                  y0,
                  vy0,
                  gravity,
                  tvel,
                  target,
                  nMax,
                );
                if (ref !== got) {
                  mismatches.push(
                    `gravity=${gravity} vy0=${vy0} tvel=${tvel} y0=${y0} target=${target} nMax=${nMax}: ref=${ref} got=${got}`,
                  );
                }
              }
            }
          }
        }
      }
    }
    expect(mismatches.slice(0, 30)).toEqual([]);
  });

  // step === 0 / already-at-target drift degenerate cases (the vxAtFrame bug found by review was
  // exactly here: it returned `target` instead of holding at vx0 when step <= 0).
  it("vxAtFrame/xAtFrame: step <= 0 is a true no-op", () => {
    const mismatches: string[] = [];
    for (const vx0 of [-40.0, 0.0, 17.5, 40.0]) {
      for (const target of [-40.0, 0.0, 17.5, 40.0]) {
        for (const step of [0.0, -1.0]) {
          for (const k of [0, 1, 5, 400]) {
            const gotVx = vxAtFrame(vx0, target, step, k);
            const gotX = xAtFrame(0.0, vx0, target, step, k);
            if (gotVx !== vx0) {
              mismatches.push(
                `vxAtFrame step<=0: vx0=${vx0} target=${target} step=${step} k=${k} got=${gotVx}`,
              );
            }
            if (gotX !== vx0 * k) {
              mismatches.push(
                `xAtFrame step<=0: vx0=${vx0} target=${target} step=${step} k=${k} got=${gotX}`,
              );
            }
          }
        }
      }
    }
    expect(mismatches.slice(0, 30)).toEqual([]);
  });

  // delta === 0 (already at target) drift case, separately (this one wasn't the bug, but worth
  // locking in given it's the sibling degenerate branch).
  it("vxAtFrame/xAtFrame: already at target is a no-op", () => {
    const mismatches: string[] = [];
    for (const vx0 of [-40.0, 0.0, 40.0]) {
      for (const step of [0.0, 2.0, 4.0]) {
        for (const k of [0, 1, 50, 400]) {
          const gotVx = vxAtFrame(vx0, vx0, step, k);
          const gotX = xAtFrame(0.0, vx0, vx0, step, k);
          if (gotVx !== vx0 || gotX !== vx0 * k) {
            mismatches.push(
              `vx0=${vx0} step=${step} k=${k}: gotVx=${gotVx} gotX=${gotX}`,
            );
          }
        }
      }
    }
    expect(mismatches.slice(0, 30)).toEqual([]);
  });

  it("firstCrossingFrame: nMax === 0 and nMax === 1 boundaries", () => {
    const mismatches: string[] = [];
    for (const gravity of [1.0, 3.0, 5.0]) {
      for (const vy0 of [-50.0, 0.0, 20.0, 100.0]) {
        for (const y0 of [-100.0, 0.0, 100.0]) {
          for (const nMax of [0, 1]) {
            const ref =
              nMax > 0
                ? referenceFirstCrossing(y0, vy0, gravity, 50.0, 0.0, nMax)
                : null;
            const got =
              nMax > 0
                ? firstCrossingFrame(y0, vy0, gravity, 50.0, 0.0, nMax)
                : null;
            if (ref !== got) {
              mismatches.push(
                `gravity=${gravity} vy0=${vy0} y0=${y0} nMax=${nMax}: ref=${ref} got=${got}`,
              );
            }
          }
        }
      }
    }
    expect(mismatches.slice(0, 30)).toEqual([]);
  });

  // y0 exactly at (and just below) the death threshold, at delay === 0 -- flagged by review as
  // untested by the phase fuzz suite (whose y0 range never approaches deathY).
  it("evaluatePhase: y0 at/below the death threshold dies immediately", () => {
    const mismatches: string[] = [];
    for (const y0 of [-6000.0, -6000.0001, -5999.9999, -7000.0]) {
      for (const vy0 of [-50.0, 0.0, 30.0]) {
        const { outcome, died } = evaluatePhase(
          0.0,
          y0,
          0.0,
          vy0,
          3.0,
          56.0,
          30.0,
          2.0,
          500.0,
          600.0,
          90,
        );
        const expectedDiedImmediately = y0 < -6000.0;
        if (expectedDiedImmediately && !(outcome === null && died)) {
          mismatches.push(
            `y0=${y0} vy0=${vy0}: outcome=${outcome} died=${died}`,
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe("DK: closed-form classify() vs the frozen frame-stepped oracle", () => {
  const CHAR_DONKEY_KONG = 0x02;

  it("matches across random (x, y, vx, vy, jumpsRemaining) trials", () => {
    const mismatches: string[] = [];
    for (let i = 0; i < 2000; i++) {
      const x = randRange(-6000, 6000);
      const y = randRange(-3000, 2000);
      const vx = randRange(-45, 45);
      const vy = randRange(-60, 90);
      const jumpsRemaining = Math.random() < 0.5 ? 0 : 1;
      // Pin facing toward the stage -- this test is about the core physics matching the frozen
      // oracle (which has no concept of facing at all), not the separate facing-direction gating
      // covered by its own describe block below.
      const facingDirection = x <= 0 ? 1 : -1;

      const oracle = dkRecoveryOutcomesFrameStepped(
        x,
        y,
        vx,
        vy,
        jumpsRemaining,
      );
      const oracleVerdict = oracle.canReachStage
        ? "reaches-stage"
        : oracle.canReachLedge
          ? "dead-if-ledge-occupied"
          : "dead";
      const got = classify(
        CHAR_DONKEY_KONG,
        x,
        y,
        vx,
        vy,
        jumpsRemaining,
        0,
        facingDirection,
      );

      if (got !== oracleVerdict) {
        mismatches.push(
          `x=${x} y=${y} vx=${vx} vy=${vy} jumpsRemaining=${jumpsRemaining}: oracle=${oracleVerdict} got=${got}`,
        );
      }
    }
    expect(mismatches.slice(0, 10)).toEqual([]);
  });
});

describe("facing direction", () => {
  const CHAR_LINK = 0x05;
  const CHAR_PIKACHU = 0x09;
  const CHAR_SAMUS = 0x03;
  const CHAR_DONKEY_KONG = 0x02;
  const CHAR_FOX = 0x01;
  const CHAR_YOSHI = 0x06;
  const CHAR_JIGGLYPUFF = 0x0a;
  const FALL_STATE = 0x1a; // Fall -- clears Yoshi's JumpAerialF/B gate

  it("Link: facing away downgrades dead-if-ledge-occupied to dead, but leaves reaches-stage and dead untouched", () => {
    // x=-4500, facingDirection=1 means facing right (toward the stage from the left side).
    expect(classify(CHAR_LINK, -4500, -2500, 0, -30, 0, 0, 1)).toBe(
      "dead-if-ledge-occupied",
    );
    expect(classify(CHAR_LINK, -4500, -2500, 0, -30, 0, 0, -1)).toBe("dead");

    expect(classify(CHAR_LINK, -3500, -1500, 0, -30, 0, 0, 1)).toBe(
      "reaches-stage",
    );
    expect(classify(CHAR_LINK, -3500, -1500, 0, -30, 0, 0, -1)).toBe(
      "reaches-stage",
    );

    expect(classify(CHAR_LINK, -6500, -2500, 0, -30, 0, 0, 1)).toBe("dead");
    expect(classify(CHAR_LINK, -6500, -2500, 0, -30, 0, 0, -1)).toBe("dead");
  });

  it("Samus: facing away becomes not-implemented unless already dead", () => {
    expect(classify(CHAR_SAMUS, -2500, -500, 0, -10, 0, 0, 1)).toBe(
      "reaches-stage",
    );
    expect(classify(CHAR_SAMUS, -2500, -500, 0, -10, 0, 0, -1)).toBe(
      "not-implemented",
    );

    expect(classify(CHAR_SAMUS, -3000, -1500, 0, -10, 0, 0, 1)).toBe(
      "dead-if-ledge-occupied",
    );
    expect(classify(CHAR_SAMUS, -3000, -1500, 0, -10, 0, 0, -1)).toBe(
      "not-implemented",
    );

    expect(classify(CHAR_SAMUS, -2500, -1000, 0, -10, 0, 0, 1)).toBe("dead");
    expect(classify(CHAR_SAMUS, -2500, -1000, 0, -10, 0, 0, -1)).toBe("dead");
  });

  it("DK: facing away becomes not-implemented unless already dead", () => {
    expect(classify(CHAR_DONKEY_KONG, -2500, -500, 0, -10, 0, 0, 1)).toBe(
      "reaches-stage",
    );
    expect(classify(CHAR_DONKEY_KONG, -2500, -500, 0, -10, 0, 0, -1)).toBe(
      "not-implemented",
    );

    expect(classify(CHAR_DONKEY_KONG, -2500, -1000, 0, -10, 0, 0, 1)).toBe(
      "dead",
    );
    expect(classify(CHAR_DONKEY_KONG, -2500, -1000, 0, -10, 0, 0, -1)).toBe(
      "dead",
    );
  });

  it("Pikachu, Fox, Yoshi, Jigglypuff: facing direction never changes the verdict", () => {
    const cases: Array<
      [
        characterId: number,
        x: number,
        y: number,
        vx: number,
        vy: number,
        jumpsRemaining: number,
        actionStateId: number,
      ]
    > = [
      [CHAR_PIKACHU, -2500, -1000, 0, -20, 0, 0],
      [CHAR_PIKACHU, 2500, -1000, 0, -20, 1, 0],
      [CHAR_FOX, -2500, -1000, 0, -20, 0, 0],
      [CHAR_FOX, 2500, -1000, 0, -20, 1, 0],
      [CHAR_YOSHI, -2500, -1000, 0, -20, 0, FALL_STATE],
      [CHAR_YOSHI, 2500, -1000, 0, -20, 1, FALL_STATE],
      [CHAR_JIGGLYPUFF, -2500, -1000, 0, -20, 0, 0],
      [CHAR_JIGGLYPUFF, 2500, -1000, 0, -20, 1, 0],
    ];
    for (const [
      characterId,
      x,
      y,
      vx,
      vy,
      jumpsRemaining,
      actionStateId,
    ] of cases) {
      const towardVerdict = classify(
        characterId,
        x,
        y,
        vx,
        vy,
        jumpsRemaining,
        actionStateId,
        x <= 0 ? 1 : -1,
      );
      const awayVerdict = classify(
        characterId,
        x,
        y,
        vx,
        vy,
        jumpsRemaining,
        actionStateId,
        x <= 0 ? -1 : 1,
      );
      expect(awayVerdict).toBe(towardVerdict);
    }
  });
});
