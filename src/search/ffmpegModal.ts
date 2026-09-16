import { t } from "../i18n.js";
import {
  buildFfmpegClipsCommand,
  buildYtDlpDownloadCommand,
  type VideoRange,
} from "./ffmpegClips.js";

export interface FfmpegModalOptions {
  /** Each clip's time range in the session video (clipVideoRanges). */
  readonly ranges: readonly VideoRange[];
  /** Clips left out because their game isn't linked to this video. */
  readonly skipped: number;
  /** The session's YouTube video id. */
  readonly videoId: string;
}

const DEFAULT_INPUT = "INPUT.mp4";

function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore localStorage write errors
  }
}

/**
 * "Create video with ffmpeg": explains what the command does, takes the local
 * video's file name -- or downloads the video with yt-dlp instead -- and shows
 * the resulting command read-only. Clicking the command copies it.
 *
 * The file name is remembered per session video, and the yt-dlp choice
 * globally; both use the "rmgr-viewer-" localStorage prefix so Clear local
 * data removes them.
 */
export function openFfmpegModal(
  modalContainer: HTMLElement,
  options: FfmpegModalOptions,
): void {
  const tr = t();
  const fileKey = `rmgr-viewer-ffmpeg-input-${options.videoId}`;
  const ytDlpKey = "rmgr-viewer-ffmpeg-use-ytdlp";
  const downloadName = `session-${options.videoId}.mkv`;
  const videoUrl = `https://www.youtube.com/watch?v=${options.videoId}`;

  modalContainer.hidden = false;
  modalContainer.innerHTML = `
    <div class="modal-backdrop" id="ffmpegModalBackdrop"></div>
    <div class="modal-dialog ffmpeg-modal">
      <div class="modal-header">
        <h3>${escapeHtml(tr.ffmpegModalTitle)}</h3>
        <button class="modal-close" id="ffmpegModalCloseBtn">✕</button>
      </div>
      <p class="modal-subtitle">${escapeHtml(tr.ffmpegModalExplain(options.ranges.length))}</p>
      ${
        options.skipped > 0
          ? `<p class="modal-subtitle search-unloaded-note">${escapeHtml(tr.searchFfmpegSkipped(options.skipped))}</p>`
          : ""
      }
      <div class="modal-body ffmpeg-modal-body">
        <label class="ffmpeg-modal-field">
          <span>${escapeHtml(tr.searchFfmpegFileLabel)}</span>
          <input type="text" id="ffmpegFileInput" class="ffmpeg-input-name" placeholder="${DEFAULT_INPUT}" />
        </label>
        <label class="ffmpeg-modal-check">
          <input type="checkbox" id="ffmpegYtDlpCheckbox" />
          <span>${escapeHtml(tr.ffmpegModalUseYtDlp)}</span>
        </label>
        <p class="ffmpeg-modal-hint" id="ffmpegYtDlpHint" hidden>${escapeHtml(tr.ffmpegModalYtDlpNote)}</p>
        <div class="ffmpeg-modal-command-label">
          <span>${escapeHtml(tr.ffmpegModalCommandLabel)}</span>
          <span class="ffmpeg-copied" id="ffmpegCopied" hidden></span>
        </div>
        <textarea id="ffmpegCommand" class="ffmpeg-command" readonly rows="7" spellcheck="false"></textarea>
      </div>
      <div class="modal-footer">
        <button id="ffmpegModalDoneBtn" class="btn-secondary">${escapeHtml(tr.close)}</button>
      </div>
    </div>
  `;

  const fileInput = modalContainer.querySelector(
    "#ffmpegFileInput",
  ) as HTMLInputElement;
  const ytDlpCheckbox = modalContainer.querySelector(
    "#ffmpegYtDlpCheckbox",
  ) as HTMLInputElement;
  const ytDlpHint = modalContainer.querySelector(
    "#ffmpegYtDlpHint",
  ) as HTMLElement;
  const commandBox = modalContainer.querySelector(
    "#ffmpegCommand",
  ) as HTMLTextAreaElement;
  const copiedEl = modalContainer.querySelector("#ffmpegCopied") as HTMLElement;

  fileInput.value = readSetting(fileKey) ?? "";
  ytDlpCheckbox.checked = readSetting(ytDlpKey) === "1";

  const updateCommand = (): void => {
    const useYtDlp = ytDlpCheckbox.checked;
    fileInput.disabled = useYtDlp;
    ytDlpHint.hidden = !useYtDlp;
    const input = useYtDlp
      ? downloadName
      : fileInput.value.trim() || DEFAULT_INPUT;
    const ffmpeg = buildFfmpegClipsCommand(options.ranges, input);
    commandBox.value = useYtDlp
      ? `${buildYtDlpDownloadCommand(videoUrl, downloadName)} && ${ffmpeg}`
      : ffmpeg;
    copiedEl.hidden = true;
  };
  fileInput.addEventListener("input", () => {
    writeSetting(fileKey, fileInput.value.trim());
    updateCommand();
  });
  ytDlpCheckbox.addEventListener("change", () => {
    writeSetting(ytDlpKey, ytDlpCheckbox.checked ? "1" : "0");
    updateCommand();
  });
  updateCommand();

  let copiedTimer = 0;
  const showCopied = (text: string): void => {
    copiedEl.textContent = text;
    copiedEl.hidden = false;
    window.clearTimeout(copiedTimer);
    copiedTimer = window.setTimeout(() => {
      copiedEl.hidden = true;
    }, 2500);
  };
  commandBox.addEventListener("click", () => {
    // Clipboard blocked (e.g. insecure context): select it for a manual copy instead.
    const selectForManualCopy = (): void => {
      commandBox.select();
      showCopied(tr.ffmpegModalCopyManual);
    };
    if (!navigator.clipboard) {
      selectForManualCopy();
      return;
    }
    navigator.clipboard
      .writeText(commandBox.value)
      .then(() => showCopied(tr.searchCopied), selectForManualCopy);
  });

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") close();
  };
  function close(): void {
    document.removeEventListener("keydown", onKeyDown);
    window.clearTimeout(copiedTimer);
    modalContainer.hidden = true;
    modalContainer.innerHTML = "";
  }
  document.addEventListener("keydown", onKeyDown);
  for (const id of [
    "#ffmpegModalBackdrop",
    "#ffmpegModalCloseBtn",
    "#ffmpegModalDoneBtn",
  ]) {
    modalContainer.querySelector(id)?.addEventListener("click", close);
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
