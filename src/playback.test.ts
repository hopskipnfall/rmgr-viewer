import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { PlaybackController } from "./playback.js";

describe("PlaybackController", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 123),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("initializes with default speed 1.0", () => {
    const onChange = vi.fn();
    const controller = new PlaybackController(100, onChange);
    expect(controller.playbackSpeed).toBe(1.0);
    expect(controller.currentIndex).toBe(0);
    expect(controller.isPlaying).toBe(false);
  });

  it("updates speed when setPlaybackSpeed is called", () => {
    const onChange = vi.fn();
    const controller = new PlaybackController(100, onChange);
    controller.setPlaybackSpeed(0.5);
    expect(controller.playbackSpeed).toBe(0.5);

    controller.setPlaybackSpeed(0.25);
    expect(controller.playbackSpeed).toBe(0.25);

    controller.setPlaybackSpeed(1.5);
    expect(controller.playbackSpeed).toBe(1.5);

    controller.setPlaybackSpeed(2.0);
    expect(controller.playbackSpeed).toBe(2.0);
  });

  it("contains 2x, 1.5x, 1x, 0.5x, and 0.25x speed options in index.html", () => {
    const htmlPath = path.resolve(__dirname, "../index.html");
    const html = fs.readFileSync(htmlPath, "utf-8");
    expect(html).toContain('data-speed="2"');
    expect(html).toContain('data-speed="1.5"');
    expect(html).toContain('data-speed="1"');
    expect(html).toContain('data-speed="0.5"');
    expect(html).toContain('data-speed="0.25"');
  });

  it("seeks and steps correctly", () => {
    const onChange = vi.fn();
    const controller = new PlaybackController(100, onChange);

    controller.seek(50);
    expect(controller.currentIndex).toBe(50);
    expect(onChange).toHaveBeenLastCalledWith(50, false, "jump");

    controller.stepForward();
    expect(controller.currentIndex).toBe(51);

    controller.stepBackward();
    expect(controller.currentIndex).toBe(50);

    controller.jumpForward(60);
    expect(controller.currentIndex).toBe(99); // clamped to frameCount - 1 (100 - 1 = 99)

    controller.jumpBackward(60);
    expect(controller.currentIndex).toBe(39);
  });

  it("seekAndPlay seeks and starts/resumes playback", () => {
    const onChange = vi.fn();
    const controller = new PlaybackController(100, onChange);

    controller.seekAndPlay(45);
    expect(controller.currentIndex).toBe(45);
    expect(controller.isPlaying).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith(45, true, "jump");

    controller.pause();
    expect(controller.isPlaying).toBe(false);

    controller.seek(20);
    expect(controller.currentIndex).toBe(20);
    expect(controller.isPlaying).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(20, false, "jump");
  });

  it("seek while playing preserves isPlaying state", () => {
    const onChange = vi.fn();
    const controller = new PlaybackController(100, onChange);

    controller.play();
    expect(controller.isPlaying).toBe(true);

    controller.seek(30);
    expect(controller.currentIndex).toBe(30);
    expect(controller.isPlaying).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith(30, true, "jump");

    controller.pause();
  });

  describe("animated jump (fast forward & fast rewind)", () => {
    let rafCallbacks: Array<{ id: number; cb: (now: number) => void }> = [];
    let nextRafId = 1;
    let simulatedTime = 1000;

    beforeEach(() => {
      rafCallbacks = [];
      nextRafId = 1;
      simulatedTime = 1000;

      vi.stubGlobal("performance", {
        now: () => simulatedTime,
      });

      vi.stubGlobal(
        "requestAnimationFrame",
        vi.fn((cb: (now: number) => void) => {
          const id = nextRafId++;
          rafCallbacks.push({ id, cb });
          return id;
        }),
      );

      vi.stubGlobal(
        "cancelAnimationFrame",
        vi.fn((id: number) => {
          rafCallbacks = rafCallbacks.filter((item) => item.id !== id);
        }),
      );
    });

    function advanceTime(deltaMs: number) {
      simulatedTime += deltaMs;
      // Process any callbacks scheduled for this step
      const pending = [...rafCallbacks];
      rafCallbacks = [];
      for (const item of pending) {
        item.cb(simulatedTime);
      }
    }

    it("animates forward 60 frames over 200ms with fast-forward reasons and completes with jump", () => {
      const onChange = vi.fn();
      const controller = new PlaybackController(200, onChange);
      controller.seek(10);
      onChange.mockClear();

      controller.jumpForwardAnimated(60);
      expect(controller.isAnimatingJump).toBe(true);

      // Advance 50ms (~25% of 200ms)
      advanceTime(50);
      expect(controller.isAnimatingJump).toBe(true);
      expect(controller.currentIndex).toBeGreaterThan(10);
      expect(controller.currentIndex).toBeLessThan(70);
      expect(onChange).toHaveBeenCalledWith(
        controller.currentIndex,
        false,
        "fast-forward",
      );

      // Advance past 200ms to complete
      advanceTime(160);
      expect(controller.isAnimatingJump).toBe(false);
      expect(controller.currentIndex).toBe(70);
      expect(onChange).toHaveBeenLastCalledWith(70, false, "jump");
    });

    it("animates backward 60 frames over 200ms with fast-forward reasons and completes with jump", () => {
      const onChange = vi.fn();
      const controller = new PlaybackController(200, onChange);
      controller.seek(100);
      onChange.mockClear();

      controller.jumpBackwardAnimated(60);
      expect(controller.isAnimatingJump).toBe(true);

      advanceTime(50);
      expect(controller.currentIndex).toBeLessThan(100);
      expect(controller.currentIndex).toBeGreaterThan(40);
      expect(onChange).toHaveBeenCalledWith(
        controller.currentIndex,
        false,
        "fast-forward",
      );

      advanceTime(160);
      expect(controller.isAnimatingJump).toBe(false);
      expect(controller.currentIndex).toBe(40);
      expect(onChange).toHaveBeenLastCalledWith(40, false, "jump");
    });

    it("snaps immediately to target when arrow key in same direction is pressed during animation", () => {
      const onChange = vi.fn();
      const controller = new PlaybackController(200, onChange);
      controller.seek(10);
      onChange.mockClear();

      // Start jump from 10 towards 70
      controller.jumpForwardAnimated(60);
      advanceTime(40);
      const intermediateFrame = controller.currentIndex;
      expect(intermediateFrame).toBeGreaterThan(10);
      expect(intermediateFrame).toBeLessThan(70);

      // Pressing forward again interrupts and immediately jumps to target 70
      controller.jumpForwardAnimated(60);
      expect(controller.isAnimatingJump).toBe(false);
      expect(controller.currentIndex).toBe(70);
      expect(onChange).toHaveBeenLastCalledWith(70, false, "jump");
    });

    it("immediately jumps in opposite direction when opposite arrow key is pressed during animation", () => {
      const onChange = vi.fn();
      const controller = new PlaybackController(200, onChange);
      controller.seek(100);
      onChange.mockClear();

      // Start jump forward towards 160
      controller.jumpForwardAnimated(60);
      advanceTime(40);
      const intermediate = controller.currentIndex; // ~126

      // Press backward: immediately jumps 60 frames back from current position
      controller.jumpBackwardAnimated(60);
      expect(controller.isAnimatingJump).toBe(false);
      expect(controller.currentIndex).toBe(intermediate - 60);
      expect(onChange).toHaveBeenLastCalledWith(
        intermediate - 60,
        false,
        "jump",
      );
    });

    it("resumes playing from target when animated jump finishes while playing", () => {
      const onChange = vi.fn();
      const controller = new PlaybackController(200, onChange);
      controller.seek(20);
      controller.play();
      onChange.mockClear();

      controller.jumpForwardAnimated(60);
      expect(controller.isPlaying).toBe(true);
      expect(controller.isAnimatingJump).toBe(true);

      advanceTime(210);
      expect(controller.isAnimatingJump).toBe(false);
      expect(controller.currentIndex).toBe(80);
      expect(controller.isPlaying).toBe(true);
      expect(onChange).toHaveBeenLastCalledWith(80, true, "jump");
    });

    it("cancels animated jump when paused or toggled", () => {
      const onChange = vi.fn();
      const controller = new PlaybackController(200, onChange);
      controller.seek(20);
      onChange.mockClear();

      controller.jumpForwardAnimated(60);
      advanceTime(50);
      const atFrame = controller.currentIndex;

      controller.pause();
      expect(controller.isAnimatingJump).toBe(false);
      expect(controller.isPlaying).toBe(false);
      expect(controller.currentIndex).toBe(atFrame);
      expect(onChange).toHaveBeenLastCalledWith(atFrame, false, "jump");
    });

    it("cancels animated jump when manual seek is called", () => {
      const onChange = vi.fn();
      const controller = new PlaybackController(200, onChange);
      controller.seek(20);
      onChange.mockClear();

      controller.jumpForwardAnimated(60);
      advanceTime(50);

      controller.seek(150);
      expect(controller.isAnimatingJump).toBe(false);
      expect(controller.currentIndex).toBe(150);
      expect(onChange).toHaveBeenLastCalledWith(150, false, "jump");
    });
  });
});
