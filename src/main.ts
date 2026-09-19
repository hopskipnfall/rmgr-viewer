import { initLanguage, setLanguage, t, type Language } from "./i18n.js";
import {
  initTheme,
  setThemePreference,
  getEffectiveTheme,
  getStoredThemePreference,
  type Theme,
  type ThemePreference,
} from "./theme.js";
import {
  navigateToLibrary,
  navigateToMatch,
  navigateToMatchup,
  navigateToSearch,
  navigateToSession,
  onRoute,
  type Route,
  type SearchRouteCriteria,
} from "./router.js";
import type { PortIndex } from "@rmg-k/rmgr";
import {
  loadReplayFromFile,
  loadReplayFromUrl,
  type LoadedReplay,
} from "./replaySource.js";
import {
  deserializeGameSummary,
  type GameSummary,
  type DemoSummariesFile,
} from "./data/gameSummary.js";
import { DEMO_REPLAY_FILENAMES } from "./data/demoReplayFiles.js";
import { importReplayFiles, type ImportProgress } from "./data/importer.js";
import { clearLocalData } from "./data/clearLocalData.js";
import {
  MissingFileCancelledError,
  promptForMissingFile,
} from "./library/missingFilePrompt.js";
import {
  importIntoLibrary,
  loadPersistedLibrary,
  setManualPerspective,
} from "./data/libraryPersistence.js";
import {
  buildProjectFile,
  identityOf,
  mergeProjectFile,
  parseProjectFile,
  ProjectFileError,
  serializeProjectFile,
} from "./data/projectFile.js";
import {
  openLibraryStore,
  type LibraryStore,
  type StoredGame,
} from "./data/libraryStore.js";
import { MatchViewController } from "./match/matchView.js";
import { LibraryViewController } from "./library/libraryView.js";
import { HomeSidebarController } from "./library/homeSidebar.js";
import { MatchupViewController } from "./matchup/matchupView.js";
import { CharacterPreviewController } from "./preview/characterPreview.js";
import {
  createDefaultIdentity,
  matchesAlias,
  resolvePerspectivePort,
  saveIdentity,
} from "./data/identity.js";
import { computeOverallBaseline, type DerivedRates } from "./data/aggregate.js";
import { groupGamesIntoSessions, type SessionGroup } from "./data/session.js";
import type { PlaylistClip } from "./playlist.js";
import { SearchViewController } from "./search/searchView.js";
import { SessionViewController } from "./session/sessionView.js";
import {
  hasVideoLink,
  loadVideoLink,
  migrateVideoLink,
  propagateVideoLinkToSession,
  saveVideoLink,
  type VideoLinkData,
} from "./video/youtubeSync.js";
import {
  isTobloSfxEnabled,
  playTobloEnabledSfx,
  setTobloSfxEnabled,
} from "./sfx.js";

// DOM Elements
const libraryViewEl = document.getElementById("libraryView") as HTMLDivElement;
const homeShellEl = document.getElementById("homeShell") as HTMLDivElement;
const homeSidebarEl = document.getElementById(
  "librarySidebar",
) as HTMLDivElement;
const previewViewEl = document.getElementById("previewView") as HTMLDivElement;
const matchViewEl = document.getElementById("matchView") as HTMLDivElement;
const searchViewEl = document.getElementById("searchView") as HTMLDivElement;
const sessionViewEl = document.getElementById("sessionView") as HTMLDivElement;
const matchupViewEl = document.getElementById("matchupView") as HTMLDivElement;
const matchFooterEl = document.getElementById("matchFooter") as HTMLElement;
const modalContainerEl = document.getElementById(
  "modalContainer",
) as HTMLDivElement;
const backToLibraryBtn = document.getElementById(
  "backToLibraryBtn",
) as HTMLButtonElement;
const twelveCbPrevMatchBtn = document.getElementById(
  "twelveCbPrevMatchBtn",
) as HTMLButtonElement;
const twelveCbNextMatchBtn = document.getElementById(
  "twelveCbNextMatchBtn",
) as HTMLButtonElement;
const sessionPrevGameBtn = document.getElementById(
  "sessionPrevGameBtn",
) as HTMLButtonElement | null;
const sessionNextGameBtn = document.getElementById(
  "sessionNextGameBtn",
) as HTMLButtonElement | null;
const aboutClearDataBtn = document.getElementById(
  "aboutClearDataBtn",
) as HTMLButtonElement;
const exportProjectBtn = document.getElementById(
  "exportProjectBtn",
) as HTMLButtonElement | null;
const importProjectBtn = document.getElementById(
  "importProjectBtn",
) as HTMLButtonElement | null;
const importProjectInput = document.getElementById(
  "importProjectInput",
) as HTMLInputElement | null;
const projectFileStatus = document.getElementById(
  "projectFileStatus",
) as HTMLElement | null;
const filePicker = document.getElementById("filePicker") as HTMLInputElement;
const folderPicker = document.getElementById(
  "folderPicker",
) as HTMLInputElement;
const appLoadingScreen = document.getElementById(
  "appLoadingScreen",
) as HTMLDivElement;
const appLoadingProgressBar = document.getElementById(
  "appLoadingProgressBar",
) as HTMLDivElement;
const appLoadingText = document.getElementById(
  "appLoadingText",
) as HTMLDivElement;
const themeSelectWrap = document.getElementById(
  "themeSelectWrap",
) as HTMLDivElement | null;
const themeSelectIcon = document.getElementById(
  "themeSelectIcon",
) as HTMLSpanElement | null;
const themeSelect = document.getElementById(
  "themeSelect",
) as HTMLSelectElement | null;
const langSelect = document.getElementById("langSelect") as HTMLSelectElement;
const appTitleBtn = document.getElementById("appTitleBtn") as HTMLButtonElement;
const aboutModal = document.getElementById("aboutModal") as HTMLDivElement;
const aboutModalTitle = document.getElementById(
  "aboutModalTitle",
) as HTMLHeadingElement;
const aboutModalDesc = document.getElementById(
  "aboutModalDesc",
) as HTMLParagraphElement;
const aboutAuthorLabel = document.getElementById(
  "aboutAuthorLabel",
) as HTMLSpanElement;
const aboutAuthorLink = document.getElementById(
  "aboutAuthorLink",
) as HTMLAnchorElement;
const aboutGithubLabel = document.getElementById(
  "aboutGithubLabel",
) as HTMLSpanElement;
const aboutModalCloseBtn = document.getElementById(
  "aboutModalCloseBtn",
) as HTMLButtonElement;
const aboutModalFooterCloseBtn = document.getElementById(
  "aboutModalFooterCloseBtn",
) as HTMLButtonElement;
const aboutModalBackdrop = document.getElementById(
  "aboutModalBackdrop",
) as HTMLDivElement;
const aboutTobloSfxCheckbox = document.getElementById(
  "aboutTobloSfxCheckbox",
) as HTMLInputElement;
const aboutTobloSfxLabel = document.getElementById(
  "aboutTobloSfxLabel",
) as HTMLLabelElement;

// Shortcuts modal elements
const shortcutsModal = document.getElementById(
  "shortcutsModal",
) as HTMLDivElement;
const shortcutsModalTitle = document.getElementById(
  "shortcutsModalTitle",
) as HTMLHeadingElement;
const shortcutsModalCloseBtn = document.getElementById(
  "shortcutsModalCloseBtn",
) as HTMLButtonElement;
const shortcutsModalFooterCloseBtn = document.getElementById(
  "shortcutsModalFooterCloseBtn",
) as HTMLButtonElement;
const shortcutsModalBackdrop = document.getElementById(
  "shortcutsModalBackdrop",
) as HTMLDivElement;
const shortcutsPlaybackHeader = document.getElementById(
  "shortcutsPlaybackHeader",
) as HTMLDivElement;
const shortcutsPlayPause = document.getElementById(
  "shortcutsPlayPause",
) as HTMLSpanElement;
const shortcutsJumpBackward = document.getElementById(
  "shortcutsJumpBackward",
) as HTMLSpanElement;
const shortcutsJumpForward = document.getElementById(
  "shortcutsJumpForward",
) as HTMLSpanElement;
const shortcutsStepBackward = document.getElementById(
  "shortcutsStepBackward",
) as HTMLSpanElement;
const shortcutsStepForward = document.getElementById(
  "shortcutsStepForward",
) as HTMLSpanElement;
const shortcutsToggleSidebars = document.getElementById(
  "shortcutsToggleSidebars",
) as HTMLSpanElement;
const shortcutsGeneralHeader = document.getElementById(
  "shortcutsGeneralHeader",
) as HTMLDivElement;
const shortcutsHelp = document.getElementById(
  "shortcutsHelp",
) as HTMLSpanElement;
const shortcutsClose = document.getElementById(
  "shortcutsClose",
) as HTMLSpanElement;

// Controllers
let matchController: MatchViewController;
let libraryController: LibraryViewController;
let homeSidebarController: HomeSidebarController;
let previewController: CharacterPreviewController;
let searchController: SearchViewController;
let sessionController: SessionViewController;
let matchupController: MatchupViewController;

const DEMO_REPLAY_URLS = DEMO_REPLAY_FILENAMES.map(
  (filename) => `${import.meta.env.BASE_URL}replays/${filename}`,
);

/**
 * Precomputed `GameSummary` data for the bundled demo replays (see
 * `scripts/generateDemoSummaries.ts`), so startup only needs one small JSON
 * fetch instead of downloading and parsing every demo `.rmgr` file. The
 * full `Replay` (frame-by-frame data) for a given demo game is only
 * fetched+parsed lazily, when the user opens that game (§4 below).
 */
const DEMO_SUMMARIES_URL = `${import.meta.env.BASE_URL}replays/demo-summaries.json`;

function updateHeaderTranslations(): void {
  const tr = t();
  backToLibraryBtn.textContent = tr.backToLibrary;
  const navLibraryLink = document.getElementById("navLibraryLink");
  const navSearchLink = document.getElementById("navSearchLink");
  if (navLibraryLink) navLibraryLink.textContent = tr.navLibrary;
  if (navSearchLink) navSearchLink.textContent = tr.navSearch;
  renderStaleBanner();
  aboutClearDataBtn.textContent = tr.clearLocalData;
  if (exportProjectBtn) exportProjectBtn.textContent = tr.exportProject;
  if (importProjectBtn) importProjectBtn.textContent = tr.importProject;
  // About modal labels
  aboutModalTitle.textContent = tr.aboutTitle;
  aboutModalDesc.textContent = tr.aboutDescription;
  aboutAuthorLabel.textContent = tr.authorLabel;
  aboutAuthorLink.textContent = tr.authorName;
  aboutGithubLabel.textContent = tr.githubLabel;
  aboutTobloSfxLabel.textContent = tr.tobloSfxLabel;
  aboutModalFooterCloseBtn.textContent = tr.close;

  // Shortcuts modal labels
  shortcutsModalTitle.textContent = tr.shortcutsTitle;
  shortcutsPlaybackHeader.textContent = tr.shortcutsPlaybackHeader;
  shortcutsPlayPause.textContent = tr.shortcutsPlayPause;
  shortcutsJumpBackward.textContent = tr.shortcutsJumpBackward;
  shortcutsJumpForward.textContent = tr.shortcutsJumpForward;
  shortcutsStepBackward.textContent = tr.shortcutsStepBackward;
  shortcutsStepForward.textContent = tr.shortcutsStepForward;
  shortcutsToggleSidebars.textContent = tr.shortcutsToggleSidebars;
  shortcutsGeneralHeader.textContent = tr.shortcutsGeneralHeader;
  shortcutsHelp.textContent = tr.shortcutsHelp;
  shortcutsClose.textContent = tr.shortcutsClose;
  shortcutsModalFooterCloseBtn.textContent = tr.close;

  // Update theme select options and accessibility label
  if (themeSelect) {
    themeSelect.setAttribute("aria-label", tr.themeSelectLabel);
    const systemOpt = themeSelect.querySelector<HTMLOptionElement>(
      'option[value="system"]',
    );
    if (systemOpt) systemOpt.textContent = `💻 ${tr.themeSystem}`;
    const lightOpt = themeSelect.querySelector<HTMLOptionElement>(
      'option[value="light"]',
    );
    if (lightOpt) lightOpt.textContent = `☀️ ${tr.themeLight}`;
    const darkOpt = themeSelect.querySelector<HTMLOptionElement>(
      'option[value="dark"]',
    );
    if (darkOpt) darkOpt.textContent = `🌙 ${tr.themeDark}`;
  }
  updateThemeSelectUI(getEffectiveTheme(), getStoredThemePreference());
}

function updateThemeSelectUI(theme: Theme, pref: ThemePreference): void {
  if (themeSelectIcon) {
    themeSelectIcon.textContent = theme === "dark" ? "🌙" : "☀️";
  }
  if (themeSelect && themeSelect.value !== pref) {
    themeSelect.value = pref;
  }
  if (themeSelectWrap) {
    const tr = t();
    const prefLabel =
      pref === "system"
        ? `${tr.themeSystem} (${theme === "dark" ? tr.themeDark : tr.themeLight})`
        : pref === "dark"
          ? tr.themeDark
          : tr.themeLight;
    themeSelectWrap.title = `${tr.themeSelectLabel}: ${prefLabel}`;
  }
}

function applyLanguage(lang: Language): void {
  setLanguage(lang);
  updateHeaderTranslations();
  if (langSelect.value !== lang) {
    langSelect.value = lang;
  }
  libraryController?.updateTranslations();
  homeSidebarController?.updateTranslations();
  matchController?.updateStaticTranslations();
  rerenderMatchupIfActive();
}

function rerenderMatchupIfActive(): void {
  if (!currentMatchupRoute) return;
  matchupController.render(
    currentMatchupRoute.myChar,
    currentMatchupRoute.oppChar,
    libraryController.getSummaries(),
    libraryController.getIdentity(),
  );
}

/** IndexedDB-backed cache of every imported game's summary. Null when IndexedDB is unavailable. */
let libraryStore: LibraryStore | null = null;
/** Cached games from an older ANALYSIS_VERSION - kept out of the library until re-imported. */
let staleEntries: StoredGame[] = [];

/** Notified after every import completes (see promptForMissingFile). */
const importFinishedListeners = new Set<() => void>();

function renderStaleBanner(): void {
  const count = staleEntries.length;
  const bannerEl = document.getElementById("libStaleBanner");
  const bannerText = document.getElementById("libStaleBannerText");
  const bannerBtn = document.getElementById("libStaleBannerBtn");
  if (!bannerEl) return;
  bannerEl.hidden = count === 0;
  if (count === 0) return;
  const tr = t();
  if (bannerText) bannerText.textContent = tr.staleBanner(count);
  if (bannerBtn) bannerBtn.textContent = tr.reimportFolder;
}

/**
 * Adds freshly imported games to the library. A game already listed (e.g.
 * loaded from the cache after a refresh) is updated in place instead - it
 * gets its File for this session, plus any recomputed stats.
 */
function attachImportedSummaries(imported: GameSummary[]): void {
  const added: GameSummary[] = [];
  for (const summary of imported) {
    const existing = libraryController.getSummaryById(summary.id);
    if (existing && !existing.isBundledSample) {
      Object.assign(existing, summary);
    } else {
      added.push(summary);
    }
  }
  if (added.length > 0) {
    libraryController.addSummaries(added);
    homeSidebarController.setData(
      libraryController.getSummaries(),
      libraryController.getIdentity(),
    );
  } else {
    libraryController.render();
  }
}

async function handleImport(files: FileList | File[]): Promise<void> {
  if (!files || files.length === 0) return;

  // Elements are static markup in index.html's #homeShell/#librarySidebar
  // (Task 4 moved this out of LibraryViewController's dynamically-rendered
  // template).
  const libStatusEl = document.getElementById(
    "libLoadStatus",
  ) as HTMLSpanElement | null;
  const libProgressWrap = document.getElementById(
    "libImportProgressWrap",
  ) as HTMLDivElement | null;
  const libProgressBar = document.getElementById(
    "libImportProgressBar",
  ) as HTMLDivElement | null;
  const libProgressText = document.getElementById(
    "libImportProgressText",
  ) as HTMLSpanElement | null;

  if (libStatusEl) libStatusEl.textContent = "";
  if (libProgressWrap) libProgressWrap.hidden = false;
  const tr = t();

  const onProgress = (progress: ImportProgress): void => {
    const pct =
      progress.total > 0
        ? Math.round((progress.loaded / progress.total) * 100)
        : 0;
    if (libProgressBar)
      libProgressBar.style.setProperty("--progress-pct", `${pct}%`);
    if (libProgressText)
      libProgressText.textContent = tr.importingProgress(
        progress.loaded,
        progress.total,
      );
  };

  try {
    let summaries: GameSummary[];
    let errorCount: number;
    let duplicateCount = 0;
    if (libraryStore) {
      const result = await importIntoLibrary(
        libraryStore,
        [...files],
        onProgress,
      );
      for (const { id, legacyId } of result.newIds) {
        migrateVideoLink(legacyId, id);
      }
      staleEntries = result.staleEntries;
      summaries = result.summaries;
      errorCount = result.errors.length;
      duplicateCount = result.duplicateCount;
    } else {
      // No IndexedDB (e.g. a locked-down private window): session-only, as before.
      const result = await importReplayFiles(files, onProgress);
      summaries = result.games.map((g) => g.summary);
      errorCount = result.errors.length;
    }

    attachImportedSummaries(summaries);
    renderStaleBanner();

    const messages: string[] = [];
    if (errorCount > 0) {
      messages.push(`Skipped ${errorCount} file(s) with errors.`);
    }
    if (duplicateCount > 0) {
      messages.push(tr.importDuplicatesSkipped(duplicateCount));
    }
    if (libStatusEl) libStatusEl.textContent = messages.join(" ");
  } catch (err) {
    if (libStatusEl)
      libStatusEl.textContent = `Import failed: ${(err as Error).message}`;
  } finally {
    for (const listener of [...importFinishedListeners]) listener();
    // A search only covers games loaded this session - refresh it so the
    // newly imported games are included.
    if (!searchViewEl.hidden) {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
    setTimeout(() => {
      if (libProgressWrap) libProgressWrap.hidden = true;
    }, 1500);
  }
}

let currentMatchSummary: GameSummary | null = null;
let currentMatchupRoute: { myChar: number; oppChar: number } | null = null;

function computeMatchupBaselineForPort(
  summary: GameSummary,
  port: PortIndex,
): DerivedRates | null {
  if (summary.ports.length !== 2) return null;
  const currentIdentity = libraryController.getIdentity();
  if (currentIdentity.aliases.size === 0) {
    return null;
  }

  const targetPort = summary.ports.find((p) => p.port === port);
  if (!targetPort) return null;

  const resolvedYouPort = resolvePerspectivePort(summary, currentIdentity);
  const name = targetPort.playerName?.trim() ?? "";
  const isYou =
    matchesAlias(name, currentIdentity) ||
    (resolvedYouPort !== null && resolvedYouPort === port);

  if (isYou) {
    return computeOverallBaseline(
      libraryController.getSummaries(),
      currentIdentity,
    );
  }

  // When looking from the opponent's perspective, do not show diffs from anyone's average stats
  return null;
}

/** Loads the actual `.rmgr` data for a `GameSummary` - from its bundled file reference, its URL, or (for the very first library-load fallback) the first demo file. Shared by route navigation and by anything that needs a game's full frame data, like a playlist. */
async function loadReplayForSummary(
  summary: GameSummary,
): Promise<LoadedReplay> {
  if (summary.fileRef) {
    return loadReplayFromFile(summary.fileRef);
  } else if (summary.url) {
    return loadReplayFromUrl(summary.url);
  }
  // Loaded from the persistent cache, but its file isn't imported this session.
  // On a refresh of #/match/<id> this runs inside the first route, while the
  // app loading screen is still up - drop it, or it would cover the prompt.
  appLoadingScreen.hidden = true;
  const loaded = await promptForMissingFile({
    modalContainer: modalContainerEl,
    summary,
    pickFile: () => filePicker.click(),
    pickFolder: () => folderPicker.click(),
    onImportFinished: (listener) => {
      importFinishedListeners.add(listener);
      return () => importFinishedListeners.delete(listener);
    },
  });
  if (!loaded || !summary.fileRef) throw new MissingFileCancelledError();
  return loadReplayFromFile(summary.fileRef);
}

/** A playlist queued by e.g. the search view's "play this clip" action, consumed once handleRouteChange() finishes loading its starting clip's game. */
let pendingPlaylistClips: PlaylistClip[] | null = null;
let pendingPlaylistStartIndex = 0;

/**
 * Queues a playlist and navigates to its starting clip's game -
 * handleRouteChange() picks up `pendingPlaylistClips` once that game
 * finishes loading and hands it (plus `startIndex`) to the match view.
 */
function playPlaylistClips(clips: PlaylistClip[], startIndex: number): void {
  if (clips.length === 0) return;
  pendingPlaylistClips = clips;
  pendingPlaylistStartIndex = startIndex;
  navigateToMatch(clips[startIndex]!.gameId);
}

/**
 * The library's "Failed Edge Guards" session button: jumps to the search
 * view, prepopulated to this session and "failure" (i.e. an edge-guard
 * attempt that did NOT kill), for whichever player the current identity
 * resolves to in this session's first game - a representative choice, not
 * a guarantee every game in the session used the exact same display name.
 */
function handleShowFailedEdgeGuards(session: SessionGroup): void {
  const identity = libraryController.getIdentity();
  const firstGame = session.games[0];
  let playerName: string | null = null;
  if (firstGame) {
    const yourPort =
      firstGame.manualPerspectivePort ??
      resolvePerspectivePort(firstGame, identity);
    playerName =
      firstGame.ports.find((p) => p.port === yourPort)?.playerName ?? null;
  }
  navigateToSearch({
    type: "edgeGuards",
    victimName: null,
    minHits: null,
    killed: null,
    allowGaps: false,
    result: "failure",
    sessionId: session.id,
    playerName,
    playerCharacterId: null,
    opponentCharacterId: null,
    jumpCount: null,
    startingAreaBox: null,
  });
}

/**
 * Bumped on every handleRouteChange() call and captured locally by each
 * invocation - after its one async gap (loading the replay), a call checks
 * this is still its own generation before touching the match view. Without
 * this, clicking a second playlist clip (or any match) while an earlier
 * one is still loading lets whichever load finishes LAST win, regardless
 * of which the user actually clicked last - the earlier, now-stale load
 * would flash its own clip on screen before the real one takes over.
 */
let routeGeneration = 0;

/** Highlights the header nav entry matching the route being shown. */
function setCurrentNavLink(id: string, isCurrent: boolean): void {
  const el = document.getElementById(id);
  if (!el) return;
  if (isCurrent) el.setAttribute("aria-current", "page");
  else el.removeAttribute("aria-current");
}

/**
 * What the header's Search link opens: combos in the most recent session.
 * Scoped deliberately - an unscoped search has to load and re-analyze every
 * replay in the library before showing anything.
 */
function defaultSearchCriteria(): SearchRouteCriteria {
  const sessions = groupGamesIntoSessions(
    libraryController.getSummaries(),
    libraryController.getIdentity(),
    "newest",
  );
  return {
    type: "combos",
    victimName: null,
    minHits: null,
    killed: null,
    allowGaps: false,
    result: null,
    sessionId: sessions[0]?.id ?? null,
    playerName: null,
    playerCharacterId: null,
    opponentCharacterId: null,
    jumpCount: null,
    startingAreaBox: null,
  };
}

async function handleRouteChange(route: Route): Promise<void> {
  const myRouteGeneration = ++routeGeneration;
  setCurrentNavLink("navLibraryLink", route.view === "library");
  setCurrentNavLink("navSearchLink", route.view === "search");
  if (route.view === "library") {
    currentMatchSummary = null;
    currentMatchupRoute = null;
    // Show Library View
    matchController.deactivate();
    previewController?.deactivate();
    matchViewEl.hidden = true;
    matchFooterEl.hidden = true;
    previewViewEl.hidden = true;
    searchViewEl.hidden = true;
    sessionViewEl.hidden = true;
    matchupViewEl.hidden = true;
    backToLibraryBtn.hidden = true;

    homeShellEl.hidden = false;
    libraryViewEl.hidden = false;
    homeSidebarController.setSelectedSessionId(null);
    libraryController.render();
  } else if (route.view === "preview") {
    currentMatchSummary = null;
    currentMatchupRoute = null;
    // Show Character Preview View
    matchController.deactivate();
    matchViewEl.hidden = true;
    matchFooterEl.hidden = true;
    libraryViewEl.hidden = true;
    searchViewEl.hidden = true;
    sessionViewEl.hidden = true;
    matchupViewEl.hidden = true;
    // The header nav's Library link covers this; keeping both showed two
    // Library buttons side by side.
    backToLibraryBtn.hidden = true;
    homeShellEl.hidden = true;

    previewController.activate();
  } else if (route.view === "search") {
    currentMatchSummary = null;
    currentMatchupRoute = null;
    // Show Search View
    matchController.deactivate();
    previewController?.deactivate();
    matchViewEl.hidden = true;
    matchFooterEl.hidden = true;
    previewViewEl.hidden = true;
    libraryViewEl.hidden = true;
    matchupViewEl.hidden = true;
    // The header nav's Library link covers this; keeping both showed two
    // Library buttons side by side.
    backToLibraryBtn.hidden = true;
    homeShellEl.hidden = true;

    searchViewEl.hidden = false;
    sessionViewEl.hidden = true;
    searchController.setData(
      libraryController.getSummaries(),
      libraryController.getIdentity(),
    );
    searchController.setCriteria({
      type: route.type,
      victimName: route.victimName,
      minHits: route.minHits,
      killed: route.killed,
      allowGaps: route.allowGaps,
      result: route.result,
      sessionId: route.sessionId,
      playerName: route.playerName,
      playerCharacterId: route.playerCharacterId,
      opponentCharacterId: route.opponentCharacterId,
      jumpCount: route.jumpCount,
      startingAreaBox: route.startingAreaBox,
    });
  } else if (route.view === "session") {
    currentMatchSummary = null;
    currentMatchupRoute = null;
    // Show Session View
    matchController.deactivate();
    previewController?.deactivate();
    matchViewEl.hidden = true;
    matchFooterEl.hidden = true;
    previewViewEl.hidden = true;
    libraryViewEl.hidden = true;
    searchViewEl.hidden = true;
    matchupViewEl.hidden = true;
    // The header nav's Library link covers this; keeping both showed two
    // Library buttons side by side.
    backToLibraryBtn.hidden = true;

    homeShellEl.hidden = false;
    sessionViewEl.hidden = false;
    homeSidebarController.setSelectedSessionId(route.id);
    sessionController.setData(
      libraryController.getSummaries(),
      libraryController.getIdentity(),
    );
    sessionController.setSessionId(route.id);
  } else if (route.view === "match") {
    // Show Match View
    currentMatchupRoute = null;
    const summary = libraryController.getSummaryById(route.id);
    if (!summary) {
      // Game not found (e.g. reload or invalid ID) — gracefully fallback to library (§6.1)
      navigateToLibrary();
      return;
    }
    currentMatchSummary = summary;

    previewController?.deactivate();
    previewViewEl.hidden = true;
    libraryViewEl.hidden = true;
    searchViewEl.hidden = true;
    sessionViewEl.hidden = true;
    matchupViewEl.hidden = true;
    matchViewEl.hidden = false;
    matchFooterEl.hidden = false;
    // The header nav's Library link covers this; keeping both showed two
    // Library buttons side by side.
    backToLibraryBtn.hidden = true;
    homeShellEl.hidden = true;

    try {
      const loaded = await loadReplayForSummary(summary);
      if (myRouteGeneration !== routeGeneration) return; // a newer navigation superseded this one

      const identity = libraryController.getIdentity();
      const perspectivePort =
        summary.manualPerspectivePort ??
        resolvePerspectivePort(summary, identity);

      const initialPort: PortIndex =
        perspectivePort !== null
          ? perspectivePort
          : (summary.ports[0]?.port ?? 0);

      const matchupBaseline = computeMatchupBaselineForPort(
        summary,
        initialPort,
      );

      matchController.setIdentity(identity);
      matchController.setCurrentReplayId(summary.id);
      // Scope to just this game's own session cluster, not the whole
      // library - propagateVideoLinkToSession's realtime check requires
      // every consecutive pair in the list it's given to look continuous,
      // and unrelated sessions recorded on other days (with their own
      // internal timing quirks) can make that check fail for the entire
      // set, silently falling back to giving every game an identical
      // offset instead of one relative to this session's own timestamps.
      const allSummaries = libraryController.getSummaries();
      const ownSession = groupGamesIntoSessions(allSummaries, identity).find(
        (session) => session.games.some((g) => g.id === summary.id),
      );
      matchController.setSessionSummaries(
        ownSession ? [...ownSession.games] : allSummaries,
      );
      matchController.loadMatch(loaded, initialPort, matchupBaseline);
      matchController.activate();

      // Every normal navigation into a match starts outside any playlist -
      // clear whatever the previous match view left behind (its bar
      // otherwise kept showing after leaving a playlist and opening an
      // unrelated game). Immediately re-armed below if this navigation is
      // actually itself a playlist's starting clip.
      matchController.exitPlaylist();

      // Pick up a playlist queued by playPlaylistClips() once its starting
      // clip's game finishes loading here - only if this navigation is
      // actually that clip's game, not some unrelated navigation that
      // happened to occur while it was pending.
      if (
        pendingPlaylistClips &&
        pendingPlaylistClips[pendingPlaylistStartIndex]?.gameId === summary.id
      ) {
        matchController.startPlaylist(
          pendingPlaylistClips,
          async (gameId) => {
            const clipSummary = libraryController.getSummaryById(gameId);
            return clipSummary ? loadReplayForSummary(clipSummary) : null;
          },
          pendingPlaylistStartIndex,
        );
        pendingPlaylistClips = null;
      }
    } catch (err) {
      if (err instanceof MissingFileCancelledError) {
        navigateToLibrary();
        return;
      }
      console.error("Failed to load match:", err);
    }
  } else if (route.view === "matchup") {
    currentMatchSummary = null;
    currentMatchupRoute = { myChar: route.myChar, oppChar: route.oppChar };
    // Show Matchup View
    matchController.deactivate();
    previewController?.deactivate();
    matchViewEl.hidden = true;
    matchFooterEl.hidden = true;
    previewViewEl.hidden = true;
    libraryViewEl.hidden = true;
    searchViewEl.hidden = true;
    sessionViewEl.hidden = true;
    // The header nav's Library link covers this; keeping both showed two
    // Library buttons side by side.
    backToLibraryBtn.hidden = true;
    homeShellEl.hidden = true;

    matchupViewEl.hidden = false;
    matchupController.render(
      route.myChar,
      route.oppChar,
      libraryController.getSummaries(),
      libraryController.getIdentity(),
    );
  }
}

async function init(): Promise<void> {
  // 1. Initialize Views
  matchController = new MatchViewController();
  matchController.setOnPerspectiveChanged((newPort) => {
    if (currentMatchSummary) {
      const baseline = computeMatchupBaselineForPort(
        currentMatchSummary,
        newPort,
      );
      matchController.setMatchupBaseline(baseline);
    }
  });
  matchController.setOnViewMatchup((myChar, oppChar) => {
    navigateToMatchup(myChar, oppChar);
  });

  libraryController = new LibraryViewController(
    libraryViewEl,
    (selectedSummary) => {
      navigateToMatch(selectedSummary.id);
    },
    (session) => {
      handleShowFailedEdgeGuards(session);
    },
    (myChar, oppChar) => {
      navigateToMatchup(myChar, oppChar);
    },
  );

  homeSidebarController = new HomeSidebarController(
    homeSidebarEl,
    modalContainerEl,
    libraryController.getIdentity(),
    (identity) => {
      // Demo mode's placeholder identity must never overwrite the user's
      // real saved one (mirrors LibraryViewController.persistIdentity's
      // guard, which owned this write before the identity panel moved
      // into HomeSidebarController).
      if (!libraryController.getIsDemoMode()) {
        saveIdentity(identity);
      }
      libraryController.setIdentity(identity);
      homeSidebarController.setData(libraryController.getSummaries(), identity);
    },
    (sessionId) => navigateToSession(sessionId),
    () => navigateToLibrary(),
  );

  libraryController.setPersistenceHooks({
    identity: (identity) => saveIdentity(identity),
    perspective: (id, port) => {
      if (libraryStore) void setManualPerspective(libraryStore, id, port);
    },
    remove: (id) => {
      if (libraryStore) void libraryStore.delete(id);
    },
  });

  matchupController = new MatchupViewController(
    matchupViewEl,
    (summary) => {
      navigateToMatch(summary.id);
    },
    (summary, port) => {
      libraryController.selectPlayerPerspective(summary, port);
      rerenderMatchupIfActive();
    },
    (id) => {
      libraryController.removeSummary(id);
      homeSidebarController.setData(
        libraryController.getSummaries(),
        libraryController.getIdentity(),
      );
      rerenderMatchupIfActive();
    },
    (session) => {
      handleShowFailedEdgeGuards(session);
    },
  );

  previewController = new CharacterPreviewController(previewViewEl);
  searchController = new SearchViewController(
    searchViewEl,
    modalContainerEl,
    loadReplayForSummary,
    (clips, startIndex) => {
      playPlaylistClips(clips, startIndex);
    },
    () => folderPicker.click(),
  );
  sessionController = new SessionViewController(
    sessionViewEl,
    (summary) => {
      navigateToMatch(summary.id);
    },
    (summary, port) => {
      libraryController.selectPlayerPerspective(summary, port);
    },
    (id) => {
      libraryController.removeSummary(id);
      homeSidebarController.setData(
        libraryController.getSummaries(),
        libraryController.getIdentity(),
      );
    },
    (session) => {
      handleShowFailedEdgeGuards(session);
    },
  );

  // 2. Wire Header controls
  backToLibraryBtn.addEventListener("click", () => {
    navigateToLibrary();
  });

  twelveCbPrevMatchBtn.addEventListener("click", () => {
    const id = twelveCbPrevMatchBtn.dataset.gameId;
    if (id) navigateToMatch(id);
  });

  twelveCbNextMatchBtn.addEventListener("click", () => {
    const id = twelveCbNextMatchBtn.dataset.gameId;
    if (id) navigateToMatch(id);
  });

  // The header's Search link opens the cheapest useful search rather than
  // "failed edge guards across every game", which re-reads the whole library.
  document.getElementById("navSearchLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigateToSearch(defaultSearchCriteria());
  });

  sessionPrevGameBtn?.addEventListener("click", () => {
    const id = sessionPrevGameBtn.dataset.gameId;
    if (id) navigateToMatch(id);
  });

  sessionNextGameBtn?.addEventListener("click", () => {
    const id = sessionNextGameBtn.dataset.gameId;
    if (id) navigateToMatch(id);
  });

  // Import button controls (delegated on homeSidebarEl — elements live inside
  // the persistent #librarySidebar shell, a sibling of libraryViewEl inside
  // #homeShell, not a descendant of it)
  homeSidebarEl.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const importDropdownMenu = document.getElementById(
      "importDropdownMenu",
    ) as HTMLDivElement | null;

    if (target.id === "importBtn" || target.closest("#importBtn")) {
      e.stopPropagation();
      if (importDropdownMenu) {
        importDropdownMenu.hidden = !importDropdownMenu.hidden;
      }
    } else if (target.id === "importFilesBtn") {
      if (importDropdownMenu) importDropdownMenu.hidden = true;
      filePicker.click();
    } else if (target.id === "importFolderBtn") {
      if (importDropdownMenu) importDropdownMenu.hidden = true;
      folderPicker.click();
    } else if (target.id === "libStaleBannerBtn") {
      folderPicker.click();
    } else {
      // Clicks outside the dropdown close it
      if (importDropdownMenu && !importDropdownMenu.contains(target)) {
        importDropdownMenu.hidden = true;
      }
    }
  });

  // Also close the import dropdown on any click outside the library view
  document.addEventListener("click", () => {
    const importDropdownMenu = document.getElementById(
      "importDropdownMenu",
    ) as HTMLDivElement | null;
    if (importDropdownMenu) importDropdownMenu.hidden = true;
  });

  filePicker.addEventListener("change", () => {
    if (filePicker.files) {
      void handleImport(filePicker.files);
      filePicker.value = "";
    }
  });

  folderPicker.addEventListener("change", () => {
    if (folderPicker.files) {
      void handleImport(folderPicker.files);
      folderPicker.value = "";
    }
  });

  // Project export/import: everything the app knows about this library except
  // the replay bytes. Lives here rather than in libraryView because main.ts
  // owns `libraryStore`, alongside Clear local data.
  exportProjectBtn?.addEventListener("click", () => {
    void (async () => {
      if (!libraryStore) return;
      const rows = await libraryStore.getAll();
      const videoLinks: Record<string, VideoLinkData> = {};
      for (const row of rows) {
        const link = loadVideoLink(row.id);
        if (link) videoLinks[row.id] = link;
      }
      const blob = serializeProjectFile(
        buildProjectFile(rows, libraryController.getIdentity(), videoLinks),
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rmgr-viewer-project-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      if (projectFileStatus) {
        projectFileStatus.textContent = t().exportProjectDone(rows.length);
      }
    })();
  });

  importProjectBtn?.addEventListener("click", () =>
    importProjectInput?.click(),
  );

  importProjectInput?.addEventListener("change", () => {
    void (async () => {
      const file = importProjectInput.files?.[0];
      if (!file || !libraryStore) return;
      try {
        const parsed = parseProjectFile(await file.text());
        const result = await mergeProjectFile(parsed, libraryStore);
        saveIdentity(identityOf(parsed));
        for (const [id, link] of Object.entries(parsed.videoLinks)) {
          saveVideoLink(id, link);
        }
        if (projectFileStatus) {
          projectFileStatus.textContent = t().importProjectDone(
            result.imported,
            result.skippedStale,
          );
        }
        // Reload so the merged library loads through the normal startup path,
        // the same way Clear local data does.
        window.location.reload();
      } catch (err) {
        if (projectFileStatus) {
          projectFileStatus.textContent =
            err instanceof ProjectFileError
              ? t().importProjectInvalid
              : String(err);
        }
      } finally {
        importProjectInput.value = "";
      }
    })();
  });

  aboutClearDataBtn.addEventListener("click", () => {
    if (!window.confirm(t().clearLocalDataConfirm)) return;
    void clearLocalData(libraryStore).finally(() => {
      window.location.hash = "";
      window.location.reload();
    });
  });

  // Drag and Drop support
  window.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  window.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      void handleImport(e.dataTransfer.files);
    }
  });

  // Language select dropdown
  langSelect.addEventListener("change", () => {
    const lang = langSelect.value as Language;
    if (lang === "en" || lang === "ja") {
      applyLanguage(lang);
    }
  });

  // Theme select dropdown
  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      const pref = themeSelect.value as ThemePreference;
      if (pref === "system" || pref === "light" || pref === "dark") {
        setThemePreference(pref);
        updateThemeSelectUI(getEffectiveTheme(), pref);
      }
    });
  }

  // About modal
  const openAboutModal = (): void => {
    aboutTobloSfxCheckbox.checked = isTobloSfxEnabled();
    aboutModal.hidden = false;
  };
  const closeAboutModal = (): void => {
    aboutModal.hidden = true;
  };
  appTitleBtn.addEventListener("click", openAboutModal);
  aboutModalCloseBtn.addEventListener("click", closeAboutModal);
  aboutModalFooterCloseBtn.addEventListener("click", closeAboutModal);
  aboutModalBackdrop.addEventListener("click", closeAboutModal);
  aboutTobloSfxCheckbox.addEventListener("change", () => {
    setTobloSfxEnabled(aboutTobloSfxCheckbox.checked);
    playTobloEnabledSfx();
  });

  // Shortcuts modal
  const openShortcutsModal = (): void => {
    shortcutsModal.hidden = false;
  };
  const closeShortcutsModal = (): void => {
    shortcutsModal.hidden = true;
  };
  shortcutsModalCloseBtn.addEventListener("click", closeShortcutsModal);
  shortcutsModalFooterCloseBtn.addEventListener("click", closeShortcutsModal);
  shortcutsModalBackdrop.addEventListener("click", closeShortcutsModal);

  document.addEventListener("keydown", (e) => {
    if (
      e.target instanceof HTMLTextAreaElement ||
      (e.target instanceof HTMLInputElement && e.target.type !== "range")
    ) {
      return;
    }
    if (e.key === "?" || (e.code === "Slash" && e.shiftKey)) {
      e.preventDefault();
      if (shortcutsModal.hidden) {
        openShortcutsModal();
      } else {
        closeShortcutsModal();
      }
    } else if (e.key === "Escape") {
      if (!shortcutsModal.hidden) closeShortcutsModal();
      if (!aboutModal.hidden) closeAboutModal();
    }
  });

  // 3. Initialize Theme & Language (before the demo-seeding progress text below,
  // and before the router's initial route can render anything, so both
  // are localized and styled from the very first frame)
  initTheme((theme, pref) => {
    updateThemeSelectUI(theme, pref);
  });
  const initialLang = initLanguage();
  applyLanguage(initialLang);

  // 4. Seed Demo Replays: fetch the precomputed summaries JSON (one small
  // request) rather than downloading and parsing every demo .rmgr file
  // up front. Each summary's `url` is set from DEMO_REPLAY_FILENAMES so
  // the full Replay is only fetched+parsed later, on demand, when the
  // user actually opens that game (see the "match" branch of
  // handleRouteChange, which already loads lazily from `summary.url`).
  //
  // 4a. ...unless this browser already has a saved library (IndexedDB),
  // in which case that loads instead - no files needed until the user
  // opens a game (see loadReplayForSummary).
  let hasPersistedLibrary = false;
  try {
    libraryStore = await openLibraryStore();
    const persisted = await loadPersistedLibrary(libraryStore);
    staleEntries = persisted.staleEntries;
    if (persisted.summaries.length > 0 || persisted.staleEntries.length > 0) {
      hasPersistedLibrary = true;
      libraryController.addSummaries(persisted.summaries);
      homeSidebarController.setData(
        libraryController.getSummaries(),
        libraryController.getIdentity(),
      );
    }
  } catch (err) {
    console.warn(
      "Persistent library unavailable; imports will only last this session:",
      err,
    );
    libraryStore = null;
  }
  renderStaleBanner();

  const demoSummaries: GameSummary[] = [];
  appLoadingProgressBar.style.setProperty("--progress-pct", "50%");
  appLoadingText.textContent = t().loadingDemoReplays;
  if (!hasPersistedLibrary) {
    try {
      const response = await fetch(DEMO_SUMMARIES_URL);
      if (!response.ok) {
        throw new Error(
          `failed to fetch ${DEMO_SUMMARIES_URL}: ${response.status} ${response.statusText}`,
        );
      }
      const file = (await response.json()) as DemoSummariesFile;
      for (const s of file.games) {
        const summary = deserializeGameSummary(s);
        const url =
          DEMO_REPLAY_URLS[DEMO_REPLAY_FILENAMES.indexOf(s.sourceName)];
        if (!url) {
          console.warn(
            "No demo URL found for precomputed summary:",
            s.sourceName,
          );
          continue;
        }
        summary.isBundledSample = true;
        summary.url = url;
        demoSummaries.push(summary);
      }
    } catch (err) {
      console.warn("Could not load precomputed demo summaries:", err);
    } finally {
      appLoadingProgressBar.style.setProperty("--progress-pct", "100%");
    }
  }

  if (demoSummaries.length > 0) {
    libraryController.setDemoMode(true);
    homeSidebarController.setDemoMode(true);
    libraryController.setIdentity(createDefaultIdentity("George"));
    libraryController.addSummaries(demoSummaries);
    homeSidebarController.setData(
      libraryController.getSummaries(),
      libraryController.getIdentity(),
    );
  }

  // 3b. Seed the default YouTube sync link for the 12CB session recorded on
  // 2026-08-13: frame 0 of the first file was confirmed to line up with
  // 0:05.80 in the linked video. Propagate it across the rest of that same
  // real-time session (not the unrelated 08-22/08-25 demo files) as a
  // rough estimate so every match in the battle opens already synced.
  // Skip if a visitor already set their own link for this game.
  const TWELVE_CB_VIDEO_ID = "tcMChEWcHZ4";
  const TWELVE_CB_VIDEO_URL = `https://www.youtube.com/watch?v=${TWELVE_CB_VIDEO_ID}`;
  const TWELVE_CB_VIDEO_SOURCE = "20260813-175723-George-Harold.rmgr";
  const twelveCbSourceSummary = demoSummaries.find(
    (s) => s.sourceName === TWELVE_CB_VIDEO_SOURCE,
  );
  const twelveCbSessionGames = demoSummaries.filter((s) =>
    s.sourceName.startsWith("20260813-"),
  );
  if (twelveCbSourceSummary && !hasVideoLink(twelveCbSourceSummary.id)) {
    const linkData: VideoLinkData = {
      videoId: TWELVE_CB_VIDEO_ID,
      url: TWELVE_CB_VIDEO_URL,
      offsetSeconds: 5.8,
      viewMode: "canvas-muted",
    };
    saveVideoLink(twelveCbSourceSummary.id, linkData);
    if (twelveCbSessionGames.length > 1) {
      propagateVideoLinkToSession(
        twelveCbSourceSummary.id,
        linkData,
        twelveCbSessionGames,
      );
    }
  }

  // 3c. Hand-synced exact offsets, replacing the proportional-delta
  // estimate above as they're confirmed against the actual video (which
  // drifts over a session this long - real matches don't run back-to-back
  // at a constant cadence). Extend this map as more are confirmed; existing
  // viewMode preference is preserved.
  const TWELVE_CB_EXACT_OFFSETS: Record<string, number> = {
    "20260813-175723-George-Harold.rmgr": 5.8,
    "20260813-180007-George-Harold.rmgr": 169.95,
    "20260813-180143-George-Harold.rmgr": 266.45,
    "20260813-180226-George-Harold.rmgr": 309.2,
    "20260813-180654-George-Harold.rmgr": 576.92,
    "20260813-181039-George-Harold.rmgr": 802.21,
    "20260813-181154-George-Harold.rmgr": 877.19,
    "20260813-181410-George-Harold.rmgr": 1013.36,
    "20260813-181508-George-Harold.rmgr": 1071.31,
    "20260813-181817-George-Harold.rmgr": 1260.43,
    "20260813-181913-George-Harold.rmgr": 1315.78,
    "20260813-182305-George-Harold.rmgr": 1547.75,
    "20260813-182535-George-Harold.rmgr": 1698.34,
    "20260813-182629-George-Harold.rmgr": 1752.19,
    "20260813-182923-George-Harold.rmgr": 1926.45,
    "20260813-183109-George-Harold.rmgr": 2031.7,
    "20260813-183147-George-Harold.rmgr": 2070.16,
    "20260813-183420-George-Harold.rmgr": 2222.8,
    "20260813-183643-George-Harold.rmgr": 2366.29,
  };
  for (const game of twelveCbSessionGames) {
    const offsetSeconds = TWELVE_CB_EXACT_OFFSETS[game.sourceName];
    if (offsetSeconds === undefined) continue;
    const existing = loadVideoLink(game.id);
    saveVideoLink(game.id, {
      videoId: TWELVE_CB_VIDEO_ID,
      url: TWELVE_CB_VIDEO_URL,
      offsetSeconds,
      viewMode: existing?.viewMode ?? "canvas-muted",
    });
  }

  // 5. Connect Router. onRoute() fires its callback once synchronously
  // during registration for the current URL (covering a direct
  // #/match/<id> load, not just #/) - keep the loading screen up through
  // that first resolution, whichever branch it takes, then hide it.
  let isFirstRoute = true;
  onRoute((route) => {
    const routePromise = handleRouteChange(route);
    if (isFirstRoute) {
      isFirstRoute = false;
      void routePromise.finally(() => {
        appLoadingScreen.hidden = true;
      });
    }
  });
}

void init();
