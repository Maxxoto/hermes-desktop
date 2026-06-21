import { create } from "zustand";

interface TodayState {
  showTodayView: boolean;
  toggleTodayView: () => void;
  setShowTodayView: (show: boolean) => void;
}

export const useTodayStore = create<TodayState>((set) => ({
  showTodayView: false,
  toggleTodayView: () => set((s) => ({ showTodayView: !s.showTodayView })),
  setShowTodayView: (show) => set({ showTodayView: show }),
}));
