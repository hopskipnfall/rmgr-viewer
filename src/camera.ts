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
 *
 * setTrackingMode("original") switches update() from the above to
 * updateOriginalCamera() instead - a from-scratch approximation of the
 * real SSB64 in-game camera (Game Expert research, 2026-09-22, sourced
 * from ssb-decomp-re's gmcamera.c): union of every fighter's own
 * asymmetric look-ahead box (biased in their facing direction), scaled by
 * a player-count zoom multiplier, with distance-dependent pan speed and a
 * separate slower zoom-ease rate. The real camera moves in true 3D
 * (FOV/eye-distance/parallax) with hard clamps in 3D distance units; this
 * approximates the same FEEL in the existing 2D span model rather than
 * porting exact 3D math that has no direct equivalent here - see
 * updateOriginalCamera()'s own comment for exactly what's approximated
 * vs. omitted (idle-player deweighting, per-move zoom overrides, and
 * stage/mode-specific camera paths aren't modeled).
 */
/** "default": the union-bounding-box + flat-lerp tracking this class has always used. "original": updateOriginalCamera() instead - see this class's own doc comment. */
export type CameraTrackingMode = "default" | "original";

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
  private trackingMode: CameraTrackingMode = "default";

  /** Never frame tighter than this world-unit span, so characters near each other or a single player doesn't zoom in absurdly close. */
  private static readonly MIN_SPAN = 1400;
  private static readonly PADDING_FRACTION = 0.3;
  /** Fraction lerped toward the target view per update() call during smooth (non-snap) tracking. */
  private static readonly LERP_FACTOR = 0.12;
  /** setZoomLevel()/the Camera panel's slider clamp to this range so a stray drag can't zoom to nothing or to a single pixel. */
  static readonly MIN_ZOOM_LEVEL = 0.2;
  /** How much each zoom in/out button click multiplies the current zoom level by - shared with MAX_ZOOM_LEVEL below so "how far in can you go" stays defined in terms of "how many clicks from baseline," not a separate arbitrary number. */
  static readonly ZOOM_STEP_FACTOR = 1.2;
  /**
   * 8 zoom-in clicks from the 1.0 baseline (ZOOM_STEP_FACTOR ** 8 ≈ 4.3).
   * Previously a flat 8 (nearly two extra doublings past this), reported
   * by Jonn (2026-09-22) as zooming in far too aggressively.
   */
  static readonly MAX_ZOOM_LEVEL = Camera.ZOOM_STEP_FACTOR ** 8;

  // updateOriginalCamera() constants - see that method's own comment for
  // what each one approximates from the real camera (Game Expert
  // research, 2026-09-22, ssb-decomp-re's gmcamera.c).
  /** World units the per-fighter look-ahead box extends in their facing direction. */
  private static readonly ORIGINAL_AHEAD = 1000;
  /** World units the box extends behind them. */
  private static readonly ORIGINAL_BEHIND = 700;
  /** World units the box extends above/below them. */
  private static readonly ORIGINAL_VERT = 700;
  /** dGMCameraPlayerZoomRanges[] - scales each fighter's box by seated-player count (index = count, clamped to 4). */
  private static readonly ORIGINAL_PLAYER_COUNT_ZOOM: readonly number[] = [
    0, 1.5, 1.32, 1.16, 1.0,
  ];
  /**
   * Span-space stand-ins for the real camera's [2500, 30000] 3D distance
   * clamp - there's no exact unit conversion between this app's 2D world
   * span and the decomp's eye-to-target distance, so these are tuned to
   * feel similarly tight up-close / permissive zoomed-out relative to the
   * default mode's own MIN_SPAN=1400 and effectively unbounded max.
   */
  private static readonly ORIGINAL_MIN_SPAN = 1000;
  private static readonly ORIGINAL_MAX_SPAN = 12000;
  /** Zoom (span) eases toward its target at a fixed rate - matches the real camera's distance lerp being a single rate, unlike pan speed below. */
  private static readonly ORIGINAL_ZOOM_LERP = 0.075;
  /** Pan speed interpolates between these across ORIGINAL_PAN_SPEED_SPAN_LOW/HIGH, slower when zoomed in - proportional stand-in for the real camera's distance-dependent 0.05-0.10 pan lerp. */
  private static readonly ORIGINAL_PAN_LERP_MIN = 0.05;
  private static readonly ORIGINAL_PAN_LERP_MAX = 0.1;
  private static readonly ORIGINAL_PAN_SPEED_SPAN_LOW = 1500;
  private static readonly ORIGINAL_PAN_SPEED_SPAN_HIGH = 7000;

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

  /** Switches which of update() / updateOriginalCamera() actually moves the camera when unlocked - see this class's own doc comment. Locking/unlocking and manual pan/zoom work identically regardless of mode. */
  setTrackingMode(mode: CameraTrackingMode): void {
    this.trackingMode = mode;
  }

  getTrackingMode(): CameraTrackingMode {
    return this.trackingMode;
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
    if (this.locked || this.trackingMode !== "default") return;
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

  /**
   * Alternate framing for setTrackingMode("original") - see this class's
   * own doc comment for the overall approach and what's NOT modeled
   * (idle-player deweighting, per-move zoom overrides, stage/mode-specific
   * camera paths). Call once per render with every active fighter's
   * position and facing direction, in place of update().
   *
   * Differs from the default mode in three ways, each translating a real
   * camera behavior (Game Expert research, ssb-decomp-re's gmcamera.c)
   * into this app's 2D span model:
   * 1. Each fighter contributes an ASYMMETRIC box (more room ahead of them
   *    than behind, per ORIGINAL_AHEAD/BEHIND) instead of a symmetric one
   *    centered on their sprite - the real camera leans toward where a
   *    fighter is facing/likely to move.
   * 2. The union box is scaled by ORIGINAL_PLAYER_COUNT_ZOOM before being
   *    clamped to [ORIGINAL_MIN_SPAN, ORIGINAL_MAX_SPAN] - 1v1 frames
   *    tighter than a 4-player free-for-all at the same fighter spread.
   * 3. Zoom (span) and pan (center position) ease at different,
   *    independent rates - zoom always at ORIGINAL_ZOOM_LERP, pan
   *    interpolating between ORIGINAL_PAN_LERP_MIN/MAX based on the
   *    CURRENT span (slower/smoother pan when zoomed in, faster chase when
   *    zoomed out) - vs. the default mode's single flat LERP_FACTOR for
   *    both together.
   */
  updateOriginalCamera(
    fighters: ReadonlyArray<{ x: number; y: number; facingDirection: 1 | -1 }>,
    snap: boolean,
  ): void {
    if (this.locked || this.trackingMode !== "original") return;
    if (fighters.length === 0) {
      if (!this.hasView) {
        this.setView(-450, 450, -100, 500);
      }
      return;
    }

    const countMult =
      Camera.ORIGINAL_PLAYER_COUNT_ZOOM[
        Math.min(fighters.length, Camera.ORIGINAL_PLAYER_COUNT_ZOOM.length - 1)
      ] ?? 1.0;
    const ahead = Camera.ORIGINAL_AHEAD * countMult;
    const behind = Camera.ORIGINAL_BEHIND * countMult;
    const vert = Camera.ORIGINAL_VERT * countMult;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const f of fighters) {
      const boxMinX = f.facingDirection > 0 ? f.x - behind : f.x - ahead;
      const boxMaxX = f.facingDirection > 0 ? f.x + ahead : f.x + behind;
      if (boxMinX < minX) minX = boxMinX;
      if (boxMaxX > maxX) maxX = boxMaxX;
      if (f.y - vert < minY) minY = f.y - vert;
      if (f.y + vert > maxY) maxY = f.y + vert;
    }

    // Convert the raw box into a single aspect-matched span (the limiting
    // dimension, same idea as rescale()'s Math.min) so the frame always
    // exactly fills the canvas - the real camera projects both axes
    // through one FOV/distance simultaneously, never letterboxing either.
    const aspect = this.canvasWidth / this.canvasHeight;
    const rawSpanX = maxX - minX;
    const rawSpanY = maxY - minY;
    const requiredSpanX = Math.max(rawSpanX, rawSpanY * aspect);
    const targetSpanX = Math.min(
      Camera.ORIGINAL_MAX_SPAN,
      Math.max(Camera.ORIGINAL_MIN_SPAN, requiredSpanX),
    );
    const targetSpanY = targetSpanX / aspect;
    const targetCenterX = (minX + maxX) / 2;
    const targetCenterY = (minY + maxY) / 2;

    if (!this.hasView || snap) {
      this.setView(
        targetCenterX - targetSpanX / 2,
        targetCenterX + targetSpanX / 2,
        targetCenterY - targetSpanY / 2,
        targetCenterY + targetSpanY / 2,
      );
      return;
    }

    const currentSpanX = this.viewMaxX - this.viewMinX;
    const currentCenterX = (this.viewMinX + this.viewMaxX) / 2;
    const currentCenterY = (this.viewMinY + this.viewMaxY) / 2;

    const zoomT = Camera.ORIGINAL_ZOOM_LERP;
    const newSpanX = currentSpanX + (targetSpanX - currentSpanX) * zoomT;
    const newSpanY = newSpanX / aspect;

    const panFrac = Math.min(
      1,
      Math.max(
        0,
        (currentSpanX - Camera.ORIGINAL_PAN_SPEED_SPAN_LOW) /
          (Camera.ORIGINAL_PAN_SPEED_SPAN_HIGH -
            Camera.ORIGINAL_PAN_SPEED_SPAN_LOW),
      ),
    );
    const panT =
      Camera.ORIGINAL_PAN_LERP_MIN +
      (Camera.ORIGINAL_PAN_LERP_MAX - Camera.ORIGINAL_PAN_LERP_MIN) * panFrac;
    const newCenterX = currentCenterX + (targetCenterX - currentCenterX) * panT;
    const newCenterY = currentCenterY + (targetCenterY - currentCenterY) * panT;

    this.setView(
      newCenterX - newSpanX / 2,
      newCenterX + newSpanX / 2,
      newCenterY - newSpanY / 2,
      newCenterY + newSpanY / 2,
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
