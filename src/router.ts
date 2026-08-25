export type Route = { view: "library" } | { view: "match"; id: string };

export function parseRoute(hash: string): Route {
  const clean = hash.replace(/^#\/?/, "");
  if (clean.startsWith("match/")) {
    const id = clean.slice("match/".length);
    if (id) return { view: "match", id };
  }
  return { view: "library" };
}

export function navigateToLibrary(): void {
  window.location.hash = "#/";
}

export function navigateToMatch(id: string): void {
  window.location.hash = `#/match/${encodeURIComponent(id)}`;
}

export function onRoute(callback: (route: Route) => void): () => void {
  const handler = () => callback(parseRoute(window.location.hash));
  window.addEventListener("hashchange", handler);
  handler();
  return () => window.removeEventListener("hashchange", handler);
}
