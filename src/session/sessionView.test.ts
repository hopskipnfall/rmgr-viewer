import { describe, it, expect } from "vitest";
import { sessionQuickSearchLinks } from "./sessionView.js";

describe("sessionQuickSearchLinks", () => {
  it("scopes every quick search to the session", () => {
    const links = sessionQuickSearchLinks("session-1");
    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link.href).toContain("sessionId=session-1");
    }
  });

  it("builds failed edge guards, combos, and kill combos", () => {
    const [failed, combos, kills] = sessionQuickSearchLinks("s");
    expect(failed?.href).toContain("result=failure");
    expect(combos?.href).toContain("type=combos");
    expect(kills?.href).toContain("type=combos");
    expect(kills?.href).toContain("ko=1");
  });

  it("escapes a session id that needs encoding", () => {
    const [failed] = sessionQuickSearchLinks("a b&c");
    expect(failed?.href).toContain("sessionId=a+b%26c");
  });
});
