/**
 * SessionItem.test.tsx — React component tests for SessionItem
 *
 * Tests rename (inline edit), delete (confirmation flow), and normal display.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SessionItem from "../features/sessions/SessionItem";
import type { Session } from "../features/connection/gateway-api";

// ---------------------------------------------------------------------------
// Mock mutation hooks — we test the hooks separately in use-sessions.test.tsx
// ---------------------------------------------------------------------------

const mockRenameMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock("../features/sessions/use-sessions", () => ({
  useRenameSession: () => ({
    mutate: mockRenameMutate,
    isPending: false,
  }),
  useDeleteSession: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "test_001",
    title: "My Conversation",
    source: "cli",
    model: "hermes-3",
    message_count: 5,
    started_at: Date.now() / 1000 - 3600,
    last_active: Date.now() / 1000 - 60,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SessionItem", () => {
  const onClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- Display ------------------------------------------------------------

  it("renders session title", () => {
    render(<SessionItem session={makeSession()} isActive={false} onClick={onClick} />);
    expect(screen.getByText("My Conversation")).toBeInTheDocument();
  });

  it("renders 'New conversation' when title is empty", () => {
    render(
      <SessionItem
        session={makeSession({ title: null })}
        isActive={false}
        onClick={onClick}
      />,
    );
    expect(screen.getByText("New conversation")).toBeInTheDocument();
  });

  it("renders message count", () => {
    render(<SessionItem session={makeSession()} isActive={false} onClick={onClick} />);
    expect(screen.getByText(/5 messages/)).toBeInTheDocument();
  });

  it("renders singular 'message' when count is 1", () => {
    render(
      <SessionItem
        session={makeSession({ message_count: 1 })}
        isActive={false}
        onClick={onClick}
      />,
    );
    expect(screen.getByText(/1 message/)).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    render(<SessionItem session={makeSession()} isActive={false} onClick={onClick} />);
    await user.click(screen.getByText("My Conversation"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // ---- Rename -------------------------------------------------------------

  it("shows rename input when pencil button clicked", async () => {
    const user = userEvent.setup();
    render(<SessionItem session={makeSession()} isActive={false} onClick={onClick} />);

    const renameBtn = screen.getByTitle("Rename");
    await user.click(renameBtn);

    const input = screen.getByDisplayValue("My Conversation");
    expect(input).toBeInTheDocument();
  });

  it("saves rename on Enter key", async () => {
    const user = userEvent.setup();
    render(<SessionItem session={makeSession()} isActive={false} onClick={onClick} />);

    await user.click(screen.getByTitle("Rename"));
    const input = screen.getByDisplayValue("My Conversation");
    await user.clear(input);
    await user.type(input, "Renamed Title{Enter}");

    expect(mockRenameMutate).toHaveBeenCalledWith(
      { id: "test_001", title: "Renamed Title" },
      expect.any(Object),
    );
  });

  it("saves rename on blur", async () => {
    const user = userEvent.setup();
    render(<SessionItem session={makeSession()} isActive={false} onClick={onClick} />);

    await user.click(screen.getByTitle("Rename"));
    const input = screen.getByDisplayValue("My Conversation");
    await user.clear(input);
    await user.type(input, "Blurred Title");
    await user.tab(); // blur

    expect(mockRenameMutate).toHaveBeenCalledWith(
      { id: "test_001", title: "Blurred Title" },
      expect.any(Object),
    );
  });

  it("cancels rename on Escape without saving", async () => {
    const user = userEvent.setup();
    render(<SessionItem session={makeSession()} isActive={false} onClick={onClick} />);

    await user.click(screen.getByTitle("Rename"));
    const input = screen.getByDisplayValue("My Conversation");
    await user.type(input, "Changed{Escape}");

    expect(mockRenameMutate).not.toHaveBeenCalled();
    // Back to display mode
    expect(screen.getByText("My Conversation")).toBeInTheDocument();
  });

  it("does not save when title is unchanged", async () => {
    const user = userEvent.setup();
    render(<SessionItem session={makeSession()} isActive={false} onClick={onClick} />);

    await user.click(screen.getByTitle("Rename"));
    await user.tab(); // blur without changing

    expect(mockRenameMutate).not.toHaveBeenCalled();
  });

  it("does not save when title is empty", async () => {
    const user = userEvent.setup();
    render(<SessionItem session={makeSession()} isActive={false} onClick={onClick} />);

    await user.click(screen.getByTitle("Rename"));
    const input = screen.getByDisplayValue("My Conversation");
    await user.clear(input);
    await user.tab(); // blur with empty

    expect(mockRenameMutate).not.toHaveBeenCalled();
  });

  // ---- Delete -------------------------------------------------------------

  it("shows delete confirmation when trash button clicked", async () => {
    const user = userEvent.setup();
    render(<SessionItem session={makeSession()} isActive={false} onClick={onClick} />);

    await user.click(screen.getByTitle("Delete"));

    expect(screen.getByText("Delete this conversation?")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls delete on confirm", async () => {
    const user = userEvent.setup();
    render(<SessionItem session={makeSession()} isActive={false} onClick={onClick} />);

    await user.click(screen.getByTitle("Delete"));
    await user.click(screen.getByText("Delete"));

    expect(mockDeleteMutate).toHaveBeenCalledWith("test_001");
  });

  it("cancels delete without deleting", async () => {
    const user = userEvent.setup();
    render(<SessionItem session={makeSession()} isActive={false} onClick={onClick} />);

    await user.click(screen.getByTitle("Delete"));
    // Click the cancel (X) button in confirmation bar
    const cancelBtn = screen.getByTitle("Cancel");
    await user.click(cancelBtn);

    expect(mockDeleteMutate).not.toHaveBeenCalled();
    // Back to normal display
    expect(screen.getByText("My Conversation")).toBeInTheDocument();
  });

  // ---- Active state -------------------------------------------------------

  it("shows active styling when isActive is true", () => {
    const { container } = render(
      <SessionItem session={makeSession()} isActive={true} onClick={onClick} />,
    );
    const item = container.querySelector('[role="button"]');
    // Spec: selection uses rounded rect background (dark:bg-white/10), NOT left-border
    expect(item?.className).toContain("dark:bg-white/10");
  });

  it("does not show active styling when isActive is false", () => {
    const { container } = render(
      <SessionItem session={makeSession()} isActive={false} onClick={onClick} />,
    );
    const item = container.querySelector('[role="button"]');
    expect(item?.className).not.toContain("dark:bg-white/10");
  });

  // ---- Source icon ---------------------------------------------------------

  it("renders Terminal icon for 'cli' source", () => {
    const { container } = render(
      <SessionItem session={makeSession({ source: "cli" })} isActive={false} onClick={onClick} />,
    );
    // The icon is an SVG inside the first child div
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("renders correct icon for different sources without crashing", () => {
    const sources = ["terminal", "cli", "mobile", "phone", "web", "browser", "api", "unknown"];
    for (const source of sources) {
      const { unmount } = render(
        <SessionItem session={makeSession({ source })} isActive={false} onClick={onClick} />,
      );
      expect(screen.getByText("My Conversation")).toBeInTheDocument();
      unmount();
    }
  });

  // ---- Model display -------------------------------------------------------

  it("renders model name when present", () => {
    render(
      <SessionItem session={makeSession({ model: "gpt-4o" })} isActive={false} onClick={onClick} />,
    );
    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
  });

  it("hides model separator when model is empty", () => {
    const { container } = render(
      <SessionItem session={makeSession({ model: "" })} isActive={false} onClick={onClick} />,
    );
    // No model span should be rendered
    expect(container.textContent).not.toContain("·  ");
  });

  // ---- Relative time -------------------------------------------------------

  it("shows 'now' for messages active within the last minute", () => {
    render(
      <SessionItem
        session={makeSession({ last_active: Date.now() / 1000 - 10 })}
        isActive={false}
        onClick={onClick}
      />,
    );
    expect(screen.getByText("now")).toBeInTheDocument();
  });

  it("shows 'Xm' for minutes ago", () => {
    render(
      <SessionItem
        session={makeSession({ last_active: Date.now() / 1000 - 300 })}
        isActive={false}
        onClick={onClick}
      />,
    );
    expect(screen.getByText("5m")).toBeInTheDocument();
  });

  it("shows 'Xh' for hours ago", () => {
    render(
      <SessionItem
        session={makeSession({ last_active: Date.now() / 1000 - 7200 })}
        isActive={false}
        onClick={onClick}
      />,
    );
    expect(screen.getByText("2h")).toBeInTheDocument();
  });

  // ---- Keyboard navigation -------------------------------------------------

  it("activates on Enter key", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SessionItem session={makeSession()} isActive={false} onClick={onClick} />,
    );
    const item = container.querySelector('[role="button"]') as HTMLElement;
    item.focus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("activates on Space key", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SessionItem session={makeSession()} isActive={false} onClick={onClick} />,
    );
    const item = container.querySelector('[role="button"]') as HTMLElement;
    item.focus();
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not activate on other keys", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SessionItem session={makeSession()} isActive={false} onClick={onClick} />,
    );
    const item = container.querySelector('[role="button"]') as HTMLElement;
    item.focus();
    await user.keyboard("a");
    expect(onClick).not.toHaveBeenCalled();
  });

  // ---- Rename edge cases ---------------------------------------------------

  it("renames with whitespace-trimmed title on Enter", async () => {
    const user = userEvent.setup();
    render(<SessionItem session={makeSession()} isActive={false} onClick={onClick} />);

    await user.click(screen.getByTitle("Rename"));
    const input = screen.getByDisplayValue("My Conversation");
    await user.clear(input);
    await user.type(input, "  Spaced Title  {Enter}");

    expect(mockRenameMutate).toHaveBeenCalledWith(
      { id: "test_001", title: "Spaced Title" },
      expect.any(Object),
    );
  });

  // ---- Delete edge cases ---------------------------------------------------

  it("delete button stops propagation (does not trigger onClick)", async () => {
    const user = userEvent.setup();
    render(<SessionItem session={makeSession()} isActive={false} onClick={onClick} />);

    await user.click(screen.getByTitle("Delete"));

    // onClick on the item should NOT have fired — only the delete button
    expect(onClick).not.toHaveBeenCalled();
  });

  it("rename button stops propagation (does not trigger onClick)", async () => {
    const user = userEvent.setup();
    render(<SessionItem session={makeSession()} isActive={false} onClick={onClick} />);

    await user.click(screen.getByTitle("Rename"));

    expect(onClick).not.toHaveBeenCalled();
  });
});
