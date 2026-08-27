import { t } from "../i18n.js";
import type { NeutralOpeningReason } from "../neutralHits.js";
import {
  computeReasonDifferentials,
  ratesToMinutes,
  type DerivedRates,
  type BaselineDeltas,
} from "../data/aggregate.js";

function reasonLabel(reason: NeutralOpeningReason): string {
  const tr = t();
  switch (reason) {
    case "shield-pressure":
      return tr.neutralReasonShieldPressure;
    case "landing-lag":
      return tr.neutralReasonLandingLag;
    case "whiff-punish":
      return tr.neutralReasonWhiffPunish;
    case "jump-punish":
      return tr.neutralReasonJumpPunish;
    case "standing-hit":
      return tr.neutralReasonStandingHit;
    case "reversal":
      return tr.neutralReasonReversal;
    case "unknown":
    default:
      return tr.neutralReasonUnknown;
  }
}

function fmtDelta(pp: number | null, baselinePct: number | null): string {
  const tr = t();
  if (pp === null || baselinePct === null) return tr.deltaNoData;
  const sign = pp > 0 ? "+" : "";
  return `${sign}${pp}pp <span class="neutral-score-delta-sub">${escapeHtml(tr.deltaVsBaseline(baselinePct))}</span>`;
}

function deltaClass(pp: number | null): string {
  if (pp === null) return "";
  return pp > 0 ? "delta-pos" : pp < 0 ? "delta-neg" : "";
}

export class NeutralScorePanel {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public render(
    rates: DerivedRates,
    baselineDeltas: BaselineDeltas | null,
    excludedGamesCount: number,
    includeExperimentation: boolean,
    onToggleExperimentation: (checked: boolean) => void,
  ): void {
    const tr = t();
    const hasData = rates.openingsWon + rates.openingsLost > 0;

    // All eligible games were filtered out by the effort/tier filter (§3.4) —
    // this is not "no data", it's "data exists but is currently excluded".
    if (!hasData && excludedGamesCount > 0 && !includeExperimentation) {
      this.container.innerHTML = `
        <div class="neutral-score-panel no-data">
          <div class="neutral-score-title">${escapeHtml(tr.neutralScoreLabel)}</div>
          <div class="neutral-score-empty">${escapeHtml(tr.experimentationCount(excludedGamesCount))}</div>
          <label class="experimentation-toggle-row">
            <input type="checkbox" id="experimentationToggle" />
            <span>${escapeHtml(tr.experimentationToggleLabel)}</span>
          </label>
        </div>
      `;
      const toggle = this.container.querySelector(
        "#experimentationToggle",
      ) as HTMLInputElement;
      toggle?.addEventListener("change", () => {
        onToggleExperimentation(toggle.checked);
      });
      return;
    }

    if (!hasData) {
      this.container.innerHTML = `
        <div class="neutral-score-panel no-data">
          <div class="neutral-score-title">${escapeHtml(tr.neutralScoreLabel)}</div>
          <div class="neutral-score-empty">${escapeHtml(tr.neutralScoreNoData)}</div>
        </div>
      `;
      return;
    }

    const minutes = ratesToMinutes(rates);
    const openingsPerMinute =
      minutes > 0 ? (rates.openingsWon + rates.openingsLost) / minutes : null;

    const share = rates.openingShare;
    const barWidth =
      share !== null ? Math.max(0, Math.min(100, Math.round(share))) : 0;

    const differentials = computeReasonDifferentials(rates).filter(
      (d) =>
        (rates.openingsWonByReason[d.reason] ?? 0) +
          (rates.openingsLostByReason[d.reason] ?? 0) >
        0,
    );

    const fingerprintRows = differentials
      .map((d) => {
        const won = d.wonPct !== null ? `${Math.round(d.wonPct)}%` : "—";
        const lost = d.lostPct !== null ? `${Math.round(d.lostPct)}%` : "—";
        const diff =
          d.differential !== null
            ? `${d.differential > 0 ? "+" : ""}${Math.round(d.differential)}`
            : "—";
        return `
          <tr>
            <td>${escapeHtml(reasonLabel(d.reason))}</td>
            <td>${won}</td>
            <td>${lost}</td>
            <td class="${deltaClass(d.differential)}">${diff}</td>
          </tr>
        `;
      })
      .join("");

    this.container.innerHTML = `
      <div class="neutral-score-panel">
        <div class="neutral-score-headline">
          <div class="neutral-score-title">${escapeHtml(tr.neutralScoreLabel)}</div>
          <div class="neutral-score-value">${share !== null ? Math.round(share) + "%" : "—"}</div>
          <div class="neutral-score-bar-wrap">
            <div class="neutral-score-bar" style="width: ${barWidth}%;"></div>
          </div>
          <div class="neutral-score-fraction">
            ${escapeHtml(tr.neutralScoreFraction(rates.openingsWon, rates.openingsLost))}
            ${openingsPerMinute !== null ? `· ${escapeHtml(tr.perMinuteUnit(openingsPerMinute.toFixed(1)))}` : ""}
          </div>
        </div>

        <div class="neutral-score-support-grid">
          <div class="support-stat">
            <div class="support-stat-label">${escapeHtml(tr.conversionLabel)}</div>
            <div class="support-stat-value">
              ${
                rates.damagePerOpening !== null
                  ? escapeHtml(
                      tr.conversionSummary(
                        rates.damagePerOpening.toFixed(1),
                        Math.round(rates.conversionToKillPct ?? 0),
                      ),
                    )
                  : "—"
              }
            </div>
          </div>
          <div class="support-stat">
            <div class="support-stat-label">${escapeHtml(tr.advantageRetentionLabel)}</div>
            <div class="support-stat-value">
              ${
                rates.leakPerOpening !== null
                  ? escapeHtml(
                      tr.advantageRetentionSummary(
                        rates.leakPerOpening.toFixed(1),
                      ),
                    )
                  : "—"
              }
            </div>
          </div>
          <div class="support-stat">
            <div class="support-stat-label">${escapeHtml(tr.recoveryDeltaLabel)}</div>
            <div class="support-stat-value ${deltaClass(baselineDeltas?.recoveryDeltaPct ?? null)}">
              ${fmtDelta(baselineDeltas?.recoveryDeltaPct ?? null, baselineDeltas?.recoveryBaselinePct ?? null)}
            </div>
          </div>
          <div class="support-stat">
            <div class="support-stat-label">${escapeHtml(tr.edgeGuardDeltaLabel)}</div>
            <div class="support-stat-value ${deltaClass(baselineDeltas?.edgeGuardDeltaPct ?? null)}">
              ${fmtDelta(baselineDeltas?.edgeGuardDeltaPct ?? null, baselineDeltas?.edgeGuardBaselinePct ?? null)}
            </div>
          </div>
        </div>

        ${
          fingerprintRows
            ? `
        <div class="neutral-fingerprint">
          <div class="neutral-fingerprint-title">${escapeHtml(tr.neutralFingerprintTitle)}</div>
          <table class="neutral-fingerprint-table">
            <thead>
              <tr>
                <th>${escapeHtml(tr.fingerprintReasonCol)}</th>
                <th>${escapeHtml(tr.fingerprintWonCol)}</th>
                <th>${escapeHtml(tr.fingerprintLostCol)}</th>
                <th>${escapeHtml(tr.fingerprintDiffCol)}</th>
              </tr>
            </thead>
            <tbody>${fingerprintRows}</tbody>
          </table>
        </div>
        `
            : ""
        }

        <label class="experimentation-toggle-row">
          <input type="checkbox" id="experimentationToggle" ${includeExperimentation ? "checked" : ""} />
          <span>${escapeHtml(tr.experimentationToggleLabel)}</span>
          ${excludedGamesCount > 0 ? `<span class="experimentation-count">${escapeHtml(tr.experimentationCount(excludedGamesCount))}</span>` : ""}
        </label>
      </div>
    `;

    const toggle = this.container.querySelector(
      "#experimentationToggle",
    ) as HTMLInputElement;
    toggle?.addEventListener("change", () => {
      onToggleExperimentation(toggle.checked);
    });
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
