import {
  isFoxCharacter,
  isFalconCharacter,
  isSamusCharacter,
  isLinkCharacter,
} from "./characterSpecials.js";

export type AttackType =
  "tilt" | "smash" | "aerial" | "jab" | "grab" | "dash-attack";
export type AttackDirection = "up" | "down" | "forward" | "back" | "neutral";

export interface AttackInfo {
  type: AttackType;
  direction: AttackDirection;
}

export function getAttackInfo(
  actionStateId: number,
  characterId?: number,
): AttackInfo | null {
  // Jabs
  if (actionStateId === 0x0be || actionStateId === 0x0bf) {
    return { type: "jab", direction: "forward" };
  }

  // Dash Attack
  if (actionStateId === 0x0c0) {
    return { type: "dash-attack", direction: "forward" };
  }

  // Grabs (standard + Link/Samus grapple grabs in Special 0x0e5)
  if (
    actionStateId === 0x0a6 ||
    actionStateId === 0x0a7 ||
    actionStateId === 0x0a8 ||
    (characterId !== undefined &&
      (isLinkCharacter(characterId) || isSamusCharacter(characterId)) &&
      actionStateId === 0x0e5)
  ) {
    return { type: "grab", direction: "forward" };
  }

  // Grounded Tilts
  if (actionStateId === 0x0c7) {
    return { type: "tilt", direction: "up" };
  }
  if (actionStateId === 0x0c9) {
    return { type: "tilt", direction: "down" };
  }
  if (actionStateId >= 0x0c1 && actionStateId <= 0x0c5) {
    return { type: "tilt", direction: "forward" };
  }

  // Grounded Smashes
  if (actionStateId === 0x0cf) {
    return { type: "smash", direction: "up" };
  }
  if (actionStateId === 0x0d0) {
    return { type: "smash", direction: "down" };
  }
  if (actionStateId >= 0x0ca && actionStateId <= 0x0ce) {
    return { type: "smash", direction: "forward" };
  }

  // Aerial Attacks
  if (actionStateId === 0x0d1) {
    return { type: "aerial", direction: "neutral" }; // Nair
  }
  if (actionStateId === 0x0d2) {
    return { type: "aerial", direction: "forward" }; // Fair
  }
  if (actionStateId === 0x0d3) {
    return { type: "aerial", direction: "back" }; // Bair
  }
  if (actionStateId === 0x0d4) {
    return { type: "aerial", direction: "up" }; // Uair
  }
  if (actionStateId === 0x0d5) {
    return { type: "aerial", direction: "down" }; // Dair
  }

  return null;
}

/**
 * Returns whether a character can angle their attack (specifically forward tilt or forward smash).
 * - Fox, Captain Falcon, Samus can angle forward tilt (FTilt) attacks.
 * - Captain Falcon, Samus can angle forward smash (FSmash) attacks.
 */
export function canAngleAttack(
  characterId: number,
  attack: AttackInfo,
): boolean {
  if (attack.direction !== "forward") {
    return false;
  }
  if (attack.type === "tilt") {
    return (
      isFoxCharacter(characterId) ||
      isFalconCharacter(characterId) ||
      isSamusCharacter(characterId)
    );
  }
  if (attack.type === "smash") {
    return isFalconCharacter(characterId) || isSamusCharacter(characterId);
  }
  return false;
}
