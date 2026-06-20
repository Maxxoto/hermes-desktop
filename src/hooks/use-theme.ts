import { useEffect, useState, useCallback } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "hermes-desktop-theme";

/** Read persisted theme; default to dark (current app behavior). */
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

/**
 * Apply theme by toggling `dark` / `light` classes on <html>.
 *
 * Tailwind v4 `dark:` variant is keyed off `.dark`; the `light:` custom variant
 * (declared in index.css) keys off `.light`. Both classes are managed so that
 * light-mode-specific tokens (see :root.light in index.css) activate correctly.
 */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
}

/**
 * useTheme — manages dark/light theme preference.
 *
 * - Persists to localStorage under `hermes-desktop-theme`.
 * - Toggles the `dark` class on <html> for Tailwind dark mode.
 * - Defaults to dark (the app's existing look).
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // Apply theme on mount + whenever it changes
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  return { theme, toggleTheme, setTheme };
}
