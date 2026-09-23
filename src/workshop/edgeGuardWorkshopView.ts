import type { PortIndex } from "@rmg-k/rmgr";
import { t } from "../i18n.js";
import { characterName, NA_ORIGINAL_12_IDS } from "../lookups.js";
import { characterIconHtml } from "../characterIcons.js";
import type { GameSummary } from "../data/gameSummary.js";
import { createDefaultIdentity, type Identity } from "../data/identity.js";
import type { LoadedReplay } from "../replaySource.js";
import type { PlaylistClip } from "../playlist.js";
import { filterGameSummaries } from "../data/aggregate.js";
import { groupGamesIntoSessions } from "../data/session.js";
import { groupAndSortCharacters } from "../library/matchupChipSelector.js";
import {
  navigateToEdgeGuardWorkshop,
  recoveriesHash,
  type EgwFilters,
} from "../router.js";
import {
  extractEdgeGuardSituations,
  filterEdgeGuardSituations,
  type EdgeGuardSituationData,
  type EdgeGuardFilterState,
} from "./edgeGuardData.js";
import { EdgeGuardCanvas } from "./edgeGuardCanvas.js";

export class EdgeGuardWorkshopViewController {
  private container: HTMLElement;
  private loadReplay: (summary: GameSummary) => Promise<LoadedReplay>;
  private onJumpToMatch: (clip: PlaylistClip) => void;

  private myChar: number = 0;
  private oppChar: number = 0;
  private summaries: GameSummary[] = [];
  private identity: Identity = createDefaultIdentity();

  // Cache extracted situations by gameId to avoid reloading parsed replays
  private situationCache = new Map<string, EdgeGuardSituationData[]>();
  private allSituations: EdgeGuardSituationData[] = [];
  private filteredSituations: EdgeGuardSituationData[] = [];

  // Filter state
  private filters: EdgeGuardFilterState = {
    jumps: "all",
    opponent: "all",
    session: "all",
    recency: "all",
    sinceDate: undefined,
    outcome: "all",
  };

  private showTrails: boolean = true;
  private themeObserver: MutationObserver | null = null;

  // Simultaneous playback state
  private isPlaying = false;
  private currentFrame = 0;
  private maxFrames = 0;
  private playbackSpeed = 1.0;
  private animFrameId: number | null = null;
  private lastAnimTime: number = 0;

  private canvas: EdgeGuardCanvas | null = null;
  private loadToken = 0;

  constructor(
    container: HTMLElement,
    loadReplay: (summary: GameSummary) => Promise<LoadedReplay>,
    onJumpToMatch: (clip: PlaylistClip) => void,
  ) {
    this.container = container;
    this.loadReplay = loadReplay;
    this.onJumpToMatch = onJumpToMatch;
  }

  public async render(
    myChar: number,
    oppChar: number,
    summaries: GameSummary[],
    identity: Identity,
    initialFilters?: EgwFilters,
  ): Promise<void> {
    this.myChar = myChar;
    this.oppChar = oppChar;
    this.summaries = summaries;
    this.identity = identity;
    this.stopPlayback();
    this.themeObserver?.disconnect();
    document.removeEventListener("keydown", this.handleKeyDown);

    // Initialise filter state from the URL-parsed params.
    // On character-picker change we carry over recency/outcome but reset the
    // matchup-specific ones (jumps, opponent, session), so those come in as
    // undefined here — they'll default to "all".
    this.filters = {
      jumps: initialFilters?.jumps ?? "all",
      outcome: initialFilters?.outcome ?? "all",
      recency: initialFilters?.recency ?? "all",
      sinceDate: initialFilters?.since,
      opponent: initialFilters?.opponent ?? "all",
      session: initialFilters?.session ?? "all",
    };

    const token = ++this.loadToken;

    // 1. Initial shell layout
    this.renderShell();

    // 2. Filter matching games for this matchup
    const matchupGames = filterGameSummaries(summaries, identity, {
      yourCharacterId: myChar,
      oppCharacterId: oppChar,
    });

    const sessions = groupGamesIntoSessions(summaries, identity);
    const gameSessionMap = new Map<string, string>();
    for (const s of sessions) {
      for (const g of s.games) {
        gameSessionMap.set(g.id, s.id);
      }
    }

    const progressBar = this.container.querySelector(
      "#egwProgressBar",
    ) as HTMLElement | null;
    const progressText = this.container.querySelector(
      "#egwProgressText",
    ) as HTMLElement | null;

    // 3. Extract situations from cached or newly loaded replays
    this.allSituations = [];
    const totalGames = matchupGames.length;

    for (let i = 0; i < totalGames; i++) {
      if (token !== this.loadToken) return; // Stale request

      const { summary, yourPort, oppPort } = matchupGames[i]!;

      if (progressText) {
        progressText.textContent = t().edgeGuardWorkshopLoading(
          i + 1,
          totalGames,
        );
      }
      if (progressBar) {
        const pct = Math.round(((i + 1) / Math.max(1, totalGames)) * 100);
        progressBar.style.width = `${pct}%`;
      }

      let cached = this.situationCache.get(summary.id);
      if (!cached) {
        try {
          const loaded = await this.loadReplay(summary);
          if (token !== this.loadToken) return;
          cached = extractEdgeGuardSituations(
            loaded.replay,
            summary,
            yourPort as PortIndex,
            oppPort as PortIndex,
            gameSessionMap.get(summary.id),
          );
          this.situationCache.set(summary.id, cached);
        } catch {
          cached = [];
        }
      }

      this.allSituations.push(...cached);
    }

    if (token !== this.loadToken) return;

    // Hide loading overlay
    const loadingWrap = this.container.querySelector(
      "#egwLoadingWrap",
    ) as HTMLElement | null;
    if (loadingWrap) loadingWrap.style.display = "none";

    // Populate filter options (Opponents, Sessions)
    this.populateFilterDropdowns();

    // Apply filters and draw
    this.applyFilters();
  }

  private renderCharacterSelectOptions(selectedId: number): string {
    const allCharIds = Array.from(
      new Set([
        ...NA_ORIGINAL_12_IDS,
        ...this.summaries.flatMap((s) => s.ports.map((p) => p.characterId)),
      ]),
    );
    const sections = groupAndSortCharacters(allCharIds);
    return sections
      .map(
        (sec) => `
        <optgroup label="${escapeHtml(sec.name)}">
          ${sec.charIds
            .map(
              (id) => `
            <option value="${id}" ${id === selectedId ? "selected" : ""}>
              ${escapeHtml(characterName(id))}
            </option>
          `,
            )
            .join("")}
        </optgroup>
      `,
      )
      .join("");
  }

  private isLightMode(): boolean {
    if (typeof document !== "undefined") {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "light") return true;
      if (attr === "dark") return false;
      if (typeof window !== "undefined" && window.matchMedia) {
        return window.matchMedia("(prefers-color-scheme: light)").matches;
      }
    }
    return false;
  }

  private renderShell(): void {
    const tr = t();
    const f = this.filters;

    // Helper: return "selected" if the condition is true
    const sel = (cond: boolean) => (cond ? "selected" : "");

    this.container.innerHTML = `
      <div class="egw-container">
        <!-- Header -->
        <header class="egw-header">
          <div class="egw-header-left">
            <a href="#/matchup/${this.myChar}/${this.oppChar}" class="egw-back-link">
              &larr; ${escapeHtml(tr.edgeGuardWorkshopBackToMatchup)}
            </a>
            <div class="egw-character-pickers">
              <div class="egw-picker-control">
                ${characterIconHtml(this.myChar, "egw-char-icon", { showBadge: false })}
                <select id="egwMyCharSelect" class="egw-char-select">
                  ${this.renderCharacterSelectOptions(this.myChar)}
                </select>
              </div>

              <button type="button" class="egw-swap-btn" id="egwSwapBtn" title="Swap Matchup">
                &#8644;
              </button>

              <div class="egw-picker-control">
                ${characterIconHtml(this.oppChar, "egw-char-icon", { showBadge: false })}
                <select id="egwOppCharSelect" class="egw-char-select">
                  ${this.renderCharacterSelectOptions(this.oppChar)}
                </select>
              </div>

              <span class="egw-badge">${escapeHtml(tr.edgeGuardWorkshopTitle)}</span>
            </div>
          </div>

          <!-- Summary Stats -->
          <div class="egw-header-stats" id="egwHeaderStats">
            <div class="egw-stat-pill egw-stat-total">
              <span class="egw-stat-num" id="egwStatTotal">0</span>
              <span class="egw-stat-lbl">${escapeHtml(tr.all)}</span>
            </div>
            <div class="egw-stat-pill egw-stat-success">
              <span class="egw-stat-num" id="egwStatSuccess">0</span>
              <span class="egw-stat-lbl">${escapeHtml(tr.edgeGuardWorkshopOutcomeSuccess)}</span>
            </div>
            <div class="egw-stat-pill egw-stat-fail">
              <span class="egw-stat-num" id="egwStatFail">0</span>
              <span class="egw-stat-lbl">${escapeHtml(tr.edgeGuardWorkshopOutcomeFail)}</span>
            </div>
          </div>
        </header>

        <!-- Filters Bar -->
        <div class="egw-filter-bar">
          <select id="egwFilterJumps" class="egw-select" title="${escapeHtml(tr.edgeGuardWorkshopFilterJumps)}">
            <option value="all" ${sel(f.jumps === "all")}>${escapeHtml(tr.edgeGuardWorkshopAllJumps)}</option>
            <option value="0" ${sel(f.jumps === 0)}>0 Jumps</option>
            <option value="1" ${sel(f.jumps === 1)}>1 Jump</option>
            <option value="2" ${sel(f.jumps === 2)}>2 Jumps</option>
            <option value="3" ${sel(f.jumps === 3)}>3 Jumps</option>
            <option value="4" ${sel(f.jumps === 4)}>4 Jumps</option>
            <option value="5" ${sel(f.jumps === 5)}>5+ Jumps</option>
          </select>

          <select id="egwFilterOpponent" class="egw-select" title="${escapeHtml(tr.edgeGuardWorkshopFilterOpponent)}">
            <option value="all" ${sel(f.opponent === "all")}>${escapeHtml(tr.edgeGuardWorkshopAllOpponents)}</option>
          </select>

          <select id="egwFilterSession" class="egw-select" title="${escapeHtml(tr.edgeGuardWorkshopFilterSession)}">
            <option value="all" ${sel(f.session === "all")}>${escapeHtml(tr.edgeGuardWorkshopAllSessions)}</option>
          </select>

          <select id="egwFilterRecency" class="egw-select" title="${escapeHtml(tr.edgeGuardWorkshopFilterRecency)}">
            <option value="all" ${sel(f.recency === "all")}>${escapeHtml(tr.edgeGuardWorkshopAllTime)}</option>
            <option value="month" ${sel(f.recency === "month")}>${escapeHtml(tr.edgeGuardWorkshopLastMonth)}</option>
            <option value="since" ${sel(f.recency === "since")}>${escapeHtml(tr.edgeGuardWorkshopSinceDate)}</option>
          </select>
          <input
            type="date"
            id="egwSinceDate"
            class="egw-date-input"
            value="${escapeHtml(f.sinceDate ?? "")}"
            style="display: ${f.recency === "since" ? "inline-block" : "none"};"
          />

          <select id="egwFilterOutcome" class="egw-select" title="${escapeHtml(tr.edgeGuardWorkshopFilterOutcome)}">
            <option value="all" ${sel(f.outcome === "all")}>${escapeHtml(tr.edgeGuardWorkshopOutcomeAll)}</option>
            <option value="success" ${sel(f.outcome === "success")}>${escapeHtml(tr.edgeGuardWorkshopOutcomeSuccess)}</option>
            <option value="fail" ${sel(f.outcome === "fail")}>${escapeHtml(tr.edgeGuardWorkshopOutcomeFail)}</option>
          </select>

          <div class="egw-filter-spacer"></div>

          <div class="egw-filter-controls">
            <label class="egw-checkbox-label">
              <input type="checkbox" id="egwTrailsCheck" ${this.showTrails ? "checked" : ""} />
              <span>${escapeHtml(tr.edgeGuardWorkshopShowTrails)}</span>
            </label>
          </div>
        </div>

        <!-- Main Body: Replay-Like Stage View & Sidebar -->
        <div class="egw-main-body">
          <!-- Stage Canvas & Playback Bar -->
          <div class="egw-stage-section">
            <div class="egw-canvas-wrap" id="egwCanvasWrap">
              <canvas id="egwCanvas" class="egw-canvas"></canvas>

              <!-- Loading Indicator -->
              <div class="egw-loading-overlay" id="egwLoadingWrap">
                <div class="egw-loading-box">
                  <div class="egw-spinner"></div>
                  <div class="egw-loading-text" id="egwProgressText">Loading replays...</div>
                  <div class="egw-progress-bar-wrap">
                    <div class="egw-progress-bar" id="egwProgressBar" style="width: 0%;"></div>
                  </div>
                </div>
              </div>

              <!-- Tooltip Overlay -->
              <div class="egw-tooltip" id="egwTooltip" style="display: none;"></div>
            </div>

            <!-- Playback Control Bar for Simultaneous Playback -->
            <div class="egw-playback-bar">
              <button type="button" class="egw-play-btn" id="egwPlayBtn">
                <span id="egwPlayIcon">&#9654;</span>
                <span id="egwPlayText">${escapeHtml(tr.edgeGuardWorkshopPlaySimultaneous)}</span>
              </button>

              <input
                type="range"
                id="egwScrubber"
                class="egw-scrubber"
                min="0"
                max="100"
                value="0"
                step="1"
              />

              <div class="egw-frame-counter" id="egwFrameCounter">Frame: 0 / 0 (0.0s)</div>

              <div class="egw-speed-group">
                <button type="button" class="egw-speed-btn" data-speed="0.5">0.5x</button>
                <button type="button" class="egw-speed-btn active" data-speed="1.0">1x</button>
                <button type="button" class="egw-speed-btn" data-speed="2.0">2x</button>
              </div>
            </div>
          </div>

          <!-- Right Sidebar: Scrolling Recovery List -->
          <aside class="egw-sidebar">
            <div class="egw-sidebar-header">
              <h3 class="egw-sidebar-title">
                Edge guards
                <span class="egw-count-badge" id="egwListCount">0</span>
              </h3>
            </div>

            <div class="egw-recovery-list" id="egwRecoveryList">
              <!-- Cards rendered here -->
            </div>
          </aside>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  /** Silently updates the URL to reflect the current filter state without
   * triggering a hashchange / re-render. */
  private updateFiltersInUrl(): void {
    if (typeof history === "undefined") return;
    const hash = recoveriesHash(this.myChar, this.oppChar, {
      jumps: this.filters.jumps,
      outcome: this.filters.outcome,
      recency: this.filters.recency,
      since: this.filters.sinceDate,
      opponent:
        this.filters.opponent !== "all" ? this.filters.opponent : undefined,
      session:
        this.filters.session !== "all" ? this.filters.session : undefined,
    });
    history.replaceState(null, "", hash);
  }

  private bindEvents(): void {
    const canvasEl = this.container.querySelector(
      "#egwCanvas",
    ) as HTMLCanvasElement;
    if (!canvasEl) return;

    this.canvas = new EdgeGuardCanvas(canvasEl, {
      onHoverSituation: (sit, screenPos) =>
        this.handleCanvasHover(sit, screenPos),
      onSelectSituation: (sit) => this.handleCanvasSelect(sit),
    });
    this.canvas.setIsLight(this.isLightMode());
    this.canvas.setShowTrails(this.showTrails);

    // Auto-sync canvas theme with UI theme changes
    if (
      typeof MutationObserver !== "undefined" &&
      typeof document !== "undefined"
    ) {
      this.themeObserver?.disconnect();
      this.themeObserver = new MutationObserver(() => {
        this.canvas?.setIsLight(this.isLightMode());
      });
      this.themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
    }

    // Character pickers in header.
    // When switching the matchup we carry recency and outcome across (they are
    // user preferences, not matchup-specific) but reset jumps, opponent, and
    // session since those don't apply to the new character pair.
    const sharedFilters = () => ({
      recency: this.filters.recency,
      since: this.filters.sinceDate,
      outcome: this.filters.outcome,
    });

    const myCharSelect = this.container.querySelector(
      "#egwMyCharSelect",
    ) as HTMLSelectElement | null;
    myCharSelect?.addEventListener("change", () => {
      const newMy = parseInt(myCharSelect.value, 10);
      navigateToEdgeGuardWorkshop(newMy, this.oppChar, sharedFilters());
    });

    const oppCharSelect = this.container.querySelector(
      "#egwOppCharSelect",
    ) as HTMLSelectElement | null;
    oppCharSelect?.addEventListener("change", () => {
      const newOpp = parseInt(oppCharSelect.value, 10);
      navigateToEdgeGuardWorkshop(this.myChar, newOpp, sharedFilters());
    });

    const swapBtn = this.container.querySelector(
      "#egwSwapBtn",
    ) as HTMLButtonElement | null;
    swapBtn?.addEventListener("click", () => {
      navigateToEdgeGuardWorkshop(this.oppChar, this.myChar, sharedFilters());
    });

    // Recenter camera button
    const recenterBtn = this.container.querySelector(
      "#egwRecenterBtn",
    ) as HTMLButtonElement | null;
    recenterBtn?.addEventListener("click", () => {
      this.canvas?.recenterCamera();
    });

    // Window resize observer
    const wrap = this.container.querySelector("#egwCanvasWrap") as HTMLElement;
    if (wrap && window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        this.canvas?.resize();
      });
      ro.observe(wrap);
    }

    // Filter events — update URL silently (replaceState) so the address bar
    // stays in sync without triggering a full re-render.
    const jumpsSelect = this.container.querySelector(
      "#egwFilterJumps",
    ) as HTMLSelectElement;
    jumpsSelect?.addEventListener("change", () => {
      const val = jumpsSelect.value;
      this.filters = {
        ...this.filters,
        jumps: val === "all" ? "all" : parseInt(val, 10),
      };
      this.updateFiltersInUrl();
      this.applyFilters();
    });

    const oppSelect = this.container.querySelector(
      "#egwFilterOpponent",
    ) as HTMLSelectElement;
    oppSelect?.addEventListener("change", () => {
      this.filters = { ...this.filters, opponent: oppSelect.value };
      this.updateFiltersInUrl();
      this.applyFilters();
    });

    const sessionSelect = this.container.querySelector(
      "#egwFilterSession",
    ) as HTMLSelectElement;
    sessionSelect?.addEventListener("change", () => {
      this.filters = { ...this.filters, session: sessionSelect.value };
      this.updateFiltersInUrl();
      this.applyFilters();
    });

    const recencySelect = this.container.querySelector(
      "#egwFilterRecency",
    ) as HTMLSelectElement;
    const sinceDateInput = this.container.querySelector(
      "#egwSinceDate",
    ) as HTMLInputElement;

    recencySelect?.addEventListener("change", () => {
      const val = recencySelect.value as "all" | "month" | "since";
      if (sinceDateInput) {
        sinceDateInput.style.display =
          val === "since" ? "inline-block" : "none";
      }
      this.filters = {
        ...this.filters,
        recency: val,
        sinceDate: sinceDateInput?.value || undefined,
      };
      this.updateFiltersInUrl();
      this.applyFilters();
    });

    sinceDateInput?.addEventListener("change", () => {
      this.filters = {
        ...this.filters,
        sinceDate: sinceDateInput.value || undefined,
      };
      this.updateFiltersInUrl();
      this.applyFilters();
    });

    const outcomeSelect = this.container.querySelector(
      "#egwFilterOutcome",
    ) as HTMLSelectElement;
    outcomeSelect?.addEventListener("change", () => {
      this.filters = {
        ...this.filters,
        outcome: outcomeSelect.value as "all" | "success" | "fail",
      };
      this.updateFiltersInUrl();
      this.applyFilters();
    });

    // Trails toggle
    const trailsCheck = this.container.querySelector(
      "#egwTrailsCheck",
    ) as HTMLInputElement;
    trailsCheck?.addEventListener("change", () => {
      this.showTrails = trailsCheck.checked;
      this.canvas?.setShowTrails(this.showTrails);
    });

    // Playback bar controls
    const playBtn = this.container.querySelector(
      "#egwPlayBtn",
    ) as HTMLButtonElement;
    playBtn?.addEventListener("click", () => {
      this.togglePlayback();
    });

    const scrubber = this.container.querySelector(
      "#egwScrubber",
    ) as HTMLInputElement;
    scrubber?.addEventListener("input", () => {
      this.pausePlayback();
      this.currentFrame = parseInt(scrubber.value, 10);
      this.updatePlaybackFrameUI();
      this.canvas?.setPlaybackFrame(this.currentFrame);
    });

    const speedButtons = this.container.querySelectorAll(".egw-speed-btn");
    speedButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        speedButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.playbackSpeed = parseFloat(
          btn.getAttribute("data-speed") || "1.0",
        );
      });
    });

    // Spacebar toggles play/pause (ignore when focus is on an input/select)
    document.addEventListener("keydown", this.handleKeyDown);
  }

  private readonly handleKeyDown = (e: KeyboardEvent): void => {
    if (e.code !== "Space") return;
    const tag = (e.target as HTMLElement | null)?.tagName ?? "";
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    e.preventDefault();
    this.togglePlayback();
  };

  private populateFilterDropdowns(): void {
    const oppSelect = this.container.querySelector(
      "#egwFilterOpponent",
    ) as HTMLSelectElement | null;
    const sessionSelect = this.container.querySelector(
      "#egwFilterSession",
    ) as HTMLSelectElement | null;

    if (oppSelect) {
      const opps = Array.from(
        new Set(this.allSituations.map((s) => s.opponentName)),
      ).sort();
      for (const opp of opps) {
        const opt = document.createElement("option");
        opt.value = opp;
        opt.textContent = opp;
        oppSelect.appendChild(opt);
      }
    }

    if (sessionSelect) {
      const sessions = Array.from(
        new Set(
          this.allSituations
            .map((s) => s.sessionId)
            .filter((s): s is string => Boolean(s)),
        ),
      ).sort();
      for (const sess of sessions) {
        const opt = document.createElement("option");
        opt.value = sess;
        opt.textContent = sess;
        sessionSelect.appendChild(opt);
      }
    }
  }

  private applyFilters(): void {
    this.filteredSituations = filterEdgeGuardSituations(
      this.allSituations,
      this.filters,
    );

    // Compute maxFrames for scrubber
    this.maxFrames = this.filteredSituations.reduce(
      (max, sit) => Math.max(max, sit.trajectory.length),
      0,
    );

    const scrubber = this.container.querySelector(
      "#egwScrubber",
    ) as HTMLInputElement | null;
    if (scrubber) {
      scrubber.max = String(Math.max(1, this.maxFrames));
      scrubber.value = String(this.currentFrame);
    }

    this.updateStatsBar();
    this.updatePlaybackFrameUI();
    this.renderRecoveryList();

    this.canvas?.setSituations(this.filteredSituations);
    this.canvas?.resize();
  }

  private updateStatsBar(): void {
    const total = this.filteredSituations.length;
    const successes = this.filteredSituations.filter(
      (s) => s.outcome === "success",
    ).length;
    const fails = total - successes;
    const successPct = total > 0 ? Math.round((successes / total) * 100) : 0;
    const failPct = total > 0 ? 100 - successPct : 0;

    const totalEl = this.container.querySelector("#egwStatTotal");
    const successEl = this.container.querySelector("#egwStatSuccess");
    const failEl = this.container.querySelector("#egwStatFail");

    if (totalEl) totalEl.textContent = String(total);
    if (successEl) successEl.textContent = `${successes} (${successPct}%)`;
    if (failEl) failEl.textContent = `${fails} (${failPct}%)`;
  }

  private renderRecoveryList(): void {
    const listEl = this.container.querySelector(
      "#egwRecoveryList",
    ) as HTMLElement | null;
    const countBadge = this.container.querySelector(
      "#egwListCount",
    ) as HTMLElement | null;
    if (!listEl) return;

    if (countBadge)
      countBadge.textContent = String(this.filteredSituations.length);

    if (this.filteredSituations.length === 0) {
      listEl.innerHTML = `
        <div class="egw-empty-list">${escapeHtml(t().edgeGuardWorkshopNoRecoveries)}</div>
      `;
      return;
    }

    listEl.innerHTML = "";

    this.filteredSituations.forEach((sit) => {
      const isSuccess = sit.outcome === "success";
      const card = document.createElement("div");
      card.className = `egw-recovery-card ${isSuccess ? "is-success" : "is-fail"}`;
      card.setAttribute("data-id", sit.id);

      const xFormatted = Math.round(sit.startX);
      const yFormatted = Math.round(sit.startY);
      const mirrorNote = sit.wasLeft
        ? ` <span class="egw-mirrored-tag" title="Recovery started on left (X = ${Math.round(sit.rawStartX)}), mirrored across X=0">Mirrored</span>`
        : "";

      card.innerHTML = `
        <div class="egw-card-header">
          <span class="egw-outcome-badge ${isSuccess ? "badge-success" : "badge-fail"}">
            ${isSuccess ? "KO" : "SAFE"}
          </span>
          <span class="egw-card-opp">${escapeHtml(sit.opponentName)}</span>
          <span class="egw-card-date">${escapeHtml(sit.gameDate.split("T")[0] || sit.gameDate)}</span>
        </div>

        <div class="egw-card-details">
          <div class="egw-card-row">
            <span class="egw-detail-label">Entry Pos:</span>
            <span class="egw-detail-val">(${xFormatted}, ${yFormatted})${mirrorNote}</span>
          </div>
          <div class="egw-card-row">
            <span class="egw-detail-label">Jumps:</span>
            <span class="egw-detail-val">${sit.jumpsAtEntry} remaining &middot; ${sit.damageAtEntry}%</span>
          </div>
        </div>

        <div class="egw-card-actions">
          <button type="button" class="egw-jump-btn" title="Jump to this recovery in replay match">
            🎯 ${escapeHtml(t().edgeGuardWorkshopJumpToMatch)}
          </button>
        </div>
      `;

      // Hover card highlights canvas point
      card.addEventListener("mouseenter", () => {
        this.canvas?.setHoveredId(sit.id);
        card.classList.add("card-hovered");
      });
      card.addEventListener("mouseleave", () => {
        this.canvas?.setHoveredId(null);
        card.classList.remove("card-hovered");
      });

      // Click card selects it
      card.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (target.closest(".egw-jump-btn")) {
          e.stopPropagation();
          this.triggerJumpToMatch(sit);
          return;
        }
        this.canvas?.setSelectedId(sit.id);
      });

      listEl.appendChild(card);
    });
  }

  private handleCanvasHover(
    sit: EdgeGuardSituationData | null,
    screenPos: { x: number; y: number } | null,
  ): void {
    const tooltip = this.container.querySelector(
      "#egwTooltip",
    ) as HTMLElement | null;
    if (!tooltip) return;

    if (!sit || !screenPos) {
      tooltip.style.display = "none";
      return;
    }

    const isSuccess = sit.outcome === "success";
    const xFmt = Math.round(sit.startX);
    const yFmt = Math.round(sit.startY);

    tooltip.innerHTML = `
      <div class="egw-tooltip-title ${isSuccess ? "tooltip-success" : "tooltip-fail"}">
        ${isSuccess ? "🎯 Edge Guard Succeeded (KO)" : "🛡️ Recovery Succeeded (Safe)"}
      </div>
      <div class="egw-tooltip-line"><strong>Opponent:</strong> ${escapeHtml(sit.opponentName)}</div>
      <div class="egw-tooltip-line"><strong>Position:</strong> (${xFmt}, ${yFmt}) ${sit.wasLeft ? "(Flipped from Left)" : ""}</div>
      <div class="egw-tooltip-line"><strong>Jumps at entry:</strong> ${sit.jumpsAtEntry}</div>
      <div class="egw-tooltip-line"><strong>Damage:</strong> ${sit.damageAtEntry}% &middot; ${sit.stocksRemaining} stocks</div>
      <div class="egw-tooltip-date">${escapeHtml(sit.gameDate.split("T")[0] || sit.gameDate)}</div>
    `;

    tooltip.style.display = "block";
    const wrap = this.container.querySelector("#egwCanvasWrap") as HTMLElement;
    const wrapRect = wrap?.getBoundingClientRect() || { left: 0, top: 0 };
    const left = screenPos.x - wrapRect.left + 16;
    const top = screenPos.y - wrapRect.top - 16;
    tooltip.style.left = `${Math.max(8, left)}px`;
    tooltip.style.top = `${Math.max(8, top)}px`;
  }

  private handleCanvasSelect(sit: EdgeGuardSituationData): void {
    // Scroll corresponding card in sidebar into view
    const card = this.container.querySelector(
      `.egw-recovery-card[data-id="${sit.id}"]`,
    ) as HTMLElement | null;
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      card.classList.add("card-selected");
      setTimeout(() => card.classList.remove("card-selected"), 1500);
    }
  }

  private triggerJumpToMatch(sit: EdgeGuardSituationData): void {
    const PRE_ROLL_FRAMES = 60;
    const POST_ROLL_FRAMES = 60;
    const clip: PlaylistClip = {
      gameId: sit.gameId,
      startFrameIndex: Math.max(0, sit.startFrameIndex - PRE_ROLL_FRAMES),
      endFrameIndex: sit.endFrameIndex + POST_ROLL_FRAMES,
      label: `${sit.outcome === "success" ? "KO" : "Recovery"} vs ${sit.opponentName}`,
    };
    this.onJumpToMatch(clip);
  }

  // ---------------------------------------------------------------------------
  // Playback loop for simultaneous replay
  // ---------------------------------------------------------------------------

  private togglePlayback(): void {
    if (this.isPlaying) {
      this.pausePlayback();
    } else {
      this.startPlayback();
    }
  }

  private startPlayback(): void {
    if (this.filteredSituations.length === 0) return;
    this.isPlaying = true;
    this.lastAnimTime = performance.now();
    this.updatePlayBtnUI();
    this.animLoop();
  }

  private pausePlayback(): void {
    this.isPlaying = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.updatePlayBtnUI();
  }

  private stopPlayback(): void {
    this.pausePlayback();
    this.currentFrame = 0;
    this.updatePlaybackFrameUI();
  }

  private animLoop(): void {
    if (!this.isPlaying) return;

    const now = performance.now();
    const dt = (now - this.lastAnimTime) / 1000;
    this.lastAnimTime = now;

    // Advance frames at 60 fps * playbackSpeed
    const frameAdvance = dt * 60 * this.playbackSpeed;
    this.currentFrame += frameAdvance;

    if (this.currentFrame >= this.maxFrames) {
      // Loop back to start
      this.currentFrame = 0;
    }

    const intFrame = Math.floor(this.currentFrame);
    this.canvas?.setPlaybackFrame(intFrame);

    const scrubber = this.container.querySelector(
      "#egwScrubber",
    ) as HTMLInputElement | null;
    if (scrubber) scrubber.value = String(intFrame);

    this.updatePlaybackFrameUI();

    this.animFrameId = requestAnimationFrame(() => this.animLoop());
  }

  private updatePlayBtnUI(): void {
    const playIcon = this.container.querySelector("#egwPlayIcon");
    const playText = this.container.querySelector("#egwPlayText");
    const tr = t();
    if (playIcon)
      playIcon.innerHTML = this.isPlaying ? "&#10074;&#10074;" : "&#9654;";
    if (playText) {
      playText.textContent = this.isPlaying
        ? tr.edgeGuardWorkshopPauseSimultaneous
        : tr.edgeGuardWorkshopPlaySimultaneous;
    }
  }

  private updatePlaybackFrameUI(): void {
    const counter = this.container.querySelector("#egwFrameCounter");
    if (!counter) return;
    const f = Math.floor(this.currentFrame);
    const secs = (f / 60).toFixed(1);
    counter.textContent = `Frame: ${f} / ${this.maxFrames} (${secs}s)`;
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
