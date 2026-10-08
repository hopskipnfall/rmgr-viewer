/**
 * Builds an "Open in Vod Annotator" link from a game's neutral interactions
 * and notes. Vod Annotator (https://github.com/hopskipnfall/vod-annotator)
 * keeps its whole state in the URL; this mirrors its serializer
 * (object-serializer.service.ts) since the two apps share no code:
 *
 *   base64(utf8-safe JSON of [youtubeId, "v2", ts, msg, kind, ts, msg, kind, ...])
 *
 * kind is "w" (neutral win), "l" (neutral loss) or "" (user memo).
 */
import type { NeutralHitEvent } from "../neutralHits.js";
import type { MatchNote } from "../notes.js";
import { frameToVideoTime } from "./youtubeSync.js";

export const VOD_ANNOTATOR_BASE_URL =
  "https://hopskipnfall.github.io/vod-annotator/editor";

export type VodMemoKind = "w" | "l" | "";

export interface VodMemo {
  timestampSeconds: number;
  message: string;
  kind: VodMemoKind;
}

export interface VodExportInput {
  videoId: string;
  offsetSeconds: number;
  perspectivePort: number;
  events: readonly NeutralHitEvent[];
  notes: readonly MatchNote[];
  /** Short label for an event, e.g. "Whiff punish (2 hits)". */
  describeEvent: (e: NeutralHitEvent) => string;
  winLabel: string;
  lossLabel: string;
}

function roundTenth(seconds: number): number {
  return Math.round(seconds * 10) / 10;
}

/** Wins/losses from `perspectivePort` plus every note, sorted by video time. Events not involving the perspective port are skipped. */
export function buildVodMemos(input: VodExportInput): VodMemo[] {
  const at = (frameIndex: number) =>
    roundTenth(frameToVideoTime(frameIndex, input.offsetSeconds));
  const memos: VodMemo[] = [];
  for (const e of input.events) {
    const isWin = e.attackerPort === input.perspectivePort;
    const isLoss = e.victimPort === input.perspectivePort;
    if (!isWin && !isLoss) continue;
    memos.push({
      timestampSeconds: at(e.frameIndex),
      message: `${isWin ? input.winLabel : input.lossLabel}: ${input.describeEvent(e)}`,
      kind: isWin ? "w" : "l",
    });
  }
  for (const n of input.notes) {
    memos.push({
      timestampSeconds: at(n.frameIndex),
      message: n.text,
      kind: "",
    });
  }
  // Stable: ties keep events before notes.
  return memos.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
}

function b64EncodeUnicode(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_m, p1: string) =>
      String.fromCharCode(parseInt(p1, 16)),
    ),
  );
}

export function serializeVodAnnotations(
  youtubeId: string,
  memos: readonly VodMemo[],
): string {
  const useV2 = memos.some((m) => m.kind !== "");
  const flat: (string | number)[] = [youtubeId];
  if (useV2) flat.push("v2");
  for (const m of memos) {
    flat.push(m.timestampSeconds, m.message);
    if (useV2) flat.push(m.kind);
  }
  return b64EncodeUnicode(JSON.stringify(flat));
}

export function buildVodAnnotatorUrl(
  youtubeId: string,
  memos: readonly VodMemo[],
): string {
  return `${VOD_ANNOTATOR_BASE_URL}?annotations=${encodeURIComponent(
    serializeVodAnnotations(youtubeId, memos),
  )}`;
}
