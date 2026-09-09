import { describe, it, expect } from "vitest";
import {
  CHARACTER_GROUPS,
  ORIGINAL_CHARACTERS,
  COMMON_STATES,
  ITEM_CATALOG,
  getCharacterSpecialStates,
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

  it("renders the character successfully through StageRenderer during render()", () => {
    let htmlOutput = "";
    const badgeTitle = { innerHTML: "" };
    const badgeSubtitle = { textContent: "" };
    const frameSlider = { value: "0", addEventListener: () => {} };
    const frameVal = { textContent: "", addEventListener: () => {} };

    const mockCtx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      rect: () => {},
      roundRect: () => {},
      arc: () => {},
      ellipse: () => {},
      stroke: () => {},
      fill: () => {},
      fillRect: () => {},
      clearRect: () => {},
      setLineDash: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      measureText: (s: string) => ({ width: s.length * 7 }),
      fillText: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
    };

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
            getContext: () => mockCtx,
            width: 960,
            height: 540,
            parentElement: { clientWidth: 960, clientHeight: 540 },
          };
        }
        if (selector === "#previewBadgeTitle") return badgeTitle;
        if (selector === "#previewBadgeSubtitle") return badgeSubtitle;
        if (selector === "#previewFrameSlider") return frameSlider;
        if (selector === "#previewFrameVal") return frameVal;
        return {
          addEventListener: () => {},
          classList: { add: () => {}, remove: () => {} },
          querySelectorAll: () => [],
          value: "",
          textContent: "",
        };
      },
      querySelectorAll: () => [],
    } as unknown as HTMLDivElement;

    const controller = new CharacterPreviewController(mockContainer);

    // Spy on drawPlayer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = (controller as any).renderer;
    let drawPlayerCalledWithCharId: number | null = null;
    const origDrawPlayer = renderer.drawPlayer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderer.drawPlayer = function (...args: any[]) {
      drawPlayerCalledWithCharId = args[2]?.characterId;
      return origDrawPlayer.apply(this, args);
    };

    controller.render();

    expect(drawPlayerCalledWithCharId).toBe(
      (controller as unknown as { characterId: number }).characterId,
    );
    expect(badgeTitle.innerHTML).toContain("Captain Falcon");
  });

  function createMockContext() {
    return {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      quadraticCurveTo: () => {},
      bezierCurveTo: () => {},
      rect: () => {},
      roundRect: () => {},
      arc: () => {},
      ellipse: () => {},
      stroke: () => {},
      fill: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      clearRect: () => {},
      setLineDash: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      measureText: (s: string) => ({ width: s.length * 7 }),
      fillText: () => {},
      strokeText: () => {},
      clip: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
    };
  }

  it("identifies and categorizes custom visualized states", () => {
    // Check common states with custom animations
    const shield = COMMON_STATES.find((s) => s.id === 0x099);
    expect(shield?.visualized).toBe(true);
    expect(shield?.visualizedDesc).toContain("Shield");

    const dizzy = COMMON_STATES.find((s) => s.id === 0x0a3);
    expect(dizzy?.visualized).toBe(true);
    expect(dizzy?.visualizedDesc).toContain("Dizzy Stars");

    const sleep = COMMON_STATES.find((s) => s.id === 0x044);
    expect(sleep?.visualized).toBe(true);
    expect(sleep?.visualizedDesc).toContain("Sleep");

    const roll = COMMON_STATES.find((s) => s.id === 0x09c);
    expect(roll?.visualized).toBe(true);

    const turn = COMMON_STATES.find((s) => s.id === 0x012);
    expect(turn?.visualized).toBe(true);

    // Check Fox specials
    const foxSpecials = getCharacterSpecialStates(0x01);
    const shine = foxSpecials.find((s) => s.id === 0x0ee);
    expect(shine?.visualized).toBe(true);
    expect(shine?.name).toContain("Reflector");
    expect(shine?.visualizedDesc).toContain("Forcefield");

    const fireFox = foxSpecials.find((s) => s.id === 0x0e8);
    expect(fireFox?.visualized).toBe(true);

    // Check Captain Falcon specials
    const falconSpecials = getCharacterSpecialStates(0x07);
    const punch = falconSpecials.find((s) => s.id === 0x0e6);
    expect(punch?.visualized).toBe(true);
    expect(punch?.name).toContain("Falcon Punch");
    expect(punch?.visualizedDesc).toContain("Flame Punch");
  });

  it("supports all 5 theme palettes and side-by-side comparison rendering", () => {
    const mockContainer = {
      innerHTML: "",
      querySelector: (selector: string) => {
        if (selector === "canvas") {
          return {
            getContext: () => createMockContext(),
            width: 960,
            height: 540,
            parentElement: { clientWidth: 960, clientHeight: 540 },
          };
        }
        return {
          addEventListener: () => {},
          classList: { add: () => {}, remove: () => {} },
          querySelectorAll: () => [],
          value: "",
          textContent: "",
        };
      },
      querySelectorAll: () => [],
    } as unknown as HTMLDivElement;

    const controller = new CharacterPreviewController(mockContainer);

    // Test themes
    controller.currentTheme = "mountain";
    controller.render();
    expect(controller.currentTheme).toBe("mountain");

    controller.currentTheme = "autumn";
    controller.render();
    expect(controller.currentTheme).toBe("autumn");

    controller.currentTheme = "beach";
    controller.render();
    expect(controller.currentTheme).toBe("beach");

    controller.currentTheme = "opponent";
    controller.render();
    expect(controller.currentTheme).toBe("opponent");

    // Compare all themes mode
    controller.compareAllThemes = true;
    controller.render();
    expect(controller.compareAllThemes).toBe(true);
  });

  it("supports Items & Weapons mode in both single focus and all-items grid views", () => {
    // Catalog integrity
    expect(ITEM_CATALOG.length).toBeGreaterThanOrEqual(30);

    const weapons = ITEM_CATALOG.filter((i) => i.category === "weapon");
    const items = ITEM_CATALOG.filter((i) => i.category === "item");
    expect(weapons.length).toBeGreaterThan(10);
    expect(items.length).toBeGreaterThan(15);

    // Key items and weapons present
    const boomerang = ITEM_CATALOG.find((i) => i.name === "Boomerang");
    expect(boomerang).toBeDefined();
    expect(boomerang?.customShape).toBe(true);

    const bomb = ITEM_CATALOG.find((i) => i.name === "Bomb");
    expect(bomb).toBeDefined();
    expect(bomb?.customShape).toBe(true);

    const fireball = ITEM_CATALOG.find((i) => i.name === "Fireball");
    expect(fireball).toBeDefined();

    const star = ITEM_CATALOG.find((i) => i.name === "Super Star");
    expect(star).toBeDefined();

    const mockContainer = {
      innerHTML: "",
      querySelector: (selector: string) => {
        if (selector === "canvas") {
          return {
            getContext: () => createMockContext(),
            width: 960,
            height: 540,
            parentElement: { clientWidth: 960, clientHeight: 540 },
          };
        }
        return {
          addEventListener: () => {},
          classList: { add: () => {}, remove: () => {} },
          querySelectorAll: () => [],
          value: "",
          textContent: "",
        };
      },
      querySelectorAll: () => [],
    } as unknown as HTMLDivElement;

    const controller = new CharacterPreviewController(mockContainer);

    // Switch to items mode
    controller.activeMode = "items";
    controller.itemViewMode = "single";
    controller.selectedItemIndex = 0;
    controller.render();

    // Toggle Luigi fireball
    controller.isLuigiFireball = true;
    controller.render();
    expect(controller.isLuigiFireball).toBe(true);

    // Switch to grid view
    controller.itemViewMode = "grid";
    controller.render();
    expect(controller.itemViewMode).toBe("grid");
  });
});
