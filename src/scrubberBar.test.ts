import { describe, it, expect, vi } from "vitest";
import { ScrubberBar } from "./scrubberBar.js";

describe("ScrubberBar", () => {
  function createMockElements() {
    type Listener = (e: unknown) => void;
    const listeners: Record<string, Listener[]> = {};

    const bar = {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 200,
        height: 20,
        right: 200,
        bottom: 20,
      }),
      setAttribute: vi.fn(),
      setPointerCapture: vi.fn(),
      addEventListener: vi.fn((event: string, cb: Listener) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
      }),
      trigger: (event: string, eventObj: unknown) => {
        for (const cb of listeners[event] ?? []) {
          cb(eventObj);
        }
      },
    } as unknown as HTMLElement & {
      trigger: (event: string, eventObj: unknown) => void;
    };

    const canvas = {
      getContext: () => ({
        clearRect: vi.fn(),
        fillRect: vi.fn(),
      }),
      width: 200,
      height: 20,
    } as unknown as HTMLCanvasElement;

    const thumb = {
      style: {
        left: "0%",
      },
    } as unknown as HTMLElement;

    return { bar, canvas, thumb };
  }

  it("calls onScrubStart on pointerdown and onSeek on pointerup", () => {
    const { bar, canvas, thumb } = createMockElements();
    const onScrubStart = vi.fn();
    const onScrubCancel = vi.fn();
    const onSeek = vi.fn();
    const onPreview = vi.fn();

    const scrubber = new ScrubberBar(bar, canvas, thumb, {
      onScrubStart,
      onScrubCancel,
      onSeek,
      onPreview,
    });
    scrubber.setRange(100);

    // Pointer down at x=100 (halfway across 200px bar -> frame 50)
    bar.trigger("pointerdown", { pointerId: 1, clientX: 100 });
    expect(onScrubStart).toHaveBeenCalledTimes(1);
    expect(onPreview).toHaveBeenCalledWith(50, 100);
    expect(onSeek).not.toHaveBeenCalled();

    // Pointer move to x=150 (3/4 across 200px bar -> frame 75)
    bar.trigger("pointermove", { clientX: 150 });
    expect(onPreview).toHaveBeenCalledWith(75, 150);
    expect(onSeek).not.toHaveBeenCalled();

    // Pointer up at x=150
    bar.trigger("pointerup", { pointerType: "mouse", clientX: 150 });
    expect(onSeek).toHaveBeenCalledWith(75);
  });

  it("calls onScrubCancel when pointercancel occurs while dragging", () => {
    const { bar, canvas, thumb } = createMockElements();
    const onScrubStart = vi.fn();
    const onScrubCancel = vi.fn();
    const onSeek = vi.fn();
    const onPreview = vi.fn();

    const scrubber = new ScrubberBar(bar, canvas, thumb, {
      onScrubStart,
      onScrubCancel,
      onSeek,
      onPreview,
    });
    scrubber.setRange(100);

    bar.trigger("pointerdown", { pointerId: 1, clientX: 50 });
    expect(onScrubStart).toHaveBeenCalledTimes(1);

    bar.trigger("pointercancel", { clientX: 50 });
    expect(onScrubCancel).toHaveBeenCalledTimes(1);
    expect(onSeek).not.toHaveBeenCalled();
    expect(onPreview).toHaveBeenLastCalledWith(null, 50);
  });
});
