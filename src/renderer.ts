import {
  drawDeathDirectionFlashes,
  drawPlayer,
  drawDIIndicator,
  drawChargeMeter,
  drawRecoveryJumpCount,
  drawPlayerNameTag,
  drawPlayerStateInfo,
  drawShieldBubble,
  drawDizzyStars,
  drawSleepZzz,
  drawTumbleAura,
  drawMissedTechBounce,
  drawTechBreakfall,
  drawTechRollSpeedLines,
  drawJumpSquatFx,
  drawSuperArmorAura,
  drawDeconflictedPauseHuds,
  type PlayerPauseHudItem,
  drawPikachuQuickAttackStreak,
  drawQuickAttackOverlay,
  drawRollTrail,
  drawAttackArc,
  drawYoshiEggShell,
  drawYoshiEgg,
  COMBO_GAP_CALLOUT_FADE_FRAMES,
  type ReviveCloudExit,
  type ShieldBreakEvent,
} from "./renderer/characters/index.js";
export * from "./renderer/characters/index.js";
import { computeComboEscapeGaps, type ComboEscapeGap } from "./combos.js";
import {
  drawPikachuPolygons,
  drawFalconPolygons,
  drawMarioPolygons,
  drawLuigiPolygons,
  drawKirbyPolygons,
  drawJigglypuffPolygons,
  drawFoxPolygons,
  drawYoshiPolygons,
  drawDonkeyKongPolygons,
  drawLinkPolygons,
  drawNessPolygons,
  drawSamusPolygons,
} from "./characters/original/index.js";
import {
  drawFalconSpecial,
  drawPikachuSpecial,
  drawYoshiSpecial,
  drawMarioSpecial,
  drawSamusSpecial,
  drawLinkSpecial,
  drawKirbySpecial,
  drawJigglypuffSpecial,
  drawDKSpecial,
  drawNessSpecial,
  drawFoxSpecial,
} from "./characters/specials/index.js";
export * from "./characters/specials/index.js";
import {
  drawItemObjects,
  drawBombExplosions,
  drawBombExplosionAt,
  drawSamusBombExplosionAt,
  drawEggExplosions,
  drawEggExplosionAt,
  isChargingOrb,
  drawGenericItemDiamond,
  drawCustomWeaponShape,
  drawCustomItemShape,
  drawChargeShotMarker,
  drawRoundBombItem,
} from "./renderer/items/index.js";
export * from "./renderer/items/index.js";
import {
  BackgroundRenderer,
  drawRecoveryZone,
  drawBlastZone,
  drawWindZone,
  drawStage,
  drawPlatform,
  drawStageSakuraTrees,
  drawStageMatureSakuraTree,
  drawStageAutumnTrees,
  drawStageAutumnTree,
  drawStagePalmTrees,
  drawStagePalmTree,
  drawPineapple,
  drawStagePineapplePlant,
  drawAnimatedAutumnLeaves,
  drawLedgeGrabZoneHighlight,
  drawRecoveryLedgeHighlight,
  drawLedgeGrabDots,
  drawFallbackGroundLine,
  drawStageSlopesAndSilhouette,
} from "./renderer/stage/index.js";
export * from "./renderer/stage/index.js";
import {
  getSeatedPorts,
  type Frame,
  type ItemUpdate,
  type PortIndex,
  type Replay,
} from "@rmg-k/rmgr";
import { Camera } from "./camera.js";
import { stageLedges, type PlatformSpec } from "./stageGeometry.js";
import {
  computeRecoveryVerdictFrames,
  type RecoveryVerdictFrame,
} from "./recoveryVerdicts.js";
import { extractAllHitsWithDI, type HitDIResult } from "./di.js";
import { characterIconUrl } from "./characterIcons.js";
import { LEDGE_GRAB_VISUALIZATION_ENABLED } from "./ledgeGrabRange.js";
import { getPlayerColor } from "./players.js";
import { actionStateName } from "./lookups.js";
import {
  drawBowserPolygons,
  drawFalcoPolygons,
  drawGanondorfPolygons,
  drawYoungLinkPolygons,
  drawDrMarioPolygons,
  drawWarioPolygons,
  drawDarkSamusPolygons,
  drawLucasPolygons,
  drawGigaBowserPolygons,
  drawMarthPolygons,
  drawRoyPolygons,
  drawMewtwoPolygons,
  drawSheikPolygons,
  drawPeachPolygons,
  drawSonicPolygons,
  drawSuperSonicPolygons,
  drawWolfPolygons,
  drawDededePolygons,
  drawBanjoPolygons,
  drawCrashPolygons,
  drawConkerPolygons,
  drawSandbagPolygons,
  drawPianoPolygons,
  drawMarinaPolygons,
  drawGoemonPolygons,
  drawPeppyPolygons,
  drawSlippyPolygons,
  drawMetalLuigiPolygons,
  drawDrLuigiPolygons,
  drawEbisumaruPolygons,
  drawDragonKingPolygons,
  drawLankyKongPolygons,
} from "./characters/remix/index.js";

export * from "./renderer/common/index.js";
import {
  type BackgroundTheme,
  type CharacterAnimState,
  isDeadState,
  isRollState,
  isQuickAttackState,
  REVIVE2_ACTION_STATE_ID,
  isReviveState,
  isShieldBreakFlyState,
  isPikachuCharacter,
  isKirbyCharacter,
  isJigglypuffCharacter,
  isYoshiCharacter,
  isYoshiShieldInvincibleState,
  type FalconSpecialType,
  type PikachuSpecialType,
  type FoxSpecialType,
  type MarioSpecialType,
  type SamusSpecialType,
  type YoshiSpecialType,
  type DKSpecialType,
  type KirbySpecialType,
  type JigglypuffSpecialType,
  type NessSpecialType,
  type LinkSpecialType,
  type AttackInfo,
  type LedgeGrabCandidate,
  computeLedgeGrabCandidates,
  type BombExplosionEvent,
  extractBombExplosions,
  extractSamusBombExplosions,
  type EggExplosionEvent,
  extractEggExplosions,
  type QuickAttackPath,
} from "./renderer/common/index.js";

/** A single recovery jump, captured at the moment it happened - see getRecoveryJumpMarks(). */
interface RecoveryJumpMark {
  readonly frame: number;
  readonly worldX: number;
  readonly worldY: number;
  readonly jumpsRemaining: number;
}

export class StageRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private quickAttackOverlayPaths: QuickAttackPath[] | null = null;
  private hoveredQuickAttackIndex: number | null = null;
  private diEventsCache = new WeakMap<Replay, HitDIResult[]>();
  private backgroundTheme: BackgroundTheme = "grid";
  private backgroundRenderer = new BackgroundRenderer();
  /** Draw the edge-guard zone boundary (match view's "Zone" toggle). */
  private showRecoveryZone = false;
  private bgBufferCanvas: HTMLCanvasElement | null = null;
  private bgBufferDirty = true;
  private bgBufferIsLight: boolean | null = null;
  private appThemeOverride: "light" | "dark" | null = null;

  public setBackgroundTheme(theme: BackgroundTheme): void {
    if (this.backgroundTheme === theme) return;
    this.backgroundTheme = theme;
    this.bgBufferDirty = true;
    this.backgroundRenderer.invalidateBuffer();
  }

  public getBackgroundTheme(): BackgroundTheme {
    return this.backgroundTheme;
  }

  public setAppTheme(theme: "light" | "dark" | null): void {
    if (this.appThemeOverride === theme) return;
    this.appThemeOverride = theme;
    this.bgBufferDirty = true;
    this.backgroundRenderer.invalidateBuffer();
  }

  public setLightMode(light: boolean): void {
    this.setAppTheme(light ? "light" : "dark");
  }

  public invalidateBackground(): void {
    this.bgBufferDirty = true;
    this.backgroundRenderer.invalidateBuffer();
  }

  public isLightMode(): boolean {
    if (this.appThemeOverride !== null) {
      return this.appThemeOverride === "light";
    }
    if (typeof document !== "undefined") {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "light") return true;
      if (attr === "dark") return false;
      if (typeof window !== "undefined" && window.matchMedia) {
        return window.matchMedia("(prefers-color-scheme: light)").matches;
      }
    }
    return false;
  }

  private getDIEvents(replay: Replay): HitDIResult[] {
    let events = this.diEventsCache.get(replay);
    if (!events) {
      events = extractAllHitsWithDI(replay);
      this.diEventsCache.set(replay, events);
    }
    return events;
  }

  private comboEscapeGapsCache = new WeakMap<Replay, ComboEscapeGap[]>();

  private getComboEscapeGaps(replay: Replay): ComboEscapeGap[] {
    let gaps = this.comboEscapeGapsCache.get(replay);
    if (!gaps) {
      gaps = computeComboEscapeGaps(replay);
      this.comboEscapeGapsCache.set(replay, gaps);
    }
    return gaps;
  }

  private recoveryVerdictFramesCache = new WeakMap<
    Replay,
    (RecoveryVerdictFrame | null)[]
  >();

  private getRecoveryVerdictFrames(
    replay: Replay,
  ): (RecoveryVerdictFrame | null)[] {
    let frames = this.recoveryVerdictFramesCache.get(replay);
    if (!frames) {
      frames = computeRecoveryVerdictFrames(replay);
      this.recoveryVerdictFramesCache.set(replay, frames);
    }
    return frames;
  }

  // Frame indices where ANY seated port respawns (leaves Revive2, see
  // REVIVE2_ACTION_STATE_ID's own doc comment) - frame 0 always counts
  // too, even though the game's pre-battle frames may not literally be in
  // that state yet, to preserve the original match-start name tag
  // behavior exactly. Shared across all ports (not tracked per-port) since
  // a respawn should flash every player's name/stock tag back in, not
  // just the respawning player's.
  private spawnFramesCache = new WeakMap<Replay, number[]>();

  private getSpawnFrames(replay: Replay): number[] {
    let frames = this.spawnFramesCache.get(replay);
    if (!frames) {
      const spawnFrameSet = new Set<number>([0]);
      for (const port of getSeatedPorts(replay)) {
        for (let i = 1; i < replay.frames.length; i++) {
          const cur = replay.frames[i]?.ports[port]?.state?.actionStateId;
          const prev = replay.frames[i - 1]?.ports[port]?.state?.actionStateId;
          if (
            prev === REVIVE2_ACTION_STATE_ID &&
            cur !== REVIVE2_ACTION_STATE_ID
          ) {
            spawnFrameSet.add(i);
          }
        }
      }
      frames = [...spawnFrameSet].sort((a, b) => a - b);
      this.spawnFramesCache.set(replay, frames);
    }
    return frames;
  }

  /** Frames elapsed since the most recent spawn/respawn (any player), for the fading name/stock tag. */
  private getFramesSinceSpawn(replay: Replay, frameIndex: number): number {
    const spawnFrames = this.getSpawnFrames(replay);
    let lo = 0;
    let hi = spawnFrames.length - 1;
    let mostRecentSpawn = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (spawnFrames[mid]! <= frameIndex) {
        mostRecentSpawn = spawnFrames[mid]!;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return frameIndex - mostRecentSpawn;
  }

  // Marks for every frame where a Kirby/Jigglypuff (any variant) port
  // jumps while beyond either of the stage's ledges (X only - not a
  // height/zone check) - the "recovery jump" cue. Captures the world
  // position and resulting jump count AT the jump itself so the on-screen
  // label can stay anchored where the jump happened instead of tracking
  // the character as they keep moving. Empty for any stage stageLedges()
  // has no geometry for. jumpsRemaining is also only reliable from schema
  // v7 onward (see playSfxForFrameChange's own note in matchView.ts) -
  // older files never populate this cache.
  private recoveryJumpMarksCache = new WeakMap<
    Replay,
    Map<PortIndex, RecoveryJumpMark[]>
  >();

  private getRecoveryJumpMarks(
    replay: Replay,
    port: PortIndex,
  ): RecoveryJumpMark[] {
    let byPort = this.recoveryJumpMarksCache.get(replay);
    if (!byPort) {
      byPort = new Map();
      this.recoveryJumpMarksCache.set(replay, byPort);
    }
    let marks = byPort.get(port);
    if (!marks) {
      marks = [];
      const hasReliableJumpsRemaining =
        replay.header.recorderSchemaVersion >= 7;
      const ledges = stageLedges(replay.matchSettings?.stageId);
      if (hasReliableJumpsRemaining && ledges) {
        const [leftLedge, rightLedge] = ledges;
        for (let i = 1; i < replay.frames.length; i++) {
          const post = replay.frames[i]?.ports[port]?.state;
          const prevPost = replay.frames[i - 1]?.ports[port]?.state;
          if (!post || !prevPost) continue;
          if (
            (isKirbyCharacter(post.characterId) ||
              isJigglypuffCharacter(post.characterId)) &&
            post.jumpsRemaining < prevPost.jumpsRemaining &&
            (post.positionX < leftLedge.x || post.positionX > rightLedge.x)
          ) {
            marks.push({
              frame: i,
              worldX: post.positionX,
              worldY: post.positionY,
              jumpsRemaining: post.jumpsRemaining,
            });
          }
        }
      }
      byPort.set(port, marks);
    }
    return marks;
  }

  /** This port's most recent recovery jump at or before frameIndex, or null if it's never had one (yet). */
  private getMostRecentRecoveryJump(
    replay: Replay,
    port: PortIndex,
    frameIndex: number,
  ): RecoveryJumpMark | null {
    const marks = this.getRecoveryJumpMarks(replay, port);
    let lo = 0;
    let hi = marks.length - 1;
    let mostRecent: RecoveryJumpMark | null = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (marks[mid]!.frame <= frameIndex) {
        mostRecent = marks[mid]!;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return mostRecent;
  }

  // Cache of revival cloud exit events (when a player leaves Revive1, Revive2, or ReviveWait),
  // allowing the cloud platform to dissolve and dissipate at its world coordinates over CLOUD_DISSIPATE_FRAMES.
  private reviveExitsCache = new WeakMap<
    Replay,
    Map<PortIndex, ReviveCloudExit[]>
  >();

  private getReviveExits(replay: Replay, port: PortIndex): ReviveCloudExit[] {
    let portMap = this.reviveExitsCache.get(replay);
    if (!portMap) {
      portMap = new Map();
      for (const p of getSeatedPorts(replay)) {
        const exits: ReviveCloudExit[] = [];
        let wasRevive = false;
        let lastReviveX = 0;
        let lastReviveY = 0;
        let lastCharacterId = 0;

        for (let i = 0; i < replay.frames.length; i++) {
          const portState = replay.frames[i]?.ports[p]?.state;
          if (!portState) continue;
          const curRevive = isReviveState(portState.actionStateId);
          if (curRevive) {
            wasRevive = true;
            lastReviveX = portState.positionX;
            lastReviveY = portState.positionY;
            lastCharacterId = portState.characterId;
          } else if (wasRevive) {
            wasRevive = false;
            exits.push({
              exitFrame: i,
              worldX: lastReviveX,
              worldY: lastReviveY,
              characterId: lastCharacterId,
            });
          }
        }
        portMap.set(p, exits);
      }
      this.reviveExitsCache.set(replay, portMap);
    }
    return portMap.get(port) ?? [];
  }

  /** Returns this port's most recent revival platform exit at or before frameIndex, if any. */
  private getMostRecentReviveExit(
    replay: Replay,
    port: PortIndex,
    frameIndex: number,
  ): ReviveCloudExit | null {
    const exits = this.getReviveExits(replay, port);
    if (exits.length === 0) return null;
    let lo = 0;
    let hi = exits.length - 1;
    let mostRecent: ReviveCloudExit | null = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const candidate = exits[mid]!;
      if (candidate.exitFrame <= frameIndex) {
        mostRecent = candidate;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return mostRecent;
  }

  // Cache of shield break events (when a player enters ShieldBreakFly 0x09e),
  // allowing the shield pop animation to stay centered at the world coordinates
  // where the break occurred over SHIELD_BREAK_POP_FRAMES (24 frames) instead of moving
  // vertically with the launched fighter.
  private shieldBreakCache = new WeakMap<
    Replay,
    Map<PortIndex, ShieldBreakEvent[]>
  >();

  private getShieldBreaks(replay: Replay, port: PortIndex): ShieldBreakEvent[] {
    let portMap = this.shieldBreakCache.get(replay);
    if (!portMap) {
      portMap = new Map();
      for (const p of getSeatedPorts(replay)) {
        const events: ShieldBreakEvent[] = [];
        let wasBreak = false;
        for (let i = 0; i < replay.frames.length; i++) {
          const f = replay.frames[i];
          const portState = f?.ports[p]?.state;
          if (!portState) continue;
          const isBreak = isShieldBreakFlyState(portState.actionStateId);
          if (isBreak && !wasBreak) {
            events.push({
              startFrame: f.frame ?? i,
              worldX: portState.positionX,
              worldY: portState.positionY,
              characterId: portState.characterId,
            });
          }
          wasBreak = isBreak;
        }
        portMap.set(p, events);
      }
      this.shieldBreakCache.set(replay, portMap);
    }
    return portMap.get(port) ?? [];
  }

  /** Returns this port's most recent shield break event at or before frameIndex, if any. */
  private getMostRecentShieldBreak(
    replay: Replay,
    port: PortIndex,
    frameIndex: number,
  ): ShieldBreakEvent | null {
    const events = this.getShieldBreaks(replay, port);
    if (events.length === 0) return null;
    let lo = 0;
    let hi = events.length - 1;
    let mostRecent: ShieldBreakEvent | null = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const candidate = events[mid]!;
      if (candidate.startFrame <= frameIndex) {
        mostRecent = candidate;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return mostRecent;
  }

  // Cache of loaded character icon <img> elements, keyed by URL - drawImage()
  // is a no-op until the image finishes loading, so callers should tolerate
  // a null return (fall back to an emoji) for the first frame or two after a
  // new character's icon is first requested.
  private iconImageCache = new Map<string, HTMLImageElement>();

  private getCharacterIconImage(characterId: number): HTMLImageElement | null {
    const url = characterIconUrl(characterId);
    if (!url || typeof Image === "undefined") return null;
    let img = this.iconImageCache.get(url);
    if (!img) {
      img = new Image();
      img.src = url;
      this.iconImageCache.set(url, img);
    }
    return img.complete && img.naturalWidth > 0 ? img : null;
  }

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
  }

  public setShowRecoveryZone(show: boolean): void {
    this.showRecoveryZone = show;
  }

  public setQuickAttackOverlay(paths: QuickAttackPath[] | null): void {
    this.quickAttackOverlayPaths = paths;
  }

  public getQuickAttackOverlayPaths(): QuickAttackPath[] | null {
    return this.quickAttackOverlayPaths;
  }

  public setHoveredQuickAttackIndex(index: number | null): void {
    this.hoveredQuickAttackIndex = index;
  }

  public isQuickAttackOverlayActive(): boolean {
    return (
      this.quickAttackOverlayPaths !== null &&
      this.quickAttackOverlayPaths.length > 0
    );
  }

  render(
    camera: Camera,
    frame: Frame | undefined,
    stageId: number | undefined,
    replay?: Replay | null,
    frameIndex?: number,
    perspectivePort?: PortIndex | null,
    isPaused?: boolean,
  ): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawBackground(camera);
    this.drawBlastZone(camera, stageId);
    this.drawStage(camera, stageId, frameIndex);
    if (this.showRecoveryZone) this.drawRecoveryZone(camera, stageId);
    this.drawWindZone(camera, stageId, frame, frameIndex);

    // If Quick Attack Overlay mode is active:
    if (
      this.quickAttackOverlayPaths &&
      this.quickAttackOverlayPaths.length > 0
    ) {
      this.drawQuickAttackOverlay(
        camera,
        this.quickAttackOverlayPaths,
        this.hoveredQuickAttackIndex,
      );
      // Temporarily hide character models while overlay is displayed
      return;
    }

    if (frame) {
      // Needs replay + frameIndex (not just this frame) to compute fade
      // in/out - see computeLedgeGrabCandidates()'s own doc comment.
      // LEDGE_GRAB_VISUALIZATION_ENABLED is checked here, at the call
      // site, rather than inside computeLedgeGrabCandidates() itself, so
      // that function's geometry logic stays fully unit-testable
      // regardless of the flag's current value.
      const ledgeGrabCandidates =
        LEDGE_GRAB_VISUALIZATION_ENABLED && replay && frameIndex !== undefined
          ? computeLedgeGrabCandidates(replay, frameIndex, stageId)
          : [];
      this.drawLedgeGrabZoneHighlight(camera, stageId, ledgeGrabCandidates);

      const recoveryVerdict =
        replay && frameIndex !== undefined
          ? (this.getRecoveryVerdictFrames(replay)[frameIndex] ?? null)
          : null;
      if (recoveryVerdict?.verdict === "dead-if-ledge-occupied") {
        this.drawRecoveryLedgeHighlight(camera, stageId, recoveryVerdict.side);
      }

      // Draw motion trails (Pikachu Quick Attack streaks, Fox Fire Fox streaks, Roll trails) before characters
      if (replay && frameIndex !== undefined) {
        for (const key of Object.keys(frame.ports)) {
          const port = Number(key) as PortIndex;
          const portData = frame.ports[port];
          if (!portData || !portData.state) continue;
          if (
            isPikachuCharacter(portData.state.characterId) &&
            isQuickAttackState(portData.state.actionStateId)
          ) {
            this.drawPikachuQuickAttackStreak(camera, port, replay, frameIndex);
          }
          if (isRollState(portData.state.actionStateId)) {
            this.drawRollTrail(camera, port, replay, frameIndex);
          }
        }
      }

      const escapeGaps =
        replay && frameIndex !== undefined
          ? this.getComboEscapeGaps(replay)
          : [];

      for (const key of Object.keys(frame.ports)) {
        const port = Number(key) as PortIndex;
        const portData = frame.ports[port];
        if (!portData || !portData.state) continue;
        if (
          isDeadState(portData.state.actionStateId) ||
          portData.state.stocksRemaining < 0
        ) {
          continue;
        }

        let comboEscapeState: {
          isActionableFrame: boolean;
          actionableFrameCount: number;
          fadeAlpha: number;
          anchorWorldX?: number;
          anchorWorldY?: number;
          anchorFacingRight?: boolean;
        } | null = null;

        if (frameIndex !== undefined && escapeGaps.length > 0) {
          for (const gap of escapeGaps) {
            if (gap.victimPort !== port) continue;
            if (
              frameIndex >= gap.gapStartFrameIndex &&
              frameIndex <= gap.gapEndFrameIndex + COMBO_GAP_CALLOUT_FADE_FRAMES
            ) {
              const isActionableFrame =
                gap.actionableFrameIndices.includes(frameIndex);
              const fadeAlpha =
                frameIndex <= gap.gapEndFrameIndex
                  ? 1.0
                  : Math.max(
                      0,
                      1.0 -
                        (frameIndex - gap.gapEndFrameIndex) /
                          COMBO_GAP_CALLOUT_FADE_FRAMES,
                    );
              if (
                !comboEscapeState ||
                fadeAlpha > comboEscapeState.fadeAlpha ||
                isActionableFrame
              ) {
                comboEscapeState = {
                  isActionableFrame,
                  actionableFrameCount: gap.actionableFrameCount,
                  fadeAlpha,
                  anchorWorldX: gap.anchorWorldX,
                  anchorWorldY: gap.anchorWorldY,
                  anchorFacingRight: gap.anchorFacingRight,
                };
              }
            }
          }
        }

        this.drawPlayer(
          camera,
          port,
          portData.state,
          perspectivePort,
          replay,
          frameIndex,
          isPaused,
          recoveryVerdict && recoveryVerdict.port === port
            ? recoveryVerdict
            : null,
          isPaused, // suppress per-player pause HUD to render unified deconflict pass after all players
          comboEscapeState,
        );
      }

      // If paused, render de-conflicted player state HUD pills across all active characters
      if (isPaused) {
        const pauseHudItems: PlayerPauseHudItem[] = [];
        for (const key of Object.keys(frame.ports)) {
          const port = Number(key) as PortIndex;
          const portData = frame.ports[port];
          if (!portData || !portData.state) continue;
          if (
            isDeadState(portData.state.actionStateId) ||
            portData.state.stocksRemaining < 0
          ) {
            continue;
          }
          const { x, y } = camera.worldToScreen(
            portData.state.positionX,
            portData.state.positionY,
          );
          const tagColor = getPlayerColor(port, perspectivePort);
          const armorForHud =
            portData.state.knockbackResist !== undefined
              ? portData.state.knockbackResist
              : (portData.state.actionStateId === 0x018 ||
                    portData.state.actionStateId === 0x019) &&
                  isYoshiCharacter(portData.state.characterId)
                ? 140
                : undefined;
          const effectiveHurtboxState =
            portData.state.hurtboxState === 2 ||
            portData.state.hurtboxState === 3
              ? portData.state.hurtboxState
              : portData.state.specialHitStatus === 2 ||
                  portData.state.specialHitStatus === 3
                ? portData.state.specialHitStatus
                : isReviveState(portData.state.actionStateId)
                  ? 2
                  : isYoshiShieldInvincibleState(
                        portData.state.characterId,
                        portData.state.actionStateId,
                        portData.state.actionFrameCounter,
                      )
                    ? 2
                    : portData.state.hurtboxState;
          pauseHudItems.push({
            x,
            y,
            stateName: actionStateName(
              portData.state.actionStateId,
              undefined,
              undefined,
              portData.state.characterId,
            ),
            stateId: portData.state.actionStateId,
            posX: portData.state.positionX,
            posY: portData.state.positionY,
            tagColor,
            knockbackResist: armorForHud,
            hurtboxState: effectiveHurtboxState,
          });
        }
        drawDeconflictedPauseHuds(this.ctx, pauseHudItems);
      }

      this.drawItemObjects(camera, frame.items ?? [], replay, frame, isPaused);
      if (replay && frameIndex !== undefined) {
        this.drawBombExplosions(camera, frameIndex, replay);
        this.drawEggExplosions(camera, frameIndex, replay);
      }
      this.drawDeathDirectionFlashes(frame);
      this.drawLedgeGrabDots(camera, ledgeGrabCandidates);

      // Draw Directional Influence (DI) shift vector and overhead badge during hitlag and early hitstun
      if (replay && frameIndex !== undefined) {
        const diEvents = this.getDIEvents(replay);
        for (const hitDI of diEvents) {
          if (
            frameIndex >= hitDI.hitFrameIndex &&
            frameIndex <= hitDI.endHitlagFrameIndex + 22
          ) {
            this.drawDIIndicator(camera, hitDI, frameIndex);
          }
        }
      }
    }
  }

  /**
   * The edge-guard zone (edgeGuard.ts isOutsideZone / recoveryZoneBoundary):
   * a player past these lines who can act again counts as recovering, which
   * opens an edge-guard situation. Per side: vertical below stage height, the
   * slanted segment, vertical again above it; the offstage side is tinted out
   * to the blast zone.
   */
  private drawRecoveryZone(camera: Camera, stageId: number | undefined): void {
    drawRecoveryZone(this.ctx, camera, stageId);
  }

  /**
   * Draws the outer stage blast zone boundary (death boundary rectangle).
   * Shaded with a subtle outer danger tint and an inward-facing edge gradient.
   */
  private drawBlastZone(camera: Camera, stageId: number | undefined): void {
    drawBlastZone(this.ctx, this.canvas, camera, stageId);
  }

  /**
   * Draws a marker for every Item/Weapon object live this frame
   * (`Frame.items`, recorder schema v3+ — see docs/RMGR_SPEC.md §4.6),
   * labeled with its real resolved name (`getItemKindName`). A handful of
   * commonly-seen Weapon kinds get a recognizable custom shape
   * (`drawCustomWeaponShape` below); everything else still falls back to
   * a generic colored diamond. `HIDDEN_WEAPON_KINDS` (e.g. Link's Spin
   * Attack, a hitbox attached to the attacker's own animation rather than
   * a detached object) are skipped entirely - see that constant's doc
   * comment.
   */
  public drawItemObjects(
    camera: Camera,
    items: readonly ItemUpdate[],
    replay?: Replay | null,
    frame?: Frame,
    isPaused?: boolean,
  ): void {
    drawItemObjects(this.ctx, camera, items, replay, frame, isPaused);
  }

  private bombExplosionsCache = new WeakMap<Replay, BombExplosionEvent[]>();

  public getBombExplosions(replay: Replay): BombExplosionEvent[] {
    let explosions = this.bombExplosionsCache.get(replay);
    if (!explosions) {
      explosions = extractBombExplosions(replay);
      this.bombExplosionsCache.set(replay, explosions);
    }
    return explosions;
  }

  /**
   * Renders all active bomb explosions at the current frameIndex.
   * Multiple simultaneous bombs are rendered independently with their own progress.
   */
  private drawBombExplosions(
    camera: Camera,
    frameIndex: number,
    replay: Replay,
  ): void {
    const explosions = this.getBombExplosions(replay);
    drawBombExplosions(this.ctx, camera, frameIndex, explosions);
  }

  /**
   * 3-Phase Bomb Explosion Visual:
   * Phase 1 (p: 0.0 - 0.25): Initial supersonic flash, shockwave ring, radial blast spokes.
   * Phase 2 (p: 0.15 - 0.70): Multi-lobed boiling fireball clouds, fiery shrapnel & spark trails.
   * Phase 3 (p: 0.50 - 1.00): Billowing dark charcoal/slate smoke puffs drifting upward and fading.
   */
  public drawBombExplosionAt(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    progress: number, // 0.0 to 1.0
    isBobOmb = false,
    baseRadius = 36,
    isSamusBomb = false,
  ): void {
    drawBombExplosionAt(ctx, x, y, progress, isBobOmb, baseRadius, isSamusBomb);
  }

  /**
   * 4-Phase Samus Morph Ball Bomb Cybernetic Explosion Visual:
   * Phase 1 (p: 0.0 - 0.40): Detonation energy flash, concentric neon-cyan shockwave rings & 4-way targeting reticle spokes.
   * Phase 2 (p: 0.0 - 0.75): High-voltage electric lightning arcs & plasma sparks crackling radially.
   * Phase 3 (p: 0.0 - 0.55): Searing spherical electric plasma energy core bursting outward.
   * Phase 4 (p: 0.20 - 1.00): Ethereal ionized plasma vapor clouds cleanly dissipating (no dirty soot).
   */
  public drawSamusBombExplosionAt(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    progress: number, // 0.0 to 1.0
    baseRadius = 28,
  ): void {
    drawSamusBombExplosionAt(ctx, x, y, progress, baseRadius);
  }

  public getSamusBombExplosions(replay: Replay): BombExplosionEvent[] {
    return extractSamusBombExplosions(replay);
  }

  private eggExplosionsCache = new WeakMap<Replay, EggExplosionEvent[]>();

  public getEggExplosions(replay: Replay): EggExplosionEvent[] {
    let explosions = this.eggExplosionsCache.get(replay);
    if (!explosions) {
      explosions = extractEggExplosions(replay);
      this.eggExplosionsCache.set(replay, explosions);
    }
    return explosions;
  }

  /**
   * Renders all active egg explosions at the current frameIndex.
   * Multiple simultaneous eggs are rendered independently with their own progress.
   */
  private drawEggExplosions(
    camera: Camera,
    frameIndex: number,
    replay: Replay,
  ): void {
    const explosions = this.getEggExplosions(replay);
    drawEggExplosions(this.ctx, camera, frameIndex, explosions);
  }

  /**
   * 4-Phase Yoshi Egg Explosion Visual:
   * Phase 1 (p: 0.0 - 0.30): Initial detonation crack flash, shockwave ring, sharp blast rays.
   * Phase 2 (p: 0.0 - 0.75): Multi-colored Yoshi starbursts & sparkles shooting outward with speed trails.
   * Phase 3 (p: 0.0 - 0.85): Jagged cream eggshell shards with green spots tumbling outward with gravity.
   * Phase 4 (p: 0.15 - 1.00): Billowing soft yolk & cream vapor puffs expanding and gently rising before fading.
   */
  public drawEggExplosionAt(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    progress: number, // 0.0 to 1.0
    baseRadius = 32,
  ): void {
    drawEggExplosionAt(ctx, x, y, progress, baseRadius);
  }

  private isChargingOrb(item: ItemUpdate, frame?: Frame): boolean {
    return isChargingOrb(item, frame);
  }

  /** Generic fallback marker for any Item/Weapon kind without a custom shape - a colored diamond. */
  private drawGenericItemDiamond(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    isWeapon: boolean,
  ): void {
    drawGenericItemDiamond(ctx, x, y, isWeapon);
  }

  /**
   * Draws a recognizable shape for select Weapon kinds instead of the
   * generic diamond. Returns true if it drew something (caller should
   * skip the diamond fallback), false for any kind not covered yet.
   */
  private drawCustomWeaponShape(
    ctx: CanvasRenderingContext2D,
    kind: number,
    x: number,
    y: number,
    isLuigi = false,
    dir = 1,
    spinAngle = 0,
    /** The object's recorded render scale (ItemUpdate.scaleY, recorder schema 2+); undefined for older replays. */
    gameScale?: number,
  ): boolean {
    return drawCustomWeaponShape(
      ctx,
      kind,
      x,
      y,
      isLuigi,
      dir,
      spinAngle,
      gameScale,
    );
  }

  /**
   * Draws recognizable shapes for select Item kinds (thrown, held, or ground items).
   */
  private drawCustomItemShape(
    ctx: CanvasRenderingContext2D,
    kind: number,
    x: number,
    y: number,
    frameCounter = 0,
  ): boolean {
    return drawCustomItemShape(ctx, kind, x, y, frameCounter);
  }

  /**
   * Round Bomb Item visual with a burning-down fuse.
   */
  private drawRoundBombItem(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    frameCounter = 0,
    isBobOmb = false,
    bombRadius = 32,
  ): void {
    drawRoundBombItem(ctx, x, y, frameCounter, isBobOmb, bombRadius);
  }

  /**
   * Samus Charge Shot projectile (WPKind.ChargeShot).
   */
  private drawChargeShotMarker(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    spinAngle = 0,
    gameScale?: number,
  ): void {
    drawChargeShotMarker(ctx, x, y, spinAngle, gameScale);
  }

  private drawDeathDirectionFlashes(frame: Frame | undefined): void {
    drawDeathDirectionFlashes(this.ctx, this.canvas, frame);
  }

  private drawDIIndicator(
    camera: Camera,
    hitDI: HitDIResult,
    currentFrameIndex: number,
  ): void {
    drawDIIndicator(this.ctx, camera, hitDI, currentFrameIndex);
  }

  private drawBackground(camera?: Camera): void {
    this.backgroundRenderer.drawBackground(
      this.ctx,
      this.canvas,
      this.backgroundTheme,
      this.isLightMode(),
      camera,
    );
  }

  private drawGridBackground(): void {
    this.backgroundRenderer.drawGridBackground(
      this.ctx,
      this.canvas,
      this.isLightMode(),
    );
  }

  private drawMountainBackground(camera?: Camera): void {
    this.backgroundRenderer.drawMountainBackground(
      this.ctx,
      this.canvas,
      this.isLightMode(),
      camera,
    );
  }

  private drawBeachBackground(camera?: Camera): void {
    this.backgroundRenderer.drawBeachBackground(
      this.ctx,
      this.canvas,
      this.isLightMode(),
      camera,
    );
  }

  private drawAutumnBackground(camera?: Camera): void {
    this.backgroundRenderer.drawAutumnBackground(
      this.ctx,
      this.canvas,
      this.isLightMode(),
      camera,
    );
  }

  /** Real platform/ground geometry for stages we've measured (see stageGeometry.ts); a plain Y=0 reference line otherwise. */
  private drawStage(
    camera: Camera,
    stageId: number | undefined,
    frameIndex?: number,
  ): void {
    drawStage(
      this.ctx,
      camera,
      stageId,
      frameIndex,
      this.backgroundTheme,
      this.isLightMode(),
      this.canvas,
    );
  }

  private drawWindZone(
    camera: Camera,
    stageId: number | undefined,
    frame: Frame | undefined,
    frameIndex?: number,
  ): void {
    drawWindZone(
      this.ctx,
      camera,
      stageId,
      frame,
      frameIndex,
      this.backgroundTheme,
      this.isLightMode(),
    );
  }

  private drawAnimatedAutumnLeaves(camera: Camera, frameIndex?: number): void {
    drawAnimatedAutumnLeaves(this.ctx, camera, frameIndex);
  }

  private drawStageSakuraTrees(
    camera: Camera,
    stageId: number | undefined,
    frameIndex?: number,
  ): void {
    drawStageSakuraTrees(
      this.ctx,
      camera,
      stageId,
      frameIndex,
      this.isLightMode(),
    );
  }

  private drawStageMatureSakuraTree(
    camera: Camera,
    rootWorldX: number,
    rootWorldY: number,
    frameIndex?: number,
  ): void {
    drawStageMatureSakuraTree(
      this.ctx,
      camera,
      rootWorldX,
      rootWorldY,
      frameIndex,
      this.isLightMode(),
    );
  }

  private drawStageAutumnTrees(
    camera: Camera,
    stageId: number | undefined,
  ): void {
    drawStageAutumnTrees(this.ctx, camera, stageId, this.isLightMode());
  }

  private drawStageAutumnTree(
    camera: Camera,
    rootWorldX: number,
    rootWorldY: number,
    curveDirection: 1 | -1,
  ): void {
    drawStageAutumnTree(
      this.ctx,
      camera,
      rootWorldX,
      rootWorldY,
      curveDirection,
      this.isLightMode(),
    );
  }

  private drawStagePalmTrees(
    camera: Camera,
    stageId: number | undefined,
  ): void {
    drawStagePalmTrees(this.ctx, camera, stageId);
  }

  private drawStagePalmTree(
    camera: Camera,
    rootWorldX: number,
    rootWorldY: number,
    curveDirection: 1 | -1,
  ): void {
    drawStagePalmTree(this.ctx, camera, rootWorldX, rootWorldY, curveDirection);
  }

  private drawPineapple(
    camera: Camera,
    worldX: number,
    worldY: number,
    widthWorld: number,
    heightWorld: number,
    tiltAngle = 0,
  ): void {
    drawPineapple(
      this.ctx,
      camera,
      worldX,
      worldY,
      widthWorld,
      heightWorld,
      tiltAngle,
    );
  }

  private drawStagePineapplePlant(
    camera: Camera,
    rootWorldX: number,
    rootWorldY: number,
    plantScale = 1.0,
  ): void {
    drawStagePineapplePlant(
      this.ctx,
      camera,
      rootWorldX,
      rootWorldY,
      plantScale,
    );
  }

  private drawStageSlopesAndSilhouette(
    camera: Camera,
    stageId: number | undefined,
  ): void {
    drawStageSlopesAndSilhouette(
      this.ctx,
      camera,
      stageId,
      this.backgroundTheme,
      this.isLightMode(),
    );
  }

  private drawPlatform(camera: Camera, platform: PlatformSpec): void {
    drawPlatform(
      this.ctx,
      camera,
      platform,
      this.backgroundTheme,
      this.isLightMode(),
    );
  }

  private drawLedgeGrabZoneHighlight(
    camera: Camera,
    stageId: number | undefined,
    candidates: readonly LedgeGrabCandidate[],
  ): void {
    drawLedgeGrabZoneHighlight(
      this.ctx,
      camera,
      stageId,
      candidates,
      this.backgroundTheme,
      this.isLightMode(),
    );
  }

  private drawRecoveryLedgeHighlight(
    camera: Camera,
    stageId: number | undefined,
    side: "left" | "right",
  ): void {
    drawRecoveryLedgeHighlight(this.ctx, camera, stageId, side);
  }

  private drawLedgeGrabDots(
    camera: Camera,
    candidates: readonly LedgeGrabCandidate[],
  ): void {
    drawLedgeGrabDots(
      this.ctx,
      camera,
      candidates,
      this.backgroundTheme,
      this.isLightMode(),
    );
  }

  private drawFallbackGroundLine(camera: Camera): void {
    drawFallbackGroundLine(
      this.ctx,
      camera,
      this.backgroundTheme,
      this.isLightMode(),
      this.canvas,
    );
  }

  private getEffectiveCharacterTheme(): BackgroundTheme {
    return this.backgroundTheme === "mountain" && this.isLightMode()
      ? "grid"
      : this.backgroundTheme;
  }

  private drawPlayer(
    camera: Camera,
    port: PortIndex,
    post: {
      positionX: number;
      positionY: number;
      facingDirection: 1 | -1;
      damagePercent: number;
      characterId: number;
      actionStateId: number;
      actionFrameCounter: number;
      hurtboxState?: number;
      specialHitStatus?: number;
      comboHitCount?: number;
      hitstunCounter?: number;
      stocksRemaining: number;
      jumpsRemaining: number;
      characterSpecific?: number;
      shieldHealth?: number;
      knockbackResist?: number;
    },
    perspectivePort?: PortIndex | null,
    replay?: Replay | null,
    frameIndex?: number,
    isPaused?: boolean,
    recoveryVerdict?: RecoveryVerdictFrame | null,
    suppressPauseHud?: boolean,
    comboEscapeState?: {
      isActionableFrame: boolean;
      actionableFrameCount: number;
      fadeAlpha: number;
      anchorWorldX?: number;
      anchorWorldY?: number;
      anchorFacingRight?: boolean;
    } | null,
  ): void {
    drawPlayer(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      this.isLightMode(),
      (id) => this.getCharacterIconImage(id),
      (rep, fIdx) => this.getFramesSinceSpawn(rep, fIdx),
      (rep, p, fIdx) => this.getMostRecentRecoveryJump(rep, p, fIdx),
      camera,
      port,
      post,
      perspectivePort,
      replay,
      frameIndex,
      isPaused,
      recoveryVerdict,
      suppressPauseHud,
      comboEscapeState,
      (rep, p, fIdx) => this.getMostRecentReviveExit(rep, p, fIdx),
      (rep, p, fIdx) => this.getMostRecentShieldBreak(rep, p, fIdx),
    );
  }

  /**
   * Renders a battery-style charge meter beside Samus (8 discrete stages, levels 0-7)
   * and Donkey Kong (11 discrete stages, windup levels 0-10) using recorder schema-2
   * StateFrame.characterSpecific data.
   *
   * Gated strictly to Samus and DK across regions (Kirby stores copied ability in the
   * same field, and other characters store arbitrary garbage).
   *
   * Fades out once charging stops, reappears at full opacity while paused, and displays
   * a rainbow effect at full charge as it disappears.
   */
  private drawChargeMeter(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    post: {
      characterId: number;
      actionStateId: number;
      characterSpecific?: number;
    },
    port: PortIndex,
    replay?: Replay | null,
    frameIndex?: number,
    isPaused?: boolean,
  ): void {
    drawChargeMeter(
      this.ctx,
      this.isLightMode(),
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      post,
      port,
      replay,
      frameIndex,
      isPaused,
    );
  }

  private drawRecoveryJumpCount(
    x: number,
    y: number,
    jumpsRemaining: number,
    color: string,
    alpha: number,
  ): void {
    drawRecoveryJumpCount(this.ctx, x, y, jumpsRemaining, color, alpha);
  }

  private drawPlayerNameTag(
    x: number,
    y: number,
    name: string,
    tagColor: string,
    isPerspective: boolean,
    alpha: number,
    characterId: number,
    stockCount: number,
  ): void {
    drawPlayerNameTag(
      this.ctx,
      x,
      y,
      name,
      tagColor,
      isPerspective,
      alpha,
      characterId,
      stockCount,
      (id) => this.getCharacterIconImage(id),
    );
  }

  private drawPlayerStateInfo(
    x: number,
    y: number,
    stateName: string,
    stateId: number,
    posX: number,
    posY: number,
    tagColor: string,
    knockbackResist?: number,
  ): void {
    drawPlayerStateInfo(
      this.ctx,
      x,
      y,
      stateName,
      stateId,
      posX,
      posY,
      tagColor,
      knockbackResist,
    );
  }

  private drawSuperArmorAura(
    x: number,
    y: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    frameCounter: number,
    armorValue: number,
    playerColor: string,
    isOpponent: boolean,
  ): void {
    drawSuperArmorAura(
      this.ctx,
      x,
      y,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      frameCounter,
      armorValue,
      playerColor,
      isOpponent,
    );
  }

  private drawShieldBubble(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    color: string,
    isShieldStun: boolean,
    frameCounter: number,
    shieldHealth?: number,
    isPaused?: boolean,
    isInvincible?: boolean,
    isLight?: boolean,
  ): void {
    drawShieldBubble(
      this.ctx,
      x,
      centerY,
      halfWidth,
      heightPx,
      color,
      isShieldStun,
      frameCounter,
      shieldHealth,
      isPaused,
      isInvincible,
      isLight,
    );
  }

  private drawDizzyStars(
    x: number,
    headY: number,
    frameCounter: number,
    isOpponent: boolean,
  ): void {
    drawDizzyStars(this.ctx, x, headY, frameCounter, isOpponent);
  }

  private drawSleepZzz(
    x: number,
    headY: number,
    frameCounter: number,
    isOpponent: boolean,
  ): void {
    drawSleepZzz(this.ctx, x, headY, frameCounter, isOpponent);
  }

  private drawTumbleAura(
    x: number,
    centerY: number,
    halfWidth: number,
    frameCounter: number,
    isOpponent: boolean,
  ): void {
    drawTumbleAura(this.ctx, x, centerY, halfWidth, frameCounter, isOpponent);
  }

  private drawMissedTechBounce(
    x: number,
    y: number,
    halfWidth: number,
    frameCounter: number,
    isOpponent: boolean,
  ): void {
    drawMissedTechBounce(this.ctx, x, y, halfWidth, frameCounter, isOpponent);
  }

  private drawTechBreakfall(
    x: number,
    y: number,
    halfWidth: number,
    frameCounter: number,
    isOpponent: boolean,
  ): void {
    drawTechBreakfall(this.ctx, x, y, halfWidth, frameCounter, isOpponent);
  }

  private drawTechRollSpeedLines(
    x: number,
    y: number,
    topY: number,
    facingDirection: number,
    halfWidth: number,
    frameCounter: number,
    isOpponent: boolean,
  ): void {
    drawTechRollSpeedLines(
      this.ctx,
      x,
      y,
      topY,
      facingDirection,
      halfWidth,
      frameCounter,
      isOpponent,
    );
  }

  private drawJumpSquatFx(
    x: number,
    y: number,
    halfWidth: number,
    heightPx: number,
    frameCounter: number,
    playerColor: string,
    isOpponent: boolean,
  ): void {
    drawJumpSquatFx(
      this.ctx,
      x,
      y,
      halfWidth,
      heightPx,
      frameCounter,
      playerColor,
      isOpponent,
    );
  }

  private drawPikachuPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawPikachuPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawFalconPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawFalconPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawMarioPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawMarioPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawLuigiPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawLuigiPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawKirbyPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawKirbyPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawJigglypuffPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawJigglypuffPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawFoxPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawFoxPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  /**
   * Encased-in-egg overlay (action state 0x0b2, universal across
   * characters) - a cream Yoshi egg shell with green spots, replacing the
   * fully-obscured character body.
   */
  private drawYoshiEggShell(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
  ): void {
    drawYoshiEggShell(this.ctx, x, centerY, halfWidth, heightPx);
  }

  private drawYoshiEgg(x: number, y: number, eggW: number, eggH: number): void {
    drawYoshiEgg(this.ctx, x, y, eggW, eggH);
  }

  private drawYoshiPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawYoshiPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawDonkeyKongPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawDonkeyKongPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawLinkPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawLinkPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawNessPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawNessPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawSamusPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawSamusPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  /**
   * 13. BOWSER: Heavy reptilian King of the Koopas with spiked green carapace, padded cream rim,
   * conical shell spikes, segmented yellow underbelly, spiked armbands, curved bull horns,
   * sharp fangs, and fiery crimson hair mane.
   */
  private drawBowserPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawBowserPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawFalcoPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawFalcoPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawGanondorfPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawGanondorfPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawYoungLinkPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawYoungLinkPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawDrMarioPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawDrMarioPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawWarioPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawWarioPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawDarkSamusPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawDarkSamusPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawLucasPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawLucasPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawGigaBowserPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawGigaBowserPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawMarthPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawMarthPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawRoyPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawRoyPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawMewtwoPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawMewtwoPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawSheikPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawSheikPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawPeachPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawPeachPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawSonicPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawSonicPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawSuperSonicPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawSuperSonicPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawWolfPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawWolfPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawDededePolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawDededePolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawBanjoPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawBanjoPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawCrashPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawCrashPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawConkerPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawConkerPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawSandbagPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawSandbagPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawPianoPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawPianoPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawMarinaPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawMarinaPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawGoemonPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawGoemonPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawPeppyPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawPeppyPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawSlippyPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawSlippyPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawMetalLuigiPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawMetalLuigiPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawDrLuigiPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawDrLuigiPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawEbisumaruPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawEbisumaruPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawDragonKingPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawDragonKingPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawLankyKongPolygons(
    x: number,
    y: number,
    topY: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    effectiveDir: number,
    playerColor: string,
    state: CharacterAnimState,
  ): void {
    drawLankyKongPolygons(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      topY,
      centerY,
      halfWidth,
      heightPx,
      effectiveDir,
      playerColor,
      state,
    );
  }

  private drawAttackArc(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    color: string,
    attack: AttackInfo,
    joystick?: { x: number; y: number } | null,
    canAngle?: boolean,
    actionFrameCounter?: number,
    characterId?: number,
  ): void {
    drawAttackArc(
      this.ctx,
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      attack,
      joystick,
      canAngle,
      actionFrameCounter,
      characterId,
    );
  }

  private drawFalconSpecial(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    color: string,
    specialType: FalconSpecialType,
    frameCounter: number,
  ): void {
    drawFalconSpecial(
      this.ctx,
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      specialType,
      frameCounter,
    );
  }

  private drawPikachuSpecial(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    color: string,
    specialType: PikachuSpecialType,
  ): void {
    drawPikachuSpecial(
      this.ctx,
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      specialType,
    );
  }

  private drawYoshiSpecial(
    x: number,
    y: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    color: string,
    specialType: YoshiSpecialType,
    frameCounter: number,
  ): void {
    drawYoshiSpecial(
      this.ctx,
      x,
      y,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      specialType,
      frameCounter,
    );
  }

  private drawMarioSpecial(
    x: number,
    y: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    isLuigi: boolean,
    specialType: MarioSpecialType,
    frameCounter: number,
  ): void {
    drawMarioSpecial(
      this.ctx,
      x,
      y,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      isLuigi,
      specialType,
      frameCounter,
    );
  }

  private drawSamusSpecial(
    camera: Camera,
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    color: string,
    specialType: SamusSpecialType,
    frameCounter: number,
    characterSpecific?: number,
  ): void {
    drawSamusSpecial(
      this.ctx,
      camera,
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      specialType,
      frameCounter,
      characterSpecific,
    );
  }

  private drawLinkSpecial(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    color: string,
    specialType: LinkSpecialType,
    frameCounter: number,
  ): void {
    drawLinkSpecial(
      this.ctx,
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      specialType,
      frameCounter,
    );
  }

  private drawKirbySpecial(
    x: number,
    y: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    color: string,
    specialType: KirbySpecialType,
    frameCounter: number,
    actionStateId?: number,
  ): void {
    drawKirbySpecial(
      this.ctx,
      x,
      y,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      specialType,
      frameCounter,
      actionStateId,
    );
  }

  private drawJigglypuffSpecial(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    color: string,
    specialType: JigglypuffSpecialType,
    frameCounter: number,
    actionStateId?: number,
  ): void {
    drawJigglypuffSpecial(
      this.ctx,
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      specialType,
      frameCounter,
      actionStateId,
    );
  }

  private drawDKSpecial(
    x: number,
    y: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    color: string,
    specialType: DKSpecialType,
    frameCounter: number,
    characterSpecific?: number,
  ): void {
    drawDKSpecial(
      this.ctx,
      this.getEffectiveCharacterTheme(),
      x,
      y,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      specialType,
      frameCounter,
      characterSpecific,
    );
  }

  private drawNessSpecial(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    color: string,
    specialType: NessSpecialType,
    frameCounter: number,
  ): void {
    drawNessSpecial(
      this.ctx,
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      specialType,
      frameCounter,
    );
  }

  /**
   * Traces Pikachu's continuous spatial path in the air during Quick Attack (Up-B),
   * connecting from the start of the jump to the current position across 1 or 2 straight lines.
   */
  private drawPikachuQuickAttackStreak(
    camera: Camera,
    port: PortIndex,
    replay: Replay,
    frameIndex: number,
  ): void {
    drawPikachuQuickAttackStreak(this.ctx, camera, port, replay, frameIndex);
  }

  private drawQuickAttackOverlay(
    camera: Camera,
    paths: QuickAttackPath[],
    hoveredIndex: number | null,
  ): void {
    drawQuickAttackOverlay(this.ctx, camera, paths, hoveredIndex);
  }

  private drawFoxSpecial(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    color: string,
    specialType: FoxSpecialType,
    frameCounter: number,
    flightAngle?: number | null,
  ): void {
    drawFoxSpecial(
      this.ctx,
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      specialType,
      frameCounter,
      flightAngle,
    );
  }

  /**
   * Traces a continuous bright white/silver motion trail ribbon spanning the character's height
   * extending behind the character's edge as they roll.
   */
  private drawRollTrail(
    camera: Camera,
    port: PortIndex,
    replay: Replay,
    frameIndex: number,
  ): void {
    drawRollTrail(this.ctx, camera, port, replay, frameIndex);
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
