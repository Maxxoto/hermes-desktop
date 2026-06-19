import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export function useAgentNotifications() {
  const notifyOnCompletion = async (summary: string) => {
    let permitted = await isPermissionGranted();
    if (!permitted) {
      permitted = (await requestPermission()) === "granted";
    }
    if (permitted) {
      sendNotification({ title: "Hermes Agent", body: summary });
    }
  };

  return { notifyOnCompletion };
}
