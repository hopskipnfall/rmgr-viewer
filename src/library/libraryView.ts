import { t } from "../i18n.js";
import type { GameSummary } from "../data/gameSummary.js";
import {
  type Identity,
  loadIdentity,
  createDefaultIdentity,
} from "../data/identity.js";
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

  private mobileSidebarExpanded = false;
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
        <button id="mobileSidebarToggle" class="mobile-sidebar-toggle" aria-expanded="false">
          <div class="mobile-toggle-left">
            <span class="mobile-toggle-icon">👤</span>
            <span id="mobileIdentitySummary" class="mobile-toggle-name"></span>
          </div>
          <div class="mobile-toggle-right">
            <span id="mobileFilterSummary" class="mobile-toggle-filters"></span>
            <span class="mobile-toggle-arrow">▾</span>
          </div>
        </button>
        <div id="librarySidebarContent" class="library-sidebar-content">
          <div id="identityCard" class="identity-card"></div>
          <div id="filterPanelWrap" class="filter-panel-wrap"></div>
        </div>
      </div>
      <div id="libraryMain" class="library-main">
        <div id="overallHeader" class="overall-header"></div>
        <div id="statCardsWrap" class="stat-cards-wrap"></div>
        <div id="breakdownWrap" class="breakdown-wrap"></div>
        <div id="gameListWrap" class="game-list-wrap"></div>
      </div>
    `;

    const mobileSidebarToggle = this.container.querySelector(
      "#mobileSidebarToggle",
    ) as HTMLButtonElement;
    const librarySidebarContent = this.container.querySelector(
      "#librarySidebarContent",
    ) as HTMLElement;

    mobileSidebarToggle?.addEventListener("click", () => {
      this.mobileSidebarExpanded = !this.mobileSidebarExpanded;
      mobileSidebarToggle.classList.toggle(
        "expanded",
        this.mobileSidebarExpanded,
      );
      mobileSidebarToggle.setAttribute(
        "aria-expanded",
        String(this.mobileSidebarExpanded),
      );
      librarySidebarContent?.classList.toggle(
        "expanded",
        this.mobileSidebarExpanded,
      );
    });

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

  private isDemoMode = false;

  public setDemoMode(isDemo: boolean): void {
    this.isDemoMode = isDemo;
  }

  public setIdentity(identity: Identity): void {
    this.identity = identity;
    this.identityPanel.setIdentity(this.identity);
    this.render();
  }

  public setSummaries(summaries: GameSummary[]): void {
    this.summaries = summaries;
    this.render();
  }

  public addSummaries(newSummaries: GameSummary[]): void {
    // When adding user-imported replays, remove the default preloaded demo files and clear demo identity
    const hasUserImported = newSummaries.some((s) => !s.isBundledSample);
    if (hasUserImported) {
      this.summaries = this.summaries.filter((s) => !s.isBundledSample);
      if (this.isDemoMode) {
        this.isDemoMode = false;
        this.identity = createDefaultIdentity("");
        this.identityPanel.setIdentity(this.identity);
      }
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

    // Update mobile sidebar toggle summary
    const mobileIdSummaryEl = this.container.querySelector(
      "#mobileIdentitySummary",
    ) as HTMLElement;
    const mobileFilterSummaryEl = this.container.querySelector(
      "#mobileFilterSummary",
    ) as HTMLElement;
    if (mobileIdSummaryEl && mobileFilterSummaryEl) {
      const aliases = Array.from(this.identity.aliases);
      if (aliases.length > 0) {
        mobileIdSummaryEl.textContent = aliases.join(", ");
        mobileIdSummaryEl.classList.remove("not-selected");
      } else {
        mobileIdSummaryEl.textContent = tr.noNamesSelected;
        mobileIdSummaryEl.classList.add("not-selected");
      }

      let activeFiltersCount = 0;
      if (this.criteria.yourCharacterId !== "all") activeFiltersCount++;
      if (this.criteria.oppCharacterId !== "all") activeFiltersCount++;
      if (this.criteria.opponentName !== "all") activeFiltersCount++;
      if (this.criteria.stageId !== "all") activeFiltersCount++;

      if (activeFiltersCount > 0) {
        mobileFilterSummaryEl.innerHTML = `${escapeHtml(tr.filters)} <span class="mobile-toggle-badge">${activeFiltersCount}</span>`;
      } else {
        mobileFilterSummaryEl.textContent = tr.filters;
      }
    }

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

    // 6. Overall Statistics (collapsed unless at least 2 games have a resolved identity)
    const hasSufficientGames = baselineFiltered.length >= 2;
    const overallHeaderEl = this.container.querySelector(
      "#overallHeader",
    ) as HTMLElement;
    const statCardsWrapEl = this.container.querySelector(
      "#statCardsWrap",
    ) as HTMLElement;
    const breakdownWrapEl = this.container.querySelector(
      "#breakdownWrap",
    ) as HTMLElement;

    if (!hasSufficientGames) {
      if (overallHeaderEl) overallHeaderEl.hidden = true;
      if (statCardsWrapEl) statCardsWrapEl.hidden = true;
      if (breakdownWrapEl) breakdownWrapEl.hidden = true;
    } else {
      if (overallHeaderEl) {
        overallHeaderEl.hidden = false;
        overallHeaderEl.innerHTML = `
          <h2>${escapeHtml(tr.overallHeader(filteredRates.totalGames, filteredRates.dreamLandGames))}</h2>
        `;
      }
      if (statCardsWrapEl) statCardsWrapEl.hidden = false;
      if (breakdownWrapEl) breakdownWrapEl.hidden = false;

      // 7. Stat Cards
      this.statCards.render(filteredRates, deltas, showDeltas);

      // 8. Breakdown Table
      const breakdownRows = computeOpponentCharacterBreakdown(resolvedGames);
      this.breakdownTable.render(breakdownRows);
    }

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
