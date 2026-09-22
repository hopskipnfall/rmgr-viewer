import type { Replay, PortIndex } from "@rmg-k/rmgr";
import { DREAM_LAND_STAGE_ID } from "../stageGeometry.js";
import { computeEdgeGuardEvents, isHitstunState, DEAD_OR_RESPAWNING_STATES } from "../edgeGuard.js";
import type { GameSummary } from "../data/gameSummary.js";

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
