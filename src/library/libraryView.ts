import { t } from "../i18n.js";
import type { GameSummary } from "../data/gameSummary.js";
import { type Identity, loadIdentity } from "../data/identity.js";
import {
  type FilterCriteria,
  filterGameSummaries,
  aggregateFilteredGames,
  computeRateDeltas,
  computeOpponentCharacterBreakdown,
  hasActiveFilters,
} from "../data/aggregate.js";
import { IdentityPanel } from "./identityPanel.js";
import { FilterPanel } from "./filterPanel.js";
import { StatCards } from "./statCards.js";
import { BreakdownTable } from "./breakdownTable.js";
import { GameList } from "./gameList.js";

export class LibraryViewController {
  private container: HTMLElement;
  private summaries: GameSummary[] = [];
  private identity: Identity;
  private criteria: FilterCriteria = {
    yourCharacterId: "all",
    oppCharacterId: "all",
    opponentName: "all",
    stageId: "all",
  };
  private sortOrder: "newest" | "oldest" = "newest";

  private identityPanel: IdentityPanel;
  private filterPanel: FilterPanel;
  private statCards: StatCards;
  private breakdownTable: BreakdownTable;
  private gameList: GameList;

  private onSelectGameCallback: (summary: GameSummary) => void;

  constructor(
    container: HTMLElement,
    modalContainer: HTMLElement,
    onSelectGame: (summary: GameSummary) => void,
  ) {
    this.container = container;
    this.onSelectGameCallback = onSelectGame;
    this.identity = loadIdentity();

    // Create sub-component mount points inside container
    this.container.innerHTML = `
      <div id="librarySidebar" class="library-sidebar">
        <div id="identityCard" class="identity-card"></div>
        <div id="filterPanelWrap" class="filter-panel-wrap"></div>
      </div>
      <div id="libraryMain" class="library-main">
        <div id="overallHeader" class="overall-header"></div>
        <div id="statCardsWrap" class="stat-cards-wrap"></div>
        <div id="breakdownWrap" class="breakdown-wrap"></div>
        <div id="gameListWrap" class="game-list-wrap"></div>
      </div>
    `;

    const identityCard = this.container.querySelector(
      "#identityCard",
    ) as HTMLElement;
    const filterPanelWrap = this.container.querySelector(
      "#filterPanelWrap",
    ) as HTMLElement;
    const statCardsWrap = this.container.querySelector(
      "#statCardsWrap",
    ) as HTMLElement;
    const breakdownWrap = this.container.querySelector(
      "#breakdownWrap",
    ) as HTMLElement;
    const gameListWrap = this.container.querySelector(
      "#gameListWrap",
    ) as HTMLElement;

    this.identityPanel = new IdentityPanel(
      identityCard,
      modalContainer,
      this.identity,
      () => this.summaries,
      (newIdentity) => {
        this.identity = newIdentity;
        this.render();
      },
    );

    this.filterPanel = new FilterPanel(
      filterPanelWrap,
      this.criteria,
      (newCriteria) => {
        this.criteria = newCriteria;
        this.render();
      },
    );

    this.statCards = new StatCards(statCardsWrap);
    this.breakdownTable = new BreakdownTable(breakdownWrap);

    this.gameList = new GameList(
      gameListWrap,
      (newSort) => {
        this.sortOrder = newSort;
        this.render();
      },
      (selected) => {
        this.onSelectGameCallback(selected);
      },
      (summary, port) => {
        summary.manualPerspectivePort = port;
        this.render();
      },
      (idToRemove) => {
        this.removeSummary(idToRemove);
      },
    );
  }

  public setSummaries(summaries: GameSummary[]): void {
    this.summaries = summaries;
    this.render();
  }

  public addSummaries(newSummaries: GameSummary[]): void {
    // When adding user-imported replays, remove the default preloaded bundled file if present
    const hasUserImported = newSummaries.some((s) => !s.isBundledSample);
    if (hasUserImported) {
      this.summaries = this.summaries.filter((s) => !s.isBundledSample);
    }

    // Avoid duplicate IDs
    const existingIds = new Set(this.summaries.map((s) => s.id));
    for (const s of newSummaries) {
      if (!existingIds.has(s.id)) {
        this.summaries.push(s);
        existingIds.add(s.id);
      }
    }
    this.render();
  }

  public removeSummary(id: string): void {
    this.summaries = this.summaries.filter((s) => s.id !== id);
    this.render();
  }

  public getSummaries(): GameSummary[] {
    return this.summaries;
  }

  public getIdentity(): Identity {
    return this.identity;
  }

  public getSummaryById(id: string): GameSummary | undefined {
    return this.summaries.find((s) => s.id === id);
  }

  public openOnboardingModal(): void {
    this.identityPanel.openModal(this.summaries);
  }

  public updateTranslations(): void {
    this.identityPanel.render();
    this.render();
  }

  public render(): void {
    const tr = t();

    // 1. Identity panel
    this.identityPanel.setIdentity(this.identity);

    // 2. Filter panel
    this.filterPanel.render(this.summaries, this.identity);

    // 3. Baseline aggregation (unfiltered-you)
    const baselineFiltered = filterGameSummaries(
      this.summaries,
      this.identity,
      {},
    );
    const baselineRates = aggregateFilteredGames(baselineFiltered);

    // 4. Current filtered games
    const resolvedGames = filterGameSummaries(
      this.summaries,
      this.identity,
      this.criteria,
    );
    const filteredRates = aggregateFilteredGames(resolvedGames);

    // 5. Deltas
    const showDeltas = hasActiveFilters(this.criteria);
    const deltas = showDeltas
      ? computeRateDeltas(filteredRates, baselineRates)
      : null;

    // 6. Overall Header
    const overallHeaderEl = this.container.querySelector(
      "#overallHeader",
    ) as HTMLElement;
    if (overallHeaderEl) {
      overallHeaderEl.innerHTML = `
        <h2>${escapeHtml(tr.overallHeader(filteredRates.totalGames, filteredRates.dreamLandGames))}</h2>
      `;
    }

    // 7. Stat Cards
    this.statCards.render(filteredRates, deltas, showDeltas);

    // 8. Breakdown Table
    const breakdownRows = computeOpponentCharacterBreakdown(resolvedGames);
    this.breakdownTable.render(breakdownRows);

    // 9. Game List
    // Show games matching current filter criteria, or all games if no filters
    const matchingGameIds = new Set(resolvedGames.map((g) => g.summary.id));
    const filteredSummaries = hasActiveFilters(this.criteria)
      ? this.summaries.filter((s) => matchingGameIds.has(s.id))
      : this.summaries;

    this.gameList.setSortOrder(this.sortOrder);
    this.gameList.render(
      filteredSummaries,
      this.identity,
      filteredSummaries.length,
    );
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
