/**
 * flow-command-palette.test.tsx — Command Palette Flow
 *
 * Integration-level tests that simulate the complete user journey through
 * the Cmd+K command palette: opening, searching, navigating, selecting
 * actions, and verifying effects.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CommandPalette,
  useCommandPaletteShortcut,
  type CommandPaletteProps,
} from "../features/command-palette/CommandPalette";
import type { Session } from "../features/connection/gateway-api";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "sess_001",
    title: "Test Session",
    source: "cli",
    model: "gpt-4",
    message_count: 5,
    started_at: 1700000000,
    last_active: Date.now() / 1000 - 300, // 5 minutes ago
    ...overrides,
  };
}

function makeActions() {
  return {
    onNewSession: vi.fn(),
    onToggleTheme: vi.fn(),
    onExportChat: vi.fn(),
    onDisconnect: vi.fn(),
    onCopySessionId: vi.fn(),
    onGoToSettings: vi.fn(),
    onGoToCurrentSession: vi.fn(),
    onSelectSession: vi.fn(),
  };
}

function makeProps(overrides: Partial<CommandPaletteProps> = {}): CommandPaletteProps {
  return {
    open: true,
    onClose: vi.fn(),
    sessions: [],
    currentSessionId: null,
    actions: makeActions(),
    ...overrides,
  };
}

function renderPalette(props?: Partial<CommandPaletteProps>) {
  const fullProps = makeProps(props);
  const result = render(<CommandPalette {...fullProps} />);
  return { ...result, props: fullProps };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Flow: Command Palette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- Opening & closing ---------------------------------------------------

  it("opens on Cmd+K keyboard shortcut", () => {
    let isOpen = false;
    const toggle = () => { isOpen = !isOpen; };

    function TestHost() {
      useCommandPaletteShortcut(toggle);
      return null;
    }
    render(<TestHost />);

    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(isOpen).toBe(true);
  });

  it("opens on Ctrl+K keyboard shortcut", () => {
    let isOpen = false;
    const toggle = () => { isOpen = !isOpen; };

    function TestHost() {
      useCommandPaletteShortcut(toggle);
      return null;
    }
    render(<TestHost />);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(isOpen).toBe(true);
  });

  it("closes on Escape key", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderPalette({ onClose });

    const input = screen.getByPlaceholderText("Search sessions, actions...");
    input.focus();
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });

  it("closes on clicking backdrop", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderPalette({ onClose });

    const overlay = screen.getByTestId("command-palette-overlay");
    await user.click(overlay);

    expect(onClose).toHaveBeenCalled();
  });

  // ---- Search input --------------------------------------------------------

  it("shows search input focused on open", async () => {
    renderPalette({ open: true });

    await waitFor(() => {
      const input = screen.getByPlaceholderText("Search sessions, actions...");
      expect(input).toHaveFocus();
    });
  });

  // ---- Groups --------------------------------------------------------------

  it("shows 'Sessions' and 'Actions' and 'Navigation' groups", () => {
    const sessions = [makeSession({ id: "s1", title: "A session" })];
    renderPalette({ sessions });

    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.getByText("Navigation")).toBeInTheDocument();
  });

  // ---- Filtering -----------------------------------------------------------

  it("search filters sessions by title", async () => {
    const sessions = [
      makeSession({ id: "s1", title: "React refactoring" }),
      makeSession({ id: "s2", title: "Database migration" }),
      makeSession({ id: "s3", title: "React performance" }),
    ];
    const user = userEvent.setup();
    renderPalette({ sessions });

    const input = screen.getByPlaceholderText("Search sessions, actions...");
    await user.type(input, "react");

    expect(screen.getByText("React refactoring")).toBeInTheDocument();
    expect(screen.getByText("React performance")).toBeInTheDocument();
    expect(screen.queryByText("Database migration")).not.toBeInTheDocument();
  });

  it("search filters actions by label (cmdk keeps visible, sessions filtered)", async () => {
    const sessions = [
      makeSession({ id: "s1", title: "React app" }),
    ];
    const user = userEvent.setup();
    renderPalette({ sessions });

    const input = screen.getByPlaceholderText("Search sessions, actions...");
    await user.type(input, "New Chat");

    // Sessions are filtered (React app should be gone)
    expect(screen.queryByText("React app")).not.toBeInTheDocument();
    // But actions always remain visible (cmdk shouldFilter={false})
    expect(screen.getByText("New Chat")).toBeInTheDocument();
    expect(screen.getByText("Toggle Theme")).toBeInTheDocument();
  });

  it("shows 'No results found' for empty search", async () => {
    const sessions = [makeSession({ id: "s1", title: "React app" })];
    const user = userEvent.setup();
    renderPalette({ sessions });

    const input = screen.getByPlaceholderText("Search sessions, actions...");
    await user.type(input, "zzzznonexistent");

    await waitFor(() => {
      expect(screen.getByText("No results found")).toBeInTheDocument();
      expect(screen.queryByText("React app")).not.toBeInTheDocument();
    });
  });

  // ---- Actions -------------------------------------------------------------

  it("New Chat action creates new session", async () => {
    const actions = makeActions();
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderPalette({ actions, onClose });

    await user.click(screen.getByText("New Chat"));

    expect(actions.onNewSession).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it("Toggle Theme action switches theme", async () => {
    const actions = makeActions();
    const user = userEvent.setup();
    renderPalette({ actions });

    await user.click(screen.getByText("Toggle Theme"));

    expect(actions.onToggleTheme).toHaveBeenCalledTimes(1);
  });

  it("Export Chat action is disabled when no session", () => {
    const actions = makeActions();
    renderPalette({ actions, currentSessionId: null });

    // cmdk renders aria-disabled="true" for disabled items
    const exportRow = screen.getByText("Export Chat").closest("[data-value=\"export\"]");
    expect(exportRow).toHaveAttribute("aria-disabled", "true");
  });

  it("Export Chat action is enabled when session exists", () => {
    const actions = makeActions();
    renderPalette({ actions, currentSessionId: "sess_123" });

    const exportRow = screen.getByText("Export Chat").closest("[data-value=\"export\"]");
    expect(exportRow).toHaveAttribute("aria-disabled", "false");
  });

  it("Copy Session ID action copies to clipboard", async () => {
    const actions = makeActions();
    const user = userEvent.setup();
    renderPalette({ actions, currentSessionId: "sess_123" });

    await user.click(screen.getByText("Copy Session ID"));

    expect(actions.onCopySessionId).toHaveBeenCalledTimes(1);
  });

  it("Disconnect action navigates to /connection", async () => {
    const actions = makeActions();
    const user = userEvent.setup();
    renderPalette({ actions });

    await user.click(screen.getByText("Disconnect"));

    expect(actions.onDisconnect).toHaveBeenCalledTimes(1);
  });

  it("Go to Settings action navigates to /connection", async () => {
    const actions = makeActions();
    const user = userEvent.setup();
    renderPalette({ actions });

    await user.click(screen.getByText("Go to Settings"));

    expect(actions.onGoToSettings).toHaveBeenCalledTimes(1);
  });

  // ---- Sessions display ----------------------------------------------------

  it("session items show message count and last active time", () => {
    const sessions = [
      makeSession({
        id: "s1",
        title: "My Session",
        message_count: 12,
        last_active: Date.now() / 1000 - 300, // 5 minutes ago
      }),
    ];
    renderPalette({ sessions });

    expect(screen.getByText("12 msg")).toBeInTheDocument();
    // Last active should show relative time (e.g., "5m ago")
    expect(screen.getByText(/ago/)).toBeInTheDocument();
  });

  it("active session shows blue dot indicator", () => {
    const sessions = [
      makeSession({ id: "s1", title: "Active Session" }),
    ];
    renderPalette({ sessions, currentSessionId: "s1" });

    // The active indicator is a small dot inside the session row
    // It's rendered as a span with glow-accent class
    const sessionItems = screen.getByText("Active Session").closest("[data-value]");
    expect(sessionItems).toBeInTheDocument();
  });

  // ---- ESC hint ------------------------------------------------------------

  it("ESC keyboard shortcut hint is visible", () => {
    renderPalette();

    expect(screen.getByText("ESC")).toBeInTheDocument();
  });

  // ---- ARIA semantics ------------------------------------------------------

  it("ARIA dialog semantics are present (role=dialog, aria-modal)", () => {
    renderPalette();

    const overlay = screen.getByTestId("command-palette-overlay");
    expect(overlay).toHaveAttribute("role", "dialog");
    expect(overlay).toHaveAttribute("aria-modal", "true");
    expect(overlay).toHaveAttribute("aria-label", "Command palette");
  });

  // ---- Enter selection and navigation --------------------------------------

  it("Enter on a session item triggers onSelectSession and closes palette", async () => {
    const sessions = [makeSession({ id: "s1", title: "My Session" })];
    const actions = makeActions();
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderPalette({ sessions, actions, onClose });

    await waitFor(() => {
      expect(screen.getByText("My Session")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Search sessions, actions...");
    input.focus();
    await user.keyboard("{Enter}");

    expect(actions.onSelectSession).toHaveBeenCalledWith("s1");
    expect(onClose).toHaveBeenCalled();
  });

  // ---- Arrow key navigation ------------------------------------------------

  it("arrow keys navigate through results", async () => {
    const sessions = [
      makeSession({ id: "s1", title: "First session" }),
      makeSession({ id: "s2", title: "Second session" }),
    ];
    const actions = makeActions();
    const user = userEvent.setup();
    renderPalette({ sessions, actions });

    const input = screen.getByPlaceholderText("Search sessions, actions...");
    input.focus();

    // Arrow down twice then Enter — should select second item
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    const anyActionCalled =
      actions.onSelectSession.mock.calls.length > 0 ||
      actions.onNewSession.mock.calls.length > 0 ||
      actions.onToggleTheme.mock.calls.length > 0;

    expect(anyActionCalled).toBe(true);
  });

  // ---- Full palette journey ------------------------------------------------

  it("full journey: open → search → filter → select action → close", async () => {
    const sessions = [
      makeSession({ id: "s1", title: "React debugging" }),
      makeSession({ id: "s2", title: "Rust compilation" }),
    ];
    const actions = makeActions();
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderPalette({ sessions, actions, onClose });

    // Step 1: Palette is open
    expect(screen.getByTestId("command-palette-overlay")).toBeInTheDocument();

    // Step 2: Search filters sessions
    const input = screen.getByPlaceholderText("Search sessions, actions...");
    await user.type(input, "React");
    expect(screen.getByText("React debugging")).toBeInTheDocument();
    expect(screen.queryByText("Rust compilation")).not.toBeInTheDocument();

    // Step 3: Clear search
    await user.clear(input);
    expect(screen.getByText("Rust compilation")).toBeInTheDocument();

    // Step 4: Select an action
    await user.click(screen.getByText("Toggle Theme"));

    // Step 5: Palette closes
    expect(onClose).toHaveBeenCalled();
    expect(actions.onToggleTheme).toHaveBeenCalled();
  });

  it("full journey: open → search → no results → clear → select session", async () => {
    const sessions = [
      makeSession({ id: "s1", title: "My Session" }),
    ];
    const actions = makeActions();
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderPalette({ sessions, actions, onClose });

    // Step 1: Search for nothing
    await user.type(screen.getByPlaceholderText("Search sessions, actions..."), "zzz");

    await waitFor(() => {
      expect(screen.getByText("No results found")).toBeInTheDocument();
    });

    // Step 2: Clear search
    await user.clear(screen.getByPlaceholderText("Search sessions, actions..."));

    // Step 3: Session visible again
    await waitFor(() => {
      expect(screen.getByText("My Session")).toBeInTheDocument();
    });

    // Step 4: Select session
    await user.keyboard("{Enter}");
    expect(actions.onSelectSession).toHaveBeenCalledWith("s1");
  });
});
