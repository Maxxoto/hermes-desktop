/**
 * use-objects.ts — Zustand store with persist for Typed Objects / Knowledge Base.
 *
 * Manages structured objects auto-extracted from chat conversations.
 * Types: decision, action, snippet, bookmark, contact
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TypedObject {
  id: string;
  type: "decision" | "action" | "snippet" | "bookmark" | "contact";
  title: string;
  content: string;
  metadata: Record<string, any>;
  sessionId: string;
  timestamp: number;
  tags: string[];
}

export interface ObjectStore {
  objects: TypedObject[];
  addObject: (obj: Omit<TypedObject, "id" | "timestamp">) => void;
  removeObject: (id: string) => void;
  updateObject: (id: string, updates: Partial<TypedObject>) => void;
  getObjectsByType: (type: TypedObject["type"]) => TypedObject[];
  getObjectsBySession: (sessionId: string) => TypedObject[];
  searchObjects: (query: string) => TypedObject[];
}

function generateId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const OBJECT_TYPE_COLORS: Record<TypedObject["type"], string> = {
  decision: "orange",
  action: "blue",
  snippet: "green",
  bookmark: "red",
  contact: "purple",
} as const;

export const OBJECT_TYPE_LABELS: Record<TypedObject["type"], string> = {
  decision: "Decisions",
  action: "Actions",
  snippet: "Snippets",
  bookmark: "Bookmarks",
  contact: "Contacts",
} as const;

export const useObjectStore = create<ObjectStore>()(
  persist(
    (set, get) => ({
      objects: [],

      addObject: (obj) => {
        const object: TypedObject = {
          ...obj,
          id: generateId(),
          timestamp: Date.now(),
        };
        set((state) => ({
          objects: [object, ...state.objects],
        }));
      },

      removeObject: (id) => {
        set((state) => ({
          objects: state.objects.filter((o) => o.id !== id),
        }));
      },

      updateObject: (id, updates) => {
        set((state) => ({
          objects: state.objects.map((o) =>
            o.id === id ? { ...o, ...updates } : o
          ),
        }));
      },

      getObjectsByType: (type) => {
        return get().objects.filter((o) => o.type === type);
      },

      getObjectsBySession: (sessionId) => {
        return get().objects.filter((o) => o.sessionId === sessionId);
      },

      searchObjects: (query) => {
        const lower = query.toLowerCase();
        return get().objects.filter(
          (o) =>
            o.title.toLowerCase().includes(lower) ||
            o.content.toLowerCase().includes(lower) ||
            o.tags.some((t) => t.toLowerCase().includes(lower))
        );
      },
    }),
    {
      name: "hermes-objects",
    }
  )
);
