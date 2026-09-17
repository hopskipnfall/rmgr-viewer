import { type PortIndex, type Replay } from "@rmg-k/rmgr";
import { computeEdgeGuardEvents } from "../../edgeGuard.js";
import { characterSize } from "../../characterSizes.js";
import { isPikachuCharacter } from "./characterSpecials.js";
import { isQuickAttackState } from "./actionStates.js";

export interface QuickAttackPath {
  readonly index: number;
  readonly port: PortIndex;
  readonly startFrame: number;
  readonly startFrameIndex: number;
  readonly endFrame: number;
  readonly endFrameIndex: number;
  readonly recoveryStartFrame?: number;
  readonly recoveryStartFrameIndex?: number;
  readonly jumpFrame?: number;
  readonly jumpFrameIndex?: number;
  readonly preJumpPoints?: Array<{ x: number; y: number }>;
  readonly jumpPoints?: Array<{ x: number; y: number }>;
  readonly preUpBPoints?: Array<{ x: number; y: number }>;
  readonly points: Array<{ x: number; y: number }>;
  readonly zipCount: number;
}

function getRecoveryWindowsForPort(
  replay: Replay,
  port: PortIndex,
): Array<{ start: number; end: number }> {
  const events = computeEdgeGuardEvents(replay);
  const windows: Array<{ start: number; end: number }> = [];
  let currentStart: number | null = null;

  for (const ev of events) {
    if (ev.recoveringPort !== port) continue;
    if (ev.kind === "situation-entered") {
      if (currentStart !== null) {
        windows.push({ start: currentStart, end: ev.frameIndex });
      }
      currentStart = ev.frameIndex;
    } else if (
      ev.kind === "recovery-success" ||
      ev.kind === "recovery-failure"
    ) {
      if (currentStart !== null) {
        windows.push({ start: currentStart, end: ev.frameIndex });
        currentStart = null;
      }
    }
  }
  if (currentStart !== null) {
    windows.push({
      start: currentStart,
      end: Math.max(0, replay.frames.length - 1),
    });
  }
  return windows;
}

/**
 * Extracts Quick Attack (Up-B) trajectories for a Pikachu player across a replay.
 * Traces the player's movement from the start of the recovery situation up to and through the Up-B.
 * Splits pre-Up-B trajectory into a grey pre-jump segment and a white jump segment.
 * By default (`recoveryOnly: true`), filters to only those executed during classified recovery situations.
 */
export function extractAllQuickAttackPaths(
  replay: Replay,
  port: PortIndex,
  recoveryOnly = true,
): QuickAttackPath[] {
  const paths: QuickAttackPath[] = [];
  const charId = replay.matchSettings?.characterId[port] ?? 0x09;
  if (!isPikachuCharacter(charId)) return paths;

  const recoveryWindows = getRecoveryWindowsForPort(replay, port);

  const size = characterSize(charId);
  const halfHeight = size.height * 0.5;

  let currentPoints: Array<{ x: number; y: number }> = [];
  let startFrame = 0;
  let startFrameIndex = 0;
  let inQuickAttack = false;
  let zipCount = 0;

  const addPathIfEligible = (endFrame: number, endFrameIndex: number) => {
    if (currentPoints.length < 2) return;
    const matchingWindow = recoveryWindows.find(
      (w) => startFrameIndex >= w.start - 10 && startFrameIndex <= w.end + 10,
    );
    if (recoveryOnly && !matchingWindow) return;

    let preUpBPoints: Array<{ x: number; y: number }> | undefined;
    let preJumpPoints: Array<{ x: number; y: number }> | undefined;
    let jumpPoints: Array<{ x: number; y: number }> | undefined;
    let recoveryStartFrame: number | undefined;
    let recoveryStartFrameIndex: number | undefined;
    let jumpFrame: number | undefined;
    let jumpFrameIndex: number | undefined;

    if (matchingWindow) {
      recoveryStartFrameIndex = matchingWindow.start;
      recoveryStartFrame =
        replay.frames[matchingWindow.start]?.frame ?? matchingWindow.start;

      let firstJumpIdx = -1;
      for (let k = matchingWindow.start; k < startFrameIndex; k++) {
        const pData = replay.frames[k]?.ports[port]?.state;
        if (
          pData &&
          (pData.actionStateId === 0x018 || pData.actionStateId === 0x019)
        ) {
          firstJumpIdx = k;
          break;
        }
      }

      if (firstJumpIdx !== -1) {
        jumpFrameIndex = firstJumpIdx;
        jumpFrame = replay.frames[firstJumpIdx]?.frame ?? firstJumpIdx;

        const prePts: Array<{ x: number; y: number }> = [];
        for (let k = matchingWindow.start; k <= firstJumpIdx; k++) {
          const pData = replay.frames[k]?.ports[port]?.state;
          if (pData) {
            prePts.push({
              x: pData.positionX,
              y: pData.positionY + halfHeight,
            });
          }
        }
        if (prePts.length >= 1) {
          preJumpPoints = prePts;
        }

        const jmpPts: Array<{ x: number; y: number }> = [];
        for (let k = firstJumpIdx; k <= startFrameIndex; k++) {
          const pData = replay.frames[k]?.ports[port]?.state;
          if (pData) {
            jmpPts.push({
              x: pData.positionX,
              y: pData.positionY + halfHeight,
            });
          }
        }
        if (jmpPts.length >= 1) {
          jumpPoints = jmpPts;
        }
      } else {
        const prePts: Array<{ x: number; y: number }> = [];
        for (let k = matchingWindow.start; k <= startFrameIndex; k++) {
          const pData = replay.frames[k]?.ports[port]?.state;
          if (pData) {
            prePts.push({
              x: pData.positionX,
              y: pData.positionY + halfHeight,
            });
          }
        }
        if (prePts.length >= 1) {
          preJumpPoints = prePts;
        }
      }

      const allPrePts: Array<{ x: number; y: number }> = [];
      for (let k = matchingWindow.start; k <= startFrameIndex; k++) {
        const pData = replay.frames[k]?.ports[port]?.state;
        if (pData) {
          allPrePts.push({
            x: pData.positionX,
            y: pData.positionY + halfHeight,
          });
        }
      }
      if (allPrePts.length >= 1) {
        preUpBPoints = allPrePts;
      }
    }

    paths.push({
      index: paths.length + 1,
      port,
      startFrame,
      startFrameIndex,
      endFrame,
      endFrameIndex,
      recoveryStartFrame,
      recoveryStartFrameIndex,
      jumpFrame,
      jumpFrameIndex,
      preJumpPoints,
      jumpPoints,
      preUpBPoints,
      points: currentPoints,
      zipCount: Math.max(1, zipCount),
    });
  };

  for (let i = 0; i < replay.frames.length; i++) {
    const f = replay.frames[i];
    if (!f) continue;
    const pData = f.ports[port]?.state;
    if (!pData) continue;

    const isQA = isQuickAttackState(pData.actionStateId);

    if (isQA) {
      if (!inQuickAttack) {
        inQuickAttack = true;
        startFrame = f.frame;
        startFrameIndex = i;
        currentPoints = [];
        zipCount = 0;
      }
      currentPoints.push({
        x: pData.positionX,
        y: pData.positionY + halfHeight,
      });
      if (pData.actionStateId === 0x0ec || pData.actionStateId === 0x0ed) {
        const prevAction =
          i > 0
            ? replay.frames[i - 1]?.ports[port]?.state?.actionStateId
            : null;
        if (prevAction !== pData.actionStateId) {
          zipCount++;
        }
      }
    } else {
      if (inQuickAttack) {
        addPathIfEligible(replay.frames[i - 1]?.frame ?? startFrame, i - 1);
        inQuickAttack = false;
        currentPoints = [];
        zipCount = 0;
      }
    }
  }

  if (inQuickAttack && currentPoints.length >= 2) {
    const lastIdx = replay.frames.length - 1;
    addPathIfEligible(replay.frames[lastIdx]?.frame ?? startFrame, lastIdx);
  }

  return paths;
}
