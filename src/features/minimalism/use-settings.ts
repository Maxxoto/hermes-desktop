import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface OverlaySettings {
  // STT
  sttModel: string;
  sttLanguage: string;
  sttAutoLoad: boolean;
  downloadedModels: string[];

  // TTS
  ttsProvider: "resemble" | "local";
  resembleApiKey: string;
  resembleVoiceUuid: string;
  ttsSpeed: number;
  ttsAutoSpeak: boolean;

  // VAD
  vadSensitivity: number;
  vadSilenceThreshold: number;

  // Overlay
  overlayShortcut: string;
  overlayAlwaysOnTop: boolean;
  overlayAutoHide: boolean;
  overlayOpacity: number;
  defaultMode: "type" | "ptt" | "vad";
  theme: "dark" | "light" | "system";

  // Screen share
  screenShareEnabled: boolean;

  // Actions
  setSTTModel: (model: string) => void;
  setSTTLanguage: (lang: string) => void;
  setSTTAutoLoad: (auto: boolean) => void;
  addDownloadedModel: (model: string) => void;
  setTTSProvider: (provider: "resemble" | "local") => void;
  setResembleApiKey: (key: string) => void;
  setResembleVoice: (uuid: string) => void;
  setTTSSpeed: (speed: number) => void;
  setTTSAutoSpeak: (auto: boolean) => void;
  setVADSensitivity: (sens: number) => void;
  setVADSilenceThreshold: (ms: number) => void;
  setOverlayShortcut: (shortcut: string) => void;
  setOverlayAlwaysOnTop: (on: boolean) => void;
  setOverlayAutoHide: (auto: boolean) => void;
  setOverlayOpacity: (opacity: number) => void;
  setDefaultMode: (mode: "type" | "ptt" | "vad") => void;
  setTheme: (theme: "dark" | "light" | "system") => void;
  setScreenShareEnabled: (enabled: boolean) => void;
}

export const useSettings = create<OverlaySettings>()(
  persist(
    (set) => ({
      // Defaults
      sttModel: "Xenova/whisper-base",
      sttLanguage: "en",
      sttAutoLoad: false,
      downloadedModels: [],
      ttsProvider: "resemble",
      resembleApiKey: "",
      resembleVoiceUuid: "61fcb769",
      ttsSpeed: 1.0,
      ttsAutoSpeak: true,
      vadSensitivity: 50,
      vadSilenceThreshold: 500,
      overlayShortcut: "Cmd+Shift+Space",
      overlayAlwaysOnTop: true,
      overlayAutoHide: false,
      overlayOpacity: 100,
      defaultMode: "type",
      theme: "dark",
      screenShareEnabled: true,

      // Actions
      setSTTModel: (model) => set({ sttModel: model }),
      setSTTLanguage: (lang) => set({ sttLanguage: lang }),
      setSTTAutoLoad: (auto) => set({ sttAutoLoad: auto }),
      addDownloadedModel: (model) =>
        set((state) => ({
          downloadedModels: [
            ...new Set([...state.downloadedModels, model]),
          ],
        })),
      setTTSProvider: (provider) => set({ ttsProvider: provider }),
      setResembleApiKey: (key) => set({ resembleApiKey: key }),
      setResembleVoice: (uuid) => set({ resembleVoiceUuid: uuid }),
      setTTSSpeed: (speed) => set({ ttsSpeed: speed }),
      setTTSAutoSpeak: (auto) => set({ ttsAutoSpeak: auto }),
      setVADSensitivity: (sens) => set({ vadSensitivity: sens }),
      setVADSilenceThreshold: (ms) => set({ vadSilenceThreshold: ms }),
      setOverlayShortcut: (shortcut) =>
        set({ overlayShortcut: shortcut }),
      setOverlayAlwaysOnTop: (on) => set({ overlayAlwaysOnTop: on }),
      setOverlayAutoHide: (auto) => set({ overlayAutoHide: auto }),
      setOverlayOpacity: (opacity) => set({ overlayOpacity: opacity }),
      setDefaultMode: (mode) => set({ defaultMode: mode }),
      setTheme: (theme) => set({ theme }),
      setScreenShareEnabled: (enabled) =>
        set({ screenShareEnabled: enabled }),
    }),
    { name: "hermes-overlay-settings" },
  ),
);
