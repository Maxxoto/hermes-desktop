import { useEffect } from "react";

/**
 * Keyboard shortcuts for Hermes Desktop.
 *
 * - Cmd/Ctrl + N: Create new session
 * - Cmd/Ctrl + Backspace: Delete the active session
 *
 * Note: Cmd/Ctrl + K is handled by the Command Palette
 * (useCommandPaletteShortcut in CommandPalette.tsx).
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
