import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
});
