export type VideoViewMode = "video-pip" | "video-only" | "canvas";

export interface VideoLinkData {
  videoId: string;
  url: string;
  offsetSeconds: number; // Video time (seconds) corresponding to replay frame 0
  viewMode: VideoViewMode;
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
        viewMode: parsed.viewMode || "video-only",
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
      this.createOrUpdatePlayer();
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
    this.onViewModeChange(mode);
    this.onLinkDataChange(this.linkData);
  }

  public nudgeOffset(deltaSeconds: number, currentReplayFrame: number): void {
    if (!this.linkData) return;
    const newOffset = Number(
      (this.linkData.offsetSeconds + deltaSeconds).toFixed(3),
    );
    this.linkData = { ...this.linkData, offsetSeconds: newOffset };
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
    this.linkData = { ...this.linkData, offsetSeconds: newOffset };
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
      this.linkData = { ...this.linkData, offsetSeconds: newOffset };
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
