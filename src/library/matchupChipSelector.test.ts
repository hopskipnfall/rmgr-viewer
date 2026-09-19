import { describe, it, expect, vi } from "vitest";
import {
  groupAndSortCharacters,
  MatchupChipSelector,
} from "./matchupChipSelector.js";

describe("groupAndSortCharacters", () => {
  it("groups NA Original 12 characters under Vanilla Characters in canonical order", () => {
    // Mario (0), Pikachu (9), Fox (1), Ness (11)
    const sections = groupAndSortCharacters([9, 11, 0, 1]);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.name).toBe("Vanilla Characters");
    expect(sections[0]!.charIds).toEqual([0, 1, 9, 11]);
  });

  it("groups Japan characters under Japan Characters in canonical order", () => {
    // Fox JP (0x29 = 41), Pikachu JP (0x32 = 50)
    const sections = groupAndSortCharacters([50, 41]);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.name).toBe("Japan Characters");
    expect(sections[0]!.charIds).toEqual([41, 50]);
  });

  it("groups Remix characters under Remix Characters alphabetically", () => {
    // Falco (0x1d = 29), Wario (0x21 = 33), Bowser (0x34 = 52)
    const sections = groupAndSortCharacters([33, 52, 29]);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.name).toBe("Remix Characters");
    // Bowser, Falco, Wario alphabetically
    expect(sections[0]!.charIds).toEqual([52, 29, 33]);
  });

  it("sorts characters within each group by usage frequency descending", () => {
    // Mario (0) has 2 games, Fox (1) has 10 games, Pikachu (9) has 5 games
    const freq = new Map<number, number>([
      [0, 2],
      [1, 10],
      [9, 5],
    ]);
    const sections = groupAndSortCharacters([0, 1, 9], freq);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.charIds).toEqual([1, 9, 0]); // Fox (10), Pikachu (5), Mario (2)
  });

  it("omits empty groups", () => {
    const sections = groupAndSortCharacters([0, 1]);
    expect(sections.map((s) => s.name)).toEqual(["Vanilla Characters"]);
  });
});

interface MockButton {
  dataset: { stage: string; charId: string };
  listeners: Record<string, (() => void)[]>;
  addEventListener: (event: string, cb: () => void) => void;
  click: () => void;
}

function createMockContainer() {
  let innerHtml = "";
  const buttons: MockButton[] = [];

  const parseButtons = (html: string) => {
    buttons.length = 0;
    const btnRegex =
      /<button[^>]*data-stage="([^"]+)"[^>]*data-char-id="([^"]+)"[^>]*>/g;
    let match: RegExpExecArray | null;
    while ((match = btnRegex.exec(html)) !== null) {
      const stage = match[1] ?? "";
      const charId = match[2] ?? "";
      const listeners: Record<string, (() => void)[]> = {};
      const btn: MockButton = {
        dataset: { stage, charId },
        listeners,
        addEventListener(event, cb) {
          if (!listeners[event]) listeners[event] = [];
          listeners[event].push(cb);
        },
        click() {
          listeners["click"]?.forEach((cb) => cb());
        },
      };
      buttons.push(btn);
    }
  };

  return {
    get innerHTML() {
      return innerHtml;
    },
    set innerHTML(val: string) {
      innerHtml = val;
      parseButtons(val);
    },
    querySelectorAll(selector: string) {
      if (selector.includes("data-stage='my'")) {
        return buttons.filter((b) => b.dataset.stage === "my");
      }
      if (selector.includes("data-stage='opp'")) {
        return buttons.filter((b) => b.dataset.stage === "opp");
      }
      return buttons;
    },
    querySelector(selector: string) {
      if (selector.includes(".my-char-stage")) {
        return innerHtml.includes("my-char-stage") ? {} : null;
      }
      if (selector.includes(".opp-char-stage")) {
        return innerHtml.includes("opp-char-stage") ? {} : null;
      }
      if (
        selector.includes("data-stage='my'") &&
        selector.includes("data-char-id='9'")
      ) {
        return (
          buttons.find(
            (b) => b.dataset.stage === "my" && b.dataset.charId === "9",
          ) ?? null
        );
      }
      if (
        selector.includes("data-stage='opp'") &&
        selector.includes("data-char-id='1'")
      ) {
        return (
          buttons.find(
            (b) => b.dataset.stage === "opp" && b.dataset.charId === "1",
          ) ?? null
        );
      }
      return null;
    },
  } as unknown as HTMLElement;
}

describe("MatchupChipSelector", () => {
  it("renders 'My character' chips and reveals 'Opponent character' upon selection", () => {
    const container = createMockContainer();
    const onSelectionChange = vi.fn();
    const selector = new MatchupChipSelector(container, onSelectionChange);

    const availableMy = [9, 1]; // Pikachu, Fox
    const getOpp = (myChar: number) => (myChar === 9 ? [1] : [9]);

    selector.setData(availableMy, getOpp);

    // Initial state: My character stage shown, Opponent stage hidden
    expect(container.querySelector(".my-char-stage")).not.toBeNull();
    expect(container.querySelector(".opp-char-stage")).toBeNull();

    // Click Pikachu (0x09)
    const pikaBtn = container.querySelector(
      ".character-chip[data-stage='my'][data-char-id='9']",
    ) as unknown as MockButton;
    expect(pikaBtn).not.toBeNull();
    pikaBtn.click();

    // Since Pikachu only has 1 opponent (Fox = 1), it auto-selects Fox!
    expect(onSelectionChange).toHaveBeenCalledWith(9, 1);
    expect(container.querySelector(".opp-char-stage")).not.toBeNull();
  });

  it("allows selecting multiple opponents when available", () => {
    const container = createMockContainer();
    const onSelectionChange = vi.fn();
    const selector = new MatchupChipSelector(container, onSelectionChange);

    const availableMy = [9];
    const getOpp = () => [0, 1]; // Mario, Fox

    selector.setData(availableMy, getOpp);

    // Click Pikachu
    const pikaBtn = container.querySelector(
      ".character-chip[data-stage='my'][data-char-id='9']",
    ) as unknown as MockButton;
    pikaBtn.click();

    // Opponent stage should have 2 buttons
    const oppBtns = container.querySelectorAll(
      ".character-chip[data-stage='opp']",
    );
    expect(oppBtns).toHaveLength(2);

    // Click Fox (1)
    const foxBtn = container.querySelector(
      ".character-chip[data-stage='opp'][data-char-id='1']",
    ) as unknown as MockButton;
    foxBtn.click();
    expect(onSelectionChange).toHaveBeenLastCalledWith(9, 1);
  });

  it("displays usage count in parens on 'My character' chips and matchup count on 'Opponent character' chips", () => {
    const container = createMockContainer();
    const onSelectionChange = vi.fn();
    const selector = new MatchupChipSelector(container, onSelectionChange);

    const availableMy = [9, 1]; // Pikachu, Fox
    const myFreq = new Map<number, number>([
      [9, 34],
      [1, 12],
    ]);

    const getOpp = (myChar: number) => (myChar === 9 ? [0, 1] : [0]);
    const getOppFreq = (myChar: number) => {
      if (myChar === 9) {
        return new Map<number, number>([
          [0, 14], // Pikachu vs Mario: 14 games
          [1, 20], // Pikachu vs Fox: 20 games
        ]);
      }
      return new Map<number, number>([[0, 12]]);
    };

    selector.setData(availableMy, getOpp, false, myFreq, getOppFreq);

    // Verify "My character" chips show total character usage
    expect(container.innerHTML).toContain("Pikachu");
    expect(container.innerHTML).toContain(
      '<span class="character-chip-count">(34)</span>',
    );
    expect(container.innerHTML).toContain("Fox");
    expect(container.innerHTML).toContain(
      '<span class="character-chip-count">(12)</span>',
    );

    // Select Pikachu
    const pikaBtn = container.querySelector(
      ".character-chip[data-stage='my'][data-char-id='9']",
    ) as unknown as MockButton;
    pikaBtn.click();

    // Verify "Opponent character" chips show matchup count for Pikachu vs Opponent
    expect(container.innerHTML).toContain("Mario");
    expect(container.innerHTML).toContain(
      '<span class="character-chip-count">(14)</span>',
    );
    expect(container.innerHTML).toContain(
      '<span class="character-chip-count">(20)</span>',
    );
  });

  it("does not duplicate the Japanese flag on Japanese character chips", () => {
    const container = createMockContainer();
    const onSelectionChange = vi.fn();
    const selector = new MatchupChipSelector(container, onSelectionChange);

    // Pikachu JP (0x32 = 50)
    const availableMy = [50];
    const myFreq = new Map<number, number>([[50, 20]]);
    selector.setData(availableMy, () => [], false, myFreq);

    // The chip icon should NOT have char-icon-jp-badge
    expect(container.innerHTML).not.toContain("char-icon-jp-badge");
    // Pikachu 🇯🇵 should appear with (20)
    expect(container.innerHTML).toContain("Pikachu 🇯🇵");
    expect(container.innerHTML).toContain(
      '<span class="character-chip-count">(20)</span>',
    );
    // There is no separate badge span, only the clean name with single flag
    expect(container.innerHTML).not.toContain("char-icon-jp-badge");
  });
});
