import { t, type Translations } from "../i18n.js";
import { characterName } from "../lookups.js";
import { characterIconHtml } from "../characterIcons.js";
import type { GameSummary } from "../data/gameSummary.js";
import type { Identity } from "../data/identity.js";
import {
  filterGameSummaries,
  aggregateFilteredGames,
  type DerivedRates,
} from "../data/aggregate.js";
import { edgeGuardEffectivenessGrade } from "../classifiedSituations.js";
import { GameList } from "../library/gameList.js";
import type { SessionGroup } from "../data/session.js";

function fmtPooled(successes: number, total: number): string {
  if (total === 0) return "—";
  const pct = Math.round((successes / total) * 100);
  return `${successes}/${total} = ${pct}%`;
}

function fmtGrade(avg: number | null, count: number, tr: Translations): string {
  if (avg === null || count === 0) return "—";
  return `${edgeGuardEffectivenessGrade(avg)} (${avg.toFixed(0)}) — ${tr.matchupSituationsCount(count)}`;
}

function fmtHits(
  hits: number | null,
  stocks: number,
  tr: Translations,
): string {
  if (hits === null || stocks === 0) return "—";
  return tr.matchupPerStock(hits, stocks);
}

export class MatchupViewController {
  private container: HTMLElement;
  private onSelectGame: (summary: GameSummary) => void;
  private onManualPerspectiveSet: (
    summary: GameSummary,
    port: 0 | 1 | 2 | 3,
  ) => void;
  private onRemoveGame: (id: string) => void;
  private onShowFailedEdgeGuards: (session: SessionGroup) => void;
  private sortOrder: "newest" | "oldest" = "newest";

  constructor(
    container: HTMLElement,
    onSelectGame: (summary: GameSummary) => void,
    onManualPerspectiveSet: (summary: GameSummary, port: 0 | 1 | 2 | 3) => void,
    onRemoveGame: (id: string) => void,
    onShowFailedEdgeGuards: (session: SessionGroup) => void,
  ) {
    this.container = container;
    this.onSelectGame = onSelectGame;
    this.onManualPerspectiveSet = onManualPerspectiveSet;
    this.onRemoveGame = onRemoveGame;
    this.onShowFailedEdgeGuards = onShowFailedEdgeGuards;
  }

  public render(
    myChar: number,
    oppChar: number,
    summaries: GameSummary[],
    identity: Identity,
  ): void {
    const tr = t();

    // JP and NA Original-12 variants are NOT pooled here -- exact character
    // ID match only (docs/product/README.md; per Jonn, J and U are
    // effectively different games).
    const matchupGames = filterGameSummaries(summaries, identity, {
      yourCharacterId: myChar,
      oppCharacterId: oppChar,
    });

    const rates: DerivedRates = aggregateFilteredGames(matchupGames);
    const excludedRecovery = rates.totalGames - rates.dreamLandGames;

    this.container.innerHTML = `
      <div class="matchup-view">
        <div class="matchup-header">
          <h2>${characterIconHtml(myChar, "char-icon", { showBadge: false })} ${escapeHtml(characterName(myChar))} ${escapeHtml(tr.matchupVs)} ${characterIconHtml(oppChar, "char-icon", { showBadge: false })} ${escapeHtml(characterName(oppChar))}</h2>
          <div class="matchup-subheader">${rates.wins}-${rates.losses} &middot; ${rates.totalGames} ${tr.matchupGamesWord}</div>
        </div>

        <div class="breakdown-section-header">
          <h3>${escapeHtml(tr.matchupStatsSectionTitle)}</h3>
        </div>
        <div class="matchup-stats-grid">
          ${statCard(tr.recovCol, fmtPooled(rates.recoverySuccesses, rates.recoveryTotal), excludedRecovery > 0 ? tr.matchupExcludedGames(excludedRecovery) : "")}
          ${statCard(tr.matchupEdgeGuardEffectivenessLabel, fmtGrade(rates.edgeGuardEffectivenessAvg, rates.edgeGuardEffectivenessCount, tr), "")}
          ${statCard(tr.matchupEdgeGuardConversionLabel, fmtPooled(rates.edgeGuardConversionKills, rates.edgeGuardConversionTotal), "")}
          ${statCard(tr.ledgeGCol, fmtPooled(rates.ledgeGetupSuccesses, rates.ledgeGetupTotal), "")}
          ${statCard(tr.ledgeTCol, fmtPooled(rates.ledgeTrapSuccesses, rates.ledgeTrapTotal), "")}
          ${statCard(tr.matchupOpeningShareLabel, rates.openingShare !== null ? fmtPooled(rates.openingsWon, rates.openingsWon + rates.openingsLost) : "—", "")}
          ${statCard(tr.matchupDamagePerOpeningLabel, rates.damagePerOpening !== null ? `${rates.damagePerOpening.toFixed(1)}%` : "—", "")}
          ${statCard(tr.matchupKillConversionLabel, fmtPooled(rates.openingsConvertedToKill, rates.openingsWon), "")}
          ${statCard(tr.nhPerStockCol, fmtHits(rates.neutralHitsPerStock, rates.stocksTaken, tr), "")}
        </div>

        <div class="matchup-workshop-banner">
          <a href="#/matchup/${myChar}/${oppChar}/recoveries" class="matchup-workshop-btn" id="matchupWorkshopBtn">
            <span class="matchup-workshop-btn-icon">🎯</span>
            <span class="matchup-workshop-btn-text">
              <span class="matchup-workshop-btn-title">${escapeHtml(tr.matchupEdgeGuardWorkshopBtn)}</span>
              <span class="matchup-workshop-btn-desc">Visualize recovery starting positions & replay edge guards</span>
            </span>
            <span class="matchup-workshop-btn-arrow">&rarr;</span>
          </a>
        </div>

        <div id="matchupGameListWrap" class="game-list-wrap"></div>
      </div>
    `;

    const gameListWrap = this.container.querySelector(
      "#matchupGameListWrap",
    ) as HTMLElement;
    const gameList = new GameList(
      gameListWrap,
      (newSort) => {
        this.sortOrder = newSort;
        this.render(myChar, oppChar, summaries, identity);
      },
      this.onSelectGame,
      this.onManualPerspectiveSet,
      this.onRemoveGame,
      this.onShowFailedEdgeGuards,
    );
    gameList.setSortOrder(this.sortOrder);
    const matchupSummaries = matchupGames.map((g) => g.summary);
    gameList.render(matchupSummaries, identity, matchupSummaries.length);
  }
}

function statCard(label: string, value: string, note: string): string {
  return `
    <div class="matchup-stat-card">
      <div class="matchup-stat-label">${escapeHtml(label)}</div>
      <div class="matchup-stat-value">${escapeHtml(value)}</div>
      ${note ? `<div class="matchup-stat-note">${escapeHtml(note)}</div>` : ""}
    </div>
  `;
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
