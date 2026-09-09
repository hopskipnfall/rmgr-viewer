import type { Frame, ItemUpdate, PortIndex, Replay } from "@rmg-k/rmgr";
import { ItemLinkId, WPKind, ITKind } from "@rmg-k/rmgr";
import { StageRenderer, type BackgroundTheme } from "../renderer.js";
import { Camera } from "../camera.js";
import {
  CHARACTER_NAMES,
  CHARACTER_NAMES_JA,
  getGameDefinitions,
} from "../lookups.js";
import { characterSize } from "../characterSizes.js";
import { CustomDropdown } from "../ui/customDropdown.js";
import { characterIconUrl } from "../characterIcons.js";

export interface CharacterOption {
  id: number;
  name: string;
  nameJa: string;
}

export interface CharacterGroupOption {
  groupName: string;
  characters: CharacterOption[];
}

export interface StateOption {
  id: number;
  name: string;
  category: "special" | "movement" | "crouch" | "defense" | "damage" | "attack";
  visualized?: boolean;
  visualizedDesc?: string;
}

export interface ItemCatalogEntry {
  kind: number;
  linkId: number;
  name: string;
  category: "weapon" | "item";
  customShape: boolean;
  description: string;
}

export type PreviewTheme =
  "grid" | "mountain" | "autumn" | "beach" | "opponent";

function makeCharacterOption(id: number): CharacterOption {
  const name =
    CHARACTER_NAMES[id] ?? `Unknown (0x${id.toString(16).padStart(2, "0")})`;
  const nameJa = CHARACTER_NAMES_JA[id] ?? "";
  return { id, name, nameJa };
}

export const CHARACTER_GROUPS: CharacterGroupOption[] = [
  {
    groupName: "Original 12",
    characters: [
      0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
    ].map(makeCharacterOption),
  },
  {
    groupName: "Remix Fighters",
    characters: [
      0x34, // Bowser
      0x1d, // Falco
      0x1e, // Ganondorf
      0x1f, // Young Link
      0x20, // Dr. Mario
      0x21, // Wario
      0x22, // Dark Samus
      0x26, // Lucas
      0x35, // Giga Bowser
      0x36, // Piano
      0x37, // Wolf
      0x38, // Conker
      0x39, // Mewtwo
      0x3a, // Marth
      0x3b, // Sonic
      0x3c, // Sandbag
      0x3d, // Super Sonic
      0x3e, // Sheik
      0x3f, // Marina
      0x40, // King Dedede
      0x41, // Goemon
      0x42, // Peppy
      0x43, // Slippy
      0x44, // Banjo
      0x45, // Metal Luigi
      0x46, // Ebisumaru
      0x47, // Dragon King
      0x48, // Crash
      0x49, // Peach
      0x4a, // Roy
      0x4b, // Dr. Luigi
      0x4c, // Lanky Kong
    ].map(makeCharacterOption),
  },
  {
    groupName: "Fighting Polygon Team",
    characters: [
      0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19,
      0x4d, 0x4e, 0x4f, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58,
      0x59, 0x5a, 0x5b, 0x5c, 0x5d, 0x5e, 0x5f, 0x60,
    ].map(makeCharacterOption),
  },
  {
    groupName: "Bosses & Specials",
    characters: [0x0c, 0x0d, 0x1a].map(makeCharacterOption),
  },
  {
    groupName: "Regional Variants",
    characters: [
      0x2a, 0x2b, 0x2c, 0x24, 0x27, 0x31, 0x28, 0x30, 0x29, 0x32, 0x2e, 0x25,
      0x23, 0x2d, 0x2f, 0x33,
    ].map(makeCharacterOption),
  },
];

export const ORIGINAL_CHARACTERS: CharacterOption[] = CHARACTER_GROUPS.flatMap(
  (g) => g.characters,
);

export const COMMON_STATES: StateOption[] = [
  // Movement
  { id: 0x00a, name: "Idle", category: "movement" },
  { id: 0x00b, name: "Walk1", category: "movement" },
  { id: 0x00f, name: "Dash", category: "movement" },
  { id: 0x010, name: "Run", category: "movement" },
  { id: 0x011, name: "RunBrake", category: "movement" },
  {
    id: 0x012,
    name: "Turn (Turnaround Yaw)",
    category: "movement",
    visualized: true,
    visualizedDesc: "3D Yaw & Inverted Body Geometry",
  },
  {
    id: 0x013,
    name: "TurnRun",
    category: "movement",
    visualized: true,
    visualizedDesc: "Turnrun 3D Yaw Direction Flip",
  },
  { id: 0x014, name: "JumpSquat", category: "movement" },
  { id: 0x016, name: "JumpF", category: "movement" },
  { id: 0x01a, name: "Fall", category: "movement" },

  // Crouch & Landings
  { id: 0x01c, name: "Crouch (Squat)", category: "crouch" },
  { id: 0x01d, name: "CrouchIdle", category: "crouch" },
  { id: 0x01e, name: "CrouchEnd", category: "crouch" },
  { id: 0x01f, name: "LandingLight", category: "crouch" },
  {
    id: 0x020,
    name: "LandingHeavy",
    category: "crouch",
    visualized: true,
    visualizedDesc: "Ground Impact Shockwave Dust Puff",
  },
  { id: 0x023, name: "Teeter (Ledge Balance)", category: "crouch" },

  // Defense & Shields
  {
    id: 0x098,
    name: "ShieldOn",
    category: "defense",
    visualized: true,
    visualizedDesc: "Forcefield Energy Sphere Activation",
  },
  {
    id: 0x099,
    name: "Shield (Hold)",
    category: "defense",
    visualized: true,
    visualizedDesc: "Dynamic Forcefield Bubble Energy Shield",
  },
  {
    id: 0x09a,
    name: "ShieldOff",
    category: "defense",
    visualized: true,
    visualizedDesc: "Shield Depletion Collapse",
  },
  {
    id: 0x09b,
    name: "ShieldStun (Vibrating)",
    category: "defense",
    visualized: true,
    visualizedDesc: "Shield Stun Vibration & Impact Ripple",
  },
  {
    id: 0x09c,
    name: "RollF (Ghost Translucent)",
    category: "defense",
    visualized: true,
    visualizedDesc: "Translucent Motion Blur Trail",
  },
  {
    id: 0x09d,
    name: "RollB",
    category: "defense",
    visualized: true,
    visualizedDesc: "Translucent Motion Blur Trail",
  },
  {
    id: 0x09e,
    name: "ShieldBreakFly",
    category: "defense",
    visualized: true,
    visualizedDesc: "Shield Break Launch & Orbiting Dizzy Stars",
  },
  {
    id: 0x0a0,
    name: "Tech In Place",
    category: "defense",
    visualized: true,
    visualizedDesc: "Breakfall Ground Flash & Upward Burst",
  },
  {
    id: 0x0a1,
    name: "Tech Forward",
    category: "defense",
    visualized: true,
    visualizedDesc: "Tech Roll Speed Lines & Breakfall Flash",
  },
  {
    id: 0x0a2,
    name: "Tech Backward",
    category: "defense",
    visualized: true,
    visualizedDesc: "Tech Roll Speed Lines & Breakfall Flash",
  },

  // Damage & Status Effects
  { id: 0x025, name: "DamageHigh", category: "damage" },
  { id: 0x028, name: "DamageMid", category: "damage" },
  { id: 0x02b, name: "DamageLow", category: "damage" },
  { id: 0x031, name: "DamageElec (Electric)", category: "damage" },
  { id: 0x033, name: "DamageFly (Hitstun Outline)", category: "damage" },
  {
    id: 0x039,
    name: "Tumble",
    category: "damage",
    visualized: true,
    visualizedDesc: "Swirling Reeling Wind Motion Streaks",
  },
  {
    id: 0x044,
    name: "Sleep",
    category: "damage",
    visualized: true,
    visualizedDesc: "Floating Animated Zzz Sleep Bubbles",
  },
  {
    id: 0x0a3,
    name: "Dizzy",
    category: "damage",
    visualized: true,
    visualizedDesc: "3 Orbiting Golden Dizzy Stars",
  },

  // Attacks
  { id: 0x0be, name: "Jab1", category: "attack" },
  { id: 0x0c0, name: "Dash Attack", category: "attack" },
  { id: 0x0c3, name: "FTilt", category: "attack" },
  { id: 0x0c7, name: "UTilt", category: "attack" },
  { id: 0x0c9, name: "DTilt", category: "attack" },
  { id: 0x0cc, name: "FSmash", category: "attack" },
  { id: 0x0cf, name: "USmash", category: "attack" },
  { id: 0x0d0, name: "DSmash", category: "attack" },
  { id: 0x0d1, name: "Nair", category: "attack" },
  { id: 0x0a6, name: "Grab", category: "attack" },
  {
    id: 0x0a9,
    name: "Grabbed",
    category: "attack",
    visualized: true,
    visualizedDesc: "Capture Hold Lock Brackets [ ]",
  },
  {
    id: 0x0ab,
    name: "Capture Wait",
    category: "attack",
    visualized: true,
    visualizedDesc: "Capture Lock Brackets [ ]",
  },
  {
    id: 0x0aa,
    name: "Taunt",
    category: "attack",
    visualized: true,
    visualizedDesc: "Rainbow Color Cycling Taunt Animation",
  },
  {
    id: 0x0bd,
    name: "Egg Encased (Yoshi Trap)",
    category: "damage",
    visualized: true,
    visualizedDesc: "Enclosing Yoshi Egg Shell Trap",
  },
];

export function getCharacterSpecialStates(characterId: number): StateOption[] {
  // Captain Falcon
  if (characterId === 0x07 || characterId === 0x15 || characterId === 0x28) {
    return [
      {
        id: 0x0e6,
        name: "Falcon Punch (Ground)",
        category: "special",
        visualized: true,
        visualizedDesc: "Flame Punch & Raptor Fire Aura",
      },
      {
        id: 0x0e7,
        name: "Falcon Punch (Air)",
        category: "special",
        visualized: true,
        visualizedDesc: "Aerial Falcon Punch Fire Aura",
      },
      {
        id: 0x0e8,
        name: "Falcon Dive Reach (Up-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Falcon Dive Upward Reach Flare",
      },
      {
        id: 0x0ea,
        name: "Falcon Dive Catch (Lock)",
        category: "special",
        visualized: true,
        visualizedDesc: "Falcon Dive Catch Lock",
      },
      {
        id: 0x0ee,
        name: "Falcon Dive Explosion",
        category: "special",
        visualized: true,
        visualizedDesc: "Fiery Detonation Explosion",
      },
      {
        id: 0x0eb,
        name: "Falcon Kick (Down-B Flame)",
        category: "special",
        visualized: true,
        visualizedDesc: "Flame Kick Forward Streak",
      },
      {
        id: 0x0ed,
        name: "Falcon Kick End",
        category: "special",
        visualized: true,
        visualizedDesc: "Falcon Kick Deceleration",
      },
    ];
  }

  // Fox / Falco / Wolf
  if (
    characterId === 0x01 ||
    characterId === 0x0f ||
    characterId === 0x1d ||
    characterId === 0x29 ||
    characterId === 0x37 ||
    characterId === 0x55
  ) {
    return [
      {
        id: 0x0e4,
        name: "Fire Fox Charge (Sparks)",
        category: "special",
        visualized: true,
        visualizedDesc: "Charging Fire Spark Aura",
      },
      {
        id: 0x0e8,
        name: "Fire Fox Flight (Directional Flame)",
        category: "special",
        visualized: true,
        visualizedDesc: "Directional Flame Jet & Streak Trail",
      },
      {
        id: 0x0ea,
        name: "Fire Fox End",
        category: "special",
        visualized: true,
        visualizedDesc: "Flight Deceleration Flare",
      },
      {
        id: 0x0ed,
        name: "Reflector / Shine Start",
        category: "special",
        visualized: true,
        visualizedDesc: "Hexagonal Reflector Burst",
      },
      {
        id: 0x0ee,
        name: "Reflector / Shine Loop",
        category: "special",
        visualized: true,
        visualizedDesc: "Hexagonal Energy Forcefield",
      },
      {
        id: 0x0ef,
        name: "Reflector / Shine Hit",
        category: "special",
        visualized: true,
        visualizedDesc: "Reflector Reflect Impact Flash",
      },
      {
        id: 0x0f0,
        name: "Reflector / Shine End",
        category: "special",
        visualized: true,
        visualizedDesc: "Reflector Collapse",
      },
      {
        id: 0x0e1,
        name: "Blaster (Laser Shot)",
        category: "special",
        visualized: true,
        visualizedDesc: "Blaster Muzzle Flash & Laser",
      },
    ];
  }

  // Pikachu
  if (
    characterId === 0x09 ||
    characterId === 0x17 ||
    characterId === 0x2d ||
    characterId === 0x32
  ) {
    return [
      {
        id: 0x0e6,
        name: "Thunder Jolt Ground (Neutral-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Rolling Electric Ground Wave",
      },
      {
        id: 0x0e7,
        name: "Thunder Jolt Air (Neutral-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Bouncing Electric Spark Orb",
      },
      {
        id: 0x0e3,
        name: "Thunder (Down-B Cloud/Bolt)",
        category: "special",
        visualized: true,
        visualizedDesc: "Thunder Cloud & Electric Strike",
      },
      {
        id: 0x0e8,
        name: "Quick Attack (Up-B Startup)",
        category: "special",
        visualized: true,
        visualizedDesc: "Quick Attack Charging Sparks",
      },
      {
        id: 0x0ec,
        name: "Quick Attack Zip (Electric)",
        category: "special",
        visualized: true,
        visualizedDesc: "Electric Streak Motion Trail",
      },
      {
        id: 0x0ea,
        name: "Quick Attack Landing",
        category: "special",
        visualized: true,
        visualizedDesc: "Electric Deceleration Flash",
      },
    ];
  }

  // Mario / Luigi / Dr. Mario
  if (
    characterId === 0x00 ||
    characterId === 0x04 ||
    characterId === 0x0d ||
    characterId === 0x0e ||
    characterId === 0x12 ||
    characterId === 0x20 ||
    characterId === 0x45 ||
    characterId === 0x4b
  ) {
    return [
      {
        id: 0x0dc,
        name: "Fireball (Neutral-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Fiery Muzzle Launch Effect",
      },
      {
        id: 0x0e0,
        name: "Super Jump Punch (Up-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Coin Sparks & Upward Leap",
      },
      {
        id: 0x0e4,
        name: "Tornado / Cyclone (Down-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Spinning Cyclone Wind Vortex",
      },
    ];
  }

  // Kirby
  if (characterId === 0x08 || characterId === 0x16) {
    return [
      {
        id: 0x0dc,
        name: "Inhale (Neutral-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Vacuum Inhale Wind Funnel",
      },
      {
        id: 0x0e5,
        name: "Final Cutter (Up-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Rising Blade & Downward Wave",
      },
      {
        id: 0x0eb,
        name: "Stone (Down-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Solid Stone Form Transmutation",
      },
    ];
  }

  // Jigglypuff
  if (characterId === 0x0a || characterId === 0x18) {
    return [
      {
        id: 0x0dc,
        name: "Pound (Neutral-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Forward Pound Wind Gust",
      },
      {
        id: 0x0e2,
        name: "Sing (Up-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Hypnotic Sing Musical Notes",
      },
      {
        id: 0x0ea,
        name: "Rest (Down-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Critical Detonation & Sleep Flare",
      },
    ];
  }

  // Ness / Lucas
  if (characterId === 0x0b || characterId === 0x19 || characterId === 0x26) {
    return [
      {
        id: 0x0dc,
        name: "PK Fire (Neutral-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "PK Fire Energy Spark Release",
      },
      {
        id: 0x0e0,
        name: "PK Thunder (Up-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "PK Thunder Guiding Lightning Ball",
      },
      {
        id: 0x0e3,
        name: "PSI Magnet (Down-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Spherical Absorption Barrier",
      },
    ];
  }

  // Link / Young Link
  if (characterId === 0x06 || characterId === 0x14 || characterId === 0x1f) {
    return [
      {
        id: 0x0dc,
        name: "Boomerang (Neutral-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Boomerang Toss Wind Stream",
      },
      {
        id: 0x0e3,
        name: "Spin Attack (Up-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Whirlwind Sword Spin Aura",
      },
      {
        id: 0x0e6,
        name: "Bomb Pull (Down-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Link Bomb Extraction",
      },
    ];
  }

  // Samus / Dark Samus
  if (characterId === 0x03 || characterId === 0x11 || characterId === 0x22) {
    return [
      {
        id: 0x0dc,
        name: "Charge Shot Charging",
        category: "special",
        visualized: true,
        visualizedDesc: "Pulsing Energy Cannon Glow",
      },
      {
        id: 0x0df,
        name: "Charge Shot Release",
        category: "special",
        visualized: true,
        visualizedDesc: "Energy Blast Muzzle Flare",
      },
      {
        id: 0x0e4,
        name: "Screw Attack (Up-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Spinning Electric Somersault Field",
      },
      {
        id: 0x0e6,
        name: "Morph Ball / Bomb (Down-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Spherical Morph Transmutation",
      },
    ];
  }

  // Yoshi
  if (characterId === 0x05 || characterId === 0x13) {
    return [
      {
        id: 0x0df,
        name: "Egg Lay Tongue (Neutral-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Lashing Tongue Catch",
      },
      {
        id: 0x0de,
        name: "Egg Throw (Up-B)",
        category: "special",
        visualized: false,
      },
      {
        id: 0x0e4,
        name: "Yoshi Bomb (Down-B Start)",
        category: "special",
        visualized: true,
        visualizedDesc: "Somersault Bomb Flip",
      },
      {
        id: 0x0e2,
        name: "Yoshi Bomb (Plummet)",
        category: "special",
        visualized: true,
        visualizedDesc: "Downward Hip Drop Plummet",
      },
      {
        id: 0x0e1,
        name: "Yoshi Bomb (Landing)",
        category: "special",
        visualized: true,
        visualizedDesc: "Ground Slam Stars & Shockwave",
      },
    ];
  }

  // Donkey Kong
  if (characterId === 0x02 || characterId === 0x10) {
    return [
      {
        id: 0x0dc,
        name: "Giant Punch Windup (Neutral-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Arm Windup Rotation",
      },
      {
        id: 0x0dd,
        name: "Giant Punch Release",
        category: "special",
        visualized: true,
        visualizedDesc: "Heavy Impact Punch Blast",
      },
      {
        id: 0x0e4,
        name: "Spinning Kong (Up-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Whirling Dual Fist Spin",
      },
      {
        id: 0x0e6,
        name: "Hand Slap (Down-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Ground Quake Slap Shockwave",
      },
    ];
  }

  // Bowser / Giga Bowser
  if (characterId === 0x34 || characterId === 0x35) {
    return [
      {
        id: 0x0dc,
        name: "Fire Breath (Neutral-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Continuous Flame Blast Stream",
      },
      {
        id: 0x0e0,
        name: "Whirling Fortress (Up-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Spinning Spiked Shell Fortress",
      },
      {
        id: 0x0e4,
        name: "Bowser Bomb (Down-B)",
        category: "special",
        visualized: true,
        visualizedDesc: "Crushing Shell Ground Pound",
      },
    ];
  }

  return [];
}

export const ITEM_CATALOG: ItemCatalogEntry[] = [
  // Weapons / Projectiles (ItemLinkId.Weapon = 5)
  {
    kind: WPKind.Fireball,
    linkId: ItemLinkId.Weapon,
    name: "Fireball",
    category: "weapon",
    customShape: true,
    description: "Mario / Luigi Neutral-B bouncing fireball with flame aura",
  },
  {
    kind: WPKind.Blaster,
    linkId: ItemLinkId.Weapon,
    name: "Blaster Laser",
    category: "weapon",
    customShape: true,
    description: "Fox Neutral-B high-velocity blaster laser bolt",
  },
  {
    kind: WPKind.ChargeShot,
    linkId: ItemLinkId.Weapon,
    name: "Charge Shot",
    category: "weapon",
    customShape: true,
    description: "Samus Neutral-B pulsing energy orb projectile",
  },
  {
    kind: WPKind.SamusBomb,
    linkId: ItemLinkId.Weapon,
    name: "Samus Bomb",
    category: "weapon",
    customShape: true,
    description: "Samus Down-B morph ball bomb trap",
  },
  {
    kind: WPKind.Cutter,
    linkId: ItemLinkId.Weapon,
    name: "Final Cutter Wave",
    category: "weapon",
    customShape: true,
    description: "Kirby Up-B razor wind blade projectile",
  },
  {
    kind: WPKind.EggThrow,
    linkId: ItemLinkId.Weapon,
    name: "Egg Throw",
    category: "weapon",
    customShape: true,
    description: "Yoshi Up-B thrown spotted egg with shell geometry",
  },
  {
    kind: WPKind.YoshiStar,
    linkId: ItemLinkId.Weapon,
    name: "Yoshi Star",
    category: "weapon",
    customShape: true,
    description: "Yoshi Down-B ground impact spark star",
  },
  {
    kind: WPKind.Boomerang,
    linkId: ItemLinkId.Weapon,
    name: "Boomerang",
    category: "weapon",
    customShape: true,
    description: "Link Neutral-B rotating wooden boomerang with curved wings",
  },
  {
    kind: WPKind.SpinAttack,
    linkId: ItemLinkId.Weapon,
    name: "Spin Attack Aura",
    category: "weapon",
    customShape: false,
    description: "Link Up-B whirlwind sword hitbox",
  },
  {
    kind: WPKind.ThunderJoltAir,
    linkId: ItemLinkId.Weapon,
    name: "Thunder Jolt (Air)",
    category: "weapon",
    customShape: true,
    description: "Pikachu Neutral-B bouncing aerial spark projectile",
  },
  {
    kind: WPKind.ThunderJoltGround,
    linkId: ItemLinkId.Weapon,
    name: "Thunder Jolt (Ground)",
    category: "weapon",
    customShape: true,
    description: "Pikachu Neutral-B ground-crawling electric wave",
  },
  {
    kind: WPKind.ThunderHead,
    linkId: ItemLinkId.Weapon,
    name: "Thunder Head",
    category: "weapon",
    customShape: true,
    description: "Pikachu Down-B descending lightning bolt leader",
  },
  {
    kind: WPKind.ThunderTrail,
    linkId: ItemLinkId.Weapon,
    name: "Thunder Trail",
    category: "weapon",
    customShape: true,
    description: "Pikachu Down-B electric trail segment",
  },
  {
    kind: WPKind.PKFire,
    linkId: ItemLinkId.Weapon,
    name: "PK Fire",
    category: "weapon",
    customShape: true,
    description: "Ness Neutral-B horizontal spark burst",
  },
  {
    kind: WPKind.PKThunderHead,
    linkId: ItemLinkId.Weapon,
    name: "PK Thunder Head",
    category: "weapon",
    customShape: true,
    description: "Ness Up-B controllable lightning orb",
  },
  {
    kind: WPKind.PKThunderTrail,
    linkId: ItemLinkId.Weapon,
    name: "PK Thunder Trail",
    category: "weapon",
    customShape: true,
    description: "Ness Up-B electric tail segment",
  },
  {
    kind: WPKind.BulletNormal,
    linkId: ItemLinkId.Weapon,
    name: "Ray Gun Bullet",
    category: "weapon",
    customShape: true,
    description: "Standard high-speed energy pellet",
  },
  {
    kind: WPKind.BulletHard,
    linkId: ItemLinkId.Weapon,
    name: "Hard Bullet",
    category: "weapon",
    customShape: true,
    description: "Heavy piercing projectile",
  },
  {
    kind: WPKind.ArwingLaser2D,
    linkId: ItemLinkId.Weapon,
    name: "Arwing Laser 2D",
    category: "weapon",
    customShape: true,
    description: "Sector Z stage Arwing laser fire",
  },
  {
    kind: WPKind.ArwingLaser3D,
    linkId: ItemLinkId.Weapon,
    name: "Arwing Laser 3D",
    category: "weapon",
    customShape: true,
    description: "Sector Z background Arwing laser fire",
  },
  {
    kind: WPKind.LGunAmmo,
    linkId: ItemLinkId.Weapon,
    name: "Light Gun Ammo",
    category: "weapon",
    customShape: true,
    description: "Ray Gun ammo energy projectile",
  },
  {
    kind: WPKind.FFlowerFlame,
    linkId: ItemLinkId.Weapon,
    name: "Fire Flower Flame",
    category: "weapon",
    customShape: true,
    description: "Continuous stream of fire particles",
  },
  {
    kind: WPKind.StarRodStar,
    linkId: ItemLinkId.Weapon,
    name: "Star Rod Star",
    category: "weapon",
    customShape: true,
    description: "Star projectile swung from Star Rod",
  },

  // Standard Items & Hazards (ItemLinkId.Item = 4)
  {
    kind: ITKind.Bomb,
    linkId: ItemLinkId.Item,
    name: "Bomb",
    category: "item",
    customShape: true,
    description:
      "Link's pulled bomb: spherical body, brass collar, burning fuse & sparks",
  },
  {
    kind: ITKind.BobOmb,
    linkId: ItemLinkId.Item,
    name: "Bob-omb",
    category: "item",
    customShape: true,
    description:
      "Walking mechanical explosive bomb with wind-up key and burning fuse",
  },
  {
    kind: ITKind.RTTFBomb,
    linkId: ItemLinkId.Item,
    name: "RTTF Bomb",
    category: "item",
    customShape: true,
    description: "Race to the Finish stadium explosive bomb obstacle",
  },
  {
    kind: 0xfe,
    linkId: ItemLinkId.Item,
    name: "Bomb Explosion",
    category: "item",
    customShape: true,
    description:
      "Detonation blast: shockwave, fireballs, flying sparks, and rising smoke",
  },
  {
    kind: ITKind.MaximTomato,
    linkId: ItemLinkId.Item,
    name: "Maxim Tomato",
    category: "item",
    customShape: true,
    description: "Kirby series tomato healing +100% damage",
  },
  {
    kind: ITKind.Heart,
    linkId: ItemLinkId.Item,
    name: "Heart Container",
    category: "item",
    customShape: true,
    description: "Zelda heart container fully healing 0% damage",
  },
  {
    kind: ITKind.Star,
    linkId: ItemLinkId.Item,
    name: "Super Star",
    category: "item",
    customShape: true,
    description: "Mario super star granting temporary invincibility",
  },
  {
    kind: ITKind.BeamSword,
    linkId: ItemLinkId.Item,
    name: "Beam Sword",
    category: "item",
    customShape: true,
    description: "Glowing energy melee sword weapon",
  },
  {
    kind: ITKind.HomeRunBat,
    linkId: ItemLinkId.Item,
    name: "Home Run Bat",
    category: "item",
    customShape: true,
    description: "Smash bat capable of instant knockout forward smashes",
  },
  {
    kind: ITKind.Fan,
    linkId: ItemLinkId.Item,
    name: "Fan",
    category: "item",
    customShape: true,
    description: "Paper fan with ultra-fast attack speed",
  },
  {
    kind: ITKind.StarRod,
    linkId: ItemLinkId.Item,
    name: "Star Rod",
    category: "item",
    customShape: true,
    description: "Wand that fires stars on smash attacks",
  },
  {
    kind: ITKind.RayGun,
    linkId: ItemLinkId.Item,
    name: "Ray Gun",
    category: "item",
    customShape: true,
    description: "Blaster weapon with 16 rapid-fire energy shots",
  },
  {
    kind: ITKind.FireFlower,
    linkId: ItemLinkId.Item,
    name: "Fire Flower",
    category: "item",
    customShape: true,
    description: "Flamethrower weapon burning opponents",
  },
  {
    kind: ITKind.Hammer,
    linkId: ItemLinkId.Item,
    name: "Hammer",
    category: "item",
    customShape: true,
    description: "Heavy swinging mallet with invincible walking music",
  },
  {
    kind: ITKind.MotionSensorBomb,
    linkId: ItemLinkId.Item,
    name: "Motion Sensor Bomb",
    category: "item",
    customShape: true,
    description: "Proximity mine sticking to stage ground or walls",
  },
  {
    kind: ITKind.Bumper,
    linkId: ItemLinkId.Item,
    name: "Bumper",
    category: "item",
    customShape: true,
    description: "Stationary pinball bumper launching fighters on contact",
  },
  {
    kind: ITKind.GreenShell,
    linkId: ItemLinkId.Item,
    name: "Green Shell",
    category: "item",
    customShape: true,
    description: "Sliding koopa shell ricocheting across stage",
  },
  {
    kind: ITKind.RedShell,
    linkId: ItemLinkId.Item,
    name: "Red Shell",
    category: "item",
    customShape: true,
    description: "Patrolling shell seeking out opponents",
  },
  {
    kind: ITKind.Pokeball,
    linkId: ItemLinkId.Item,
    name: "Poké Ball",
    category: "item",
    customShape: true,
    description: "Summons random Pokémon companions with various effects",
  },
  {
    kind: ITKind.PKFirePillar,
    linkId: ItemLinkId.Item,
    name: "PK Fire Pillar",
    category: "item",
    customShape: true,
    description: "Stationary column of fire upon PK Fire impact",
  },
  {
    kind: ITKind.Crate,
    linkId: ItemLinkId.Item,
    name: "Crate",
    category: "item",
    customShape: true,
    description: "Large container holding multiple items",
  },
  {
    kind: ITKind.Barrel,
    linkId: ItemLinkId.Item,
    name: "Barrel",
    category: "item",
    customShape: true,
    description: "Rolling container holding items",
  },
  {
    kind: ITKind.Capsule,
    linkId: ItemLinkId.Item,
    name: "Capsule",
    category: "item",
    customShape: true,
    description: "Small thrown capsule holding a single item",
  },
  {
    kind: ITKind.Egg,
    linkId: ItemLinkId.Item,
    name: "Egg (Item)",
    category: "item",
    customShape: true,
    description: "Breakable egg container holding items or recovery",
  },
  {
    kind: ITKind.PowBlock,
    linkId: ItemLinkId.Item,
    name: "POW Block",
    category: "item",
    customShape: true,
    description: "Hits ground causing earthquake damage to grounded fighters",
  },
  {
    kind: ITKind.StageBumper,
    linkId: ItemLinkId.Item,
    name: "Stage Bumper",
    category: "item",
    customShape: true,
    description: "Peach's Castle stage floating bumper obstacle",
  },
  {
    kind: ITKind.PiranhaPlant,
    linkId: ItemLinkId.Item,
    name: "Piranha Plant",
    category: "item",
    customShape: false,
    description: "Mushroom Kingdom pipe hazard",
  },
  {
    kind: ITKind.Target,
    linkId: ItemLinkId.Item,
    name: "Break the Targets Target",
    category: "item",
    customShape: false,
    description: "Target smash target obstacle",
  },
  {
    kind: ITKind.Chansey,
    linkId: ItemLinkId.Item,
    name: "Chansey",
    category: "item",
    customShape: false,
    description: "Chansey tossing lucky eggs",
  },
  {
    kind: ITKind.BowserBomb,
    linkId: ItemLinkId.Item,
    name: "Bowser Castle Stadium Bomb",
    category: "item",
    customShape: false,
    description: "Custom stadium bomb obstacle in Bowser's Castle",
  },
];

export class CharacterPreviewController {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private renderer: StageRenderer;
  private camera: Camera;

  // Active Main Mode
  public activeMode: "characters" | "items" = "characters";

  // Character Mode State
  public characterId = 0x07; // Captain Falcon
  public actionStateId = 0x00a; // Idle
  public selectedCategory: string = "visualized";
  public currentTheme: PreviewTheme = "grid";
  public compareAllThemes = false;
  public actionFrameCounter = 0;
  public isPlaying = false;
  public flightAngleDeg = 45;

  // Items Mode State
  public selectedItemIndex = 0;
  public itemViewMode: "single" | "grid" = "single";
  public itemCategoryFilter: "all" | "weapon" | "item" = "all";
  public isLuigiFireball = false;
  public isBombDetonating = false;

  private animFrameId: number | null = null;

  // DOM Elements
  private modeCharsBtn!: HTMLButtonElement;
  private modeItemsBtn!: HTMLButtonElement;
  private charControlsWrap!: HTMLDivElement;
  private itemControlsWrap!: HTMLDivElement;

  // Character Controls
  private charSelectEl!: HTMLSelectElement;
  private customCharDropdown?: CustomDropdown<string>;
  private stateSelectEl!: HTMLSelectElement;
  private hexInputEl!: HTMLInputElement;
  private stateChipsContainer!: HTMLDivElement;
  private angleControlWrap!: HTMLDivElement;
  private angleSliderEl!: HTMLInputElement;
  private angleValEl!: HTMLSpanElement;
  private themeChipsContainer!: HTMLDivElement;
  private compareThemesBtn!: HTMLButtonElement;
  private categoryBtnsContainer!: HTMLDivElement;
  private charInfoCardEl!: HTMLDivElement;

  // Items Controls
  private itemSelectEl!: HTMLSelectElement;
  private itemCategoryBtnsContainer!: HTMLDivElement;
  private itemViewSingleBtn!: HTMLButtonElement;
  private itemViewGridBtn!: HTMLButtonElement;
  private itemLuigiToggleWrap!: HTMLDivElement;
  private itemLuigiCheckbox!: HTMLInputElement;
  private itemDetonateWrap!: HTMLDivElement;
  private itemDetonateCheckbox!: HTMLInputElement;
  private itemInfoCardEl!: HTMLDivElement;

  // Scrubber Elements (shared across both modes)
  private badgeTitleEl!: HTMLDivElement;
  private badgeSubtitleEl!: HTMLDivElement;
  private frameSliderEl!: HTMLInputElement;
  private frameValEl!: HTMLSpanElement;
  private playPauseBtn!: HTMLButtonElement;
  private stepBackBtn!: HTMLButtonElement;
  private stepFwdBtn!: HTMLButtonElement;

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.buildDOM();
    this.canvas = this.container.querySelector("canvas") as HTMLCanvasElement;
    this.renderer = new StageRenderer(this.canvas);
    this.camera = new Camera(this.canvas.width, this.canvas.height);
    this.attachEvents();
  }

  private buildDOM(): void {
    this.container.innerHTML = `
      <div class="preview-stage-wrap">
        <div class="preview-canvas-container">
          <canvas class="preview-canvas" width="960" height="540"></canvas>
          <div class="preview-overlay-badge">
            <div class="preview-overlay-title" id="previewBadgeTitle">Character Preview</div>
            <div class="preview-overlay-subtitle" id="previewBadgeSubtitle">State: 0x00a (Idle)</div>
          </div>
        </div>
      </div>

      <aside class="preview-sidebar">
        <!-- Top-level Mode Switch -->
        <div class="preview-control-group">
          <label class="preview-control-label">Debug Preview Mode</label>
          <div class="preview-mode-switch">
            <button class="preview-mode-btn active" id="previewModeCharsBtn">👤 Characters</button>
            <button class="preview-mode-btn" id="previewModeItemsBtn">🗡️ Items & Weapons</button>
          </div>
        </div>

        <!-- ================= CHARACTERS CONTROLS ================= -->
        <div id="previewCharControls" style="display:flex;flex-direction:column;gap:12px;">
          <!-- Character Selector -->
          <div class="preview-control-group">
            <label class="preview-control-label">Character</label>
            <select id="previewCharSelect" class="preview-select">
              ${CHARACTER_GROUPS.map(
                (group) => `
                <optgroup label="${group.groupName}">
                  ${group.characters
                    .map(
                      (c) =>
                        `<option value="${c.id}" ${c.id === this.characterId ? "selected" : ""}>0x${c.id.toString(16).padStart(2, "0")} - ${c.name} (${c.nameJa})</option>`,
                    )
                    .join("")}
                </optgroup>`,
              ).join("")}
            </select>
          </div>

          <!-- Theme Palette Selection & Comparison -->
          <div class="preview-control-group">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <label class="preview-control-label">Theme Palette</label>
              <button id="previewCompareThemesBtn" class="preview-chip-btn" style="font-size:11px;padding:3px 7px;">🗂️ Compare All 5 Themes</button>
            </div>
            <div class="preview-btn-row" id="previewThemeBtns">
              <button class="preview-chip-btn active" data-theme="grid">Grid</button>
              <button class="preview-chip-btn" data-theme="mountain">Mountain</button>
              <button class="preview-chip-btn" data-theme="autumn">Autumn</button>
              <button class="preview-chip-btn" data-theme="beach">Beach</button>
              <button class="preview-chip-btn" data-theme="opponent">Opponent</button>
            </div>
          </div>

          <!-- State Category Filter -->
          <div class="preview-control-group">
            <label class="preview-control-label">State Filter</label>
            <div class="preview-btn-row" id="previewCategoryBtns">
              <button class="preview-chip-btn has-star active" data-cat="visualized">★ Custom Visualized</button>
              <button class="preview-chip-btn" data-cat="all">All</button>
              <button class="preview-chip-btn" data-cat="special">Specials</button>
              <button class="preview-chip-btn" data-cat="defense">Defense & Shields</button>
              <button class="preview-chip-btn" data-cat="status">Status & CC</button>
              <button class="preview-chip-btn" data-cat="movement">Movement</button>
              <button class="preview-chip-btn" data-cat="attack">Attacks</button>
            </div>
          </div>

          <!-- Action State Selector & Hex Input -->
          <div class="preview-control-group">
            <label class="preview-control-label">Action State</label>
            <select id="previewStateSelect" class="preview-select"></select>
            <div style="display:flex;gap:6px;margin-top:4px;">
              <input type="text" id="previewHexInput" class="preview-select" placeholder="Hex ID e.g. 0x0ee or dec" style="font-family:monospace;" />
              <button id="previewApplyHexBtn" class="preview-chip-btn">Apply</button>
            </div>
          </div>

          <!-- State Quick Chips -->
          <div class="preview-control-group">
            <label class="preview-control-label">Quick Select States</label>
            <div id="previewStateChips" class="preview-btn-row" style="max-height:150px;overflow-y:auto;"></div>
          </div>

          <!-- State Detail Card -->
          <div id="previewCharInfoCard" class="preview-info-card"></div>

          <!-- Flight Angle Control (For Fox Fire Fox) -->
          <div class="preview-control-group" id="previewAngleWrap" hidden>
            <label class="preview-control-label">Flight Angle (Degrees)</label>
            <div class="preview-slider-row">
              <input type="range" id="previewAngleSlider" min="0" max="360" value="45" />
              <span id="previewAngleVal" class="preview-slider-val">45°</span>
            </div>
          </div>
        </div>

        <!-- ================= ITEMS & WEAPONS CONTROLS ================= -->
        <div id="previewItemControls" style="display:none;flex-direction:column;gap:12px;">
          <!-- View Mode: Single vs Grid -->
          <div class="preview-control-group">
            <label class="preview-control-label">Showcase View</label>
            <div class="preview-btn-row">
              <button class="preview-chip-btn active" id="previewItemViewSingle">🎯 Single Item Focus</button>
              <button class="preview-chip-btn" id="previewItemViewGrid">🍱 Show All Grid (30+)</button>
            </div>
          </div>

          <!-- Category Filter -->
          <div class="preview-control-group">
            <label class="preview-control-label">Catalog Category</label>
            <div class="preview-btn-row" id="previewItemCatBtns">
              <button class="preview-chip-btn active" data-icat="all">All (${ITEM_CATALOG.length})</button>
              <button class="preview-chip-btn" data-icat="weapon">Weapons / Projectiles</button>
              <button class="preview-chip-btn" data-icat="item">Items & Hazards</button>
            </div>
          </div>

          <!-- Item Selector -->
          <div class="preview-control-group" id="previewItemSelectGroup">
            <label class="preview-control-label">Select Item / Weapon</label>
            <select id="previewItemSelect" class="preview-select"></select>
          </div>

          <!-- Luigi Fireball Variant Toggle -->
          <div class="preview-control-group" id="previewItemLuigiWrap" style="display:none;">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;">
              <input type="checkbox" id="previewItemLuigiCheck" />
              <span>Luigi Fireball Variant (Green / Cyan Core)</span>
            </label>
          </div>

          <!-- Detonate Bomb on Loop Toggle -->
          <div class="preview-control-group" id="previewItemDetonateWrap" style="display:none;">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;">
              <input type="checkbox" id="previewItemDetonateCheck" />
              <span>Detonate Bomb on Loop (Fuse ➔ Blast)</span>
            </label>
          </div>

          <!-- Item Detail Card -->
          <div id="previewItemInfoCard" class="preview-info-card"></div>
        </div>

        <!-- Animation / Frame Counter (Shared Scrubber) -->
        <div class="preview-control-group" style="margin-top:auto;padding-top:8px;border-top:1px solid var(--panel-border);">
          <label class="preview-control-label">Frame Animation (0-60)</label>
          <div class="preview-slider-row">
            <button id="previewPlayPauseBtn" class="preview-chip-btn">⏸ Pause</button>
            <button id="previewStepBackBtn" class="preview-chip-btn">⏮</button>
            <button id="previewStepFwdBtn" class="preview-chip-btn">⏭</button>
            <input type="range" id="previewFrameSlider" min="0" max="60" value="0" />
            <span id="previewFrameVal" class="preview-slider-val">#0</span>
          </div>
        </div>
      </aside>
    `;
  }

  private attachEvents(): void {
    // Top-level Mode elements
    this.modeCharsBtn = this.container.querySelector(
      "#previewModeCharsBtn",
    ) as HTMLButtonElement;
    this.modeItemsBtn = this.container.querySelector(
      "#previewModeItemsBtn",
    ) as HTMLButtonElement;
    this.charControlsWrap = this.container.querySelector(
      "#previewCharControls",
    ) as HTMLDivElement;
    this.itemControlsWrap = this.container.querySelector(
      "#previewItemControls",
    ) as HTMLDivElement;

    // Characters Controls
    this.charSelectEl = this.container.querySelector(
      "#previewCharSelect",
    ) as HTMLSelectElement;
    this.stateSelectEl = this.container.querySelector(
      "#previewStateSelect",
    ) as HTMLSelectElement;
    this.hexInputEl = this.container.querySelector(
      "#previewHexInput",
    ) as HTMLInputElement;
    this.stateChipsContainer = this.container.querySelector(
      "#previewStateChips",
    ) as HTMLDivElement;
    this.angleControlWrap = this.container.querySelector(
      "#previewAngleWrap",
    ) as HTMLDivElement;
    this.angleSliderEl = this.container.querySelector(
      "#previewAngleSlider",
    ) as HTMLInputElement;
    this.angleValEl = this.container.querySelector(
      "#previewAngleVal",
    ) as HTMLSpanElement;
    this.themeChipsContainer = this.container.querySelector(
      "#previewThemeBtns",
    ) as HTMLDivElement;
    this.compareThemesBtn = this.container.querySelector(
      "#previewCompareThemesBtn",
    ) as HTMLButtonElement;
    this.categoryBtnsContainer = this.container.querySelector(
      "#previewCategoryBtns",
    ) as HTMLDivElement;
    this.charInfoCardEl = this.container.querySelector(
      "#previewCharInfoCard",
    ) as HTMLDivElement;

    // Items Controls
    this.itemSelectEl = this.container.querySelector(
      "#previewItemSelect",
    ) as HTMLSelectElement;
    this.itemCategoryBtnsContainer = this.container.querySelector(
      "#previewItemCatBtns",
    ) as HTMLDivElement;
    this.itemViewSingleBtn = this.container.querySelector(
      "#previewItemViewSingle",
    ) as HTMLButtonElement;
    this.itemViewGridBtn = this.container.querySelector(
      "#previewItemViewGrid",
    ) as HTMLButtonElement;
    this.itemLuigiToggleWrap = this.container.querySelector(
      "#previewItemLuigiWrap",
    ) as HTMLDivElement;
    this.itemLuigiCheckbox = this.container.querySelector(
      "#previewItemLuigiCheck",
    ) as HTMLInputElement;
    this.itemDetonateWrap = this.container.querySelector(
      "#previewItemDetonateWrap",
    ) as HTMLDivElement;
    this.itemDetonateCheckbox = this.container.querySelector(
      "#previewItemDetonateCheck",
    ) as HTMLInputElement;
    this.itemInfoCardEl = this.container.querySelector(
      "#previewItemInfoCard",
    ) as HTMLDivElement;

    // Shared Scrubber & Badge
    this.badgeTitleEl = this.container.querySelector(
      "#previewBadgeTitle",
    ) as HTMLDivElement;
    this.badgeSubtitleEl = this.container.querySelector(
      "#previewBadgeSubtitle",
    ) as HTMLDivElement;
    this.frameSliderEl = this.container.querySelector(
      "#previewFrameSlider",
    ) as HTMLInputElement;
    this.frameValEl = this.container.querySelector(
      "#previewFrameVal",
    ) as HTMLSpanElement;
    this.playPauseBtn = this.container.querySelector(
      "#previewPlayPauseBtn",
    ) as HTMLButtonElement;
    this.stepBackBtn = this.container.querySelector(
      "#previewStepBackBtn",
    ) as HTMLButtonElement;
    this.stepFwdBtn = this.container.querySelector(
      "#previewStepFwdBtn",
    ) as HTMLButtonElement;

    // Mode Switch events
    this.modeCharsBtn.addEventListener("click", () => {
      this.activeMode = "characters";
      this.modeCharsBtn.classList.add("active");
      this.modeItemsBtn.classList.remove("active");
      if (this.charControlsWrap?.style) {
        this.charControlsWrap.style.display = "flex";
      }
      if (this.itemControlsWrap?.style) {
        this.itemControlsWrap.style.display = "none";
      }
      this.render();
    });

    this.modeItemsBtn.addEventListener("click", () => {
      this.activeMode = "items";
      this.modeItemsBtn.classList.add("active");
      this.modeCharsBtn.classList.remove("active");
      if (this.charControlsWrap?.style) {
        this.charControlsWrap.style.display = "none";
      }
      if (this.itemControlsWrap?.style) {
        this.itemControlsWrap.style.display = "flex";
      }
      this.populateItems();
      this.render();
    });

    // Character Change
    this.charSelectEl.addEventListener("change", () => {
      this.characterId = parseInt(this.charSelectEl.value, 10);
      this.populateStates();
      this.render();
    });

    if (
      this.charSelectEl &&
      typeof document !== "undefined" &&
      typeof this.charSelectEl.querySelectorAll === "function"
    ) {
      this.customCharDropdown =
        CustomDropdown.fromSelect(this.charSelectEl, {
          getIconUrl: (val) => characterIconUrl(parseInt(val, 10)),
          getSublabel: (val) => CHARACTER_NAMES_JA[parseInt(val, 10)],
          getBadge: (val) =>
            `0x${parseInt(val, 10).toString(16).padStart(2, "0")}`,
          searchable: true,
          onChange: (val) => {
            this.characterId = parseInt(val, 10);
            this.populateStates();
            this.render();
          },
        }) ?? undefined;
    }

    // Theme Chips
    this.themeChipsContainer.addEventListener("click", (e) => {
      const target = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "button",
      );
      if (!target || !target.dataset.theme) return;
      this.currentTheme = target.dataset.theme as PreviewTheme;
      this.compareAllThemes = false;
      this.compareThemesBtn.classList.remove("active");
      this.themeChipsContainer
        .querySelectorAll("button")
        .forEach((b) => b.classList.remove("active"));
      target.classList.add("active");
      this.render();
    });

    // Compare All Themes Toggle
    this.compareThemesBtn.addEventListener("click", () => {
      this.compareAllThemes = !this.compareAllThemes;
      this.compareThemesBtn.classList.toggle("active", this.compareAllThemes);
      if (this.compareAllThemes) {
        this.themeChipsContainer
          .querySelectorAll("button")
          .forEach((b) => b.classList.remove("active"));
      } else {
        const btn = this.themeChipsContainer.querySelector(
          `[data-theme="${this.currentTheme}"]`,
        );
        btn?.classList.add("active");
      }
      this.render();
    });

    // State Category Filter Chips
    this.categoryBtnsContainer.addEventListener("click", (e) => {
      const target = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "button",
      );
      if (!target || !target.dataset.cat) return;
      this.categoryBtnsContainer
        .querySelectorAll("button")
        .forEach((b) => b.classList.remove("active"));
      target.classList.add("active");
      this.selectedCategory = target.dataset.cat;
      this.populateStates();
    });

    // State Select Dropdown
    this.stateSelectEl.addEventListener("change", () => {
      this.actionStateId = parseInt(this.stateSelectEl.value, 10);
      this.hexInputEl.value = `0x${this.actionStateId.toString(16)}`;
      this.updateAngleControlVisibility();
      this.updateCharInfoCard();
      this.render();
    });

    // Hex Apply
    const applyHexBtn = this.container.querySelector(
      "#previewApplyHexBtn",
    ) as HTMLButtonElement;
    const applyHex = () => {
      const val = this.hexInputEl.value.trim();
      const parsed =
        val.startsWith("0x") || val.startsWith("0X")
          ? parseInt(val, 16)
          : parseInt(val, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        this.actionStateId = parsed;
        this.populateStates();
        this.stateSelectEl.value = String(this.actionStateId);
        this.updateAngleControlVisibility();
        this.updateCharInfoCard();
        this.render();
      }
    };
    applyHexBtn.addEventListener("click", applyHex);
    this.hexInputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") applyHex();
    });

    // Flight Angle Slider
    this.angleSliderEl.addEventListener("input", () => {
      this.flightAngleDeg = parseInt(this.angleSliderEl.value, 10);
      this.angleValEl.textContent = `${this.flightAngleDeg}°`;
      this.render();
    });

    // Items: View Mode (Single vs Grid)
    this.itemViewSingleBtn.addEventListener("click", () => {
      this.itemViewMode = "single";
      this.itemViewSingleBtn.classList.add("active");
      this.itemViewGridBtn.classList.remove("active");
      const group = this.container.querySelector(
        "#previewItemSelectGroup",
      ) as HTMLDivElement;
      if (group?.style) group.style.display = "flex";
      if (this.itemInfoCardEl?.style)
        this.itemInfoCardEl.style.display = "flex";
      this.render();
    });

    this.itemViewGridBtn.addEventListener("click", () => {
      this.itemViewMode = "grid";
      this.itemViewGridBtn.classList.add("active");
      this.itemViewSingleBtn.classList.remove("active");
      const group = this.container.querySelector(
        "#previewItemSelectGroup",
      ) as HTMLDivElement;
      if (group?.style) group.style.display = "none";
      if (this.itemInfoCardEl?.style)
        this.itemInfoCardEl.style.display = "none";
      this.render();
    });

    // Items: Category Filter Chips
    this.itemCategoryBtnsContainer.addEventListener("click", (e) => {
      const target = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "button",
      );
      if (!target || !target.dataset.icat) return;
      this.itemCategoryBtnsContainer
        .querySelectorAll("button")
        .forEach((b) => b.classList.remove("active"));
      target.classList.add("active");
      this.itemCategoryFilter = target.dataset.icat as
        "all" | "weapon" | "item";
      this.populateItems();
      this.render();
    });

    // Items: Select Item
    this.itemSelectEl.addEventListener("change", () => {
      this.selectedItemIndex = parseInt(this.itemSelectEl.value, 10);
      this.updateItemDetails();
      this.render();
    });

    // Items: Luigi Fireball Checkbox
    this.itemLuigiCheckbox.addEventListener("change", () => {
      this.isLuigiFireball = this.itemLuigiCheckbox.checked;
      this.render();
    });

    // Items: Detonate Bomb Checkbox
    this.itemDetonateCheckbox.addEventListener("change", () => {
      this.isBombDetonating = this.itemDetonateCheckbox.checked;
      this.render();
    });

    // Shared Scrubber Controls
    this.frameSliderEl.addEventListener("input", () => {
      this.actionFrameCounter = parseInt(this.frameSliderEl.value, 10);
      this.frameValEl.textContent = `#${this.actionFrameCounter}`;
      this.render();
    });

    this.playPauseBtn.addEventListener("click", () => {
      this.isPlaying = !this.isPlaying;
      this.playPauseBtn.textContent = this.isPlaying ? "⏸ Pause" : "▶ Play";
      if (this.isPlaying && this.animFrameId === null) {
        this.startAnimationLoop();
      }
    });

    this.stepBackBtn.addEventListener("click", () => {
      this.actionFrameCounter = Math.max(0, this.actionFrameCounter - 1);
      this.frameSliderEl.value = String(this.actionFrameCounter);
      this.frameValEl.textContent = `#${this.actionFrameCounter}`;
      this.render();
    });

    this.stepFwdBtn.addEventListener("click", () => {
      this.actionFrameCounter = (this.actionFrameCounter + 1) % 61;
      this.frameSliderEl.value = String(this.actionFrameCounter);
      this.frameValEl.textContent = `#${this.actionFrameCounter}`;
      this.render();
    });

    this.populateStates();
    this.populateItems();
  }

  private updateAngleControlVisibility(): void {
    const isFoxOrFalco =
      this.characterId === 0x01 ||
      this.characterId === 0x0f ||
      this.characterId === 0x1d ||
      this.characterId === 0x29 ||
      this.characterId === 0x37 ||
      this.characterId === 0x55;
    const isFireFox =
      this.actionStateId === 0x0e8 || this.actionStateId === 0x0ec;
    this.angleControlWrap.hidden = !(isFoxOrFalco && isFireFox);
  }

  private getAllStatesForCurrentChar(): StateOption[] {
    const specials = getCharacterSpecialStates(this.characterId);
    return [...specials, ...COMMON_STATES];
  }

  private populateStates(): void {
    const states = this.getAllStatesForCurrentChar();
    let filtered = states;

    if (this.selectedCategory === "visualized") {
      filtered = states.filter((s) => s.visualized);
    } else if (this.selectedCategory === "status") {
      filtered = states.filter(
        (s) =>
          s.category === "damage" ||
          s.id === 0x044 ||
          s.id === 0x0a3 ||
          s.id === 0x09e ||
          s.id === 0x0bd,
      );
    } else if (this.selectedCategory !== "all") {
      filtered = states.filter((s) => s.category === this.selectedCategory);
    }

    // If current state not in list, add it dynamically
    if (!filtered.some((s) => s.id === this.actionStateId)) {
      const defs = getGameDefinitions();
      const name = defs.getActionStateName(this.actionStateId);
      filtered.unshift({
        id: this.actionStateId,
        name: `Custom: ${name}`,
        category: "special",
      });
    }

    this.stateSelectEl.innerHTML = filtered
      .map((s) => {
        const star = s.visualized ? "★ " : "";
        return `<option value="${s.id}" ${s.id === this.actionStateId ? "selected" : ""}>${star}0x${s.id.toString(16).padStart(3, "0")} - ${s.name}</option>`;
      })
      .join("");

    this.stateChipsContainer.innerHTML = filtered
      .map((s) => {
        const star = s.visualized ? "★ " : "";
        const starClass = s.visualized ? "has-star" : "";
        const activeClass = s.id === this.actionStateId ? "active" : "";
        return `<button class="preview-chip-btn ${starClass} ${activeClass}" data-state="${s.id}">${star}0x${s.id.toString(16)} ${s.name}</button>`;
      })
      .join("");

    this.stateChipsContainer.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sId = parseInt(btn.dataset.state ?? "0", 10);
        this.actionStateId = sId;
        this.stateSelectEl.value = String(sId);
        this.hexInputEl.value = `0x${sId.toString(16)}`;
        this.stateChipsContainer
          .querySelectorAll("button")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.updateAngleControlVisibility();
        this.updateCharInfoCard();
        this.render();
      });
    });

    this.hexInputEl.value = `0x${this.actionStateId.toString(16)}`;
    this.updateAngleControlVisibility();
    this.updateCharInfoCard();
  }

  private updateCharInfoCard(): void {
    const states = this.getAllStatesForCurrentChar();
    const cur = states.find((s) => s.id === this.actionStateId);
    const defs = getGameDefinitions();
    const name = cur ? cur.name : defs.getActionStateName(this.actionStateId);
    const isVis = cur?.visualized ?? false;
    const visDesc =
      cur?.visualizedDesc ?? "Standard Skeleton Wireframe & Polygons";

    this.charInfoCardEl.innerHTML = `
      <div class="preview-info-row">
        <span class="preview-info-label">Action State:</span>
        <span class="preview-info-value">0x${this.actionStateId.toString(16).padStart(3, "0")} (${this.actionStateId})</span>
      </div>
      <div class="preview-info-row">
        <span class="preview-info-label">State Name:</span>
        <span class="preview-info-value">${name}</span>
      </div>
      <div class="preview-info-row">
        <span class="preview-info-label">Visualization:</span>
        <span class="${isVis ? "preview-badge-tag" : "preview-info-value"}">
          ${isVis ? "★ Custom Visualized" : "Standard Geometry"}
        </span>
      </div>
      <div class="preview-info-row" style="margin-top:2px;">
        <span class="preview-info-label" style="font-size:11px;">Effect:</span>
        <span style="font-size:11px;color:var(--text);text-align:right;">${visDesc}</span>
      </div>
    `;
  }

  private getFilteredItems(): ItemCatalogEntry[] {
    if (this.itemCategoryFilter === "weapon") {
      return ITEM_CATALOG.filter((i) => i.category === "weapon");
    }
    if (this.itemCategoryFilter === "item") {
      return ITEM_CATALOG.filter((i) => i.category === "item");
    }
    return ITEM_CATALOG;
  }

  private populateItems(): void {
    const items = this.getFilteredItems();
    if (this.selectedItemIndex >= items.length) {
      this.selectedItemIndex = 0;
    }

    this.itemSelectEl.innerHTML = items
      .map(
        (item, idx) =>
          `<option value="${idx}" ${idx === this.selectedItemIndex ? "selected" : ""}>0x${item.kind.toString(16).padStart(2, "0")} - ${item.name} [${item.linkId === ItemLinkId.Weapon ? "Weapon" : "Item"}]</option>`,
      )
      .join("");

    this.updateItemDetails();
  }

  private updateItemDetails(): void {
    const items = this.getFilteredItems();
    const item = items[this.selectedItemIndex] ?? items[0];
    if (!item) return;

    // Show Luigi Fireball toggle only when Fireball is selected
    const isFireball =
      item.linkId === ItemLinkId.Weapon && item.kind === WPKind.Fireball;
    if (this.itemLuigiToggleWrap?.style) {
      this.itemLuigiToggleWrap.style.display = isFireball ? "block" : "none";
    }

    // Show Detonate Bomb toggle when a bomb item/weapon is selected
    const isBomb =
      (item.linkId === ItemLinkId.Item &&
        (item.kind === ITKind.Bomb ||
          item.kind === ITKind.BobOmb ||
          item.kind === ITKind.RTTFBomb ||
          item.kind === ITKind.MotionSensorBomb)) ||
      (item.linkId === ItemLinkId.Weapon && item.kind === WPKind.SamusBomb);
    if (this.itemDetonateWrap?.style) {
      this.itemDetonateWrap.style.display = isBomb ? "block" : "none";
    }

    this.itemInfoCardEl.innerHTML = `
      <div class="preview-info-row">
        <span class="preview-info-label">Item / Weapon:</span>
        <span class="preview-info-value">${item.name}</span>
      </div>
      <div class="preview-info-row">
        <span class="preview-info-label">Kind ID:</span>
        <span class="preview-info-value">0x${item.kind.toString(16).padStart(2, "0")} (${item.kind})</span>
      </div>
      <div class="preview-info-row">
        <span class="preview-info-label">Link ID:</span>
        <span class="preview-info-value">${item.linkId === ItemLinkId.Weapon ? "Weapon (0x05)" : "Item (0x04)"}</span>
      </div>
      <div class="preview-info-row">
        <span class="preview-info-label">Render Style:</span>
        <span class="${item.customShape ? "preview-badge-tag" : "preview-info-value"}">
          ${item.customShape ? "★ Custom Scaled Shape" : "Stylized Item Diamond"}
        </span>
      </div>
      <div class="preview-info-row" style="margin-top:2px;">
        <span class="preview-info-label" style="font-size:11px;">Details:</span>
        <span style="font-size:11px;color:var(--text);text-align:right;">${item.description}</span>
      </div>
    `;
  }

  public activate(): void {
    this.container.hidden = false;
    this.resize();
    this.startAnimationLoop();
    this.render();
  }

  public deactivate(): void {
    this.container.hidden = true;
    this.stopAnimationLoop();
  }

  private startAnimationLoop(): void {
    this.stopAnimationLoop();
    let lastTime = performance.now();
    const frameDuration = 1000 / 60;

    const tick = (now: number) => {
      if (this.isPlaying) {
        const delta = now - lastTime;
        if (delta >= frameDuration) {
          lastTime = now - (delta % frameDuration);
          this.actionFrameCounter = (this.actionFrameCounter + 1) % 61;
          this.frameSliderEl.value = String(this.actionFrameCounter);
          this.frameValEl.textContent = `#${this.actionFrameCounter}`;
          this.render();
        }
      } else {
        lastTime = now;
      }
      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  private stopAnimationLoop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public resize(): void {
    const parent = this.canvas.parentElement;
    if (parent) {
      const w = parent.clientWidth || 960;
      const h = parent.clientHeight || 540;
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
        this.camera.resize(w, h);
      }
    }
  }

  public render(): void {
    this.resize();
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    if (this.activeMode === "characters") {
      this.renderCharactersMode(ctx);
    } else {
      this.renderItemsMode(ctx);
    }
  }

  private renderCharactersMode(ctx: CanvasRenderingContext2D): void {
    const defs = getGameDefinitions();
    const charName = defs.getCharacterName(this.characterId, "en");
    const charNameJa = defs.getCharacterName(this.characterId, "ja");
    const stateName = defs.getActionStateName(this.actionStateId, "en");
    const stateNameJa = defs.getActionStateName(this.actionStateId, "ja");

    // Flight velocity vector for Fire Fox / Fire Bird flight
    const rad = (this.flightAngleDeg * Math.PI) / 180;
    const speed = 10;
    const dx = Math.cos(rad) * speed;
    const dy = Math.sin(rad) * speed;

    const stateData = {
      frame: 1,
      port: 0 as PortIndex,
      positionX: 0,
      positionY: 0,
      facingDirection: 1 as const,
      velocityX: dx,
      velocityY: dy,
      damagePercent: 0,
      characterId: this.characterId,
      actionStateId: this.actionStateId,
      actionFrameCounter: this.actionFrameCounter,
      hurtboxState: 0x00,
      comboHitCount: 0,
      comboDamage: 0,
      hitstunCounter: 0,
      stocksRemaining: 4,
      jumpsRemaining: 1,
      grounded: true,
    };

    const synthFrame: Frame = {
      frame: 1,
      ports: {
        0: {
          input: {
            frame: 1,
            port: 0,
            stickX: 45,
            stickY: 0,
            buttons: 0,
          },
          state: stateData,
        },
      },
    };

    const synthReplay: Replay = {
      header: {
        gameFamily: "smash64",
        schemaVersion: 1,
      },
      matchStart: {
        playerNames: [charName, "", "", ""],
        slotType: ["human", "empty", "empty", "empty"],
      },
      matchSettings: {
        stageId: 0,
        gameType: 2,
        stockCountSetting: 3,
        timeLimitMinutes: 100,
        damageRatio: 100,
        itemFrequency: 0,
        teamsEnabled: false,
        handicapMode: "off",
        characterId: [this.characterId, 0, 0, 0],
        costumeId: [0, 0, 0, 0],
        teamColor: [0, 0, 0, 0],
        portTeam: [0, 0, 0, 0],
        portHandicap: [0, 0, 0, 0],
        portCpuLevel: [0, 0, 0, 0],
      },
      frames: [
        {
          frame: 0,
          ports: {
            0: {
              input: {
                frame: 0,
                port: 0,
                stickX: 0,
                stickY: 0,
                buttons: 0,
              },
              state: {
                ...stateData,
                frame: 0,
                positionX: -dx,
                positionY: -dy,
                actionFrameCounter: Math.max(0, this.actionFrameCounter - 1),
              },
            },
          },
        },
        synthFrame,
      ],
    } as unknown as Replay;

    if (!this.compareAllThemes) {
      // Single Theme Render
      const bgTheme: BackgroundTheme =
        this.currentTheme === "opponent" ? "grid" : this.currentTheme;
      this.renderer.setBackgroundTheme(bgTheme);
      const perspectivePort: PortIndex | null =
        this.currentTheme === "opponent" ? 1 : 0;

      // Center camera on character
      const size = characterSize(this.characterId);
      const span = 400;
      this.camera.update(
        [
          { x: -span * 0.5, y: -span * 0.2 },
          { x: span * 0.5, y: size.height + span * 0.6 },
        ],
        true,
      );

      this.renderer.render(
        this.camera,
        synthFrame,
        undefined,
        synthReplay,
        1,
        perspectivePort,
        true,
      );

      this.drawStageAxes(ctx);

      // Update badge
      this.badgeTitleEl.innerHTML = `<span>0x${this.characterId.toString(16).padStart(2, "0")} ${charName} (${charNameJa})</span>`;
      this.badgeSubtitleEl.textContent = `State 0x${this.actionStateId.toString(16).padStart(3, "0")}: ${stateName} (${stateNameJa}) | Frame #${this.actionFrameCounter} | Theme: ${this.currentTheme.toUpperCase()}`;
    } else {
      // Compare All 5 Themes Side-by-Side
      const themes: {
        key: PreviewTheme;
        label: string;
        bg: BackgroundTheme;
        isOpp: boolean;
      }[] = [
        { key: "grid", label: "GRID", bg: "grid", isOpp: false },
        { key: "mountain", label: "MOUNTAIN", bg: "mountain", isOpp: false },
        { key: "autumn", label: "AUTUMN", bg: "autumn", isOpp: false },
        { key: "beach", label: "BEACH", bg: "beach", isOpp: false },
        { key: "opponent", label: "OPPONENT", bg: "grid", isOpp: true },
      ];

      const colW = this.canvas.width / themes.length;
      const size = characterSize(this.characterId);
      const span = 420;

      for (const [i, theme] of themes.entries()) {
        const colX = i * colW;

        ctx.save();
        ctx.beginPath();
        ctx.rect(colX, 0, colW, this.canvas.height);
        ctx.clip();

        this.renderer.setBackgroundTheme(theme.bg);
        const colCam = new Camera(colW, this.canvas.height);
        colCam.update(
          [
            { x: -span * 0.5, y: -span * 0.2 },
            { x: span * 0.5, y: size.height + span * 0.6 },
          ],
          true,
        );

        ctx.translate(colX, 0);
        this.renderer.render(
          colCam,
          synthFrame,
          undefined,
          synthReplay,
          1,
          theme.isOpp ? 1 : 0,
          true,
        );

        // Column divider line
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(colW, 0);
        ctx.lineTo(colW, this.canvas.height);
        ctx.stroke();

        // Column Header Badge
        ctx.fillStyle = "rgba(15, 17, 23, 0.85)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(10, 10, colW - 20, 24, 4);
        } else {
          ctx.rect(10, 10, colW - 20, 24);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(theme.label, colW / 2, 22);

        ctx.restore();
      }

      this.badgeTitleEl.innerHTML = `<span>0x${this.characterId.toString(16).padStart(2, "0")} ${charName} (${charNameJa}) — Theme Palette Comparison</span>`;
      this.badgeSubtitleEl.textContent = `State 0x${this.actionStateId.toString(16).padStart(3, "0")}: ${stateName} | All 5 Color Themes Side-by-Side`;
    }
  }

  private renderItemsMode(ctx: CanvasRenderingContext2D): void {
    const items = this.getFilteredItems();

    // Replay setup (with Luigi if fireball luigi variant is checked)
    const charId = this.isLuigiFireball ? 0x04 : 0x00; // Luigi vs Mario
    const synthReplay: Replay = {
      header: { gameFamily: "smash64", schemaVersion: 1 },
      matchStart: {
        playerNames: ["Player", "", "", ""],
        slotType: ["human", "empty", "empty", "empty"],
      },
      matchSettings: {
        stageId: 0,
        gameType: 2,
        characterId: [charId, 0, 0, 0],
      },
      frames: [],
    } as unknown as Replay;

    if (this.itemViewMode === "single") {
      const selectedItem = items[this.selectedItemIndex] ?? items[0];
      if (!selectedItem) return;

      const isBomb =
        (selectedItem.linkId === ItemLinkId.Item &&
          (selectedItem.kind === ITKind.Bomb ||
            selectedItem.kind === ITKind.BobOmb ||
            selectedItem.kind === ITKind.RTTFBomb ||
            selectedItem.kind === ITKind.MotionSensorBomb)) ||
        (selectedItem.linkId === ItemLinkId.Weapon &&
          selectedItem.kind === WPKind.SamusBomb);

      const loopProgress = this.actionFrameCounter % 60;
      const shouldDetonate =
        isBomb && this.isBombDetonating && loopProgress >= 36;

      const itemUpdate: ItemUpdate = {
        kind: shouldDetonate ? 0xfe : selectedItem.kind,
        linkId: shouldDetonate ? ItemLinkId.Item : selectedItem.linkId,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        objectAddress: 0x80200000,
        frame: shouldDetonate ? loopProgress - 36 : this.actionFrameCounter,
      };

      const synthFrame: Frame = {
        frame: 1,
        ports: {},
        items: [itemUpdate],
      };

      this.renderer.setBackgroundTheme("grid");
      const span = 180;
      this.camera.update(
        [
          { x: -span * 0.5, y: -span * 0.5 },
          { x: span * 0.5, y: span * 0.5 },
        ],
        true,
      );

      this.renderer.render(
        this.camera,
        synthFrame,
        undefined,
        synthReplay,
        1,
        0,
        true,
      );

      this.drawStageAxes(ctx);

      const typeLabel =
        selectedItem.linkId === ItemLinkId.Weapon ? "Weapon" : "Item";
      this.badgeTitleEl.innerHTML = `<span>${selectedItem.name} (0x${selectedItem.kind.toString(16)}) [${typeLabel}]</span>`;
      const stateSuffix = shouldDetonate
        ? `💥 BLAST DETONATION (+${loopProgress - 36}f)`
        : `Frame #${this.actionFrameCounter}`;
      this.badgeSubtitleEl.textContent = `Kind: 0x${selectedItem.kind.toString(16)} (${selectedItem.kind}) | LinkId: ${selectedItem.linkId} | ${stateSuffix} | ${selectedItem.customShape ? "Custom Shape" : "Item Diamond"}`;
    } else {
      // Show All Items Grid
      const cols = 6;
      const spacingX = 85;
      const spacingY = 70;
      const startX = -((cols - 1) * spacingX) / 2;
      const rows = Math.ceil(items.length / cols);
      const startY = ((rows - 1) * spacingY) / 2;

      const itemUpdates: ItemUpdate[] = items.map((item, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        return {
          kind: item.kind,
          linkId: item.linkId,
          positionX: startX + col * spacingX,
          positionY: startY - row * spacingY,
          positionZ: 0,
          objectAddress: 0x80200000 + idx * 0x100,
          frame: this.actionFrameCounter,
        };
      });

      const synthFrame: Frame = {
        frame: 1,
        ports: {},
        items: itemUpdates,
      };

      this.renderer.setBackgroundTheme("grid");
      const spanX = cols * spacingX + 80;
      const spanY = rows * spacingY + 80;
      this.camera.update(
        [
          { x: -spanX * 0.5, y: -spanY * 0.5 },
          { x: spanX * 0.5, y: spanY * 0.5 },
        ],
        true,
      );

      this.renderer.render(
        this.camera,
        synthFrame,
        undefined,
        synthReplay,
        1,
        0,
        true,
      );

      this.badgeTitleEl.innerHTML = `<span>All In-Game Items & Weapons Showcase (${items.length} Total)</span>`;
      this.badgeSubtitleEl.textContent = `Live Projectile & Item Gallery | Rotating at Frame #${this.actionFrameCounter}`;
    }
  }

  private drawStageAxes(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const originScreen = this.camera.worldToScreen(0, 0);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Ground platform line
    ctx.beginPath();
    ctx.moveTo(0, originScreen.y);
    ctx.lineTo(this.canvas.width, originScreen.y);
    ctx.stroke();

    // Center vertical axis
    ctx.beginPath();
    ctx.moveTo(originScreen.x, 0);
    ctx.lineTo(originScreen.x, this.canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Origin marker dot
    ctx.beginPath();
    ctx.arc(originScreen.x, originScreen.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fill();

    ctx.restore();
  }
}
