import { useEffect } from "react";

/**
 * Set the native window title (Tauri) and document.title (browser fallback).
 *
 * In Tauri mode, uses getCurrentWindow().setTitle() for the OS-level title bar.
 * In browser mode, sets document.title directly.
 *
 * @param title The title suffix to display after "Hermes Desktop — ".
 *              If null, resets to just "Hermes Desktop".
 */
export function useWindowTitle(title: string | null) {
  useEffect(() => {
    const fullTitle = title ? `Hermes Desktop — ${title}` : "Hermes Desktop";

    // Always set document.title (works in browser + Tauri webview)
    document.title = fullTitle;

    // In Tauri mode, also set the native window title
    if (typeof window !== "undefined" && "__TAURI__" in window) {
      import("@tauri-apps/api/window")
        .then(({ getCurrentWindow }) => {
          getCurrentWindow().setTitle(fullTitle).catch(() => {
            // Silently ignore — webview title already set via document.title
          });
        })
        .catch(() => {
          // Dynamic import failed — not in Tauri context
        });
    }
  }, [title]);
}
