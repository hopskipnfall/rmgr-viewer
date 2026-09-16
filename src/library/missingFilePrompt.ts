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
  /** The game to open. Resolves once an import sets its `fileRef`. */
  summary: GameSummary;
  /** Opens the single-file picker; the import it triggers is reported via onImportFinished. */
  pickFile(): void;
  pickFolder(): void;
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

  return new Promise((resolve) => {
    modalContainer.hidden = false;
    modalContainer.innerHTML = `
      <div class="modal-backdrop" id="missingFileBackdrop"></div>
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>${escapeHtml(tr.missingFileTitle)}</h3>
          <button class="modal-close" id="missingFileCloseBtn">✕</button>
        </div>
        <p class="modal-subtitle">${escapeHtml(tr.missingFileBody(summary.sourceName))}</p>
        <p class="modal-subtitle search-unloaded-note" id="missingFileMessage"></p>
        <div class="modal-footer">
          <button id="missingFileCancelBtn" class="btn-secondary">${escapeHtml(tr.cancel)}</button>
          <button id="missingFileFolderBtn" class="btn-secondary">${escapeHtml(tr.reimportFolder)}</button>
          <button id="missingFileFileBtn" class="btn-primary">${escapeHtml(tr.importThisFile)}</button>
        </div>
      </div>
    `;
    const messageEl = modalContainer.querySelector(
      "#missingFileMessage",
    ) as HTMLElement;

    // Only complain about a non-matching import if this prompt asked for it.
    let awaitingImport = false;
    const unsubscribe = options.onImportFinished(() => {
      if (summary.fileRef) {
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
