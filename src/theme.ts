export type Theme = "dark" | "light";
export type ThemePreference = "system" | "dark" | "light";

export const THEME_STORAGE_KEY = "rmgr-viewer-theme";

export function getSystemTheme(): Theme {
  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  ) {
    return "light";
  }
  return "dark";
}

export function getStoredThemePreference(): ThemePreference {
  try {
    if (typeof localStorage === "undefined") return "system";
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light" || stored === "system") {
      return stored;
    }
  } catch {
    // Ignore localStorage access errors
  }
  return "system";
}

export function getStoredTheme(): Theme | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch {
    // Ignore localStorage access errors
  }
  return null;
}

export function getEffectiveTheme(): Theme {
  const pref = getStoredThemePreference();
  if (pref === "system") {
    return getSystemTheme();
  }
  return pref;
}

export function applyThemeToDOM(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="color-scheme"]',
  );
  if (meta) {
    meta.content = theme;
  }
}

export function setThemePreference(pref: ThemePreference): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(THEME_STORAGE_KEY, pref);
    }
  } catch {
    // Ignore localStorage write error
  }
  applyThemeToDOM(getEffectiveTheme());
}

export function setTheme(theme: Theme): void {
  setThemePreference(theme);
}

export function toggleTheme(): Theme {
  const current = getEffectiveTheme();
  const next: Theme = current === "dark" ? "light" : "dark";
  setThemePreference(next);
  return next;
}

export function initTheme(
  onThemeChange?: (theme: Theme, pref: ThemePreference) => void,
): () => void {
  const effective = getEffectiveTheme();
  const pref = getStoredThemePreference();
  applyThemeToDOM(effective);
  onThemeChange?.(effective, pref);

  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }

  const darkMq = window.matchMedia("(prefers-color-scheme: dark)");
  const lightMq = window.matchMedia("(prefers-color-scheme: light)");

  const listener = () => {
    // When preference is system, automatically update theme whenever OS preference changes
    if (getStoredThemePreference() === "system") {
      const newTheme = getSystemTheme();
      applyThemeToDOM(newTheme);
      onThemeChange?.(newTheme, "system");
    }
  };

  const cleanups: (() => void)[] = [];

  for (const mq of [darkMq, lightMq]) {
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", listener);
      cleanups.push(() => mq.removeEventListener("change", listener));
    } else if (
      typeof (mq as unknown as { addListener?: (fn: () => void) => void })
        .addListener === "function"
    ) {
      (mq as unknown as { addListener: (fn: () => void) => void }).addListener(
        listener,
      );
      cleanups.push(() =>
        (
          mq as unknown as { removeListener: (fn: () => void) => void }
        ).removeListener(listener),
      );
    }
  }

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
