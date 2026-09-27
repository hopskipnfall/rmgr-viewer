import type { CharacterSkeleton } from "../skeleton.js";

/**
 * Fox's real 27-joint skeleton in a settled frame of the idle/standing animation (action state
 * 0x0A), sourced the same way as Pikachu's (see pikachu.ts's doc comment for the general
 * conventions, the two wrong iterations that preceded a usable extraction, and why yFrac/xFrac
 * normalize against this skeleton's own extents rather than the engine's literal Y=0). Positions
 * are absolute, relative to the fighter's tracked position at (0,0,0). Ten joints (3, 6, 8, 9, 12,
 * 14, 17, 19, 22, 26 - one pivot per limb chain, plus the head-tip and the ground reference) aren't
 * touched by the idle animation and stay at their rest-pose position.
 *
 * One joint is flagged as unverified rather than confirmed: the left leg (hip 20 -> knee 21 ->
 * foot 23) swings well above the right leg and above head height, unlike the right leg's clean,
 * monotonic hip-to-foot descent. This was checked for the same class of bug that produced
 * Pikachu's first wrong idle-pose extraction (a joint-mapping bug that zeroed out a hip's
 * axis-alignment rotation) - a full multi-frame trajectory check on this chain found smooth,
 * cleanly-looping rotations with no discontinuities, which rules out that specific failure mode.
 * The working theory is a genuine idle gesture (weight shifted onto the right leg, left leg
 * lifted/bent) rather than a bug, but this hasn't been confirmed against a visual reference (e.g.
 * Remix's own skeleton viewer). If the rendered left leg looks structurally wrong rather than just
 * "lifted," that's a real signal worth chasing further, not just idle-animation personality.
 */
const MIN_Y = 180.4; // right foot
const MAX_Y = 369.1; // left foot
const Y_RANGE = MAX_Y - MIN_Y;
const yFrac = (y: number): number => (y - MIN_Y) / Y_RANGE;

const MAX_X = 125.6; // right elbow
const xFrac = (x: number): number => x / MAX_X;

export const FOX_SKELETON: CharacterSkeleton = {
  joints: [
    { name: "root", parent: null, xFrac: xFrac(12.0), yFrac: yFrac(228.0) },
    {
      name: "torso",
      parent: "root",
      xFrac: xFrac(7.7),
      yFrac: yFrac(223.5),
    },
    {
      name: "chest",
      parent: "torso",
      xFrac: xFrac(7.7),
      yFrac: yFrac(223.5),
    },

    // Right arm: shoulder pivot 3 keeps its rest-pose position (not animated by idle)
    {
      name: "r-shoulder-a",
      parent: "chest",
      xFrac: xFrac(88.8),
      yFrac: yFrac(311.6),
    },
    {
      name: "r-shoulder-b",
      parent: "r-shoulder-a",
      xFrac: xFrac(92.4),
      yFrac: yFrac(269.1),
    },
    {
      name: "r-elbow",
      parent: "r-shoulder-b",
      xFrac: xFrac(125.6),
      yFrac: yFrac(279.4),
    },
    {
      name: "r-hand",
      parent: "r-elbow",
      xFrac: xFrac(99.1),
      yFrac: yFrac(347.4),
    },

    { name: "head", parent: "chest", xFrac: xFrac(12.1), yFrac: yFrac(303.9) },
    {
      name: "head-tip",
      parent: "head",
      xFrac: xFrac(0),
      yFrac: yFrac(348.8),
    },

    // Left arm: shoulder pivot 9 keeps its rest-pose position (not animated by idle)
    {
      name: "l-shoulder-a",
      parent: "chest",
      xFrac: xFrac(-88.8),
      yFrac: yFrac(311.6),
    },
    {
      name: "l-shoulder-b",
      parent: "l-shoulder-a",
      xFrac: xFrac(-63.9),
      yFrac: yFrac(300.9),
    },
    {
      name: "l-elbow",
      parent: "l-shoulder-b",
      xFrac: xFrac(-72.9),
      yFrac: yFrac(322.7),
    },
    {
      name: "l-wrist",
      parent: "l-elbow",
      xFrac: xFrac(-99.2),
      yFrac: yFrac(275.6),
    },
    {
      name: "l-gun-attach",
      parent: "l-wrist",
      xFrac: xFrac(-100.4),
      yFrac: yFrac(324.6),
    },

    // Right leg: hip pivot 14 and ankle pivot 17 keep their rest-pose position - clean,
    // monotonic hip-to-foot descent, the "normal standing" leg
    {
      name: "r-hip-a",
      parent: "torso",
      xFrac: xFrac(33.3),
      yFrac: yFrac(216.7),
    },
    {
      name: "r-hip-b",
      parent: "r-hip-a",
      xFrac: xFrac(40.2),
      yFrac: yFrac(196.6),
    },
    {
      name: "r-knee",
      parent: "r-hip-b",
      xFrac: xFrac(55.1),
      yFrac: yFrac(193.9),
    },
    {
      name: "r-ankle",
      parent: "r-knee",
      xFrac: xFrac(35.7),
      yFrac: yFrac(233.0),
    },
    {
      name: "r-foot",
      parent: "r-ankle",
      xFrac: xFrac(61.0),
      yFrac: yFrac(180.4),
    },

    // Left leg: hip pivot 19 and ankle pivot 22 keep their rest-pose position - see the doc
    // comment above, this chain's shape (lifted/bent, unlike the right leg) is unverified
    {
      name: "l-hip-a",
      parent: "torso",
      xFrac: xFrac(-33.3),
      yFrac: yFrac(216.7),
    },
    {
      name: "l-hip-b",
      parent: "l-hip-a",
      xFrac: xFrac(-9.6),
      yFrac: yFrac(183.7),
    },
    {
      name: "l-knee",
      parent: "l-hip-b",
      xFrac: xFrac(-38.3),
      yFrac: yFrac(285.8),
    },
    {
      name: "l-ankle",
      parent: "l-knee",
      xFrac: xFrac(-38.6),
      yFrac: yFrac(195.6),
    },
    {
      name: "l-foot",
      parent: "l-ankle",
      xFrac: xFrac(9.8),
      yFrac: yFrac(369.1),
    },

    {
      name: "tail-base",
      parent: "torso",
      xFrac: xFrac(-8.1),
      yFrac: yFrac(198.4),
    },
    {
      name: "tail-tip",
      parent: "tail-base",
      xFrac: xFrac(-52.6),
      yFrac: yFrac(253.6),
    },
  ],
};
