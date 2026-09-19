import {
  isFoxCharacter,
  isFalconCharacter,
  isSamusCharacter,
  isLinkCharacter,
} from "./characterSpecials.js";

export type AttackType =
  | "tilt"
  | "smash"
  | "aerial"
  | "jab"
  | "grab"
  | "dash-attack"
  | "getup-attack"
  | "ledge-attack";
export type AttackDirection = "up" | "down" | "forward" | "back" | "neutral";

export interface AttackInfo {
  type: AttackType;
  direction: AttackDirection;
  subType?: "quick" | "slow";
}

export function getAttackInfo(
  actionStateId: number,
  characterId?: number,
): AttackInfo | null {
  // Ground Get-Up Attacks
  if (actionStateId === 0x04f || actionStateId === 0x050) {
    return { type: "getup-attack", direction: "neutral" };
  }

  // Ledge Attacks (0x05c/0x05e are climbing up from ledge; 0x05d/0x05f are active attack strikes)
  if (actionStateId === 0x05d) {
    return { type: "ledge-attack", direction: "forward", subType: "quick" };
  }
  if (actionStateId === 0x05f) {
    return { type: "ledge-attack", direction: "forward", subType: "slow" };
  }

  // Jabs
  if (actionStateId === 0x0be || actionStateId === 0x0bf) {
    return { type: "jab", direction: "forward" };
  }

  // Dash Attack
  if (actionStateId === 0x0c0) {
    return { type: "dash-attack", direction: "forward" };
  }

  // Grabs (standard 0x0a6/0x0a7/0x0a8)
  // Note: Link in 0x0a8 is holding an opponent (CatchWait); hookshot is retracted
  if (
    actionStateId === 0x0a6 ||
    actionStateId === 0x0a7 ||
    (actionStateId === 0x0a8 &&
      !(characterId !== undefined && isLinkCharacter(characterId)))
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
