import type { PortIndex } from "@rmg-k/rmgr";
import { t } from "../i18n.js";
import { characterName } from "../lookups.js";
import type { GameSummary } from "../data/gameSummary.js";
import type { Identity } from "../data/identity.js";
import { groupGamesIntoSessions, type SessionGroup } from "../data/session.js";
import { computeEdgeGuardClips, type PlaylistClip } from "../playlist.js";
import type { LoadedReplay } from "../replaySource.js";
import { navigateToSearch, type SearchRouteCriteria } from "../router.js";
import { openStartingAreaModal } from "./startingAreaModal.js";

const JUMP_COUNT_OPTIONS = [1, 2, 3, 4, 5];

function formatDate(date: Date): string {
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const mins = date.getMinutes().toString().padStart(2, "0");
  return `${month} ${day} ${hours}:${mins}`;
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/**
 * A cross-session clip search. Currently only supports one search type
 * ("edge guards"), with every filter tracked in SearchRouteCriteria (and
 * therefore the URL) - changing any of them navigates to a new #/search
 * URL rather than mutating local state, so a search is always exactly
 * what its URL says (shareable, and never "remembers" a filter from a
 * previous, unrelated query). Results are PlaylistClips; clicking one
 * hands the whole result list (plus the clicked index) to the match
 * view's playlist feature (matchView.ts's startPlaylist()) via the
 * constructor's `onPlayClips` callback.
 */
export class SearchViewController {
  private container: HTMLElement;
  private modalContainer: HTMLElement;
  private loadReplay: (summary: GameSummary) => Promise<LoadedReplay>;
  private onPlayClips: (clips: PlaylistClip[], startIndex: number) => void;

  private summaries: GameSummary[] = [];
  private identity: Identity | null = null;
  private criteria: SearchRouteCriteria = {
    result: null,
    sessionId: null,
    playerName: null,
    playerCharacterId: null,
    opponentCharacterId: null,
    jumpCount: null,
    startingAreaBox: null,
  };

  private results: PlaylistClip[] = [];
  private searching = false;
  /** Bumped on every new search so a slower, superseded search can tell it's stale and stop touching `this.results`. */
  private searchToken = 0;

  constructor(
    container: HTMLElement,
    modalContainer: HTMLElement,
    loadReplay: (summary: GameSummary) => Promise<LoadedReplay>,
    onPlayClips: (clips: PlaylistClip[], startIndex: number) => void,
  ) {
    this.container = container;
    this.modalContainer = modalContainer;
    this.loadReplay = loadReplay;
    this.onPlayClips = onPlayClips;
  }

  public setData(summaries: GameSummary[], identity: Identity): void {
    this.summaries = summaries;
    this.identity = identity;
  }

  public setCriteria(criteria: SearchRouteCriteria): void {
    this.criteria = criteria;
    this.render();
    void this.runSearch();
  }

  private getSessions(): SessionGroup[] {
    if (!this.identity) return [];
    return groupGamesIntoSessions(this.summaries, this.identity);
  }

  private getCandidateGames(): GameSummary[] {
    if (!this.criteria.sessionId) return this.summaries;
    const session = this.getSessions().find(
      (s) => s.id === this.criteria.sessionId,
    );
    return session ? [...session.games] : this.summaries;
  }

  private getPlayerNames(): string[] {
    const names = new Set<string>();
    for (const g of this.getCandidateGames()) {
      for (const p of g.ports) {
        if (p.playerName) names.add(p.playerName);
      }
    }
    return [...names].sort();
  }

  private getCharacterIds(): number[] {
    const ids = new Set<number>();
    for (const g of this.getCandidateGames()) {
      for (const p of g.ports) ids.add(p.characterId);
    }
    return [...ids].sort((a, b) => a - b);
  }

  private render(): void {
    const tr = t();
    const sessions = this.getSessions();
    const playerNames = this.getPlayerNames();
    const characterIds = this.getCharacterIds();

    const characterOptions = (selectedId: number | null) =>
      characterIds
        .map(
          (id) =>
            `<option value="${id}" ${selectedId === id ? "selected" : ""}>${escapeHtml(characterName(id))}</option>`,
        )
        .join("");

    this.container.innerHTML = `
      <div class="search-view">
        <h2 class="search-title">${escapeHtml(tr.searchTitle)}</h2>
        <div class="search-filters">
          <label class="search-filter">
            <span>${escapeHtml(tr.searchTypeLabel)}</span>
            <select id="searchTypeSelect" disabled>
              <option>${escapeHtml(tr.searchTypeEdgeGuards)}</option>
            </select>
          </label>
          <label class="search-filter">
            <span>${escapeHtml(tr.searchResultLabel)}</span>
            <select id="searchResultSelect">
              <option value="" ${!this.criteria.result ? "selected" : ""}>${escapeHtml(tr.searchResultAny)}</option>
              <option value="failure" ${this.criteria.result === "failure" ? "selected" : ""}>${escapeHtml(tr.searchResultFailure)}</option>
              <option value="success" ${this.criteria.result === "success" ? "selected" : ""}>${escapeHtml(tr.searchResultSuccess)}</option>
            </select>
          </label>
          <label class="search-filter">
            <span>${escapeHtml(tr.searchSessionLabel)}</span>
            <select id="searchSessionSelect">
              <option value="" ${!this.criteria.sessionId ? "selected" : ""}>${escapeHtml(tr.searchAnySession)}</option>
              ${sessions
                .map(
                  (s) =>
                    `<option value="${escapeHtml(s.id)}" ${this.criteria.sessionId === s.id ? "selected" : ""}>${escapeHtml(formatDate(s.startTime))} vs ${escapeHtml(s.opponentName || "?")}</option>`,
                )
                .join("")}
            </select>
          </label>
          <label class="search-filter">
            <span>${escapeHtml(tr.searchPlayerLabel)}</span>
            <select id="searchPlayerSelect">
              <option value="" ${!this.criteria.playerName ? "selected" : ""}>${escapeHtml(tr.searchAnyPlayer)}</option>
              ${playerNames
                .map(
                  (name) =>
                    `<option value="${escapeHtml(name)}" ${this.criteria.playerName === name ? "selected" : ""}>${escapeHtml(name)}</option>`,
                )
                .join("")}
            </select>
          </label>
          <label class="search-filter">
            <span>${escapeHtml(tr.searchPlayerCharacterLabel)}</span>
            <select id="searchPlayerCharacterSelect">
              <option value="" ${this.criteria.playerCharacterId === null ? "selected" : ""}>${escapeHtml(tr.searchAnyCharacter)}</option>
              ${characterOptions(this.criteria.playerCharacterId)}
            </select>
          </label>
          <label class="search-filter">
            <span>${escapeHtml(tr.searchOpponentCharacterLabel)}</span>
            <select id="searchOpponentCharacterSelect">
              <option value="" ${this.criteria.opponentCharacterId === null ? "selected" : ""}>${escapeHtml(tr.searchAnyCharacter)}</option>
              ${characterOptions(this.criteria.opponentCharacterId)}
            </select>
          </label>
          <label class="search-filter">
            <span>${escapeHtml(tr.searchJumpCountLabel)}</span>
            <select id="searchJumpCountSelect">
              <option value="" ${this.criteria.jumpCount === null ? "selected" : ""}>${escapeHtml(tr.searchAnyJumpCount)}</option>
              ${JUMP_COUNT_OPTIONS.map(
                (n) =>
                  `<option value="${n}" ${this.criteria.jumpCount === n ? "selected" : ""}>${n}</option>`,
              ).join("")}
            </select>
          </label>
          <label class="search-filter">
            <span>${escapeHtml(tr.searchStartingAreaLabel)}</span>
            <button type="button" id="searchStartingAreaBtn" class="btn-secondary">
              ${this.criteria.startingAreaBox ? escapeHtml(tr.startingAreaSet) : escapeHtml(tr.startingAreaFilterBtn)}
            </button>
          </label>
        </div>
        <div id="searchStatus" class="search-status"></div>
        <div id="searchResultsList" class="search-results-list"></div>
      </div>
    `;

    const resultSelect = this.container.querySelector(
      "#searchResultSelect",
    ) as HTMLSelectElement;
    const sessionSelect = this.container.querySelector(
      "#searchSessionSelect",
    ) as HTMLSelectElement;
    const playerSelect = this.container.querySelector(
      "#searchPlayerSelect",
    ) as HTMLSelectElement;
    const playerCharSelect = this.container.querySelector(
      "#searchPlayerCharacterSelect",
    ) as HTMLSelectElement;
    const opponentCharSelect = this.container.querySelector(
      "#searchOpponentCharacterSelect",
    ) as HTMLSelectElement;
    const jumpCountSelect = this.container.querySelector(
      "#searchJumpCountSelect",
    ) as HTMLSelectElement;

    // Every filter navigates to a new #/search URL rather than mutating
    // local state - the route change comes back through setCriteria()
    // (main.ts wires onRoute to that), which re-renders and re-searches.
    const onFilterChange = (): void => {
      const value = resultSelect.value;
      navigateToSearch({
        result: value === "success" || value === "failure" ? value : null,
        sessionId: sessionSelect.value || null,
        playerName: playerSelect.value || null,
        playerCharacterId: playerCharSelect.value
          ? Number(playerCharSelect.value)
          : null,
        opponentCharacterId: opponentCharSelect.value
          ? Number(opponentCharSelect.value)
          : null,
        jumpCount: jumpCountSelect.value ? Number(jumpCountSelect.value) : null,
        startingAreaBox: this.criteria.startingAreaBox,
      });
    };
    resultSelect.addEventListener("change", onFilterChange);
    sessionSelect.addEventListener("change", onFilterChange);
    playerSelect.addEventListener("change", onFilterChange);
    playerCharSelect.addEventListener("change", onFilterChange);
    opponentCharSelect.addEventListener("change", onFilterChange);
    jumpCountSelect.addEventListener("change", onFilterChange);

    const startingAreaBtn = this.container.querySelector(
      "#searchStartingAreaBtn",
    ) as HTMLButtonElement;
    startingAreaBtn.addEventListener("click", () => {
      void openStartingAreaModal(
        this.modalContainer,
        this.criteria.startingAreaBox,
      ).then((box) => {
        navigateToSearch({ ...this.criteria, startingAreaBox: box });
      });
    });

    this.renderResultsList();
  }

  private renderResultsList(): void {
    const tr = t();
    const listEl = this.container.querySelector(
      "#searchResultsList",
    ) as HTMLElement | null;
    const statusEl = this.container.querySelector(
      "#searchStatus",
    ) as HTMLElement | null;
    if (!listEl || !statusEl) return;

    if (this.searching) {
      statusEl.textContent = tr.searchInProgress;
      listEl.innerHTML = "";
      return;
    }
    statusEl.textContent =
      this.results.length > 0
        ? tr.searchResultsCount(this.results.length)
        : tr.searchNoResults;

    listEl.innerHTML = this.results
      .map((clip, i) => {
        const summary = this.summaries.find((s) => s.id === clip.gameId);
        const dateStr = summary ? formatDate(summary.recordedAt) : "";
        return `
          <div class="search-result-row" data-index="${i}">
            <span class="search-result-label">${escapeHtml(clip.label)}</span>
            <span class="search-result-date">${escapeHtml(dateStr)}</span>
          </div>
        `;
      })
      .join("");

    listEl
      .querySelectorAll<HTMLElement>(".search-result-row")
      .forEach((row) => {
        row.addEventListener("click", () => {
          const idx = Number(row.dataset.index);
          this.onPlayClips(this.results, idx);
        });
      });
  }

  private async runSearch(): Promise<void> {
    const token = ++this.searchToken;
    this.searching = true;
    this.renderResultsList();

    const games = this.getCandidateGames();
    const results: PlaylistClip[] = [];
    for (const summary of games) {
      let port: PortIndex | null = null;
      if (this.criteria.playerName) {
        const found = summary.ports.find(
          (p) => p.playerName === this.criteria.playerName,
        );
        if (!found) continue; // this game doesn't feature that player at all
        port = found.port;
      }
      try {
        const loaded = await this.loadReplay(summary);
        if (token !== this.searchToken) return; // a newer search superseded this one
        results.push(
          ...computeEdgeGuardClips(
            loaded.replay,
            summary.id,
            formatDate(summary.recordedAt),
            {
              result: this.criteria.result,
              port,
              playerCharacterId: this.criteria.playerCharacterId,
              opponentCharacterId: this.criteria.opponentCharacterId,
              jumpCount: this.criteria.jumpCount,
              startingAreaBox: this.criteria.startingAreaBox,
            },
          ),
        );
      } catch {
        // Skip a game that fails to load rather than aborting the whole search.
      }
    }

    if (token !== this.searchToken) return;
    this.results = results;
    this.searching = false;
    this.renderResultsList();
  }
}
