/**
 * Recovery-reachability classifiers, ported from
 * /Users/ness/workspaces/smashremix/docs/recovery-analysis-plan.md's Python simulators
 * (scripts/recovery_analysis/*.py) and independently validated there against real replay data
 * (1,733/1,733 correct as of this port). Pure physics only - no replay-scanning logic; see
 * src/recoveryVerdicts.ts for how this gets applied to a real Replay.
 *
 * NA (US) character variants only, per an earlier scope decision. Dream Land only.
 */

// ---------------------------------------------------------------------------
// Shared Dream Land geometry/physics helpers (dreamland_common.py, ported 1:1)
// ---------------------------------------------------------------------------

export const LEDGE_L_X = -2318.0;
export const LEDGE_R_X = 2318.0;
const CORNER_WINDOW = 800.0;

// canReachStage -> canReachLedge holds by construction (see checkLedgeGrab below), so
// outcomeThisFrame can no longer return a bare "stage" in practice -- landing on the floor always
// also satisfies the ledge check on the same frame, producing "both" instead. "both" can also
// occur independent of that (the probe and the body are different points that can each satisfy
// their own check on the same frame) -- callers must treat "both" as satisfying EITHER the
// "ledge" or "stage" branch.
export type Outcome = "ledge" | "stage" | "both" | null;

export function applyGravity(
  vy: number,
  gravity: number,
  tvel: number,
): number {
  vy -= gravity;
  if (vy < -tvel) vy = -tvel;
  return vy;
}

export function clampAirVelX(
  vx: number,
  stickX: number,
  accel: number,
  speedMax: number,
): number {
  const target = (stickX / 80.0) * speedMax;
  if (vx < target) {
    vx = Math.min(vx + accel * Math.abs(stickX), target);
  } else if (vx > target) {
    vx = Math.max(vx - accel * Math.abs(stickX), target);
  }
  return vx;
}

export function clampMagnitude(vx: number, maxSpeed: number): number {
  if (vx > maxSpeed) return maxSpeed;
  if (vx < -maxSpeed) return -maxSpeed;
  return vx;
}

export function applyFriction(vx: number, friction: number): number {
  if (vx > 0) vx = Math.max(vx - friction, 0.0);
  else if (vx < 0) vx = Math.min(vx + friction, 0.0);
  return vx;
}

/** Interpolated x where the segment (prevX,prevY)->(x,y) crosses y=0 DESCENDING, or null if it
 * doesn't (either not descending, or doesn't bracket 0). Kept as the descending-only requirement
 * to match the decomp's real ledge-catch logic (ram-map.md section 4.6) -- an earlier version
 * dropped this requirement entirely and let characters "catch" while still ascending, which
 * collapsed predicted death rates to near-zero. That was reverted. */
function descendingCrossingX(
  prevX: number,
  prevY: number,
  x: number,
  y: number,
): number | null {
  if (!(y < prevY && prevY >= 0.0 && 0.0 >= y)) return null;
  const t = prevY / (prevY - y);
  return prevX + t * (x - prevX);
}

function checkLandsOnMainFloor(
  prevX: number,
  prevY: number,
  x: number,
  y: number,
): boolean {
  const crossX = descendingCrossingX(prevX, prevY, x, y);
  return crossX !== null && LEDGE_L_X <= crossX && crossX <= LEDGE_R_X;
}

/** The real decomp ledge-catch mechanic (ram-map.md section 4.6): the ledge-grab PROBE is offset
 * from the character's own position by (lr*cliffcatchX, cliffcatchY), swept between frames, and
 * must cross y=0 DESCENDING within CORNER_WINDOW (800) units of the relevant corner. Tests both
 * corners (lr=+1 left, lr=-1 right) every frame.
 *
 * CORRECTION, found via a live-feature bug report (a real match where the recovering player's own
 * position never neared the ledge on a frame-for-frame body check, but the ledge-grab PROBE
 * clearly swept through the corner window) and confirmed against the decomp: an earlier version
 * of this function replaced this probe-offset mechanic with a symmetric window widened around the
 * character's own (non-offset) position, in order to force canReachStage to imply canReachLedge
 * as a strict guarantee. That traded real-game correctness for a consistency property -- the
 * probe-offset mechanic here is what the game actually does; the wide-window version was not.
 * Reverted. See checkLedgeGrab below for how canReachStage -> canReachLedge is restored as a
 * guarantee without touching this function. */
function checkLedgeGrabProbeOnly(
  prevX: number,
  prevY: number,
  x: number,
  y: number,
  cliffcatchX: number,
  cliffcatchY: number,
): boolean {
  for (const lr of [1, -1] as const) {
    const probePrevX = prevX + lr * cliffcatchX;
    const probePrevY = prevY + cliffcatchY;
    const probeX = x + lr * cliffcatchX;
    const probeY = y + cliffcatchY;
    const crossX = descendingCrossingX(probePrevX, probePrevY, probeX, probeY);
    if (crossX === null) continue;
    if (lr === 1) {
      if (
        LEDGE_L_X <= crossX &&
        crossX <= LEDGE_R_X &&
        crossX - LEDGE_L_X < CORNER_WINDOW
      )
        return true;
    } else {
      if (
        LEDGE_L_X <= crossX &&
        crossX <= LEDGE_R_X &&
        LEDGE_R_X - crossX < CORNER_WINDOW
      )
        return true;
    }
  }
  return false;
}

/** canReachStage -> canReachLedge holds by construction: the stage's own interaction hitboxes
 * physically prevent a character from crossing into the main floor's interior without first
 * passing through the cliff-grab area, and a player who can stick a landing on stage could just
 * as easily pull back and grab the ledge instead (the earlier, easier target on the same
 * approach). Both are real properties of the game, not conveniences -- so landing on the floor
 * (`stage` below) is OR'd in as a second, independently-true way to satisfy a ledge grab, alongside
 * (not instead of) the probe-offset mechanic in checkLedgeGrabProbeOnly, which is still needed on
 * its own for a character who never lands on the floor at all (e.g. undershooting right at the
 * corner). A bare "stage" return can't actually happen as a result -- landing on the floor always
 * also satisfies ledge on that same frame, so this returns "both" instead; "ledge" alone remains
 * possible on its own. `stage` is computed once and passed into the OR directly rather than via a
 * separate checkLedgeGrab helper that would recompute checkLandsOnMainFloor a second time. */
export function outcomeThisFrame(
  prevX: number,
  prevY: number,
  x: number,
  y: number,
  cliffcatchX: number,
  cliffcatchY: number,
): Outcome {
  const stage = checkLandsOnMainFloor(prevX, prevY, x, y);
  const ledge =
    stage ||
    checkLedgeGrabProbeOnly(prevX, prevY, x, y, cliffcatchX, cliffcatchY);
  if (stage && ledge) return "both";
  if (stage) return "stage";
  if (ledge) return "ledge";
  return null;
}

const STICK_TOWARD = 80;
const MAX_HELPLESS_FRAMES = 400;
const DEATH_Y = -6000;

// ---------------------------------------------------------------------------
// Closed-form replacements for the per-frame simulation primitives above
// (dreamland_analysis/closed_form.py, ported 1:1). Motivation: brute-force
// frame-by-frame simulation is fine for deriving/validating the physics, but
// too slow to run live, per-frame, in a viewer overlay -- Pikachu's search
// alone measured 35ms average / 477ms worst case per call on real match
// data. Each of these makes ONE strategy evaluation O(1)/O(log n) instead of
// O(n frames), while preserving the exact same outer search (same candidate
// delays/directions/angles, same physics constants, same crossing
// semantics) -- fuzz-verified against the original frame-stepped simulators
// to match up to floating-point rounding (not guaranteed bit-for-bit: two
// float computations of the "same" quantity via a different order of
// operations can differ by ~1 ULP, which only matters on a trajectory that
// lands within a ULP of an exact crossing threshold -- not reachable on any
// realistic replay-derived input, per the other side's fuzz testing).
//
// Within any single "phase" of constant gravity/tvel (applyGravity) and
// constant drift target/step (clampAirVelX), both vy(k) and vx(k) are
// piecewise ramp-then-flat functions of frame count k -- a linear ramp until
// hitting a cap (gravity's -tvel floor, drift's target ceiling/floor), then
// constant. That makes y(k) and x(k) piecewise quadratic-then-linear in k,
// evaluable in O(1) for any k without stepping through the frames in
// between. Finding the exact integer frame where a trajectory crosses a
// target height then becomes a binary search over that O(1) evaluator.
// ---------------------------------------------------------------------------

/** The smallest k >= 1 such that the UNCLAMPED formula vy0 - gravity*k has already dropped to or
 * past -tvel -- i.e. the first frame whose real (clamped) vy is exactly -tvel rather than the raw
 * unclamped value. Frames strictly before this are still unclamped. Returns 0 as a sentinel
 * meaning "already clamped from the start" when vy0 <= -tvel. Depends only on (vy0, gravity,
 * tvel), reusable across any number of y0/target combinations that share those three values. */
function gravityHitFrame(vy0: number, gravity: number, tvel: number): number {
  if (vy0 <= -tvel) return 0;
  return Math.max(1, Math.ceil((vy0 + tvel) / gravity - 1e-9));
}

/** vy after k frames (k >= 0) of repeatedly applying applyGravity from above. O(1). Pass a
 * precomputed nHit (from gravityHitFrame) to skip recomputing it. */
export function vyAtFrame(
  vy0: number,
  gravity: number,
  tvel: number,
  k: number,
  nHit?: number,
): number {
  if (k <= 0) return vy0;
  const n = nHit ?? gravityHitFrame(vy0, gravity, tvel);
  if (n === 0) return -tvel;
  if (k < n) return vy0 - gravity * k;
  return -tvel;
}

/** y after k frames of the same per-frame update as vyAtFrame, applied in the same order used
 * everywhere in this project: vy = applyGravity(...); y += vy (vy updated BEFORE the position
 * add). O(1) -- exact closed form of the arithmetic-sequence sum, not an approximation. */
export function yAtFrame(
  y0: number,
  vy0: number,
  gravity: number,
  tvel: number,
  k: number,
  nHit?: number,
): number {
  if (k <= 0) return y0;
  const n = nHit ?? gravityHitFrame(vy0, gravity, tvel);
  if (n === 0) return y0 + k * -tvel;
  if (k < n) return y0 + k * vy0 - (gravity * k * (k + 1)) / 2.0;
  // Frames 1..n-1 are unclamped; frame n onward is exactly -tvel each frame.
  const yAtPrehit = y0 + (n - 1) * vy0 - (gravity * (n - 1) * n) / 2.0;
  return yAtPrehit + (k - n + 1) * -tvel;
}

/** The smallest k >= 1 such that the unclamped ramp vx0 + sign*step*k has reached or passed
 * `target` -- i.e. the first frame whose real (clamped) vx is exactly `target` rather than the
 * raw unclamped ramp value. Frames strictly before this are still ramping. */
function driftReachFrame(vx0: number, target: number, step: number): number {
  const delta = target - vx0;
  return Math.max(1, Math.ceil(Math.abs(delta) / step - 1e-9));
}

/** vx after k frames of repeatedly applying clampAirVelX(vx, stickX, accel, speedMax), where
 * `target` is that call's implied target velocity ((stickX/80)*speedMax) and `step` is its
 * per-frame acceleration magnitude (accel*80, since stickX is always full-magnitude everywhere in
 * this project) -- OR, equivalently, applyFriction(vx, friction) via target=0, step=friction
 * directly (the same ramp-toward-target formula generalizes both). O(1). */
export function vxAtFrame(
  vx0: number,
  target: number,
  step: number,
  k: number,
): number {
  if (k <= 0) return vx0;
  const delta = target - vx0;
  if (step <= 0 || delta === 0) {
    // accel == 0 (or already at target) means clampAirVelX's own min/max is a no-op -- vx never
    // moves toward target at all, matching xAtFrame's treatment of this case.
    return vx0;
  }
  const n = driftReachFrame(vx0, target, step);
  const sign = delta > 0 ? 1 : -1;
  if (k < n) return vx0 + sign * step * k;
  return target;
}

/** x after k frames, same update order as yAtFrame (vx updated then added). O(1). */
export function xAtFrame(
  x0: number,
  vx0: number,
  target: number,
  step: number,
  k: number,
): number {
  if (k <= 0) return x0;
  const delta = target - vx0;
  if (step <= 0 || delta === 0) return x0 + k * vx0;
  const n = driftReachFrame(vx0, target, step);
  const sign = delta > 0 ? 1 : -1;
  if (k < n) return x0 + k * vx0 + (sign * step * k * (k + 1)) / 2.0;
  const xAtPrereach = x0 + (n - 1) * vx0 + (sign * step * (n - 1) * n) / 2.0;
  return xAtPrereach + (k - n + 1) * target;
}

/** Smallest k in [1, nMax] such that yAtFrame(k-1) >= target >= yAtFrame(k) -- a DESCENDING
 * crossing of `target`, matching descendingCrossingX's requirement (prevY >= targetLine >= y)
 * exactly, just generalized from a hardcoded 0 to an arbitrary target height. Passing target=0
 * with the character's own (x0,y0) gives the stage condition; passing target=-cliffcatchY gives
 * the ledge-grab PROBE's condition on the SAME trajectory, since the probe's y is just the body's
 * y shifted by the constant +cliffcatchY (so probeY crosses 0 exactly when bodyY crosses
 * -cliffcatchY). Returns null if no such k exists in [1, nMax]. O(log nMax).
 *
 * Pass a precomputed nHit when the caller is making several calls that share the same
 * (vy0, gravity, tvel) -- e.g. evaluatePhase's stage/probe/death checks -- to avoid recomputing it
 * redundantly. */
export function firstCrossingFrame(
  y0: number,
  vy0: number,
  gravity: number,
  tvel: number,
  target: number,
  nMax: number,
  nHit?: number,
): number | null {
  const n = nHit ?? gravityHitFrame(vy0, gravity, tvel);

  let y: (k: number) => number;
  if (n === 0) {
    y = (k) => y0 + k * -tvel - target;
  } else {
    const yAtPrehit = y0 + (n - 1) * vy0 - gravity * (n - 1) * n * 0.5;
    y = (k) => {
      if (k < n) return y0 + k * vy0 - gravity * k * (k + 1) * 0.5 - target;
      return yAtPrehit + (k - n + 1) * -tvel - target;
    };
  }

  let peakK: number;
  if (vy0 <= 0) {
    peakK = 0;
  } else {
    const peakContinuous = vy0 / gravity;
    const loP = Math.max(0, Math.min(nMax, Math.floor(peakContinuous)));
    const hiP = Math.max(0, Math.min(nMax, loP + 1));
    peakK = y(hiP) > y(loP) ? hiP : loP;
  }

  const searchStart = Math.max(1, peakK);
  if (searchStart > nMax) return null;
  if (y(nMax) > 0) return null;

  // Non-strict: y(k) <= 0 (i.e. yAtFrame(k) <= target), matching descendingCrossingX's own
  // non-strict `prevY >= target >= y` exactly -- landing EXACTLY on the target counts as a
  // crossing there, so the search predicate must too.
  let lo = searchStart;
  let hi = nMax;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (y(mid) <= 0) hi = mid;
    else lo = mid + 1;
  }
  const foundK = lo;
  if (foundK > searchStart) return foundK; // y(foundK - 1) > 0 guaranteed by leftmost-search property
  // foundK === searchStart: the leftmost-search guarantee only holds relative to the search
  // range's own start, not the true continuous peak (peakK may have been clamped up to 1) -- so
  // this needs two explicit checks descendingCrossingX also makes: the frame just before it was
  // still at/above target (non-strict), AND the step was a genuine descent (STRICT
  // y(foundK) < y(foundK - 1)), not a flat/tied step. A flat step can only happen exactly at
  // searchStart === the true peak, when vy0 is an exact multiple of gravity so vy hits precisely
  // 0 right as the trajectory reaches its max height -- landing there with zero net movement
  // isn't a descending crossing even if the height happens to already be at/below target.
  if (y(foundK - 1) < 0) return null;
  if (y(foundK) < y(foundK - 1)) return foundK;
  // Flat step into the peak itself: the very next frame -- strictly past the peak, where descent
  // is guaranteed genuine -- is the real answer, provided it exists within nMax. Guaranteed to
  // also satisfy y <= 0, since y(foundK) was already <= 0 and the next frame is strictly less.
  if (foundK + 1 <= nMax) return foundK + 1;
  return null;
}

export interface ClosedFormPhaseResult {
  outcome: Outcome;
  /** [x, y, vx, vy] at frame nMax, for chaining into the next phase. Only meaningful when outcome
   * is null; ignored otherwise (matching the original loop, which stops immediately once any
   * outcome is found and never computes a "final" state after that point). */
  endState: readonly [number, number, number, number] | null;
  /** True if outcome is null AND the trajectory drops below deathY within [1, nMax] (or already
   * started below it) -- the caller should stop rather than chain further. */
  died: boolean;
}

/** Evaluates one phase of constant physics constants (gravity/tvel for vy, a fixed drift
 * target/step for vx) for up to nMax frames, replicating outcomeThisFrame called every frame
 * across that span -- but via O(log nMax) closed-form crossing lookups instead of an actual
 * per-frame loop.
 *
 * Two independent crossings are checked, exactly mirroring outcomeThisFrame's two checks:
 * 1. The body's OWN descending crossing of y=0 (the stage condition) -- occurs at most once in a
 *    monotonic descent, found directly via firstCrossingFrame.
 * 2. The ledge-grab PROBE's descending crossing of y=0, which (since probeY = bodyY + cliffcatchY,
 *    a constant shift) happens at exactly the frame where the BODY crosses -cliffcatchY -- i.e.
 *    the same firstCrossingFrame call with a shifted target instead of a separate probe
 *    simulation. Because cliffcatchY > 0, this shifted crossing always happens at or after the
 *    stage crossing (if both exist) in a single monotonic descent, so checking stage first and
 *    only falling back to the probe when stage doesn't land within the stage span is equivalent to
 *    the original loop always reaching the stage frame first. */
export function evaluatePhase(
  x0: number,
  y0: number,
  vx0: number,
  vy0: number,
  gravity: number,
  tvel: number,
  driftTarget: number,
  driftStep: number,
  cliffcatchX: number,
  cliffcatchY: number,
  nMax: number,
  deathY: number = DEATH_Y,
): ClosedFormPhaseResult {
  if (y0 < deathY) return { outcome: null, endState: null, died: true };

  const nHit = gravityHitFrame(vy0, gravity, tvel);
  const xAt = (k: number) => xAtFrame(x0, vx0, driftTarget, driftStep, k);
  const yAt = (k: number) => yAtFrame(y0, vy0, gravity, tvel, k, nHit);

  const stageK = firstCrossingFrame(y0, vy0, gravity, tvel, 0, nMax, nHit);
  if (stageK !== null) {
    const cx = descendingCrossingX(
      xAt(stageK - 1),
      yAt(stageK - 1),
      xAt(stageK),
      yAt(stageK),
    );
    if (cx !== null && LEDGE_L_X <= cx && cx <= LEDGE_R_X) {
      return { outcome: "both", endState: null, died: false };
    }
  }

  const probeK = firstCrossingFrame(
    y0 + cliffcatchY,
    vy0,
    gravity,
    tvel,
    0,
    nMax,
    nHit,
  );
  if (probeK !== null) {
    const pyPrev = yAt(probeK - 1) + cliffcatchY;
    const pyCur = yAt(probeK) + cliffcatchY;
    for (const lr of [1, -1] as const) {
      const pxPrev = xAt(probeK - 1) + lr * cliffcatchX;
      const pxCur = xAt(probeK) + lr * cliffcatchX;
      const cx = descendingCrossingX(pxPrev, pyPrev, pxCur, pyCur);
      if (cx === null) continue;
      if (
        lr === 1 &&
        LEDGE_L_X <= cx &&
        cx <= LEDGE_R_X &&
        cx - LEDGE_L_X < CORNER_WINDOW
      ) {
        return { outcome: "ledge", endState: null, died: false };
      }
      if (
        lr === -1 &&
        LEDGE_L_X <= cx &&
        cx <= LEDGE_R_X &&
        LEDGE_R_X - cx < CORNER_WINDOW
      ) {
        return { outcome: "ledge", endState: null, died: false };
      }
    }
  }

  const deathK = firstCrossingFrame(y0, vy0, gravity, tvel, deathY, nMax, nHit);
  const endState: readonly [number, number, number, number] = [
    xAt(nMax),
    yAt(nMax),
    vxAtFrame(vx0, driftTarget, driftStep, nMax),
    vyAtFrame(vy0, gravity, tvel, nMax, nHit),
  ];
  return { outcome: null, endState, died: deathK !== null };
}

export interface RecoveryOutcomes {
  canReachLedge: boolean;
  canReachStage: boolean;
}

/**
 * The public-facing shape of a classify() result: collapses RecoveryOutcomes' two booleans into
 * one 4-value verdict. The 4th boolean combination (canReachStage true, canReachLedge false) is
 * unreachable by construction (see checkLedgeGrab's own doc comment -- landing on the floor
 * always also satisfies the ledge condition on the same frame), so there's no information lost:
 * - "reaches-stage": can land on the main floor outright (and therefore also could grab the ledge
 *   instead, per the same invariant, but stage is the strictly better outcome so that's what's
 *   reported).
 * - "dead-if-ledge-occupied": can't reach the stage, but CAN grab the ledge -- survival depends on
 *   the ledge actually being free when they get there. Named this way (rather than just "ledge")
 *   specifically to surface the classifier's known unmodeled gap: it has no idea whether an
 *   opponent is hogging that ledge, so this verdict is conditionally correct, not a guarantee.
 * - "dead": neither reachable.
 * - "not-implemented": we don't have an assessment. Currently only produced for a character whose
 *   facing direction (away from the stage) puts them into a turnaround-recovery edge case this
 *   classifier doesn't model (DK/Samus, see classify()'s own per-character comments) -- distinct
 *   from classify() returning null (character/jump-count/action-state entirely out of scope):
 *   this means "we could model this in principle, we just haven't."
 */
export type RecoveryVerdict =
  "dead" | "dead-if-ledge-occupied" | "reaches-stage" | "not-implemented";

/**
 * Vanilla SSB64 characters cannot grab the ledge while facing away from the stage, even mid-move
 * -- and since getting hit turns a character to face whoever hit them, and hits typically launch
 * a character away from their attacker (who's usually positioned between them and the stage after
 * an edge-guard read), a recovering character faces the stage the large majority of the time by
 * default. Some characters can deliberately turn around using their recovery move itself (up-B,
 * neutral-B, or a jump) before or during the fall -- see classify()'s per-character comments for
 * which. facingDirection is 1 (right) or -1 (left), matching StateFrame's own convention.
 */
function facingTowardStage(x: number, facingDirection: 1 | -1): boolean {
  return x <= 0 ? facingDirection === 1 : facingDirection === -1;
}

function toRecoveryVerdict(outcomes: RecoveryOutcomes): RecoveryVerdict {
  if (outcomes.canReachStage) return "reaches-stage";
  if (outcomes.canReachLedge) return "dead-if-ledge-occupied";
  return "dead";
}

// ---------------------------------------------------------------------------
// Link — Spin Attack, 0 jumps only (link_recovery_sim.py)
// ---------------------------------------------------------------------------

const LINK = {
  GRAVITY: 3.4,
  TVEL_BASE: 64.0,
  AIR_ACCEL: 0.04,
  AIR_SPEED_MAX_X: 31.0,
  CLIFFCATCH_X: 280.0,
  CLIFFCATCH_Y: 400.0,
  SPINATTACK_AIR_VEL_Y: 69.0,
  SPINATTACK_GRAVITY_MUL: 0.23,
  SPINATTACK_AIR_DRIFT_MUL: 0.5,
  SPINATTACK_GRAVITY_SWITCH_FRAME: 45,
  SPINATTACK_DURATION_FRAMES: 161,
  FALLSPECIAL_DRIFT: 0.6,
  MAX_DELAY_FRAMES: 90,
  // Jump formula constants (225_LinkMain.c), for jumpsRemaining === 1.
  JUMP_HEIGHT_MUL: 0.7,
  JUMP_HEIGHT_BASE: 36.0,
  JUMPAERIAL_HEIGHT: 0.9,
  JUMPAERIAL_VEL_X: 0.35,
};

/** Link-specific facing-gated ledge check: unlike every other character (and the shared
 * checkLedgeGrabProbeOnly, which tests both corners unconditionally), Link's up-B has no aim --
 * drift is stick-driven toward whichever ledge targetLr is currently testing -- so only that one
 * corner is ever reachable on this trajectory. Testing both corners here would let a trajectory
 * drifting toward the LEFT ledge also "catch" a crossing shaped like the RIGHT corner, which can't
 * happen for a move with no aim of its own. */
function linkCheckLedgeGrabProbeOnly(
  prevX: number,
  prevY: number,
  x: number,
  y: number,
  targetLr: 1 | -1,
  cliffcatchX: number,
  cliffcatchY: number,
): boolean {
  const probePrevX = prevX + targetLr * cliffcatchX;
  const probePrevY = prevY + cliffcatchY;
  const probeX = x + targetLr * cliffcatchX;
  const probeY = y + cliffcatchY;
  const crossX = descendingCrossingX(probePrevX, probePrevY, probeX, probeY);
  if (crossX === null) return false;
  if (targetLr === 1) {
    return (
      LEDGE_L_X <= crossX &&
      crossX <= LEDGE_R_X &&
      crossX - LEDGE_L_X < CORNER_WINDOW
    );
  }
  return (
    LEDGE_L_X <= crossX &&
    crossX <= LEDGE_R_X &&
    LEDGE_R_X - crossX < CORNER_WINDOW
  );
}

function linkOutcomeThisFrame(
  prevX: number,
  prevY: number,
  x: number,
  y: number,
  targetLr: 1 | -1,
  cliffcatchX: number,
  cliffcatchY: number,
): Outcome {
  const stage = checkLandsOnMainFloor(prevX, prevY, x, y);
  const ledge =
    stage ||
    linkCheckLedgeGrabProbeOnly(
      prevX,
      prevY,
      x,
      y,
      targetLr,
      cliffcatchX,
      cliffcatchY,
    );
  if (stage && ledge) return "both";
  if (stage) return "stage";
  if (ledge) return "ledge";
  return null;
}

function linkSimulateUpB(
  x0: number,
  y0: number,
  vx0: number,
  targetLr: 1 | -1,
): Outcome {
  let vy = LINK.SPINATTACK_AIR_VEL_Y;
  let vx = vx0;
  let x = x0;
  let y = y0;
  for (let frame = 0; frame < LINK.SPINATTACK_DURATION_FRAMES; frame++) {
    const gravity =
      frame >= LINK.SPINATTACK_GRAVITY_SWITCH_FRAME
        ? LINK.GRAVITY
        : LINK.GRAVITY * LINK.SPINATTACK_GRAVITY_MUL;
    const prevX = x;
    const prevY = y;
    vy = applyGravity(vy, gravity, LINK.TVEL_BASE);
    vx = clampAirVelX(
      vx,
      targetLr * STICK_TOWARD,
      LINK.AIR_ACCEL * LINK.SPINATTACK_AIR_DRIFT_MUL,
      LINK.AIR_SPEED_MAX_X,
    );
    x += vx;
    y += vy;
    const outcome = linkOutcomeThisFrame(
      prevX,
      prevY,
      x,
      y,
      targetLr,
      LINK.CLIFFCATCH_X,
      LINK.CLIFFCATCH_Y,
    );
    if (outcome) return outcome;
  }
  for (let frame = 0; frame < MAX_HELPLESS_FRAMES; frame++) {
    const prevX = x;
    const prevY = y;
    vy = applyGravity(vy, LINK.GRAVITY, LINK.TVEL_BASE);
    vx = clampAirVelX(
      vx,
      targetLr * STICK_TOWARD,
      LINK.AIR_ACCEL * LINK.FALLSPECIAL_DRIFT,
      LINK.AIR_SPEED_MAX_X,
    );
    x += vx;
    y += vy;
    const outcome = linkOutcomeThisFrame(
      prevX,
      prevY,
      x,
      y,
      targetLr,
      LINK.CLIFFCATCH_X,
      LINK.CLIFFCATCH_Y,
    );
    if (outcome) return outcome;
    if (y < DEATH_Y) return null;
  }
  return null;
}

function linkRecoveryOutcomes(
  x0: number,
  y0: number,
  vx0: number,
  vy0: number,
  jumpsRemaining: number,
): RecoveryOutcomes {
  let reachedLedge = false;
  let reachedStage = false;
  for (const targetLr of [1, -1] as const) {
    if (reachedLedge && reachedStage) break;
    let jumpVx0: number, jumpVy0: number;
    if (jumpsRemaining === 1) {
      jumpVx0 = targetLr * STICK_TOWARD * LINK.JUMPAERIAL_VEL_X;
      jumpVy0 =
        (80 * LINK.JUMP_HEIGHT_MUL + LINK.JUMP_HEIGHT_BASE) *
        LINK.JUMPAERIAL_HEIGHT;
    } else {
      jumpVx0 = vx0;
      jumpVy0 = vy0;
    }
    for (let delay = 0; delay <= LINK.MAX_DELAY_FRAMES; delay++) {
      if (reachedLedge && reachedStage) break;
      let x = x0;
      let y = y0;
      let vx = jumpVx0;
      let vy = jumpVy0;
      let outcome: Outcome = null;
      let died = false;
      for (let frame = 0; frame < delay; frame++) {
        const prevX = x;
        const prevY = y;
        vy = applyGravity(vy, LINK.GRAVITY, LINK.TVEL_BASE);
        vx = clampAirVelX(
          vx,
          targetLr * STICK_TOWARD,
          LINK.AIR_ACCEL,
          LINK.AIR_SPEED_MAX_X,
        );
        x += vx;
        y += vy;
        outcome = linkOutcomeThisFrame(
          prevX,
          prevY,
          x,
          y,
          targetLr,
          LINK.CLIFFCATCH_X,
          LINK.CLIFFCATCH_Y,
        );
        if (outcome) break;
        if (y < DEATH_Y) {
          died = true;
          break;
        }
      }
      if (outcome === null && !died) {
        outcome = linkSimulateUpB(x, y, vx, targetLr);
      }
      if (outcome === "ledge" || outcome === "both") reachedLedge = true;
      if (outcome === "stage" || outcome === "both") reachedStage = true;
    }
  }
  return { canReachLedge: reachedLedge, canReachStage: reachedStage };
}

// ---------------------------------------------------------------------------
// Pikachu — Quick Attack, 0 jumps only (pikachu_recovery_sim.py)
//
// This is the character whose search cost was directly reported as a live-viewer problem (35ms
// average / 477ms worst case per call on real match data). The dominant cost is the angle x
// magnitude x recursive-second-zip explosion in pikaTryActivation/pikaSimulateEndAndBeyond (up to
// ~11,664 branches for a genuinely-dead situation), not any single phase's frame count.
//
// TRIED converting the shared 400-frame helpless-fall tail (every leaf of that search tree ends
// in it) to the closed-form evaluatePhase used by DK below -- the Python port did this and
// reported a real partial win there (~2x on genuinely-dead worst cases, up to ~6x on easily-
// reachable ones). Measured directly here instead of trusting that number to carry over: it was a
// net REGRESSION in this V8 runtime for the realistic case -- e.g. one real 2-Pikachu match's full
// overlay precompute went from ~1.4s (frame-stepped) to ~2.4s (closed-form) under identical
// throttling, even though the isolated pathological worst-case DID improve in isolation (~363ms vs
// ~477ms, matching the Python-side ratio). evaluatePhase's fixed per-call overhead (closures
// allocated every call, three separate firstCrossingFrame binary searches per phase, peak-frame
// precomputation) apparently costs more than it saves across the bulk of the search tree, where
// most branches resolve in well under the full 400 frames anyway -- unlike Python, where avoiding
// per-frame interpreter overhead is a bigger win than the closure/allocation cost of the
// closed-form machinery is here. Reverted; kept fully frame-stepped. See
// pikaSimulateEndAndBeyond's tail for the numbers.
//
// A higher-leverage fix that hasn't been implemented: pikaTryActivation(x0, y0) takes ONLY
// position (activation zeroes both vx and vy), making the entire expensive subtree a pure function
// of two scalars -- a strong memoization/tabulation candidate that could turn this into a lookup
// rather than a search, which would sidestep the closed-form-vs-frame-stepped tradeoff entirely.
// Not yet done.
// ---------------------------------------------------------------------------

const PIKA = {
  GRAVITY: 3.0,
  TVEL_BASE: 52.0,
  AIR_ACCEL: 0.055, // general (pre-activation) air control -- 243_PikachuMain.c
  AIR_SPEED_MAX_X: 37.5,
  AIR_FRICTION: 0.45,
  CLIFFCATCH_X: 400.0,
  CLIFFCATCH_Y: 280.0,
  START_TIME: 20,
  WINDUP_GRAVITY: 0.8,
  ZIP_TIME: 5,
  CONTROLLER_RANGE_MAX: 80.0,
  VEL_BASE: 3.0,
  VEL_ADD: 90.0,
  VEL_MUL: 0.9,
  ANGLE_DIFF_MIN: (42.0 * Math.PI) / 180,
  VEL_BAK_MUL: 0.2,
  END_WINDOW_FRAME: 9,
  VEL_Y_DIV: 9.0,
  FALLSPECIAL_DRIFT: 0.4,
  // Jump formula constants (243_PikachuMain.c), for jumpsRemaining === 1.
  JUMP_HEIGHT_MUL: 0.67,
  JUMP_HEIGHT_BASE: 37.0,
  JUMPAERIAL_HEIGHT: 1.0,
  JUMPAERIAL_VEL_X: 0.35,
  ANGLE_STEPS: 36,
  MAGNITUDE_SAMPLES: [60.0, 70.0, 80.0],
  MAX_HELPLESS_FRAMES: 400,
  MAX_ACTIVATION_DELAY_FRAMES: 90,
  // Coarser than DK/Samus/Fox's step-1 -- Pikachu's per-delay cost (angle x magnitude x
  // recursive second-zip search) is ~75ms per activation attempt, vs their single cheap
  // simulation. Step-1 took 13.7s worst-case in the Python port; step-5 cuts that to ~2-3s
  // while verified (against a full step-1 sweep near the boundary) not to change the
  // classification at any tested point -- see recovery-analysis-plan.md.
  ACTIVATION_DELAY_STEP: 5,
};

type PikaAngle = number | "straight_up";

function pikaAngleCandidates(): PikaAngle[] {
  const angles: PikaAngle[] = [];
  for (let i = 0; i < PIKA.ANGLE_STEPS; i++) {
    angles.push((2 * Math.PI * i) / PIKA.ANGLE_STEPS);
  }
  angles.push("straight_up");
  return angles;
}

function pikaZipVelocity(
  angle: PikaAngle,
  magnitude: number,
  isSubsequent: boolean,
): [number, number] {
  let vx: number, vy: number;
  if (angle === "straight_up") {
    const speed = PIKA.VEL_BASE * PIKA.CONTROLLER_RANGE_MAX + PIKA.VEL_ADD;
    vx = 0.0;
    vy = speed;
  } else {
    const speed = PIKA.VEL_BASE * magnitude + PIKA.VEL_ADD;
    vx = Math.cos(angle) * speed;
    vy = Math.sin(angle) * speed;
  }
  if (isSubsequent) {
    vx *= PIKA.VEL_MUL;
    vy *= PIKA.VEL_MUL;
  }
  return [vx, vy];
}

function pikaSimulateWindup(
  x0: number,
  y0: number,
): { outcome: Outcome | "died"; x: number; y: number } {
  let vy = 0.0;
  const x = x0;
  let y = y0;
  for (let i = 0; i < PIKA.START_TIME; i++) {
    const prevX = x;
    const prevY = y;
    vy = applyGravity(vy, PIKA.WINDUP_GRAVITY, PIKA.TVEL_BASE);
    y += vy;
    const outcome = outcomeThisFrame(
      prevX,
      prevY,
      x,
      y,
      PIKA.CLIFFCATCH_X,
      PIKA.CLIFFCATCH_Y,
    );
    if (outcome) return { outcome, x, y };
    if (y < DEATH_Y) return { outcome: "died", x, y };
  }
  return { outcome: null, x, y };
}

function pikaSimulateZip(
  x0: number,
  y0: number,
  angle: PikaAngle,
  magnitude: number,
  isSubsequent: boolean,
): {
  outcome: Outcome | "died";
  x: number;
  y: number;
  actualAngle: number;
  vx: number;
  vy: number;
} {
  const [vx, vy] = pikaZipVelocity(angle, magnitude, isSubsequent);
  const actualAngle = angle === "straight_up" ? Math.PI / 2 : angle;
  let x = x0;
  let y = y0;
  for (let i = 0; i < PIKA.ZIP_TIME; i++) {
    const prevX = x;
    const prevY = y;
    x += vx;
    y += vy;
    const outcome = outcomeThisFrame(
      prevX,
      prevY,
      x,
      y,
      PIKA.CLIFFCATCH_X,
      PIKA.CLIFFCATCH_Y,
    );
    if (outcome) return { outcome, x, y, actualAngle, vx, vy };
    if (y < DEATH_Y) return { outcome: "died", x, y, actualAngle, vx, vy };
  }
  return { outcome: null, x, y, actualAngle, vx, vy };
}

/** End state: velocity cut to 20%, then either the frame-9 re-aim (if not already used and a
 * valid re-aim angle exists), or decay-then-gravity-then-helpless-fall. Returns
 * {reachedLedge, reachedStage}.
 *
 * BUG FIX, found via a real validated miss (a Pikachu recovery in
 * 260828205834-nue-Kurabba-54.rmgr, frame 1010, where the real player's actual executed strategy
 * -- reconstructed and replayed through this exact model -- produces "both", but the previous
 * version of this search reported ledge-only): this function used to return the FIRST non-null
 * outcome found while scanning the re-aim window's angle x magnitude grid, on the assumption that
 * a caller wanting the full ledge+stage union would retry across the OUTER first-zip search
 * instead. That assumption doesn't hold: for a FIXED first-zip angle, the re-aim grid can and does
 * contain both a worse match (found via a smaller magnitude, checked first since
 * PIKA.MAGNITUDE_SAMPLES is ascending) and a strictly better one (found via a larger magnitude at
 * the exact same angle) -- confirmed directly: angle=180deg/magnitude=60 resolves to "ledge" and
 * was returned immediately, never reaching magnitude=70 at that SAME angle, which resolves to
 * "both". The outer first-zip loop (pikaTryActivation) never gets a chance to compensate, because
 * it only tries OTHER first-zip angles, not a wider re-aim search for the one that already
 * returned something. Now exhaustively accumulates both flags across the whole re-aim grid, same
 * OR-everything pattern used everywhere else in this project, stopping early only once both flags
 * are true. Also now unconditionally tries the "don't re-aim, just fall" alternative regardless of
 * what the re-aim search found (a re-aim that only reaches "ledge" doesn't rule out "just fall"
 * reaching "stage" on its own) -- that was also silently skipped before whenever re-aim found
 * *something*. */
function pikaFullReAimGrid(): { angle: PikaAngle; magnitude: number }[] {
  const grid: { angle: PikaAngle; magnitude: number }[] = [];
  for (const angle of pikaAngleCandidates()) {
    for (const magnitude of PIKA.MAGNITUDE_SAMPLES) {
      grid.push({ angle, magnitude });
    }
  }
  return grid;
}

const PIKA_FULL_REAIM_GRID = pikaFullReAimGrid();

function pikaSimulateEndAndBeyond(
  x0: number,
  y0: number,
  vx0: number,
  vy0: number,
  firstZipAngle: number,
  usedSecondZip: boolean,
  reAimCandidates: { angle: PikaAngle; magnitude: number }[] = PIKA_FULL_REAIM_GRID,
): { reachedLedge: boolean; reachedStage: boolean } {
  let vx = vx0 * PIKA.VEL_BAK_MUL;
  let vy = vy0 * PIKA.VEL_BAK_MUL;
  let x = x0;
  let y = y0;

  for (let frame = 0; frame < PIKA.END_WINDOW_FRAME; frame++) {
    const prevX = x;
    const prevY = y;
    vy -= vy / PIKA.VEL_Y_DIV;
    vx = applyFriction(vx, PIKA.AIR_FRICTION);
    x += vx;
    y += vy;
    const outcome = outcomeThisFrame(
      prevX,
      prevY,
      x,
      y,
      PIKA.CLIFFCATCH_X,
      PIKA.CLIFFCATCH_Y,
    );
    if (outcome) {
      return {
        reachedLedge: outcome === "ledge" || outcome === "both",
        reachedStage: outcome === "stage" || outcome === "both",
      };
    }
    if (y < DEATH_Y) return { reachedLedge: false, reachedStage: false };
  }

  let reachedLedge = false;
  let reachedStage = false;

  // frame 9: the re-aim window. Tries every candidate in reAimCandidates (the full grid by
  // default; a single canonical-technique candidate when called from pikaCanonicalProbe).
  if (!usedSecondZip) {
    for (const { angle, magnitude } of reAimCandidates) {
      if (reachedLedge && reachedStage) break;
      const testAngle = angle === "straight_up" ? Math.PI / 2 : angle;
      const rawDiff =
        ((testAngle - firstZipAngle + Math.PI) % (2 * Math.PI)) - Math.PI;
      const diff = Math.abs(rawDiff);
      if (diff <= PIKA.ANGLE_DIFF_MIN) continue;
      const zip = pikaSimulateZip(x, y, angle, magnitude, true);
      if (
        zip.outcome === "ledge" ||
        zip.outcome === "stage" ||
        zip.outcome === "both"
      ) {
        if (zip.outcome === "ledge" || zip.outcome === "both")
          reachedLedge = true;
        if (zip.outcome === "stage" || zip.outcome === "both")
          reachedStage = true;
        continue;
      }
      if (zip.outcome === null) {
        const sub = pikaSimulateEndAndBeyond(
          zip.x,
          zip.y,
          zip.vx,
          zip.vy,
          testAngle,
          true,
          reAimCandidates,
        );
        reachedLedge = reachedLedge || sub.reachedLedge;
        reachedStage = reachedStage || sub.reachedStage;
      }
      // outcome "died": keep trying other candidates
    }
  }

  if (reachedLedge && reachedStage) return { reachedLedge, reachedStage };

  // Also try NOT re-aiming at all (letting the window close, or already used it): full gravity +
  // halved drift, then helpless fall. Tried unconditionally alongside whatever the re-aim search
  // found, per this function's own doc comment above.
  //
  // NOT converted to evaluatePhase, unlike DK -- see this function's section header. The Python
  // port did convert this tail and reported a real speedup there, but measured directly here (real
  // match precompute, not just an isolated worst-case call): it was a net REGRESSION in this V8
  // runtime, not an improvement -- e.g. one real 2-Pikachu match's full overlay precompute went
  // from ~1.4s (frame-stepped, as below) to ~2.4s (closed-form) with the exact same outer
  // throttling. evaluatePhase's fixed per-call overhead (closures created every call, three
  // separate firstCrossingFrame binary searches per phase, peak-frame precomputation) apparently
  // costs more than it saves across the bulk of pikaTryActivation's ~11,664-branch search tree,
  // where most branches resolve in well under the full 400 frames anyway -- unlike Python, where
  // avoiding per-frame interpreter overhead is a bigger win than the closure/allocation cost of the
  // closed-form machinery. Isolated single-call timing on genuinely-dead (full 400-frame) cases DID
  // improve here (~363ms vs ~477ms, matching the ~2x Python claim) -- it's specifically the
  // majority non-pathological case that got worse. Kept frame-stepped until/unless evaluatePhase
  // itself gets cheap enough (e.g. non-closure-based) to win here too.
  for (let frame = 0; frame < PIKA.MAX_HELPLESS_FRAMES; frame++) {
    const prevX = x;
    const prevY = y;
    vy = applyGravity(vy, PIKA.GRAVITY, PIKA.TVEL_BASE);
    vx = applyFriction(vx, PIKA.AIR_FRICTION);
    x += vx;
    y += vy;
    const outcome = outcomeThisFrame(
      prevX,
      prevY,
      x,
      y,
      PIKA.CLIFFCATCH_X,
      PIKA.CLIFFCATCH_Y,
    );
    if (outcome) {
      if (outcome === "ledge" || outcome === "both") reachedLedge = true;
      if (outcome === "stage" || outcome === "both") reachedStage = true;
      return { reachedLedge, reachedStage };
    }
    if (y < DEATH_Y) return { reachedLedge, reachedStage };
  }
  return { reachedLedge, reachedStage };
}

// Canonical double-Quick-Attack probe: diagonal zip1, horizontal re-aim zip2, release to neutral
// for the extended drift. Decomp-verified against ftpikachuspecialhi.c/ftphysics.c (relay from the
// Game Expert session, 2026-09-10): zip1/zip2 velocities are locked at activation and never
// re-read mid-zip, the frame-9 re-aim is a single stick-angle sample gated by ANGLE_DIFF_MIN, and
// releasing to neutral after zip2 is provably optimal for a full-magnitude zip (any stick
// deflection past the ~8-unit deadzone clamps speed down toward air_speed_max_x*0.5, well below
// what a strong zip carries out of VEL_BAK_MUL).
//
// Angles independently confirmed optimal-for-horizontal-distance two ways (same relay,
// 2026-09-10): simulating the decomp formulas directly shows a hard cliff at the 42deg gate itself
// (below it, no second zip fires at all -- ~43% less total distance in their test) and a gradual
// falloff above it as more of zip1's launch speed goes to height instead of reach, so the true
// optimum sits right at the gate boundary; separately, 2544 real zip1->zip2 pairs pulled from the
// nue corpus cluster hardest in exactly the 40-50deg (zip1) / 0-10deg (zip2) bands, matching that
// theoretical optimum. 45deg/0deg used here rather than the literal 42deg cliff edge, since 42
// itself risks landing just under the gate (losing the whole second zip) with no discretized input
// able to hit it exactly -- their 45/0 difference (45deg) still comfortably clears ANGLE_DIFF_MIN.
const PIKA_CANONICAL_DIAG_DEG = 45;
const PIKA_CANONICAL_REAIM_DEG = 0;

function pikaOutcomeToFlags(
  outcome: Outcome,
): { reachedLedge: boolean; reachedStage: boolean } {
  return {
    reachedLedge: outcome === "ledge" || outcome === "both",
    reachedStage: outcome === "stage" || outcome === "both",
  };
}

function pikaCanonicalReAimCandidates(
  targetLr: 1 | -1,
): { angle: PikaAngle; magnitude: number }[] {
  const deg = (PIKA_CANONICAL_REAIM_DEG * Math.PI) / 180;
  const angle = targetLr === 1 ? deg : Math.PI - deg;
  return [{ angle, magnitude: 80 }];
}

/**
 * Cheap first probe using the community-standard technique, tried before the full exhaustive
 * angle x magnitude search. Any "reaches stage" result here comes from actually simulating that
 * exact input sequence through the real physics functions -- a genuine proof of reachability, not
 * an approximation -- so it's purely a fast-path and can never produce a false positive. Only
 * covers delay=0 (activating immediately, the position-relevant part of the search is identical
 * for any jumpsRemaining at delay=0 since the delay loop that consumes jump velocity doesn't run).
 * Anything this probe doesn't resolve to "stage" still falls through to the full search below.
 */
function pikaCanonicalProbe(
  x0: number,
  y0: number,
  targetLr: 1 | -1,
): { reachedLedge: boolean; reachedStage: boolean } {
  const windup = pikaSimulateWindup(x0, y0);
  if (windup.outcome === "died")
    return { reachedLedge: false, reachedStage: false };
  if (windup.outcome) return pikaOutcomeToFlags(windup.outcome);

  const diagDeg = (PIKA_CANONICAL_DIAG_DEG * Math.PI) / 180;
  const diagAngle = targetLr === 1 ? diagDeg : Math.PI - diagDeg;
  const zip1 = pikaSimulateZip(windup.x, windup.y, diagAngle, 80, false);
  if (zip1.outcome === "died")
    return { reachedLedge: false, reachedStage: false };
  if (zip1.outcome) return pikaOutcomeToFlags(zip1.outcome);

  return pikaSimulateEndAndBeyond(
    zip1.x,
    zip1.y,
    zip1.vx,
    zip1.vy,
    zip1.actualAngle,
    false,
    pikaCanonicalReAimCandidates(targetLr),
  );
}

function pikaTryActivation(
  x0: number,
  y0: number,
): { reachedLedge: boolean; reachedStage: boolean } {
  const windup = pikaSimulateWindup(x0, y0);
  if (
    windup.outcome === "ledge" ||
    windup.outcome === "stage" ||
    windup.outcome === "both"
  ) {
    return {
      reachedLedge: windup.outcome === "ledge" || windup.outcome === "both",
      reachedStage: windup.outcome === "stage" || windup.outcome === "both",
    };
  }
  if (windup.outcome === "died")
    return { reachedLedge: false, reachedStage: false };

  let reachedLedge = false;
  let reachedStage = false;
  for (const angle of pikaAngleCandidates()) {
    if (reachedLedge && reachedStage) break;
    for (const magnitude of PIKA.MAGNITUDE_SAMPLES) {
      if (reachedLedge && reachedStage) break;
      const zip = pikaSimulateZip(windup.x, windup.y, angle, magnitude, false);
      if (zip.outcome === "ledge" || zip.outcome === "both")
        reachedLedge = true;
      if (zip.outcome === "stage" || zip.outcome === "both")
        reachedStage = true;
      if (zip.outcome === null) {
        const sub = pikaSimulateEndAndBeyond(
          zip.x,
          zip.y,
          zip.vx,
          zip.vy,
          zip.actualAngle,
          false,
        );
        reachedLedge = reachedLedge || sub.reachedLedge;
        reachedStage = reachedStage || sub.reachedStage;
      }
    }
  }
  return { reachedLedge, reachedStage };
}

export function pikachuRecoveryOutcomes(
  x0: number,
  y0: number,
  vx0: number,
  vy0: number,
  jumpsRemaining: number,
): RecoveryOutcomes {
  // Pikachu's activation zeroes BOTH vx and vy outright (the most aggressive version of the
  // "activation discards momentum" issue on this roster) -- search over how long to wait before
  // activating, mirroring Fox/DK/Samus. Coarser step (PIKA.ACTIVATION_DELAY_STEP) than the
  // others -- see the constant's comment for why.
  let reachedLedge = false;
  let reachedStage = false;

  // Fast path: try the canonical double-Quick-Attack technique first (see pikaCanonicalProbe).
  // If it already reaches the stage, we're done -- canReachStage implies canReachLedge by
  // construction (the decomp-accurate probe-offset ledge-catch mechanic), so there's no need to
  // run the full exhaustive search at all.
  for (const targetLr of [1, -1] as const) {
    const probe = pikaCanonicalProbe(x0, y0, targetLr);
    if (probe.reachedStage) return { canReachLedge: true, canReachStage: true };
    if (probe.reachedLedge) reachedLedge = true;
  }

  for (const targetLr of [1, -1] as const) {
    if (reachedLedge && reachedStage) break;
    let jumpVx0: number, jumpVy0: number;
    if (jumpsRemaining === 1) {
      jumpVx0 = targetLr * STICK_TOWARD * PIKA.JUMPAERIAL_VEL_X;
      jumpVy0 =
        (80 * PIKA.JUMP_HEIGHT_MUL + PIKA.JUMP_HEIGHT_BASE) *
        PIKA.JUMPAERIAL_HEIGHT;
    } else {
      jumpVx0 = vx0;
      jumpVy0 = vy0;
    }
    for (
      let delay = 0;
      delay <= PIKA.MAX_ACTIVATION_DELAY_FRAMES;
      delay += PIKA.ACTIVATION_DELAY_STEP
    ) {
      if (reachedLedge && reachedStage) break;
      let x = x0;
      let y = y0;
      let vx = jumpVx0;
      let vy = jumpVy0;
      let died = false;
      let activated = false;
      for (let frame = 0; frame < delay; frame++) {
        const prevX = x;
        const prevY = y;
        vy = applyGravity(vy, PIKA.GRAVITY, PIKA.TVEL_BASE);
        vx = clampAirVelX(
          vx,
          targetLr * STICK_TOWARD,
          PIKA.AIR_ACCEL,
          PIKA.AIR_SPEED_MAX_X,
        );
        x += vx;
        y += vy;
        const outcome = outcomeThisFrame(
          prevX,
          prevY,
          x,
          y,
          PIKA.CLIFFCATCH_X,
          PIKA.CLIFFCATCH_Y,
        );
        if (outcome) {
          if (outcome === "ledge" || outcome === "both") reachedLedge = true;
          if (outcome === "stage" || outcome === "both") reachedStage = true;
          activated = true;
          break;
        }
        if (y < DEATH_Y) {
          died = true;
          break;
        }
      }
      if (died || activated) continue;
      const { reachedLedge: l, reachedStage: s } = pikaTryActivation(x, y);
      reachedLedge = reachedLedge || l;
      reachedStage = reachedStage || s;
    }
  }
  return { canReachLedge: reachedLedge, canReachStage: reachedStage };
}

// ---------------------------------------------------------------------------
// Samus — Screw Attack, 0 jumps only (samus_recovery_sim.py)
//
// Includes a delay-before-pressing search, same reasoning as DK below: Screw Attack's launch
// overwrites vy to a fixed 62.0 regardless of incoming vy, so pressing immediately when already
// moving upward faster than that discards free height. Not confirmed on a real Samus miss, but
// it's the identical structural gap as DK's, fixed proactively.
// ---------------------------------------------------------------------------

const SAMUS = {
  GRAVITY: 1.9,
  TVEL_BASE: 42.0,
  AIR_ACCEL: 0.03,
  AIR_SPEED_MAX_X: 28.0,
  CLIFFCATCH_X: 440.0,
  CLIFFCATCH_Y: 550.0,
  SCREWATTACK_VEL_Y_BASE: 62.0,
  SCREWATTACK_DRIFT_MUL: 0.5,
  SCREWATTACK_DRIFT_CLAMP: 20.0,
  FALLSPECIAL_DRIFT: 0.66,
  MOVE_DURATION_FRAMES: 32,
  MAX_DELAY_FRAMES: 90,
  // Jump formula constants (217_SamusMain.c), for jumpsRemaining === 1.
  JUMP_HEIGHT_MUL: 0.5,
  JUMP_HEIGHT_BASE: 36.0,
  JUMPAERIAL_HEIGHT: 0.94,
  JUMPAERIAL_VEL_X: 0.35,
};

function samusSimulateScrewAttack(
  x0: number,
  y0: number,
  vx0: number,
  targetLr: 1 | -1,
): Outcome {
  let vy = SAMUS.SCREWATTACK_VEL_Y_BASE;
  let vx = clampMagnitude(vx0, SAMUS.SCREWATTACK_DRIFT_CLAMP);
  let x = x0;
  let y = y0;
  for (let i = 0; i < SAMUS.MOVE_DURATION_FRAMES; i++) {
    const prevX = x;
    const prevY = y;
    vy = applyGravity(vy, SAMUS.GRAVITY, SAMUS.TVEL_BASE);
    vx = clampAirVelX(
      vx,
      targetLr * STICK_TOWARD,
      SAMUS.AIR_ACCEL * SAMUS.SCREWATTACK_DRIFT_MUL,
      SAMUS.SCREWATTACK_DRIFT_CLAMP,
    );
    x += vx;
    y += vy;
    const outcome = outcomeThisFrame(
      prevX,
      prevY,
      x,
      y,
      SAMUS.CLIFFCATCH_X,
      SAMUS.CLIFFCATCH_Y,
    );
    if (outcome) return outcome;
  }
  for (let i = 0; i < MAX_HELPLESS_FRAMES; i++) {
    const prevX = x;
    const prevY = y;
    vy = applyGravity(vy, SAMUS.GRAVITY, SAMUS.TVEL_BASE);
    vx = clampAirVelX(
      vx,
      targetLr * STICK_TOWARD,
      SAMUS.AIR_ACCEL * SAMUS.FALLSPECIAL_DRIFT,
      SAMUS.TVEL_BASE,
    );
    x += vx;
    y += vy;
    const outcome = outcomeThisFrame(
      prevX,
      prevY,
      x,
      y,
      SAMUS.CLIFFCATCH_X,
      SAMUS.CLIFFCATCH_Y,
    );
    if (outcome) return outcome;
    if (y < DEATH_Y) return null;
  }
  return null;
}

function samusRecoveryOutcomes(
  x0: number,
  y0: number,
  vx0: number,
  vy0: number,
  jumpsRemaining: number,
): RecoveryOutcomes {
  let reachedLedge = false;
  let reachedStage = false;
  for (const targetLr of [1, -1] as const) {
    if (reachedLedge && reachedStage) break;
    let jumpVx0: number, jumpVy0: number;
    if (jumpsRemaining === 1) {
      jumpVx0 = targetLr * STICK_TOWARD * SAMUS.JUMPAERIAL_VEL_X;
      jumpVy0 =
        (80 * SAMUS.JUMP_HEIGHT_MUL + SAMUS.JUMP_HEIGHT_BASE) *
        SAMUS.JUMPAERIAL_HEIGHT;
    } else {
      jumpVx0 = vx0;
      jumpVy0 = vy0;
    }
    for (let delay = 0; delay <= SAMUS.MAX_DELAY_FRAMES; delay++) {
      if (reachedLedge && reachedStage) break;
      let x = x0;
      let y = y0;
      let vx = jumpVx0;
      let vy = jumpVy0;
      let outcome: Outcome = null;
      let died = false;
      for (let frame = 0; frame < delay; frame++) {
        const prevX = x;
        const prevY = y;
        vy = applyGravity(vy, SAMUS.GRAVITY, SAMUS.TVEL_BASE);
        vx = clampAirVelX(
          vx,
          targetLr * STICK_TOWARD,
          SAMUS.AIR_ACCEL,
          SAMUS.AIR_SPEED_MAX_X,
        );
        x += vx;
        y += vy;
        outcome = outcomeThisFrame(
          prevX,
          prevY,
          x,
          y,
          SAMUS.CLIFFCATCH_X,
          SAMUS.CLIFFCATCH_Y,
        );
        if (outcome) break;
        if (y < DEATH_Y) {
          died = true;
          break;
        }
      }
      if (outcome === null && !died) {
        outcome = samusSimulateScrewAttack(x, y, vx, targetLr);
      }
      if (outcome === "ledge" || outcome === "both") reachedLedge = true;
      if (outcome === "stage" || outcome === "both") reachedStage = true;
    }
  }
  return { canReachLedge: reachedLedge, canReachStage: reachedStage };
}

// ---------------------------------------------------------------------------
// Donkey Kong — Spinning Kong, 0 jumps only (dk_recovery_sim.py)
//
// Includes a delay-before-pressing search. Found via a real validated miss (DK entering a
// recovery situation at vy0=+81.3, already moving upward faster than Spinning Kong's own fixed
// launch velocity of 20.3): pressing immediately discards free height for no reason. The
// height-maximizing press moment is the apex of the free-falling arc (vy crossing from positive
// to non-positive), but rather than special-case that single closed-form moment, this searches
// every delay 0..MAX_DELAY_FRAMES the same way Link's simulator already does -- provably at
// least as good as the apex heuristic alone, and horizontal drift also accumulates during the
// wait, which the pure height argument doesn't account for.
//
// CLOSED-FORM: fully converted -- no per-frame simulation loops left. Every candidate
// delay/direction is evaluated via evaluatePhase's O(log n) crossing lookups instead of an O(n)
// simulation loop. Same search space (same delays, same directions, same physics constants) as
// the original frame-stepped version -- fuzz-verified to match up to floating-point rounding
// across ~3000 random trials + a dense boundary grid, 0 mismatches. Measured ~4.6-5.3x wall-clock
// speedup.
// ---------------------------------------------------------------------------

const DK = {
  GRAVITY: 3.0,
  TVEL_BASE: 56.0,
  AIR_ACCEL: 0.025, // general (pre-press) air control, NOT the move-specific value below
  AIR_SPEED_MAX_X: 30.0,
  CLIFFCATCH_X: 500.0,
  CLIFFCATCH_Y: 600.0,
  SPINNINGKONG_AIR_VEL_Y: 20.3,
  SPINNINGKONG_AIR_ACCEL: 0.05,
  SPINNINGKONG_AIR_VEL_MAX: 38.0,
  SPINNINGKONG_START_GRAVITY_MUL: 0.07,
  SPINNINGKONG_END_GRAVITY_MUL: 1.0,
  SPINNINGKONG_FALLSPECIAL_DRIFT: 1.0,
  GRAVITY_SWITCH_FRAME: 57,
  MOVE_DURATION_FRAMES: 73,
  MAX_DELAY_FRAMES: 90,
  // Jump formula constants (213_DonkeyMain.c), for jumpsRemaining === 1.
  JUMP_HEIGHT_MUL: 0.47,
  JUMP_HEIGHT_BASE: 55.0,
  JUMPAERIAL_HEIGHT: 0.91,
  JUMPAERIAL_VEL_X: 0.5,
};

function dkSimulateSpinningKong(
  x0: number,
  y0: number,
  vx0: number,
  targetLr: 1 | -1,
): Outcome {
  const vy0 = DK.SPINNINGKONG_AIR_VEL_Y;
  const vxClamped = clampMagnitude(vx0, DK.SPINNINGKONG_AIR_VEL_MAX);

  const durationEarly = Math.min(
    DK.GRAVITY_SWITCH_FRAME,
    DK.MOVE_DURATION_FRAMES,
  );
  let phase = evaluatePhase(
    x0,
    y0,
    vxClamped,
    vy0,
    DK.GRAVITY * DK.SPINNINGKONG_START_GRAVITY_MUL,
    DK.TVEL_BASE,
    targetLr * DK.SPINNINGKONG_AIR_VEL_MAX,
    DK.SPINNINGKONG_AIR_ACCEL * 80,
    DK.CLIFFCATCH_X,
    DK.CLIFFCATCH_Y,
    durationEarly,
  );
  if (phase.outcome) return phase.outcome;
  if (phase.died) return null;

  const durationLate = DK.MOVE_DURATION_FRAMES - durationEarly;
  if (durationLate > 0) {
    const [x, y, vx, vy] = phase.endState!;
    phase = evaluatePhase(
      x,
      y,
      vx,
      vy,
      DK.GRAVITY * DK.SPINNINGKONG_END_GRAVITY_MUL,
      DK.TVEL_BASE,
      targetLr * DK.SPINNINGKONG_AIR_VEL_MAX,
      DK.SPINNINGKONG_AIR_ACCEL * 80,
      DK.CLIFFCATCH_X,
      DK.CLIFFCATCH_Y,
      durationLate,
    );
    if (phase.outcome) return phase.outcome;
    if (phase.died) return null;
  }

  const [x, y, vx, vy] = phase.endState!;
  const final = evaluatePhase(
    x,
    y,
    vx,
    vy,
    DK.GRAVITY,
    DK.TVEL_BASE,
    targetLr *
      (DK.SPINNINGKONG_AIR_VEL_MAX * DK.SPINNINGKONG_FALLSPECIAL_DRIFT),
    DK.SPINNINGKONG_AIR_ACCEL * 80,
    DK.CLIFFCATCH_X,
    DK.CLIFFCATCH_Y,
    MAX_HELPLESS_FRAMES,
  );
  return final.outcome;
}

function dkRecoveryOutcomes(
  x0: number,
  y0: number,
  vx0: number,
  vy0: number,
  jumpsRemaining: number,
): RecoveryOutcomes {
  let reachedLedge = false;
  let reachedStage = false;
  for (const targetLr of [1, -1] as const) {
    if (reachedLedge && reachedStage) break;
    let jumpVx0: number, jumpVy0: number;
    if (jumpsRemaining === 1) {
      jumpVx0 = targetLr * STICK_TOWARD * DK.JUMPAERIAL_VEL_X;
      jumpVy0 =
        (80 * DK.JUMP_HEIGHT_MUL + DK.JUMP_HEIGHT_BASE) * DK.JUMPAERIAL_HEIGHT;
    } else {
      jumpVx0 = vx0;
      jumpVy0 = vy0;
    }
    for (let delay = 0; delay <= DK.MAX_DELAY_FRAMES; delay++) {
      if (reachedLedge && reachedStage) break;
      const phase = evaluatePhase(
        x0,
        y0,
        jumpVx0,
        jumpVy0,
        DK.GRAVITY,
        DK.TVEL_BASE,
        targetLr * DK.AIR_SPEED_MAX_X,
        DK.AIR_ACCEL * 80,
        DK.CLIFFCATCH_X,
        DK.CLIFFCATCH_Y,
        delay,
      );
      let outcome = phase.outcome;
      if (outcome === null && !phase.died) {
        const [x, y, vx] = phase.endState!;
        outcome = dkSimulateSpinningKong(x, y, vx, targetLr);
      }
      if (outcome === "ledge" || outcome === "both") reachedLedge = true;
      if (outcome === "stage" || outcome === "both") reachedStage = true;
    }
  }
  return { canReachLedge: reachedLedge, canReachStage: reachedStage };
}

/**
 * TEST-ONLY frame-stepped oracle: the original implementation of dkSimulateSpinningKong, before
 * the closed-form conversion above. Not called from classify() or anywhere in production -- kept
 * only so recoveryHeuristics.test.ts can regression-test the closed-form DK against a real
 * per-frame simulation, the same way Python's *_frame_stepped copies serve as a frozen oracle for
 * its own closed-form modules. Shares DK's real constants automatically (no separate copy to go
 * stale), since it lives in this same file right next to them.
 */
export function dkSimulateSpinningKongFrameStepped(
  x0: number,
  y0: number,
  vx0: number,
  targetLr: 1 | -1,
): Outcome {
  let vy = DK.SPINNINGKONG_AIR_VEL_Y;
  let vx = clampMagnitude(vx0, DK.SPINNINGKONG_AIR_VEL_MAX);
  let x = x0;
  let y = y0;
  for (let frame = 0; frame < DK.MOVE_DURATION_FRAMES; frame++) {
    const prevX = x;
    const prevY = y;
    const gravityMul =
      frame >= DK.GRAVITY_SWITCH_FRAME
        ? DK.SPINNINGKONG_END_GRAVITY_MUL
        : DK.SPINNINGKONG_START_GRAVITY_MUL;
    vy = applyGravity(vy, DK.GRAVITY * gravityMul, DK.TVEL_BASE);
    vx = clampAirVelX(
      vx,
      targetLr * STICK_TOWARD,
      DK.SPINNINGKONG_AIR_ACCEL,
      DK.SPINNINGKONG_AIR_VEL_MAX,
    );
    x += vx;
    y += vy;
    const outcome = outcomeThisFrame(
      prevX,
      prevY,
      x,
      y,
      DK.CLIFFCATCH_X,
      DK.CLIFFCATCH_Y,
    );
    if (outcome) return outcome;
  }
  for (let i = 0; i < MAX_HELPLESS_FRAMES; i++) {
    const prevX = x;
    const prevY = y;
    vy = applyGravity(vy, DK.GRAVITY, DK.TVEL_BASE);
    vx = clampAirVelX(
      vx,
      targetLr * STICK_TOWARD,
      DK.SPINNINGKONG_AIR_ACCEL,
      DK.SPINNINGKONG_AIR_VEL_MAX * DK.SPINNINGKONG_FALLSPECIAL_DRIFT,
    );
    x += vx;
    y += vy;
    const outcome = outcomeThisFrame(
      prevX,
      prevY,
      x,
      y,
      DK.CLIFFCATCH_X,
      DK.CLIFFCATCH_Y,
    );
    if (outcome) return outcome;
    if (y < DEATH_Y) return null;
  }
  return null;
}

/** TEST-ONLY frame-stepped oracle: see dkSimulateSpinningKongFrameStepped's doc comment. The
 * original implementation of dkRecoveryOutcomes, before the closed-form conversion. */
export function dkRecoveryOutcomesFrameStepped(
  x0: number,
  y0: number,
  vx0: number,
  vy0: number,
  jumpsRemaining: number,
): RecoveryOutcomes {
  let reachedLedge = false;
  let reachedStage = false;
  for (const targetLr of [1, -1] as const) {
    if (reachedLedge && reachedStage) break;
    let jumpVx0: number, jumpVy0: number;
    if (jumpsRemaining === 1) {
      jumpVx0 = targetLr * STICK_TOWARD * DK.JUMPAERIAL_VEL_X;
      jumpVy0 =
        (80 * DK.JUMP_HEIGHT_MUL + DK.JUMP_HEIGHT_BASE) * DK.JUMPAERIAL_HEIGHT;
    } else {
      jumpVx0 = vx0;
      jumpVy0 = vy0;
    }
    for (let delay = 0; delay <= DK.MAX_DELAY_FRAMES; delay++) {
      if (reachedLedge && reachedStage) break;
      let x = x0;
      let y = y0;
      let vx = jumpVx0;
      let vy = jumpVy0;
      let outcome: Outcome = null;
      let died = false;
      for (let frame = 0; frame < delay; frame++) {
        const prevX = x;
        const prevY = y;
        vy = applyGravity(vy, DK.GRAVITY, DK.TVEL_BASE);
        vx = clampAirVelX(
          vx,
          targetLr * STICK_TOWARD,
          DK.AIR_ACCEL,
          DK.AIR_SPEED_MAX_X,
        );
        x += vx;
        y += vy;
        outcome = outcomeThisFrame(
          prevX,
          prevY,
          x,
          y,
          DK.CLIFFCATCH_X,
          DK.CLIFFCATCH_Y,
        );
        if (outcome) break;
        if (y < DEATH_Y) {
          died = true;
          break;
        }
      }
      if (outcome === null && !died) {
        outcome = dkSimulateSpinningKongFrameStepped(x, y, vx, targetLr);
      }
      if (outcome === "ledge" || outcome === "both") reachedLedge = true;
      if (outcome === "stage" || outcome === "both") reachedStage = true;
    }
  }
  return { canReachLedge: reachedLedge, canReachStage: reachedStage };
}

// ---------------------------------------------------------------------------
// Fox — Firefox, 0 jumps only (fox_recovery_sim.py)
//
// No delay-search fix needed here: Fox's hold phase is a MANDATORY fixed 35-frame windup with
// no timing choice at all (unlike DK/Samus, which press immediately by default), so there's no
// "should I wait longer" decision to search over.
// ---------------------------------------------------------------------------

const FOX = {
  GRAVITY: 4.0,
  TVEL_BASE: 60.0,
  AIR_ACCEL: 0.03, // general (pre-activation) air control -- 209_FoxMain.c
  AIR_SPEED_MAX_X: 36.0,
  CLIFFCATCH_X: 400.0,
  CLIFFCATCH_Y: 400.0,
  LAUNCH_DELAY: 35,
  GRAVITY_DELAY: 15,
  HOLD_GRAVITY: 0.5,
  FIREFOX_VEL: 115.0,
  TRAVEL_TIME: 30,
  DECELERATE_DELAY: 2,
  DECELERATE_VEL: 3.03571438789,
  AIR_FRICTION: 0.3,
  // Jump formula constants (209_FoxMain.c), for jumpsRemaining === 1.
  JUMP_HEIGHT_MUL: 1.0,
  JUMP_HEIGHT_BASE: 23.0,
  JUMPAERIAL_HEIGHT: 1.1,
  JUMPAERIAL_VEL_X: 0.5,
  ANGLE_STEPS: 36,
  MAX_ACTIVATION_DELAY_FRAMES: 90,
};

function foxSimulateHold(
  x0: number,
  y0: number,
  vx0: number,
): { outcome: Outcome | "died"; x: number; y: number; vx: number } {
  let vy = 0.0;
  let vx = vx0 / 2.0;
  let x = x0;
  let y = y0;
  for (let frame = 0; frame < FOX.LAUNCH_DELAY; frame++) {
    const prevX = x;
    const prevY = y;
    if (frame >= FOX.GRAVITY_DELAY) {
      vy -= FOX.HOLD_GRAVITY;
      if (vy < -FOX.TVEL_BASE) vy = -FOX.TVEL_BASE;
    }
    vx = applyFriction(vx, FOX.AIR_FRICTION);
    x += vx;
    y += vy;
    const outcome = outcomeThisFrame(
      prevX,
      prevY,
      x,
      y,
      FOX.CLIFFCATCH_X,
      FOX.CLIFFCATCH_Y,
    );
    if (outcome) return { outcome, x, y, vx };
    if (y < DEATH_Y) return { outcome: "died", x, y, vx };
  }
  return { outcome: null, x, y, vx };
}

function foxSimulateDash(x0: number, y0: number, angle: number): Outcome {
  let vx = Math.cos(angle) * FOX.FIREFOX_VEL;
  let vy = Math.sin(angle) * FOX.FIREFOX_VEL;
  let x = x0;
  let y = y0;
  for (let frame = 0; frame < FOX.TRAVEL_TIME; frame++) {
    const prevX = x;
    const prevY = y;
    if (frame >= FOX.DECELERATE_DELAY) {
      vx -= FOX.DECELERATE_VEL * Math.cos(angle);
      vy -= FOX.DECELERATE_VEL * Math.sin(angle);
    }
    x += vx;
    y += vy;
    const outcome = outcomeThisFrame(
      prevX,
      prevY,
      x,
      y,
      FOX.CLIFFCATCH_X,
      FOX.CLIFFCATCH_Y,
    );
    if (outcome) return outcome;
    if (y < DEATH_Y) return null;
  }
  for (let i = 0; i < MAX_HELPLESS_FRAMES; i++) {
    const prevX = x;
    const prevY = y;
    vy -= FOX.GRAVITY;
    if (vy < -FOX.TVEL_BASE) vy = -FOX.TVEL_BASE;
    vx = applyFriction(vx, FOX.AIR_FRICTION);
    x += vx;
    y += vy;
    const outcome = outcomeThisFrame(
      prevX,
      prevY,
      x,
      y,
      FOX.CLIFFCATCH_X,
      FOX.CLIFFCATCH_Y,
    );
    if (outcome) return outcome;
    if (y < DEATH_Y) return null;
  }
  return null;
}

function foxTryActivation(
  x0: number,
  y0: number,
  vx0: number,
): { reachedLedge: boolean; reachedStage: boolean } {
  const held = foxSimulateHold(x0, y0, vx0);
  if (
    held.outcome === "ledge" ||
    held.outcome === "stage" ||
    held.outcome === "both"
  ) {
    return {
      reachedLedge: held.outcome === "ledge" || held.outcome === "both",
      reachedStage: held.outcome === "stage" || held.outcome === "both",
    };
  }
  if (held.outcome === "died")
    return { reachedLedge: false, reachedStage: false };

  let reachedLedge = false;
  let reachedStage = false;
  for (let i = 0; i < FOX.ANGLE_STEPS; i++) {
    if (reachedLedge && reachedStage) break;
    const angle = (2 * Math.PI * i) / FOX.ANGLE_STEPS;
    const outcome = foxSimulateDash(held.x, held.y, angle);
    if (outcome === "ledge" || outcome === "both") reachedLedge = true;
    if (outcome === "stage" || outcome === "both") reachedStage = true;
  }
  return { reachedLedge, reachedStage };
}

function foxRecoveryOutcomes(
  x0: number,
  y0: number,
  vx0: number,
  vy0: number,
  jumpsRemaining: number,
): RecoveryOutcomes {
  // Fox's activation zeroes vy outright (not just caps it), so entering with any positive vy
  // and pressing B immediately discards it -- same failure class as DK's validated miss, just
  // more severe. Search over how long to wait before activating at all, mirroring DK/Samus.
  let reachedLedge = false;
  let reachedStage = false;
  for (const targetLr of [1, -1] as const) {
    if (reachedLedge && reachedStage) break;
    let jumpVx0: number, jumpVy0: number;
    if (jumpsRemaining === 1) {
      jumpVx0 = targetLr * STICK_TOWARD * FOX.JUMPAERIAL_VEL_X;
      jumpVy0 =
        (80 * FOX.JUMP_HEIGHT_MUL + FOX.JUMP_HEIGHT_BASE) *
        FOX.JUMPAERIAL_HEIGHT;
    } else {
      jumpVx0 = vx0;
      jumpVy0 = vy0;
    }
    for (let delay = 0; delay <= FOX.MAX_ACTIVATION_DELAY_FRAMES; delay++) {
      if (reachedLedge && reachedStage) break;
      let x = x0;
      let y = y0;
      let vx = jumpVx0;
      let vy = jumpVy0;
      let died = false;
      let activated = false;
      for (let frame = 0; frame < delay; frame++) {
        const prevX = x;
        const prevY = y;
        vy = applyGravity(vy, FOX.GRAVITY, FOX.TVEL_BASE);
        vx = clampAirVelX(
          vx,
          targetLr * STICK_TOWARD,
          FOX.AIR_ACCEL,
          FOX.AIR_SPEED_MAX_X,
        );
        x += vx;
        y += vy;
        const outcome = outcomeThisFrame(
          prevX,
          prevY,
          x,
          y,
          FOX.CLIFFCATCH_X,
          FOX.CLIFFCATCH_Y,
        );
        if (outcome) {
          if (outcome === "ledge" || outcome === "both") reachedLedge = true;
          if (outcome === "stage" || outcome === "both") reachedStage = true;
          activated = true;
          break;
        }
        if (y < DEATH_Y) {
          died = true;
          break;
        }
      }
      if (died || activated) continue;
      const { reachedLedge: l, reachedStage: s } = foxTryActivation(x, y, vx);
      reachedLedge = reachedLedge || l;
      reachedStage = reachedStage || s;
    }
  }
  return { canReachLedge: reachedLedge, canReachStage: reachedStage };
}

// ---------------------------------------------------------------------------
// Yoshi / Jigglypuff — no up-B recovery, pure jump/freefall physics
// (no_upb_recovery_sim.py). Supports 0 or 1 jumps remaining (Jigglypuff);
// Yoshi is 0-jumps-only, gated further at dispatch by actionStateId (see classify()).
// ---------------------------------------------------------------------------

interface NoUpBAttr {
  gravity: number;
  tvelBase: number;
  airAccel: number;
  airSpeedMaxX: number;
  cliffcatchX: number;
  cliffcatchY: number;
  jumpHeightMul: number;
  jumpHeightBase: number;
  jumpaerialHeight: number;
  jumpaerialVelX: number;
  /** Set only for Yoshi (root-motion double jump) - see YOSHI_DOUBLE_JUMP_DY_CURVE below. */
  doubleJumpDyCurve?: readonly number[];
}

/**
 * Yoshi's double-jump vertical motion, one entry per real physics frame after activation: the Y
 * POSITION DELTA (not vy - see below for why that distinction matters), extracted from the
 * single cleanest/longest real replay trace found in the "nue replays" corpus
 * (260828205834-nue-Kurabba-60.rmgr, port 1, 93 consecutive JumpAerialF/B frames). Index 0 is the
 * delta from activation-frame (vy reset to 0) to frame 1; cross-checked against dozens of other
 * real Yoshi double-jump instances in the corpus and reproduces identically wherever the
 * actionFrameCounter timing lines up.
 *
 * WHY POSITION DELTA, NOT vy: the reported vy is NOT integrated into Y every frame during this
 * move - real replay data shows stretches where Y is frozen for several consecutive frames while
 * vy is reported as an unchanged nonzero value and X keeps moving normally (the joint's authored
 * translation curve is itself coarsely keyframed, so the derived "velocity" is stale between
 * keyframe updates). Treating vy as an ordinary velocity to integrate (`y += vy`) would be wrong
 * here; replaying the literal observed Y delta per frame is what the real game actually produced.
 *
 * Horizontal (vx) is NOT part of this curve - Yoshi's double jump only overrides Y; X still goes
 * through the completely ordinary clampAirVelX. vy IS reset to 0.0 at activation (frame 0 of the
 * real trace always reads vy=0.000 regardless of incoming vy), but vx is NOT reset - it continues
 * evolving from whatever it already was.
 */
const YOSHI_DOUBLE_JUMP_DY_CURVE: readonly number[] = [
  -24.441, -20.998, -17.444, -13.777, -9.999, -6.109, -2.107, 8.214, 20.103,
  30.752, 40.159, 48.326, 55.253, 60.939, 65.384, 68.589, 0.0, 0.0, 0.0, 0.0,
  0.0, 0.0, 0.0, 0.0, 70.553, 71.277, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  70.975, 70.412, 69.755, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 69.004,
  68.159, 67.22, 66.187, 65.061, 63.84, 62.526, 61.118, 59.616, 58.02, 56.33,
  54.546, 52.668, 50.697, 48.631, 46.472, 44.218, 41.871, 39.43, 36.895, 34.266,
  31.543, 28.726, 25.816, 22.811, 19.713, 16.52, 13.234, 9.854, 6.38, 2.812,
  -0.943, -4.74, -8.41, -11.955, -15.373, -18.666, -21.832, -24.872, -27.786,
  -30.575, -33.237, -35.773, -38.183, -40.467, -42.625, -44.657,
];

/** The curve's implied vy at the point it ends, used as the starting vy for ordinary
 * applyGravity-driven freefall once the recorded window runs out (by that point the trajectory
 * is already deep into a smooth, monotonically-more-negative descent, so handing off to normal
 * gravity is a safe approximation of the animation blending into a plain Fall state). */
const YOSHI_DOUBLE_JUMP_FINAL_VY =
  YOSHI_DOUBLE_JUMP_DY_CURVE[YOSHI_DOUBLE_JUMP_DY_CURVE.length - 1]!;

const YOSHI_ATTR: NoUpBAttr = {
  gravity: 2.8,
  tvelBase: 58.0,
  airAccel: 0.04,
  airSpeedMaxX: 44.0,
  cliffcatchX: 420.0,
  cliffcatchY: 400.0,
  jumpHeightMul: 0.7,
  jumpHeightBase: 27.5,
  jumpaerialHeight: 1.2,
  jumpaerialVelX: 0.4,
  doubleJumpDyCurve: YOSHI_DOUBLE_JUMP_DY_CURVE,
};

const JIGGLYPUFF_ATTR: NoUpBAttr = {
  gravity: 2.0,
  tvelBase: 38.0,
  airAccel: 0.07,
  airSpeedMaxX: 35.0,
  cliffcatchX: 250.0,
  cliffcatchY: 400.0,
  jumpHeightMul: 0.7,
  jumpHeightBase: 20.0,
  jumpaerialHeight: 0.7,
  jumpaerialVelX: 0.35,
};

function noUpBSimulateFreefall(
  x0: number,
  y0: number,
  vx0: number,
  vy0: number,
  attr: NoUpBAttr,
  targetLr: 1 | -1,
): Outcome {
  let x = x0;
  let y = y0;
  let vx = vx0;
  let vy = vy0;
  for (let i = 0; i < 1000; i++) {
    const prevX = x;
    const prevY = y;
    vy = applyGravity(vy, attr.gravity, attr.tvelBase);
    vx = clampAirVelX(
      vx,
      targetLr * STICK_TOWARD,
      attr.airAccel,
      attr.airSpeedMaxX,
    );
    x += vx;
    y += vy;
    const outcome = outcomeThisFrame(
      prevX,
      prevY,
      x,
      y,
      attr.cliffcatchX,
      attr.cliffcatchY,
    );
    if (outcome) return outcome;
    if (y < DEATH_Y) return null;
  }
  return null;
}

/** Replays YOSHI_DOUBLE_JUMP_DY_CURVE for Y while X follows ordinary clampAirVelX drift, then
 * hands off to normal freefall once the curve is exhausted. Only meaningful for Yoshi (attr.
 * doubleJumpDyCurve set). */
function simulateYoshiDoubleJump(
  x0: number,
  y0: number,
  vx0: number,
  targetLr: 1 | -1,
  attr: NoUpBAttr,
): Outcome {
  const curve = attr.doubleJumpDyCurve!;
  let x = x0;
  let y = y0;
  let vx = vx0;
  for (const dy of curve) {
    const prevX = x;
    const prevY = y;
    vx = clampAirVelX(
      vx,
      targetLr * STICK_TOWARD,
      attr.airAccel,
      attr.airSpeedMaxX,
    );
    x += vx;
    y += dy;
    const outcome = outcomeThisFrame(
      prevX,
      prevY,
      x,
      y,
      attr.cliffcatchX,
      attr.cliffcatchY,
    );
    if (outcome) return outcome;
    if (y < DEATH_Y) return null;
  }
  return noUpBSimulateFreefall(
    x,
    y,
    vx,
    YOSHI_DOUBLE_JUMP_FINAL_VY,
    attr,
    targetLr,
  );
}

function noUpBRecoveryOutcomes(
  x: number,
  y: number,
  vx: number,
  vy: number,
  jumpsRemaining: number,
  attr: NoUpBAttr,
): RecoveryOutcomes {
  let reachedLedge = false;
  let reachedStage = false;
  for (const targetLr of [1, -1] as const) {
    if (reachedLedge && reachedStage) break;
    const outcomes: Outcome[] = [];
    if (jumpsRemaining === 1 && attr.doubleJumpDyCurve) {
      // Root-motion double jump (Yoshi): vy resets to 0 at activation and is then replayed from
      // the empirically-extracted curve; vx is NOT reset. Also try NOT using the jump at all
      // (plain freefall from the current vx/vy) -- the curve's first several frames actually
      // sink DOWN before climbing (an animation wind-up dip), so for an entry already falling
      // at/near terminal velocity with height/drift room to spare, spending the jump can be
      // strictly worse than just drifting straight to the stage. Since the jump hasn't been used
      // yet, not pressing it is always a legal alternative strategy, not a hypothetical.
      outcomes.push(simulateYoshiDoubleJump(x, y, vx, targetLr, attr));
      outcomes.push(noUpBSimulateFreefall(x, y, vx, vy, attr, targetLr));
    } else {
      let vx0 = vx;
      let vy0 = vy;
      if (jumpsRemaining === 1) {
        // Standard single-aerial-jump formula (Jigglypuff only reaches here -- confirmed
        // identical to every other non-root-motion character's first aerial jump).
        vy0 =
          (80 * attr.jumpHeightMul + attr.jumpHeightBase) *
          attr.jumpaerialHeight;
        vx0 = targetLr * STICK_TOWARD * attr.jumpaerialVelX;
      }
      outcomes.push(noUpBSimulateFreefall(x, y, vx0, vy0, attr, targetLr));
    }
    for (const outcome of outcomes) {
      if (outcome === "ledge" || outcome === "both") reachedLedge = true;
      if (outcome === "stage" || outcome === "both") reachedStage = true;
    }
  }
  return { canReachLedge: reachedLedge, canReachStage: reachedStage };
}

// ---------------------------------------------------------------------------
// Captain Falcon — Falcon Dive, 0 or 1 jumps (relay from the Game Expert session, 2026-09-10;
// ftcaptainspecialhi.c/236_CaptainMain.c/ftcaptain.h, plus a root-motion animation-curve
// interpreter built specifically for this -- Falcon Dive is root-motion for its ENTIRE duration,
// not formula-driven like the other seven characters).
//
// NO ANGLE/MAGNITUDE SEARCH, BUT A DELAY SEARCH IS STILL NEEDED: the Game Expert's relay said "no
// search" meaning no angle x magnitude search -- the dive's direction/power isn't a free choice
// the way Quick Attack's is, so that part holds. But their strategy (activate immediately, no
// delay) turned out to be an incomplete recovery model, caught via this project's own
// recoveryValidation.ts run against real Falcon matches in the corpus: 6/51 real situations came
// back WRONG with immediate-only activation, all with the recovering player already falling near
// terminal velocity (vy roughly -66, i.e. TVEL_BASE) before diving -- activating immediately from
// there discards the option to drift closer to the stage under ordinary Fall-state control first,
// the exact same "activation resets momentum, so pressing immediately can be strictly worse than
// waiting" issue DK/Samus/Pikachu's own delay searches already exist to cover (see
// DK.MAX_DELAY_FRAMES / SAMUS.MAX_DELAY_FRAMES elsewhere in this file). So: jumpsRemaining and
// entry vx/vy DO matter here after all, through the standard jump-formula + delay-search shape
// used by every other special-move character below, right up until the moment of activation --
// only AT activation does ftCaptainSpecialHiProcStatus's confirmed zero-drift reset apply. Full
// revalidation after adding the delay search: WRONG dropped from 6/51 to 0/51 (see
// recoveryHeuristics.test.ts's Falcon fuzz suite and the corpus run in this change's commit
// message). Relayed back to the Game Expert since their "no search needed" framing needs this
// caveat for future characters (Ness/Kirby) built with the same root-motion interpreter.
//
// FACING: modeled as facing-independent (tries both target directions unconditionally, like
// Fox/Pikachu), NOT verified against source the way Pikachu's Quick Attack explicitly was -- the
// physics formula itself treats direction as stick-driven (targetLr feeds the per-frame drift
// calculation directly, the same shape as Fox/Pikachu's facing-independent moves), and the
// strategy's own "jump to face the stage first" step implies facing is not a hard constraint when
// a jump is available. Flagged back to the Game Expert as an assumption worth confirming, not a
// verified fact like the rest of this section.
// ---------------------------------------------------------------------------

const FALCON = {
  GRAVITY: 3.4,
  TVEL_BASE: 66.0,
  AIR_ACCEL: 0.04,
  AIR_SPEED_MAX_X: 31.0,
  AIR_FRICTION: 0.2,
  CLIFFCATCH_X: 440.0,
  CLIFFCATCH_Y: 550.0,
  JUMP_HEIGHT_MUL: 1.0,
  JUMP_HEIGHT_BASE: 24.0,
  JUMPAERIAL_HEIGHT: 0.9,
  JUMPAERIAL_VEL_X: 0.35,
  FALCONDIVE_AIR_ACCEL_MUL: 1.1,
  FALCONDIVE_AIR_SPEED_MAX_MUL: 0.8,
  FALLSPECIAL_DRIFT: 0.72,
  MAX_DELAY_FRAMES: 90,
};

/**
 * Root-motion curve for Falcon Dive, 65 frames, extracted from 1658_FTCaptainAnimFalconDive.c's
 * joint2 (TransN) track via a decomp-format animation-curve interpreter (AObjEvent16 "figatree"
 * commands + cubic Hermite interpolation) built specifically for this move. World-space delta is
 * `curveDX(t) * -targetLr` for X (the sign flip matches ftPhysicsGetAirVelTransN's own formula)
 * and `curveDY(t)` for Y (unflipped -- TransN's z-rotation term is 0 throughout this move). Values
 * below are target_lr=+1 world-space (negate DX for target_lr=-1, handled by the caller).
 *
 * CAVEAT (from the Game Expert relay, not yet cross-validated against real replay data -- the
 * corpus has very few Falcon matches): DY[0] = -1849, a much larger single-frame delta than
 * anything else in the curve, traced to several zero-duration animation commands cascading on the
 * very first frame before the first real pacing command -- plausibly real (consistent with
 * DY[1]/DY[2]'s similarly cascade-driven 551/687), but worth a second look if this model ever
 * produces a visibly-wrong result right at Falcon Dive activation.
 */
const FALCON_DIVE_DX: readonly number[] = [
  0.0, 0.0, 0.0, 0.09, 0.23, 0.31, 0.33, 0.29, 0.19, 0.03, -0.19, -0.47, -0.81,
  -0.7778, -0.7778, -1.4444, -0.4898, 1.7143, 2.6939, 2.449, 0.9796, -1.7143,
  -5.6327, -7.7106, -7.1444, -6.5969, -6.0682, -5.5584, -5.0673, -4.595,
  -4.1415, -3.7067, -3.2908, -2.8936, -2.5153, -2.1557, -1.8149, -1.4929,
  -1.1897, -0.9053, -0.6397, -0.3928, -0.1648, 0.0445, 0.235, 0.4067, 0.5596,
  0.6937, 0.809, 0.9055, 0.9833, 1.0422, 1.0824, 1.1038, 1.1064, 1.0902,
  1.0552, 1.0014, 0.9288, 0.8375, 0.7274, 0.5984, 0.4507, 0.2842, 0.0,
];

const FALCON_DIVE_DY: readonly number[] = [
  -1849.0741, 551.1481, 686.9259, 0.54, 1.38, 1.86, 1.98, 1.74, 1.14, 0.18,
  -1.14, -2.82, -4.86, -58.963, -28.7407, 223.7037, 411.3249, 386.3098,
  361.7973, 337.7874, 314.2801, 291.2754, 268.7732, 246.7737, 225.2768,
  204.2825, 183.7907, 163.8016, 144.315, 125.3311, 106.8498, 88.871, 71.3949,
  54.4213, 37.9503, 21.982, 6.5162, -8.447, -22.9075, -36.8655, -50.3209,
  -63.2737, -75.7239, -87.6715, -99.1164, -110.0588, -120.4986, -130.4358,
  -139.8705, -148.8025, -157.2319, -165.1587, -172.5829, -179.5045, -185.9236,
  -191.84, -197.2538, -202.1651, -206.5737, -210.4797, -213.8832, -216.784,
  -219.1823, -221.0779, 0.0,
];

/** The curve's own last non-terminal Y delta, used as the starting vy for ordinary
 * applyGravity-driven FallSpecial once the recorded window runs out -- same handoff pattern as
 * Yoshi's YOSHI_DOUBLE_JUMP_FINAL_VY. Index length-1 (the literal last entry) is 0.0 for both DX
 * and DY, consistent with being an animation-loop-end reset rather than a real physics sample, so
 * the handoff uses the second-to-last entry instead. */
const FALCON_DIVE_FINAL_VY = FALCON_DIVE_DY[FALCON_DIVE_DY.length - 2]!;

function falconSimulateDiveAndBeyond(
  x0: number,
  y0: number,
  targetLr: 1 | -1,
): Outcome {
  let x = x0;
  let y = y0;
  let specialVelX = 0;
  const diveCap =
    FALCON.AIR_SPEED_MAX_X * FALCON.FALCONDIVE_AIR_SPEED_MAX_MUL;
  const diveAccel = FALCON.AIR_ACCEL * FALCON.FALCONDIVE_AIR_ACCEL_MUL;

  for (let t = 0; t < FALCON_DIVE_DX.length; t++) {
    const prevX = x;
    const prevY = y;
    if (Math.abs(specialVelX) > diveCap) {
      specialVelX += specialVelX >= 0 ? -1.0 : 1.0;
      if (Math.abs(specialVelX) < diveCap) {
        specialVelX = Math.sign(specialVelX) * diveCap;
      }
    } else {
      const stickX = targetLr * STICK_TOWARD;
      if (Math.abs(stickX) >= 8) {
        specialVelX = clampMagnitude(
          specialVelX + stickX * diveAccel,
          diveCap,
        );
      }
      specialVelX = applyFriction(specialVelX, FALCON.AIR_FRICTION);
    }
    x += specialVelX + FALCON_DIVE_DX[t]! * -targetLr;
    y += FALCON_DIVE_DY[t]!;
    const outcome = outcomeThisFrame(
      prevX,
      prevY,
      x,
      y,
      FALCON.CLIFFCATCH_X,
      FALCON.CLIFFCATCH_Y,
    );
    if (outcome) return outcome;
    if (y < DEATH_Y) return null;
  }

  // FallSpecial: ordinary gravity/tvel, drift via the standard clampAirVelX formula (a different,
  // lower cap than the dive's own -- FALLSPECIAL_DRIFT=0.72 vs FALCONDIVE_AIR_SPEED_MAX_MUL=0.8),
  // stick still held toward the target. specialVelX carries over as the starting vx -- clampAirVelX
  // re-clamps it to the new cap on its own if it's still above it.
  let vx = specialVelX;
  let vy = FALCON_DIVE_FINAL_VY;
  const fallSpecialCap = FALCON.AIR_SPEED_MAX_X * FALCON.FALLSPECIAL_DRIFT;
  for (let i = 0; i < 1000; i++) {
    const prevX = x;
    const prevY = y;
    vy = applyGravity(vy, FALCON.GRAVITY, FALCON.TVEL_BASE);
    vx = clampAirVelX(
      vx,
      targetLr * STICK_TOWARD,
      FALCON.AIR_ACCEL,
      fallSpecialCap,
    );
    x += vx;
    y += vy;
    const outcome = outcomeThisFrame(
      prevX,
      prevY,
      x,
      y,
      FALCON.CLIFFCATCH_X,
      FALCON.CLIFFCATCH_Y,
    );
    if (outcome) return outcome;
    if (y < DEATH_Y) return null;
  }
  return null;
}

function falconRecoveryOutcomes(
  x0: number,
  y0: number,
  vx0: number,
  vy0: number,
  jumpsRemaining: number,
): RecoveryOutcomes {
  let reachedLedge = false;
  let reachedStage = false;
  for (const targetLr of [1, -1] as const) {
    if (reachedLedge && reachedStage) break;
    let jumpVx0: number, jumpVy0: number;
    if (jumpsRemaining === 1) {
      jumpVx0 = targetLr * STICK_TOWARD * FALCON.JUMPAERIAL_VEL_X;
      jumpVy0 =
        (80 * FALCON.JUMP_HEIGHT_MUL + FALCON.JUMP_HEIGHT_BASE) *
        FALCON.JUMPAERIAL_HEIGHT;
    } else {
      jumpVx0 = vx0;
      jumpVy0 = vy0;
    }
    for (let delay = 0; delay <= FALCON.MAX_DELAY_FRAMES; delay++) {
      if (reachedLedge && reachedStage) break;
      // Pre-activation freefall: ordinary Fall-state physics (gravity + standard clampAirVelX
      // drift), NOT the dive's own multiplied constants -- the drift-velocity reset only happens
      // AT activation (see this section's header comment).
      let x = x0;
      let y = y0;
      let vx = jumpVx0;
      let vy = jumpVy0;
      let died = false;
      let preActivationOutcome: Outcome = null;
      for (let frame = 0; frame < delay; frame++) {
        const prevX = x;
        const prevY = y;
        vy = applyGravity(vy, FALCON.GRAVITY, FALCON.TVEL_BASE);
        vx = clampAirVelX(
          vx,
          targetLr * STICK_TOWARD,
          FALCON.AIR_ACCEL,
          FALCON.AIR_SPEED_MAX_X,
        );
        x += vx;
        y += vy;
        const outcome = outcomeThisFrame(
          prevX,
          prevY,
          x,
          y,
          FALCON.CLIFFCATCH_X,
          FALCON.CLIFFCATCH_Y,
        );
        if (outcome) {
          preActivationOutcome = outcome;
          break;
        }
        if (y < DEATH_Y) {
          died = true;
          break;
        }
      }
      if (died) continue;
      if (preActivationOutcome) {
        if (preActivationOutcome === "ledge" || preActivationOutcome === "both")
          reachedLedge = true;
        if (preActivationOutcome === "stage" || preActivationOutcome === "both")
          reachedStage = true;
        continue;
      }
      const outcome = falconSimulateDiveAndBeyond(x, y, targetLr);
      if (outcome === "ledge" || outcome === "both") reachedLedge = true;
      if (outcome === "stage" || outcome === "both") reachedStage = true;
    }
  }
  return { canReachLedge: reachedLedge, canReachStage: reachedStage };
}

// ---------------------------------------------------------------------------
// Character dispatch (NA/US character IDs only, per user instruction)
// ---------------------------------------------------------------------------

const CHAR_FALCON = 0x07;
const CHAR_FOX = 0x01;
const CHAR_DONKEY_KONG = 0x02;
const CHAR_SAMUS = 0x03;
const CHAR_LINK = 0x05;
const CHAR_YOSHI = 0x06;
const CHAR_PIKACHU = 0x09;
const CHAR_JIGGLYPUFF = 0x0a;

export const SUPPORTED_CHARACTERS = new Set([
  CHAR_FOX,
  CHAR_DONKEY_KONG,
  CHAR_SAMUS,
  CHAR_LINK,
  CHAR_YOSHI,
  CHAR_PIKACHU,
  CHAR_JIGGLYPUFF,
  CHAR_FALCON,
]);

export const ACTION_STATE_JUMP_AERIAL_F = 0x018;
export const ACTION_STATE_JUMP_AERIAL_B = 0x019;

// ---------------------------------------------------------------------------
// Fast dead-rejection: a precomputed boundary curve lets the confirmed cost driver (Pikachu's
// nested angle x magnitude x delay search, measured up to ~2s for a single genuinely-dead call on
// real match data) skip straight to "dead" for the clearly-hopeless tail instead of running the
// full search.
//
// The curve below is STATIC DATA, computed OFFLINE (not at runtime): each entry is
// {y, xThreshold}, where xThreshold is the largest |x| (mirrored left/right by symmetry, vx=vy=0
// baseline) for which classify() does NOT return "dead" at that y. Baking it in as a literal
// array -- rather than precomputing it lazily on first use -- matters for the same reason the
// call-site reduction in recoveryVerdicts.ts did: this project's whole point is that match loading
// must never stall, and a "lazy but one-time" precompute would still stall the FIRST match loaded
// in a session (measured ~13 minutes to generate this table at full precision offline -- clearly
// not something to ever run inline). Regenerate by binary-searching classify() itself at each y
// (see the dev script referenced in the proposal doc) if Pikachu's physics ever changes.
//
// jumpsRemaining===1 samples stop at y=-600: at y >= -400, the real threshold exceeds this
// search's 10000-unit cap entirely (Pikachu's jump-formula-overridden Quick Attack has enormous
// reach once given enough height) -- there's no usable "dead" boundary to reject against up there
// within any realistic position (Dream Land's own blast zone is only +-9000), so those samples
// were simply cut rather than recorded as a meaningless 10000. getPikachuDeadThreshold's
// clamp-to-last-sample behavior for y beyond the table safely extrapolates from the y=-600 value
// instead (see its own doc comment for why that's still conservative).
const PIKACHU_DEAD_BOUNDARY_JUMPS_0: readonly (readonly [number, number])[] = [
  [-3000, 4970],
  [-2800, 5443],
  [-2600, 5711],
  [-2400, 6004],
  [-2200, 6277],
  [-2000, 6474],
  [-1800, 6666],
  [-1600, 6867],
  [-1400, 7060],
  [-1200, 7237],
  [-1000, 7407],
  [-800, 7569],
  [-600, 7725],
  [-400, 7875],
  [-200, 8022],
  [0, 8166],
  [200, 8311],
  [400, 8455],
  [600, 8599],
  [800, 8743],
  [1000, 8888],
  [1200, 9032],
  [1400, 9176],
  [1600, 9320],
  [1800, 9465],
  [2000, 9609],
];

const PIKACHU_DEAD_BOUNDARY_JUMPS_1: readonly (readonly [number, number])[] = [
  [-3000, 8055],
  [-2800, 8251],
  [-2600, 8439],
  [-2400, 8611],
  [-2200, 8776],
  [-2000, 8934],
  [-1800, 9086],
  [-1600, 9233],
  [-1400, 9380],
  [-1200, 9524],
  [-1000, 9667],
  [-800, 9811],
  [-600, 9956],
];

/** How far past the (conservatively interpolated) threshold the real |x| must be before the fast
 * path trusts a "dead" rejection -- guards against both inter-sample interpolation error and any
 * residual imprecision in how the table above was generated. Generous on purpose: being
 * conservative here only costs a few missed fast-path opportunities right at the boundary, never
 * correctness, and the boundary region is a small fraction of the realistically-far-off-stage
 * positions this is actually meant to catch. */
const PIKACHU_DEAD_BOUNDARY_SAFETY_MARGIN = 400;

/** Linear interpolation between the two bracketing samples, clamped to the nearest sample's value
 * outside the table's range (safe/conservative for y below the table: the threshold trends
 * smaller as y decreases throughout the whole measured range, so using the lowest sample's value
 * for anything even lower is an underestimate, never an overestimate. Safe for y above the
 * table's jumpsRemaining===1 range too, for the reason in that table's own doc comment: the true
 * threshold there is larger, so extrapolating flat from the last known point still only
 * underestimates reachability, meaning the fast path stays conservative, just less useful). Also
 * takes the min against both bracketing samples, not just the lerp, guarding against a
 * non-monotonic dip between two samples that pure linear interpolation wouldn't see. */
function interpolatePikachuDeadThreshold(
  table: readonly (readonly [number, number])[],
  y: number,
): number {
  const first = table[0]!;
  if (y <= first[0]) return first[1];
  const last = table[table.length - 1]!;
  if (y >= last[0]) return last[1];
  for (let i = 0; i < table.length - 1; i++) {
    const [yA, xA] = table[i]!;
    const [yB, xB] = table[i + 1]!;
    if (y >= yA && y <= yB) {
      const t = (y - yA) / (yB - yA);
      const lerp = xA + t * (xB - xA);
      return Math.min(lerp, xA, xB);
    }
  }
  return 0; // unreachable given the bounds checks above
}

/**
 * Fast-rejects the clearly-hopeless tail of Pikachu recovery classifications without running the
 * full search. For jumpsRemaining===1, Pikachu's jump formula fully overrides incoming velocity
 * (see pikachuRecoveryOutcomes -- jumpVx0/jumpVy0 are formula-derived, the passed-in vx0/vy0
 * aren't used at all for that branch), so real vx/vy genuinely cannot change the result and no
 * velocity check is needed once position alone is confidently past the boundary. For
 * jumpsRemaining===0, real velocity DOES matter, so this only rejects when it also isn't helping
 * (not drifting toward the stage, not moving upward) -- otherwise returns null, meaning "run the
 * real search," same as whenever position isn't confidently past the boundary at all.
 */
function fastRejectPikachuDead(
  x: number,
  y: number,
  vx: number,
  vy: number,
  jumpsRemaining: number,
): "dead" | null {
  if (jumpsRemaining !== 0 && jumpsRemaining !== 1) return null;
  const table =
    jumpsRemaining === 0
      ? PIKACHU_DEAD_BOUNDARY_JUMPS_0
      : PIKACHU_DEAD_BOUNDARY_JUMPS_1;
  const safeThreshold =
    interpolatePikachuDeadThreshold(table, y) +
    PIKACHU_DEAD_BOUNDARY_SAFETY_MARGIN;
  if (Math.abs(x) <= safeThreshold) return null;
  if (jumpsRemaining === 1) return "dead";
  const towardStage = x < 0 ? 1 : -1;
  const VELOCITY_HELP_EPSILON = 0.5;
  if (vx * towardStage > VELOCITY_HELP_EPSILON) return null; // drifting toward the stage -- might help
  if (vy > VELOCITY_HELP_EPSILON) return null; // moving upward -- might help
  return "dead";
}

export function classify(
  characterId: number,
  x: number,
  y: number,
  vx: number,
  vy: number,
  jumpsRemaining: number,
  actionStateId: number,
  facingDirection: 1 | -1,
): RecoveryVerdict | null {
  switch (characterId) {
    case CHAR_LINK: {
      if (jumpsRemaining > 1) return null;
      const verdict = toRecoveryVerdict(
        linkRecoveryOutcomes(x, y, vx, vy, jumpsRemaining),
      );
      // Link CAN technically turn around via neutral-B, but it's so slow (and his recovery
      // already so weak) that it's never actually useful -- treated as if he can't. Vanilla SSB64
      // characters can't grab the ledge facing away from the stage at all, so facing away
      // downgrades a ledge-only verdict to dead; reaching the stage outright doesn't require any
      // particular facing (no ledge grab involved), so that's untouched either way.
      if (
        !facingTowardStage(x, facingDirection) &&
        verdict === "dead-if-ledge-occupied"
      ) {
        return "dead";
      }
      return verdict;
    }
    case CHAR_PIKACHU:
      // Quick Attack's aim is a free choice, independent of the character's current facing --
      // Pikachu can turn around with it. Facing direction never changes the result.
      if (jumpsRemaining > 1) return null;
      if (fastRejectPikachuDead(x, y, vx, vy, jumpsRemaining) === "dead")
        return "dead";
      return toRecoveryVerdict(
        pikachuRecoveryOutcomes(x, y, vx, vy, jumpsRemaining),
      );
    case CHAR_SAMUS: {
      if (jumpsRemaining > 1) return null;
      const verdict = toRecoveryVerdict(
        samusRecoveryOutcomes(x, y, vx, vy, jumpsRemaining),
      );
      // Samus CAN turn around using Charge Shot, but modeling that combined maneuver isn't worth
      // it right now -- not-implemented while facing away, except a verdict that's already dead
      // facing the (more favorable) stage-facing direction can't somehow become survivable facing
      // the wrong way, so that stays dead rather than becoming a false "we don't know."
      if (!facingTowardStage(x, facingDirection) && verdict !== "dead") {
        return "not-implemented";
      }
      return verdict;
    }
    case CHAR_DONKEY_KONG: {
      if (jumpsRemaining > 1) return null;
      const verdict = toRecoveryVerdict(
        dkRecoveryOutcomes(x, y, vx, vy, jumpsRemaining),
      );
      // DK can't use up-B (Spinning Kong) to turn around, but CAN turn around with neutral-B --
      // same "not worth modeling this combined maneuver right now" treatment as Samus.
      if (!facingTowardStage(x, facingDirection) && verdict !== "dead") {
        return "not-implemented";
      }
      return verdict;
    }
    case CHAR_FOX:
      // Firefox's dash direction is a free choice, independent of facing, same as Pikachu's Quick
      // Attack -- Fox can turn around with it. Facing direction never changes the result.
      if (jumpsRemaining > 1) return null;
      return toRecoveryVerdict(
        foxRecoveryOutcomes(x, y, vx, vy, jumpsRemaining),
      );
    case CHAR_YOSHI:
      // Yoshi's second jump is root-motion driven (ftPhysicsGetAirVelTransN), not the
      // closed-form jump formula every other character uses - jumpsRemaining === 1 is modeled
      // via an empirically-extracted position-delta curve instead (YOSHI_DOUBLE_JUMP_DY_CURVE),
      // see noUpBRecoveryOutcomes. The real gate is the ACTION STATE, not the jump count: refuse
      // to classify while still inside the root-motion ramp itself (actionStateId at
      // JumpAerialF/JumpAerialB, 0x018/0x019), regardless of jumpsRemaining, since the recorded
      // vy may still be an unsettled animation-driven transient - only trustworthy once settled
      // into ordinary Fall/FallAerial physics. Jigglypuff is unaffected (separate, formula-based
      // jump function) and still supports 0/1 below. Facing direction never changes the result
      // for either -- both can turn around using their double jump itself.
      if (
        actionStateId === ACTION_STATE_JUMP_AERIAL_F ||
        actionStateId === ACTION_STATE_JUMP_AERIAL_B
      )
        return null;
      if (jumpsRemaining > 1) return null;
      return toRecoveryVerdict(
        noUpBRecoveryOutcomes(x, y, vx, vy, jumpsRemaining, YOSHI_ATTR),
      );
    case CHAR_JIGGLYPUFF:
      if (jumpsRemaining > 1) return null;
      return toRecoveryVerdict(
        noUpBRecoveryOutcomes(x, y, vx, vy, jumpsRemaining, JIGGLYPUFF_ATTR),
      );
    case CHAR_FALCON:
      // Delay + jump search, no angle/magnitude search (see the section header above for why).
      // Facing-independent (see section header caveat -- an unverified assumption, unlike the
      // rest of this move's model).
      if (jumpsRemaining > 1) return null;
      return toRecoveryVerdict(
        falconRecoveryOutcomes(x, y, vx, vy, jumpsRemaining),
      );
    default:
      return null;
  }
}

export const CHARACTER_NAME: Record<number, string> = {
  [CHAR_FOX]: "Fox",
  [CHAR_DONKEY_KONG]: "Donkey Kong",
  [CHAR_SAMUS]: "Samus",
  [CHAR_LINK]: "Link",
  [CHAR_YOSHI]: "Yoshi",
  [CHAR_FALCON]: "Captain Falcon",
  [CHAR_PIKACHU]: "Pikachu",
  [CHAR_JIGGLYPUFF]: "Jigglypuff",
};
