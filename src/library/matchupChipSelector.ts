import { t } from "../i18n.js";
import {
  characterName,
  getCharacterGroup,
  JP_ORIGINAL_12_IDS,
  NA_ORIGINAL_12_IDS,
} from "../lookups.js";
import { characterIconHtml } from "../characterIcons.js";

export interface CharacterGroupSection {
  name: string;
  charIds: number[];
}

export function groupAndSortCharacters(
  charIds: number[],
  frequencies?: Map<number, number>,
): CharacterGroupSection[] {
  const tr = t();
  const naIds = charIds.filter((id) => getCharacterGroup(id) === "na");
  const jpIds = charIds.filter((id) => getCharacterGroup(id) === "jp");
  const remixIds = charIds.filter((id) => getCharacterGroup(id) === "remix");

  const compareWithFrequency = (
    a: number,
    b: number,
    tiebreaker: (a: number, b: number) => number,
  ) => {
    if (frequencies) {
      const freqA = frequencies.get(a) ?? 0;
      const freqB = frequencies.get(b) ?? 0;
      if (freqB !== freqA) return freqB - freqA;
    }
    return tiebreaker(a, b);
  };

  // Sort NA by frequency descending, then canonical order
  naIds.sort((a, b) =>
    compareWithFrequency(a, b, (x, y) => {
      const idxA = NA_ORIGINAL_12_IDS.indexOf(
        x as (typeof NA_ORIGINAL_12_IDS)[number],
      );
      const idxB = NA_ORIGINAL_12_IDS.indexOf(
        y as (typeof NA_ORIGINAL_12_IDS)[number],
      );
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return characterName(x).localeCompare(characterName(y));
    }),
  );

  // Sort JP by frequency descending, then canonical order
  jpIds.sort((a, b) =>
    compareWithFrequency(a, b, (x, y) => {
      const idxA = JP_ORIGINAL_12_IDS.indexOf(
        x as (typeof JP_ORIGINAL_12_IDS)[number],
      );
      const idxB = JP_ORIGINAL_12_IDS.indexOf(
        y as (typeof JP_ORIGINAL_12_IDS)[number],
      );
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return characterName(x).localeCompare(characterName(y));
    }),
  );

  // Sort Remix by frequency descending, then alphabetically by character name
  remixIds.sort((a, b) =>
    compareWithFrequency(a, b, (x, y) =>
      characterName(x).localeCompare(characterName(y)),
    ),
  );

  const sections: CharacterGroupSection[] = [];
  if (naIds.length > 0) {
    sections.push({ name: tr.matchupGroupVanilla, charIds: naIds });
  }
  if (jpIds.length > 0) {
    sections.push({ name: tr.matchupGroupJapan, charIds: jpIds });
  }
  if (remixIds.length > 0) {
    sections.push({ name: tr.matchupGroupRemix, charIds: remixIds });
  }

  return sections;
}

export class MatchupChipSelector {
  private container: HTMLElement;
  private onSelectionChange: (
    myChar: number | null,
    oppChar: number | null,
  ) => void;

  private availableMyChars: number[] = [];
  private getAvailableOppChars: (myChar: number) => number[] = () => [];
  private myCharFrequencies?: Map<number, number>;
  private getOppCharFrequencies?: (myChar: number) => Map<number, number>;

  private selectedMyChar: number | null = null;
  private selectedOppChar: number | null = null;

  constructor(
    container: HTMLElement,
    onSelectionChange: (myChar: number | null, oppChar: number | null) => void,
  ) {
    this.container = container;
    this.onSelectionChange = onSelectionChange;
  }

  public setData(
    availableMyChars: number[],
    getAvailableOppChars: (myChar: number) => number[],
    autoSelectSingle = false,
    myCharFrequencies?: Map<number, number>,
    getOppCharFrequencies?: (myChar: number) => Map<number, number>,
  ): void {
    this.availableMyChars = Array.from(new Set(availableMyChars));
    this.getAvailableOppChars = getAvailableOppChars;
    this.myCharFrequencies = myCharFrequencies;
    this.getOppCharFrequencies = getOppCharFrequencies;

    // Validate existing selection
    if (
      this.selectedMyChar !== null &&
      !this.availableMyChars.includes(this.selectedMyChar)
    ) {
      this.selectedMyChar = null;
      this.selectedOppChar = null;
    }

    // Auto-select if only 1 character is available and autoSelectSingle is requested
    if (
      autoSelectSingle &&
      this.selectedMyChar === null &&
      this.availableMyChars.length === 1
    ) {
      this.selectedMyChar = this.availableMyChars[0] ?? null;
    }

    if (this.selectedMyChar !== null) {
      const oppChars = this.getAvailableOppChars(this.selectedMyChar);
      if (
        this.selectedOppChar !== null &&
        !oppChars.includes(this.selectedOppChar)
      ) {
        this.selectedOppChar = null;
      }
      if (
        autoSelectSingle &&
        this.selectedOppChar === null &&
        oppChars.length === 1
      ) {
        this.selectedOppChar = oppChars[0] ?? null;
      }
    } else {
      this.selectedOppChar = null;
    }

    this.render();
  }

  public setSelected(myChar: number | null, oppChar: number | null): void {
    this.selectedMyChar = myChar;
    this.selectedOppChar = oppChar;
    this.render();
  }

  public getSelected(): { myChar: number | null; oppChar: number | null } {
    return { myChar: this.selectedMyChar, oppChar: this.selectedOppChar };
  }

  public render(): void {
    const tr = t();

    if (this.availableMyChars.length === 0) {
      this.container.innerHTML = "";
      return;
    }

    const myCharSections = groupAndSortCharacters(
      this.availableMyChars,
      this.myCharFrequencies,
    );
    const oppChars =
      this.selectedMyChar !== null
        ? this.getAvailableOppChars(this.selectedMyChar)
        : [];
    const oppFrequencies =
      this.selectedMyChar !== null && this.getOppCharFrequencies
        ? this.getOppCharFrequencies(this.selectedMyChar)
        : undefined;
    const oppCharSections =
      this.selectedMyChar !== null
        ? groupAndSortCharacters(oppChars, oppFrequencies)
        : [];

    const renderSections = (
      sections: CharacterGroupSection[],
      stageType: "my" | "opp",
      selectedId: number | null,
      freqMap?: Map<number, number>,
    ): string => {
      return sections
        .map(
          (section) => `
        <div class="character-group">
          <div class="character-group-title">${escapeHtml(section.name)}</div>
          <div class="character-chips">
            ${section.charIds
              .map((id) => {
                const isSelected = selectedId === id;
                const freq = freqMap ? (freqMap.get(id) ?? 0) : undefined;
                const titleText = `${characterName(id)}${freq !== undefined ? ` (${freq})` : ""}`;
                const countHtml =
                  freq !== undefined
                    ? ` <span class="character-chip-count">(${freq})</span>`
                    : "";
                return `
                  <button
                    type="button"
                    class="character-chip ${isSelected ? "selected" : ""}"
                    data-stage="${stageType}"
                    data-char-id="${id}"
                    aria-pressed="${isSelected ? "true" : "false"}"
                    title="${escapeHtml(titleText)}"
                  >
                    ${characterIconHtml(id, "character-chip-icon", { showBadge: false })}
                    <span class="character-chip-label">${escapeHtml(characterName(id))}${countHtml}</span>
                  </button>
                `;
              })
              .join("")}
          </div>
        </div>
      `,
        )
        .join("");
    };

    this.container.innerHTML = `
      <div class="matchup-chip-selector">
        <div class="selector-stage my-char-stage">
          <div class="stage-header">
            <h4 class="stage-title">${escapeHtml(tr.selectMyCharacter)}</h4>
          </div>
          <div class="character-groups">
            ${renderSections(myCharSections, "my", this.selectedMyChar, this.myCharFrequencies)}
          </div>
        </div>

        ${
          this.selectedMyChar !== null
            ? `
          <div class="selector-stage opp-char-stage">
            <div class="stage-header">
              <h4 class="stage-title">${escapeHtml(tr.selectOpponentCharacter)}</h4>
            </div>
            <div class="character-groups">
              ${
                oppCharSections.length > 0
                  ? renderSections(
                      oppCharSections,
                      "opp",
                      this.selectedOppChar,
                      oppFrequencies,
                    )
                  : `<p class="stage-empty text-dim">${escapeHtml(tr.noMatchupGames)}</p>`
              }
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;

    // Bind click events
    this.container
      .querySelectorAll<HTMLButtonElement>(".character-chip[data-stage='my']")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const charId = Number(btn.dataset.charId);
          if (this.selectedMyChar === charId) {
            this.selectedMyChar = null;
            this.selectedOppChar = null;
            this.render();
            this.onSelectionChange(null, null);
            return;
          }
          this.selectedMyChar = charId;
          const availableOpp = this.getAvailableOppChars(charId);
          if (
            this.selectedOppChar !== null &&
            !availableOpp.includes(this.selectedOppChar)
          ) {
            this.selectedOppChar = null;
          }
          // If only 1 opponent available, auto-select it
          if (this.selectedOppChar === null && availableOpp.length === 1) {
            this.selectedOppChar = availableOpp[0] ?? null;
          }
          this.render();
          this.onSelectionChange(this.selectedMyChar, this.selectedOppChar);
        });
      });

    this.container
      .querySelectorAll<HTMLButtonElement>(".character-chip[data-stage='opp']")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const charId = Number(btn.dataset.charId);
          if (this.selectedOppChar === charId) {
            this.selectedOppChar = null;
          } else {
            this.selectedOppChar = charId;
          }
          this.render();
          this.onSelectionChange(this.selectedMyChar, this.selectedOppChar);
        });
      });
  }
}

function escapeHtml(s: string): string {
  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
