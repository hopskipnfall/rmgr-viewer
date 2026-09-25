import type { Replay, PortIndex } from "@rmg-k/rmgr";
import { DREAM_LAND_STAGE_ID } from "../stageGeometry.js";
import {
  computeEdgeGuardEvents,
  isHitstunState,
  DEAD_OR_RESPAWNING_STATES,
} from "../edgeGuard.js";
import { classify, SUPPORTED_CHARACTERS } from "../recoveryHeuristics.js";
import {
  computeClassifiedSituations,
  edgeGuardEffectivenessTier,
  type EdgeGuardEffectivenessTier,
} from "../classifiedSituations.js";
import type { GameSummary } from "../data/gameSummary.js";

/**
 * Single source of truth for how each effectiveness tier is colored and
 * labeled - shared by the canvas (dots/trajectories) and the sidebar list
 * (badges), per Jonn's request (2026-09-24) to color-code edge guards by
 * the same kill/damage/missed-hog/accidental-save scoring already computed
 * in classifiedSituations.ts, not just a binary success/fail split. "kill"
 * and "no-damage" reuse the app's existing success (blue) / fail (red)
 * colors so this reads as a superset of the old two-color scheme, not a
 * replacement.
 */
export const EFFECTIVENESS_TIER_COLOR: Record<
  EdgeGuardEffectivenessTier,
  { readonly dark: string; readonly light: string }
> = {
  kill: { dark: "#38bdf8", light: "#0284c7" },
  "damage-high": { dark: "#34d399", light: "#059669" },
  "damage-mid": { dark: "#fbbf24", light: "#d97706" },
  "damage-low": { dark: "#fb923c", light: "#ea580c" },
  "no-damage": { dark: "#f87171", light: "#dc2626" },
  "missed-ledge-hog": { dark: "#e11d48", light: "#be123c" },
  "accidental-save": { dark: "#c084fc", light: "#7c3aed" },
  unscored: { dark: "#94a3b8", light: "#64748b" },
};

export const EFFECTIVENESS_TIER_LABEL: Record<
  EdgeGuardEffectivenessTier,
  string
> = {
  kill: "KO",
  "damage-high": "Heavy Dmg",
  "damage-mid": "Mid Dmg",
  "damage-low": "Light Dmg",
  "no-damage": "No Dmg",
  "missed-ledge-hog": "Missed Hog",
  "accidental-save": "Accidental Save",
  unscored: "Unscored",
};

export const EFFECTIVENESS_TIER_ICON: Record<
  EdgeGuardEffectivenessTier,
  string
> = {
  kill: "🎯",
  "damage-high": "💥",
  "damage-mid": "💥",
  "damage-low": "💥",
  "no-damage": "🛡️",
  "missed-ledge-hog": "⚠️",
  "accidental-save": "🚨",
  unscored: "❔",
};

export interface RecoveryTrajectoryPoint {
  readonly relFrame: number;
  readonly x: number;
  readonly y: number;
  readonly facing: number;
  readonly actionStateId: number;
  readonly isAirborne: boolean;
  readonly inHitstun: boolean;
}

export interface EdgeGuardSituationData {
  readonly id: string;
  readonly gameId: string;
  readonly gameDate: string;
  readonly timestamp: number;
  readonly opponentName: string;
  readonly sessionId?: string;
  readonly startFrameIndex: number;
  readonly endFrameIndex: number;
  readonly recoveringPort: PortIndex;
  readonly edgeGuardingPort: PortIndex;
  readonly recoveringCharId: number;
  readonly edgeGuardingCharId: number;
  readonly outcome: "success" | "fail"; // "success" = edge guard succeeded (opponent KO'd), "fail" = opponent recovered
  /** Effectiveness tier from classifiedSituations.ts's scoring model - a finer-grained read than
   * `outcome` alone (e.g. distinguishes a clean kill from "dealt heavy damage but they got away,"
   * or flags a missed free ledge-hog / an accidental save). "unscored" when the situation was
   * classifier-hopeless and resolved normally (nothing was actually being tested). Falls back to
   * a plain kill/no-damage split derived from `outcome` if no ClassifiedSituation could be matched
   * for this entry (should only happen if the two independently-computed event lists ever
   * disagree, which they shouldn't since both derive from the same computeEdgeGuardEvents call).
   */
  readonly effectivenessTier: EdgeGuardEffectivenessTier;
  /** Did the recovering player land a hit on the edge-guarder during this situation? Shown as a
   * marker independent of the tier color, since it doesn't change a kill's tier but is still
   * worth flagging (e.g. "succeeded, but took a hit doing it"). */
  readonly edgeGuarderWasHit: boolean;
  readonly startX: number; // Mirrored: always on positive x side (Math.abs)
  readonly startY: number;
  readonly rawStartX: number; // Original x before mirroring
  readonly wasLeft: boolean; // rawStartX < 0
  readonly jumpsAtEntry: number;
  readonly stocksRemaining: number;
  readonly damageAtEntry: number;
  readonly trajectory: RecoveryTrajectoryPoint[];
}

export interface EdgeGuardFilterState {
  readonly jumps: number | "all"; // "all", 0, 1, 2, 3, 4, 5
  readonly opponent: string | "all";
  readonly session: string | "all";
  readonly recency: "all" | "month" | "since";
  readonly sinceDate?: string; // YYYY-MM-DD
  readonly outcome: "all" | "success" | "fail";
}

/**
 * Extracts edge-guard recovery situations from a replay where the user (yourPort)
 * is edge-guarding and the opponent (oppPort) is recovering.
 * Mirrors all coordinates across x = 0 when the recovery started on the left (x < 0).
 */
export function extractEdgeGuardSituations(
  replay: Replay,
  summary: GameSummary,
  yourPort: PortIndex,
  oppPort: PortIndex,
  sessionId?: string,
): EdgeGuardSituationData[] {
  if (replay.matchSettings?.stageId !== DREAM_LAND_STAGE_ID) {
    return [];
  }

  const events = computeEdgeGuardEvents(replay);
  if (events.length === 0) return [];

  // Keyed by enteredFrameIndex, which uniquely identifies a situation (they
  // never overlap - see edgeGuard.ts's own doc comment). Both this and
  // `events` above derive from the same computeEdgeGuardEvents(replay) call,
  // so every situation built below should find a match here.
  const classifiedByEnteredFrame = new Map(
    computeClassifiedSituations(replay).map((c) => [c.enteredFrameIndex, c]),
  );

  const situations: EdgeGuardSituationData[] = [];
  const yourPortSummary = summary.ports.find((p) => p.port === yourPort);
  const oppPortSummary = summary.ports.find((p) => p.port === oppPort);
  const oppName = oppPortSummary?.playerName || `Player ${oppPort + 1}`;
  const yourCharId = yourPortSummary?.characterId ?? 0;
  const oppCharId = oppPortSummary?.characterId ?? 0;
  const recordedDate = summary.recordedAt ? new Date(summary.recordedAt) : null;
  const gameDate = recordedDate ? recordedDate.toISOString() : "";
  const timestamp = recordedDate ? recordedDate.getTime() : 0;

  // Track the most recent open situation entered by the opponent
  let openSituation: {
    startFrameIndex: number;
    recoveringPort: PortIndex;
    edgeGuardingPort: PortIndex;
  } | null = null;

  for (const event of events) {
    if (event.kind === "situation-entered") {
      // We are analyzing situations where the opponent is recovering and we are edge-guarding
      if (
        event.recoveringPort === oppPort &&
        event.edgeGuardingPort === yourPort
      ) {
        openSituation = {
          startFrameIndex: event.frameIndex,
          recoveringPort: event.recoveringPort,
          edgeGuardingPort: event.edgeGuardingPort,
        };
      }
    } else if (
      (event.kind === "recovery-failure" ||
        event.kind === "recovery-success") &&
      openSituation !== null
    ) {
      if (
        event.recoveringPort === openSituation.recoveringPort &&
        event.edgeGuardingPort === openSituation.edgeGuardingPort
      ) {
        const startFrame = replay.frames[openSituation.startFrameIndex];
        const recoveringState = startFrame?.ports[oppPort]?.state;
        if (recoveringState) {
          // Skip situations where the recovering player was already dead/dying at entry —
          // these are not genuine edge-guard opportunities.
          if (DEAD_OR_RESPAWNING_STATES.has(recoveringState.actionStateId)) {
            openSituation = null;
            continue;
          }
          // Also skip situations where the recovery heuristic already classifies the player as
          // dead at the entry frame (e.g. they are falling below the blast zone but not yet in a
          // dead action state). "dead-if-ledge-occupied" is treated as recoverable for workshop
          // purposes (the edge guard is what makes it dead, which is the point of this page).
          if (SUPPORTED_CHARACTERS.has(recoveringState.characterId)) {
            const entryVerdict = classify(
              recoveringState.characterId,
              recoveringState.positionX,
              recoveringState.positionY,
              recoveringState.velocityX,
              recoveringState.velocityY,
              recoveringState.jumpsRemaining ?? 0,
              recoveringState.actionStateId,
              recoveringState.facingDirection as 1 | -1,
            );
            if (entryVerdict === "dead") {
              openSituation = null;
              continue;
            }
          }
          const rawStartX = recoveringState.positionX;
          const startY = recoveringState.positionY;
          const wasLeft = rawStartX < 0;
          const startX = Math.abs(rawStartX);
          let jumpsAtEntry = recoveringState.jumpsRemaining ?? 0;
          // If the player consumed a jump on or upon entering this frame (e.g. buffering an aerial jump
          // out of hitstun where frame f-1 had jumps remaining but frame f consumed it), attribute the
          // available jump to the recovery entry state.
          if (openSituation.startFrameIndex > 0) {
            const prevFrame = replay.frames[openSituation.startFrameIndex - 1];
            const prevState = prevFrame?.ports[oppPort]?.state;
            if (
              prevState &&
              !prevState.grounded &&
              prevState.jumpsRemaining !== undefined &&
              prevState.jumpsRemaining > jumpsAtEntry
            ) {
              jumpsAtEntry = prevState.jumpsRemaining;
            }
          }
          const stocksRemaining = recoveringState.stocksRemaining ?? 0;
          const damageAtEntry = recoveringState.damagePercent ?? 0;
          // In edge-guarding perspective:
          // recovery-failure means opponent died -> our edge guard SUCCEEDED
          // recovery-success means opponent survived -> our edge guard FAILED
          const outcome: "success" | "fail" =
            event.kind === "recovery-failure" ? "success" : "fail";

          const classified = classifiedByEnteredFrame.get(
            openSituation.startFrameIndex,
          );
          const effectivenessTier: EdgeGuardEffectivenessTier = classified
            ? edgeGuardEffectivenessTier(classified)
            : outcome === "success"
              ? "kill"
              : "no-damage";
          const edgeGuarderWasHit = classified?.edgeGuarderWasHit ?? false;

          const endFrameIndex = Math.max(
            openSituation.startFrameIndex,
            event.frameIndex,
          );

          // Build trajectory slice
          const trajectory: RecoveryTrajectoryPoint[] = [];
          for (let f = openSituation.startFrameIndex; f <= endFrameIndex; f++) {
            const frame = replay.frames[f];
            const portState = frame?.ports[oppPort]?.state;
            if (portState) {
              const rx = portState.positionX;
              const ry = portState.positionY;
              const facingDir = portState.facingDirection;
              const mirroredX = wasLeft ? -rx : rx;
              const mirroredFacing = wasLeft ? -facingDir : facingDir;
              trajectory.push({
                relFrame: f - openSituation.startFrameIndex,
                x: mirroredX,
                y: ry,
                facing: mirroredFacing,
                actionStateId: portState.actionStateId,
                isAirborne: !portState.grounded,
                inHitstun: isHitstunState(
                  portState.actionStateId,
                  portState.hitstunCounter,
                ),
              });
            }
          }

          situations.push({
            id: `${summary.id}-${openSituation.startFrameIndex}`,
            gameId: summary.id,
            gameDate,
            timestamp,
            opponentName: oppName,
            sessionId,
            startFrameIndex: openSituation.startFrameIndex,
            endFrameIndex,
            recoveringPort: oppPort,
            edgeGuardingPort: yourPort,
            recoveringCharId: oppCharId,
            edgeGuardingCharId: yourCharId,
            outcome,
            effectivenessTier,
            edgeGuarderWasHit,
            startX,
            startY,
            rawStartX,
            wasLeft,
            jumpsAtEntry,
            stocksRemaining,
            damageAtEntry,
            trajectory,
          });
        }
        openSituation = null;
      }
    }
  }

  return situations;
}

/**
 * Filter recoveries based on jumps, opponent, session, recency, and outcome.
 */
export function filterEdgeGuardSituations(
  situations: readonly EdgeGuardSituationData[],
  filters: EdgeGuardFilterState,
): EdgeGuardSituationData[] {
  const now = Date.now();
  const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
  const sinceTimestamp = filters.sinceDate
    ? Date.parse(filters.sinceDate)
    : null;

  return situations.filter((sit) => {
    // 1. Outcome filter
    if (filters.outcome !== "all" && sit.outcome !== filters.outcome) {
      return false;
    }

    // 2. Jumps filter
    if (filters.jumps !== "all") {
      if (filters.jumps >= 5) {
        if (sit.jumpsAtEntry < 5) return false;
      } else if (sit.jumpsAtEntry !== filters.jumps) {
        return false;
      }
    }

    // 3. Opponent filter
    if (filters.opponent !== "all") {
      if (
        sit.opponentName.trim().toLowerCase() !==
        filters.opponent.trim().toLowerCase()
      ) {
        return false;
      }
    }

    // 4. Session filter
    if (filters.session !== "all") {
      if (sit.sessionId !== filters.session) {
        return false;
      }
    }

    // 5. Recency filter
    if (filters.recency === "month") {
      if (sit.timestamp > 0 && sit.timestamp < oneMonthAgo) {
        return false;
      }
    } else if (filters.recency === "since" && sinceTimestamp !== null) {
      if (sit.timestamp > 0 && sit.timestamp < sinceTimestamp) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Controls whether situations are shown in their natural (as-recorded)
 * position or all mirrored onto the positive-X (right) side of the stage.
 *
 * `extractEdgeGuardSituations` always stores coordinates pre-mirrored to the
 * right (see its own comment) - that mirroring is undone here when
 * `mirrorToRight` is false, using `wasLeft` to recover each situation's
 * original side. Since the mirror transform (negate X and facing) is its
 * own inverse, undoing it is the same operation as applying it: negate X and
 * facing again for any situation that started on the left.
 */
export function applyMirrorDisplay(
  situations: readonly EdgeGuardSituationData[],
  mirrorToRight: boolean,
): readonly EdgeGuardSituationData[] {
  if (mirrorToRight) return situations;
  return situations.map((sit) => {
    if (!sit.wasLeft) return sit;
    return {
      ...sit,
      startX: -sit.startX,
      trajectory: sit.trajectory.map((pt) => ({
        ...pt,
        x: -pt.x,
        facing: -pt.facing,
      })),
    };
  });
}
