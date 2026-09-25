import type { EdgeGuardCanvas } from "./edgeGuardCanvas.js";

const SIM_FPS = 60;
const CAPTURE_FPS = 30;

const CANDIDATE_MIME_TYPES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

function pickMimeType(): string {
  for (const type of CANDIDATE_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "video/webm";
}

export interface VideoExportOptions {
  /** Highest playback frame index to include (inclusive). */
  readonly maxFrames: number;
  readonly onProgress?: (elapsedSeconds: number, totalSeconds: number) => void;
}

export interface VideoExportResult {
  readonly blob: Blob;
  readonly mimeType: string;
}

/**
 * Records the canvas's current on-screen field of view (camera position,
 * zoom, theme, trails - whatever's already set) across the full
 * simultaneous-playback range, in real time, via MediaRecorder +
 * canvas.captureStream(). This replaced an earlier GIF export that manually
 * stepped through downsampled frames and re-quantized colors per frame:
 * for long situations that downsampling dropped well below 30fps (e.g. a
 * ~600-frame/10s situation downsampled to a 150-frame budget lands at
 * ~15fps), which read as visibly choppy. Capturing live at native frame
 * rate sidesteps that entirely - full 24-bit color, no banding, and the
 * playback speed on screen IS the export speed, so there's nothing to get
 * wrong. The tradeoff is that export takes as long as the clip itself
 * (typically ≤10s for a single edge-guard situation), which is an
 * acceptable wait for an on-demand export action.
 */
export async function exportSituationsVideo(
  canvas: EdgeGuardCanvas,
  options: VideoExportOptions,
): Promise<VideoExportResult> {
  const { maxFrames, onProgress } = options;
  const el = canvas.getElement();

  if (typeof MediaRecorder === "undefined" || !el.captureStream) {
    throw new Error(
      "This browser doesn't support recording canvas video (MediaRecorder/captureStream).",
    );
  }

  const mimeType = pickMimeType();
  const stream = el.captureStream(CAPTURE_FPS);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const totalSeconds = maxFrames / SIM_FPS;

  const recordingDone = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = (e) => reject(e);
  });

  recorder.start();
  canvas.setPlaybackFrame(0);

  await new Promise<void>((resolve) => {
    const startTime = performance.now();
    const step = () => {
      const elapsedSeconds = (performance.now() - startTime) / 1000;
      const simFrame = Math.min(
        maxFrames,
        Math.floor(elapsedSeconds * SIM_FPS),
      );
      canvas.setPlaybackFrame(simFrame);
      onProgress?.(Math.min(elapsedSeconds, totalSeconds), totalSeconds);

      if (elapsedSeconds >= totalSeconds) {
        resolve();
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  recorder.stop();
  await recordingDone;
  stream.getTracks().forEach((track) => track.stop());

  return { blob: new Blob(chunks, { type: mimeType }), mimeType };
}
