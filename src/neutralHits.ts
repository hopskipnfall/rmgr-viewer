import type { PortIndex, Replay } from "@rmg-k/rmgr";

const PORTS: readonly PortIndex[] = [0, 1, 2, 3];

/**
 * For each seated port, how many neutral hits (fresh combos - a
 * `comboHitCount` 0 -> nonzero transition; staying nonzero across
 * subsequent hits is the same combo, not a new one) that port has taken in
 * its *current* stock, indexed the same way as `replay.frames` (so
 * `result[port][frameIndex]` matches `replay.frames[frameIndex]`). Resets
 * to 0 starting the frame after `stocksRemaining` drops - the hit that
 * caused the KO (if it lands the same frame the drop is observed) is still
 * counted against the stock that just ended.
 *
 * Precomputed once per loaded replay rather than tracked incrementally
 * during playback: this viewer allows scrubbing/seeking to any frame in
 * any order, so an incremental counter would need recomputing from
 * scratch on every seek anyway - doing the whole pass once up front is
 * both simpler and correct regardless of playback direction.
 */
export function computeNeutralHitsPerStock(
  replay: Replay,
): Partial<Record<PortIndex, readonly number[]>> {
  const result: Partial<Record<PortIndex, number[]>> = {};

  for (const port of PORTS) {
    const values: number[] = new Array(replay.frames.length).fill(0);
    let neutralHits = 0;
    let lastComboHitCount: number | undefined;
    let lastStocksRemaining: number | undefined;

    for (let i = 0; i < replay.frames.length; i++) {
      const post = replay.frames[i]?.ports[port]?.post;
      if (!post) {
        values[i] = neutralHits;
        continue;
      }

      const isFreshHit =
        lastComboHitCount !== undefined
          ? lastComboHitCount === 0 && post.comboHitCount > 0
          : post.comboHitCount > 0; // first observation - no prior state, so an already-nonzero count still counts as one hit
      if (isFreshHit) {
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
    }

    result[port] = values;
  }

  return result;
}
