/**
 * Shared desktop/mobile breakpoint, matching the 860px cutoff index.html
 * already uses for the mobile sidebar toggle (@media (max-width: 860px)).
 * Desktop is >= 861px.
 */
const DESKTOP_MIN_WIDTH = 861;

export function isDesktopWidth(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth >= DESKTOP_MIN_WIDTH;
}

/**
 * Calls `onChange` immediately with the current value, then again whenever
 * the viewport crosses the breakpoint. Mirrors theme.ts's initTheme()
 * listener setup, including the legacy MediaQueryList.addListener fallback
 * for older browsers that don't support addEventListener on it.
 */
export function watchDesktopWidth(
  onChange: (isDesktop: boolean) => void,
): () => void {
  onChange(isDesktopWidth());

  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }

  const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);
  const listener = () => onChange(mq.matches);

  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }
  const legacy = mq as unknown as {
    addListener: (fn: () => void) => void;
    removeListener: (fn: () => void) => void;
  };
  if (typeof legacy.addListener === "function") {
    legacy.addListener(listener);
    return () => legacy.removeListener(listener);
  }
  return () => {};
}
