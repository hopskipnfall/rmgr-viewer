import { describe, it, expect, vi } from "vitest";
import { PlaybackController } from "./playback.js";

describe("PlaybackController", () => {
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
  });
});
