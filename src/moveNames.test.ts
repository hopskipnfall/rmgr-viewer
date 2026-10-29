import { describe, it, expect } from "vitest";
import { moveDisplayName } from "./moveNames.js";

const PIKACHU = 0x09;
const PIKACHU_JP = 0x32;
const YOSHI = 0x06;
const KIRBY = 0x08;

describe("moveDisplayName", () => {
  it("names shared moves the way players do, in both languages", () => {
    expect(moveDisplayName(0x0d4, PIKACHU, "en")).toBe("Up air");
    expect(moveDisplayName(0x0d4, PIKACHU, "ja")).toBe("空上");
    expect(moveDisplayName(0x0cb, YOSHI, "en")).toBe("Forward smash");
    expect(moveDisplayName(0x019, PIKACHU, "en")).toBe("Double jump");
    expect(moveDisplayName(0x022, PIKACHU, "en")).toBe("Shield drop");
    expect(moveDisplayName(0x031, PIKACHU, "en")).toBe("Hitstun");
  });

  it("names specials per character, pooling region variants", () => {
    // Pikachu's aerial Up-B start and Yoshi's grounded neutral B (see rmgr-ts's tables).
    expect(moveDisplayName(0x0eb, PIKACHU, "en")).toBe("Quick Attack");
    expect(moveDisplayName(0x0eb, PIKACHU_JP, "ja")).toBe("でんこうせっか");
    expect(moveDisplayName(0x0e4, YOSHI, "en")).toBe("Egg Lay");
    expect(moveDisplayName(0x0dc, PIKACHU, "en")).toBe("Respawn");
  });

  it("names Kirby's copied neutral B after the character it came from", () => {
    expect(moveDisplayName(0x0eb, KIRBY, "en")).toBe("Blaster");
  });

  it("falls back to the engine name for states without a player-facing one", () => {
    expect(moveDisplayName(0x0b0, PIKACHU, "en")).toBe("State 0xb0");
  });
});
