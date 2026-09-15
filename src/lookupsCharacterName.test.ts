import { describe, expect, it } from "vitest";
import { characterName } from "./lookups.js";

describe("characterName", () => {
  it("marks Japanese-version characters with the flag instead of (JP)", () => {
    expect(characterName(0x32, "en")).toBe("Pikachu 🇯🇵");
    expect(characterName(0x32, "ja")).toBe("ピカチュウ 🇯🇵");
  });

  it("leaves NA characters unchanged", () => {
    expect(characterName(0x09, "en")).toBe("Pikachu");
    expect(characterName(0x09, "ja")).toBe("ピカチュウ");
  });
});
