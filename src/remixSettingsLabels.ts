/**
 * Human-readable field labels for Remix's Toggles.asm Gameplay/Stage
 * Settings (`RemixGameplaySettings`/`RemixStageSettings` from @rmg-k/rmgr,
 * recorder schema 3+ - RMGR_SPEC.md §5.1.1/§5.1.2). English only, matching
 * @rmg-k/rmgr's own `getRemixSettingValueName()`, which likewise has no
 * translated value tables - these are Smash Remix's own in-game menu
 * terminology, not UI chrome, so they're left untranslated rather than
 * guessing at a Japanese localization the upstream project doesn't provide.
 */
import type {
  RemixGameplaySettings,
  RemixSettingField,
  RemixStageSettings,
} from "@rmg-k/rmgr";

export const REMIX_GAMEPLAY_SETTING_FIELD_ORDER: readonly (keyof RemixGameplaySettings)[] =
  [
    "hitstun",
    "hitlag",
    "di",
    "japaneseSounds",
    "japaneseStunSleep",
    "momentumSlide",
    "shieldStun",
    "zCancel",
    "punishFailedZCancel",
    "improvedAI",
    "tripping",
    "rage",
    "footstoolJumping",
    "airDodging",
    "jabLocking",
    "edgeCJumping",
    "perfectShielding",
    "parrying",
    "spotDodging",
    "fastFallAerials",
    "ledgeTrumping",
    "wallTeching",
    "chargeSmashes",
    "itemContainers",
    "gameSpeed",
    "specialZoom",
    "blastzoneWarp",
    "singleButtonMode",
    "allItemsRDropAerial",
    "moveStaling",
    "stopwatchItem",
  ];

export const REMIX_STAGE_SETTING_FIELD_ORDER: readonly (keyof RemixStageSettings)[] =
  [
    "stageSelectLayout",
    "hazardMode",
    "whispyMode",
    "saffronPokemonRate",
    "pokemonAnnouncer",
    "dragonKingHUD",
    "cameraMode",
    "yoshiIslandCloudAnims",
  ];

const REMIX_SETTING_FIELD_LABELS: Readonly<Record<string, string>> = {
  hitstun: "Hitstun",
  hitlag: "Hitlag",
  di: "DI",
  japaneseSounds: "Japanese Sounds",
  japaneseStunSleep: "Japanese Stun/Sleep",
  momentumSlide: "Momentum Slide",
  shieldStun: "Shield Stun",
  zCancel: "Z-Cancel",
  punishFailedZCancel: "Punish Failed Z-Cancel",
  improvedAI: "Improved AI",
  tripping: "Tripping",
  rage: "Rage",
  footstoolJumping: "Footstool Jumping",
  airDodging: "Air Dodging",
  jabLocking: "Jab Locking",
  edgeCJumping: "Edge-Cancel Jumping",
  perfectShielding: "Perfect Shielding",
  parrying: "Parrying",
  spotDodging: "Spot Dodging",
  fastFallAerials: "Fast-Fall Aerials",
  ledgeTrumping: "Ledge Trumping",
  wallTeching: "Wall Teching",
  chargeSmashes: "Charge Smashes",
  itemContainers: "Item Containers",
  gameSpeed: "Game Speed",
  specialZoom: "Special Zoom",
  blastzoneWarp: "Blastzone Warp",
  singleButtonMode: "Single Button Mode",
  allItemsRDropAerial: "All Items R-Drop Aerial",
  moveStaling: "Move Staling",
  stopwatchItem: "Stopwatch Item",
  stageSelectLayout: "Stage Select Layout",
  hazardMode: "Hazard Mode",
  whispyMode: "Whispy Mode",
  saffronPokemonRate: "Saffron Pokémon Rate",
  pokemonAnnouncer: "Pokémon Announcer",
  dragonKingHUD: "Dragon King HUD",
  cameraMode: "Camera Mode",
  yoshiIslandCloudAnims: "Yoshi's Island Cloud Anims",
};

/** Human-readable field label, e.g. `remixSettingFieldLabel("zCancel")` -> `"Z-Cancel"`. */
export function remixSettingFieldLabel(field: RemixSettingField): string {
  return REMIX_SETTING_FIELD_LABELS[field] ?? field;
}

/**
 * Whether `gameplaySettings` matches Remix's "Japanese" preset - confirmed
 * 2026-09-22 (Jonn) by diffing a default-NA-settings replay against one
 * recorded with the Japanese preset enabled: exactly these 5 gameplay
 * fields flip to their Japanese value, deliberately excluding
 * `japaneseSounds` (a cosmetic audio toggle, not part of the preset's
 * gameplay identity) and both stage settings the same diff also found
 * (`whispyMode`, `pokemonAnnouncer` - stage-specific, not "is this a
 * Japanese-version game"). A game that matches this only means the BASE
 * game rules are the Japanese release's - the characters being played
 * could still be non-Japanese-region IDs, independent of this preset.
 */
export function isJapaneseVersionGameplaySettings(
  gameplaySettings: RemixGameplaySettings,
): boolean {
  return (
    gameplaySettings.hitlag === 1 &&
    gameplaySettings.di === 1 &&
    gameplaySettings.japaneseStunSleep === 1 &&
    gameplaySettings.momentumSlide === 1 &&
    gameplaySettings.shieldStun === 1
  );
}
