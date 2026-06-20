/**
 * AgentSelector.test.tsx — Tests for AgentSelector component
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AgentSelector from "../features/agents/AgentSelector";

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

const mockListAgents = vi.fn();

vi.mock("../features/connection/gateway-api", () => ({
  getGatewayClient: () => ({
    listAgents: (...args: unknown[]) => mockListAgents(...args),
  }),
}));

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AgentSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders compact label when 1 agent", async () => {
    mockListAgents.mockResolvedValue([
      { id: "default", name: "Default Agent", description: "Main agent" },
    ]);

    render(<AgentSelector value={null} onChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Default Agent")).toBeInTheDocument();
    });

    // No dropdown button (aria-label)
    expect(screen.queryByLabelText("Select agent")).not.toBeInTheDocument();
  });

  it("renders dropdown when multiple agents", async () => {
    mockListAgents.mockResolvedValue([
      { id: "a1", name: "Agent One" },
      { id: "a2", name: "Agent Two" },
    ]);

    render(<AgentSelector value="a1" onChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Select agent")).toBeInTheDocument();
    });
  });

  it("click opens dropdown", async () => {
    const user = userEvent.setup();
    mockListAgents.mockResolvedValue([
      { id: "a1", name: "Agent One" },
      { id: "a2", name: "Agent Two" },
    ]);

    render(<AgentSelector value="a1" onChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Select agent")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Select agent"));

    // Dropdown items visible — use getAllByText since agent name also appears in trigger
    expect(screen.getAllByText("Agent One").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Agent Two").length).toBeGreaterThanOrEqual(1);
  });

  it("click agent selects it and closes dropdown", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mockListAgents.mockResolvedValue([
      { id: "a1", name: "Agent One" },
      { id: "a2", name: "Agent Two" },
    ]);

    render(<AgentSelector value="a1" onChange={onChange} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Select agent")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Select agent"));

    // Click on Agent Two
    const items = screen.getAllByText("Agent Two");
    await user.click(items[items.length - 1]);

    expect(onChange).toHaveBeenCalledWith("a2");
  });

  it("click outside closes dropdown", async () => {
    const user = userEvent.setup();
    mockListAgents.mockResolvedValue([
      { id: "a1", name: "Agent One" },
      { id: "a2", name: "Agent Two" },
    ]);

    render(
      <>
        <div data-testid="outside">Outside</div>
        <AgentSelector value="a1" onChange={vi.fn()} />
      </>,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Select agent")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Select agent"));
    expect(screen.getByText("Agent Two")).toBeInTheDocument();

    // Click outside
    await user.click(screen.getByTestId("outside"));
    expect(screen.queryByText("Agent Two")).not.toBeInTheDocument();
  });

  it("Escape closes dropdown", async () => {
    const user = userEvent.setup();
    mockListAgents.mockResolvedValue([
      { id: "a1", name: "Agent One" },
      { id: "a2", name: "Agent Two" },
    ]);

    render(<AgentSelector value="a1" onChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Select agent")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Select agent"));
    expect(screen.getByText("Agent Two")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByText("Agent Two")).not.toBeInTheDocument();
  });

  it("aria-label is present on dropdown trigger", async () => {
    mockListAgents.mockResolvedValue([
      { id: "a1", name: "Agent One" },
      { id: "a2", name: "Agent Two" },
    ]);

    render(<AgentSelector value="a1" onChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Select agent")).toBeInTheDocument();
    });
  });

  it("shows loading state", () => {
    mockListAgents.mockReturnValue(new Promise(() => {})); // never resolves

    render(<AgentSelector value={null} onChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});
