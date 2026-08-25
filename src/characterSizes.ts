import { DREAM_LAND_SIDE_PLATFORM_GAP } from "./stageGeometry.js";

/**
 * Player marker dimensions in world units, so a character's on-screen size
 * stays proportionally correct as the camera zooms in/out.
 *
 * Calibrated against the Dream Land ground-to-side-platform gap (a real
 * measurement, see stageGeometry.ts) since that's a size every character
 * can be eyeballed against: default height/width is 40% of that gap, which
 * is Pikachu and Ness's size. Only characters whose proportions clearly
 * differ enough to be worth it get an explicit override; everyone else
 * (including Pikachu and Ness) uses the default.
 *
 * "(JP)" region-variant character IDs (see lookups.ts CHARACTER_NAMES) use
 * their non-region-locked original's size, via JP_VARIANT_TO_BASE_ID below -
 * for simplicity, "(EU)" variants aren't mapped and just fall through to
 * the default like any other unlisted character.
 */
export interface CharacterSize {
  width: number;
  height: number;
}

const DEFAULT_HEIGHT = DREAM_LAND_SIDE_PLATFORM_GAP * 0.4;
const DEFAULT_WIDTH = DEFAULT_HEIGHT;
const DEFAULT_SIZE: CharacterSize = {
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
};

// Captain Falcon (0x07, see lookups.ts CHARACTER_NAMES): about 2/3 the
// ground-to-side-platform gap tall, a little skinnier than default width.
// The width reduction is eyeballed (no measurement backs it) - adjust if it
// looks off next to real footage.
const CAPTAIN_FALCON_ID = 0x07;
const CAPTAIN_FALCON_SIZE: CharacterSize = {
  width: DEFAULT_WIDTH * 0.85,
  height: (DREAM_LAND_SIDE_PLATFORM_GAP * 2) / 3,
};

// Donkey Kong (0x02): square (width == height), exactly the full
// ground-to-side-platform gap tall.
const DONKEY_KONG_ID = 0x02;
const DONKEY_KONG_SIZE: CharacterSize = {
  width: DREAM_LAND_SIDE_PLATFORM_GAP,
  height: DREAM_LAND_SIDE_PLATFORM_GAP,
};

const CHARACTER_SIZES: Partial<Record<number, CharacterSize>> = {
  [CAPTAIN_FALCON_ID]: CAPTAIN_FALCON_SIZE,
  [DONKEY_KONG_ID]: DONKEY_KONG_SIZE,
};

// Each "(JP)" character ID mapped to the ID whose size it should share.
const JP_VARIANT_TO_BASE_ID: Partial<Record<number, number>> = {
  0x24: 0x03, // Samus (JP) -> Samus
  0x25: 0x0b, // Ness (JP) -> Ness
  0x27: 0x05, // Link (JP) -> Link
  0x28: CAPTAIN_FALCON_ID, // Falcon (JP) -> Captain Falcon
  0x29: 0x01, // Fox (JP) -> Fox
  0x2a: 0x00, // Mario (JP) -> Mario
  0x2b: 0x04, // Luigi (JP) -> Luigi
  0x2c: DONKEY_KONG_ID, // DK (JP) -> Donkey Kong
  0x2e: 0x0a, // Jigglypuff (JP) -> Jigglypuff
  0x30: 0x08, // Kirby (JP) -> Kirby
  0x31: 0x06, // Yoshi (JP) -> Yoshi
  0x32: 0x09, // Pikachu (JP) -> Pikachu
};

export function characterSize(characterId: number): CharacterSize {
  const resolvedId = JP_VARIANT_TO_BASE_ID[characterId] ?? characterId;
  return CHARACTER_SIZES[resolvedId] ?? DEFAULT_SIZE;
}
