import { t } from "../i18n.js";
import { characterName } from "../lookups.js";
import type { GameSummary } from "../data/gameSummary.js";
import {
  type Identity,
  loadIdentity,
  createDefaultIdentity,
  resolvePerspectivePort,
  resolveOpponentPort,
} from "../data/identity.js";
import {
  type FilterCriteria,
  hasActiveFilters,
  filterGameSummaries,
  aggregateFilteredGames,
  computeRateDeltas,
  computeOpponentCharacterBreakdown,
  computeCharacterBaselines,
  computeBaselineDeltas,
} from "../data/aggregate.js";
import { computeOpponentStrength } from "../data/opponentStrength.js";
import { detectMainCharacter } from "../data/mainCharacter.js";
import { IdentityPanel } from "./identityPanel.js";
import { StatCards } from "./statCards.js";
import { BreakdownTable } from "./breakdownTable.js";
import { GameList } from "./gameList.js";
import { NeutralScorePanel } from "./neutralScorePanel.js";
import type { SessionGroup } from "../data/session.js";

function matchesFilters(
  summary: GameSummary,
  identity: Identity,
  filters: FilterCriteria,
): boolean {
  if (!hasActiveFilters(filters)) return true;

  const yourPort = resolvePerspectivePort(summary, identity);
  if (yourPort !== null) {
    const oppPort = resolveOpponentPort(summary, yourPort);
    const yourP = summary.ports.find((p) => p.port === yourPort);
    const oppP =
      oppPort !== null ? summary.ports.find((p) => p.port === oppPort) : null;

    if (
      filters.yourCharacterId !== undefined &&
      filters.yourCharacterId !== "all"
    ) {
      if (!yourP || yourP.characterId !== filters.yourCharacterId) return false;
    }
    if (
      filters.oppCharacterId !== undefined &&
      filters.oppCharacterId !== "all"
    ) {
      if (!oppP || oppP.characterId !== filters.oppCharacterId) return false;
    }
    if (filters.opponentName !== undefined && filters.opponentName !== "all") {
      if (!oppP || oppP.playerName.trim() !== filters.opponentName.trim())
        return false;
    }
    return true;
  }

  // Ambiguous games: match if any port satisfies the criteria
  if (filters.opponentName !== undefined && filters.opponentName !== "all") {
    if (
      !summary.ports.some(
        (p) => p.playerName.trim() === filters.opponentName!.trim(),
      )
    )
      return false;
  }
  if (
    filters.yourCharacterId !== undefined &&
    filters.yourCharacterId !== "all"
  ) {
    if (!summary.ports.some((p) => p.characterId === filters.yourCharacterId))
      return false;
  }
  if (
    filters.oppCharacterId !== undefined &&
    filters.oppCharacterId !== "all"
  ) {
    if (!summary.ports.some((p) => p.characterId === filters.oppCharacterId))
      return false;
  }
  return true;
}

export class LibraryViewController {
  private container: HTMLElement;
  private summaries: GameSummary[] = [];
  private identity: Identity;
  private sortOrder: "newest" | "oldest" = "newest";
  private filters: FilterCriteria = {
    opponentName: "all",
    yourCharacterId: "all",
    oppCharacterId: "all",
  };

  private identityPanel: IdentityPanel;
  private statCards: StatCards;
  private breakdownTable: BreakdownTable;
  private gameList: GameList;
  private neutralScorePanel: NeutralScorePanel;

  private mobileSidebarExpanded = false;
  private onSelectGameCallback: (summary: GameSummary) => void;
  private onShowFailedEdgeGuardsCallback: (session: SessionGroup) => void;

  /** Effort filter (§3.4): when false, the Neutral Score panel excludes "below"/"unknown" tier opponents. */
  private includeExperimentation = false;

  constructor(
    container: HTMLElement,
    modalContainer: HTMLElement,
    onSelectGame: (summary: GameSummary) => void,
    onShowFailedEdgeGuards: (session: SessionGroup) => void,
  ) {
    this.container = container;
    this.onSelectGameCallback = onSelectGame;
    this.onShowFailedEdgeGuardsCallback = onShowFailedEdgeGuards;
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
        <div id="libraryFilterBar" class="library-filter-bar"></div>
        <div id="overallHeader" class="overall-header"></div>
        <div id="neutralScoreWrap" class="neutral-score-wrap"></div>
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
    const neutralScoreWrap = this.container.querySelector(
      "#neutralScoreWrap",
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
    this.neutralScorePanel = new NeutralScorePanel(neutralScoreWrap);

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
      (session) => {
        this.onShowFailedEdgeGuardsCallback(session);
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

    // 2. Filter Bar
    const filterBarEl = this.container.querySelector(
      "#libraryFilterBar",
    ) as HTMLElement;
    const isFiltered = hasActiveFilters(this.filters);

    if (filterBarEl) {
      const opponentNamesSet = new Set<string>();
      const myCharsSet = new Set<number>();
      const oppCharsSet = new Set<number>();

      for (const summary of this.summaries) {
        const yourPort = resolvePerspectivePort(summary, this.identity);
        if (yourPort !== null) {
          const oppPort = resolveOpponentPort(summary, yourPort);
          const yourP = summary.ports.find((p) => p.port === yourPort);
          const oppP =
            oppPort !== null
              ? summary.ports.find((p) => p.port === oppPort)
              : null;
          if (yourP) myCharsSet.add(yourP.characterId);
          if (oppP) {
            oppCharsSet.add(oppP.characterId);
            if (oppP.playerName.trim())
              opponentNamesSet.add(oppP.playerName.trim());
          }
        } else {
          for (const p of summary.ports) {
            if (
              p.playerName.trim() &&
              !this.identity.aliases.has(p.playerName.trim())
            ) {
              opponentNamesSet.add(p.playerName.trim());
            }
            oppCharsSet.add(p.characterId);
          }
        }
      }

      const opponentNames = Array.from(opponentNamesSet).sort((a, b) =>
        a.localeCompare(b),
      );
      const myChars = Array.from(myCharsSet).sort((a, b) =>
        (characterName(a) || "").localeCompare(characterName(b) || ""),
      );
      const oppChars = Array.from(oppCharsSet).sort((a, b) =>
        (characterName(a) || "").localeCompare(characterName(b) || ""),
      );

      if (this.summaries.length === 0) {
        filterBarEl.hidden = true;
      } else {
        filterBarEl.hidden = false;
        filterBarEl.innerHTML = `
          <div class="library-filter-item">
            <label for="filterOpponentSelect">${escapeHtml(tr.filterOpponentLabel)}</label>
            <select id="filterOpponentSelect">
              <option value="all" ${this.filters.opponentName === "all" ? "selected" : ""}>
                ${escapeHtml(tr.filterAllOpponents)}
              </option>
              ${opponentNames
                .map(
                  (name) => `
                <option value="${escapeHtml(name)}" ${this.filters.opponentName === name ? "selected" : ""}>
                  ${escapeHtml(name)}
                </option>
              `,
                )
                .join("")}
            </select>
          </div>

          <div class="library-filter-item">
            <label for="filterMyCharSelect">${escapeHtml(tr.filterMyCharLabel)}</label>
            <select id="filterMyCharSelect">
              <option value="all" ${this.filters.yourCharacterId === "all" ? "selected" : ""}>
                ${escapeHtml(tr.filterAllMyCharacters)}
              </option>
              ${myChars
                .map(
                  (charId) => `
                <option value="${charId}" ${this.filters.yourCharacterId === charId ? "selected" : ""}>
                  ${escapeHtml(characterName(charId))}
                </option>
              `,
                )
                .join("")}
            </select>
          </div>

          <div class="library-filter-item">
            <label for="filterOppCharSelect">${escapeHtml(tr.filterOppCharLabel)}</label>
            <select id="filterOppCharSelect">
              <option value="all" ${this.filters.oppCharacterId === "all" ? "selected" : ""}>
                ${escapeHtml(tr.filterAllOppCharacters)}
              </option>
              ${oppChars
                .map(
                  (charId) => `
                <option value="${charId}" ${this.filters.oppCharacterId === charId ? "selected" : ""}>
                  ${escapeHtml(characterName(charId))}
                </option>
              `,
                )
                .join("")}
            </select>
          </div>

          ${
            isFiltered
              ? `<button id="filterResetBtn" class="library-filter-reset-btn">${escapeHtml(tr.filterReset)}</button>`
              : ""
          }
        `;

        const oppSelect = filterBarEl.querySelector(
          "#filterOpponentSelect",
        ) as HTMLSelectElement;
        oppSelect?.addEventListener("change", () => {
          this.filters.opponentName =
            oppSelect.value === "all" ? "all" : oppSelect.value;
          this.render();
        });

        const myCharSelect = filterBarEl.querySelector(
          "#filterMyCharSelect",
        ) as HTMLSelectElement;
        myCharSelect?.addEventListener("change", () => {
          this.filters.yourCharacterId =
            myCharSelect.value === "all" ? "all" : Number(myCharSelect.value);
          this.render();
        });

        const oppCharSelect = filterBarEl.querySelector(
          "#filterOppCharSelect",
        ) as HTMLSelectElement;
        oppCharSelect?.addEventListener("change", () => {
          this.filters.oppCharacterId =
            oppCharSelect.value === "all" ? "all" : Number(oppCharSelect.value);
          this.render();
        });

        const resetBtn = filterBarEl.querySelector(
          "#filterResetBtn",
        ) as HTMLButtonElement;
        resetBtn?.addEventListener("click", () => {
          this.filters = {
            opponentName: "all",
            yourCharacterId: "all",
            oppCharacterId: "all",
          };
          this.render();
        });
      }
    }

    // 3. Aggregation for all resolved games & filtered resolved games
    const allResolvedGames = filterGameSummaries(
      this.summaries,
      this.identity,
      {},
    );
    const filteredResolvedGames = filterGameSummaries(
      this.summaries,
      this.identity,
      this.filters,
    );

    const baselineRates = aggregateFilteredGames(allResolvedGames);
    const filteredRates = aggregateFilteredGames(filteredResolvedGames);
    const deltas = computeRateDeltas(filteredRates, baselineRates);

    // 4. Overall Statistics (collapsed unless at least 2 games have a resolved identity)
    const hasSufficientGames = allResolvedGames.length >= 2;
    const overallHeaderEl = this.container.querySelector(
      "#overallHeader",
    ) as HTMLElement;
    const statCardsWrapEl = this.container.querySelector(
      "#statCardsWrap",
    ) as HTMLElement;
    const breakdownWrapEl = this.container.querySelector(
      "#breakdownWrap",
    ) as HTMLElement;
    const neutralScoreWrapEl = this.container.querySelector(
      "#neutralScoreWrap",
    ) as HTMLElement;

    if (!hasSufficientGames) {
      if (overallHeaderEl) overallHeaderEl.hidden = true;
      if (statCardsWrapEl) statCardsWrapEl.hidden = true;
      if (breakdownWrapEl) breakdownWrapEl.hidden = true;
      if (neutralScoreWrapEl) neutralScoreWrapEl.hidden = true;
    } else {
      if (overallHeaderEl) {
        overallHeaderEl.hidden = false;
        const headerText = isFiltered
          ? tr.overallFilteredHeader(
              filteredRates.totalGames,
              baselineRates.totalGames,
              filteredRates.dreamLandGames,
            )
          : tr.overallHeader(
              baselineRates.totalGames,
              baselineRates.dreamLandGames,
            );
        overallHeaderEl.innerHTML = `<h2>${escapeHtml(headerText)}</h2>`;
      }
      if (statCardsWrapEl) statCardsWrapEl.hidden = false;
      if (breakdownWrapEl) breakdownWrapEl.hidden = false;
      if (neutralScoreWrapEl) neutralScoreWrapEl.hidden = false;

      // 5. Stat Cards with comparative deltas when filtered
      this.statCards.render(filteredRates, deltas, isFiltered);

      // 6. Breakdown Table
      const breakdownRows = computeOpponentCharacterBreakdown(
        filteredResolvedGames,
      );
      this.breakdownTable.render(breakdownRows);

      // 6b. Neutral Score panel (§6) — the driving statistic, symmetric and
      // robust to the sandbagging problem. Defaults to Peer+Above opponents (§3.4).
      //
      // Character scoping for THIS PANEL ONLY: when the user hasn't picked a
      // "My Character" filter, fall back to the auto-detected main character
      // (§6.1) so the panel's own asymmetric deltas are meaningful. This must
      // never mutate `this.filters` or reuse `filteredResolvedGames` — doing
      // so previously hid every off-main-character game from the game list,
      // stat cards, and breakdown table (most visibly the "experimentation"
      // games against weaker opponents that are often played off-main).
      const neutralCharId: number | "all" =
        this.filters.yourCharacterId !== undefined &&
        this.filters.yourCharacterId !== "all"
          ? this.filters.yourCharacterId
          : (detectMainCharacter(this.summaries, this.identity) ?? "all");
      const neutralScopedGames = filterGameSummaries(
        this.summaries,
        this.identity,
        {
          ...this.filters,
          yourCharacterId: neutralCharId,
        },
      );

      const opponentStrengths = computeOpponentStrength(
        this.summaries,
        this.identity,
      );
      const neutralResolvedGames = this.includeExperimentation
        ? neutralScopedGames
        : neutralScopedGames.filter(({ summary, oppPort }) => {
            const oppP = summary.ports.find((p) => p.port === oppPort);
            const name = oppP?.playerName.trim();
            const tier = name ? opponentStrengths.get(name)?.tier : undefined;
            return tier === "peer" || tier === "above";
          });
      const excludedGamesCount =
        neutralScopedGames.length - neutralResolvedGames.length;
      const neutralRates = aggregateFilteredGames(neutralResolvedGames);
      const baselines = computeCharacterBaselines(
        this.summaries,
        this.identity,
      );
      const baselineDeltas = computeBaselineDeltas(
        neutralRates,
        baselines,
        neutralCharId,
        this.filters.oppCharacterId ?? "all",
      );
      this.neutralScorePanel.render(
        neutralRates,
        baselineDeltas,
        excludedGamesCount,
        this.includeExperimentation,
        (checked) => {
          this.includeExperimentation = checked;
          this.render();
        },
      );
    }

    // 7. Game List - displays filtered games with interactive player perspective choice
    const displayedSummaries = this.summaries.filter((s) =>
      matchesFilters(s, this.identity, this.filters),
    );
    this.gameList.setSortOrder(this.sortOrder);
    this.gameList.render(
      displayedSummaries,
      this.identity,
      displayedSummaries.length,
    );
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
