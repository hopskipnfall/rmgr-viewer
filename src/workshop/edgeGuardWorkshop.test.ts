import { describe, it, expect } from "vitest";
import { parseRoute, navigateToEdgeGuardWorkshop } from "../router.js";
import {
  extractEdgeGuardSituations,
  filterEdgeGuardSituations,
  type EdgeGuardSituationData,
  type EdgeGuardFilterState,
} from "./edgeGuardData.js";
import { EdgeGuardCanvas } from "./edgeGuardCanvas.js";
import { DREAM_LAND_STAGE_ID } from "../stageGeometry.js";
import type { Replay } from "@rmg-k/rmgr";
import type { GameSummary } from "../data/gameSummary.js";

import { recoveriesHash } from "../router.js";

describe("Edge Guard Workshop Route", () => {
  it("parses recoveries route correctly from hash", () => {
    const route = parseRoute("#/matchup/0/3/recoveries");
    expect(route).toEqual({
      view: "edgeGuardWorkshop",
      myChar: 0,
      oppChar: 3,
      filters: {},
    });
  });

  it("parses legacy /workshop route as alias (backward compat)", () => {
    const route = parseRoute("#/matchup/0/3/workshop");
    expect(route).toEqual({
      view: "edgeGuardWorkshop",
      myChar: 0,
      oppChar: 3,
      filters: {},
    });
  });

  it("parses filter params from recoveries URL", () => {
    const route = parseRoute(
      "#/matchup/9/8/recoveries?jumps=0&outcome=success&recency=month",
    );
    expect(route).toEqual({
      view: "edgeGuardWorkshop",
      myChar: 9,
      oppChar: 8,
      filters: { jumps: 0, outcome: "success", recency: "month" },
    });
  });

  it("generates hash correctly via navigateToEdgeGuardWorkshop", () => {
    const originalWindow = (
      globalThis as unknown as { window?: { location: { hash: string } } }
    ).window;
    (
      globalThis as unknown as { window: { location: { hash: string } } }
    ).window = {
      location: { hash: "" },
    };

    navigateToEdgeGuardWorkshop(1, 9);
    expect(
      (globalThis as unknown as { window: { location: { hash: string } } })
        .window.location.hash,
    ).toBe("#/matchup/1/9/recoveries");

    (globalThis as unknown as { window?: unknown }).window = originalWindow;
  });

  it("recoveriesHash encodes non-default filters in query string", () => {
    expect(recoveriesHash(9, 8, { jumps: 1, outcome: "fail" })).toBe(
      "#/matchup/9/8/recoveries?jumps=1&outcome=fail",
    );
    expect(recoveriesHash(9, 8, {})).toBe("#/matchup/9/8/recoveries");
    expect(recoveriesHash(9, 8, { jumps: "all", outcome: "all" })).toBe(
      "#/matchup/9/8/recoveries",
    );
  });
});

describe("Edge Guard Data Extraction & Mirroring", () => {
  function makeMockReplay(
    leftX: number,
    isFail: boolean,
    jumpsRemaining = 2,
    damage = 45,
  ): Replay {
    const frames: unknown[] = [];

    // Frame 0: Both actionable on stage
    frames.push({
      frame: 0,
      ports: {
        0: {
          state: {
            positionX: 0,
            positionY: 0,
            actionStateId: 10,
            hitstunCounter: 0,
            stocksRemaining: 4,
            damagePercent: 0,
            grounded: true,
            facingDirection: 1,
            jumpsRemaining: 2,
          },
        },
        1: {
          state: {
            positionX: 500,
            positionY: 0,
            actionStateId: 10,
            hitstunCounter: 0,
            stocksRemaining: 4,
            damagePercent: 0,
            grounded: true,
            facingDirection: -1,
            jumpsRemaining: 2,
          },
        },
      },
    });

    // Frame 1: Opponent hit into hitstun (0x025 = 37, DamageFlyHigh)
    frames.push({
      frame: 1,
      ports: {
        0: {
          state: {
            positionX: 500,
            positionY: 0,
            actionStateId: 10,
            hitstunCounter: 0,
            stocksRemaining: 4,
            damagePercent: 0,
            grounded: true,
            facingDirection: 1,
            jumpsRemaining: 2,
          },
        },
        1: {
          state: {
            positionX: leftX,
            positionY: 500,
            actionStateId: 0x025, // Valid hitstun state
            hitstunCounter: 20,
            stocksRemaining: 4,
            damagePercent: damage,
            grounded: false,
            facingDirection: 1,
            jumpsRemaining,
          },
        },
      },
    });

    // Frame 2: Hitstun ends while offstage -> situation entered!
    frames.push({
      frame: 2,
      ports: {
        0: {
          state: {
            positionX: 1000,
            positionY: 0,
            actionStateId: 10,
            hitstunCounter: 0,
            stocksRemaining: 4,
            damagePercent: 0,
            grounded: true,
            facingDirection: 1,
            jumpsRemaining: 2,
          },
        },
        1: {
          state: {
            positionX: leftX,
            positionY: 400,
            actionStateId: 24, // Fall / actionable airborne
            hitstunCounter: 0,
            stocksRemaining: 4,
            damagePercent: damage,
            grounded: false,
            facingDirection: leftX < 0 ? 1 : -1,
            jumpsRemaining,
          },
        },
      },
    });

    // Frame 3: Resolution
    if (isFail) {
      // Recovery failure (opponent lost stock) -> edge guard SUCCEEDED
      frames.push({
        frame: 3,
        ports: {
          0: {
            state: {
              positionX: 1000,
              positionY: 0,
              actionStateId: 10,
              hitstunCounter: 0,
              stocksRemaining: 4,
              damagePercent: 0,
              grounded: true,
              facingDirection: 1,
              jumpsRemaining: 2,
            },
          },
          1: {
            state: {
              positionX: leftX,
              positionY: -3600, // Died past bottom blast zone
              actionStateId: 0,
              hitstunCounter: 0,
              stocksRemaining: 3, // Lost stock
              damagePercent: 0,
              grounded: false,
              facingDirection: 1,
              jumpsRemaining: 0,
            },
          },
        },
      });
    } else {
      // Recovery success (grabbed ledge, 0x054 = CliffCatch) -> edge guard FAILED
      frames.push({
        frame: 3,
        ports: {
          0: {
            state: {
              positionX: 1000,
              positionY: 0,
              actionStateId: 10,
              hitstunCounter: 0,
              stocksRemaining: 4,
              damagePercent: 0,
              grounded: true,
              facingDirection: 1,
              jumpsRemaining: 2,
            },
          },
          1: {
            state: {
              positionX: 2318,
              positionY: 0,
              actionStateId: 0x054, // CliffCatch / ledge grab
              hitstunCounter: 0,
              stocksRemaining: 4,
              damagePercent: damage,
              grounded: false,
              facingDirection: -1,
              jumpsRemaining: 0,
            },
          },
        },
      });
    }

    return {
      matchSettings: {
        stageId: DREAM_LAND_STAGE_ID,
      },
      frames,
    } as unknown as Replay;
  }

  const mockSummary: GameSummary = {
    id: "game-123",
    sourceName: "match.rmgr",
    recordedAt: new Date("2024-05-15T12:00:00Z"),
    stageId: DREAM_LAND_STAGE_ID,
    frameCount: 4,
    isComplete: true,
    ports: [
      {
        port: 0,
        playerName: "PlayerOne",
        characterId: 0,
        finalStocks: 4,
      },
      {
        port: 1,
        playerName: "OpponentFox",
        characterId: 3,
        finalStocks: 3,
      },
    ],
    statsByPort: {},
    fileRef: null,
  };

  it("flips left-side recovery positions across x = 0 to positive X", () => {
    // leftX = -3200 (left of stage)
    const replay = makeMockReplay(-3200, true, 3, 62);
    const situations = extractEdgeGuardSituations(
      replay,
      mockSummary,
      0,
      1,
      "sess-1",
    );

    expect(situations).toHaveLength(1);
    const sit = situations[0]!;
    expect(sit.wasLeft).toBe(true);
    expect(sit.rawStartX).toBe(-3200);
    expect(sit.startX).toBe(3200); // Flipped across x = 0
    expect(sit.startY).toBe(400);
    expect(sit.outcome).toBe("success"); // Opponent died -> edge guard succeeded (Blue KO)
    expect(sit.jumpsAtEntry).toBe(3);
    expect(sit.damageAtEntry).toBe(62);
    expect(sit.sessionId).toBe("sess-1");

    // Trajectory x points must also be mirrored
    expect(sit.trajectory[0]!.x).toBe(3200);
  });

  it("keeps right-side recovery positions on positive X without flipping", () => {
    // rightX = 3500 (right of stage)
    const replay = makeMockReplay(3500, false, 1, 80);
    const situations = extractEdgeGuardSituations(replay, mockSummary, 0, 1);

    expect(situations).toHaveLength(1);
    const sit = situations[0]!;
    expect(sit.wasLeft).toBe(false);
    expect(sit.rawStartX).toBe(3500);
    expect(sit.startX).toBe(3500);
    expect(sit.outcome).toBe("fail"); // Opponent grabbed ledge -> edge guard failed (Red Safe)
    expect(sit.jumpsAtEntry).toBe(1);
    expect(sit.damageAtEntry).toBe(80);
  });

  it("ignores non-Dream Land stages", () => {
    const replay = makeMockReplay(3500, true);
    (replay.matchSettings as unknown as { stageId: number }).stageId = 4; // Sector Z or Peach's Castle
    const situations = extractEdgeGuardSituations(replay, mockSummary, 0, 1);
    expect(situations).toHaveLength(0);
  });

  it("preserves jumps remaining when jump is consumed on the entry frame", () => {
    // In frame 1 (hitstun), jumpsRemaining = 1.
    // In frame 2 (situation entered), player executes aerial jump (JumpAerialF 0x18), so jumpsRemaining = 0.
    // The extraction must attribute the 1 jump to jumpsAtEntry.
    const replay = makeMockReplay(3500, true, 1, 100);
    const frame2 = replay.frames[2]!;
    const state = frame2.ports[1]!.state as unknown as {
      jumpsRemaining: number;
      actionStateId: number;
    };
    state.jumpsRemaining = 0;
    state.actionStateId = 0x18;

    const situations = extractEdgeGuardSituations(replay, mockSummary, 0, 1);
    expect(situations).toHaveLength(1);
    expect(situations[0]!.jumpsAtEntry).toBe(1);
  });

  it("excludes situations where the recovering player is DEAD/dying at entry", () => {
    // Simulate a situation-entered that opens while port 1 is in DeadDown (0x000).
    // This can happen at timing edges in computeEdgeGuardEvents; such windows
    // are not genuine edge-guard opportunities and should be filtered out.
    const replay = makeMockReplay(3500, true, 2, 80);
    // Overwrite the action state on frame 2 (the situation-entered frame) to DeadDown.
    const frame2 = replay.frames[2]!;
    const state = frame2.ports[1]!.state as unknown as {
      actionStateId: number;
    };
    state.actionStateId = 0x000; // DeadDown — member of DEAD_OR_RESPAWNING_STATES

    const situations = extractEdgeGuardSituations(replay, mockSummary, 0, 1);
    expect(situations).toHaveLength(0);
  });

  it("excludes situations where classify() returns dead at entry (character falling below blast zone)", () => {
    // Simulate the Link / J-Linker case: character is still in Fall action state (not a post-KO
    // state), but is already below the lower blast zone with no jumps — classify() says "dead".
    // Fox (characterId 0x01) is a supported character. We put him at y = -3000 (well below the
    // lower blast zone at -2233) with 0 jumps and downward velocity so that classify() must
    // return "dead".
    const replay = makeMockReplay(3500, true, 0, 90);
    // Set the recovering player's character to Fox (0x01) in the summary used for this test.
    const foxSummary = {
      ...mockSummary,
      ports: [
        { ...mockSummary.ports[0]! },
        { ...mockSummary.ports[1]!, characterId: 0x01 },
      ],
    };
    // Overwrite the entry frame (frame 2) so Fox is falling below the blast zone.
    const frame2 = replay.frames[2]!;
    const state = frame2.ports[1]!.state as unknown as {
      positionX: number;
      positionY: number;
      velocityX: number;
      velocityY: number;
      jumpsRemaining: number;
      actionStateId: number;
      characterId: number;
    };
    state.positionX = 3500;
    state.positionY = -3000; // Well below the lower blast zone
    state.velocityX = 0;
    state.velocityY = -50; // Falling fast
    state.jumpsRemaining = 0;
    state.actionStateId = 24; // Fall — NOT a dead action state
    state.characterId = 0x01; // Fox

    const situations = extractEdgeGuardSituations(
      replay,
      foxSummary as typeof mockSummary,
      0,
      1,
    );
    expect(situations).toHaveLength(0);
  });
});

describe("Edge Guard Situation Filtering", () => {
  const sampleSituations: EdgeGuardSituationData[] = [
    {
      id: "sit-1",
      gameId: "g1",
      gameDate: "2024-05-10T00:00:00Z",
      timestamp: Date.parse("2024-05-10T00:00:00Z"),
      opponentName: "Alice",
      sessionId: "s1",
      startFrameIndex: 100,
      endFrameIndex: 200,
      recoveringPort: 1,
      edgeGuardingPort: 0,
      recoveringCharId: 3,
      edgeGuardingCharId: 0,
      outcome: "success",
      effectivenessTier: "kill",
      edgeGuarderWasHit: false,
      startX: 2800,
      startY: -400,
      rawStartX: -2800,
      wasLeft: true,
      jumpsAtEntry: 0,
      stocksRemaining: 4,
      damageAtEntry: 80,
      trajectory: [],
    },
    {
      id: "sit-2",
      gameId: "g2",
      gameDate: "2024-05-12T00:00:00Z",
      timestamp: Date.parse("2024-05-12T00:00:00Z"),
      opponentName: "Bob",
      sessionId: "s2",
      startFrameIndex: 300,
      endFrameIndex: 450,
      recoveringPort: 1,
      edgeGuardingPort: 0,
      recoveringCharId: 3,
      edgeGuardingCharId: 0,
      outcome: "fail",
      effectivenessTier: "no-damage",
      edgeGuarderWasHit: false,
      startX: 3200,
      startY: 1200,
      rawStartX: 3200,
      wasLeft: false,
      jumpsAtEntry: 2,
      stocksRemaining: 3,
      damageAtEntry: 40,
      trajectory: [],
    },
    {
      id: "sit-3",
      gameId: "g3",
      gameDate: "2024-01-01T00:00:00Z",
      timestamp: Date.parse("2024-01-01T00:00:00Z"),
      opponentName: "Bob",
      sessionId: "s1",
      startFrameIndex: 50,
      endFrameIndex: 120,
      recoveringPort: 1,
      edgeGuardingPort: 0,
      recoveringCharId: 3,
      edgeGuardingCharId: 0,
      outcome: "success",
      effectivenessTier: "kill",
      edgeGuarderWasHit: false,
      startX: 4000,
      startY: 500,
      rawStartX: 4000,
      wasLeft: false,
      jumpsAtEntry: 5,
      stocksRemaining: 2,
      damageAtEntry: 110,
      trajectory: [],
    },
  ];

  const defaultFilters: EdgeGuardFilterState = {
    jumps: "all",
    opponent: "all",
    session: "all",
    recency: "all",
    sinceDate: undefined,
    outcome: "all",
  };

  it("filters by outcome", () => {
    const successOnly = filterEdgeGuardSituations(sampleSituations, {
      ...defaultFilters,
      outcome: "success",
    });
    expect(successOnly.map((s) => s.id)).toEqual(["sit-1", "sit-3"]);

    const failOnly = filterEdgeGuardSituations(sampleSituations, {
      ...defaultFilters,
      outcome: "fail",
    });
    expect(failOnly.map((s) => s.id)).toEqual(["sit-2"]);
  });

  it("filters by jumps count including 5+", () => {
    const zeroJumps = filterEdgeGuardSituations(sampleSituations, {
      ...defaultFilters,
      jumps: 0,
    });
    expect(zeroJumps.map((s) => s.id)).toEqual(["sit-1"]);

    const twoJumps = filterEdgeGuardSituations(sampleSituations, {
      ...defaultFilters,
      jumps: 2,
    });
    expect(twoJumps.map((s) => s.id)).toEqual(["sit-2"]);

    const fiveOrMore = filterEdgeGuardSituations(sampleSituations, {
      ...defaultFilters,
      jumps: 5,
    });
    expect(fiveOrMore.map((s) => s.id)).toEqual(["sit-3"]);
  });

  it("filters by opponent and session", () => {
    const bobOnly = filterEdgeGuardSituations(sampleSituations, {
      ...defaultFilters,
      opponent: "Bob",
    });
    expect(bobOnly.map((s) => s.id)).toEqual(["sit-2", "sit-3"]);

    const session1Only = filterEdgeGuardSituations(sampleSituations, {
      ...defaultFilters,
      session: "s1",
    });
    expect(session1Only.map((s) => s.id)).toEqual(["sit-1", "sit-3"]);
  });

  it("filters by sinceDate", () => {
    const sinceMay = filterEdgeGuardSituations(sampleSituations, {
      ...defaultFilters,
      recency: "since",
      sinceDate: "2024-05-01",
    });
    expect(sinceMay.map((s) => s.id)).toEqual(["sit-1", "sit-2"]);
  });
});

describe("EdgeGuardCanvas Coordinate Transforms", () => {
  it("converts world coordinates to screen coordinates and preserves orientation", () => {
    const mockCtx = {
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      closePath: () => {},
      save: () => {},
      restore: () => {},
      setLineDash: () => {},
      fillText: () => {},
      arc: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
    };
    const mockCanvas = {
      width: 800,
      height: 600,
      getContext: () => mockCtx,
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      }),
      addEventListener: () => {},
      style: {},
    } as unknown as HTMLCanvasElement;

    const egCanvas = new EdgeGuardCanvas(mockCanvas);
    egCanvas.resize();

    // Stage center (x = 0, y = 0)
    const s0 = egCanvas.worldToScreen(0, 0);
    // Right blast zone (x = 9000, y = 0)
    const sRight = egCanvas.worldToScreen(9000, 0);
    // Upper blast zone (x = 0, y = 8300)
    const sTop = egCanvas.worldToScreen(0, 8300);

    // Screen X should increase going to the right
    expect(sRight.x).toBeGreaterThan(s0.x);

    // Screen Y should decrease (move towards top of screen) as world Y increases
    expect(sTop.y).toBeLessThan(s0.y);

    // Coordinate conversion reversibility: screenToWorld(worldToScreen(x, y)) ~= (x, y)
    const w = egCanvas.screenToWorld(s0.x, s0.y);
    expect(Math.round(w.x)).toBe(0);
    expect(Math.round(w.y)).toBe(0);
  });
});
