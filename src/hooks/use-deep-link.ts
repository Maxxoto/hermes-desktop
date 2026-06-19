import { useEffect, useRef } from "react";

/**
 * Deep link handling for hermes:// URLs.
 *
 * Supported schemes:
 *   hermes://session/{id}  — navigate to a specific session
 *   hermes://settings      — open the connection/settings page
 *
 * In browser dev mode, this hook is a no-op.
 *
 * @param onSession Open a session by ID
 * @param onSettings Open the settings/connection page
 */

export interface DeepLinkHandlers {
  onSession: (sessionId: string) => void;
  onSettings: () => void;
}

/**
 * Parse a hermes:// URL and call the appropriate handler.
 * Returns true if the URL was handled.
 */
export function parseDeepLink(
  url: string,
  handlers: DeepLinkHandlers,
): boolean {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "hermes:") return false;

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return false;

    switch (segments[0]) {
      case "session": {
        if (segments.length >= 2 && segments[1]) {
          handlers.onSession(segments[1]);
          return true;
        }
        return false;
      }
      case "settings": {
        handlers.onSettings();
        return true;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

export function useDeepLink(handlers: DeepLinkHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const isTauri =
      typeof window !== "undefined" && "__TAURI__" in window;

    if (!isTauri) return;

    let cancelled = false;
    let unlisten: (() => void) | null = null;

    (async () => {
      try {
        const { getCurrent, onOpenUrl } = await import(
          "@tauri-apps/plugin-deep-link"
        );

        // 1. Handle URLs that triggered app launch (queued before JS loaded).
        const initial = await getCurrent();
        if (!cancelled && initial && initial.length > 0) {
          for (const url of initial) {
            parseDeepLink(url, handlersRef.current);
          }
        }

        // 2. Listen for future deep-link events while app is running.
        const unlistenFn = await onOpenUrl((urls) => {
          if (cancelled) return;
          for (const url of urls) {
            parseDeepLink(url, handlersRef.current);
          }
        });
        unlisten = unlistenFn;
      } catch {
        // Plugin not available or not in Tauri context — silently ignore
      }
    })();

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, []);
}
