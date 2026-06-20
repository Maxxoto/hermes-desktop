/**
 * MessageBubble.test.tsx — Tests for copy button and retry/regenerate button
 *
 * Verifies: retry button renders for assistant messages when onRetry provided,
 * does NOT render for user messages, does NOT render when onRetry is undefined,
 * clicking retry calls the callback.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageBubble } from "../features/chat/MessageBubble";
import type { Message } from "../features/chat/use-chat-store";

function assistantMessage(overrides?: Partial<Message>): Message {
  return {
    id: "assistant_1",
    role: "assistant",
    content: "Hello from assistant",
    timestamp: Date.now() / 1000,
    ...overrides,
  };
}

function userMessage(overrides?: Partial<Message>): Message {
  return {
    id: "user_1",
    role: "user",
    content: "Hello from user",
    timestamp: Date.now() / 1000,
    ...overrides,
  };
}

describe("MessageBubble", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- Copy button --------------------------------------------------------

  it("renders copy button for assistant messages", () => {
    render(<MessageBubble message={assistantMessage()} />);
    expect(screen.getByTitle("Copy message")).toBeInTheDocument();
  });

  it("renders copy button for user messages", () => {
    render(<MessageBubble message={userMessage()} />);
    expect(screen.getByTitle("Copy message")).toBeInTheDocument();
  });

  // ---- Retry button: assistant messages ------------------------------------

  it("renders retry button for assistant messages when onRetry is provided", () => {
    render(<MessageBubble message={assistantMessage()} onRetry={vi.fn()} />);
    expect(screen.getByTitle("Regenerate response")).toBeInTheDocument();
  });

  it("does NOT render retry button for assistant messages when onRetry is undefined", () => {
    render(<MessageBubble message={assistantMessage()} />);
    expect(screen.queryByTitle("Regenerate response")).not.toBeInTheDocument();
  });

  it("does NOT render retry button for user messages even when onRetry is provided", () => {
    render(<MessageBubble message={userMessage()} onRetry={vi.fn()} />);
    expect(screen.queryByTitle("Regenerate response")).not.toBeInTheDocument();
  });

  it("clicking retry calls the onRetry callback", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<MessageBubble message={assistantMessage()} onRetry={onRetry} />);

    await user.click(screen.getByTitle("Regenerate response"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  // ---- Copy functionality -------------------------------------------------

  it("copies message content to clipboard on copy click", async () => {
    const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<MessageBubble message={assistantMessage({ content: "Copy me" })} />);

    await user.click(screen.getByTitle("Copy message"));
    expect(writeTextSpy).toHaveBeenCalledWith("Copy me");
  });
});
