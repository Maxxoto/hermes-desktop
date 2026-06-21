/**
 * use-today-shortcut.ts — Cmd+T keyboard shortcut for Today view
 *
 * Registers a global keydown listener for Cmd/Ctrl+T and calls the toggle callback.
 */
import { useEffect } from "react";

export function useTodayShortcut(onToggle: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToggle]);
}
