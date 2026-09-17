import { ITKind, ItemLinkId, WPKind, type Replay } from "@rmg-k/rmgr";
import { stageBlastZone, DREAM_LAND_BLAST_ZONE } from "../../stageGeometry.js";

/** Samus's Charge Shot render scale at full charge: gfx_size 700 / 30 (RMGR_SPEC.md §5.3). */
export const CHARGE_SHOT_FULL_CHARGE_SCALE = 700 / 30;

/**
 * Samus's Charge Shot radius in world units at full charge (scale 700 / 30 = 23.33).
 * Calibrated so a full charge shot has a radius of 130 world units (diameter = 260
 * world units, matching Samus's 256 world-unit height), with lower charges scaled
 * proportionally down to level 0 (~56 world units diameter).
 */
export const CHARGE_SHOT_FULL_CHARGE_RADIUS_WORLD = 130;

/**
 * Charge Shot render scale values for charge levels 0-7, verified across all
 * recorder schema-2 replays: 5.00, 7.67, 9.33, 11.33, 13.67, 16.33, 20.00, 23.33.
 */
export const CHARGE_SHOT_LEVEL_SCALES: readonly number[] = [
  5.0, 7.67, 9.33, 11.33, 13.67, 16.33, 20.0, 23.33,
];

/**
 * Pixel-per-world-unit conversion factor for weapon and item markers.
 */
export const MARKER_TUNING_PX_PER_WORLD_UNIT = 0.38;

export interface BombExplosionEvent {
  startFrame: number;
  x: number;
  y: number;
  kind: number;
  radius: number;
  isBobOmb?: boolean;
  objectAddress?: number;
}

export const EXPLOSION_DURATION = 24;

export function isBombObject(linkId: number, kind: number): boolean {
  if (linkId === ItemLinkId.Item) {
    return (
      kind === ITKind.Bomb ||
      kind === ITKind.BobOmb ||
      kind === ITKind.RTTFBomb ||
      kind === ITKind.MotionSensorBomb ||
      kind === 0x2d // BowserCastleBomb
    );
  }
  if (linkId === ItemLinkId.Weapon) {
    return kind === WPKind.SamusBomb;
  }
  return false;
}

/**
 * Extracts bomb explosion events across all frames of a replay.
 * When an active bomb object (identified by its runtime RDRAM objectAddress)
 * disappears between consecutive frames within stage bounds, an explosion event
 * is recorded at its last known coordinates.
 */
export function extractBombExplosions(replay: Replay): BombExplosionEvent[] {
  const explosions: BombExplosionEvent[] = [];
  const activeBombs = new Map<
    number,
    {
      lastFrame: number;
      x: number;
      y: number;
      kind: number;
      linkId: number;
      isBobOmb: boolean;
    }
  >();

  const blastZone =
    stageBlastZone(replay.matchSettings?.stageId) ?? DREAM_LAND_BLAST_ZONE;

  for (let f = 0; f < replay.frames.length; f++) {
    const frame = replay.frames[f];
    const currentItems = frame?.items ?? [];
    const currentAddresses = new Set<number>();

    for (const item of currentItems) {
      if (isBombObject(item.linkId, item.kind)) {
        currentAddresses.add(item.objectAddress);
        activeBombs.set(item.objectAddress, {
          lastFrame: f,
          x: item.positionX,
          y: item.positionY,
          kind: item.kind,
          linkId: item.linkId,
          isBobOmb: item.kind === ITKind.BobOmb,
        });
      }
    }

    // Check which bombs disappeared on frame f
    for (const [addr, bomb] of Array.from(activeBombs.entries())) {
      if (!currentAddresses.has(addr)) {
        let inBounds = true;
        if (blastZone) {
          if (
            bomb.y < blastZone.bottomY - 150 ||
            bomb.x < blastZone.leftX - 150 ||
            bomb.x > blastZone.rightX + 150 ||
            bomb.y > blastZone.topY + 150
          ) {
            inBounds = false;
          }
        }
        if (inBounds) {
          explosions.push({
            startFrame: f,
            x: bomb.x,
            y: bomb.y,
            kind: bomb.kind,
            radius: bomb.isBobOmb ? 44 : 36,
            isBobOmb: bomb.isBobOmb,
            objectAddress: addr,
          });
        }
        activeBombs.delete(addr);
      }
    }
  }

  return explosions;
}
