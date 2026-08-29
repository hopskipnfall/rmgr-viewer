import { describe, it, expect, beforeEach } from "vitest";
import {
  parseYouTubeTimestamp,
  parseYouTubeUrl,
  frameToVideoTime,
  videoTimeToFrame,
  formatVideoTime,
  loadVideoLink,
  saveVideoLink,
  deleteVideoLink,
  hasVideoLink,
  isRealtimeSession,
  propagateVideoLinkToSession,
  isOffsetManual,
  recomputeInferredOffsets,
  attachVideoToSession,
  clearVideoOffsetOverride,
  unlinkVideoFromSession,
  YouTubeSyncController,
  type VideoLinkData,
  type VideoViewMode,
  type SessionGameInfo,
} from "./youtubeSync.js";

describe("parseYouTubeTimestamp", () => {
  it("parses plain seconds", () => {
    expect(parseYouTubeTimestamp("90")).toBe(90);
    expect(parseYouTubeTimestamp("45.5")).toBe(45.5);
  });

  it("parses mm:ss and hh:mm:ss timestamps", () => {
    expect(parseYouTubeTimestamp("1:30")).toBe(90);
    expect(parseYouTubeTimestamp("01:02:03")).toBe(3723);
  });

  it("parses compound h/m/s strings", () => {
    expect(parseYouTubeTimestamp("1h2m3s")).toBe(3723);
    expect(parseYouTubeTimestamp("2m15s")).toBe(135);
    expect(parseYouTubeTimestamp("45s")).toBe(45);
  });

  it("handles empty or invalid inputs gracefully", () => {
    expect(parseYouTubeTimestamp("")).toBe(0);
    expect(parseYouTubeTimestamp("invalid")).toBe(0);
  });
});

describe("parseYouTubeUrl", () => {
  it("parses standard watch URLs with video IDs and timestamps", () => {
    const res = parseYouTubeUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s",
    );
    expect(res).not.toBeNull();
    expect(res?.videoId).toBe("dQw4w9WgXcQ");
    expect(res?.startSeconds).toBe(90);
  });

  it("parses youtu.be shortlinks", () => {
    const res = parseYouTubeUrl("https://youtu.be/dQw4w9WgXcQ?t=45");
    expect(res).not.toBeNull();
    expect(res?.videoId).toBe("dQw4w9WgXcQ");
    expect(res?.startSeconds).toBe(45);
  });

  it("parses embed URLs with start parameter", () => {
    const res = parseYouTubeUrl(
      "https://www.youtube.com/embed/dQw4w9WgXcQ?start=120",
    );
    expect(res).not.toBeNull();
    expect(res?.videoId).toBe("dQw4w9WgXcQ");
    expect(res?.startSeconds).toBe(120);
  });

  it("parses shorts URLs", () => {
    const res = parseYouTubeUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ");
    expect(res).not.toBeNull();
    expect(res?.videoId).toBe("dQw4w9WgXcQ");
    expect(res?.startSeconds).toBe(0);
  });

  it("parses raw 11-character video IDs", () => {
    const res = parseYouTubeUrl("dQw4w9WgXcQ");
    expect(res).not.toBeNull();
    expect(res?.videoId).toBe("dQw4w9WgXcQ");
    expect(res?.startSeconds).toBe(0);
  });

  it("returns null for invalid inputs", () => {
    expect(parseYouTubeUrl("")).toBeNull();
    expect(parseYouTubeUrl("https://google.com")).toBeNull();
    expect(parseYouTubeUrl("not-a-video-id")).toBeNull();
  });
});

describe("frameToVideoTime & videoTimeToFrame", () => {
  it("converts replay frames to video seconds correctly", () => {
    // Frame 0 at 10s offset -> 10.0s
    expect(frameToVideoTime(0, 10)).toBe(10);
    // Frame 60 (1s) at 10s offset -> 11.0s
    expect(frameToVideoTime(60, 10)).toBe(11);
    // Negative offset clamped to 0
    expect(frameToVideoTime(0, -5)).toBe(0);
  });

  it("converts video seconds to replay frames correctly", () => {
    // 10s video time at 10s offset -> Frame 0
    expect(videoTimeToFrame(10, 10)).toBe(0);
    // 11s video time at 10s offset -> Frame 60
    expect(videoTimeToFrame(11, 10)).toBe(60);
    // Before offset clamped to frame 0
    expect(videoTimeToFrame(5, 10)).toBe(0);
  });
});

describe("formatVideoTime", () => {
  it("formats positive and negative seconds correctly", () => {
    expect(formatVideoTime(0)).toBe("0:00.00");
    expect(formatVideoTime(83.45)).toBe("1:23.45");
    expect(formatVideoTime(-5.25)).toBe("-0:05.25");
  });
});

describe("localStorage persistence", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    };
    (
      globalThis as unknown as { localStorage: typeof mockStorage }
    ).localStorage = mockStorage;
  });

  it("saves, loads, and deletes video link data", () => {
    const replayId = "test-replay-123";
    const data: VideoLinkData = {
      videoId: "dQw4w9WgXcQ",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      offsetSeconds: 15.5,
      viewMode: "video-pip",
    };

    expect(loadVideoLink(replayId)).toBeNull();

    saveVideoLink(replayId, data);
    const loaded = loadVideoLink(replayId);
    expect(loaded).not.toBeNull();
    expect(loaded?.videoId).toBe("dQw4w9WgXcQ");
    expect(loaded?.offsetSeconds).toBe(15.5);
    expect(loaded?.viewMode).toBe("video-pip");

    deleteVideoLink(replayId);
    expect(loadVideoLink(replayId)).toBeNull();
  });

  it("defaults to Replay 🔊 ('canvas') when stored data has no viewMode", () => {
    const replayId = "test-replay-no-mode";
    localStorage.setItem(
      "rmgr_yt_link_" + replayId,
      JSON.stringify({
        videoId: "dQw4w9WgXcQ",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        offsetSeconds: 0,
      }),
    );
    expect(loadVideoLink(replayId)?.viewMode).toBe("canvas");
    deleteVideoLink(replayId);
  });
});

describe("YouTubeSyncController", () => {
  it("initializes and updates link data and view modes", () => {
    let modeState: VideoViewMode = "canvas";
    let linkState: VideoLinkData | null = null;
    const currentFrame = 120;

    const controller = new YouTubeSyncController(
      "testContainer",
      () => currentFrame,
      () => {},
      () => {},
      (m: VideoViewMode) => {
        modeState = m;
      },
      (l: VideoLinkData | null) => {
        linkState = l;
      },
    );

    expect(controller.getLinkData()).toBeNull();

    controller.setReplay("test-replay-1");
    const data: VideoLinkData = {
      videoId: "dQw4w9WgXcQ",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      offsetSeconds: 10,
      viewMode: "video-pip",
    };

    controller.setLinkData(data);
    expect(controller.getLinkData()).toEqual(data);
    expect(modeState).toBe("video-pip");
    expect(linkState).toEqual(data);

    // Nudge offset +1s
    controller.nudgeOffset(1, currentFrame);
    expect(controller.getLinkData()?.offsetSeconds).toBe(11);

    // Change view mode
    controller.setViewMode("video-only");
    expect(controller.getLinkData()?.viewMode).toBe("video-only");
    expect(modeState).toBe("video-only");

    // Replay 🔇: distinct from Replay 🔊 ("canvas"), no player crash without
    // a real YT player attached in this test environment.
    controller.setViewMode("canvas-muted");
    expect(controller.getLinkData()?.viewMode).toBe("canvas-muted");
    expect(modeState).toBe("canvas-muted");

    // Unload
    controller.unloadVideo();
    expect(controller.getLinkData()).toBeNull();
    expect(modeState).toBe("canvas");
    expect(linkState).toBeNull();
  });
});

describe("isRealtimeSession", () => {
  it("detects real-time recording sessions", () => {
    const baseTime = new Date("2026-08-25T12:00:00Z");
    const games = [
      {
        id: "g1",
        recordedAt: baseTime,
        frameCount: 6000, // 100 seconds
      },
      {
        id: "g2",
        recordedAt: new Date(baseTime.getTime() + 130 * 1000), // 130s later (> 100s)
        frameCount: 4800, // 80 seconds
      },
      {
        id: "g3",
        recordedAt: new Date(baseTime.getTime() + 240 * 1000), // 110s later (> 80s)
        frameCount: 5400,
      },
    ];

    expect(isRealtimeSession(games)).toBe(true);
  });

  it("detects batch-exported non-realtime sessions", () => {
    const baseTime = new Date("2026-08-25T12:00:00Z");
    const games = [
      {
        id: "g1",
        recordedAt: baseTime,
        frameCount: 6000, // 100 seconds
      },
      {
        id: "g2",
        recordedAt: new Date(baseTime.getTime() + 15 * 1000), // Only 15s later! (< 100s)
        frameCount: 4800,
      },
    ];

    expect(isRealtimeSession(games)).toBe(false);
  });
});

describe("propagateVideoLinkToSession & hasVideoLink", () => {
  it("propagates video link and calculates relative timestamps in real-time sessions", () => {
    const baseTime = new Date("2026-08-25T12:00:00Z");
    const games = [
      {
        id: "game-1",
        recordedAt: baseTime,
        frameCount: 6000,
      },
      {
        id: "game-2",
        recordedAt: new Date(baseTime.getTime() + 150 * 1000), // +150 seconds
        frameCount: 4800,
      },
      {
        id: "game-3",
        recordedAt: new Date(baseTime.getTime() + 320 * 1000), // +320 seconds
        frameCount: 5000,
      },
    ];

    const linkData: VideoLinkData = {
      videoId: "cmw0olwhLaQ",
      url: "https://www.youtube.com/watch?v=cmw0olwhLaQ",
      offsetSeconds: 30, // Starts at 30s in video for game-1
      viewMode: "video-pip",
    };

    saveVideoLink("game-1", linkData);
    expect(hasVideoLink("game-1")).toBe(true);
    expect(hasVideoLink("game-2")).toBe(false);

    const result = propagateVideoLinkToSession("game-1", linkData, games);
    expect(result.updatedCount).toBe(2);
    expect(result.isRealtime).toBe(true);

    expect(hasVideoLink("game-2")).toBe(true);
    expect(hasVideoLink("game-3")).toBe(true);

    const g2Data = loadVideoLink("game-2");
    expect(g2Data?.videoId).toBe("cmw0olwhLaQ");
    expect(g2Data?.offsetSeconds).toBe(180); // 30 + 150s

    const g3Data = loadVideoLink("game-3");
    expect(g3Data?.offsetSeconds).toBe(350); // 30 + 320s
  });
});

describe("isOffsetManual", () => {
  const base: VideoLinkData = {
    videoId: "abc",
    url: "https://youtube.com/watch?v=abc",
    offsetSeconds: 10,
    viewMode: "canvas",
  };

  it("is true when explicitly set true", () => {
    expect(isOffsetManual({ ...base, isOffsetManual: true })).toBe(true);
  });

  it("is false when explicitly set false", () => {
    expect(isOffsetManual({ ...base, isOffsetManual: false })).toBe(false);
  });

  it("defaults to true when absent (pre-existing links are never silently overwritten)", () => {
    expect(isOffsetManual(base)).toBe(true);
  });
});

describe("recomputeInferredOffsets", () => {
  const videoId = "abc123xyz45";
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  function game(
    id: string,
    tSeconds: number,
    frameCount: number,
  ): SessionGameInfo {
    return { id, recordedAt: new Date(tSeconds * 1000), frameCount };
  }

  it("falls back to a flat recordedAt-delta shift with only one manual anchor", () => {
    const anchor = game("anchor", 100, 600);
    const inferred = game("inferred", 250, 600);
    saveVideoLink(anchor.id, {
      videoId,
      url,
      offsetSeconds: 30,
      viewMode: "canvas",
      isOffsetManual: true,
    });

    const result = recomputeInferredOffsets(
      [anchor, inferred],
      videoId,
      url,
      "canvas",
    );
    expect(result.updatedCount).toBe(1);
    expect(loadVideoLink(inferred.id)?.offsetSeconds).toBe(180); // 30 + (250-100)
    expect(loadVideoLink(inferred.id)?.isOffsetManual).toBe(false);
  });

  it("interpolates an in-between game's offset using its own midpoint, not its frame 0", () => {
    // Anchors: t=0 -> offset 0, t=100 -> offset 50 (driftPerSecond = 0.5,
    // i.e. the estimated clock runs 2x "faster" than the true video clock
    // over this stretch). In-between game: t=40, 600 frames (10s duration,
    // 5s half-duration) -> midpoint at t=45.
    // videoTimeAtMidpoint = 0 + 0.5*(45-0) = 22.5; offset = 22.5 - 5 = 17.5.
    const first = game("first", 0, 100);
    const last = game("last", 100, 100);
    const mid = game("mid", 40, 600);
    saveVideoLink(first.id, {
      videoId,
      url,
      offsetSeconds: 0,
      viewMode: "canvas",
      isOffsetManual: true,
    });
    saveVideoLink(last.id, {
      videoId,
      url,
      offsetSeconds: 50,
      viewMode: "canvas",
      isOffsetManual: true,
    });

    recomputeInferredOffsets([first, mid, last], videoId, url, "canvas");
    expect(loadVideoLink(mid.id)?.offsetSeconds).toBe(17.5);
  });

  it("uses piecewise-linear interpolation across 3+ anchors, not a single global line", () => {
    // A: t=0 offset=0; B: t=100 offset=50 (drift 0.5 in A-B);
    // C: t=200 offset=250 (drift 2.0 in B-C).
    const a = game("a", 0, 100);
    const b = game("b", 100, 100);
    const c = game("c", 200, 100);
    const midAB = game("midAB", 40, 600); // 10s duration, falls in A-B
    const midBC = game("midBC", 150, 1200); // 20s duration, falls in B-C
    for (const [g, offset] of [
      [a, 0],
      [b, 50],
      [c, 250],
    ] as const) {
      saveVideoLink(g.id, {
        videoId,
        url,
        offsetSeconds: offset,
        viewMode: "canvas",
        isOffsetManual: true,
      });
    }

    recomputeInferredOffsets([a, midAB, b, midBC, c], videoId, url, "canvas");
    expect(loadVideoLink(midAB.id)?.offsetSeconds).toBe(17.5); // same A-B segment as the previous test
    // midBC: midpoint = 150+10 = 160; videoTimeAtMidpoint = 50 + 2.0*(160-100) = 170; offset = 170-10 = 160.
    expect(loadVideoLink(midBC.id)?.offsetSeconds).toBe(160);
  });

  it("extrapolates (clamped to 0) for a game outside the outermost anchors", () => {
    const a = game("a2", 0, 100);
    const b = game("b2", 100, 100);
    const before = game("before2", -20, 600); // 10s duration, 5s half
    saveVideoLink(a.id, {
      videoId,
      url,
      offsetSeconds: 0,
      viewMode: "canvas",
      isOffsetManual: true,
    });
    saveVideoLink(b.id, {
      videoId,
      url,
      offsetSeconds: 50,
      viewMode: "canvas",
      isOffsetManual: true,
    });

    recomputeInferredOffsets([before, a, b], videoId, url, "canvas");
    // videoTimeAtMidpoint = 0 + 0.5*(-15-0) = -7.5; offset = -7.5-5 = -12.5 -> clamped to 0.
    expect(loadVideoLink(before.id)?.offsetSeconds).toBe(0);
  });

  it("never touches a manual anchor's own offset", () => {
    const a = game("a3", 0, 100);
    const b = game("b3", 100, 100);
    saveVideoLink(a.id, {
      videoId,
      url,
      offsetSeconds: 5,
      viewMode: "canvas",
      isOffsetManual: true,
    });
    saveVideoLink(b.id, {
      videoId,
      url,
      offsetSeconds: 999,
      viewMode: "canvas",
      isOffsetManual: true,
    });

    const result = recomputeInferredOffsets([a, b], videoId, url, "canvas");
    expect(result.updatedCount).toBe(0);
    expect(loadVideoLink(a.id)?.offsetSeconds).toBe(5);
    expect(loadVideoLink(b.id)?.offsetSeconds).toBe(999);
  });

  it("preserves an inferred game's own existing viewMode instead of overwriting it with the default", () => {
    const a = game("a4", 0, 100);
    const inferred = game("inferred4", 50, 600);
    saveVideoLink(a.id, {
      videoId,
      url,
      offsetSeconds: 0,
      viewMode: "canvas",
      isOffsetManual: true,
    });
    saveVideoLink(inferred.id, {
      videoId,
      url,
      offsetSeconds: 0,
      viewMode: "video-only",
      isOffsetManual: false,
    });

    recomputeInferredOffsets([a, inferred], videoId, url, "canvas");
    expect(loadVideoLink(inferred.id)?.viewMode).toBe("video-only");
  });
});

describe("attachVideoToSession", () => {
  it("marks the source game manual and infers the rest of the session", () => {
    const videoId = "def456uvw78";
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const source: SessionGameInfo = {
      id: "src1",
      recordedAt: new Date(0),
      frameCount: 100,
    };
    const sibling: SessionGameInfo = {
      id: "sib1",
      recordedAt: new Date(100_000),
      frameCount: 100,
    };
    const linkData: VideoLinkData = {
      videoId,
      url,
      offsetSeconds: 12,
      viewMode: "canvas",
    };

    const result = attachVideoToSession("src1", linkData, [source, sibling]);
    expect(result.updatedCount).toBe(1);
    expect(loadVideoLink("src1")?.isOffsetManual).toBe(true);
    expect(loadVideoLink("sib1")?.isOffsetManual).toBe(false);
    expect(loadVideoLink("sib1")?.offsetSeconds).toBe(112); // 12 + 100s, single-anchor fallback
  });
});

describe("clearVideoOffsetOverride", () => {
  it("converts a manual game back to inferred and recomputes it from remaining anchors", () => {
    const videoId = "ghi789rst01";
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const a: SessionGameInfo = {
      id: "clearA",
      recordedAt: new Date(0),
      frameCount: 100,
    };
    const b: SessionGameInfo = {
      id: "clearB",
      recordedAt: new Date(100_000),
      frameCount: 100,
    };
    saveVideoLink(a.id, {
      videoId,
      url,
      offsetSeconds: 0,
      viewMode: "canvas",
      isOffsetManual: true,
    });
    saveVideoLink(b.id, {
      videoId,
      url,
      offsetSeconds: 999, // a stale/wrong manual value we're about to clear
      viewMode: "canvas",
      isOffsetManual: true,
    });

    const result = clearVideoOffsetOverride("clearB", [a, b]);
    expect(result.updatedCount).toBe(1);
    expect(loadVideoLink("clearB")?.isOffsetManual).toBe(false);
    expect(loadVideoLink("clearB")?.offsetSeconds).toBe(100); // 0 + 100s, single-remaining-anchor fallback
  });

  it("is a no-op for a game with no link at all", () => {
    const result = clearVideoOffsetOverride("nonexistent-game", []);
    expect(result.updatedCount).toBe(0);
  });
});

describe("unlinkVideoFromSession", () => {
  it("removes the link from siblings sharing the same video, leaving the source untouched", () => {
    const videoId = "jkl012mno34";
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const source: SessionGameInfo = {
      id: "unlinkSrc",
      recordedAt: new Date(0),
      frameCount: 100,
    };
    const sibling: SessionGameInfo = {
      id: "unlinkSib",
      recordedAt: new Date(100_000),
      frameCount: 100,
    };
    saveVideoLink(source.id, {
      videoId,
      url,
      offsetSeconds: 0,
      viewMode: "canvas",
      isOffsetManual: true,
    });
    saveVideoLink(sibling.id, {
      videoId,
      url,
      offsetSeconds: 100,
      viewMode: "canvas",
      isOffsetManual: false,
    });

    const result = unlinkVideoFromSession(source.id, [source, sibling]);
    expect(result.updatedCount).toBe(1);
    expect(loadVideoLink(sibling.id)).toBeNull();
    expect(loadVideoLink(source.id)).not.toBeNull();
  });

  it("leaves a sibling linked to a different video alone", () => {
    const videoId = "pqr567stu89";
    const otherVideoId = "vwx012yza34";
    const source: SessionGameInfo = {
      id: "unlinkSrc2",
      recordedAt: new Date(0),
      frameCount: 100,
    };
    const sibling: SessionGameInfo = {
      id: "unlinkSib2",
      recordedAt: new Date(100_000),
      frameCount: 100,
    };
    saveVideoLink(source.id, {
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      offsetSeconds: 0,
      viewMode: "canvas",
      isOffsetManual: true,
    });
    saveVideoLink(sibling.id, {
      videoId: otherVideoId,
      url: `https://www.youtube.com/watch?v=${otherVideoId}`,
      offsetSeconds: 5,
      viewMode: "canvas",
      isOffsetManual: true,
    });

    const result = unlinkVideoFromSession(source.id, [source, sibling]);
    expect(result.updatedCount).toBe(0);
    expect(loadVideoLink(sibling.id)?.videoId).toBe(otherVideoId);
  });

  it("is a no-op for a source game with no link at all", () => {
    const result = unlinkVideoFromSession("nonexistent-game", []);
    expect(result.updatedCount).toBe(0);
  });
});
