import { describe, it, expect } from "vitest";
import { formatBytes } from "./matchView.js";
import { TRANSLATIONS } from "../i18n.js";
import * as fs from "node:fs";
import * as path from "node:path";

describe("Replay Info Metadata", () => {
  describe("formatBytes", () => {
    it("formats 0 and negative bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(-10)).toBe("0 B");
    });

    it("formats bytes under 1 KB", () => {
      expect(formatBytes(512)).toBe("512 B");
      expect(formatBytes(1023)).toBe("1023 B");
    });

    it("formats kilobytes", () => {
      expect(formatBytes(1024)).toBe("1.0 KB");
      expect(formatBytes(46284)).toBe("45.2 KB");
    });

    it("formats megabytes", () => {
      expect(formatBytes(1048576)).toBe("1.00 MB");
      expect(formatBytes(15728640)).toBe("15.00 MB");
    });
  });

  describe("i18n translations", () => {
    it("provides all replay info metadata translation keys in EN and JA", () => {
      for (const lang of ["en", "ja"] as const) {
        const tr = TRANSLATIONS[lang];
        expect(tr.replayInfoGoodNameLabel).toBeDefined();
        expect(tr.replayInfoSpecVersionLabel).toBeDefined();
        expect(tr.replayInfoSchemaVersionLabel).toBeDefined();
        expect(tr.replayInfoGameFamilyLabel).toBeDefined();
        expect(tr.replayInfoDurationLabel).toBeDefined();
        expect(tr.replayInfoEndReasonLabel).toBeDefined();
        expect(tr.replayInfoEndReasonNormal).toBeDefined();
        expect(tr.replayInfoEndReasonAborted).toBeDefined();
        expect(tr.replayInfoSizeLabel).toBeDefined();
        expect(typeof tr.replayInfoUncompressedSize).toBe("function");
        expect(tr.replayInfoUncompressedSize("100 KB")).toBeTruthy();
      }
    });
  });

  describe("HTML DOM structure", () => {
    it("contains all new replay info elements in index.html", () => {
      const htmlPath = path.resolve(__dirname, "../../index.html");
      const html = fs.readFileSync(htmlPath, "utf-8");

      const expectedIds = [
        "replayInfoGoodNameLabel",
        "replayInfoGoodName",
        "replayInfoSpecVersionLabel",
        "replayInfoSpecVersion",
        "replayInfoSchemaVersionLabel",
        "replayInfoSchemaVersion",
        "replayInfoGameFamilyLabel",
        "replayInfoGameFamily",
        "replayInfoDurationLabel",
        "replayInfoDuration",
        "replayInfoEndReasonLabel",
        "replayInfoEndReason",
        "replayInfoSizeLabel",
        "replayInfoSize",
      ];

      for (const id of expectedIds) {
        expect(html).toContain(`id="${id}"`);
      }
    });
  });
});
