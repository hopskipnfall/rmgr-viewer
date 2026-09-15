import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getSystemTheme,
  getStoredTheme,
  getStoredThemePreference,
  getEffectiveTheme,
  applyThemeToDOM,
  setTheme,
  setThemePreference,
  toggleTheme,
  initTheme,
  THEME_STORAGE_KEY,
} from "./theme.js";

class MockElement {
  private attrs = new Map<string, string>();
  public content = "";

  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
  }
  getAttribute(name: string) {
    return this.attrs.get(name) ?? null;
  }
  removeAttribute(name: string) {
    this.attrs.delete(name);
  }
}

describe("theme module", () => {
  let mediaQueryListeners: ((e: unknown) => void)[] = [];
  let prefersDarkMatches = true;
  let mockDocElem: MockElement;
  let mockMetaElem: MockElement;

  beforeEach(() => {
    mediaQueryListeners = [];
    prefersDarkMatches = true;
    mockDocElem = new MockElement();
    mockMetaElem = new MockElement();
    mockMetaElem.setAttribute("name", "color-scheme");

    // Mock localStorage
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    });

    // Mock document
    vi.stubGlobal("document", {
      documentElement: mockDocElem,
      querySelector: (sel: string) => {
        if (sel.includes('meta[name="color-scheme"]')) return mockMetaElem;
        return null;
      },
      createElement: () => new MockElement(),
    });

    // Mock window & matchMedia
    vi.stubGlobal("window", {
      matchMedia: (query: string) => ({
        get matches() {
          if (query.includes("prefers-color-scheme: light")) {
            return !prefersDarkMatches;
          }
          return prefersDarkMatches;
        },
        addEventListener: (_event: string, cb: (e: unknown) => void) => {
          mediaQueryListeners.push(cb);
        },
        removeEventListener: (_event: string, cb: (e: unknown) => void) => {
          mediaQueryListeners = mediaQueryListeners.filter((l) => l !== cb);
        },
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("detects OS system theme correctly", () => {
    prefersDarkMatches = true;
    expect(getSystemTheme()).toBe("dark");

    prefersDarkMatches = false;
    expect(getSystemTheme()).toBe("light");
  });

  it("returns null when no stored theme is present", () => {
    expect(getStoredTheme()).toBeNull();
  });

  it("returns stored theme when present and valid", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    expect(getStoredTheme()).toBe("light");

    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(getStoredTheme()).toBe("dark");

    localStorage.setItem(THEME_STORAGE_KEY, "invalid");
    expect(getStoredTheme()).toBeNull();
  });

  it("effective theme prefers stored over system", () => {
    prefersDarkMatches = false; // OS is light
    expect(getEffectiveTheme()).toBe("light");

    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(getEffectiveTheme()).toBe("dark");

    localStorage.setItem(THEME_STORAGE_KEY, "light");
    expect(getEffectiveTheme()).toBe("light");
  });

  it("applies theme to DOM data-theme attribute and meta tag", () => {
    applyThemeToDOM("light");
    expect(mockDocElem.getAttribute("data-theme")).toBe("light");
    expect(mockMetaElem.content).toBe("light");

    applyThemeToDOM("dark");
    expect(mockDocElem.getAttribute("data-theme")).toBe("dark");
    expect(mockMetaElem.content).toBe("dark");
  });

  it("setTheme saves to localStorage and updates DOM", () => {
    setTheme("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(mockDocElem.getAttribute("data-theme")).toBe("light");

    setTheme("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(mockDocElem.getAttribute("data-theme")).toBe("dark");
  });

  it("toggleTheme switches between dark and light", () => {
    setTheme("dark");
    const next1 = toggleTheme();
    expect(next1).toBe("light");
    expect(getEffectiveTheme()).toBe("light");

    const next2 = toggleTheme();
    expect(next2).toBe("dark");
    expect(getEffectiveTheme()).toBe("dark");
  });

  it("initTheme reacts to OS changes when no stored preference exists", () => {
    prefersDarkMatches = true; // start dark
    const changeCallback = vi.fn();

    const cleanup = initTheme(changeCallback);
    expect(mockDocElem.getAttribute("data-theme")).toBe("dark");
    expect(changeCallback).toHaveBeenCalledWith("dark", "system");

    // Simulate OS switching to light
    prefersDarkMatches = false;
    for (const listener of mediaQueryListeners) {
      listener({});
    }

    expect(mockDocElem.getAttribute("data-theme")).toBe("light");
    expect(changeCallback).toHaveBeenCalledWith("light", "system");

    cleanup();
  });

  it("initTheme ignores OS changes when user has a stored preference", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    prefersDarkMatches = true;
    const changeCallback = vi.fn();

    const cleanup = initTheme(changeCallback);
    expect(changeCallback).toHaveBeenCalledWith("dark", "dark");
    changeCallback.mockClear();

    // OS changes to light, but user chose dark
    prefersDarkMatches = false;
    for (const listener of mediaQueryListeners) {
      listener({});
    }

    expect(mockDocElem.getAttribute("data-theme")).toBe("dark");
    expect(changeCallback).not.toHaveBeenCalled();

    cleanup();
  });

  it("getStoredThemePreference returns system by default or when set", () => {
    expect(getStoredThemePreference()).toBe("system");

    setThemePreference("dark");
    expect(getStoredThemePreference()).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    setThemePreference("system");
    expect(getStoredThemePreference()).toBe("system");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
  });

  it("initTheme reacts to OS changes when preference is explicitly set to system", () => {
    setThemePreference("system");
    prefersDarkMatches = true; // OS is dark
    const changeCallback = vi.fn();

    const cleanup = initTheme(changeCallback);
    expect(mockDocElem.getAttribute("data-theme")).toBe("dark");
    expect(changeCallback).toHaveBeenCalledWith("dark", "system");
    changeCallback.mockClear();

    // OS switches to light
    prefersDarkMatches = false;
    for (const listener of mediaQueryListeners) {
      listener({});
    }

    expect(mockDocElem.getAttribute("data-theme")).toBe("light");
    expect(changeCallback).toHaveBeenCalledWith("light", "system");

    // OS switches back to dark
    prefersDarkMatches = true;
    for (const listener of mediaQueryListeners) {
      listener({});
    }

    expect(mockDocElem.getAttribute("data-theme")).toBe("dark");
    expect(changeCallback).toHaveBeenCalledWith("dark", "system");

    cleanup();
  });
});
