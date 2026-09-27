import { describe, it, expect, beforeEach } from "vitest";
import {
  loadMatchupComment,
  saveMatchupComment,
  getAllMatchupComments,
  saveMatchupCommentByKey,
} from "./matchupComments.js";

describe("matchup comment persistence", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      get length() {
        return store.size;
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
    };
    (
      globalThis as unknown as { localStorage: typeof mockStorage }
    ).localStorage = mockStorage;
  });

  it("returns an empty string when nothing is saved", () => {
    expect(loadMatchupComment(2, 12)).toBe("");
  });

  it("saves and loads a comment for a matchup", () => {
    saveMatchupComment(2, 12, "Watch out for his up-smash");
    expect(loadMatchupComment(2, 12)).toBe("Watch out for his up-smash");
  });

  it("trims whitespace before saving", () => {
    saveMatchupComment(2, 12, "  padded text  ");
    expect(loadMatchupComment(2, 12)).toBe("padded text");
  });

  it("removes the storage entry when saving an empty string", () => {
    saveMatchupComment(2, 12, "something");
    saveMatchupComment(2, 12, "");
    expect(localStorage.getItem("rmgr_matchup_comment_2_12")).toBeNull();
    expect(loadMatchupComment(2, 12)).toBe("");
  });

  it("removes the storage entry when saving a whitespace-only string", () => {
    saveMatchupComment(2, 12, "something");
    saveMatchupComment(2, 12, "   \n  ");
    expect(loadMatchupComment(2, 12)).toBe("");
  });

  it("treats a matchup pair as directed - (2,12) and (12,2) are independent", () => {
    saveMatchupComment(2, 12, "my side");
    saveMatchupComment(12, 2, "their side");
    expect(loadMatchupComment(2, 12)).toBe("my side");
    expect(loadMatchupComment(12, 2)).toBe("their side");
  });

  it("overwrites an existing comment", () => {
    saveMatchupComment(2, 12, "first");
    saveMatchupComment(2, 12, "second");
    expect(loadMatchupComment(2, 12)).toBe("second");
  });

  describe("getAllMatchupComments", () => {
    it("returns an empty object when nothing is saved", () => {
      expect(getAllMatchupComments()).toEqual({});
    });

    it("returns every saved comment keyed by myChar_oppChar", () => {
      saveMatchupComment(2, 12, "comment a");
      saveMatchupComment(48, 50, "comment b");
      expect(getAllMatchupComments()).toEqual({
        "2_12": "comment a",
        "48_50": "comment b",
      });
    });

    it("does not include unrelated localStorage keys", () => {
      localStorage.setItem("rmgr_session_comment_session_x", "unrelated");
      saveMatchupComment(2, 12, "comment a");
      expect(getAllMatchupComments()).toEqual({ "2_12": "comment a" });
    });
  });

  describe("saveMatchupCommentByKey", () => {
    it("restores a comment from an exported key", () => {
      saveMatchupCommentByKey("2_12", "restored comment");
      expect(loadMatchupComment(2, 12)).toBe("restored comment");
    });

    it("is a no-op for an empty key", () => {
      saveMatchupCommentByKey("", "text");
      expect(getAllMatchupComments()).toEqual({});
    });
  });
});
