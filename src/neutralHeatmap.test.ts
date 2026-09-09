import { describe, it, expect } from "vitest";
import type { Frame, PortIndex, Replay } from "@rmg-k/rmgr";
import { collectHeatmapPoints } from "./neutralHeatmap.js";
import {
  renderNeutralHeatmap,
  HEATMAP_ME_COLOR,
  HEATMAP_OPPONENT_COLOR,
} from "./neutralHeatmapRenderer.js";
import { DREAM_LAND_STAGE_ID } from "./stageGeometry.js";

function makeMockReplay(frames: Frame[], seated: PortIndex[] = [0, 1]): Replay {
  const slotType = ([0, 1, 2, 3] as PortIndex[]).map((p) =>
    seated.includes(p) ? "human" : "empty",
  ) as [
    "human" | "cpu" | "empty",
    "human" | "cpu" | "empty",
    "human" | "cpu" | "empty",
    "human" | "cpu" | "empty",
  ];
  return {
    header: {
      version: 5,
      gameFamily: "smash64",
      goodName: "Super Smash Bros. (U) (V1.0) [!]",
      recorderSchemaVersion: 1,
      recordedAtEpochMillis: 1724300000000,
      uncompressedLength: 0,
      compressedLength: 0,
    },
    matchStart: {
      playerNames: ["nue", "Kurabba", "", ""],
      slotType,
    },
    matchSettings: {
      stageId: DREAM_LAND_STAGE_ID,
      gameType: 2,
      stockCountSetting: 4,
      timeLimitMinutes: 100,
      damageRatio: 100,
      itemFrequency: 0,
      teamsEnabled: false,
      handicapMode: "off",
      characterId: [5, 9, 0, 0], // Link, Pikachu
      costumeId: [0, 0, 0, 0],
      teamColor: [0, 0, 0, 0],
      portTeam: [0, 1, 0, 0],
      portHandicap: [0, 0, 0, 0],
      portCpuLevel: [0, 0, 0, 0],
    },
    frames,
    matchEnd: {
      finalFrame: frames.at(-1)?.frame ?? 0,
      endReason: "normal",
    },
    matchResult: {
      placements: [1, 2, -1, -1],
    },
  };
}

interface PortState {
  state: number;
  x: number;
  y: number;
}

function makeFrame(
  frameNumber: number,
  p0: PortState | undefined,
  p1: PortState | undefined,
): Frame {
  const post = (port: PortIndex, characterId: number, p: PortState) => ({
    input: { frame: frameNumber, port, buttons: 0, stickX: 0, stickY: 0 },
    state: {
      frame: frameNumber,
      port,
      characterId,
      actionStateId: p.state,
      positionX: p.x,
      positionY: p.y,
      facingDirection: 1 as const,
      velocityX: 0,
      velocityY: 0,
      damagePercent: 0,
      stocksRemaining: 3,
      jumpsRemaining: 0,
      grounded: true,
      hurtboxState: 0,
      hitstunCounter: 0,
      actionFrameCounter: 0,
      comboHitCount: 0,
      comboDamage: 0,
    },
  });

  const ports: Record<number, unknown> = {};
  if (p0) ports[0] = post(0 as PortIndex, 5, p0);
  if (p1) ports[1] = post(1 as PortIndex, 9, p1);

  return {
    frame: frameNumber,
    ports: ports as unknown as Frame["ports"],
  };
}

// Action state 0x005 = Entry (spawn descent) — see RESPAWN_STATES in
// src/angelInvincibility.ts. A single frame in this state, followed by a
// frame out of it, produces one "angel-entered" event at the entry frame
// plus a resolve event 120 frames later; we only need the entry frame here.
const IDLE = 0x00a;
const ENTRY = 0x005;

describe("collectHeatmapPoints", () => {
  it("collects both ports' positions for every frame when the toggle is off", () => {
    const frames = [
      makeFrame(0, { state: IDLE, x: 0, y: 0 }, { state: IDLE, x: 100, y: 0 }),
      makeFrame(1, { state: IDLE, x: 10, y: 0 }, { state: IDLE, x: 110, y: 0 }),
    ];
    const replay = makeMockReplay(frames);

    const result = collectHeatmapPoints(
      replay,
      0 as PortIndex,
      1 as PortIndex,
      false,
    );

    expect(result.perspective).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(result.opponent).toEqual([
      { x: 100, y: 0 },
      { x: 110, y: 0 },
    ]);
  });

  it("skips a frame where a port has no state (not seated yet that frame)", () => {
    const frames = [
      makeFrame(0, { state: IDLE, x: 0, y: 0 }, undefined),
      makeFrame(1, { state: IDLE, x: 10, y: 0 }, { state: IDLE, x: 110, y: 0 }),
    ];
    const replay = makeMockReplay(frames);

    const result = collectHeatmapPoints(
      replay,
      0 as PortIndex,
      1 as PortIndex,
      false,
    );

    expect(result.perspective).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(result.opponent).toEqual([{ x: 110, y: 0 }]);
  });

  it("with the toggle on, includes perspective frames when opponent respawns and opponent frames when perspective respawns", () => {
    const frames: Frame[] = [];
    // Frames 0-4: neither player respawning - outside any window.
    for (let f = 0; f < 5; f++) {
      frames.push(
        makeFrame(
          f,
          { state: IDLE, x: 0, y: 0 },
          { state: IDLE, x: 999, y: 999 },
        ),
      );
    }
    // Frame 5: opponent (port 1) enters respawn platform - window for perspective points.
    frames.push(
      makeFrame(5, { state: IDLE, x: 1, y: 0 }, { state: ENTRY, x: 200, y: 0 }),
    );
    // Frame 6: still within the 300-frame window after opponent respawn (5 to 304).
    frames.push(
      makeFrame(6, { state: IDLE, x: 2, y: 0 }, { state: IDLE, x: 201, y: 0 }),
    );
    // Frame 305: outside opponent's respawn window (5 + 300 = 305).
    // Here, perspective (port 0) enters respawn platform - window for opponent points.
    frames.push(
      makeFrame(
        305,
        { state: ENTRY, x: 300, y: 0 },
        { state: IDLE, x: 50, y: 0 },
      ),
    );
    // Frame 306: within 300-frame window after perspective respawn (305 to 604).
    frames.push(
      makeFrame(
        306,
        { state: IDLE, x: 301, y: 0 },
        { state: IDLE, x: 51, y: 0 },
      ),
    );
    const replay = makeMockReplay(frames);

    const result = collectHeatmapPoints(
      replay,
      0 as PortIndex,
      1 as PortIndex,
      true,
    );

    // perspective (port 0) collected only after opponent respawned (frames 5 and 6)
    expect(result.perspective).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
    // opponent (port 1) collected only after perspective respawned (frames 305 and 306)
    expect(result.opponent).toEqual([
      { x: 50, y: 0 },
      { x: 51, y: 0 },
    ]);
  });

  it("does not double-count a frame covered by two overlapping angel-invincibility windows", () => {
    const frames: Frame[] = [];
    // Frame 0: opponent enters respawn (window A: frames 0-299).
    frames.push(
      makeFrame(0, { state: IDLE, x: 1, y: 0 }, { state: ENTRY, x: 200, y: 0 }),
    );
    // Frame 1: opponent drops off platform then immediately re-enters
    // (window B: frames 2-301) - overlaps window A over frames 2-299.
    frames.push(
      makeFrame(1, { state: IDLE, x: 2, y: 0 }, { state: IDLE, x: 201, y: 0 }),
    );
    frames.push(
      makeFrame(2, { state: IDLE, x: 3, y: 0 }, { state: ENTRY, x: 202, y: 0 }),
    );

    const replay = makeMockReplay(frames);
    const result = collectHeatmapPoints(
      replay,
      0 as PortIndex,
      1 as PortIndex,
      true,
    );

    // Frame index 2 must appear exactly once, not twice.
    expect(result.perspective).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it("returns empty arrays for a non-1v1 replay (3 seated ports) regardless of the toggle", () => {
    const frames = [
      {
        frame: 0,
        ports: {
          0: {
            input: { frame: 0, port: 0, buttons: 0, stickX: 0, stickY: 0 },
            state: {
              frame: 0,
              port: 0,
              characterId: 5,
              actionStateId: IDLE,
              positionX: 0,
              positionY: 0,
              facingDirection: 1 as const,
              velocityX: 0,
              velocityY: 0,
              damagePercent: 0,
              stocksRemaining: 3,
              jumpsRemaining: 0,
              grounded: true,
              hurtboxState: 0,
              hitstunCounter: 0,
              actionFrameCounter: 0,
              comboHitCount: 0,
              comboDamage: 0,
            },
          },
        },
      } as unknown as Frame,
    ];
    const replay = makeMockReplay(frames, [0, 1, 2] as PortIndex[]);

    const resultOff = collectHeatmapPoints(
      replay,
      0 as PortIndex,
      1 as PortIndex,
      false,
    );
    const resultOn = collectHeatmapPoints(
      replay,
      0 as PortIndex,
      1 as PortIndex,
      true,
    );

    expect(resultOff).toEqual({ perspective: [], opponent: [] });
    expect(resultOn).toEqual({ perspective: [], opponent: [] });
  });
});

describe("renderNeutralHeatmap", () => {
  it("draws using blue (HEATMAP_ME_COLOR) when target is me and ignores opponent points", () => {
    const fillStyles: string[] = [];
    let fillRectCalls = 0;
    const fakeCtx = {
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillRect: () => {
        fillRectCalls++;
        fillStyles.push(fakeCtx.fillStyle);
      },
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      globalAlpha: 1,
    };
    const fakeCanvas = {
      getContext: () => fakeCtx,
      width: 600,
      height: 360,
    } as unknown as HTMLCanvasElement;

    renderNeutralHeatmap(
      fakeCanvas,
      DREAM_LAND_STAGE_ID,
      {
        perspective: [{ x: 0, y: 0 }],
        opponent: [{ x: 100, y: 0 }],
      },
      "me",
    );

    expect(fillRectCalls).toBe(9);
    expect(fakeCtx.fillStyle).toBe(HEATMAP_ME_COLOR);
    expect(fillStyles).toContain(HEATMAP_ME_COLOR);
    expect(fillStyles).not.toContain(HEATMAP_OPPONENT_COLOR);
  });

  it("draws using red (HEATMAP_OPPONENT_COLOR) when target is opponent and hides perspective character", () => {
    const fillStyles: string[] = [];
    let fillRectCalls = 0;
    const fakeCtx = {
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillRect: () => {
        fillRectCalls++;
        fillStyles.push(fakeCtx.fillStyle);
      },
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      globalAlpha: 1,
    };
    const fakeCanvas = {
      getContext: () => fakeCtx,
      width: 600,
      height: 360,
    } as unknown as HTMLCanvasElement;

    renderNeutralHeatmap(
      fakeCanvas,
      DREAM_LAND_STAGE_ID,
      {
        perspective: [{ x: 0, y: 0 }],
        opponent: [{ x: 100, y: 0 }],
      },
      "opponent",
    );

    expect(fillRectCalls).toBe(9);
    expect(fakeCtx.fillStyle).toBe(HEATMAP_OPPONENT_COLOR);
    expect(fillStyles).toContain(HEATMAP_OPPONENT_COLOR);
    expect(fillStyles).not.toContain(HEATMAP_ME_COLOR);
  });

  it("brightens overlapping squares when points are close to each other", () => {
    const alphas: number[] = [];
    const fakeCtx = {
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillRect: () => {
        alphas.push(fakeCtx.globalAlpha);
      },
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      globalAlpha: 1,
    };
    const fakeCanvas = {
      getContext: () => fakeCtx,
      width: 600,
      height: 360,
    } as unknown as HTMLCanvasElement;

    // Two points 1 cell width apart horizontally
    renderNeutralHeatmap(
      fakeCanvas,
      DREAM_LAND_STAGE_ID,
      {
        perspective: [
          { x: 0, y: 0 },
          { x: 150, y: 0 },
        ],
        opponent: [],
      },
      "me",
    );

    // Some cells overlap and have higher weight than isolated peripheral cells
    expect(alphas.length).toBeGreaterThan(9);
    const maxAlpha = Math.max(...alphas);
    const minAlpha = Math.min(...alphas);
    expect(maxAlpha).toBeCloseTo(1, 1);
    expect(minAlpha).toBeLessThan(maxAlpha);
  });
});

describe("neutralHeatmap i18n", () => {
  it("provides correct English and Japanese labels including dynamic angel toggle labels", async () => {
    const { TRANSLATIONS } = await import("./i18n.js");
    const en = TRANSLATIONS.en;
    const ja = TRANSLATIONS.ja;

    expect(en.neutralHeatmapTitle).toBe("Neutral Heatmap");
    expect(en.neutralHeatmapCollapseTitle).toBe(
      "Collapse / expand Neutral Heatmap",
    );
    expect(en.neutralHeatmapTargetMe).toBe("Me");
    expect(en.neutralHeatmapTargetOpponent).toBe("Opponent");
    expect(en.neutralHeatmapAngelToggleLabelMe).toBe(
      "Only first 5s after opponent respawns (angel invincibility)",
    );
    expect(en.neutralHeatmapAngelToggleLabelOpponent).toBe(
      "Only first 5s after I respawn (angel invincibility)",
    );

    expect(ja.neutralHeatmapTitle).toBe("ニュートラルヒートマップ");
    expect(ja.neutralHeatmapCollapseTitle).toBe(
      "ニュートラルヒートマップの折りたたみ / 展開",
    );
    expect(ja.neutralHeatmapTargetMe).toBe("自分");
    expect(ja.neutralHeatmapTargetOpponent).toBe("相手");
    expect(ja.neutralHeatmapAngelToggleLabelMe).toBe(
      "相手のリスポーン無敵時間の最初の5秒のみ表示",
    );
    expect(ja.neutralHeatmapAngelToggleLabelOpponent).toBe(
      "自分のリスポーン無敵時間の最初の5秒のみ表示",
    );
  });
});
