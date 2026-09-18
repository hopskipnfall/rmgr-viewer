import { describe, it, expect, vi, afterEach } from "vitest";
import { isDesktopWidth, watchDesktopWidth } from "./responsive.js";

describe("isDesktopWidth", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is true at/above the 861px breakpoint", () => {
    vi.stubGlobal("window", { innerWidth: 861 });
    expect(isDesktopWidth()).toBe(true);
    vi.stubGlobal("window", { innerWidth: 1200 });
    expect(isDesktopWidth()).toBe(true);
  });

  it("is false below the breakpoint", () => {
    vi.stubGlobal("window", { innerWidth: 860 });
    expect(isDesktopWidth()).toBe(false);
  });

  it("is false when window is unavailable (defaults to the safer mobile path)", () => {
    vi.stubGlobal("window", undefined);
    expect(isDesktopWidth()).toBe(false);
  });
});

describe("watchDesktopWidth", () => {
  it("calls back with the current value immediately, then again on change", () => {
    const listeners: Array<() => void> = [];
    const mq = {
      matches: false,
      addEventListener: (_: string, fn: () => void) => listeners.push(fn),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("window", {
      innerWidth: 500,
      matchMedia: () => mq,
    });

    const onChange = vi.fn();
    watchDesktopWidth(onChange);
    expect(onChange).toHaveBeenCalledWith(false);

    mq.matches = true;
    listeners.forEach((fn) => fn());
    expect(onChange).toHaveBeenCalledWith(true);

    vi.unstubAllGlobals();
  });

  it("returns a cleanup function that removes the listener", () => {
    const removeEventListener = vi.fn();
    vi.stubGlobal("window", {
      innerWidth: 500,
      matchMedia: () => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener,
      }),
    });

    const cleanup = watchDesktopWidth(() => {});
    cleanup();
    expect(removeEventListener).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
