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

export function characterName(
  id: number,
  lang?: Language,
  goodName?: string,
): string {
  const language = lang ?? getLanguage();
  return getCharacterName(id, { goodName, lang: language });
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
): string {
  const language = lang ?? getLanguage();
  return getActionStateName(id, { goodName, lang: language });
}
