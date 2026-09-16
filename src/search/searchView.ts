import type { PortIndex } from "@rmg-k/rmgr";
import { t } from "../i18n.js";
import { characterName } from "../lookups.js";
import type { GameSummary } from "../data/gameSummary.js";
import type { Identity } from "../data/identity.js";
import { groupGamesIntoSessions, type SessionGroup } from "../data/session.js";
import {
  computeComboClips,
  computeEdgeGuardClips,
  type PlaylistClip,
} from "../playlist.js";
import type { LoadedReplay } from "../replaySource.js";
import { navigateToSearch, type SearchRouteCriteria } from "../router.js";
import { openStartingAreaModal } from "./startingAreaModal.js";
import { clipVideoRanges } from "./ffmpegClips.js";
import { searchCache, searchCacheKey } from "./searchCache.js";
import { openFfmpegModal } from "./ffmpegModal.js";
import { loadVideoLink } from "../video/youtubeSync.js";

const JUMP_COUNT_OPTIONS = [1, 2, 3, 4, 5];
/** Combos search: a combo is at least 3 hits, so that's both the floor and the default. */
const MIN_HITS_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10];
const DEFAULT_MIN_HITS = 3;

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
    type: "edgeGuards",
    victimName: null,
    minHits: null,
    killed: null,
    allowGaps: false,
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
  /** Games searched so far / to search, for the progress bar. */
  private progress: { done: number; total: number } = { done: 0, total: 0 };
  /** Bumped on every new search so a slower, superseded search can tell it's stale and stop touching `this.results`. */
  private searchToken = 0;
  /** Candidate games skipped by the last search because their replay file isn't loaded this session. */
  private unloadedCount = 0;
  private onReimportFolder: () => void;

  constructor(
    container: HTMLElement,
    modalContainer: HTMLElement,
    loadReplay: (summary: GameSummary) => Promise<LoadedReplay>,
    onPlayClips: (clips: PlaylistClip[], startIndex: number) => void,
    onReimportFolder: () => void,
  ) {
    this.container = container;
    this.modalContainer = modalContainer;
    this.loadReplay = loadReplay;
    this.onPlayClips = onPlayClips;
    this.onReimportFolder = onReimportFolder;
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
    const playerOptions = (selectedName: string | null) =>
      playerNames
        .map(
          (name) =>
            `<option value="${escapeHtml(name)}" ${selectedName === name ? "selected" : ""}>${escapeHtml(name)}</option>`,
        )
        .join("");
    const isCombos = this.criteria.type === "combos";
    const minHits = this.criteria.minHits ?? DEFAULT_MIN_HITS;

    this.container.innerHTML = `
      <div class="search-view">
        <h2 class="search-title">${escapeHtml(tr.searchTitle)}</h2>
        <div class="search-filters">
          <label class="search-filter">
            <span>${escapeHtml(tr.searchTypeLabel)}</span>
            <select id="searchTypeSelect">
              <option value="edgeGuards" ${!isCombos ? "selected" : ""}>${escapeHtml(tr.searchTypeEdgeGuards)}</option>
              <option value="combos" ${isCombos ? "selected" : ""}>${escapeHtml(tr.searchTypeCombos)}</option>
            </select>
          </label>
          ${
            isCombos
              ? ""
              : `<label class="search-filter">
            <span>${escapeHtml(tr.searchResultLabel)}</span>
            <select id="searchResultSelect">
              <option value="" ${!this.criteria.result ? "selected" : ""}>${escapeHtml(tr.searchResultAny)}</option>
              <option value="failure" ${this.criteria.result === "failure" ? "selected" : ""}>${escapeHtml(tr.searchResultFailure)}</option>
              <option value="success" ${this.criteria.result === "success" ? "selected" : ""}>${escapeHtml(tr.searchResultSuccess)}</option>
            </select>
          </label>`
          }
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
            <span>${escapeHtml(isCombos ? tr.searchComboByLabel : tr.searchPlayerLabel)}</span>
            <select id="searchPlayerSelect">
              <option value="" ${!this.criteria.playerName ? "selected" : ""}>${escapeHtml(tr.searchAnyPlayer)}</option>
              ${playerOptions(this.criteria.playerName)}
            </select>
          </label>
          <label class="search-filter">
            <span>${escapeHtml(isCombos ? tr.searchComboByCharacterLabel : tr.searchPlayerCharacterLabel)}</span>
            <select id="searchPlayerCharacterSelect">
              <option value="" ${this.criteria.playerCharacterId === null ? "selected" : ""}>${escapeHtml(tr.searchAnyCharacter)}</option>
              ${characterOptions(this.criteria.playerCharacterId)}
            </select>
          </label>
          ${
            isCombos
              ? `<label class="search-filter">
            <span>${escapeHtml(tr.searchComboOnLabel)}</span>
            <select id="searchVictimSelect">
              <option value="" ${!this.criteria.victimName ? "selected" : ""}>${escapeHtml(tr.searchAnyPlayer)}</option>
              ${playerOptions(this.criteria.victimName)}
            </select>
          </label>`
              : ""
          }
          <label class="search-filter">
            <span>${escapeHtml(isCombos ? tr.searchComboOnCharacterLabel : tr.searchOpponentCharacterLabel)}</span>
            <select id="searchOpponentCharacterSelect">
              <option value="" ${this.criteria.opponentCharacterId === null ? "selected" : ""}>${escapeHtml(tr.searchAnyCharacter)}</option>
              ${characterOptions(this.criteria.opponentCharacterId)}
            </select>
          </label>
          ${
            isCombos
              ? `<label class="search-filter">
            <span>${escapeHtml(tr.searchMinHitsLabel)}</span>
            <select id="searchMinHitsSelect">
              ${MIN_HITS_OPTIONS.map(
                (n) =>
                  `<option value="${n}" ${minHits === n ? "selected" : ""}>${n}+</option>`,
              ).join("")}
            </select>
          </label>
          <label class="search-filter">
            <span>${escapeHtml(tr.searchKoLabel)}</span>
            <select id="searchKoSelect">
              <option value="" ${this.criteria.killed === null ? "selected" : ""}>${escapeHtml(tr.searchResultAny)}</option>
              <option value="1" ${this.criteria.killed === true ? "selected" : ""}>${escapeHtml(tr.searchKoYes)}</option>
              <option value="0" ${this.criteria.killed === false ? "selected" : ""}>${escapeHtml(tr.searchKoNo)}</option>
            </select>
          </label>
          <label class="search-filter">
            <span>${escapeHtml(tr.searchGapsLabel)}</span>
            <select id="searchGapsSelect">
              <option value="0" ${!this.criteria.allowGaps ? "selected" : ""}>${escapeHtml(tr.searchGapsTrueOnly)}</option>
              <option value="1" ${this.criteria.allowGaps ? "selected" : ""}>${escapeHtml(tr.searchGapsAllow)}</option>
            </select>
          </label>`
              : `<label class="search-filter">
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
          </label>`
          }
        </div>
        <div id="searchStatus" class="search-status"></div>
        <div id="searchResultsList" class="search-results-list"></div>
      </div>
    `;

    // Only the current search type's filters are rendered; a missing one reads as "any".
    const value = (id: string): string =>
      this.container.querySelector<HTMLSelectElement>(`#${id}`)?.value ?? "";
    const numberOrNull = (id: string): number | null =>
      value(id) ? Number(value(id)) : null;

    // Every filter navigates to a new #/search URL rather than mutating
    // local state - the route change comes back through setCriteria()
    // (main.ts wires onRoute to that), which re-renders and re-searches.
    const onFilterChange = (): void => {
      const result = value("searchResultSelect");
      const ko = value("searchKoSelect");
      navigateToSearch({
        type: value("searchTypeSelect") === "combos" ? "combos" : "edgeGuards",
        result: result === "success" || result === "failure" ? result : null,
        sessionId: value("searchSessionSelect") || null,
        playerName: value("searchPlayerSelect") || null,
        playerCharacterId: numberOrNull("searchPlayerCharacterSelect"),
        opponentCharacterId: numberOrNull("searchOpponentCharacterSelect"),
        jumpCount: numberOrNull("searchJumpCountSelect"),
        startingAreaBox: this.criteria.startingAreaBox,
        victimName: value("searchVictimSelect") || null,
        minHits: numberOrNull("searchMinHitsSelect"),
        killed: ko === "1" ? true : ko === "0" ? false : null,
        allowGaps: value("searchGapsSelect") === "1",
      });
    };
    this.container
      .querySelectorAll<HTMLSelectElement>(".search-filters select")
      .forEach((select) => select.addEventListener("change", onFilterChange));

    const startingAreaBtn = this.container.querySelector<HTMLButtonElement>(
      "#searchStartingAreaBtn",
    );
    startingAreaBtn?.addEventListener("click", () => {
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
      const { done, total } = this.progress;
      statusEl.textContent =
        total > 0 ? tr.searchProgress(done, total) : tr.searchInProgress;
      listEl.innerHTML =
        total > 0
          ? `<div class="search-progress"><div class="search-progress-bar" style="width:${Math.round(
              (done / total) * 100,
            )}%"></div></div>`
          : "";
      return;
    }
    statusEl.textContent =
      this.results.length > 0
        ? tr.searchResultsCount(this.results.length)
        : tr.searchNoResults;
    // Scoped to one session with a video: offer an ffmpeg command that cuts
    // these clips out of a local copy of that video and joins them.
    const session = this.criteria.sessionId
      ? this.getSessions().find((s) => s.id === this.criteria.sessionId)
      : undefined;
    if (session?.videoId && this.results.length > 0) {
      const { ranges, skipped } = clipVideoRanges(
        this.results,
        session.videoId,
        loadVideoLink,
      );
      if (ranges.length > 0) {
        const videoId = session.videoId;
        const createBtn = document.createElement("button");
        createBtn.className = "btn-secondary";
        createBtn.textContent = tr.searchCopyFfmpeg;
        createBtn.addEventListener("click", () =>
          openFfmpegModal(this.modalContainer, { ranges, skipped, videoId }),
        );
        statusEl.append(" ", createBtn);
      }
    }
    if (this.unloadedCount > 0) {
      const note = document.createElement("span");
      note.className = "search-unloaded-note";
      note.textContent = tr.searchUnloadedGames(this.unloadedCount);
      const reimportBtn = document.createElement("button");
      reimportBtn.className = "btn-secondary";
      reimportBtn.textContent = tr.reimportFolder;
      reimportBtn.addEventListener("click", () => this.onReimportFolder());
      statusEl.append(" ", note, " ", reimportBtn);
    }

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

    // Search reads each game's raw replay, which after a page refresh only
    // exists for games re-imported this session (the persistent library
    // caches summaries, not frames). Skip the rest - and say so in
    // renderResultsList rather than silently searching a subset.
    const tr = t();
    const isCombos = this.criteria.type === "combos";
    // Named players (who did it / who it was done on) must be in the game.
    const names = [
      this.criteria.playerName,
      isCombos ? this.criteria.victimName : null,
    ].filter((n): n is string => n !== null);
    const isLoaded = (g: GameSummary) => g.fileRef !== null || !!g.url;
    const candidates = this.getCandidateGames().filter((g) =>
      names.every((name) => g.ports.some((p) => p.playerName === name)),
    );
    const games = candidates.filter(isLoaded);
    this.unloadedCount = candidates.length - games.length;

    // Re-running the same search over the same games (a back-navigation, a
    // filter toggled and toggled back) shouldn't re-read every replay.
    const cacheKey = searchCacheKey(
      this.criteria,
      games.map((g) => g.id),
    );
    const cached = searchCache.get(cacheKey);
    if (cached) {
      this.results = [...cached.results];
      this.unloadedCount = cached.unloadedCount;
      this.searching = false;
      this.renderResultsList();
      return;
    }

    const results: PlaylistClip[] = [];
    this.progress = { done: 0, total: games.length };
    this.renderResultsList();
    for (const summary of games) {
      const portOf = (name: string | null): PortIndex | null =>
        name === null
          ? null
          : (summary.ports.find((p) => p.playerName === name)?.port ?? null);
      const port = portOf(this.criteria.playerName);
      try {
        const loaded = await this.loadReplay(summary);
        if (token !== this.searchToken) return; // a newer search superseded this one
        results.push(
          ...(isCombos
            ? computeComboClips(
                loaded.replay,
                summary.id,
                {
                  attackerPort: port,
                  victimPort: portOf(this.criteria.victimName),
                  attackerCharacterId: this.criteria.playerCharacterId,
                  victimCharacterId: this.criteria.opponentCharacterId,
                  minHits: this.criteria.minHits ?? DEFAULT_MIN_HITS,
                  killed: this.criteria.killed,
                  allowGaps: this.criteria.allowGaps,
                },
                (c) =>
                  tr.comboClipLabel(
                    c.hitCount,
                    c.startDamage,
                    c.endDamage,
                    c.killed,
                  ),
              )
            : computeEdgeGuardClips(
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
              )),
        );
      } catch {
        // Skip a game that fails to load rather than aborting the whole search.
      }
      this.progress = { done: this.progress.done + 1, total: games.length };
      this.renderResultsList();
    }

    if (token !== this.searchToken) return; // superseded: don't cache a partial run
    searchCache.set(cacheKey, { results, unloadedCount: this.unloadedCount });
    this.results = results;
    this.searching = false;
    this.renderResultsList();
  }
}
