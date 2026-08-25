import type { PortIndex } from "@rmg-k/rmgr";
import type { GameSummary } from "./gameSummary.js";

export interface Identity {
  displayName: string;
  aliases: Set<string>;
}

const STORAGE_KEY = "rmgr-viewer-identity";

/**
 * Creates a default identity structure.
 */
export function createDefaultIdentity(initialName = ""): Identity {
  const aliases = new Set<string>();
  if (initialName) {
    aliases.add(initialName);
  }
  return {
    displayName: initialName || "",
    aliases,
  };
}

/**
 * Loads default identity (in-memory for current session, resets on page reload).
 */
export function loadIdentity(): Identity {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore localStorage errors
  }
  return createDefaultIdentity();
}

/**
 * Saves identity (no-op as identity is session-only and resets on page reload).
 */
export function saveIdentity(): void {
  // Session-only: do not persist to localStorage
}

/**
 * Checks if a player name matches the identity's aliases.
 */
export function matchesAlias(name: string, identity: Identity): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (identity.aliases.has(trimmed)) return true;

  // Case-insensitive fallback
  const lower = trimmed.toLowerCase();
  for (const alias of identity.aliases) {
    if (alias.trim().toLowerCase() === lower) {
      return true;
    }
  }
  return false;
}

/**
 * Resolves which port represents "you" for a given GameSummary.
 * Strict resolution order (§2.2):
 * 1. Manual per-game override exists -> use it.
 * 2. Exactly one seated port's playerName is in aliases -> that port is you.
 * 3. Otherwise -> ambiguous (returns null).
 */
export function resolvePerspectivePort(
  summary: GameSummary,
  identity: Identity,
): PortIndex | null {
  // 1. Manual per-game override
  if (
    summary.manualPerspectivePort !== undefined &&
    summary.manualPerspectivePort !== null
  ) {
    const isPortPresent = summary.ports.some(
      (p) => p.port === summary.manualPerspectivePort,
    );
    if (isPortPresent) {
      return summary.manualPerspectivePort;
    }
  }

  // 2. Alias match
  const matchingPorts: PortIndex[] = [];
  for (const portSummary of summary.ports) {
    if (matchesAlias(portSummary.playerName, identity)) {
      matchingPorts.push(portSummary.port);
    }
  }

  if (matchingPorts.length === 1 && matchingPorts[0] !== undefined) {
    return matchingPorts[0];
  }

  // 3. Ambiguous (0 or 2+ matching ports, or unnamed offline ports)
  return null;
}

/**
 * Returns the opponent port for a 2-player match given your port.
 */
export function resolveOpponentPort(
  summary: GameSummary,
  yourPort: PortIndex,
): PortIndex | null {
  if (summary.ports.length !== 2) return null;
  const opp = summary.ports.find((p) => p.port !== yourPort);
  return opp ? opp.port : null;
}

/**
 * Extracts and tallies all unique player names across all imported games,
 * ordered by frequency (descending). Empty names are excluded.
 */
export function extractAllPlayerNames(
  summaries: GameSummary[],
): { name: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const summary of summaries) {
    for (const port of summary.ports) {
      const name = port.playerName.trim();
      if (name.length > 0) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
  }

  const result = Array.from(counts.entries()).map(([name, count]) => ({
    name,
    count,
  }));

  result.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return result;
}
