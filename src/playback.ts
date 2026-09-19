/** Real N64 NTSC frame rate — matches how the recorder itself counts frames. */
const FPS = 60;

/**
 * Whether a frame-index change was a discontinuous jump (scrub, step,
 * restart-from-end) or a natural one-frame advance during continuous
 * playback. Consumers (the camera, specifically) use this to decide
 * whether to reframe instantly or smoothly - see camera.ts's doc comment.
 */
/**
 * Whether a frame-index change was a discontinuous jump (scrub, step,
 * restart-from-end), a natural one-frame advance during continuous
 * playback ("tick"), or a smooth fast-forward/rewind animation ("fast-forward").
 * Consumers (the camera, specifically) use this to decide
 * whether to reframe instantly or smoothly - see camera.ts's doc comment.
 */
export type FrameChangeReason = "jump" | "tick" | "fast-forward";

interface FastForwardAnimation {
  startFrame: number;
  targetFrame: number;
  startTime: number;
  durationMs: number;
  wasPlaying: boolean;
}

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

  private speed = 1;
  private fastForwardAnim: FastForwardAnimation | null = null;

  constructor(
    private frameCount: number,
    private readonly onChange: (
      index: number,
      playing: boolean,
      reason: FrameChangeReason,
    ) => void,
  ) {}

  setFrameCount(frameCount: number): void {
    this.cancelAnimatedJump();
    this.frameCount = frameCount;
    this.seek(0);
  }

  get playbackSpeed(): number {
    return this.speed;
  }

  setPlaybackSpeed(speed: number): void {
    this.speed = Math.max(0.01, speed);
  }

  get currentIndex(): number {
    return this.index;
  }

  get isPlaying(): boolean {
    return this.playing || (this.fastForwardAnim?.wasPlaying ?? false);
  }

  get isAnimatingJump(): boolean {
    return this.fastForwardAnim !== null;
  }

  cancelAnimatedJump(): void {
    if (!this.fastForwardAnim) return;
    this.fastForwardAnim = null;
    cancelAnimationFrame(this.rafHandle);
  }

  seek(index: number): void {
    this.cancelAnimatedJump();
    this.index = Math.max(0, Math.min(this.frameCount - 1, index));
    if (this.playing) {
      this.lastTimestampMs = performance.now();
      this.accumulatedMs = 0;
    }
    this.onChange(this.index, this.playing, "jump");
  }

  seekAndPlay(index: number): void {
    this.cancelAnimatedJump();
    if (this.frameCount === 0) return;
    this.index = Math.max(0, Math.min(this.frameCount - 1, index));
    if (this.index >= this.frameCount - 1) {
      this.index = 0;
    }
    this.playing = true;
    this.lastTimestampMs = performance.now();
    this.accumulatedMs = 0;
    cancelAnimationFrame(this.rafHandle);
    this.rafHandle = requestAnimationFrame(this.tick);
    this.onChange(this.index, this.playing, "jump");
  }

  stepForward(): void {
    this.cancelAnimatedJump();
    this.pause();
    this.seek(this.index + 1);
  }

  stepBackward(): void {
    this.cancelAnimatedJump();
    this.pause();
    this.seek(this.index - 1);
  }

  jumpForward(frames = 60): void {
    this.seek(this.index + frames);
  }

  jumpBackward(frames = 60): void {
    this.seek(this.index - frames);
  }

  jumpForwardAnimated(frames = 60, durationMs = 200): void {
    this.animatedJump(frames, durationMs);
  }

  jumpBackwardAnimated(frames = 60, durationMs = 200): void {
    this.animatedJump(-frames, durationMs);
  }

  animatedJump(deltaFrames: number, durationMs = 200): void {
    if (this.frameCount === 0) return;

    if (this.fastForwardAnim !== null) {
      // If the player presses an arrow key while fast-forwarding or fast-rewinding,
      // further subtract/add deltaFrames (e.g. 1 second) to the target time.
      const activeAnim = this.fastForwardAnim;
      const wasPlaying = activeAnim.wasPlaying;
      const newTarget = Math.max(
        0,
        Math.min(this.frameCount - 1, activeAnim.targetFrame + deltaFrames),
      );

      if (newTarget === this.index) {
        this.cancelAnimatedJump();
        this.index = newTarget;
        if (wasPlaying) {
          this.playing = true;
          this.lastTimestampMs = performance.now();
          this.accumulatedMs = 0;
          this.rafHandle = requestAnimationFrame(this.tick);
        }
        this.onChange(this.index, this.playing, "jump");
        return;
      }

      const startFrame = this.index;
      const targetFrame = newTarget;
      const distance = Math.abs(targetFrame - startFrame);
      const scaledDuration = Math.min(
        durationMs,
        Math.max(50, (distance / Math.abs(deltaFrames || 60)) * durationMs),
      );

      this.fastForwardAnim = {
        startFrame,
        targetFrame,
        startTime: performance.now(),
        durationMs: scaledDuration,
        wasPlaying,
      };
      return;
    }

    const startFrame = this.index;
    const targetFrame = Math.max(
      0,
      Math.min(this.frameCount - 1, startFrame + deltaFrames),
    );
    if (startFrame === targetFrame) return;

    const distance = Math.abs(targetFrame - startFrame);
    const scaledDuration = Math.min(
      durationMs,
      Math.max(50, (distance / Math.abs(deltaFrames || 60)) * durationMs),
    );

    const wasPlaying = this.playing;
    if (this.playing) {
      this.playing = false;
      cancelAnimationFrame(this.rafHandle);
    }

    this.fastForwardAnim = {
      startFrame,
      targetFrame,
      startTime: performance.now(),
      durationMs: scaledDuration,
      wasPlaying,
    };

    this.rafHandle = requestAnimationFrame(this.animTick);
  }

  private readonly animTick = (nowMs: number): void => {
    if (!this.fastForwardAnim) return;
    const { startFrame, targetFrame, startTime, durationMs, wasPlaying } =
      this.fastForwardAnim;
    const elapsed = nowMs - startTime;
    const progress = Math.min(1, Math.max(0, elapsed / durationMs));
    // Ease-out quadratic: rapid initial response, smooth deceleration onto landing
    const eased = 1 - Math.pow(1 - progress, 2);
    const currentFrame = Math.round(
      startFrame + (targetFrame - startFrame) * eased,
    );

    if (progress >= 1) {
      this.fastForwardAnim = null;
      this.index = targetFrame;
      if (wasPlaying) {
        this.playing = true;
        this.lastTimestampMs = performance.now();
        this.accumulatedMs = 0;
        this.rafHandle = requestAnimationFrame(this.tick);
      }
      this.onChange(this.index, this.playing, "jump");
      return;
    }

    if (currentFrame !== this.index) {
      this.index = currentFrame;
      this.onChange(this.index, wasPlaying, "fast-forward");
    }
    this.rafHandle = requestAnimationFrame(this.animTick);
  };

  play(): void {
    this.cancelAnimatedJump();
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
    const wasAnimating = this.fastForwardAnim !== null;
    this.cancelAnimatedJump();
    if (!this.playing && !wasAnimating) return;
    this.playing = false;
    cancelAnimationFrame(this.rafHandle);
    this.onChange(this.index, this.playing, "jump");
  }

  toggle(): void {
    if (this.isAnimatingJump) {
      this.pause();
      return;
    }
    if (this.playing) this.pause();
    else this.play();
  }

  private readonly tick = (nowMs: number): void => {
    if (!this.playing) return;
    const deltaMs = nowMs - this.lastTimestampMs;
    this.lastTimestampMs = nowMs;
    this.accumulatedMs += deltaMs * this.speed;

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
