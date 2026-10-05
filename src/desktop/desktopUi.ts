import { t } from "../i18n.js";
import type { ProjectNotice } from "./projectSync.js";

const HINT_KEY = "rmgr.desktopHintDismissed";

const el = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T | null;

export interface DesktopUiHandlers {
  onRescan(): void;
  onChangeFolder(): void;
}

/** Swaps the web import controls for the desktop Rescan button and library-folder row. */
export function initDesktopUi(handlers: DesktopUiHandlers): void {
  const tr = t();
  const importContainer = el("importContainer");
  if (importContainer) importContainer.hidden = true;

  const rescan = el<HTMLButtonElement>("rescanBtn");
  if (rescan) {
    rescan.hidden = false;
    rescan.textContent = tr.rescan;
    rescan.addEventListener("click", handlers.onRescan);
  }
  const row = el("libraryFolderRow");
  if (row) row.hidden = false;
  const label = el("libraryFolderLabel");
  if (label) label.textContent = tr.libraryFolderLabel;
  const change = el<HTMLButtonElement>("changeFolderBtn");
  if (change) {
    change.textContent = tr.changeFolder;
    change.addEventListener("click", handlers.onChangeFolder);
  }
  const folderBannerBtn = el<HTMLButtonElement>("libFolderBannerBtn");
  if (folderBannerBtn) {
    folderBannerBtn.textContent = tr.changeFolder;
    folderBannerBtn.addEventListener("click", handlers.onChangeFolder);
  }

  let dismissed = false;
  try {
    dismissed = localStorage.getItem(HINT_KEY) === "1";
  } catch {
    // Storage blocked: just show the hint each launch.
  }
  const hint = el("desktopHint");
  if (hint && !dismissed) {
    hint.hidden = false;
    const text = el("desktopHintText");
    if (text) text.textContent = tr.desktopHint;
    const btn = el<HTMLButtonElement>("desktopHintDismissBtn");
    if (btn) {
      btn.textContent = tr.dismiss;
      btn.addEventListener("click", () => {
        hint.hidden = true;
        try {
          localStorage.setItem(HINT_KEY, "1");
        } catch {
          // Ignore.
        }
      });
    }
  }
}

export function setLibraryFolderPath(path: string): void {
  const p = el("libraryFolderPath");
  if (p) p.textContent = path;
}

/** Shows the "Library folder not found" banner for a saved root that vanished. */
export function setFolderMissingBanner(visible: boolean): void {
  const banner = el("libFolderBanner");
  if (!banner) return;
  banner.hidden = !visible;
  const text = el("libFolderBannerText");
  if (text) text.textContent = t().libraryFolderNotFound;
}

/** Banner for project-file problems (newer schema, restored from backup, unreadable). */
export function setProjectNotice(notice: ProjectNotice | null): void {
  const banner = el("projectNotice");
  if (!banner) return;
  banner.hidden = notice === null;
  const text = el("projectNoticeText");
  if (!text || !notice) return;
  const tr = t();
  text.textContent =
    notice.kind === "newer"
      ? tr.projectNewer
      : notice.kind === "unreadable"
        ? tr.projectUnreadable
        : tr.projectRestored.replace("{n}", String(notice.backup));
}

/** Disables Rescan and Change… while a scan/import is running. */
export function setScanning(scanning: boolean): void {
  for (const id of ["rescanBtn", "changeFolderBtn", "libFolderBannerBtn"]) {
    const btn = el<HTMLButtonElement>(id);
    if (btn) btn.disabled = scanning;
  }
}
