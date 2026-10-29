import { escapeHtml } from "../ui/html.js";
import type { PortIndex } from "@rmg-k/rmgr";
import type { GameSummary } from "../data/gameSummary.js";
import { resolvePerspectivePort, type Identity } from "../data/identity.js";
import type { SessionGroup } from "../data/session.js";
import { t, type Translations } from "../i18n.js";
import { moveDisplayName } from "../moveNames.js";
import {
  computeNeutralHitEvents,
  type NeutralOpeningReason,
} from "../neutralHits.js";
import {
  deleteMatchNote,
  loadMatchNotes,
  upsertAnchoredNote,
} from "../notes.js";
import type { PlaylistClip } from "../playlist.js";
import type { LoadedReplay } from "../replaySource.js";
import {
  hitReelClips,
  hitReelEntriesForGame,
  isBigPunish,
  sortHitReel,
  type HitReelEntry,
  type HitReelSort,
} from "./hitReel.js";

function clock(frameIndex: number): string {
  const seconds = Math.floor(frameIndex / 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const REASON_LABELS: Record<NeutralOpeningReason, keyof Translations> = {
  "whiff-punish": "neutralReasonWhiffPunish",
  "landing-lag": "neutralReasonLandingLag",
  "jump-punish": "neutralReasonJumpPunish",
  "standing-hit": "neutralReasonStandingHit",
  "shield-pressure": "neutralReasonShieldPressure",
  reversal: "neutralReasonReversal",
  unknown: "neutralReasonUnknown",
};

function reasonLabel(tr: Translations, reason: NeutralOpeningReason): string {
  const v = tr[REASON_LABELS[reason]];
  return typeof v === "string" ? v : reason;
}

function resultLabel(tr: Translations, e: HitReelEntry): string {
  const outcome =
    e.convertedToKill || e.outcome === "ko"
      ? tr.hitReelOutcomeKo
      : e.outcome === "reversal"
        ? tr.hitReelOutcomeReversal
        : e.outcome === "incomplete"
          ? tr.hitReelOutcomeIncomplete
          : tr.hitReelOutcomeReset;
  const via = [
    e.convertedToLedgeTrap ? tr.hitReelToLedge : null,
    e.convertedToEdgeGuard ? tr.hitReelToEdge : null,
  ].filter((s): s is string => s !== null);
  return via.length > 0 ? `${outcome} (${via.join(", ")})` : outcome;
}

function moveName(id: number | null, characterId: number): string {
  return id === null ? "—" : moveDisplayName(id, characterId);
}

/** Your lead-in as names, collapsing repeats (Shield on -> Shield both read "Shield"). */
function leadInText(e: HitReelEntry): string {
  const names: string[] = [];
  for (const a of e.yourLeadIn) {
    const name = moveName(a, e.yourCharacterId);
    if (names[names.length - 1] !== name) names.push(name);
  }
  return names.length > 0 ? names.join(" → ") : "—";
}

interface CachedReel {
  /** Game ids (in session order) the entries were built from - recompute when this changes. */
  readonly key: string;
  readonly entries: HitReelEntry[];
}

/**
 * The session page's "Times you got hit" section (see hitReel.ts). Reads each loaded game's replay
 * once per session and caches the result, so re-renders (filters, notes, the session page's own
 * matchup picker) don't re-read anything.
 */
export class HitReelPanel {
  private readonly cache = new Map<string, CachedReel>();
  private container: HTMLElement | null = null;
  private session: SessionGroup | null = null;
  private loadToken = 0;
  private progress: { done: number; total: number } | null = null;
  private unloadedCount = 0;
  private entries: HitReelEntry[] = [];
  private sort: HitReelSort = "chronological";
  private reasonFilter: NeutralOpeningReason | null = null;
  private bigOnly = false;
  /** A render skipped because a note had focus; done when focus leaves the note. */
  private renderPending = false;

  constructor(
    private readonly loadReplay: (
      summary: GameSummary,
    ) => Promise<LoadedReplay>,
    private readonly onPlayClips: (
      clips: PlaylistClip[],
      startIndex: number,
    ) => void,
    private readonly onImportFolder: () => void,
  ) {}

  /** Renders into `container` for `session`, reading games in the background if needed. */
  public show(
    container: HTMLElement,
    session: SessionGroup,
    identity: Identity,
  ): void {
    if (this.session?.id !== session.id) {
      this.sort = "chronological";
      this.reasonFilter = null;
      this.bigOnly = false;
    }
    // Any load still running belongs to whatever was shown before; stop it touching this view.
    this.loadToken++;
    this.container = container;
    this.session = session;
    container.onclick = (e) => this.handleClick(e);
    container.onchange = (e) => this.handleNoteChange(e);
    // Same function every time, so repeated show() calls don't stack listeners.
    container.addEventListener("focusout", this.handleFocusOut);

    // Sessions list games newest first; number them the way they were played.
    const games = [...session.games]
      .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime())
      .map((summary, i) => ({
        summary,
        gameNumber: i + 1,
        port: resolvePerspectivePort(summary, identity),
      }))
      .filter(
        (
          g,
        ): g is { summary: GameSummary; gameNumber: number; port: PortIndex } =>
          g.port !== null && g.summary.ports.length === 2,
      );
    const loaded = games.filter(
      (g) => g.summary.source !== null || !!g.summary.url,
    );
    this.unloadedCount = games.length - loaded.length;
    const key = loaded.map((g) => `${g.summary.id}:${g.port}`).join(",");

    const cached = this.cache.get(session.id);
    if (cached && cached.key === key) {
      this.entries = cached.entries;
      this.progress = null;
      this.render();
      return;
    }
    void this.load(session.id, key, loaded);
  }

  private async load(
    sessionId: string,
    key: string,
    games: { summary: GameSummary; gameNumber: number; port: PortIndex }[],
  ): Promise<void> {
    const token = ++this.loadToken;
    const entries: HitReelEntry[] = [];
    this.entries = entries;
    this.progress = { done: 0, total: games.length };
    this.render();
    for (const g of games) {
      try {
        const { replay } = await this.loadReplay(g.summary);
        if (token !== this.loadToken) return;
        entries.push(
          ...hitReelEntriesForGame(
            replay,
            computeNeutralHitEvents(replay),
            g.summary.id,
            g.gameNumber,
            g.port,
          ),
        );
      } catch {
        // A game that fails to load is skipped rather than blocking the rest.
      }
      if (token !== this.loadToken) return;
      this.progress = {
        done: (this.progress?.done ?? 0) + 1,
        total: games.length,
      };
      this.renderUnlessEditing();
    }
    this.cache.set(sessionId, { key, entries });
    this.progress = null;
    this.renderUnlessEditing();
  }

  private readonly handleFocusOut = (): void => {
    // focusout fires before focus lands elsewhere; check once it has.
    setTimeout(() => {
      if (this.renderPending) this.renderUnlessEditing();
    });
  };

  /** While games are still loading, don't rebuild the table under someone typing a note. */
  private renderUnlessEditing(): void {
    const active = document.activeElement;
    if (
      active?.classList.contains("hit-reel-note") &&
      this.container?.contains(active)
    ) {
      this.renderPending = true;
      const status = this.container.querySelector(".hit-reel-status");
      if (status && this.progress) {
        status.textContent = t().hitReelLoading(
          this.progress.done,
          this.progress.total,
        );
      }
      return;
    }
    this.render();
  }

  private visibleEntries(): HitReelEntry[] {
    const filtered = this.entries.filter(
      (e) =>
        (!this.reasonFilter || e.reason === this.reasonFilter) &&
        (!this.bigOnly || isBigPunish(e)),
    );
    return sortHitReel(filtered, this.sort);
  }

  private render(): void {
    this.renderPending = false;
    const container = this.container;
    if (!container || !container.isConnected) return;
    const tr = t();
    const visible = this.visibleEntries();

    const noteByEntry = new Map<string, string>();
    for (const gameId of new Set(this.entries.map((e) => e.gameId))) {
      for (const note of loadMatchNotes(gameId)) {
        if (note.eventFrameIndex !== undefined) {
          noteByEntry.set(`${gameId}:${note.eventFrameIndex}`, note.text);
        }
      }
    }
    const notedCount = this.entries.filter((e) =>
      noteByEntry.has(`${e.gameId}:${e.frameIndex}`),
    ).length;

    const reasons = [...new Set(this.entries.map((e) => e.reason))];
    const reasonChips = [
      `<button type="button" class="hit-reel-chip" data-reason="" aria-pressed="${this.reasonFilter === null}">${escapeHtml(tr.hitReelAllReasons)} <span>${this.entries.length}</span></button>`,
      ...reasons.map(
        (r) =>
          `<button type="button" class="hit-reel-chip" data-reason="${r}" aria-pressed="${this.reasonFilter === r}">${escapeHtml(reasonLabel(tr, r))} <span>${this.entries.filter((e) => e.reason === r).length}</span></button>`,
      ),
    ].join("");

    const rows = visible
      .map((e, i) => {
        const note = noteByEntry.get(`${e.gameId}:${e.frameIndex}`) ?? "";
        const hitBy =
          e.hitType === "grab"
            ? tr.hitReelGrab
            : moveName(e.opponentMove, e.opponentCharacterId);
        const youWere = leadInText(e);
        return `<tr class="${e.convertedToKill ? "hit-reel-ko" : ""}${note ? " hit-reel-noted" : ""}">
          <td><button type="button" class="hit-reel-play" data-index="${i}" title="${escapeHtml(tr.hitReelPlay)}">▶</button></td>
          <td>${e.gameNumber}</td>
          <td>${clock(e.frameIndex)}</td>
          <td>${escapeHtml(reasonLabel(tr, e.reason))}</td>
          <td>${escapeHtml(hitBy)}</td>
          <td class="hit-reel-leadin">${escapeHtml(youWere)}</td>
          <td class="hit-reel-damage">${e.damageBefore}% <span>+${e.damageTaken}</span></td>
          <td>${escapeHtml(resultLabel(tr, e))}</td>
          <td class="hit-reel-note-cell"><input type="text" class="hit-reel-note"
            data-game-id="${escapeHtml(e.gameId)}" data-frame="${e.frameIndex}"
            value="${escapeHtml(note)}" placeholder="${escapeHtml(tr.hitReelNotePlaceholder)}" /></td>
        </tr>`;
      })
      .join("");

    const status = this.progress
      ? `<p class="hit-reel-status">${escapeHtml(tr.hitReelLoading(this.progress.done, this.progress.total))}</p>`
      : "";
    const unloaded =
      this.unloadedCount > 0
        ? `<p class="hit-reel-status">${escapeHtml(tr.hitReelUnloaded(this.unloadedCount))}
            <button type="button" class="hit-reel-import">${escapeHtml(tr.hitReelImportFolder)}</button></p>`
        : "";
    const empty =
      !this.progress && this.entries.length === 0 && this.unloadedCount === 0
        ? `<p class="hit-reel-status">${escapeHtml(tr.hitReelEmpty)}</p>`
        : "";

    container.innerHTML = `
      <div class="hit-reel-head">
        <h3>${escapeHtml(tr.hitReelTitle(this.entries.length))}</h3>
        ${this.entries.length > 0 ? `<span class="hit-reel-noted-count">${escapeHtml(tr.hitReelNoted(notedCount, this.entries.length))}</span>` : ""}
      </div>
      <p class="hit-reel-intro">${escapeHtml(tr.hitReelIntro)}</p>
      ${status}${unloaded}${empty}
      ${
        this.entries.length > 0
          ? `<div class="hit-reel-controls">
          <button type="button" class="hit-reel-play-all" data-index="0">${escapeHtml(tr.hitReelPlayAll)}</button>
          <div class="hit-reel-sort" role="group">
            <button type="button" class="hit-reel-chip" data-sort="chronological" aria-pressed="${this.sort === "chronological"}">${escapeHtml(tr.hitReelSortChronological)}</button>
            <button type="button" class="hit-reel-chip" data-sort="costliest" aria-pressed="${this.sort === "costliest"}">${escapeHtml(tr.hitReelSortCostliest)}</button>
            <button type="button" class="hit-reel-chip" data-big aria-pressed="${this.bigOnly}">${escapeHtml(tr.hitReelBigOnly)} <span>${this.entries.filter(isBigPunish).length}</span></button>
          </div>
          <div class="hit-reel-reasons" role="group">${reasonChips}</div>
        </div>
        <div class="hit-reel-table-wrap"><table class="hit-reel-table">
          <thead><tr>
            <th></th><th>${escapeHtml(tr.hitReelColGame)}</th><th>${escapeHtml(tr.hitReelColTime)}</th>
            <th>${escapeHtml(tr.hitReelColHow)}</th><th>${escapeHtml(tr.hitReelColHitBy)}</th>
            <th>${escapeHtml(tr.hitReelColYouWere)}</th><th>${escapeHtml(tr.hitReelColDamage)}</th>
            <th>${escapeHtml(tr.hitReelColResult)}</th><th>${escapeHtml(tr.hitReelColNote)}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table></div>`
          : ""
      }`;
  }

  private handleClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (target.closest(".hit-reel-import")) {
      this.onImportFolder();
      return;
    }
    const play = target.closest<HTMLElement>(
      ".hit-reel-play, .hit-reel-play-all",
    );
    if (play) {
      const tr = t();
      const visible = this.visibleEntries();
      const clips = hitReelClips(visible, (entry) =>
        tr.hitReelClipLabel(
          entry.gameNumber,
          clock(entry.frameIndex),
          reasonLabel(tr, entry.reason),
        ),
      );
      this.onPlayClips(clips, Number(play.dataset.index ?? 0));
      return;
    }
    if (target.closest("[data-big]")) {
      this.bigOnly = !this.bigOnly;
      this.render();
      return;
    }
    const sort = target.closest<HTMLElement>("[data-sort]");
    if (sort) {
      this.sort = sort.dataset.sort as HitReelSort;
      this.render();
      return;
    }
    const reason = target.closest<HTMLElement>("[data-reason]");
    if (reason) {
      this.reasonFilter = (reason.dataset.reason ||
        null) as NeutralOpeningReason | null;
      this.render();
    }
  }

  private handleNoteChange(e: Event): void {
    const input = (e.target as HTMLElement).closest<HTMLInputElement>(
      ".hit-reel-note",
    );
    if (!input) return;
    const gameId = input.dataset.gameId!;
    const frame = Number(input.dataset.frame);
    const text = input.value.trim();
    if (text) {
      upsertAnchoredNote(gameId, frame, text);
    } else {
      const existing = loadMatchNotes(gameId).find(
        (n) => n.eventFrameIndex === frame,
      );
      if (existing) deleteMatchNote(gameId, existing.id);
    }
    // Update the counter and row styling without rebuilding the table (keeps focus moving).
    input.closest("tr")?.classList.toggle("hit-reel-noted", !!text);
    const counter = this.container?.querySelector(".hit-reel-noted-count");
    if (counter) {
      const noted = this.entries.filter((entry) =>
        loadMatchNotes(entry.gameId).some(
          (n) => n.eventFrameIndex === entry.frameIndex,
        ),
      ).length;
      counter.textContent = t().hitReelNoted(noted, this.entries.length);
    }
  }
}
