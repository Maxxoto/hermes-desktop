/**
 * SessionList.test.tsx — React component tests for SessionList
 *
 * Tests rendering states (loading, empty, grouped) and user interactions.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SessionList from "../features/sessions/SessionList";
import type { Session } from "../features/connection/gateway-api";

// ---------------------------------------------------------------------------
// Mock use-sessions hook
// ---------------------------------------------------------------------------

let mockSessions: Session[] | undefined;
let mockIsLoading = false;

vi.mock("../features/sessions/use-sessions", () => ({
  useSessions: () => ({
    data: mockSessions,
    isLoading: mockIsLoading,
  }),
}));

// Mock SessionItem to make assertions easier
vi.mock("../features/sessions/SessionItem", () => ({
  default: ({
    session,
    isActive,
    onClick,
  }: {
    session: Session;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <div
      data-testid={`session-${session.id}`}
      data-active={isActive}
      onClick={onClick}
    >
      {session.title ?? "Untitled"}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(
  overrides: Partial<Session> & { id: string; last_active: number },
): Session {
  return {
    title: `Session ${overrides.id}`,
    source: "cli",
    model: "hermes-3",
    message_count: 1,
    started_at: overrides.last_active - 60,
    ...overrides,
  };
}

function nowEpoch(): number {
  return Date.now() / 1000;
}

/**
 * Get a timestamp in epoch seconds that falls in the "Yesterday" bucket
 * relative to the component's getDateGroup logic.
 * Uses actual midnight boundaries to be timezone-safe.
 */
function yesterdayEpoch(): number {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Place at noon yesterday — guaranteed between yesterdayStart and todayStart
  const yesterdayNoon = new Date(
    todayStart.getTime() - 86_400_000 + 12 * 3600_000,
  );
  return yesterdayNoon.getTime() / 1000;
}

/**
 * Get a timestamp clearly in the "Older" bucket (> 48h ago).
 */
function olderEpoch(daysAgo: number): number {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(todayStart.getTime() - daysAgo * 86_400_000 + 12 * 3600_000);
  return target.getTime() / 1000;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SessionList", () => {
  const onSelectSession = vi.fn();
  const onNewChat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessions = undefined;
    mockIsLoading = false;
  });

  // ---- Loading state -----------------------------------------------------

  it("renders loading skeleton when isLoading is true", () => {
    mockIsLoading = true;

    const { container } = render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    // LoadingSkeleton renders divs with "animate-pulse" class
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThanOrEqual(1);

    // Empty state should NOT be visible
    expect(screen.queryByText("No conversations yet")).not.toBeInTheDocument();
  });

  // ---- Empty state -------------------------------------------------------

  it("renders empty state when no sessions", () => {
    mockSessions = [];
    mockIsLoading = false;

    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
    expect(screen.getByText("Start a new chat to begin")).toBeInTheDocument();
  });

  // ---- Grouped sessions --------------------------------------------------

  it("renders sessions grouped by date (Today, Yesterday, Older)", () => {
    mockSessions = [
      makeSession({ id: "old1", last_active: olderEpoch(5) }),
      makeSession({ id: "old2", last_active: olderEpoch(3) }),
      makeSession({ id: "yesterday1", last_active: yesterdayEpoch() }),
      makeSession({ id: "today1", last_active: nowEpoch() - 100 }),
      makeSession({ id: "today2", last_active: nowEpoch() - 50 }),
    ];
    mockIsLoading = false;

    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    // All sessions should render
    expect(screen.getByTestId("session-today1")).toBeInTheDocument();
    expect(screen.getByTestId("session-today2")).toBeInTheDocument();
    expect(screen.getByTestId("session-yesterday1")).toBeInTheDocument();
    expect(screen.getByTestId("session-old1")).toBeInTheDocument();
    expect(screen.getByTestId("session-old2")).toBeInTheDocument();

    // Group headers
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
    expect(screen.getByText("Older")).toBeInTheDocument();
  });

  it("sessions within each group are sorted by last_active descending", () => {
    const now = nowEpoch();
    mockSessions = [
      makeSession({ id: "t1", last_active: now - 100 }),
      makeSession({ id: "t2", last_active: now - 10 }),
      makeSession({ id: "t3", last_active: now - 200 }),
    ];
    mockIsLoading = false;

    const { container } = render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    // All in "Today" group — order: t2 (most recent), t1, t3
    const sessionItems = container.querySelectorAll(
      "[data-testid^='session-t']",
    );
    const ids = Array.from(sessionItems).map(
      (el) => el.getAttribute("data-testid")?.replace("session-", "") ?? "",
    );
    expect(ids).toEqual(["t2", "t1", "t3"]);
  });

  it("only renders groups that have sessions", () => {
    const now = nowEpoch();
    mockSessions = [
      makeSession({ id: "a", last_active: now - 10 }),
    ];
    mockIsLoading = false;

    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.queryByText("Yesterday")).not.toBeInTheDocument();
    expect(screen.queryByText("Older")).not.toBeInTheDocument();
  });

  // ---- Search ------------------------------------------------------------

  it("search filter matches by title", async () => {
    const user = userEvent.setup();
    const now = nowEpoch();
    mockSessions = [
      makeSession({ id: "a", title: "Python debugging", last_active: now - 10 }),
      makeSession({ id: "b", title: "Rust compilation", last_active: now - 20 }),
      makeSession({ id: "c", title: "Python optimization", last_active: now - 30 }),
    ];
    mockIsLoading = false;

    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    const searchInput = screen.getByPlaceholderText("Search conversations...");
    await user.type(searchInput, "Python");

    // Sessions a and c match, b doesn't
    expect(screen.getByTestId("session-a")).toBeInTheDocument();
    expect(screen.queryByTestId("session-b")).not.toBeInTheDocument();
    expect(screen.getByTestId("session-c")).toBeInTheDocument();
  });

  it("search filter matches by model", async () => {
    const user = userEvent.setup();
    const now = nowEpoch();
    mockSessions = [
      makeSession({ id: "a", model: "hermes-3", last_active: now - 10 }),
      makeSession({ id: "b", model: "llama-4", last_active: now - 20 }),
    ];
    mockIsLoading = false;

    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    const searchInput = screen.getByPlaceholderText("Search conversations...");
    await user.type(searchInput, "llama");

    expect(screen.queryByTestId("session-a")).not.toBeInTheDocument();
    expect(screen.getByTestId("session-b")).toBeInTheDocument();
  });

  it("shows empty state when search matches nothing", async () => {
    const user = userEvent.setup();
    mockSessions = [
      makeSession({ id: "a", title: "Hello", last_active: nowEpoch() - 10 }),
    ];
    mockIsLoading = false;

    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    const searchInput = screen.getByPlaceholderText("Search conversations...");
    await user.type(searchInput, "zzz no match");

    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
  });

  // ---- Interactions ------------------------------------------------------

  it("clicking a session calls onSelectSession with its ID", async () => {
    const user = userEvent.setup();
    mockSessions = [
      makeSession({ id: "sess1", last_active: nowEpoch() - 10 }),
    ];
    mockIsLoading = false;

    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    await user.click(screen.getByTestId("session-sess1"));
    expect(onSelectSession).toHaveBeenCalledWith("sess1");
  });

  it("clicking 'New Chat' calls onNewChat", async () => {
    const user = userEvent.setup();
    mockSessions = [];
    mockIsLoading = false;

    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    await user.click(screen.getByText("New Chat"));
    expect(onNewChat).toHaveBeenCalledTimes(1);
  });

  // ---- Active session highlight ------------------------------------------

  it("marks the active session", () => {
    mockSessions = [
      makeSession({ id: "a", last_active: nowEpoch() - 10 }),
      makeSession({ id: "b", last_active: nowEpoch() - 20 }),
    ];
    mockIsLoading = false;

    render(
      <SessionList
        activeSessionId="b"
        onSelectSession={onSelectSession}
        onNewChat={onNewChat}
      />,
    );

    const itemA = screen.getByTestId("session-a");
    const itemB = screen.getByTestId("session-b");

    expect(itemA.getAttribute("data-active")).toBe("false");
    expect(itemB.getAttribute("data-active")).toBe("true");
  });
});
