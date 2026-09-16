import { t } from "../i18n.js";
import { characterName, getCharacterGroup } from "../lookups.js";
import { characterIconHtml } from "../characterIcons.js";

export interface MatchupRow {
  myChar: number;
  oppChar: number;
  games: number;
}

/**
 * Derives the list of matchups the identity actually has games for, from the
 * library's full (unfiltered by UI dropdowns) resolved-game list.
 *
 * JP and NA Original-12 variants are NOT pooled: per Jonn, the J and U
 * versions are effectively different games whose players rarely cross over,
 * so "J-Pikachu vs J-Kirby" and "U-Pikachu vs U-Kirby" are distinct
 * matchups. A game with one J and one U character is listed as whatever
 * exact pair it is -- no special-casing.
 */
export function computeMatchupRows(
  resolvedGames: { yourCharId: number; oppCharId: number }[],
): MatchupRow[] {
  const counts = new Map<string, MatchupRow>();
  for (const { yourCharId, oppCharId } of resolvedGames) {
    const key = `${yourCharId}:${oppCharId}`;
    const existing = counts.get(key);
    if (existing) {
      existing.games++;
    } else {
      counts.set(key, { myChar: yourCharId, oppChar: oppCharId, games: 1 });
    }
  }
  return Array.from(counts.values()).sort((a, b) => b.games - a.games);
}

/**
 * Grid layout: rows are "my" characters, columns are opponent characters,
 * cells are game counts. Much more compact than one line per matchup once
 * there are more than a handful of pairings.
 */
function renderGrid(
  sectionRows: MatchupRow[],
  onCellClick: (myChar: number, oppChar: number) => void,
): HTMLElement {
  const byChar = (a: number, b: number) =>
    characterName(a).localeCompare(characterName(b));

  const myChars = Array.from(new Set(sectionRows.map((r) => r.myChar))).sort(
    byChar,
  );
  const oppChars = Array.from(new Set(sectionRows.map((r) => r.oppChar))).sort(
    byChar,
  );

  const games = new Map<string, number>();
  for (const row of sectionRows) {
    games.set(`${row.myChar}:${row.oppChar}`, row.games);
  }

  const wrap = document.createElement("div");
  wrap.className = "breakdown-table-wrap";
  wrap.innerHTML = `
    <table class="breakdown-table matchup-grid-table">
      <thead>
        <tr>
          <th class="matchup-grid-corner"></th>
          ${oppChars
            .map(
              (oppChar) => `
            <th class="matchup-grid-col-header" title="${escapeHtml(characterName(oppChar))}">
              ${characterIconHtml(oppChar)}
            </th>
          `,
            )
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${myChars
          .map(
            (myChar) => `
          <tr>
            <th class="matchup-grid-row-header" title="${escapeHtml(characterName(myChar))}">
              ${characterIconHtml(myChar)}
            </th>
            ${oppChars
              .map((oppChar) => {
                const count = games.get(`${myChar}:${oppChar}`);
                return count
                  ? `<td class="matchup-grid-cell" data-my="${myChar}" data-opp="${oppChar}">${count}</td>`
                  : `<td class="matchup-grid-cell matchup-grid-cell-empty"></td>`;
              })
              .join("")}
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;

  wrap
    .querySelectorAll<HTMLElement>(".matchup-grid-cell[data-my]")
    .forEach((el) => {
      el.addEventListener("click", () => {
        onCellClick(Number(el.dataset.my), Number(el.dataset.opp));
      });
    });

  return wrap;
}

export class MatchupPicker {
  private container: HTMLElement;
  private onSelect: (myChar: number, oppChar: number) => void;

  constructor(
    container: HTMLElement,
    onSelect: (myChar: number, oppChar: number) => void,
  ) {
    this.container = container;
    this.onSelect = onSelect;
  }

  public render(rows: MatchupRow[]): void {
    const tr = t();

    if (rows.length === 0) {
      this.container.innerHTML = "";
      return;
    }

    // Grouped by the opponent character's region, same convention as the
    // "By Opponent Character" breakdown table -- keeps J and U visually
    // separate rather than pooled.
    const naRows = rows.filter((r) => getCharacterGroup(r.oppChar) === "na");
    const jpRows = rows.filter((r) => getCharacterGroup(r.oppChar) === "jp");
    const remixRows = rows.filter(
      (r) => getCharacterGroup(r.oppChar) === "remix",
    );

    const sections = [
      { name: tr.characterGroupNA, rows: naRows },
      { name: tr.characterGroupJP, rows: jpRows },
      { name: tr.characterGroupRemix, rows: remixRows },
    ].filter((s) => s.rows.length > 0);

    // The "Matchups" title lives in libraryView's collapsible <summary>.
    this.container.innerHTML = "";

    for (const section of sections) {
      const sectionEl = document.createElement("div");
      sectionEl.className = "breakdown-group-section";
      sectionEl.innerHTML = `<div class="breakdown-group-title">${escapeHtml(section.name)}</div>`;
      sectionEl.appendChild(
        renderGrid(section.rows, (myChar, oppChar) =>
          this.onSelect(myChar, oppChar),
        ),
      );
      this.container.appendChild(sectionEl);
    }
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
