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
import {
  resolvePerspectivePort,
  resolveOpponentPort,
} from "./data/identity.js";
import { computeMatchupBaseline, type DerivedRates } from "./data/aggregate.js";

// DOM Elements
const libraryViewEl = document.getElementById("libraryView") as HTMLDivElement;
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

// Controllers
let matchController: MatchViewController;
let libraryController: LibraryViewController;

const DEFAULT_SAMPLE_URL = `${import.meta.env.BASE_URL}replays/20260825-105731-Marcela-Penelope.rmgr`;
let bundledSampleSummary: GameSummary | null = null;

function updateHeaderTranslations(): void {
  const tr = t();
  importBtn.textContent = `+ ${tr.importReplays}`;
  importFilesBtn.textContent = tr.importFiles;
  importFolderBtn.textContent = tr.importFolder;
  backToLibraryBtn.textContent = tr.backToLibrary;
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

      // If user hasn't set custom aliases or imported many games, suggest onboarding
      const identity = libraryController.getIdentity();
      if (identity.aliases.size === 0 && result.summaries.length > 1) {
        libraryController.openOnboardingModal();
      }
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
  const identity = libraryController.getIdentity();
  const yourP = summary.ports.find((p) => p.port === port);
  const oppPort = resolveOpponentPort(summary, port);
  const oppP =
    oppPort !== null ? summary.ports.find((p) => p.port === oppPort) : null;
  if (!yourP || !oppP) return null;

  return computeMatchupBaseline(
    libraryController.getSummaries(),
    identity,
    yourP.characterId,
    oppP.characterId,
  );
}

async function handleRouteChange(route: Route): Promise<void> {
  if (route.view === "library") {
    currentMatchSummary = null;
    // Show Library View
    matchController.deactivate();
    matchViewEl.hidden = true;
    matchFooterEl.hidden = true;
    backToLibraryBtn.hidden = true;
    importContainer.hidden = false;

    libraryViewEl.hidden = false;
    libraryController.render();
  } else if (route.view === "match") {
    // Show Match View
    const summary = libraryController.getSummaryById(route.id);
    if (!summary) {
      // Game not found (e.g. reload or invalid ID) — gracefully fallback to library (§6.1)
      navigateToLibrary();
      return;
    }
    currentMatchSummary = summary;

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
      } else {
        loaded = await loadReplayFromUrl(DEFAULT_SAMPLE_URL);
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

  // 3. Seed Bundled Replay (§5.4)
  try {
    const sampleLoaded = await loadReplayFromUrl(DEFAULT_SAMPLE_URL);
    bundledSampleSummary = summarizeReplay(sampleLoaded, null);
    bundledSampleSummary.isBundledSample = true;
    libraryController.addSummaries([bundledSampleSummary]);
  } catch (err) {
    console.warn("Could not load default bundled sample:", err);
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
