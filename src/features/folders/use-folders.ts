import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

interface FolderStore {
  folders: Folder[];
  sessionFolders: Record<string, string>; // sessionId → folderId

  createFolder: (name: string, parentId?: string | null) => Folder;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  moveSession: (sessionId: string, folderId: string | null) => void;
  getFolderChildren: (parentId: string | null) => Folder[];
  getSessionsInFolder: (folderId: string) => string[];
}

export const useFolderStore = create<FolderStore>()(
  persist(
    (set, get) => ({
      folders: [],
      sessionFolders: {},

      createFolder: (name, parentId = null) => {
        const folder: Folder = {
          id: `folder_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          name,
          parentId,
          createdAt: Date.now(),
        };
        set((state) => ({ folders: [...state.folders, folder] }));
        return folder;
      },

      renameFolder: (id, name) => {
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === id ? { ...f, name } : f,
          ),
        }));
      },

      deleteFolder: (id) => {
        set((state) => {
          const newSessionFolders = { ...state.sessionFolders };
          for (const [sid, fid] of Object.entries(newSessionFolders)) {
            if (fid === id) delete newSessionFolders[sid];
          }
          const childIds = state.folders
            .filter((f) => f.parentId === id)
            .map((f) => f.id);
          for (const childId of childIds) {
            for (const [sid, fid] of Object.entries(newSessionFolders)) {
              if (fid === childId) delete newSessionFolders[sid];
            }
          }
          return {
            folders: state.folders.filter(
              (f) => f.id !== id && f.parentId !== id,
            ),
            sessionFolders: newSessionFolders,
          };
        });
      },

      moveSession: (sessionId, folderId) => {
        if (folderId) {
          set((state) => ({
            sessionFolders: {
              ...state.sessionFolders,
              [sessionId]: folderId,
            },
          }));
        } else {
          set((state) => {
            const cleaned = { ...state.sessionFolders };
            delete cleaned[sessionId];
            return { sessionFolders: cleaned };
          });
        }
      },

      getFolderChildren: (parentId) => {
        return get().folders.filter((f) => f.parentId === parentId);
      },

      getSessionsInFolder: (folderId) => {
        const sf = get().sessionFolders;
        return Object.entries(sf)
          .filter(([, fid]) => fid === folderId)
          .map(([sid]) => sid);
      },
    }),
    { name: "hermes-folders" },
  ),
);
