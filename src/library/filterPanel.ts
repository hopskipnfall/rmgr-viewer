import { t } from "../i18n.js";
import { characterName, stageName } from "../lookups.js";
import type { GameSummary } from "../data/gameSummary.js";
import { type FilterCriteria, hasActiveFilters } from "../data/aggregate.js";
import {
  type Identity,
  resolvePerspectivePort,
  resolveOpponentPort,
} from "../data/identity.js";

export class FilterPanel {
  private container: HTMLElement;
  private criteria: FilterCriteria;
  private onFilterChanged: (criteria: FilterCriteria) => void;

  constructor(
    container: HTMLElement,
    criteria: FilterCriteria,
    onFilterChanged: (criteria: FilterCriteria) => void,
  ) {
    this.container = container;
    this.criteria = { ...criteria };
    this.onFilterChanged = onFilterChanged;
  }

  public getCriteria(): FilterCriteria {
    return { ...this.criteria };
  }

  public setCriteria(criteria: FilterCriteria): void {
    this.criteria = { ...criteria };
  }

  public render(summaries: GameSummary[], identity: Identity): void {
    const tr = t();

    // Extract available filter options from resolved matches
    const yourCharIds = new Set<number>();
    const oppCharIds = new Set<number>();
    const opponentNames = new Set<string>();
    const stageIds = new Set<number>();

    for (const summary of summaries) {
      if (summary.ports.length !== 2) continue;
      const yourPort = resolvePerspectivePort(summary, identity);
      if (yourPort === null) continue;
      const oppPort = resolveOpponentPort(summary, yourPort);
      if (oppPort === null) continue;

      const yourP = summary.ports.find((p) => p.port === yourPort);
      const oppP = summary.ports.find((p) => p.port === oppPort);
      if (yourP) yourCharIds.add(yourP.characterId);
      if (oppP) {
        oppCharIds.add(oppP.characterId);
        if (oppP.playerName.trim()) {
          opponentNames.add(oppP.playerName.trim());
        }
      }
      stageIds.add(summary.stageId);
    }

    const yourCharList = Array.from(yourCharIds).sort((a, b) =>
      characterName(a).localeCompare(characterName(b)),
    );
    const oppCharList = Array.from(oppCharIds).sort((a, b) =>
      characterName(a).localeCompare(characterName(b)),
    );
    const oppNamesList = Array.from(opponentNames).sort((a, b) =>
      a.localeCompare(b),
    );
    const stageList = Array.from(stageIds).sort((a, b) =>
      stageName(a).localeCompare(stageName(b)),
    );

    const isResetDisabled = !hasActiveFilters(this.criteria);

    this.container.innerHTML = `
      <div class="filter-section-header">
        <span class="section-title">${escapeHtml(tr.filters)}</span>
      </div>

      <div class="filter-group">
        <label for="filterYourChar">${escapeHtml(tr.yourCharacter)}</label>
        <select id="filterYourChar">
          <option value="all">${escapeHtml(tr.all)}</option>
          ${yourCharList
            .map(
              (id) => `
            <option value="${id}" ${this.criteria.yourCharacterId === id ? "selected" : ""}>
              ${escapeHtml(characterName(id))}
            </option>
          `,
            )
            .join("")}
        </select>
      </div>

      <div class="filter-group">
        <label for="filterOppChar">${escapeHtml(tr.oppCharacter)}</label>
        <select id="filterOppChar">
          <option value="all">${escapeHtml(tr.all)}</option>
          ${oppCharList
            .map(
              (id) => `
            <option value="${id}" ${this.criteria.oppCharacterId === id ? "selected" : ""}>
              ${escapeHtml(characterName(id))}
            </option>
          `,
            )
            .join("")}
        </select>
      </div>

      <div class="filter-group">
        <label for="filterOpponent">${escapeHtml(tr.opponent)}</label>
        <select id="filterOpponent">
          <option value="all">${escapeHtml(tr.all)}</option>
          ${oppNamesList
            .map(
              (name) => `
            <option value="${escapeHtml(name)}" ${this.criteria.opponentName === name ? "selected" : ""}>
              ${escapeHtml(name)}
            </option>
          `,
            )
            .join("")}
        </select>
      </div>

      <div class="filter-group">
        <label for="filterStage">${escapeHtml(tr.stage)}</label>
        <select id="filterStage">
          <option value="all">${escapeHtml(tr.all)}</option>
          ${stageList
            .map(
              (id) => `
            <option value="${id}" ${this.criteria.stageId === id ? "selected" : ""}>
              ${escapeHtml(stageName(id))}
            </option>
          `,
            )
            .join("")}
        </select>
      </div>

      <div class="filter-actions">
        <button id="resetFiltersBtn" class="btn-secondary" ${isResetDisabled ? "disabled" : ""}>
          ${escapeHtml(tr.resetFilters)}
        </button>
      </div>
    `;

    const yourCharSelect = this.container.querySelector(
      "#filterYourChar",
    ) as HTMLSelectElement;
    const oppCharSelect = this.container.querySelector(
      "#filterOppChar",
    ) as HTMLSelectElement;
    const oppNameSelect = this.container.querySelector(
      "#filterOpponent",
    ) as HTMLSelectElement;
    const stageSelect = this.container.querySelector(
      "#filterStage",
    ) as HTMLSelectElement;
    const resetBtn = this.container.querySelector(
      "#resetFiltersBtn",
    ) as HTMLButtonElement;

    yourCharSelect?.addEventListener("change", () => {
      this.criteria.yourCharacterId =
        yourCharSelect.value === "all" ? "all" : Number(yourCharSelect.value);
      this.onFilterChanged(this.criteria);
    });

    oppCharSelect?.addEventListener("change", () => {
      this.criteria.oppCharacterId =
        oppCharSelect.value === "all" ? "all" : Number(oppCharSelect.value);
      this.onFilterChanged(this.criteria);
    });

    oppNameSelect?.addEventListener("change", () => {
      this.criteria.opponentName =
        oppNameSelect.value === "all" ? "all" : oppNameSelect.value;
      this.onFilterChanged(this.criteria);
    });

    stageSelect?.addEventListener("change", () => {
      this.criteria.stageId =
        stageSelect.value === "all" ? "all" : Number(stageSelect.value);
      this.onFilterChanged(this.criteria);
    });

    resetBtn?.addEventListener("click", () => {
      this.criteria = {
        yourCharacterId: "all",
        oppCharacterId: "all",
        opponentName: "all",
        stageId: "all",
      };
      this.onFilterChanged(this.criteria);
    });
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
