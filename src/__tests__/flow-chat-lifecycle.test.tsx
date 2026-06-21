/**
 * flow-chat-lifecycle.test.tsx — Complete Chat Lifecycle
 *
 * Integration-level tests that simulate the full user journey from empty
 * state to sending messages, streaming responses, handling errors, and
 * managing the chat session lifecycle.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ChatPage from "../features/chat/ChatPage";
import { useChatStore } from "../features/chat/use-chat-store";
import { useConnectionStore } from "../features/connection/connection-store";

// jsdom doesn't implement scrollIntoView — stub it
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// ============================================================================
// Mocks
// ============================================================================

// --- Gateway Client ---------------------------------------------------------

const mockCreateSession = vi.fn();
const mockChatStream = vi.fn();
const mockGetSessionMessages = vi.fn();
const mockStopGeneration = vi.fn();

vi.mock("../features/connection/gateway-api", () => ({
  getGatewayClient: () => ({
    createSession: (...a: unknown[]) => mockCreateSession(...a),
    chatStream: (...a: unknown[]) => mockChatStream(...a),
    getSessionMessages: (...a: unknown[]) => mockGetSessionMessages(...a),
    stopGeneration: () => mockStopGeneration(),
  }),
}));

// --- Hooks (session mutations) ---------------------------------------------

const mockAutoTitleMutate = vi.fn();

vi.mock("../features/sessions/use-sessions", () => ({
  useSessions: () => ({ data: [] }),
  useAutoTitle: () => ({ mutate: mockAutoTitleMutate, isPending: false }),
  useDeleteSession: () => ({ mutate: vi.fn(), isPending: false }),
}));

// --- Custom hooks (no-op stubs) --------------------------------------------

vi.mock("../hooks/use-agent-notifications", () => ({
  useAgentNotifications: () => ({ notifyOnCompletion: vi.fn() }),
}));

vi.mock("../hooks/use-window-title", () => ({
  useWindowTitle: vi.fn(),
}));

vi.mock("../hooks/use-keyboard-shortcuts", () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock("../hooks/use-theme", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn(), setTheme: vi.fn() }),
}));

// --- SessionList (simplified) -----------------------------------------------

vi.mock("../features/sessions/SessionList", () => ({
  default: ({ onNewChat }: { onNewChat?: () => void; onSelectSession: (id: string) => void }) => (
    <div data-testid="session-list">
      <button data-testid="new-chat-btn" onClick={onNewChat}>
        New Chat
      </button>
    </div>
  ),
}));

// --- ExportButton (simplified) -----------------------------------------------

vi.mock("../features/chat/ExportButton", () => ({
  ExportButton: ({ disabled }: { messages: unknown[]; sessionTitle: string; disabled?: boolean }) => (
    <button data-testid="export-btn" title="Export as Markdown" disabled={disabled} type="button">
      Export
    </button>
  ),
}));

// --- Tauri invoke -----------------------------------------------------------

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

// ============================================================================
// Wrapper
// ============================================================================

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("Flow: Chat Lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.getState().clear();
    useConnectionStore.getState().setCredentials("http://test:8642", "test-key");
    mockCreateSession.mockResolvedValue({ id: "new_sess_123" });
    mockGetSessionMessages.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useChatStore.getState().clear();
    useConnectionStore.getState().clear();
  });

  // ---- Empty state ---------------------------------------------------------

  it("shows empty state with guidance text on first visit", () => {
    render(<ChatPage />, { wrapper: createWrapper() });
    expect(screen.getByText("Start a conversation")).toBeInTheDocument();
  });

  it("shows 'Start a conversation' and keyboard shortcut hint", () => {
    render(<ChatPage />, { wrapper: createWrapper() });
    expect(screen.getByText("Start a conversation")).toBeInTheDocument();
    expect(screen.getByText(/⌘K/)).toBeInTheDocument();
  });

  it("send button is visible and clickable", () => {
    render(<ChatPage />, { wrapper: createWrapper() });
    const sendBtn = screen.getByTitle("Send");
    expect(sendBtn).toBeInTheDocument();
    // Send button is not disabled — it handles empty input internally
    expect(sendBtn).not.toBeDisabled();
  });

  // ---- Sending messages ----------------------------------------------------

  it("typing a message enables the send button", async () => {
    const user = userEvent.setup();
    render(<ChatPage />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText("Type a message…");
    await user.type(textarea, "Hello");

    const sendBtn = screen.getByTitle("Send");
    expect(sendBtn).not.toBeDisabled();
  });

  it("pressing Enter sends the message", async () => {
    const user = userEvent.setup();
    mockChatStream.mockImplementation(async (_sid: string, _msg: string, cb: (e: any) => void) => {
      cb({ type: "assistant.delta", delta: "Hi!" });
      cb({ type: "run.completed", content: "Hi!" });
    });
    render(<ChatPage />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText("Type a message…");
    await user.type(textarea, "Hello{Enter}");

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalled();
    });
  });

  it("clicking the send button sends the message", async () => {
    const user = userEvent.setup();
    mockChatStream.mockImplementation(async (_sid: string, _msg: string, cb: (e: any) => void) => {
      cb({ type: "assistant.delta", delta: "Reply" });
      cb({ type: "run.completed", content: "Reply" });
    });
    render(<ChatPage />, { wrapper: createWrapper() });

    await user.type(screen.getByPlaceholderText("Type a message…"), "Hello");
    await user.click(screen.getByTitle("Send"));

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalled();
    });
  });

  it("creates a new session on first message send", async () => {
    const user = userEvent.setup();
    render(<ChatPage />, { wrapper: createWrapper() });

    await user.type(screen.getByPlaceholderText("Type a message…"), "Hello{Enter}");

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledTimes(1);
    });
  });

  it("adds user message to the chat immediately", async () => {
    const user = userEvent.setup();
    render(<ChatPage />, { wrapper: createWrapper() });

    await user.type(screen.getByPlaceholderText("Type a message…"), "Test message{Enter}");

    await waitFor(() => {
      const msgs = useChatStore.getState().messages;
      expect(msgs.some((m) => m.role === "user" && m.content === "Test message")).toBe(true);
    });
  });

  it("adds empty assistant placeholder while streaming", async () => {
    const user = userEvent.setup();
    let streamStarted = false;

    mockChatStream.mockImplementation(async (_sid: string, _msg: string, cb: (e: any) => void) => {
      streamStarted = true;
      cb({ type: "assistant.delta", delta: "partial" });
      await new Promise((r) => setTimeout(r, 50));
      cb({ type: "run.completed", content: "partial" });
    });

    render(<ChatPage />, { wrapper: createWrapper() });
    await user.type(screen.getByPlaceholderText("Type a message…"), "Hi{Enter}");

    await waitFor(() => {
      expect(streamStarted).toBe(true);
      const msgs = useChatStore.getState().messages;
      const assistant = msgs.find((m) => m.role === "assistant");
      expect(assistant).toBeDefined();
    });
  });

  it("shows typing indicator dots while streaming", async () => {
    const user = userEvent.setup();
    mockChatStream.mockImplementation(async (_sid: string, _msg: string, cb: (e: any) => void) => {
      // Don't fire any events — keep streaming
      cb({ type: "assistant.delta", delta: "" });
      await new Promise((r) => setTimeout(r, 5000));
      cb({ type: "run.completed", content: "" });
    });

    render(<ChatPage />, { wrapper: createWrapper() });
    await user.type(screen.getByPlaceholderText("Type a message…"), "Hi{Enter}");

    await waitFor(() => {
      const dots = document.querySelectorAll(".typing-dot");
      expect(dots.length).toBe(3);
    });
  });

  it("appends assistant deltas to the placeholder message", async () => {
    const user = userEvent.setup();
    mockChatStream.mockImplementation(makeStreamEvents());

    render(<ChatPage />, { wrapper: createWrapper() });
    await user.type(screen.getByPlaceholderText("Type a message…"), "Hi{Enter}");

    await waitFor(() => {
      const msgs = useChatStore.getState().messages;
      const assistant = msgs.find((m) => m.role === "assistant");
      expect(assistant?.content).toContain("Hello world");
    });
  });

  it("hides typing indicator when streaming completes", async () => {
    const user = userEvent.setup();
    mockChatStream.mockImplementation(async (_sid: string, _msg: string, cb: (e: any) => void) => {
      cb({ type: "assistant.delta", delta: "Hello" });
      await new Promise((r) => setTimeout(r, 50));
      cb({ type: "run.completed", content: "Hello" });
    });

    render(<ChatPage />, { wrapper: createWrapper() });
    await user.type(screen.getByPlaceholderText("Type a message…"), "Hi{Enter}");

    await waitFor(() => {
      expect(useChatStore.getState().isStreaming).toBe(false);
      const dots = document.querySelectorAll(".typing-dot");
      expect(dots.length).toBe(0);
    });
  });

  it("displays final assistant message after run.completed", async () => {
    const user = userEvent.setup();
    mockChatStream.mockImplementation(async (_sid: string, _msg: string, cb: (e: any) => void) => {
      cb({ type: "assistant.delta", delta: "Hello" });
      cb({ type: "assistant.delta", delta: " world" });
      cb({ type: "run.completed", content: "Hello world" });
    });

    render(<ChatPage />, { wrapper: createWrapper() });
    await user.type(screen.getByPlaceholderText("Type a message…"), "Hi{Enter}");

    await waitFor(() => {
      const msgs = useChatStore.getState().messages;
      const assistant = msgs.find((m) => m.role === "assistant");
      expect(assistant?.content).toBe("Hello world");
    });
  });

  it("updates toolbar title to show session ID", async () => {
    const user = userEvent.setup();
    useChatStore.getState().setSession("abcdef1234567890");
    render(<ChatPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Session abcdef12/)).toBeInTheDocument();
  });

  it("calls autoTitle after first exchange in new session", async () => {
    const user = userEvent.setup();
    render(<ChatPage />, { wrapper: createWrapper() });

    await user.type(screen.getByPlaceholderText("Type a message…"), "My first message{Enter}");

    await waitFor(() => {
      expect(mockAutoTitleMutate).toHaveBeenCalledWith({
        id: "new_sess_123",
        message: "My first message",
      });
    });
  });

  it("does NOT create a new session for subsequent messages", async () => {
    const user = userEvent.setup();
    useChatStore.getState().setSession("existing_sess");
    render(<ChatPage />, { wrapper: createWrapper() });

    await user.type(screen.getByPlaceholderText("Type a message…"), "Follow up{Enter}");

    await waitFor(() => {
      expect(mockChatStream).toHaveBeenCalledWith(
        "existing_sess",
        "Follow up",
        expect.any(Function),
        expect.objectContaining({}),
      );
    });
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  // ---- Error handling ------------------------------------------------------

  it("handles connection error gracefully — shows error in chat", async () => {
    mockChatStream.mockRejectedValue(new Error("Network failure"));
    const user = userEvent.setup();
    render(<ChatPage />, { wrapper: createWrapper() });

    await user.type(screen.getByPlaceholderText("Type a message…"), "Hello{Enter}");

    await waitFor(() => {
      const msgs = useChatStore.getState().messages;
      const assistant = msgs.find((m) => m.role === "assistant");
      expect(assistant?.content).toContain("Connection error");
    });
  });

  it("handles run.error event — shows error in assistant message", async () => {
    mockChatStream.mockImplementation(async (_sid: string, _msg: string, cb: (e: any) => void) => {
      cb({ type: "run.error", error: "Something went wrong" });
    });

    const user = userEvent.setup();
    render(<ChatPage />, { wrapper: createWrapper() });

    await user.type(screen.getByPlaceholderText("Type a message…"), "Hello{Enter}");

    await waitFor(() => {
      const msgs = useChatStore.getState().messages;
      const assistant = msgs.find((m) => m.role === "assistant");
      expect(assistant?.content).toContain("[Error: Something went wrong]");
    });
  });

  // ---- Stop generation -----------------------------------------------------

  it("stop button appears during streaming", async () => {
    mockChatStream.mockImplementation(async (_sid: string, _msg: string, cb: (e: any) => void) => {
      cb({ type: "assistant.delta", delta: "..." });
      await new Promise((r) => setTimeout(r, 5000));
      cb({ type: "run.completed", content: "..." });
    });

    const user = userEvent.setup();
    render(<ChatPage />, { wrapper: createWrapper() });

    await user.type(screen.getByPlaceholderText("Type a message…"), "Hi{Enter}");

    await waitFor(() => {
      expect(screen.getByTitle("Stop generation")).toBeInTheDocument();
    });
  });

  it("clicking stop button calls stopGeneration and ends streaming", async () => {
    mockChatStream.mockImplementation(async (_sid: string, _msg: string, cb: (e: any) => void) => {
      cb({ type: "assistant.delta", delta: "..." });
      await new Promise((r) => setTimeout(r, 5000));
      cb({ type: "run.completed", content: "..." });
    });

    const user = userEvent.setup();
    render(<ChatPage />, { wrapper: createWrapper() });

    await user.type(screen.getByPlaceholderText("Type a message…"), "Hi{Enter}");

    await waitFor(() => {
      expect(useChatStore.getState().isStreaming).toBe(true);
    });

    const stopBtn = screen.getByTitle("Stop generation");
    await user.click(stopBtn);

    expect(mockStopGeneration).toHaveBeenCalled();
    expect(useChatStore.getState().isStreaming).toBe(false);
  });

  // ---- Input behavior ------------------------------------------------------

  it("Shift+Enter creates a new line without sending", async () => {
    const user = userEvent.setup();
    render(<ChatPage />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText("Type a message…");
    await user.type(textarea, "Line 1{Shift>}{Enter}{/Shift}Line 2");

    // Should not have sent the message
    expect(mockCreateSession).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("Line 1\nLine 2");
  });

  it("empty message cannot be sent", async () => {
    const user = userEvent.setup();
    render(<ChatPage />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText("Type a message…");
    await user.type(textarea, "{Enter}");

    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("textarea resets after sending", async () => {
    const user = userEvent.setup();
    render(<ChatPage />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText("Type a message…");
    await user.type(textarea, "Hello{Enter}");

    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });
  });

  // ---- Session creation failure --------------------------------------------

  it("shows error message when session creation fails", async () => {
    mockCreateSession.mockRejectedValue(new Error("Forbidden"));
    const user = userEvent.setup();
    render(<ChatPage />, { wrapper: createWrapper() });

    await user.type(screen.getByPlaceholderText("Type a message…"), "Hello{Enter}");

    await waitFor(() => {
      const msgs = useChatStore.getState().messages;
      expect(msgs.some((m) => m.content.includes("Failed to create session"))).toBe(true);
    });
  });

  // ---- Tool progress -------------------------------------------------------

  it("shows tool calls when tool.started fires", async () => {
    mockChatStream.mockImplementation(async (_sid: string, _msg: string, cb: (e: any) => void) => {
      cb({ type: "tool.started", tool: "bash", args: '{"command":"ls"}' });
      cb({ type: "tool.completed", tool: "bash" });
      cb({ type: "assistant.delta", delta: "Done" });
      cb({ type: "run.completed", content: "Done" });
    });

    const user = userEvent.setup();
    render(<ChatPage />, { wrapper: createWrapper() });

    await user.type(screen.getByPlaceholderText("Type a message…"), "Run ls{Enter}");

    await waitFor(() => {
      const msgs = useChatStore.getState().messages;
      const assistant = msgs.find((m) => m.role === "assistant");
      expect(assistant?.toolCalls).toBeDefined();
      expect(assistant?.toolCalls?.length).toBeGreaterThan(0);
      expect(assistant?.toolCalls?.[0].tool).toBe("bash");
    });
  });

  // ---- Full lifecycle journey ----------------------------------------------

  it("full lifecycle: empty → send → stream → complete → follow-up", async () => {
    const user = userEvent.setup();
    let streamCallCount = 0;

    mockChatStream.mockImplementation(async (sid: string, msg: string, cb: (e: any) => void) => {
      streamCallCount++;
      if (streamCallCount === 1) {
        // First message: streaming response
        cb({ type: "assistant.delta", delta: "Hello" });
        cb({ type: "assistant.delta", delta: "!" });
        cb({ type: "run.completed", content: "Hello!" });
      } else {
        // Second message: another response
        cb({ type: "assistant.delta", delta: "Follow-up" });
        cb({ type: "run.completed", content: "Follow-up" });
      }
    });

    render(<ChatPage />, { wrapper: createWrapper() });

    // Step 1: Empty state visible
    expect(screen.getByText("Start a conversation")).toBeInTheDocument();

    // Step 2: Send first message
    await user.type(screen.getByPlaceholderText("Type a message…"), "Hello{Enter}");

    // Step 3: Session created, response received
    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledTimes(1);
      const msgs = useChatStore.getState().messages;
      expect(msgs.some((m) => m.role === "user" && m.content === "Hello")).toBe(true);
      expect(msgs.some((m) => m.role === "assistant" && m.content === "Hello!")).toBe(true);
    });

    // Step 4: Auto-title fired
    expect(mockAutoTitleMutate).toHaveBeenCalled();

    // Step 5: Send follow-up (no new session)
    await user.type(screen.getByPlaceholderText("Type a message…"), "Follow-up{Enter}");

    await waitFor(() => {
      expect(mockChatStream).toHaveBeenCalledTimes(2);
      expect(mockCreateSession).toHaveBeenCalledTimes(1); // Only once
    });
  });
});

// ============================================================================
// Stream events helper
// ============================================================================

function makeStreamEvents() {
  return async (_sessionId: string, _message: string, cb: (event: any) => void) => {
    cb({ type: "assistant.delta", delta: "Hello" });
    cb({ type: "assistant.delta", delta: " world" });
    cb({ type: "run.completed", content: "Hello world" });
  };
}
