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

import { SessionSidebarList } from "./sessionSidebarList.js";

/** A minimal fake element: enough for SessionSidebarList's render() to
 * write innerHTML, walk rows, and set attributes/listeners - not a real
 * DOM node. */
interface FakeEl {
  innerHTML: string;
  attributes: Record<string, string>;
  dataset: Record<string, string>;
  listeners: Record<string, Array<() => void>>;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  addEventListener(type: string, fn: () => void): void;
  dispatchEvent(type: string): void;
}

function makeFakeEl(): FakeEl {
  const el: FakeEl = {
    innerHTML: "",
    attributes: {},
    dataset: {},
    listeners: {},
    setAttribute(name, value) {
      el.attributes[name] = value;
    },
    getAttribute(name) {
      return el.attributes[name] ?? null;
    },
    addEventListener(type, fn) {
      (el.listeners[type] ??= []).push(fn);
    },
    dispatchEvent(type) {
      for (const fn of el.listeners[type] ?? []) fn();
    },
  };
  return el;
}

/**
 * A fake container whose innerHTML setter parses out `data-session-id`
 * values from SessionSidebarList's own markup and creates one FakeEl per
 * row (with aria-current copied over if the markup included it), so
 * querySelectorAll(".session-sidebar-row") and
 * querySelector('[data-session-id="..."]') both work against the same
 * row objects render() then attaches click listeners to.
 */
function makeFakeContainer() {
  const rowsById = new Map<string, FakeEl>();
  let html = "";
  return {
    get innerHTML() {
      return html;
    },
    set innerHTML(value: string) {
      html = value;
      rowsById.clear();
      const rowRe = /data-session-id="([^"]+)"(\s+aria-current="page")?/g;
      let match: RegExpExecArray | null;
      while ((match = rowRe.exec(value))) {
        const el = makeFakeEl();
        el.dataset.sessionId = match[1]!;
        if (match[2]) el.setAttribute("aria-current", "page");
        rowsById.set(match[1]!, el);
      }
    },
    querySelectorAll(selector: string) {
      if (selector === ".session-sidebar-row") {
        return [...rowsById.values()];
      }
      return [];
    },
    querySelector(selector: string) {
      const m = /\[data-session-id="([^"]+)"\]/.exec(selector);
      if (m) return rowsById.get(m[1]!) ?? null;
      return null;
    },
  } as unknown as HTMLElement;
}

describe("SessionSidebarList", () => {
  it("groups sessions under 'This week' and 'Older' headings", () => {
    const now = new Date("2026-09-19T12:00:00Z");
    const recent = makeSession({ id: "recent", startTime: now });
    const old = makeSession({
      id: "old",
      startTime: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    });
    const container = makeFakeContainer();

    const list = new SessionSidebarList(container, () => {});
    list.setSessions([recent, old]);
    list.render(now);

    expect(container.innerHTML).toContain("This week");
    expect(container.innerHTML).toContain("Older");
    expect(container.innerHTML).toContain("recent");
    expect(container.innerHTML).toContain("old");
  });

  it("calls onSelectSession with the clicked session's id", () => {
    const container = makeFakeContainer();
    const selected: string[] = [];
    const session = makeSession({ id: "clicked" });

    const list = new SessionSidebarList(container, (id) => selected.push(id));
    list.setSessions([session]);
    list.render(new Date("2026-09-19T12:00:00Z"));

    (
      container.querySelector(
        '[data-session-id="clicked"]',
      ) as unknown as FakeEl
    ).dispatchEvent("click");
    expect(selected).toEqual(["clicked"]);
  });

  it("marks the selected session row with aria-current", () => {
    const container = makeFakeContainer();
    const session = makeSession({ id: "s1" });

    const list = new SessionSidebarList(container, () => {});
    list.setSessions([session]);
    list.setSelectedSessionId("s1");
    list.render(new Date("2026-09-19T12:00:00Z"));

    const row = container.querySelector(
      '[data-session-id="s1"]',
    ) as unknown as FakeEl | null;
    expect(row?.getAttribute("aria-current")).toBe("page");
  });
});
