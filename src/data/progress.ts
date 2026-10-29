import type { GameSummary, RawCounters } from "./gameSummary.js";
import type { Identity } from "./identity.js";
import { filterGameSummaries } from "./aggregate.js";
import { computeOpponentStrength } from "./opponentStrength.js";
import { groupGamesIntoSessions } from "./session.js";
import { characterFamily } from "./characterFamily.js";

/**
 * Change over time, adjusted for who the opponent was (docs/STATISTICS.md §5).
 *
 * Raw rates pooled by date mostly measure the schedule: a month of sets against top players looks
 * like a slump, a month against weaker ones like a breakthrough. Instead, each metric is fitted
 * against inferred opponent strength across all sessions, and each session is shown as its
 * residual: actual minus what that opponent's strength predicts.
 */

export type ProgressMetricId =
  | "openingShare"
  | "damagePerOpening"
  | "damageGivenBack"
  | "baitShare"
  | "hitBackShare"
  | "recovery";

interface MetricDefinition {
  readonly id: ProgressMetricId;
  /** Displayed as a percentage (x100) rather than a raw per-opening amount. */
  readonly isPercent: boolean;
  readonly higherIsBetter: boolean;
  readonly numerator: (c: RawCounters) => number;
  readonly denominator: (c: RawCounters) => number;
}

export const PROGRESS_METRICS: readonly MetricDefinition[] = [
  {
    id: "openingShare",
    isPercent: true,
    higherIsBetter: true,
    numerator: (c) => c.openingsWon ?? 0,
    denominator: (c) => (c.openingsWon ?? 0) + (c.openingsLost ?? 0),
  },
  {
    id: "damagePerOpening",
    isPercent: false,
    higherIsBetter: true,
    numerator: (c) => c.damageDealtOnOpenings ?? 0,
    denominator: (c) => c.openingsWon ?? 0,
  },
  {
    // Damage taken while holding the advantage you opened with.
    id: "damageGivenBack",
    isPercent: false,
    higherIsBetter: false,
    numerator: (c) => c.damageLeakOnOpenings ?? 0,
    denominator: (c) => c.openingsWon ?? 0,
  },
  {
    // Openings won because the opponent committed (whiffed, or landed into you): baiting.
    id: "baitShare",
    isPercent: true,
    higherIsBetter: true,
    numerator: (c) =>
      (c.openingsWonByReason?.["whiff-punish"] ?? 0) +
      (c.openingsWonByReason?.["landing-lag"] ?? 0),
    denominator: (c) => c.openingsWon ?? 0,
  },
  {
    // Openings lost by getting hit back after having the last hit (ANALYSIS_SPECIFICATIONS §4.4).
    id: "hitBackShare",
    isPercent: true,
    higherIsBetter: false,
    numerator: (c) => c.openingsLostByReason?.["reversal"] ?? 0,
    denominator: (c) => c.openingsLost ?? 0,
  },
  {
    id: "recovery",
    isPercent: true,
    higherIsBetter: true,
    numerator: (c) => c.recoverySuccesses,
    denominator: (c) => c.recoverySituations,
  },
];

/** Sessions recorded within this many days of the latest one count as "recent". */
export const RECENT_WINDOW_DAYS = 30;
/** A set this long (in-scope games) is split into thirds to show within-set adaptation. */
export const LONG_SET_GAMES = 30;

export interface MetricValue {
  /** Pooled numerator / denominator (x100 for percentage metrics). */
  readonly value: number;
  /** The pooled denominator: openings, situations, ... */
  readonly opportunities: number;
  /** What the strength fit predicts for this opponent, same units as value. */
  readonly expected: number;
  /** value - expected, sign-flipped for lower-is-better metrics so positive is always good. */
  readonly residual: number;
  /** One standard error of the residual, from the fit's scatter and this point's weight. */
  readonly standardError: number;
}

/** One opponent within one session, restricted to the scoped character. */
export interface ProgressPoint {
  readonly sessionId: string;
  readonly start: Date;
  readonly opponentName: string;
  readonly games: number;
  readonly wins: number;
  readonly losses: number;
  /** Inferred strength relative to you, in stocks (positive = stronger). */
  readonly opponentStrength: number;
  readonly metrics: Partial<Record<ProgressMetricId, MetricValue>>;
}

export interface WindowSummary {
  readonly points: number;
  /** Opportunity-weighted mean residual over the window (positive = better than expected). */
  readonly meanResidual: number;
  readonly standardError: number;
}

export interface MetricTrend {
  readonly id: ProgressMetricId;
  readonly isPercent: boolean;
  readonly higherIsBetter: boolean;
  /** Pooled value over every in-scope game, for context only. */
  readonly pooled: number | null;
  /** How strongly opponent strength predicts this metric across sessions (weighted r). */
  readonly strengthCorrelation: number | null;
  readonly recent: WindowSummary | null;
  readonly earlier: WindowSummary | null;
}

export interface OpponentStrengthRow {
  readonly opponentName: string;
  readonly games: number;
  readonly strength: number;
}

/** The same opponent on different days: raw numbers, no model needed. */
export interface RepeatedOpponentTrack {
  readonly opponentName: string;
  readonly points: readonly ProgressPoint[];
}

export interface AdaptationRow {
  readonly sessionId: string;
  readonly start: Date;
  readonly opponentName: string;
  readonly games: number;
  readonly firstThirdShare: number | null;
  readonly lastThirdShare: number | null;
}

export interface ProgressReport {
  /** `characterFamily()` of the scoped character, or null for every character. */
  readonly characterFamily: number | null;
  readonly games: number;
  readonly points: readonly ProgressPoint[];
  readonly trends: readonly MetricTrend[];
  readonly opponents: readonly OpponentStrengthRow[];
  readonly repeatedOpponents: readonly RepeatedOpponentTrack[];
  readonly adaptation: readonly AdaptationRow[];
}

interface ResolvedGame {
  readonly summary: GameSummary;
  readonly counters: RawCounters;
  readonly yourCharacterId: number;
  readonly opponentName: string;
  readonly won: boolean;
  readonly decided: boolean;
}

function resolveGames(
  summaries: readonly GameSummary[],
  identity: Identity,
  family: number | null,
): Map<string, ResolvedGame> {
  const out = new Map<string, ResolvedGame>();
  for (const { summary, yourPort, oppPort } of filterGameSummaries(
    [...summaries],
    identity,
  )) {
    const you = summary.ports.find((p) => p.port === yourPort);
    const opp = summary.ports.find((p) => p.port === oppPort);
    const counters = summary.statsByPort[yourPort as 0 | 1 | 2 | 3];
    if (!you || !opp || !counters) continue;
    if (family !== null && characterFamily(you.characterId) !== family)
      continue;
    out.set(summary.id, {
      summary,
      counters,
      yourCharacterId: you.characterId,
      opponentName: opp.playerName.trim(),
      won: you.finalStocks > opp.finalStocks,
      decided: you.finalStocks !== opp.finalStocks,
    });
  }
  return out;
}

function pool(
  games: readonly ResolvedGame[],
  metric: MetricDefinition,
): { value: number; opportunities: number } | null {
  let num = 0;
  let den = 0;
  for (const g of games) {
    num += metric.numerator(g.counters);
    den += metric.denominator(g.counters);
  }
  if (den <= 0) return null;
  return {
    value: (num / den) * (metric.isPercent ? 100 : 1),
    opportunities: den,
  };
}

interface Fit {
  readonly intercept: number;
  readonly slope: number;
  readonly correlation: number | null;
  /** Weighted residual variance per unit weight: Var(point) ~= sigma2 / weight. */
  readonly sigma2: number;
}

/** Weighted least squares y = a + b*x. Falls back to the weighted mean (b = 0) when x doesn't
 * vary or there are too few points to fit a slope. */
function weightedFit(
  points: readonly { x: number; y: number; w: number }[],
): Fit | null {
  const W = points.reduce((s, p) => s + p.w, 0);
  if (points.length === 0 || W <= 0) return null;
  const mx = points.reduce((s, p) => s + p.w * p.x, 0) / W;
  const my = points.reduce((s, p) => s + p.w * p.y, 0) / W;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of points) {
    sxx += p.w * (p.x - mx) ** 2;
    sxy += p.w * (p.x - mx) * (p.y - my);
    syy += p.w * (p.y - my) ** 2;
  }
  const canFitSlope = points.length >= 3 && sxx > 1e-9;
  const slope = canFitSlope ? sxy / sxx : 0;
  const intercept = my - slope * mx;
  const correlation =
    canFitSlope && syy > 1e-9 ? sxy / Math.sqrt(sxx * syy) : null;
  const dof = points.length - (canFitSlope ? 2 : 1);
  let rss = 0;
  for (const p of points) {
    rss += p.w * (p.y - (intercept + slope * p.x)) ** 2;
  }
  // With too few points to estimate scatter, fall back to the spread around the mean so a
  // single session never claims zero uncertainty.
  const sigma2 = dof > 0 ? rss / dof : syy / Math.max(1, points.length);
  return { intercept, slope, correlation, sigma2 };
}

function summarizeWindow(
  rows: readonly { residual: number; w: number }[],
  sigma2: number,
): WindowSummary | null {
  const W = rows.reduce((s, r) => s + r.w, 0);
  if (rows.length === 0 || W <= 0) return null;
  return {
    points: rows.length,
    meanResidual: rows.reduce((s, r) => s + r.w * r.residual, 0) / W,
    standardError: Math.sqrt(sigma2 / W),
  };
}

/** Opening share (%) pooled over a slice of games, or null with no openings. */
function openingShareOf(games: readonly ResolvedGame[]): number | null {
  return pool(games, PROGRESS_METRICS[0]!)?.value ?? null;
}

/**
 * Builds the progress report for one character family (or every character when `family` is
 * null). Every game in scope counts; weak opponents are handled by the strength adjustment, not by
 * dropping their games.
 */
export function computeProgress(
  summaries: readonly GameSummary[],
  identity: Identity,
  family: number | null,
): ProgressReport {
  // The same game saved twice (same recording, two files) must count once, and would otherwise
  // split its session apart: a copy "starts" before the previous game ended.
  summaries = [...new Map(summaries.map((s) => [s.id, s])).values()];
  const resolved = resolveGames(summaries, identity, family);
  const inScope = [...resolved.values()].map((g) => g.summary);

  // Strength within the scope: how you do against someone depends on what you play.
  const strengthByName = new Map<string, number>();
  const opponents: OpponentStrengthRow[] = [];
  for (const entry of computeOpponentStrength(inScope, identity).values()) {
    const strength = -entry.shrunkMargin;
    strengthByName.set(entry.opponentName, strength);
    opponents.push({
      opponentName: entry.opponentName,
      games: entry.n,
      strength,
    });
  }
  opponents.sort((a, b) => b.strength - a.strength);

  // Sessions come from the whole library so their ids match the session pages; only the scoped
  // games inside each one count. A rotating lobby yields one point per opponent.
  const pointGames: {
    point: Omit<ProgressPoint, "metrics">;
    games: ResolvedGame[];
  }[] = [];
  for (const session of groupGamesIntoSessions(summaries, identity, "oldest")) {
    const byOpponent = new Map<string, ResolvedGame[]>();
    for (const summary of session.games) {
      const g = resolved.get(summary.id);
      if (!g) continue;
      const list = byOpponent.get(g.opponentName) ?? [];
      list.push(g);
      byOpponent.set(g.opponentName, list);
    }
    for (const [opponentName, games] of byOpponent) {
      pointGames.push({
        point: {
          sessionId: session.id,
          start: games[0]!.summary.recordedAt,
          opponentName,
          games: games.length,
          wins: games.filter((g) => g.won).length,
          losses: games.filter((g) => g.decided && !g.won).length,
          opponentStrength: strengthByName.get(opponentName) ?? 0,
        },
        games,
      });
    }
  }
  pointGames.sort((a, b) => a.point.start.getTime() - b.point.start.getTime());

  const metricsByPoint = pointGames.map(
    () => ({}) as Partial<Record<ProgressMetricId, MetricValue>>,
  );
  const latest = pointGames[pointGames.length - 1]?.point.start.getTime() ?? 0;
  const recentCutoff = latest - RECENT_WINDOW_DAYS * 24 * 3600 * 1000;
  const allGames = [...resolved.values()];

  const trends: MetricTrend[] = PROGRESS_METRICS.map((metric) => {
    const raw = pointGames.map(({ point, games }) => {
      const pooled = pool(games, metric);
      return pooled
        ? {
            x: point.opponentStrength,
            y: pooled.value,
            w: pooled.opportunities,
          }
        : null;
    });
    const fit = weightedFit(
      raw.filter((r): r is { x: number; y: number; w: number } => r !== null),
    );
    const sign = metric.higherIsBetter ? 1 : -1;
    const recentRows: { residual: number; w: number }[] = [];
    const earlierRows: { residual: number; w: number }[] = [];

    if (fit) {
      raw.forEach((r, i) => {
        if (!r) return;
        const expected = fit.intercept + fit.slope * r.x;
        const residual = sign * (r.y - expected);
        metricsByPoint[i]![metric.id] = {
          value: r.y,
          opportunities: r.w,
          expected,
          residual,
          standardError: Math.sqrt(fit.sigma2 / r.w),
        };
        const bucket =
          pointGames[i]!.point.start.getTime() >= recentCutoff
            ? recentRows
            : earlierRows;
        bucket.push({ residual, w: r.w });
      });
    }

    return {
      id: metric.id,
      isPercent: metric.isPercent,
      higherIsBetter: metric.higherIsBetter,
      pooled: pool(allGames, metric)?.value ?? null,
      strengthCorrelation: fit?.correlation ?? null,
      recent: fit ? summarizeWindow(recentRows, fit.sigma2) : null,
      earlier: fit ? summarizeWindow(earlierRows, fit.sigma2) : null,
    };
  });

  const points: ProgressPoint[] = pointGames.map(({ point }, i) => ({
    ...point,
    metrics: metricsByPoint[i]!,
  }));

  const byOpponent = new Map<string, ProgressPoint[]>();
  for (const p of points) {
    if (p.games < 3) continue;
    const list = byOpponent.get(p.opponentName) ?? [];
    list.push(p);
    byOpponent.set(p.opponentName, list);
  }
  const repeatedOpponents: RepeatedOpponentTrack[] = [...byOpponent]
    .filter(([, list]) => list.length >= 2)
    .map(([opponentName, list]) => ({ opponentName, points: list }))
    .sort(
      (a, b) =>
        b.points.reduce((s, p) => s + p.games, 0) -
        a.points.reduce((s, p) => s + p.games, 0),
    );

  const adaptation: AdaptationRow[] = pointGames
    .filter(({ games }) => games.length >= LONG_SET_GAMES)
    .map(({ point, games }) => {
      const third = Math.floor(games.length / 3);
      return {
        sessionId: point.sessionId,
        start: point.start,
        opponentName: point.opponentName,
        games: games.length,
        firstThirdShare: openingShareOf(games.slice(0, third)),
        lastThirdShare: openingShareOf(games.slice(-third)),
      };
    });

  return {
    characterFamily: family,
    games: resolved.size,
    points,
    trends,
    opponents,
    repeatedOpponents,
    adaptation,
  };
}

/** Character families you've played, most-played first, for the scope picker. */
export function playedCharacterFamilies(
  summaries: readonly GameSummary[],
  identity: Identity,
): { family: number; games: number }[] {
  const counts = new Map<number, number>();
  for (const g of resolveGames(summaries, identity, null).values()) {
    const family = characterFamily(g.yourCharacterId);
    counts.set(family, (counts.get(family) ?? 0) + 1);
  }
  return [...counts]
    .map(([family, games]) => ({ family, games }))
    .sort((a, b) => b.games - a.games);
}
