import { describe, it, expect, beforeEach } from "vitest";
import { loadSessionComment, saveSessionComment } from "./sessionComments.js";

describe("session comment persistence", () => {
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

  it("returns an empty string when nothing is saved", () => {
    expect(loadSessionComment("session-1")).toBe("");
  });

  it("saves and loads a comment for a session", () => {
    saveSessionComment(
      "session-1",
      "Great matches, watch out for his up-smash",
    );
    expect(loadSessionComment("session-1")).toBe(
      "Great matches, watch out for his up-smash",
    );
  });

  it("trims whitespace before saving", () => {
    saveSessionComment("session-1", "  padded text  ");
    expect(loadSessionComment("session-1")).toBe("padded text");
  });

  it("removes the storage entry when saving an empty string", () => {
    saveSessionComment("session-1", "something");
    saveSessionComment("session-1", "");
    expect(localStorage.getItem("rmgr_session_comment_session-1")).toBeNull();
    expect(loadSessionComment("session-1")).toBe("");
  });

  it("removes the storage entry when saving a whitespace-only string", () => {
    saveSessionComment("session-1", "something");
    saveSessionComment("session-1", "   \n  ");
    expect(loadSessionComment("session-1")).toBe("");
  });

  it("keeps comments for different sessions separate", () => {
    saveSessionComment("session-1", "comment 1");
    saveSessionComment("session-2", "comment 2");
    expect(loadSessionComment("session-1")).toBe("comment 1");
    expect(loadSessionComment("session-2")).toBe("comment 2");
  });

  it("overwrites an existing comment", () => {
    saveSessionComment("session-1", "first");
    saveSessionComment("session-1", "second");
    expect(loadSessionComment("session-1")).toBe("second");
  });
});
