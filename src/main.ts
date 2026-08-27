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
import { summarizeReplay, type GameSummary } from "./data/gameSummary.js";
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

const DEMO_REPLAY_URLS = [
  `${import.meta.env.BASE_URL}replays/20260822-222803-George-Harold-6.rmgr`,
  `${import.meta.env.BASE_URL}replays/20260822-222803-Harold-George-23.rmgr`,
  `${import.meta.env.BASE_URL}replays/20260822-222803-Harold-George-37.rmgr`,
  `${import.meta.env.BASE_URL}replays/20260825-105731-George-Harold.rmgr`,
];

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

      matchController.setSessionSummaries(libraryController.getSummaries());
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
    aboutModal.hidden = false;
  };
  const closeAboutModal = (): void => {
    aboutModal.hidden = true;
  };
  appTitleBtn.addEventListener("click", openAboutModal);
  aboutModalCloseBtn.addEventListener("click", closeAboutModal);
  aboutModalFooterCloseBtn.addEventListener("click", closeAboutModal);
  aboutModalBackdrop.addEventListener("click", closeAboutModal);

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

  // 3. Seed Demo Replays
  const demoSummaries: GameSummary[] = [];
  for (const url of DEMO_REPLAY_URLS) {
    try {
      const sampleLoaded = await loadReplayFromUrl(url);
      const summary = summarizeReplay(sampleLoaded, null);
      summary.isBundledSample = true;
      summary.url = url;
      demoSummaries.push(summary);
    } catch (err) {
      console.warn("Could not load demo sample:", url, err);
    }
  }

  if (demoSummaries.length > 0) {
    libraryController.setDemoMode(true);
    libraryController.setIdentity(createDefaultIdentity("George"));
    libraryController.addSummaries(demoSummaries);
  }

  // 4. Initialize Language
  const initialLang = initLanguage();
  applyLanguage(initialLang);

  // 5. Connect Router
  onRoute((route) => {
    void handleRouteChange(route);
  });
}

void init();
