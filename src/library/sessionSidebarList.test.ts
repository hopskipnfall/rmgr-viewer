import { describe, it, expect } from "vitest";
import {
  groupSessionsByRecency,
  sessionOpponentLine,
  sessionDateRecordLine,
} from "./sessionSidebarList.js";
import type { SessionGroup } from "../data/session.js";

function makeSession(overrides: Partial<SessionGroup> = {}): SessionGroup {
  return {
    id: "s1",
    opponentName: "Harold",
    opponentCharacterIds: [],
    yourCharacterIds: [],
    startTime: new Date("2026-09-15T12:00:00Z"),
    endTime: new Date("2026-09-15T13:00:00Z"),
    totalDurationFrames: 3600,
    games: [],
    wins: 2,
    losses: 1,
    hasVideo: false,
    ...overrides,
  };
}

describe("groupSessionsByRecency", () => {
  const now = new Date("2026-09-19T12:00:00Z");

  it("puts a session from today in thisWeek", () => {
    const session = makeSession({ startTime: now });
    const { thisWeek, older } = groupSessionsByRecency([session], now);
    expect(thisWeek).toEqual([session]);
    expect(older).toEqual([]);
  });

  it("puts a session from exactly 6 days ago in thisWeek (rolling window, inclusive)", () => {
    const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const session = makeSession({ startTime: sixDaysAgo });
    const { thisWeek, older } = groupSessionsByRecency([session], now);
    expect(thisWeek).toEqual([session]);
    expect(older).toEqual([]);
  });

  it("puts a session from 8 days ago in older", () => {
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const session = makeSession({ startTime: eightDaysAgo });
    const { thisWeek, older } = groupSessionsByRecency([session], now);
    expect(thisWeek).toEqual([]);
    expect(older).toEqual([session]);
  });

  it("sorts each group newest-first", () => {
    const a = makeSession({
      id: "a",
      startTime: new Date(now.getTime() - 1000),
    });
    const b = makeSession({ id: "b", startTime: now });
    const { thisWeek } = groupSessionsByRecency([a, b], now);
    expect(thisWeek.map((s) => s.id)).toEqual(["b", "a"]);
  });
});

describe("sessionOpponentLine", () => {
  it("prefixes the opponent name(s) with 'with '", () => {
    expect(sessionOpponentLine(makeSession({ opponentName: "Harold" }))).toBe(
      "with Harold",
    );
  });

  it("lists every other lobby member for a rotation session", () => {
    expect(
      sessionOpponentLine(makeSession({ opponentName: "Harold, Nue" })),
    ).toBe("with Harold, Nue");
  });
});

describe("sessionDateRecordLine", () => {
  it("includes the date and the W-L record", () => {
    const line = sessionDateRecordLine(
      makeSession({
        startTime: new Date("2026-09-15T12:00:00Z"),
        wins: 3,
        losses: 1,
      }),
    );
    expect(line).toContain("3");
    expect(line).toContain("1");
  });
});
