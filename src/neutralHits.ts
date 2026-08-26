import { getSeatedPorts, type PortIndex, type Replay } from "@rmg-k/rmgr";
import { buildRecoveryMap, buildLedgeMap } from "./ledgeTrap.js";

const PORTS: readonly PortIndex[] = [0, 1, 2, 3];

/** Action states where the player is captured/held/thrown by a grab. */
const CAPTURE_STATES = new Set([
  0x0ab, // CapturePull
  0x0ac, // CaptureWait
  0x0ad, // CaptureDamage
  0x0b3, // CaptureFalconDive (Captain Falcon & J Falcon Up-B grab)
  0x0b6, // CaptureCargo / CommandGrabHold
  0x0b9, // CapturePulled / ThrowTransition
  0x0ba, // DamageThrown / Thrown
  0x0bb,
]);

/**
 * For each seated port, how many neutral hits (fresh combos or grabs) that
 * port has taken in its *current* stock, indexed the same way as `replay.frames`
 * (so `result[port][frameIndex]` matches `replay.frames[frameIndex]`). Resets
 * to 0 starting the frame after `stocksRemaining` drops.
 *
 * Excludes hits landed while the victim is in an active recovery situation or
 * ledge getup situation.
 */
export function computeNeutralHitsPerStock(
  replay: Replay,
): Partial<Record<PortIndex, readonly number[]>> {
  const result: Partial<Record<PortIndex, number[]>> = {};
  const seated = getSeatedPorts(replay);
  const recoveryMap =
    seated.length === 2
      ? buildRecoveryMap(replay, seated[0]!, seated[1]!)
      : null;
  const ledgeMap = seated.length === 2 ? buildLedgeMap(replay) : null;

  for (const port of PORTS) {
    const values: number[] = new Array(replay.frames.length).fill(0);
    let neutralHits = 0;
    let lastComboHitCount: number | undefined;
    let lastStocksRemaining: number | undefined;
    let lastInCapture = false;

    for (let i = 0; i < replay.frames.length; i++) {
      const post = replay.frames[i]?.ports[port]?.post;
      if (!post) {
        values[i] = neutralHits;
        continue;
      }

      const inCapture = CAPTURE_STATES.has(post.actionStateId);
      const isFreshAttackHit =
        lastComboHitCount !== undefined
          ? lastComboHitCount === 0 && post.comboHitCount > 0 && !lastInCapture
          : post.comboHitCount > 0;
      const isFreshGrab = inCapture && !lastInCapture;

      const isDisadvantage =
        (recoveryMap !== null && recoveryMap[i] === port) ||
        (ledgeMap !== null && ledgeMap[i] === port);

      if ((isFreshAttackHit || isFreshGrab) && !isDisadvantage) {
        neutralHits++;
      }

      values[i] = neutralHits;

      const stockLost =
        lastStocksRemaining !== undefined &&
        post.stocksRemaining < lastStocksRemaining;
      if (stockLost) {
        neutralHits = 0; // takes effect starting the next frame
      }

      lastComboHitCount = post.comboHitCount;
      lastStocksRemaining = post.stocksRemaining;
      lastInCapture = inCapture;
    }

    result[port] = values;
  }

  return result;
}

export interface NeutralHitEvent {
  readonly frame: number;
  readonly frameIndex: number;
  readonly kind: "neutral-hit";
  readonly attackerPort: PortIndex;
  readonly victimPort: PortIndex;
  readonly hitType: "attack" | "grab";
}

/**
 * Computes all neutral hit and grab events in chronological order,
 * excluding hits that occur during recovery or ledge getup situations.
 */
export function computeNeutralHitEvents(replay: Replay): NeutralHitEvent[] {
  const events: NeutralHitEvent[] = [];
  const seated = getSeatedPorts(replay);
  if (seated.length !== 2) return events;

  const [portA, portB] = seated as [PortIndex, PortIndex];
  const recoveryMap = buildRecoveryMap(replay, portA, portB);
  const ledgeMap = buildLedgeMap(replay);

  let lastACombo: number | undefined;
  let lastBCombo: number | undefined;
  let lastAInCapture = false;
  let lastBInCapture = false;

  for (let i = 0; i < replay.frames.length; i++) {
    const frame = replay.frames[i];
    if (!frame) continue;
    const postA = frame.ports[portA]?.post;
    const postB = frame.ports[portB]?.post;
    if (!postA || !postB) continue;

    const frameNumber = frame.frame;
    const aInCapture = CAPTURE_STATES.has(postA.actionStateId);
    const bInCapture = CAPTURE_STATES.has(postB.actionStateId);

    const bInDisadvantage = recoveryMap[i] === portB || ledgeMap[i] === portB;
    const aInDisadvantage = recoveryMap[i] === portA || ledgeMap[i] === portA;

    // Check if A hit/grabbed B
    const aHitB =
      (lastBCombo === 0 || lastBCombo === undefined) &&
      postB.comboHitCount > 0 &&
      !lastBInCapture;
    const aGrabbedB = bInCapture && !lastBInCapture;

    if ((aHitB || aGrabbedB) && !bInDisadvantage) {
      events.push({
        frame: frameNumber,
        frameIndex: i,
        kind: "neutral-hit",
        attackerPort: portA,
        victimPort: portB,
        hitType: aGrabbedB ? "grab" : "attack",
      });
    }

    // Check if B hit/grabbed A
    const bHitA =
      (lastACombo === 0 || lastACombo === undefined) &&
      postA.comboHitCount > 0 &&
      !lastAInCapture;
    const bGrabbedA = aInCapture && !lastAInCapture;

    if ((bHitA || bGrabbedA) && !aInDisadvantage) {
      events.push({
        frame: frameNumber,
        frameIndex: i,
        kind: "neutral-hit",
        attackerPort: portB,
        victimPort: portA,
        hitType: bGrabbedA ? "grab" : "attack",
      });
    }

    lastACombo = postA.comboHitCount;
    lastBCombo = postB.comboHitCount;
    lastAInCapture = aInCapture;
    lastBInCapture = bInCapture;
  }

  return events;
}

export interface NeutralHitsStats {
  /** Total completed stocks taken from opponent(s). */
  stocksTaken: number;
  /** Total neutral hits landed across all taken stocks. */
  totalHitsLanded: number;
  /** Average number of neutral hits per stock taken, or null if no stocks taken. */
  averageHitsPerStock: number | null;
}

/**
 * Computes the average number of neutral hits landed by `attackerPort`
 * before taking each stock from opponent(s). Grabs are counted as hits.
 * Excludes hits landed during recovery or ledge getups.
 */
export function computeNeutralHitsStats(
  replay: Replay,
  attackerPort: PortIndex,
): NeutralHitsStats {
  const seated = getSeatedPorts(replay);
  const opponents = seated.filter((p) => p !== attackerPort);
  if (opponents.length === 0) {
    return { stocksTaken: 0, totalHitsLanded: 0, averageHitsPerStock: null };
  }

  const recoveryMap =
    seated.length === 2
      ? buildRecoveryMap(replay, seated[0]!, seated[1]!)
      : null;
  const ledgeMap = seated.length === 2 ? buildLedgeMap(replay) : null;

  const hitsPerStockTaken: number[] = [];

  for (const victimPort of opponents) {
    let currentStockHits = 0;
    let lastComboHitCount: number | undefined;
    let lastStocksRemaining: number | undefined;
    let lastInCapture = false;

    for (let i = 0; i < replay.frames.length; i++) {
      const post = replay.frames[i]?.ports[victimPort]?.post;
      if (!post) continue;

      const inCapture = CAPTURE_STATES.has(post.actionStateId);
      const isFreshAttackHit =
        lastComboHitCount !== undefined
          ? lastComboHitCount === 0 && post.comboHitCount > 0 && !lastInCapture
          : post.comboHitCount > 0;
      const isFreshGrab = inCapture && !lastInCapture;

      const isDisadvantage =
        (recoveryMap !== null && recoveryMap[i] === victimPort) ||
        (ledgeMap !== null && ledgeMap[i] === victimPort);

      if ((isFreshAttackHit || isFreshGrab) && !isDisadvantage) {
        currentStockHits++;
      }

      const stockLost =
        lastStocksRemaining !== undefined &&
        post.stocksRemaining < lastStocksRemaining;
      if (stockLost) {
        hitsPerStockTaken.push(currentStockHits);
        currentStockHits = 0;
      }

      lastComboHitCount = post.comboHitCount;
      lastStocksRemaining = post.stocksRemaining;
      lastInCapture = inCapture;
    }

    // If recording is complete and the opponent lost the match at the end,
    // count that final stock taken as well.
    if (
      replay.isComplete &&
      replay.gameEnd &&
      replay.gameEnd.placements[victimPort] === -1 &&
      currentStockHits > 0
    ) {
      hitsPerStockTaken.push(currentStockHits);
    }
  }

  const stocksTaken = hitsPerStockTaken.length;
  const totalHitsLanded = hitsPerStockTaken.reduce((sum, h) => sum + h, 0);
  const averageHitsPerStock =
    stocksTaken > 0 ? totalHitsLanded / stocksTaken : null;

  return {
    stocksTaken,
    totalHitsLanded,
    averageHitsPerStock,
  };
}
