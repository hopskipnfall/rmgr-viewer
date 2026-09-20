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
 * The one exception is manual camera mode (lockView()/unlockView(), see
 * matchView.ts's Camera panel): freezes the view wherever update() last
 * left it - update() becomes a no-op - so the user can pan/zoom by hand
 * (panByScreenDelta(), zoomAtScreenPoint(), panByViewFraction(),
 * setZoomLevel()) without normal player-tracking fighting them for it.
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

  private locked = false;
  /** The view's world-unit X span at the moment lockView() was called - getZoomLevel()'s "1.0" reference point. */
  private lockedSpanX0 = 1;

  /** Never frame tighter than this world-unit span, so characters near each other or a single player doesn't zoom in absurdly close. */
  private static readonly MIN_SPAN = 1400;
  private static readonly PADDING_FRACTION = 0.3;
  /** Fraction lerped toward the target view per update() call during smooth (non-snap) tracking. */
  private static readonly LERP_FACTOR = 0.12;
  /** setZoomLevel()/the Camera panel's slider clamp to this range so a stray drag can't zoom to nothing or to a single pixel. */
  static readonly MIN_ZOOM_LEVEL = 0.2;
  static readonly MAX_ZOOM_LEVEL = 8;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.rescale();
  }

  /** Freezes the view wherever update() last left it. See this class's own doc comment. */
  lockView(): void {
    this.locked = true;
    this.lockedSpanX0 = Math.max(this.viewMaxX - this.viewMinX, 1);
  }

  /** Resumes normal player-tracking framing on the next update() call. */
  unlockView(): void {
    this.locked = false;
  }

  isLocked(): boolean {
    return this.locked;
  }

  /** Current zoom relative to the view at lockView() time: 1.0 at lock, >1 zoomed in since, <1 zoomed out since. Meaningless unless locked. */
  getZoomLevel(): number {
    return this.lockedSpanX0 / Math.max(this.viewMaxX - this.viewMinX, 1);
  }

  /** Sets zoom to an absolute level (see getZoomLevel()), centered on the current view center. Clamped to [MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL]. No-op unless locked - see the Camera panel's slider. */
  setZoomLevel(level: number): void {
    if (!this.locked) return;
    const clamped = Math.min(
      Camera.MAX_ZOOM_LEVEL,
      Math.max(Camera.MIN_ZOOM_LEVEL, level),
    );
    const factor = clamped / this.getZoomLevel();
    this.zoomAroundWorldPoint(
      factor,
      (this.viewMinX + this.viewMaxX) / 2,
      (this.viewMinY + this.viewMaxY) / 2,
    );
  }

  /** Zooms by `factor` (>1 in, <1 out) anchored at a screen point, so that point's world location stays fixed on screen - e.g. wheel-zoom under the cursor. No-op unless locked. */
  zoomAtScreenPoint(factor: number, screenX: number, screenY: number): void {
    if (!this.locked) return;
    const anchor = this.screenToWorld(screenX, screenY);
    this.zoomAroundWorldPoint(factor, anchor.x, anchor.y);
  }

  private zoomAroundWorldPoint(
    factor: number,
    anchorX: number,
    anchorY: number,
  ): void {
    const spanX = this.viewMaxX - this.viewMinX;
    const spanY = this.viewMaxY - this.viewMinY;
    // Clamp the resulting zoom level (not the raw factor) so repeated small
    // zoom-in steps can't be chained past MAX_ZOOM_LEVEL, and likewise out.
    const currentLevel = this.getZoomLevel();
    const targetLevel = Math.min(
      Camera.MAX_ZOOM_LEVEL,
      Math.max(Camera.MIN_ZOOM_LEVEL, currentLevel * factor),
    );
    const clampedFactor = targetLevel / currentLevel;
    if (clampedFactor === 1) return;
    const newSpanX = spanX / clampedFactor;
    const newSpanY = spanY / clampedFactor;
    // Keep the anchor at the same fractional position within the view
    // before and after, so it stays under the cursor/center.
    const fracX = spanX > 0 ? (anchorX - this.viewMinX) / spanX : 0.5;
    const fracY = spanY > 0 ? (anchorY - this.viewMinY) / spanY : 0.5;
    this.viewMinX = anchorX - fracX * newSpanX;
    this.viewMaxX = this.viewMinX + newSpanX;
    this.viewMinY = anchorY - fracY * newSpanY;
    this.viewMaxY = this.viewMinY + newSpanY;
    this.rescale();
  }

  /** Pans by a screen-pixel delta (e.g. mouse drag movement) - the world point under the cursor moves with it, like dragging a map. No-op unless locked. */
  panByScreenDelta(dxPx: number, dyPx: number): void {
    if (!this.locked) return;
    // worldToScreen's Y is flipped (screen Y down, world Y up) relative to
    // X, so a downward drag (+dyPx) needs +worldDY, not -worldDY like X.
    this.shiftView(-dxPx / this.scale, dyPx / this.scale);
  }

  /** Pans by a fraction of the current view span (e.g. a D-pad button's fixed nudge, independent of zoom level). No-op unless locked. */
  panByViewFraction(dxFraction: number, dyFraction: number): void {
    if (!this.locked) return;
    this.shiftView(
      dxFraction * (this.viewMaxX - this.viewMinX),
      dyFraction * (this.viewMaxY - this.viewMinY),
    );
  }

  private shiftView(worldDX: number, worldDY: number): void {
    this.viewMinX += worldDX;
    this.viewMaxX += worldDX;
    this.viewMinY += worldDY;
    this.viewMaxY += worldDY;
    this.rescale();
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
    return {
      x: this.offsetX + (x - this.viewMinX) * this.scale,
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
    return {
      x: this.viewMinX + (screenX - this.offsetX) / this.scale,
      y:
        this.viewMinY +
        (this.canvasHeight - screenY - this.offsetY) / this.scale,
    };
  }
}
