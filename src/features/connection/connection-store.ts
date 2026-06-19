import { create } from "zustand";
import { useAuthStore } from "./auth-store";

// ---------------------------------------------------------------------------
// Connection state & actions
// ---------------------------------------------------------------------------

export interface ConnectionStore {
  gatewayUrl: string;
  apiKey: string;
  isConfigured: boolean;

  setCredentials: (url: string, key: string) => void;
  clear: () => void;
}

export const useConnectionStore = create<ConnectionStore>()((set) => ({
  gatewayUrl: "",
  apiKey: "",
  isConfigured: false,

  setCredentials: (url: string, key: string) => {
    set({ gatewayUrl: url, apiKey: key, isConfigured: true });
    // Clear any pending re-auth banner when new credentials are provided
    useAuthStore.getState().setNeedsReauth(false);
  },

  clear: () =>
    set({ gatewayUrl: "", apiKey: "", isConfigured: false }),
}));
