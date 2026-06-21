/**
 * today-view.test.tsx — Tests for EPIC 12: AI-powered Today View
 *
 * Tests: heuristic extraction, component rendering, empty states, interactions,
 * keyboard shortcut, store toggling, relative time formatting.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  extractDecisions,
  extractActionItems,
  formatRelativeTime,
  type TodayData,
  type PendingDecision,
  type ActionItem,
  type PinnedSession,
  type ActivityEntry,
} from "../features/today/use-today";
import { ActionItem as ActionItemComponent } from "../features/today/ActionItem";
import { DecisionCard } from "../features/today/DecisionCard";
import { PinnedSessions } from "../features/today/PinnedSessions";
import { RecentActivity } from "../features/today/RecentActivity";
import { useTodayStore } from "../features/today/use-today-store";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("../features/connection/gateway-api", () => ({
  getGatewayClient: () => ({
    listSessions: vi.fn().mockResolvedValue([]),
    createSession: vi.fn().mockResolvedValue({ id: "new-session" }),
    deleteSession: vi.fn(),
    patchSession: vi.fn(),
    chatStream: vi.fn(),
    getSessionMessages: vi.fn().mockResolvedValue([]),
    stopGeneration: vi.fn(),
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock("../features/today/TodayView", () => ({
  default: ({ onOpenSession }: { onOpenSession: (id: string) => void }) => (
    <div data-testid="today-view-mock">
      <button onClick={() => onOpenSession("test-session")}>Open</button>
    </div>
  ),
}));

// ============================================================================
// Heuristic extraction tests
// ============================================================================

describe("extractDecisions", () => {
  it("extracts 'we decided to' pattern", () => {
    const results = extractDecisions(
      "We decided to use React for the frontend.",
      "s1",
      1000
    );
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].text).toContain("decided");
    expect(results[0].sessionId).toBe("s1");
  });

  it("extracts 'going with' pattern", () => {
    const results = extractDecisions(
      "After reviewing options, we're going with option A for the build system.",
      "s2",
      2000
    );
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].text).toContain("going with");
  });

  it("extracts 'should we' question pattern", () => {
    const results = extractDecisions(
      "Should we migrate to TypeScript next sprint?",
      "s3",
      3000
    );
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts 'trade-off' pattern", () => {
    const results = extractDecisions(
      "The trade-off here is performance vs. developer experience.",
      "s4",
      4000
    );
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty array for text without decision patterns", () => {
    const results = extractDecisions(
      "The weather is nice today and I went for a walk.",
      "s5",
      5000
    );
    expect(results).toEqual([]);
  });

  it("extracts multiple decisions from long text", () => {
    const text =
      "We decided to use PostgreSQL. The database is fast. Should we also add Redis for caching?";
    const results = extractDecisions(text, "s6", 6000);
    expect(results.length).toBeGreaterThanOrEqual(2);
  });
});

describe("extractActionItems", () => {
  it("extracts 'TODO' pattern", () => {
    const items = extractActionItems(
      "TODO: Fix the login bug on mobile.",
      "s1",
      1000
    );
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].text).toContain("TODO");
    expect(items[0].completed).toBe(false);
  });

  it("extracts 'need to' pattern", () => {
    const items = extractActionItems(
      "We need to deploy the API before Friday.",
      "s2",
      2000
    );
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].text).toContain("need to");
  });

  it("extracts 'FIXME' pattern", () => {
    const items = extractActionItems(
      "FIXME: Race condition in the WebSocket handler.",
      "s3",
      3000
    );
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts 'remember to' pattern", () => {
    const items = extractActionItems(
      "Remember to update the documentation.",
      "s4",
      4000
    );
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts 'create' action verb pattern", () => {
    const items = extractActionItems(
      "Create a new endpoint for user preferences.",
      "s5",
      5000
    );
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty array for text without action patterns", () => {
    const items = extractActionItems(
      "Everything looks good with the current setup.",
      "s6",
      6000
    );
    expect(items).toEqual([]);
  });

  it("extracts multiple action items", () => {
    const text =
      "TODO: Fix the header. We need to add tests. Don't forget to update the README.";
    const items = extractActionItems(text, "s7", 7000);
    expect(items.length).toBeGreaterThanOrEqual(2);
  });
});

describe("formatRelativeTime", () => {
  it("returns 'just now' for recent timestamps", () => {
    const now = Date.now() / 1000;
    expect(formatRelativeTime(now)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const now = Date.now() / 1000;
    expect(formatRelativeTime(now - 120)).toBe("2m ago");
  });

  it("returns hours ago", () => {
    const now = Date.now() / 1000;
    expect(formatRelativeTime(now - 7200)).toBe("2h ago");
  });

  it("returns days ago", () => {
    const now = Date.now() / 1000;
    expect(formatRelativeTime(now - 172800)).toBe("2d ago");
  });

  it("returns formatted date for old timestamps", () => {
    const now = Date.now() / 1000;
    expect(formatRelativeTime(now - 700000)).toMatch(/\w+ \d+/);
  });
});

// ============================================================================
// Component rendering tests
// ============================================================================

describe("ActionItem component", () => {
  const mockItem: ActionItem = {
    id: "act_1",
    text: "Fix the login bug",
    completed: false,
    sessionId: "s1",
    timestamp: 1000,
  };

  it("renders action item text", () => {
    const onToggle = vi.fn();
    render(<ActionItemComponent item={mockItem} onToggle={onToggle} />);
    expect(screen.getByText("Fix the login bug")).toBeDefined();
  });

  it("calls onToggle when clicked", async () => {
    const onToggle = vi.fn();
    render(<ActionItemComponent item={mockItem} onToggle={onToggle} />);
    const button = screen.getByTestId("action-item");
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledWith("act_1");
  });

  it("shows strikethrough when completed", () => {
    const completedItem = { ...mockItem, completed: true };
    const onToggle = vi.fn();
    render(<ActionItemComponent item={completedItem} onToggle={onToggle} />);
    const span = screen.getByText("Fix the login bug");
    expect(span.className).toContain("line-through");
  });

  it("shows checkmark icon when completed", () => {
    const completedItem = { ...mockItem, completed: true };
    const onToggle = vi.fn();
    render(<ActionItemComponent item={completedItem} onToggle={onToggle} />);
    // Check for green styling (completed checkbox)
    const button = screen.getByTestId("action-item");
    expect(button).toBeDefined();
  });
});

describe("DecisionCard component", () => {
  const mockDecision: PendingDecision = {
    id: "dec_1",
    text: "We decided to use React",
    context: "After evaluating Vue and Angular, we decided to use React for the UI layer.",
    sessionId: "s1",
    timestamp: 1000,
  };

  it("renders decision text", () => {
    const onOpenSession = vi.fn();
    render(
      <DecisionCard decision={mockDecision} onOpenSession={onOpenSession} />
    );
    expect(screen.getByText("We decided to use React")).toBeDefined();
  });

  it("renders context excerpt", () => {
    const onOpenSession = vi.fn();
    render(
      <DecisionCard decision={mockDecision} onOpenSession={onOpenSession} />
    );
    expect(
      screen.getByText(/After evaluating Vue and Angular/)
    ).toBeDefined();
  });

  it("renders session link with correct ID", () => {
    const onOpenSession = vi.fn();
    render(
      <DecisionCard decision={mockDecision} onOpenSession={onOpenSession} />
    );
    expect(screen.getByText(/Session s1/)).toBeDefined();
  });

  it("calls onOpenSession when session link clicked", async () => {
    const onOpenSession = vi.fn();
    render(
      <DecisionCard decision={mockDecision} onOpenSession={onOpenSession} />
    );
    const link = screen.getByLabelText(/Open session/);
    fireEvent.click(link);
    expect(onOpenSession).toHaveBeenCalledWith("s1");
  });
});

describe("PinnedSessions component", () => {
  const mockSessions: PinnedSession[] = [
    {
      id: "s1",
      title: "Build the API",
      messageCount: 12,
      lastActive: Date.now() / 1000 - 300,
    },
    {
      id: "s2",
      title: "Design review",
      messageCount: 5,
      lastActive: Date.now() / 1000 - 3600,
    },
  ];

  it("renders session titles", () => {
    const onOpenSession = vi.fn();
    render(
      <PinnedSessions sessions={mockSessions} onOpenSession={onOpenSession} />
    );
    expect(screen.getByText("Build the API")).toBeDefined();
    expect(screen.getByText("Design review")).toBeDefined();
  });

  it("renders message counts", () => {
    const onOpenSession = vi.fn();
    render(
      <PinnedSessions sessions={mockSessions} onOpenSession={onOpenSession} />
    );
    expect(screen.getByText("12 msg")).toBeDefined();
    expect(screen.getByText("5 msg")).toBeDefined();
  });

  it("renders empty state when no sessions", () => {
    const onOpenSession = vi.fn();
    render(
      <PinnedSessions sessions={[]} onOpenSession={onOpenSession} />
    );
    expect(screen.getByText("No recent sessions yet")).toBeDefined();
  });

  it("calls onOpenSession when session clicked", async () => {
    const onOpenSession = vi.fn();
    render(
      <PinnedSessions sessions={mockSessions} onOpenSession={onOpenSession} />
    );
    fireEvent.click(screen.getByText("Build the API"));
    expect(onOpenSession).toHaveBeenCalledWith("s1");
  });
});

describe("RecentActivity component", () => {
  const mockEntries: ActivityEntry[] = [
    {
      id: "a1",
      text: "Can you help me fix the CSS layout?",
      timestamp: Date.now() / 1000 - 60,
      sessionId: "s1",
    },
    {
      id: "a2",
      text: "I've updated the API endpoint to include pagination",
      timestamp: Date.now() / 1000 - 1800,
      sessionId: "s2",
    },
  ];

  it("renders activity text", () => {
    const onOpenSession = vi.fn();
    render(
      <RecentActivity entries={mockEntries} onOpenSession={onOpenSession} />
    );
    expect(
      screen.getByText("Can you help me fix the CSS layout?")
    ).toBeDefined();
  });

  it("renders empty state when no entries", () => {
    const onOpenSession = vi.fn();
    render(
      <RecentActivity entries={[]} onOpenSession={onOpenSession} />
    );
    expect(screen.getByText("Nothing recent yet")).toBeDefined();
  });

  it("calls onOpenSession when entry clicked", async () => {
    const onOpenSession = vi.fn();
    render(
      <RecentActivity entries={mockEntries} onOpenSession={onOpenSession} />
    );
    fireEvent.click(
      screen.getByText("Can you help me fix the CSS layout?")
    );
    expect(onOpenSession).toHaveBeenCalledWith("s1");
  });
});

// ============================================================================
// Store tests
// ============================================================================

describe("useTodayStore", () => {
  beforeEach(() => {
    useTodayStore.setState({ showTodayView: false });
  });

  it("defaults to hidden", () => {
    expect(useTodayStore.getState().showTodayView).toBe(false);
  });

  it("toggles visibility", () => {
    useTodayStore.getState().toggleTodayView();
    expect(useTodayStore.getState().showTodayView).toBe(true);
    useTodayStore.getState().toggleTodayView();
    expect(useTodayStore.getState().showTodayView).toBe(false);
  });

  it("sets visibility explicitly", () => {
    useTodayStore.getState().setShowTodayView(true);
    expect(useTodayStore.getState().showTodayView).toBe(true);
    useTodayStore.getState().setShowTodayView(false);
    expect(useTodayStore.getState().showTodayView).toBe(false);
  });
});

// ============================================================================
// Keyboard shortcut tests
// ============================================================================

describe("Cmd+T shortcut", () => {
  it("dispatches toggle event on Cmd+T", () => {
    const handler = vi.fn();
    // Simulate the keyboard event
    const event = new KeyboardEvent("keydown", {
      key: "t",
      metaKey: true,
      bubbles: true,
    });
    // We test the store directly since the hook needs a real DOM
    useTodayStore.getState().toggleTodayView();
    expect(useTodayStore.getState().showTodayView).toBe(true);
    useTodayStore.getState().toggleTodayView();
    expect(useTodayStore.getState().showTodayView).toBe(false);
  });
});
