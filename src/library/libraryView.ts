import { t } from "../i18n.js";
import type { GameSummary } from "../data/gameSummary.js";
import {
  type Identity,
  loadIdentity,
  createDefaultIdentity,
} from "../data/identity.js";
import {
  filterGameSummaries,
  aggregateFilteredGames,
  computeOpponentCharacterBreakdown,
} from "../data/aggregate.js";
import { IdentityPanel } from "./identityPanel.js";
import { StatCards } from "./statCards.js";
import { BreakdownTable } from "./breakdownTable.js";
import { GameList } from "./gameList.js";

export class LibraryViewController {
  private container: HTMLElement;
  private summaries: GameSummary[] = [];
  private identity: Identity;
  private sortOrder: "newest" | "oldest" = "newest";

  private identityPanel: IdentityPanel;
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
            <span class="mobile-toggle-arrow">▾</span>
          </div>
        </button>
        <div id="librarySidebarContent" class="library-sidebar-content">
          <div id="identityCard" class="identity-card"></div>
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
        this.selectPlayerPerspective(summary, port);
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

  public selectPlayerPerspective(
    summary: GameSummary,
    port: 0 | 1 | 2 | 3,
  ): void {
    const selectedPort = summary.ports.find((p) => p.port === port);
    const otherPort = summary.ports.find((p) => p.port !== port);
    const selectedName = selectedPort?.playerName?.trim() ?? "";
    const otherName = otherPort?.playerName?.trim() ?? "";

    if (selectedName.length > 0) {
      // Check if clicking on an already active perspective to toggle/deselect
      if (this.identity.aliases.has(selectedName)) {
        this.identity.aliases.delete(selectedName);
        if (this.identity.displayName === selectedName) {
          this.identity.displayName =
            Array.from(this.identity.aliases)[0] || "";
        }
      } else {
        // Add selected name as an alias
        this.identity.aliases.add(selectedName);
        this.identity.displayName = selectedName;
        // If the opponent's name was in aliases, remove it to resolve ambiguity in this match
        if (otherName.length > 0 && this.identity.aliases.has(otherName)) {
          this.identity.aliases.delete(otherName);
        }
      }
      // Reset any manual overrides that match this name so exact alias match takes over
      for (const s of this.summaries) {
        if (s.ports.some((p) => p.playerName.trim() === selectedName)) {
          delete s.manualPerspectivePort;
        }
      }
      this.identityPanel.setIdentity(this.identity);
    } else {
      // Fallback for unnamed ports: toggle manual override
      if (summary.manualPerspectivePort === port) {
        delete summary.manualPerspectivePort;
      } else {
        summary.manualPerspectivePort = port;
      }
    }
    this.render();
  }

  public updateTranslations(): void {
    this.identityPanel.render();
    this.render();
  }

  public render(): void {
    const tr = t();

    // 1. Identity panel
    this.identityPanel.setIdentity(this.identity);

    // Update mobile sidebar toggle summary
    const mobileIdSummaryEl = this.container.querySelector(
      "#mobileIdentitySummary",
    ) as HTMLElement;
    if (mobileIdSummaryEl) {
      const aliases = Array.from(this.identity.aliases);
      if (aliases.length > 0) {
        mobileIdSummaryEl.textContent = aliases.join(", ");
        mobileIdSummaryEl.classList.remove("not-selected");
      } else {
        mobileIdSummaryEl.textContent = tr.noNamesSelected;
        mobileIdSummaryEl.classList.add("not-selected");
      }
    }

    // 2. Aggregation for all resolved games
    const resolvedGames = filterGameSummaries(
      this.summaries,
      this.identity,
      {},
    );
    const aggregateRates = aggregateFilteredGames(resolvedGames);

    // 3. Overall Statistics (collapsed unless at least 2 games have a resolved identity)
    const hasSufficientGames = resolvedGames.length >= 2;
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
          <h2>${escapeHtml(tr.overallHeader(aggregateRates.totalGames, aggregateRates.dreamLandGames))}</h2>
        `;
      }
      if (statCardsWrapEl) statCardsWrapEl.hidden = false;
      if (breakdownWrapEl) breakdownWrapEl.hidden = false;

      // 4. Stat Cards
      this.statCards.render(aggregateRates, null, false);

      // 5. Breakdown Table
      const breakdownRows = computeOpponentCharacterBreakdown(resolvedGames);
      this.breakdownTable.render(breakdownRows);
    }

    // 6. Game List - displays all games with interactive player perspective choice
    this.gameList.setSortOrder(this.sortOrder);
    this.gameList.render(this.summaries, this.identity, this.summaries.length);
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
