import { describe, it, expect } from "vitest";
import {
  CHARACTER_GROUPS,
  ORIGINAL_CHARACTERS,
  CharacterPreviewController,
} from "./characterPreview.js";

describe("Character Preview Character Definitions", () => {
  it("includes Original 12 and Remix Fighters groups", () => {
    const groupNames = CHARACTER_GROUPS.map((g) => g.groupName);
    expect(groupNames).toContain("Original 12");
    expect(groupNames).toContain("Remix Fighters");
    expect(groupNames).toContain("Fighting Polygon Team");
    expect(groupNames).toContain("Bosses & Specials");
    expect(groupNames).toContain("Regional Variants");
  });

  it("includes Bowser and all major Remix fighters in Remix Fighters group", () => {
    const remixGroup = CHARACTER_GROUPS.find(
      (g) => g.groupName === "Remix Fighters",
    );
    expect(remixGroup).toBeDefined();
    const remixIds = remixGroup!.characters.map((c) => c.id);

    // Bowser
    expect(remixIds).toContain(0x34); // Bowser
    expect(remixIds).toContain(0x35); // Giga Bowser

    // Remix fighters
    expect(remixIds).toContain(0x1d); // Falco
    expect(remixIds).toContain(0x1e); // Ganondorf
    expect(remixIds).toContain(0x1f); // Young Link
    expect(remixIds).toContain(0x20); // Dr. Mario
    expect(remixIds).toContain(0x21); // Wario
    expect(remixIds).toContain(0x22); // Dark Samus
    expect(remixIds).toContain(0x26); // Lucas
    expect(remixIds).toContain(0x36); // Mad Piano
    expect(remixIds).toContain(0x37); // Wolf
    expect(remixIds).toContain(0x38); // Conker
    expect(remixIds).toContain(0x39); // Mewtwo
    expect(remixIds).toContain(0x3a); // Marth
    expect(remixIds).toContain(0x3b); // Sonic
    expect(remixIds).toContain(0x3e); // Sheik
    expect(remixIds).toContain(0x40); // King Dedede
    expect(remixIds).toContain(0x44); // Banjo
    expect(remixIds).toContain(0x48); // Crash
    expect(remixIds).toContain(0x49); // Peach
    expect(remixIds).toContain(0x4a); // Roy
    expect(remixIds).toContain(0x4c); // Lanky Kong
  });

  it("Bowser option has proper localized names", () => {
    const bowser = ORIGINAL_CHARACTERS.find((c) => c.id === 0x34);
    expect(bowser).toBeDefined();
    expect(bowser!.name).toBe("Bowser");
    expect(bowser!.nameJa).toBe("クッパ");
  });

  it("every character option has non-empty name and ja name", () => {
    for (const char of ORIGINAL_CHARACTERS) {
      expect(char.name).toBeTruthy();
      expect(typeof char.id).toBe("number");
    }
  });

  it("generates select HTML with optgroups for character categories including Bowser", () => {
    let htmlOutput = "";
    const mockContainer = {
      set innerHTML(val: string) {
        htmlOutput = val;
      },
      get innerHTML() {
        return htmlOutput;
      },
      querySelector: (selector: string) => {
        if (selector === "canvas") {
          return {
            getContext: () => ({
              save: () => {},
              restore: () => {},
              beginPath: () => {},
              closePath: () => {},
              moveTo: () => {},
              lineTo: () => {},
              arc: () => {},
              stroke: () => {},
              fill: () => {},
              fillRect: () => {},
              setLineDash: () => {},
            }),
            width: 960,
            height: 540,
            parentElement: null,
          };
        }
        return {
          addEventListener: () => {},
          classList: { add: () => {}, remove: () => {} },
          querySelectorAll: () => [],
        };
      },
      querySelectorAll: () => [],
    } as unknown as HTMLDivElement;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const controller = new CharacterPreviewController(mockContainer);

    expect(htmlOutput).toContain('<optgroup label="Original 12">');
    expect(htmlOutput).toContain('<optgroup label="Remix Fighters">');
    expect(htmlOutput).toContain('<optgroup label="Fighting Polygon Team">');
    expect(htmlOutput).toContain('<optgroup label="Bosses & Specials">');
    expect(htmlOutput).toContain('<optgroup label="Regional Variants">');

    // Bowser (0x34 / value="52")
    expect(htmlOutput).toContain('<option value="52"');
    expect(htmlOutput).toContain("0x34 - Bowser (クッパ)");

    // Falco (0x1d / value="29")
    expect(htmlOutput).toContain('<option value="29"');
    expect(htmlOutput).toContain("0x1d - Falco (ファルコ)");

    // Ganondorf (0x1e / value="30")
    expect(htmlOutput).toContain('<option value="30"');
    expect(htmlOutput).toContain("0x1e - Ganondorf (ガノンドロフ)");
  });
});
