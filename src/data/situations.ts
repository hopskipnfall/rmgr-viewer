import type { GameSummary, OpeningRecord } from "./gameSummary.js";
import { resolvePerspectivePort, type Identity } from "./identity.js";
import { characterFamily } from "./characterFamily.js";
import type { PlaylistClip } from "../playlist.js";

/**
 * The punish finder: every neutral opening in the library that matches a situation (who hit whom,
 * at what percent, where on the stage), ranked by how much it was worth. Built for studying "what's
 * the best punish from here" by looking at what you and stronger players actually got. Reads the
 * OpeningRecord index cached in each GameSummary, so no replay files are needed to search.
 */

/** Dream Land's main stage edge (ground half-width), see stageGeometry.ts. */
const STAGE_EDGE_X = 2318;
/** Inside this |x| is "center"; the side platforms start at |x| ~= 951. */
const CENTER_HALF_WIDTH = 1000;
/** Below this y is "low" (ground level); side platforms are at y ~= 905, top platform y ~= 1542. */
const LOW_MAX_Y = 300;
/** At or above this y is "high" (top platform and above). */
const HIGH_MIN_Y = 1300;

export type HorizontalZone = "center" | "side" | "offstage";
export type VerticalZone = "low" | "mid" | "high";
export type StageZone = `${HorizontalZone}-${VerticalZone}`;

export const HORIZONTAL_ZONES: readonly HorizontalZone[] = [
  "center",
  "side",
  "offstage",
];
export const VERTICAL_ZONES: readonly VerticalZone[] = ["high", "mid", "low"];

/** Where a victim at (x, y) was, mirrored so left and right count the same. */
export function stageZoneOf(x: number, y: number): StageZone {
  const ax = Math.abs(x);
  const h: HorizontalZone =
    ax > STAGE_EDGE_X ? "offstage" : ax > CENTER_HALF_WIDTH ? "side" : "center";
  const v: VerticalZone =
    y < LOW_MAX_Y ? "low" : y < HIGH_MIN_Y ? "mid" : "high";
  return `${h}-${v}`;
}

export type PunisherFilter = "anyone" | "you" | "opponents";
export type OpeningKindFilter = "any" | "attack" | "grab";

export interface SituationQuery {
  /** characterFamily() of the player landing the punish, or null for any. */
  readonly attackerFamily: number | null;
  /** characterFamily() of the player being punished, or null for any. */
  readonly victimFamily: number | null;
  /** Victim's damage before the hit, inclusive range. */
  readonly minDamage: number;
  readonly maxDamage: number;
  /** Empty = anywhere. */
  readonly zones: readonly StageZone[];
  readonly punisher: PunisherFilter;
  readonly kind: OpeningKindFilter;
}

export interface SituationMatch {
  readonly summary: GameSummary;
  readonly opening: OpeningRecord;
  readonly attackerName: string;
  readonly victimName: string;
  readonly attackerCharacterId: number;
  readonly victimCharacterId: number;
  /** The punish was landed by the identity's player. */
  readonly byYou: boolean;
}

/** All matches that opened with the same move (per attacking character). */
export interface MoveSummary {
  readonly attackerFamily: number;
  readonly move: number | null;
  readonly isGrab: boolean;
  readonly count: number;
  readonly averageDamage: number;
  readonly medianDamage: number;
  /** Share that took the stock, 0-100. */
  readonly killRate: number;
  /** The best single punish in the group (see compareMatches). */
  readonly best: SituationMatch;
}

export interface SituationResults {
  /** Best first. */
  readonly matches: readonly SituationMatch[];
  /** Highest average damage first. */
  readonly byMove: readonly MoveSummary[];
  readonly gamesSearched: number;
  /** Games cached before the opening index existed; re-import to include them. */
  readonly gamesWithoutIndex: number;
}

/** Better punish first: one that took the stock, then more damage, then fewer hits. */
function compareMatches(a: SituationMatch, b: SituationMatch): number {
  return (
    Number(b.opening.killed) - Number(a.opening.killed) ||
    b.opening.damage - a.opening.damage ||
    a.opening.hits - b.opening.hits
  );
}

function median(sorted: readonly number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function findSituations(
  summaries: readonly GameSummary[],
  identity: Identity,
  query: SituationQuery,
): SituationResults {
  const unique = [...new Map(summaries.map((s) => [s.id, s])).values()];
  const zones = new Set(query.zones);
  const matches: SituationMatch[] = [];
  let gamesSearched = 0;
  let gamesWithoutIndex = 0;

  for (const summary of unique) {
    if (summary.ports.length !== 2) continue;
    if (!summary.openings) {
      gamesWithoutIndex++;
      continue;
    }
    gamesSearched++;
    const yourPort = resolvePerspectivePort(summary, identity);
    for (const opening of summary.openings) {
      const attacker = summary.ports.find(
        (p) => p.port === opening.attackerPort,
      );
      const victim = summary.ports.find((p) => p.port !== opening.attackerPort);
      if (!attacker || !victim) continue;
      if (
        query.attackerFamily !== null &&
        characterFamily(attacker.characterId) !== query.attackerFamily
      ) {
        continue;
      }
      if (
        query.victimFamily !== null &&
        characterFamily(victim.characterId) !== query.victimFamily
      ) {
        continue;
      }
      if (
        opening.victimDamage < query.minDamage ||
        opening.victimDamage > query.maxDamage
      ) {
        continue;
      }
      if (
        zones.size > 0 &&
        !zones.has(stageZoneOf(opening.victimX, opening.victimY))
      ) {
        continue;
      }
      if (query.kind === "attack" && opening.isGrab) continue;
      if (query.kind === "grab" && !opening.isGrab) continue;
      const byYou = yourPort !== null && opening.attackerPort === yourPort;
      if (query.punisher === "you" && !byYou) continue;
      // "Opponents" means the people you played, not third-party games in the library.
      if (query.punisher === "opponents" && (yourPort === null || byYou))
        continue;
      matches.push({
        summary,
        opening,
        attackerName: attacker.playerName,
        victimName: victim.playerName,
        attackerCharacterId: attacker.characterId,
        victimCharacterId: victim.characterId,
        byYou,
      });
    }
  }
  matches.sort(compareMatches);

  const groups = new Map<string, SituationMatch[]>();
  for (const m of matches) {
    const key = `${characterFamily(m.attackerCharacterId)}:${m.opening.isGrab ? "grab" : m.opening.move}`;
    const list = groups.get(key) ?? [];
    list.push(m);
    groups.set(key, list);
  }
  const byMove: MoveSummary[] = [...groups.values()].map((list) => {
    const damages = list.map((m) => m.opening.damage).sort((a, b) => a - b);
    const first = list[0]!;
    return {
      attackerFamily: characterFamily(first.attackerCharacterId),
      move: first.opening.isGrab ? null : first.opening.move,
      isGrab: first.opening.isGrab,
      count: list.length,
      averageDamage: damages.reduce((s, d) => s + d, 0) / damages.length,
      medianDamage: median(damages),
      killRate:
        (list.filter((m) => m.opening.killed).length / list.length) * 100,
      best: first,
    };
  });
  byMove.sort((a, b) => b.averageDamage - a.averageDamage || b.count - a.count);

  return { matches, byMove, gamesSearched, gamesWithoutIndex };
}

const CLIP_PRE_ROLL_FRAMES = 90;
const CLIP_POST_ROLL_FRAMES = 45;

/** One playlist clip per match: a short lead-in, the whole punish, and a beat after. */
export function situationClips(
  matches: readonly SituationMatch[],
  label: (match: SituationMatch) => string,
): PlaylistClip[] {
  return matches.map((m) => ({
    gameId: m.summary.id,
    startFrameIndex: Math.max(0, m.opening.frameIndex - CLIP_PRE_ROLL_FRAMES),
    endFrameIndex: Math.min(
      m.summary.frameCount - 1,
      m.opening.endFrameIndex + CLIP_POST_ROLL_FRAMES,
    ),
    label: label(m),
  }));
}
