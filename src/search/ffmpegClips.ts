import type { PlaylistClip } from "../playlist.js";
import { frameToVideoTime, type VideoLinkData } from "../video/youtubeSync.js";

/** One clip's time range, in seconds, within a session's video. */
export interface VideoRange {
  readonly startSeconds: number;
  readonly endSeconds: number;
}

/**
 * Each clip's time range in the session video `videoId`, using the clip's own
 * game's sync offset (offsets differ game to game within a session). Clips
 * whose game has no video link, or is linked to a different video, are left
 * out and counted in `skipped`.
 */
export function clipVideoRanges(
  clips: readonly PlaylistClip[],
  videoId: string,
  linkFor: (gameId: string) => VideoLinkData | null,
): { ranges: VideoRange[]; skipped: number } {
  const ranges: VideoRange[] = [];
  let skipped = 0;
  for (const clip of clips) {
    const link = linkFor(clip.gameId);
    if (!link || link.videoId !== videoId) {
      skipped++;
      continue;
    }
    ranges.push({
      startSeconds: frameToVideoTime(clip.startFrameIndex, link.offsetSeconds),
      endSeconds: frameToVideoTime(clip.endFrameIndex, link.offsetSeconds),
    });
  }
  return { ranges, skipped };
}

/**
 * One ffmpeg command that cuts every range out of a local copy of the video
 * and joins them, in order, into a single file. Re-encodes (frame-accurate;
 * stream-copy cuts would snap to the nearest keyframe, often a second or
 * more off). Assumes the video has an audio track.
 *
 * Each range is its own input, seeked with -ss/-t, then joined with concat.
 * An earlier version decoded the whole file once and split it with
 * trim/atrim per range: with results in newest-first order over a
 * multi-hour session video, ffmpeg had to buffer hours of decoded frames for
 * the later-in-output (earlier-in-video) clips, and the audio came out
 * silent. Per-range seeking never buffers across ranges, works in any order,
 * and only decodes the ranges themselves.
 */
export function buildFfmpegClipsCommand(
  ranges: readonly VideoRange[],
  input = "INPUT.mp4",
  output = "clips.mp4",
): string {
  const t = (seconds: number) => seconds.toFixed(3);
  const inputFile = shellQuote(input);
  const inputs = ranges
    .map(
      (r) =>
        `-ss ${t(r.startSeconds)} -t ${t(r.endSeconds - r.startSeconds)} -i ${inputFile}`,
    )
    .join(" ");
  const streams = ranges.map((_, i) => `[${i}:v][${i}:a]`).join("");
  const graph = `${streams}concat=n=${ranges.length}:v=1:a=1[outv][outa]`;
  return `ffmpeg ${inputs} -filter_complex "${graph}" -map "[outv]" -map "[outa]" ${shellQuote(output)}`;
}

/** A yt-dlp command that downloads the video (best video + best audio, merged into `file`, which
 * should end in .mkv). Used when the user doesn't have a local copy yet. */
export function buildYtDlpDownloadCommand(url: string, file: string): string {
  return `yt-dlp -f "bv*+ba/b" --merge-output-format mkv -o ${shellQuote(file)} ${shellQuote(url)}`;
}

/** A file name as one shell word: unchanged when it's plain, otherwise single-quoted. */
export function shellQuote(name: string): string {
  if (/^[\w./-]+$/.test(name)) return name;
  return `'${name.replace(/'/g, `'\\''`)}'`;
}
