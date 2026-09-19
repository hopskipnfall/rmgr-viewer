import { t } from "../i18n.js";
import { characterName } from "../lookups.js";
import { CustomDropdown } from "../ui/customDropdown.js";
import { characterIconUrl } from "../characterIcons.js";
import type { GameSummary } from "../data/gameSummary.js";
import {
  type Identity,
  loadIdentity,
  resolvePerspectivePort,
  resolveOpponentPort,
} from "../data/identity.js";
import {
  type FilterCriteria,
  hasActiveFilters,
  filterGameSummaries,
  aggregateFilteredGames,
} from "../data/aggregate.js";
import { isDesktopWidth, watchDesktopWidth } from "../responsive.js";
import { MatchupChipSelector } from "./matchupChipSelector.js";
import { MatchupStatsView } from "./matchupStatsView.js";
import { GameList } from "./gameList.js";
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

/** Callbacks the library view uses to persist user choices (identity, perspective overrides, removals). */
export interface LibraryPersistenceHooks {
  identity(identity: Identity): void;
  perspective(gameId: string, port: 0 | 1 | 2 | 3 | null): void;
  remove(gameId: string): void;
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

  private matchupChipSelector: MatchupChipSelector;
  private matchupStatsView: MatchupStatsView;
  private selectedMyChar: number | null = null;
  private selectedOppChar: number | null = null;
  private gameList: GameList;

  private onSelectGameCallback: (summary: GameSummary) => void;
  private onShowFailedEdgeGuardsCallback: (session: SessionGroup) => void;
  private onSelectMatchupCallback: (myChar: number, oppChar: number) => void;

  /** Effort filter (§3.4): when false, the Neutral Score panel excludes "below"/"unknown" tier opponents. */
  private includeExperimentation = false;

  /** Where user choices get persisted (see main.ts). Unset = nothing is saved. */
  private persistence: LibraryPersistenceHooks | null = null;

  public setPersistenceHooks(hooks: LibraryPersistenceHooks): void {
    this.persistence = hooks;
  }

  /** Demo mode's "George" identity is a stand-in and must never overwrite the user's saved one. */
  private persistIdentity(): void {
    if (!this.isDemoMode) this.persistence?.identity(this.identity);
  }

  constructor(
    container: HTMLElement,
    onSelectGame: (summary: GameSummary) => void,
    onShowFailedEdgeGuards: (session: SessionGroup) => void,
    onSelectMatchup: (myChar: number, oppChar: number) => void,
  ) {
    this.container = container;
    this.onSelectGameCallback = onSelectGame;
    this.onShowFailedEdgeGuardsCallback = onShowFailedEdgeGuards;
    this.onSelectMatchupCallback = onSelectMatchup;
    this.identity = loadIdentity();

    // Create sub-component mount points inside container
    this.container.innerHTML = `
      <div id="libraryMain" class="library-main">
        <div id="disclaimerBanner" class="disclaimer-banner"></div>
        <div id="libraryFilterBar" class="library-filter-bar"></div>
        <section id="matchupStatsSection" class="matchup-statistics-section">
          <div id="matchupSelectorWrap" class="matchup-selector-wrap"></div>
          <div id="matchupStatsWrap" class="matchup-stats-wrap"></div>
        </section>
        <div id="gameListWrap" class="game-list-wrap"></div>
      </div>
    `;

    const matchupSelectorWrap = this.container.querySelector(
      "#matchupSelectorWrap",
    ) as HTMLElement;
    const matchupStatsWrap = this.container.querySelector(
      "#matchupStatsWrap",
    ) as HTMLElement;
    const gameListWrap = this.container.querySelector(
      "#gameListWrap",
    ) as HTMLElement;

    this.matchupStatsView = new MatchupStatsView(matchupStatsWrap);
    this.matchupChipSelector = new MatchupChipSelector(
      matchupSelectorWrap,
      (myChar, oppChar) => {
        this.selectedMyChar = myChar;
        this.selectedOppChar = oppChar;
        this.renderMatchupStats();
      },
    );

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

    watchDesktopWidth(() => this.render());
  }

  private isDemoMode = false;

  public setDemoMode(isDemo: boolean): void {
    this.isDemoMode = isDemo;
  }

  public getIsDemoMode(): boolean {
    return this.isDemoMode;
  }

  public setIdentity(identity: Identity): void {
    this.identity = identity;
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
        // Back to the user's own saved identity (empty if they never set one).
        this.identity = loadIdentity();
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
    this.persistence?.remove(id);
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
        if (
          s.manualPerspectivePort != null &&
          s.ports.some((p) => p.playerName.trim() === selectedName)
        ) {
          delete s.manualPerspectivePort;
          this.persistence?.perspective(s.id, null);
        }
      }
      this.persistIdentity();
    } else {
      // Fallback for unnamed ports: toggle manual override
      if (summary.manualPerspectivePort === port) {
        delete summary.manualPerspectivePort;
      } else {
        summary.manualPerspectivePort = port;
      }
      this.persistence?.perspective(
        summary.id,
        summary.manualPerspectivePort ?? null,
      );
    }
    this.render();
  }

  public updateTranslations(): void {
    this.render();
  }

  public render(): void {
    const tr = t();
    // 0. Disclaimer banner
    const disclaimerBanner = this.container.querySelector(
      "#disclaimerBanner",
    ) as HTMLElement;
    if (disclaimerBanner) {
      disclaimerBanner.innerHTML = `
        <p>${tr.disclaimerNotice}</p>
        <p>${tr.disclaimerPrototype.replace(
          "{link}",
          `<a href="https://github.com/hopskipnfall/RMG-K/actions" target="_blank" rel="noopener noreferrer">https://github.com/hopskipnfall/RMG-K/actions</a>`,
        )}</p>
        <p>${tr.disclaimerFormat}</p>
      `;
    }

    // 2. Filter Bar
    const filterBarEl = this.container.querySelector(
      "#libraryFilterBar",
    ) as HTMLElement;
    const isFiltered = hasActiveFilters(this.filters);

    if (filterBarEl && isDesktopWidth()) {
      // Desktop has no filter bar - the sidebar replaces it, so stats and
      // matchup breakdown below just show unfiltered numbers (this.filters
      // stays at its default "all" state since we never wire up its
      // controls here).
      filterBarEl.hidden = true;
    } else if (filterBarEl) {
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

        if (
          myCharSelect &&
          typeof document !== "undefined" &&
          typeof myCharSelect.querySelectorAll === "function"
        ) {
          CustomDropdown.fromSelect(myCharSelect, {
            getIconUrl: (val) =>
              val === "all" ? undefined : characterIconUrl(Number(val)),
            searchable: myChars.length > 5,
            onChange: (val) => {
              this.filters.yourCharacterId =
                val === "all" ? "all" : Number(val);
              this.render();
            },
          });
        }

        const oppCharSelect = filterBarEl.querySelector(
          "#filterOppCharSelect",
        ) as HTMLSelectElement;
        oppCharSelect?.addEventListener("change", () => {
          this.filters.oppCharacterId =
            oppCharSelect.value === "all" ? "all" : Number(oppCharSelect.value);
          this.render();
        });

        if (
          oppCharSelect &&
          typeof document !== "undefined" &&
          typeof oppCharSelect.querySelectorAll === "function"
        ) {
          CustomDropdown.fromSelect(oppCharSelect, {
            getIconUrl: (val) =>
              val === "all" ? undefined : characterIconUrl(Number(val)),
            searchable: oppChars.length > 5,
            onChange: (val) => {
              this.filters.oppCharacterId = val === "all" ? "all" : Number(val);
              this.render();
            },
          });
        }

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
    // 3. Aggregation & Matchup Selection
    const allResolvedGames = filterGameSummaries(
      this.summaries,
      this.identity,
      {},
    );

    const pairs = allResolvedGames
      .map(({ summary, yourPort, oppPort }) => {
        const yourP = summary.ports.find((p) => p.port === yourPort);
        const oppP = summary.ports.find((p) => p.port === oppPort);
        return yourP && oppP
          ? { myChar: yourP.characterId, oppChar: oppP.characterId }
          : null;
      })
      .filter((p): p is { myChar: number; oppChar: number } => p !== null);

    const availableMyChars = Array.from(new Set(pairs.map((p) => p.myChar)));
    const getAvailableOppChars = (myChar: number) =>
      Array.from(
        new Set(pairs.filter((p) => p.myChar === myChar).map((p) => p.oppChar)),
      );

    const myCharFrequencies = new Map<number, number>();
    for (const p of pairs) {
      myCharFrequencies.set(
        p.myChar,
        (myCharFrequencies.get(p.myChar) ?? 0) + 1,
      );
    }

    const getOppCharFrequencies = (myChar: number) => {
      const oppFreq = new Map<number, number>();
      for (const p of pairs) {
        if (p.myChar === myChar) {
          oppFreq.set(p.oppChar, (oppFreq.get(p.oppChar) ?? 0) + 1);
        }
      }
      return oppFreq;
    };

    const matchupStatsSection = this.container.querySelector<HTMLElement>(
      "#matchupStatsSection",
    );
    if (matchupStatsSection) {
      matchupStatsSection.hidden = availableMyChars.length === 0;
    }

    this.matchupChipSelector.setData(
      availableMyChars,
      getAvailableOppChars,
      false,
      myCharFrequencies,
      getOppCharFrequencies,
    );
    this.renderMatchupStats();

    // 7. Game List - desktop drops this entirely (browsing games happens
    // through a session's own page now, opened from the sidebar); mobile
    // keeps it exactly as before this change.
    const gameListWrapEl =
      this.container.querySelector<HTMLElement>("#gameListWrap");
    if (isDesktopWidth()) {
      if (gameListWrapEl) gameListWrapEl.hidden = true;
    } else {
      if (gameListWrapEl) gameListWrapEl.hidden = false;
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

  private renderMatchupStats(): void {
    const statsWrap =
      this.container.querySelector<HTMLElement>("#matchupStatsWrap");
    if (!statsWrap) return;

    if (this.selectedMyChar === null || this.selectedOppChar === null) {
      statsWrap.innerHTML = "";
      return;
    }

    const matchupGames = filterGameSummaries(this.summaries, this.identity, {
      yourCharacterId: this.selectedMyChar,
      oppCharacterId: this.selectedOppChar,
    });
    const rates = aggregateFilteredGames(matchupGames);
    this.matchupStatsView.render(
      this.selectedMyChar,
      this.selectedOppChar,
      rates,
    );
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
