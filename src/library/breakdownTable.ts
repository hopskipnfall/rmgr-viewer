import { t } from "../i18n.js";
import { characterName, getCharacterGroup } from "../lookups.js";
import type { CharacterBreakdownRow } from "../data/aggregate.js";

export class BreakdownTable {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public render(rows: CharacterBreakdownRow[]): void {
    const tr = t();

    if (rows.length === 0) {
      this.container.innerHTML = "";
      return;
    }

    const fmtPct = (pct: number | null, total: number): string => {
      if (pct === null || total === 0) return "—";
      const isLowN = total < 10;
      return `${Math.round(pct)}%${isLowN ? ' <span class="table-low-n" title="Low sample size">⚠</span>' : ""}`;
    };

    const fmtHits = (hits: number | null, stocks: number): string => {
      if (hits === null || stocks === 0) return "—";
      const isLowN = stocks < 5;
      return `${hits.toFixed(1)}${isLowN ? ' <span class="table-low-n" title="Low sample size">⚠</span>' : ""}`;
    };

    const naRows = rows.filter(
      (r) => getCharacterGroup(r.characterId) === "na",
    );
    const jpRows = rows.filter(
      (r) => getCharacterGroup(r.characterId) === "jp",
    );
    const remixRows = rows.filter(
      (r) => getCharacterGroup(r.characterId) === "remix",
    );

    const sections = [
      { name: tr.characterGroupNA, rows: naRows },
      { name: tr.characterGroupJP, rows: jpRows },
      { name: tr.characterGroupRemix, rows: remixRows },
    ].filter((s) => s.rows.length > 0);

    const renderTable = (sectionRows: CharacterBreakdownRow[]) => `
      <div class="breakdown-table-wrap">
        <table class="breakdown-table">
          <thead>
            <tr>
              <th>${escapeHtml(tr.characterCol)}</th>
              <th>${escapeHtml(tr.gamesCol)}</th>
              <th>${escapeHtml(tr.winLossCol)}</th>
              <th>${escapeHtml(tr.recovCol)}</th>
              <th>${escapeHtml(tr.edgeGCol)}</th>
              <th>${escapeHtml(tr.ledgeGCol)}</th>
              <th>${escapeHtml(tr.ledgeTCol)}</th>
              <th>${escapeHtml(tr.angelCol)}</th>
              <th>${escapeHtml(tr.nhPerStockCol)}</th>
            </tr>
          </thead>
          <tbody>
            ${sectionRows
              .map((row) => {
                const char = characterName(row.characterId);
                const r = row.rates;
                return `
                <tr>
                  <td class="col-char"><strong>${escapeHtml(char)}</strong></td>
                  <td class="col-games">${row.games}</td>
                  <td class="col-wl">${row.wins}-${row.losses}</td>
                  <td class="col-stat">${fmtPct(r.recoveryPct, r.recoveryTotal)}</td>
                  <td class="col-stat">${fmtPct(r.edgeGuardPct, r.edgeGuardTotal)}</td>
                  <td class="col-stat">${fmtPct(r.ledgeGetupPct, r.ledgeGetupTotal)}</td>
                  <td class="col-stat">${fmtPct(r.ledgeTrapPct, r.ledgeTrapTotal)}</td>
                  <td class="col-stat">${fmtPct(r.angelAvoidPct, r.angelAvoidTotal)}</td>
                  <td class="col-stat">${fmtHits(r.neutralHitsPerStock, r.stocksTaken)}</td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    this.container.innerHTML = `
      <div class="breakdown-section-header">
        <h3>${escapeHtml(tr.byOpponentCharacter)}</h3>
      </div>
      ${sections
        .map(
          (section) => `
        <div class="breakdown-group-section">
          <div class="breakdown-group-title">${escapeHtml(section.name)}</div>
          ${renderTable(section.rows)}
        </div>
      `,
        )
        .join("")}
    `;
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
