import { describe, expect, it } from "vitest";
import type { PlaylistClip } from "../playlist.js";
import type { VideoLinkData } from "../video/youtubeSync.js";
import {
  buildFfmpegClipsCommand,
  buildYtDlpDownloadCommand,
  clipVideoRanges,
  shellQuote,
} from "./ffmpegClips.js";

describe("buildYtDlpDownloadCommand", () => {
  it("downloads best video + audio into the named .mkv, with the URL quoted", () => {
    expect(
      buildYtDlpDownloadCommand(
        "https://www.youtube.com/watch?v=tcMChEWcHZ4",
        "session-tcMChEWcHZ4.mkv",
      ),
    ).toBe(
      'yt-dlp -f "bv*+ba/b" --merge-output-format mkv ' +
        "-o session-tcMChEWcHZ4.mkv 'https://www.youtube.com/watch?v=tcMChEWcHZ4'",
    );
  });
});

const link = (videoId: string, offsetSeconds: number): VideoLinkData => ({
  videoId,
  url: `https://www.youtube.com/watch?v=${videoId}`,
  offsetSeconds,
  viewMode: "canvas-muted",
});

const clip = (gameId: string, start: number, end: number): PlaylistClip => ({
  gameId,
  startFrameIndex: start,
  endFrameIndex: end,
  label: gameId,
});

describe("clipVideoRanges", () => {
  const links: Record<string, VideoLinkData> = {
    g1: link("vid", 5.8),
    g2: link("vid", 169.95),
    other: link("different", 0),
  };
  const linkFor = (id: string) => links[id] ?? null;

  it("maps each clip onto the video using its own game's offset", () => {
    const { ranges, skipped } = clipVideoRanges(
      [clip("g1", 600, 1200), clip("g2", 0, 300)],
      "vid",
      linkFor,
    );
    expect(skipped).toBe(0);
    expect(ranges.map((r) => [r.startSeconds, r.endSeconds])).toEqual([
      [15.8, 25.8],
      [169.95, 174.95],
    ]);
  });

  it("leaves out clips whose game is unlinked or linked to another video", () => {
    const { ranges, skipped } = clipVideoRanges(
      [clip("g1", 0, 60), clip("other", 0, 60), clip("unlinked", 0, 60)],
      "vid",
      linkFor,
    );
    expect(ranges).toHaveLength(1);
    expect(skipped).toBe(2);
  });
});

describe("buildFfmpegClipsCommand", () => {
  it("seeks each range as its own input and joins them into clips.mp4", () => {
    expect(
      buildFfmpegClipsCommand([
        { startSeconds: 15.8, endSeconds: 25.8 },
        { startSeconds: 169.95, endSeconds: 174.95 },
      ]),
    ).toBe(
      "ffmpeg -ss 15.800 -t 10.000 -i INPUT.mp4 " +
        "-ss 169.950 -t 5.000 -i INPUT.mp4 " +
        '-filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[outv][outa]" ' +
        '-map "[outv]" -map "[outa]" clips.mp4',
    );
  });
});

describe("shellQuote", () => {
  it("leaves plain file names alone", () => {
    expect(shellQuote("INPUT.mkv")).toBe("INPUT.mkv");
    expect(shellQuote("videos/nue_2026-09-13.mp4")).toBe(
      "videos/nue_2026-09-13.mp4",
    );
  });

  it("single-quotes names with spaces or quotes so they stay one word", () => {
    expect(shellQuote("nue replays/session 1.mkv")).toBe(
      "'nue replays/session 1.mkv'",
    );
    expect(shellQuote("nue's video.mkv")).toBe("'nue'\\''s video.mkv'");
  });

  it("is applied to the input file in every clip", () => {
    const command = buildFfmpegClipsCommand(
      [
        { startSeconds: 1, endSeconds: 2 },
        { startSeconds: 3, endSeconds: 4 },
      ],
      "session 1.mkv",
    );
    expect(command.match(/-i 'session 1\.mkv'/g)).toHaveLength(2);
  });
});
