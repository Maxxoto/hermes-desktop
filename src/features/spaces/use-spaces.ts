import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Space {
  id: string;
  name: string;
  icon: string; // emoji
  color: string; // accent color for the space
  sessionIds: string[];
  pinnedSessionIds: string[];
  isDefault: boolean;
}

const SPACE_COLORS = [
  '#0A84FF', // blue
  '#30D158', // green
  '#FF9F0A', // orange
  '#BF5AF2', // purple
  '#FF453A', // red
  '#FFD60A', // yellow
  '#64D2FF', // cyan
  '#FF375F', // pink
];

function nextColor(existingCount: number): string {
  return SPACE_COLORS[existingCount % SPACE_COLORS.length];
}

export interface SpacesState {
  spaces: Space[];
  activeSpaceId: string;

  // Actions
  createSpace: (name: string, icon: string) => void;
  deleteSpace: (id: string) => void;
  renameSpace: (id: string, name: string) => void;
  setSpaceColor: (id: string, color: string) => void;
  setSpaceIcon: (id: string, icon: string) => void;
  setActiveSpace: (id: string) => void;
  moveSessionToSpace: (sessionId: string, spaceId: string) => void;
  addSessionToActiveSpace: (sessionId: string) => void;
  removeSessionFromAllSpaces: (sessionId: string) => void;
  pinSession: (sessionId: string) => void;
  unpinSession: (sessionId: string) => void;
  reorderSpaces: (fromIndex: number, toIndex: number) => void;

  // Getters
  getActiveSpace: () => Space;
  getSpaceSessions: (spaceId: string) => string[];
  getPinnedSessions: (spaceId: string) => string[];
  getSpaceForSession: (sessionId: string) => Space | undefined;
}

export const useSpaces = create<SpacesState>()(
  persist(
    (set, get) => ({
      spaces: [
        {
          id: 'default',
          name: 'All',
          icon: '🏠',
          color: '#0A84FF',
          sessionIds: [],
          pinnedSessionIds: [],
          isDefault: true,
        },
        {
          id: 'coding',
          name: 'Coding',
          icon: '💻',
          color: '#30D158',
          sessionIds: [],
          pinnedSessionIds: [],
          isDefault: false,
        },
        {
          id: 'standup',
          name: 'Standup',
          icon: '📋',
          color: '#FF9F0A',
          sessionIds: [],
          pinnedSessionIds: [],
          isDefault: false,
        },
        {
          id: 'personal',
          name: 'Personal',
          icon: '🌙',
          color: '#BF5AF2',
          sessionIds: [],
          pinnedSessionIds: [],
          isDefault: false,
        },
      ],
      activeSpaceId: 'default',

      createSpace: (name, icon) =>
        set((state) => ({
          spaces: [
            ...state.spaces,
            {
              id: `space-${Date.now()}`,
              name,
              icon,
              color: nextColor(state.spaces.length),
              sessionIds: [],
              pinnedSessionIds: [],
              isDefault: false,
            },
          ],
        })),

      deleteSpace: (id) =>
        set((state) => ({
          spaces: state.spaces.filter((s) => s.id !== id),
          activeSpaceId: state.activeSpaceId === id ? 'default' : state.activeSpaceId,
        })),

      renameSpace: (id, name) =>
        set((state) => ({
          spaces: state.spaces.map((s) => (s.id === id ? { ...s, name } : s)),
        })),

      setSpaceColor: (id, color) =>
        set((state) => ({
          spaces: state.spaces.map((s) => (s.id === id ? { ...s, color } : s)),
        })),

      setSpaceIcon: (id, icon) =>
        set((state) => ({
          spaces: state.spaces.map((s) => (s.id === id ? { ...s, icon } : s)),
        })),

      setActiveSpace: (id) => set({ activeSpaceId: id }),

      moveSessionToSpace: (sessionId, spaceId) =>
        set((state) => ({
          spaces: state.spaces.map((s) => {
            if (s.id === spaceId) {
              // Add if not already present
              if (s.sessionIds.includes(sessionId)) return s;
              return { ...s, sessionIds: [...s.sessionIds, sessionId] };
            }
            // Remove from all other spaces
            return { ...s, sessionIds: s.sessionIds.filter((sid) => sid !== sessionId) };
          }),
        })),

      addSessionToActiveSpace: (sessionId) =>
        set((state) => ({
          spaces: state.spaces.map((s) => {
            if (s.id === state.activeSpaceId) {
              if (s.sessionIds.includes(sessionId)) return s;
              return { ...s, sessionIds: [...s.sessionIds, sessionId] };
            }
            return s;
          }),
        })),

      removeSessionFromAllSpaces: (sessionId) =>
        set((state) => ({
          spaces: state.spaces.map((s) => ({
            ...s,
            sessionIds: s.sessionIds.filter((sid) => sid !== sessionId),
            pinnedSessionIds: s.pinnedSessionIds.filter((sid) => sid !== sessionId),
          })),
        })),

      pinSession: (sessionId) =>
        set((state) => ({
          spaces: state.spaces.map((s) =>
            s.id === state.activeSpaceId
              ? {
                  ...s,
                  pinnedSessionIds: s.pinnedSessionIds.includes(sessionId)
                    ? s.pinnedSessionIds
                    : [...s.pinnedSessionIds, sessionId],
                }
              : s,
          ),
        })),

      unpinSession: (sessionId) =>
        set((state) => ({
          spaces: state.spaces.map((s) =>
            s.id === state.activeSpaceId
              ? { ...s, pinnedSessionIds: s.pinnedSessionIds.filter((sid) => sid !== sessionId) }
              : s,
          ),
        })),

      reorderSpaces: (fromIndex, toIndex) =>
        set((state) => {
          const spaces = [...state.spaces];
          const [removed] = spaces.splice(fromIndex, 1);
          spaces.splice(toIndex, 0, removed);
          return { spaces };
        }),

      getActiveSpace: () => {
        const state = get();
        return state.spaces.find((s) => s.id === state.activeSpaceId) ?? state.spaces[0];
      },

      getSpaceSessions: (spaceId) => {
        const state = get();
        const space = state.spaces.find((s) => s.id === spaceId);
        return space?.sessionIds ?? [];
      },

      getPinnedSessions: (spaceId) => {
        const state = get();
        const space = state.spaces.find((s) => s.id === spaceId);
        return space?.pinnedSessionIds ?? [];
      },

      getSpaceForSession: (sessionId) => {
        const state = get();
        return state.spaces.find((s) => s.sessionIds.includes(sessionId));
      },
    }),
    { name: 'hermes-spaces' },
  ),
);
