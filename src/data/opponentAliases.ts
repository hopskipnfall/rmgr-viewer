import { notifyUserDataChanged } from "./userDataChanged.js";

/**
 * Opponent tag aliases: one person playing under several tags (`kusora`, `kusora_JPN`) should
 * count as one opponent in strength, sessions, progress and filters. This is the opponent-side
 * counterpart of the user's own identity aliases (identity.ts).
 *
 * The data is a flat map from an alternate tag to the canonical tag it stands for. It is kept
 * normalized: every value is a canonical tag that is not itself a key, so a lookup is one hop and
 * there are no chains or cycles. Tags are matched case-sensitively after trimming.
 */
export type OpponentAliases = Readonly<Record<string, string>>;

export const OPPONENT_ALIASES_STORAGE_KEY = "rmgr-viewer-opponent-aliases";

function has(map: OpponentAliases, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(map, key);
}

/**
 * The canonical tag for `name` (trimmed). Names without a merge are returned unchanged. Follows
 * the map defensively (with a cycle guard) so even an un-normalized map can't loop forever.
 */
export function canonicalOpponentName(
  name: string,
  aliases?: OpponentAliases,
): string {
  let current = name.trim();
  if (!aliases) return current;
  const seen = new Set<string>();
  while (has(aliases, current) && !seen.has(current)) {
    seen.add(current);
    const next = aliases[current]!;
    if (next === current) break;
    current = next;
  }
  return current;
}

/**
 * Cleans an arbitrary map (from storage or a project file): drops non-string entries, trims,
 * removes self-maps, and collapses chains so every value is a final canonical tag. A cycle
 * (a -> b -> a) is broken by dropping the entry that would close it.
 */
export function normalizeOpponentAliases(raw: unknown): OpponentAliases {
  const cleaned: Record<string, string> = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v !== "string") continue;
      const alt = k.trim();
      const target = v.trim();
      if (!alt || !target || alt === target) continue;
      if (alt === "__proto__" || target === "__proto__") continue;
      cleaned[alt] = target;
    }
  }
  const result: Record<string, string> = {};
  for (const alt of Object.keys(cleaned)) {
    // Walk to the end of the chain; if it comes back around, the entry is part of a cycle.
    const seen = new Set<string>([alt]);
    let current = cleaned[alt]!;
    let cyclic = false;
    while (has(cleaned, current)) {
      if (seen.has(current)) {
        cyclic = true;
        break;
      }
      seen.add(current);
      current = cleaned[current]!;
    }
    if (!cyclic && current !== alt) result[alt] = current;
  }
  return result;
}

/**
 * Declares `alt` to be the same person as `target`. The two tags' groups are merged under
 * `target`'s canonical tag: if `target` is itself an alias of C, `alt` maps to C, and anything
 * that already pointed at `alt`'s old canonical is repointed too (so no chains form). A merge
 * that would be a no-op (same person already, or an empty tag) returns the map unchanged.
 */
export function addOpponentMerge(
  aliases: OpponentAliases,
  alt: string,
  target: string,
): OpponentAliases {
  const altTag = alt.trim();
  const targetTag = target.trim();
  if (!altTag || !targetTag) return aliases;
  const canonTarget = canonicalOpponentName(targetTag, aliases);
  const canonAlt = canonicalOpponentName(altTag, aliases);
  if (canonAlt === canonTarget) return aliases;

  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(aliases)) {
    // The old group of `alt` (its canonical tag and everything mapped to it) moves under target.
    result[k] = v === canonAlt ? canonTarget : v;
  }
  result[canonAlt] = canonTarget;
  result[altTag] = canonTarget;
  return normalizeOpponentAliases(result);
}

/** Removes the merge for `alt`, so it counts as its own opponent again. */
export function removeOpponentMerge(
  aliases: OpponentAliases,
  alt: string,
): OpponentAliases {
  const tag = alt.trim();
  if (!has(aliases, tag)) return aliases;
  const result: Record<string, string> = { ...aliases };
  delete result[tag];
  return result;
}

/** Combines two maps (`incoming` wins on conflict) and re-normalizes. Used by project import. */
export function mergeOpponentAliases(
  base: OpponentAliases,
  incoming: OpponentAliases,
): OpponentAliases {
  return normalizeOpponentAliases({ ...base, ...incoming });
}

/** Reads the saved map from any Storage (empty on missing or corrupt data). Never throws. */
export function loadOpponentAliasesFrom(storage: Storage): OpponentAliases {
  try {
    const raw = storage.getItem(OPPONENT_ALIASES_STORAGE_KEY);
    if (raw) return normalizeOpponentAliases(JSON.parse(raw));
  } catch {
    // Ignore storage read errors and corrupt data
  }
  return {};
}

/** Loads the saved map from localStorage (empty on missing or corrupt data). Never throws. */
export function loadOpponentAliases(): OpponentAliases {
  try {
    return loadOpponentAliasesFrom(localStorage);
  } catch {
    return {};
  }
}

/** Saves the map; an empty map removes the storage entry. */
export function saveOpponentAliases(aliases: OpponentAliases): void {
  try {
    if (Object.keys(aliases).length === 0) {
      localStorage.removeItem(OPPONENT_ALIASES_STORAGE_KEY);
    } else {
      localStorage.setItem(
        OPPONENT_ALIASES_STORAGE_KEY,
        JSON.stringify(aliases),
      );
    }
    notifyUserDataChanged();
  } catch {
    // Ignore localStorage write errors
  }
}
