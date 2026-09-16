import { beforeEach, describe, expect, it } from "vitest";
import {
  createDefaultIdentity,
  loadIdentity,
  saveIdentity,
} from "./identity.js";

describe("identity persistence", () => {
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

  it("loads the empty default when nothing is saved", () => {
    const identity = loadIdentity();
    expect(identity.displayName).toBe("");
    expect(identity.aliases.size).toBe(0);
  });

  it("round-trips the display name and aliases across a reload", () => {
    const identity = createDefaultIdentity("nue");
    identity.aliases.add("nue2");
    saveIdentity(identity);

    const loaded = loadIdentity();
    expect(loaded.displayName).toBe("nue");
    expect([...loaded.aliases].sort()).toEqual(["nue", "nue2"]);
  });

  it("falls back to the default when the saved value is corrupt", () => {
    store.set("rmgr-viewer-identity", "{not json");
    expect(loadIdentity().aliases.size).toBe(0);
  });
});
