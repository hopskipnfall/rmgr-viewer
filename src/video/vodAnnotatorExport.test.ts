import { describe, it, expect } from "vitest";
import {
  buildVodMemos,
  buildVodAnnotatorUrl,
  serializeVodAnnotations,
  type VodExportInput,
} from "./vodAnnotatorExport.js";
import type { NeutralHitEvent } from "../neutralHits.js";
import type { MatchNote } from "../notes.js";

const ev = (
  frameIndex: number,
  attackerPort: number,
  victimPort: number,
): NeutralHitEvent =>
  ({
    frame: frameIndex,
    frameIndex,
    kind: "neutral-hit",
    attackerPort,
    victimPort,
    hitType: "attack",
    reason: "whiff-punish",
  }) as unknown as NeutralHitEvent;

const note = (frameIndex: number, text: string): MatchNote => ({
  id: String(frameIndex),
  frameIndex,
  text,
  createdAt: 0,
  updatedAt: 0,
});

const base = (over: Partial<VodExportInput>): VodExportInput => ({
  videoId: "dQw4w9WgXcQ",
  offsetSeconds: 10,
  perspectivePort: 0,
  events: [],
  notes: [],
  describeEvent: () => "Whiff punish",
  winLabel: "Neutral win",
  lossLabel: "Neutral loss",
  ...over,
});

const decode = (b64: string) =>
  JSON.parse(
    decodeURIComponent(
      [...atob(b64)]
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    ),
  );

describe("buildVodMemos", () => {
  it("maps wins, losses and notes to offset video time, sorted", () => {
    const memos = buildVodMemos(
      base({
        events: [ev(600, 1, 0), ev(60, 0, 1), ev(120, 2, 3)],
        notes: [note(300, "mix-up")],
      }),
    );
    expect(memos).toEqual([
      { timestampSeconds: 11, message: "Neutral win: Whiff punish", kind: "w" },
      { timestampSeconds: 15, message: "mix-up", kind: "" },
      {
        timestampSeconds: 20,
        message: "Neutral loss: Whiff punish",
        kind: "l",
      },
    ]);
  });
});

describe("serializeVodAnnotations", () => {
  it("emits v1 (byte-compatible) when no memo has a kind", () => {
    const b64 = serializeVodAnnotations("abc", [
      { timestampSeconds: 5, message: "hi", kind: "" },
    ]);
    expect(decode(b64)).toEqual(["abc", 5, "hi"]);
  });

  it("emits v2 when any memo has a kind", () => {
    const b64 = serializeVodAnnotations("abc", [
      { timestampSeconds: 5, message: "é✓", kind: "w" },
      { timestampSeconds: 6, message: "x", kind: "" },
    ]);
    expect(decode(b64)).toEqual(["abc", "v2", 5, "é✓", "w", 6, "x", ""]);
  });
});

describe("buildVodAnnotatorUrl", () => {
  it("URL-encodes the base64 payload", () => {
    const url = buildVodAnnotatorUrl("abc", [
      { timestampSeconds: 1, message: "???>>>~~~", kind: "l" },
    ]);
    const param = new URL(url).searchParams.get("annotations")!;
    expect(url).toMatch(
      /^https:\/\/hopskipnfall\.github\.io\/vod-annotator\/editor\?annotations=/,
    );
    expect(decode(param)[1]).toBe("v2");
  });
});

describe("vod-annotator fixtures", () => {
  it("matches the v2 fixture from vod-annotator's serializer spec", () => {
    expect(
      serializeVodAnnotations("dQw4w9WgXcQ", [
        {
          timestampSeconds: 12.3,
          message: "Neutral win > footsie??",
          kind: "w",
        },
        { timestampSeconds: 45, message: "", kind: "l" },
        { timestampSeconds: 61.5, message: "Dropped combo, 日本語", kind: "" },
      ]),
    ).toBe(
      "WyJkUXc0dzlXZ1hjUSIsInYyIiwxMi4zLCJOZXV0cmFsIHdpbiA+IGZvb3RzaWU/PyIsInciLDQ1LCIiLCJsIiw2MS41LCJEcm9wcGVkIGNvbWJvLCDml6XmnKzoqp4iLCIiXQ==",
    );
  });

  it("matches the v1 fixture", () => {
    expect(
      serializeVodAnnotations("dQw4w9WgXcQ", [
        { timestampSeconds: 12.3, message: "Hello", kind: "" },
        { timestampSeconds: 45, message: "World", kind: "" },
      ]),
    ).toBe("WyJkUXc0dzlXZ1hjUSIsMTIuMywiSGVsbG8iLDQ1LCJXb3JsZCJd");
  });
});
