import { isPikachuCharacter } from "@rmg-k/rmgr";
import { PIKACHU_SKELETON } from "./skeletons/pikachu.js";
// FOX_SKELETON is temporarily unregistered - confirmed visually broken (collapses into a tangle
// near the ground when rendered) against Remix's own skeleton viewer. See fox.ts's doc comment for
// the specific joint under investigation; re-register once that's fixed and re-verified.

/**
 * A joint in a character's real bone skeleton (from decomp model data), in the rest/bind pose -
 * this is a debug reference visualization, not a per-frame animation: replays only log whole-body
 * position/facing/action-state, never joint rotations, so the skeleton can't actually bend through
 * real attack animations. It's positioned, scaled, and mirrored to match the character's current
 * on-screen position/facing/crouch state, same as the hand-drawn art it replaces.
 *
 * Coordinates are fractions of the character's own bounding box, not world units: `yFrac` 0 is the
 * skeleton's own lowest joint and 1 its highest (each per-character data file picks these from its
 * own joint list - see e.g. skeletons/pikachu.ts - rather than assuming the engine's Y=0 lines up
 * with the character's feet, which it doesn't). `xFrac` is a fraction of halfWidth, positive
 * toward the front (the direction the character is facing), mirrored automatically for facing
 * left. This keeps skeleton data resolution/zoom-independent and lets it reuse the same halfWidth
 * / heightPx the hand-drawn art already receives, rather than needing the game's raw model-space
 * units and scale.
 */
export interface SkeletonJoint {
  readonly name: string;
  /** Parent joint name, or null for the root. */
  readonly parent: string | null;
  readonly xFrac: number;
  readonly yFrac: number;
}

export interface CharacterSkeleton {
  readonly joints: readonly SkeletonJoint[];
}

/** Registry of real bone skeletons by character - see getCharacterSkeleton(). */
const CHARACTER_SKELETONS: readonly {
  readonly matches: (characterId: number) => boolean;
  readonly skeleton: CharacterSkeleton;
}[] = [{ matches: isPikachuCharacter, skeleton: PIKACHU_SKELETON }];

/** Returns the character's real bone skeleton, or null if none is defined yet. */
export function getCharacterSkeleton(
  characterId: number,
): CharacterSkeleton | null {
  for (const entry of CHARACTER_SKELETONS) {
    if (entry.matches(characterId)) return entry.skeleton;
  }
  return null;
}

/** Draws a character's real bone skeleton in its rest pose - see SkeletonJoint's doc comment. */
export function drawCharacterSkeleton(
  ctx: CanvasRenderingContext2D,
  footX: number,
  footY: number,
  halfWidth: number,
  heightPx: number,
  facingRight: boolean,
  color: string,
  skeleton: CharacterSkeleton,
): void {
  const mirror = facingRight ? 1 : -1;
  const jointScreenPos = new Map<string, { x: number; y: number }>();
  for (const joint of skeleton.joints) {
    jointScreenPos.set(joint.name, {
      x: footX + joint.xFrac * halfWidth * mirror,
      y: footY - joint.yFrac * heightPx,
    });
  }

  ctx.save();

  // Bones (parent -> joint line segments)
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  for (const joint of skeleton.joints) {
    if (!joint.parent) continue;
    const from = jointScreenPos.get(joint.parent);
    const to = jointScreenPos.get(joint.name);
    if (!from || !to) continue;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  // Joints (small filled dots, root slightly larger)
  for (const joint of skeleton.joints) {
    const pos = jointScreenPos.get(joint.name);
    if (!pos) continue;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, joint.parent === null ? 3.2 : 2.4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  ctx.restore();
}
