import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

/**
 * Show a system notification when the agent completes a task.
 *
 * In Tauri mode, uses the Tauri notification plugin.
 * In browser mode, uses the Web Notification API.
 *
 * Silently fails if notifications aren't permitted.
 */
export function useAgentNotifications() {
  const notifyOnCompletion = async (summary: string) => {
    const isTauri =
      typeof window !== "undefined" && "__TAURI__" in window;

    if (isTauri) {
      try {
        let permitted = await isPermissionGranted();
        if (!permitted) {
          permitted = (await requestPermission()) === "granted";
        }
        if (permitted) {
          sendNotification({ title: "Hermes Agent", body: summary });
        }
        return;
      } catch {
        // Tauri notification failed — fall through to browser API
      }
    }

    // Browser fallback: Web Notification API
    if (typeof window !== "undefined" && "Notification" in window) {
      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission === "granted") {
        new Notification("Hermes Agent", { body: summary });
      }
    }
  };

  return { notifyOnCompletion };
}
