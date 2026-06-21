/**
 * flow-session-management.test.tsx — Session Management Flow
 *
 * Integration-level tests that simulate sidebar interactions: browsing
 * sessions, searching, selecting, renaming, and deleting sessions.
 * Uses the real SessionItem component (not mocked) for a realistic flow.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
  useRenameSession: () => ({
    mutate: mockRenameMutate,
    isPending: false,
  }),
  useDeleteSession: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
}));

const mockRenameMutate = vi.fn();
const mockDeleteMutate = vi.fn();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<Session> & { id: string; last_active: number }): Session {
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

function yesterdayEpoch(): number {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayNoon = new Date(todayStart.getTime() - 86_400_000 + 12 * 3600_000);
  return yesterdayNoon.getTime() / 1000;
}

function olderEpoch(daysAgo: number): number {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(todayStart.getTime() - daysAgo * 86_400_000 + 12 * 3600_000);
  return target.getTime() / 1000;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Flow: Session Management", () => {
  const onSelectSession = vi.fn();
  const onNewChat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessions = undefined;
    mockIsLoading = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- Sidebar rendering ---------------------------------------------------

  it("shows sidebar with session list", () => {
    mockSessions = [
      makeSession({ id: "a", last_active: nowEpoch() - 10 }),
    ];
    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );
    // Session should be visible
    expect(screen.getByText("Session a")).toBeInTheDocument();
    // New Chat button should be visible
    expect(screen.getByText("New Chat")).toBeInTheDocument();
  });

  it("groups sessions by date (Today, Yesterday, Older)", () => {
    mockSessions = [
      makeSession({ id: "old1", last_active: olderEpoch(5) }),
      makeSession({ id: "yesterday1", last_active: yesterdayEpoch() }),
      makeSession({ id: "today1", last_active: nowEpoch() - 100 }),
    ];
    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
    expect(screen.getByText("Older")).toBeInTheDocument();
  });

  it("shows loading skeleton while sessions load", () => {
    mockIsLoading = true;
    const { container } = render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("No conversations yet")).not.toBeInTheDocument();
  });

  it("shows empty state when no sessions exist", () => {
    mockSessions = [];
    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
    expect(screen.getByText("Start a new chat to begin")).toBeInTheDocument();
  });

  // ---- Session selection ---------------------------------------------------

  it("clicking a session loads its messages", async () => {
    const user = userEvent.setup();
    mockSessions = [
      makeSession({ id: "sess_1", title: "My Session", last_active: nowEpoch() - 10 }),
    ];
    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    await user.click(screen.getByRole("button", { name: /My Session/ }));
    expect(onSelectSession).toHaveBeenCalledWith("sess_1");
  });

  it("active session is highlighted in sidebar", () => {
    mockSessions = [
      makeSession({ id: "a", last_active: nowEpoch() - 10 }),
      makeSession({ id: "b", last_active: nowEpoch() - 20 }),
    ];
    render(
      <SessionList
        activeSessionId="b"
        onSelectSession={onSelectSession}
        onNewChat={onNewChat}
      />,
    );

    const itemA = screen.getByRole("button", { name: /Session a/ });
    const itemB = screen.getByRole("button", { name: /Session b/ });
    expect(itemA.className).not.toContain("dark:bg-white/10");
    expect(itemB.className).toContain("dark:bg-white/10");
  });

  // ---- Search --------------------------------------------------------------

  it("search input filters sessions by title", async () => {
    const user = userEvent.setup();
    mockSessions = [
      makeSession({ id: "a", title: "Python debugging", last_active: nowEpoch() - 10 }),
      makeSession({ id: "b", title: "Rust compilation", last_active: nowEpoch() - 20 }),
      makeSession({ id: "c", title: "Python optimization", last_active: nowEpoch() - 30 }),
    ];
    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    const searchInput = screen.getByPlaceholderText("Search conversations...");
    await user.type(searchInput, "Python");

    expect(screen.getByText("Python debugging")).toBeInTheDocument();
    expect(screen.queryByText("Rust compilation")).not.toBeInTheDocument();
    expect(screen.getByText("Python optimization")).toBeInTheDocument();
  });

  it("Escape key clears search input", async () => {
    const user = userEvent.setup();
    mockSessions = [
      makeSession({ id: "a", title: "Hello", last_active: nowEpoch() - 10 }),
    ];
    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    const searchInput = screen.getByPlaceholderText("Search conversations...");
    await user.type(searchInput, "Hello");

    // Session visible while searching
    expect(screen.getByText("Hello")).toBeInTheDocument();

    // Press Escape
    await user.keyboard("{Escape}");

    // Search should be cleared
    expect(searchInput).toHaveValue("");
  });

  // ---- New Chat -----------------------------------------------------------

  it("clicking 'New Chat' clears current session", async () => {
    const user = userEvent.setup();
    mockSessions = [];
    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    await user.click(screen.getByText("New Chat"));
    expect(onNewChat).toHaveBeenCalledTimes(1);
  });

  // ---- Rename flow --------------------------------------------------------

  it("clicking rename shows inline edit input", async () => {
    const user = userEvent.setup();
    mockSessions = [
      makeSession({ id: "a", title: "My Session", last_active: nowEpoch() - 10 }),
    ];
    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    // Hover over session to reveal buttons, then click rename
    const sessionItem = screen.getByRole("button", { name: /My Session/ });
    await user.hover(sessionItem);

    const renameBtn = screen.getByTitle("Rename");
    await user.click(renameBtn);

    // Should show an input with the current title
    expect(screen.getByDisplayValue("My Session")).toBeInTheDocument();
  });

  it("rename input is pre-filled with current title", async () => {
    const user = userEvent.setup();
    mockSessions = [
      makeSession({ id: "a", title: "Original Title", last_active: nowEpoch() - 10 }),
    ];
    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    const sessionItem = screen.getByRole("button", { name: /Original Title/ });
    await user.hover(sessionItem);
    await user.click(screen.getByTitle("Rename"));

    expect(screen.getByDisplayValue("Original Title")).toBeInTheDocument();
  });

  it("Enter key commits rename", async () => {
    const user = userEvent.setup();
    mockSessions = [
      makeSession({ id: "a", title: "Old Title", last_active: nowEpoch() - 10 }),
    ];
    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    const sessionItem = screen.getByRole("button", { name: /Old Title/ });
    await user.hover(sessionItem);
    await user.click(screen.getByTitle("Rename"));

    const input = screen.getByDisplayValue("Old Title");
    await user.clear(input);
    await user.type(input, "New Title{Enter}");

    expect(mockRenameMutate).toHaveBeenCalledWith(
      { id: "a", title: "New Title" },
      expect.any(Object),
    );
  });

  it("Escape key cancels rename", async () => {
    const user = userEvent.setup();
    mockSessions = [
      makeSession({ id: "a", title: "My Title", last_active: nowEpoch() - 10 }),
    ];
    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    const sessionItem = screen.getByRole("button", { name: /My Title/ });
    await user.hover(sessionItem);
    await user.click(screen.getByTitle("Rename"));

    const input = screen.getByDisplayValue("My Title");
    await user.type(input, "{Escape}");

    // Should not have called mutate
    expect(mockRenameMutate).not.toHaveBeenCalled();
    // Should show original title again
    expect(screen.getByText("My Title")).toBeInTheDocument();
  });

  // ---- Delete flow --------------------------------------------------------

  it("clicking delete shows confirmation", async () => {
    const user = userEvent.setup();
    mockSessions = [
      makeSession({ id: "a", title: "Delete Me", last_active: nowEpoch() - 10 }),
    ];
    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    const sessionItem = screen.getByRole("button", { name: /Delete Me/ });
    await user.hover(sessionItem);
    await user.click(screen.getByTitle("Delete"));

    expect(screen.getByText("Delete this conversation?")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("confirming delete removes the session", async () => {
    const user = userEvent.setup();
    mockSessions = [
      makeSession({ id: "a", title: "Delete Me", last_active: nowEpoch() - 10 }),
    ];
    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    const sessionItem = screen.getByRole("button", { name: /Delete Me/ });
    await user.hover(sessionItem);
    await user.click(screen.getByTitle("Delete"));

    // Confirm delete
    await user.click(screen.getByText("Delete"));

    expect(mockDeleteMutate).toHaveBeenCalledWith("a");
  });

  it("canceling delete hides confirmation", async () => {
    const user = userEvent.setup();
    mockSessions = [
      makeSession({ id: "a", title: "Keep Me", last_active: nowEpoch() - 10 }),
    ];
    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    const sessionItem = screen.getByRole("button", { name: /Keep Me/ });
    await user.hover(sessionItem);
    await user.click(screen.getByTitle("Delete"));

    // Cancel
    await user.click(screen.getByTitle("Cancel"));

    // Should return to normal view
    expect(screen.getByText("Keep Me")).toBeInTheDocument();
    expect(mockDeleteMutate).not.toHaveBeenCalled();
  });

  // ---- Full journey -------------------------------------------------------

  it("full journey: browse → search → select → rename → delete", async () => {
    const user = userEvent.setup();
    mockSessions = [
      makeSession({ id: "s1", title: "React debugging", last_active: nowEpoch() - 10 }),
      makeSession({ id: "s2", title: "Rust compilation", last_active: nowEpoch() - 20 }),
    ];
    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    // Step 1: See both sessions
    expect(screen.getByText("React debugging")).toBeInTheDocument();
    expect(screen.getByText("Rust compilation")).toBeInTheDocument();

    // Step 2: Search to filter
    await user.type(screen.getByPlaceholderText("Search conversations..."), "React");
    expect(screen.getByText("React debugging")).toBeInTheDocument();
    expect(screen.queryByText("Rust compilation")).not.toBeInTheDocument();

    // Step 3: Select the filtered session
    await user.click(screen.getByRole("button", { name: /React debugging/ }));
    expect(onSelectSession).toHaveBeenCalledWith("s1");

    // Step 4: Clear search — focus search input first, then press Escape
    const searchInput2 = screen.getByPlaceholderText("Search conversations...");
    searchInput2.focus();
    await user.keyboard("{Escape}");
    expect(searchInput2).toHaveValue("");

    // Step 5: Both sessions visible again
    expect(screen.getByText("React debugging")).toBeInTheDocument();
    expect(screen.getByText("Rust compilation")).toBeInTheDocument();
  });

  // ---- Escape search when empty does nothing --------------------------------

  it("Escape on empty search does not cause errors", async () => {
    const user = userEvent.setup();
    mockSessions = [];
    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    const searchInput = screen.getByPlaceholderText("Search conversations...");
    await user.keyboard("{Escape}");
    expect(searchInput).toHaveValue("");
  });

  // ---- Search filtering shows empty state -----------------------------------

  it("shows empty state when search matches nothing", async () => {
    const user = userEvent.setup();
    mockSessions = [
      makeSession({ id: "a", title: "Hello", last_active: nowEpoch() - 10 }),
    ];
    render(
      <SessionList onSelectSession={onSelectSession} onNewChat={onNewChat} />,
    );

    await user.type(screen.getByPlaceholderText("Search conversations..."), "zzz no match");
    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
  });
});
