import { t, type Translations } from "../i18n.js";
import { characterName } from "../lookups.js";
import { characterIconHtml } from "../characterIcons.js";
import type { DerivedRates } from "../data/aggregate.js";
import { edgeGuardEffectivenessGrade } from "../classifiedSituations.js";
import type { MicroStatId } from "../microStats.js";

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

function statCard(label: string, value: string, note: string): string {
  return `
    <div class="matchup-stat-card">
      <div class="matchup-stat-label">${escapeHtml(label)}</div>
      <div class="matchup-stat-value">${escapeHtml(value)}</div>
      ${note ? `<div class="matchup-stat-note">${escapeHtml(note)}</div>` : ""}
    </div>
  `;
}

/**
 * Granular/secondary stats (see microStats.ts) tucked behind a native <details> disclosure so
 * they're available without cluttering the always-visible stat cards above.
 */
function microStatsSectionHtml(rates: DerivedRates, tr: Translations): string {
  const rows: [MicroStatId, string][] = [
    ["smash-forward", tr.microStatsForwardSmashLabel],
    ["smash-up", tr.microStatsUpSmashLabel],
    ["smash-down", tr.microStatsDownSmashLabel],
    ["utilt-pikachu", tr.microStatsUpTiltPikachuLabel],
    ["utilt-ness", tr.microStatsUpTiltNessLabel],
    ["utilt-yoshi", tr.microStatsUpTiltYoshiLabel],
    ["utilt-link", tr.microStatsUpTiltLinkLabel],
  ];

  const cards = rows
    .map(([id, label]) => {
      const count = rates.microStats[id];
      if (!count) return "";
      return statCard(label, tr.microStatsRowSummary(count), "");
    })
    .join("");

  if (!cards) return "";

  return `
    <details class="matchup-secondary-stats">
      <summary>${escapeHtml(tr.matchupSecondaryStatsSummary)}</summary>
      <div class="matchup-stats-grid">${cards}</div>
    </details>
  `;
}

function escapeHtml(s: string): string {
  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export class MatchupStatsView {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public render(myChar: number, oppChar: number, rates: DerivedRates): void {
    const tr = t();

    if (rates.totalGames === 0) {
      this.container.innerHTML = `
        <div class="matchup-view-empty">
          <p class="text-dim">${escapeHtml(tr.noMatchupGames)}</p>
        </div>
      `;
      return;
    }

    const excludedRecovery = rates.totalGames - rates.dreamLandGames;
    const winRateDisplay =
      rates.winRatePct !== null ? `${Math.round(rates.winRatePct)}%` : "—";

    this.container.innerHTML = `
      <div class="matchup-view">
        <div class="matchup-header">
          <h2>${characterIconHtml(myChar, "char-icon", { showBadge: false })} ${escapeHtml(characterName(myChar))} ${escapeHtml(tr.matchupVs)} ${characterIconHtml(oppChar, "char-icon", { showBadge: false })} ${escapeHtml(characterName(oppChar))}</h2>
          <div class="matchup-subheader">${rates.wins}-${rates.losses} (${winRateDisplay}) &middot; ${rates.totalGames} ${tr.matchupGamesWord}</div>
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
        ${microStatsSectionHtml(rates, tr)}
      </div>
    `;
  }
}
