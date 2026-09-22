/**
 * Display-name helpers and re-exports backed by @rmg-k/rmgr.
 */
import {
  ACTION_STATE_NAMES,
  ACTION_STATE_NAMES_JA,
  ActionStateId,
  CHARACTER_NAMES,
  CHARACTER_NAMES_JA,
  CharacterId,
  getActionStateName,
  getCharacterGroup,
  getCharacterName,
  getGameDefinitions,
  getStageName,
  isFoxCharacter,
  isGrabState,
  isJigglypuffCharacter,
  isJPOriginal12,
  isLedgeState,
  isMarioCharacter,
  isNAOriginal12,
  isNessCharacter,
  isShieldBreakState,
  isShieldState,
  isShieldStunState,
  isYoshiCharacter,
  JP_ORIGINAL_12_IDS,
  NA_ORIGINAL_12_IDS,
  STAGE_NAMES,
  STAGE_NAMES_JA,
  StageId,
  type CharacterGroup,
  type GameDefinitions,
  type GoodName,
} from "@rmg-k/rmgr";
import { getLanguage, type Language } from "./i18n.js";

export {
  ACTION_STATE_NAMES,
  ACTION_STATE_NAMES_JA,
  ActionStateId,
  CHARACTER_NAMES,
  CHARACTER_NAMES_JA,
  CharacterId,
  STAGE_NAMES,
  STAGE_NAMES_JA,
  StageId,
  getGameDefinitions,
  getCharacterGroup,
  isFoxCharacter,
  isGrabState,
  isJigglypuffCharacter,
  isJPOriginal12,
  isLedgeState,
  isMarioCharacter,
  isNAOriginal12,
  isNessCharacter,
  isShieldBreakState,
  isShieldState,
  isShieldStunState,
  isYoshiCharacter,
  JP_ORIGINAL_12_IDS,
  NA_ORIGINAL_12_IDS,
  type CharacterGroup,
  type GameDefinitions,
  type GoodName,
};

/**
 * Display name for a character in the current UI language. rmgr-ts names
 * the Japanese-version characters "Pikachu (JP)" / "ピカチュウ (JP)"; the app
 * marks them with the 🇯🇵 flag instead, matching characterIconHtml's badge.
 */
export function characterName(
  id: number,
  lang?: Language,
  goodName?: string,
): string {
  const language = lang ?? getLanguage();
  return getCharacterName(id, { goodName, lang: language }).replace(
    / \(JP\)$/,
    " 🇯🇵",
  );
}

export function stageName(
  id: number,
  lang?: Language,
  goodName?: string,
): string {
  const language = lang ?? getLanguage();
  return getStageName(id, { goodName, lang: language });
}

export function actionStateName(
  id: number,
  lang?: Language,
  goodName?: string,
  /** Resolves a character-specific special-move name (id >= 0x0dc) for one of the original 12 - see rmgr-ts's LookupOptions.characterId. */
  characterId?: number,
): string {
  const language = lang ?? getLanguage();
  return getActionStateName(id, { goodName, lang: language, characterId });
}
