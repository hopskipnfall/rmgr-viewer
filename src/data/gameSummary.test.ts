import { describe, expect, it } from "vitest";
import { gameIdFor } from "./gameSummary.js";

describe("gameIdFor", () => {
  it("combines the recording timestamp and frame count", () => {
    expect(gameIdFor(1757000000000, 8420)).toBe(
      `g_${(1757000000000).toString(36)}_${(8420).toString(36)}`,
    );
  });

  it("differs when either input differs", () => {
    expect(gameIdFor(1, 2)).not.toBe(gameIdFor(1, 3));
    expect(gameIdFor(1, 2)).not.toBe(gameIdFor(2, 2));
  });
});
