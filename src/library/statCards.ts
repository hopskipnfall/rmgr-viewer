import { t } from "../i18n.js";
import type { DerivedRates, RateDeltas } from "../data/aggregate.js";
import { edgeGuardEffectivenessGrade } from "../classifiedSituations.js";

export class StatCards {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public render(
    rates: DerivedRates,
    deltas: RateDeltas | null,
    showDeltas: boolean,
  ): void {
    const tr = t();

    const renderCard = (
      title: string,
      pct: number | null,
      successes: number,
      total: number,
      delta: number | null,
      isHitsRate = false,
      hitsValue: number | null = null,
      totalHits = 0,
      stocks = 0,
      customFraction?: string,
      isGradeRate = false,
      gradeAvg: number | null = null,
    ): string => {
      const isLowN = isHitsRate
        ? stocks < 5
        : isGradeRate
          ? total < 10 && total > 0
          : total < 10 && total > 0;
      const hasData = isHitsRate
        ? stocks > 0
        : isGradeRate
          ? gradeAvg !== null
          : total > 0;

      let valueDisplay = "—";
      const fractionDisplay =
        customFraction ??
        (isHitsRate
          ? tr.hitsPerStockFraction(totalHits, stocks)
          : `${successes}/${total}`);

      if (isHitsRate) {
        valueDisplay =
          hitsValue !== null ? tr.hitsPerStockUnit(hitsValue.toFixed(1)) : "—";
      } else if (isGradeRate) {
        valueDisplay =
          gradeAvg !== null ? edgeGuardEffectivenessGrade(gradeAvg) : "—";
      } else if (pct !== null) {
        valueDisplay = `${Math.round(pct)}%`;
      }

      const barWidth = isHitsRate
        ? Math.min(100, hitsValue !== null ? hitsValue * 15 : 0)
        : isGradeRate
          ? gradeAvg !== null
            ? Math.max(0, Math.min(100, ((gradeAvg + 50) / 150) * 100))
            : 0
          : pct !== null
            ? Math.max(0, Math.min(100, Math.round(pct)))
            : 0;

      let deltaMarkup = "";
      if (showDeltas && delta !== null) {
        const sign = delta > 0 ? "▲" : delta < 0 ? "▼" : "";
        const absVal = Math.abs(delta);
        const deltaClass = isHitsRate
          ? delta < 0
            ? "delta-pos" // Fewer hits to take a stock is better
            : delta > 0
              ? "delta-neg"
              : ""
          : delta > 0
            ? "delta-pos"
            : delta < 0
              ? "delta-neg"
              : "";

        deltaMarkup = `
          <span class="stat-card-delta ${deltaClass}">
            ${sign}${absVal}${isHitsRate || isGradeRate ? "" : "%"} ${escapeHtml(tr.vsAll(""))}
          </span>
        `;
      }

      return `
        <div class="stat-card ${!hasData ? "no-data" : ""}">
          <div class="stat-card-header">
            <span class="stat-card-title">${escapeHtml(title)}</span>
            ${isLowN ? `<span class="low-n-badge" title="Low sample size">⚠ ${escapeHtml(tr.lowSampleWarning)}</span>` : ""}
          </div>
          <div class="stat-card-value">${valueDisplay}</div>
          <div class="stat-card-bar-wrap">
            <div class="stat-card-bar ${isLowN ? "low-n" : ""}" style="width: ${barWidth}%;"></div>
          </div>
          <div class="stat-card-footer">
            <span class="stat-card-fraction">${escapeHtml(fractionDisplay)}</span>
            ${deltaMarkup}
          </div>
        </div>
      `;
    };

    this.container.innerHTML = `
      <div class="stat-cards-grid">
        ${renderCard(
          tr.winRate,
          rates.winRatePct,
          rates.wins,
          rates.wins + rates.losses,
          deltas?.winRatePctDelta ?? null,
          false,
          null,
          0,
          0,
          tr.gamesWonFraction(rates.wins, rates.totalGames),
        )}
        ${renderCard(
          tr.recovery,
          rates.recoveryPct,
          rates.recoverySuccesses,
          rates.recoveryTotal,
          deltas?.recoveryPctDelta ?? null,
        )}
        ${renderCard(
          tr.edgeGuardEffectivenessLabel,
          null,
          0,
          rates.edgeGuardEffectivenessCount,
          deltas?.edgeGuardEffectivenessDelta ?? null,
          false,
          null,
          0,
          0,
          tr.edgeGuardEffectivenessSummary(rates.edgeGuardEffectivenessCount),
          true,
          rates.edgeGuardEffectivenessAvg,
        )}
        ${renderCard(
          tr.ledgeGetup,
          rates.ledgeGetupPct,
          rates.ledgeGetupSuccesses,
          rates.ledgeGetupTotal,
          deltas?.ledgeGetupPctDelta ?? null,
        )}
        ${renderCard(
          tr.ledgeTrap,
          rates.ledgeTrapPct,
          rates.ledgeTrapSuccesses,
          rates.ledgeTrapTotal,
          deltas?.ledgeTrapPctDelta ?? null,
        )}
        ${renderCard(
          tr.angelAvoid,
          rates.angelAvoidPct,
          rates.angelAvoidSuccesses,
          rates.angelAvoidTotal,
          deltas?.angelAvoidPctDelta ?? null,
        )}
        ${renderCard(
          tr.neutralHitsPerStock,
          null,
          0,
          0,
          deltas?.neutralHitsPerStockDelta ?? null,
          true,
          rates.neutralHitsPerStock,
          rates.neutralHitsLanded,
          rates.stocksTaken,
        )}
      </div>
    `;
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
