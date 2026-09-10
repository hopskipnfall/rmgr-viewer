/**
 * Realtime "what does the recovery classifier say right now" live stage overlay (ledge highlight /
 * skull), computed via computeRecoveryVerdictSpans/computeRecoveryVerdictFrames. The original
 * text-log half of this module (computeRecoveryVerdictEvents, "Recovery: reaches stage" / "Jumped:
 * reaches stage") was retired 2026-09-11, superseded by classifiedSituations.ts's
 * missed-ledge-hog/possible-accidental-save events and the Recovery/Edge Guard situation panels --
 * per the user, that debug log was no longer needed. computeRecoveryVerdictSpans itself remains
 * very much load-bearing: classifiedSituations.ts is built directly on it.
 */
import type { PortIndex, Replay, StateFrame } from "@rmg-k/rmgr";
import { getSeatedPorts } from "@rmg-k/rmgr";
import {
  isOutsideZone,
  isHitstunState,
  DEAD_OR_RESPAWNING_STATES,
} from "./edgeGuard.js";
import { DREAM_LAND_STAGE_ID } from "./stageGeometry.js";
import { LEDGE_ACTION_STATES } from "./ledgeTrap.js";
import {
  classify,
  SUPPORTED_CHARACTERS,
  ACTION_STATE_JUMP_AERIAL_F,
  ACTION_STATE_JUMP_AERIAL_B,
  LEDGE_L_X,
  LEDGE_R_X,
  type RecoveryVerdict,
} from "./recoveryHeuristics.js";

export type RecoveryVerdictEventKind = "recovery-verdict" | "jumped-verdict";

export interface RecoveryVerdictFrame {
  readonly port: PortIndex;
  readonly verdict: RecoveryVerdict;
  /** Which ledge to highlight when verdict is "dead-if-ledge-occupied" -- the
   * side the character was on when this verdict was computed, not
   * necessarily the side the classifier's internal search actually lands
   * on. */
  readonly side: "left" | "right";
}

function classifyState(state: StateFrame): RecoveryVerdict | null {
  if (!SUPPORTED_CHARACTERS.has(state.characterId)) return null;
  return classify(
    state.characterId,
    state.positionX,
    state.positionY,
    state.velocityX,
    state.velocityY,
    state.jumpsRemaining,
    state.actionStateId,
    state.facingDirection,
  );
}

function isFreshDoubleJump(state: StateFrame): boolean {
  return (
    (state.actionStateId === ACTION_STATE_JUMP_AERIAL_F ||
      state.actionStateId === ACTION_STATE_JUMP_AERIAL_B) &&
    state.actionFrameCounter === 0
  );
}

/** FallSpecial: the generic post-aerial-special helpless fall (e.g. Pikachu after Quick Attack
 * commits). The character has already used their move and has no further input -- no jump, no
 * re-activation, nothing -- until landing or death. classify()'s whole search space assumes the
 * character can still act starting from the given frame (press B now, or after some delay), which
 * isn't true here, so this must be excluded the same way hitstun is. */
const ACTION_STATE_FALL_SPECIAL = 0x03a;

function isNonActionableForRecovery(state: StateFrame): boolean {
  return (
    isHitstunState(state.actionStateId, state.hitstunCounter) ||
    state.actionStateId === ACTION_STATE_FALL_SPECIAL ||
    DEAD_OR_RESPAWNING_STATES.has(state.actionStateId)
  );
}

/** How many frames forward to look for a verdict to become computable
 * before giving up (e.g. Yoshi's double jump keeps classify() gated null
 * for its whole root-motion ramp-up -- see recoveryHeuristics.ts). Well
 * over any real jump/root-motion duration; this is a safety cap, not a
 * tuned value. */
const MAX_VERDICT_LOOKAHEAD_FRAMES = 180;

/**
 * A trigger frame (hitstun just ended, or a fresh double jump) doesn't
 * always have a computable verdict yet -- classify() can stay gated null
 * for several more frames (Yoshi's root-motion double jump is the known
 * case: gated for the whole jump, and again while jumpsRemaining is still
 * 1 before it's even used). Scanning forward for the first frame a verdict
 * becomes available means the log still fires once the classifier actually
 * has something to say, tagged with the exact frame whose data produced it,
 * instead of going silent whenever the trigger frame itself is ungated.
 *
 * Gives up (returns null) if the character comes back inside the zone,
 * dies/respawns, or (when abortOnFreshJump) uses another jump before a
 * verdict appears -- in that last case the jump's own trigger will run this
 * same search from its own start point instead. NOT throttled/strided --
 * see computeRecoveryVerdictSpans' own doc comment for why classify()'s
 * cost is no longer something this module needs to defend against by
 * skipping frames.
 */
function findFirstVerdictFrame(
  replay: Replay,
  port: PortIndex,
  startIndex: number,
  abortOnFreshJump: boolean,
): { frameIndex: number; verdict: RecoveryVerdict } | null {
  const end = Math.min(
    replay.frames.length,
    startIndex + MAX_VERDICT_LOOKAHEAD_FRAMES,
  );
  for (let i = startIndex; i < end; i++) {
    const state = replay.frames[i]?.ports[port]?.state;
    if (!state) return null;
    if (!isOutsideZone(state.positionX, state.positionY)) return null;
    if (DEAD_OR_RESPAWNING_STATES.has(state.actionStateId)) return null;
    if (abortOnFreshJump && i !== startIndex && isFreshDoubleJump(state))
      return null;
    if (isNonActionableForRecovery(state)) continue;
    const verdict = classifyState(state);
    if (verdict !== null && verdict !== "not-implemented") {
      return { frameIndex: i, verdict };
    }
  }
  return null;
}

/**
 * Scans forward from a just-computed verdict's frame to find the last frame it should still be
 * displayed/logged for, per the user's exact resolution criteria: the character dies, grabs the
 * ledge, or crosses back to the ledge's x-range at or above ledge height (y >= 0) -- at that point
 * the recovery attempt is essentially over (about to resolve one way or another on its own), so
 * holding a stale verdict past it would be actively misleading rather than just imprecise. Returns
 * the frame index of the resolving frame itself (inclusive -- the verdict is still meaningful on
 * the exact frame something ends), or the last available frame if nothing resolves it before the
 * replay (or this port's data) ends.
 */
function findHoldEndFrameIndex(
  replay: Replay,
  port: PortIndex,
  verdictFrameIndex: number,
): number {
  let prevState = replay.frames[verdictFrameIndex]?.ports[port]?.state;
  for (let i = verdictFrameIndex + 1; i < replay.frames.length; i++) {
    const state = replay.frames[i]?.ports[port]?.state;
    if (!state) return i - 1;
    if (DEAD_OR_RESPAWNING_STATES.has(state.actionStateId)) return i;
    if (
      prevState !== undefined &&
      state.stocksRemaining < prevState.stocksRemaining
    )
      return i;
    if (LEDGE_ACTION_STATES.has(state.actionStateId)) return i;
    if (
      state.positionY >= 0 &&
      state.positionX >= LEDGE_L_X &&
      state.positionX <= LEDGE_R_X
    ) {
      return i;
    }
    prevState = state;
  }
  return replay.frames.length - 1;
}

export interface VerdictSpan {
  readonly port: PortIndex;
  readonly kind: RecoveryVerdictEventKind;
  /** The frame the verdict was actually computed on (>= the trigger frame -- see
   * findFirstVerdictFrame). This is what gets logged/displayed from. */
  readonly verdictFrameIndex: number;
  readonly verdict: RecoveryVerdict;
  readonly side: "left" | "right";
  /** Last frame index (inclusive) this verdict should be shown for -- see
   * findHoldEndFrameIndex. */
  readonly holdEndFrameIndex: number;
}

/**
 * The single source of truth for both the "Recovery: .../Jumped: ..." log events and the live
 * stage overlay (ledge highlight / skull) -- computed ONCE per trigger (a character leaving
 * hitstun while outside the danger zone, or using their double-jump while outside it), not
 * continuously across every frame of a recovery situation. That distinction matters a lot for
 * performance: classify() is NOT cheap for every character (Pikachu's nested search measured
 * 35ms average / 477ms worst case per call on real match data), and a recovery situation can span
 * hundreds of frames -- calling it repeatedly throughout one, even throttled, made replay loading
 * noticeably slow. Calling it a small constant number of times per situation instead (once per
 * trigger) is both what the feature was actually asked for and dramatically cheaper.
 *
 * The overlay's "hold the verdict on screen" behavior (see findHoldEndFrameIndex) is what makes
 * dropping the continuous recompute safe from a UX standpoint: the verdict doesn't need to track
 * the character's position frame-by-frame, it just needs to disappear once it's no longer
 * relevant (they've died, grabbed the ledge, or made it back within reach).
 *
 * Memoized per replay: computeRecoveryVerdictEvents (called once from matchView.ts on load) and
 * computeRecoveryVerdictFrames (called separately from the renderer, lazily on first render) both
 * derive from this same computation -- without caching, a single match load would run the whole
 * classify()-calling scan twice for no reason.
 */
const verdictSpansCache = new WeakMap<Replay, VerdictSpan[]>();

export function computeRecoveryVerdictSpans(replay: Replay): VerdictSpan[] {
  const cached = verdictSpansCache.get(replay);
  if (cached) return cached;
  const spans = computeRecoveryVerdictSpansUncached(replay);
  verdictSpansCache.set(replay, spans);
  return spans;
}

function computeRecoveryVerdictSpansUncached(replay: Replay): VerdictSpan[] {
  const spans: VerdictSpan[] = [];
  if (replay.matchSettings?.stageId !== DREAM_LAND_STAGE_ID) return spans;

  const seated = getSeatedPorts(replay);
  if (seated.length !== 2) return spans;

  for (const port of seated as PortIndex[]) {
    let prevState: StateFrame | undefined;
    // Non-null means "the most recent recovery-verdict trigger for this port, within the same
    // unbroken situation, came back dead, at this damagePercent" -- see the isFreshDoubleJump
    // branch below for why that lets a subsequent jump trigger skip re-running classify()
    // entirely. Reset to null whenever the character comes back inside the safe zone (any prior
    // situation is over, so it must not bleed into an unrelated future one) or whenever a fresh
    // recovery-verdict is computed (always overwrites with the new result).
    let deadAtDamagePercent: number | null = null;

    for (let i = 0; i < replay.frames.length; i++) {
      const state = replay.frames[i]?.ports[port]?.state;
      if (!state) {
        prevState = undefined;
        continue;
      }

      if (!isOutsideZone(state.positionX, state.positionY)) {
        deadAtDamagePercent = null;
        prevState = state;
        continue;
      }

      const justDied =
        DEAD_OR_RESPAWNING_STATES.has(state.actionStateId) ||
        (prevState !== undefined &&
          state.stocksRemaining < prevState.stocksRemaining);

      if (prevState && !justDied) {
        const wasInHitstun = isHitstunState(
          prevState.actionStateId,
          prevState.hitstunCounter,
        );
        const isInHitstun = isHitstunState(
          state.actionStateId,
          state.hitstunCounter,
        );
        // Third trigger, alongside hitstun-exit and fresh-double-jump below: the frame a
        // situation actually opens (mirrors edgeGuard.ts's own "outside the zone AND actionable"
        // condition), for a player who drifts outside the zone under residual momentum from a
        // jump/hit that happened earlier -- without this, a situation could open with NEITHER of
        // the other two triggers ever firing while still outside (the jump/hit that put them
        // there happened before crossing the boundary), leaving entryVerdict permanently null and
        // the situation shown as "unclassified" even for a fully-supported character. Found via a
        // real user report: a Captain Falcon situation showing "unclassified" despite Falcon
        // being supported -- classify() itself returned a real answer when called directly at
        // that exact frame, it just never got invoked. Gated on `!wasInHitstun` so it never
        // double-fires alongside the hitstun-exit trigger on the same frame.
        const justCrossedOutsideWhileActionable =
          !wasInHitstun &&
          !isOutsideZone(prevState.positionX, prevState.positionY);
        if (!isInHitstun && (wasInHitstun || justCrossedOutsideWhileActionable)) {
          const found = findFirstVerdictFrame(replay, port, i, true);
          if (found !== null) {
            const verdictState =
              replay.frames[found.frameIndex]!.ports[port]!.state!;
            spans.push({
              port,
              kind: "recovery-verdict",
              verdictFrameIndex: found.frameIndex,
              verdict: found.verdict,
              side: verdictState.positionX < 0 ? "left" : "right",
              holdEndFrameIndex: findHoldEndFrameIndex(
                replay,
                port,
                found.frameIndex,
              ),
            });
            deadAtDamagePercent =
              found.verdict === "dead" ? verdictState.damagePercent : null;
          }
        }
      }

      if (isFreshDoubleJump(state)) {
        // classify() for jumpsRemaining === 1 already evaluates "what if they jump right now" --
        // the jump formula fully overrides the character's velocity for 6 of 7 characters (Yoshi
        // is the exception, root-motion), so a dead verdict computed with the jump still
        // available already accounts for using it. Actually using that jump moments later can't
        // un-kill them, so re-running the full search again here would just be paying for the
        // same answer twice -- UNLESS they've taken damage since (a hit could reset their
        // trajectory, e.g. toward the stage, genuinely changing the outcome), in which case this
        // falls through to a real re-evaluation same as always.
        if (
          deadAtDamagePercent !== null &&
          state.damagePercent <= deadAtDamagePercent
        ) {
          spans.push({
            port,
            kind: "jumped-verdict",
            verdictFrameIndex: i,
            verdict: "dead",
            side: state.positionX < 0 ? "left" : "right",
            holdEndFrameIndex: findHoldEndFrameIndex(replay, port, i),
          });
        } else {
          const found = findFirstVerdictFrame(replay, port, i, false);
          if (found !== null) {
            const verdictState =
              replay.frames[found.frameIndex]!.ports[port]!.state!;
            spans.push({
              port,
              kind: "jumped-verdict",
              verdictFrameIndex: found.frameIndex,
              verdict: found.verdict,
              side: verdictState.positionX < 0 ? "left" : "right",
              holdEndFrameIndex: findHoldEndFrameIndex(
                replay,
                port,
                found.frameIndex,
              ),
            });
            deadAtDamagePercent =
              found.verdict === "dead" ? verdictState.damagePercent : null;
          }
        }
      }

      prevState = state;
    }
  }

  return spans.sort((a, b) => a.verdictFrameIndex - b.verdictFrameIndex);
}

/**
 * One entry per replay frame: the classifier's verdict to display for whichever single port has
 * an active held verdict at that frame (per computeRecoveryVerdictSpans -- computed once at a
 * trigger, then held until findHoldEndFrameIndex's resolution point). null everywhere else,
 * including the actionable/hitstun-safe frames between a situation opening and its first trigger
 * firing -- there is deliberately no verdict to show there, since none has been computed yet.
 * Drives the live stage overlay (ledge highlight / skull); see StageRenderer for how it's
 * consumed.
 */
export function computeRecoveryVerdictFrames(
  replay: Replay,
): (RecoveryVerdictFrame | null)[] {
  const frameCount = replay.frames.length;
  const result: (RecoveryVerdictFrame | null)[] = new Array(frameCount).fill(
    null,
  );

  for (const span of computeRecoveryVerdictSpans(replay)) {
    const frame: RecoveryVerdictFrame = {
      port: span.port,
      verdict: span.verdict,
      side: span.side,
    };
    const end = Math.min(span.holdEndFrameIndex, frameCount - 1);
    for (let i = span.verdictFrameIndex; i <= end; i++) {
      result[i] = frame;
    }
  }

  return result;
}
