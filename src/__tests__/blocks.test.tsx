import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BlockView } from "../features/blocks/BlockView";
import { BlockToolbar } from "../features/blocks/BlockToolbar";
import { CodeBlock } from "../features/blocks/CodeBlock";
import { ToolCallBlock } from "../features/blocks/ToolCallBlock";
import { useBookmarkStore } from "../features/blocks/use-bookmarks";
import type { Message } from "../features/chat/use-chat-store";
import type { ToolCall } from "../features/chat/use-chat-store";

// ============================================================================
// Helpers
// ============================================================================

function makeUserMessage(content = "Hello, world!"): Message {
  return {
    id: "user_1",
    role: "user",
    content,
    timestamp: Date.now() / 1000,
  };
}

function makeAssistantMessage(content = "Hello back!"): Message {
  return {
    id: "asst_1",
    role: "assistant",
    content,
    timestamp: Date.now() / 1000,
  };
}

function makeToolCall(overrides: Partial<ToolCall> = {}): ToolCall {
  return {
    tool: "terminal",
    status: "completed",
    args: "$ npm test\n✓ 682 tests passed",
    ...overrides,
  };
}

const mockWriteText = vi.fn().mockResolvedValue(undefined);

// ============================================================================
// BlockView Tests
// ============================================================================

describe("BlockView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockClear();
    useBookmarkStore.setState({ bookmarks: [] });
    // Mock clipboard
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });
  });

  it("renders user message with header and content", () => {
    const msg = makeUserMessage("Test user message");
    render(<BlockView message={msg} index={0} />);

    expect(screen.getByText("👤")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Test user message")).toBeInTheDocument();
  });

  it("renders assistant message with header and content", () => {
    const msg = makeAssistantMessage("Test assistant message");
    render(<BlockView message={msg} index={0} />);

    expect(screen.getByText("🤖")).toBeInTheDocument();
    expect(screen.getByText("Hermes")).toBeInTheDocument();
    expect(screen.getByText("Test assistant message")).toBeInTheDocument();
  });

  it("renders timestamp when provided", () => {
    const ts = new Date(2025, 0, 15, 14, 30).getTime() / 1000;
    const msg = { ...makeUserMessage(), timestamp: ts };
    render(<BlockView message={msg} index={0} />);

    // Should render a time string — jsdom may format differently
    const timeEls = screen.getAllByText((text) => {
      return text.includes("14") || text.includes("2:30") || text.includes("02:30");
    });
    expect(timeEls.length).toBeGreaterThan(0);
  });

  it("collapses and expands on header click", async () => {
    const user = userEvent.setup();
    const msg = makeUserMessage("Collapsible content");
    render(<BlockView message={msg} index={0} />);

    // Content should be visible
    expect(screen.getByText("Collapsible content")).toBeInTheDocument();

    // Click header to collapse
    await user.click(screen.getByTestId("block-header"));

    // Content should be hidden
    expect(
      screen.queryByText("Collapsible content"),
    ).not.toBeInTheDocument();

    // Should show "..." indicator
    expect(screen.getByText("…")).toBeInTheDocument();

    // Click header to expand
    await user.click(screen.getByTestId("block-header"));

    // Content should be visible again
    expect(screen.getByText("Collapsible content")).toBeInTheDocument();
  });

  it("renders markdown in assistant messages", () => {
    const msg = makeAssistantMessage("**Bold text** and `inline code`");
    render(<BlockView message={msg} index={0} />);

    expect(screen.getByText("Bold text")).toBeInTheDocument();
  });

  it("renders tool calls for assistant messages", () => {
    const msg: Message = {
      ...makeAssistantMessage("Done!"),
      toolCalls: [makeToolCall()],
    };
    render(<BlockView message={msg} index={0} />);

    expect(screen.getByText("terminal")).toBeInTheDocument();
    expect(screen.getByText("Done!")).toBeInTheDocument();
  });

  it("calls onRetry when retry is triggered", async () => {
    const onRetry = vi.fn();
    const msg = makeAssistantMessage("Retry this");
    render(<BlockView message={msg} index={0} onRetry={onRetry} />);

    const retryBtn = screen.getByTitle("Regenerate response");
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("calls onBookmark with content", async () => {
    const onBookmark = vi.fn();
    const msg = makeUserMessage("Bookmark this");
    render(<BlockView message={msg} index={0} onBookmark={onBookmark} />);

    const bookmarkBtn = screen.getByTitle("Bookmark message");
    expect(bookmarkBtn).toBeInTheDocument();

    fireEvent.click(bookmarkBtn);
    expect(onBookmark).toHaveBeenCalledWith("Bookmark this");
  });

  it("applies correct alignment for user vs assistant", () => {
    const userMsg = makeUserMessage("User msg");
    const { container: userContainer } = render(
      <BlockView message={userMsg} index={0} />,
    );
    const userBlock = userContainer.querySelector(
      '[data-testid="block-user-0"]',
    );
    expect(userBlock).toHaveClass("justify-end");

    const asstMsg = makeAssistantMessage("Asst msg");
    const { container: asstContainer } = render(
      <BlockView message={asstMsg} index={1} />,
    );
    const asstBlock = asstContainer.querySelector(
      '[data-testid="block-assistant-1"]',
    );
    expect(asstBlock).toHaveClass("justify-start");
  });

  it("does not show retry button for user messages", () => {
    const msg = makeUserMessage("No retry for you");
    render(<BlockView message={msg} index={0} onRetry={vi.fn()} />);

    expect(
      screen.queryByTitle("Regenerate response"),
    ).not.toBeInTheDocument();
  });
});

// ============================================================================
// BlockToolbar Tests
// ============================================================================

describe("BlockToolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockClear();
    useBookmarkStore.setState({ bookmarks: [] });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });
  });

  it("renders all action buttons", () => {
    render(
      <BlockToolbar
        content="test"
        role="assistant"
        onRetry={vi.fn()}
        onBookmark={vi.fn()}
      />,
    );

    expect(screen.getByTitle("Copy message")).toBeInTheDocument();
    expect(
      screen.getByTitle("Regenerate response"),
    ).toBeInTheDocument();
    expect(screen.getByTitle("Bookmark message")).toBeInTheDocument();
    expect(screen.getByTitle("More actions")).toBeInTheDocument();
  });

  it("copies content to clipboard on copy click", async () => {
    render(
      <BlockToolbar
        content="Copy me"
        role="user"
        onBookmark={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByTitle("Copy message"));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith("Copy me");
    });
  });

  it("calls onBookmark with content", async () => {
    const onBookmark = vi.fn();
    render(
      <BlockToolbar
        content="Bookmark me"
        role="user"
        onBookmark={onBookmark}
      />,
    );

    await userEvent.click(screen.getByTitle("Bookmark message"));
    expect(onBookmark).toHaveBeenCalledWith("Bookmark me");
  });

  it("shows retry only for assistant role", () => {
    const { rerender } = render(
      <BlockToolbar content="test" role="user" />,
    );
    expect(
      screen.queryByTitle("Regenerate response"),
    ).not.toBeInTheDocument();

    rerender(
      <BlockToolbar
        content="test"
        role="assistant"
        onRetry={vi.fn()}
      />,
    );
    expect(
      screen.getByTitle("Regenerate response"),
    ).toBeInTheDocument();
  });

  it("calls onAttach when attach is clicked", async () => {
    const onAttach = vi.fn();
    render(
      <BlockToolbar
        content="Attach me"
        role="user"
        onAttach={onAttach}
      />,
    );

    await userEvent.click(
      screen.getByTitle("Attach to next message"),
    );
    expect(onAttach).toHaveBeenCalledWith("Attach me");
  });
});

// ============================================================================
// CodeBlock Tests
// ============================================================================

describe("CodeBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockClear();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });
  });

  it("renders code content with language label", () => {
    render(
      <CodeBlock className="language-typescript">
        {"const x = 1;"}
      </CodeBlock>,
    );

    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("const x = 1;")).toBeInTheDocument();
  });

  it("renders default 'Code' label when no language", () => {
    render(<CodeBlock>{"console.log(\"hi\");"}</CodeBlock>);

    expect(screen.getByText("Code")).toBeInTheDocument();
  });

  it("shows copy button on hover", () => {
    render(
      <CodeBlock className="language-python">
        {"print(\"hello\")"}
      </CodeBlock>,
    );

    const copyBtn = screen.getByTestId("code-copy-btn");
    expect(copyBtn).toBeInTheDocument();
  });

  it("copies code content to clipboard", async () => {
    render(
      <CodeBlock className="language-js">
        {"alert('hi')"}
      </CodeBlock>,
    );

    await userEvent.click(screen.getByTestId("code-copy-btn"));
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith("alert('hi')");
    });
  });

  it("renders line numbers for multi-line code", () => {
    render(
      <CodeBlock className="language-ts">
        {"line 1\nline 2\nline 3"}
      </CodeBlock>,
    );

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

// ============================================================================
// ToolCallBlock Tests
// ============================================================================

describe("ToolCallBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockClear();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });
  });

  it("renders tool name in header", () => {
    render(<ToolCallBlock toolCall={makeToolCall()} />);

    expect(screen.getByText("terminal")).toBeInTheDocument();
    expect(screen.getByText("🔧")).toBeInTheDocument();
  });

  it("expands and shows args when clicked", async () => {
    const user = userEvent.setup();
    const tc = makeToolCall();
    render(<ToolCallBlock toolCall={tc} />);

    // Args should not be visible initially
    expect(screen.queryByText(/npm test/)).not.toBeInTheDocument();

    // Click to expand
    await user.click(screen.getByTestId("tool-call-toggle"));

    // The pre element contains the text
    expect(screen.getByText(/npm test/)).toBeInTheDocument();
  });

  it("shows copy button when expanded", async () => {
    const user = userEvent.setup();
    render(<ToolCallBlock toolCall={makeToolCall()} />);

    await user.click(screen.getByTestId("tool-call-toggle"));

    const copyBtn = screen.getByTestId("tool-copy-btn");
    expect(copyBtn).toBeInTheDocument();
    // Verify button works by checking UI feedback
    await userEvent.click(copyBtn);
    await waitFor(() => {
      expect(screen.getByTitle("Copied!")).toBeInTheDocument();
    });
  });

  it("collapses when clicked again", async () => {
    const user = userEvent.setup();
    render(<ToolCallBlock toolCall={makeToolCall()} />);

    // Expand
    await user.click(screen.getByTestId("tool-call-toggle"));
    expect(screen.getByText(/npm test/)).toBeInTheDocument();

    // Collapse
    await user.click(screen.getByTestId("tool-call-toggle"));
    expect(screen.queryByText(/npm test/)).not.toBeInTheDocument();
  });

  it("shows running status indicator", () => {
    const tc = makeToolCall({ status: "running" });
    render(<ToolCallBlock toolCall={tc} />);

    expect(screen.getByText("running…")).toBeInTheDocument();
  });

  it("shows completed status indicator", () => {
    const tc = makeToolCall({ status: "completed" });
    render(<ToolCallBlock toolCall={tc} />);

    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("shows failed status indicator", () => {
    const tc = makeToolCall({ status: "failed" });
    render(<ToolCallBlock toolCall={tc} />);

    expect(screen.getByText("✗")).toBeInTheDocument();
  });
});

// ============================================================================
// useBookmarkStore Tests
// ============================================================================

describe("useBookmarkStore", () => {
  beforeEach(() => {
    useBookmarkStore.setState({ bookmarks: [] });
  });

  it("adds a bookmark", () => {
    const { addBookmark } = useBookmarkStore.getState();
    addBookmark("Bookmarked content", "session_1");

    const { bookmarks } = useBookmarkStore.getState();
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].content).toBe("Bookmarked content");
    expect(bookmarks[0].sessionId).toBe("session_1");
  });

  it("removes a bookmark by id", () => {
    const { addBookmark } = useBookmarkStore.getState();
    addBookmark("To remove", "session_1");

    const { bookmarks } = useBookmarkStore.getState();
    const id = bookmarks[0].id;

    useBookmarkStore.getState().removeBookmark(id);
    expect(useBookmarkStore.getState().bookmarks).toHaveLength(0);
  });

  it("returns bookmarks sorted by most recent first", () => {
    const { addBookmark } = useBookmarkStore.getState();
    addBookmark("First", "s1");
    // Ensure different timestamps
    useBookmarkStore.setState((s) => ({
      bookmarks: s.bookmarks.map((b, i) => ({
        ...b,
        timestamp: Date.now() - (1 - i) * 1000,
      })),
    }));
    addBookmark("Second", "s1");

    const { bookmarks } = useBookmarkStore.getState();
    expect(bookmarks[0].content).toBe("Second");
    expect(bookmarks[1].content).toBe("First");
  });

  it("filters bookmarks by session", () => {
    const { addBookmark } = useBookmarkStore.getState();
    addBookmark("A", "session_1");
    addBookmark("B", "session_2");
    addBookmark("C", "session_1");

    const filtered = useBookmarkStore
      .getState()
      .getBookmarksBySession("session_1");
    expect(filtered).toHaveLength(2);
    expect(
      filtered.every((b) => b.sessionId === "session_1"),
    ).toBe(true);
  });
});
