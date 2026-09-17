import {
  ITKind,
  WPKind,
  getSeatedPorts,
  type Frame,
  type ItemUpdate,
  type PortIndex,
  type Replay,
} from "@rmg-k/rmgr";
import {
  isLuigiCharacter,
  isMarioCharacter,
  isSamusCharacter,
  isSamusCharging,
  CHARGE_SHOT_LEVEL_SCALES,
} from "../common/index.js";
import {
  drawFireballMarker,
  drawPKFireMarker,
  drawThunderJoltMarker,
  drawPKThunderHeadMarker,
  drawPKThunderTrailMarker,
  drawThunderHeadMarker,
  drawThunderTrailMarker,
  drawChargeShotMarker,
  drawSamusBombMarker,
  drawBoomerangMarker,
  drawLaserMarker,
  drawCutterWaveMarker,
  drawEggThrowMarker,
  drawStarProjectileMarker,
  drawRayGunBulletMarker,
  drawArwingLaserMarker,
  drawFireFlowerFlameMarker,
  drawBombExplosionAt,
} from "./weapons/index.js";
import {
  drawRoundBombItem,
  drawMotionSensorBombItem,
  drawPokeballItem,
  drawSuperStarItem,
  drawMaximTomatoItem,
  drawHeartContainerItem,
  drawBeamSwordItem,
  drawHomeRunBatItem,
  drawFanItem,
  drawStarRodItem,
  drawRayGunItem,
  drawFireFlowerItem,
  drawHammerItem,
  drawKoopaShellItem,
  drawBumperItem,
  drawPKFirePillarItem,
  drawCapsuleItem,
  drawCrateItem,
  drawBarrelItem,
  drawPowBlockItem,
  drawEggItem,
} from "./pickups/index.js";

export function getWeaponInfo(
  item: ItemUpdate,
  frame?: Frame,
  replay?: Replay | null,
): { isLuigi: boolean; dir: number } {
  let isLuigi = false;
  let dir = 1;
  if (!replay) return { isLuigi, dir };

  const seated = getSeatedPorts(replay);
  const luigiPorts = seated.filter((p) =>
    isLuigiCharacter(replay.matchSettings?.characterId[p] ?? -1),
  );
  const marioPorts = seated.filter((p) =>
    isMarioCharacter(replay.matchSettings?.characterId[p] ?? -1),
  );

  if (luigiPorts.length > 0 && marioPorts.length === 0) {
    isLuigi = true;
  } else if (luigiPorts.length > 0 && frame) {
    let closestLuigiDist = Infinity;
    for (const p of luigiPorts) {
      const pd = frame.ports[p];
      if (!pd || !pd.state) continue;
      const dx = pd.state.positionX - item.positionX;
      const dy = pd.state.positionY - item.positionY;
      const dist = dx * dx + dy * dy;
      if (dist < closestLuigiDist) closestLuigiDist = dist;
    }

    let closestMarioDist = Infinity;
    for (const p of marioPorts) {
      const pd = frame.ports[p];
      if (!pd || !pd.state) continue;
      const dx = pd.state.positionX - item.positionX;
      const dy = pd.state.positionY - item.positionY;
      const dist = dx * dx + dy * dy;
      if (dist < closestMarioDist) closestMarioDist = dist;
    }

    isLuigi = closestLuigiDist < closestMarioDist;
  }

  if (frame) {
    let closestDist = Infinity;
    let closestPort: PortIndex | null = null;
    for (const p of seated) {
      const pd = frame.ports[p];
      if (!pd || !pd.state) continue;
      const dx = pd.state.positionX - item.positionX;
      const dy = pd.state.positionY - item.positionY;
      const dist = dx * dx + dy * dy;
      if (dist < closestDist) {
        closestDist = dist;
        closestPort = p;
      }
    }
    if (closestPort !== null) {
      const pd = frame.ports[closestPort];
      if (pd?.state) {
        dir = pd.state.facingDirection >= 0 ? 1 : -1;
      }
    }
  }

  return { isLuigi, dir };
}

/**
 * Distinguishes Samus's charging orb from a fired Charge Shot projectile.
 * While Samus charges Neutral-B, the game spawns a graphic entity with the same
 * weapon kind (WPKind.ChargeShot) that stays on top of Samus and grows with her
 * stored charge (StateFrame.characterSpecific). When fired, the shot spawns at
 * its final size (matching the charge held one frame earlier, as firing zeroes
 * charge on the frame the shot appears) and travels across the stage.
 *
 * Schema 1 replays lack scale and characterSpecific and fall back to returning false.
 */
export function isChargingOrb(item: ItemUpdate, frame?: Frame): boolean {
  if (item.kind !== WPKind.ChargeShot) return false;
  if (item.scaleX === undefined && item.scaleY === undefined) return false;
  if (!frame || !frame.ports) return false;
  const itemScale = item.scaleY ?? item.scaleX ?? 0;
  for (const portData of Object.values(frame.ports)) {
    const state = portData?.state;
    if (!state || !isSamusCharacter(state.characterId)) continue;
    if (state.characterSpecific === undefined) continue;
    // Samus must be actively charging Neutral-B
    if (!isSamusCharging(state.actionStateId)) continue;
    // Must stay on top of Samus (within ~600 world units)
    const dx = item.positionX - state.positionX;
    const dy = item.positionY - state.positionY;
    if (dx * dx + dy * dy > 600 * 600) continue;
    // The charging orb's scale matches Samus's current charge level
    const expectedScale = CHARGE_SHOT_LEVEL_SCALES[state.characterSpecific];
    if (
      expectedScale !== undefined &&
      Math.abs(itemScale - expectedScale) < 0.25
    ) {
      return true;
    }
  }
  return false;
}

/** Generic fallback marker for any Item/Weapon kind without a custom shape - a colored diamond. */
export function drawGenericItemDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isWeapon: boolean,
): void {
  const r = 9;
  const color = isWeapon
    ? "rgba(232, 121, 249, 0.85)" // magenta - Weapon (free-flying projectile)
    : "rgba(96, 165, 250, 0.85)"; // blue - Item (thrown/spawned/held)
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

/**
 * Draws a recognizable shape for select Weapon kinds instead of the
 * generic diamond. Returns true if it drew something (caller should
 * skip the diamond fallback), false for any kind not covered yet.
 */
export function drawCustomWeaponShape(
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
  switch (kind) {
    case WPKind.Fireball: // Mario / Luigi Neutral-B fireball
      drawFireballMarker(ctx, x, y, isLuigi, dir);
      return true;
    case WPKind.PKFire: // Ness Neutral-B PK Fire
      drawPKFireMarker(ctx, x, y, dir);
      return true;
    case WPKind.ThunderJoltAir: // Pikachu Neutral-B Thunder Jolt (Air)
      drawThunderJoltMarker(ctx, x, y, false, dir, spinAngle);
      return true;
    case WPKind.ThunderJoltGround: // Pikachu Neutral-B Thunder Jolt (Ground)
      drawThunderJoltMarker(ctx, x, y, true, dir, spinAngle);
      return true;
    case WPKind.PKThunderHead:
      drawPKThunderHeadMarker(ctx, x, y, spinAngle);
      return true;
    case WPKind.PKThunderTrail:
      drawPKThunderTrailMarker(ctx, x, y, spinAngle);
      return true;
    case WPKind.ThunderHead:
      drawThunderHeadMarker(ctx, x, y, spinAngle);
      return true;
    case WPKind.ThunderTrail:
      drawThunderTrailMarker(ctx, x, y, spinAngle);
      return true;
    case WPKind.ChargeShot: // Samus - pulsing electric plasma orb
      drawChargeShotMarker(ctx, x, y, spinAngle, gameScale);
      return true;
    case WPKind.SamusBomb:
      drawSamusBombMarker(ctx, x, y, spinAngle);
      return true;
    case WPKind.Boomerang:
      drawBoomerangMarker(ctx, x, y, "#eab308", spinAngle);
      return true;
    case WPKind.Blaster: // Fox Neutral-B laser
      drawLaserMarker(ctx, x, y, dir);
      return true;
    case WPKind.Cutter: // Kirby Up-B Final Cutter wave
      drawCutterWaveMarker(ctx, x, y, dir);
      return true;
    case WPKind.EggThrow:
      drawEggThrowMarker(ctx, x, y, spinAngle, dir);
      return true;
    case WPKind.YoshiStar:
    case WPKind.StarRodStar:
      drawStarProjectileMarker(ctx, x, y, spinAngle);
      return true;
    case WPKind.BulletNormal:
    case WPKind.BulletHard:
    case WPKind.LGunAmmo:
      drawRayGunBulletMarker(ctx, x, y, dir);
      return true;
    case WPKind.ArwingLaser2D:
    case WPKind.ArwingLaser3D:
      drawArwingLaserMarker(ctx, x, y, dir);
      return true;
    case WPKind.FFlowerFlame:
      drawFireFlowerFlameMarker(ctx, x, y, dir, spinAngle);
      return true;
    default:
      return false;
  }
}

/**
 * Draws recognizable shapes for select Item kinds (thrown, held, or ground items).
 */
export function drawCustomItemShape(
  ctx: CanvasRenderingContext2D,
  kind: number,
  x: number,
  y: number,
  frameCounter = 0,
): boolean {
  switch (kind) {
    case ITKind.Bomb:
    case ITKind.BobOmb:
    case ITKind.RTTFBomb:
      drawRoundBombItem(ctx, x, y, frameCounter, kind === ITKind.BobOmb);
      return true;
    case ITKind.MotionSensorBomb:
      drawMotionSensorBombItem(ctx, x, y, frameCounter);
      return true;
    case ITKind.Pokeball:
      drawPokeballItem(ctx, x, y);
      return true;
    case ITKind.Star:
      drawSuperStarItem(ctx, x, y, frameCounter);
      return true;
    case ITKind.MaximTomato:
      drawMaximTomatoItem(ctx, x, y);
      return true;
    case ITKind.Heart:
      drawHeartContainerItem(ctx, x, y, frameCounter);
      return true;
    case ITKind.BeamSword:
      drawBeamSwordItem(ctx, x, y, frameCounter);
      return true;
    case ITKind.HomeRunBat:
      drawHomeRunBatItem(ctx, x, y);
      return true;
    case ITKind.Fan:
      drawFanItem(ctx, x, y);
      return true;
    case ITKind.StarRod:
      drawStarRodItem(ctx, x, y, frameCounter);
      return true;
    case ITKind.RayGun:
      drawRayGunItem(ctx, x, y);
      return true;
    case ITKind.FireFlower:
      drawFireFlowerItem(ctx, x, y);
      return true;
    case ITKind.Hammer:
      drawHammerItem(ctx, x, y);
      return true;
    case ITKind.GreenShell:
    case ITKind.RedShell:
      drawKoopaShellItem(ctx, x, y, kind === ITKind.RedShell, frameCounter);
      return true;
    case ITKind.Bumper:
    case ITKind.StageBumper:
      drawBumperItem(ctx, x, y, frameCounter);
      return true;
    case ITKind.PKFirePillar:
      drawPKFirePillarItem(ctx, x, y, frameCounter);
      return true;
    case ITKind.Capsule:
      drawCapsuleItem(ctx, x, y);
      return true;
    case ITKind.Crate:
      drawCrateItem(ctx, x, y);
      return true;
    case ITKind.Barrel:
      drawBarrelItem(ctx, x, y);
      return true;
    case ITKind.PowBlock:
      drawPowBlockItem(ctx, x, y);
      return true;
    case ITKind.Egg:
      drawEggItem(ctx, x, y);
      return true;
    case 0xfe: {
      const cycle = 24;
      const progress = (Math.abs(frameCounter) % cycle) / cycle;
      drawBombExplosionAt(ctx, x, y, progress, false, 28);
      return true;
    }
    default:
      return false;
  }
}
