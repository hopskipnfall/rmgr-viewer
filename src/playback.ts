/** Real N64 NTSC frame rate — matches how the recorder itself counts frames. */
const FPS = 60;

/**
 * Whether a frame-index change was a discontinuous jump (scrub, step,
 * restart-from-end) or a natural one-frame advance during continuous
 * playback. Consumers (the camera, specifically) use this to decide
 * whether to reframe instantly or smoothly - see camera.ts's doc comment.
 */
export type FrameChangeReason = "jump" | "tick";

/**
 * Owns "which frame index are we looking at" over time. Playback advances
 * using requestAnimationFrame + accumulated wall-clock delta rather than a
 * fixed setInterval(16.67ms), so playback speed stays correct even if the
 * browser's rAF cadence drifts from exactly 60Hz.
 */
export class PlaybackController {
  private index = 0;
  private playing = false;
  private rafHandle = 0;
  private lastTimestampMs = 0;
  private accumulatedMs = 0;

  constructor(
    private frameCount: number,
    private readonly onChange: (
      index: number,
      playing: boolean,
      reason: FrameChangeReason,
    ) => void,
  ) {}

  setFrameCount(frameCount: number): void {
    this.frameCount = frameCount;
    this.seek(0);
  }

  get currentIndex(): number {
    return this.index;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  seek(index: number): void {
    this.index = Math.max(0, Math.min(this.frameCount - 1, index));
    this.onChange(this.index, this.playing, "jump");
  }

  stepForward(): void {
    this.pause();
    this.seek(this.index + 1);
  }

  stepBackward(): void {
    this.pause();
    this.seek(this.index - 1);
  }

  play(): void {
    if (this.playing || this.frameCount === 0) return;
    if (this.index >= this.frameCount - 1) {
      this.index = 0; // replay from the start if already at the end
    }
    this.playing = true;
    this.lastTimestampMs = performance.now();
    this.accumulatedMs = 0;
    this.rafHandle = requestAnimationFrame(this.tick);
    this.onChange(this.index, this.playing, "jump");
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this.rafHandle);
    this.onChange(this.index, this.playing, "jump");
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  private readonly tick = (nowMs: number): void => {
    if (!this.playing) return;
    const deltaMs = nowMs - this.lastTimestampMs;
    this.lastTimestampMs = nowMs;
    this.accumulatedMs += deltaMs;

    const msPerFrame = 1000 / FPS;
    let advanced = false;
    while (this.accumulatedMs >= msPerFrame) {
      this.accumulatedMs -= msPerFrame;
      if (this.index >= this.frameCount - 1) {
        this.pause();
        return;
      }
      this.index += 1;
      advanced = true;
    }
    if (advanced) {
      this.onChange(this.index, this.playing, "tick");
    }
    this.rafHandle = requestAnimationFrame(this.tick);
  };
}
