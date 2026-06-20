import { useEffect, useRef } from "react";

/**
 * Global keyboard navigation for Hermes Desktop.
 *
 * Cmd/Ctrl shortcuts fire everywhere (even inside inputs).
 * Plain-key shortcuts only fire when NOT in an input/textarea/contenteditable.
 *
 * Layout:
 *   Cmd+N        → New chat
 *   Cmd+Shift+F  → Full search
 *   Cmd+[        → Back / close overlay
 *   Cmd+]        → Forward
 *   Cmd+B        → Toggle sidebar
 *   Cmd+.        → Toggle overlay
 *   c            → New chat (when not in input)
 *   /            → Focus search
 *   Backspace    → Delete focused session
 *   e            → Edit session
 *   Escape       → Back / close overlay
 */
export interface NavigationOptions {
  onNewChat?: () => void;
  onDeleteSession?: () => void;
  onEditSession?: () => void;
  onFocusSearch?: () => void;
  onToggleOverlay?: () => void;
  onBack?: () => void;
  onForward?: () => void;
  onToggleSidebar?: () => void;
  onFullSearch?: () => void;
}

function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardNavigation(options: NavigationOptions) {
  // Keep a ref so the handler always reads the latest options without
  // needing to re-register the listener on every render.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const opts = optionsRef.current;
      const mod = e.metaKey || e.ctrlKey;

      // ── Cmd/Ctrl shortcuts (fire everywhere) ──────────────────────────
      if (mod) {
        switch (e.key.toLowerCase()) {
          case "n":
            e.preventDefault();
            opts.onNewChat?.();
            break;
          case "f":
            if (e.shiftKey) {
              e.preventDefault();
              opts.onFullSearch?.();
            }
            break;
          case "[":
            e.preventDefault();
            opts.onBack?.();
            break;
          case "]":
            e.preventDefault();
            opts.onForward?.();
            break;
          case "b":
            e.preventDefault();
            opts.onToggleSidebar?.();
            break;
          case ".":
            e.preventDefault();
            opts.onToggleOverlay?.();
            break;
        }
        return;
      }

      // ── Plain-key shortcuts (only when NOT in an input) ───────────────
      if (isInputElement(e.target)) return;

      switch (e.key) {
        case "c":
          e.preventDefault();
          opts.onNewChat?.();
          break;
        case "/":
          e.preventDefault();
          opts.onFocusSearch?.();
          break;
        case "Backspace":
          e.preventDefault();
          opts.onDeleteSession?.();
          break;
        case "e":
          e.preventDefault();
          opts.onEditSession?.();
          break;
        case "Escape":
          e.preventDefault();
          opts.onBack?.();
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
