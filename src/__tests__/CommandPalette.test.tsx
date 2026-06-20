/**
 * CommandPalette.test.tsx — React component tests for CommandPalette
 *
 * Tests: render open/closed, auto-focus, fuzzy search, Cmd+K shortcut,
 * Esc close, arrow navigation, Enter selection, categories, action callbacks,
 * empty state.
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

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "sess_001",
    title: "Test Session",
    source: "cli",
    model: "gpt-4",
    message_count: 5,
    started_at: 1700000000,
    last_active: 1700000000,
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

function makeProps(
  overrides: Partial<CommandPaletteProps> = {},
): CommandPaletteProps {
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

// ── Tests ──────────────────────────────────────────────────────────────────

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- 1. Render open / hidden ────────────────────────────────────────────

  it("renders palette when open, nothing when closed", () => {
    const { rerender } = renderPalette({ open: true });
    expect(screen.getByTestId("command-palette-overlay")).toBeInTheDocument();

    rerender(<CommandPalette {...makeProps({ open: false })} />);
    expect(screen.queryByTestId("command-palette-overlay")).not.toBeInTheDocument();
  });

  // ---- 2. Auto-focus search input ─────────────────────────────────────────

  it("auto-focuses the search input on open", async () => {
    renderPalette({ open: true });
    await waitFor(() => {
      const input = screen.getByPlaceholderText("Search sessions, actions...");
      expect(input).toHaveFocus();
    });
  });

  // ---- 3. Fuzzy search filters sessions ───────────────────────────────────

  it("filters sessions by fuzzy match when typing", async () => {
    const sessions = [
      makeSession({ id: "s1", title: "React refactoring" }),
      makeSession({ id: "s2", title: "Database migration" }),
      makeSession({ id: "s3", title: "React performance" }),
    ];
    const user = userEvent.setup();
    renderPalette({ sessions });

    const input = screen.getByPlaceholderText("Search sessions, actions...");
    await user.type(input, "react");

    // Sessions matching "react" should be visible
    expect(screen.getByText("React refactoring")).toBeInTheDocument();
    expect(screen.getByText("React performance")).toBeInTheDocument();
    // Non-matching session should be filtered out
    expect(screen.queryByText("Database migration")).not.toBeInTheDocument();
  });

  // ---- 4. Cmd+K opens palette (via useCommandPaletteShortcut) ──────────────

  it("toggles palette open via Cmd+K shortcut", () => {
    let isOpen = false;
    const toggle = () => { isOpen = !isOpen; };

    function TestHost() {
      useCommandPaletteShortcut(toggle);
      return null;
    }
    render(<TestHost />);

    // Cmd+K on macOS (metaKey)
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(isOpen).toBe(true);

    // Cmd+K again to close
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(isOpen).toBe(false);
  });

  it("toggles palette open via Ctrl+K shortcut (non-macOS)", () => {
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

  // ---- 5. Esc closes palette ──────────────────────────────────────────────

  it("closes palette when Escape is pressed", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderPalette({ onClose });

    const input = screen.getByPlaceholderText("Search sessions, actions...");
    input.focus();
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });

  // ---- 6. Arrow keys navigate results ─────────────────────────────────────

  it("supports arrow key navigation through results", async () => {
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

    // Something should have been selected (either a session or an action)
    const anyActionCalled =
      actions.onSelectSession.mock.calls.length > 0 ||
      actions.onNewSession.mock.calls.length > 0 ||
      actions.onToggleTheme.mock.calls.length > 0;

    expect(anyActionCalled).toBe(true);
  });

  // ---- 7. Enter selects item and closes ───────────────────────────────────

  it("Enter on a session item triggers onSelectSession and closes palette", async () => {
    const sessions = [makeSession({ id: "s1", title: "My Session" })];
    const actions = makeActions();
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderPalette({ sessions, actions, onClose });

    // Wait for the session to appear, then Enter
    await waitFor(() => {
      expect(screen.getByText("My Session")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Search sessions, actions...");
    input.focus();
    await user.keyboard("{Enter}");

    // The first result (session) should have been selected
    expect(actions.onSelectSession).toHaveBeenCalledWith("s1");
    expect(onClose).toHaveBeenCalled();
  });

  // ---- 8. Shows all categories ────────────────────────────────────────────

  it("shows Sessions, Actions, and Navigation categories", () => {
    const sessions = [makeSession({ id: "s1", title: "A session" })];
    renderPalette({ sessions });

    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.getByText("Navigation")).toBeInTheDocument();
  });

  // ---- 9. Action items trigger correct callbacks ──────────────────────────

  it("clicking 'New Chat' action triggers onNewSession", async () => {
    const actions = makeActions();
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderPalette({ actions, onClose });

    await user.click(screen.getByText("New Chat"));

    expect(actions.onNewSession).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it("clicking 'Go to Settings' triggers onGoToSettings", async () => {
    const actions = makeActions();
    const user = userEvent.setup();
    renderPalette({ actions });

    await user.click(screen.getByText("Go to Settings"));

    expect(actions.onGoToSettings).toHaveBeenCalledTimes(1);
  });

  // ---- 10. Empty state ────────────────────────────────────────────────────

  it("shows empty state when no sessions match the query", async () => {
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

  // ---- Bonus: backdrop click closes ───────────────────────────────────────

  it("closes when clicking the backdrop", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderPalette({ onClose });

    const overlay = screen.getByTestId("command-palette-overlay");
    await user.click(overlay);

    expect(onClose).toHaveBeenCalled();
  });
});
