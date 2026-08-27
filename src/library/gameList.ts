import { t } from "../i18n.js";
import { characterName, stageName } from "../lookups.js";
import type { GameSummary } from "../data/gameSummary.js";
import {
  type Identity,
  resolvePerspectivePort,
  resolveOpponentPort,
} from "../data/identity.js";
import { hasVideoLink } from "../video/youtubeSync.js";
import { groupGamesIntoSessions, type SessionGroup } from "../data/session.js";

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
  private groupBySession = true;
  private collapsedSessionIds = new Set<string>();

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

  public setGroupBySession(group: boolean): void {
    this.groupBySession = group;
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

    const sessions = this.groupBySession
      ? groupGamesIntoSessions(summaries, identity, this.sortOrder)
      : [];

    let rowsHtml: string;
    if (sorted.length === 0) {
      rowsHtml = `<div class="game-list-empty">${escapeHtml(tr.noGamesMatched)}</div>`;
    } else if (this.groupBySession) {
      rowsHtml = sessions
        .map((session) =>
          this.renderSessionGroup(session, identity, summaries.length === 1),
        )
        .join("");
    } else {
      rowsHtml = sorted
        .map((summary) =>
          this.renderGameRow(summary, identity, sorted.length === 1),
        )
        .join("");
    }

    this.container.innerHTML = `
      <div class="game-list-header">
        <h3>${escapeHtml(tr.gamesListHeader(filteredCount))}</h3>
        <div class="game-list-controls">
          <select id="gameGroupSelect" aria-label="${escapeHtml(tr.groupBySession)}">
            <option value="session" ${this.groupBySession ? "selected" : ""}>
              ${escapeHtml(tr.groupBySession)}
            </option>
            <option value="flat" ${!this.groupBySession ? "selected" : ""}>
              ${escapeHtml(tr.flatList)}
            </option>
          </select>
          <select id="gameSortSelect" aria-label="${escapeHtml(tr.sortNewestFirst)}">
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
        ${rowsHtml}
      </div>
    `;

    const groupSelect = this.container.querySelector(
      "#gameGroupSelect",
    ) as HTMLSelectElement;
    groupSelect?.addEventListener("change", () => {
      this.groupBySession = groupSelect.value === "session";
      this.render(summaries, identity, filteredCount);
    });

    const sortSelect = this.container.querySelector(
      "#gameSortSelect",
    ) as HTMLSelectElement;
    sortSelect?.addEventListener("change", () => {
      this.sortOrder = sortSelect.value as "newest" | "oldest";
      this.onSortChanged(this.sortOrder);
    });

    // Session accordion headers
    const sessionHeaders =
      this.container.querySelectorAll<HTMLElement>(".session-header");
    sessionHeaders.forEach((header) => {
      header.addEventListener("click", () => {
        const groupEl = header.closest<HTMLElement>(".session-group");
        if (!groupEl) return;
        const sessionId = groupEl.dataset.sessionId;
        if (!sessionId) return;

        if (this.collapsedSessionIds.has(sessionId)) {
          this.collapsedSessionIds.delete(sessionId);
          groupEl.classList.remove("collapsed");
          header.setAttribute("aria-expanded", "true");
        } else {
          this.collapsedSessionIds.add(sessionId);
          groupEl.classList.add("collapsed");
          header.setAttribute("aria-expanded", "false");
        }
      });
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

  private renderSessionGroup(
    session: SessionGroup,
    identity: Identity,
    isSingleGame: boolean = false,
  ): string {
    const tr = t();
    const isCollapsed = this.collapsedSessionIds.has(session.id);
    const dateStr = formatDate(session.startTime);
    const duration = formatDuration(session.totalDurationFrames);

    const sessionTitle = session.opponentName
      ? tr.sessionVs(session.opponentName)
      : tr.sessionSoloGame;

    const recordClass =
      session.wins > session.losses
        ? "record-positive"
        : session.losses > session.wins
          ? "record-negative"
          : "";

    const hasRecord = session.wins > 0 || session.losses > 0;
    const recordPill = hasRecord
      ? `<span class="session-stat-pill ${recordClass}">${escapeHtml(tr.sessionRecord(session.wins, session.losses))}</span>`
      : "";

    const battles = session.twelveCharacterBattles || [];
    let twelveCbPill = "";
    if (battles.length > 0) {
      const cbWins = battles.filter((b) => b.winner === "you").length;
      const cbLosses = battles.filter((b) => b.winner === "opponent").length;
      const label =
        cbWins > 0 || cbLosses > 0
          ? tr.session12CbRecord(cbWins, cbLosses)
          : `${tr.twelveCharacterBattleShort} (${battles.length})`;
      twelveCbPill = `<span class="session-stat-pill session-12cb-pill" title="${escapeHtml(tr.twelveCharacterBattleTitle)}">⚔️ ${escapeHtml(label)}</span>`;
    }

    const videoBadge = session.hasVideo
      ? `<span class="session-video-badge" title="${escapeHtml(tr.sessionVideoAttached)}">🎬 ${escapeHtml(tr.youtubeVideoTitle)}</span>`
      : "";

    // Build map for 12CB match indices and banners
    const gameBattleMap = new Map<
      string,
      {
        battle: (typeof battles)[number];
        battleIndex: number;
        matchIndex: number;
        totalMatches: number;
      }
    >();

    battles.forEach((battle, bIdx) => {
      const sortedBattleGames = [...battle.games].sort(
        (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
      );
      sortedBattleGames.forEach((bg, gIdx) => {
        gameBattleMap.set(bg.id, {
          battle,
          battleIndex: bIdx,
          matchIndex: gIdx + 1,
          totalMatches: battle.games.length,
        });
      });
    });

    const renderedBanners = new Set<string>();
    const rowsHtmlParts: string[] = [];

    for (const g of session.games) {
      const cbInfo = gameBattleMap.get(g.id);
      if (cbInfo && !renderedBanners.has(cbInfo.battle.id)) {
        renderedBanners.add(cbInfo.battle.id);
        const b = cbInfo.battle;
        let outcomeText: string;
        if (b.winner === "you") {
          outcomeText = tr.twelveCbWon(
            b.winnerRemainingCharacters,
            b.winnerRemainingStocks,
          );
        } else if (b.winner === "opponent") {
          outcomeText = tr.twelveCbLost(
            b.winnerRemainingCharacters,
            b.winnerRemainingStocks,
          );
        } else {
          outcomeText = b.winnerName;
        }
        rowsHtmlParts.push(
          `<div class="twelve-cb-banner"><span>⚔️ ${escapeHtml(tr.twelveCbBanner(cbInfo.battleIndex + 1, outcomeText))}</span></div>`,
        );
      }

      const matchBadge = cbInfo
        ? `<span class="twelve-cb-badge">${escapeHtml(tr.twelveCbMatchIndex(cbInfo.matchIndex, cbInfo.totalMatches))}</span>`
        : "";

      rowsHtmlParts.push(
        this.renderGameRow(g, identity, isSingleGame, matchBadge),
      );
    }

    const rowsHtml = rowsHtmlParts.join("");

    return `
      <div class="session-group${isCollapsed ? " collapsed" : ""}" data-session-id="${escapeHtml(session.id)}">
        <div class="session-header" role="button" tabindex="0" aria-expanded="${!isCollapsed}">
          <div class="session-header-left">
            <span class="session-chevron">▾</span>
            <div class="session-title">
              ${escapeHtml(sessionTitle)}
            </div>
            <span class="meta-dot">·</span>
            <span class="session-date">${escapeHtml(dateStr)}</span>
          </div>
          <div class="session-header-right">
            <span class="session-stat-pill">${escapeHtml(tr.sessionGamesCount(session.games.length))}</span>
            ${recordPill}
            ${twelveCbPill}
            <span class="session-duration">⏱ ${duration}</span>
            ${videoBadge}
          </div>
        </div>
        <div class="session-body">
          ${rowsHtml}
        </div>
      </div>
    `;
  }

  private renderGameRow(
    summary: GameSummary,
    identity: Identity,
    isSingleGame: boolean = false,
    extraBadge: string = "",
  ): string {
    const tr = t();
    const is2Player = summary.ports.length === 2;
    const stage = stageName(summary.stageId);
    const dateStr = formatDate(summary.recordedAt);
    const duration = formatDuration(summary.frameCount);
    const pulseClass = isSingleGame ? "single-game-pulse" : "";
    const hasVideo = hasVideoLink(summary.id);
    const videoBadge = hasVideo
      ? `<span class="game-video-badge" title="${escapeHtml(tr.videoAttachedBadge)}">🎬</span>`
      : "";

    if (!is2Player) {
      return `
        <div class="game-row unsupported ${pulseClass}" data-id="${summary.id}">
          <div class="game-row-header">
            <div class="game-row-meta">
              <span class="game-date">${escapeHtml(dateStr)}</span>
              <span class="meta-dot">·</span>
              <span class="game-stage">${escapeHtml(stage)}</span>
              <span class="meta-dot">·</span>
              <span class="game-duration">${duration}</span>
              ${videoBadge ? `<span class="meta-dot">·</span>${videoBadge}` : ""}
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
        </div>
      `;
    }

    const yourPort = resolvePerspectivePort(summary, identity);
    const isAmbiguous = yourPort === null;

    if (isAmbiguous) {
      const port0 = summary.ports[0]!;
      const port1 = summary.ports[1]!;

      const label0 = port0.playerName || `P${port0.port + 1}`;
      const label1 = port1.playerName || `P${port1.port + 1}`;

      return `
        <div class="game-row ambiguous ${pulseClass}" data-id="${summary.id}">
          <div class="game-row-header">
            <div class="game-row-meta">
              ${videoBadge}
              <span class="ambiguous-badge">⚠</span>
              <span class="game-date">${escapeHtml(dateStr)}</span>
              <span class="meta-dot">·</span>
              <span class="game-stage">${escapeHtml(stage)}</span>
              <span class="meta-dot">·</span>
              <span class="game-duration">${duration}</span>
            </div>
            <div class="game-row-players">
              <button class="inline-perspective-btn choose-btn" data-port="${port0.port}">
                ${escapeHtml(tr.imPlayer(label0))} <span class="char-label">(${escapeHtml(characterName(port0.characterId))})</span>
              </button>
              <span class="vs-label">vs</span>
              <button class="inline-perspective-btn choose-btn" data-port="${port1.port}">
                ${escapeHtml(tr.imPlayer(label1))} <span class="char-label">(${escapeHtml(characterName(port1.characterId))})</span>
              </button>
            </div>
            <div class="game-row-actions">
              <button class="remove-game-btn" title="${escapeHtml(tr.removeGame)}">✕</button>
              <span class="drill-in-arrow">›</span>
            </div>
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
        resultBadge = `<span class="result-badge win">${escapeHtml(tr.win)}</span>`;
      } else if (oppP.finalStocks > yourP.finalStocks) {
        resultBadge = `<span class="result-badge loss">${escapeHtml(tr.loss)}</span>`;
      }
    }

    const stats = summary.statsByPort[yourPort];
    const statChips: string[] = [];
    const comboChips: string[] = [];

    if (stats) {
      if (stats.recoverySituations > 0) {
        const pct = Math.round(
          (stats.recoverySuccesses / stats.recoverySituations) * 100,
        );
        statChips.push(
          `<span class="game-stat-chip"><span class="chip-label">Rec</span> ${pct}% (${stats.recoverySuccesses}/${stats.recoverySituations})</span>`,
        );
      }
      if (stats.edgeGuardSituations > 0) {
        const pct = Math.round(
          (stats.edgeGuardSuccesses / stats.edgeGuardSituations) * 100,
        );
        statChips.push(
          `<span class="game-stat-chip"><span class="chip-label">EG</span> ${pct}% (${stats.edgeGuardSuccesses}/${stats.edgeGuardSituations})</span>`,
        );
      }
      if (stats.ledgeGetupSituations > 0) {
        const pct = Math.round(
          (stats.ledgeGetupSuccesses / stats.ledgeGetupSituations) * 100,
        );
        statChips.push(
          `<span class="game-stat-chip"><span class="chip-label">Getup</span> ${pct}% (${stats.ledgeGetupSuccesses}/${stats.ledgeGetupSituations})</span>`,
        );
      }
      if (stats.stocksTaken > 0) {
        const hitsPerStock = (
          stats.neutralHitsLanded / stats.stocksTaken
        ).toFixed(1);
        statChips.push(
          `<span class="game-stat-chip"><span class="chip-label">Neutral</span> ${hitsPerStock}/st.</span>`,
        );
      }
      if (stats.combosList && stats.combosList.length > 0) {
        stats.combosList.forEach((c) => {
          comboChips.push(
            `<span class="game-stat-chip combo-chip"><span class="chip-label">${c.hitCount} hits</span> ${c.startDamage}% → ${c.endDamage}% <span class="chip-ko">KO</span></span>`,
          );
        });
      } else if (stats.killCombos && stats.killCombos > 0) {
        comboChips.push(
          `<span class="game-stat-chip combo-chip"><span class="chip-label">Combos</span> ${stats.killCombos}</span>`,
        );
      }
    }

    const winnerStocks = Math.max(yourP.finalStocks, oppP.finalStocks);
    const stocksDetail =
      yourP.finalStocks >= 0 && oppP.finalStocks >= 0
        ? `<span class="detail-stocks">${escapeHtml(tr.finalStocksDetail(winnerStocks))}</span>`
        : "";

    const hasSupplementary =
      Boolean(stocksDetail) || statChips.length > 0 || comboChips.length > 0;

    const unevenTag = summary.isUnevenStockStart
      ? `<span class="uneven-stocks-badge" title="${escapeHtml(tr.unevenStocksTooltip(yourP.startStocks ?? 4, oppP.startStocks ?? 4))}">${escapeHtml(tr.unevenStocksBadge)}</span>`
      : "";

    return `
      <div class="game-row ${pulseClass} ${yourP.finalStocks > oppP.finalStocks ? "row-won" : yourP.finalStocks < oppP.finalStocks ? "row-lost" : ""}" data-id="${summary.id}">
        <div class="game-row-header">
          <div class="game-row-meta">
            <span class="game-date">${escapeHtml(dateStr)}</span>
            <span class="meta-dot">·</span>
            <span class="game-stage">${escapeHtml(stage)}</span>
            <span class="meta-dot">·</span>
            <span class="game-duration">${duration}</span>
            ${extraBadge ? `<span class="meta-dot">·</span>${extraBadge}` : ""}
            ${videoBadge ? `<span class="meta-dot">·</span>${videoBadge}` : ""}
            ${unevenTag ? `<span class="meta-dot">·</span>${unevenTag}` : ""}
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
        ${
          hasSupplementary
            ? `
          <div class="game-row-body">
            <div class="game-row-stats">
              ${stocksDetail}
              ${stocksDetail && statChips.length > 0 ? `<span class="detail-divider">·</span>` : ""}
              ${statChips.length > 0 ? `<div class="game-stat-chips">${statChips.join("")}</div>` : ""}
            </div>
            ${
              comboChips.length > 0
                ? `
              <div class="game-row-combos">
                <span class="combos-lead-label">Kill Combos:</span>
                <div class="game-stat-chips">${comboChips.join("")}</div>
              </div>
            `
                : ""
            }
          </div>
        `
            : ""
        }
      </div>
    `;
  }
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
