import { DREAM_LAND_SIDE_PLATFORM_GAP } from "./stageGeometry.js";

/**
 * Player marker dimensions in world units, calibrated against the
 * Dream Land ground-to-side-platform gap.
 *
 * Height hierarchy (calibrated with Pikachu anchored at 40% of the platform gap):
 * 1. Samus: tallest (~1.62x Pikachu)
 * 2. Captain Falcon: tiny bit smaller (~1.53x Pikachu)
 * 3. Link, Fox, DK: tiny bit smaller (~1.42x Pikachu)
 * 4. Yoshi, Luigi: little bit smaller (~1.28x Pikachu)
 * 5. Ness, Mario: little bit smaller (~1.14x Pikachu)
 * 6. Pikachu: little bit smaller (1.00x Pikachu, anchored)
 * 7. Kirby, Jigglypuff: little bit smaller (~0.88x Pikachu)
 */
export interface CharacterSize {
  width: number;
  height: number;
}

// Anchored base height: 40% of Dream Land ground-to-side-platform gap (~362.2 world units)
const PIKACHU_HEIGHT = DREAM_LAND_SIDE_PLATFORM_GAP * 0.4;
const DEFAULT_HEIGHT = PIKACHU_HEIGHT;
const DEFAULT_WIDTH = DEFAULT_HEIGHT;
const DEFAULT_SIZE: CharacterSize = {
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
};

// 2. Captain Falcon (restored to original 2/3 Dream Land platform gap)
const CAPTAIN_FALCON_HEIGHT = (DREAM_LAND_SIDE_PLATFORM_GAP * 2) / 3;
const CAPTAIN_FALCON_SIZE: CharacterSize = {
  height: CAPTAIN_FALCON_HEIGHT,
  width: DEFAULT_WIDTH * 0.85,
};

// 1. Samus (tallest, tiny bit taller than Falcon)
const SAMUS_SIZE: CharacterSize = {
  height: CAPTAIN_FALCON_HEIGHT * 1.06,
  width: CAPTAIN_FALCON_HEIGHT * 1.06 * 0.8,
};

// 3. Link, Fox, Donkey Kong (tiny bit smaller than Falcon)
const LINK_SIZE: CharacterSize = {
  height: CAPTAIN_FALCON_HEIGHT * 0.92,
  width: CAPTAIN_FALCON_HEIGHT * 0.92 * 0.88,
};

const FOX_SIZE: CharacterSize = {
  height: CAPTAIN_FALCON_HEIGHT * 0.92,
  width: CAPTAIN_FALCON_HEIGHT * 0.92 * 0.88,
};

const DONKEY_KONG_SIZE: CharacterSize = {
  height: CAPTAIN_FALCON_HEIGHT * 0.92,
  width: CAPTAIN_FALCON_HEIGHT * 0.92 * 1.02,
};

// 4. Yoshi, Luigi (little bit smaller than Link/Fox/DK)
const YOSHI_SIZE: CharacterSize = {
  height: CAPTAIN_FALCON_HEIGHT * 0.81,
  width: CAPTAIN_FALCON_HEIGHT * 0.81 * 0.95,
};

const LUIGI_SIZE: CharacterSize = {
  height: CAPTAIN_FALCON_HEIGHT * 0.81,
  width: CAPTAIN_FALCON_HEIGHT * 0.81 * 0.82,
};

// 5. Ness, Mario (little bit smaller than Yoshi/Luigi)
const NESS_SIZE: CharacterSize = {
  height: CAPTAIN_FALCON_HEIGHT * 0.7,
  width: CAPTAIN_FALCON_HEIGHT * 0.7 * 0.95,
};

const MARIO_SIZE: CharacterSize = {
  height: CAPTAIN_FALCON_HEIGHT * 0.7,
  width: CAPTAIN_FALCON_HEIGHT * 0.7 * 0.96,
};

// 6. Pikachu (little bit smaller than Ness/Mario - ANCHORED)
const PIKACHU_SIZE: CharacterSize = {
  height: PIKACHU_HEIGHT,
  width: PIKACHU_HEIGHT,
};

// 7. Kirby, Jigglypuff (little bit smaller than Pikachu)
const KIRBY_SIZE: CharacterSize = {
  height: PIKACHU_HEIGHT * 0.88,
  width: PIKACHU_HEIGHT * 0.88,
};

const JIGGLYPUFF_SIZE: CharacterSize = {
  height: PIKACHU_HEIGHT * 0.88,
  width: PIKACHU_HEIGHT * 0.88,
};

const CHARACTER_SIZES: Partial<Record<number, CharacterSize>> = {
  0x00: MARIO_SIZE, // Mario
  0x01: FOX_SIZE, // Fox
  0x02: DONKEY_KONG_SIZE, // Donkey Kong
  0x03: SAMUS_SIZE, // Samus
  0x04: LUIGI_SIZE, // Luigi
  0x05: LINK_SIZE, // Link
  0x06: YOSHI_SIZE, // Yoshi
  0x07: CAPTAIN_FALCON_SIZE, // Captain Falcon
  0x08: KIRBY_SIZE, // Kirby
  0x09: PIKACHU_SIZE, // Pikachu
  0x0a: JIGGLYPUFF_SIZE, // Jigglypuff
  0x0b: NESS_SIZE, // Ness
};

// Map variants (Polygon, JP, EU, Boss/Metal) to base character IDs
export const VARIANT_TO_BASE_ID: Partial<Record<number, number>> = {
  // Polygon Team
  0x0e: 0x00, // Polygon Mario
  0x0f: 0x01, // Polygon Fox
  0x10: 0x02, // Polygon DK
  0x11: 0x03, // Polygon Samus
  0x12: 0x04, // Polygon Luigi
  0x13: 0x05, // Polygon Link
  0x14: 0x06, // Polygon Yoshi
  0x15: 0x07, // Polygon Falcon
  0x16: 0x08, // Polygon Kirby
  0x17: 0x09, // Polygon Pikachu
  0x18: 0x0a, // Polygon Jigglypuff
  0x19: 0x0b, // Polygon Ness

  // Special Variants
  0x0d: 0x00, // Metal Mario
  0x1a: 0x02, // Giant DK
  0x26: 0x06, // Giant Yoshi
  0x45: 0x04, // Metal Luigi

  // JP Region Variants
  0x24: 0x03, // Samus (JP)
  0x25: 0x0b, // Ness (JP)
  0x27: 0x05, // Link (JP)
  0x28: 0x07, // Falcon (JP)
  0x29: 0x01, // Fox (JP)
  0x2a: 0x00, // Mario (JP)
  0x2b: 0x04, // Luigi (JP)
  0x2c: 0x02, // DK (JP)
  0x2e: 0x0a, // Jigglypuff (JP)
  0x30: 0x08, // Kirby (JP)
  0x31: 0x06, // Yoshi (JP)
  0x32: 0x09, // Pikachu (JP)

  // EU Region Variants
  0x23: 0x05, // Link (EU)
  0x2d: 0x09, // Pikachu (EU)
  0x2f: 0x0a, // Jigglypuff (EU)
  0x33: 0x03, // Samus (EU)
};

export function characterSize(characterId: number): CharacterSize {
  const resolvedId = VARIANT_TO_BASE_ID[characterId] ?? characterId;
  return CHARACTER_SIZES[resolvedId] ?? DEFAULT_SIZE;
}

export const CHARACTER_ICONIC_COLORS: Readonly<Record<number, string>> = {
  0x00: "#ef4444", // Mario - Red
  0x01: "#2563eb", // Fox - Blue Fox / Royal Blue
  0x02: "#b45309", // Donkey Kong - Amber / Brown
  0x03: "#ea580c", // Samus - Dark Orange / Varia Suit
  0x04: "#22c55e", // Luigi - Green
  0x05: "#16a34a", // Link - Forest Green
  0x06: "#84cc16", // Yoshi - Lime Green
  0x07: "#3b82f6", // Captain Falcon - Blue
  0x08: "#ec4899", // Kirby - Pink
  0x09: "#eab308", // Pikachu - Electric Yellow
  0x0a: "#f472b6", // Jigglypuff - Rose Pink
  0x0b: "#ef4444", // Ness - Red
  0x0c: "#a855f7", // Master Hand - Purple
  0x0d: "#94a3b8", // Metal Mario - Steel
};

export function getCharacterIconicColor(characterId: number): string {
  const resolvedId = VARIANT_TO_BASE_ID[characterId] ?? characterId;
  return CHARACTER_ICONIC_COLORS[resolvedId] ?? "#3b82f6";
}
