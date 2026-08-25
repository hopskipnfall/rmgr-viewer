import type { Frame, PortIndex, Replay } from "@rmg-k/rmgr";
import { Camera } from "./camera.js";
import { PORT_COLORS } from "./players.js";
import {
  stageGeometry,
  stageBlastZone,
  type PlatformSpec,
} from "./stageGeometry.js";
import { characterSize } from "./characterSizes.js";
import {
  EDGE_GUARD_STAGE_ID,
  ZONE_Y_LO,
  ZONE_Y_HI,
  ZONE_X_AT_Y_LO,
  ZONE_X_AT_Y_HI,
  isHitstunState,
} from "./edgeGuard.js";

const SHIELD_ACTION_STATES = new Set([
  0x098, // ShieldOn
  0x099, // Shield
  0x09a, // ShieldOff
  0x09b, // ShieldStun
]);

export function isShieldState(actionStateId: number): boolean {
  return SHIELD_ACTION_STATES.has(actionStateId);
}

export function isShieldStunState(actionStateId: number): boolean {
  return actionStateId === 0x09b;
}

export function isSpecialState(actionStateId: number): boolean {
  return actionStateId >= 0x0dc;
}

const LANDING_ACTION_STATES = new Set([
  0x01f, // LandingLight
  0x020, // LandingHeavy
  0x03b, // LandingSpecial
  0x0db, // LandingAirX
]);

export function isLandingState(actionStateId: number): boolean {
  return LANDING_ACTION_STATES.has(actionStateId);
}

const DEAD_ACTION_STATES = new Set([
  0x000, // DeadD
  0x001, // DeadS
  0x002, // DeadU
  0x003, // ScreenKO
  0x004, // ScreenKOWait
]);

export function isDeadState(actionStateId: number): boolean {
  return DEAD_ACTION_STATES.has(actionStateId);
}

export type DeathDirection = "bottom" | "left" | "right" | "top" | "screen";

export function getDeathDirection(
  actionStateId: number,
  positionX: number,
): DeathDirection | null {
  if (actionStateId === 0x000) return "bottom";
  if (actionStateId === 0x001) return positionX > 0 ? "right" : "left";
  if (actionStateId === 0x002) return "top";
  if (actionStateId === 0x003 || actionStateId === 0x004) return "screen";
  return null;
}

const CROUCH_ACTION_STATES = new Set([
  0x01c, // Crouch
  0x01d, // CrouchIdle
  0x01e, // CrouchEnd
]);

export function isCrouchState(actionStateId: number): boolean {
  return CROUCH_ACTION_STATES.has(actionStateId);
}

const TAUNT_ACTION_STATES = new Set([
  0x0bd, // Taunt
]);

export function isTauntState(actionStateId: number): boolean {
  return TAUNT_ACTION_STATES.has(actionStateId);
}

export type AttackType = "tilt" | "smash" | "aerial" | "jab" | "grab";
export type AttackDirection = "up" | "down" | "forward" | "back" | "neutral";

export interface AttackInfo {
  type: AttackType;
  direction: AttackDirection;
}

const CAPTURE_STATES = new Set([
  0x0ab, // CapturePull
  0x0ac, // CaptureWait
  0x0ad, // CaptureDamage
  0x0b3, // CaptureFalconDive (Captain Falcon & J Falcon Up-B grab)
  0x0b6, // CaptureCargo / CommandGrabHold
  0x0b9, // CapturePulled / ThrowTransition
]);

export function isGrabbedState(actionStateId: number): boolean {
  return CAPTURE_STATES.has(actionStateId);
}

export function isFalconCharacter(characterId: number): boolean {
  return characterId === 0x07 || characterId === 0x15 || characterId === 0x28;
}

export type FalconSpecialType =
  | "punch"
  | "dive_reach"
  | "dive_catch"
  | "dive_explosion"
  | "kick"
  | "kick_end";

export function getFalconSpecialType(
  characterId: number,
  actionStateId: number,
): FalconSpecialType | null {
  if (!isFalconCharacter(characterId)) return null;
  if (
    actionStateId === 0x0e5 ||
    actionStateId === 0x0e6 ||
    actionStateId === 0x0e7
  ) {
    return "punch";
  }
  if (actionStateId === 0x0e8 || actionStateId === 0x0e9) {
    return "dive_reach";
  }
  if (actionStateId === 0x0ea) {
    return "dive_catch";
  }
  if (actionStateId === 0x0ee) {
    return "dive_explosion";
  }
  if (actionStateId === 0x0eb || actionStateId === 0x0ec) {
    return "kick";
  }
  if (actionStateId === 0x0ed) {
    return "kick_end";
  }
  return null;
}

export function isPikachuCharacter(characterId: number): boolean {
  return (
    characterId === 0x09 || // Pikachu
    characterId === 0x17 || // Polygon Pikachu
    characterId === 0x2d || // Pikachu (EU)
    characterId === 0x32 // Pikachu (JP)
  );
}

export type PikachuSpecialType =
  "thunder" | "quick_attack" | "quick_attack_zip";

export function getPikachuSpecialType(
  characterId: number,
  actionStateId: number,
): PikachuSpecialType | null {
  if (!isPikachuCharacter(characterId)) return null;
  // Down-B Thunder states: 0xe3, 0xe4, 0xe5, 0xe6, 0xe7
  if (
    actionStateId === 0x0e3 ||
    actionStateId === 0x0e4 ||
    actionStateId === 0x0e5 ||
    actionStateId === 0x0e6 ||
    actionStateId === 0x0e7
  ) {
    return "thunder";
  }
  // Up-B Quick Attack zip/flight states: 0xec (Zip 1), 0xed (Zip 2)
  if (actionStateId === 0x0ec || actionStateId === 0x0ed) {
    return "quick_attack_zip";
  }
  // Up-B Quick Attack startup/landing: 0x0e8, 0x0e9, 0x0ea, 0x0eb
  if (
    actionStateId === 0x0e8 ||
    actionStateId === 0x0e9 ||
    actionStateId === 0x0ea ||
    actionStateId === 0x0eb
  ) {
    return "quick_attack";
  }
  return null;
}

const QUICK_ATTACK_STATES = new Set([
  0x0e8, // Ground QA Startup
  0x0eb, // Air QA Startup
  0x0ec, // Quick Attack Zip 1
  0x0ed, // Quick Attack Zip 2
  0x0e9, // QA End / Landing
  0x0ea, // QA Landing
]);

export function isQuickAttackState(actionStateId: number): boolean {
  return QUICK_ATTACK_STATES.has(actionStateId);
}

export function getAttackInfo(actionStateId: number): AttackInfo | null {
  // Jabs
  if (actionStateId === 0x0be || actionStateId === 0x0bf) {
    return { type: "jab", direction: "forward" };
  }

  // Grabs
  if (
    actionStateId === 0x0a6 ||
    actionStateId === 0x0a7 ||
    actionStateId === 0x0a8
  ) {
    return { type: "grab", direction: "forward" };
  }

  // Grounded Tilts
  if (actionStateId === 0x0c7) {
    return { type: "tilt", direction: "up" };
  }
  if (actionStateId === 0x0c9) {
    return { type: "tilt", direction: "down" };
  }
  if (actionStateId >= 0x0c1 && actionStateId <= 0x0c5) {
    return { type: "tilt", direction: "forward" };
  }

  // Grounded Smashes
  if (actionStateId === 0x0cf) {
    return { type: "smash", direction: "up" };
  }
  if (actionStateId === 0x0d0) {
    return { type: "smash", direction: "down" };
  }
  if (actionStateId >= 0x0ca && actionStateId <= 0x0ce) {
    return { type: "smash", direction: "forward" };
  }

  // Aerial Attacks
  if (actionStateId === 0x0d1) {
    return { type: "aerial", direction: "neutral" }; // Nair
  }
  if (actionStateId === 0x0d2) {
    return { type: "aerial", direction: "forward" }; // Fair
  }
  if (actionStateId === 0x0d3) {
    return { type: "aerial", direction: "back" }; // Bair
  }
  if (actionStateId === 0x0d4) {
    return { type: "aerial", direction: "up" }; // Uair
  }
  if (actionStateId === 0x0d5) {
    return { type: "aerial", direction: "down" }; // Dair
  }

  return null;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export class StageRenderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
  }

  render(
    camera: Camera,
    frame: Frame | undefined,
    stageId: number | undefined,
    hoverScreen: { x: number; y: number } | undefined,
    replay?: Replay | null,
    frameIndex?: number,
  ): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawBackground();
    this.drawBlastZone(camera, stageId);
    this.drawEdgeGuardZone(camera, stageId);
    this.drawStage(camera, stageId);

    if (frame) {
      // Draw Pikachu Quick Attack spatial flight streaks before characters
      if (replay && frameIndex !== undefined) {
        for (const key of Object.keys(frame.ports)) {
          const port = Number(key) as PortIndex;
          const portData = frame.ports[port];
          if (!portData) continue;
          if (
            isPikachuCharacter(portData.post.characterId) &&
            isQuickAttackState(portData.post.actionStateId)
          ) {
            this.drawPikachuQuickAttackStreak(camera, port, replay, frameIndex);
          }
        }
      }

      for (const key of Object.keys(frame.ports)) {
        const port = Number(key) as PortIndex;
        const portData = frame.ports[port];
        if (!portData) continue;
        if (
          isDeadState(portData.post.actionStateId) ||
          portData.post.stocksRemaining < 0
        ) {
          continue;
        }
        this.drawPlayer(camera, port, portData.post);
      }
      this.drawDeathDirectionFlashes(frame);
    }

    if (hoverScreen) {
      this.drawHoverCoordinates(camera, hoverScreen);
    }
  }

  /**
   * Draws the outer stage blast zone boundary (death boundary rectangle).
   * Shaded with a subtle outer danger tint and an inward-facing edge gradient.
   */
  private drawBlastZone(camera: Camera, stageId: number | undefined): void {
    const blastZone = stageBlastZone(stageId);
    if (!blastZone) return;

    const { ctx, canvas } = this;
    const tl = camera.worldToScreen(blastZone.leftX, blastZone.topY);
    const br = camera.worldToScreen(blastZone.rightX, blastZone.bottomY);
    const rectX = tl.x;
    const rectY = tl.y;
    const rectW = br.x - tl.x;
    const rectH = br.y - tl.y;

    // 1. Subtle dark danger shade outside the blast zone rectangle
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.rect(rectX, rectY, rectW, rectH);
    ctx.fillStyle = "rgba(255, 30, 20, 0.05)";
    ctx.fill("evenodd");

    // 2. Blast zone perimeter outline with subtle glow
    ctx.beginPath();
    ctx.rect(rectX, rectY, rectW, rectH);
    ctx.strokeStyle = "rgba(255, 60, 40, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Corner brackets at all 4 corners
    const bracketSize = 14;
    ctx.strokeStyle = "rgba(255, 90, 60, 0.75)";
    ctx.lineWidth = 2.5;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(rectX, rectY + bracketSize);
    ctx.lineTo(rectX, rectY);
    ctx.lineTo(rectX + bracketSize, rectY);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(rectX + rectW - bracketSize, rectY);
    ctx.lineTo(rectX + rectW, rectY);
    ctx.lineTo(rectX + rectW, rectY + bracketSize);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(rectX + rectW, rectY + rectH - bracketSize);
    ctx.lineTo(rectX + rectW, rectY + rectH);
    ctx.lineTo(rectX + rectW - bracketSize, rectY + rectH);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(rectX + bracketSize, rectY + rectH);
    ctx.lineTo(rectX, rectY + rectH);
    ctx.lineTo(rectX, rectY + rectH - bracketSize);
    ctx.stroke();

    // 4. Subtle inward perimeter gradient
    const gradDepth = 24;
    // Left edge
    const gLeft = ctx.createLinearGradient(rectX, 0, rectX + gradDepth, 0);
    gLeft.addColorStop(0, "rgba(255, 50, 30, 0.12)");
    gLeft.addColorStop(1, "rgba(255, 50, 30, 0)");
    ctx.fillStyle = gLeft;
    ctx.fillRect(rectX, rectY, gradDepth, rectH);

    // Right edge
    const gRight = ctx.createLinearGradient(
      rectX + rectW,
      0,
      rectX + rectW - gradDepth,
      0,
    );
    gRight.addColorStop(0, "rgba(255, 50, 30, 0.12)");
    gRight.addColorStop(1, "rgba(255, 50, 30, 0)");
    ctx.fillStyle = gRight;
    ctx.fillRect(rectX + rectW - gradDepth, rectY, gradDepth, rectH);

    // Top edge
    const gTop = ctx.createLinearGradient(0, rectY, 0, rectY + gradDepth);
    gTop.addColorStop(0, "rgba(255, 50, 30, 0.12)");
    gTop.addColorStop(1, "rgba(255, 50, 30, 0)");
    ctx.fillStyle = gTop;
    ctx.fillRect(rectX, rectY, rectW, gradDepth);

    // Bottom edge
    const gBot = ctx.createLinearGradient(
      0,
      rectY + rectH,
      0,
      rectY + rectH - gradDepth,
    );
    gBot.addColorStop(0, "rgba(255, 50, 30, 0.12)");
    gBot.addColorStop(1, "rgba(255, 50, 30, 0)");
    ctx.fillStyle = gBot;
    ctx.fillRect(rectX, rectY + rectH - gradDepth, rectW, gradDepth);

    ctx.restore();
  }

  /**
   * Draws a red gradient death flash along the side / blast zone where a player just died.
   * Fades smoothly across the first 45 frames of the death state.
   */
  private drawDeathDirectionFlashes(frame: Frame | undefined): void {
    if (!frame) return;
    const { ctx, canvas } = this;

    for (const key of Object.keys(frame.ports)) {
      const port = Number(key) as PortIndex;
      const portData = frame.ports[port];
      if (!portData) continue;

      const { actionStateId, positionX, actionFrameCounter } = portData.post;
      const direction = getDeathDirection(actionStateId, positionX);
      if (!direction) continue;

      // Death animation fade: strongest on frames 0-10, fading until frame 45
      const MAX_DEATH_FRAMES = 45;
      if (actionFrameCounter >= MAX_DEATH_FRAMES) continue;

      const progress = actionFrameCounter / MAX_DEATH_FRAMES;
      const intensity = Math.max(0, 1 - progress);
      const opacity = intensity * 0.75;
      const depth = 80 + intensity * 140; // 80px - 220px deep sweep

      ctx.save();
      if (direction === "bottom") {
        const grad = ctx.createLinearGradient(
          0,
          canvas.height,
          0,
          canvas.height - depth,
        );
        grad.addColorStop(0, `rgba(255, 30, 20, ${opacity * 0.85})`);
        grad.addColorStop(0.35, `rgba(255, 70, 20, ${opacity * 0.5})`);
        grad.addColorStop(1, "rgba(255, 30, 20, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, canvas.height - depth, canvas.width, depth);
      } else if (direction === "top") {
        const grad = ctx.createLinearGradient(0, 0, 0, depth);
        grad.addColorStop(0, `rgba(255, 30, 20, ${opacity * 0.85})`);
        grad.addColorStop(0.35, `rgba(255, 70, 20, ${opacity * 0.5})`);
        grad.addColorStop(1, "rgba(255, 30, 20, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, depth);
      } else if (direction === "left") {
        const grad = ctx.createLinearGradient(0, 0, depth, 0);
        grad.addColorStop(0, `rgba(255, 30, 20, ${opacity * 0.85})`);
        grad.addColorStop(0.35, `rgba(255, 70, 20, ${opacity * 0.5})`);
        grad.addColorStop(1, "rgba(255, 30, 20, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, depth, canvas.height);
      } else if (direction === "right") {
        const grad = ctx.createLinearGradient(
          canvas.width,
          0,
          canvas.width - depth,
          0,
        );
        grad.addColorStop(0, `rgba(255, 30, 20, ${opacity * 0.85})`);
        grad.addColorStop(0.35, `rgba(255, 70, 20, ${opacity * 0.5})`);
        grad.addColorStop(1, "rgba(255, 30, 20, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(canvas.width - depth, 0, depth, canvas.height);
      } else if (direction === "screen") {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const radius = Math.max(canvas.width, canvas.height) * 0.6;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, `rgba(255, 45, 20, ${opacity * 0.65})`);
        grad.addColorStop(0.45, `rgba(255, 80, 20, ${opacity * 0.3})`);
        grad.addColorStop(1, "rgba(255, 30, 20, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.restore();
    }
  }

  /**
   * Shades the edge-guard danger zone on stages where the zone is defined
   * (currently Dream Land only). The zone boundary is a diagonal line from
   * (ZONE_X_AT_Y_LO, ZONE_Y_LO) to (ZONE_X_AT_Y_HI, ZONE_Y_HI), mirrored
   * on the left side. Everything outside this line is the danger zone.
   *
   * We draw the shaded area as a canvas polygon using world→screen transforms,
   * so it tracks the camera automatically. We extend the polygon far off-screen
   * (in world space) so the fill covers the blast-zone region without needing
   * to know the actual blast-zone bounds.
   */
  private drawEdgeGuardZone(camera: Camera, stageId: number | undefined): void {
    if (stageId !== EDGE_GUARD_STAGE_ID) return;

    const { ctx } = this;
    const FAR = 12000; // well past any realistic blast-zone coordinate

    // Right danger zone: a quadrilateral whose left edge is the diagonal
    // boundary and whose right/top/bottom edges extend to FAR.
    // Points in world space (Y up), traversed clockwise:
    //   top-left corner of zone = (ZONE_X_AT_Y_LO, ZONE_Y_LO)
    //   top-right far corner    = (FAR, ZONE_Y_LO)
    //   bottom-right far corner = (FAR, -FAR)
    //   bottom-left far corner  = (ZONE_X_AT_Y_HI, -FAR)
    //   then back up the diagonal to close.
    // We also extend the zone above Y_LO (using X_AT_Y_LO as the fixed
    // threshold) and below Y_HI (using X_AT_Y_HI as the fixed threshold).

    const drawZoneSide = (sign: 1 | -1): void => {
      const pts: Array<{ wx: number; wy: number }> = [
        { wx: sign * ZONE_X_AT_Y_HI, wy: FAR },
        { wx: sign * FAR, wy: FAR },
        { wx: sign * FAR, wy: -FAR },
        { wx: sign * ZONE_X_AT_Y_LO, wy: -FAR },
        { wx: sign * ZONE_X_AT_Y_LO, wy: ZONE_Y_LO },
        { wx: sign * ZONE_X_AT_Y_HI, wy: ZONE_Y_HI },
      ];

      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];
        if (!pt) continue;
        const s = camera.worldToScreen(pt.wx, pt.wy);
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 140, 40, 0.08)";
      ctx.fill();

      // Draw the full boundary line (top vertical extension, diagonal, bottom vertical extension)
      const boundaryPts: Array<{ wx: number; wy: number }> = [
        { wx: sign * ZONE_X_AT_Y_HI, wy: FAR },
        { wx: sign * ZONE_X_AT_Y_HI, wy: ZONE_Y_HI },
        { wx: sign * ZONE_X_AT_Y_LO, wy: ZONE_Y_LO },
        { wx: sign * ZONE_X_AT_Y_LO, wy: -FAR },
      ];

      ctx.beginPath();
      for (let i = 0; i < boundaryPts.length; i++) {
        const pt = boundaryPts[i];
        if (!pt) continue;
        const s = camera.worldToScreen(pt.wx, pt.wy);
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      }
      ctx.strokeStyle = "rgba(255, 140, 40, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    drawZoneSide(1); // right
    drawZoneSide(-1); // left
  }

  private drawBackground(): void {
    const { ctx, canvas } = this;

    ctx.fillStyle = "#12141c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Light grid for spatial reference, since we have no real stage geometry.
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    const gridStep = 40;
    for (let x = 0; x < canvas.width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }

  /** Real platform/ground geometry for stages we've measured (see stageGeometry.ts); a plain Y=0 reference line otherwise. */
  private drawStage(camera: Camera, stageId: number | undefined): void {
    const platforms = stageGeometry(stageId);
    if (!platforms) {
      this.drawFallbackGroundLine(camera);
      return;
    }
    for (const platform of platforms) {
      this.drawPlatform(camera, platform);
    }
  }

  private drawPlatform(camera: Camera, platform: PlatformSpec): void {
    const { ctx } = this;
    const left = camera.worldToScreen(platform.leftX, platform.y);
    const right = camera.worldToScreen(platform.rightX, platform.y);

    ctx.strokeStyle =
      platform.kind === "ground"
        ? "rgba(210,215,225,0.9)"
        : "rgba(160,195,255,0.8)";
    ctx.lineWidth = platform.kind === "ground" ? 8 : 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.stroke();
  }

  private drawFallbackGroundLine(camera: Camera): void {
    const { ctx, canvas } = this;
    const groundY = camera.groundScreenY();
    if (groundY < 0 || groundY > canvas.height) return;
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();
    ctx.setLineDash([]);
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
      comboHitCount?: number;
      hitstunCounter?: number;
    },
  ): void {
    const { ctx } = this;
    // positionY is the character's foot position, not their center - Teeter
    // samples land exactly on platform surface Y (see stageGeometry.ts), so
    // the marker's bottom edge (not its middle) belongs at y.
    const { x, y } = camera.worldToScreen(post.positionX, post.positionY);
    const color = PORT_COLORS[port];
    const facingRight = post.facingDirection === 1;

    const size = characterSize(post.characterId);
    const crouching = isCrouchState(post.actionStateId);
    const heightPx = camera.worldLengthToScreen(
      size.height * (crouching ? 0.5 : 1.0),
    );
    const halfWidth = camera.worldLengthToScreen(size.width) / 2;
    const topY = y - heightPx;
    const centerY = y - heightPx * 0.5;
    const noseY = y - heightPx * 0.5;

    // Draw shield bubble/oval if character is in a shield state
    const shielding = isShieldState(post.actionStateId);
    let labelY = topY - 8;

    if (shielding) {
      const shieldStun = isShieldStunState(post.actionStateId);
      const radiusX = halfWidth * 1.35;
      const radiusY = heightPx * 0.65;
      labelY = Math.min(labelY, centerY - radiusY - 6);

      if (shieldStun) {
        // High-energy vibrating shield stun impact effect
        const jitterX = post.actionFrameCounter % 2 === 0 ? 1.5 : -1.5;
        const shieldCenterX = x + jitterX;

        // 1. High-opacity impact fill
        ctx.beginPath();
        ctx.ellipse(
          shieldCenterX,
          centerY,
          radiusX,
          radiusY,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = hexToRgba(color, 0.48);
        ctx.fill();

        // 2. Glowing heavy perimeter
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(
          shieldCenterX,
          centerY,
          radiusX,
          radiusY,
          0,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();

        // 3. Bright white electric flash core
        ctx.beginPath();
        ctx.ellipse(
          shieldCenterX,
          centerY,
          radiusX,
          radiusY,
          0,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // 4. Outer dashed electric shockwave ring
        ctx.beginPath();
        ctx.ellipse(
          shieldCenterX,
          centerY,
          radiusX * 1.18,
          radiusY * 1.18,
          0,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = "rgba(255, 230, 80, 0.85)";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Normal shield bubble
        ctx.beginPath();
        ctx.ellipse(x, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(color, 0.28);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(color, 0.85);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Draw capture lock brackets if character is trapped in a grab
    const grabbed = isGrabbedState(post.actionStateId);
    if (grabbed) {
      const padX = halfWidth * 1.3;
      const bracketTop = topY - 2;
      const bracketBot = y + 2;
      const armLen = 5;

      ctx.save();
      ctx.strokeStyle = "rgba(255, 215, 60, 0.95)";
      ctx.lineWidth = 2;
      ctx.lineCap = "square";
      ctx.shadowColor = "rgba(255, 180, 0, 0.7)";
      ctx.shadowBlur = 4;

      // Left bracket [
      ctx.beginPath();
      ctx.moveTo(x - padX + armLen, bracketTop);
      ctx.lineTo(x - padX, bracketTop);
      ctx.lineTo(x - padX, bracketBot);
      ctx.lineTo(x - padX + armLen, bracketBot);
      ctx.stroke();

      // Right bracket ]
      ctx.beginPath();
      ctx.moveTo(x + padX - armLen, bracketTop);
      ctx.lineTo(x + padX, bracketTop);
      ctx.lineTo(x + padX, bracketBot);
      ctx.lineTo(x + padX - armLen, bracketBot);
      ctx.stroke();

      ctx.restore();
    }

    // Draw attack arc if character is executing an attack or grab
    const attack = getAttackInfo(post.actionStateId);
    if (attack) {
      this.drawAttackArc(
        x,
        centerY,
        halfWidth,
        heightPx,
        facingRight,
        color,
        attack,
      );
      if (attack.direction === "up" || attack.direction === "neutral") {
        const baseRadius = Math.max(halfWidth, heightPx * 0.5);
        const topRadius =
          attack.type === "smash" ? baseRadius * 2.2 : baseRadius * 1.55;
        labelY = Math.min(labelY, centerY - topRadius - 8);
      }
    }

    // Draw Falcon special move visuals if applicable
    const falconSpecial = getFalconSpecialType(
      post.characterId,
      post.actionStateId,
    );
    if (falconSpecial) {
      this.drawFalconSpecial(
        x,
        centerY,
        halfWidth,
        heightPx,
        facingRight,
        color,
        falconSpecial,
        post.actionFrameCounter,
      );
      if (
        falconSpecial === "dive_reach" ||
        falconSpecial === "dive_explosion"
      ) {
        labelY = Math.min(labelY, centerY - heightPx * 0.85 - 8);
      }
    }

    // Draw Pikachu special move visuals if applicable
    const pikaSpecial = getPikachuSpecialType(
      post.characterId,
      post.actionStateId,
    );
    if (pikaSpecial) {
      this.drawPikachuSpecial(
        x,
        centerY,
        halfWidth,
        heightPx,
        facingRight,
        color,
        pikaSpecial,
        post.actionFrameCounter,
      );
    }

    const taunting = isTauntState(post.actionStateId);
    let triangleColor = color;

    if (taunting) {
      // Smoothly cycle through colors across the rainbow spectrum
      const hue = (post.actionFrameCounter * 10) % 360;
      triangleColor = `hsl(${hue}, 85%, 55%)`;
    }

    const inHitstun = isHitstunState(
      post.actionStateId,
      post.hitstunCounter ?? 0,
    );
    const inCombo = inHitstun && (post.comboHitCount ?? 0) > 0;
    const comboHits = inHitstun ? (post.comboHitCount ?? 0) : 0;
    const isSpecial = isSpecialState(post.actionStateId);
    const isLanding = isLandingState(post.actionStateId);

    // Isosceles triangle, nose pointing in the facing direction, feet at y and head at topY.
    const triX =
      inCombo && !taunting
        ? x + (post.actionFrameCounter % 2 === 0 ? 1.2 : -1.2)
        : x;
    const noseX = triX + (facingRight ? halfWidth : -halfWidth);
    const backX = triX + (facingRight ? -halfWidth : halfWidth);

    ctx.save();
    if (taunting) {
      // Spin triangle continuously around its geometric center (x, centerY)
      const spinAngle = post.actionFrameCounter * 0.25 * (facingRight ? 1 : -1);
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

    if (inCombo) {
      // Active combo hit stun electric outline & outer glow (taking damage)
      ctx.save();
      ctx.strokeStyle = "rgba(255, 60, 40, 0.95)";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "rgba(255, 120, 0, 0.85)";
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(noseX, noseY);
      ctx.lineTo(backX, topY);
      ctx.lineTo(backX, y);
      ctx.closePath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (isSpecial || isLanding) {
      // Special move & Landing animation: neutral cool-silver/gray energy outline
      ctx.save();
      ctx.strokeStyle = "rgba(190, 205, 225, 0.95)";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "rgba(170, 195, 230, 0.7)";
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(noseX, noseY);
      ctx.lineTo(backX, topY);
      ctx.lineTo(backX, y);
      ctx.closePath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();

    // Damage% label above the triangle, in the player's color (or cycling if taunting).
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillStyle = taunting ? triangleColor : color;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 3;
    ctx.fillText(`${post.damagePercent}%`, x, labelY);
    ctx.shadowBlur = 0;

    // Active combo hits badge if 2 or more hits in combo
    if (comboHits >= 2) {
      const badgeText = `${comboHits} COMBO`;
      ctx.font = "bold 10px system-ui, sans-serif";
      const textWidth = ctx.measureText(badgeText).width;
      const badgeY = labelY - 14;

      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.fillRect(x - textWidth / 2 - 4, badgeY - 9, textWidth + 8, 13);

      ctx.fillStyle = "#ff4d4f";
      ctx.fillText(badgeText, x, badgeY);
    }
  }

  private drawAttackArc(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    color: string,
    attack: AttackInfo,
  ): void {
    const { ctx } = this;
    const baseRadius = Math.max(halfWidth, heightPx * 0.5);

    if (attack.type === "aerial" && attack.direction === "neutral") {
      // Nair: 360-degree sleek aerodynamic ring matching tilt stroke weight
      const radius = baseRadius * 1.55;

      ctx.beginPath();
      ctx.arc(x, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      return;
    }

    let centerAngle: number;
    if (attack.direction === "up") {
      centerAngle = -Math.PI / 2;
    } else if (attack.direction === "down") {
      centerAngle = Math.PI / 2;
    } else if (attack.direction === "back") {
      centerAngle = facingRight ? Math.PI : 0;
    } else {
      // forward
      centerAngle = facingRight ? 0 : Math.PI;
    }

    if (attack.type === "jab") {
      // Jab: two vertical dots like a colon in front of the nose
      const dir = facingRight ? 1 : -1;
      const noseX = x + dir * halfWidth;
      const dotX = noseX + dir * Math.max(7, halfWidth * 0.35);
      const dotRadius = 3;
      const dotGap = heightPx * 0.22;

      // Top dot
      ctx.beginPath();
      ctx.arc(dotX, centerY - dotGap, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dotX, centerY - dotGap, dotRadius * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.fill();

      // Bottom dot
      ctx.beginPath();
      ctx.arc(dotX, centerY + dotGap, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dotX, centerY + dotGap, dotRadius * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.fill();
      return;
    }

    if (attack.type === "grab") {
      // Grab attempt: open rectangular clamping jaws with dashed capture field
      const dir = facingRight ? 1 : -1;
      const noseX = x + dir * halfWidth;
      const reachLen = halfWidth * 1.35;
      const frontX = noseX + dir * reachLen;
      const boxTop = centerY - heightPx * 0.38;
      const boxBot = centerY + heightPx * 0.38;
      const toothLen = heightPx * 0.18;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.8;
      ctx.lineCap = "round";

      // Top reaching arm + downward claw tooth
      ctx.beginPath();
      ctx.moveTo(noseX, boxTop);
      ctx.lineTo(frontX, boxTop);
      ctx.lineTo(frontX, boxTop + toothLen);
      ctx.stroke();

      // Bottom reaching arm + upward claw tooth
      ctx.beginPath();
      ctx.moveTo(noseX, boxBot);
      ctx.lineTo(frontX, boxBot);
      ctx.lineTo(frontX, boxBot - toothLen);
      ctx.stroke();

      // White highlight on claws
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(noseX + dir * 2, boxTop);
      ctx.lineTo(frontX, boxTop);
      ctx.lineTo(frontX, boxTop + toothLen);
      ctx.moveTo(noseX + dir * 2, boxBot);
      ctx.lineTo(frontX, boxBot);
      ctx.lineTo(frontX, boxBot - toothLen);
      ctx.stroke();

      // Dashed capture field line between the claw teeth
      ctx.beginPath();
      ctx.moveTo(frontX, boxTop + toothLen + 2);
      ctx.lineTo(frontX, boxBot - toothLen - 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
      return;
    }

    if (attack.type === "tilt" || attack.type === "aerial") {
      // Tilts and directional aerials: sleek, sharp aerodynamic single slash arc
      const radius = baseRadius * 1.55;
      const span = (75 * Math.PI) / 180;
      const startAngle = centerAngle - span / 2;
      const endAngle = centerAngle + span / 2;

      // Outer slash arc in player's color
      ctx.beginPath();
      ctx.arc(x, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.stroke();

      // Inner white highlight core
      ctx.beginPath();
      ctx.arc(x, centerY, radius, startAngle + 0.08, endAngle - 0.08);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.stroke();
    } else {
      // Smash attack: significantly larger, glowing, heavier dual-layer energy crescent
      const radiusOuter = baseRadius * 2.2;
      const radiusInner = baseRadius * 1.45;
      const span = (105 * Math.PI) / 180;
      const startAngle = centerAngle - span / 2;
      const endAngle = centerAngle + span / 2;

      // 1. Translucent energy wedge fill
      ctx.beginPath();
      ctx.arc(x, centerY, radiusOuter, startAngle, endAngle);
      ctx.arc(x, centerY, radiusInner, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = hexToRgba(color, 0.22);
      ctx.fill();

      // 2. Heavy outer glowing impact blade
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, centerY, radiusOuter, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 5.5;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();

      // 3. Bright intense white energy core
      ctx.beginPath();
      ctx.arc(x, centerY, radiusOuter, startAngle + 0.1, endAngle - 0.1);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.stroke();

      // 4. Trailing inner speed line
      ctx.beginPath();
      ctx.arc(x, centerY, radiusInner, startAngle + 0.15, endAngle - 0.15);
      ctx.strokeStyle = hexToRgba(color, 0.65);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }

  /**
   * Visualizes Captain Falcon's signature special moves:
   * - Falcon Punch (Neutral-B): Glowing fiery energy windup & massive forward flame strike cone.
   * - Falcon Dive (Up-B): Upward-angled grab reach jaws, explosive grab catch, and blast release.
   * - Falcon Kick (Down-B): Flaming thrust trail and glowing nose flame tip.
   */
  private drawFalconSpecial(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    _color: string,
    specialType: FalconSpecialType,
    frameCounter: number,
  ): void {
    const { ctx } = this;
    const dir = facingRight ? 1 : -1;
    const noseX = x + dir * halfWidth;

    if (specialType === "punch") {
      const isCharging = frameCounter < 50;
      ctx.save();
      if (isCharging) {
        // Windup/charge: intense pulsing fiery energy spark condensing at fist/nose
        const pulse = 1 + 0.25 * Math.sin(frameCounter * 0.35);
        const radius = Math.max(8, halfWidth * 0.45) * pulse;

        // 1. Outer flame aura
        ctx.beginPath();
        ctx.arc(noseX + dir * 4, centerY, radius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 69, 0, 0.35)";
        ctx.shadowColor = "#ff4500";
        ctx.shadowBlur = 12;
        ctx.fill();

        // 2. Core flame spark
        ctx.beginPath();
        ctx.arc(noseX + dir * 4, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffaa00";
        ctx.fill();

        // 3. Electric white center
        ctx.beginPath();
        ctx.arc(noseX + dir * 4, centerY, radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      } else {
        // Punch release: massive fiery falcon strike cone projecting forward
        const punchLen = halfWidth * 1.75;
        const tipX = noseX + dir * punchLen;
        const wingSpan = heightPx * 0.65;

        // 1. Radiant fiery falcon beak fill
        ctx.beginPath();
        ctx.moveTo(noseX, centerY - wingSpan * 0.7);
        ctx.quadraticCurveTo(
          noseX + dir * punchLen * 0.5,
          centerY - wingSpan,
          tipX,
          centerY,
        );
        ctx.quadraticCurveTo(
          noseX + dir * punchLen * 0.5,
          centerY + wingSpan,
          noseX,
          centerY + wingSpan * 0.7,
        );
        ctx.closePath();
        ctx.fillStyle = "rgba(255, 69, 0, 0.4)";
        ctx.shadowColor = "#ff4500";
        ctx.shadowBlur = 14;
        ctx.fill();

        // 2. Flaming outer stroke
        ctx.strokeStyle = "#ffaa00";
        ctx.lineWidth = 3;
        ctx.stroke();

        // 3. Bright white central piercing thrust beam
        ctx.beginPath();
        ctx.moveTo(noseX, centerY);
        ctx.lineTo(tipX + dir * 6, centerY);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (specialType === "dive_reach") {
      // Falcon Dive Up-B Reach: upward-angled (45 deg) grabbing jaws
      const reachLen = halfWidth * 1.45;
      const reachX = noseX + dir * reachLen * 0.75;
      const reachY = centerY - heightPx * 0.55;
      const toothLen = heightPx * 0.2;

      ctx.save();
      ctx.strokeStyle = "#ff6600";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.shadowColor = "#ff6600";
      ctx.shadowBlur = 8;

      // Top claw arm
      ctx.beginPath();
      ctx.moveTo(noseX, centerY - heightPx * 0.2);
      ctx.lineTo(reachX, reachY);
      ctx.lineTo(reachX - dir * toothLen * 0.5, reachY + toothLen);
      ctx.stroke();

      // Bottom claw arm
      ctx.beginPath();
      ctx.moveTo(noseX, centerY + heightPx * 0.1);
      ctx.lineTo(reachX, reachY + heightPx * 0.35);
      ctx.lineTo(
        reachX - dir * toothLen * 0.5,
        reachY + heightPx * 0.35 - toothLen,
      );
      ctx.stroke();

      // White inner claw highlights
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Dashed capture field line between the claw teeth
      ctx.beginPath();
      ctx.moveTo(reachX - dir * toothLen * 0.5, reachY + toothLen + 2);
      ctx.lineTo(
        reachX - dir * toothLen * 0.5,
        reachY + heightPx * 0.35 - toothLen - 2,
      );
      ctx.strokeStyle = "rgba(255, 220, 100, 0.95)";
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
      return;
    }

    if (specialType === "dive_catch") {
      // Falcon Dive Catch: explosive grab lock burst at contact point
      ctx.save();
      const burstX = noseX + dir * halfWidth * 0.5;
      const burstRadius = 14;

      ctx.beginPath();
      ctx.arc(burstX, centerY, burstRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 180, 0, 0.4)";
      ctx.shadowColor = "#ffbb00";
      ctx.shadowBlur = 10;
      ctx.fill();

      // 4 radial spark spikes
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(burstX - 18, centerY);
      ctx.lineTo(burstX + 18, centerY);
      ctx.moveTo(burstX, centerY - 18);
      ctx.lineTo(burstX, centerY + 18);
      ctx.stroke();

      ctx.restore();
      return;
    }

    if (specialType === "dive_explosion") {
      // Falcon Dive Detachment Explosion: fiery shockwave burst as Falcon kicks off
      ctx.save();
      const blastX = x - dir * halfWidth * 0.3;
      const blastY = centerY + heightPx * 0.2;
      const radius = 22;

      // 1. Expanding fiery explosion fill
      ctx.beginPath();
      ctx.arc(blastX, blastY, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 60, 0, 0.35)";
      ctx.shadowColor = "#ff4500";
      ctx.shadowBlur = 12;
      ctx.fill();

      // 2. Dashed shockwave perimeter ring
      ctx.beginPath();
      ctx.arc(blastX, blastY, radius * 1.25, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 200, 50, 0.9)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Central white flare
      ctx.beginPath();
      ctx.arc(blastX, blastY, radius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.restore();
      return;
    }

    if (specialType === "kick") {
      // Falcon Kick Down-B: flaming speed trail + glowing nose flame
      ctx.save();
      const trailLen = halfWidth * 1.6;
      const backX = x - dir * halfWidth;

      // 1. Trailing speed flames behind the triangle
      ctx.beginPath();
      ctx.moveTo(backX, centerY - heightPx * 0.35);
      ctx.lineTo(backX - dir * trailLen, centerY - heightPx * 0.2);
      ctx.moveTo(backX, centerY);
      ctx.lineTo(backX - dir * (trailLen * 1.2), centerY);
      ctx.moveTo(backX, centerY + heightPx * 0.35);
      ctx.lineTo(backX - dir * trailLen, centerY + heightPx * 0.2);
      ctx.strokeStyle = "rgba(255, 100, 0, 0.85)";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.shadowColor = "#ff4500";
      ctx.shadowBlur = 8;
      ctx.stroke();

      // 2. Fiery thrust tip on nose
      ctx.beginPath();
      ctx.arc(noseX, centerY, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ff5500";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(noseX, centerY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.restore();
      return;
    }

    if (specialType === "kick_end") {
      // Lingering flame particles on slide/wall hit
      ctx.save();
      ctx.beginPath();
      ctx.arc(noseX, centerY, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 120, 0, 0.5)";
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Visualizes Pikachu's signature special moves:
   * - Thunder (Down-B): Lightning bolt descending from the sky (infinite height, Y=0) down to Pikachu with electric shock halo.
   * - Quick Attack (Up-B): Straight-line high-speed electric motion trails and nose spark.
   */
  private drawPikachuSpecial(
    x: number,
    centerY: number,
    halfWidth: number,
    heightPx: number,
    facingRight: boolean,
    _color: string,
    specialType: PikachuSpecialType,
    frameCounter: number,
  ): void {
    const { ctx } = this;
    const dir = facingRight ? 1 : -1;
    const noseX = x + dir * halfWidth;

    if (specialType === "thunder") {
      ctx.save();
      // 1. Full-height lightning bolt coming down from sky (Y=0) straight to Pikachu (centerY)
      const boltStartY = 0;
      const boltEndY = centerY - heightPx * 0.2;
      const totalHeight = Math.max(20, boltEndY - boltStartY);
      const segments = 8;
      const segH = totalHeight / segments;

      // Seeded zigzag offsets based on frame counter to animate lightning jitter
      const seed = frameCounter * 7.3;
      ctx.beginPath();
      ctx.moveTo(x, boltStartY);
      for (let i = 1; i < segments; i++) {
        const jitter = Math.sin(seed + i * 2.4) * (halfWidth * 0.85);
        ctx.lineTo(x + jitter, boltStartY + i * segH);
      }
      ctx.lineTo(x, boltEndY);

      // Outer electric blue/cyan aura
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 12;
      ctx.stroke();

      // Yellow energy mid-stroke
      ctx.beginPath();
      ctx.moveTo(x, boltStartY);
      for (let i = 1; i < segments; i++) {
        const jitter = Math.sin(seed + i * 2.4) * (halfWidth * 0.85);
        ctx.lineTo(x + jitter, boltStartY + i * segH);
      }
      ctx.lineTo(x, boltEndY);
      ctx.strokeStyle = "#ffe600";
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Bright white central lightning core
      ctx.beginPath();
      ctx.moveTo(x, boltStartY);
      for (let i = 1; i < segments; i++) {
        const jitter = Math.sin(seed + i * 2.4) * (halfWidth * 0.85);
        ctx.lineTo(x + jitter, boltStartY + i * segH);
      }
      ctx.lineTo(x, boltEndY);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 2. Electric shockwave impact halo around Pikachu
      const haloRadius = Math.max(14, halfWidth * 1.2);
      ctx.beginPath();
      ctx.arc(x, centerY, haloRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 229, 255, 0.25)";
      ctx.shadowColor = "#ffe600";
      ctx.shadowBlur = 14;
      ctx.fill();

      // Radiating electric spark ring
      ctx.beginPath();
      ctx.arc(x, centerY, haloRadius * 1.2, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffe600";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
      return;
    }

    if (specialType === "quick_attack_zip") {
      ctx.save();
      // Electric tip flare on nose and glowing electric spark halo around Pikachu
      ctx.beginPath();
      ctx.arc(noseX, centerY, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe600";
      ctx.shadowColor = "#ffe600";
      ctx.shadowBlur = 8;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(noseX, centerY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // Subtle electric spark aura around triangle
      ctx.beginPath();
      ctx.arc(x, centerY, Math.max(10, halfWidth * 0.9), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 229, 255, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
      return;
    }

    if (specialType === "quick_attack") {
      // Startup/landing subtle electric spark gathered at nose
      ctx.save();
      ctx.beginPath();
      ctx.arc(noseX, centerY, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 229, 255, 0.8)";
      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.restore();
    }
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
    const { ctx } = this;
    const pathPoints: Array<{ x: number; y: number }> = [];

    let currIdx = frameIndex;
    while (currIdx >= 0) {
      const pData = replay.frames[currIdx]?.ports[port]?.post;
      if (!pData || !isQuickAttackState(pData.actionStateId)) {
        break;
      }
      pathPoints.push({ x: pData.positionX, y: pData.positionY });
      // If we reached the initial startup of this Quick Attack, stop tracing
      if (pData.actionStateId === 0x0e8 || pData.actionStateId === 0x0eb) {
        break;
      }
      currIdx--;
    }

    if (pathPoints.length < 2) return;
    pathPoints.reverse(); // Chronological order: [startPoint, ..., currentPoint]

    const screenPts = pathPoints.map((pt) => camera.worldToScreen(pt.x, pt.y));

    ctx.save();
    // 1. Wide outer electric cyan aura glow
    ctx.beginPath();
    ctx.moveTo(screenPts[0]!.x, screenPts[0]!.y);
    for (let i = 1; i < screenPts.length; i++) {
      ctx.lineTo(screenPts[i]!.x, screenPts[i]!.y);
    }
    ctx.strokeStyle = "rgba(0, 229, 255, 0.5)";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 12;
    ctx.stroke();

    // 2. Vibrant electric yellow mid-stroke
    ctx.beginPath();
    ctx.moveTo(screenPts[0]!.x, screenPts[0]!.y);
    for (let i = 1; i < screenPts.length; i++) {
      ctx.lineTo(screenPts[i]!.x, screenPts[i]!.y);
    }
    ctx.strokeStyle = "#ffe600";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // 3. Crisp bright white central lightning core
    ctx.beginPath();
    ctx.moveTo(screenPts[0]!.x, screenPts[0]!.y);
    for (let i = 1; i < screenPts.length; i++) {
      ctx.lineTo(screenPts[i]!.x, screenPts[i]!.y);
    }
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // 4. Start origin spark flare
    const start = screenPts[0]!;
    ctx.beginPath();
    ctx.arc(start.x, start.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe600";
    ctx.shadowColor = "#ffe600";
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.restore();
  }

  /** World-space coordinates under the cursor, in a small label offset from the pointer. */
  private drawHoverCoordinates(
    camera: Camera,
    hoverScreen: { x: number; y: number },
  ): void {
    const { ctx } = this;
    const world = camera.screenToWorld(hoverScreen.x, hoverScreen.y);
    const label = `(${world.x.toFixed(0)}, ${world.y.toFixed(0)})`;

    const offsetX = 14;
    const offsetY = 18;
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "left";
    const textWidth = ctx.measureText(label).width;

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(
      hoverScreen.x + offsetX - 4,
      hoverScreen.y + offsetY - 12,
      textWidth + 8,
      17,
    );

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(label, hoverScreen.x + offsetX, hoverScreen.y + offsetY);
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
