import { getActionStateName } from "@rmg-k/rmgr";
import { characterFamily } from "./data/characterFamily.js";
import { getLanguage, type Language } from "./i18n.js";

/**
 * Player-facing names for action states ("Up air", "Quick Attack", "Shield"), for review lists
 * like the hit reel and punish finder. The engine's own names (rmgr-ts's getActionStateName:
 * "Uair", "SpecialAirHiStart", "JumpAerialB") stay available for debugging views; this maps the
 * ones a player talks about and falls back to the engine name for anything else.
 */

type Label = readonly [en: string, ja: string];

/** Shared action states (below 0x0dc), by id. Multi-state moves share one label. */
const SHARED: ReadonlyMap<number, Label> = new Map<number, Label>([
  [0x00a, ["Standing", "立ち"]],
  [0x00b, ["Walk", "歩き"]],
  [0x00c, ["Walk", "歩き"]],
  [0x00d, ["Walk", "歩き"]],
  [0x00f, ["Dash", "ダッシュ"]],
  [0x010, ["Run", "走り"]],
  [0x011, ["Run stop", "走り止まり"]],
  [0x012, ["Turn", "振り向き"]],
  [0x013, ["Run turn", "走り振り向き"]],
  [0x014, ["Jump squat", "ジャンプ踏切"]],
  [0x015, ["Jump out of shield", "ガーキャンジャンプ"]],
  [0x016, ["Jump", "ジャンプ"]],
  [0x017, ["Jump", "ジャンプ"]],
  [0x018, ["Double jump", "空中ジャンプ"]],
  [0x019, ["Double jump", "空中ジャンプ"]],
  [0x01a, ["Fall", "落下"]],
  [0x01b, ["Fall", "落下"]],
  [0x01c, ["Crouch", "しゃがみ"]],
  [0x01d, ["Crouch", "しゃがみ"]],
  [0x01e, ["Crouch", "しゃがみ"]],
  [0x01f, ["Landing", "着地"]],
  [0x020, ["Landing", "着地"]],
  [0x021, ["Platform drop", "すり抜け"]],
  [0x022, ["Shield drop", "シールドすり抜け"]],
  [0x023, ["Teeter", "崖際"]],
  [0x024, ["Teeter", "崖際"]],
  [0x039, ["Tumble", "きりもみ"]],
  [0x03a, ["Helpless fall", "しりもち落下"]],
  [0x03b, ["Helpless landing", "しりもち着地"]],
  [0x049, ["Tech roll", "受け身転がり"]],
  [0x04a, ["Tech roll", "受け身転がり"]],
  [0x04f, ["Getup attack", "起き上がり攻撃"]],
  [0x050, ["Getup attack", "起き上がり攻撃"]],
  [0x051, ["Tech", "受け身"]],
  [0x052, ["Clang", "相殺"]],
  [0x053, ["Clang", "相殺"]],
  [0x054, ["Ledge grab", "崖つかまり"]],
  [0x055, ["On ledge", "崖つかまり"]],
  [0x056, ["Ledge getup", "崖登り"]],
  [0x057, ["Ledge getup", "崖登り"]],
  [0x058, ["Ledge getup", "崖登り"]],
  [0x059, ["Ledge getup", "崖登り"]],
  [0x05a, ["Ledge getup", "崖登り"]],
  [0x05b, ["Ledge getup", "崖登り"]],
  [0x05c, ["Ledge attack", "崖攻撃"]],
  [0x05d, ["Ledge attack", "崖攻撃"]],
  [0x05e, ["Ledge attack", "崖攻撃"]],
  [0x05f, ["Ledge attack", "崖攻撃"]],
  [0x060, ["Ledge roll", "崖転がり"]],
  [0x061, ["Ledge roll", "崖転がり"]],
  [0x062, ["Ledge roll", "崖転がり"]],
  [0x063, ["Ledge roll", "崖転がり"]],
  [0x098, ["Shield", "シールド"]],
  [0x099, ["Shield", "シールド"]],
  [0x09a, ["Shield release", "シールド解除"]],
  [0x09b, ["Shield stun", "シールド硬直"]],
  [0x09c, ["Roll", "回避"]],
  [0x09d, ["Roll", "回避"]],
  [0x0a2, ["Dizzy", "ふらふら"]],
  [0x0a4, ["Stunned", "気絶"]],
  [0x0a5, ["Asleep", "ねむり"]],
  [0x0a6, ["Grab", "つかみ"]],
  [0x0a7, ["Grab", "つかみ"]],
  [0x0a8, ["Grab", "つかみ"]],
  [0x0a9, ["Forward throw", "前投げ"]],
  [0x0aa, ["Back throw", "後ろ投げ"]],
  [0x0ab, ["Grabbed", "つかまれ"]],
  [0x0ac, ["Grabbed", "つかまれ"]],
  [0x0bd, ["Taunt", "アピール"]],
  [0x0be, ["Jab", "弱"]],
  [0x0bf, ["Jab", "弱"]],
  [0x0c0, ["Dash attack", "ダッシュ攻撃"]],
  [0x0c1, ["Forward tilt", "横強"]],
  [0x0c2, ["Forward tilt", "横強"]],
  [0x0c3, ["Forward tilt", "横強"]],
  [0x0c4, ["Forward tilt", "横強"]],
  [0x0c5, ["Forward tilt", "横強"]],
  [0x0c7, ["Up tilt", "上強"]],
  [0x0c9, ["Down tilt", "下強"]],
  [0x0ca, ["Forward smash", "横スマ"]],
  [0x0cb, ["Forward smash", "横スマ"]],
  [0x0cc, ["Forward smash", "横スマ"]],
  [0x0cd, ["Forward smash", "横スマ"]],
  [0x0ce, ["Forward smash", "横スマ"]],
  [0x0cf, ["Up smash", "上スマ"]],
  [0x0d0, ["Down smash", "下スマ"]],
  [0x0d1, ["Neutral air", "空N"]],
  [0x0d2, ["Forward air", "空前"]],
  [0x0d3, ["Back air", "空後"]],
  [0x0d4, ["Up air", "空上"]],
  [0x0d5, ["Down air", "空下"]],
  [0x0db, ["Aerial landing", "空中攻撃着地"]],
]);

/** Ranges of shared states that read as one thing to a player. */
function sharedRangeLabel(id: number): Label | null {
  if (id >= 0x025 && id <= 0x038) return ["Hitstun", "のけぞり"];
  if (id >= 0x043 && id <= 0x04e) return ["Knockdown", "ダウン"];
  if (id >= 0x09e && id <= 0x0a1) return ["Shield break", "シールドブレイク"];
  return null;
}

type SpecialSlot = "N" | "Hi" | "Lw";

/** The original 12's special moves (NA ids; JP/EU variants map here via characterFamily). */
const SPECIALS: Readonly<Record<number, Record<SpecialSlot, Label>>> = {
  0x00: {
    N: ["Fireball", "ファイアボール"],
    Hi: ["Super Jump Punch", "スーパージャンプパンチ"],
    Lw: ["Mario Tornado", "マリオトルネード"],
  },
  0x01: {
    N: ["Blaster", "ブラスター"],
    Hi: ["Fire Fox", "ファイアフォックス"],
    Lw: ["Reflector", "リフレクター"],
  },
  0x02: {
    N: ["Giant Punch", "ジャイアントパンチ"],
    Hi: ["Spinning Kong", "スピニングコング"],
    Lw: ["Hand Slap", "ハンドスラップ"],
  },
  0x03: {
    N: ["Charge Shot", "チャージショット"],
    Hi: ["Screw Attack", "スクリューアタック"],
    Lw: ["Bomb", "ボム"],
  },
  0x04: {
    N: ["Fireball", "ファイアボール"],
    Hi: ["Super Jump Punch", "スーパージャンプパンチ"],
    Lw: ["Luigi Cyclone", "ルイージサイクロン"],
  },
  0x05: {
    N: ["Boomerang", "ブーメラン"],
    Hi: ["Spin Attack", "回転斬り"],
    Lw: ["Bomb", "爆弾"],
  },
  0x06: {
    N: ["Egg Lay", "たまご産み"],
    Hi: ["Egg Throw", "たまご投げ"],
    Lw: ["Yoshi Bomb", "ヒップドロップ"],
  },
  0x07: {
    N: ["Falcon Punch", "ファルコンパンチ"],
    Hi: ["Falcon Dive", "ファルコンダイブ"],
    Lw: ["Falcon Kick", "ファルコンキック"],
  },
  0x08: {
    N: ["Inhale", "すいこみ"],
    Hi: ["Final Cutter", "ファイナルカッター"],
    Lw: ["Stone", "ストーン"],
  },
  0x09: {
    N: ["Thunder Jolt", "でんげき"],
    Hi: ["Quick Attack", "でんこうせっか"],
    Lw: ["Thunder", "かみなり"],
  },
  0x0a: {
    N: ["Pound", "はたく"],
    Hi: ["Sing", "うたう"],
    Lw: ["Rest", "ねむる"],
  },
  0x0b: {
    N: ["PK Fire", "PKファイヤー"],
    Hi: ["PK Thunder", "PKサンダー"],
    Lw: ["PSI Magnet", "サイマグネット"],
  },
};

/** The engine's names for the characters Kirby can copy, as they appear in "Copy<Name>Special...". */
const COPY_SOURCES: Readonly<Record<string, number>> = {
  Mario: 0x00,
  Fox: 0x01,
  Donkey: 0x02,
  Samus: 0x03,
  Luigi: 0x04,
  Link: 0x05,
  Yoshi: 0x06,
  Captain: 0x07,
  Pikachu: 0x09,
  Purin: 0x0a,
  Ness: 0x0b,
};

const GENERIC_SPECIALS: Record<SpecialSlot, Label> = {
  N: ["Neutral B", "NB"],
  Hi: ["Up B", "上B"],
  Lw: ["Down B", "下B"],
};

function specialLabel(engineName: string, characterId: number): Label | null {
  if (/^Attack(100|13)/.test(engineName)) return ["Jab", "弱"];
  if (/^Appear/.test(engineName)) return ["Respawn", "復活"];
  const slot = /Special(?:Air)?(N|Hi|Lw)/.exec(engineName)?.[1] as
    SpecialSlot | undefined;
  if (!slot) return null;
  // Kirby's copied neutral B ("CopyFoxSpecialN") is the copied character's neutral B.
  const copied = /^Copy([A-Za-z]+?)Special/.exec(engineName)?.[1];
  const owner =
    copied !== undefined ? COPY_SOURCES[copied] : characterFamily(characterId);
  return (
    (owner !== undefined ? SPECIALS[owner]?.[slot] : undefined) ??
    GENERIC_SPECIALS[slot]
  );
}

/**
 * A player-facing name for `actionStateId` as performed by `characterId`. Falls back to the
 * engine's name for states without one (rare transitional states, Remix characters' specials).
 */
export function moveDisplayName(
  actionStateId: number,
  characterId: number,
  lang: Language = getLanguage(),
): string {
  const pick = (label: Label) => (lang === "ja" ? label[1] : label[0]);
  if (actionStateId < 0x0dc) {
    const label = SHARED.get(actionStateId) ?? sharedRangeLabel(actionStateId);
    if (label) return pick(label);
    return getActionStateName(actionStateId, { lang, characterId });
  }
  const engineName = getActionStateName(actionStateId, {
    lang: "en",
    characterId,
  });
  const label = specialLabel(engineName, characterId);
  return label ? pick(label) : engineName;
}
