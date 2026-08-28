/**
 * Toblo sound effects - a for-fun, off-by-default integration of audio
 * assets from an old game called Toblo (`public/sfx/`), triggered by
 * replay events during live playback. Off unless the page was loaded with
 * `?s=t` in the URL, or toggled on via the "Toblo sfx" checkbox in the
 * About modal - see isTobloSfxEnabled()/setTobloSfxEnabled(). Each
 * play*Sfx() function is itself a no-op when the feature is off, so
 * callers don't need to guard every call site with their own check.
 *
 * Deliberately session-only, in-memory state - never written to
 * localStorage or any other persistent store, so toggling the checkbox
 * doesn't survive a reload. The `?s=t` URL param is the only thing that
 * pre-seeds it.
 */

let cachedEnabled: boolean | undefined;

/** Cached after the first check - the query string doesn't change mid-session (hash-based routing lives after the `#`, untouched by this). Overridden by setTobloSfxEnabled() once the user's toggled the checkbox. */
export function isTobloSfxEnabled(): boolean {
  if (cachedEnabled === undefined) {
    cachedEnabled =
      new URLSearchParams(window.location.search).get("s") === "t";
  }
  return cachedEnabled;
}

/** Toggles the feature for the rest of this session (in-memory only - see this module's doc comment for why nothing here ever touches localStorage). */
export function setTobloSfxEnabled(enabled: boolean): void {
  cachedEnabled = enabled;
}

// import.meta.env.BASE_URL, not a bare leading slash - this app is served
// from a subpath on GitHub Pages (see vite.config.ts's `base`), so a
// hardcoded "/sfx/..." 404s there even though it resolves fine in local
// dev where the app happens to sit at the domain root. Same fix already
// applied to the demo replay/summary URLs in main.ts.
const SFX_BASE_URL = `${import.meta.env.BASE_URL}sfx/`;

const JUMP_SFX_FILES = [
  `${SFX_BASE_URL}player_voice/jump1.wav`,
  `${SFX_BASE_URL}player_voice/jump2.wav`,
  `${SFX_BASE_URL}player_voice/jump4.wav`,
];

/**
 * The rest of player_voice/ - every reaction voice line EXCEPT jump
 * (above) and got1 (dedicated to grabs, below) - used for "an attack
 * landed" instead. Deliberately not curated further (no attempt to match
 * e.g. "ow"/"ohno" to being hit vs. "haha"/"yay" to landing a hit) - just
 * a random one of these plays whenever damage changes for either port,
 * for now.
 */
const ATTACK_SFX_FILES = [
  `${SFX_BASE_URL}player_voice/boom4.wav`,
  `${SFX_BASE_URL}player_voice/eep2.wav`,
  `${SFX_BASE_URL}player_voice/kaboom1.wav`,
  `${SFX_BASE_URL}player_voice/ohno2.wav`,
  `${SFX_BASE_URL}player_voice/ow2.wav`,
  `${SFX_BASE_URL}player_voice/shucks1.wav`,
  `${SFX_BASE_URL}player_voice/tt2.wav`,
  `${SFX_BASE_URL}player_voice/woohoo1.wav`,
  `${SFX_BASE_URL}player_voice/yay1.wav`,
  `${SFX_BASE_URL}player_voice/yess1.wav`,
];

/** haha1 is also in this folder but reserved for taunts (playTauntSfx). */
const TAUNT_SFX_FILE = `${SFX_BASE_URL}player_voice/haha1.wav`;

const GRAB_SFX_FILE = `${SFX_BASE_URL}player_voice/got1.wav`;

const MATCH_START_SFX_FILE = `${SFX_BASE_URL}cue/spawn_countdown.wav`;

const TOBLO1_SFX_FILE = `${SFX_BASE_URL}ui/toblo1.wav`;

/**
 * Toblo's own announcer lines are capture-the-flag/score themed (flag
 * captured, score updated) - reused here purely for the "a stock was just
 * taken" vibe, not because their actual content matches.
 */
const STOCK_TAKEN_SFX_FILES = [
  `${SFX_BASE_URL}announcements/aFlagTaken2.wav`,
  `${SFX_BASE_URL}announcements/aScore2.wav`,
  `${SFX_BASE_URL}announcements/dFlagTaken3.wav`,
  `${SFX_BASE_URL}announcements/dScore3.wav`,
];

/** Plays one randomly-chosen file from `files` at `volume` (0-1). Never throws - a rejected play() (no user gesture yet, backgrounded tab, ...) is just silently swallowed, since this is a for-fun extra, not core functionality. */
function playRandomSfx(files: readonly string[], volume = 0.5): void {
  if (files.length === 0) return;
  const file = files[Math.floor(Math.random() * files.length)]!;
  playSfxFile(file, volume);
}

/**
 * Holds a strong reference to every currently-playing sfx `Audio` element
 * until it finishes. Without this, `playSfxFile()`'s local `audio` variable
 * is the only reference to it - nothing else in the page holds one - so a
 * GC pass mid-playback can collect it and cut the clip off early. Landing
 * on the ground is when renderFrame()'s per-frame work is busiest (position/
 * state updates for both ports), which made that the most common moment to
 * observe a jump sfx getting cut short, but the underlying bug could strike
 * any sfx at any time.
 */
const playingAudio = new Set<HTMLAudioElement>();

function playSfxFile(file: string, volume = 0.5): void {
  const audio = new Audio(file);
  audio.volume = volume;
  playingAudio.add(audio);
  const release = (): void => {
    playingAudio.delete(audio);
  };
  audio.addEventListener("ended", release);
  audio.addEventListener("error", release);
  audio.play().catch(release);
}

/** A seated port just jumped - detected via `jumpsRemaining` decreasing, see the call site in matchView.ts. */
export function playJumpSfx(): void {
  if (!isTobloSfxEnabled()) return;
  playRandomSfx(JUMP_SFX_FILES);
}

/** A seated port just took damage from a hit. */
export function playAttackSfx(): void {
  if (!isTobloSfxEnabled()) return;
  playRandomSfx(ATTACK_SFX_FILES);
}

/** A seated port just got grabbed (the victim's side - ActionStateId.CapturePulled). */
export function playGrabSfx(): void {
  if (!isTobloSfxEnabled()) return;
  playSfxFile(GRAB_SFX_FILE);
}

/** A seated port just entered ActionStateId.Taunt. */
export function playTauntSfx(): void {
  if (!isTobloSfxEnabled()) return;
  playSfxFile(TAUNT_SFX_FILE);
}

/** A seated port's stocksRemaining just went down. */
export function playStockTakenSfx(): void {
  if (!isTobloSfxEnabled()) return;
  playRandomSfx(STOCK_TAKEN_SFX_FILES);
}

/** Once, when a match is first opened (not on every scrub back to frame 0). */
export function playMatchStartSfx(): void {
  if (!isTobloSfxEnabled()) return;
  playSfxFile(MATCH_START_SFX_FILE);
}

/**
 * Played once, right when the "Toblo sfx" checkbox is checked - a little
 * self-announcing confirmation that the feature is now on. Relies on the
 * caller having already called setTobloSfxEnabled(true) before this: the
 * isTobloSfxEnabled() guard above means this is a no-op if the checkbox was
 * instead being unchecked, so callers don't need their own checked/unchecked
 * branch.
 */
export function playTobloEnabledSfx(): void {
  if (!isTobloSfxEnabled()) return;
  playSfxFile(TOBLO1_SFX_FILE);
}
