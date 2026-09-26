import {
  ActionStateId,
  getSeatedPorts,
  isLinkCharacter,
  isNessCharacter,
  isPikachuCharacter,
  isYoshiCharacter,
  type PortIndex,
  type Replay,
} from "@rmg-k/rmgr";
import { isHitstunState } from "./edgeGuard.js";
import { CAPTURE_STATES } from "./combos.js";

/**
 * Granular/secondary stats: tracked per game so trends are visible over time, but not surfaced
 * as top-level numbers. This is the first entry - see computeMicroStats() to add another.
 */
export type MicroStatId =
  | "smash-forward"
  | "smash-up"
  | "smash-down"
  | "utilt-pikachu"
  | "utilt-ness"
  | "utilt-yoshi"
  | "utilt-link";

/** How many times each stat's tracked attack got the port hit or grabbed. */
export type MicroStatCounts = Partial<Record<MicroStatId, number>>;

/** How long after a tracked action ends a hit/grab still counts as a punish (0.5s @ 60fps). */
const PUNISH_WINDOW_FRAMES = 30;

interface MicroStatDefinition {
  readonly id: MicroStatId;
  readonly isTracked: (actionStateId: number, characterId: number) => boolean;
}

// Forward smash has 5 states, one per angle the player aims it at - all count as the same move.
// Up/down smash are single states each. B-moves are intentionally not tracked yet: too many
// states involved (charge, travel, multiple hits) to classify reliably as one attempt.
const FSMASH_STATES = new Set<number>([
  ActionStateId.FSmash1,
  ActionStateId.FSmash2,
  ActionStateId.FSmash3,
  ActionStateId.FSmash4,
  ActionStateId.FSmash5,
]);

// Up tilt is the same shared action state for every character, but it's only worth tracking as
// a "strong move" for the specific characters whose up tilt is unusually strong (both US and JP
// versions of each - the isXCharacter() helpers already cover both region variants).
const MICRO_STAT_DEFINITIONS: readonly MicroStatDefinition[] = [
  {
    id: "smash-forward",
    isTracked: (id) => FSMASH_STATES.has(id),
  },
  {
    id: "smash-up",
    isTracked: (id) => id === ActionStateId.USmash,
  },
  {
    id: "smash-down",
    isTracked: (id) => id === ActionStateId.DSmash,
  },
  {
    id: "utilt-pikachu",
    isTracked: (id, characterId) =>
      id === ActionStateId.UTilt && isPikachuCharacter(characterId),
  },
  {
    id: "utilt-ness",
    isTracked: (id, characterId) =>
      id === ActionStateId.UTilt && isNessCharacter(characterId),
  },
  {
    id: "utilt-yoshi",
    isTracked: (id, characterId) =>
      id === ActionStateId.UTilt && isYoshiCharacter(characterId),
  },
  {
    id: "utilt-link",
    isTracked: (id, characterId) =>
      id === ActionStateId.UTilt && isLinkCharacter(characterId),
  },
];

/**
 * Counts how many times the port threw a tracked attack and got hit or grabbed for it - from the
 * attack's first frame through PUNISH_WINDOW_FRAMES after it ends. A hit that lands while the
 * attack is still active (interrupting it) is caught too, since the victim's own action state
 * changes to hitstun/capture on that same frame.
 */
function countPunishes(
  replay: Replay,
  port: PortIndex,
  isTracked: (actionStateId: number, characterId: number) => boolean,
): number {
  let punished = 0;
  let inAttack = false;

  for (let i = 0; i < replay.frames.length; i++) {
    const state = replay.frames[i]?.ports[port]?.state;
    if (!state) continue;
    const tracked = isTracked(state.actionStateId, state.characterId);

    if (tracked && !inAttack) {
      inAttack = true;
    } else if (!tracked && inAttack) {
      inAttack = false;
      if (isPunishedFrom(replay, port, i)) {
        punished++;
      }
    }
  }

  return punished;
}

/** Whether the port is in hitstun or captured within PUNISH_WINDOW_FRAMES of fromIndex. */
function isPunishedFrom(
  replay: Replay,
  port: PortIndex,
  fromIndex: number,
): boolean {
  const lastIndex = Math.min(
    replay.frames.length - 1,
    fromIndex + PUNISH_WINDOW_FRAMES - 1,
  );
  for (let f = fromIndex; f <= lastIndex; f++) {
    const state = replay.frames[f]?.ports[port]?.state;
    if (!state) continue;
    if (
      isHitstunState(state.actionStateId, state.hitstunCounter ?? 0) ||
      CAPTURE_STATES.has(state.actionStateId)
    ) {
      return true;
    }
  }
  return false;
}

/** Computes every registered micro stat for a port. */
export function computeMicroStats(
  replay: Replay,
  port: PortIndex,
): MicroStatCounts {
  const seated = getSeatedPorts(replay);
  if (seated.length !== 2 || !seated.includes(port)) return {};

  const result: MicroStatCounts = {};
  for (const def of MICRO_STAT_DEFINITIONS) {
    const count = countPunishes(replay, port, def.isTracked);
    if (count > 0) result[def.id] = count;
  }
  return result;
}
