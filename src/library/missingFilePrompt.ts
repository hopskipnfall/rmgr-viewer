import { t } from "../i18n.js";
import type { GameSummary } from "../data/gameSummary.js";

/** Thrown by loadReplayForSummary when the user closes the prompt without importing the replay. */
export class MissingFileCancelledError extends Error {
  constructor() {
    super(t().missingFileCancelled);
    this.name = "MissingFileCancelledError";
  }
}

export interface MissingFilePromptOptions {
  modalContainer: HTMLElement;
  /** The game to open. Resolves once an import sets its `source`. */
  summary: GameSummary;
  /** Opens the single-file picker; the import it triggers is reported via onImportFinished. */
  pickFile(): void;
  pickFolder(): void;
  /**
   * Desktop variant: "Not found in your library folder" with Rescan + Cancel
   * instead of the web file/folder pickers.
   */
  desktopRescan?: () => void;
  /** Subscribes to "an import just finished"; returns an unsubscribe function. */
  onImportFinished(listener: () => void): () => void;
}

/**
 * Shown when opening a game whose summary came from the persistent cache
 * but whose replay file hasn't been imported this session (see
 * docs/superpowers/specs/2026-09-15-persistent-library-design.md §6).
 * Resolves true once the matching file is loaded, false if dismissed.
 */
export function promptForMissingFile(
  options: MissingFilePromptOptions,
): Promise<boolean> {
  const { modalContainer, summary } = options;
  const tr = t();
  const desktop = options.desktopRescan !== undefined;
  const title = desktop ? tr.notInLibraryTitle : tr.missingFileTitle;
  const body = desktop
    ? tr.notInLibraryBody(summary.sourceName)
    : tr.missingFileBody(summary.sourceName);
  const buttons = desktop
    ? `<button id="missingFileCancelBtn" class="btn-secondary">${escapeHtml(tr.cancel)}</button>
          <button id="missingFileRescanBtn" class="btn-primary">${escapeHtml(tr.rescan)}</button>`
    : `<button id="missingFileCancelBtn" class="btn-secondary">${escapeHtml(tr.cancel)}</button>
          <button id="missingFileFolderBtn" class="btn-secondary">${escapeHtml(tr.reimportFolder)}</button>
          <button id="missingFileFileBtn" class="btn-primary">${escapeHtml(tr.importThisFile)}</button>`;

  return new Promise((resolve) => {
    modalContainer.hidden = false;
    modalContainer.innerHTML = `
      <div class="modal-backdrop" id="missingFileBackdrop"></div>
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>${escapeHtml(title)}</h3>
          <button class="modal-close" id="missingFileCloseBtn">✕</button>
        </div>
        <p class="modal-subtitle">${escapeHtml(body)}</p>
        <p class="modal-subtitle search-unloaded-note" id="missingFileMessage"></p>
        <div class="modal-footer">
          ${buttons}
        </div>
      </div>
    `;
    const messageEl = modalContainer.querySelector(
      "#missingFileMessage",
    ) as HTMLElement;

    // Only complain about a non-matching import if this prompt asked for it.
    let awaitingImport = false;
    const unsubscribe = options.onImportFinished(() => {
      if (summary.source) {
        close(true);
        return;
      }
      if (awaitingImport) {
        messageEl.textContent = tr.missingFileNoMatch(summary.sourceName);
      }
      awaitingImport = false;
    });

    function close(loaded: boolean): void {
      unsubscribe();
      modalContainer.hidden = true;
      modalContainer.innerHTML = "";
      resolve(loaded);
    }

    const on = (id: string, handler: () => void) =>
      modalContainer.querySelector(id)?.addEventListener("click", handler);
    on("#missingFileBackdrop", () => close(false));
    on("#missingFileCloseBtn", () => close(false));
    on("#missingFileCancelBtn", () => close(false));
    on("#missingFileRescanBtn", () => {
      awaitingImport = true;
      options.desktopRescan?.();
    });
    on("#missingFileFileBtn", () => {
      awaitingImport = true;
      options.pickFile();
    });
    on("#missingFileFolderBtn", () => {
      awaitingImport = true;
      options.pickFolder();
    });
  });
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
