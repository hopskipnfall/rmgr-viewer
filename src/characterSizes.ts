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

// 8. Bowser: massive, wide spiked shell, heavy stance
const BOWSER_SIZE: CharacterSize = {
  height: CAPTAIN_FALCON_HEIGHT * 1.04,
  width: CAPTAIN_FALCON_HEIGHT * 1.04 * 1.05,
};

const GIGA_BOWSER_SIZE: CharacterSize = {
  height: BOWSER_SIZE.height * 1.18,
  width: BOWSER_SIZE.width * 1.18,
};

const GANONDORF_SIZE: CharacterSize = {
  height: CAPTAIN_FALCON_HEIGHT * 1.05,
  width: CAPTAIN_FALCON_SIZE.width * 1.06,
};

const WARIO_SIZE: CharacterSize = {
  height: MARIO_SIZE.height * 0.98,
  width: MARIO_SIZE.width * 1.16,
};

const DEDEDE_SIZE: CharacterSize = {
  height: DONKEY_KONG_SIZE.height * 0.96,
  width: DONKEY_KONG_SIZE.width * 1.02,
};

const MEWTWO_SIZE: CharacterSize = {
  height: CAPTAIN_FALCON_HEIGHT * 1.02,
  width: CAPTAIN_FALCON_SIZE.width * 0.88,
};

const SONIC_SIZE: CharacterSize = {
  height: MARIO_SIZE.height * 0.96,
  width: MARIO_SIZE.width * 0.9,
};

const PEACH_SIZE: CharacterSize = {
  height: SAMUS_SIZE.height * 0.98,
  width: MARIO_SIZE.width * 0.96,
};

const MARTH_SIZE: CharacterSize = {
  height: LINK_SIZE.height * 1.02,
  width: LINK_SIZE.width * 0.95,
};

const BANJO_SIZE: CharacterSize = {
  height: DONKEY_KONG_SIZE.height * 0.92,
  width: DONKEY_KONG_SIZE.width * 0.92,
};

const LANKY_KONG_SIZE: CharacterSize = {
  height: DONKEY_KONG_SIZE.height * 0.94,
  width: DONKEY_KONG_SIZE.width * 1.22,
};

const SANDBAG_SIZE: CharacterSize = {
  height: MARIO_SIZE.height * 0.85,
  width: MARIO_SIZE.width * 0.65,
};

const PIANO_SIZE: CharacterSize = {
  height: MARIO_SIZE.height * 0.95,
  width: MARIO_SIZE.width * 1.25,
};

const CONKER_SIZE: CharacterSize = {
  height: NESS_SIZE.height * 0.92,
  width: NESS_SIZE.width,
};

const CRASH_SIZE: CharacterSize = {
  height: MARIO_SIZE.height * 1.02,
  width: MARIO_SIZE.width * 0.9,
};

const SHEIK_SIZE: CharacterSize = {
  height: LINK_SIZE.height * 0.98,
  width: LINK_SIZE.width * 0.88,
};

const WOLF_SIZE: CharacterSize = {
  height: FOX_SIZE.height * 1.02,
  width: FOX_SIZE.width,
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
  0x1e: GANONDORF_SIZE, // Ganondorf
  0x21: WARIO_SIZE, // Wario
  0x34: BOWSER_SIZE, // Bowser
  0x35: GIGA_BOWSER_SIZE, // Giga Bowser
  0x36: PIANO_SIZE, // Mad Piano
  0x37: WOLF_SIZE, // Wolf
  0x38: CONKER_SIZE, // Conker
  0x39: MEWTWO_SIZE, // Mewtwo
  0x3a: MARTH_SIZE, // Marth
  0x3b: SONIC_SIZE, // Sonic
  0x3c: SANDBAG_SIZE, // Sandbag
  0x3d: SONIC_SIZE, // Super Sonic
  0x3e: SHEIK_SIZE, // Sheik
  0x40: DEDEDE_SIZE, // King Dedede
  0x44: BANJO_SIZE, // Banjo
  0x48: CRASH_SIZE, // Crash
  0x49: PEACH_SIZE, // Peach
  0x4c: LANKY_KONG_SIZE, // Lanky Kong
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
  0x26: 0x0b, // Lucas
  0x35: 0x34, // Giga Bowser
  0x45: 0x04, // Metal Luigi
  0x4f: 0x34, // Polygon Bowser

  // Remix Clones & Semi-Clones
  0x1d: 0x01, // Falco -> Fox
  0x1e: 0x07, // Ganondorf -> Falcon
  0x1f: 0x05, // Young Link -> Link
  0x20: 0x00, // Dr. Mario -> Mario
  0x21: 0x00, // Wario -> Mario
  0x22: 0x03, // Dark Samus -> Samus
  0x37: 0x01, // Wolf -> Fox
  0x4a: 0x05, // Roy -> Link
  0x4b: 0x04, // Dr. Luigi -> Luigi

  // Remix Polygons
  0x4d: 0x00, // Polygon Wario -> Mario
  0x4e: 0x0b, // Polygon Lucas -> Ness
  0x50: 0x01, // Polygon Wolf -> Fox
  0x51: 0x00, // Polygon Dr. Mario -> Mario
  0x55: 0x01, // Polygon Falco -> Fox
  0x56: 0x07, // Polygon Ganondorf -> Falcon
  0x57: 0x03, // Polygon Dark Samus -> Samus
  0x5b: 0x05, // Polygon Young Link -> Link

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
  0x1d: "#0284c7", // Falco - Cyan / Sky Blue
  0x1e: "#581c87", // Ganondorf - Dark Purple
  0x1f: "#65a30d", // Young Link - Kokiri Green
  0x20: "#f8fafc", // Dr. Mario - White Coat
  0x21: "#eab308", // Wario - Yellow
  0x22: "#3b0764", // Dark Samus - Phazon Indigo
  0x26: "#f59e0b", // Lucas - Amber / Orange
  0x34: "#15803d", // Bowser - Forest Green
  0x35: "#7f1d1d", // Giga Bowser - Blood Red
  0x37: "#64748b", // Wolf - Slate Gray
  0x38: "#f97316", // Conker - Squirrel Orange
  0x39: "#c084fc", // Mewtwo - Psychic Purple
  0x3a: "#2563eb", // Marth - Royal Blue
  0x3b: "#0284c7", // Sonic - Cobalt Blue
  0x3e: "#6366f1", // Sheik - Indigo
  0x3f: "#06b6d4", // Marina - Cyan
  0x40: "#dc2626", // King Dedede - Regal Red
  0x44: "#b45309", // Banjo - Honey Bear Brown
  0x48: "#ea580c", // Crash - Bandicoot Orange
  0x49: "#f472b6", // Peach - Princess Pink
  0x4a: "#dc2626", // Roy - Crimson Fire
};

export function getCharacterIconicColor(characterId: number): string {
  const resolvedId = VARIANT_TO_BASE_ID[characterId] ?? characterId;
  return CHARACTER_ICONIC_COLORS[resolvedId] ?? "#3b82f6";
}
