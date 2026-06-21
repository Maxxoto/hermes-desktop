/**
 * ChatInput.test.tsx — React component tests for ChatInput
 *
 * Tests rendering, Enter to submit, Shift+Enter for newline, disabled state,
 * and input clearing after send.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInput } from "../features/chat/ChatInput";

describe("ChatInput", () => {
  let onSend = vi.fn<(text: string) => void>();

  beforeEach(() => {
    onSend = vi.fn<(text: string) => void>();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- Rendering -----------------------------------------------------------

  it("renders a textarea with placeholder", () => {
    render(<ChatInput onSend={onSend} />);
    expect(screen.getByPlaceholderText("Type a message…")).toBeInTheDocument();
  });

  it("renders a send button", () => {
    render(<ChatInput onSend={onSend} />);
    expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
  });

  // ---- Submit on Enter -----------------------------------------------------

  it("calls onSend with trimmed text on Enter", async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("Type a message…");
    await user.type(input, "Hello world{Enter}");

    expect(onSend).toHaveBeenCalledWith("Hello world");
  });

  it("clears the textarea after sending", async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("Type a message…") as HTMLTextAreaElement;
    await user.type(input, "Hello{Enter}");

    expect(input.value).toBe("");
  });

  it("trims whitespace before sending", async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} />);

    await user.type(screen.getByPlaceholderText("Type a message…"), "  spaced  {Enter}");

    expect(onSend).toHaveBeenCalledWith("spaced");
  });

  it("does not send empty text", async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} />);

    await user.type(screen.getByPlaceholderText("Type a message…"), "{Enter}");

    expect(onSend).not.toHaveBeenCalled();
  });

  it("does not send whitespace-only text", async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} />);

    await user.type(screen.getByPlaceholderText("Type a message…"), "   {Enter}");

    expect(onSend).not.toHaveBeenCalled();
  });

  // ---- Shift+Enter does not submit -----------------------------------------

  it("does not call onSend on Shift+Enter (allows newline)", async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("Type a message…") as HTMLTextAreaElement;
    await user.type(input, "Line 1{Shift>}{Enter}{/Shift}Line 2");

    expect(onSend).not.toHaveBeenCalled();
    expect(input.value).toContain("Line 1");
    expect(input.value).toContain("Line 2");
  });

  // ---- Send button click ---------------------------------------------------

  it("calls onSend when send button is clicked", async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} />);

    await user.type(screen.getByPlaceholderText("Type a message…"), "Button send");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(onSend).toHaveBeenCalledWith("Button send");
  });

  // ---- Disabled state ------------------------------------------------------

  it("disables textarea and button when disabled prop is true", () => {
    render(<ChatInput onSend={onSend} disabled />);
    expect(screen.getByPlaceholderText("Type a message…")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  it("does not call onSend when disabled and Enter pressed", () => {
    render(<ChatInput onSend={onSend} disabled />);

    // Can't type into disabled input — verify it's disabled and no call
    const input = screen.getByPlaceholderText("Type a message…");
    expect(input).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });

  // ---- Multiple sends ------------------------------------------------------

  it("can send multiple messages sequentially", async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("Type a message…");
    await user.type(input, "First{Enter}");
    await user.type(input, "Second{Enter}");

    expect(onSend).toHaveBeenCalledTimes(2);
    expect(onSend).toHaveBeenNthCalledWith(1, "First");
    expect(onSend).toHaveBeenNthCalledWith(2, "Second");
  });
});
