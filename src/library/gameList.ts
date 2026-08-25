import { t } from "../i18n.js";
import { characterName, stageName } from "../lookups.js";
import type { GameSummary } from "../data/gameSummary.js";
import {
  type Identity,
  resolvePerspectivePort,
  resolveOpponentPort,
} from "../data/identity.js";

function formatDuration(frames: number): string {
  const totalSecs = Math.floor(frames / 60);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(date: Date): string {
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const mins = date.getMinutes().toString().padStart(2, "0");
  return `${month} ${day} ${hours}:${mins}`;
}

export class GameList {
  private container: HTMLElement;
  private sortOrder: "newest" | "oldest" = "newest";
  private onSortChanged: (sort: "newest" | "oldest") => void;
  private onSelectGame: (summary: GameSummary) => void;
  private onManualPerspectiveSet: (
    summary: GameSummary,
    port: 0 | 1 | 2 | 3,
  ) => void;
  private onRemoveGame: (id: string) => void;

  constructor(
    container: HTMLElement,
    onSortChanged: (sort: "newest" | "oldest") => void,
    onSelectGame: (summary: GameSummary) => void,
    onManualPerspectiveSet: (summary: GameSummary, port: 0 | 1 | 2 | 3) => void,
    onRemoveGame: (id: string) => void,
  ) {
    this.container = container;
    this.onSortChanged = onSortChanged;
    this.onSelectGame = onSelectGame;
    this.onManualPerspectiveSet = onManualPerspectiveSet;
    this.onRemoveGame = onRemoveGame;
  }

  public setSortOrder(sort: "newest" | "oldest"): void {
    this.sortOrder = sort;
  }

  public render(
    summaries: GameSummary[],
    identity: Identity,
    filteredCount: number,
  ): void {
    const tr = t();

    // Sort summaries
    const sorted = [...summaries].sort((a, b) => {
      const timeA = a.recordedAt.getTime();
      const timeB = b.recordedAt.getTime();
      return this.sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

    this.container.innerHTML = `
      <div class="game-list-header">
        <h3>${escapeHtml(tr.gamesListHeader(filteredCount))}</h3>
        <div class="game-list-sort">
          <select id="gameSortSelect">
            <option value="newest" ${this.sortOrder === "newest" ? "selected" : ""}>
              ${escapeHtml(tr.sortNewestFirst)}
            </option>
            <option value="oldest" ${this.sortOrder === "oldest" ? "selected" : ""}>
              ${escapeHtml(tr.sortOldestFirst)}
            </option>
          </select>
        </div>
      </div>

      <div class="game-list-rows">
        ${
          sorted.length === 0
            ? `<div class="game-list-empty">${escapeHtml(tr.noGamesMatched)}</div>`
            : sorted
                .map((summary) =>
                  this.renderGameRow(summary, identity, sorted.length === 1),
                )
                .join("")
        }
      </div>
    `;

    const sortSelect = this.container.querySelector(
      "#gameSortSelect",
    ) as HTMLSelectElement;
    sortSelect?.addEventListener("change", () => {
      this.sortOrder = sortSelect.value as "newest" | "oldest";
      this.onSortChanged(this.sortOrder);
    });

    // Attach row click, inline button, and remove button event listeners
    const rows = this.container.querySelectorAll<HTMLElement>(".game-row");
    rows.forEach((row) => {
      const id = row.dataset.id;
      const summary = summaries.find((s) => s.id === id);
      if (!summary) return;

      row.addEventListener("click", () => {
        this.onSelectGame(summary);
      });

      // Remove game button
      const removeBtn =
        row.querySelector<HTMLButtonElement>(".remove-game-btn");
      removeBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.onRemoveGame(summary.id);
      });

      // Inline manual perspective buttons
      const inlineBtns = row.querySelectorAll<HTMLButtonElement>(
        ".inline-perspective-btn",
      );
      inlineBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const port = Number(btn.dataset.port) as 0 | 1 | 2 | 3;
          this.onManualPerspectiveSet(summary, port);
        });
      });
    });
  }

  private renderGameRow(
    summary: GameSummary,
    identity: Identity,
    isSingleGame: boolean = false,
  ): string {
    const tr = t();
    const is2Player = summary.ports.length === 2;
    const stage = stageName(summary.stageId);
    const dateStr = formatDate(summary.recordedAt);
    const duration = formatDuration(summary.frameCount);
    const pulseClass = isSingleGame ? "single-game-pulse" : "";

    if (!is2Player) {
      return `
        <div class="game-row unsupported ${pulseClass}" data-id="${summary.id}">
          <div class="game-row-meta">
            <span class="game-date">${escapeHtml(dateStr)}</span>
            <span class="meta-dot">·</span>
            <span class="game-stage">${escapeHtml(stage)}</span>
            <span class="meta-dot">·</span>
            <span class="game-duration">${duration}</span>
            <span class="unsupported-badge">${escapeHtml(tr.notSupportedPlayers)}</span>
          </div>
          <div class="game-row-players">
            ${summary.ports.map((p) => `${escapeHtml(p.playerName || `P${p.port + 1}`)} (${escapeHtml(characterName(p.characterId))})`).join(" vs ")}
          </div>
          <div class="game-row-actions">
            <button class="remove-game-btn" title="${escapeHtml(tr.removeGame)}">✕</button>
            <span class="drill-in-arrow">›</span>
          </div>
        </div>
      `;
    }

    const yourPort = resolvePerspectivePort(summary, identity);
    const isAmbiguous = yourPort === null;

    if (isAmbiguous) {
      const port0 = summary.ports[0]!;
      const port1 = summary.ports[1]!;

      const label0 = port0.playerName || characterName(port0.characterId);
      const label1 = port1.playerName || characterName(port1.characterId);

      return `
        <div class="game-row ambiguous ${pulseClass}" data-id="${summary.id}">
          <div class="game-row-meta">
            <span class="ambiguous-badge">⚠</span>
            <span class="game-date">${escapeHtml(dateStr)}</span>
            <span class="meta-dot">·</span>
            <span class="game-stage">${escapeHtml(stage)}</span>
            <span class="meta-dot">·</span>
            <span class="game-duration">${duration}</span>
          </div>
          <div class="game-row-players">
            <strong>${escapeHtml(port0.playerName || `P${port0.port + 1}`)}</strong>
            <span class="char-label">(${escapeHtml(characterName(port0.characterId))})</span>
            <span class="vs-label">vs</span>
            <strong>${escapeHtml(port1.playerName || `P${port1.port + 1}`)}</strong>
            <span class="char-label">(${escapeHtml(characterName(port1.characterId))})</span>
          </div>
          <div class="game-row-actions">
            <div class="inline-perspective-actions">
              <button class="inline-perspective-btn" data-port="${port0.port}">
                ${escapeHtml(tr.imPlayer(label0))}
              </button>
              <button class="inline-perspective-btn" data-port="${port1.port}">
                ${escapeHtml(tr.imPlayer(label1))}
              </button>
            </div>
            <button class="remove-game-btn" title="${escapeHtml(tr.removeGame)}">✕</button>
            <span class="drill-in-arrow">›</span>
          </div>
        </div>
      `;
    }

    const oppPort = resolveOpponentPort(summary, yourPort)!;
    const yourP = summary.ports.find((p) => p.port === yourPort)!;
    const oppP = summary.ports.find((p) => p.port === oppPort)!;

    const yourName = yourP.playerName || `P${yourP.port + 1}`;
    const oppName = oppP.playerName || `P${oppP.port + 1}`;

    let resultBadge = "";
    if (yourP.finalStocks >= 0 && oppP.finalStocks >= 0) {
      if (yourP.finalStocks > oppP.finalStocks) {
        resultBadge = `<span class="result-badge win">🏆 ${escapeHtml(tr.win)}</span>`;
      } else if (oppP.finalStocks > yourP.finalStocks) {
        resultBadge = `<span class="result-badge loss">${escapeHtml(tr.loss)}</span>`;
      }
    }

    return `
      <div class="game-row ${pulseClass} ${yourP.finalStocks > oppP.finalStocks ? "row-won" : yourP.finalStocks < oppP.finalStocks ? "row-lost" : ""}" data-id="${summary.id}">
        <div class="game-row-meta">
          <span class="game-date">${escapeHtml(dateStr)}</span>
          <span class="meta-dot">·</span>
          <span class="game-stage">${escapeHtml(stage)}</span>
          <span class="meta-dot">·</span>
          <span class="game-duration">${duration}</span>
        </div>
        <div class="game-row-players">
          <strong class="you-player">${escapeHtml(yourName)}</strong>
          <span class="char-label">(${escapeHtml(characterName(yourP.characterId))})</span>
          <span class="vs-label">vs</span>
          <span class="opp-player">${escapeHtml(oppName)}</span>
          <span class="char-label">(${escapeHtml(characterName(oppP.characterId))})</span>
        </div>
        <div class="game-row-actions">
          ${resultBadge}
          <button class="remove-game-btn" title="${escapeHtml(tr.removeGame)}">✕</button>
          <span class="drill-in-arrow">›</span>
        </div>
      </div>
    `;
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
