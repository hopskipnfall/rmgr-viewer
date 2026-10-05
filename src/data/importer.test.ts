import { File as NodeFile } from "node:buffer";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseReplay } from "@rmg-k/rmgr";
import { DEMO_REPLAY_FILENAMES } from "./demoReplayFiles.js";
import { fromBrowserFile } from "./replayFileSource.js";
import { gameIdFor } from "./gameSummary.js";
import { importReplayFiles, sha256Hex } from "./importer.js";

// `File` is only a global from Node 20 on, and CI still runs 18.
const FileCtor = (globalThis.File ?? NodeFile) as unknown as typeof File;

const replaysDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../public/replays",
);
const name = DEMO_REPLAY_FILENAMES[0]!;
const bytes = new Uint8Array(readFileSync(resolve(replaysDir, name)));

describe("importReplayFiles", () => {
  it("returns each game's summary plus the metadata a cache entry needs", async () => {
    const file = fromBrowserFile(
      new FileCtor([bytes], name, { lastModified: 1234 }),
    );
    const replay = await parseReplay(bytes);

    const { games, errors } = await importReplayFiles([file]);

    expect(errors).toEqual([]);
    expect(games).toHaveLength(1);
    const [game] = games;
    expect(game!.summary.id).toBe(
      gameIdFor(replay.header.recordedAtEpochMillis, replay.frames.length),
    );
    expect(game!.summary.source).toBe(file);
    expect(game!.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(game!.contentHash).toBe(await sha256Hex(bytes));
    expect(game!.formatVersion).toBe(replay.header.version);
    expect(game!.recorderSchemaVersion).toBe(
      replay.header.recorderSchemaVersion,
    );
    expect(game!.meta).toEqual({
      sourcePath: name,
      size: bytes.byteLength,
      lastModified: 1234,
    });
  });

  it("reports a file that fails to parse instead of returning it", async () => {
    const junk = fromBrowserFile(
      new FileCtor([new Uint8Array([1, 2, 3])], "junk.rmgr"),
    );
    const { games, errors } = await importReplayFiles([junk]);
    expect(games).toEqual([]);
    expect(errors.map((e) => e.fileName)).toEqual(["junk.rmgr"]);
  });

  it("ignores files that aren't .rmgr", async () => {
    const txt = fromBrowserFile(new FileCtor(["hello"], "notes.txt"));
    const { games, errors } = await importReplayFiles([txt]);
    expect(games).toEqual([]);
    expect(errors).toEqual([]);
  });
});
