import {
  ActionStateId,
  getSeatedPorts,
  type PortIndex,
  type Replay,
} from "@rmg-k/rmgr";
import { computeAngelInvincibilityEvents } from "./angelInvincibility.js";
import { computeNeutralHitEvents } from "./neutralHits.js";

export interface HeatmapPoint {
  readonly x: number;
  readonly y: number;
}

export interface HeatmapPoints {
  readonly perspective: readonly HeatmapPoint[];
  readonly opponent: readonly HeatmapPoint[];
}

/** 5 seconds at this app's fixed 60 FPS (see src/playback.ts's local FPS constant). */
const ANGEL_WINDOW_FRAMES = 300;

/**
 * Collects per-frame stage positions for `perspectivePort` and
 * `opponentPort`, restricted to "neutral" positioning: frames inside an
 * active neutral-hit exchange, or where either port is in the Revive1
 * (immobile spawn-platform) state, are always excluded. When
 * `onlyDuringAngelInvincibility` is true, perspectivePort positions are
 * collected only within 300 frames (5s) after each of the opponent's
 * respawn events, while opponentPort positions are collected only within
 * 300 frames after each of the perspective player's respawn events.
 * Overlapping windows aren't double-counted. Empty for any replay that
 * isn't exactly 1v1.
 */
export function collectHeatmapPoints(
  replay: Replay,
  perspectivePort: PortIndex,
  opponentPort: PortIndex,
  onlyDuringAngelInvincibility: boolean,
): HeatmapPoints {
  if (getSeatedPorts(replay).length !== 2) {
    return { perspective: [], opponent: [] };
  }

  let perspectiveAllowedFrameIndices: Set<number> | null = null;
  let opponentAllowedFrameIndices: Set<number> | null = null;
  if (onlyDuringAngelInvincibility) {
    perspectiveAllowedFrameIndices = new Set<number>();
    opponentAllowedFrameIndices = new Set<number>();
    for (const ev of computeAngelInvincibilityEvents(replay)) {
      if (ev.kind !== "angel-entered") continue;
      const windowStart = ev.frame;
      const windowEnd = ev.frame + ANGEL_WINDOW_FRAMES;
      if (ev.respawnPort === opponentPort) {
        for (let i = 0; i < replay.frames.length; i++) {
          const frame = replay.frames[i];
          if (frame && frame.frame >= windowStart && frame.frame < windowEnd) {
            perspectiveAllowedFrameIndices.add(i);
          }
        }
      } else if (ev.respawnPort === perspectivePort) {
        for (let i = 0; i < replay.frames.length; i++) {
          const frame = replay.frames[i];
          if (frame && frame.frame >= windowStart && frame.frame < windowEnd) {
            opponentAllowedFrameIndices.add(i);
          }
        }
      }
    }
  }

  // Only "neutral" positioning belongs in this heatmap: exclude any frame
  // inside an active neutral-hit exchange (see src/neutralHits.ts's Match
  // Stats "neutral" panel) and any frame where either port can't move
  // (Revive1 — riding the spawn platform, before dropping/becoming
  // actionable).
  const exchangeFrameIndices = new Set<number>();
  for (const ev of computeNeutralHitEvents(replay)) {
    const start = ev.frameIndex;
    const end = ev.endFrameIndex ?? ev.frameIndex;
    for (let i = start; i <= end; i++) {
      exchangeFrameIndices.add(i);
    }
  }

  const perspective: HeatmapPoint[] = [];
  const opponent: HeatmapPoint[] = [];

  for (let i = 0; i < replay.frames.length; i++) {
    if (exchangeFrameIndices.has(i)) continue;
    const frame = replay.frames[i];
    if (!frame) continue;

    const pState = frame.ports[perspectivePort]?.state;
    const oState = frame.ports[opponentPort]?.state;
    if (
      pState?.actionStateId === ActionStateId.Revive1 ||
      oState?.actionStateId === ActionStateId.Revive1
    ) {
      continue;
    }

    if (
      pState &&
      (perspectiveAllowedFrameIndices === null ||
        perspectiveAllowedFrameIndices.has(i))
    ) {
      perspective.push({ x: pState.positionX, y: pState.positionY });
    }
    if (
      oState &&
      (opponentAllowedFrameIndices === null ||
        opponentAllowedFrameIndices.has(i))
    ) {
      opponent.push({ x: oState.positionX, y: oState.positionY });
    }
  }

  return { perspective, opponent };
}
