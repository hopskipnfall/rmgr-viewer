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
  YouTubeSyncController,
  type VideoLinkData,
  type VideoViewMode,
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
