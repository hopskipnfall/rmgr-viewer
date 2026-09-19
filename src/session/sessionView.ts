import {
  aggregateFilteredGames,
  computeOpponentCharacterBreakdown,
  filterGameSummaries,
} from "../data/aggregate.js";
import type { GameSummary } from "../data/gameSummary.js";
import { resolvePerspectivePort, type Identity } from "../data/identity.js";
import { groupGamesIntoSessions, type SessionGroup } from "../data/session.js";
import { t } from "../i18n.js";
import { BreakdownTable } from "../library/breakdownTable.js";
import { GameList } from "../library/gameList.js";
import { MatchupChipSelector } from "../library/matchupChipSelector.js";
import { MatchupStatsView } from "../library/matchupStatsView.js";
import { searchHash, type SearchRouteCriteria } from "../router.js";

/** No filters: the base every quick search starts from. */
const EMPTY_CRITERIA: SearchRouteCriteria = {
  type: "edgeGuards",
  result: null,
  sessionId: null,
  playerName: null,
  playerCharacterId: null,
  opponentCharacterId: null,
  jumpCount: null,
  startingAreaBox: null,
  victimName: null,
  minHits: null,
  killed: null,
  allowGaps: false,
};

export type QuickSearchLabelKey =
  "quickSearchFailedEdgeGuards" | "quickSearchCombos" | "quickSearchKillCombos";

export interface QuickSearchLink {
  readonly labelKey: QuickSearchLabelKey;
  readonly href: string;
}

/**
 * The session page's pre-filtered search links, in display order.
 * `playerName` scopes Failed Edge Guards to the user's own perspective in
 * this session (mirrors main.ts's handleShowFailedEdgeGuards) - otherwise it
 * would show every failed edge guard by either player, not just yours.
 */
export function sessionQuickSearchLinks(
  sessionId: string,
  playerName: string | null,
): readonly QuickSearchLink[] {
  return [
    {
      labelKey: "quickSearchFailedEdgeGuards",
      href: searchHash({
        ...EMPTY_CRITERIA,
        sessionId,
        result: "failure",
        playerName,
      }),
    },
    {
      labelKey: "quickSearchCombos",
      href: searchHash({ ...EMPTY_CRITERIA, sessionId, type: "combos" }),
    },
    {
      labelKey: "quickSearchKillCombos",
      href: searchHash({
        ...EMPTY_CRITERIA,
        sessionId,
        type: "combos",
        killed: true,
      }),
    },
  ];
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * The per-session deep-dive page (#/session/:id). A session is just another
 * filtered set of games, so this reuses the library's aggregation and its
 * StatCards/BreakdownTable components, comparing the session against the
 * all-time baseline rather than against a filtered subset.
 */
export class SessionViewController {
  private summaries: GameSummary[] = [];
  private identity: Identity | null = null;
  private sessionId: string | null = null;
  private sortOrder: "newest" | "oldest" = "oldest";
  private sessionSelectedMyChar: number | null = null;
  private sessionSelectedOppChar: number | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly onSelectGame: (summary: GameSummary) => void,
    private readonly onManualPerspectiveSet: (
      summary: GameSummary,
      port: 0 | 1 | 2 | 3,
    ) => void,
    private readonly onRemoveGame: (id: string) => void,
    private readonly onShowFailedEdgeGuards: (session: SessionGroup) => void,
  ) {}

  public setData(summaries: GameSummary[], identity: Identity): void {
    this.summaries = summaries;
    this.identity = identity;
  }

  public setSessionId(id: string): void {
    this.sessionId = id;
    this.render();
  }

  private currentSession(): SessionGroup | null {
    if (!this.identity || !this.sessionId) return null;
    return (
      groupGamesIntoSessions(this.summaries, this.identity).find(
        (s) => s.id === this.sessionId,
      ) ?? null
    );
  }

  public render(): void {
    const tr = t();
    const session = this.currentSession();
    if (!session || !this.identity) {
      this.container.innerHTML = `<p class="session-empty">${escapeHtml(
        tr.sessionNotFound,
      )}</p>`;
      return;
    }

    // aggregate.ts works on *resolved* games ({summary, yourPort, oppPort}),
    // which filterGameSummaries produces; this session is the subset of those
    // whose game belongs to it.
    const allResolved = filterGameSummaries(this.summaries, this.identity, {});
    const sessionGameIds = new Set(session.games.map((g) => g.id));
    const sessionResolved = allResolved.filter((r) =>
      sessionGameIds.has(r.summary.id),
    );

    const breakdownRows = computeOpponentCharacterBreakdown(sessionResolved);

    const dateStr = `${session.startTime.toLocaleDateString()} ${formatClock(
      session.startTime,
    )}–${formatClock(session.endTime)}`;

    // Same resolution main.ts's handleShowFailedEdgeGuards uses for the
    // library's own button, so both entry points scope to the same person.
    const firstGame = session.games[0];
    const playerName = firstGame
      ? (firstGame.ports.find(
          (p) =>
            p.port ===
            (firstGame.manualPerspectivePort ??
              resolvePerspectivePort(firstGame, this.identity!)),
        )?.playerName ?? null)
      : null;

    this.container.innerHTML = `
      <div class="session-page">
        <section class="session-page-header">
          <h2>${escapeHtml(session.opponentName)}</h2>
          <p class="session-page-meta">
            <span>${escapeHtml(dateStr)}</span>
            <span>${escapeHtml(tr.sessionRecord(session.wins, session.losses))}</span>
          </p>
        </section>
        <section class="session-page-section">
          <h3>${escapeHtml(tr.sessionQuickSearches)}</h3>
          <div id="sessionQuickSearchLinks" class="session-quick-search-links"></div>
        </section>
        <section class="session-page-section" id="sessionVideosSection" hidden>
          <h3>${escapeHtml(tr.sessionVideos)}</h3>
          <div id="sessionVideos"></div>
        </section>
        <section class="session-page-section">
          <h3>${escapeHtml(tr.matchStats)}</h3>
          <div id="sessionMatchupSelector" class="matchup-selector-wrap"></div>
          <div id="sessionMatchupStats" class="matchup-stats-wrap"></div>
          <div id="sessionBreakdown"></div>
        </section>
        <section class="session-page-section">
          <h3>${escapeHtml(tr.sessionGames(session.games.length))}</h3>
          <div id="sessionGameListWrap" class="game-list-wrap"></div>
        </section>
      </div>
    `;

    const selectorEl = this.container.querySelector<HTMLElement>(
      "#sessionMatchupSelector",
    );
    const statsEl = this.container.querySelector<HTMLElement>(
      "#sessionMatchupStats",
    );

    const pairs = sessionResolved
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

    if (selectorEl && statsEl) {
      const statsView = new MatchupStatsView(statsEl);
      const renderSessionStats = (
        myChar: number | null,
        oppChar: number | null,
      ) => {
        if (myChar === null || oppChar === null) {
          statsEl.innerHTML = "";
          return;
        }
        const matchupGames = sessionResolved.filter(
          ({ summary, yourPort, oppPort }) => {
            const yourP = summary.ports.find((p) => p.port === yourPort);
            const oppP = summary.ports.find((p) => p.port === oppPort);
            return (
              yourP?.characterId === myChar && oppP?.characterId === oppChar
            );
          },
        );
        const rates = aggregateFilteredGames(matchupGames);
        statsView.render(myChar, oppChar, rates);
      };

      const selector = new MatchupChipSelector(
        selectorEl,
        (myChar, oppChar) => {
          this.sessionSelectedMyChar = myChar;
          this.sessionSelectedOppChar = oppChar;
          renderSessionStats(myChar, oppChar);
        },
      );

      selector.setSelected(
        this.sessionSelectedMyChar,
        this.sessionSelectedOppChar,
      );
      selector.setData(
        availableMyChars,
        getAvailableOppChars,
        true,
        myCharFrequencies,
        getOppCharFrequencies,
      );
      const sel = selector.getSelected();
      this.sessionSelectedMyChar = sel.myChar;
      this.sessionSelectedOppChar = sel.oppChar;
      renderSessionStats(sel.myChar, sel.oppChar);
    }

    const breakdownEl =
      this.container.querySelector<HTMLElement>("#sessionBreakdown");
    if (breakdownEl) new BreakdownTable(breakdownEl).render(breakdownRows);

    const linksEl = this.container.querySelector<HTMLElement>(
      "#sessionQuickSearchLinks",
    );
    if (linksEl) {
      linksEl.innerHTML = sessionQuickSearchLinks(session.id, playerName)
        .map(
          (link) =>
            `<a class="btn-secondary" href="${link.href}">${escapeHtml(
              tr[link.labelKey],
            )}</a>`,
        )
        .join(" ");
    }

    const videosSectionEl = this.container.querySelector<HTMLElement>(
      "#sessionVideosSection",
    );
    const videosEl =
      this.container.querySelector<HTMLElement>("#sessionVideos");
    if (videosSectionEl && videosEl && session.videoId) {
      videosSectionEl.hidden = false;
      videosEl.innerHTML = `<a href="https://www.youtube.com/watch?v=${encodeURIComponent(
        session.videoId,
      )}" target="_blank" rel="noopener">▶ ${escapeHtml(
        tr.vodWatchOnYouTube,
      )} ↗</a>`;
    }

    // Same game rows as the library and matchup pages. Ungrouped: this page
    // is already one session, so GameList's session header would just repeat
    // the page header above.
    const gameListWrap = this.container.querySelector<HTMLElement>(
      "#sessionGameListWrap",
    );
    if (gameListWrap) {
      const gameList = new GameList(
        gameListWrap,
        (newSort) => {
          this.sortOrder = newSort;
          this.render();
        },
        this.onSelectGame,
        this.onManualPerspectiveSet,
        this.onRemoveGame,
        this.onShowFailedEdgeGuards,
      );
      gameList.setGroupBySession(false);
      gameList.setShowGroupToggle(false);
      gameList.setSortOrder(this.sortOrder);
      const games = [...session.games];
      gameList.render(games, this.identity, games.length);
    }
  }
}
