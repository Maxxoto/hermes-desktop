import { useCallback, useState } from "react";

/**
 * Overlay mode type — persisted in localStorage.
 */
export type OverlayMode = "type" | "ptt" | "vad";

const MODE_KEY = "hermes-overlay-mode";

/**
 * Hook for managing the overlay window show/hide/toggle via Tauri.
 * Falls back gracefully in browser dev mode.
 */
export function useOverlayWindow() {
  const [isOpen, setIsOpen] = useState(false);

  const show = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().show();
      await getCurrentWindow().setFocus();
      setIsOpen(true);
    } catch {
      // Browser dev mode
      setIsOpen(true);
    }
  }, []);

  const hide = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().hide();
      setIsOpen(false);
    } catch {
      setIsOpen(false);
    }
  }, []);

  const toggle = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      const visible = await win.isVisible();
      if (visible) {
        await win.hide();
        setIsOpen(false);
      } else {
        await win.show();
        await win.setFocus();
        setIsOpen(true);
      }
    } catch {
      setIsOpen((prev) => !prev);
    }
  }, []);

  return { isOpen, show, hide, toggle };
}

/**
 * Hook for managing the overlay mode (Type / PTT / VAD).
 * Persists the last selected mode in localStorage.
 */
export function useOverlayMode() {
  const [mode, setModeState] = useState<OverlayMode>(() => {
    try {
      const stored = localStorage.getItem(MODE_KEY);
      if (stored === "type" || stored === "ptt" || stored === "vad") {
        return stored;
      }
    } catch {
      // localStorage unavailable
    }
    return "type";
  });

  const setMode = useCallback((newMode: OverlayMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(MODE_KEY, newMode);
    } catch {
      // localStorage unavailable
    }
  }, []);

  return { mode, setMode };
}
