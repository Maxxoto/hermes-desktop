import { create } from "zustand";

// ---------------------------------------------------------------------------
// Auth state — tracks whether a 401 was received so the UI can show a banner
// ---------------------------------------------------------------------------

export interface AuthStore {
  /** True after a 401 response was received from the gateway. */
  needsReauth: boolean;

  /** Called by GatewayClient when a 401 response arrives. */
  setNeedsReauth: (value: boolean) => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  needsReauth: false,
  setNeedsReauth: (value: boolean) => set({ needsReauth: value }),
}));
