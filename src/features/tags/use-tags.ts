import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Tag {
  id: string;
  name: string;
  color: string;
}

const TAG_COLORS = [
  "#FF453A", // red
  "#FF9F0A", // orange
  "#FFD60A", // yellow
  "#30D158", // green
  "#64D2FF", // cyan
  "#0A84FF", // blue
  "#BF5AF2", // purple
  "#FF375F", // pink
];

interface TagStore {
  tags: Tag[];
  sessionTags: Record<string, string[]>; // sessionId → tagIds[]

  createTag: (name: string, color?: string) => Tag;
  renameTag: (id: string, name: string) => void;
  deleteTag: (id: string) => void;
  updateTagColor: (id: string, color: string) => void;
  addTagToSession: (sessionId: string, tagId: string) => void;
  removeTagFromSession: (sessionId: string, tagId: string) => void;
  getSessionTags: (sessionId: string) => Tag[];
  getSessionsWithTag: (tagId: string) => string[];
}

export const TAG_COLORS_LIST = TAG_COLORS;

export const useTagStore = create<TagStore>()(
  persist(
    (set, get) => ({
      tags: [],
      sessionTags: {},

      createTag: (name, color = TAG_COLORS[0]) => {
        const tag: Tag = {
          id: `tag_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          name,
          color,
        };
        set((state) => ({ tags: [...state.tags, tag] }));
        return tag;
      },

      renameTag: (id, name) => {
        set((state) => ({
          tags: state.tags.map((t) => (t.id === id ? { ...t, name } : t)),
        }));
      },

      deleteTag: (id) => {
        set((state) => {
          const newSessionTags = { ...state.sessionTags };
          for (const [sid, tagIds] of Object.entries(newSessionTags)) {
            newSessionTags[sid] = tagIds.filter((tid) => tid !== id);
          }
          return {
            tags: state.tags.filter((t) => t.id !== id),
            sessionTags: newSessionTags,
          };
        });
      },

      updateTagColor: (id, color) => {
        set((state) => ({
          tags: state.tags.map((t) => (t.id === id ? { ...t, color } : t)),
        }));
      },

      addTagToSession: (sessionId, tagId) => {
        set((state) => {
          const current = state.sessionTags[sessionId] || [];
          if (current.includes(tagId)) return state;
          return {
            sessionTags: {
              ...state.sessionTags,
              [sessionId]: [...current, tagId],
            },
          };
        });
      },

      removeTagFromSession: (sessionId, tagId) => {
        set((state) => ({
          sessionTags: {
            ...state.sessionTags,
            [sessionId]: (state.sessionTags[sessionId] || []).filter(
              (tid) => tid !== tagId,
            ),
          },
        }));
      },

      getSessionTags: (sessionId) => {
        const tagIds = get().sessionTags[sessionId] || [];
        return get().tags.filter((t) => tagIds.includes(t.id));
      },

      getSessionsWithTag: (tagId) => {
        const st = get().sessionTags;
        return Object.entries(st)
          .filter(([, tagIds]) => tagIds.includes(tagId))
          .map(([sid]) => sid);
      },
    }),
    { name: "hermes-tags" },
  ),
);
