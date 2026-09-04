import { getSeatedPorts, type PortIndex, type Replay } from "@rmg-k/rmgr";
import { computeEdgeGuardEvents, computeEdgeGuardStats } from "../edgeGuard.js";
import { computeLedgeTrapEvents, computeLedgeTrapStats } from "../ledgeTrap.js";
import {
  computeAngelInvincibilityEvents,
  computeAngelInvincibilityStats,
} from "../angelInvincibility.js";
import {
  computeNeutralHitsStats,
  computeNeutralHitEvents,
  type NeutralOpeningReason,
} from "../neutralHits.js";
import { computeKillCombos } from "../combos.js";
import type { LoadedReplay } from "../replaySource.js";

/** Pooled per-reason opening counts, keyed by `NeutralOpeningReason`. */
export type OpeningReasonCounts = Partial<Record<NeutralOpeningReason, number>>;

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

  /** Neutral openings this port won (landed the initiating hit/grab). */
  openingsWon?: number;
  /** Neutral openings this port conceded (was hit/grabbed first). */
  openingsLost?: number;
  /** Openings won, broken out by why the opponent was caught. */
  openingsWonByReason?: OpeningReasonCounts;
  /** Openings lost, broken out by how this port was caught. */
  openingsLostByReason?: OpeningReasonCounts;
  /** Total damage dealt across all openings this port won. */
  damageDealtOnOpenings?: number;
  /** Total damage taken *while holding advantage* on openings this port won (the "leak"). */
  damageLeakOnOpenings?: number;
  /** Openings won that were converted all the way to a kill. */
  openingsConvertedToKill?: number;
}

export interface GamePortSummary {
  port: PortIndex;
  playerName: string;
  characterId: number;
  finalStocks: number;
  startStocks?: number;
}

export interface GameSummary {
  id: string;
  sourceName: string;
  recordedAt: Date;
  stageId: number;
  frameCount: number;
  /**
   * Always true as of format v5 - the parser throws rather than returning a
   * partial Replay for a truncated file (docs/RMGR_SPEC.md §2/§3.4), so
   * there's no "truncated recording" case to represent. Kept as a field
   * (rather than removed) to avoid rippling through every fixture/serialized
   * summary that still sets it.
   */
  isComplete: boolean;
  ports: GamePortSummary[];
  statsByPort: Partial<Record<PortIndex, RawCounters>>;
  manualPerspectivePort?: PortIndex | null;
  fileRef: File | null;
  url?: string;
  isBundledSample?: boolean;
  isUnevenStockStart?: boolean;
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
    openingsWon: 0,
    openingsLost: 0,
    openingsWonByReason: {},
    openingsLostByReason: {},
    damageDealtOnOpenings: 0,
    damageLeakOnOpenings: 0,
    openingsConvertedToKill: 0,
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

  const openingEvents = computeNeutralHitEvents(replay);
  let openingsWon = 0;
  let openingsLost = 0;
  const openingsWonByReason: OpeningReasonCounts = {};
  const openingsLostByReason: OpeningReasonCounts = {};
  let damageDealtOnOpenings = 0;
  let damageLeakOnOpenings = 0;
  let openingsConvertedToKill = 0;

  for (const event of openingEvents) {
    if (event.attackerPort === port) {
      openingsWon++;
      openingsWonByReason[event.reason] =
        (openingsWonByReason[event.reason] ?? 0) + 1;
      damageDealtOnOpenings += event.totalDamageDealt ?? 0;
      damageLeakOnOpenings += event.damageTakenDuringAdvantage ?? 0;
      if (event.convertedToKill) openingsConvertedToKill++;
    } else if (event.victimPort === port) {
      openingsLost++;
      openingsLostByReason[event.reason] =
        (openingsLostByReason[event.reason] ?? 0) + 1;
    }
  }

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
    openingsWon,
    openingsLost,
    openingsWonByReason,
    openingsLostByReason,
    damageDealtOnOpenings,
    damageLeakOnOpenings,
    openingsConvertedToKill,
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
  recordedAtEpochMillis: number,
  stageId: number,
  frameCount: number,
  ports: { port: PortIndex; characterId: number; name: string }[],
): string {
  const portKey = ports
    .map((p) => `${p.port}:${p.characterId}:${p.name}`)
    .join(",");
  const rawKey = `${sourceName}|${recordedAtEpochMillis}|${stageId}|${frameCount}|${portKey}`;
  return `g_${hashString(rawKey)}`;
}

/**
 * JSON-serializable form of the fields `summarizeReplay()` computes (i.e.
 * everything except `recordedAt`, which becomes an ISO string, and
 * `fileRef`/`url`/`isBundledSample`/`manualPerspectivePort`, which are
 * either not applicable or assigned by the caller afterward).
 *
 * Written by `scripts/generateDemoSummaries.ts` to
 * `public/replays/demo-summaries.json` and read back by `main.ts` at
 * startup, so the app can populate the library list from one small JSON
 * fetch instead of downloading and parsing every bundled demo `.rmgr` file.
 */
export type SerializedGameSummary = Pick<
  GameSummary,
  | "id"
  | "sourceName"
  | "stageId"
  | "frameCount"
  | "isComplete"
  | "ports"
  | "statsByPort"
  | "isUnevenStockStart"
> & {
  recordedAt: string;
};

export function serializeGameSummary(
  summary: GameSummary,
): SerializedGameSummary {
  return {
    id: summary.id,
    sourceName: summary.sourceName,
    recordedAt: summary.recordedAt.toISOString(),
    stageId: summary.stageId,
    frameCount: summary.frameCount,
    isComplete: summary.isComplete,
    ports: summary.ports,
    statsByPort: summary.statsByPort,
    isUnevenStockStart: summary.isUnevenStockStart,
  };
}

export function deserializeGameSummary(
  serialized: SerializedGameSummary,
): GameSummary {
  return {
    id: serialized.id,
    sourceName: serialized.sourceName,
    recordedAt: new Date(serialized.recordedAt),
    stageId: serialized.stageId,
    frameCount: serialized.frameCount,
    isComplete: serialized.isComplete,
    ports: serialized.ports,
    statsByPort: serialized.statsByPort,
    fileRef: null,
    isUnevenStockStart: serialized.isUnevenStockStart,
  };
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
    const name = replay.matchStart.playerNames[port] || "";
    let finalStocks = 0;
    if (replay.matchResult) {
      const p = replay.matchResult.placements[port];
      finalStocks = p !== undefined && p >= 0 ? p + 1 : 0;
    } else if (replay.frames.length > 0) {
      const lastFrame = replay.frames[replay.frames.length - 1];
      const state = lastFrame?.ports[port]?.state;
      if (state) {
        finalStocks =
          state.stocksRemaining >= 0 ? state.stocksRemaining + 1 : 0;
      }
    }

    let startStocks: number | undefined;
    for (let fIdx = 0; fIdx < Math.min(replay.frames.length, 30); fIdx++) {
      const state = replay.frames[fIdx]?.ports[port]?.state;
      if (state && state.stocksRemaining >= 0) {
        startStocks = state.stocksRemaining + 1;
        break;
      }
    }
    if (startStocks === undefined) {
      startStocks = (replay.matchSettings?.stockCountSetting ?? 3) + 1;
    }

    return {
      port,
      playerName: name,
      characterId: replay.matchSettings?.characterId[port] ?? 0,
      finalStocks,
      startStocks,
    };
  });

  const seatedStartStocks = ports.map((p) => p.startStocks);
  const isUnevenStockStart =
    seated.length === 2 &&
    seatedStartStocks.length === 2 &&
    seatedStartStocks[0] !== undefined &&
    seatedStartStocks[1] !== undefined &&
    seatedStartStocks[0] !== seatedStartStocks[1];

  const statsByPort: Partial<Record<PortIndex, RawCounters>> = {};
  if (seated.length === 2) {
    for (const port of seated) {
      statsByPort[port] = computeRawCountersForPort(replay, port);
    }
  }

  const stageId = replay.matchSettings?.stageId ?? 0;
  const id = generateGameId(
    sourceName,
    replay.header.recordedAtEpochMillis,
    stageId,
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
    stageId,
    frameCount: replay.frames.length,
    isComplete: true,
    ports,
    statsByPort,
    fileRef,
    isUnevenStockStart,
  };
}
