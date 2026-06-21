/**
 * ForkDialog.test.tsx — React component tests for ForkDialog
 *
 * Tests rendering, message count display, fork confirmation, cancel,
 * error handling, and message selection.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ForkDialog from "../features/chat/ForkDialog";
import { useChatStore } from "../features/chat/use-chat-store";

// ---- Mock gateway-api ------------------------------------------------------

const mockForkSession = vi.fn();

vi.mock("../features/connection/gateway-api", () => ({
  getGatewayClient: () => ({
    forkSession: (...args: unknown[]) => mockForkSession(...args),
  }),
}));

// ---- Helpers ----------------------------------------------------------------

interface SimpleMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

function setStoreMessages(messages: SimpleMessage[]) {
  useChatStore.getState().loadFromSession(messages);
}

function makeMessages(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg_${i}`,
    role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
    content: `Message ${i}: Lorem ipsum dolor sit amet`,
    timestamp: 1700000000 + i,
  }));
}

// ---- Tests ------------------------------------------------------------------

describe("ForkDialog", () => {
  const onClose = vi.fn();
  const onForked = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.getState().clear();
    useChatStore.getState().setSession("sess_123");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useChatStore.getState().clear();
  });

  // ---- Closed state --------------------------------------------------------

  it("renders nothing when open is false", () => {
    const { container } = render(
      <ForkDialog open={false} onClose={onClose} onForked={onForked} />,
    );
    expect(container.firstChild).toBeNull();
  });

  // ---- Open state — basic rendering ---------------------------------------

  it("renders dialog title when open", () => {
    render(<ForkDialog open={true} onClose={onClose} onForked={onForked} />);
    expect(screen.getByText("Fork Session")).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<ForkDialog open={true} onClose={onClose} onForked={onForked} />);
    expect(screen.getByText(/Create a branch of this session/i)).toBeInTheDocument();
  });

  it("renders Cancel and Fork buttons", () => {
    render(<ForkDialog open={true} onClose={onClose} onForked={onForked} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Fork")).toBeInTheDocument();
  });

  // ---- Message candidates --------------------------------------------------

  it("shows message candidates from the store", () => {
    setStoreMessages(makeMessages(3));
    render(<ForkDialog open={true} onClose={onClose} onForked={onForked} />);

    expect(screen.getByText(/Message 0:/)).toBeInTheDocument();
    expect(screen.getByText(/Message 1:/)).toBeInTheDocument();
    expect(screen.getByText(/Message 2:/)).toBeInTheDocument();
  });

  it("shows message index labels", () => {
    setStoreMessages(makeMessages(2));
    render(<ForkDialog open={true} onClose={onClose} onForked={onForked} />);

    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
  });

  it("shows 'No messages to select' when there are no messages", () => {
    render(<ForkDialog open={true} onClose={onClose} onForked={onForked} />);
    expect(screen.getByText("No messages to select as fork point.")).toBeInTheDocument();
  });

  it("limits candidates to last 10 messages", () => {
    setStoreMessages(makeMessages(15));
    render(<ForkDialog open={true} onClose={onClose} onForked={onForked} />);

    // Should show messages #6 through #15 (last 10)
    expect(screen.getByText("#15")).toBeInTheDocument();
    expect(screen.queryByText("#5")).not.toBeInTheDocument();
  });

  // ---- Message selection ---------------------------------------------------

  it("selects last message by default", () => {
    setStoreMessages(makeMessages(3));
    const { container } = render(
      <ForkDialog open={true} onClose={onClose} onForked={onForked} />,
    );

    // The last message (#3) should have the selected styling (border-blue-500)
    const selectedBtns = container.querySelectorAll(".border-blue-500");
    expect(selectedBtns.length).toBeGreaterThanOrEqual(1);
  });

  it("allows selecting a different message", async () => {
    const user = userEvent.setup();
    setStoreMessages(makeMessages(3));
    const { container } = render(
      <ForkDialog open={true} onClose={onClose} onForked={onForked} />,
    );

    // Click on message 0
    await user.click(screen.getByText(/Message 0:/));

    // Message 0 should now be selected (has border-blue-500)
    const buttons = container.querySelectorAll("button");
    const msg0Btn = Array.from(buttons).find((b) =>
      b.textContent?.includes("Message 0:"),
    );
    expect(msg0Btn?.className).toContain("border-blue-500");
  });

  // ---- Fork action ---------------------------------------------------------

  it("calls forkSession and onForked on confirm", async () => {
    const user = userEvent.setup();
    setStoreMessages(makeMessages(3));
    mockForkSession.mockResolvedValue({ id: "forked_456" });

    render(<ForkDialog open={true} onClose={onClose} onForked={onForked} />);

    await user.click(screen.getByText("Fork"));

    expect(mockForkSession).toHaveBeenCalledWith("sess_123", expect.any(Number));
    expect(onForked).toHaveBeenCalledWith("forked_456");
    expect(onClose).toHaveBeenCalled();
  });

  it("shows error message on fork failure", async () => {
    const user = userEvent.setup();
    setStoreMessages(makeMessages(2));
    mockForkSession.mockRejectedValue(new Error("Network failure"));

    render(<ForkDialog open={true} onClose={onClose} onForked={onForked} />);

    await user.click(screen.getByText("Fork"));

    expect(screen.getByText("Network failure")).toBeInTheDocument();
    expect(onForked).not.toHaveBeenCalled();
  });

  it("disables Fork button when there are no messages", () => {
    render(<ForkDialog open={true} onClose={onClose} onForked={onForked} />);

    const forkBtn = screen.getByText("Fork").closest("button");
    expect(forkBtn).toBeDisabled();
  });

  it("disables Fork button when forking is in progress", async () => {
    const user = userEvent.setup();
    setStoreMessages(makeMessages(2));

    // Never resolves — keeps forking state true
    mockForkSession.mockReturnValue(new Promise(() => {}));

    render(<ForkDialog open={true} onClose={onClose} onForked={onForked} />);

    await user.click(screen.getByText("Fork"));

    // Should show "Forking…" text
    expect(screen.getByText(/Forking/)).toBeInTheDocument();
    // Cancel should still be clickable but Fork button should be disabled
    const forkBtn = screen.getByText(/Forking/).closest("button");
    expect(forkBtn).toBeDisabled();
  });

  // ---- Cancel action -------------------------------------------------------

  it("calls onClose when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<ForkDialog open={true} onClose={onClose} onForked={onForked} />);

    await user.click(screen.getByText("Cancel"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onForked).not.toHaveBeenCalled();
  });

  it("calls onClose when X button is clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ForkDialog open={true} onClose={onClose} onForked={onForked} />,
    );

    // The X close button is in the header next to the title
    // Find buttons inside the header (first border-b section)
    const header = container.querySelector(".glass-border-b");
    const closeBtn = header?.querySelector("button");
    expect(closeBtn).toBeTruthy();
    await user.click(closeBtn!);

    expect(onClose).toHaveBeenCalled();
  });

  // ---- Backdrop click ------------------------------------------------------

  it("calls onClose when clicking the backdrop", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ForkDialog open={true} onClose={onClose} onForked={onForked} />,
    );

    // Click the outermost fixed overlay
    const overlay = container.firstElementChild as HTMLElement;
    await user.click(overlay);

    expect(onClose).toHaveBeenCalled();
  });
});
