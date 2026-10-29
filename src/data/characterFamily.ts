import { JP_ORIGINAL_12_IDS, NA_ORIGINAL_12_IDS } from "@rmg-k/rmgr";

/** EU region variants of the original 12, mapped to the NA character they play like. */
const EU_TO_NA: Readonly<Record<number, number>> = {
  0x23: 0x05, // LinkEU -> Link
  0x2d: 0x09, // PikachuEU -> Pikachu
  0x2f: 0x0a, // JigglypuffEU -> Jigglypuff
  0x33: 0x03, // SamusEU -> Samus
};

/**
 * The character a region variant belongs to (Pikachu (JP) -> Pikachu), so a main played across
 * NA/JP builds is one scope. Remix characters map to themselves.
 */
export function characterFamily(characterId: number): number {
  const jpIndex = JP_ORIGINAL_12_IDS.indexOf(characterId);
  if (jpIndex >= 0) return NA_ORIGINAL_12_IDS[jpIndex] ?? characterId;
  return EU_TO_NA[characterId] ?? characterId;
}
