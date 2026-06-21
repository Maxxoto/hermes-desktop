import { create } from "zustand";

const LAYOUT_STORAGE_KEY = "hermes-desktop-layout";

export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 400;
export const SIDEBAR_DEFAULT_WIDTH = 240;

interface LayoutState {
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  splitView: boolean;
  splitRatio: number;

  setSidebarWidth: (w: number) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSplitView: () => void;
  setSplitRatio: (r: number) => void;
  resetLayout: () => void;
}

function loadPersistedLayout(): Partial<LayoutState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      ...(typeof parsed.sidebarWidth === "number" ? { sidebarWidth: parsed.sidebarWidth } : {}),
      ...(typeof parsed.sidebarCollapsed === "boolean" ? { sidebarCollapsed: parsed.sidebarCollapsed } : {}),
      ...(typeof parsed.splitView === "boolean" ? { splitView: parsed.splitView } : {}),
      ...(typeof parsed.splitRatio === "number" ? { splitRatio: parsed.splitRatio } : {}),
    };
  } catch {
    return {};
  }
}

function persistLayout(state: Pick<LayoutState, "sidebarWidth" | "sidebarCollapsed" | "splitView" | "splitRatio">) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({
        sidebarWidth: state.sidebarWidth,
        sidebarCollapsed: state.sidebarCollapsed,
        splitView: state.splitView,
        splitRatio: state.splitRatio,
      })
    );
  } catch {
    // localStorage may be full or unavailable — ignore
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const persisted = loadPersistedLayout();

const defaultState = {
  sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
  sidebarCollapsed: false,
  splitView: false,
  splitRatio: 0.5,
};

export const useLayoutStore = create<LayoutState>((set, get) => ({
  ...defaultState,
  ...persisted,

  setSidebarWidth: (w: number) => {
    const clamped = clamp(w, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH);
    set({ sidebarWidth: clamped });
    persistLayout({ ...get(), sidebarWidth: clamped });
  },

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    set({ sidebarCollapsed: next });
    persistLayout({ ...get(), sidebarCollapsed: next });
  },

  setSidebarCollapsed: (v: boolean) => {
    set({ sidebarCollapsed: v });
    persistLayout({ ...get(), sidebarCollapsed: v });
  },

  toggleSplitView: () => {
    const next = !get().splitView;
    set({ splitView: next });
    persistLayout({ ...get(), splitView: next });
  },

  setSplitRatio: (r: number) => {
    const clamped = clamp(r, 0.2, 0.8);
    set({ splitRatio: clamped });
    persistLayout({ ...get(), splitRatio: clamped });
  },

  resetLayout: () => {
    set(defaultState);
    persistLayout(defaultState);
  },
}));
