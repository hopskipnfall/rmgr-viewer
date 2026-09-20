import { CHARACTER_NAMES, type PortIndex, type Replay } from "@rmg-k/rmgr";

export function isMarioCharacter(characterId: number): boolean {
  return (
    characterId === 0x00 || // Mario
    characterId === 0x0d || // Metal Mario
    characterId === 0x0e || // Polygon Mario
    characterId === 0x20 || // Dr. Mario
    characterId === 0x2a || // Mario (JP)
    characterId === 0x51 // Polygon Dr. Mario
  );
}

export function isLuigiCharacter(characterId: number): boolean {
  return (
    characterId === 0x04 || // Luigi
    characterId === 0x12 || // Polygon Luigi
    characterId === 0x2b || // Luigi (JP)
    characterId === 0x45 || // Metal Luigi
    characterId === 0x4b // Dr. Luigi
  );
}

export function isDonkeyKongCharacter(characterId: number): boolean {
  const name = CHARACTER_NAMES[characterId];
  if (
    name &&
    (name === "Donkey Kong" ||
      name.startsWith("Donkey Kong ") ||
      name === "DK" ||
      name.startsWith("DK "))
  ) {
    return true;
  }
  return (
    characterId === 0x02 || // Donkey Kong
    characterId === 0x10 || // Polygon DK
    characterId === 0x1a || // Giant DK
    characterId === 0x2c // DK (JP)
  );
}

export function isSamusCharacter(characterId: number): boolean {
  const name = CHARACTER_NAMES[characterId];
  if (name && (name === "Samus" || name.startsWith("Samus "))) return true;
  return (
    characterId === 0x03 || // Samus
    characterId === 0x11 || // Polygon Samus
    characterId === 0x22 || // Dark Samus
    characterId === 0x24 || // Samus (JP)
    characterId === 0x33 || // Samus (EU)
    characterId === 0x57 // Polygon Dark Samus
  );
}

export function isLinkCharacter(characterId: number): boolean {
  return (
    characterId === 0x05 || // Link
    characterId === 0x13 || // Polygon Link
    characterId === 0x1f || // Young Link
    characterId === 0x23 || // Link (EU)
    characterId === 0x27 || // Link (JP)
    characterId === 0x5b // Polygon Young Link
  );
}

export function isYoshiCharacter(characterId: number): boolean {
  return (
    characterId === 0x06 || // Yoshi
    characterId === 0x14 || // Polygon Yoshi
    characterId === 0x31 // Yoshi (JP)
  );
}

export function isKirbyCharacter(characterId: number): boolean {
  return (
    characterId === 0x08 || // Kirby
    characterId === 0x16 || // Polygon Kirby
    characterId === 0x30 // Kirby (JP)
  );
}

export function isJigglypuffCharacter(characterId: number): boolean {
  return (
    characterId === 0x0a || // Jigglypuff
    characterId === 0x18 || // Polygon Jigglypuff
    characterId === 0x2e || // Jigglypuff (JP)
    characterId === 0x2f // Jigglypuff (EU)
  );
}

export function isNessCharacter(characterId: number): boolean {
  return (
    characterId === 0x0b || // Ness
    characterId === 0x19 || // Polygon Ness
    characterId === 0x25 || // Ness (JP)
    characterId === 0x26 || // Lucas
    characterId === 0x4e // Polygon Lucas
  );
}

export function isBowserCharacter(characterId: number): boolean {
  return (
    characterId === 0x34 || // Bowser
    characterId === 0x35 || // Giga Bowser
    characterId === 0x4f // Polygon Bowser
  );
}

export function isFoxCharacter(characterId: number): boolean {
  return (
    characterId === 0x01 || // Fox
    characterId === 0x0f || // Polygon Fox
    characterId === 0x1d || // Falco
    characterId === 0x29 || // Fox (JP)
    characterId === 0x55 // Polygon Falco
  );
}

export type FoxSpecialType =
  | "firefox_charge"
  | "firefox_fly"
  | "firefox_end"
  | "shine_start"
  | "shine_loop"
  | "shine_hit"
  | "shine_end"
  | "blaster_gun";

export function getFoxSpecialType(
  characterId: number,
  actionStateId: number,
): FoxSpecialType | null {
  if (!isFoxCharacter(characterId)) return null;

  // Neutral-B: Blaster gun stance (0x0dc - 0x0e3).
  // Fox draws and aims his blaster pistol (the flying laser bolt is WPKind.Blaster).
  if (actionStateId >= 0x0dc && actionStateId <= 0x0e3) {
    return "blaster_gun";
  }

  // Up-B Fire Fox Charge / Startup: 0x0e4 - 0x0e7
  if (actionStateId >= 0x0e4 && actionStateId <= 0x0e7) {
    return "firefox_charge";
  }
  // Up-B Fire Fox Flight: 0x0e8, 0x0ec
  if (actionStateId === 0x0e8 || actionStateId === 0x0ec) {
    return "firefox_fly";
  }
  // Up-B Fire Fox End / Decel / Landing: 0x0e9, 0x0ea, 0x0eb, 0x0ed - 0x0f0
  if (actionStateId >= 0x0e9 && actionStateId <= 0x0f0) {
    return "firefox_end";
  }

  // Down-B Reflector / Shine: 0x0f1 - 0x0fa
  if (actionStateId === 0x0f1 || actionStateId === 0x0f2) {
    return "shine_start";
  }
  if (actionStateId === 0x0f5 || actionStateId === 0x0f6) {
    return "shine_hit";
  }
  if (
    actionStateId === 0x0f3 ||
    actionStateId === 0x0f7 ||
    actionStateId === 0x0f8
  ) {
    return "shine_end";
  }
  if (actionStateId >= 0x0f1 && actionStateId <= 0x0fa) {
    return "shine_loop";
  }

  return null;
}

/**
 * Computes Fox's flight angle in screen space radians (where 0 is right, -PI/2 is straight up, +PI/2 is down, PI is left).
 * Returns null if velocity cannot be determined.
 */
export function getFoxFlightAngle(
  replay?: Replay | null,
  frameIndex?: number,
  port?: PortIndex,
  post?: { positionX: number; positionY: number; facingDirection: 1 | -1 },
  /** Edge-guard review mode - see Camera.isMirrored(). dx is a world-space delta, so mirroring negates it same as it would negate the two raw positions it's computed from. */
  mirrored = false,
): number | null {
  if (!replay || frameIndex === undefined || port === undefined || !post) {
    return null;
  }

  // Look back up to 4 frames for velocity delta
  let prevX: number | null = null;
  let prevY: number | null = null;
  for (let back = 1; back <= 4; back++) {
    const prevPost = replay.frames[frameIndex - back]?.ports[port]?.state;
    if (
      prevPost &&
      (Math.abs(prevPost.positionX - post.positionX) > 0.001 ||
        Math.abs(prevPost.positionY - post.positionY) > 0.001)
    ) {
      prevX = prevPost.positionX;
      prevY = prevPost.positionY;
      break;
    }
  }

  // If at start of flight (frame 0), look forward up to 4 frames
  if (prevX === null && frameIndex + 1 < replay.frames.length) {
    for (let fwd = 1; fwd <= 4; fwd++) {
      const fwdPost = replay.frames[frameIndex + fwd]?.ports[port]?.state;
      if (
        fwdPost &&
        (Math.abs(fwdPost.positionX - post.positionX) > 0.001 ||
          Math.abs(fwdPost.positionY - post.positionY) > 0.001)
      ) {
        prevX = 2 * post.positionX - fwdPost.positionX;
        prevY = 2 * post.positionY - fwdPost.positionY;
        break;
      }
    }
  }

  if (prevX !== null && prevY !== null) {
    const dx = post.positionX - prevX;
    const dy = post.positionY - prevY;
    if (Math.hypot(dx, dy) > 0.001) {
      // In world coords: +Y is UP, -Y is DOWN.
      // In screen canvas: +Y is DOWN, -Y is UP.
      return Math.atan2(-dy, mirrored ? -dx : dx);
    }
  }

  return null;
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
  | "kick_air"
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
  if (actionStateId === 0x0e8) {
    return "dive_reach";
  }
  if (actionStateId === 0x0ea) {
    return "dive_catch";
  }
  if (actionStateId === 0x0ee) {
    return "dive_explosion";
  }
  if (actionStateId === 0x0e9) {
    return "kick_air";
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

export type PikachuSpecialType = "quick_attack" | "quick_attack_zip";

export function getPikachuSpecialType(
  characterId: number,
  actionStateId: number,
): PikachuSpecialType | null {
  if (!isPikachuCharacter(characterId)) return null;
  // Neutral-B: Thunder Jolt (0x0dc..0x0e0). No synthetic animation drawn for
  // this anymore - the recorded Weapon objects (WPKind.ThunderJoltAir /
  // WPKind.ThunderJoltGround, drawn by drawItemObjects() in renderer.ts)
  // are the real Thunder Jolt projectiles now.
  if (
    actionStateId === 0x0dc ||
    actionStateId === 0x0dd ||
    actionStateId === 0x0de ||
    actionStateId === 0x0df ||
    actionStateId === 0x0e0
  ) {
    return null;
  }
  // Down-B: Thunder (0x0e3..0x0e7). No synthetic lightning bolt drawn for this
  // anymore - the recorded Weapon objects (WPKind.ThunderHead / WPKind.ThunderTrail,
  // drawn by drawItemObjects() in renderer.ts) are the real descending lightning bolt.
  if (
    actionStateId === 0x0e3 ||
    actionStateId === 0x0e4 ||
    actionStateId === 0x0e5 ||
    actionStateId === 0x0e6 ||
    actionStateId === 0x0e7
  ) {
    return null;
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

export type YoshiSpecialType =
  | "egg_lay_tongue"
  | "egg_throw"
  | "yoshi_bomb_start"
  | "yoshi_bomb_plummet"
  | "yoshi_bomb_land";

export function getYoshiSpecialType(
  characterId: number,
  actionStateId: number,
): YoshiSpecialType | null {
  if (!isYoshiCharacter(characterId)) return null;
  // Neutral-B: Egg Lay (Tongue Catch). 0x0e7 confirmed empirically to be the
  // tongue lashing out to grab the opponent (previously misclassified as the
  // Down-B landing below). 0x0e1 confirmed empirically to be the landing
  // after Down-B, not part of this move (moved below).
  if (
    actionStateId === 0x0df ||
    actionStateId === 0x0e0 ||
    actionStateId === 0x0e7
  ) {
    return "egg_lay_tongue";
  }
  // Egg Throw (grounded, confirmed empirically). 0x0e3 unconfirmed but left as-is.
  if (actionStateId === 0x0de || actionStateId === 0x0e3) {
    return "egg_throw";
  }
  // Down-B: Yoshi Bomb (Hip Drop). 0x0e2 confirmed empirically to be the
  // aerial/falling phase (previously misclassified as Egg Throw above).
  if (actionStateId === 0x0e4) {
    return "yoshi_bomb_start";
  }
  if (
    actionStateId === 0x0e2 ||
    actionStateId === 0x0e5 ||
    actionStateId === 0x0e6
  ) {
    return "yoshi_bomb_plummet";
  }
  // 0x0e1 confirmed empirically to be the Down-B landing (was misclassified
  // as Egg Lay above).
  if (actionStateId === 0x0e1) {
    return "yoshi_bomb_land";
  }
  return null;
}

export type DKSpecialType =
  "spinning_kong" | "hand_slap" | "giant_punch_windup" | "giant_punch";

export function getDKSpecialType(
  characterId: number,
  actionStateId: number,
): DKSpecialType | null {
  if (!isDonkeyKongCharacter(characterId)) return null;
  // Up-B: Spinning Kong
  if (actionStateId === 0x0e6 || actionStateId === 0x0e7) {
    return "spinning_kong";
  }
  // Down-B: Hand Slap
  if (
    actionStateId === 0x0e8 ||
    actionStateId === 0x0e9 ||
    actionStateId === 0x0ea
  ) {
    return "hand_slap";
  }
  // Neutral-B: Giant Punch windup (0x0de startup, 0x0df/0x0e0 grounded windup,
  // 0x0e1 aerial windup, 0x0eb).
  if (
    actionStateId === 0x0de ||
    actionStateId === 0x0df ||
    actionStateId === 0x0e0 ||
    actionStateId === 0x0e1 ||
    actionStateId === 0x0eb
  ) {
    return "giant_punch_windup";
  }
  // Neutral-B: Giant Punch punch execution / swing (0x0e2 grounded startup,
  // 0x0e3 grounded punch, 0x0e4 aerial punch startup, 0x0e5 aerial punch, 0x0ec full execution).
  if (
    actionStateId === 0x0e2 ||
    actionStateId === 0x0e3 ||
    actionStateId === 0x0e4 ||
    actionStateId === 0x0e5 ||
    actionStateId === 0x0ec
  ) {
    return "giant_punch";
  }
  return null;
}

export type NessSpecialType =
  "pk_thunder_charge" | "pk_thunder_rocket" | "psi_magnet";

export function getNessSpecialType(
  characterId: number,
  actionStateId: number,
): NessSpecialType | null {
  if (!isNessCharacter(characterId)) return null;
  // 0x0e6 confirmed empirically to be the landing lag after PK Fire 2
  // (0x0ec) - just a normal landing, not the active move, so no overlay.
  if (actionStateId === 0x0e6) return null;
  // Neutral-B: PK Fire (0x0e7, 0x0ec). No synthetic animation drawn for
  // this anymore - the recorded Weapon object (WPKind.PKFire, drawn by
  // drawItemObjects() in renderer.ts) is the real PK Fire projectile now.
  if (actionStateId === 0x0e7 || actionStateId === 0x0ec) {
    return null;
  }
  // Up-B: PK Thunder
  if (actionStateId === 0x0e8 || actionStateId === 0x0e9) {
    return "pk_thunder_charge";
  }
  if (actionStateId === 0x0ea) {
    return "pk_thunder_rocket";
  }
  // Down-B: PSI Magnet
  if (actionStateId === 0x0eb || actionStateId === 0x0ed) {
    return "psi_magnet";
  }
  return null;
}

export type MarioSpecialType = "super_jump_punch" | "tornado";

export function getMarioSpecialType(
  characterId: number,
  actionStateId: number,
): MarioSpecialType | null {
  if (!isMarioCharacter(characterId) && !isLuigiCharacter(characterId)) {
    return null;
  }
  // Character-specific action states (>= 0x0dc) are NOT shared across
  // characters (docs/RMGR_SPEC.md §8) - Mario and Luigi's IDs only
  // coincidentally overlapped for most of this range.
  //
  // Neutral-B: Fireball (0x0dc, 0x0dd, 0x0de, 0x0e0). No synthetic animation
  // drawn for this anymore - the recorded Weapon object (WPKind.Fireball,
  // drawn by drawItemObjects() in renderer.ts) is the real fireball now,
  // so drawing a fake one attached to Mario/Luigi would visually double up.
  if (
    actionStateId === 0x0dc ||
    actionStateId === 0x0dd ||
    actionStateId === 0x0de ||
    actionStateId === 0x0e0
  ) {
    return null;
  }
  // 0x0df is Luigi's landing lag right after the throw - render his normal
  // (non-special) pose for it instead of falling through to the shared Up-B
  // bucket below.
  if (isLuigiCharacter(characterId) && actionStateId === 0x0df) {
    return null;
  }
  // Up-B Super Jump Punch: 0x0df (Mario), 0x0e1, 0x0e2
  if (
    actionStateId === 0x0df ||
    actionStateId === 0x0e1 ||
    actionStateId === 0x0e2
  ) {
    return "super_jump_punch";
  }
  // Down-B Tornado / Cyclone: 0x0e3, 0x0e4, 0x0e5
  if (
    actionStateId === 0x0e3 ||
    actionStateId === 0x0e4 ||
    actionStateId === 0x0e5
  ) {
    return "tornado";
  }
  return null;
}

export type SamusSpecialType =
  "charge_shot_startup" | "charge_shot" | "charge_shot_fire" | "screw_attack";

export function getSamusSpecialType(
  characterId: number,
  actionStateId: number,
): SamusSpecialType | null {
  if (!isSamusCharacter(characterId)) return null;
  // Neutral-B: Startup (drawing the arm cannon out) - confirmed empirically
  // to be a distinct early phase before the charge itself, previously
  // misclassified as the firing animation.
  if (actionStateId === 0x0de) {
    return "charge_shot_startup";
  }
  // Neutral-B: Charging (holding the shot). 0x0df confirmed empirically to
  // belong here (previously unmapped).
  if (
    actionStateId === 0x0dc ||
    actionStateId === 0x0dd ||
    actionStateId === 0x0df
  ) {
    return "charge_shot";
  }
  // Neutral-B: Firing the charged shot while airborne - confirmed
  // empirically (previously unmapped).
  if (actionStateId === 0x0e2) {
    return "charge_shot_fire";
  }
  // Up-B: Screw Attack. 0x0e3 (ground) and 0x0e4 (air) confirmed empirically
  // to belong here (previously unmapped). 0x0e5 confirmed empirically to be
  // the landing after dropping the bomb, not part of Screw Attack (excluded
  // below). 0x0e6 moved to Bomb below.
  if (
    actionStateId === 0x0e3 ||
    actionStateId === 0x0e4 ||
    actionStateId === 0x0e7
  ) {
    return "screw_attack";
  }
  // Down-B: Bomb (0x0e6, 0x0e8, 0x0e9, 0x0ea). No synthetic bomb drawn for
  // this anymore - the recorded Weapon object (WPKind.SamusBomb, drawn by
  // drawItemObjects() in renderer.ts) is Samus's real bomb now, so drawing
  // a second, fake one here would visually double up.
  if (
    actionStateId === 0x0e6 ||
    actionStateId === 0x0e8 ||
    actionStateId === 0x0e9 ||
    actionStateId === 0x0ea
  ) {
    return null;
  }
  return null;
}

export type LinkSpecialType = "spin_attack" | "bomb";

export function getLinkSpecialType(
  characterId: number,
  actionStateId: number,
): LinkSpecialType | null {
  if (!isLinkCharacter(characterId)) return null;
  // Neutral-B: Boomerang throw (0x0dc - 0x0de: charge/wind-up, 0x0e5 and
  // 0x0e8: ground and air throw - same animation either way, confirmed
  // empirically). No synthetic animation drawn for this anymore - the
  // recorded Weapon object (WPKind.Boomerang, drawn by drawItemObjects()
  // in renderer.ts) is Link's real boomerang now, so drawing a second,
  // fake one here would just visually double up with it.
  // Up-B: Spin Attack. 0x0e2 is the grounded version, 0x0e4 the aerial
  // version (both confirmed empirically, were previously unmapped).
  // 0x0e6/0x0e7 unconfirmed but left as-is.
  if (
    actionStateId === 0x0e2 ||
    actionStateId === 0x0e4 ||
    actionStateId === 0x0e6 ||
    actionStateId === 0x0e7
  ) {
    return "spin_attack";
  }
  // Down-B: Bomb. 0x0e9/0x0ea/0x0eb pull out on the ground, 0x0ec pulls out
  // in the air (landing while holding a pulled bomb transitions back into
  // this same state - not a second bomb). 0x74 is the shared/universal
  // item-throw state Link enters when throwing the bomb he's holding.
  if (
    actionStateId === 0x0e9 ||
    actionStateId === 0x0ea ||
    actionStateId === 0x0eb ||
    actionStateId === 0x0ec ||
    actionStateId === 0x074
  ) {
    return "bomb";
  }
  return null;
}

export type KirbySpecialType = "inhale" | "final_cutter" | "stone";

export function getKirbySpecialType(
  characterId: number,
  actionStateId: number,
): KirbySpecialType | null {
  if (!isKirbyCharacter(characterId)) return null;
  // Neutral-B: Inhale (0x0dc - 0x0de only, 0x0df+ are Kirby midair jumps)
  if (
    actionStateId === 0x0dc ||
    actionStateId === 0x0dd ||
    actionStateId === 0x0de
  ) {
    return "inhale";
  }
  // Up-B: Final Cutter (0x0e5 - 0x0e8, 0x0fe - 0x104)
  if (
    (actionStateId >= 0x0e5 && actionStateId <= 0x0e8) ||
    (actionStateId >= 0x0fe && actionStateId <= 0x104)
  ) {
    return "final_cutter";
  }
  // Down-B: Stone (0x0e9 - 0x0ec, 0x105 - 0x108)
  if (
    (actionStateId >= 0x0e9 && actionStateId <= 0x0ec) ||
    (actionStateId >= 0x105 && actionStateId <= 0x108)
  ) {
    return "stone";
  }
  return null;
}

export type JigglypuffSpecialType = "pound" | "sing" | "rest";

export function getJigglypuffSpecialType(
  characterId: number,
  actionStateId: number,
): JigglypuffSpecialType | null {
  if (!isJigglypuffCharacter(characterId)) return null;
  // 0x0df, 0x0e0, 0x0e1, 0x0e2 confirmed empirically to just be extra
  // mid-air jumps (Puff has more than 2 jumps, hence the extra states) - not
  // special moves, so they're excluded from the ranges below and fall
  // through to no overlay.
  if (
    actionStateId === 0x0df ||
    actionStateId === 0x0e0 ||
    actionStateId === 0x0e1 ||
    actionStateId === 0x0e2
  ) {
    return null;
  }
  // Neutral-B: Pound (0x0dc - 0x0e1, 0x0e6 - 0x0e8: Straight, Angled Up, Angled Down, Ground & Air)
  if (
    (actionStateId >= 0x0dc && actionStateId <= 0x0e1) ||
    (actionStateId >= 0x0e6 && actionStateId <= 0x0e8)
  ) {
    return "pound";
  }
  // Up-B: Sing (0x0e2 - 0x0e5: Ground & Air)
  if (actionStateId >= 0x0e2 && actionStateId <= 0x0e5) {
    return "sing";
  }
  // Down-B: Rest (0x0e9 - 0x0eb: Ground & Air, Sleep)
  if (actionStateId >= 0x0e9 && actionStateId <= 0x0eb) {
    return "rest";
  }
  return null;
}
