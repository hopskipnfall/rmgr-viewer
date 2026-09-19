import { ItemLinkId, WPKind, type Replay } from "@rmg-k/rmgr";
import { stageBlastZone, DREAM_LAND_BLAST_ZONE } from "../../stageGeometry.js";

export interface EggExplosionEvent {
  startFrame: number;
  x: number;
  y: number;
  radius: number;
  objectAddress?: number;
}

export const EGG_EXPLOSION_DURATION = 22;

export function isEggThrowObject(linkId: number, kind: number): boolean {
  return linkId === ItemLinkId.Weapon && kind === WPKind.EggThrow;
}

/**
 * Extracts egg explosion events across all frames of a replay.
 * When an active Yoshi EggThrow weapon object (WPKind.EggThrow 0x05, identified
 * by its runtime RDRAM objectAddress) disappears between consecutive frames
 * within stage bounds, an explosion event is recorded at its last known coordinates.
 */
export function extractEggExplosions(replay: Replay): EggExplosionEvent[] {
  const explosions: EggExplosionEvent[] = [];
  const activeEggs = new Map<
    number,
    {
      lastFrame: number;
      x: number;
      y: number;
      kind: number;
      linkId: number;
    }
  >();

  const blastZone =
    stageBlastZone(replay.matchSettings?.stageId) ?? DREAM_LAND_BLAST_ZONE;

  for (let f = 0; f < replay.frames.length; f++) {
    const frame = replay.frames[f];
    const currentItems = frame?.items ?? [];
    const currentAddresses = new Set<number>();

    for (const item of currentItems) {
      if (isEggThrowObject(item.linkId, item.kind)) {
        currentAddresses.add(item.objectAddress);
        activeEggs.set(item.objectAddress, {
          lastFrame: f,
          x: item.positionX,
          y: item.positionY,
          kind: item.kind,
          linkId: item.linkId,
        });
      }
    }

    // Check which eggs disappeared on frame f
    for (const [addr, egg] of Array.from(activeEggs.entries())) {
      if (!currentAddresses.has(addr)) {
        let inBounds = true;
        if (blastZone) {
          if (
            egg.y < blastZone.bottomY - 150 ||
            egg.x < blastZone.leftX - 150 ||
            egg.x > blastZone.rightX + 150 ||
            egg.y > blastZone.topY + 150
          ) {
            inBounds = false;
          }
        }
        if (inBounds) {
          explosions.push({
            startFrame: f,
            x: egg.x,
            y: egg.y,
            radius: 32,
            objectAddress: addr,
          });
        }
        activeEggs.delete(addr);
      }
    }
  }

  return explosions;
}
