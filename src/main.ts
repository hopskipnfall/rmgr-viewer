import { initLanguage, setLanguage, t, type Language } from "./i18n.js";
import {
  navigateToLibrary,
  navigateToMatch,
  onRoute,
  type Route,
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
  type SerializedGameSummary,
} from "./data/gameSummary.js";
import { DEMO_REPLAY_FILENAMES } from "./data/demoReplayFiles.js";
import { importReplayFiles } from "./data/importer.js";
import { MatchViewController } from "./match/matchView.js";
import { LibraryViewController } from "./library/libraryView.js";
import { CharacterPreviewController } from "./preview/characterPreview.js";
import {
  createDefaultIdentity,
  matchesAlias,
  resolvePerspectivePort,
} from "./data/identity.js";
import { computeOverallBaseline, type DerivedRates } from "./data/aggregate.js";
import { groupGamesIntoSessions } from "./data/session.js";
import {
  hasVideoLink,
  loadVideoLink,
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
const previewViewEl = document.getElementById("previewView") as HTMLDivElement;
const matchViewEl = document.getElementById("matchView") as HTMLDivElement;
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
const importContainer = document.getElementById(
  "importContainer",
) as HTMLDivElement;
const importBtn = document.getElementById("importBtn") as HTMLButtonElement;
const importDropdownMenu = document.getElementById(
  "importDropdownMenu",
) as HTMLDivElement;
const importFilesBtn = document.getElementById(
  "importFilesBtn",
) as HTMLButtonElement;
const importFolderBtn = document.getElementById(
  "importFolderBtn",
) as HTMLButtonElement;
const filePicker = document.getElementById("filePicker") as HTMLInputElement;
const folderPicker = document.getElementById(
  "folderPicker",
) as HTMLInputElement;
const importProgressWrap = document.getElementById(
  "importProgressWrap",
) as HTMLDivElement;
const importProgressBar = document.getElementById(
  "importProgressBar",
) as HTMLDivElement;
const importProgressText = document.getElementById(
  "importProgressText",
) as HTMLSpanElement;
const loadStatus = document.getElementById("loadStatus") as HTMLSpanElement;
const appLoadingScreen = document.getElementById(
  "appLoadingScreen",
) as HTMLDivElement;
const appLoadingProgressBar = document.getElementById(
  "appLoadingProgressBar",
) as HTMLDivElement;
const appLoadingText = document.getElementById(
  "appLoadingText",
) as HTMLDivElement;
const langToggleEl = document.getElementById("langToggle") as HTMLDivElement;
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
const aboutTwitterLabel = document.getElementById(
  "aboutTwitterLabel",
) as HTMLSpanElement;
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
let previewController: CharacterPreviewController;

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
  importBtn.textContent = `+ ${tr.importReplays}`;
  importFilesBtn.textContent = tr.importFiles;
  importFolderBtn.textContent = tr.importFolder;
  backToLibraryBtn.textContent = tr.backToLibrary;
  // About modal labels
  aboutModalTitle.textContent = tr.aboutTitle;
  aboutModalDesc.textContent = tr.aboutDescription;
  aboutAuthorLabel.textContent = tr.authorLabel;
  aboutAuthorLink.textContent = tr.authorName;
  aboutTwitterLabel.textContent = tr.twitterLabel;
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
}

function applyLanguage(lang: Language): void {
  setLanguage(lang);
  updateHeaderTranslations();
  for (const btn of langToggleEl.querySelectorAll<HTMLButtonElement>(
    ".lang-btn",
  )) {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  }
  libraryController?.updateTranslations();
  matchController?.updateStaticTranslations();
}

async function handleImport(files: FileList | File[]): Promise<void> {
  if (!files || files.length === 0) return;

  loadStatus.textContent = "";
  importProgressWrap.hidden = false;
  const tr = t();

  try {
    const result = await importReplayFiles(files, (progress) => {
      const pct =
        progress.total > 0
          ? Math.round((progress.loaded / progress.total) * 100)
          : 0;
      importProgressBar.style.setProperty("--progress-pct", `${pct}%`);
      importProgressText.textContent = tr.importingProgress(
        progress.loaded,
        progress.total,
      );
    });

    if (result.summaries.length > 0) {
      libraryController.addSummaries(result.summaries);
    }

    if (result.errors.length > 0) {
      loadStatus.textContent = `Skipped ${result.errors.length} file(s) with errors.`;
    }
  } catch (err) {
    loadStatus.textContent = `Import failed: ${(err as Error).message}`;
  } finally {
    setTimeout(() => {
      importProgressWrap.hidden = true;
    }, 1500);
  }
}

let currentMatchSummary: GameSummary | null = null;

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

async function handleRouteChange(route: Route): Promise<void> {
  if (route.view === "library") {
    currentMatchSummary = null;
    // Show Library View
    matchController.deactivate();
    previewController?.deactivate();
    matchViewEl.hidden = true;
    matchFooterEl.hidden = true;
    previewViewEl.hidden = true;
    backToLibraryBtn.hidden = true;
    importContainer.hidden = false;

    libraryViewEl.hidden = false;
    libraryController.render();
  } else if (route.view === "preview") {
    currentMatchSummary = null;
    // Show Character Preview View
    matchController.deactivate();
    matchViewEl.hidden = true;
    matchFooterEl.hidden = true;
    libraryViewEl.hidden = true;
    backToLibraryBtn.hidden = false;
    importContainer.hidden = true;

    previewController.activate();
  } else if (route.view === "match") {
    // Show Match View
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
    matchViewEl.hidden = false;
    matchFooterEl.hidden = false;
    backToLibraryBtn.hidden = false;
    importContainer.hidden = true;

    loadStatus.textContent = "Loading replay...";
    try {
      let loaded: LoadedReplay;
      if (summary.fileRef) {
        loaded = await loadReplayFromFile(summary.fileRef);
      } else if (summary.url) {
        loaded = await loadReplayFromUrl(summary.url);
      } else {
        loaded = await loadReplayFromUrl(DEMO_REPLAY_URLS[0]!);
      }

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
      loadStatus.textContent = "";
    } catch (err) {
      loadStatus.textContent = `Failed to load match: ${(err as Error).message}`;
    }
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

  libraryController = new LibraryViewController(
    libraryViewEl,
    modalContainerEl,
    (selectedSummary) => {
      navigateToMatch(selectedSummary.id);
    },
  );

  previewController = new CharacterPreviewController(previewViewEl);

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

  importBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    importDropdownMenu.hidden = !importDropdownMenu.hidden;
  });

  document.addEventListener("click", () => {
    importDropdownMenu.hidden = true;
  });

  importFilesBtn.addEventListener("click", () => {
    importDropdownMenu.hidden = true;
    filePicker.click();
  });

  importFolderBtn.addEventListener("click", () => {
    importDropdownMenu.hidden = true;
    folderPicker.click();
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

  // Language toggle
  langToggleEl.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest<HTMLButtonElement>(
      ".lang-btn",
    );
    if (!target) return;
    const lang = target.dataset.lang as Language | undefined;
    if (lang === "en" || lang === "ja") {
      applyLanguage(lang);
    }
  });

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

  // 3. Initialize Language (before the demo-seeding progress text below,
  // and before the router's initial route can render anything, so both
  // are localized from the very first frame)
  const initialLang = initLanguage();
  applyLanguage(initialLang);

  // 4. Seed Demo Replays: fetch the precomputed summaries JSON (one small
  // request) rather than downloading and parsing every demo .rmgr file
  // up front. Each summary's `url` is set from DEMO_REPLAY_FILENAMES so
  // the full Replay is only fetched+parsed later, on demand, when the
  // user actually opens that game (see the "match" branch of
  // handleRouteChange, which already loads lazily from `summary.url`).
  const demoSummaries: GameSummary[] = [];
  appLoadingProgressBar.style.setProperty("--progress-pct", "50%");
  appLoadingText.textContent = t().loadingDemoReplays;
  try {
    const response = await fetch(DEMO_SUMMARIES_URL);
    if (!response.ok) {
      throw new Error(
        `failed to fetch ${DEMO_SUMMARIES_URL}: ${response.status} ${response.statusText}`,
      );
    }
    const serialized = (await response.json()) as SerializedGameSummary[];
    for (const s of serialized) {
      const summary = deserializeGameSummary(s);
      const url = DEMO_REPLAY_URLS[DEMO_REPLAY_FILENAMES.indexOf(s.sourceName)];
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

  if (demoSummaries.length > 0) {
    libraryController.setDemoMode(true);
    libraryController.setIdentity(createDefaultIdentity("George"));
    libraryController.addSummaries(demoSummaries);
  }

  // 3b. Seed the default YouTube sync link for the 12CB session recorded on
  // 2026-08-20: frame 0 of the first file was confirmed to line up with
  // 0:05.80 in the linked video. Propagate it across the rest of that same
  // real-time session (not the unrelated 08-22/08-25 demo files) as a
  // rough estimate so every match in the battle opens already synced.
  // Skip if a visitor already set their own link for this game.
  const TWELVE_CB_VIDEO_ID = "tcMChEWcHZ4";
  const TWELVE_CB_VIDEO_URL = `https://www.youtube.com/watch?v=${TWELVE_CB_VIDEO_ID}`;
  const TWELVE_CB_VIDEO_SOURCE = "20260820-175726-George-Harold.rmgr";
  const twelveCbSourceSummary = demoSummaries.find(
    (s) => s.sourceName === TWELVE_CB_VIDEO_SOURCE,
  );
  const twelveCbSessionGames = demoSummaries.filter((s) =>
    s.sourceName.startsWith("20260820-"),
  );
  if (twelveCbSourceSummary && !hasVideoLink(twelveCbSourceSummary.id)) {
    const linkData: VideoLinkData = {
      videoId: TWELVE_CB_VIDEO_ID,
      url: TWELVE_CB_VIDEO_URL,
      offsetSeconds: 5.8,
      viewMode: "canvas",
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
    "20260820-175726-George-Harold.rmgr": 5.8,
    "20260820-180010-George-Harold.rmgr": 169.95,
    "20260820-180146-George-Harold.rmgr": 266.45,
    "20260820-180229-George-Harold.rmgr": 309.2,
    "20260820-180657-George-Harold.rmgr": 576.92,
    "20260820-181042-George-Harold.rmgr": 802.21,
    "20260820-181157-George-Harold.rmgr": 877.19,
    "20260820-181413-George-Harold.rmgr": 1013.36,
    "20260820-181511-George-Harold.rmgr": 1071.31,
    "20260820-181820-George-Harold.rmgr": 1260.43,
    "20260820-181916-George-Harold.rmgr": 1315.78,
    "20260820-182308-George-Harold.rmgr": 1547.75,
    "20260820-182538-George-Harold.rmgr": 1698.34,
    "20260820-182632-George-Harold.rmgr": 1752.19,
    "20260820-182926-George-Harold.rmgr": 1926.45,
    "20260820-183112-George-Harold.rmgr": 2031.7,
    "20260820-183150-George-Harold.rmgr": 2070.16,
    "20260820-183423-George-Harold.rmgr": 2222.8,
    "20260820-183646-George-Harold.rmgr": 2366.29,
  };
  for (const game of twelveCbSessionGames) {
    const offsetSeconds = TWELVE_CB_EXACT_OFFSETS[game.sourceName];
    if (offsetSeconds === undefined) continue;
    const existing = loadVideoLink(game.id);
    saveVideoLink(game.id, {
      videoId: TWELVE_CB_VIDEO_ID,
      url: TWELVE_CB_VIDEO_URL,
      offsetSeconds,
      viewMode: existing?.viewMode ?? "canvas",
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
