/**
 * Known platform/ground geometry, by stageId (see lookups.ts STAGE_NAMES).
 *
 * Derived empirically: a character's positionX is locked to the exact edge
 * X while in the Teeter action state (0x23), which only occurs standing at
 * the very edge of a surface. Scanned every recorded match's Teeter frames
 * and clustered positionX by surface - every edge came out as a single
 * exact float across hundreds of samples and many characters, so these are
 * ground truth, not estimates. No other stage has been measured yet.
 *
 * Dream Land's ground leftX/rightX were originally recorded as ∓2278 via
 * that method, but a real ledge-grab visualization bug (a grounded
 * character at X=2318 wrongly reading as past the edge) plus an
 * independent data source both point to ∓2318 as the correct value -
 * corrected here. The Teeter-based method for the other three platforms is
 * still trusted as-is.
 */
import { StageId } from "@rmg-k/rmgr";

export interface PlatformSpec {
  leftX: number;
  rightX: number;
  y: number;
  kind: "ground" | "platform";
}

export const DREAM_LAND_STAGE_ID = StageId.DreamLand;

const DREAM_LAND_GROUND: PlatformSpec = {
  leftX: -2318,
  rightX: 2318,
  y: 0,
  kind: "ground",
};
const DREAM_LAND_LEFT_PLATFORM: PlatformSpec = {
  leftX: -1801,
  rightX: -991,
  y: 904,
  kind: "platform",
};
const DREAM_LAND_RIGHT_PLATFORM: PlatformSpec = {
  leftX: 991,
  rightX: 1852,
  y: 907,
  kind: "platform",
};
const DREAM_LAND_TOP_PLATFORM: PlatformSpec = {
  leftX: -530,
  rightX: 530,
  y: 1542,
  kind: "platform",
};

const DREAM_LAND_PLATFORMS: PlatformSpec[] = [
  DREAM_LAND_GROUND,
  DREAM_LAND_LEFT_PLATFORM,
  DREAM_LAND_RIGHT_PLATFORM,
  DREAM_LAND_TOP_PLATFORM,
];

const STAGE_GEOMETRY: Partial<Record<number, PlatformSpec[]>> = {
  [DREAM_LAND_STAGE_ID]: DREAM_LAND_PLATFORMS,
};

/**
 * Ground-to-side-platform vertical gap. Used to calibrate player marker
 * sizes to real character height (see characterSizes.ts) - the left/right
 * platforms sit at slightly different heights (904 vs 907), so this is
 * their average.
 */
export const DREAM_LAND_SIDE_PLATFORM_GAP =
  (DREAM_LAND_LEFT_PLATFORM.y + DREAM_LAND_RIGHT_PLATFORM.y) / 2 -
  DREAM_LAND_GROUND.y;

export function stageGeometry(
  stageId: number | undefined,
): PlatformSpec[] | undefined {
  return stageId !== undefined ? STAGE_GEOMETRY[stageId] : undefined;
}

export interface LedgePoint {
  x: number;
  y: number;
  side: "left" | "right";
}

/**
 * The two grabbable ledges (main stage edges) for a stage, derived from its
 * "ground" platform - side/top platforms don't have grabbable ledges. See
 * ledgeGrabRange.ts for the reach/grab-zone logic built on top of these.
 */
export function stageLedges(
  stageId: number | undefined,
): readonly [LedgePoint, LedgePoint] | undefined {
  const platforms = stageGeometry(stageId);
  const ground = platforms?.find((p) => p.kind === "ground");
  if (!ground) return undefined;
  return [
    { x: ground.leftX, y: ground.y, side: "left" },
    { x: ground.rightX, y: ground.y, side: "right" },
  ];
}

/**
 * Stage blast zone (death boundary) coordinates in world units.
 *
 * Derived empirically from recorded match death coordinates:
 * - Left blast zone: X <= -9000
 * - Right blast zone: X >= 9000
 * - Bottom blast zone: Y <= -3500
 * - Top blast zone: Y >= 8300
 */
export interface BlastZoneSpec {
  leftX: number;
  rightX: number;
  bottomY: number;
  topY: number;
}

export const DREAM_LAND_BLAST_ZONE: BlastZoneSpec = {
  leftX: -9000,
  rightX: 9000,
  bottomY: -3500,
  topY: 8300,
};

const STAGE_BLAST_ZONES: Partial<Record<number, BlastZoneSpec>> = {
  [DREAM_LAND_STAGE_ID]: DREAM_LAND_BLAST_ZONE,
};

export function stageBlastZone(
  stageId: number | undefined,
): BlastZoneSpec | undefined {
  return stageId !== undefined ? STAGE_BLAST_ZONES[stageId] : undefined;
}
