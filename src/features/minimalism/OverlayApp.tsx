import { useCallback, useEffect } from "react";
import CompactChat from "./CompactChat";

/**
 * OverlayApp — Standalone React root for the overlay window.
 * Handles ESC to dismiss (via Tauri window hide).
 * CompactChat handles its own TTS and VAD cleanup internally.
 */
export default function OverlayApp() {
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

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "transparent" }}
    >
      <CompactChat />
    </div>
  );
}
