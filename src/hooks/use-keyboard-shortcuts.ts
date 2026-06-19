import { useEffect } from "react";

/**
 * Keyboard shortcuts for Hermes Desktop.
 *
 * - Cmd/Ctrl + N: Create new session
 * - Cmd/Ctrl + K: Focus search input (dispatches a window event that SessionList listens for)
 * - Cmd/Ctrl + Backspace: Delete the active session
 *
 * @param handlers Callbacks for each shortcut
 */
export function useKeyboardShortcuts(handlers: {
  onNewSession: () => void;
  onDeleteSession: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      switch (e.key) {
        case "n":
        case "N": {
          e.preventDefault();
          handlers.onNewSession();
          break;
        }
        case "k":
        case "K": {
          e.preventDefault();
          // Dispatch a custom event — SessionList listens and focuses its search input
          window.dispatchEvent(new CustomEvent("hermes:focus-search"));
          break;
        }
        case "Backspace": {
          e.preventDefault();
          handlers.onDeleteSession();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}
