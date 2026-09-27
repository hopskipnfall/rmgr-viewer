import type { CharacterSkeleton } from "../skeleton.js";

/**
 * Pikachu's real 27-joint skeleton in a settled frame of the idle/standing animation (action
 * state 0x0A), sourced from decomp model + animation data (341_PikachuModel.c and the idle
 * animation's keyframe bytecode) via a from-source-ported animation interpreter. Positions are
 * absolute, relative to the fighter's tracked position at (0,0,0).
 *
 * This went through two wrong versions before landing here, both worth knowing about if this ever
 * needs revisiting:
 * 1. The first extraction was the model's rest/bind pose, not an idle-animation frame - visually
 *    unrecognizable (a symmetric bind stance, arms out) and the reason to prefer idle-pose data at
 *    all.
 * 2. The first idle-pose extraction had an off-by-one bug mapping the animation's per-joint array
 *    to joint IDs (an extra +1 offset), which silently zeroed out the hip's axis-alignment
 *    rotation - the symptom was legs climbing upward through the hierarchy instead of descending
 *    from the hip (ankles ending up above the head). Confirmed and fixed against the actual engine
 *    code that performs this mapping (lbCommonAddFighterPartsFigatree).
 *
 * No literal bone name strings exist in the source (numeric joint IDs only, 0-26) - the names
 * below are inferred from mesh position/symmetry, not extracted strings. Four joints (4, 12, 19,
 * 24 - one pivot in each arm/leg chain) aren't touched by the idle animation at all and stay at
 * their rest-pose position.
 *
 * The idle animation is a continuous, gently repeating "breathing" cycle, not a single static
 * pose - these are one settled sample frame partway through that cycle, not "the" canonical idle
 * pose. Expect this to be close to Remix's own skeleton viewer in overall shape, not
 * frame-identical, since Remix may be showing a different point in the same cycle.
 *
 * xFrac/yFrac normalize each joint's position against this skeleton's own extents (yFrac 0/1 at
 * the lowest/highest joint - the right ankle and the left ear; xFrac 1 at the widest joint, the
 * right knee) rather than against this app's Pikachu bounding box - see skeleton.ts's doc comment
 * for why. Z (front/back depth) is dropped: this is a 2D side-view renderer.
 */
const MIN_Y = 34.8; // right ankle
const MAX_Y = 316.0; // left ear
const Y_RANGE = MAX_Y - MIN_Y;
const yFrac = (y: number): number => (y - MIN_Y) / Y_RANGE;

const MAX_X = 115.6; // right knee
const xFrac = (x: number): number => x / MAX_X;

export const PIKACHU_SKELETON: CharacterSkeleton = {
  joints: [
    { name: "root", parent: null, xFrac: xFrac(0.0), yFrac: yFrac(151.5) },
    { name: "torso", parent: "root", xFrac: xFrac(4.6), yFrac: yFrac(100.8) },
    { name: "chest", parent: "torso", xFrac: xFrac(4.3), yFrac: yFrac(178.1) },

    // Right arm: shoulder pivot 4 keeps its rest-pose position (not animated by idle)
    {
      name: "r-shoulder-a",
      parent: "chest",
      xFrac: xFrac(52.8),
      yFrac: yFrac(158.3),
    },
    {
      name: "r-shoulder-b",
      parent: "r-shoulder-a",
      xFrac: xFrac(81.0),
      yFrac: yFrac(155.2),
    },
    {
      name: "r-shoulder-c",
      parent: "r-shoulder-b",
      xFrac: xFrac(52.8),
      yFrac: yFrac(158.3),
    },
    {
      name: "r-hand",
      parent: "r-shoulder-c",
      xFrac: xFrac(50.9),
      yFrac: yFrac(194.4),
    },

    { name: "head", parent: "chest", xFrac: xFrac(-8.3), yFrac: yFrac(225.1) },
    {
      name: "head-tip",
      parent: "head",
      xFrac: xFrac(-7.0),
      yFrac: yFrac(225.4),
    },
    {
      name: "r-ear",
      parent: "head",
      xFrac: xFrac(58.5),
      yFrac: yFrac(311.1),
    },
    {
      name: "l-ear",
      parent: "head",
      xFrac: xFrac(-68.6),
      yFrac: yFrac(316.0),
    },

    // Left arm: shoulder pivot 12 keeps its rest-pose position (not animated by idle)
    {
      name: "l-shoulder-a",
      parent: "chest",
      xFrac: xFrac(-96.7),
      yFrac: yFrac(155.1),
    },
    {
      name: "l-shoulder-b",
      parent: "l-shoulder-a",
      xFrac: xFrac(-81.0),
      yFrac: yFrac(155.2),
    },
    {
      name: "l-shoulder-c",
      parent: "l-shoulder-b",
      xFrac: xFrac(-96.7),
      yFrac: yFrac(155.1),
    },
    {
      name: "l-hand",
      parent: "l-shoulder-c",
      xFrac: xFrac(-81.5),
      yFrac: yFrac(122.1),
    },

    // Right leg: foot (19) keeps its rest-pose position (not animated by idle)
    {
      name: "r-hip-a",
      parent: "torso",
      xFrac: xFrac(65.2),
      yFrac: yFrac(86.0),
    },
    {
      name: "r-hip-b",
      parent: "r-hip-a",
      xFrac: xFrac(65.2),
      yFrac: yFrac(86.0),
    },
    {
      name: "r-knee",
      parent: "r-hip-b",
      xFrac: xFrac(115.6),
      yFrac: yFrac(84.6),
    },
    {
      name: "r-ankle",
      parent: "r-knee",
      xFrac: xFrac(75.5),
      yFrac: yFrac(34.8),
    },
    {
      name: "r-foot",
      parent: "r-ankle",
      xFrac: xFrac(56.2),
      yFrac: yFrac(73.2),
    },

    // Left leg: foot (24) keeps its rest-pose position (not animated by idle)
    {
      name: "l-hip-a",
      parent: "torso",
      xFrac: xFrac(-65.5),
      yFrac: yFrac(85.5),
    },
    {
      name: "l-hip-b",
      parent: "l-hip-a",
      xFrac: xFrac(-65.5),
      yFrac: yFrac(85.5),
    },
    {
      name: "l-knee",
      parent: "l-hip-b",
      xFrac: xFrac(-50.0),
      yFrac: yFrac(81.2),
    },
    {
      name: "l-ankle",
      parent: "l-knee",
      xFrac: xFrac(-65.3),
      yFrac: yFrac(67.7),
    },
    {
      name: "l-foot",
      parent: "l-ankle",
      xFrac: xFrac(-56.0),
      yFrac: yFrac(88.9),
    },

    { name: "tail", parent: "torso", xFrac: xFrac(33.0), yFrac: yFrac(56.2) },
  ],
};
