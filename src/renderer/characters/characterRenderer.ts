import { isHitstunState } from "../../edgeGuard.js";
export interface RecoveryJumpMark {
  readonly frame: number;
  readonly worldX: number;
  readonly worldY: number;
  readonly jumpsRemaining: number;
}
import type { Camera } from "../../camera.js";
import type { PortIndex, Replay } from "@rmg-k/rmgr";
import {
  type BackgroundTheme,
  type CharacterAnimState,
  hexToRgba,
  isTurnState,
  isShieldState,
  isShieldStunState,
  isGrabbedState,
  isEggEncasedState,
  getAttackInfo,
  canAngleAttack,
  getFalconSpecialType,
  getPikachuSpecialType,
  getFoxSpecialType,
  getFoxFlightAngle,
  getYoshiSpecialType,
  getDKSpecialType,
  getNessSpecialType,
  getMarioSpecialType,
  getSamusSpecialType,
  getLinkSpecialType,
  getKirbySpecialType,
  getJigglypuffSpecialType,
  isTechRollState,
  isTechInPlaceState,
  isRollState,
  isTumbleState,
  isDownBoundState,
  isProneState,
  isTauntState,
  isSpecialState,
  isLandingState,
  isLightLandingState,
  isHeavyLandingState,
  isDizzyState,
  isSleepState,
  isIdleState,
  isWalkState,
  isDashOrRunState,
  isCrouchState,
  isJumpSquatState,
  isShieldDropState,
  isShieldBreakFlyState,
  isVulnerableStunState,
  isReviveState,
  isQuickAttackLandingState,
  isTeeterState,
  isPikachuCharacter,
  isFalconCharacter,
  isMarioCharacter,
  isLuigiCharacter,
  isKirbyCharacter,
  isJigglypuffCharacter,
  isFoxCharacter,
  isYoshiCharacter,
  isDonkeyKongCharacter,
  isLinkCharacter,
  isNessCharacter,
  isSamusCharacter,
  isBowserCharacter,
  getStartNameAlpha,
} from "../common/index.js";
import {
  getPlayerColor,
  PORT_LABELS,
  MAIN_PLAYER_COLOR,
  OPPONENT_COLOR,
} from "../../players.js";
import { characterSize } from "../../characterSizes.js";
import { actionStateName } from "../../lookups.js";
import type { RecoveryVerdictFrame } from "../../recoveryVerdicts.js";
import { drawGrabbedBrackets } from "./capsuleRenderer.js";
import {
  drawShieldBubble,
  drawShieldBreakPop,
  SHIELD_BREAK_POP_FRAMES,
} from "./shieldRenderer.js";
import {
  drawDizzyStars,
  drawSleepZzz,
  drawTumbleAura,
  drawMissedTechBounce,
  drawTechBreakfall,
  drawTechRollSpeedLines,
  drawJumpSquatFx,
} from "./statusAuras.js";
import {
  drawPlayerNameTag,
  drawPlayerStateInfo,
  drawRecoveryJumpCount,
  drawChargeMeter,
} from "./hudRenderer.js";
import { drawAttackArc } from "./attackArc.js";
import { drawYoshiEggShell } from "./yoshiEgg.js";
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
} from "../../characters/original/index.js";
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
} from "../../characters/remix/index.js";
import {
  drawFalconSpecial,
  drawPikachuSpecial,
  drawFoxSpecial,
  drawYoshiSpecial,
  drawDKSpecial,
  drawNessSpecial,
  drawMarioSpecial,
  drawSamusSpecial,
  drawLinkSpecial,
  drawKirbySpecial,
  drawJigglypuffSpecial,
} from "../../characters/specials/index.js";
import {
  createSilhouetteContext,
  getComboEscapeSilhouetteColors,
  getHitstunSilhouetteColors,
  drawComboEscapeTextCallout,
} from "./comboEscapeGapRenderer.js";
import {
  drawReviveCloud,
  drawReviveCloudDissipating,
  CLOUD_DISSIPATE_FRAMES,
} from "./reviveCloud.js";

export interface ReviveCloudExit {
  exitFrame: number;
  worldX: number;
  worldY: number;
  characterId: number;
}

export interface ShieldBreakEvent {
  startFrame: number;
  worldX: number;
  worldY: number;
  characterId: number;
}

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  rawBackgroundTheme: BackgroundTheme,
  isLight: boolean,
  getCharacterIconImage: (characterId: number) => HTMLImageElement | null,
  getFramesSinceSpawn: (replay: Replay, frameIndex: number) => number,
  getMostRecentRecoveryJump: (
    replay: Replay,
    port: PortIndex,
    frameIndex: number,
  ) => RecoveryJumpMark | null,
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
  getMostRecentReviveExit?: (
    replay: Replay,
    port: PortIndex,
    frameIndex: number,
  ) => ReviveCloudExit | null,
  getMostRecentShieldBreak?: (
    replay: Replay,
    port: PortIndex,
    frameIndex: number,
  ) => ShieldBreakEvent | null,
): void {
  // In daylight mode on mountain (cherry tree) theme, fighters are illuminated with
  // standard daylight colors rather than nocturnal moonlit skins.
  const backgroundTheme: BackgroundTheme =
    rawBackgroundTheme === "mountain" && isLight ? "grid" : rawBackgroundTheme;

  // positionY is the character's foot position, not their center - Teeter
  // samples land exactly on platform surface Y (see stageGeometry.ts), so
  // the marker's bottom edge (not its middle) belongs at y.
  const { x, y } = camera.worldToScreen(post.positionX, post.positionY);
  const color = getPlayerColor(port, perspectivePort);
  const turning = isTurnState(post.actionStateId);
  // Smooth 3D-like yaw rotation around the vertical axis during turnaround (0 -> pi radians)
  // Every frame within the turn state is an intermediate distorted phase between +100% and -100%.
  // Frame 0: ~90% (initial turn inward) ... Midway: 0% (edge-on) ... Last Turn frame: ~90% (finishing turn) ... Next state: 100%
  let effectiveDir = post.facingDirection;
  if (turning) {
    const turnTotalFrames = post.actionStateId === 0x013 ? 5 : 6;
    const progress = Math.min(
      1,
      Math.max(0, (post.actionFrameCounter + 1) / (turnTotalFrames + 1)),
    );
    const turnScale = Math.cos(progress * Math.PI);
    if (post.actionStateId === 0x012 && post.actionFrameCounter >= 5) {
      // facingDirection has already flipped to the new direction in the engine on frame 5+
      effectiveDir = post.facingDirection * Math.abs(turnScale);
    } else {
      effectiveDir = post.facingDirection * turnScale;
    }
  }
  const facingRight = effectiveDir >= 0;

  const size = characterSize(post.characterId);
  const crouching = isCrouchState(post.actionStateId);
  const heightPx = camera.worldLengthToScreen(
    size.height * (crouching ? 0.5 : 1.0),
  );
  const halfWidth = camera.worldLengthToScreen(size.width) / 2;
  const centerY = y - heightPx / 2;
  const topY = y - heightPx;
  const noseY = centerY;

  // Default label vertical position is generously above the character model
  let labelY = topY - 18;

  // Check shield state for label vertical offset
  const shielding = isShieldState(post.actionStateId);
  const shieldStun = isShieldStunState(post.actionStateId);
  if (shielding) {
    const health = post.shieldHealth !== undefined ? post.shieldHealth : 55;
    const healthRatio = Math.max(0, Math.min(1, health / 55));
    const radiusScale = 0.48 + 0.52 * healthRatio;
    const shieldRadius =
      (Math.max(halfWidth * 1.35, heightPx * 0.58) + 3) * radiusScale;
    labelY = Math.min(labelY, centerY - shieldRadius - (isPaused ? 30 : 16));
  }

  // Draw capture lock brackets if character is trapped in a grab
  const grabbed = isGrabbedState(post.actionStateId);
  if (grabbed) {
    drawGrabbedBrackets(ctx, x, topY, y, halfWidth);
  }

  // Check attacks and specials for label offsets and rendering
  const attack = getAttackInfo(post.actionStateId, post.characterId);
  if (attack) {
    if (attack.direction === "up" || attack.direction === "neutral") {
      const baseRadius = Math.max(halfWidth, heightPx * 0.5);
      const topRadius =
        attack.type === "smash" ? baseRadius * 2.2 : baseRadius * 1.55;
      labelY = Math.min(labelY, centerY - topRadius - 16);
    }
  }

  const falconSpecial = getFalconSpecialType(
    post.characterId,
    post.actionStateId,
  );
  if (falconSpecial === "dive_reach" || falconSpecial === "dive_explosion") {
    labelY = Math.min(labelY, centerY - heightPx * 0.85 - 16);
  }

  const pikaSpecial = getPikachuSpecialType(
    post.characterId,
    post.actionStateId,
  );

  const foxSpecial = getFoxSpecialType(post.characterId, post.actionStateId);
  const flightAngle =
    foxSpecial === "firefox_fly"
      ? getFoxFlightAngle(replay, frameIndex, port, post)
      : null;
  if (
    foxSpecial === "shine_start" ||
    foxSpecial === "shine_loop" ||
    foxSpecial === "shine_hit" ||
    foxSpecial === "shine_end" ||
    foxSpecial === "firefox_charge"
  ) {
    labelY = Math.min(labelY, centerY - heightPx * 0.85 - 16);
  }

  const yoshiSpecial = getYoshiSpecialType(
    post.characterId,
    post.actionStateId,
  );

  const dkSpecial = getDKSpecialType(post.characterId, post.actionStateId);

  const nessSpecial = getNessSpecialType(post.characterId, post.actionStateId);
  if (nessSpecial === "pk_thunder_charge" || nessSpecial === "psi_magnet") {
    labelY = Math.min(labelY, centerY - heightPx * 0.9 - 16);
  }

  const marioSpecial = getMarioSpecialType(
    post.characterId,
    post.actionStateId,
  );

  const samusSpecial = getSamusSpecialType(
    post.characterId,
    post.actionStateId,
  );
  if (samusSpecial === "screw_attack") {
    labelY = Math.min(labelY, centerY - heightPx * 0.85 - 16);
  }

  const linkSpecial = getLinkSpecialType(post.characterId, post.actionStateId);
  if (linkSpecial === "spin_attack") {
    labelY = Math.min(labelY, centerY - heightPx * 0.85 - 16);
  }

  const kirbySpecial = getKirbySpecialType(
    post.characterId,
    post.actionStateId,
  );

  const puffSpecial = getJigglypuffSpecialType(
    post.characterId,
    post.actionStateId,
  );
  if (puffSpecial === "sing" || puffSpecial === "rest") {
    labelY = Math.min(labelY, centerY - heightPx * 0.85 - 16);
  }

  const isTechRoll = isTechRollState(post.actionStateId);
  const isTechInPlace = isTechInPlaceState(post.actionStateId);
  const isRoll = isRollState(post.actionStateId);
  const isTumble = isTumbleState(post.actionStateId);
  const isDownBound = isDownBoundState(post.actionStateId);
  const isProne = isProneState(post.actionStateId);
  const isInvulnerable =
    (isRoll || isTechInPlace || isProne) && post.hurtboxState === 0x03;

  const taunting = isTauntState(post.actionStateId);
  let triangleColor = color;

  if (taunting) {
    // Smoothly cycle through colors across the rainbow spectrum
    const hue = (post.actionFrameCounter * 10) % 360;
    triangleColor = `hsl(${hue}, 85%, 55%)`;
  } else if (isTechRoll) {
    // High-speed cyan/teal ghost appearance for tech roll
    triangleColor = hexToRgba("#06b6d4", 0.5);
  } else if (isRoll) {
    // Ethereal / semi-translucent ghost appearance for the entire roll state
    triangleColor = hexToRgba(color, 0.45);
  }

  const inHitstun = isHitstunState(
    post.actionStateId,
    post.hitstunCounter ?? 0,
  );
  const inCombo = inHitstun || (post.comboHitCount ?? 0) > 0;
  const comboHits = inHitstun ? (post.comboHitCount ?? 0) : 0;
  const isSpecial = isSpecialState(post.actionStateId);
  const isLanding = isLandingState(post.actionStateId);
  const isLightLanding = isLightLandingState(post.actionStateId);
  const isHeavyLanding = isHeavyLandingState(post.actionStateId);
  const isSpecialLandingLag = isQuickAttackLandingState(post.actionStateId);
  const isDizzy = isDizzyState(post.actionStateId);
  const isSleep = isSleepState(post.actionStateId);
  const isJumpSquat = isJumpSquatState(post.actionStateId);
  const isShieldDrop = isShieldDropState(post.actionStateId);
  const isOpponent =
    perspectivePort !== null &&
    perspectivePort !== undefined &&
    port !== perspectivePort;

  if (isProne) {
    labelY = y - 28;
  } else if (isDizzy) {
    labelY = Math.min(labelY, topY - 36);
  }

  const hasYoshiSuperArmor =
    isYoshiCharacter(post.characterId) &&
    (post.knockbackResist !== undefined
      ? post.knockbackResist > 0
      : post.actionStateId === 0x018 || post.actionStateId === 0x019);

  const animState: CharacterAnimState = {
    taunting,
    inCombo,
    isRoll,
    isTechRoll,
    isTechInPlace,
    isTumble,
    isProne,
    isDownBound,
    isInvulnerable,
    isSpecial,
    isLanding: isLanding || isSpecialLandingLag,
    isHeavyLanding: isHeavyLanding || isSpecialLandingLag,
    isDizzy,
    isSleep,
    isOpponent,
    actionFrameCounter: post.actionFrameCounter,
    isSuperArmor: hasYoshiSuperArmor,
  };

  // Revival Cloud Platform: fighter stands on a fluffy cumulus cloud during Revive1 (0x007), Revive2 (0x008), and ReviveWait (0x009).
  // When departing, the cloud dissipates at the platform world position over CLOUD_DISSIPATE_FRAMES.
  if (isReviveState(post.actionStateId)) {
    drawReviveCloud(ctx, x, y, halfWidth, post.actionFrameCounter, isLight);
  } else if (replay && frameIndex !== undefined && getMostRecentReviveExit) {
    const exit = getMostRecentReviveExit(replay, port, frameIndex);
    if (exit) {
      const framesSinceExit = frameIndex - exit.exitFrame;
      if (framesSinceExit >= 0 && framesSinceExit < CLOUD_DISSIPATE_FRAMES) {
        const cloudScreen = camera.worldToScreen(exit.worldX, exit.worldY);
        const cloudSize = characterSize(exit.characterId);
        const cloudHalfWidth = camera.worldLengthToScreen(cloudSize.width) / 2;
        drawReviveCloudDissipating(
          ctx,
          cloudScreen.x,
          cloudScreen.y,
          cloudHalfWidth,
          framesSinceExit,
          isLight,
        );
      }
    }
  }

  ctx.save();
  if (isDizzy) {
    // Exaggerated dizzy swaying / reeling from side to side around the feet pivot (x, y)
    // Classic Smash 64 FuraFura staggering motion
    const swayPeriod = 0.16;
    const swayAngle = Math.sin(post.actionFrameCounter * swayPeriod) * 0.18; // ~10.3 deg sway
    const swayX =
      Math.sin(post.actionFrameCounter * swayPeriod) * (halfWidth * 0.25);
    ctx.translate(x + swayX, y);
    ctx.rotate(swayAngle);
    ctx.translate(-x, -y);
  } else if (isSleep) {
    // Gentle breathing rhythmic bobbing while asleep
    const sleepBobY = Math.sin(post.actionFrameCounter * 0.08) * 2;
    ctx.translate(0, sleepBobY);
  } else if (isTumble) {
    // Dynamic cartwheel spin during tumble reeling
    const spinSpeed = 0.22;
    const spinAngle =
      post.actionFrameCounter * spinSpeed * (facingRight ? 1 : -1);
    ctx.translate(x, centerY);
    ctx.rotate(spinAngle);
    ctx.translate(-x, -centerY);
  } else if (isProne) {
    // Flattened prone against stage floor at feet pivot (x, y)
    ctx.translate(x, y);
    ctx.scale(1.35, 0.35);
    ctx.translate(-x, -y);
  } else if (isIdleState(post.actionStateId)) {
    // Subtle organic breathing stance rhythm
    const breath = Math.sin(post.actionFrameCounter * 0.12);
    const bobY = breath * 1.5;
    const scaleX = 1 + breath * 0.025;
    const scaleY = 1 - breath * 0.025;
    ctx.translate(x, y);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-x, -y + bobY);
  } else if (isWalkState(post.actionStateId)) {
    // Walking stride bob & tilt
    const walkPhase = post.actionFrameCounter * 0.25;
    const walkBob = Math.abs(Math.sin(walkPhase)) * 2;
    const walkTilt = Math.sin(walkPhase) * 0.06 * (facingRight ? 1 : -1);
    ctx.translate(x, y);
    ctx.rotate(walkTilt);
    ctx.translate(-x, -y + walkBob);
  } else if (isDashOrRunState(post.actionStateId)) {
    // Dynamic running forward lean & stride bounce
    const runPhase = post.actionFrameCounter * 0.35;
    const runBounce = Math.abs(Math.sin(runPhase)) * 2.5;
    const runLean = 0.14 * (facingRight ? 1 : -1);
    ctx.translate(x, y);
    ctx.rotate(runLean);
    ctx.translate(-x, -y + runBounce);
  } else if (isCrouchState(post.actionStateId)) {
    // Compressed crouch stance
    ctx.translate(x, y);
    ctx.scale(1.15, 0.72);
    ctx.translate(-x, -y);
  } else if (isJumpSquat) {
    // Dynamic jumpsquat spring-compression (coiling downward in anticipation of liftoff)
    const f = post.actionFrameCounter;
    const compression = Math.min(1.0, 0.65 + f * 0.12);
    const scaleY = 1.0 - 0.32 * compression;
    const scaleX = 1.0 + 0.22 * compression;
    ctx.translate(x, y);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-x, -y);
  } else if (isShieldDrop) {
    // Platform drop-through from shield (0x022) squatting compression
    const f = post.actionFrameCounter;
    const compression = Math.min(1.0, 0.7 + f * 0.1);
    const scaleY = 1.0 - 0.3 * compression;
    const scaleX = 1.0 + 0.2 * compression;
    ctx.translate(x, y);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-x, -y);
  } else if (isHeavyLanding) {
    // Heavy landing (0x020) impact squat: compresses downward upon hitting the ground and eases back up
    const f = post.actionFrameCounter;
    const impact = Math.max(0, 1.0 - f * 0.2);
    const scaleY = 1.0 - 0.35 * impact;
    const scaleX = 1.0 + 0.25 * impact;
    ctx.translate(x, y);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-x, -y);
  } else if (isLightLanding) {
    // Light landing (0x01f) impact squat: 4 frames total
    const f = post.actionFrameCounter;
    const impact = Math.max(0, 1.0 - f * 0.25);
    const scaleY = 1.0 - 0.22 * impact;
    const scaleX = 1.0 + 0.16 * impact;
    ctx.translate(x, y);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-x, -y);
  } else if (isSpecialLandingLag) {
    // Special landing lag (0x0ea, e.g. Pikachu Quick Attack landing lag ~40 frames):
    // Heavy impact compression on landing, followed by persistent vulnerable squatting
    // that holds while helpless and smoothly eases back up as the 40+ frames conclude.
    const f = post.actionFrameCounter;
    const impact = Math.max(0, 1.0 - f * 0.2);
    const recoveryProgress = Math.min(1.0, f / 40);
    const squatHold = Math.max(0, 1.0 - Math.pow(recoveryProgress, 2.5));
    const compression = Math.max(0.6 * squatHold, impact);
    const scaleY = 1.0 - 0.32 * compression;
    const scaleX = 1.0 + 0.22 * compression;
    ctx.translate(x, y);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-x, -y);
  } else if (isTeeterState(post.actionStateId)) {
    // Teetering ledge balance sway
    const teeterAngle = Math.sin(post.actionFrameCounter * 0.28) * 0.14;
    ctx.translate(x, y);
    ctx.rotate(teeterAngle);
    ctx.translate(-x, -y);
  }

  // Apply theme-adaptive silhouette proxy:
  // - Yellow silhouette when actionable during a combo gap
  // - Red silhouette when in hitstun or vulnerable stun (0x0a0 ShieldBreakDownBound, 0x0a4 Stun)
  const originalCtx = ctx;
  const isGapSilhouette = Boolean(comboEscapeState?.isActionableFrame);
  const isVulnerableStun = isVulnerableStunState(post.actionStateId);
  const isHitstunSilhouette = inHitstun || isVulnerableStun;
  const isSilhouette = isGapSilhouette || isHitstunSilhouette;
  if (isSilhouette) {
    const silColors = isGapSilhouette
      ? getComboEscapeSilhouetteColors(backgroundTheme, isLight)
      : getHitstunSilhouetteColors(backgroundTheme, isLight);
    ctx.save();
    ctx.shadowColor = silColors.glow;
    ctx.shadowBlur = 12;
    ctx = createSilhouetteContext(
      originalCtx,
      silColors.fill,
      silColors.stroke,
    );
  }

  try {
    if (isEggEncasedState(post.actionStateId)) {
      drawYoshiEggShell(ctx, x, centerY, halfWidth, heightPx);
    } else if (post.characterId === 0x1d) {
      drawFalcoPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x1e) {
      drawGanondorfPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x1f) {
      drawYoungLinkPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x20) {
      drawDrMarioPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x21) {
      drawWarioPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x22) {
      drawDarkSamusPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x26) {
      drawLucasPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x35) {
      drawGigaBowserPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x36) {
      drawPianoPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x37) {
      drawWolfPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x38) {
      drawConkerPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x39) {
      drawMewtwoPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x3a) {
      drawMarthPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x3b) {
      drawSonicPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x3c) {
      drawSandbagPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x3d) {
      drawSuperSonicPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x3e) {
      drawSheikPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x3f) {
      drawMarinaPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x40) {
      drawDededePolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x41) {
      drawGoemonPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x42) {
      drawPeppyPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x43) {
      drawSlippyPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x44) {
      drawBanjoPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x45) {
      drawMetalLuigiPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x46) {
      drawEbisumaruPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x47) {
      drawDragonKingPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x48) {
      drawCrashPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x49) {
      drawPeachPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x4a) {
      drawRoyPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x4b) {
      drawDrLuigiPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (post.characterId === 0x4c) {
      drawLankyKongPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isPikachuCharacter(post.characterId)) {
      drawPikachuPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isFalconCharacter(post.characterId)) {
      drawFalconPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isMarioCharacter(post.characterId)) {
      drawMarioPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isLuigiCharacter(post.characterId)) {
      drawLuigiPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isKirbyCharacter(post.characterId)) {
      drawKirbyPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isJigglypuffCharacter(post.characterId)) {
      drawJigglypuffPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isFoxCharacter(post.characterId)) {
      drawFoxPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isYoshiCharacter(post.characterId)) {
      drawYoshiPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isDonkeyKongCharacter(post.characterId)) {
      drawDonkeyKongPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isLinkCharacter(post.characterId)) {
      drawLinkPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isNessCharacter(post.characterId)) {
      drawNessPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isSamusCharacter(post.characterId)) {
      drawSamusPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else if (isBowserCharacter(post.characterId)) {
      drawBowserPolygons(
        ctx,
        backgroundTheme,
        x,
        y,
        topY,
        centerY,
        halfWidth,
        heightPx,
        effectiveDir,
        color,
        animState,
      );
    } else {
      // Isosceles triangle, nose pointing in the facing direction, feet at y and head at topY.
      const triX =
        inCombo && !taunting
          ? x + (post.actionFrameCounter % 2 === 0 ? 1.2 : -1.2)
          : x;
      const noseX = triX + effectiveDir * halfWidth;
      const backX = triX - effectiveDir * halfWidth;

      ctx.save();
      if (taunting) {
        // Spin triangle continuously around its geometric center (x, centerY)
        const spinAngle =
          post.actionFrameCounter * 0.125 * (facingRight ? 1 : -1);
        ctx.translate(x, centerY);
        ctx.rotate(spinAngle);
        ctx.translate(-x, -centerY);
      }

      ctx.beginPath();
      ctx.moveTo(noseX, noseY);
      ctx.lineTo(backX, topY);
      ctx.lineTo(backX, y);
      ctx.closePath();
      ctx.fillStyle = triangleColor;
      ctx.fill();

      if (inCombo && !isSilhouette) {
        // Active hitstun / combo electric outline & outer glow (taking damage)
        ctx.save();
        ctx.strokeStyle = "rgba(255, 60, 40, 0.95)";
        ctx.lineWidth = 5.0; // 2x thicker for legibility
        ctx.shadowColor = "rgba(255, 120, 0, 0.85)";
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(noseX, noseY);
        ctx.lineTo(backX, topY);
        ctx.lineTo(backX, y);
        ctx.closePath();
        ctx.strokeStyle = "rgba(255, 220, 180, 0.9)";
        ctx.lineWidth = 1.8;
        ctx.stroke();
      } else if (isTechRoll) {
        // High-speed vibrant cyan/teal tech roll aura
        ctx.save();
        ctx.strokeStyle = isInvulnerable
          ? "rgba(34, 211, 238, 0.95)"
          : "rgba(6, 182, 212, 0.9)";
        ctx.lineWidth = 2.8;
        ctx.shadowColor = "rgba(6, 182, 212, 0.85)";
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(noseX, noseY);
        ctx.lineTo(backX, topY);
        ctx.lineTo(backX, y);
        ctx.closePath();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.lineWidth = 1.4;
        ctx.stroke();
      } else {
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.restore();
    }
  } finally {
    if (isSilhouette) {
      originalCtx.restore();
      ctx = originalCtx;
    }
  }
  ctx.restore(); // Closes the character sway/bob/tumble/prone transform

  // Draw attack arc / grab on top (in front) of character body
  if (attack) {
    const joystick =
      replay && frameIndex !== undefined
        ? replay.frames[frameIndex]?.ports[port]?.input
        : null;
    const angleable = canAngleAttack(post.characterId, attack);

    drawAttackArc(
      ctx,
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      attack,
      joystick ? { x: joystick.stickX, y: joystick.stickY } : null,
      angleable,
      post.actionFrameCounter,
    );
  }

  // Draw special move visuals in front of character body
  if (falconSpecial) {
    drawFalconSpecial(
      ctx,
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      falconSpecial,
      post.actionFrameCounter,
    );
  }
  if (pikaSpecial && !isSpecialLandingLag) {
    drawPikachuSpecial(
      ctx,
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      pikaSpecial,
    );
  }
  if (foxSpecial) {
    drawFoxSpecial(
      ctx,
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      foxSpecial,
      post.actionFrameCounter,
      flightAngle,
    );
  }
  if (yoshiSpecial) {
    drawYoshiSpecial(
      ctx,
      x,
      y,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      yoshiSpecial,
      post.actionFrameCounter,
    );
  }
  if (dkSpecial) {
    drawDKSpecial(
      ctx,
      backgroundTheme,
      x,
      y,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      dkSpecial,
      post.actionFrameCounter,
      post.characterSpecific,
    );
  }
  if (nessSpecial) {
    drawNessSpecial(
      ctx,
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      nessSpecial,
      post.actionFrameCounter,
    );
  }
  if (marioSpecial) {
    drawMarioSpecial(
      ctx,
      x,
      y,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      isLuigiCharacter(post.characterId),
      marioSpecial,
      post.actionFrameCounter,
    );
  }
  if (samusSpecial) {
    drawSamusSpecial(
      ctx,
      camera,
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      samusSpecial,
      post.actionFrameCounter,
      post.characterSpecific,
    );
  }
  if (linkSpecial) {
    drawLinkSpecial(
      ctx,
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      linkSpecial,
      post.actionFrameCounter,
    );
  }
  if (kirbySpecial) {
    drawKirbySpecial(
      ctx,
      x,
      y,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      kirbySpecial,
      post.actionFrameCounter,
      post.actionStateId,
    );
  }
  if (puffSpecial) {
    drawJigglypuffSpecial(
      ctx,
      x,
      centerY,
      halfWidth,
      heightPx,
      facingRight,
      color,
      puffSpecial,
      post.actionFrameCounter,
      post.actionStateId,
    );
  }

  if (shielding) {
    drawShieldBubble(
      ctx,
      x,
      centerY,
      halfWidth,
      heightPx,
      color,
      shieldStun,
      post.actionFrameCounter,
      post.shieldHealth,
      isPaused,
    );
  } else {
    // Shield Break Pop Animation:
    // When a shield breaks (player enters ShieldBreakFly 0x09e), the shield bursts into an
    // explosive pop of shockwaves, ruby crystal shards, and spark flecks over SHIELD_BREAK_POP_FRAMES (24 frames).
    // The animation stays centered at the single point in world space where the shield break began,
    // rather than translating vertically with the airborne fighter as they shoot upward.
    let popCenterX = x;
    let popCenterY = centerY;
    let popHalfWidth = halfWidth;
    let popHeightPx = heightPx;
    let popFrame = post.actionFrameCounter;
    let shouldDrawPop = false;

    if (replay && frameIndex !== undefined && getMostRecentShieldBreak) {
      const breakEvent = getMostRecentShieldBreak(replay, port, frameIndex);
      if (breakEvent) {
        const elapsed = frameIndex - breakEvent.startFrame;
        if (elapsed >= 0 && elapsed < SHIELD_BREAK_POP_FRAMES) {
          shouldDrawPop = true;
          popFrame = elapsed;
          const bSize = characterSize(breakEvent.characterId);
          const bScreen = camera.worldToScreen(
            breakEvent.worldX,
            breakEvent.worldY + bSize.height / 2,
          );
          popCenterX = bScreen.x;
          popCenterY = bScreen.y;
          popHalfWidth = camera.worldLengthToScreen(bSize.width) / 2;
          popHeightPx = camera.worldLengthToScreen(bSize.height);
        }
      } else if (
        isShieldBreakFlyState(post.actionStateId) &&
        post.actionFrameCounter < SHIELD_BREAK_POP_FRAMES
      ) {
        shouldDrawPop = true;
        popCenterX = x;
        popCenterY = centerY;
        popHalfWidth = halfWidth;
        popHeightPx = heightPx;
        popFrame = post.actionFrameCounter;
      }
    } else if (
      isShieldBreakFlyState(post.actionStateId) &&
      post.actionFrameCounter < SHIELD_BREAK_POP_FRAMES
    ) {
      shouldDrawPop = true;
      popCenterX = x;
      popCenterY = centerY;
      popHalfWidth = halfWidth;
      popHeightPx = heightPx;
      popFrame = post.actionFrameCounter;
    }

    if (shouldDrawPop) {
      drawShieldBreakPop(
        ctx,
        popCenterX,
        popCenterY,
        popHalfWidth,
        popHeightPx,
        color,
        popFrame,
        isLight,
      );
    }
  }

  if (isDizzy) {
    // 3 glowing golden stars orbiting in 3D ellipse above character's head
    drawDizzyStars(ctx, x, topY - 6, post.actionFrameCounter, isOpponent);
  } else if (isSleep) {
    // Floating "Z z z" sleep bubbles
    drawSleepZzz(
      ctx,
      x + halfWidth * 0.5,
      topY - 4,
      post.actionFrameCounter,
      isOpponent,
    );
  } else if (isTumble) {
    // Swirling wind/motion streaks indicating unstable free-fall reeling
    drawTumbleAura(
      ctx,
      x,
      centerY,
      halfWidth,
      post.actionFrameCounter,
      isOpponent,
    );
  } else if (isDownBound) {
    // Ground impact dust shockwave and sparks on missed tech floor bounce
    drawMissedTechBounce(
      ctx,
      x,
      y,
      halfWidth,
      post.actionFrameCounter,
      isOpponent,
    );
  } else if (isTechInPlace) {
    // Breakfall ground flash and upward recovery burst on tech in place
    drawTechBreakfall(
      ctx,
      x,
      y,
      halfWidth,
      post.actionFrameCounter,
      isOpponent,
    );
  } else if (isTechRoll) {
    if (post.actionFrameCounter < 10) {
      drawTechBreakfall(
        ctx,
        x,
        y,
        halfWidth,
        post.actionFrameCounter,
        isOpponent,
      );
    }
    drawTechRollSpeedLines(
      ctx,
      x,
      y,
      topY,
      effectiveDir,
      halfWidth,
      post.actionFrameCounter,
      isOpponent,
    );
  }

  if (isJumpSquat) {
    drawJumpSquatFx(
      ctx,
      x,
      y,
      halfWidth,
      heightPx,
      post.actionFrameCounter,
      color,
      isOpponent,
    );
  }

  // Damage% label above the triangle, in the player's color (or cycling if taunting).
  ctx.font = "bold 15px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = taunting ? triangleColor : color;
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 4;
  ctx.fillText(`${post.damagePercent}%`, x, labelY);
  ctx.shadowBlur = 0;

  // Recovery classifier says this port can neither land on stage nor grab
  // the ledge from here -- a doomed recovery. See computeRecoveryVerdictFrames().
  if (recoveryVerdict?.verdict === "dead") {
    ctx.save();
    ctx.font = "20px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = 4;
    ctx.fillText("💀", x, labelY - 22);
    ctx.restore();
  }

  // Active combo hits count (large punchy number) if 2 or more hits in combo
  if (comboHits >= 2) {
    const comboText = `${comboHits}`;
    const comboY = labelY - 20;

    ctx.save();
    ctx.font = "900 20px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Dark outline for contrast
    ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
    ctx.lineWidth = 3.5;
    ctx.lineJoin = "round";
    ctx.strokeText(comboText, x, comboY);

    // Energetic red-orange fill with glowing aura
    ctx.fillStyle = "#ff453a";
    ctx.shadowColor = "rgba(255, 69, 58, 0.85)";
    ctx.shadowBlur = 6;
    ctx.fillText(comboText, x, comboY);
    ctx.restore();
  }

  // Floating "XF gap" badge beside fighter during actionable combo gap and subsequent fade-out
  if (comboEscapeState && comboEscapeState.fadeAlpha > 0.01) {
    const calloutX =
      comboEscapeState.anchorWorldX !== undefined
        ? camera.worldToScreen(
            comboEscapeState.anchorWorldX,
            comboEscapeState.anchorWorldY ?? 0,
          ).x
        : x;
    const calloutY =
      comboEscapeState.anchorWorldY !== undefined
        ? camera.worldToScreen(
            comboEscapeState.anchorWorldX ?? 0,
            comboEscapeState.anchorWorldY,
          ).y
        : y;
    const calloutCenterY = calloutY - heightPx / 2;
    const calloutFacingRight =
      comboEscapeState.anchorFacingRight !== undefined
        ? comboEscapeState.anchorFacingRight
        : facingRight;

    drawComboEscapeTextCallout(
      ctx,
      calloutX,
      calloutCenterY,
      halfWidth,
      heightPx,
      calloutFacingRight,
      comboEscapeState.actionableFrameCount,
      comboEscapeState.fadeAlpha,
    );
  }

  // Player name + stock tag, shown at match start and again (for every
  // player, not just the one who respawned) for a few seconds after any
  // respawn (fades out after initial frames) - and persistently, at full
  // opacity, whenever playback is paused.
  const framesSinceSpawn =
    replay && frameIndex !== undefined
      ? getFramesSinceSpawn(replay, frameIndex)
      : frameIndex;
  const nameAlpha = isPaused ? 1 : getStartNameAlpha(framesSinceSpawn);
  if (nameAlpha > 0) {
    const rawName = replay?.matchStart?.playerNames?.[port]?.trim();
    const playerName =
      rawName && rawName.length > 0 ? rawName : PORT_LABELS[port];
    const hasPerspective =
      perspectivePort !== null && perspectivePort !== undefined;
    const isPerspective = hasPerspective && port === perspectivePort;
    const tagColor = hasPerspective
      ? isPerspective
        ? MAIN_PLAYER_COLOR
        : OPPONENT_COLOR
      : getPlayerColor(port, perspectivePort);

    const nameTagBottomY = comboHits >= 2 ? labelY - 38 : labelY - 20;
    drawPlayerNameTag(
      ctx,
      x,
      nameTagBottomY,
      playerName,
      tagColor,
      isPerspective,
      nameAlpha,
      post.characterId,
      post.stocksRemaining + 1,
      getCharacterIconImage,
    );
  }

  // Action state name/ID + position readout, shown below the character
  // only while playback is paused - a paused frame is exactly when this
  // level of detail (otherwise only in the sidebar panel) is useful to
  // read without it constantly changing underneath you.
  if (isPaused && !suppressPauseHud) {
    const tagColor = getPlayerColor(port, perspectivePort);
    const armorForHud =
      post.knockbackResist !== undefined
        ? post.knockbackResist
        : (post.actionStateId === 0x018 || post.actionStateId === 0x019) &&
            isYoshiCharacter(post.characterId)
          ? 140
          : undefined;
    drawPlayerStateInfo(
      ctx,
      x,
      y,
      actionStateName(post.actionStateId),
      post.actionStateId,
      post.positionX,
      post.positionY,
      tagColor,
      armorForHud,
    );
  }

  // Remaining jump count, floating above where a Kirby/Jigglypuff jumped
  // (fixed in place, not tracking them as they keep moving) for a
  // second after each jump while they're off-stage recovering - both
  // characters' jump counts are easy to lose track of mid-recovery.
  if (
    (isKirbyCharacter(post.characterId) ||
      isJigglypuffCharacter(post.characterId)) &&
    replay &&
    frameIndex !== undefined
  ) {
    const jumpMark = getMostRecentRecoveryJump(replay, port, frameIndex);
    const RECOVERY_JUMP_DISPLAY_FRAMES = 60; // 1.0s @ 60fps
    if (jumpMark) {
      const framesSinceJump = frameIndex - jumpMark.frame;
      if (framesSinceJump < RECOVERY_JUMP_DISPLAY_FRAMES) {
        const jumpCountAlpha =
          1 - framesSinceJump / RECOVERY_JUMP_DISPLAY_FRAMES;
        const jumpScreen = camera.worldToScreen(
          jumpMark.worldX,
          jumpMark.worldY,
        );
        drawRecoveryJumpCount(
          ctx,
          jumpScreen.x,
          jumpScreen.y - 90,
          jumpMark.jumpsRemaining,
          color,
          jumpCountAlpha,
        );
      }
    }
  }

  // Battery-style charge meter for Samus and DK (recorder schema 2+)
  drawChargeMeter(
    ctx,
    isLight,

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
