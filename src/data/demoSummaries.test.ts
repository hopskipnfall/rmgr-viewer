import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseReplay } from "@rmg-k/rmgr";
import {
  serializeGameSummary,
  summarizeReplay,
  type DemoSummariesFile,
  type SerializedGameSummary,
} from "./gameSummary.js";
import { ANALYSIS_VERSION } from "./analysisVersion.js";
import { DEMO_REPLAY_FILENAMES } from "./demoReplayFiles.js";

/**
 * The analysis-version guard: `public/replays/demo-summaries.json` doubles
 * as a snapshot of summarizeReplay()'s output over the bundled demo
 * replays. If this fails after an analysis change, bump ANALYSIS_VERSION in
 * analysisVersion.ts and run `npm run generate:demo-summaries` - that
 * marks every user's cached summaries stale so they get recomputed.
 */
const replaysDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../public/replays",
);
const file = JSON.parse(
  readFileSync(resolve(replaysDir, "demo-summaries.json"), "utf8"),
) as DemoSummariesFile;

describe("demo-summaries.json analysis snapshot", () => {
  it("is stamped with the current ANALYSIS_VERSION", () => {
    expect(file.analysisVersion, "run `npm run generate:demo-summaries`").toBe(
      ANALYSIS_VERSION,
    );
  });

  it("matches current summarizeReplay() output", async () => {
    const fresh: SerializedGameSummary[] = [];
    for (const name of DEMO_REPLAY_FILENAMES) {
      const replay = await parseReplay(
        new Uint8Array(readFileSync(resolve(replaysDir, name))),
      );
      const summary = summarizeReplay(
        {
          replay,
          sourceName: name,
          recordedAt: new Date(replay.header.recordedAtEpochMillis),
        },
        null,
      );
      fresh.push(serializeGameSummary(summary));
    }
    expect(
      JSON.parse(JSON.stringify(fresh)),
      "analysis output changed: bump ANALYSIS_VERSION and run `npm run generate:demo-summaries`",
    ).toEqual(file.games);
  }, 120_000);
});
