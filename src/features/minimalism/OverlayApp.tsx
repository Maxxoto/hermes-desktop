import { useCallback, useEffect, useState } from "react";
import CompactChat from "./CompactChat";
import SettingsPage from "./SettingsPage";
import { useWindowSnap } from "./use-window-snap";

/**
 * OverlayApp — Standalone React root for the overlay window.
 * Handles ESC to dismiss (via Tauri window hide).
 * Routes between CompactChat and SettingsPage.
 */
export default function OverlayApp() {
  const [view, setView] = useState<"chat" | "settings">("chat");

  // Enable window snapping shortcuts (⌘⌥+arrow keys)
  useWindowSnap();

  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().hide();
      } catch {
        // Browser mode — nothing to hide
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const openSettings = useCallback(() => setView("settings"), []);
  const closeSettings = useCallback(() => setView("chat"), []);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: "transparent" }}
    >
      {view === "settings" ? (
        <SettingsPage onBack={closeSettings} />
      ) : (
        <CompactChat onOpenSettings={openSettings} />
      )}
    </div>
  );
}
