import type { GameSummary } from "./gameSummary.js";
import type { Identity } from "./identity.js";
import { filterGameSummaries } from "./aggregate.js";

/** A character must clear this share of games played before it counts as "the main" (§6.1). */
const MAIN_USAGE_SHARE_THRESHOLD = 0.25;

/**
 * Detects the identity's main character from usage share, without prompting.
 * Returns null if no character clears the threshold (an all-rounder, or a
 * 12CB-heavy player) — callers should fall back to an unfiltered "All characters"
 * view rather than asking the user, per §6.1.
 */
export function detectMainCharacter(
  summaries: GameSummary[],
  identity: Identity,
): number | null {
  const resolved = filterGameSummaries(summaries, identity, {});
  if (resolved.length === 0) return null;

  const counts = new Map<number, number>();
  for (const { summary, yourPort } of resolved) {
    const yourP = summary.ports.find((p) => p.port === yourPort);
    if (!yourP) continue;
    counts.set(yourP.characterId, (counts.get(yourP.characterId) ?? 0) + 1);
  }

  let bestCharId: number | null = null;
  let bestCount = 0;
  for (const [charId, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestCharId = charId;
    }
  }

  if (bestCharId === null) return null;
  return bestCount / resolved.length >= MAIN_USAGE_SHARE_THRESHOLD
    ? bestCharId
    : null;
}
