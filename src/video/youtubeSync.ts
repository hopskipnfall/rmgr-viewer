// "canvas" = Replay with background YouTube audio still playing ("Replay 🔊").
// "canvas-muted" = Replay only, YouTube playback fully stopped, no audio ("Replay 🔇").
export type VideoViewMode =
  "video-pip" | "video-only" | "canvas" | "canvas-muted";

export interface VideoLinkData {
  videoId: string;
  url: string;
  offsetSeconds: number; // Video time (seconds) corresponding to replay frame 0
  viewMode: VideoViewMode;
  /**
   * True if a person explicitly set/confirmed this specific game's own
   * offset (nudge, typed commit, or a future "sync to current frame") - an
   * interpolation anchor. False means this offset was automatically
   * inferred from sibling anchors in the same session (see
   * recomputeInferredOffsets()) and is silently recomputed whenever those
   * change, with no confirmation needed.
   *
   * Absent (links saved before this field existed) is treated as true -
   * manual - rather than false, so an already-confirmed offset from before
   * this feature shipped is never silently overwritten. See
   * isOffsetManual().
   */
  isOffsetManual?: boolean;
}

/** True unless explicitly marked false - see VideoLinkData.isOffsetManual's own doc comment for why absent defaults to manual. */
export function isOffsetManual(data: VideoLinkData): boolean {
  return data.isOffsetManual !== false;
}

export interface ParsedYouTubeUrl {
  videoId: string;
  startSeconds: number;
}

const STORAGE_KEY_PREFIX = "rmgr_yt_link_";

/**
 * Parses a YouTube timestamp string into seconds.
 * Supports: "1h2m3s", "2m15s", "45s", "123", "1:23", "1:02:03"
 */
export function parseYouTubeTimestamp(raw: string): number {
  if (!raw) return 0;
  const trimmed = raw.trim().toLowerCase();

  // Handle standard mm:ss or hh:mm:ss format
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map((p) => parseFloat(p) || 0);
    if (parts.length === 2) {
      return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
    }
    if (parts.length === 3) {
      return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
    }
  }

  // Handle compound formats like 1h2m3s or 90s
  const hourMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h/);
  const minMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*m/);
  const secMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*s/);

  if (hourMatch || minMatch || secMatch) {
    const hours = hourMatch ? parseFloat(hourMatch[1] ?? "0") : 0;
    const mins = minMatch ? parseFloat(minMatch[1] ?? "0") : 0;
    const secs = secMatch ? parseFloat(secMatch[1] ?? "0") : 0;
    return hours * 3600 + mins * 60 + secs;
  }

  // Handle plain number in seconds
  const numeric = parseFloat(trimmed);
  return isNaN(numeric) ? 0 : Math.max(0, numeric);
}

/**
 * Parses a YouTube URL, extracting the video ID and any embedded start timestamp.
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID&t=1m30s
 * - https://youtu.be/VIDEO_ID?t=90
 * - https://www.youtube.com/embed/VIDEO_ID?start=90
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - Plain video ID (11 characters)
 */
export function parseYouTubeUrl(input: string): ParsedYouTubeUrl | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Direct 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return { videoId: trimmed, startSeconds: 0 };
  }

  try {
    const url = new URL(trimmed);
    let videoId: string | null = null;
    let startSeconds = 0;

    // Check query parameters for timestamp (?t=... or ?start=...)
    const tParam = url.searchParams.get("t") || url.searchParams.get("start");
    if (tParam) {
      startSeconds = parseYouTubeTimestamp(tParam);
    }

    if (url.hostname === "youtu.be" || url.hostname === "www.youtu.be") {
      const pathPart = url.pathname.slice(1);
      if (pathPart && /^[a-zA-Z0-9_-]{11}/.test(pathPart)) {
        videoId = pathPart.slice(0, 11);
      }
    } else if (
      url.hostname.includes("youtube.com") ||
      url.hostname.includes("youtube-nocookie.com")
    ) {
      if (url.searchParams.has("v")) {
        const v = url.searchParams.get("v");
        if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
          videoId = v;
        }
      } else if (url.pathname.startsWith("/embed/")) {
        const embedId = url.pathname.split("/")[2];
        if (embedId && /^[a-zA-Z0-9_-]{11}/.test(embedId)) {
          videoId = embedId.slice(0, 11);
        }
      } else if (url.pathname.startsWith("/shorts/")) {
        const shortId = url.pathname.split("/")[2];
        if (shortId && /^[a-zA-Z0-9_-]{11}/.test(shortId)) {
          videoId = shortId.slice(0, 11);
        }
      }
    }

    if (videoId) {
      return { videoId, startSeconds };
    }
  } catch {
    // If URL constructor fails, attempt regex fallback
    const match = trimmed.match(
      /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i,
    );
    if (match && match[1]) {
      const tMatch = trimmed.match(/[?&](?:t|start)=([^"&?/\s]+)/i);
      const startSeconds =
        tMatch && tMatch[1] ? parseYouTubeTimestamp(tMatch[1]) : 0;
      return { videoId: match[1], startSeconds };
    }
  }

  return null;
}

/**
 * Converts a replay frame index to corresponding YouTube video time in seconds.
 */
export function frameToVideoTime(
  frameIndex: number,
  offsetSeconds: number,
): number {
  return Math.max(0, offsetSeconds + frameIndex / 60);
}

/**
 * Converts a YouTube video time in seconds to the corresponding replay frame index.
 */
export function videoTimeToFrame(
  videoTime: number,
  offsetSeconds: number,
): number {
  return Math.max(0, Math.round((videoTime - offsetSeconds) * 60));
}

/**
 * Formats seconds into a human-readable string (e.g. "1:23.45" or "0:00.00").
 */
export function formatVideoTime(seconds: number): string {
  const isNeg = seconds < 0;
  const absSec = Math.abs(seconds);
  const mins = Math.floor(absSec / 60);
  const secs = absSec % 60;
  const formatted = `${mins}:${secs.toFixed(2).padStart(5, "0")}`;
  return isNeg ? `-${formatted}` : formatted;
}

/**
 * Loads video link data from localStorage for a given replay ID.
 */
export function loadVideoLink(replayId: string): VideoLinkData | null {
  if (!replayId) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + replayId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VideoLinkData;
    if (parsed && typeof parsed.videoId === "string") {
      return {
        videoId: parsed.videoId,
        url: parsed.url || `https://www.youtube.com/watch?v=${parsed.videoId}`,
        offsetSeconds:
          typeof parsed.offsetSeconds === "number" ? parsed.offsetSeconds : 0,
        viewMode: parsed.viewMode || "canvas-muted",
        // Preserve as-is (including absent/undefined) rather than
        // defaulting here - isOffsetManual()'s own "absent means manual"
        // logic is the single source of truth for that default.
        isOffsetManual: parsed.isOffsetManual,
      };
    }
  } catch {
    // Ignore localStorage read errors
  }
  return null;
}

/**
 * Saves video link data to localStorage for a given replay ID.
 */
export function saveVideoLink(replayId: string, data: VideoLinkData): void {
  if (!replayId || !data.videoId) return;
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + replayId, JSON.stringify(data));
  } catch {
    // Ignore localStorage write errors
  }
}

/**
 * Deletes video link data from localStorage for a given replay ID.
 */
export function deleteVideoLink(replayId: string): void {
  if (!replayId) return;
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + replayId);
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Checks whether a video link exists in localStorage for a given replay ID.
 */
export function hasVideoLink(replayId: string): boolean {
  if (!replayId) return false;
  try {
    return localStorage.getItem(STORAGE_KEY_PREFIX + replayId) !== null;
  } catch {
    return false;
  }
}

export interface SessionGameInfo {
  readonly id: string;
  readonly recordedAt: Date;
  readonly frameCount: number;
}

/**
 * Determines whether a list of game replays was recorded in real-time.
 * A session is considered real-time if chronological games do not overlap faster
 * than their in-game durations (i.e. Game N+1 starts at or after Game N ends, allowing a 5s leeway).
 */
export function isRealtimeSession(games: readonly SessionGameInfo[]): boolean {
  if (games.length < 2) return true;

  // Sort by recordedAt timestamp
  const sorted = [...games].sort(
    (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
  );

  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i]!;
    const next = sorted[i + 1]!;
    const deltaSeconds =
      (next.recordedAt.getTime() - cur.recordedAt.getTime()) / 1000;
    const durationSeconds = cur.frameCount / 60;

    // If consecutive game starts sooner than current game duration minus 5s margin,
    // they were batch-exported faster than real-time.
    if (deltaSeconds < Math.max(1, durationSeconds - 5)) {
      return false;
    }
  }

  return true;
}

/**
 * Propagates a video link from a source game across sibling games in the same session.
 * If the session is real-time (or forceRealtimeSync is true), relative start offsets
 * are calculated based on recordedAt timestamps.
 */
export function propagateVideoLinkToSession(
  sourceGameId: string,
  linkData: VideoLinkData,
  allGames: readonly SessionGameInfo[],
  forceRealtimeSync = false,
): { updatedCount: number; isRealtime: boolean } {
  if (!sourceGameId || !linkData || allGames.length <= 1) {
    return { updatedCount: 0, isRealtime: true };
  }

  const sourceGame = allGames.find((g) => g.id === sourceGameId);
  if (!sourceGame) {
    return { updatedCount: 0, isRealtime: false };
  }

  const isRealtime = forceRealtimeSync || isRealtimeSession(allGames);
  const sourceEpochSeconds = sourceGame.recordedAt.getTime() / 1000;
  let updatedCount = 0;

  for (const game of allGames) {
    if (game.id === sourceGameId) continue;

    let offset = linkData.offsetSeconds;
    if (isRealtime) {
      const gameEpochSeconds = game.recordedAt.getTime() / 1000;
      const deltaSeconds = gameEpochSeconds - sourceEpochSeconds;
      offset = Math.max(
        0,
        Number((linkData.offsetSeconds + deltaSeconds).toFixed(2)),
      );
    }

    const siblingLinkData: VideoLinkData = {
      videoId: linkData.videoId,
      url: linkData.url,
      offsetSeconds: offset,
      viewMode: linkData.viewMode,
    };

    saveVideoLink(game.id, siblingLinkData);
    updatedCount++;
  }

  return { updatedCount, isRealtime };
}

interface OffsetAnchor {
  recordedAtSeconds: number;
  offsetSeconds: number;
}

/**
 * Recomputes offsetSeconds for every game in a session that does NOT have a
 * manually-confirmed offset (see VideoLinkData.isOffsetManual), given
 * whichever games in the session currently do - the fix for cumulative
 * 60fps-assumption drift in RMG-K's bulk-exported .rmgr timestamps (session
 * matches aren't recorded at an exactly constant frame rate, so estimating
 * every match's start time by adding elapsedFrames/60 to the session's
 * base timestamp drifts further from the truth the later a match falls in
 * the session - see docs on the .rmgr format's recordedAtEpochMillis).
 *
 * With 2+ manual anchors: piecewise-linear interpolation between the two
 * nearest anchors (by recordedAt) surrounding each inferred game - or
 * linear extrapolation from the nearest two anchors, for a game outside
 * the outermost ones. Each inferred game's own OFFSET (which corresponds
 * to ITS frame 0, per VideoLinkData's own doc comment) is solved so that
 * the game's MIDPOINT - not its frame 0 - lands exactly on the
 * interpolated line: since a single game's own recordedAt/frameCount are
 * themselves subject to the same (small, single-match-scale) 60fps
 * assumption error the whole feature exists to correct for at the
 * session scale, anchoring at the midpoint splits that residual error
 * evenly across the game rather than concentrating it at one end.
 *
 * With exactly 1 manual anchor: every inferred game just gets that
 * anchor's offset shifted by the raw recordedAt delta - the best estimate
 * available with a single data point (matches propagateVideoLinkToSession's
 * long-standing behavior).
 *
 * Silent by design - call this after ANY change to which games are manual
 * or what their manual offsets are (a fresh manual set, an edit, or
 * clearVideoOffsetOverride()), never gated behind a confirmation prompt;
 * only attachVideoToSession() (extending the *set* of linked games) asks
 * the user anything.
 */
export function recomputeInferredOffsets(
  allGames: readonly SessionGameInfo[],
  videoId: string,
  url: string,
  defaultViewMode: VideoViewMode,
): { updatedCount: number } {
  const withLinks = allGames.map((game) => ({
    game,
    link: loadVideoLink(game.id),
  }));

  const anchors: OffsetAnchor[] = withLinks
    .filter(
      ({ link }) => link && link.videoId === videoId && isOffsetManual(link),
    )
    .map(({ game, link }) => ({
      recordedAtSeconds: game.recordedAt.getTime() / 1000,
      offsetSeconds: link!.offsetSeconds,
    }))
    .sort((a, b) => a.recordedAtSeconds - b.recordedAtSeconds);

  if (anchors.length === 0) return { updatedCount: 0 };

  let updatedCount = 0;
  for (const { game, link } of withLinks) {
    if (link && link.videoId === videoId && isOffsetManual(link)) continue;

    const t = game.recordedAt.getTime() / 1000;
    const halfDuration = game.frameCount / 60 / 2;
    let offsetSeconds: number;

    if (anchors.length === 1) {
      const only = anchors[0]!;
      offsetSeconds = only.offsetSeconds + (t - only.recordedAtSeconds);
    } else {
      let lo = anchors[0]!;
      let hi = anchors[anchors.length - 1]!;
      for (let i = 0; i < anchors.length - 1; i++) {
        const a = anchors[i]!;
        const b = anchors[i + 1]!;
        if (a.recordedAtSeconds <= t && t <= b.recordedAtSeconds) {
          lo = a;
          hi = b;
          break;
        }
      }
      if (t < anchors[0]!.recordedAtSeconds) {
        lo = anchors[0]!;
        hi = anchors[1]!;
      } else if (t > anchors[anchors.length - 1]!.recordedAtSeconds) {
        lo = anchors[anchors.length - 2]!;
        hi = anchors[anchors.length - 1]!;
      }

      const span = hi.recordedAtSeconds - lo.recordedAtSeconds;
      const driftPerSecond =
        span === 0 ? 0 : (hi.offsetSeconds - lo.offsetSeconds) / span;
      const midpoint = t + halfDuration;
      const videoTimeAtMidpoint =
        lo.offsetSeconds + driftPerSecond * (midpoint - lo.recordedAtSeconds);
      offsetSeconds = videoTimeAtMidpoint - halfDuration;
    }

    offsetSeconds = Math.max(0, Number(offsetSeconds.toFixed(2)));
    saveVideoLink(game.id, {
      videoId,
      url,
      offsetSeconds,
      viewMode: link?.viewMode ?? defaultViewMode,
      isOffsetManual: false,
    });
    updatedCount++;
  }

  return { updatedCount };
}

/**
 * The one confirmation-gated video-sync action: attaches `linkData` (with
 * its offset treated as a fresh manual anchor) to `sourceGameId`, then
 * silently infers every other linked-or-unlinked game in the session via
 * recomputeInferredOffsets(). Call this from a "link this video to the
 * other N games in this session?" prompt shown when a video is newly
 * attached to a game that's part of a multi-game session - never for a
 * plain offset edit on a game whose video is already attached (that just
 * needs a silent recomputeInferredOffsets() call, no prompt).
 */
export function attachVideoToSession(
  sourceGameId: string,
  linkData: VideoLinkData,
  allGames: readonly SessionGameInfo[],
): { updatedCount: number } {
  saveVideoLink(sourceGameId, { ...linkData, isOffsetManual: true });
  if (allGames.length <= 1) return { updatedCount: 0 };
  return recomputeInferredOffsets(
    allGames,
    linkData.videoId,
    linkData.url,
    linkData.viewMode,
  );
}

/**
 * Marks a game's offset as no-longer-manual and immediately recomputes it
 * (and any other non-manual siblings) from whichever manual anchors remain
 * in the session - the "clear override" action next to a manually-set
 * offset. A no-op if the game has no link at all, or its video doesn't
 * match any other game's (nothing to infer from/into).
 */
export function clearVideoOffsetOverride(
  gameId: string,
  allGames: readonly SessionGameInfo[],
): { updatedCount: number } {
  const link = loadVideoLink(gameId);
  if (!link) return { updatedCount: 0 };
  saveVideoLink(gameId, { ...link, isOffsetManual: false });
  return recomputeInferredOffsets(
    allGames,
    link.videoId,
    link.url,
    link.viewMode,
  );
}

/**
 * Removes the video link from every OTHER game in the session that shares
 * `sourceGameId`'s linked video (a sibling linked to a *different* video is
 * left untouched) - the bulk counterpart to attachVideoToSession(), for
 * undoing a session-wide link. Does not touch sourceGameId's own link;
 * callers that want the source unlinked too should also call
 * deleteVideoLink(sourceGameId) (or YouTubeSyncController.setLinkData(null)
 * if it's the currently-loaded game).
 */
export function unlinkVideoFromSession(
  sourceGameId: string,
  allGames: readonly SessionGameInfo[],
): { updatedCount: number } {
  const sourceLink = loadVideoLink(sourceGameId);
  if (!sourceLink) return { updatedCount: 0 };

  let updatedCount = 0;
  for (const game of allGames) {
    if (game.id === sourceGameId) continue;
    const link = loadVideoLink(game.id);
    if (link && link.videoId === sourceLink.videoId) {
      deleteVideoLink(game.id);
      updatedCount++;
    }
  }
  return { updatedCount };
}

// Global declaration for YouTube IFrame API
declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        config: {
          videoId?: string;
          host?: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: {
              data: number;
              target: YTPlayerInstance;
            }) => void;
            onError?: (event: { data: number }) => void;
          };
        },
      ) => YTPlayerInstance;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YTPlayerInstance {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  destroy(): void;
  getIframe(): HTMLIFrameElement;
}

/**
 * Synchronizes playback between rmgr-viewer and an embedded YouTube video.
 */
export class YouTubeSyncController {
  private player: YTPlayerInstance | null = null;
  private isApiReady = false;
  private isPlayerReady = false;
  private currentReplayId: string | null = null;
  private linkData: VideoLinkData | null = null;
  private isSyncingFromReplay = false;
  private isSyncingFromVideo = false;
  private syncIntervalHandle: number | null = null;
  private lastPolledVideoTime = -1;

  constructor(
    private readonly containerId: string,
    private readonly getCurrentReplayFrame: () => number,
    private readonly onFrameSeekRequest: (frameIndex: number) => void,
    private readonly onPlayStateChangeRequest: (playing: boolean) => void,
    private readonly onViewModeChange: (mode: VideoViewMode) => void,
    private readonly onLinkDataChange: (data: VideoLinkData | null) => void,
  ) {
    this.ensureYouTubeApiLoaded();
  }

  private ensureYouTubeApiLoaded(): void {
    if (typeof window === "undefined") {
      return;
    }

    if (window.YT && window.YT.Player) {
      this.isApiReady = true;
      return;
    }

    if (
      typeof document !== "undefined" &&
      !document.getElementById("yt-iframe-api-script")
    ) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api-script";
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else if (document.head) {
        document.head.appendChild(tag);
      }
    }

    const prevOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      this.isApiReady = true;
      if (prevOnReady) prevOnReady();
      if (this.linkData) {
        this.createOrUpdatePlayer();
      }
    };
  }

  public setReplay(replayId: string | null): void {
    this.currentReplayId = replayId;
    if (!replayId) {
      this.unloadVideo();
      return;
    }

    const saved = loadVideoLink(replayId);
    if (saved) {
      this.setLinkData(saved, false);
    } else {
      this.unloadVideo();
    }
  }

  public getLinkData(): VideoLinkData | null {
    return this.linkData;
  }

  public setLinkData(data: VideoLinkData | null, persist = true): void {
    this.linkData = data;
    if (persist && this.currentReplayId) {
      if (data) {
        saveVideoLink(this.currentReplayId, data);
      } else {
        deleteVideoLink(this.currentReplayId);
      }
    }

    this.onLinkDataChange(this.linkData);

    if (this.linkData) {
      this.onViewModeChange(this.linkData.viewMode);
      // Replay 🔇 means YouTube shouldn't be involved at all, not just
      // silent/paused - no iframe, no async postMessage traffic, nothing
      // that can race with or "correct" the replay's own playback. See
      // createOrUpdatePlayer()'s own guard for the other half of this.
      if (this.linkData.viewMode === "canvas-muted") {
        this.destroyPlayer();
      } else {
        this.createOrUpdatePlayer();
      }
    } else {
      this.onViewModeChange("canvas");
      this.destroyPlayer();
    }
  }

  public setViewMode(mode: VideoViewMode): void {
    if (!this.linkData) return;
    this.linkData = { ...this.linkData, viewMode: mode };
    if (this.currentReplayId) {
      saveVideoLink(this.currentReplayId, this.linkData);
    }
    if (mode === "canvas-muted") {
      // Leaving any video-involved mode for Replay 🔇: tear the player
      // down entirely rather than just pausing it - see createOrUpdatePlayer()'s
      // doc comment for why "paused but still there" isn't good enough.
      this.destroyPlayer();
    } else if (!this.player) {
      // Coming FROM Replay 🔇 (no player exists yet) into a video-involved
      // mode - create it now, lazily.
      this.createOrUpdatePlayer();
    }
    this.onViewModeChange(mode);
    this.onLinkDataChange(this.linkData);
  }

  public nudgeOffset(deltaSeconds: number, currentReplayFrame: number): void {
    if (!this.linkData) return;
    const newOffset = Number(
      (this.linkData.offsetSeconds + deltaSeconds).toFixed(3),
    );
    this.linkData = {
      ...this.linkData,
      offsetSeconds: newOffset,
      isOffsetManual: true,
    };
    if (this.currentReplayId) {
      saveVideoLink(this.currentReplayId, this.linkData);
    }
    this.onLinkDataChange(this.linkData);
    this.seekVideoToFrame(currentReplayFrame);
  }

  public setOffsetSeconds(
    offsetSeconds: number,
    currentReplayFrame: number,
  ): void {
    if (!this.linkData) return;
    const newOffset = Number(offsetSeconds.toFixed(3));
    this.linkData = {
      ...this.linkData,
      offsetSeconds: newOffset,
      isOffsetManual: true,
    };
    if (this.currentReplayId) {
      saveVideoLink(this.currentReplayId, this.linkData);
    }
    this.onLinkDataChange(this.linkData);
    this.seekVideoToFrame(currentReplayFrame);
  }

  public syncCurrentFrame(currentReplayFrame: number): void {
    if (!this.linkData || !this.player || !this.isPlayerReady) return;
    try {
      const currentVideoTime = this.player.getCurrentTime();
      const replayTime = currentReplayFrame / 60;
      const newOffset = Number((currentVideoTime - replayTime).toFixed(3));
      this.linkData = {
        ...this.linkData,
        offsetSeconds: newOffset,
        isOffsetManual: true,
      };
      if (this.currentReplayId) {
        saveVideoLink(this.currentReplayId, this.linkData);
      }
      this.onLinkDataChange(this.linkData);
    } catch {
      // Ignore player get time errors
    }
  }

  public onReplayFrameChange(
    frameIndex: number,
    playing: boolean,
    reason: "jump" | "tick",
  ): void {
    if (
      !this.linkData ||
      !this.player ||
      !this.isPlayerReady ||
      this.isSyncingFromVideo
    )
      return;

    const targetTime = frameToVideoTime(
      frameIndex,
      this.linkData.offsetSeconds,
    );

    if (reason === "jump") {
      // No "canvas-muted" branch needed here - createOrUpdatePlayer() never
      // creates a player at all in that mode (see its own doc comment), so
      // this.player is only ever non-null when a video-involved mode owns it.
      this.isSyncingFromReplay = true;
      try {
        this.player.seekTo(targetTime, true);
        if (playing) {
          this.player.playVideo();
        } else {
          this.player.pauseVideo();
        }
      } catch {
        // Player not ready
      }
      setTimeout(() => {
        this.isSyncingFromReplay = false;
      }, 300);
    }
  }

  public onPlaybackSpeedChange(speed: number): void {
    if (!this.player || !this.isPlayerReady) return;
    try {
      this.player.setPlaybackRate(speed);
    } catch {
      // Ignore
    }
  }

  public onReplayPlayStateChange(playing: boolean, currentFrame: number): void {
    if (
      !this.linkData ||
      !this.player ||
      !this.isPlayerReady ||
      this.isSyncingFromVideo
    )
      return;

    // No "canvas-muted" branch needed here - createOrUpdatePlayer() never
    // creates a player at all in that mode (see its own doc comment), so
    // this.player is only ever non-null when a video-involved mode owns it.
    this.isSyncingFromReplay = true;
    try {
      if (playing) {
        const targetTime = frameToVideoTime(
          currentFrame,
          this.linkData.offsetSeconds,
        );
        const currentTime = this.player.getCurrentTime();
        if (Math.abs(currentTime - targetTime) > 0.3) {
          this.player.seekTo(targetTime, true);
        }
        this.player.playVideo();
      } else {
        this.player.pauseVideo();
      }
    } catch {
      // Ignore
    }
    setTimeout(() => {
      this.isSyncingFromReplay = false;
    }, 300);
  }

  private seekVideoToFrame(frameIndex: number): void {
    if (!this.linkData || !this.player || !this.isPlayerReady) return;
    const targetTime = frameToVideoTime(
      frameIndex,
      this.linkData.offsetSeconds,
    );
    try {
      this.player.seekTo(targetTime, true);
    } catch {
      // Ignore
    }
  }

  private createOrUpdatePlayer(): void {
    if (!this.linkData) return;
    // Replay 🔇 means YouTube shouldn't be involved at all - no iframe, no
    // async postMessage traffic to race with the replay's own playback.
    // Redundant with setLinkData()/setViewMode()'s own guards, but this is
    // also reachable from the global onYouTubeIframeAPIReady callback,
    // which can fire well after either of those ran.
    if (this.linkData.viewMode === "canvas-muted") return;
    if (typeof window !== "undefined" && window.YT && window.YT.Player) {
      this.isApiReady = true;
    }
    if (
      !this.isApiReady ||
      typeof window === "undefined" ||
      !window.YT ||
      !window.YT.Player
    ) {
      return;
    }

    if (this.player) {
      this.destroyPlayer();
    }

    if (typeof document === "undefined") return;
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Clear previous children and create element for player
    container.innerHTML = `<div id="${this.containerId}_yt"></div>`;

    const origin =
      typeof window !== "undefined" &&
      (window.location.protocol === "http:" ||
        window.location.protocol === "https:")
        ? window.location.origin
        : undefined;

    this.player = new window.YT.Player(`${this.containerId}_yt`, {
      videoId: this.linkData.videoId,
      host: "https://www.youtube-nocookie.com",
      playerVars: {
        autoplay: 0,
        controls: 1,
        disablekb: 0,
        enablejsapi: 1,
        modestbranding: 1,
        rel: 0,
        origin,
        start: Math.max(0, Math.floor(this.linkData.offsetSeconds)),
      },
      events: {
        onReady: () => {
          this.isPlayerReady = true;
          // The player just loaded sitting at its `start:` param (this
          // game's own frame-0 video time) - any seek attempted before now
          // (e.g. onReplayFrameChange() firing while a playlist clip
          // seeks straight to a mid-game frame) was silently dropped,
          // since it requires isPlayerReady. Without this resync, the
          // player's next state-change event reads back that stale
          // frame-0 position and "corrects" the replay to match it -
          // yanking a correctly-seeked playlist clip back to frame 0 a
          // moment after it started. Catch up to wherever the replay
          // actually is right now before that can happen.
          this.isSyncingFromReplay = true;
          try {
            if (this.linkData) {
              const targetTime = frameToVideoTime(
                this.getCurrentReplayFrame(),
                this.linkData.offsetSeconds,
              );
              this.player?.seekTo(targetTime, true);
            }
          } catch {
            // Player not ready
          }
          setTimeout(() => {
            this.isSyncingFromReplay = false;
          }, 300);
          this.startSyncLoop();
        },
        onStateChange: (event) => {
          this.handlePlayerStateChange(event.data);
        },
        onError: (event) => {
          console.warn("YouTube Player error:", event.data);
        },
      },
    });
  }

  private handlePlayerStateChange(state: number): void {
    if (
      typeof window === "undefined" ||
      !window.YT ||
      this.isSyncingFromReplay
    ) {
      return;
    }

    if (state === window.YT.PlayerState.PLAYING) {
      this.isSyncingFromVideo = true;
      if (this.player && this.linkData && this.isPlayerReady) {
        try {
          const videoTime = this.player.getCurrentTime();
          const targetFrame = videoTimeToFrame(
            videoTime,
            this.linkData.offsetSeconds,
          );
          const currentFrame = this.getCurrentReplayFrame();
          if (Math.abs(currentFrame - targetFrame) > 15) {
            this.onFrameSeekRequest(targetFrame);
          }
        } catch {
          // Ignore
        }
      }
      this.onPlayStateChangeRequest(true);
      setTimeout(() => {
        this.isSyncingFromVideo = false;
      }, 300);
    } else if (
      state === window.YT.PlayerState.PAUSED ||
      state === window.YT.PlayerState.ENDED
    ) {
      this.isSyncingFromVideo = true;
      if (this.player && this.linkData && this.isPlayerReady) {
        try {
          const videoTime = this.player.getCurrentTime();
          const targetFrame = videoTimeToFrame(
            videoTime,
            this.linkData.offsetSeconds,
          );
          this.onFrameSeekRequest(targetFrame);
        } catch {
          // Ignore
        }
      }
      this.onPlayStateChangeRequest(false);
      setTimeout(() => {
        this.isSyncingFromVideo = false;
      }, 300);
    }
  }

  private startSyncLoop(): void {
    this.stopSyncLoop();
    this.syncIntervalHandle = window.setInterval(() => {
      if (
        !this.player ||
        !this.linkData ||
        !this.isPlayerReady ||
        this.isSyncingFromReplay
      ) {
        return;
      }
      try {
        const state = this.player.getPlayerState();
        const videoTime = this.player.getCurrentTime();
        const currentReplayFrame = this.getCurrentReplayFrame();
        const expectedReplayFrame = videoTimeToFrame(
          videoTime,
          this.linkData.offsetSeconds,
        );
        const frameDiff = Math.abs(currentReplayFrame - expectedReplayFrame);

        if (window.YT && state === window.YT.PlayerState.PLAYING) {
          // While playing, only resync if drift is significant (> 25 frames / ~0.42s)
          // such as when the video player buffered or user scrubbed the video.
          // This avoids YouTube's coarse ~250ms polling from jittering smooth 60fps playback.
          if (frameDiff > 25) {
            this.isSyncingFromVideo = true;
            this.onFrameSeekRequest(expectedReplayFrame);
            setTimeout(() => {
              this.isSyncingFromVideo = false;
            }, 150);
          }
        } else if (
          window.YT &&
          (state === window.YT.PlayerState.PAUSED ||
            state === window.YT.PlayerState.CUED ||
            state === window.YT.PlayerState.UNSTARTED)
        ) {
          // When video is paused, if user scrubs the YouTube progress bar, update replay
          if (
            Math.abs(videoTime - this.lastPolledVideoTime) > 0.05 &&
            frameDiff > 2
          ) {
            this.isSyncingFromVideo = true;
            this.onFrameSeekRequest(expectedReplayFrame);
            setTimeout(() => {
              this.isSyncingFromVideo = false;
            }, 100);
          }
        }

        this.lastPolledVideoTime = videoTime;
      } catch {
        // Ignore errors during video poll
      }
    }, 150);
  }

  private stopSyncLoop(): void {
    if (this.syncIntervalHandle !== null) {
      window.clearInterval(this.syncIntervalHandle);
      this.syncIntervalHandle = null;
    }
  }

  public unloadVideo(): void {
    this.linkData = null;
    this.stopSyncLoop();
    this.destroyPlayer();
    this.onLinkDataChange(null);
    this.onViewModeChange("canvas");
  }

  public destroy(): void {
    this.unloadVideo();
  }

  private destroyPlayer(): void {
    this.stopSyncLoop();
    this.isPlayerReady = false;
    if (this.player) {
      try {
        this.player.destroy();
      } catch {
        // Ignore
      }
      this.player = null;
    }
    if (typeof document !== "undefined") {
      const container = document.getElementById(this.containerId);
      if (container) {
        container.innerHTML = "";
      }
    }
  }
}
