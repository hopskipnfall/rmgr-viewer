import { characterName } from "../lookups.js";
import { t, type Translations } from "../i18n.js";
import type { GameSummary } from "../data/gameSummary.js";
import type { Identity } from "../data/identity.js";
import { detectMainCharacter } from "../data/mainCharacter.js";
import {
  RECENT_WINDOW_DAYS,
  characterFamily,
  computeProgress,
  playedCharacterFamilies,
  type MetricTrend,
  type ProgressMetricId,
  type ProgressPoint,
  type ProgressReport,
  type WindowSummary,
} from "../data/progress.js";

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function signed(n: number, digits = 1): string {
  const s = n.toFixed(digits);
  return n > 0 ? `+${s}` : s;
}

const METRIC_LABELS: Record<
  ProgressMetricId,
  { label: keyof Translations; hint: keyof Translations }
> = {
  openingShare: {
    label: "progressMetricOpeningShare",
    hint: "progressMetricOpeningShareHint",
  },
  damagePerOpening: {
    label: "progressMetricDamagePerOpening",
    hint: "progressMetricDamagePerOpeningHint",
  },
  damageGivenBack: {
    label: "progressMetricDamageGivenBack",
    hint: "progressMetricDamageGivenBackHint",
  },
  baitShare: {
    label: "progressMetricBaitShare",
    hint: "progressMetricBaitShareHint",
  },
  hitBackShare: {
    label: "progressMetricHitBackShare",
    hint: "progressMetricHitBackShareHint",
  },
  recovery: {
    label: "progressMetricRecovery",
    hint: "progressMetricRecoveryHint",
  },
};

function str(tr: Translations, key: keyof Translations): string {
  const v = tr[key];
  return typeof v === "string" ? v : "";
}

function unit(tr: Translations, trend: MetricTrend): string {
  return trend.isPercent ? tr.progressUnitPoints : tr.progressUnitDamage;
}

function formatValue(trend: MetricTrend, value: number): string {
  return trend.isPercent ? `${value.toFixed(1)}%` : value.toFixed(1);
}

type Verdict = "better" | "worse" | "unclear" | "too-few";

/** Recent vs. earlier, called a change only when it clears two standard errors. */
function verdictFor(trend: MetricTrend): Verdict {
  const { recent, earlier } = trend;
  if (!recent || !earlier || recent.points < 2 || earlier.points < 2) {
    return "too-few";
  }
  const diff = recent.meanResidual - earlier.meanResidual;
  const se = Math.hypot(recent.standardError, earlier.standardError);
  if (Math.abs(diff) < 2 * se) return "unclear";
  return diff > 0 ? "better" : "worse";
}

function windowText(
  tr: Translations,
  trend: MetricTrend,
  w: WindowSummary | null,
): string {
  if (!w) return "—";
  return `${signed(w.meanResidual)} ±${w.standardError.toFixed(1)} ${unit(tr, trend)}`;
}

const CHART_W = 320;
const CHART_H = 120;
const PAD_L = 30;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 18;
/** Characters with fewer games than this stay out of the scope picker (still in "All"). */
const MIN_SCOPE_GAMES = 10;
/** Sessions shorter than this are drawn faintly: their bars are wide enough to dominate the
 * chart while saying little. */
const FAINT_BELOW_GAMES = 3;
/** Rolling mean over this many sessions (opportunity-weighted). */
const ROLLING_SESSIONS = 5;

/** One small chart: each session's residual with a ±1 SE bar, a zero line (= expected), and a
 * rolling mean. Single series, so no legend; the card title names it. */
function renderChart(
  trend: MetricTrend,
  points: readonly ProgressPoint[],
  tr: Translations,
): string {
  const rows = points
    .map((p, index) => ({ p, index, m: p.metrics[trend.id] }))
    .filter((r): r is typeof r & { m: NonNullable<typeof r.m> } => !!r.m);
  if (rows.length === 0) return "";

  const t0 = rows[0]!.p.start.getTime();
  const t1 = rows[rows.length - 1]!.p.start.getTime();
  const span = Math.max(1, t1 - t0);
  // Symmetric y range around "as expected". Cap the bars so one tiny session can't flatten the
  // rest; its bar is clipped at the edge instead.
  const sorted = rows.map((r) => Math.abs(r.m.residual)).sort((a, b) => a - b);
  const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? 1;
  const yMax = Math.max(p90 * 1.4, trend.isPercent ? 4 : 1);
  const innerW = CHART_W - PAD_L - PAD_R;
  const innerH = CHART_H - PAD_T - PAD_B;
  const x = (time: number) => PAD_L + ((time - t0) / span) * innerW;
  const y = (v: number) =>
    PAD_T +
    innerH / 2 -
    (Math.max(-yMax, Math.min(yMax, v)) / yMax) * (innerH / 2);
  const maxW = Math.max(...rows.map((r) => r.m.opportunities));

  const bars = rows
    .map(({ p, m }) => {
      const cx = x(p.start.getTime());
      const faint = p.games < FAINT_BELOW_GAMES ? " faint" : "";
      return `<line class="progress-chart-se${faint}" x1="${cx}" x2="${cx}" y1="${y(m.residual - m.standardError)}" y2="${y(m.residual + m.standardError)}" />`;
    })
    .join("");

  const rolling: string[] = [];
  rows.forEach((_, i) => {
    const win = rows.slice(Math.max(0, i - ROLLING_SESSIONS + 1), i + 1);
    const w = win.reduce((s, r) => s + r.m.opportunities, 0);
    const mean =
      win.reduce((s, r) => s + r.m.residual * r.m.opportunities, 0) / w;
    rolling.push(
      `${x(rows[i]!.p.start.getTime()).toFixed(1)},${y(mean).toFixed(1)}`,
    );
  });

  const dots = rows
    .map(({ p, m, index }) => {
      const cx = x(p.start.getTime());
      const cy = y(m.residual);
      const r = 2.5 + 3 * Math.sqrt(m.opportunities / maxW);
      const tip = [
        `${formatDate(p.start)} · ${p.opponentName}`,
        `${tr.progressGamesCount(p.games)} (${tr.sessionRecord(p.wins, p.losses)})`,
        tr.progressTooltipExpected(
          formatValue(trend, m.value),
          formatValue(trend, m.expected),
        ),
        `${signed(m.residual)} ±${m.standardError.toFixed(1)} ${unit(tr, trend)} ${tr.progressVsExpected}`,
      ].join("\n");
      const faint = p.games < FAINT_BELOW_GAMES ? " faint" : "";
      return `<g class="progress-chart-point${faint}" data-point="${index}" data-tip="${escapeHtml(tip)}">
        <circle class="progress-chart-hit" cx="${cx}" cy="${cy}" r="9" />
        <circle class="progress-chart-dot" cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" />
      </g>`;
    })
    .join("");

  const first = rows[0]!.p.start;
  const last = rows[rows.length - 1]!.p.start;
  const yLabel = (v: number) => (v > 0 ? `+${v.toFixed(0)}` : v.toFixed(0));

  return `<svg class="progress-chart" viewBox="0 0 ${CHART_W} ${CHART_H}" role="img"
      aria-label="${escapeHtml(str(tr, METRIC_LABELS[trend.id].label))}">
    <line class="progress-chart-zero" x1="${PAD_L}" x2="${CHART_W - PAD_R}" y1="${y(0)}" y2="${y(0)}" />
    <text class="progress-chart-axis" x="${PAD_L - 4}" y="${y(yMax) + 4}" text-anchor="end">${yLabel(yMax)}</text>
    <text class="progress-chart-axis" x="${PAD_L - 4}" y="${y(0) + 3}" text-anchor="end">0</text>
    <text class="progress-chart-axis" x="${PAD_L - 4}" y="${y(-yMax)}" text-anchor="end">${yLabel(-yMax)}</text>
    <text class="progress-chart-axis" x="${PAD_L}" y="${CHART_H - 4}">${escapeHtml(formatDate(first))}</text>
    <text class="progress-chart-axis" x="${CHART_W - PAD_R}" y="${CHART_H - 4}" text-anchor="end">${escapeHtml(formatDate(last))}</text>
    ${bars}
    ${rows.length > 1 ? `<polyline class="progress-chart-rolling" points="${rolling.join(" ")}" />` : ""}
    ${dots}
  </svg>`;
}

function renderMetricCard(
  trend: MetricTrend,
  report: ProgressReport,
  tr: Translations,
): string {
  const labels = METRIC_LABELS[trend.id];
  const verdict = verdictFor(trend);
  const verdictText = {
    better: tr.progressVerdictBetter,
    worse: tr.progressVerdictWorse,
    unclear: tr.progressVerdictUnclear,
    "too-few": tr.progressVerdictTooFew,
  }[verdict];
  const verdictIcon = { better: "▲", worse: "▼", unclear: "•", "too-few": "•" }[
    verdict
  ];
  const verdictClass =
    verdict === "better" ? "delta-pos" : verdict === "worse" ? "delta-neg" : "";
  const overall =
    trend.pooled !== null
      ? tr.progressOverall(
          formatValue(trend, trend.pooled),
          trend.strengthCorrelation !== null
            ? trend.strengthCorrelation.toFixed(2)
            : "—",
        )
      : "";

  return `<section class="progress-card" data-metric="${trend.id}">
    <div class="progress-card-header">
      <h3>${escapeHtml(str(tr, labels.label))}</h3>
      <span class="progress-verdict ${verdictClass}">${verdictIcon} ${escapeHtml(verdictText)}</span>
    </div>
    <p class="progress-card-hint">${escapeHtml(str(tr, labels.hint))}</p>
    <dl class="progress-windows">
      <div><dt>${escapeHtml(tr.progressRecentLabel(RECENT_WINDOW_DAYS))}</dt>
        <dd>${escapeHtml(windowText(tr, trend, trend.recent))}</dd></div>
      <div><dt>${escapeHtml(tr.progressEarlierLabel)}</dt>
        <dd>${escapeHtml(windowText(tr, trend, trend.earlier))}</dd></div>
    </dl>
    ${renderChart(trend, report.points, tr)}
    <p class="progress-card-foot">${escapeHtml(overall)}</p>
  </section>`;
}

function pct(v: number | undefined): string {
  return v === undefined ? "—" : `${v.toFixed(1)}%`;
}

function renderRepeated(report: ProgressReport, tr: Translations): string {
  if (report.repeatedOpponents.length === 0) return "";
  const rows = report.repeatedOpponents
    .map((track) =>
      track.points
        .map(
          (
            p,
            i,
          ) => `<tr data-session-id="${escapeHtml(p.sessionId)}" class="progress-row-link">
            <td>${i === 0 ? escapeHtml(track.opponentName) : ""}</td>
            <td>${escapeHtml(formatDate(p.start))}</td>
            <td>${p.games}</td>
            <td>${escapeHtml(tr.sessionRecord(p.wins, p.losses))}</td>
            <td>${pct(p.metrics.openingShare?.value)}</td>
            <td>${p.metrics.damagePerOpening?.value.toFixed(1) ?? "—"}</td>
            <td>${pct(p.metrics.baitShare?.value)}</td>
            <td>${pct(p.metrics.hitBackShare?.value)}</td>
          </tr>`,
        )
        .join(""),
    )
    .join("");
  return `<section class="progress-section">
    <h3>${escapeHtml(tr.progressRepeatedTitle)}</h3>
    <p class="progress-section-hint">${escapeHtml(tr.progressRepeatedHint)}</p>
    <div class="progress-table-wrap"><table class="progress-table">
      <thead><tr>
        <th>${escapeHtml(tr.progressColOpponent)}</th><th>${escapeHtml(tr.progressColDate)}</th>
        <th>${escapeHtml(tr.progressColGames)}</th><th>${escapeHtml(tr.progressColRecord)}</th>
        <th>${escapeHtml(tr.progressColOpeningShare)}</th><th>${escapeHtml(tr.progressColDamage)}</th>
        <th>${escapeHtml(tr.progressColBait)}</th><th>${escapeHtml(tr.progressColHitBack)}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </section>`;
}

function renderAdaptation(report: ProgressReport, tr: Translations): string {
  if (report.adaptation.length === 0) return "";
  const rows = report.adaptation
    .map((a) => {
      const change =
        a.firstThirdShare !== null && a.lastThirdShare !== null
          ? a.lastThirdShare - a.firstThirdShare
          : null;
      const cls =
        change === null
          ? ""
          : change > 0
            ? "delta-pos"
            : change < 0
              ? "delta-neg"
              : "";
      return `<tr data-session-id="${escapeHtml(a.sessionId)}" class="progress-row-link">
        <td>${escapeHtml(formatDate(a.start))}</td>
        <td>${escapeHtml(a.opponentName)}</td>
        <td>${a.games}</td>
        <td>${a.firstThirdShare !== null ? `${a.firstThirdShare.toFixed(1)}%` : "—"}</td>
        <td>${a.lastThirdShare !== null ? `${a.lastThirdShare.toFixed(1)}%` : "—"}</td>
        <td class="${cls}">${change !== null ? `${signed(change)} ${escapeHtml(tr.progressUnitPoints)}` : "—"}</td>
      </tr>`;
    })
    .join("");
  return `<section class="progress-section">
    <h3>${escapeHtml(tr.progressAdaptationTitle)}</h3>
    <p class="progress-section-hint">${escapeHtml(tr.progressAdaptationHint)}</p>
    <div class="progress-table-wrap"><table class="progress-table">
      <thead><tr>
        <th>${escapeHtml(tr.progressColDate)}</th><th>${escapeHtml(tr.progressColOpponent)}</th>
        <th>${escapeHtml(tr.progressColGames)}</th><th>${escapeHtml(tr.progressColFirstThird)}</th>
        <th>${escapeHtml(tr.progressColLastThird)}</th><th>${escapeHtml(tr.progressColChange)}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </section>`;
}

function renderStrength(report: ProgressReport, tr: Translations): string {
  const rows = report.opponents.filter((o) => o.games > 0);
  if (rows.length === 0) return "";
  const max = Math.max(1, ...rows.map((o) => Math.abs(o.strength)));
  const items = rows
    .map((o) => {
      const width = (Math.abs(o.strength) / max) * 50;
      const left = o.strength >= 0 ? 50 : 50 - width;
      return `<li class="progress-strength-row">
        <span class="progress-strength-name">${escapeHtml(o.opponentName)}</span>
        <span class="progress-strength-track"><span class="progress-strength-bar ${o.strength >= 0 ? "stronger" : "weaker"}"
          style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%"></span></span>
        <span class="progress-strength-value">${signed(o.strength, 2)}</span>
        <span class="progress-strength-games">${escapeHtml(tr.progressGamesCount(o.games))}</span>
      </li>`;
    })
    .join("");
  return `<section class="progress-section">
    <h3>${escapeHtml(tr.progressStrengthTitle)}</h3>
    <p class="progress-section-hint">${escapeHtml(tr.progressStrengthHint)}</p>
    <ul class="progress-strength-list">${items}</ul>
  </section>`;
}

/**
 * The Progress page (#/progress): opponent-adjusted trends for the player's main, the same
 * opponent on different days, adaptation within long sets, and the inferred opponent strengths
 * the adjustment rests on. See docs/STATISTICS.md §5.
 */
export class ProgressViewController {
  private summaries: GameSummary[] = [];
  private identity: Identity | null = null;
  /** Character family the user picked; undefined = follow the detected main. Kept separate from
   * the default so a choice made while demo data was loaded doesn't stick after a real import. */
  private chosenFamily: number | null | undefined = undefined;

  constructor(
    private readonly container: HTMLElement,
    private readonly onSelectSession: (sessionId: string) => void,
  ) {
    this.container.addEventListener("click", (e) => {
      const target = e.target as Element;
      const scope = target.closest<HTMLElement>("[data-family]");
      if (scope) {
        const raw = scope.dataset.family!;
        this.chosenFamily = raw === "all" ? null : Number(raw);
        this.render();
        return;
      }
      const link = target.closest<HTMLElement>("[data-session-id]");
      if (link?.dataset.sessionId) this.onSelectSession(link.dataset.sessionId);
    });
    this.container.addEventListener("mouseover", (e) => this.showTooltip(e));
    this.container.addEventListener("mouseout", (e) => {
      if ((e.target as Element).closest(".progress-chart-point"))
        this.hideTooltip();
    });
  }

  public setData(summaries: GameSummary[], identity: Identity): void {
    this.summaries = summaries;
    this.identity = identity;
  }

  private pointsForClick: readonly ProgressPoint[] = [];

  public render(): void {
    const tr = t();
    if (!this.identity || this.identity.aliases.size === 0) {
      this.container.innerHTML = `<div class="progress-page"><h2>${escapeHtml(tr.progressTitle)}</h2>
        <p class="progress-empty">${escapeHtml(tr.progressNoIdentity)}</p></div>`;
      return;
    }

    const families = playedCharacterFamilies(this.summaries, this.identity);
    const main = detectMainCharacter(this.summaries, this.identity);
    const defaultFamily =
      main !== null ? characterFamily(main) : (families[0]?.family ?? null);
    const chosen = this.chosenFamily;
    const family =
      chosen === null
        ? null
        : chosen !== undefined && families.some((f) => f.family === chosen)
          ? chosen
          : defaultFamily;
    const report = computeProgress(this.summaries, this.identity, family);
    this.pointsForClick = report.points;

    const chips = [
      ...families
        .filter((f) => f.games >= MIN_SCOPE_GAMES || f.family === family)
        .map(
          (
            f,
          ) => `<button type="button" class="progress-scope-chip" data-family="${f.family}"
          aria-pressed="${f.family === family}">${escapeHtml(characterName(f.family))}
          <span class="progress-scope-count">${f.games}</span></button>`,
        ),
      `<button type="button" class="progress-scope-chip" data-family="all"
        aria-pressed="${family === null}">${escapeHtml(tr.progressScopeAll)}</button>`,
    ].join("");

    const body =
      report.games === 0
        ? `<p class="progress-empty">${escapeHtml(tr.progressNoGames)}</p>`
        : `<div class="progress-grid">${report.trends.map((trend) => renderMetricCard(trend, report, tr)).join("")}</div>
           ${renderRepeated(report, tr)}
           ${renderAdaptation(report, tr)}
           ${renderStrength(report, tr)}`;

    this.container.innerHTML = `<div class="progress-page">
      <div class="progress-header">
        <h2>${escapeHtml(tr.progressTitle)}</h2>
        <div class="progress-scope" role="group">${chips}</div>
      </div>
      <p class="progress-intro">${escapeHtml(tr.progressIntro)}</p>
      ${body}
      <div class="progress-tooltip" hidden></div>
    </div>`;

    for (const g of this.container.querySelectorAll<SVGGElement>(
      ".progress-chart-point",
    )) {
      const point = this.pointsForClick[Number(g.dataset.point)];
      if (point) g.dataset.sessionId = point.sessionId;
    }
  }

  private showTooltip(e: MouseEvent): void {
    const g = (e.target as Element).closest<SVGGElement>(
      ".progress-chart-point",
    );
    const tip = this.container.querySelector<HTMLElement>(".progress-tooltip");
    if (!g || !tip) return;
    tip.textContent = g.dataset.tip ?? "";
    tip.hidden = false;
    const page = this.container.querySelector<HTMLElement>(".progress-page")!;
    const box = page.getBoundingClientRect();
    const dot = g.getBoundingClientRect();
    const left = Math.min(
      dot.left - box.left + dot.width / 2 + 10,
      box.width - tip.offsetWidth - 8,
    );
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top = `${dot.top - box.top + dot.height + 6}px`;
  }

  private hideTooltip(): void {
    const tip = this.container.querySelector<HTMLElement>(".progress-tooltip");
    if (tip) tip.hidden = true;
  }
}
