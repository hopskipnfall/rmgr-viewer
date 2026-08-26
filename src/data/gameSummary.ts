import { getSeatedPorts, type PortIndex, type Replay } from "@rmg-k/rmgr";
import { computeEdgeGuardEvents, computeEdgeGuardStats } from "../edgeGuard.js";
import { computeLedgeTrapEvents, computeLedgeTrapStats } from "../ledgeTrap.js";
import {
  computeAngelInvincibilityEvents,
  computeAngelInvincibilityStats,
} from "../angelInvincibility.js";
import { computeNeutralHitsStats } from "../neutralHits.js";
import { computeKillCombos } from "../combos.js";
import type { LoadedReplay } from "../replaySource.js";

export interface KillComboSummary {
  readonly hitCount: number;
  readonly startDamage: number;
  readonly endDamage: number;
}

export interface RawCounters {
  recoverySituations: number;
  recoverySuccesses: number;
  edgeGuardSituations: number;
  edgeGuardSuccesses: number;
  ledgeGetupSituations: number;
  ledgeGetupSuccesses: number;
  ledgeTrapSituations: number;
  ledgeTrapSuccesses: number;
  angelAvoidSituations: number;
  angelAvoidSuccesses: number;
  neutralHitsLanded: number;
  stocksTaken: number;
  killCombos?: number;
  combosList?: KillComboSummary[];
}

export interface GamePortSummary {
  port: PortIndex;
  playerName: string;
  characterId: number;
  finalStocks: number;
}

export interface GameSummary {
  id: string;
  sourceName: string;
  recordedAt: Date;
  stageId: number;
  frameCount: number;
  isComplete: boolean;
  ports: GamePortSummary[];
  statsByPort: Partial<Record<PortIndex, RawCounters>>;
  manualPerspectivePort?: PortIndex | null;
  fileRef: File | null;
  url?: string;
  isBundledSample?: boolean;
}

export function createEmptyCounters(): RawCounters {
  return {
    recoverySituations: 0,
    recoverySuccesses: 0,
    edgeGuardSituations: 0,
    edgeGuardSuccesses: 0,
    ledgeGetupSituations: 0,
    ledgeGetupSuccesses: 0,
    ledgeTrapSituations: 0,
    ledgeTrapSuccesses: 0,
    angelAvoidSituations: 0,
    angelAvoidSuccesses: 0,
    neutralHitsLanded: 0,
    stocksTaken: 0,
    killCombos: 0,
    combosList: [],
  };
}

/**
 * Computes raw integer counters for a given port from a parsed replay.
 */
export function computeRawCountersForPort(
  replay: Replay,
  port: PortIndex,
): RawCounters {
  const seated = getSeatedPorts(replay);
  if (seated.length !== 2 || !seated.includes(port)) {
    return createEmptyCounters();
  }

  const edgeEvents = computeEdgeGuardEvents(replay);
  const ledgeEvents = computeLedgeTrapEvents(replay);
  const angelEvents = computeAngelInvincibilityEvents(replay);

  const edgeStats = computeEdgeGuardStats(edgeEvents, port);
  const ledgeStats = computeLedgeTrapStats(ledgeEvents, port);
  const angelStats = computeAngelInvincibilityStats(angelEvents, port);
  const neutralStats = computeNeutralHitsStats(replay, port);
  const allCombos = computeKillCombos(replay);
  const playerCombos = allCombos.filter((c) => c.attackerPort === port);
  const combosList: KillComboSummary[] = playerCombos.map((c) => ({
    hitCount: c.hitCount,
    startDamage: Math.round(c.startDamage),
    endDamage: Math.round(c.endDamage),
  }));

  return {
    recoverySituations: edgeStats.recoverySituations,
    recoverySuccesses: edgeStats.recoverySuccesses,
    edgeGuardSituations: edgeStats.edgeGuardSituations,
    edgeGuardSuccesses: edgeStats.edgeGuardSuccesses,
    ledgeGetupSituations: ledgeStats.ledgeGetupSituations,
    ledgeGetupSuccesses: ledgeStats.ledgeGetupSuccesses,
    ledgeTrapSituations: ledgeStats.ledgeTrapSituations,
    ledgeTrapSuccesses: ledgeStats.ledgeTrapSuccesses,
    angelAvoidSituations: angelStats.avoidSituations,
    angelAvoidSuccesses: angelStats.avoidSuccesses,
    neutralHitsLanded: neutralStats.totalHitsLanded,
    stocksTaken: neutralStats.stocksTaken,
    killCombos: playerCombos.length,
    combosList,
  };
}

/**
 * Deterministic fast string hash (FNV-1a 32-bit + length) for generating stable game IDs.
 */
function hashString(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function generateGameId(
  sourceName: string,
  recordedAtEpochSeconds: number,
  stageId: number,
  frameCount: number,
  ports: { port: PortIndex; characterId: number; name: string }[],
): string {
  const portKey = ports
    .map((p) => `${p.port}:${p.characterId}:${p.name}`)
    .join(",");
  const rawKey = `${sourceName}|${recordedAtEpochSeconds}|${stageId}|${frameCount}|${portKey}`;
  return `g_${hashString(rawKey)}`;
}

/**
 * Converts a parsed Replay into a compact GameSummary (~1KB) and allows
 * discarding the large Replay instance from memory.
 */
export function summarizeReplay(
  loaded: LoadedReplay,
  fileRef: File | null = null,
): GameSummary {
  const { replay, sourceName, recordedAt } = loaded;
  const seated = getSeatedPorts(replay);

  const ports: GamePortSummary[] = seated.map((port) => {
    const settings = replay.gameStart.ports[port];
    const name = replay.gameStart?.playerNames?.[port] || "";
    let finalStocks = 0;
    if (replay.gameEnd) {
      const p = replay.gameEnd.placements[port];
      finalStocks = p !== undefined && p >= 0 ? p + 1 : 0;
    } else if (replay.frames.length > 0) {
      const lastFrame = replay.frames[replay.frames.length - 1];
      const post = lastFrame?.ports[port]?.post;
      if (post) {
        finalStocks = post.stocksRemaining >= 0 ? post.stocksRemaining + 1 : 0;
      }
    }
    return {
      port,
      playerName: name,
      characterId: settings.characterId,
      finalStocks,
    };
  });

  const statsByPort: Partial<Record<PortIndex, RawCounters>> = {};
  if (seated.length === 2) {
    for (const port of seated) {
      statsByPort[port] = computeRawCountersForPort(replay, port);
    }
  }

  const id = generateGameId(
    sourceName,
    replay.header.recordedAtEpochSeconds,
    replay.gameStart.stageId,
    replay.frames.length,
    ports.map((p) => ({
      port: p.port,
      characterId: p.characterId,
      name: p.playerName,
    })),
  );

  return {
    id,
    sourceName,
    recordedAt,
    stageId: replay.gameStart.stageId,
    frameCount: replay.frames.length,
    isComplete: replay.isComplete,
    ports,
    statsByPort,
    fileRef,
  };
}
