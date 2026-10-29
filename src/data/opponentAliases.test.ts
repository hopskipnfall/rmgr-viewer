import { beforeEach, describe, expect, it } from "vitest";
import {
  addOpponentMerge,
  canonicalOpponentName,
  loadOpponentAliases,
  mergeOpponentAliases,
  normalizeOpponentAliases,
  OPPONENT_ALIASES_STORAGE_KEY,
  removeOpponentMerge,
  saveOpponentAliases,
} from "./opponentAliases.js";
import { loadIdentity, saveIdentity } from "./identity.js";
import { collectUserData, applyUserData } from "./userData.js";
import { onUserDataChanged } from "./userDataChanged.js";

describe("canonicalOpponentName", () => {
  const aliases = { kusora_JPN: "kusora", kusora_YoutubeLive: "kusora" };

  it("maps an alternate tag to its canonical tag", () => {
    expect(canonicalOpponentName("kusora_JPN", aliases)).toBe("kusora");
    expect(canonicalOpponentName("  kusora_YoutubeLive ", aliases)).toBe(
      "kusora",
    );
  });

  it("leaves unmerged tags (and the canonical tag itself) alone, trimmed", () => {
    expect(canonicalOpponentName("kusora", aliases)).toBe("kusora");
    expect(canonicalOpponentName(" shido ", aliases)).toBe("shido");
  });

  it("is case-sensitive", () => {
    expect(canonicalOpponentName("Kusora_JPN", aliases)).toBe("Kusora_JPN");
  });

  it("works with no alias map", () => {
    expect(canonicalOpponentName(" nue ")).toBe("nue");
  });

  it("is not fooled by names that collide with Object.prototype", () => {
    expect(canonicalOpponentName("constructor", aliases)).toBe("constructor");
    expect(canonicalOpponentName("toString", {})).toBe("toString");
  });

  it("terminates on a cyclic map", () => {
    const cyclic = { a: "b", b: "a" };
    expect(["a", "b"]).toContain(canonicalOpponentName("a", cyclic));
  });
});

describe("normalizeOpponentAliases", () => {
  it("drops junk: non-strings, empties and self-maps, and trims", () => {
    expect(
      normalizeOpponentAliases({
        " a ": " b ",
        c: "c",
        d: "",
        "": "e",
        f: 3,
        g: null,
      }),
    ).toEqual({ a: "b" });
    expect(normalizeOpponentAliases(null)).toEqual({});
    expect(normalizeOpponentAliases([["a", "b"]])).toEqual({});
    expect(normalizeOpponentAliases("nope")).toEqual({});
  });

  it("collapses chains to the final canonical tag", () => {
    expect(normalizeOpponentAliases({ a: "b", b: "c", c: "d" })).toEqual({
      a: "d",
      b: "d",
      c: "d",
    });
  });

  it("breaks cycles instead of looping", () => {
    const result = normalizeOpponentAliases({ a: "b", b: "a", x: "a" });
    for (const [alt, target] of Object.entries(result)) {
      expect(alt).not.toBe(target);
      expect(Object.keys(result)).not.toContain(target);
    }
  });
});

describe("addOpponentMerge / removeOpponentMerge", () => {
  it("merges a tag into another", () => {
    expect(addOpponentMerge({}, "kusora_JPN", "kusora")).toEqual({
      kusora_JPN: "kusora",
    });
  });

  it("maps to the target's canonical tag when the target is itself an alias", () => {
    const start = { b: "c" };
    expect(addOpponentMerge(start, "a", "b")).toEqual({ a: "c", b: "c" });
  });

  it("repoints everything that mapped to the merged tag (no chains)", () => {
    // x is a tag of a; merging a into b moves x as well.
    const result = addOpponentMerge({ x: "a" }, "a", "b");
    expect(result).toEqual({ x: "b", a: "b" });
    for (const target of Object.values(result)) {
      expect(Object.keys(result)).not.toContain(target);
    }
  });

  it("merges the whole group when the merged tag is itself an alias", () => {
    const result = addOpponentMerge({ a: "c" }, "a", "b");
    expect(canonicalOpponentName("a", result)).toBe("b");
    expect(canonicalOpponentName("c", result)).toBe("b");
  });

  it("refuses a cycle: merging a tag into its own canonical or a sibling is a no-op", () => {
    const start = { a: "b", c: "b" };
    expect(addOpponentMerge(start, "b", "a")).toBe(start);
    expect(addOpponentMerge(start, "a", "c")).toBe(start);
    expect(addOpponentMerge(start, "b", "b")).toBe(start);
  });

  it("ignores empty tags", () => {
    const start = { a: "b" };
    expect(addOpponentMerge(start, " ", "b")).toBe(start);
    expect(addOpponentMerge(start, "a", "")).toBe(start);
  });

  it("does not mutate its input", () => {
    const start = Object.freeze({ a: "b" });
    addOpponentMerge(start, "c", "a");
    expect(start).toEqual({ a: "b" });
  });

  it("unmerges one tag and leaves the rest", () => {
    const start = { a: "c", b: "c" };
    expect(removeOpponentMerge(start, "a")).toEqual({ b: "c" });
    expect(removeOpponentMerge(start, "zzz")).toBe(start);
  });

  it("merges two maps with the incoming one winning, normalized", () => {
    expect(mergeOpponentAliases({ a: "b" }, { b: "c" })).toEqual({
      a: "c",
      b: "c",
    });
    expect(mergeOpponentAliases({ a: "b" }, { a: "z" })).toEqual({ a: "z" });
  });
});

describe("opponent alias persistence", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    (globalThis as unknown as { localStorage: Partial<Storage> }).localStorage =
      {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
        get length() {
          return store.size;
        },
        key: (i: number) => [...store.keys()][i] ?? null,
      };
  });

  it("round-trips through localStorage", () => {
    saveOpponentAliases({ shidozz2: "shido", shidozzzz: "shido" });
    expect(loadOpponentAliases()).toEqual({
      shidozz2: "shido",
      shidozzzz: "shido",
    });
  });

  it("removes the storage entry when the map is emptied", () => {
    saveOpponentAliases({ a: "b" });
    saveOpponentAliases({});
    expect(store.has(OPPONENT_ALIASES_STORAGE_KEY)).toBe(false);
    expect(loadOpponentAliases()).toEqual({});
  });

  it("treats corrupt data as empty", () => {
    store.set(OPPONENT_ALIASES_STORAGE_KEY, "{not json");
    expect(loadOpponentAliases()).toEqual({});
  });

  it("notifies user-data listeners so the desktop project file is rewritten", () => {
    let calls = 0;
    const off = onUserDataChanged(() => calls++);
    saveOpponentAliases({ a: "b" });
    off();
    expect(calls).toBe(1);
  });

  it("is loaded onto the identity and saved back with it", () => {
    saveOpponentAliases({ a: "b" });
    const identity = loadIdentity();
    expect(identity.opponentAliases).toEqual({ a: "b" });
    saveIdentity({ ...identity, opponentAliases: { c: "d" } });
    expect(loadOpponentAliases()).toEqual({ c: "d" });
  });

  it("saveIdentity leaves the merges alone when the identity carries none", () => {
    saveOpponentAliases({ a: "b" });
    saveIdentity({ displayName: "", aliases: new Set() });
    expect(loadOpponentAliases()).toEqual({ a: "b" });
  });

  it("is collected into, and restored from, the desktop project data", () => {
    saveOpponentAliases({ a: "b" });
    const file = collectUserData(localStorage);
    expect(file.opponentAliases).toEqual({ a: "b" });

    store.clear();
    applyUserData(localStorage, file);
    expect(loadOpponentAliases()).toEqual({ a: "b" });

    // Applying a file without merges clears stale ones.
    applyUserData(localStorage, { ...file, opponentAliases: {} });
    expect(loadOpponentAliases()).toEqual({});
  });
});
