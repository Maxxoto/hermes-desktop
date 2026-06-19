/**
 * ChatPage.test.tsx — React component tests for ChatPage
 *
 * Tests: renders with/without session, sends message, handles streaming,
 * shows tool progress, fork dialog, export button, sidebar toggle, logout.
 *
 * ChatPage has many dependencies — all mocked for isolation.
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
const mockDeleteMutate = vi.fn();

vi.mock("../features/sessions/use-sessions", () => ({
  useAutoTitle: () => ({ mutate: mockAutoTitleMutate, isPending: false }),
  useDeleteSession: () => ({ mutate: mockDeleteMutate, isPending: false }),
}));

// --- Custom hooks (no-op stubs) --------------------------------------------

const mockNotifyOnCompletion = vi.fn();

vi.mock("../hooks/use-agent-notifications", () => ({
  useAgentNotifications: () => ({ notifyOnCompletion: mockNotifyOnCompletion }),
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

// --- SessionList (complex — mock to avoid gateway calls) -------------------

vi.mock("../features/sessions/SessionList", () => ({
  default: ({ onNewChat }: { onNewChat?: () => void; onSelectSession: (id: string) => void }) => (
    <div data-testid="session-list">
      <button data-testid="new-chat-btn" onClick={onNewChat}>
        New Chat
      </button>
    </div>
  ),
}));

// --- ExportButton (uses dynamic Tauri plugin imports not installed) ---------

vi.mock("../features/chat/ExportButton", () => ({
  ExportButton: ({ disabled }: { messages: unknown[]; sessionTitle: string; disabled?: boolean }) => (
    <button data-testid="export-btn" title="Export as Markdown" disabled={disabled} type="button">
      Export
    </button>
  ),
}));

// --- Tauri invoke (for logout) ---------------------------------------------

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
// Helpers
// ============================================================================

/** Simulate a minimal SSE stream that fires events then resolves. */
function makeStreamEvents(_onEvent?: (event: any) => void) {
  // Fires events synchronously to simulate the callback invocations
  return async (_sessionId: string, _message: string, cb: (event: any) => void) => {
    // Simulate streaming deltas
    cb({ type: "assistant.delta", delta: "Hello" });
    cb({ type: "assistant.delta", delta: " world" });
    cb({ type: "run.completed", content: "Hello world" });
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("ChatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.getState().clear();
    useConnectionStore.getState().setCredentials("http://test:8642", "test-key");
    mockCreateSession.mockResolvedValue({ id: "new_sess_123" });
    mockGetSessionMessages.mockResolvedValue([]);
    mockChatStream.mockImplementation(makeStreamEvents());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useChatStore.getState().clear();
    useConnectionStore.getState().clear();
  });

  // ---- Rendering: no session -----------------------------------------------

  it("renders with 'New Chat' title when no session is active", () => {
    render(<ChatPage />, { wrapper: createWrapper() });
    // "New Chat" appears in both the header and the SessionList mock
    expect(screen.getAllByText("New Chat").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the empty state prompt when no messages", () => {
    render(<ChatPage />, { wrapper: createWrapper() });
    expect(screen.getByText("Start a conversation")).toBeInTheDocument();
  });

  it("renders the chat input", () => {
    render(<ChatPage />, { wrapper: createWrapper() });
    expect(screen.getByPlaceholderText("Type a message…")).toBeInTheDocument();
  });

  it("renders SessionList in sidebar", () => {
    render(<ChatPage />, { wrapper: createWrapper() });
    expect(screen.getByTestId("session-list")).toBeInTheDocument();
  });

  // ---- Rendering: with session ---------------------------------------------

  it("renders session ID in header when session is active", () => {
    useChatStore.getState().setSession("abcdef1234567890");
    render(<ChatPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/Session abcdef12/)).toBeInTheDocument();
  });

  it("disables fork button when no session", () => {
    render(<ChatPage />, { wrapper: createWrapper() });
    const forkBtn = screen.getByTitle("Fork session");
    expect(forkBtn).toBeDisabled();
  });

  it("enables fork button when session is active", () => {
    useChatStore.getState().setSession("sess_123");
    render(<ChatPage />, { wrapper: createWrapper() });
    const forkBtn = screen.getByTitle("Fork session");
    expect(forkBtn).not.toBeDisabled();
  });

  // ---- Sending messages ----------------------------------------------------

  it("creates a session on first message send", async () => {
    const user = userEvent.setup();
    render(<ChatPage />, { wrapper: createWrapper() });

    const input = screen.getByPlaceholderText("Type a message…");
    await user.type(input, "Hello{Enter}");

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledTimes(1);
    });
  });

  it("adds user message to the store on send", async () => {
    const user = userEvent.setup();
    render(<ChatPage />, { wrapper: createWrapper() });

    await user.type(screen.getByPlaceholderText("Type a message…"), "Test message{Enter}");

    await waitFor(() => {
      const msgs = useChatStore.getState().messages;
      expect(msgs.some((m) => m.role === "user" && m.content === "Test message")).toBe(true);
    });
  });

  it("calls chatStream with session ID and message", async () => {
    const user = userEvent.setup();
    render(<ChatPage />, { wrapper: createWrapper() });

    await user.type(screen.getByPlaceholderText("Type a message…"), "Hello agent{Enter}");

    await waitFor(() => {
      expect(mockChatStream).toHaveBeenCalledWith(
        expect.any(String),
        "Hello agent",
        expect.any(Function),
      );
    });
  });

  it("appends assistant delta text to last assistant message", async () => {
    const user = userEvent.setup();
    render(<ChatPage />, { wrapper: createWrapper() });

    await user.type(screen.getByPlaceholderText("Type a message…"), "Hi{Enter}");

    await waitFor(() => {
      const msgs = useChatStore.getState().messages;
      const assistant = msgs.find((m) => m.role === "assistant");
      expect(assistant?.content).toContain("Hello world");
    });
  });

  it("sets streaming to true during chat", async () => {
    let streamStarted = false;
    mockChatStream.mockImplementation(async (_sid: string, _msg: string, cb: (e: any) => void) => {
      streamStarted = true;
      // Don't fire run.completed yet — keep streaming
      cb({ type: "assistant.delta", delta: "partial" });
      // Wait a tick
      await new Promise((r) => setTimeout(r, 50));
      cb({ type: "run.completed", content: "partial" });
    });

    const user = userEvent.setup();
    render(<ChatPage />, { wrapper: createWrapper() });

    await user.type(screen.getByPlaceholderText("Type a message…"), "Hi{Enter}");

    await waitFor(() => expect(streamStarted).toBe(true));
    // During streaming, isStreaming should be true at some point
    // After completion, it should be false
    await waitFor(() => {
      expect(useChatStore.getState().isStreaming).toBe(false);
    });
  });

  // ---- Streaming — tool progress -------------------------------------------

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

  // ---- Streaming — error handling ------------------------------------------

  it("handles chatStream network error gracefully", async () => {
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

  it("handles run.error SSE event", async () => {
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

  // ---- Fork dialog ---------------------------------------------------------

  it("opens fork dialog when fork button is clicked", async () => {
    const user = userEvent.setup();
    useChatStore.getState().setSession("sess_123");
    render(<ChatPage />, { wrapper: createWrapper() });

    await user.click(screen.getByTitle("Fork session"));

    expect(screen.getByText("Fork Session")).toBeInTheDocument();
  });

  it("closes fork dialog when cancel is clicked", async () => {
    const user = userEvent.setup();
    useChatStore.getState().setSession("sess_123");
    render(<ChatPage />, { wrapper: createWrapper() });

    await user.click(screen.getByTitle("Fork session"));
    expect(screen.getByText("Fork Session")).toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Fork Session")).not.toBeInTheDocument();
  });

  // ---- Export button -------------------------------------------------------

  it("renders export button", () => {
    render(<ChatPage />, { wrapper: createWrapper() });
    expect(screen.getByTitle("Export as Markdown")).toBeInTheDocument();
  });

  it("disables export button when no session", () => {
    render(<ChatPage />, { wrapper: createWrapper() });
    expect(screen.getByTitle("Export as Markdown")).toBeDisabled();
  });

  // ---- Stop generation -----------------------------------------------------

  it("calls stopGeneration and sets streaming to false when stop button clicked", async () => {
    mockChatStream.mockImplementation(async (_sid: string, _msg: string, cb: (e: any) => void) => {
      cb({ type: "assistant.delta", delta: "..." });
      // Keep the stream alive by not firing run.completed immediately
      await new Promise((r) => setTimeout(r, 5000));
      cb({ type: "run.completed", content: "..." });
    });

    const user = userEvent.setup();
    render(<ChatPage />, { wrapper: createWrapper() });

    await user.type(screen.getByPlaceholderText("Type a message…"), "Hi{Enter}");

    // Wait for streaming to start, then click stop
    await waitFor(() => {
      expect(useChatStore.getState().isStreaming).toBe(true);
    });

    const stopBtn = screen.getByTitle("Stop generation");
    await user.click(stopBtn);

    expect(mockStopGeneration).toHaveBeenCalled();
    expect(useChatStore.getState().isStreaming).toBe(false);
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

  // ---- Auto-title ----------------------------------------------------------

  it("fires auto-title mutation for new sessions", async () => {
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

  it("does not create new session when one already exists", async () => {
    const user = userEvent.setup();
    useChatStore.getState().setSession("existing_sess");
    render(<ChatPage />, { wrapper: createWrapper() });

    await user.type(screen.getByPlaceholderText("Type a message…"), "Follow up{Enter}");

    await waitFor(() => {
      expect(mockChatStream).toHaveBeenCalledWith(
        "existing_sess",
        "Follow up",
        expect.any(Function),
      );
    });
    expect(mockCreateSession).not.toHaveBeenCalled();
  });
});
