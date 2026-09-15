import { describe, expect, it } from "vitest";
import { ANALYSIS_VERSION, isStale } from "./analysisVersion.js";

const base = {
  analysisVersion: ANALYSIS_VERSION,
  formatVersion: 5,
  recorderSchemaVersion: 1,
};

describe("isStale", () => {
  it("is fresh at the current analysis version", () => {
    expect(isStale(base, [])).toBe(false);
  });

  it("is stale at an older analysis version", () => {
    expect(
      isStale({ ...base, analysisVersion: ANALYSIS_VERSION - 1 }, []),
    ).toBe(true);
  });

  it("is stale when the file's versions are on the known-bad list", () => {
    expect(isStale(base, [{ recorderSchemaVersion: 1 }])).toBe(true);
    expect(
      isStale(base, [{ formatVersion: 5, recorderSchemaVersion: 2 }]),
    ).toBe(false);
  });

  it("ignores an empty matcher rather than flagging everything", () => {
    expect(isStale(base, [{}])).toBe(false);
  });
});
