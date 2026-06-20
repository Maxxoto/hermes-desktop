/**
 * spaces.test.tsx — Tests for Spaces / Context Switching (EPIC 10)
 *
 * Tests: store actions, SpaceBar rendering, SpaceSettings, space-based filtering,
 * session-to-space binding, pin/unpin, keyboard shortcuts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSpaces, type Space } from "../features/spaces/use-spaces";

// ============================================================================
// Mocks
// ============================================================================

// Mock the gateway API (needed by SessionList which is imported by SpaceBar indirectly)
vi.mock("../features/connection/gateway-api", () => ({
  getGatewayClient: () => ({
    listSessions: vi.fn().mockResolvedValue([]),
    createSession: vi.fn().mockResolvedValue({ id: "new-session" }),
    deleteSession: vi.fn(),
    patchSession: vi.fn(),
    chatStream: vi.fn(),
    getSessionMessages: vi.fn().mockResolvedValue([]),
    stopGeneration: vi.fn(),
    listAgents: vi.fn().mockResolvedValue([]),
    listModels: vi.fn().mockResolvedValue([]),
  }),
}));

// Mock the tag store
vi.mock("../features/tags/use-tags", () => ({
  useTagStore: (selector: (s: unknown) => unknown) => {
    const state = {
      tags: [],
      sessionTags: {},
      getSessionsWithTag: () => [],
    };
    return typeof selector === "function" ? selector(state) : state;
  },
}));

// Mock the folder store
vi.mock("../features/folders/use-folders", () => ({
  useFolderStore: (selector: (s: unknown) => unknown) => {
    const state = {
      folders: [],
      sessionFolders: {},
      getSessionsInFolder: () => [],
      moveSession: vi.fn(),
    };
    return typeof selector === "function" ? selector(state) : state;
  },
}));

// Mock react-query
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [], isLoading: false }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
    cancelQueries: vi.fn(),
  }),
  QueryClient: vi.fn().mockImplementation(() => ({
    defaultOptions: {},
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ============================================================================
// Store Tests
// ============================================================================

describe("useSpaces store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to initial state
    useSpaces.setState({
      spaces: [
        {
          id: "default",
          name: "All",
          icon: "🏠",
          color: "#0A84FF",
          sessionIds: [],
          pinnedSessionIds: [],
          isDefault: true,
        },
        {
          id: "coding",
          name: "Coding",
          icon: "💻",
          color: "#30D158",
          sessionIds: [],
          pinnedSessionIds: [],
          isDefault: false,
        },
        {
          id: "standup",
          name: "Standup",
          icon: "📋",
          color: "#FF9F0A",
          sessionIds: [],
          pinnedSessionIds: [],
          isDefault: false,
        },
        {
          id: "personal",
          name: "Personal",
          icon: "🌙",
          color: "#BF5AF2",
          sessionIds: [],
          pinnedSessionIds: [],
          isDefault: false,
        },
      ],
      activeSpaceId: "default",
    });
  });

  it("has default spaces", () => {
    const { spaces } = useSpaces.getState();
    expect(spaces).toHaveLength(4);
    expect(spaces[0].id).toBe("default");
    expect(spaces[0].name).toBe("All");
    expect(spaces[0].isDefault).toBe(true);
  });

  it("creates a new space", () => {
    useSpaces.getState().createSpace("Work", "🏢");
    const { spaces } = useSpaces.getState();
    expect(spaces).toHaveLength(5);
    const newSpace = spaces[spaces.length - 1];
    expect(newSpace.name).toBe("Work");
    expect(newSpace.icon).toBe("🏢");
    expect(newSpace.isDefault).toBe(false);
    expect(newSpace.id).toMatch(/^space-/);
  });

  it("deletes a space", () => {
    useSpaces.getState().deleteSpace("coding");
    const { spaces } = useSpaces.getState();
    expect(spaces).toHaveLength(3);
    expect(spaces.find((s) => s.id === "coding")).toBeUndefined();
  });

  it("switches to default when deleting active space", () => {
    useSpaces.setState({ activeSpaceId: "coding" });
    useSpaces.getState().deleteSpace("coding");
    expect(useSpaces.getState().activeSpaceId).toBe("default");
  });

  it("renames a space", () => {
    useSpaces.getState().renameSpace("coding", "Development");
    const space = useSpaces.getState().spaces.find((s) => s.id === "coding");
    expect(space?.name).toBe("Development");
  });

  it("sets space color", () => {
    useSpaces.getState().setSpaceColor("coding", "#FF0000");
    const space = useSpaces.getState().spaces.find((s) => s.id === "coding");
    expect(space?.color).toBe("#FF0000");
  });

  it("sets space icon", () => {
    useSpaces.getState().setSpaceIcon("coding", "🔧");
    const space = useSpaces.getState().spaces.find((s) => s.id === "coding");
    expect(space?.icon).toBe("🔧");
  });

  it("switches active space", () => {
    useSpaces.getState().setActiveSpace("coding");
    expect(useSpaces.getState().activeSpaceId).toBe("coding");
    expect(useSpaces.getState().getActiveSpace().id).toBe("coding");
  });

  it("moves a session to a space", () => {
    useSpaces.getState().moveSessionToSpace("sess-1", "coding");
    const codingSessions = useSpaces.getState().getSpaceSessions("coding");
    expect(codingSessions).toContain("sess-1");
  });

  it("removes session from other spaces when moving", () => {
    useSpaces.getState().moveSessionToSpace("sess-1", "coding");
    useSpaces.getState().moveSessionToSpace("sess-1", "standup");
    const codingSessions = useSpaces.getState().getSpaceSessions("coding");
    expect(codingSessions).not.toContain("sess-1");
    const standupSessions = useSpaces.getState().getSpaceSessions("standup");
    expect(standupSessions).toContain("sess-1");
  });

  it("adds session to active space", () => {
    useSpaces.setState({ activeSpaceId: "standup" });
    useSpaces.getState().addSessionToActiveSpace("sess-2");
    const standupSessions = useSpaces.getState().getSpaceSessions("standup");
    expect(standupSessions).toContain("sess-2");
  });

  it("does not duplicate session in same space", () => {
    useSpaces.getState().moveSessionToSpace("sess-1", "coding");
    useSpaces.getState().moveSessionToSpace("sess-1", "coding");
    const codingSessions = useSpaces.getState().getSpaceSessions("coding");
    expect(codingSessions.filter((id) => id === "sess-1")).toHaveLength(1);
  });

  it("pins a session in active space", () => {
    useSpaces.setState({ activeSpaceId: "coding" });
    useSpaces.getState().pinSession("sess-1");
    const pinned = useSpaces.getState().getPinnedSessions("coding");
    expect(pinned).toContain("sess-1");
  });

  it("unpins a session from active space", () => {
    useSpaces.setState({ activeSpaceId: "coding" });
    useSpaces.getState().pinSession("sess-1");
    useSpaces.getState().unpinSession("sess-1");
    const pinned = useSpaces.getState().getPinnedSessions("coding");
    expect(pinned).not.toContain("sess-1");
  });

  it("reorders spaces", () => {
    const { spaces: before } = useSpaces.getState();
    const firstId = before[0].id; // "default"
    const thirdId = before[2].id; // "standup"
    useSpaces.getState().reorderSpaces(0, 2);
    const { spaces: after } = useSpaces.getState();
    // "default" moved from index 0 to index 2
    expect(after[2].id).toBe(firstId);
    // "standup" shifted from index 2 to index 1 (because "default" was removed from 0)
    expect(after[1].id).toBe(thirdId);
  });

  it("finds space for a session", () => {
    useSpaces.getState().moveSessionToSpace("sess-1", "standup");
    const space = useSpaces.getState().getSpaceForSession("sess-1");
    expect(space?.id).toBe("standup");
  });

  it("returns undefined when session not in any space", () => {
    const space = useSpaces.getState().getSpaceForSession("nonexistent");
    expect(space).toBeUndefined();
  });

  it("removes session from all spaces", () => {
    useSpaces.getState().moveSessionToSpace("sess-1", "coding");
    useSpaces.getState().pinSession("sess-1");
    useSpaces.getState().removeSessionFromAllSpaces("sess-1");
    for (const space of useSpaces.getState().spaces) {
      expect(space.sessionIds).not.toContain("sess-1");
      expect(space.pinnedSessionIds).not.toContain("sess-1");
    }
  });
});

// ============================================================================
// SpaceBar Component Tests
// ============================================================================

// We need to mock SpaceSettings to avoid modal rendering issues in tests
vi.mock("../features/spaces/SpaceSettings", () => ({
  default: () => <div data-testid="space-settings">SpaceSettings</div>,
}));

describe("SpaceBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSpaces.setState({
      spaces: [
        {
          id: "default",
          name: "All",
          icon: "🏠",
          color: "#0A84FF",
          sessionIds: [],
          pinnedSessionIds: [],
          isDefault: true,
        },
        {
          id: "coding",
          name: "Coding",
          icon: "💻",
          color: "#30D158",
          sessionIds: [],
          pinnedSessionIds: [],
          isDefault: false,
        },
      ],
      activeSpaceId: "default",
    });
  });

  it("renders all spaces as tabs", async () => {
    const SpaceBar = (await import("../features/spaces/SpaceBar")).default;
    render(<SpaceBar />);
    expect(screen.getByRole("tab", { name: /All/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Coding/ })).toBeInTheDocument();
  });

  it("marks active space tab", async () => {
    useSpaces.setState({ activeSpaceId: "coding" });
    const SpaceBar = (await import("../features/spaces/SpaceBar")).default;
    render(<SpaceBar />);
    const codingTab = screen.getByRole("tab", { name: /Coding/ });
    expect(codingTab).toHaveAttribute("aria-selected", "true");
    const allTab = screen.getByRole("tab", { name: /All/ });
    expect(allTab).toHaveAttribute("aria-selected", "false");
  });

  it("switches active space on click", async () => {
    const user = userEvent.setup();
    const SpaceBar = (await import("../features/spaces/SpaceBar")).default;
    render(<SpaceBar />);
    await user.click(screen.getByRole("tab", { name: /Coding/ }));
    expect(useSpaces.getState().activeSpaceId).toBe("coding");
  });

  it("shows add button", async () => {
    const SpaceBar = (await import("../features/spaces/SpaceBar")).default;
    render(<SpaceBar />);
    expect(screen.getByLabelText("Add space")).toBeInTheDocument();
  });
});
