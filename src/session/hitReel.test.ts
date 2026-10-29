import { describe, it, expect } from "vitest";
import type { PortIndex, Replay } from "@rmg-k/rmgr";
import type { NeutralHitEvent } from "../neutralHits.js";
import {
  hitReelClips,
  hitReelEntriesForGame,
  isBigPunish,
  sortHitReel,
  type HitReelEntry,
} from "./hitReel.js";

const YOU = 0 as PortIndex;
const THEM = 1 as PortIndex;

/** A replay where `yourActions[i]` / `theirActions[i]` is each port's action on frame i. */
function replayOf(
  yourActions: number[],
  theirActions: number[],
  yourDamage = 40,
): Replay {
  return {
    frames: yourActions.map((a, i) => ({
      frame: i,
      ports: {
        [YOU]: {
          state: {
            actionStateId: a,
            damagePercent: yourDamage,
            characterId: 0x09,
          },
        },
        [THEM]: {
          state: { actionStateId: theirActions[i] ?? 0x00a, characterId: 0x06 },
        },
      },
    })),
  } as unknown as Replay;
}

function event(over: Partial<NeutralHitEvent>): NeutralHitEvent {
  return {
    frame: 0,
    frameIndex: 0,
    kind: "neutral-hit",
    attackerPort: THEM,
    victimPort: YOU,
    hitType: "attack",
    reason: "whiff-punish",
    ...over,
  };
}

describe("hitReelEntriesForGame", () => {
  // Idle, jump squat, jump, nair (x3), landing, idle... then hit by a Yoshi fair on frame 10.
  const yours = [
    0x00a, 0x014, 0x016, 0x0d1, 0x0d1, 0x0d1, 0x01f, 0x00a, 0x00a, 0x00a, 0x028,
    0x028,
  ];
  const theirs = [...Array(10).fill(0x00a), 0x0d2, 0x0d2];
  const replay = replayOf(yours, theirs);

  it("keeps only openings you lost, with what hit you and what you were doing", () => {
    const entries = hitReelEntriesForGame(
      replay,
      [
        event({
          frameIndex: 10,
          endFrameIndex: 11,
          totalDamageDealt: 23.4,
          totalHitsLanded: 3,
          outcome: "reset",
        }),
        event({ frameIndex: 4, attackerPort: YOU, victimPort: THEM }),
      ],
      "g1",
      2,
      YOU,
    );
    expect(entries).toHaveLength(1);
    const [e] = entries;
    expect(e).toMatchObject({
      gameId: "g1",
      gameNumber: 2,
      frameIndex: 10,
      damageBefore: 40,
      damageTaken: 23,
      hitsTaken: 3,
      opponentMove: 0x0d2,
      opponentCharacterId: 0x06,
      yourCharacterId: 0x09,
      outcome: "reset",
    });
    // Last three distinct non-idle actions, oldest first; idle frames are skipped.
    expect(e!.yourLeadIn).toEqual([0x016, 0x0d1, 0x01f]);
  });

  it("names the move that hit you even when the hit frame shows a trade", () => {
    // They fair on frames 6-8, then are in DamageElec1 (0x037) on the hit frame itself.
    const trade = replayOf(
      Array(10).fill(0x00a),
      [0x00a, 0x00a, 0x00a, 0x00a, 0x00a, 0x00a, 0x0d2, 0x0d2, 0x0d2, 0x037],
    );
    const [e] = hitReelEntriesForGame(
      trade,
      [event({ frameIndex: 9 })],
      "g",
      1,
      YOU,
    );
    expect(e!.opponentMove).toBe(0x0d2);
  });

  it("clamps the clip to the game", () => {
    const [e] = hitReelEntriesForGame(
      replay,
      [event({ frameIndex: 10, endFrameIndex: 11 })],
      "g1",
      1,
      YOU,
    );
    expect(e!.clipStartFrameIndex).toBe(0);
    expect(e!.clipEndFrameIndex).toBe(yours.length - 1);
  });
});

describe("sortHitReel / hitReelClips", () => {
  const base = hitReelEntriesForGame(
    replayOf(Array(400).fill(0x00a), Array(400).fill(0x0d2)),
    [
      event({ frameIndex: 300, totalDamageDealt: 12 }),
      event({ frameIndex: 200, totalDamageDealt: 40 }),
      event({ frameIndex: 250, totalDamageDealt: 8, convertedToKill: true }),
    ],
    "g2",
    2,
    YOU,
  );
  const earlier: HitReelEntry = { ...base[0]!, gameNumber: 1, frameIndex: 900 };
  const all = [...base, earlier];

  it("orders by game, then time", () => {
    expect(
      sortHitReel(all, "chronological").map((e) => [
        e.gameNumber,
        e.frameIndex,
      ]),
    ).toEqual([
      [1, 900],
      [2, 200],
      [2, 250],
      [2, 300],
    ]);
  });

  it("puts stock losses first, then the most damage, ties in time order", () => {
    // 900 (game 1) and 300 (game 2) both took 12: the earlier game comes first.
    expect(sortHitReel(all, "costliest").map((e) => e.frameIndex)).toEqual([
      250, 200, 900, 300,
    ]);
  });

  it("counts a punish as big when it took a stock or 30%+", () => {
    expect(base.map(isBigPunish)).toEqual([false, true, true]);
  });

  it("makes one labelled clip per entry with its clamped range", () => {
    const clips = hitReelClips(base, (e) => `hit at ${e.frameIndex}`);
    expect(clips[0]).toEqual({
      gameId: "g2",
      startFrameIndex: 180,
      endFrameIndex: 345,
      label: "hit at 300",
    });
  });
});
