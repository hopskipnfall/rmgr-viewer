import { beforeEach, describe, expect, it } from "vitest";
import {
  loadVideoLink,
  migrateVideoLink,
  saveVideoLink,
  type VideoLinkData,
} from "./youtubeSync.js";

const link = (offsetSeconds: number): VideoLinkData => ({
  videoId: "dQw4w9WgXcQ",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  offsetSeconds,
  viewMode: "canvas-muted",
});

describe("migrateVideoLink", () => {
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

  it("moves a link from the old id to the new id", () => {
    saveVideoLink("old", link(5));
    migrateVideoLink("old", "new");
    expect(loadVideoLink("new")?.offsetSeconds).toBe(5);
    expect(loadVideoLink("old")).toBeNull();
  });

  it("never overwrites a link already saved under the new id", () => {
    saveVideoLink("old", link(5));
    saveVideoLink("new", link(9));
    migrateVideoLink("old", "new");
    expect(loadVideoLink("new")?.offsetSeconds).toBe(9);
  });

  it("does nothing when there is no old link", () => {
    migrateVideoLink("old", "new");
    expect(loadVideoLink("new")).toBeNull();
  });
});
