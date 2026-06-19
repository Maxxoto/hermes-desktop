import { useEffect, useState, useCallback } from "react";

/**
 * Auto-updater hook for Tauri desktop app.
 *
 * On mount, checks for available updates via the Tauri updater plugin.
 * If an update exists, exposes `updateAvailable`, update metadata, and
 * `installUpdate()` to download + install the update (restarts the app).
 *
 * In browser dev mode, this hook is a no-op (returns updateAvailable: false).
 */

export interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
}

export interface UseAutoUpdaterResult {
  /** Whether an update check has completed (success or failure). */
  checked: boolean;
  /** True when a newer version is available. */
  updateAvailable: boolean;
  /** Metadata about the available update. */
  updateInfo: UpdateInfo | null;
  /** Error message if the update check failed. */
  error: string | null;
  /** Whether an update is currently being downloaded/installed. */
  installing: boolean;
  /** Download and install the update. Restarts the app on success. */
  installUpdate: () => Promise<void>;
  /** Manually re-check for updates. */
  checkForUpdate: () => Promise<void>;
}

export function useAutoUpdater(): UseAutoUpdaterResult {
  const [checked, setChecked] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);

  const checkForUpdate = useCallback(async () => {
    const isTauri =
      typeof window !== "undefined" && "__TAURI__" in window;

    if (!isTauri) {
      setChecked(true);
      return;
    }

    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();

      if (update) {
        setUpdateAvailable(true);
        setUpdateInfo({
          version: update.version,
          date: update.date,
          body: update.body,
        });
      } else {
        setUpdateAvailable(false);
        setUpdateInfo(null);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setChecked(true);
    }
  }, []);

  const installUpdate = useCallback(async () => {
    const isTauri =
      typeof window !== "undefined" && "__TAURI__" in window;

    if (!isTauri) return;

    setInstalling(true);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();

      if (!update) {
        setError("No update available");
        return;
      }

      await update.downloadAndInstall();
      await update.close();
      // The app will restart automatically after downloadAndInstall.
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setInstalling(false);
    }
  }, []);

  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  return {
    checked,
    updateAvailable,
    updateInfo,
    error,
    installing,
    installUpdate,
    checkForUpdate,
  };
}
