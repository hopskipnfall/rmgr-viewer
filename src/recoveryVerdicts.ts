/**
 * Realtime "what does the recovery classifier say right now" event log.
 * Quick/throwaway by design (may be deleted later) -- no i18n, hardcoded
 * English text.
 */
import type { PortIndex, Replay, StateFrame } from "@rmg-k/rmgr";
import { getSeatedPorts } from "@rmg-k/rmgr";
import {
  isOutsideZone,
  isHitstunState,
  DEAD_OR_RESPAWNING_STATES,
} from "./edgeGuard.js";
import { DREAM_LAND_STAGE_ID } from "./stageGeometry.js";
import { buildRecoveryMap } from "./ledgeTrap.js";
import {
  classify,
  SUPPORTED_CHARACTERS,
  ACTION_STATE_JUMP_AERIAL_F,
  ACTION_STATE_JUMP_AERIAL_B,
  type RecoveryVerdict,
} from "./recoveryHeuristics.js";

export type RecoveryVerdictEventKind = "recovery-verdict" | "jumped-verdict";

export interface RecoveryVerdictEvent {
  readonly frame: number;
  readonly frameIndex: number;
  readonly kind: RecoveryVerdictEventKind;
  readonly port: PortIndex;
  readonly verdictText: string;
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

/** Display wording for the log messages -- kept exactly as originally specified ("reaches
 * stage"/"reaches ledge"/"dead"), independent of the RecoveryVerdict enum's own naming. */
function verdictText(state: StateFrame): string | null {
  const verdict = classifyState(state);
  switch (verdict) {
    case "reaches-stage":
      return "reaches stage";
    case "dead-if-ledge-occupied":
      return "reaches ledge";
    case "dead":
      return "dead";
    // "not-implemented" is treated the same as classify() returning null (no message) here --
    // we genuinely don't have a verdict to show, same as any other unsupported case.
    case "not-implemented":
    case null:
      return null;
  }
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
 * classify() is NOT a cheap constant-time check for every character --
 * Pikachu's is a nested angle x magnitude x delay search that recoveryHeuristics.ts's
 * own PIKA.ACTIVATION_DELAY_STEP comment measures at ~75ms per call, worst
 * case ~2-3s even after that search was already coarsened once. Calling it
 * on literally every frame of a long recovery window turned a single
 * replay's precompute into many real seconds of main-thread blocking on
 * load. Recomputing every Nth frame instead (holding the last verdict for
 * the frames in between, in computeRecoveryVerdictFrames below) bounds the
 * total number of classify() calls for that continuous per-frame overlay
 * without materially changing what a human watching in realtime perceives.
 *
 * Deliberately NOT applied to findFirstVerdictFrame's lookahead scan below,
 * even though that also calls classify() in a loop: that scan only runs a
 * handful of times per match (once per trigger event, not once per frame),
 * so it doesn't have this function's cost problem -- and striding it caused
 * a real bug, reporting a much-later frame (once the recovering character
 * had moved on to some unrelated action) instead of the frame the verdict
 * actually first became available on.
 */
const VERDICT_RECOMPUTE_STEP = 60;

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
 * same search from its own start point instead.
 */
function findFirstVerdictFrame(
  replay: Replay,
  port: PortIndex,
  startIndex: number,
  abortOnFreshJump: boolean,
): { frameIndex: number; text: string } | null {
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
    const text = verdictText(state);
    if (text !== null) return { frameIndex: i, text };
  }
  return null;
}

export interface RecoveryVerdictFrame {
  readonly port: PortIndex;
  readonly verdict: RecoveryVerdict;
  /** Which ledge to highlight when verdict is "dead-if-ledge-occupied" -- the
   * side the character is currently off of, not necessarily the side the
   * classifier's internal search actually lands on. */
  readonly side: "left" | "right";
}

/**
 * One entry per replay frame: the classifier's live verdict for whichever
 * single port buildRecoveryMap (ledgeTrap.ts) currently considers
 * "recovering" -- null on frames with no active recovery situation, where
 * that port's character isn't one of the 7 supported by
 * recoveryHeuristics.ts, or while isNonActionableForRecovery is true
 * (hitstun, or FallSpecial). Both exclusions matter for the same reason:
 * classify() assumes the character can act starting from this exact frame
 * (jump, up-B, drift), which isn't true until hitstun ends or -- for
 * FallSpecial, the helpless fall after an aerial special is already spent --
 * ever again this fall. Showing a verdict there would be simulating a choice
 * they can't make. Matches the same actionable-only gating as the
 * "Recovery: ..." log event below. Drives the live stage overlay (ledge
 * highlight / skull); see StageRenderer for how it's consumed.
 */
export function computeRecoveryVerdictFrames(
  replay: Replay,
): (RecoveryVerdictFrame | null)[] {
  const frameCount = replay.frames.length;
  if (replay.matchSettings?.stageId !== DREAM_LAND_STAGE_ID)
    return new Array(frameCount).fill(null);

  const seated = getSeatedPorts(replay);
  if (seated.length !== 2) return new Array(frameCount).fill(null);
  const [portA, portB] = seated as [PortIndex, PortIndex];

  const recoveryMap = buildRecoveryMap(replay, portA, portB);
  const result: (RecoveryVerdictFrame | null)[] = new Array(frameCount).fill(
    null,
  );

  // held/heldPort let the throttle below reuse the last computed verdict
  // across VERDICT_RECOMPUTE_STEP frames instead of re-running classify()
  // on every one -- see that constant's own doc comment for why. Cleared
  // (forcing a fresh, non-throttled recompute) whenever hitstun starts, the
  // situation closes, or the recovering port changes, so the FIRST frame of
  // any new actionable window is always accurate rather than reusing a
  // stale value from a different moment.
  let held: RecoveryVerdictFrame | null = null;
  let heldPort: PortIndex | null = null;

  for (let i = 0; i < frameCount; i++) {
    const port = recoveryMap[i] ?? null;
    if (port === null) {
      held = null;
      heldPort = null;
      continue;
    }
    const state = replay.frames[i]?.ports[port]?.state;
    if (!state || isNonActionableForRecovery(state)) {
      held = null;
      continue;
    }

    const shouldRecompute =
      held === null || port !== heldPort || i % VERDICT_RECOMPUTE_STEP === 0;
    if (shouldRecompute) {
      const verdict = classifyState(state);
      held =
        verdict === null || verdict === "not-implemented"
          ? null
          : {
              port,
              verdict,
              side: state.positionX < 0 ? "left" : "right",
            };
      heldPort = port;
    }
    result[i] = held;
  }

  return result;
}

/**
 * Fires "Recovery: ..." triggered by a character leaving hitstun while
 * outside the danger zone, and "Jumped: ..." triggered by their double-jump
 * while outside the zone -- independent of edgeGuard.ts's recovery-situation
 * state machine, so this can retrigger multiple times per situation (e.g.
 * re-hit and re-freed from hitstun offstage).
 *
 * The logged frame is not always the trigger frame itself: see
 * findFirstVerdictFrame -- if the classifier is still gated null right at
 * the trigger (Yoshi's root-motion jump is the known case), this scans
 * forward and reports the first frame a verdict actually exists for,
 * rather than silently dropping the event.
 */
export function computeRecoveryVerdictEvents(
  replay: Replay,
): RecoveryVerdictEvent[] {
  const events: RecoveryVerdictEvent[] = [];
  if (replay.matchSettings?.stageId !== DREAM_LAND_STAGE_ID) return events;

  const seated = getSeatedPorts(replay);
  if (seated.length !== 2) return events;

  for (const port of seated as PortIndex[]) {
    let prevState: StateFrame | undefined;

    for (let i = 0; i < replay.frames.length; i++) {
      const state = replay.frames[i]?.ports[port]?.state;
      if (!state) {
        prevState = undefined;
        continue;
      }

      if (isOutsideZone(state.positionX, state.positionY)) {
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
          if (wasInHitstun && !isInHitstun) {
            const found = findFirstVerdictFrame(replay, port, i, true);
            if (found !== null) {
              events.push({
                frame: replay.frames[found.frameIndex]!.frame,
                frameIndex: found.frameIndex,
                kind: "recovery-verdict",
                port,
                verdictText: found.text,
              });
            }
          }
        }

        if (isFreshDoubleJump(state)) {
          const found = findFirstVerdictFrame(replay, port, i, false);
          if (found !== null) {
            events.push({
              frame: replay.frames[found.frameIndex]!.frame,
              frameIndex: found.frameIndex,
              kind: "jumped-verdict",
              port,
              verdictText: found.text,
            });
          }
        }
      }

      prevState = state;
    }
  }

  return events.sort((a, b) => a.frameIndex - b.frameIndex);
}
