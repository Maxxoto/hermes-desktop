/**
 * flow-agent-model-selection.test.tsx — End-to-end flow test
 *
 * Full flow: select agent → select model → send message → verify agent/model in request
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ChatPage from "../features/chat/ChatPage";
import { useChatStore } from "../features/chat/use-chat-store";

// jsdom doesn't implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreateSession = vi.fn();
const mockChatStream = vi.fn();
const mockGetSessionMessages = vi.fn();
const mockStopGeneration = vi.fn();
const mockListAgents = vi.fn();
const mockListModels = vi.fn();

vi.mock("../features/connection/gateway-api", () => ({
  getGatewayClient: () => ({
    createSession: (...a: unknown[]) => mockCreateSession(...a),
    chatStream: (...a: unknown[]) => mockChatStream(...a),
    getSessionMessages: (...a: unknown[]) => mockGetSessionMessages(...a),
    stopGeneration: () => mockStopGeneration(),
    listAgents: (...a: unknown[]) => mockListAgents(...a),
    listModels: (...a: unknown[]) => mockListModels(...a),
  }),
}));

vi.mock("../features/sessions/use-sessions", () => ({
  useSessions: () => ({ data: [] }),
  useAutoTitle: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteSession: () => ({ mutate: vi.fn(), isPending: false }),
}));

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

vi.mock("../features/sessions/SessionList", () => ({
  default: ({ onNewChat }: { onNewChat?: () => void; onSelectSession: (id: string) => void }) => (
    <div data-testid="session-list">
      <button data-testid="new-chat-btn" onClick={onNewChat}>New Chat</button>
    </div>
  ),
}));

vi.mock("../features/chat/ExportButton", () => ({
  ExportButton: ({ disabled }: { messages: unknown[]; sessionTitle: string; disabled?: boolean }) => (
    <button data-testid="export-btn" title="Export as Markdown" disabled={disabled} type="button">Export</button>
  ),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("flow: agent & model selection → send message", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.getState().clear();
    mockCreateSession.mockResolvedValue({ id: "flow_sess_123" });
    mockGetSessionMessages.mockResolvedValue([]);

    // Return multiple agents and models
    mockListAgents.mockResolvedValue([
      { id: "agent-a", name: "Agent A", description: "First agent" },
      { id: "agent-b", name: "Agent B", description: "Second agent" },
    ]);

    mockListModels.mockResolvedValue([
      { id: "model-x", name: "hermes-3", provider: "openai" },
      { id: "model-y", name: "claude-3", provider: "anthropic" },
    ]);

    mockChatStream.mockImplementation(async (_sid: string, _msg: string, cb: (e: any) => void, _opts?: any) => {
      cb({ type: "assistant.delta", delta: "Hi!" });
      cb({ type: "run.completed", content: "Hi!" });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useChatStore.getState().clear();
  });

  it("full flow: select agent → select model → send → verify in request", async () => {
    const user = userEvent.setup();

    render(<ChatPage />, { wrapper: createWrapper() });

    // Wait for agents to load
    await waitFor(() => {
      expect(screen.getByLabelText("Select agent")).toBeInTheDocument();
    });

    // Select Agent B
    await user.click(screen.getByLabelText("Select agent"));
    const agentBItems = screen.getAllByText("Agent B");
    await user.click(agentBItems[agentBItems.length - 1]);

    // Select claude-3 model
    await user.click(screen.getByLabelText("Select model"));
    const claudeItems = screen.getAllByText("claude-3");
    await user.click(claudeItems[claudeItems.length - 1]);

    // Send a message
    await user.type(screen.getByPlaceholderText("Type a message…"), "Hello flow test{Enter}");

    // Verify chatStream was called with agent/model options
    await waitFor(() => {
      expect(mockChatStream).toHaveBeenCalledWith(
        expect.any(String),
        "Hello flow test",
        expect.any(Function),
        { agent: "agent-b", model: "model-y" },
      );
    });
  });

  it("sends undefined agent/model when none selected", async () => {
    const user = userEvent.setup();

    render(<ChatPage />, { wrapper: createWrapper() });

    // Wait for agents to load (compact label since 1 default would be shown, but we have 2)
    await waitFor(() => {
      expect(screen.getByLabelText("Select agent")).toBeInTheDocument();
    });

    // Send without selecting agent/model
    await user.type(screen.getByPlaceholderText("Type a message…"), "No selection{Enter}");

    await waitFor(() => {
      expect(mockChatStream).toHaveBeenCalledWith(
        expect.any(String),
        "No selection",
        expect.any(Function),
        { agent: undefined, model: undefined },
      );
    });
  });
});
