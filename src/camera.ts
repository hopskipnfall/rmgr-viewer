/**
 * Maps world-space stage coordinates (docs/RMGR_SPEC.md §4.4: Y increases
 * upward) to canvas pixel space (Y increases downward).
 *
 * This package has no stage geometry, so there's no fixed "the stage is
 * this big" to frame against. A single static fit computed once from the
 * whole match's min/max positions turned out to look bad in practice: a
 * match with several big launches spread across it (not just one KO at the
 * very end) can have a genuinely huge total position range - the sample
 * match's players together span roughly -9000 to +9000 on X - which makes
 * normal, in-stage gameplay render as a tiny cluster in a mostly-empty
 * canvas. Real broadcast/spectator cameras for these games don't try to
 * keep every KO trajectory in frame either; they track the current action
 * and let hits fly off-screen.
 *
 * So instead: `update()` is called every render with the CURRENT frame's
 * active player positions and reframes toward them, smoothly (lerped)
 * during continuous playback so the camera doesn't visibly jump every
 * frame, or instantly (snapped) right after a scrub/step/seek, since
 * there's no preceding motion to smooth from and a slow catch-up pan would
 * just look broken while paused.
 *
 * The one exception is edge-guard review mode (lockView()/unlockView()):
 * a deliberately fixed, non-tracking view for comparing edge guards
 * consistently, with optional left/right mirroring (setMirrorX()) so
 * action on either side of the stage renders the same way. See
 * matchView.ts's edgeGuardReviewModeBtn.
 */
export class Camera {
  private canvasWidth: number;
  private canvasHeight: number;

  private hasView = false;
  private viewMinX = 0;
  private viewMaxX = 0;
  private viewMinY = 0;
  private viewMaxY = 0;

  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  /**
   * Edge-guard review mode (see matchView.ts's edgeGuardReviewModeBtn):
   * `locked` freezes the view - update() becomes a no-op so the normal
   * player-tracking framing can't override it - and `mirrorX` reflects
   * world-space X across 0 for every projected point, so action on the
   * stage's left half renders as if it were on the right. Both are always
   * false outside review mode.
   */
  private locked = false;
  private mirrorX = false;
  /** The lockView() inputs, re-applied on resize() while locked so the fixed view keeps exactly filling the canvas across aspect-ratio changes. */
  private lockedMinX = 0;
  private lockedMaxX = 0;
  private lockedCenterY = 0;

  /** Never frame tighter than this world-unit span, so characters near each other or a single player doesn't zoom in absurdly close. */
  private static readonly MIN_SPAN = 1400;
  private static readonly PADDING_FRACTION = 0.3;
  /** Fraction lerped toward the target view per update() call during smooth (non-snap) tracking. */
  private static readonly LERP_FACTOR = 0.12;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    if (this.locked) {
      // Re-derive the vertical span from the new aspect ratio so the fixed
      // view keeps exactly filling the canvas instead of letterboxing.
      this.lockView(this.lockedMinX, this.lockedMaxX, this.lockedCenterY);
      return;
    }
    this.rescale();
  }

  /**
   * Locks the view to a fixed horizontal world-space span, vertically
   * centered on `centerY`, with the vertical span derived from the current
   * canvas aspect ratio so the frame is exactly filled (no letterboxing)
   * rather than picking an arbitrary height. Stays fixed - update() is a
   * no-op - until unlockView() is called. See matchView.ts's
   * edgeGuardReviewModeBtn for the one caller.
   */
  lockView(minX: number, maxX: number, centerY: number): void {
    this.lockedMinX = minX;
    this.lockedMaxX = maxX;
    this.lockedCenterY = centerY;
    const worldW = Math.max(maxX - minX, 1);
    const worldH = worldW * (this.canvasHeight / this.canvasWidth);
    this.setView(minX, maxX, centerY - worldH / 2, centerY + worldH / 2);
    this.locked = true;
  }

  /** Leaves the fixed view locked by lockView() and clears any mirroring - update() resumes normal player-tracking framing on the next call. */
  unlockView(): void {
    this.locked = false;
    this.mirrorX = false;
  }

  isLocked(): boolean {
    return this.locked;
  }

  /** Only meaningful while locked - see lockView()'s doc comment. */
  setMirrorX(mirror: boolean): void {
    this.mirrorX = mirror;
  }

  isMirrored(): boolean {
    return this.mirrorX;
  }

  /**
   * Reframes toward `positions`. Call once per render with the active
   * players' current world-space positions. `snap`: true right after a
   * scrub/step/seek (reframe instantly), false during continuous playback
   * (reframe smoothly). If `positions` is empty (no one on screen this
   * frame - e.g. between matches in a multi-game file, not currently
   * reachable but defensive anyway), the last view is kept as-is.
   */
  update(
    positions: ReadonlyArray<{ x: number; y: number }>,
    snap: boolean,
  ): void {
    if (this.locked) return;
    if (positions.length === 0) {
      if (!this.hasView) {
        // Nothing to frame yet and no prior view - fall back to a plausible default so worldToScreen() still returns sane values.
        this.setView(-450, 450, -100, 500);
      }
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of positions) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const spanX = Math.max(maxX - minX, Camera.MIN_SPAN);
    const spanY = Math.max(maxY - minY, Camera.MIN_SPAN);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const padX = spanX * Camera.PADDING_FRACTION;
    const padY = spanY * Camera.PADDING_FRACTION;

    const targetMinX = centerX - spanX / 2 - padX;
    const targetMaxX = centerX + spanX / 2 + padX;
    const targetMinY = centerY - spanY / 2 - padY;
    const targetMaxY = centerY + spanY / 2 + padY;

    if (!this.hasView || snap) {
      this.setView(targetMinX, targetMaxX, targetMinY, targetMaxY);
      return;
    }

    const t = Camera.LERP_FACTOR;
    this.setView(
      this.viewMinX + (targetMinX - this.viewMinX) * t,
      this.viewMaxX + (targetMaxX - this.viewMaxX) * t,
      this.viewMinY + (targetMinY - this.viewMinY) * t,
      this.viewMaxY + (targetMaxY - this.viewMaxY) * t,
    );
  }

  private setView(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
  ): void {
    this.viewMinX = minX;
    this.viewMaxX = maxX;
    this.viewMinY = minY;
    this.viewMaxY = maxY;
    this.hasView = true;
    this.rescale();
  }

  private rescale(): void {
    const worldW = Math.max(this.viewMaxX - this.viewMinX, 1);
    const worldH = Math.max(this.viewMaxY - this.viewMinY, 1);
    this.scale = Math.min(
      this.canvasWidth / worldW,
      this.canvasHeight / worldH,
    );
    this.offsetX = (this.canvasWidth - worldW * this.scale) / 2;
    this.offsetY = (this.canvasHeight - worldH * this.scale) / 2;
  }

  worldToScreen(x: number, y: number): { x: number; y: number } {
    const px = this.mirrorX ? -x : x;
    return {
      x: this.offsetX + (px - this.viewMinX) * this.scale,
      y: this.canvasHeight - (this.offsetY + (y - this.viewMinY) * this.scale),
    };
  }

  /** Y=0 in world space, in screen pixels - drawn as a reference floor line since we have no real stage geometry. */
  groundScreenY(): number {
    return this.worldToScreen(0, 0).y;
  }

  /** Converts a world-space length (not a point - no offset, just the scale factor) to screen pixels. */
  worldLengthToScreen(length: number): number {
    return length * this.scale;
  }

  /** Inverse of worldToScreen - screen pixel coordinates back to world space. */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const px = this.viewMinX + (screenX - this.offsetX) / this.scale;
    return {
      x: this.mirrorX ? -px : px,
      y:
        this.viewMinY +
        (this.canvasHeight - screenY - this.offsetY) / this.scale,
    };
  }
}
