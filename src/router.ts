import type { StartingAreaBox } from "./playlist.js";

export interface SearchRouteCriteria {
  readonly result: "success" | "failure" | null;
  readonly sessionId: string | null;
  readonly playerName: string | null;
  readonly playerCharacterId: number | null;
  readonly opponentCharacterId: number | null;
  readonly jumpCount: number | null;
  readonly startingAreaBox: StartingAreaBox | null;
}

export type Route =
  | { view: "library" }
  | { view: "match"; id: string }
  | { view: "preview" }
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

export function parseRoute(hash: string): Route {
  const clean = hash.replace(/^#\/?/, "");
  if (clean.startsWith("match/")) {
    const id = clean.slice("match/".length);
    if (id) return { view: "match", id };
  }
  if (clean === "preview" || clean.startsWith("preview") || clean === "debug") {
    return { view: "preview" };
  }
  if (clean === "search" || clean.startsWith("search?")) {
    const queryStr = clean.includes("?")
      ? clean.slice(clean.indexOf("?") + 1)
      : "";
    const params = new URLSearchParams(queryStr);
    const result = params.get("result");
    return {
      view: "search",
      result: result === "success" || result === "failure" ? result : null,
      sessionId: params.get("sessionId"),
      playerName: params.get("player"),
      playerCharacterId: parseIntParam(params, "playerChar"),
      opponentCharacterId: parseIntParam(params, "oppChar"),
      jumpCount: parseIntParam(params, "jumps"),
      startingAreaBox: parseAreaBox(params),
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

export function navigateToSearch(criteria: SearchRouteCriteria): void {
  const params = new URLSearchParams();
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
  const qs = params.toString();
  window.location.hash = `#/search${qs ? `?${qs}` : ""}`;
}

export function onRoute(callback: (route: Route) => void): () => void {
  const handler = () => callback(parseRoute(window.location.hash));
  window.addEventListener("hashchange", handler);
  handler();
  return () => window.removeEventListener("hashchange", handler);
}
