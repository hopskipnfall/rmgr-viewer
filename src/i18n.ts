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
  perspectiveTitle: string;
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

  // Character Meta
  characterMetaTitle: (charName: string) => string;
  fthrowFollowup: string;
  fthrowFollowupSummary: (
    followed: number,
    total: number,
    noFollow: number,
  ) => string;
  noFthrows: string;
  shieldPressureTwoHits: string;
  shieldPressureBreakdown: (
    breaks: number,
    grabs: number,
    neither: number,
    total: number,
  ) => string;
  noShieldPressures: string;
  shieldBreakBadge: string;
  shieldGrabBadge: string;
  shieldEscapeBadge: string;
  fthrowSuccessBadge: string;
  fthrowFailureBadge: string;
  hitsUnit: (hits: number) => string;

  // Event log
  eventLog: string;
  eventLogEmpty: string;
  logFiltersTitle: string;
  logFilterRecovery: string;
  logFilterLedge: string;
  logFilterAngel: string;
  logFilterNeutral: string;
  logFilterCharacter: string;
  logFilterDebug: string;
  logOpeningPrefix: string;
  logPunishPrefix: string;

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
  angelHitLanded: string;
  angelAvoidFailed: string;

  fthrowEntered: string;
  opponentFthrowEntered: string;
  fthrowFollowupSuccess: (hits?: number) => string;
  fthrowNoFollowup: string;
  opponentFthrowFollowupHit: (hits?: number) => string;
  opponentFthrowEscaped: string;

  shieldPressureEntered: (hits?: number) => string;
  opponentShieldPressureEntered: (hits?: number) => string;
  shieldBreakForced: string;
  shieldBroken: string;
  shieldPressureGrab: string;
  opponentShieldPressureGrab: string;
  shieldPressureEscaped: string;
  opponentShieldPressureEscaped: string;

  neutralHitAttack: string;
  neutralHitGrab: string;

  // Events (Neutral Fallback)
  playerRecovering: (player: string) => string;
  playerLedgeGetupSuccess: (player: string) => string;
  playerLedgeGetupFailure: (player: string) => string;
  playerAngelEntered: (player: string) => string;
  playerAngelAvoidSuccess: (player: string) => string;
  playerAngelAvoidFailure: (player: string) => string;
  playerFthrowEntered: (player: string) => string;
  playerFthrowFollowup: (player: string, hits?: number) => string;
  playerFthrowNoFollowup: (player: string) => string;
  playerShieldPressureEntered: (player: string, hits?: number) => string;
  playerShieldBreakForced: (player: string) => string;
  playerShieldPressureGrab: (player: string) => string;
  playerShieldPressureEscaped: (player: string) => string;

  // Controls
  prevFrameTooltip: string;
  playPauseTooltip: string;
  nextFrameTooltip: string;
  hideSidebarsTooltip: string;
  showSidebarsTooltip: string;
  hudOverlay: string;
  hudOverlayShow: string;
  hudOverlayHide: string;
  hudOverlayTitle: string;

  // Library View
  importReplays: string;
  importFiles: string;
  importFolder: string;
  importingProgress: (loaded: number, total: number) => string;
  loadingDemoReplays: string;
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
  characterGroupNA: string;
  characterGroupJP: string;
  characterGroupRemix: string;
  allGroups: string;
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
  sessionsListHeader: (count: number) => string;
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
  selectAll: string;
  deselectAll: string;
  selectYourNames: string;
  noNamesSelected: string;
  noGamesMatched: string;
  removeGame: string;
  winRate: string;
  gamesWonFraction: (w: number, tot: number) => string;
  winner: (name: string) => string;
  win: string;
  loss: string;
  tie: string;
  matchupAverage: string;
  vsMatchup: (v: string) => string;
  vsOverall: (v: string) => string;
  hitsPerStockUnit: (val: string) => string;
  hitsPerStockFraction: (hits: number, stocks: number) => string;

  // Neutral Score panel
  neutralScoreLabel: string;
  neutralScoreFraction: (won: number, lost: number) => string;
  perMinuteUnit: (val: string) => string;
  conversionLabel: string;
  conversionSummary: (dmgPerOpening: string, killPct: number) => string;
  advantageRetentionLabel: string;
  advantageRetentionSummary: (leakPerOpening: string) => string;
  recoveryDeltaLabel: string;
  edgeGuardDeltaLabel: string;
  deltaVsBaseline: (baselinePct: number) => string;
  deltaNoData: string;
  neutralScoreNoData: string;
  neutralFingerprintTitle: string;
  fingerprintReasonCol: string;
  fingerprintWonCol: string;
  fingerprintLostCol: string;
  fingerprintDiffCol: string;
  experimentationToggleLabel: string;
  experimentationCount: (n: number) => string;

  // About modal
  aboutTitle: string;
  aboutDescription: string;
  authorLabel: string;
  authorName: string;
  twitterLabel: string;
  githubLabel: string;
  tobloSfxLabel: string;
  close: string;

  // Keyboard Shortcuts modal
  shortcutsTitle: string;
  shortcutsPlaybackHeader: string;
  shortcutsPlayPause: string;
  shortcutsJumpBackward: string;
  shortcutsJumpForward: string;
  shortcutsStepBackward: string;
  shortcutsStepForward: string;
  shortcutsToggleSidebars: string;
  shortcutsTogglePip: string;
  shortcutsGeneralHeader: string;
  shortcutsHelp: string;
  shortcutsClose: string;

  // Match View Sidebars
  statsSidebarHeaderTitle: string;
  collapseLeftSidebarTitle: string;
  collapseRightSidebarTitle: string;
  expandLeftSidebarLabel: string;
  expandRightSidebarLabel: string;
  expandLeftSidebarTitle: string;
  expandRightSidebarTitle: string;

  // Situation widgets (Recovery / Edge Guard / Ledge Getup / Ledge Trap)
  recoveryWidgetTitle: string;
  edgeGuardWidgetTitle: string;
  ledgeGetupWidgetTitle: string;
  ledgeTrapWidgetTitle: string;
  situationSuccessBadge: string;
  situationFailureBadge: string;
  situationOpenBadge: string;
  noSituations: string;
  situationCollapseTitle: (name: string) => string;

  // Neutral Openings widget
  neutralHitsWidgetTitle: string;
  neutralFilterAll: (count: number) => string;
  neutralFilterOpenings: (count: number) => string;
  neutralFilterPunishes: (count: number) => string;
  neutralOpeningsGroupTitle: (count: number) => string;
  neutralPunishesGroupTitle: (count: number) => string;
  noNeutralHits: string;
  noNeutralOpeningsLanded: string;
  noNeutralPunishesTaken: string;
  neutralReasonShieldPressure: string;
  neutralReasonLandingLag: string;
  neutralReasonWhiffPunish: string;
  neutralReasonJumpPunish: string;
  neutralReasonStandingHit: string;
  neutralReasonStandingGrab: string;
  neutralReasonUnknown: string;
  neutralReasonReversal: string;
  neutralHitsBadge: (count: number) => string;
  neutralConversionEdgeGuard: string;
  neutralConversionLedgeTrap: string;
  neutralConversionKO: string;
  neutralConversionReset: string;
  neutralConversionReversal: string;

  // Combos widget
  combosWidgetTitle: string;
  comboHitsBadge: (count: number) => string;
  comboKillBadge: string;
  combosCountChip: (count: number) => string;
  noCombos: string;

  // Directional Influence (DI) widget
  diWidgetTitle: string;
  noDIFound: string;
  diActiveHit: string;
  diLastHit: string;
  diScrubPrompt: string;
  diCancellationNotice: (gross: number, net: number, pct: number) => string;

  // Pikachu Up-B Quick Attack Overlay
  overlayQuickAttackBtn: string;
  hideQuickAttackOverlayBtn: string;
  quickAttackPathItem: (
    idx: number,
    time: string,
    frame: number,
    zips: number,
  ) => string;

  // Replay Info widget
  replayInfoWidgetTitle: string;
  replayInfoFileLabel: string;
  replayInfoRecordedLabel: string;
  finalStocksDetail: (stocks: number) => string;

  // YouTube Video Sync
  youtubeVideoTitle: string;
  linkYouTubeVideoBtn: string;
  youtubeVideoUrlPlaceholder: string;
  youtubeSaveLinkBtn: string;
  youtubeUnlinkBtn: string;
  youtubeSyncCurrentFrameBtn: string;
  youtubeNudgeMinus1s: string;
  youtubeNudgeMinus1f: string;
  youtubeNudgePlus1f: string;
  youtubeNudgePlus1s: string;
  youtubeViewModeVideoPip: string;
  youtubeViewModeVideoOnly: string;
  youtubeViewModeCanvasOnly: string;
  youtubeViewModeCanvasMuted: string;
  youtubeTogglePipBtnTitle: string;
  youtubeInvalidUrlError: string;
  videoAttachedBadge: string;
  vodWidgetTitle: string;
  vodPlaybackModeLabel: string;
  vodFixSyncLabel: string;
  vodWatchOnYouTube: string;
  vodEditLinkBtn: string;
  vodEditLinkTitle: string;
  pipCloseBtnTitle: string;
  syncSessionVideosBtn: string;
  vodSyncBannerPrompt: (count: number) => string;
  sessionSyncedSuccess: (count: number) => string;
  sessionNotRealtimeWarning: string;

  // Session Grouping
  groupBySession: string;
  flatList: string;
  sessionGamesCount: (count: number) => string;
  sessionRecord: (wins: number, losses: number) => string;
  sessionTotalDuration: (dur: string) => string;
  sessionVideoAttached: string;
  sessionSoloGame: string;
  sessionVs: (opponent: string) => string;

  // Filters & Uneven Start
  filterOpponentLabel: string;
  filterAllOpponents: string;
  filterMyCharLabel: string;
  filterAllMyCharacters: string;
  filterOppCharLabel: string;
  filterAllOppCharacters: string;
  filterReset: string;
  unevenStocksBadge: string;
  unevenStocksTooltip: (yourStart: number, oppStart: number) => string;
  overallFilteredHeader: (
    filtered: number,
    total: number,
    dreamLand: number,
  ) => string;

  // 12 Character Battle (12CB)
  twelveCharacterBattleTitle: string;
  twelveCharacterBattleShort: string;
  session12CbRecord: (wins: number, losses: number) => string;
  twelveCbWon: (remainingChars: number, remainingStocks: number) => string;
  twelveCbLost: (remainingChars: number, remainingStocks: number) => string;
  twelveCbMatchIndex: (idx: number, total: number) => string;
  twelveCbMatchProgress: (current: number, total: number) => string;
  twelveCbRemainingCount: (remaining: number, total: number) => string;
  twelveCbActiveLabel: string;
  twelveCbAvailableLabel: string;
  twelveCbEliminatedLabel: string;
  twelveCbStocksLabel: (stocks: number) => string;
  twelveCbPrevMatch: string;
  twelveCbNextMatch: string;
  twelveCbPrevMatchTitle: string;
  twelveCbNextMatchTitle: string;
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

    perspectiveTitle: "Perspective",
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

    characterMetaTitle: (char) => char,
    fthrowFollowup: "F-throw follow-up",
    fthrowFollowupSummary: (s, t, n) =>
      `${s} / ${t} throw${t !== 1 ? "s" : ""} (${n} missed)`,
    noFthrows: "no forward throws",
    shieldPressureTwoHits: "Shield pressure (2+ hits)",
    shieldPressureBreakdown: (b, g, n, t) =>
      `${t} attempt${t !== 1 ? "s" : ""}: ${b} break${b !== 1 ? "s" : ""}, ${g} grab${g !== 1 ? "s" : ""}, ${n} neither`,
    noShieldPressures: "no multi-hit shield pressures",
    shieldBreakBadge: "Break",
    shieldGrabBadge: "Grab",
    shieldEscapeBadge: "Escaped",
    fthrowSuccessBadge: "Followup",
    fthrowFailureBadge: "Dropped",
    hitsUnit: (hits) => `${hits} hit${hits !== 1 ? "s" : ""}`,

    eventLog: "Event Log",
    eventLogEmpty: "No events yet.",
    logFiltersTitle: "Log Filters",
    logFilterRecovery: "Recovery",
    logFilterLedge: "Ledge",
    logFilterAngel: "Angel",
    logFilterNeutral: "Neutral",
    logFilterCharacter: "Character",
    logFilterDebug: "Window Starts (Debug)",
    logOpeningPrefix: "Opening",
    logPunishPrefix: "Punish",
    hudOverlay: "LOG",
    hudOverlayShow: "LOG",
    hudOverlayHide: "Hide Log",
    hudOverlayTitle: "Toggle on-screen event log",

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
    angelAvoidSuccess: "Angel avoid: success",
    angelHitLanded: "Angel: hit landed",
    angelAvoidFailed: "Angel avoid: failed",

    fthrowEntered: "F-throw",
    opponentFthrowEntered: "Opponent F-throw",
    fthrowFollowupSuccess: (hits) =>
      hits ? `F-throw: follow-up hit (${hits} hits)` : "F-throw: follow-up hit",
    fthrowNoFollowup: "F-throw: no follow-up",
    opponentFthrowFollowupHit: (hits) =>
      hits
        ? `Opponent F-throw: follow-up hit (${hits} hits)`
        : "Opponent F-throw: follow-up hit",
    opponentFthrowEscaped: "Opponent F-throw: escaped (no follow-up)",

    shieldPressureEntered: (hits) =>
      hits
        ? `Shield pressure (${hits} hits on shield)`
        : "Shield pressure (2+ hits)",
    opponentShieldPressureEntered: (hits) =>
      hits
        ? `Opponent shield pressure (${hits} hits on shield)`
        : "Opponent shield pressure (2+ hits)",
    shieldBreakForced: "Shield pressure: Shield break!",
    shieldBroken: "Shield broken!",
    shieldPressureGrab: "Shield pressure: Grab landed",
    opponentShieldPressureGrab: "Shield pressure: Grabbed",
    shieldPressureEscaped: "Shield pressure: Neither (escaped)",
    opponentShieldPressureEscaped: "Shield pressure: Escaped",

    neutralHitAttack: "Neutral hit (attack)",
    neutralHitGrab: "Neutral hit (grab)",

    playerRecovering: (p) => `${p} recovering`,
    playerLedgeGetupSuccess: (p) => `${p} getup: success`,
    playerLedgeGetupFailure: (p) => `${p} getup: failure`,
    playerAngelEntered: (p) => `${p} angel invincibility`,
    playerAngelAvoidSuccess: (p) => `${p} avoided angel`,
    playerAngelAvoidFailure: (p) => `${p} hit during angel`,
    playerFthrowEntered: (p) => `${p} F-throw`,
    playerFthrowFollowup: (p, hits) =>
      hits
        ? `${p} F-throw: follow-up hit (${hits} hits)`
        : `${p} F-throw: follow-up hit`,
    playerFthrowNoFollowup: (p) => `${p} F-throw: no follow-up`,
    playerShieldPressureEntered: (p, hits) =>
      hits
        ? `${p} shield pressure (${hits} hits on shield)`
        : `${p} shield pressure (2+ hits)`,
    playerShieldBreakForced: (p) => `${p} forced shield break!`,
    playerShieldPressureGrab: (p) => `${p} grabbed out of shield pressure`,
    playerShieldPressureEscaped: (p) =>
      `${p} shield pressure: neither (escaped)`,

    prevFrameTooltip: "Previous frame (,)",
    playPauseTooltip: "Play / Pause (Space)",
    nextFrameTooltip: "Next frame (.)",
    hideSidebarsTooltip: "Hide sidebars (t)",
    showSidebarsTooltip: "Show sidebars (t)",

    importReplays: "Import replays",
    importFiles: "Select files (.rmgr)",
    importFolder: "Select folder",
    importingProgress: (l, tot) => `Importing replays (${l}/${tot})...`,
    loadingDemoReplays: "Loading demo replays...",
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
    characterGroupNA: "North America (Original 12)",
    characterGroupJP: "Japan (Original 12 J)",
    characterGroupRemix: "Remix Characters",
    allGroups: "All Character Groups",
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
    sessionsListHeader: (c) => `SESSIONS (${c})`,
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
    selectAll: "Select all",
    deselectAll: "Deselect all",
    selectYourNames: "Select your names...",
    noNamesSelected: "No name selected",
    noGamesMatched: "No games match the selected filters.",
    removeGame: "Remove replay",
    winRate: "Win Rate",
    gamesWonFraction: (w, tot) => `${w} / ${tot} won`,
    winner: (name) => `Winner: ${name}`,
    win: "WIN",
    loss: "LOSE",
    tie: "TIE",
    matchupAverage: "Matchup avg",
    vsMatchup: (v) => `${v} vs matchup`,
    vsOverall: (v) => `${v} vs overall avg`,
    hitsPerStockUnit: (val) => `${val} /st.`,
    hitsPerStockFraction: (hits, stocks) => `${hits} hits / ${stocks} st.`,

    neutralScoreLabel: "Neutral Score",
    neutralScoreFraction: (won, lost) => `${won} won / ${lost} lost`,
    perMinuteUnit: (val) => `${val}/min`,
    conversionLabel: "Conversion",
    conversionSummary: (dmg, killPct) =>
      `${dmg} dmg/opening · ${killPct}% → kill`,
    advantageRetentionLabel: "Advantage Retention",
    advantageRetentionSummary: (leak) => `${leak} leak/opening`,
    recoveryDeltaLabel: "Recovery Δ",
    edgeGuardDeltaLabel: "Edge Guard Δ",
    deltaVsBaseline: (baseline) => `vs ${Math.round(baseline)}% baseline`,
    deltaNoData: "Not enough data",
    neutralScoreNoData: "Not enough data yet",
    neutralFingerprintTitle: "Neutral Fingerprint",
    fingerprintReasonCol: "Reason",
    fingerprintWonCol: "Won %",
    fingerprintLostCol: "Conceded %",
    fingerprintDiffCol: "Diff",
    experimentationToggleLabel:
      "Include experimentation games (vs weaker opponents)",
    experimentationCount: (n) =>
      n === 1 ? "1 game excluded" : `${n} games excluded`,

    aboutTitle: "About rmgr-viewer",
    aboutDescription:
      "Real-time visual playback and analytics viewer for Super Smash Bros. 64 (.rmgr) replay files.",
    authorLabel: "Author",
    authorName: "nue",
    twitterLabel: "Twitter / X",
    githubLabel: "GitHub Repository",
    tobloSfxLabel: "Toblo sfx",
    close: "Close",

    shortcutsTitle: "Keyboard Shortcuts",
    shortcutsPlaybackHeader: "Playback",
    shortcutsPlayPause: "Play / Pause",
    shortcutsJumpBackward: "Jump 1 second backward",
    shortcutsJumpForward: "Jump 1 second forward",
    shortcutsStepBackward: "Previous frame",
    shortcutsStepForward: "Next frame",
    shortcutsToggleSidebars: "Toggle sidebars",
    shortcutsTogglePip: "Toggle video / 2D mini overlay",
    shortcutsGeneralHeader: "General",
    shortcutsHelp: "Show keyboard shortcuts",
    shortcutsClose: "Close dialog",

    statsSidebarHeaderTitle: "Stats & Situations",
    collapseLeftSidebarTitle: "Collapse Neutral Analysis sidebar",
    collapseRightSidebarTitle: "Collapse Stats sidebar",
    expandLeftSidebarLabel: "Neutral",
    expandRightSidebarLabel: "Stats",
    expandLeftSidebarTitle: "Show Neutral Analysis sidebar",
    expandRightSidebarTitle: "Show Stats & Situations sidebar",

    recoveryWidgetTitle: "Recovery",
    edgeGuardWidgetTitle: "Edge Guard",
    ledgeGetupWidgetTitle: "Ledge Getup",
    ledgeTrapWidgetTitle: "Ledge Trap",
    situationSuccessBadge: "✓",
    situationFailureBadge: "✗",
    situationOpenBadge: "…",
    noSituations: "None in this replay.",
    situationCollapseTitle: (name) => `Collapse / expand ${name}`,

    neutralHitsWidgetTitle: "Neutral Analysis",
    neutralFilterAll: (count) => `All (${count})`,
    neutralFilterOpenings: (count) => `Openings (${count})`,
    neutralFilterPunishes: (count) => `Punishes (${count})`,
    neutralOpeningsGroupTitle: (count) => `Neutral Openings (${count})`,
    neutralPunishesGroupTitle: (count) => `Neutral Punishes Taken (${count})`,
    noNeutralHits: "No neutral hits in this match.",
    noNeutralOpeningsLanded: "No neutral openings landed.",
    noNeutralPunishesTaken: "No neutral punishes taken.",
    neutralReasonShieldPressure: "Unsafe Shield Pressure",
    neutralReasonLandingLag: "Land Punish",
    neutralReasonWhiffPunish: "Whiff Punish",
    neutralReasonJumpPunish: "Jump Punish",
    neutralReasonStandingHit: "Standing Hit",
    neutralReasonStandingGrab: "Standing Grab",
    neutralReasonUnknown: "Neutral Hit",
    neutralReasonReversal: "Reversal",
    neutralHitsBadge: (count) => `${count} ${count === 1 ? "hit" : "hits"}`,
    neutralConversionEdgeGuard: "Edge Guard",
    neutralConversionLedgeTrap: "Ledge Trap",
    neutralConversionKO: "KO",
    neutralConversionReset: "Reset",
    neutralConversionReversal: "Reversal",

    combosWidgetTitle: "Kill Combos",
    comboHitsBadge: (count) => `${count} hits`,
    comboKillBadge: "KO",
    combosCountChip: (count) =>
      `${count} ${count === 1 ? "kill combo" : "kill combos"}`,
    noCombos: "No kill combos (≥3 hits) in this match.",

    diWidgetTitle: "Directional Influence (DI)",
    noDIFound: "No hit events detected in this match.",
    diActiveHit: "Live Hit",
    diLastHit: "Last Hit",
    diScrubPrompt: "Scrub to a hit to view live DI metrics.",
    diCancellationNotice: (gross, net, pct) =>
      `⚠️ Opposing inputs partially canceled DI: ${gross}u gross → ${net}u net (${pct}% canceled)`,

    overlayQuickAttackBtn: "Overlay Quick Attack Paths",
    hideQuickAttackOverlayBtn: "Exit Overlay",
    quickAttackPathItem: (idx, time, frame, zips) =>
      `#${idx} ${time} (${frame}F) · ${zips} ${zips === 1 ? "zip" : "zips"}`,

    replayInfoWidgetTitle: "Replay Info",
    replayInfoFileLabel: "File",
    replayInfoRecordedLabel: "Recorded",
    finalStocksDetail: (stocks) => `Stocks Remaining: ${stocks}`,

    // YouTube Video Sync
    youtubeVideoTitle: "YouTube Video",
    linkYouTubeVideoBtn: "Link Video",
    youtubeVideoUrlPlaceholder:
      "https://www.youtube.com/watch?v=... or youtu.be/...",
    youtubeSaveLinkBtn: "Save",
    youtubeUnlinkBtn: "Unlink video",
    youtubeSyncCurrentFrameBtn: "Sync to Current Frame",
    youtubeNudgeMinus1s: "-1.0s",
    youtubeNudgeMinus1f: "-1f",
    youtubeNudgePlus1f: "+1f",
    youtubeNudgePlus1s: "+1.0s",
    youtubeViewModeVideoPip: "Video + Mini 2D Overlay",
    youtubeViewModeVideoOnly: "Video Only",
    youtubeViewModeCanvasOnly: "Replay Only (audio still plays)",
    youtubeViewModeCanvasMuted: "Replay Only (no video audio)",
    youtubeTogglePipBtnTitle: "Toggle mini overlay (p)",
    youtubeInvalidUrlError: "Please enter a valid YouTube video URL or ID.",
    videoAttachedBadge: "YouTube video linked",
    vodWidgetTitle: "VOD",
    vodPlaybackModeLabel: "Playback mode:",
    vodFixSyncLabel: "Fix sync:",
    vodWatchOnYouTube: "Watch on YouTube",
    vodEditLinkBtn: "✎ Edit",
    vodEditLinkTitle: "Edit linked video",
    pipCloseBtnTitle: "Close PiP",
    syncSessionVideosBtn: "Sync now",
    vodSyncBannerPrompt: (count: number) =>
      `Apply this timing to the other ${count} game${count === 1 ? "" : "s"} in this session?`,
    sessionSyncedSuccess: (count: number) =>
      `Successfully synchronized video timestamps for ${count} games in session.`,
    sessionNotRealtimeWarning:
      "These recordings were exported faster than real-time; relative timestamps could not be automatically calculated from file headers.",

    // Session Grouping
    groupBySession: "Group by Session",
    flatList: "Flat List",
    sessionGamesCount: (count: number) =>
      count === 1 ? "1 game" : `${count} games`,
    sessionRecord: (wins: number, losses: number) => `${wins}W – ${losses}L`,
    sessionTotalDuration: (dur: string) => `Total: ${dur}`,
    sessionVideoAttached: "YouTube Video Attached",
    sessionSoloGame: "Practice / Solo Match",
    sessionVs: (opponent: string) => `vs ${opponent}`,

    // Filters & Uneven Start
    filterOpponentLabel: "Opponent:",
    filterAllOpponents: "All Opponents",
    filterMyCharLabel: "My Character:",
    filterAllMyCharacters: "All Characters",
    filterOppCharLabel: "Opponent Character:",
    filterAllOppCharacters: "All Characters",
    filterReset: "Clear filters",
    unevenStocksBadge: "Uneven Start",
    unevenStocksTooltip: (yourStart, oppStart) =>
      `Uneven starting stocks: ${yourStart} vs ${oppStart} · Excluded from overall W-L stats`,
    overallFilteredHeader: (filtered, total, dreamLand) =>
      `OVERALL STATISTICS (${filtered}/${total} games · ${dreamLand} on Dream Land)`,

    // 12 Character Battle (12CB)
    twelveCharacterBattleTitle: "12 Character Battle",
    twelveCharacterBattleShort: "12CB",
    session12CbRecord: (wins, losses) => `12CB: ${wins}W – ${losses}L`,
    twelveCbWon: (remainingChars, remainingStocks) =>
      `Won (Remaining: ${remainingChars} chars, ${remainingStocks} stocks)`,
    twelveCbLost: (remainingChars, remainingStocks) =>
      `Lost (Opponent: ${remainingChars} chars, ${remainingStocks} stocks)`,
    twelveCbMatchIndex: (idx, total) => `Match ${idx}/${total}`,
    twelveCbMatchProgress: (current, total) => `Match ${current} of ${total}`,
    twelveCbRemainingCount: (remaining, total) =>
      `${remaining}/${total} remaining`,
    twelveCbActiveLabel: "Active",
    twelveCbAvailableLabel: "Available",
    twelveCbEliminatedLabel: "Eliminated",
    twelveCbStocksLabel: (stocks) =>
      `${stocks} stock${stocks === 1 ? "" : "s"}`,
    twelveCbPrevMatch: "Prev",
    twelveCbNextMatch: "Next",
    twelveCbPrevMatchTitle: "Previous match in this 12 Character Battle",
    twelveCbNextMatchTitle: "Next match in this 12 Character Battle",
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

    perspectiveTitle: "視点",
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

    characterMetaTitle: (char) => char,
    fthrowFollowup: "前投げ追撃",
    fthrowFollowupSummary: (s, t, n) => `${t}回中 ${s}回成功 (${n}回追撃なし)`,
    noFthrows: "前投げなし",
    shieldPressureTwoHits: "ガード固め (2+ヒット)",
    shieldPressureBreakdown: (b, g, n, t) =>
      `${t}回中: ガード割れ ${b}回, つかみ ${g}回, 回避 ${n}回`,
    noShieldPressures: "2+ヒット固めなし",
    shieldBreakBadge: "割れ",
    shieldGrabBadge: "つかみ",
    shieldEscapeBadge: "回避",
    fthrowSuccessBadge: "追撃成功",
    fthrowFailureBadge: "追撃なし",
    hitsUnit: (hits) => `${hits}ヒット`,

    eventLog: "イベントログ",
    eventLogEmpty: "イベントはまだありません。",
    logFiltersTitle: "ログ フィルター",
    logFilterRecovery: "復帰・阻止",
    logFilterLedge: "崖",
    logFilterAngel: "復活無敵",
    logFilterNeutral: "立ち回り",
    logFilterCharacter: "固有",
    logFilterDebug: "イベント開始 (デバッグ)",
    logOpeningPrefix: "差し込み",
    logPunishPrefix: "被弾",
    hudOverlay: "ログ",
    hudOverlayShow: "ログ",
    hudOverlayHide: "ログ非表示",
    hudOverlayTitle: "画面上のイベントログの表示切替",

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
    angelAvoidSuccess: "無敵回避: 成功",
    angelHitLanded: "無敵: ヒット成功",
    angelAvoidFailed: "無敵回避: 失敗",

    fthrowEntered: "前投げ",
    opponentFthrowEntered: "相手の前投げ",
    fthrowFollowupSuccess: (hits) =>
      hits ? `前投げ: 追撃成功 (${hits}ヒット)` : "前投げ: 追撃成功",
    fthrowNoFollowup: "前投げ: 追撃なし",
    opponentFthrowFollowupHit: (hits) =>
      hits
        ? `相手の前投げ: 追撃被弾 (${hits}ヒット)`
        : "相手の前投げ: 追撃被弾",
    opponentFthrowEscaped: "相手の前投げ: 追撃回避 (追撃なし)",

    shieldPressureEntered: (hits) =>
      hits ? `ガード固め (${hits}ヒット)` : "ガード固め (2+ヒット)",
    opponentShieldPressureEntered: (hits) =>
      hits ? `相手のガード固め (${hits}ヒット)` : "相手のガード固め (2+ヒット)",
    shieldBreakForced: "ガード固め: ガード割れ成功!",
    shieldBroken: "ガード割れ被弾!",
    shieldPressureGrab: "ガード固め: つかみ成功",
    opponentShieldPressureGrab: "ガード固め: つかまれ",
    shieldPressureEscaped: "ガード固め: 抜け (回避)",
    opponentShieldPressureEscaped: "ガード固め: 回避成功",

    neutralHitAttack: "立ち回りヒット (攻撃)",
    neutralHitGrab: "立ち回りヒット (つかみ)",

    playerRecovering: (p) => `${p} 復帰中`,
    playerLedgeGetupSuccess: (p) => `${p} 崖上がり: 成功`,
    playerLedgeGetupFailure: (p) => `${p} 崖上がり: 失敗`,
    playerAngelEntered: (p) => `${p} 復活無敵`,
    playerAngelAvoidSuccess: (p) => `${p} 無敵回避: 成功`,
    playerAngelAvoidFailure: (p) => `${p} 無敵中に被弾`,
    playerFthrowEntered: (p) => `${p} 前投げ`,
    playerFthrowFollowup: (p, hits) =>
      hits ? `${p} 前投げ: 追撃成功 (${hits}ヒット)` : `${p} 前投げ: 追撃成功`,
    playerFthrowNoFollowup: (p) => `${p} 前投げ: 追撃なし`,
    playerShieldPressureEntered: (p, hits) =>
      hits ? `${p} ガード固め (${hits}ヒット)` : `${p} ガード固め (2+ヒット)`,
    playerShieldBreakForced: (p) => `${p} ガード割れ成功!`,
    playerShieldPressureGrab: (p) => `${p} ガード固めからつかみ成功`,
    playerShieldPressureEscaped: (p) => `${p} ガード固め: 抜け`,

    prevFrameTooltip: "前のフレーム (,)",
    playPauseTooltip: "再生 / 一時停止 (Space)",
    nextFrameTooltip: "次のフレーム (.)",
    hideSidebarsTooltip: "サイドバーを非表示 (t)",
    showSidebarsTooltip: "サイドバーを表示 (t)",

    importReplays: "リプレイの読み込み",
    importFiles: "ファイルを選択 (.rmgr)",
    importFolder: "フォルダを選択",
    importingProgress: (l, tot) => `読み込み中 (${l}/${tot})...`,
    loadingDemoReplays: "デモリプレイを読み込み中...",
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
    characterGroupNA: "北米版 (オリジナル12)",
    characterGroupJP: "日本版 (オリジナル12 J)",
    characterGroupRemix: "Remix キャラクター",
    allGroups: "すべてのグループ",
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
    sessionsListHeader: (c) => `セッション (${c})`,
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
    selectAll: "すべて選択",
    deselectAll: "すべて解除",
    selectYourNames: "プレイヤー名を選択...",
    noNamesSelected: "未選択",
    noGamesMatched: "条件に一致する試合がありません。",
    removeGame: "リプレイを削除",
    winRate: "勝率",
    gamesWonFraction: (w, tot) => `${tot}試合中 ${w}勝`,
    winner: (name) => `勝者: ${name}`,
    win: "勝利",
    loss: "敗北",
    tie: "引分",
    matchupAverage: "同カード平均",
    vsMatchup: (v) => `同カード比 ${v}`,
    vsOverall: (v) => `全体平均比 ${v}`,
    hitsPerStockUnit: (val) => `${val} /スト`,
    hitsPerStockFraction: (hits, stocks) => `${hits}ヒット / ${stocks}スト`,

    neutralScoreLabel: "ニュートラルスコア",
    neutralScoreFraction: (won, lost) => `${won}勝 / ${lost}敗`,
    perMinuteUnit: (val) => `${val}/分`,
    conversionLabel: "コンバージョン",
    conversionSummary: (dmg, killPct) =>
      `${dmg} ダメージ/機会 · ${killPct}% → 撃墜`,
    advantageRetentionLabel: "アドバンテージ保持",
    advantageRetentionSummary: (leak) => `${leak} 被弾/機会`,
    recoveryDeltaLabel: "復帰 Δ",
    edgeGuardDeltaLabel: "復帰阻止 Δ",
    deltaVsBaseline: (baseline) => `基準値 ${Math.round(baseline)}% との差`,
    deltaNoData: "データ不足",
    neutralScoreNoData: "まだデータが十分ではありません",
    neutralFingerprintTitle: "ニュートラル傾向",
    fingerprintReasonCol: "要因",
    fingerprintWonCol: "獲得率",
    fingerprintLostCol: "被弾率",
    fingerprintDiffCol: "差分",
    experimentationToggleLabel: "実験的な試合を含める (格下相手)",
    experimentationCount: (n) => `${n}試合を除外`,

    aboutTitle: "rmgr-viewer について",
    aboutDescription:
      "ニンテンドウオールスター! 大乱闘スマッシュブラザーズ（スマブラ64）の .rmgr リプレイファイル用リアルタイム再生・分析ビューアーです。",
    authorLabel: "作者",
    authorName: "鵺",
    twitterLabel: "Twitter / X",
    githubLabel: "GitHub リポジトリ",
    tobloSfxLabel: "Toblo sfx",
    close: "閉じる",

    shortcutsTitle: "キーボード ショートカット",
    shortcutsPlaybackHeader: "再生",
    shortcutsPlayPause: "再生 / 一時停止",
    shortcutsJumpBackward: "1秒戻る",
    shortcutsJumpForward: "1秒進む",
    shortcutsStepBackward: "前のフレーム",
    shortcutsStepForward: "次のフレーム",
    shortcutsToggleSidebars: "サイドバーの表示切替",
    shortcutsTogglePip: "動画 / 2Dミニ画面の表示切替",
    shortcutsGeneralHeader: "全般",
    shortcutsHelp: "ショートカット一覧を表示",
    shortcutsClose: "ダイアログを閉じる",

    statsSidebarHeaderTitle: "戦績・状況分析",
    collapseLeftSidebarTitle: "立ち回り分析サイドバーを閉じる",
    collapseRightSidebarTitle: "戦績サイドバーを閉じる",
    expandLeftSidebarLabel: "立ち回り",
    expandRightSidebarLabel: "戦績",
    expandLeftSidebarTitle: "立ち回り分析サイドバーを表示",
    expandRightSidebarTitle: "戦績・状況分析サイドバーを表示",

    recoveryWidgetTitle: "復帰",
    edgeGuardWidgetTitle: "復帰阻止",
    ledgeGetupWidgetTitle: "崖上がり",
    ledgeTrapWidgetTitle: "崖狩り",
    situationSuccessBadge: "✓",
    situationFailureBadge: "✗",
    situationOpenBadge: "…",
    noSituations: "このリプレイには該当なし。",
    situationCollapseTitle: (name) => `${name} の折りたたみ / 展開`,

    neutralHitsWidgetTitle: "立ち回り分析",
    neutralFilterAll: (count) => `すべて (${count})`,
    neutralFilterOpenings: (count) => `差し込み (${count})`,
    neutralFilterPunishes: (count) => `被弾 (${count})`,
    neutralOpeningsGroupTitle: (count) => `差し込み成功 (${count})`,
    neutralPunishesGroupTitle: (count) => `被弾・被差し返し (${count})`,
    noNeutralHits: "この試合で差し込みヒットはありません。",
    noNeutralOpeningsLanded: "差し込みヒットはありません。",
    noNeutralPunishesTaken: "立ち回りでの被弾はありません。",
    neutralReasonShieldPressure: "シールド反撃",
    neutralReasonLandingLag: "着地狩り",
    neutralReasonWhiffPunish: "後隙狩り (空振り)",
    neutralReasonJumpPunish: "ジャンプ狩り",
    neutralReasonStandingHit: "地上ヒット",
    neutralReasonStandingGrab: "地上掴み",
    neutralReasonUnknown: "立ち回りヒット",
    neutralReasonReversal: "反撃",
    neutralHitsBadge: (count) => `${count}ヒット`,
    neutralConversionEdgeGuard: "復帰阻止",
    neutralConversionLedgeTrap: "崖狩り",
    neutralConversionKO: "撃墜",
    neutralConversionReset: "仕切り直し",
    neutralConversionReversal: "反撃",

    combosWidgetTitle: "撃墜コンボ",
    comboHitsBadge: (count) => `${count}ヒット`,
    comboKillBadge: "撃墜",
    combosCountChip: (count) => `${count} 撃墜コンボ`,
    noCombos: "この試合で撃墜コンボ（3ヒット以上）はありません。",

    diWidgetTitle: "ベクトル変更 (DI)",
    noDIFound: "この試合でヒットは検出されませんでした。",
    diActiveHit: "リアルタイム ヒット",
    diLastHit: "前回のヒット",
    diScrubPrompt: "シークしてDIメトリクスを確認してください。",
    diCancellationNotice: (gross, net, pct) =>
      `⚠️ 逆方向の入力により一部DIが相殺: 合計 ${gross}u → 実質 ${net}u (${pct}% 相殺)`,

    overlayQuickAttackBtn: "電光石火の軌跡を重ねて表示",
    hideQuickAttackOverlayBtn: "重ねて表示を終了",
    quickAttackPathItem: (idx, time, frame, zips) =>
      `#${idx} ${time} (${frame}F) · ${zips}回ジップ`,

    replayInfoWidgetTitle: "リプレイ情報",
    replayInfoFileLabel: "ファイル",
    replayInfoRecordedLabel: "録画日時",
    finalStocksDetail: (stocks) => `残ストック: ${stocks}`,

    // YouTube Video Sync
    youtubeVideoTitle: "YouTube 動画",
    linkYouTubeVideoBtn: "動画を連携",
    youtubeVideoUrlPlaceholder:
      "https://www.youtube.com/watch?v=... または youtu.be/...",
    youtubeSaveLinkBtn: "保存",
    youtubeUnlinkBtn: "連携を解除",
    youtubeSyncCurrentFrameBtn: "現在のフレームに同期",
    youtubeNudgeMinus1s: "-1.0秒",
    youtubeNudgeMinus1f: "-1F",
    youtubeNudgePlus1f: "+1F",
    youtubeNudgePlus1s: "+1.0秒",
    youtubeViewModeVideoPip: "動画 + ミニ2D画面",
    youtubeViewModeVideoOnly: "動画のみ",
    youtubeViewModeCanvasOnly: "リプレイのみ (音声あり)",
    youtubeViewModeCanvasMuted: "リプレイのみ (音声なし)",
    youtubeTogglePipBtnTitle: "ミニ画面の切り替え (p)",
    youtubeInvalidUrlError:
      "有効なYouTubeのURLまたは動画IDを入力してください。",
    videoAttachedBadge: "YouTube動画リンク済み",
    vodWidgetTitle: "VOD",
    vodPlaybackModeLabel: "再生モード:",
    vodFixSyncLabel: "同期を調整:",
    vodWatchOnYouTube: "YouTubeで見る",
    vodEditLinkBtn: "✎ 編集",
    vodEditLinkTitle: "連携動画を編集",
    pipCloseBtnTitle: "PiPを閉じる",
    syncSessionVideosBtn: "今すぐ同期",
    vodSyncBannerPrompt: (count: number) =>
      `このタイミングをセッション内の他の${count}試合にも適用しますか？`,
    sessionSyncedSuccess: (count: number) =>
      `セッション内の${count}試合の動画タイムスタンプを自動同期しました。`,
    sessionNotRealtimeWarning:
      "これらのリプレイは実時間より高速に出力されたため、相対タイムスタンプを自動計算できませんでした。",

    // Session Grouping
    groupBySession: "セッションごとにグループ化",
    flatList: "全試合一覧",
    sessionGamesCount: (count: number) => `${count} 試合`,
    sessionRecord: (wins: number, losses: number) => `${wins}勝 – ${losses}敗`,
    sessionTotalDuration: (dur: string) => `合計時間: ${dur}`,
    sessionVideoAttached: "YouTube動画連携済み",
    sessionSoloGame: "練習 / 単独マッチ",
    sessionVs: (opponent: string) => `vs ${opponent}`,

    // Filters & Uneven Start
    filterOpponentLabel: "対戦相手:",
    filterAllOpponents: "すべての対戦相手",
    filterMyCharLabel: "使用キャラ:",
    filterAllMyCharacters: "すべてのキャラ",
    filterOppCharLabel: "相手キャラ:",
    filterAllOppCharacters: "すべてのキャラ",
    filterReset: "フィルター解除",
    unevenStocksBadge: "変則スタート",
    unevenStocksTooltip: (yourStart, oppStart) =>
      `変則開始ストック: ${yourStart} vs ${oppStart} · 総合勝敗数には含まれません`,
    overallFilteredHeader: (filtered, total, dreamLand) =>
      `総合戦績 (${filtered}/${total}試合 · プププランド${dreamLand}試合)`,

    // 12 Character Battle (12CB)
    twelveCharacterBattleTitle: "12キャラ戦",
    twelveCharacterBattleShort: "12キャラ",
    session12CbRecord: (wins, losses) => `12キャラ: ${wins}勝 – ${losses}敗`,
    twelveCbWon: (remainingChars, remainingStocks) =>
      `勝利 (残り${remainingChars}キャラ・${remainingStocks}ストック)`,
    twelveCbLost: (remainingChars, remainingStocks) =>
      `敗北 (相手残り${remainingChars}キャラ・${remainingStocks}ストック)`,
    twelveCbMatchIndex: (idx, total) => `第${idx}/${total}戦`,
    twelveCbMatchProgress: (current, total) => `第${current}/${total}戦`,
    twelveCbRemainingCount: (remaining, total) =>
      `残り ${remaining}/${total} キャラ`,
    twelveCbActiveLabel: "使用中",
    twelveCbAvailableLabel: "使用可",
    twelveCbEliminatedLabel: "使用不可",
    twelveCbStocksLabel: (stocks) => `${stocks}ストック`,
    twelveCbPrevMatch: "前の試合",
    twelveCbNextMatch: "次の試合",
    twelveCbPrevMatchTitle: "この12キャラ戦の前の試合",
    twelveCbNextMatchTitle: "この12キャラ戦の次の試合",
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
