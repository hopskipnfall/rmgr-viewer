import type { Frame, PortIndex, Replay } from "@rmg-k/rmgr";
import { StageRenderer } from "../renderer.js";
import { Camera } from "../camera.js";
import {
  CHARACTER_NAMES,
  CHARACTER_NAMES_JA,
  getGameDefinitions,
} from "../lookups.js";
import { characterSize } from "../characterSizes.js";

export interface CharacterOption {
  id: number;
  name: string;
  nameJa: string;
}

export interface CharacterGroupOption {
  groupName: string;
  characters: CharacterOption[];
}

interface StateOption {
  id: number;
  name: string;
  category: "special" | "movement" | "crouch" | "defense" | "damage" | "attack";
}

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

const COMMON_STATES: StateOption[] = [
  // Movement
  { id: 0x00a, name: "Idle", category: "movement" },
  { id: 0x00b, name: "Walk1", category: "movement" },
  { id: 0x00f, name: "Dash", category: "movement" },
  { id: 0x010, name: "Run", category: "movement" },
  { id: 0x011, name: "RunBrake", category: "movement" },
  { id: 0x012, name: "Turn (Turnaround Yaw)", category: "movement" },
  { id: 0x013, name: "TurnRun", category: "movement" },
  { id: 0x014, name: "JumpSquat", category: "movement" },
  { id: 0x016, name: "JumpF", category: "movement" },
  { id: 0x01a, name: "Fall", category: "movement" },

  // Crouch & Landings
  { id: 0x01c, name: "Crouch (Squat)", category: "crouch" },
  { id: 0x01d, name: "CrouchIdle", category: "crouch" },
  { id: 0x01e, name: "CrouchEnd", category: "crouch" },
  { id: 0x01f, name: "LandingLight", category: "crouch" },
  { id: 0x020, name: "LandingHeavy", category: "crouch" },
  { id: 0x023, name: "Teeter (Ledge Balance)", category: "crouch" },

  // Defense & Rolls
  { id: 0x098, name: "ShieldOn", category: "defense" },
  { id: 0x099, name: "Shield (Hold)", category: "defense" },
  { id: 0x09a, name: "ShieldOff", category: "defense" },
  { id: 0x09b, name: "ShieldStun (Vibrating)", category: "defense" },
  { id: 0x09c, name: "RollF (Ghost Translucent)", category: "defense" },
  { id: 0x09d, name: "RollB", category: "defense" },
  { id: 0x09e, name: "ShieldBreakFly", category: "defense" },

  // Damage & Hitstun
  { id: 0x025, name: "DamageHigh", category: "damage" },
  { id: 0x028, name: "DamageMid", category: "damage" },
  { id: 0x02b, name: "DamageLow", category: "damage" },
  { id: 0x031, name: "DamageElec (Electric)", category: "damage" },
  { id: 0x033, name: "DamageFly (Hitstun Outline)", category: "damage" },
  { id: 0x039, name: "Tumble", category: "damage" },

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
  { id: 0x0a9, name: "Grabbed", category: "attack" },
  { id: 0x0bd, name: "Taunt (Rainbow Spin)", category: "attack" },
];

function getCharacterSpecialStates(characterId: number): StateOption[] {
  // Captain Falcon
  if (characterId === 0x07 || characterId === 0x15 || characterId === 0x28) {
    return [
      { id: 0x0e6, name: "Falcon Punch (Ground)", category: "special" },
      { id: 0x0e7, name: "Falcon Punch (Air)", category: "special" },
      { id: 0x0e8, name: "Falcon Dive Reach (Up-B)", category: "special" },
      { id: 0x0ea, name: "Falcon Dive Catch (Lock)", category: "special" },
      {
        id: 0x0ee,
        name: "Falcon Dive Explosion (Detonation)",
        category: "special",
      },
      { id: 0x0eb, name: "Falcon Kick (Down-B Flame)", category: "special" },
      { id: 0x0ed, name: "Falcon Kick End", category: "special" },
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
      },
      { id: 0x0e7, name: "Thunder Jolt Air (Neutral-B)", category: "special" },
      { id: 0x0df, name: "Thunder Jolt Startup", category: "special" },
      { id: 0x0e3, name: "Thunder (Down-B Cloud/Bolt)", category: "special" },
      { id: 0x0e8, name: "Quick Attack (Up-B Startup)", category: "special" },
      { id: 0x0ec, name: "Quick Attack Zip (Electric)", category: "special" },
      { id: 0x0ea, name: "Quick Attack Landing", category: "special" },
    ];
  }

  // Fox
  if (characterId === 0x01 || characterId === 0x0f || characterId === 0x29) {
    return [
      { id: 0x0e4, name: "Fire Fox Charge (Sparks)", category: "special" },
      {
        id: 0x0e8,
        name: "Fire Fox Flight (Directional Flame)",
        category: "special",
      },
      { id: 0x0ea, name: "Fire Fox End", category: "special" },
      { id: 0x0ed, name: "Reflector / Shine Start", category: "special" },
      { id: 0x0ee, name: "Reflector / Shine Loop", category: "special" },
      { id: 0x0ef, name: "Reflector / Shine Hit", category: "special" },
      { id: 0x0f0, name: "Reflector / Shine End", category: "special" },
      { id: 0x0e1, name: "Blaster (Laser Shot)", category: "special" },
    ];
  }

  // Mario / Luigi
  if (
    characterId === 0x00 ||
    characterId === 0x04 ||
    characterId === 0x0d ||
    characterId === 0x0e ||
    characterId === 0x12
  ) {
    return [
      { id: 0x0dc, name: "Fireball (Neutral-B)", category: "special" },
      { id: 0x0e0, name: "Super Jump Punch (Up-B)", category: "special" },
      { id: 0x0e4, name: "Tornado / Cyclone (Down-B)", category: "special" },
    ];
  }

  // Kirby
  if (characterId === 0x08 || characterId === 0x16) {
    return [
      { id: 0x0dc, name: "Inhale (Neutral-B)", category: "special" },
      { id: 0x0e5, name: "Final Cutter (Up-B)", category: "special" },
      { id: 0x0eb, name: "Stone (Down-B)", category: "special" },
    ];
  }

  // Jigglypuff
  if (characterId === 0x0a || characterId === 0x18) {
    return [
      { id: 0x0dc, name: "Pound Ground (Neutral-B)", category: "special" },
      { id: 0x0df, name: "Pound Air Straight", category: "special" },
      { id: 0x0e1, name: "Pound Air Angled Up", category: "special" },
      { id: 0x0e7, name: "Pound Air Angled Punch", category: "special" },
      { id: 0x0e2, name: "Sing Ground (Up-B)", category: "special" },
      { id: 0x0e3, name: "Sing Air (Up-B)", category: "special" },
      { id: 0x0ea, name: "Rest Ground (Down-B)", category: "special" },
      { id: 0x0eb, name: "Rest Air (Down-B)", category: "special" },
    ];
  }

  // Yoshi
  if (characterId === 0x06 || characterId === 0x14 || characterId === 0x31) {
    return [
      { id: 0x0df, name: "Egg Lay Start (Tongue)", category: "special" },
      { id: 0x0e0, name: "Egg Lay Tongue Reach", category: "special" },
      { id: 0x0e1, name: "Egg Lay Swallow", category: "special" },
      { id: 0x0e2, name: "Egg Throw (Ground)", category: "special" },
      { id: 0x0e3, name: "Egg Throw (Air)", category: "special" },
      { id: 0x0e4, name: "Yoshi Bomb Start (Flip)", category: "special" },
      { id: 0x0e5, name: "Yoshi Bomb Ground (Hip Drop)", category: "special" },
      { id: 0x0e6, name: "Yoshi Bomb Air (Hip Drop)", category: "special" },
      { id: 0x0e7, name: "Yoshi Bomb Landing Shockwave", category: "special" },
    ];
  }

  // Donkey Kong
  if (
    characterId === 0x02 ||
    characterId === 0x10 ||
    characterId === 0x1a ||
    characterId === 0x2c
  ) {
    return [
      { id: 0x0e6, name: "Spinning Kong Ground (Up-B)", category: "special" },
      { id: 0x0e7, name: "Spinning Kong Air (Up-B)", category: "special" },
      { id: 0x0e8, name: "Hand Slap Start (Down-B)", category: "special" },
      { id: 0x0e9, name: "Hand Slap Quake Slam", category: "special" },
      { id: 0x0ea, name: "Hand Slap End", category: "special" },
      { id: 0x0eb, name: "Giant Punch Windup", category: "special" },
      { id: 0x0ec, name: "Giant Punch Strike", category: "special" },
    ];
  }

  // Link
  if (characterId === 0x05 || characterId === 0x13) {
    return [
      { id: 0x0dc, name: "Boomerang (Neutral-B)", category: "special" },
      { id: 0x0e5, name: "Spin Attack (Up-B)", category: "special" },
      { id: 0x0e9, name: "Bomb (Down-B)", category: "special" },
    ];
  }

  // Ness
  if (
    characterId === 0x0b ||
    characterId === 0x19 ||
    characterId === 0x25 ||
    characterId === 0x26
  ) {
    return [
      { id: 0x0e6, name: "PK Fire Ground (Neutral-B)", category: "special" },
      { id: 0x0e7, name: "PK Fire Air (Neutral-B)", category: "special" },
      { id: 0x0e8, name: "PK Thunder Start (Up-B)", category: "special" },
      { id: 0x0e9, name: "PK Thunder Guiding Spark", category: "special" },
      {
        id: 0x0ea,
        name: "PK Thunder Blast Rocket Launch",
        category: "special",
      },
      { id: 0x0eb, name: "PSI Magnet Start (Down-B)", category: "special" },
      {
        id: 0x0ec,
        name: "PSI Magnet Absorption Barrier",
        category: "special",
      },
      { id: 0x0ed, name: "PSI Magnet End", category: "special" },
    ];
  }

  // Samus
  if (characterId === 0x03 || characterId === 0x11) {
    return [
      { id: 0x0dc, name: "Charge Shot (Neutral-B)", category: "special" },
      { id: 0x0e5, name: "Screw Attack (Up-B)", category: "special" },
      { id: 0x0e8, name: "Bomb (Down-B)", category: "special" },
    ];
  }

  // Bowser / Giga Bowser / Polygon Bowser
  if (characterId === 0x34 || characterId === 0x35 || characterId === 0x4f) {
    return [
      { id: 0x0dc, name: "Flame Breath (Neutral-B)", category: "special" },
      {
        id: 0x0e5,
        name: "Whirling Fortress Ground (Up-B)",
        category: "special",
      },
      {
        id: 0x0e6,
        name: "Whirling Fortress Air (Up-B)",
        category: "special",
      },
      { id: 0x0e9, name: "Bowser Bomb Start (Down-B)", category: "special" },
      { id: 0x0ea, name: "Bowser Bomb Drop (Down-B)", category: "special" },
      { id: 0x0eb, name: "Bowser Bomb Landing", category: "special" },
    ];
  }

  // Falco
  if (characterId === 0x1d || characterId === 0x55) {
    return [
      { id: 0x0e4, name: "Fire Bird Charge (Up-B)", category: "special" },
      { id: 0x0e8, name: "Fire Bird Flight (Up-B)", category: "special" },
      { id: 0x0ed, name: "Reflector / Shine", category: "special" },
      { id: 0x0e1, name: "Blaster (Laser Shot)", category: "special" },
    ];
  }

  // Ganondorf
  if (characterId === 0x1e || characterId === 0x56) {
    return [
      { id: 0x0e6, name: "Warlock Punch (Neutral-B)", category: "special" },
      { id: 0x0e8, name: "Dark Dive (Up-B)", category: "special" },
      { id: 0x0eb, name: "Wizard's Foot (Down-B)", category: "special" },
    ];
  }

  // Young Link
  if (characterId === 0x1f || characterId === 0x5b) {
    return [
      { id: 0x0dc, name: "Fire Bow (Neutral-B)", category: "special" },
      { id: 0x0e5, name: "Spin Attack (Up-B)", category: "special" },
      { id: 0x0e9, name: "Bomb (Down-B)", category: "special" },
    ];
  }

  // Dr. Mario
  if (characterId === 0x20 || characterId === 0x51) {
    return [
      { id: 0x0dc, name: "Megavitamin (Neutral-B)", category: "special" },
      { id: 0x0e0, name: "Super Jump Punch (Up-B)", category: "special" },
      { id: 0x0e4, name: "Dr. Tornado (Down-B)", category: "special" },
    ];
  }

  // Wario
  if (characterId === 0x21 || characterId === 0x4d) {
    return [
      { id: 0x0dc, name: "Chomp / Bite (Neutral-B)", category: "special" },
      { id: 0x0e0, name: "Corkscrew (Up-B)", category: "special" },
      { id: 0x0e4, name: "Ground Pound (Down-B)", category: "special" },
    ];
  }

  // Dark Samus
  if (characterId === 0x22 || characterId === 0x57) {
    return [
      { id: 0x0dc, name: "Charge Shot (Neutral-B)", category: "special" },
      { id: 0x0e5, name: "Screw Attack (Up-B)", category: "special" },
      { id: 0x0e8, name: "Bomb (Down-B)", category: "special" },
    ];
  }

  // Lucas
  if (characterId === 0x26 || characterId === 0x4e) {
    return [
      { id: 0x0e6, name: "PK Freeze (Neutral-B)", category: "special" },
      { id: 0x0e8, name: "PK Thunder (Up-B)", category: "special" },
      { id: 0x0eb, name: "PSI Magnet (Down-B)", category: "special" },
    ];
  }

  // Marth / Roy
  if (characterId === 0x3a || characterId === 0x4a || characterId === 0x58) {
    return [
      { id: 0x0dc, name: "Shield Breaker (Neutral-B)", category: "special" },
      { id: 0x0e5, name: "Dolphin Slash (Up-B)", category: "special" },
      { id: 0x0e8, name: "Counter (Down-B)", category: "special" },
    ];
  }

  // Mewtwo
  if (characterId === 0x39 || characterId === 0x59) {
    return [
      { id: 0x0dc, name: "Shadow Ball (Neutral-B)", category: "special" },
      { id: 0x0e5, name: "Teleport (Up-B)", category: "special" },
      { id: 0x0e8, name: "Disable (Down-B)", category: "special" },
    ];
  }

  // Sonic
  if (characterId === 0x3b || characterId === 0x3d || characterId === 0x52) {
    return [
      { id: 0x0dc, name: "Homing Attack (Neutral-B)", category: "special" },
      { id: 0x0e5, name: "Spring Jump (Up-B)", category: "special" },
      { id: 0x0e8, name: "Spin Dash (Down-B)", category: "special" },
    ];
  }

  // King Dedede
  if (characterId === 0x40 || characterId === 0x5a) {
    return [
      { id: 0x0dc, name: "Inhale (Neutral-B)", category: "special" },
      { id: 0x0e5, name: "Super Dedede Jump (Up-B)", category: "special" },
      { id: 0x0e8, name: "Jet Hammer (Down-B)", category: "special" },
    ];
  }

  // Peach
  if (characterId === 0x49 || characterId === 0x5f) {
    return [
      { id: 0x0dc, name: "Toad (Neutral-B)", category: "special" },
      { id: 0x0e5, name: "Peach Parasol (Up-B)", category: "special" },
      { id: 0x0e8, name: "Vegetable Pluck (Down-B)", category: "special" },
    ];
  }

  return [];
}

export class CharacterPreviewController {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private renderer: StageRenderer;
  private camera: Camera;
  private animFrameId: number | null = null;

  // State
  private characterId = 0x07; // Captain Falcon default
  private actionStateId = 0x00a; // Idle default
  private isOpponent = false; // Perspective full color default
  private facingDirection: 1 | -1 = 1;
  private actionFrameCounter = 0;
  private isPlaying = true;
  private damagePercent = 0;
  private comboHitCount = 0;
  private isInvulnerable = false;
  private flightAngleDeg = 45; // For Fox Fire Fox flight
  private stickY = 0; // For angled attack joystick Y
  private zoomLevel = 2.0;
  private selectedCategory = "all";

  // Elements
  private charSelectEl!: HTMLSelectElement;
  private stateSelectEl!: HTMLSelectElement;
  private hexInputEl!: HTMLInputElement;
  private badgeTitleEl!: HTMLDivElement;
  private badgeSubtitleEl!: HTMLDivElement;
  private frameSliderEl!: HTMLInputElement;
  private frameValEl!: HTMLSpanElement;
  private playPauseBtn!: HTMLButtonElement;
  private opponentToggleBtn!: HTMLButtonElement;
  private perspectiveToggleBtn!: HTMLButtonElement;
  private dirRightBtn!: HTMLButtonElement;
  private dirLeftBtn!: HTMLButtonElement;
  private angleControlWrap!: HTMLDivElement;
  private angleSliderEl!: HTMLInputElement;
  private angleValEl!: HTMLSpanElement;
  private stickSliderEl!: HTMLInputElement;
  private stickValEl!: HTMLSpanElement;
  private stateChipsContainer!: HTMLDivElement;

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

        <!-- Color Mode -->
        <div class="preview-control-group">
          <label class="preview-control-label">Rendering Palette</label>
          <div class="preview-btn-row">
            <button id="previewPerspectiveBtn" class="preview-chip-btn active">Perspective (Color)</button>
            <button id="previewOpponentBtn" class="preview-chip-btn">Opponent (Grayscale)</button>
          </div>
        </div>

        <!-- Facing Direction -->
        <div class="preview-control-group">
          <label class="preview-control-label">Facing Direction</label>
          <div class="preview-btn-row">
            <button id="previewDirRightBtn" class="preview-chip-btn active">Facing Right (+1)</button>
            <button id="previewDirLeftBtn" class="preview-chip-btn">Facing Left (-1)</button>
          </div>
        </div>

        <!-- State Category Filter -->
        <div class="preview-control-group">
          <label class="preview-control-label">State Category</label>
          <div class="preview-btn-row" id="previewCategoryBtns">
            <button class="preview-chip-btn active" data-cat="all">All</button>
            <button class="preview-chip-btn" data-cat="special">Specials</button>
            <button class="preview-chip-btn" data-cat="movement">Movement</button>
            <button class="preview-chip-btn" data-cat="crouch">Crouch / Land</button>
            <button class="preview-chip-btn" data-cat="defense">Defense / Roll</button>
            <button class="preview-chip-btn" data-cat="damage">Damage / Hitstun</button>
            <button class="preview-chip-btn" data-cat="attack">Attacks</button>
          </div>
        </div>

        <!-- State Selector Dropdown & Hex Input -->
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
          <div id="previewStateChips" class="preview-btn-row" style="max-height:160px;overflow-y:auto;"></div>
        </div>

        <!-- Animation / Frame Counter -->
        <div class="preview-control-group">
          <label class="preview-control-label">Frame Animation (0-60)</label>
          <div class="preview-slider-row">
            <button id="previewPlayPauseBtn" class="preview-chip-btn">⏸ Pause</button>
            <button id="previewStepBackBtn" class="preview-chip-btn">⏮</button>
            <button id="previewStepFwdBtn" class="preview-chip-btn">⏭</button>
            <input type="range" id="previewFrameSlider" min="0" max="60" value="0" />
            <span id="previewFrameVal" class="preview-slider-val">#0</span>
          </div>
        </div>

        <!-- Flight Angle Control (For Fox Fire Fox) -->
        <div class="preview-control-group" id="previewAngleWrap" hidden>
          <label class="preview-control-label">Flight Angle (Degrees)</label>
          <div class="preview-slider-row">
            <input type="range" id="previewAngleSlider" min="0" max="360" value="45" />
            <span id="previewAngleVal" class="preview-slider-val">45°</span>
          </div>
        </div>

        <!-- Joystick Y / Angled Attack Control -->
        <div class="preview-control-group" id="previewStickYWrap">
          <label class="preview-control-label">Joystick Y (Angled Attack: Up/Down)</label>
          <div class="preview-slider-row">
            <input type="range" id="previewStickYSlider" min="-80" max="80" value="0" />
            <span id="previewStickYVal" class="preview-slider-val">0</span>
          </div>
        </div>

        <!-- Zoom Control -->
        <div class="preview-control-group">
          <label class="preview-control-label">Camera Zoom</label>
          <div class="preview-btn-row" id="previewZoomBtns">
            <button class="preview-chip-btn" data-zoom="1.0">1x</button>
            <button class="preview-chip-btn active" data-zoom="2.0">2x</button>
            <button class="preview-chip-btn" data-zoom="3.0">3x</button>
            <button class="preview-chip-btn" data-zoom="4.5">4.5x</button>
          </div>
        </div>

        <!-- Hitstun / Damage & Invulnerability -->
        <div class="preview-control-group">
          <label class="preview-control-label">Status Overlays</label>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div class="preview-slider-row">
              <span style="font-size:12px;color:var(--text-dim);width:70px;">Damage %:</span>
              <input type="range" id="previewDamageSlider" min="0" max="300" value="0" />
              <span id="previewDamageVal" class="preview-slider-val">0%</span>
            </div>
            <div class="preview-slider-row">
              <span style="font-size:12px;color:var(--text-dim);width:70px;">Combo Hits:</span>
              <input type="range" id="previewComboSlider" min="0" max="10" value="0" />
              <span id="previewComboVal" class="preview-slider-val">0</span>
            </div>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;">
              <input type="checkbox" id="previewInvulnerableCheck" />
              <span>Intangible / Invulnerable (Hurtbox 0x03)</span>
            </label>
          </div>
        </div>
      </aside>
    `;
  }

  private attachEvents(): void {
    this.charSelectEl = this.container.querySelector(
      "#previewCharSelect",
    ) as HTMLSelectElement;
    this.stateSelectEl = this.container.querySelector(
      "#previewStateSelect",
    ) as HTMLSelectElement;
    this.hexInputEl = this.container.querySelector(
      "#previewHexInput",
    ) as HTMLInputElement;
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
    this.perspectiveToggleBtn = this.container.querySelector(
      "#previewPerspectiveBtn",
    ) as HTMLButtonElement;
    this.opponentToggleBtn = this.container.querySelector(
      "#previewOpponentBtn",
    ) as HTMLButtonElement;
    this.dirRightBtn = this.container.querySelector(
      "#previewDirRightBtn",
    ) as HTMLButtonElement;
    this.dirLeftBtn = this.container.querySelector(
      "#previewDirLeftBtn",
    ) as HTMLButtonElement;
    this.angleControlWrap = this.container.querySelector(
      "#previewAngleWrap",
    ) as HTMLDivElement;
    this.angleSliderEl = this.container.querySelector(
      "#previewAngleSlider",
    ) as HTMLInputElement;
    this.angleValEl = this.container.querySelector(
      "#previewAngleVal",
    ) as HTMLSpanElement;
    this.stickSliderEl = this.container.querySelector(
      "#previewStickYSlider",
    ) as HTMLInputElement;
    this.stickValEl = this.container.querySelector(
      "#previewStickYVal",
    ) as HTMLSpanElement;
    this.stateChipsContainer = this.container.querySelector(
      "#previewStateChips",
    ) as HTMLDivElement;

    // Character Change
    this.charSelectEl.addEventListener("change", () => {
      this.characterId = parseInt(this.charSelectEl.value, 10);
      this.populateStates();
      this.render();
    });

    // Color Mode
    this.perspectiveToggleBtn.addEventListener("click", () => {
      this.isOpponent = false;
      this.perspectiveToggleBtn.classList.add("active");
      this.opponentToggleBtn.classList.remove("active");
      this.render();
    });
    this.opponentToggleBtn.addEventListener("click", () => {
      this.isOpponent = true;
      this.opponentToggleBtn.classList.add("active");
      this.perspectiveToggleBtn.classList.remove("active");
      this.render();
    });

    // Direction
    this.dirRightBtn.addEventListener("click", () => {
      this.facingDirection = 1;
      this.dirRightBtn.classList.add("active");
      this.dirLeftBtn.classList.remove("active");
      this.render();
    });
    this.dirLeftBtn.addEventListener("click", () => {
      this.facingDirection = -1;
      this.dirLeftBtn.classList.add("active");
      this.dirRightBtn.classList.remove("active");
      this.render();
    });

    // Category Tabs
    const catContainer = this.container.querySelector("#previewCategoryBtns");
    catContainer?.addEventListener("click", (e) => {
      const target = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "button",
      );
      if (!target || !target.dataset.cat) return;
      catContainer
        .querySelectorAll("button")
        .forEach((b) => b.classList.remove("active"));
      target.classList.add("active");
      this.selectedCategory = target.dataset.cat;
      this.populateStates();
    });

    // State Select
    this.stateSelectEl.addEventListener("change", () => {
      this.actionStateId = parseInt(this.stateSelectEl.value, 10);
      this.hexInputEl.value = `0x${this.actionStateId.toString(16)}`;
      this.updateAngleControlVisibility();
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
        this.render();
      }
    };
    applyHexBtn.addEventListener("click", applyHex);
    this.hexInputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") applyHex();
    });

    // Frame Slider & Controls
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

    const stepBackBtn = this.container.querySelector(
      "#previewStepBackBtn",
    ) as HTMLButtonElement;
    stepBackBtn.addEventListener("click", () => {
      this.actionFrameCounter = Math.max(0, this.actionFrameCounter - 1);
      this.frameSliderEl.value = String(this.actionFrameCounter);
      this.frameValEl.textContent = `#${this.actionFrameCounter}`;
      this.render();
    });

    const stepFwdBtn = this.container.querySelector(
      "#previewStepFwdBtn",
    ) as HTMLButtonElement;
    stepFwdBtn.addEventListener("click", () => {
      this.actionFrameCounter = (this.actionFrameCounter + 1) % 61;
      this.frameSliderEl.value = String(this.actionFrameCounter);
      this.frameValEl.textContent = `#${this.actionFrameCounter}`;
      this.render();
    });

    // Angle Slider
    this.angleSliderEl.addEventListener("input", () => {
      this.flightAngleDeg = parseInt(this.angleSliderEl.value, 10);
      this.angleValEl.textContent = `${this.flightAngleDeg}°`;
      this.render();
    });

    // Joystick Y (Angled Attack) Slider
    this.stickSliderEl.addEventListener("input", () => {
      this.stickY = parseInt(this.stickSliderEl.value, 10);
      this.stickValEl.textContent = String(this.stickY);
      this.render();
    });

    // Zoom Buttons
    const zoomContainer = this.container.querySelector("#previewZoomBtns");
    zoomContainer?.addEventListener("click", (e) => {
      const target = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "button",
      );
      if (!target || !target.dataset.zoom) return;
      zoomContainer
        .querySelectorAll("button")
        .forEach((b) => b.classList.remove("active"));
      target.classList.add("active");
      this.zoomLevel = parseFloat(target.dataset.zoom);
      this.render();
    });

    // Damage & Combo
    const dmgSlider = this.container.querySelector(
      "#previewDamageSlider",
    ) as HTMLInputElement;
    const dmgVal = this.container.querySelector(
      "#previewDamageVal",
    ) as HTMLSpanElement;
    dmgSlider.addEventListener("input", () => {
      this.damagePercent = parseInt(dmgSlider.value, 10);
      dmgVal.textContent = `${this.damagePercent}%`;
      this.render();
    });

    const comboSlider = this.container.querySelector(
      "#previewComboSlider",
    ) as HTMLInputElement;
    const comboVal = this.container.querySelector(
      "#previewComboVal",
    ) as HTMLSpanElement;
    comboSlider.addEventListener("input", () => {
      this.comboHitCount = parseInt(comboSlider.value, 10);
      comboVal.textContent = String(this.comboHitCount);
      this.render();
    });

    const invulCheck = this.container.querySelector(
      "#previewInvulnerableCheck",
    ) as HTMLInputElement;
    invulCheck.addEventListener("change", () => {
      this.isInvulnerable = invulCheck.checked;
      this.render();
    });

    this.populateStates();
  }

  private updateAngleControlVisibility(): void {
    // Show angle slider for Fire Fox / Fire Bird flight (0x0e8 / 0x0ec on Fox/Falco)
    const isFoxOrFalco =
      this.characterId === 0x01 ||
      this.characterId === 0x0f ||
      this.characterId === 0x1d ||
      this.characterId === 0x29 ||
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
    const filtered =
      this.selectedCategory === "all"
        ? states
        : states.filter((s) => s.category === this.selectedCategory);

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
      .map(
        (s) =>
          `<option value="${s.id}" ${s.id === this.actionStateId ? "selected" : ""}>0x${s.id.toString(16).padStart(3, "0")} - ${s.name}</option>`,
      )
      .join("");

    this.stateChipsContainer.innerHTML = filtered
      .map(
        (s) =>
          `<button class="preview-chip-btn ${s.id === this.actionStateId ? "active" : ""}" data-state="${s.id}">0x${s.id.toString(16)} ${s.name}</button>`,
      )
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
        this.render();
      });
    });

    this.hexInputEl.value = `0x${this.actionStateId.toString(16)}`;
    this.updateAngleControlVisibility();
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
    const defs = getGameDefinitions();

    const charName = defs.getCharacterName(this.characterId, "en");
    const charNameJa = defs.getCharacterName(this.characterId, "ja");
    const stateName = defs.getActionStateName(this.actionStateId, "en");
    const stateNameJa = defs.getActionStateName(this.actionStateId, "ja");

    // Update overlay badge
    this.badgeTitleEl.innerHTML = `<span>0x${this.characterId.toString(16).padStart(2, "0")} ${charName} (${charNameJa})</span>`;
    this.badgeSubtitleEl.textContent = `State 0x${this.actionStateId.toString(16).padStart(3, "0")}: ${stateName} (${stateNameJa}) | Frame #${this.actionFrameCounter} | ${this.isOpponent ? "Opponent (Grayscale)" : "Perspective (Color)"}`;

    // Synthetic Frame setup
    const synthFrame: Frame = {
      frameIndex: 1,
      ports: {
        0: {
          pre: {
            stickX: this.facingDirection * 45,
            stickY: this.stickY,
            buttons: 0,
          },
          post: {
            positionX: 0,
            positionY: 0,
            facingDirection: this.facingDirection,
            damagePercent: this.damagePercent,
            characterId: this.characterId,
            actionStateId: this.actionStateId,
            actionFrameCounter: this.actionFrameCounter,
            hurtboxState: this.isInvulnerable ? 0x03 : 0x00,
            comboHitCount: this.comboHitCount,
            hitstunCounter: this.comboHitCount > 0 ? 10 : 0,
            stocksRemaining: 4,
          },
        },
      },
    } as unknown as Frame;

    // Calculate synthetic velocity vector for Fox flight angle testing
    const rad = (this.flightAngleDeg * Math.PI) / 180;
    const speed = 10;
    const dx = Math.cos(rad) * speed;
    const dy = Math.sin(rad) * speed;

    const synthReplay: Replay = {
      gameStart: {
        stageId: 0,
        ports: { 0: { characterId: this.characterId } },
        playerNames: { 0: charName },
      },
      frames: [
        {
          frameIndex: 0,
          ports: {
            0: {
              post: {
                positionX: -dx,
                positionY: -dy,
                facingDirection: this.facingDirection,
                damagePercent: this.damagePercent,
                characterId: this.characterId,
                actionStateId: this.actionStateId,
                actionFrameCounter: Math.max(0, this.actionFrameCounter - 1),
                stocksRemaining: 4,
              },
            },
          },
        },
        synthFrame,
      ],
    } as unknown as Replay;

    // Center camera on character with custom zoom
    const size = characterSize(this.characterId);
    const span = Math.max(800 / this.zoomLevel, 150);
    this.camera.update(
      [
        { x: -span * 0.5, y: -span * 0.2 },
        { x: span * 0.5, y: size.height + span * 0.6 },
      ],
      true,
    );

    // Render through StageRenderer
    // perspectivePort = 0 (Color) vs perspectivePort = 1 (Grayscale)
    const perspectivePort: PortIndex | null = this.isOpponent ? 1 : 0;
    this.renderer.render(
      this.camera,
      synthFrame,
      undefined,
      undefined,
      synthReplay,
      1,
      perspectivePort,
    );

    // Draw preview ground grid & origin axes in background/foreground
    ctx.save();
    const originScreen = this.camera.worldToScreen(0, 0);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
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
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fill();

    ctx.restore();
  }
}
