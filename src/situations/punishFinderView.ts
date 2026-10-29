import type { GameSummary } from "../data/gameSummary.js";
import type { Identity } from "../data/identity.js";
import { characterFamily } from "../data/characterFamily.js";
import { detectMainCharacter } from "../data/mainCharacter.js";
import {
  HORIZONTAL_ZONES,
  VERTICAL_ZONES,
  findSituations,
  situationClips,
  type HorizontalZone,
  type OpeningKindFilter,
  type PunisherFilter,
  type SituationMatch,
  type SituationQuery,
  type StageZone,
  type VerticalZone,
} from "../data/situations.js";
import { t, type Translations } from "../i18n.js";
import { actionStateName, characterName } from "../lookups.js";
import type { PlaylistClip } from "../playlist.js";

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

/** Rows shown in the best-punishes list (and played by "Play these"). */
const BEST_LIMIT = 50;
/** Opener rows shown, most damaging first. */
const OPENER_LIMIT = 20;

const PERCENT_PRESETS: readonly [number, number][] = [
  [0, 29],
  [30, 59],
  [60, 89],
  [90, 119],
  [120, 999],
];

function moveLabel(tr: Translations, m: SituationMatch): string {
  if (m.opening.isGrab) return tr.punishGrab;
  return m.opening.move === null
    ? "—"
    : actionStateName(
        m.opening.move,
        undefined,
        undefined,
        m.attackerCharacterId,
      );
}

function zoneName(
  tr: Translations,
  h: HorizontalZone,
  v: VerticalZone,
): string {
  const hName = {
    center: tr.punishZoneCenter,
    side: tr.punishZoneSide,
    offstage: tr.punishZoneOffstage,
  }[h];
  const vName = {
    high: tr.punishZoneHigh,
    mid: tr.punishZoneMid,
    low: tr.punishZoneLow,
  }[v];
  return tr.punishZoneLabel(hName, vName);
}

// Zone picker geometry: five columns (offstage | side | center | side | offstage, mirrored) by
// three rows (high | platform height | low), over a sketch of Dream Land.
const ZP_W = 300;
const ZP_H = 132;
const ZP_COLS: readonly { h: HorizontalZone; x: number; w: number }[] = [
  { h: "offstage", x: 0, w: 46 },
  { h: "side", x: 46, w: 64 },
  { h: "center", x: 110, w: 80 },
  { h: "side", x: 190, w: 64 },
  { h: "offstage", x: 254, w: 46 },
];
const ZP_ROWS: Record<VerticalZone, { y: number; h: number }> = {
  high: { y: 0, h: 40 },
  mid: { y: 40, h: 46 },
  low: { y: 86, h: 46 },
};

function renderZonePicker(
  tr: Translations,
  selected: ReadonlySet<StageZone>,
): string {
  const cells = ZP_COLS.flatMap((col) =>
    VERTICAL_ZONES.map((v) => {
      const zone: StageZone = `${col.h}-${v}`;
      const row = ZP_ROWS[v];
      return `<rect class="zone-cell" data-zone="${zone}" aria-pressed="${selected.has(zone)}"
        x="${col.x + 1}" y="${row.y + 1}" width="${col.w - 2}" height="${row.h - 2}" rx="3">
        <title>${escapeHtml(zoneName(tr, col.h, v))}</title></rect>`;
    }),
  ).join("");
  // Stage sketch: main floor at the low/mid boundary, side platforms in the mid row, top platform
  // in the high row. Purely a visual reference; it doesn't take clicks.
  return `<svg class="zone-picker" viewBox="0 0 ${ZP_W} ${ZP_H}" role="group" aria-label="${escapeHtml(tr.punishWhere)}">
    ${cells}
    <g class="zone-stage" aria-hidden="true">
      <path d="M46 98 H254 L232 124 H68 Z" />
      <rect x="66" y="62" width="50" height="4" rx="2" />
      <rect x="184" y="62" width="50" height="4" rx="2" />
      <rect x="128" y="30" width="44" height="4" rx="2" />
    </g>
  </svg>`;
}

/**
 * The punish finder page (#/punishes): pick a situation (who, against whom, at what percent,
 * where), see which openers led to the most and the best individual punishes, and play them.
 * See src/data/situations.ts.
 */
export class PunishFinderViewController {
  private summaries: GameSummary[] = [];
  private identity: Identity | null = null;
  private query: SituationQuery | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly onPlayClips: (
      clips: PlaylistClip[],
      startIndex: number,
    ) => void,
  ) {
    this.container.addEventListener("click", (e) => this.handleClick(e));
    this.container.addEventListener("change", (e) => this.handleChange(e));
  }

  public setData(summaries: GameSummary[], identity: Identity): void {
    this.summaries = summaries;
    this.identity = identity;
  }

  private defaultQuery(): SituationQuery {
    const main = this.identity
      ? detectMainCharacter(this.summaries, this.identity)
      : null;
    return {
      attackerFamily: main !== null ? characterFamily(main) : null,
      victimFamily: null,
      minDamage: 0,
      maxDamage: 999,
      zones: [],
      punisher: "anyone",
      kind: "any",
    };
  }

  private families(): { family: number; games: number }[] {
    const counts = new Map<number, number>();
    for (const s of new Map(this.summaries.map((g) => [g.id, g])).values()) {
      if (s.ports.length !== 2) continue;
      for (const p of s.ports) {
        const f = characterFamily(p.characterId);
        counts.set(f, (counts.get(f) ?? 0) + 1);
      }
    }
    return [...counts]
      .map(([family, games]) => ({ family, games }))
      .sort((a, b) => b.games - a.games);
  }

  public render(): void {
    if (!this.identity) return;
    const tr = t();
    this.query ??= this.defaultQuery();
    const q = this.query;
    const families = this.families();
    const familyOptions = (selected: number | null) =>
      [
        `<option value="" ${selected === null ? "selected" : ""}>${escapeHtml(tr.punishAnyCharacter)}</option>`,
        ...families.map(
          (f) =>
            `<option value="${f.family}" ${selected === f.family ? "selected" : ""}>${escapeHtml(characterName(f.family))} (${f.games})</option>`,
        ),
      ].join("");
    const presetChips = [
      `<button type="button" class="punish-chip" data-preset="0-999" aria-pressed="${q.minDamage === 0 && q.maxDamage === 999}">${escapeHtml(tr.punishPercentAny)}</button>`,
      ...PERCENT_PRESETS.map(
        ([lo, hi]) =>
          `<button type="button" class="punish-chip" data-preset="${lo}-${hi}" aria-pressed="${q.minDamage === lo && q.maxDamage === hi}">${hi >= 999 ? `${lo}%+` : `${lo}–${hi}%`}</button>`,
      ),
    ].join("");
    const segmented = <T extends string>(
      name: string,
      value: T,
      options: [T, string][],
    ) =>
      options
        .map(
          ([v, label]) =>
            `<button type="button" class="punish-chip" data-${name}="${v}" aria-pressed="${value === v}">${escapeHtml(label)}</button>`,
        )
        .join("");

    this.container.innerHTML = `<div class="punish-page">
      <h2>${escapeHtml(tr.punishTitle)}</h2>
      <p class="punish-intro">${escapeHtml(tr.punishIntro)}</p>
      <div class="punish-controls">
        <div class="punish-control">
          <label for="punishAttacker">${escapeHtml(tr.punishAttacker)}</label>
          <select id="punishAttacker" data-field="attacker">${familyOptions(q.attackerFamily)}</select>
          <label for="punishVictim">${escapeHtml(tr.punishVictim)}</label>
          <select id="punishVictim" data-field="victim">${familyOptions(q.victimFamily)}</select>
        </div>
        <div class="punish-control">
          <span class="punish-label">${escapeHtml(tr.punishPercent)}</span>
          <div class="punish-chips">${presetChips}</div>
          <div class="punish-range">
            <input type="number" min="0" max="999" data-field="min" value="${q.minDamage}" aria-label="min %" />
            <span>–</span>
            <input type="number" min="0" max="999" data-field="max" value="${q.maxDamage}" aria-label="max %" />
          </div>
          <span class="punish-label">${escapeHtml(tr.punishWho)}</span>
          <div class="punish-chips">${segmented<PunisherFilter>(
            "who",
            q.punisher,
            [
              ["anyone", tr.punishWhoAnyone],
              ["you", tr.punishWhoYou],
              ["opponents", tr.punishWhoOpponents],
            ],
          )}</div>
          <span class="punish-label">${escapeHtml(tr.punishKind)}</span>
          <div class="punish-chips">${segmented<OpeningKindFilter>(
            "kind",
            q.kind,
            [
              ["any", tr.punishKindAny],
              ["attack", tr.punishKindAttack],
              ["grab", tr.punishKindGrab],
            ],
          )}</div>
        </div>
        <div class="punish-control">
          <span class="punish-label">${escapeHtml(tr.punishWhere)}</span>
          ${renderZonePicker(tr, new Set(q.zones))}
          <span class="punish-hint">${escapeHtml(tr.punishWhereHint)}</span>
        </div>
      </div>
      <div id="punishResults"></div>
    </div>`;
    this.renderResults();
  }

  private renderResults(): void {
    const el = this.container.querySelector<HTMLElement>("#punishResults");
    if (!el || !this.identity || !this.query) return;
    const tr = t();
    const results = findSituations(this.summaries, this.identity, this.query);
    const gamesWithMatches = new Set(results.matches.map((m) => m.summary.id))
      .size;
    const noIndex =
      results.gamesWithoutIndex > 0
        ? `<p class="punish-hint">${escapeHtml(tr.punishNoIndex(results.gamesWithoutIndex))}</p>`
        : "";
    if (results.matches.length === 0) {
      el.innerHTML = `${noIndex}<p class="punish-empty">${escapeHtml(tr.punishEmpty)}</p>`;
      return;
    }

    const openerRows = results.byMove
      .slice(0, OPENER_LIMIT)
      .map((m) => {
        const index = results.matches.indexOf(m.best);
        return `<tr class="${m.count < 3 ? "punish-few" : ""}">
          <td>${escapeHtml(characterName(m.attackerFamily))}</td>
          <td>${escapeHtml(moveLabel(tr, m.best))}</td>
          <td>${m.count}</td>
          <td>${m.averageDamage.toFixed(1)}%</td>
          <td>${m.medianDamage.toFixed(0)}%</td>
          <td>${m.killRate.toFixed(0)}%</td>
          <td><button type="button" class="punish-play" data-index="${index}">▶</button>
            +${m.best.opening.damage}${m.best.opening.killed ? ` ${escapeHtml(tr.punishKo)}` : ""}</td>
        </tr>`;
      })
      .join("");

    const best = results.matches.slice(0, BEST_LIMIT);
    const bestRows = best
      .map(
        (m, i) => `<tr class="${m.byYou ? "punish-yours" : ""}">
          <td><button type="button" class="punish-play" data-index="${i}">▶</button></td>
          <td>${escapeHtml(m.attackerName)} <span class="punish-dim">${escapeHtml(characterName(m.attackerCharacterId))}</span></td>
          <td>${escapeHtml(m.victimName)} <span class="punish-dim">${escapeHtml(characterName(m.victimCharacterId))}</span></td>
          <td>${escapeHtml(moveLabel(tr, m))}</td>
          <td>${m.opening.victimDamage}%</td>
          <td><strong>+${m.opening.damage}</strong>${m.opening.killed ? ` <span class="punish-ko">${escapeHtml(tr.punishKo)}</span>` : ""}</td>
          <td>${m.opening.hits}</td>
          <td>${escapeHtml(m.summary.recordedAt.toLocaleDateString())}</td>
        </tr>`,
      )
      .join("");

    el.innerHTML = `${noIndex}
      <p class="punish-summary">${escapeHtml(tr.punishSummary(results.matches.length, gamesWithMatches))}</p>
      <section class="punish-section">
        <h3>${escapeHtml(tr.punishByMoveTitle)}</h3>
        <p class="punish-hint">${escapeHtml(tr.punishByMoveHint)}</p>
        <div class="punish-table-wrap"><table class="punish-table">
          <thead><tr>
            <th></th><th>${escapeHtml(tr.punishColOpener)}</th><th>${escapeHtml(tr.punishColTimes)}</th>
            <th>${escapeHtml(tr.punishColAverage)}</th><th>${escapeHtml(tr.punishColMedian)}</th>
            <th>${escapeHtml(tr.punishColTookStock)}</th><th>${escapeHtml(tr.punishColBest)}</th>
          </tr></thead>
          <tbody>${openerRows}</tbody>
        </table></div>
      </section>
      <section class="punish-section">
        <div class="punish-section-head">
          <h3>${escapeHtml(tr.punishBestTitle)}</h3>
          <span class="punish-hint">${escapeHtml(tr.punishShowing(best.length, results.matches.length))}</span>
          <button type="button" class="punish-play-all" data-index="0">${escapeHtml(tr.punishPlayTop)}</button>
        </div>
        <div class="punish-table-wrap"><table class="punish-table">
          <thead><tr>
            <th></th><th>${escapeHtml(tr.punishColWho)}</th><th>${escapeHtml(tr.punishColOn)}</th>
            <th>${escapeHtml(tr.punishColOpener)}</th><th>${escapeHtml(tr.punishColPercent)}</th>
            <th>${escapeHtml(tr.punishColDamage)}</th><th>${escapeHtml(tr.punishColHits)}</th>
            <th>${escapeHtml(tr.punishColDate)}</th>
          </tr></thead>
          <tbody>${bestRows}</tbody>
        </table></div>
      </section>`;
  }

  private update(change: Partial<SituationQuery>): void {
    this.query = { ...this.query!, ...change };
    this.render();
  }

  private handleClick(e: MouseEvent): void {
    const target = e.target as Element;
    const play = target.closest<HTMLElement>(".punish-play, .punish-play-all");
    if (play && this.identity && this.query) {
      const tr = t();
      const matches = findSituations(
        this.summaries,
        this.identity,
        this.query,
      ).matches;
      const index = Number(play.dataset.index ?? 0);
      // Play the best list in order; an opener's "best" may sit beyond it, so start the
      // playlist there and keep the following matches after it.
      const list =
        index < BEST_LIMIT
          ? matches.slice(0, BEST_LIMIT)
          : matches.slice(index, index + BEST_LIMIT);
      const start = index < BEST_LIMIT ? index : 0;
      this.onPlayClips(
        situationClips(list, (m) =>
          tr.punishClipLabel(
            m.attackerName,
            m.opening.victimDamage,
            m.opening.damage,
            moveLabel(tr, m),
          ),
        ),
        start,
      );
      return;
    }
    const zone = target.closest<SVGElement>("[data-zone]");
    if (zone && this.query) {
      const z = zone.dataset.zone as StageZone;
      const zones = new Set(this.query.zones);
      if (zones.has(z)) zones.delete(z);
      else zones.add(z);
      this.update({
        zones: HORIZONTAL_ZONES.flatMap((h) =>
          VERTICAL_ZONES.map((v) => `${h}-${v}` as StageZone),
        ).filter((x) => zones.has(x)),
      });
      return;
    }
    const chip = target.closest<HTMLElement>(".punish-chip");
    if (!chip) return;
    if (chip.dataset.preset) {
      const [lo, hi] = chip.dataset.preset.split("-").map(Number);
      this.update({ minDamage: lo!, maxDamage: hi! });
    } else if (chip.dataset.who) {
      this.update({ punisher: chip.dataset.who as PunisherFilter });
    } else if (chip.dataset.kind) {
      this.update({ kind: chip.dataset.kind as OpeningKindFilter });
    }
  }

  private handleChange(e: Event): void {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    const field = el.dataset.field;
    if (!field || !this.query) return;
    if (field === "attacker" || field === "victim") {
      const value = el.value === "" ? null : Number(el.value);
      this.update(
        field === "attacker"
          ? { attackerFamily: value }
          : { victimFamily: value },
      );
    } else if (field === "min" || field === "max") {
      const n = Math.max(0, Math.min(999, Number(el.value) || 0));
      this.update(field === "min" ? { minDamage: n } : { maxDamage: n });
    }
  }
}
