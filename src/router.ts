import type { StartingAreaBox } from "./playlist.js";

export type SearchType = "edgeGuards" | "combos";

export interface SearchRouteCriteria {
  readonly type: SearchType;
  /** Edge guards only. */
  readonly result: "success" | "failure" | null;
  readonly sessionId: string | null;
  readonly playerName: string | null;
  readonly playerCharacterId: number | null;
  readonly opponentCharacterId: number | null;
  readonly jumpCount: number | null;
  readonly startingAreaBox: StartingAreaBox | null;
  /** Combos only: who the combo was done on (playerName is who did it). */
  readonly victimName: string | null;
  /** Combos only: minimum hits (null = the default, 3). */
  readonly minHits: number | null;
  /** Combos only: true = KO'd, false = didn't, null = either. */
  readonly killed: boolean | null;
  /** Combos only: join combos across combo-meter resets of 0.5 s or less. */
  readonly allowGaps: boolean;
}

/** Filter params encoded in the Edge Guard Workshop URL.
 * Only non-default values appear in the query string; an absent param means
 * the "all" / default value for that filter. */
export interface EgwFilters {
  readonly jumps?: number | "all";
  readonly outcome?: "all" | "success" | "fail";
  readonly recency?: "all" | "month" | "since";
  /** YYYY-MM-DD — only meaningful when recency === "since". */
  readonly since?: string;
  readonly opponent?: string;
  readonly session?: string;
}

export type Route =
  | { view: "library" }
  | { view: "match"; id: string }
  | { view: "preview" }
  | { view: "session"; id: string }
  | { view: "matchup"; myChar: number; oppChar: number }
  | {
      view: "edgeGuardWorkshop";
      myChar: number;
      oppChar: number;
      filters: EgwFilters;
    }
  | ({ view: "search" } & SearchRouteCriteria);

function parseIntParam(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseAreaBox(params: URLSearchParams): StartingAreaBox | null {
  const minX = parseIntParam(params, "areaMinX");
  const maxX = parseIntParam(params, "areaMaxX");
  const minY = parseIntParam(params, "areaMinY");
  const maxY = parseIntParam(params, "areaMaxY");
  if (minX === null || maxX === null || minY === null || maxY === null) {
    return null;
  }
  return { minX, maxX, minY, maxY };
}

function parseEgwFilters(queryStr: string): EgwFilters {
  const params = new URLSearchParams(queryStr);

  const rawJumps = params.get("jumps");
  const jumps: number | "all" | undefined =
    rawJumps === null
      ? undefined
      : rawJumps === "all"
        ? "all"
        : Number.isFinite(Number(rawJumps))
          ? Number(rawJumps)
          : undefined;

  const rawOutcome = params.get("outcome");
  const outcome: "all" | "success" | "fail" | undefined =
    rawOutcome === "success" || rawOutcome === "fail" || rawOutcome === "all"
      ? rawOutcome
      : undefined;

  const rawRecency = params.get("recency");
  const recency: "all" | "month" | "since" | undefined =
    rawRecency === "month" || rawRecency === "since" || rawRecency === "all"
      ? rawRecency
      : undefined;

  return {
    ...(jumps !== undefined && { jumps }),
    ...(outcome !== undefined && { outcome }),
    ...(recency !== undefined && { recency }),
    ...(params.has("since") && { since: params.get("since")! }),
    ...(params.has("opponent") && { opponent: params.get("opponent")! }),
    ...(params.has("session") && { session: params.get("session")! }),
  };
}

export function parseRoute(hash: string): Route {
  const clean = hash.replace(/^#\/?/, "");
  if (clean.startsWith("match/")) {
    const id = clean.slice("match/".length);
    if (id) return { view: "match", id };
  }
  if (clean === "preview" || clean.startsWith("preview") || clean === "debug") {
    return { view: "preview" };
  }
  if (clean.startsWith("session/")) {
    const id = decodeURIComponent(clean.slice("session/".length));
    if (id) return { view: "session", id };
  }
  if (clean.startsWith("matchup/")) {
    const parts = clean.slice("matchup/".length).split("/");
    const myChar = Number(parts[0]);
    const oppChar = Number(parts[1]);
    if (Number.isFinite(myChar) && Number.isFinite(oppChar)) {
      // Third segment may be "recoveries", "recoveries?...", or "workshop" (legacy alias).
      const thirdSegment = parts[2] ?? "";
      if (
        thirdSegment === "workshop" ||
        thirdSegment === "recoveries" ||
        thirdSegment.startsWith("recoveries?")
      ) {
        const qIdx = thirdSegment.indexOf("?");
        const queryStr = qIdx >= 0 ? thirdSegment.slice(qIdx + 1) : "";
        return {
          view: "edgeGuardWorkshop",
          myChar,
          oppChar,
          filters: parseEgwFilters(queryStr),
        };
      }
      return { view: "matchup", myChar, oppChar };
    }
  }
  if (clean === "search" || clean.startsWith("search?")) {
    const queryStr = clean.includes("?")
      ? clean.slice(clean.indexOf("?") + 1)
      : "";
    const params = new URLSearchParams(queryStr);
    const result = params.get("result");
    const ko = params.get("ko");
    return {
      view: "search",
      type: params.get("type") === "combos" ? "combos" : "edgeGuards",
      result: result === "success" || result === "failure" ? result : null,
      sessionId: params.get("sessionId"),
      playerName: params.get("player"),
      playerCharacterId: parseIntParam(params, "playerChar"),
      opponentCharacterId: parseIntParam(params, "oppChar"),
      jumpCount: parseIntParam(params, "jumps"),
      startingAreaBox: parseAreaBox(params),
      victimName: params.get("victim"),
      minHits: parseIntParam(params, "minHits"),
      killed: ko === "1" ? true : ko === "0" ? false : null,
      allowGaps: params.get("gaps") === "1",
    };
  }
  return { view: "library" };
}

export function navigateToLibrary(): void {
  window.location.hash = "#/";
}

export function navigateToMatch(id: string): void {
  window.location.hash = `#/match/${encodeURIComponent(id)}`;
}

export function navigateToPreview(): void {
  window.location.hash = "#/preview";
}

export function navigateToSession(id: string): void {
  window.location.hash = `#/session/${encodeURIComponent(id)}`;
}

export function navigateToMatchup(myChar: number, oppChar: number): void {
  window.location.hash = `#/matchup/${myChar}/${oppChar}`;
}

export function navigateToEdgeGuardWorkshop(
  myChar: number,
  oppChar: number,
  filters?: EgwFilters,
): void {
  window.location.hash = recoveriesHash(myChar, oppChar, filters);
}

/** Builds the #/matchup/{m}/{o}/recoveries[?...] hash for the given filters.
 * Only non-default filter values are included in the query string. */
export function recoveriesHash(
  myChar: number,
  oppChar: number,
  filters?: EgwFilters,
): string {
  const params = new URLSearchParams();
  if (filters?.jumps !== undefined && filters.jumps !== "all") {
    params.set("jumps", String(filters.jumps));
  }
  if (filters?.outcome && filters.outcome !== "all") {
    params.set("outcome", filters.outcome);
  }
  if (filters?.recency && filters.recency !== "all") {
    params.set("recency", filters.recency);
    if (filters.recency === "since" && filters.since) {
      params.set("since", filters.since);
    }
  }
  if (filters?.opponent && filters.opponent !== "all") {
    params.set("opponent", filters.opponent);
  }
  if (filters?.session && filters.session !== "all") {
    params.set("session", filters.session);
  }
  const qs = params.toString();
  return `#/matchup/${myChar}/${oppChar}/recoveries${qs ? `?${qs}` : ""}`;
}

export function navigateToSearch(criteria: SearchRouteCriteria): void {
  window.location.hash = searchHash(criteria);
}

/** The #/search URL for `criteria` - parseRoute() reads it back unchanged. */
export function searchHash(criteria: SearchRouteCriteria): string {
  const params = new URLSearchParams();
  if (criteria.type === "combos") params.set("type", "combos");
  if (criteria.result) params.set("result", criteria.result);
  if (criteria.sessionId) params.set("sessionId", criteria.sessionId);
  if (criteria.playerName) params.set("player", criteria.playerName);
  if (criteria.playerCharacterId !== null) {
    params.set("playerChar", String(criteria.playerCharacterId));
  }
  if (criteria.opponentCharacterId !== null) {
    params.set("oppChar", String(criteria.opponentCharacterId));
  }
  if (criteria.jumpCount !== null) {
    params.set("jumps", String(criteria.jumpCount));
  }
  if (criteria.startingAreaBox) {
    params.set("areaMinX", String(criteria.startingAreaBox.minX));
    params.set("areaMaxX", String(criteria.startingAreaBox.maxX));
    params.set("areaMinY", String(criteria.startingAreaBox.minY));
    params.set("areaMaxY", String(criteria.startingAreaBox.maxY));
  }
  if (criteria.victimName) params.set("victim", criteria.victimName);
  if (criteria.minHits !== null) {
    params.set("minHits", String(criteria.minHits));
  }
  if (criteria.killed !== null) params.set("ko", criteria.killed ? "1" : "0");
  if (criteria.allowGaps) params.set("gaps", "1");
  const qs = params.toString();
  return `#/search${qs ? `?${qs}` : ""}`;
}

export function onRoute(callback: (route: Route) => void): () => void {
  const handler = () => callback(parseRoute(window.location.hash));
  window.addEventListener("hashchange", handler);
  handler();
  return () => window.removeEventListener("hashchange", handler);
}
