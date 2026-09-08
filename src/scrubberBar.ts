import type { FrameClassification, StockLossMarker } from "./matchTimeline.js";
import { renderMatchTimeline } from "./matchTimelineRenderer.js";

export interface ScrubberBarCallbacks {
  /** Fires when the user commits to a new position: click, drag release, or a keyboard step. */
  onSeek: (index: number) => void;
  /**
   * Fires on desktop hover or on any-pointer-type drag with the frame index
   * under the pointer and its viewport `clientX` (for tooltip placement).
   * Fires with `index: null` when the preview should be hidden (pointer
   * left the bar without dragging, or a touch drag ended).
   */
  onPreview: (index: number | null, clientX: number) => void;
}

/**
 * A custom playback-position bar: replaces `<input type="range">` so the
 * color-coded match timeline (see matchTimeline.ts) can be drawn as part of
 * the same element the user drags, instead of a separately-positioned
 * overlay that can drift out of alignment with the native control's track.
 *
 * Dragging (mouse or touch) only reports a preview via `onPreview` on every
 * move — it does NOT call `onSeek` until release, so a slow operation
 * gated on the real seek (e.g. re-syncing a YouTube video) only happens
 * once per drag, not on every intermediate frame.
 */
export class ScrubberBar {
  private maxIndex = 0;
  private value = 0;
  private classifications: readonly FrameClassification[] = [];
  private stockLossMarkers: readonly StockLossMarker[] = [];
  private dragging = false;

  constructor(
    private readonly bar: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly thumb: HTMLElement,
    private readonly callbacks: ScrubberBarCallbacks,
  ) {
    this.wireEvents();
  }

  setRange(maxIndex: number): void {
    this.maxIndex = Math.max(0, maxIndex);
    this.bar.setAttribute("aria-valuemax", String(this.maxIndex));
  }

  setValue(index: number): void {
    this.value = Math.max(0, Math.min(this.maxIndex, index));
    this.bar.setAttribute("aria-valuenow", String(this.value));
    const fraction = this.maxIndex > 0 ? this.value / this.maxIndex : 0;
    this.thumb.style.left = `${fraction * 100}%`;
  }

  setClassifications(
    classifications: readonly FrameClassification[],
    stockLossMarkers: readonly StockLossMarker[] = [],
  ): void {
    this.classifications = classifications;
    this.stockLossMarkers = stockLossMarkers;
    this.redrawTimeline();
  }

  /** Resizes the backing canvas to match the bar's current layout width. Call after layout changes (load, window resize). */
  resize(): void {
    const rect = this.bar.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.redrawTimeline();
    }
  }

  private redrawTimeline(): void {
    renderMatchTimeline(
      this.canvas,
      this.classifications,
      this.stockLossMarkers,
    );
  }

  private indexFromClientX(clientX: number): number {
    const rect = this.bar.getBoundingClientRect();
    const fraction = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    const clamped = Math.max(0, Math.min(1, fraction));
    return Math.round(clamped * this.maxIndex);
  }

  private wireEvents(): void {
    this.bar.addEventListener("pointerdown", (e) => {
      this.dragging = true;
      this.bar.setPointerCapture(e.pointerId);
      const index = this.indexFromClientX(e.clientX);
      this.setValue(index);
      this.callbacks.onPreview(index, e.clientX);
    });

    this.bar.addEventListener("pointermove", (e) => {
      if (this.dragging) {
        const index = this.indexFromClientX(e.clientX);
        this.setValue(index);
        this.callbacks.onPreview(index, e.clientX);
      } else if (e.pointerType === "mouse") {
        this.callbacks.onPreview(this.indexFromClientX(e.clientX), e.clientX);
      }
    });

    this.bar.addEventListener("pointerup", (e) => {
      if (this.dragging) {
        this.dragging = false;
        const index = this.indexFromClientX(e.clientX);
        this.setValue(index);
        this.callbacks.onSeek(index);
      }
      if (e.pointerType !== "mouse") {
        this.callbacks.onPreview(null, e.clientX);
      }
    });

    this.bar.addEventListener("pointercancel", (e) => {
      this.dragging = false;
      this.callbacks.onPreview(null, e.clientX);
    });

    this.bar.addEventListener("pointerleave", (e) => {
      if (!this.dragging) {
        this.callbacks.onPreview(null, e.clientX);
      }
    });

    this.bar.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const index = Math.max(0, this.value - 1);
        this.setValue(index);
        this.callbacks.onSeek(index);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const index = Math.min(this.maxIndex, this.value + 1);
        this.setValue(index);
        this.callbacks.onSeek(index);
      }
    });
  }
}
