export type Language = "en" | "ja";

const STORAGE_KEY = "rmgr-viewer-lang";

export interface Translations {
  // Header
  appTitle: string;
  openFile: string;
  noFileLoaded: string;
  recordedLabel: (dateStr: string) => string;
  framesLabel: (count: number) => string;
  complete: string;
  incomplete: string;
  failedToLoad: (name: string, error: string) => string;

  // Player panel
  damage: string;
  stocks: string;
  state: string;
  position: string;
  comboHits: string;
  hitUnit: (count: number) => string;
  hitstunUnit: (frames: number) => string;
  notOnScreen: string;

  // Match stats
  matchStats: string;
  statsCollapseTitle: string;
  statsEmpty: string;
  recovery: string;
  edgeGuard: string;
  ledgeGetup: string;
  ledgeTrap: string;
  angelAvoid: string;
  neutralHitsPerStock: string;
  situations: (success: number, total: number) => string;
  neutralHitsTakenSummary: (hits: number, stocks: number) => string;
  noStocksTaken: string;

  // Event log
  eventLog: string;
  eventLogEmpty: string;

  // Events (Perspective)
  recovering: string;
  edgeGuarding: string;
  recoverySuccess: string;
  recoveryFailure: string;
  edgeGuardSuccess: string;
  edgeGuardFailed: string;

  ledgeGetupEntered: string;
  ledgeTrapEntered: string;
  ledgeGetupSuccess: string;
  ledgeGetupFailure: string;
  ledgeTrapSuccess: string;
  ledgeTrapFailed: string;

  angelEntered: string;
  opponentAngelEntered: string;
  angelNoHits: string;
  angelAvoidSuccess: string;
  angelHitLanded: (dmg: number) => string;
  angelAvoidFailed: (dmg: number) => string;

  neutralHitAttack: string;
  neutralHitGrab: string;

  // Events (Neutral Fallback)
  playerRecovering: (player: string) => string;
  playerLedgeGetupSuccess: (player: string) => string;
  playerLedgeGetupFailure: (player: string) => string;
  playerAngelEntered: (player: string) => string;
  playerAngelAvoidSuccess: (player: string) => string;
  playerAngelAvoidFailure: (player: string, dmg: number) => string;

  // Controls
  prevFrameTooltip: string;
  playPauseTooltip: string;
  nextFrameTooltip: string;
  hudOverlay: string;
  hudOverlayTitle: string;

  // Library View
  importReplays: string;
  importFiles: string;
  importFolder: string;
  importingProgress: (loaded: number, total: number) => string;
  backToLibrary: string;
  you: string;
  aliasesCount: (n: number) => string;
  edit: string;
  filters: string;
  yourCharacter: string;
  oppCharacter: string;
  opponent: string;
  stage: string;
  all: string;
  resetFilters: string;
  overallHeader: (total: number, dl: number) => string;
  lowSampleWarning: string;
  vsAll: (val: string) => string;
  byOpponentCharacter: string;
  characterCol: string;
  gamesCol: string;
  winLossCol: string;
  recovCol: string;
  edgeGCol: string;
  ledgeGCol: string;
  ledgeTCol: string;
  angelCol: string;
  nhPerStockCol: string;
  gamesListHeader: (count: number) => string;
  sortNewestFirst: string;
  sortOldestFirst: string;
  ambiguousIdentity: string;
  imPlayer: (name: string) => string;
  notSupportedPlayers: string;
  identityModalTitle: string;
  identityModalSubtitle: string;
  addCustomAlias: string;
  add: string;
  save: string;
  cancel: string;
  noGamesMatched: string;
  removeGame: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    appTitle: "RMG-K Replay Viewer",
    openFile: "Open .rmgr file",
    noFileLoaded: "No file loaded",
    recordedLabel: (d) => `Recorded ${d}`,
    framesLabel: (c) => `${c} frames`,
    complete: "complete",
    incomplete: "incomplete recording",
    failedToLoad: (name, err) => `Failed to load ${name}: ${err}`,

    damage: "Damage:",
    stocks: "Stocks:",
    state: "State:",
    position: "Position:",
    comboHits: "Combo hits:",
    hitUnit: (c) => (c === 1 ? "1 hit" : `${c} hits`),
    hitstunUnit: (f) => ` (${f}f hitstun)`,
    notOnScreen: "not on screen",

    matchStats: "Match Stats",
    statsCollapseTitle: "Collapse / expand Match Stats",
    statsEmpty: "No stats — load a Dream Land 2-player replay.",
    recovery: "Recovery",
    edgeGuard: "Edge guard",
    ledgeGetup: "Ledge getup",
    ledgeTrap: "Ledge trap",
    angelAvoid: "Angel avoid",
    neutralHitsPerStock: "Neutral hits / stock taken",
    situations: (s, t) => `${s} / ${t} situation${t !== 1 ? "s" : ""}`,
    neutralHitsTakenSummary: (hits, stocks) =>
      `${hits} hit${hits !== 1 ? "s" : ""} across ${stocks} stock${stocks !== 1 ? "s" : ""} taken`,
    noStocksTaken: "no stocks taken",

    eventLog: "Event Log",
    eventLogEmpty: "No events yet.",
    hudOverlay: "HUD",
    hudOverlayTitle: "Toggle on-screen event HUD",

    recovering: "Recovering",
    edgeGuarding: "Edge guarding",
    recoverySuccess: "Recovery: success",
    recoveryFailure: "Recovery: failure",
    edgeGuardSuccess: "Edge guard: success",
    edgeGuardFailed: "Edge guard: failed",

    ledgeGetupEntered: "Ledge getup",
    ledgeTrapEntered: "Ledge trap",
    ledgeGetupSuccess: "Ledge getup: success",
    ledgeGetupFailure: "Ledge getup: failure",
    ledgeTrapSuccess: "Ledge trap: success",
    ledgeTrapFailed: "Ledge trap: failed",

    angelEntered: "Angel invincibility",
    opponentAngelEntered: "Opponent angel",
    angelNoHits: "Angel: 0 hits landed",
    angelAvoidSuccess: "Angel avoid: success (0 dmg)",
    angelHitLanded: (dmg) => `Angel: hit landed (+${dmg}%)`,
    angelAvoidFailed: (dmg) => `Angel avoid: failed (+${dmg}%)`,

    neutralHitAttack: "Neutral hit (attack)",
    neutralHitGrab: "Neutral hit (grab)",

    playerRecovering: (p) => `${p} recovering`,
    playerLedgeGetupSuccess: (p) => `${p} getup: success`,
    playerLedgeGetupFailure: (p) => `${p} getup: failure`,
    playerAngelEntered: (p) => `${p} angel invincibility`,
    playerAngelAvoidSuccess: (p) => `${p} avoided angel (0 dmg)`,
    playerAngelAvoidFailure: (p, dmg) => `${p} hit during angel (+${dmg}%)`,

    prevFrameTooltip: "Previous frame",
    playPauseTooltip: "Play / pause",
    nextFrameTooltip: "Next frame",

    importReplays: "Import replays",
    importFiles: "Select files (.rmgr)",
    importFolder: "Select folder",
    importingProgress: (l, tot) => `Importing replays (${l}/${tot})...`,
    backToLibrary: "← Library",
    you: "YOU",
    aliasesCount: (n) => `${n} alias${n !== 1 ? "es" : ""}`,
    edit: "edit",
    filters: "FILTERS",
    yourCharacter: "Your character",
    oppCharacter: "Opponent character",
    opponent: "Opponent",
    stage: "Stage",
    all: "All",
    resetFilters: "Reset",
    overallHeader: (tot, dl) =>
      `OVERALL · ${tot} game${tot !== 1 ? "s" : ""} · ${dl} on Dream Land`,
    lowSampleWarning: "low n",
    vsAll: (v) => `${v} vs all`,
    byOpponentCharacter: "BY OPPONENT CHARACTER",
    characterCol: "Char",
    gamesCol: "Games",
    winLossCol: "W-L",
    recovCol: "Recov.",
    edgeGCol: "EdgeG.",
    ledgeGCol: "LedgeG.",
    ledgeTCol: "LedgeT.",
    angelCol: "Angel",
    nhPerStockCol: "NH/St",
    gamesListHeader: (c) => `GAMES (${c})`,
    sortNewestFirst: "newest first",
    sortOldestFirst: "oldest first",
    ambiguousIdentity: "Ambiguous identity",
    imPlayer: (name) => `I'm ${name}`,
    notSupportedPlayers: "3-4 players (unsupported)",
    identityModalTitle: "Who are you?",
    identityModalSubtitle:
      "Select the player names you use across your replays to aggregate your statistics accurately.",
    addCustomAlias: "Add custom name",
    add: "Add",
    save: "Save",
    cancel: "Cancel",
    noGamesMatched: "No games match the selected filters.",
    removeGame: "Remove replay",
  },
  ja: {
    appTitle: "RMG-K リプレイビューアー",
    openFile: "ファイルを開く (.rmgr)",
    noFileLoaded: "ファイルが読み込まれていません",
    recordedLabel: (d) => `録画日時: ${d}`,
    framesLabel: (c) => `${c} フレーム`,
    complete: "完全録画",
    incomplete: "不完全な録画",
    failedToLoad: (name, err) => `${name} の読み込みに失敗しました: ${err}`,

    damage: "ダメージ:",
    stocks: "ストック:",
    state: "状態:",
    position: "座標:",
    comboHits: "コンボヒット数:",
    hitUnit: (c) => `${c}ヒット`,
    hitstunUnit: (f) => ` (${f}F 硬直)`,
    notOnScreen: "画面外",

    matchStats: "対戦データ",
    statsCollapseTitle: "対戦データの折りたたみ / 展開",
    statsEmpty:
      "データなし — プププランドの2人対戦リプレイを読み込んでください。",
    recovery: "復帰",
    edgeGuard: "復帰阻止",
    ledgeGetup: "崖上がり",
    ledgeTrap: "崖狩り",
    angelAvoid: "無敵回避",
    neutralHitsPerStock: "ストック撃墜あたりの立ち回りヒット数",
    situations: (s, t) => `${t}回中 ${s}回成功`,
    neutralHitsTakenSummary: (hits, stocks) =>
      `${stocks}ストック撃墜・計${hits}ヒット`,
    noStocksTaken: "撃墜なし",

    eventLog: "イベントログ",
    eventLogEmpty: "イベントはまだありません。",
    hudOverlay: "HUD",
    hudOverlayTitle: "画面上のイベントHUDの表示切替",

    recovering: "復帰中",
    edgeGuarding: "復帰阻止中",
    recoverySuccess: "復帰: 成功",
    recoveryFailure: "復帰: 失敗",
    edgeGuardSuccess: "復帰阻止: 成功",
    edgeGuardFailed: "復帰阻止: 失敗",

    ledgeGetupEntered: "崖上がり",
    ledgeTrapEntered: "崖狩り",
    ledgeGetupSuccess: "崖上がり: 成功",
    ledgeGetupFailure: "崖上がり: 失敗",
    ledgeTrapSuccess: "崖狩り: 成功",
    ledgeTrapFailed: "崖狩り: 失敗",

    angelEntered: "復活無敵",
    opponentAngelEntered: "相手の復活無敵",
    angelNoHits: "無敵: ヒットなし",
    angelAvoidSuccess: "無敵回避: 成功 (0%被弾)",
    angelHitLanded: (dmg) => `無敵: ヒット成功 (+${dmg}%)`,
    angelAvoidFailed: (dmg) => `無敵回避: 失敗 (+${dmg}%)`,

    neutralHitAttack: "立ち回りヒット (攻撃)",
    neutralHitGrab: "立ち回りヒット (つかみ)",

    playerRecovering: (p) => `${p} 復帰中`,
    playerLedgeGetupSuccess: (p) => `${p} 崖上がり: 成功`,
    playerLedgeGetupFailure: (p) => `${p} 崖上がり: 失敗`,
    playerAngelEntered: (p) => `${p} 復活無敵`,
    playerAngelAvoidSuccess: (p) => `${p} 無敵回避: 成功 (0%被弾)`,
    playerAngelAvoidFailure: (p, dmg) => `${p} 無敵中に被弾 (+${dmg}%)`,

    prevFrameTooltip: "前のフレーム",
    playPauseTooltip: "再生 / 一時停止",
    nextFrameTooltip: "次のフレーム",

    importReplays: "リプレイの読み込み",
    importFiles: "ファイルを選択 (.rmgr)",
    importFolder: "フォルダを選択",
    importingProgress: (l, tot) => `読み込み中 (${l}/${tot})...`,
    backToLibrary: "← ライブラリに戻る",
    you: "プレイヤー",
    aliasesCount: (n) => `別名: ${n}件`,
    edit: "編集",
    filters: "フィルター",
    yourCharacter: "使用キャラ",
    oppCharacter: "相手キャラ",
    opponent: "対戦相手",
    stage: "ステージ",
    all: "すべて",
    resetFilters: "リセット",
    overallHeader: (tot, dl) => `全体 · 計${tot}試合 (プププランド: ${dl}試合)`,
    lowSampleWarning: "試行数少",
    vsAll: (v) => `全体比 ${v}`,
    byOpponentCharacter: "相手キャラクター別",
    characterCol: "キャラ",
    gamesCol: "試合数",
    winLossCol: "勝-敗",
    recovCol: "復帰",
    edgeGCol: "復帰阻止",
    ledgeGCol: "崖上がり",
    ledgeTCol: "崖狩り",
    angelCol: "無敵",
    nhPerStockCol: "ヒット/撃墜",
    gamesListHeader: (c) => `試合一覧 (${c})`,
    sortNewestFirst: "新しい順",
    sortOldestFirst: "古い順",
    ambiguousIdentity: "プレイヤー特定不可",
    imPlayer: (name) => `自分は${name}`,
    notSupportedPlayers: "3〜4人対戦 (非対応)",
    identityModalTitle: "あなたのアカウントを選択",
    identityModalSubtitle:
      "スタッツを集計するために、あなたが使用しているプレイヤー名を選択してください。",
    addCustomAlias: "名前を追加",
    add: "追加",
    save: "保存",
    cancel: "キャンセル",
    noGamesMatched: "条件に一致する試合がありません。",
    removeGame: "リプレイを削除",
  },
};

let currentLang: Language = "en";

export function getLanguage(): Language {
  return currentLang;
}

export function initLanguage(): Language {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hl = urlParams.get("hl");
    if (hl === "ja" || hl === "en") {
      currentLang = hl;
      return currentLang;
    }
  } catch {
    // Ignore URL search params error
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "ja" || saved === "en") {
      currentLang = saved;
      return currentLang;
    }
  } catch {
    // Ignore localStorage read error
  }

  if (
    typeof navigator !== "undefined" &&
    navigator.language?.startsWith("ja")
  ) {
    currentLang = "ja";
  } else {
    currentLang = "en";
  }
  return currentLang;
}

export function setLanguage(lang: Language): void {
  currentLang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Ignore localStorage write error
  }

  try {
    const url = new URL(window.location.href);
    if (lang === "ja") {
      url.searchParams.set("hl", "ja");
    } else {
      url.searchParams.delete("hl");
    }
    window.history.replaceState({}, "", url.toString());
  } catch {
    // Ignore history API error
  }
}

export function t(): Translations {
  return TRANSLATIONS[currentLang];
}
