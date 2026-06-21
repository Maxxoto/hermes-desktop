import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Bookmark {
  id: string;
  content: string;
  sessionId: string;
  timestamp: number;
  tags: string[];
}

interface BookmarkStore {
  bookmarks: Bookmark[];
  addBookmark: (content: string, sessionId: string, tags?: string[]) => void;
  removeBookmark: (id: string) => void;
  getBookmarks: () => Bookmark[];
  getBookmarksBySession: (sessionId: string) => Bookmark[];
}

export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    (set, get) => ({
      bookmarks: [],

      addBookmark: (content, sessionId, tags = []) => {
        const bookmark: Bookmark = {
          id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          content,
          sessionId,
          timestamp: Date.now(),
          tags,
        };
        set((state) => ({
          bookmarks: [bookmark, ...state.bookmarks],
        }));
      },

      removeBookmark: (id) => {
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== id),
        }));
      },

      getBookmarks: () => get().bookmarks,

      getBookmarksBySession: (sessionId) =>
        get().bookmarks.filter((b) => b.sessionId === sessionId),
    }),
    {
      name: "hermes-bookmarks",
    },
  ),
);
