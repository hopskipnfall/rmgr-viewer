export type Route =
  { view: "library" } | { view: "match"; id: string } | { view: "preview" };

export function parseRoute(hash: string): Route {
  const clean = hash.replace(/^#\/?/, "");
  if (clean.startsWith("match/")) {
    const id = clean.slice("match/".length);
    if (id) return { view: "match", id };
  }
  if (clean === "preview" || clean.startsWith("preview") || clean === "debug") {
    return { view: "preview" };
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

export function onRoute(callback: (route: Route) => void): () => void {
  const handler = () => callback(parseRoute(window.location.hash));
  window.addEventListener("hashchange", handler);
  handler();
  return () => window.removeEventListener("hashchange", handler);
}
