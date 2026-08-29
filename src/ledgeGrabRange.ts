import { VARIANT_TO_BASE_ID } from "./characterSizes.js";

/**
 * Temporary kill switch: a suspected bug in the reach-offset distance
 * itself is being investigated (with the remix agent) as of 2026-08-29.
 * Flip back to true once that's resolved and confirmed correct - this
 * disables the whole visualization (both the dot and the ledge-strip
 * highlight), not just part of it, since computeLedgeGrabCandidates() is
 * the single point both draw calls read from.
 */
export const LEDGE_GRAB_VISUALIZATION_ENABLED = false;

export interface LedgeGrabOffset {
  /** How far in front of (along facingDirection) the character's position the ledge-grab check point sits. */
  reachX: number;
  /** How far above the character's position (foot Y) the ledge-grab check point sits. */
  heightY: number;
}

/**
 * Ledge-grab reach offsets, per fighter - confirmed identical for the
 * Japanese-region character variants (characterSizes.ts's
 * VARIANT_TO_BASE_ID), so no separate table or exclusion is needed there;
 * resolving through that same variant map is enough.
 */
const LEDGE_GRAB_OFFSETS: Partial<Record<number, LedgeGrabOffset>> = {
  0x00: { reachX: 400, heightY: 360 }, // Mario
  0x04: { reachX: 400, heightY: 360 }, // Luigi
  0x01: { reachX: 400, heightY: 400 }, // Fox
  0x02: { reachX: 500, heightY: 600 }, // Donkey Kong
  0x03: { reachX: 440, heightY: 550 }, // Samus
  0x07: { reachX: 440, heightY: 550 }, // Captain Falcon
  0x06: { reachX: 420, heightY: 400 }, // Yoshi
  0x09: { reachX: 400, heightY: 280 }, // Pikachu
  0x05: { reachX: 280, heightY: 400 }, // Link
  0x0b: { reachX: 280, heightY: 420 }, // Ness
  0x08: { reachX: 250, heightY: 400 }, // Kirby
  0x0a: { reachX: 250, heightY: 400 }, // Jigglypuff
};

export function ledgeGrabOffset(
  characterId: number,
): LedgeGrabOffset | undefined {
  const resolvedId = VARIANT_TO_BASE_ID[characterId] ?? characterId;
  return LEDGE_GRAB_OFFSETS[resolvedId];
}

/** Half-width, in world X units, of the grabbable ledge strip extending inward from the stage edge. */
export const LEDGE_GRAB_ZONE_WIDTH = 800;

/** How close (in both X and Y, world units) a character must be to a ledge point before the ledge-grab visualization considers them "near" it. */
export const LEDGE_GRAB_PROXIMITY = 2400;

/**
 * Radius of the ledge-grab check-point dot, in world units (not screen
 * pixels) - so it shrinks/grows with the camera the same way a character
 * marker does (camera.worldLengthToScreen()), instead of staying a fixed
 * pixel size that looks correct at one specific zoom level and wrong at
 * every other one (e.g. the more zoomed-out framing a narrower mobile
 * viewport needs).
 *
 * 70 was an uncalibrated first guess and rendered roughly 2x the size of
 * the original fixed-6px dot at a typical zoom level - this value is
 * chosen to land close to that original, already-reasonable size instead.
 */
export const LEDGE_GRAB_DOT_RADIUS_WORLD_UNITS = 30;
